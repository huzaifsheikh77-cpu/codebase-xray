import type { RepoAnalysis } from "@/lib/types/analysis";
import { readAiConfig } from "./config";
import { buildRepoBrief } from "./context";
import { buildUserPrompt, SYSTEM_PROMPT } from "./prompts";
import { providerFromConfig, AiProviderError } from "./provider";
import type { ChatProvider } from "./provider";
import type { AiConfig } from "./config";
import { InvalidAiResponse, parseAnswer } from "./validate";
import { validateAnalysisForAi } from "./request-schema";
import type { AiEnvelope, AiRequest, ExplanationLevel, RepoBrief } from "./types";

/**
 * AI SERVICE — the only place that composes prompt + provider + validation.
 *
 * Failure is always explicit: no fabricated fallback answer, no pretending a
 * model ran. If credentials are missing the caller gets AI_UNAVAILABLE and
 * the deterministic report remains fully usable.
 */

const MAX_PROMPT_CHARS = 24_000;

function levelOf(value: unknown): ExplanationLevel {
  return value === "beginner" || value === "engineering" || value === "developer" ? value : "developer";
}

/** Structural re-validation of the analysis object sent back by the browser. */
export function isUsableAnalysis(value: unknown): value is RepoAnalysis {
  return validateAnalysisForAi(value).ok;
}

/** Injectable for tests only: production always resolves config + provider itself. */
export interface AiServiceDeps {
  provider?: ChatProvider;
  config?: AiConfig;
}

export async function answerWithAi(request: AiRequest, deps: AiServiceDeps = {}): Promise<AiEnvelope> {
  const config = deps.config ?? readAiConfig();
  if (!config.available) {
    return { ok: false, code: "AI_UNAVAILABLE", message: config.reason ?? "AI assistant is not configured." };
  }

  const provider = deps.provider ?? providerFromConfig(config);
  if (!provider) {
    return { ok: false, code: "AI_UNAVAILABLE", message: "AI assistant is not configured correctly." };
  }

  const level = levelOf(request.level);
  const validation = validateAnalysisForAi(request.analysis);
  if (!validation.ok) {
    return {
      ok: false,
      code: "AI_INVALID_ANALYSIS",
      message: "The analysis payload is malformed. Run the scan again before asking the assistant.",
    };
  }

  let brief: RepoBrief;
  let user: string;
  try {
    brief = buildRepoBrief(validation.analysis);
    user = buildUserPrompt({
      task: request.task,
      brief,
      question: request.question,
      issueId: request.issueId,
      level,
    });
  } catch {
    return {
      ok: false,
      code: "AI_INVALID_ANALYSIS",
      message: "The analysis payload could not be projected safely. Run the scan again.",
    };
  }

  if (user.length > MAX_PROMPT_CHARS) {
    return {
      ok: false,
      code: "AI_BUDGET_EXCEEDED",
      message: "This analysis is too large to send to the assistant. Ask about a specific finding instead.",
    };
  }

  try {
    const raw = await provider.complete({
      system: SYSTEM_PROMPT,
      user,
      maxTokens: 900,
    });
    const { answer, rejectedCitations } = parseAnswer(raw, brief);
    return {
      ok: true,
      answer,
      meta: {
        provider: provider.id,
        model: provider.model,
        rejectedCitations,
        level,
      },
    };
  } catch (error) {
    if (error instanceof AiProviderError) {
      return {
        ok: false,
        code: error.code,
        message:
          error.code === "AI_TIMEOUT"
            ? "The AI provider timed out. The deterministic report is unaffected."
            : "The AI provider rejected the request. Check the server's AI configuration.",
      };
    }
    if (error instanceof InvalidAiResponse) {
      return {
        ok: false,
        code: "AI_INVALID_RESPONSE",
        message: "The assistant returned an unusable response. No answer was shown rather than guessing.",
      };
    }
    return {
      ok: false,
      code: "AI_PROVIDER_ERROR",
      message: "The assistant failed unexpectedly. The deterministic report is unaffected.",
    };
  }
}
