import type { RepoAnalysis, TreeNode } from "@/lib/types/analysis";
import type { GitHubClient } from "@/lib/github/client";
import { LIMITS } from "./limits";
import { languageInfoOrFallback } from "./languages";
import { classifyPath, pathDepth, prioritize, pruneEntries } from "./tree-utils";
import type { AnalysisContext } from "./context";
import { extractStats } from "./extractors/stats";
import { extractDependencies } from "./extractors/dependencies";
import { extractTesting } from "./extractors/testing";
import { extractDocumentation } from "./extractors/docs";
import { extractSecurity } from "./extractors/security";
import { extractArchitecture } from "./extractors/architecture";
import { buildGraph } from "./graph";
import { detectIssues } from "./issues/detectors";
import { overallScore } from "./scoring/overall";
import {
  scoreArchitecture,
  scoreCodeQuality,
  scoreDocumentation,
  scoreMaintainability,
  scoreSecurity,
  scoreTesting,
} from "./scoring/sectors";
import { buildInsights } from "./insights";
import { buildSystemStatus } from "./status";

export const ENGINE_VERSION = "xray.engine v2.7.3";

/** Bounded-concurrency map (no dependencies). */
async function mapPool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return results;
}

function estimateLoc(path: string, bytes: number): number {
  return Math.max(1, Math.round(bytes / languageInfoOrFallback(path).bytesPerLine));
}

/** Build the UI file tree (depth-capped, child-capped, deterministically sorted). */
function buildFileTree(entries: AnalysisContext["entries"], fetched: Map<string, string>): TreeNode[] {
  const root: TreeNode[] = [];
  const dirNodes = new Map<string, TreeNode>();
  let totalNodes = 0;

  const ensureDir = (segments: string[]): TreeNode | null => {
    let list = root;
    let path = "";
    let node: TreeNode | null = null;
    for (const seg of segments) {
      path = path ? `${path}/${seg}` : seg;
      node = dirNodes.get(path) ?? null;
      if (!node) {
        if (totalNodes >= LIMITS.maxTreeNodes) return null;
        node = { name: seg, path, type: "dir", children: [] };
        dirNodes.set(path, node);
        list.push(node);
        totalNodes++;
      }
      list = node.children!;
    }
    return node;
  };

  const sorted = [...entries].sort((a, b) => a.path.localeCompare(b.path));
  const childCount = new Map<string, number>();

  for (const entry of sorted) {
    const segments = entry.path.split("/");
    const dirSegments = segments.slice(0, -1);
    if (dirSegments.length >= 5) continue; // depth cap for readability

    let list: TreeNode[];
    if (dirSegments.length === 0) {
      list = root;
    } else {
      const dirNode = ensureDir(dirSegments);
      if (!dirNode) continue;
      list = dirNode.children!;
    }

    const parentKey = dirSegments.join("/");
    const used = childCount.get(parentKey) ?? 0;
    if (used >= LIMITS.maxTreeChildrenPerDir || totalNodes >= LIMITS.maxTreeNodes) continue;
    childCount.set(parentKey, used + 1);

    const content = fetched.get(entry.path);
    list.push({
      name: segments[segments.length - 1],
      path: entry.path,
      type: "file",
      loc: content !== undefined ? content.split("\n").length : estimateLoc(entry.path, entry.size ?? 0),
    });
    totalNodes++;
  }

  const sortRecursive = (nodes: TreeNode[]): TreeNode[] => {
    nodes.sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === "dir" ? -1 : 1));
    for (const n of nodes) if (n.children) sortRecursive(n.children);
    return nodes;
  };
  return sortRecursive(root);
}

export interface RunAnalysisParams {
  owner: string;
  repo: string;
  now: Date;
}

export class AnalysisFailure extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AnalysisFailure";
  }
}

/**
 * Run the full analysis. Deterministic given the same repository state;
 * every degradation is recorded as a warning rather than papered over.
 */
