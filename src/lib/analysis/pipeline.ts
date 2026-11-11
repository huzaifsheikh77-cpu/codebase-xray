import type { AnalysisBudget, AnalysisCoverage, AnalysisErrorCode, RepoAnalysis, TreeNode } from "@/lib/types/analysis";
import type { GitHubClient } from "@/lib/github/client";
import type { GitHubRepoResponse } from "@/lib/github/endpoints";
import { LIMITS } from "./limits";
import { planBudget } from "./budgets";
import { languageInfoOrFallback } from "./languages";
import { classifyPath, pathDepth, prioritize, pruneEntries } from "./tree-utils";
import type { AnalysisContext } from "./context";
import { extractStats } from "./extractors/stats";
import { extractDependencies } from "./extractors/dependencies";
import { extractTesting } from "./extractors/testing";
import { extractDocumentation } from "./extractors/docs";
import { extractSecurity } from "./extractors/security";
import { extractArchitecture } from "./extractors/architecture";
import { parseFiles } from "./parsers/registry";
import { extractQuality } from "./quality";
import { detectSecurityRisks } from "./security-rules";
import { inferArchitecture } from "./architecture-profile";
import { buildGraph } from "./graph";
import { detectIssues } from "./issues/detectors";
import { overallScore } from "./scoring/overall";
import { SCORING_VERSION } from "./scoring/weights";
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
import { aiPublicStatus } from "@/lib/ai/config";
import { criticalCoverage, criticalCoverageWarnings } from "./critical";
import { tallyCapabilities } from "./capabilities";
import { createAnalysisToken } from "@/lib/ai/analysis-token";

import { ENGINE_VERSION } from "@/lib/version";
export { ENGINE_VERSION };

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
  /** already-fetched metadata, so the route can perform admission control first */
  repoData?: GitHubRepoResponse;
  /** operator overrides; clamped by planBudget */
  budget?: Partial<AnalysisBudget>;
}

export class AnalysisFailure extends Error {
  readonly code: AnalysisErrorCode;

  constructor(code: AnalysisErrorCode, message: string) {
    super(message);
    this.name = "AnalysisFailure";
    this.code = code;
  }
}

/**
 * Fail closed on missing or malformed metadata. In particular, an absent
 * `private` field must never be interpreted as public: a broad deployment
 * token must not turn a malformed GitHub response into source access.
 */
export function isUsableRepoMetadata(value: unknown): value is GitHubRepoResponse {
  if (typeof value !== "object" || value === null) return false;
  const repo = value as Partial<GitHubRepoResponse>;
  return (
    typeof repo.name === "string" &&
    typeof repo.default_branch === "string" &&
    repo.default_branch.length > 0 &&
    typeof repo.private === "boolean" &&
    typeof repo.size === "number" &&
    Number.isFinite(repo.size) &&
    repo.size >= 0 &&
    typeof repo.stargazers_count === "number" &&
    Number.isFinite(repo.stargazers_count) &&
    typeof repo.forks_count === "number" &&
    Number.isFinite(repo.forks_count) &&
    typeof repo.open_issues_count === "number" &&
    Number.isFinite(repo.open_issues_count) &&
    (repo.description === null || typeof repo.description === "string") &&
    (repo.license === null || (typeof repo.license === "object" && repo.license !== null)) &&
    typeof repo.created_at === "string" &&
    typeof repo.pushed_at === "string"
  );
}

/**
 * Run the full analysis. Deterministic given the same repository state;
 * every degradation is recorded as a warning AND quantified in
 * `analysis.coverage` rather than papered over.
 */
