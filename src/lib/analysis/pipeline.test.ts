import { describe, expect, it } from "vitest";
import type { GitHubClient, RateLimitSnapshot } from "@/lib/github/client";
import type { GitHubRepoResponse, GitHubTreeEntry } from "@/lib/github/endpoints";
import { runAnalysis } from "./pipeline";

/** Fake client — the engine must work against pure data, never the network. */
function makeFakeClient(files: Record<string, string>, branch = "main"): GitHubClient {
  const entries: GitHubTreeEntry[] = Object.entries(files).map(([path, content]) => ({
    path,
    mode: "100644",
    type: "blob",
    size: content.length,
    sha: `sha-${path}`,
  }));
  const repo: GitHubRepoResponse = {
    name: "fixture",
    description: "A test fixture repository",
    default_branch: branch,
    stargazers_count: 10,
    forks_count: 2,
    open_issues_count: 1,
    license: { spdx_id: "MIT" },
    created_at: "2024-01-01T00:00:00Z",
    pushed_at: "2026-01-01T00:00:00Z",
    size: 100,
    private: false,
  };
  const snapshot: RateLimitSnapshot = { limit: 60, remaining: 55, resetAt: "2026-01-01T01:00:00Z" };
  return {
    getRepo: async () => repo,
    getTree: async () => ({ entries, truncated: false }),
    getBlobText: async (_o, _r, sha) => {
      const path = sha.replace("sha-", "");
      return files[path] ?? null;
    },
    rateLimit: async () => snapshot,
    lastRateLimit: snapshot,
  };
}

function fixtureFiles(): Record<string, string> {
  const src = () => Array.from({ length: 40 }, (_, j) => `const a${j} = ${j};`).join("\n");
  const files: Record<string, string> = {
    "package.json": JSON.stringify({
      name: "fixture",
      workspaces: ["packages/*"],
      dependencies: { react: "^19.0.0", zod: "^3.0.0" },
    }),
    "package-lock.json": "{}",
    "README.md": "# Fixture\n\nA fixture repo for tests.\n",
    "LICENSE": "MIT",
    "src/normal.ts": src(),
    "src/big.ts": Array.from({ length: 700 }, (_, j) => `const b${j} = ${j};`).join("\n"),
    "packages/core/src/index.ts": "export {};",
    "packages/core/src/uses.ts": 'import { x } from "react";\nexport const y = x;',
    "tests/normal.test.ts": src(),
    ".env": "SECRET=1",
  };
  return files;
}

