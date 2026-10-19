import type { SystemService } from "@/lib/types/analysis";
import type { RateLimitSnapshot } from "@/lib/github/client";

/**
 * /07 SYSTEM STATUS — built from real signals of the scan that just ran.
 * The AI engine is reported honestly as offline (rule-based insights run
 * in-process; no model is connected in this phase).
 */
export function buildSystemStatus(params: {
  githubLatencyMs: number;
  rateLimit: RateLimitSnapshot | null;
  engineVersion: string;
  scanDurationMs: number;
  partial: boolean;
  now: Date;
}): SystemService[] {
  const { githubLatencyMs, rateLimit, engineVersion, scanDurationMs, partial, now } = params;
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
      status: "offline",
      latencyMs: 0,
      lastChecked: checkedAt,
      version: "RULE-BASED — NOT CONNECTED",
    },
  ];
}