export async function runAnalysis(client: GitHubClient, params: RunAnalysisParams): Promise<RepoAnalysis> {
  const { owner, repo, now } = params;
  const startedAt = Date.now();
  const warnings: string[] = [];
  let degraded = false;

  const t0 = Date.now();
  const repoData = params.repoData ?? (await client.getRepo(owner, repo));
  const githubLatencyMs = Date.now() - t0;

  if (!isUsableRepoMetadata(repoData)) {
    throw new AnalysisFailure(
      "INVALID_REPOSITORY_METADATA",
      "GitHub returned unusable repository metadata. Try again later.",
    );
  }

  // Confidentiality boundary: never fetch a private tree/blob with a broad
  // deployment token. This check runs before the first tree request.
  if (repoData.private) {
    throw new AnalysisFailure(
      "PRIVATE_REPOSITORY_NOT_SUPPORTED",
      "Only public repositories can be analyzed. Private repository contents are never fetched.",
    );
  }

  const tree = await client.getTree(owner, repo, repoData.default_branch);
  if (tree.truncated || tree.entries.length > LIMITS.maxTreeEntries) {
    warnings.push(
      tree.entries.length > LIMITS.maxTreeEntries
        ? `REPOSITORY EXCEEDS ${LIMITS.maxTreeEntries.toLocaleString("en-US")}-ENTRY TREE LIMIT — ANALYSIS COVERED THE RETURNED ENTRIES ONLY`
        : "TREE TRUNCATED BY GITHUB (100,000-ENTRY RESPONSE LIMIT) — ANALYSIS COVERED THE RETURNED ENTRIES ONLY",
    );
    degraded = true;
  }

  const pruned = pruneEntries(tree.entries);
  if (pruned.removedIgnored + pruned.removedBinary + pruned.removedOversized > 0) {
    warnings.push(
      `CONTENT FILTER: ${pruned.removedIgnored} IGNORED-DIR / ${pruned.removedBinary} BINARY / ${pruned.removedOversized} OVERSIZED FILES EXCLUDED`,
    );
  }

  const budget = planBudget(pruned.entries.length, params.budget);
  const eligibleBytes = pruned.entries.reduce((n, e) => n + (e.size ?? 0), 0);

  /* ---- bounded content fetch ---- */
  // Per-file errors degrade the scan to partial instead of aborting it: a
  // transient 403 (rate limit) or 5xx on one blob must not wipe out an
  // otherwise complete analysis. The engine stays network-agnostic — we
  // never import the HTTP client here, only read the error's *name*.
  const fetched = new Map<string, string>();
  const candidates = prioritize(pruned.entries, 4).slice(0, budget.maxFiles);
  let totalBytes = 0;
  let skippedForBudget = 0;
  let blobFailures = 0;
  let rateLimitedMidFetch = false;
  const deadline = startedAt + budget.deadlineMs;

  await mapPool(candidates, budget.concurrency, async (entry) => {
    const remainingQuota = budget.maxTotalBytes - totalBytes;
    if (
      rateLimitedMidFetch ||
      (entry.size ?? 0) > remainingQuota ||
      Date.now() > deadline ||
      fetched.size >= budget.maxFiles
    ) {
      skippedForBudget++;
      return null;
    }
    try {
      const text = await client.getBlobText(owner, repo, entry.sha, budget.maxFileBytes);
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

  const sampled = pruned.entries.length > candidates.length;
  if (sampled) {
    const pct = ((fetched.size / pruned.entries.length) * 100).toFixed(2).replace(/\.?0+$/, "");
    warnings.push(
      `SAMPLED COVERAGE — ${fetched.size} OF ${pruned.entries.length.toLocaleString("en-US")} ELIGIBLE FILES READ (${pct}%); BUDGET ${budget.maxFiles} FILES (${budget.tier.toUpperCase()} TIER). FILE-LEVEL FINDINGS DESCRIBE THIS SAMPLE`,
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

  /* ---- critical-path coverage: which sensitive areas were actually read ---- */
  const critical = criticalCoverage(
    pruned.entries.map((e) => e.path),
    new Set(fetched.keys()),
  );
  for (const warning of criticalCoverageWarnings(critical)) warnings.push(warning);
  if (critical.some((c) => c.inspected < c.discovered && c.category !== "test")) {
    degraded = true;
  }
  const capabilityTally = tallyCapabilities([...fetched.keys()]);

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

  /* ---- language-aware parsing (AST where available) ---- */
  const parsed = parseFiles(fetched);
  const quality = extractQuality(parsed, fetched);
  const risks = detectSecurityRisks(ctx);

  if (parsed.failedFiles > 0) {
    warnings.push(`${parsed.failedFiles} FILE(S) HAD SYNTAX DIAGNOSTICS — THEIR METRICS ARE PARTIAL`);
    degraded = true;
  }

  const stats = extractStats(ctx);
  const deps = extractDependencies(ctx);
  const testing = extractTesting(ctx, deps);
  const docs = extractDocumentation(ctx);
  const security = extractSecurity(ctx, deps);
  const arch = extractArchitecture(ctx);
  const archProfile = inferArchitecture(ctx, arch);

  const primaryEco = deps.ecosystems.find((e) => e.count > 0) ?? null;
  const rawGraph = buildGraph(ctx, primaryEco ? { name: primaryEco.name, names: primaryEco.names } : null, parsed);

  const coverage: AnalysisCoverage = {
    eligibleFiles: pruned.entries.length,
    inspectedFiles: fetched.size,
    inspectedPct:
      pruned.entries.length > 0 ? Math.round((fetched.size / pruned.entries.length) * 1000) / 10 : 0,
    eligibleBytes,
    inspectedBytes: totalBytes,
    parsedFiles: parsed.parsedFiles,
    parseFailures: parsed.failedFiles,
    unresolvedImports: rawGraph.unresolvedImports,
    truncated: tree.truncated,
    astLanguages: parsed.astLanguages,
    skippedForBudget,
    unsupportedSourceFiles: capabilityTally.unsupported,
    ...(critical.length > 0 ? { critical } : {}),
    capabilities: {
      full: capabilityTally.full,
      partial: capabilityTally.partial,
      importOnly: capabilityTally["import-only"],
      unsupported: capabilityTally.unsupported,
    },
  };

  const detection = {
    ctx,
    stats,
    deps,
    docs,
    security,
    arch,
    testing,
    quality,
    risks,
    archProfile,
    unresolvedImports: rawGraph.unresolvedImports,
    coverage,
  };

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

  const durationMs = Date.now() - startedAt;

  const result: RepoAnalysis = {
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
      scoringVersion: SCORING_VERSION,
      durationMs,
      scanId: `CX-${now.getTime().toString(36).toUpperCase()}`,
      isDemoData: false,
      partial: degraded || undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      rateLimitRemaining: client.lastRateLimit?.remaining,
      coverage,
      budget,
      ai: aiPublicStatus(),
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
        sourceFiles: stats.sourceFiles,
        parsedFiles: parsed.parsedFiles,
        measuredFunctions: quality.functionsMeasured,
      },
      languages: stats.languages.map((l) => ({ name: l.name, pct: l.pct, loc: l.loc, color: l.color })),
      architectureProfile: archProfile,
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
      unresolvedImports: rawGraph.unresolvedImports,
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
      ai: aiPublicStatus(),
    }),
  };

  // Sign only after the full payload exists. The token binds the exact
  // analysis object to /api/ai without storing anything server-side.
  const aiToken = createAnalysisToken(result);
  if (aiToken) result.analysis.aiToken = aiToken;
  return result;
}

/* classifyPath and pathDepth imported for potential detector-side reuse */
export { classifyPath, pathDepth };
