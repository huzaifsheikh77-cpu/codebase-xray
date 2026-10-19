import type { AnalysisContext } from "../context";
import { dirName, pathDepth } from "../tree-utils";
import { classifyPath } from "../tree-utils";

export interface OversizedModule {
  path: string;
  /** exact line count when content was fetched; null otherwise */
  lines: number | null;
  /** byte size (always known from the tree) */
  bytes: number;
  exact: boolean;
}

export interface ArchitectureSignals {
  topLevelDirs: { name: string; files: number }[];
  usesSrcDir: boolean;
  monorepoWorkspaces: boolean;
  /** root-level config files (build/lint/CI separation) */
  rootConfigFiles: number;
  /** source paths deeper than 12 segments */
  deepPaths: { count: number; example: string | null; deepest: number };
  oversizedModules: OversizedModule[];
  /** directories that are extreme outliers by the repo's own distribution */
  godDirectories: { path: string; immediateFiles: number; repoP90: number }[];
}

/**
 * Thresholds, with rationale:
 * - OVERSIZED_LINES = 600: a single module holding >600 lines is a widely
 *   used review threshold (mock data used 1,248 as an egregious example);
 *   for unfetched files the byte analogue is OVERSIZED_BYTES.
 * - GOD_DIRECTORY (amendment #4 — deterministic and self-relative): a
 *   directory is flagged only when its immediate file count exceeds BOTH
 *   an absolute floor of 100 AND 5× the repository's own 90th-percentile
 *   directory size. Using the repo's own distribution avoids the "why
 *   150?" arbitrariness and makes tiny repos structurally immune (they
 *   rarely have 100+ files in one directory).
 */
const OVERSIZED_LINES = 600;
const OVERSIZED_BYTES = 200 * 1024;
const DEEP_PATH_LIMIT = 12;
const GOD_DIR_ABSOLUTE_FLOOR = 100;
const GOD_DIR_P90_MULTIPLIER = 5;

export function extractArchitecture(ctx: AnalysisContext): ArchitectureSignals {
  const dirCounts = new Map<string, number>();
  const topLevel = new Map<string, number>();
  let deepCount = 0;
  let deepExample: string | null = null;
  let deepest = 0;

  for (const entry of ctx.entries) {
    const dir = dirName(entry.path);
    if (dir) dirCounts.set(dir, (dirCounts.get(dir) ?? 0) + 1);
    const top = entry.path.split("/")[0];
    if (entry.path.includes("/")) topLevel.set(top, (topLevel.get(top) ?? 0) + 1);

    const depth = pathDepth(entry.path);
    if (depth > deepest) deepest = depth;
    if (depth > DEEP_PATH_LIMIT) {
      deepCount++;
      if (deepExample === null) deepExample = entry.path;
    }
  }

  // p90 of immediate-file counts across directories that have children
  const counts = [...dirCounts.values()].sort((a, b) => a - b);
  const p90 = counts.length > 0 ? counts[Math.min(counts.length - 1, Math.floor(counts.length * 0.9))] : 0;
  const godThreshold = Math.max(GOD_DIR_ABSOLUTE_FLOOR, GOD_DIR_P90_MULTIPLIER * p90);
  const godDirectories = [...dirCounts.entries()]
    .filter(([, n]) => n > godThreshold)
    .map(([path, immediateFiles]) => ({ path, immediateFiles, repoP90: p90 }))
    .sort((a, b) => b.immediateFiles - a.immediateFiles)
    .slice(0, 3);

  const oversizedModules: OversizedModule[] = [];
  for (const entry of ctx.entries) {
    if (classifyPath(entry.path) !== "source") continue;
    const content = ctx.fetched.get(entry.path);
    if (content !== undefined) {
      const lines = content.split("\n").length;
      if (lines > OVERSIZED_LINES) oversizedModules.push({ path: entry.path, lines, bytes: entry.size ?? 0, exact: true });
    } else if ((entry.size ?? 0) > OVERSIZED_BYTES) {
      oversizedModules.push({ path: entry.path, lines: null, bytes: entry.size ?? 0, exact: false });
    }
  }
  oversizedModules.sort((a, b) => b.bytes - a.bytes);

  const rootConfigFiles = ctx.entries.filter((e) => pathDepth(e.path) === 0 && classifyPath(e.path) === "config").length;

  // monorepo signal: conventional workspace directories at the root
  const monorepoWorkspaces = topLevel.has("apps") || topLevel.has("packages") || topLevel.has("libs");

  return {
    topLevelDirs: [...topLevel.entries()]
      .map(([name, files]) => ({ name, files }))
      .sort((a, b) => b.files - a.files || a.name.localeCompare(b.name)),
    usesSrcDir: topLevel.has("src"),
    monorepoWorkspaces,
    rootConfigFiles,
    deepPaths: { count: deepCount, example: deepExample, deepest },
    oversizedModules: oversizedModules.slice(0, 10),
    godDirectories,
  };
}
