import { describe, expect, it } from "vitest";
import type { GitHubClient, RateLimitSnapshot } from "@/lib/github/client";
import { GitHubHttpError } from "@/lib/github/client";
import type { GitHubRepoResponse, GitHubTreeEntry } from "@/lib/github/endpoints";
import { runAnalysis } from "./pipeline";

/**
 * Reliability tests for the network-agnostic engine. A malformed file or one
 * failed blob must degrade to a clearly marked partial result; it must not
 * crash the whole scan or silently pretend coverage was complete.
 */

function fixtureFiles(): Record<string, string> {
  return {
    "package.json": JSON.stringify({ name: "reliability-fixture", license: "MIT" }),
    "README.md": "# Reliability fixture\n\nEnough documentation to be measured.\n",
    LICENSE: "MIT",
    "src/a.ts": "export function a() { return 1; }\n",
    "src/b.ts": "export function b() { return 2; }\n",
    "src/c.ts": "export function c() { return 3; }\n",
    "src/d.ts": "export function d() { return 4; }\n",
  };
}

function makeClient(
  files: Record<string, string>,
  onBlob?: (path: string) => Promise<string | null>,
): GitHubClient {
  const entries: GitHubTreeEntry[] = Object.entries(files).map(([path, content]) => ({
    path,
    mode: "100644",
    type: "blob",
    size: Buffer.byteLength(content),
    sha: `sha-${path}`,
  }));
  const repo: GitHubRepoResponse = {
    name: "reliability-fixture",
    description: "Local reliability fixture",
    default_branch: "main",
    stargazers_count: 1,
    forks_count: 0,
    open_issues_count: 0,
    license: { spdx_id: "MIT" },
    created_at: "2024-01-01T00:00:00Z",
    pushed_at: "2026-01-01T00:00:00Z",
    size: 20,
    private: false,
  };
  const snapshot: RateLimitSnapshot = { limit: 5_000, remaining: 4_000, resetAt: "2026-01-01T01:00:00Z" };
  return {
    getRepo: async () => repo,
    getTree: async () => ({ entries, truncated: false }),
    getBlobText: async (_owner, _repo, sha) => {
      const path = sha.replace("sha-", "");
      return onBlob ? onBlob(path) : files[path] ?? null;
    },
    rateLimit: async () => snapshot,
    lastRateLimit: snapshot,
  };
}

describe("analysis reliability and partial-result disclosure", () => {
  it("returns a partial result when a blob request fails with HTTP 500", async () => {
    const client = makeClient(fixtureFiles(), async (path) => {
      if (path === "src/b.ts") throw new GitHubHttpError("UNAVAILABLE", 500, "upstream failure");
      return fixtureFiles()[path] ?? null;
    });
    const analysis = await runAnalysis(client, { owner: "fixture", repo: "reliability", now: new Date() });

    expect(analysis.analysis.partial).toBe(true);
    expect(analysis.analysis.warnings?.some((warning) => /COULD NOT BE FETCHED/.test(warning))).toBe(true);
    expect(analysis.analysis.coverage?.inspectedFiles).toBe(Object.keys(fixtureFiles()).length - 1);
  });

  it("returns a partial result when a mid-scan request returns 404", async () => {
    const client = makeClient(fixtureFiles(), async (path) => {
      if (path === "src/c.ts") throw new GitHubHttpError("NOT_FOUND_OR_PRIVATE", 404, "gone");
      return fixtureFiles()[path] ?? null;
    });
    const analysis = await runAnalysis(client, { owner: "fixture", repo: "reliability", now: new Date() });

    expect(analysis.analysis.partial).toBe(true);
    expect(analysis.analysis.coverage?.inspectedFiles).toBeLessThan(Object.keys(fixtureFiles()).length);
  });

  it("does not crash on malformed TypeScript or Python and discloses parse failures", async () => {
    const files = {
      ...fixtureFiles(),
      "src/broken.ts": "export function broken( {\n  const x = ;\n",
      "src/broken.py": "def broken(:\n  pass\n",
    };
    const analysis = await runAnalysis(makeClient(files), { owner: "fixture", repo: "reliability", now: new Date() });

    expect(analysis.analysis.coverage?.parseFailures).toBeGreaterThan(0);
    expect(analysis.analysis.partial).toBe(true);
    expect(analysis.analysis.warnings?.some((warning) => /SYNTAX DIAGNOSTICS/.test(warning))).toBe(true);
  });
});
