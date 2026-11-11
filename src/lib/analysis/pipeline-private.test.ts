import { describe, expect, it, vi } from "vitest";
import type { GitHubClient, RateLimitSnapshot } from "@/lib/github/client";
import type { GitHubRepoResponse, GitHubTreeEntry } from "@/lib/github/endpoints";
import { AnalysisFailure, runAnalysis } from "./pipeline";

const snapshot: RateLimitSnapshot = { limit: 5_000, remaining: 4_000, resetAt: "2026-01-01T01:00:00Z" };

function privateClient() {
  const getTree = vi.fn(async () => ({ entries: [] as GitHubTreeEntry[], truncated: false }));
  const getBlobText = vi.fn(async () => "secret");
  const repo: GitHubRepoResponse = {
    name: "private-repo",
    description: "must not be read",
    default_branch: "main",
    stargazers_count: 1,
    forks_count: 0,
    open_issues_count: 0,
    license: null,
    created_at: "2024-01-01T00:00:00Z",
    pushed_at: "2026-01-01T00:00:00Z",
    size: 100,
    private: true,
  };
  const client: GitHubClient = {
    getRepo: async () => repo,
    getTree,
    getBlobText,
    rateLimit: async () => snapshot,
    lastRateLimit: snapshot,
  };
  return { client, getTree, getBlobText };
}

function clientWithRepo(repo: unknown) {
  const getTree = vi.fn(async () => ({ entries: [] as GitHubTreeEntry[], truncated: false }));
  const getBlobText = vi.fn(async () => "secret");
  const client: GitHubClient = {
    getRepo: async () => repo as GitHubRepoResponse,
    getTree,
    getBlobText,
    rateLimit: async () => snapshot,
    lastRateLimit: snapshot,
  };
  return { client, getTree, getBlobText };
}

describe("private repository boundary", () => {
  it("rejects before tree or blob retrieval", async () => {
    const { client, getTree, getBlobText } = privateClient();
    await expect(
      runAnalysis(client, { owner: "o", repo: "private-repo", now: new Date() }),
    ).rejects.toMatchObject({ code: "PRIVATE_REPOSITORY_NOT_SUPPORTED" });
    expect(getTree).not.toHaveBeenCalled();
    expect(getBlobText).not.toHaveBeenCalled();
  });

  it("rejects pre-fetched private metadata before retrieval", async () => {
    const { client, getTree } = privateClient();
    const repo = await client.getRepo("o", "private-repo");
    await expect(
      runAnalysis(client, { owner: "o", repo: "private-repo", now: new Date(), repoData: repo }),
    ).rejects.toBeInstanceOf(AnalysisFailure);
    expect(getTree).not.toHaveBeenCalled();
  });

  it("fails closed when metadata is missing the private flag", async () => {
    const { client, getTree, getBlobText } = clientWithRepo({
      name: "ambiguous",
      default_branch: "main",
      size: 10,
    });
    await expect(
      runAnalysis(client, { owner: "o", repo: "ambiguous", now: new Date() }),
    ).rejects.toMatchObject({ code: "INVALID_REPOSITORY_METADATA" });
    expect(getTree).not.toHaveBeenCalled();
    expect(getBlobText).not.toHaveBeenCalled();
  });

  it("fails safely on malformed metadata before retrieval", async () => {
    const { client, getTree } = clientWithRepo({ private: false, default_branch: 42 });
    await expect(
      runAnalysis(client, { owner: "o", repo: "broken", now: new Date() }),
    ).rejects.toMatchObject({ code: "INVALID_REPOSITORY_METADATA" });
    expect(getTree).not.toHaveBeenCalled();
  });
});
