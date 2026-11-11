import type { AnalysisBudget } from "@/lib/types/analysis";
import { LIMITS } from "./limits";

/**
 * ADAPTIVE INSPECTION BUDGET.
 *
 * A fixed 24-file cap makes every repository — 40 files or 34,000 — equally
 * shallow. The budget now scales with the size of the *eligible* tree, so a
 * small repository is read completely while a huge one is still bounded and
 * loudly reports sampling.
 *
 * Hard ceilings are absolute: this function can never return a budget that
 * would let a single scan run unbounded or exceed the route's 60 s ceiling.
 */

/** Absolute limits — overrides cannot exceed these. */
export const BUDGET_CEILINGS = {
  maxFiles: 160,
  maxTotalBytes: 12 * 1024 * 1024,
  maxFileBytes: LIMITS.maxFileBytes,
  concurrency: 10,
  deadlineMs: 35_000,
} as const;

interface Tier {
  name: AnalysisBudget["tier"];
  maxBlobs: number;
  files: number;
  bytes: number;
}

/** Ordered from smallest to largest eligible tree. */
const TIERS: Tier[] = [
  { name: "small", maxBlobs: 150, files: 48, bytes: 6 * 1024 * 1024 },
  { name: "medium", maxBlobs: 800, files: 72, bytes: 8 * 1024 * 1024 },
  { name: "large", maxBlobs: 5_000, files: 96, bytes: 10 * 1024 * 1024 },
  { name: "huge", maxBlobs: Number.POSITIVE_INFINITY, files: 128, bytes: 12 * 1024 * 1024 },
];

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.round(value)));
}

/**
 * @param totalBlobs eligible file count (after pruning)
 * @param overrides   operator configuration; clamped to BUDGET_CEILINGS
 */
export function planBudget(totalBlobs: number, overrides: Partial<AnalysisBudget> = {}): AnalysisBudget {
  const tier = TIERS.find((t) => totalBlobs <= t.maxBlobs) ?? TIERS[TIERS.length - 1];
  const merged: AnalysisBudget = {
    maxFiles: clampInt(overrides.maxFiles ?? tier.files, 1, BUDGET_CEILINGS.maxFiles),
    maxTotalBytes: clampInt(overrides.maxTotalBytes ?? tier.bytes, 256 * 1024, BUDGET_CEILINGS.maxTotalBytes),
    maxFileBytes: clampInt(overrides.maxFileBytes ?? BUDGET_CEILINGS.maxFileBytes, 16 * 1024, BUDGET_CEILINGS.maxFileBytes),
    concurrency: clampInt(overrides.concurrency ?? 8, 1, BUDGET_CEILINGS.concurrency),
    deadlineMs: clampInt(overrides.deadlineMs ?? 30_000, 5_000, BUDGET_CEILINGS.deadlineMs),
    tier: tier.name,
  };
  return merged;
}

/** Human-readable summary used in the coverage panel and API reports. */
export function describeBudget(budget: AnalysisBudget): string {
  const mb = (budget.maxTotalBytes / (1024 * 1024)).toFixed(0);
  return `${budget.maxFiles} FILES · ${mb} MB · CONCURRENCY ${budget.concurrency} · ${Math.round(
    budget.deadlineMs / 1000,
  )}S DEADLINE (${budget.tier.toUpperCase()} TIER)`;
}
