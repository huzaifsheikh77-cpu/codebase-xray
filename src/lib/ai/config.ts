import type { AiStatus } from "@/lib/types/analysis";

/**
 * AI CONFIGURATION — server-only.
 *
 * The AI layer is optional. Without a key the whole product still works and
 * the UI reports the assistant as unavailable. No key is ever logged,
 * returned to the browser, or embedded in a build.
 *
 * Environment contract:
 *   AI_API_KEY    required to enable the assistant (or OPENAI_API_KEY)
 *   AI_MODEL      optional, default "gpt-4o-mini"
 *   AI_BASE_URL   optional, default "https://api.openai.com/v1"
 *                 (any OpenAI-compatible chat-completions endpoint)
 */

export interface AiConfig {
  available: boolean;
  provider: string;
  model: string | null;
  baseUrl: string | null;
  /** never serialised into a response */
  apiKey: string | null;
  reason?: string;
}

const DEFAULT_MODEL = "gpt-4o-mini";
const DEFAULT_BASE_URL = "https://api.openai.com/v1";

export function readAiConfig(): AiConfig {
  const apiKey = (process.env.AI_API_KEY ?? process.env.OPENAI_API_KEY ?? "").trim();
  const model = (process.env.AI_MODEL ?? DEFAULT_MODEL).trim() || DEFAULT_MODEL;
  const baseUrl = (process.env.AI_BASE_URL ?? DEFAULT_BASE_URL).trim().replace(/\/$/, "") || DEFAULT_BASE_URL;

  if (!apiKey) {
    return {
      available: false,
      provider: "none",
      model: null,
      baseUrl: null,
      apiKey: null,
      reason: "AI assistant is disabled: no API key is configured on the server (AI_API_KEY).",
    };
  }

  // Production must be able to verify the analysis binding. Without this
  // secret, the route would accept a key and then reject every live request
  // at token verification; report the configuration failure honestly first.
  if (process.env.NODE_ENV === "production" && !process.env.AI_ANALYSIS_SECRET?.trim()) {
    return {
      available: false,
      provider: "none",
      model: null,
      baseUrl: null,
      apiKey: null,
      reason: "AI assistant is disabled: AI_ANALYSIS_SECRET is required in production.",
    };
  }

  return { available: true, provider: "openai-compatible", model, baseUrl, apiKey };
}

/** Secret-free status embedded in the analysis response. */
export function aiPublicStatus(): AiStatus {
  const disabledReason =
    process.env.AI_DISABLED === "1"
      ? "AI assistant is disabled by the operator (AI_DISABLED)."
      : (process.env.VERCEL_ENV === "production" || process.env.VERCEL_ENV === "preview") &&
          process.env.AI_PUBLIC_ENABLED !== "1"
        ? "AI assistant is disabled for this hosted deployment (AI_PUBLIC_ENABLED is not set)."
        : null;
  if (disabledReason) {
    return { available: false, provider: "none", model: null, reason: disabledReason };
  }

  const cfg = readAiConfig();
  return {
    available: cfg.available,
    provider: cfg.provider,
    model: cfg.model,
    ...(cfg.available ? {} : { reason: cfg.reason }),
  };
}
