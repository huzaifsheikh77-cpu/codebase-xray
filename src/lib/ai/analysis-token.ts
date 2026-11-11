import { createHmac, timingSafeEqual } from "node:crypto";
import type { RepoAnalysis } from "@/lib/types/analysis";

/**
 * Stateless integrity binding for AI requests.
 *
 * /api/analyze signs a digest of the analysis it produced. /api/ai accepts
 * that token only with the exact analysis payload, so a caller cannot invent
 * findings or reuse a token for a different report. The token contains no
 * repository content: only an expiry and an HMAC digest.
 *
 * Production requires AI_ANALYSIS_SECRET. Without it no token is issued and
 * the assistant rejects live analyses rather than trusting client data.
 * Development uses a fixed local-only secret so local AI testing remains
 * possible; it must never be used on a public deployment.
 */

const TOKEN_VERSION = "v1";
const TTL_MS = 15 * 60 * 1000;
const DEV_SECRET = "codebase-xray-development-only-analysis-secret";

function signingSecret(): string | null {
  const configured = (process.env.AI_ANALYSIS_SECRET ?? "").trim();
  if (configured) return configured;
  if (process.env.NODE_ENV !== "production") return DEV_SECRET;
  return null;
}

/** Stable JSON: object keys sorted recursively, so equivalent payloads hash alike. */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((v) => stableStringify(v)).join(",")}]`;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(record[k])}`).join(",")}}`;
}

/** Digest excludes the token field itself. */
function analysisDigest(analysis: RepoAnalysis): string {
  const clone = structuredClone(analysis) as RepoAnalysis;
  if (clone.analysis) delete clone.analysis.aiToken;
  return createHmac("sha256", signingSecret() ?? DEV_SECRET)
    .update(stableStringify(clone))
    .digest("hex");
}

export function createAnalysisToken(analysis: RepoAnalysis): string | null {
  const secret = signingSecret();
  if (!secret) return null;
  const expiresAt = Date.now() + TTL_MS;
  const digest = analysisDigest(analysis);
  const signature = createHmac("sha256", secret).update(`${TOKEN_VERSION}.${expiresAt}.${digest}`).digest("hex");
  return `${TOKEN_VERSION}.${expiresAt}.${signature}`;
}

export function verifyAnalysisToken(analysis: RepoAnalysis, token: unknown): boolean {
  const secret = signingSecret();
  if (!secret || typeof token !== "string") return false;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== TOKEN_VERSION) return false;
  const expiresAt = Number(parts[1]);
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now() || expiresAt > Date.now() + TTL_MS + 60_000) {
    return false;
  }
  const digest = analysisDigest(analysis);
  const expected = createHmac("sha256", secret).update(`${TOKEN_VERSION}.${expiresAt}.${digest}`).digest("hex");
  const actual = Buffer.from(parts[2], "hex");
  const wanted = Buffer.from(expected, "hex");
  return actual.length === wanted.length && timingSafeEqual(actual, wanted);
}