export async function runAnalysis(client: GitHubClient, params: RunAnalysisParams): Promise<RepoAnalysis> {
  const { owner, repo, now } = params;
  const startedAt = Date.now();
  const warnings: string[] = [];
  let degraded = false;

  const t0 = Date.now();
  const repoData = await client.getRepo(owner, repo);
  const githubLatencyMs = Date.now() - t0;

  const tree = await client.getTree(owner, repo, repoData.default_branch);
  if (tree.entries.length > LIMITS.maxTreeEntries || tree.truncated) {
    warnings.push(
      tree.entries.length > LIMITS.maxTreeEntries
        ? `REPOSITORY EXCEEDS ${LIMITS.maxTreeEntries.toLocaleString("en-US")}-ENTRY TREE LIMIT — ANALYSIS SKIPPED`
        : "TREE TRUNCATED BY GITHUB (100,000-ENTRY RESPONSE LIMIT) — PARTIAL ANALYSIS",
    );
    degraded = true;
  }

  const pruned = pruneEntries(tree.entries);
  if (pruned.removedIgnored + pruned.removedBinary + pruned.removedOversized > 0) {
    warnings.push(
      `CONTENT FILTER: ${pruned.removedIgnored} IGNORED-DIR / ${pruned.removedBinary} BINARY / ${pruned.removedOversized} OVERSIZED FILES EXCLUDED`,
    );
  }

  /* ---- bounded content fetch ---- */
  // Per-file errors degrade the scan to partial instead of aborting it: a
  // transient 403 (rate limit) or 5xx on one blob must not wipe out an
  // otherwise complete analysis. The engine stays network-agnostic — we
  // never import the HTTP client here, only read the error's *name*.
  const fetched = new Map<string, string>();
  const candidates = prioritize(pruned.entries, 4).slice(0, LIMITS.maxFilesFetched);
  let totalBytes = 0;
  let skippedForBudget = 0;
  let blobFailures = 0;
  let rateLimitedMidFetch = false;
  const deadline = startedAt + LIMITS.pipelineDeadlineMs;

  await mapPool(candidates, LIMITS.maxConcurrency, async (entry) => {
    const remainingQuota = LIMITS.maxTotalContentBytes - totalBytes;
    if (
      rateLimitedMidFetch ||
      (entry.size ?? 0) > remainingQuota ||
      Date.now() > deadline ||
      fetched.size >= LIMITS.maxFilesFetched
    ) {
      skippedForBudget++;
      return null;
    }
    try {
      const text = await client.getBlobText(owner, repo, entry.sha, LIMITS.maxFileBytes);
      if (text !== null) {
        fetched.set(entry.path, text);
        totalBytes += entry.size ?? 0;
      }
    } catch (e) {
      blobFailures++;
      const httpish = e as { name?: string; code?: unknown };
      if (httpish?.name === "GitHubHttpError" && httpish.code === "RATE_LIMITED") {
        rateLimitedMidFetch = true;
      }
    }
    return null;
  });

  // The 24-file cap is itself a budget: when the eligible tree is larger than
  // the cap, file-level findings and the graph describe a SAMPLE. Say so
  // instead of reporting COMPLETE for a 0.1%-coverage scan (regression found
  // on vercel/next.js: 24 of 34,271 files read, no warning emitted).
  if (pruned.entries.length > candidates.length) {
    const pct = ((fetched.size / pruned.entries.length) * 100).toFixed(2).replace(/\.?0+$/, "");
    warnings.push(
      `SAMPLED COVERAGE — ${fetched.size} OF ${pruned.entries.length.toLocaleString("en-US")} ELIGIBLE FILES READ (${pct}%); FILE-LEVEL FINDINGS AND GRAPH REFLECT THIS SAMPLE`,
    );
    degraded = true;
  }
  if (skippedForBudget > 0) {
    warnings.push(`FETCH BUDGET REACHED — ${fetched.size} OF ${candidates.length} PRIORITIZED FILES INSPECTED`);
    degraded = true;
  }
  if (rateLimitedMidFetch) {
    warnings.push(`GITHUB RATE LIMIT REACHED MID-SCAN — ${fetched.size} OF ${candidates.length} PRIORITIZED FILES INSPECTED`);
    degraded = true;
  } else if (blobFailures > 0) {
    warnings.push(`${blobFailures} FILE(S) COULD NOT BE FETCHED — PARTIAL ANALYSIS`);
    degraded = true;
  }

  /* ---- context + extractors (pure, deterministic) ---- */
  const ctx: AnalysisContext = {
    repo: {
      owner,
      name: repo,
      description: repoData.description ?? "",
      defaultBranch: repoData.default_branch,
      stars: repoData.stargazers_count,
      forks: repoData.forks_count,
      openIssues: repoData.open_issues_count,
      licenseSpdx: repoData.license?.spdx_id ?? null,
      createdAt: repoData.created_at,
      pushedAt: repoData.pushed_at,
      sizeKb: repoData.size,
    },
    allEntries: tree.entries,
    entries: pruned.entries,
    treeTruncated: tree.truncated,
    fetched,
    degraded,
    warnings,
    rateLimit: client.lastRateLimit,
  };

  const stats = extractStats(ctx);
  const deps = extractDependencies(ctx);
  const testing = extractTesting(ctx, deps);
  const docs = extractDocumentation(ctx);
  const security = extractSecurity(ctx, deps);
  const arch = extractArchitecture(ctx);
  const detection = { ctx, stats, deps, docs, security, arch, testing };

  /* ---- derived sections ---- */
  const issues = detectIssues(detection);
  const sectors = [
    scoreCodeQuality(detection),
    scoreSecurity(detection),
    scoreTesting(detection),
    scoreArchitecture(detection),
    scoreDocumentation(detection),
    scoreMaintainability(detection),
  ];
  const overall = overallScore(sectors);
  const insights = buildInsights(detection);

  const primaryEco = deps.ecosystems.find((e) => e.count > 0) ?? null;
  const rawGraph = buildGraph(ctx, primaryEco ? { name: primaryEco.name, names: primaryEco.names } : null);

  const durationMs = Date.now() - startedAt;

  return {
    repo: {
      url: `https://github.com/${owner}/${repo}`,
      slug: `${owner}/${repo}`,
      owner,
      name: repo,
      description: ctx.repo.description,
      defaultBranch: ctx.repo.defaultBranch,
      stars: ctx.repo.stars,
      forks: ctx.repo.forks,
      openIssues: ctx.repo.openIssues,
      license: ctx.repo.licenseSpdx ?? "NONE",
      createdAt: ctx.repo.createdAt,
      pushedAt: ctx.repo.pushedAt,
    },
    analysis: {
      generatedAt: now.toISOString(),
      engineVersion: ENGINE_VERSION,
      durationMs,
      scanId: `CX-${now.getTime().toString(36).toUpperCase()}`,
      isDemoData: false,
      partial: degraded || undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      rateLimitRemaining: client.lastRateLimit?.remaining,
    },
    score: { overall, sectors },
    structure: {
      fileTree: buildFileTree(ctx.entries, fetched),
      stats: {
        totalFiles: stats.totalFiles,
        analyzedFiles: fetched.size,
        exactLocFiles: stats.exactLocFiles,
        estimatedLocFiles: stats.estimatedLocFiles,
        linesOfCode: stats.linesOfCode,
        languages: stats.languages.length,
        dependencies: deps.totalDirect,
        repoSizeKb: ctx.repo.sizeKb,
        testFiles: stats.testFiles,
      },
      languages: stats.languages.map((l) => ({ name: l.name, pct: l.pct, loc: l.loc, color: l.color })),
    },
    graph: {
      nodes: rawGraph.nodes.map((n) => ({
        id: n.id,
        label: n.label,
        cluster: n.cluster,
        kind: n.kind === "module" ? "app" : n.kind === "package" ? "package" : n.kind === "external" ? "external" : "lib",
      })),
      edges: rawGraph.edges,
      clusters: rawGraph.clusters,
      ...(rawGraph.omittedModules > 0 ? { omittedModules: rawGraph.omittedModules } : {}),
    },
    issues,
    insights,
    system: buildSystemStatus({
      githubLatencyMs,
      rateLimit: client.lastRateLimit,
      engineVersion: ENGINE_VERSION,
      scanDurationMs: durationMs,
      partial: degraded,
      now,
    }),
  };
}

/* classifyPath and pathDepth imported for potential detector-side reuse */
export { classifyPath, pathDepth };
