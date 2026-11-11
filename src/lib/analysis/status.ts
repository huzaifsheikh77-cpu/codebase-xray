import type { AiStatus, SystemService } from "@/lib/types/analysis";
import type { RateLimitSnapshot } from "@/lib/github/client";

/**
 * /07 SYSTEM STATUS — built from real signals of the scan that just ran.
 * The AI row reflects configuration only: it is "ready" when a provider key
 * exists, otherwise "offline" with a truthful reason. No model call happens
 * during analysis.
 */
export function buildSystemStatus(params: {
  githubLatencyMs: number;
  rateLimit: RateLimitSnapshot | null;
  engineVersion: string;
  scanDurationMs: number;
  partial: boolean;
  now: Date;
  ai: AiStatus;
}): SystemService[] {
  const { githubLatencyMs, rateLimit, engineVersion, scanDurationMs, partial, now, ai } = params;
  const checkedAt = now.toISOString();

  return [
    {
      id: "github",
      label: "GITHUB API",
      status: "connected",
      latencyMs: Math.round(githubLatencyMs),
      lastChecked: checkedAt,
      version: rateLimit ? `REST · ${rateLimit.remaining}/${rateLimit.limit} QUOTA` : "REST",
    },
    {
      id: "analysis",
      label: "ANALYSIS ENGINE",
      status: "ready",
      latencyMs: 0,
      lastChecked: checkedAt,
      version: engineVersion,
    },
    {
      id: "scan",
      label: "SCAN ENGINE",
      status: partial ? "degraded" : "ready",
      latencyMs: Math.round(scanDurationMs),
      lastChecked: checkedAt,
      version: partial ? "PARTIAL RESULT" : "DETERMINISTIC",
    },
    {
      id: "ai",
      label: "AI ENGINE",
      status: ai.available ? "ready" : "offline",
      latencyMs: 0,
      lastChecked: checkedAt,
      version: ai.available ? `${ai.provider.toUpperCase()} · ${ai.model ?? "MODEL"}` : "NOT CONFIGURED — AI_API_KEY",
    },
  ];
}
