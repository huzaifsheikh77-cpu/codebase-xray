/**
 * Pure helpers for classifying and aggregating tree entries.
 * Everything here is deterministic and side-effect free.
 */

import { BINARY_EXTENSIONS, IGNORED_DIRS, LIMITS } from "./limits";
import { isSourceLanguagePath } from "./languages";
import type { GitHubTreeEntry } from "@/lib/github/endpoints";

export type PathKind = "source" | "test" | "config" | "docs" | "other";

export function extOf(path: string): string {
  const base = path.split("/").pop() ?? "";
  const dot = base.lastIndexOf(".");
  return dot === -1 ? "" : base.slice(dot + 1).toLowerCase();
}

export function fileName(path: string): string {
  return path.split("/").pop() ?? path;
}

export function dirName(path: string): string {
  const idx = path.lastIndexOf("/");
  return idx === -1 ? "" : path.slice(0, idx);
}

export function pathDepth(path: string): number {
  return path.split("/").length - 1;
}

export function isBinaryPath(path: string): boolean {
  return BINARY_EXTENSIONS.has(extOf(path));
}

export function isIgnoredPath(path: string): boolean {
  return path.split("/").some((seg) => IGNORED_DIRS.has(seg));
}

const TEST_FILE_RE = /(\.(test|spec)\.[jtsx]+$|_test\.(go|py|rs)$|\.test\.ts$|test_[^/]*\.py$|\/tests?\/|\/__tests__\/|\/spec\/)/i;
const CONFIG_RE = /(^|\/)(\.[a-z]*rc|.*\.config\.[cm]?[jt]s|tsconfig[^/]*\.json|.*\.ya?ml$|.*\.toml$|Dockerfile[^/]*$|Makefile$|\.env\.[^/]+|package\.json)$/i;
const DOCS_RE = /(^|\/)(docs?|documentation)(\/|$)|\.(md|mdx|rst|adoc)$/i;

/** Rough classification used for stats and scoring signals. */
export function classifyPath(path: string): PathKind {
  if (TEST_FILE_RE.test(path)) return "test";
  if (isSourceLanguagePath(path)) return "source";
  if (CONFIG_RE.test(path)) return "config";
  if (DOCS_RE.test(path)) return "docs";
  return "other";
}

export interface PrunedTree {
  /** blob entries eligible for analysis, sorted by path for determinism */
  entries: GitHubTreeEntry[];
  /** counts of what was removed, for warnings/evidence */
  removedIgnored: number;
  removedBinary: number;
  removedOversized: number;
}

/** Drop ignored dirs, binaries and oversized files from the working set. */
export function pruneEntries(entries: GitHubTreeEntry[]): PrunedTree {
  const kept: GitHubTreeEntry[] = [];
  let removedIgnored = 0;
  let removedBinary = 0;
  let removedOversized = 0;

  for (const entry of entries) {
    if (entry.type !== "blob") continue;
    if (isIgnoredPath(entry.path)) {
      removedIgnored++;
      continue;
    }
    if (isBinaryPath(entry.path)) {
      removedBinary++;
      continue;
    }
    if ((entry.size ?? 0) > LIMITS.maxFileBytes) {
      removedOversized++;
      continue;
    }
    kept.push(entry);
  }

  kept.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  return { entries: kept, removedIgnored, removedBinary, removedOversized };
}

/** All blob entries as-is (no pruning) — the honest "total files" number. */
export function countAllFiles(entries: GitHubTreeEntry[]): number {
  return entries.reduce((n, e) => (e.type === "blob" ? n + 1 : n), 0);
}

/* ------------------------- content-fetch priority ------------------------- */

/**
 * Vendored / generated / bundled content. These are real files in the tree,
 * but their contents describe third-party code, not this repository, so a
 * budget spent on them produces misleading findings (regression: the
 * vercel/next.js scan sampled `packages/next/compiled/**` bundles and
 * reported a repository with 0 import edges).
 */
const VENDORED_SEGMENTS = new Set([
  "compiled",
  "vendor",
  "vendors",
  "third-party",
  "third_party",
  "bower_components",
  "jspm_packages",
  "generated",
  "__generated__",
  "bundled",
]);

const MINIFIED_RE = /(\.min\.(?:js|mjs|cjs|css)$|\.bundle\.(?:js|mjs|cjs)$|[-_.]min\.js$|\.(?:generated|g)\.(?:ts|tsx|js|jsx)$|\.pb\.(?:go|ts|js)$)/i;

