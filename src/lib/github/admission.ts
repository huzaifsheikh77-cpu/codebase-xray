import type { GitHubRepoResponse } from "./endpoints";
import { BUDGET_CEILINGS } from "@/lib/analysis/budgets";

/**
 * Conservative admission control. GitHub has no reservation API, so this is
 * an estimate, not a guarantee. It is deliberately pessimistic: a scan may
 * be refused while some quota remains, but it should not start a 100+ request
 * job with only a handful of requests left.
 */

/** Leave room for other scans and normal API traffic in the same window. */
export const GITHUB_SAFETY_RESERVE = 25;
/** Metadata + tree + one bounded retry of the tree. */
const FIXED_REQUESTS = 3;

/**
 * Repository size (KB, including history) is a coarse proxy for source-file
 * count. We cap the estimate at the hard file ceiling and add fixed requests.
 */
export function estimateGitHubRequests(repo: Pick<GitHubRepoResponse, "size">): number {
  const sizeKb = Number.isFinite(repo.size) && repo.size > 0 ? repo.size : 0;
  const fileEstimate = Math.min(BUDGET_CEILINGS.maxFiles, Math.max(4, Math.ceil(sizeKb / 2)));
  return FIXED_REQUESTS + fileEstimate;
}

export function canAdmitScan(remaining: number, estimate: number): boolean {
  return Number.isFinite(remaining) && remaining - estimate - GITHUB_SAFETY_RESERVE >= 0;
}
