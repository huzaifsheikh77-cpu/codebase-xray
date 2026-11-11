import { NextResponse } from "next/server";
import type { AiRequest, AiTask } from "@/lib/ai/types";
import { answerWithAi } from "@/lib/ai/service";
import { readAiConfig } from "@/lib/ai/config";
import { enforceAiDailyBudget, enforceQuota } from "@/lib/server/rate-limit";
import { isCrossOrigin, readJsonBody } from "@/lib/server/request-guards";
import { validateAnalysisForAi } from "@/lib/ai/request-schema";
import { verifyAnalysisToken } from "@/lib/ai/analysis-token";
import { logEvent, requestIdFrom } from "@/lib/server/observability";

/**
 * POST /api/ai — optional explanation layer.
 *
 * The request carries the analysis object the browser already holds; the
 * server validates the full nested shape, verifies the server-issued binding
 * token, projects it into a compact evidence brief and calls the configured
 * provider. The model never sees repository file contents, the GitHub token,
 * or the client's IP.
 *
 * Public-beta hardening: own shared quota bucket, global daily ceiling,
 * 512 KiB body cap, question length cap, no-store responses, AI_DISABLED
 * emergency switch, and AI_PUBLIC_ENABLED opt-in on hosted Vercel deployments.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BODY_BYTES = 512 * 1024;
const MAX_QUESTION_CHARS = 4_000;
const TASKS: AiTask[] = ["explain-issue", "explain-architecture", "chat", "recommendations"];

const NO_STORE = { "Cache-Control": "no-store" };

/** Route-level failures use their own codes; they are not provider failures. */
function failure(
  code: string,
  message: string,
  status: number,
  requestId: string,
  extra?: Record<string, string>,
) {
  logEvent({ event: "api_request", requestId, route: "/api/ai", outcome: `error:${code}` });
  return NextResponse.json(
    { ok: false, code, message },
    { status, headers: { ...NO_STORE, "x-request-id": requestId, ...extra } },
  );
}

export async function POST(request: Request): Promise<NextResponse> {
  const requestId = requestIdFrom(request);
  const startedAt = Date.now();

  if (isCrossOrigin(request)) {
    return failure("FORBIDDEN_ORIGIN", "This endpoint only accepts same-origin requests.", 403, requestId);
  }

  if (process.env.AI_DISABLED === "1") {
    return failure("AI_UNAVAILABLE", "The AI assistant is disabled on this deployment.", 503, requestId);
  }

  // Public AI remains opt-in even when a key exists. This prevents an
  // accidentally configured key from becoming an anonymous spend surface on
  // both production and public preview URLs.
  const hostedVercel = process.env.VERCEL_ENV === "production" || process.env.VERCEL_ENV === "preview";
  if (hostedVercel && process.env.AI_PUBLIC_ENABLED !== "1") {
    return failure(
      "AI_UNAVAILABLE",
      "The AI assistant is disabled for public beta. The deterministic report is unaffected.",
      503,
      requestId,
    );
  }

  const config = readAiConfig();
  if (!config.available) {
    return failure("AI_UNAVAILABLE", config.reason ?? "AI assistant is not configured.", 503, requestId);
  }

  const declared = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    return failure("PAYLOAD_TOO_LARGE", "Analysis payload is too large for the assistant.", 413, requestId);
  }

  const guard = await readJsonBody(request, MAX_BODY_BYTES);
  if (!guard.ok) {
    const tooLarge = guard.code === "PAYLOAD_TOO_LARGE";
    return failure(
      tooLarge ? "PAYLOAD_TOO_LARGE" : "MALFORMED_REQUEST",
      tooLarge ? "Analysis payload is too large for the assistant." : "Request body must be JSON.",
      tooLarge ? 413 : 400,
      requestId,
    );
  }

  const body = guard.body as Partial<AiRequest>;
  if (!TASKS.includes(body.task as AiTask)) {
    return failure("MALFORMED_REQUEST", "Unknown assistant task.", 400, requestId);
  }
  const validation = validateAnalysisForAi(body.analysis);
  if (!validation.ok) {
    return failure("MALFORMED_REQUEST", `A valid analysis object is required (${validation.reason}).`, 400, requestId);
  }
  const analysis = validation.analysis;

  // Reject modified/foreign payloads before consuming a quota slot or a
  // daily assistant request.
  if (!verifyAnalysisToken(analysis, analysis.analysis.aiToken)) {
    return failure(
      "AI_ANALYSIS_UNVERIFIED",
      "This analysis was not issued by the current server or its binding expired. Run the scan again.",
      403,
      requestId,
    );
  }

  if (body.task === "chat") {
    if (typeof body.question !== "string" || body.question.trim().length === 0) {
      return failure("MALFORMED_REQUEST", "A question is required for chat.", 400, requestId);
    }
    if (body.question.length > MAX_QUESTION_CHARS) {
      return failure("MALFORMED_REQUEST", `Questions are limited to ${MAX_QUESTION_CHARS} characters.`, 400, requestId);
    }
  }

  const quota = await enforceQuota("ai", request);
  if (!quota.allowed) {
    if (quota.unavailable) {
      return failure("QUOTA_UNAVAILABLE", "Usage protection is unavailable, so the assistant is paused.", 503, requestId);
    }
    return failure("RATE_LIMITED", "Too many assistant requests. Wait a moment and try again.", 429, requestId, {
      "Retry-After": String(quota.retryAfterSeconds),
    });
  }

  const daily = await enforceAiDailyBudget();
  if (!daily.allowed) {
    if (daily.unavailable) {
      return failure("QUOTA_UNAVAILABLE", "Assistant usage protection is unavailable.", 503, requestId);
    }
    return failure("RATE_LIMITED", "The assistant has reached its global daily budget. Try again tomorrow.", 429, requestId, {
      "Retry-After": String(daily.retryAfterSeconds),
    });
  }

  const result = await answerWithAi({
    task: body.task as AiTask,
    analysis,
    question: typeof body.question === "string" ? body.question : undefined,
    issueId: typeof body.issueId === "string" ? body.issueId : undefined,
    level: body.level,
  });

  logEvent({
    event: "api_request",
    requestId,
    route: "/api/ai",
    outcome: result.ok ? "ok" : `error:${result.code}`,
    durationMs: Date.now() - startedAt,
    aiFailure: !result.ok,
  });
  return NextResponse.json(result, {
    status: result.ok ? 200 : 502,
    headers: { ...NO_STORE, "x-request-id": requestId },
  });
}

export function GET(): NextResponse {
  return NextResponse.json(
    { ok: false, error: { code: "METHOD_NOT_ALLOWED", message: "Use POST with an assistant request." } },
    { status: 405, headers: { Allow: "POST", ...NO_STORE } },
  );
}
