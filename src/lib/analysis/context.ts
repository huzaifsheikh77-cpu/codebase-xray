import type { GitHubTreeEntry } from "@/lib/github/endpoints";
import type { RateLimitSnapshot } from "@/lib/github/client";

/**
 * The analysis engine's entire view of the world. It contains plain data
 * only — no clients, no fetch, no GitHub types beyond the raw tree entry
 * shape. This is what keeps the engine deterministic and testable with
 * fixtures (Phase-2 amendment #3).
 */
export interface AnalysisContext {
  repo: {
    owner: string;
    name: string;
    description: string;
    defaultBranch: string;
    stars: number;
    forks: number;
    openIssues: number;
    licenseSpdx: string | null;
    createdAt: string;
    pushedAt: string;
    sizeKb: number;
  };
  /** every blob entry reported by the tree (unpruned) */
  allEntries: GitHubTreeEntry[];
  /** pruned working set actually analyzed */
  entries: GitHubTreeEntry[];
  treeTruncated: boolean;
  /** decoded text of fetched files, keyed by path */
  fetched: Map<string, string>;
  /** true when the fetch budget or deadline was hit */
  degraded: boolean;
  /** collected degradation notes (become analysis.warnings) */
  warnings: string[];
  rateLimit: RateLimitSnapshot | null;
}