const FIXTURE_SEGMENTS = new Set(["fixtures", "__fixtures__", "testdata", "test-data", "test_data"]);

export function isVendoredPath(path: string): boolean {
  const segments = path.split("/").slice(0, -1);
  if (segments.some((s) => VENDORED_SEGMENTS.has(s.toLowerCase()))) return true;
  return MINIFIED_RE.test(fileName(path));
}

/** Root manifests and workspace declarations — the files that define the repo. */
const ROOT_MANIFEST_RE = /^(pnpm-workspace\.ya?ml|package\.json|lerna\.json|nx\.json|turbo\.json|rush\.json|pyproject\.toml|requirements\.txt|Cargo\.toml|go\.mod|pom\.xml|build\.gradle(?:\.kts)?|settings\.gradle(?:\.kts)?|Gemfile|composer\.json|mix\.exs|Package\.swift|deno\.jsonc?)$/i;

/** Package-level manifests (workspace packages, nested modules). */
const PACKAGE_MANIFEST_RE = /^(package\.json|pyproject\.toml|Cargo\.toml|go\.mod|composer\.json|Gemfile|build\.gradle(?:\.kts)?|pom\.xml|requirements\.txt)$/i;

/** Entry points and repo-level configuration. */
const ENTRY_RE = /(^|\/)(index|main|server|app|cli|mod|__main__)\.(?:ts|tsx|js|jsx|mjs|cjs|py|go|rs)$/i;
const ROOT_CONFIG_RE = /^(next\.config\.[cm]?[jt]s|vite\.config\.[cm]?[jt]s|tsconfig[^/]*\.json|Dockerfile[^/]*|Makefile|\.env\.example|vitest\.config\.[cm]?[jt]s|jest\.config\.[cm]?[jt]s|eslint\.config\.[cm]?[jt]s|\.eslintrc[^/]*)$/i;

/**
 * Deterministic content-fetch priority. Lower = fetched earlier:
 *   0 root README · 1 root/workspace manifests · 2 package manifests
 *   3 entry points + root config · 4 source · 5 tests/fixtures · 6 docs
 *   7 other · 8 vendored/generated/minified bundles
 * Category caps keep a monorepo from filling the whole budget with one kind
 * of file; files over their cap are appended last so leftover budget is
 * still used instead of wasted.
 */
export function prioritize(entries: GitHubTreeEntry[], sampleTestFiles: number): GitHubTreeEntry[] {
  const rank = (e: GitHubTreeEntry): number => {
    const p = e.path;
    const base = fileName(p);
    const depth = pathDepth(p);

    if (isVendoredPath(p)) return 8;
    if (depth === 0 && /^readme(\.[a-z]+)?$/i.test(base)) return 0;
    if (depth === 0 && ROOT_MANIFEST_RE.test(base)) return 1;
    if (depth >= 1 && depth <= 3 && PACKAGE_MANIFEST_RE.test(base)) return 2;
    if ((ENTRY_RE.test(p) && depth <= 4) || (depth === 0 && ROOT_CONFIG_RE.test(base))) return 3;

    const kind = classifyPath(p);
    if (kind === "test") return 5;
    if (p.split("/").some((s) => FIXTURE_SEGMENTS.has(s.toLowerCase()))) return 5;
    if (kind === "source") return 4;
    if (kind === "docs") return 6;
    return 7;
  };

  const caps = new Map<number, number>([
    [2, 4], // package manifests
    [3, 4], // entry points / config
    [5, sampleTestFiles],
    [6, 2], // documentation samples
    [8, 2], // vendored bundles: last resort only
  ]);

  const withRank = entries.map((e) => ({ e, r: rank(e) }));
  // stable order within a rank: by bytes desc, then path (deterministic)
  withRank.sort((a, b) => a.r - b.r || (b.e.size ?? 0) - (a.e.size ?? 0) || (a.e.path < b.e.path ? -1 : 1));

  const picked: GitHubTreeEntry[] = [];
  const overflow: GitHubTreeEntry[] = [];
  const used = new Map<number, number>();

  for (const { e, r } of withRank) {
    const cap = caps.get(r);
    if (cap !== undefined) {
      const taken = used.get(r) ?? 0;
      if (taken >= cap) {
        overflow.push(e);
        continue;
      }
      used.set(r, taken + 1);
    }
    picked.push(e);
  }
  return [...picked, ...overflow];
}