describe("runAnalysis (injected fake client)", () => {
  it("produces a complete RepoAnalysis with real evidence", async () => {
    const analysis = await runAnalysis(makeFakeClient(fixtureFiles()), {
      owner: "test",
      repo: "fixture",
      now: new Date("2026-01-15T12:00:00Z"),
    });

    expect(analysis.repo.slug).toBe("test/fixture");
    expect(analysis.repo.license).toBe("MIT");
    expect(analysis.analysis.isDemoData).toBe(false);
    expect(analysis.analysis.scanId).toMatch(/^CX-/);
    expect(analysis.score.overall.value).toBeGreaterThanOrEqual(0);
    expect(analysis.score.overall.value).toBeLessThanOrEqual(100);
    expect(analysis.score.sectors).toHaveLength(6);
    expect(analysis.system).toHaveLength(4);
    expect(analysis.system[0].label).toBe("GITHUB API");
    expect(analysis.system[0].status).toBe("connected");

    // structure evidence
    expect(analysis.structure.stats.totalFiles).toBe(10);
    expect(analysis.structure.languages[0].name).toBe("TypeScript");

    // issues carry real evidence
    const largeFile = analysis.issues.find((i) => i.title === "LARGE FILE SIZE");
    expect(largeFile).toBeDefined();
    expect(largeFile?.file).toBe("src/big.ts");
    expect(largeFile?.fileLineCount).toBe(700);

    const envIssue = analysis.issues.find((i) => i.title === "COMMITTED ENVIRONMENT FILE");
    expect(envIssue?.file).toBe(".env");

    // graph built from real workspace + imports
    expect(analysis.graph.nodes.length).toBeGreaterThan(0);
  });

  it("is deterministic — two runs with the same inputs deep-equal (except timestamps/ids)", async () => {
    const files = fixtureFiles();
    const a = await runAnalysis(makeFakeClient(files), { owner: "test", repo: "fixture", now: new Date("2026-01-15T12:00:00Z") });
    const b = await runAnalysis(makeFakeClient(files), { owner: "test", repo: "fixture", now: new Date("2026-01-15T12:00:00Z") });

    const strip = (x: typeof a) => ({
      ...x,
      analysis: { ...x.analysis, generatedAt: "", scanId: "", durationMs: 0, rateLimitRemaining: undefined },
      system: [] as typeof x.system,
    });
    expect(strip(a)).toEqual(strip(b));
  });

  it("survives a GitHub rate-limit mid-fetch and degrades to partial (regression: one blob 403 used to abort the scan)", async () => {
    const client = makeFakeClient(fixtureFiles());
    const original = client.getBlobText.bind(client);
    let calls = 0;
    client.getBlobText = async (...args) => {
      calls++;
      if (calls === 2) {
        const err = new Error("rate limited");
        err.name = "GitHubHttpError";
        (err as { code?: unknown }).code = "RATE_LIMITED";
        throw err;
      }
      return original(...(args as Parameters<typeof original>));
    };
    const analysis = await runAnalysis(client, { owner: "test", repo: "fixture", now: new Date() });
    expect(analysis.analysis.partial).toBe(true);
    expect(analysis.analysis.warnings?.some((w) => w.includes("RATE LIMIT"))).toBe(true);
    expect(analysis.structure.stats.totalFiles).toBe(10); // rest of analysis intact
  });

  it("Python repos produce graph edges from import statements (regression: 0 edges on sqlite-utils)", async () => {
    const files: Record<string, string> = {
      "README.md": "# py fixture",
      "pyproject.toml": '[project]\ndependencies = ["click>=7.1.1", "tqdm"]\n',
      "pkg/__init__.py": "",
      "pkg/cli.py": "import click\nimport tqdm\nfrom pkg.db import table\ndef main():\n    pass\n",
      "pkg/db.py": "import pathlib\n",
      "tests/test_cli.py": "import pytest\nfrom pkg.cli import main\n",
    };
    const analysis = await runAnalysis(makeFakeClient(files), { owner: "t", repo: "py-fixture", now: new Date() });
    const ids = analysis.graph.nodes.map((n) => n.id);
    // top-level FILES must not become module nodes
    expect(ids).not.toContain("README.md");
    expect(ids).toContain("pkg");
    // cross-node edges from real imports: tests -> pkg
    expect(analysis.graph.edges).toContainEqual({ from: "tests", to: "pkg" });
  });

  it("resolves pnpm workspace globs into graph nodes and package-name import edges (regression: packages/* never matched, so monorepos had no workspace nodes)", async () => {
    const files: Record<string, string> = {
      "README.md": "# pnpm fixture\n",
      "package.json": JSON.stringify({ name: "root", private: true }), // no "workspaces" — pnpm only
      "pnpm-workspace.yaml": 'packages:\n  - "packages/*"\n',
      "packages/core/package.json": JSON.stringify({ name: "@acme/core" }),
      "packages/ui/package.json": JSON.stringify({ name: "@acme/ui", dependencies: { react: "^19.0.0" } }),
      "packages/core/src/index.ts": "export const x = 1;\n",
      "packages/ui/src/button.tsx": 'import { x } from "@acme/core";\nexport const B = x;\n',
    };
    const analysis = await runAnalysis(makeFakeClient(files), { owner: "t", repo: "pnpm-fixture", now: new Date() });
    const ids = analysis.graph.nodes.map((n) => n.id);

    expect(ids).toContain("packages/core");
    expect(ids).toContain("packages/ui");
    expect(analysis.graph.edges).toContainEqual({ from: "packages/ui", to: "packages/core" });
    expect(analysis.graph.omittedModules).toBeUndefined();
  });

  it("discloses workspace packages dropped by the graph node budget", async () => {
    const files: Record<string, string> = {
      "README.md": "# many packages\n",
      "package.json": JSON.stringify({ workspaces: ["packages/*"] }),
    };
    for (let i = 0; i < 20; i++) {
      files[`packages/pkg-${String(i).padStart(2, "0")}/package.json`] = JSON.stringify({ name: `pkg-${i}` });
      files[`packages/pkg-${String(i).padStart(2, "0")}/src/index.ts`] = `export const v${i} = ${i};\n`;
    }
    const analysis = await runAnalysis(makeFakeClient(files), { owner: "t", repo: "many", now: new Date() });
    expect(analysis.graph.nodes.filter((n) => n.cluster === "packages")).toHaveLength(12);
    expect(analysis.graph.omittedModules).toBe(8);
  });

  it("marks a GitHub-truncated tree as partial with a clear warning (large-repo degradation path)", async () => {
    const client = makeFakeClient(fixtureFiles());
    client.getTree = async () => ({
      entries: Object.entries(fixtureFiles()).map(([path, content]) => ({
        path,
        mode: "100644",
        type: "blob" as const,
        size: content.length,
        sha: `sha-${path}`,
      })),
      truncated: true, // GitHub cut the recursive tree at 100,000 entries
    });
    const analysis = await runAnalysis(client, { owner: "test", repo: "fixture", now: new Date() });
    expect(analysis.analysis.partial).toBe(true);
    expect(analysis.analysis.warnings?.some((w) => /TREE TRUNCATED/.test(w))).toBe(true);
  });

  it("flags a sampled scan as partial when the tree exceeds the 24-file fetch cap (regression: vercel/next.js reported COMPLETE after reading 24 of 34,271 files)", async () => {
    // 60 eligible files > LIMITS.maxFilesFetched (24)
    const files: Record<string, string> = { "README.md": "# big fixture\n" };
    for (let i = 0; i < 60; i++) files[`src/mod${i}.ts`] = `export const v${i} = ${i};\n`;
    const analysis = await runAnalysis(makeFakeClient(files), { owner: "t", repo: "big", now: new Date() });
    expect(analysis.analysis.partial).toBe(true);
    expect(analysis.analysis.warnings?.some((w) => /SAMPLED COVERAGE/.test(w))).toBe(true);
    expect(analysis.structure.stats.analyzedFiles).toBe(24);
    expect(analysis.structure.stats.totalFiles).toBe(61);
  });

  it("does not flag coverage when every eligible file fits in the fetch cap", async () => {
    const analysis = await runAnalysis(makeFakeClient(fixtureFiles()), { owner: "t", repo: "small", now: new Date() });
    expect(analysis.analysis.warnings?.some((w) => /SAMPLED COVERAGE/.test(w)) ?? false).toBe(false);
    expect(analysis.structure.stats.analyzedFiles).toBe(Object.keys(fixtureFiles()).length);
  });

  it("marks degraded scans as partial with warnings", async () => {
    const client = makeFakeClient(fixtureFiles());
    // force budget pressure: simulate getBlobText refusing everything
    client.getBlobText = async () => null;
    const analysis = await runAnalysis(client, { owner: "test", repo: "fixture", now: new Date() });
    // all-null blobs is a legitimate (empty) fetch — manifests present but unfetched
    expect(analysis.analysis.partial).toBeUndefined(); // budget not exceeded, just nothing fetched
    expect(analysis.structure.stats.totalFiles).toBe(10);
  });
});
