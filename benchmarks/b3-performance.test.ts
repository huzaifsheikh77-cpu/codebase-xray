import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import { describe, expect, it } from "vitest";
import type { GitHubClient, RateLimitSnapshot } from "@/lib/github/client";
import type { GitHubRepoResponse, GitHubTreeEntry } from "@/lib/github/endpoints";
import { runAnalysis } from "@/lib/analysis/pipeline";

/**
 * B3 deterministic performance harness.
 *
 * This is deliberately separate from the accuracy benchmark and does not
 * rewrite docs/engineering/benchmarks/latest.*. It exercises the real
 * pipeline with an in-process fake GitHub client so timings are comparable
 * across runs without consuming network quota.
 */

interface PerfCase {
  id: string;
  packages: number;
  malformed?: boolean;
  description: string;
}

interface PerfResult {
  id: string;
  description: string;
  eligibleFiles: number;
  inspectedFiles: number;
  inspectedPct: number;
  parsedFiles: number;
  parseFailures: number;
  graphNodes: number;
  graphEdges: number;
  requests: number;
  analysisDurationMs: number;
  wallMs: number;
  heapDeltaBytes: number;
  partial: boolean;
}

const CASES: PerfCase[] = [
  { id: "small-30", packages: 15, description: "30-package-file workspace, complete inspection" },
  { id: "medium-150", packages: 75, description: "150-package-file workspace, sampled at the medium tier" },
  { id: "large-1200", packages: 600, malformed: true, description: "1,200-file workspace with one malformed source file" },
];

function syntheticFiles(spec: PerfCase): Record<string, string> {
  const files: Record<string, string> = {
    "package.json": JSON.stringify(
      {
        name: "b3-performance-fixture",
        private: true,
        license: "MIT",
        workspaces: ["packages/*"],
        scripts: { test: "vitest run" },
        dependencies: { typescript: "^5" },
      },
      null,
      2,
    ),
    "README.md": `# B3 performance fixture\n\n${"Deterministic synthetic repository used to measure the local analysis pipeline. ".repeat(20)}\n`,
    LICENSE: "MIT\n",
    ".github/workflows/ci.yml": "name: CI\non: push\njobs:\n  test:\n    runs-on: ubuntu-latest\n",
    // Root entry + cross-directory import ensures the graph has real edges
    // even when a large tree is sampled before the package files.
    "main.ts": 'import { helper } from "./lib/helper";\nexport const start = helper;\n',
    "lib/helper.ts": "export const helper = 1;\n",
  };

  for (let i = 0; i < spec.packages; i++) {
    const name = `pkg-${String(i).padStart(3, "0")}`;
    const next = `pkg-${String((i + 1) % spec.packages).padStart(3, "0")}`;
    files[`packages/${name}/package.json`] = JSON.stringify({ name: `@fixture/${name}`, version: "1.0.0" });
    const lines = [
      `import { value as nextValue } from "@fixture/${next}";`,
      `export const value = ${i};`,
      `export function compute${i}(input: number): number {`,
      "  let total = input;",
      "  for (let i = 0; i < 5; i++) total += i;",
      "  return total + nextValue;",
      "}",
    ];
    if (spec.malformed && i === Math.floor(spec.packages / 2)) {
      lines.push("export function broken( {");
    }
    files[`packages/${name}/src/index.ts`] = lines.join("\n");
  }
  return files;
}

function fakeClient(files: Record<string, string>): { client: GitHubClient; requests: () => number } {
  const entries: GitHubTreeEntry[] = Object.entries(files).map(([filePath, content]) => ({
    path: filePath,
    mode: "100644",
    type: "blob",
    size: Buffer.byteLength(content),
    sha: `sha-${filePath}`,
  }));
  const repo: GitHubRepoResponse = {
    name: "b3-performance-fixture",
    description: "Deterministic B3 performance fixture",
    default_branch: "main",
    stargazers_count: 1,
    forks_count: 0,
    open_issues_count: 0,
    license: { spdx_id: "MIT" },
    created_at: "2024-01-01T00:00:00Z",
    pushed_at: "2026-01-01T00:00:00Z",
    size: 1_000,
    private: false,
  };
  const snapshot: RateLimitSnapshot = { limit: 5_000, remaining: 4_000, resetAt: "2026-01-01T01:00:00Z" };
  let requestCount = 0;
  const client: GitHubClient = {
    getRepo: async () => repo,
    getTree: async () => ({ entries, truncated: false }),
    getBlobText: async (_owner, _repo, sha) => {
      requestCount++;
      return files[sha.replace("sha-", "")] ?? null;
    },
    rateLimit: async () => snapshot,
    lastRateLimit: snapshot,
  };
  return { client, requests: () => requestCount };
}

async function measure(spec: PerfCase): Promise<PerfResult> {
  const files = syntheticFiles(spec);
  const { client, requests } = fakeClient(files);
  const heapBefore = process.memoryUsage().heapUsed;
  const wallStart = performance.now();
  const analysis = await runAnalysis(client, {
    owner: "fixture",
    repo: spec.id,
    now: new Date("2026-01-01T00:00:00Z"),
  });
  const wallMs = performance.now() - wallStart;
  const heapDeltaBytes = process.memoryUsage().heapUsed - heapBefore;
  return {
    id: spec.id,
    description: spec.description,
    eligibleFiles: analysis.analysis.coverage?.eligibleFiles ?? 0,
    inspectedFiles: analysis.analysis.coverage?.inspectedFiles ?? 0,
    inspectedPct: analysis.analysis.coverage?.inspectedPct ?? 0,
    parsedFiles: analysis.analysis.coverage?.parsedFiles ?? 0,
    parseFailures: analysis.analysis.coverage?.parseFailures ?? 0,
    graphNodes: analysis.graph.nodes.length,
    graphEdges: analysis.graph.edges.length,
    requests: requests(),
    analysisDurationMs: analysis.analysis.durationMs,
    wallMs,
    heapDeltaBytes,
    partial: Boolean(analysis.analysis.partial),
  };
}

describe("B3 deterministic performance harness", () => {
  it("measures small, medium and large synthetic repositories without overwriting accuracy artifacts", async () => {
    const results: PerfResult[] = [];
    for (const spec of CASES) results.push(await measure(spec));

    const output = {
      generatedAt: new Date().toISOString(),
      node: process.version,
      cases: results,
    };
    const outPath = path.join(os.tmpdir(), "codebase-xray-b3-performance.json");
    fs.writeFileSync(outPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
    console.info(`[b3-performance] ${JSON.stringify(output)}`);
    console.info(`[b3-performance] artifact: ${outPath}`);

    expect(results).toHaveLength(3);
    expect(results.every((r) => r.inspectedFiles > 0)).toBe(true);
    expect(results.every((r) => r.graphEdges > 0)).toBe(true);
    expect(results.find((r) => r.id === "large-1200")?.partial).toBe(true);
    expect(results.find((r) => r.id === "large-1200")?.parseFailures).toBeGreaterThan(0);
    expect(results.every((r) => r.wallMs < 30_000)).toBe(true);
  });
});
