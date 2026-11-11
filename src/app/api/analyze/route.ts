import { NextResponse } from "next/server";
import type { AnalysisBudget, AnalysisError, AnalysisErrorCode, RepoAnalysis } from "@/lib/types/analysis";
import { MOCK_ANALYSIS } from "@/lib/mock/repo-analysis";
import { parseRepoUrl } from "@/lib/github/parse-url";
import { GitHubHttpError, HttpGitHubClient } from "@/lib/github/client";
import { AnalysisFailure, isUsableRepoMetadata, runAnalysis } from "@/lib/analysis/pipeline";
import { acquireScanLock, enforceQuota, enforceScanHourlyBudget, releaseScanLock } from "@/lib/server/rate-limit";
import { isCrossOrigin, readJsonBody } from "@/lib/server/request-guards";
import { githubTokenRequired } from "@/lib/config/env";
import { canAdmitScan, estimateGitHubRequests } from "@/lib/github/admission";
import { logEvent, requestIdFrom } from "@/lib/server/observability";
import { createAnalysisToken } from "@/lib/ai/analysis-token";

/**
 * POST /api/analyze — the single analysis entry point.
 * Body: { url: string, demo?: boolean }
 *
 * Public-beta hardening:
 *   - Node.js runtime (Buffer + TypeScript compiler API)
 *   - same-origin browser requests only
 *   - 4 KiB body cap enforced on actual bytes
 *   - shared per-client AND global quota (fails closed in production)
 *   - duplicate-scan lock per repository
 *   - early GitHub quota check before spending a scan
 *   - production requires GITHUB_TOKEN (unless explicitly opted out)
 *   - emergency ANALYSIS_DISABLED switch
 * Secrets stay server-side; the client receives only RepoAnalysis or a safe error.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/** A real request is <200 bytes; anything near this is abuse or a bug. */
const MAX_BODY_BYTES = 4 * 1024;
const ERROR_STATUS: Record<AnalysisErrorCode, number> = {
  MALFORMED_URL: 400,
  PAYLOAD_TOO_LARGE: 413,
  FORBIDDEN_ORIGIN: 403,
  RATE_LIMITED: 429,
  SCAN_IN_PROGRESS: 429,
  QUOTA_UNAVAILABLE: 503,
  CONFIGURATION_REQUIRED: 503,
  NOT_FOUND_OR_PRIVATE: 404,
  PRIVATE_REPOSITORY_NOT_SUPPORTED: 422,
  INVALID_REPOSITORY_METADATA: 502,
  EMPTY_REPO: 409,
  UNAVAILABLE: 502,
  TIMEOUT: 504,
  CANCELLED: 408,
  ANALYSIS_FAILED: 500,
};

const ERROR_MESSAGE: Record<AnalysisErrorCode, string> = {
  MALFORMED_URL: "That does not look like a public GitHub repository URL (expected github.com/owner/repository).",
  PAYLOAD_TOO_LARGE: "Request body is too large.",
  FORBIDDEN_ORIGIN: "This endpoint only accepts same-origin requests.",
  RATE_LIMITED: "Too many analysis requests. Wait a moment and try again.",
  SCAN_IN_PROGRESS: "This repository is already being analyzed. Try again in a few seconds.",
  QUOTA_UNAVAILABLE: "Usage protection is not available on this deployment, so new scans are paused. Try again shortly.",
  CONFIGURATION_REQUIRED: "This deployment is missing required server configuration. Analysis is unavailable.",
  NOT_FOUND_OR_PRIVATE: "Repository not found — it may not exist, or it may be private.",
  PRIVATE_REPOSITORY_NOT_SUPPORTED: "Only public repositories can be analyzed. Private repository contents are never fetched.",
  INVALID_REPOSITORY_METADATA: "GitHub returned unusable repository metadata. Try again later.",
  EMPTY_REPO: "Repository is empty — nothing to analyze.",
  UNAVAILABLE: "GitHub API is temporarily unavailable. Try again shortly.",
  TIMEOUT: "The scan timed out before the repository could be analyzed.",
  CANCELLED: "The scan was cancelled.",
  ANALYSIS_FAILED: "The analysis failed unexpectedly. Try again.",
};

