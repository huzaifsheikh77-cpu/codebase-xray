import type { GitHubClient, RateLimitSnapshot } from "@/lib/github/client";
import type { GitHubRepoResponse, GitHubTreeEntry } from "@/lib/github/endpoints";
import { runAnalysis } from "@/lib/analysis/pipeline";
import type { RepoAnalysis } from "@/lib/types/analysis";
import type { BenchmarkCase } from "./cases";

/**
 * Benchmark runner: a deterministic fake GitHub client, the real pipeline,
 * and no network. A case is evaluated on three independent axes —
 * findings (precision/recall/F1 over labelled titles), structure (edges,
 * critical-path recall, parser depth) and cost (requests, duration).
 */

export interface CaseResult {
  id: string;
  description: string;
  inspected: number;
  eligible: number;
  inspectedPct: number;
  parsed: number;
  parseFailures: number;
  unresolvedImports: number;
  nodes: number;
  edges: number;
  /** actual edge list, so a failing assertion is diagnosable from the report */
  edgeList: string[];
  durationMs: number;
  requests: number;
  truePositives: string[];
  falseNegatives: string[];
  falsePositives: string[];
  unlabelled: string[];
  criticalExpected: number;
  criticalInspected: number;
  capabilityOk: boolean;
  edgeOk: boolean;
  error?: string;
}

export interface BenchmarkReport {
  generatedAt: string;
  engineVersion: string;
  cases: CaseResult[];
  totals: {
    tp: number;
    fp: number;
    fn: number;
    precision: number | null;
    recall: number | null;
    f1: number | null;
    criticalExpected: number;
    criticalInspected: number;
    criticalRecall: number | null;
    structuralChecks: number;
    structuralPassed: number;
  };
}

function makeClient(c: BenchmarkCase): { client: GitHubClient; requested: string[] } {
  const entries: GitHubTreeEntry[] = Object.entries(c.files).map(([path, content]) => ({
    path,
    mode: "100644",
    type: "blob",
    size: content.length,
    sha: `sha-${path}`,
  }));
  const repo: GitHubRepoResponse = {
    name: c.id,
    description: c.description,
    default_branch: "main",
    stargazers_count: 1,
    forks_count: 0,
    open_issues_count: 0,
    license: c.license ? { spdx_id: c.license } : null,
    created_at: "2024-01-01T00:00:00Z",
    pushed_at: "2026-01-01T00:00:00Z",
    size: 10,
    private: false,
  };
  const snapshot: RateLimitSnapshot = { limit: 60, remaining: 55, resetAt: "2026-01-01T01:00:00Z" };
  const requested: string[] = [];

  const client: GitHubClient = {
    getRepo: async () => repo,
    getTree: async () => ({ entries, truncated: false }),
    getBlobText: async (_o, _r, sha) => {
      const path = sha.replace("sha-", "");
      requested.push(path);
      return c.files[path] ?? null;
    },
    rateLimit: async () => snapshot,
    lastRateLimit: snapshot,
  };
  return { client, requested };
}

export async function runCase(c: BenchmarkCase): Promise<CaseResult> {
  const { client, requested } = makeClient(c);
  let analysis: RepoAnalysis | null = null;
  let error: string | undefined;
  try {
    analysis = await runAnalysis(client, { owner: "bench", repo: c.id, now: new Date("2026-01-01T00:00:00Z") });
  } catch (e) {
    error = e instanceof Error ? e.message : "analysis failed";
  }

  if (!analysis) {
    return {
      id: c.id,
      description: c.description,
      inspected: 0,
      eligible: 0,
      inspectedPct: 0,
      parsed: 0,
      parseFailures: 0,
      unresolvedImports: 0,
      nodes: 0,
      edges: 0,
      edgeList: [],
      durationMs: 0,
      requests: requested.length,
      truePositives: [],
      falseNegatives: [...c.expected.issues],
      falsePositives: [],
      unlabelled: [],
      criticalExpected: c.expected.criticalInspected?.length ?? 0,
      criticalInspected: 0,
      capabilityOk: false,
      edgeOk: false,
      error,
    };
  }

  const detected = analysis.issues.map((i) => i.title);
  const expected = new Set(c.expected.issues);
  const forbidden = new Set(c.expected.forbidden);

  const truePositives = [...expected].filter((t) => detected.includes(t));
  const falseNegatives = [...expected].filter((t) => !detected.includes(t));
  const falsePositives = [...forbidden].filter((t) => detected.includes(t));
  const unlabelled = [...new Set(detected.filter((t) => !expected.has(t) && !forbidden.has(t)))];

  const critical = c.expected.criticalInspected ?? [];
  const criticalInspected = critical.filter((p) => requested.includes(p)).length;

  const caps = analysis.analysis.coverage?.capabilities;
  const expectedCap = c.expected.capability ?? {};
  const capabilityOk =
    (expectedCap.full === undefined || caps?.full === expectedCap.full) &&
    (expectedCap.partial === undefined || caps?.partial === expectedCap.partial) &&
    (expectedCap.importOnly === undefined || caps?.importOnly === expectedCap.importOnly);

  const edges = analysis.graph.edges;
  const edgeOk =
    (c.expected.minEdges === undefined || edges.length >= c.expected.minEdges) &&
    (c.expected.edge === undefined || edges.some((e) => e.from === c.expected.edge!.from && e.to === c.expected.edge!.to));

  return {
    id: c.id,
    description: c.description,
    inspected: analysis.analysis.coverage?.inspectedFiles ?? 0,
    eligible: analysis.analysis.coverage?.eligibleFiles ?? 0,
    inspectedPct: analysis.analysis.coverage?.inspectedPct ?? 0,
    parsed: analysis.analysis.coverage?.parsedFiles ?? 0,
    parseFailures: analysis.analysis.coverage?.parseFailures ?? 0,
    unresolvedImports: analysis.graph.unresolvedImports ?? 0,
    nodes: analysis.graph.nodes.length,
    edges: edges.length,
    edgeList: edges.map((e) => `${e.from}->${e.to}`),
    durationMs: analysis.analysis.durationMs,
    requests: requested.length,
    truePositives,
    falseNegatives,
    falsePositives,
    unlabelled,
    criticalExpected: critical.length,
    criticalInspected,
    capabilityOk,
    edgeOk,
    error,
  };
}

export function summarise(cases: CaseResult[], engineVersion: string): BenchmarkReport {
  const tp = cases.reduce((n, c) => n + c.truePositives.length, 0);
  const fp = cases.reduce((n, c) => n + c.falsePositives.length, 0);
  const fn = cases.reduce((n, c) => n + c.falseNegatives.length, 0);
  const precision = tp + fp > 0 ? tp / (tp + fp) : null;
  const recall = tp + fn > 0 ? tp / (tp + fn) : null;
  const f1 = precision !== null && recall !== null && precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : null;

  const criticalExpected = cases.reduce((n, c) => n + c.criticalExpected, 0);
  const criticalInspected = cases.reduce((n, c) => n + c.criticalInspected, 0);
  const structuralChecks = cases.length * 2; // capability + edge assertion per case
  const structuralPassed = cases.reduce((n, c) => n + (c.capabilityOk ? 1 : 0) + (c.edgeOk ? 1 : 0), 0);

  return {
    generatedAt: new Date().toISOString(),
    engineVersion,
    cases,
    totals: {
      tp,
      fp,
      fn,
      precision,
      recall,
      f1,
      criticalExpected,
      criticalInspected,
      criticalRecall: criticalExpected > 0 ? criticalInspected / criticalExpected : null,
      structuralChecks,
      structuralPassed,
    },
  };
}
