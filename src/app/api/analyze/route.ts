import { NextResponse } from "next/server";
import type { AnalysisError, AnalysisErrorCode, RepoAnalysis } from "@/lib/types/analysis";
import { MOCK_ANALYSIS } from "@/lib/mock/repo-analysis";
import { parseRepoUrl } from "@/lib/github/parse-url";
import { GitHubHttpError, HttpGitHubClient } from "@/lib/github/client";
import { AnalysisFailure, runAnalysis } from "@/lib/analysis/pipeline";
import { checkRateLimit, clientKeyFrom } from "@/lib/server/rate-limit";

/**
 * POST /api/analyze — the single server entry point.
 * Body: { url: string, demo?: boolean }
 *   - demo: true → return the bundled MOCK_ANALYSIS without any network
 *     access (development/testing path; the UI labels it DEMO DATA).
 *   - otherwise → run the real GitHub pipeline server-side.
 *
 * Hardening:
 *   - requires the Node.js runtime (Buffer + GitHub client)
 *   - rejects oversized bodies before parsing (4 KiB is >10× a real request)
 *   - rejects cross-origin browser requests (same-origin app only)
 *   - best-effort per-client rate limit so one caller cannot drain quota
 * All GitHub details (tokens, quota, raw payloads) stay on the server;
 * the client receives only the composed RepoAnalysis or a safe error.
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
  NOT_FOUND_OR_PRIVATE: 404,
  REPO_TOO_LARGE: 413,
  EMPTY_REPO: 409,
  UNAVAILABLE: 502,
  TIMEOUT: 504,
  ANALYSIS_FAILED: 500,
};

const ERROR_MESSAGE: Record<AnalysisErrorCode, string> = {
  MALFORMED_URL: "That does not look like a public GitHub repository URL (expected github.com/owner/repository).",
  PAYLOAD_TOO_LARGE: "Request body is too large.",
  FORBIDDEN_ORIGIN: "This endpoint only accepts same-origin requests.",
  RATE_LIMITED: "Too many analysis requests. Wait a moment and try again.",
  NOT_FOUND_OR_PRIVATE: "Repository not found — it may not exist, or it may be private.",
  REPO_TOO_LARGE: "Repository is too large for the analyzer's budget.",
  EMPTY_REPO: "Repository is empty — nothing to analyze.",
  UNAVAILABLE: "GitHub API is temporarily unavailable. Try again shortly.",
  TIMEOUT: "The scan timed out before the repository could be analyzed.",
  ANALYSIS_FAILED: "The analysis failed unexpectedly. Try again.",
};

function fail(code: AnalysisErrorCode, status = ERROR_STATUS[code], extraHeaders?: Record<string, string>) {
  return NextResponse.json(
    { ok: false, error: { code, message: ERROR_MESSAGE[code] } satisfies AnalysisError },
    { status, headers: extraHeaders },
  );
}

/** Browser requests must come from this deployment's own origin. */
function isCrossOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false; // curl/server-to-server: no browser context to spoof
  try {
    const sent = new URL(origin);
    const self = new URL(request.url);
    return sent.host !== self.host;
  } catch {
    return true;
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  if (isCrossOrigin(request)) return fail("FORBIDDEN_ORIGIN");

  const declared = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return fail("PAYLOAD_TOO_LARGE");

  const limit = checkRateLimit(clientKeyFrom(request));
  if (!limit.allowed) {
    return fail("RATE_LIMITED", 429, { "Retry-After": String(limit.retryAfterSeconds) });
  }

  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return fail("MALFORMED_URL");
  }
  // Content-Length can be absent or lie (chunked bodies) — enforce on the
  // bytes actually read as well.
  if (Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) return fail("PAYLOAD_TOO_LARGE");

  let body: { url?: unknown; demo?: unknown };
  try {
    body = JSON.parse(raw) as typeof body;
  } catch {
    return fail("MALFORMED_URL");
  }
  if (typeof body !== "object" || body === null) return fail("MALFORMED_URL");

  const url = typeof body.url === "string" ? body.url : "";

  // demo mode runs entirely offline on the bundled mock payload
  if (body.demo === true || url.includes("nebula-labs/orbit-forge")) {
    const analysis: RepoAnalysis = structuredClone(MOCK_ANALYSIS);
    return NextResponse.json({ ok: true, analysis });
  }

  const parsed = parseRepoUrl(url);
  if (!parsed) return fail("MALFORMED_URL");

  try {
    const client = new HttpGitHubClient();
    const analysis = await runAnalysis(client, { owner: parsed.owner, repo: parsed.repo, now: new Date() });
    return NextResponse.json({ ok: true, analysis });
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
      return NextResponse.json({ ok: false, error }, { status: ERROR_STATUS[e.code] });
    }
    if (e instanceof AnalysisFailure) {
      console.error(`[analyze] pipeline failure: ${e.message}`);
      return fail("ANALYSIS_FAILED");
    }
    console.error("[analyze] unexpected failure", e instanceof Error ? e.name : typeof e);
    return fail("ANALYSIS_FAILED");
  }
}

/** The endpoint is POST-only; make that explicit for API consumers. */
export function GET(): NextResponse {
  return NextResponse.json(
    { ok: false, error: { code: "MALFORMED_URL", message: "Use POST with { url }." } satisfies AnalysisError },
    { status: 405, headers: { Allow: "POST" } },
  );
}