function fail(
  code: AnalysisErrorCode,
  requestId: string,
  status = ERROR_STATUS[code],
  extraHeaders?: Record<string, string>,
) {
  logEvent({ event: "api_request", requestId, route: "/api/analyze", outcome: `error:${code}` });
  return NextResponse.json(
    { ok: false, error: { code, message: ERROR_MESSAGE[code] } satisfies AnalysisError },
    { status, headers: { "Cache-Control": "no-store", "x-request-id": requestId, ...extraHeaders } },
  );
}

/** Optional operator overrides for the adaptive inspection budget. */
function budgetOverrides(): Partial<AnalysisBudget> {
  const out: Partial<AnalysisBudget> = {};
  const files = Number(process.env.ANALYSIS_MAX_FILES ?? "");
  if (Number.isFinite(files) && files > 0) out.maxFiles = files;
  const concurrency = Number(process.env.ANALYSIS_CONCURRENCY ?? "");
  if (Number.isFinite(concurrency) && concurrency > 0) out.concurrency = concurrency;
  return out;
}

export async function POST(request: Request): Promise<NextResponse> {
  const requestId = requestIdFrom(request);
  const startedAt = Date.now();

  if (isCrossOrigin(request)) return fail("FORBIDDEN_ORIGIN", requestId);

  if (process.env.ANALYSIS_DISABLED === "1") {
    return fail("UNAVAILABLE", requestId, 503, { "Retry-After": "300" });
  }

  const declared = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return fail("PAYLOAD_TOO_LARGE", requestId);

  const guard = await readJsonBody(request, MAX_BODY_BYTES);
  if (!guard.ok) {
    logEvent({ event: "api_request", requestId, route: "/api/analyze", outcome: `body:${guard.code}` });
    return fail(guard.code === "PAYLOAD_TOO_LARGE" ? "PAYLOAD_TOO_LARGE" : "MALFORMED_URL", requestId);
  }
  const body = guard.body as { url?: unknown; demo?: unknown };
  const url = typeof body.url === "string" ? body.url : "";
  const isDemoRequest = body.demo === true || url.includes("nebula-labs/orbit-forge");

  // Reject malformed URLs and missing production configuration before taking
  // a quota slot. Only a request that can actually become a scan should spend
  // a user's per-client or the shared global budget.
  let parsed: ReturnType<typeof parseRepoUrl> = null;
  if (!isDemoRequest) {
    parsed = parseRepoUrl(url);
    if (!parsed) return fail("MALFORMED_URL", requestId);
    if (githubTokenRequired()) return fail("CONFIGURATION_REQUIRED", requestId);
  }

  const quota = await enforceQuota("analysis", request);
  if (!quota.allowed) {
    if (quota.unavailable) return fail("QUOTA_UNAVAILABLE", requestId);
    return fail("RATE_LIMITED", requestId, 429, { "Retry-After": String(quota.retryAfterSeconds) });
  }

  // Demo mode is offline and cheap; it is still subject to the quota above.
  if (isDemoRequest) {
    const analysis: RepoAnalysis = structuredClone(MOCK_ANALYSIS);
    const demoToken = createAnalysisToken(analysis);
    if (demoToken) analysis.analysis.aiToken = demoToken;
    return NextResponse.json({ ok: true, analysis }, { headers: { "Cache-Control": "no-store" } });
  }

  // Defensive narrowing: `parsed` is guaranteed for every non-demo request
  // above, but keep the route fail-closed if that control flow changes.
  if (!parsed) return fail("MALFORMED_URL", requestId);

  const ownerRepo = `${parsed.owner}/${parsed.repo}`;
  const locked = await acquireScanLock(ownerRepo);
  if (!locked) return fail("SCAN_IN_PROGRESS", requestId, 429, { "Retry-After": "20" });

  try {
    // A duplicate is rejected by the lock before it can consume the hourly
    // scan budget. The lock is always released in finally.
    const hourly = await enforceScanHourlyBudget();
    if (!hourly.allowed) {
      if (hourly.unavailable) return fail("QUOTA_UNAVAILABLE", requestId);
      return fail("RATE_LIMITED", requestId, 429, { "Retry-After": String(hourly.retryAfterSeconds) });
    }

    const client = new HttpGitHubClient();

    // One metadata request before admission; the same object is passed into
    // the pipeline so private repositories are rejected before tree retrieval.
    const repoData = await client.getRepo(parsed.owner, parsed.repo);
    if (!isUsableRepoMetadata(repoData)) return fail("INVALID_REPOSITORY_METADATA", requestId);
    if (repoData.private) return fail("PRIVATE_REPOSITORY_NOT_SUPPORTED", requestId);

    // /rate_limit does not consume core quota. Refuse early instead of
    // returning a half-analysed repository, using a conservative estimate of
    // this scan's total request cost rather than a fixed 10-request floor.
    const snapshot = await client.rateLimit();
    const estimatedRequests = estimateGitHubRequests(repoData);
    if (snapshot && !canAdmitScan(snapshot.remaining, estimatedRequests)) {
      const reset = snapshot.resetAt ? ` Window resets at ${snapshot.resetAt.slice(11, 16)} UTC.` : "";
      logEvent({
        event: "api_request",
        requestId,
        route: "/api/analyze",
        outcome: "error:GITHUB_ADMISSION",
        githubQuotaLow: true,
      });
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "RATE_LIMITED",
            message: `${ERROR_MESSAGE.RATE_LIMITED}${reset}`,
            ...(snapshot.resetAt ? { resetAt: snapshot.resetAt } : {}),
          } satisfies AnalysisError,
        },
        {
          status: 429,
          headers: { "Cache-Control": "no-store", "Retry-After": "60", "x-request-id": requestId },
        },
      );
    }

    const analysis = await runAnalysis(client, {
      owner: parsed.owner,
      repo: parsed.repo,
      now: new Date(),
      repoData,
      budget: budgetOverrides(),
    });
    logEvent({
      event: "api_request",
      requestId,
      route: "/api/analyze",
      outcome: "ok",
      durationMs: Date.now() - startedAt,
      partial: Boolean(analysis.analysis.partial),
      inspectedFiles: analysis.analysis.coverage?.inspectedFiles,
    });
    return NextResponse.json(
      { ok: true, analysis },
      { headers: { "Cache-Control": "no-store", "x-request-id": requestId } },
    );
  } catch (e) {
    if (e instanceof GitHubHttpError) {
      const error: AnalysisError = {
        code: e.code,
        message: e.resetAt
          ? `${ERROR_MESSAGE[e.code]} Window resets at ${new Date(e.resetAt).toISOString().slice(11, 16)} UTC.`
          : ERROR_MESSAGE[e.code],
        ...(e.resetAt ? { resetAt: e.resetAt } : {}),
      };
      // Classification only — never the token, URL payload or upstream body.
      console.warn(`[analyze] github ${e.code} (status ${e.status})`);
      logEvent({
        event: "api_request",
        requestId,
        route: "/api/analyze",
        outcome: "error:GITHUB",
        failureCategory: e.code,
        durationMs: Date.now() - startedAt,
      });
      return NextResponse.json(
        { ok: false, error },
        { status: ERROR_STATUS[e.code], headers: { "Cache-Control": "no-store", "x-request-id": requestId } },
      );
    }
    if (e instanceof AnalysisFailure) {
      console.warn(`[analyze] pipeline rejected: ${e.code}`);
      return fail(e.code, requestId);
    }
    console.error("[analyze] unexpected failure", e instanceof Error ? e.name : typeof e);
    return fail("ANALYSIS_FAILED", requestId);
  } finally {
    await releaseScanLock(ownerRepo);
  }
}

/** The endpoint is POST-only; make that explicit for API consumers. */
export function GET(): NextResponse {
  return NextResponse.json(
    { ok: false, error: { code: "MALFORMED_URL", message: "Use POST with { url }." } satisfies AnalysisError },
    { status: 405, headers: { Allow: "POST", "Cache-Control": "no-store" } },
  );
}
