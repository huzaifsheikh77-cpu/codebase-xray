import type { AnalysisErrorCode } from "@/lib/types/analysis";
import { githubToken } from "@/lib/config/env";
import type { GitHubBlobResponse, GitHubRepoResponse, GitHubTreeResponse } from "./endpoints";

/**
 * Typed GitHub REST client — the ONLY module in the codebase that talks to
 * the GitHub API. The analysis engine never imports this file; it receives
 * an AnalysisContext built by the provider, so it stays independent of the
 * network entirely (Phase-2 amendment #3).
 *
 * Design notes:
 * - Server-side only. `GITHUB_TOKEN` (optional env) is never exposed.
 * - Every request has a hard timeout via AbortSignal.
 * - ETag caching is OPTIONAL and secondary (amendment #1): the core flow
 *   works with a cold cache; the cache only avoids repeat quota spend.
 * - Errors are classified into the shared AnalysisErrorCode union.
 */

export interface RateLimitSnapshot {
  limit: number;
  remaining: number;
  /** ISO instant when the window resets */
  resetAt: string;
}

export interface FetchedTree {
  entries: GitHubTreeResponse["tree"];
  truncated: boolean;
}

export interface GitHubClient {
  getRepo(owner: string, repo: string): Promise<GitHubRepoResponse>;
  getTree(owner: string, repo: string, ref: string): Promise<FetchedTree>;
  /** Decoded text of a blob, or null when it is oversized/binary. */
  getBlobText(owner: string, repo: string, sha: string, maxBytes: number): Promise<string | null>;
  /** Does not count against the rate limit; null when unavailable. */
  rateLimit(): Promise<RateLimitSnapshot | null>;
  /** Quota observed from the most recent response headers (null if none). */
  readonly lastRateLimit: RateLimitSnapshot | null;
}

export class GitHubHttpError extends Error {
  readonly code: AnalysisErrorCode;
  readonly status: number;
  readonly resetAt?: string;

  constructor(code: AnalysisErrorCode, status: number, message: string, resetAt?: string) {
    super(message);
    this.name = "GitHubHttpError";
    this.code = code;
    this.status = status;
    this.resetAt = resetAt;
  }
}

/**
 * API version header, verified against the documented current version at
 * implementation time (2026-03-10 per docs.github.com). If GitHub rejects
 * the header (unsupported in a future environment) requests are retried
 * once without it — we never hard-fail on version negotiation.
 */
const API_VERSION = "2026-03-10";

const ETAG_CACHE_MAX = 64;
const etagCache = new Map<string, { etag: string; body: unknown }>();

function cacheGet(url: string): { etag: string; body: unknown } | undefined {
  const hit = etagCache.get(url);
  if (!hit) return undefined;
  etagCache.delete(url);
  etagCache.set(url, hit); // LRU touch
  return hit;
}

function cachePut(url: string, etag: string, body: unknown): void {
  etagCache.set(url, { etag, body });
  if (etagCache.size > ETAG_CACHE_MAX) {
    const oldest = etagCache.keys().next().value;
    if (oldest !== undefined) etagCache.delete(oldest);
  }
}

export class HttpGitHubClient implements GitHubClient {
  private lastLimit: RateLimitSnapshot | null = null;
  private versionHeaderBroken = false;

  get lastRateLimit(): RateLimitSnapshot | null {
    return this.lastLimit;
  }

  private observeRateLimit(headers: Headers): void {
    const remaining = headers.get("x-ratelimit-remaining");
    const limit = headers.get("x-ratelimit-limit");
    const reset = headers.get("x-ratelimit-reset");
    if (remaining !== null && limit !== null) {
      this.lastLimit = {
        limit: Number(limit),
        remaining: Number(remaining),
        resetAt: reset ? new Date(Number(reset) * 1000).toISOString() : "",
      };
    }
  }

  private async requestJson<T>(url: string, timeoutMs: number, acceptRaw = false): Promise<{ body: T; status: number }> {
    const cached = !acceptRaw ? cacheGet(url) : undefined;
    const headers: Record<string, string> = {
      Accept: acceptRaw ? "application/vnd.github.raw" : "application/vnd.github+json",
    };
    const token = githubToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    if (!this.versionHeaderBroken) headers["X-GitHub-Api-Version"] = API_VERSION;
    if (cached) headers["If-None-Match"] = cached.etag;

    let res: Response;
    try {
      res = await fetch(url, { headers, signal: AbortSignal.timeout(timeoutMs), cache: "no-store" });
    } catch (e) {
      if (e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError")) {
        throw new GitHubHttpError("TIMEOUT", 0, "GitHub API request timed out.");
      }
      throw new GitHubHttpError("UNAVAILABLE", 0, "GitHub API is unreachable.");
    }

    this.observeRateLimit(res.headers);

    if (res.status === 304 && cached) {
      return { body: cached.body as T, status: 304 }; // conditional hit: no quota spent
    }

    if (!res.ok) throw this.classify(res);

    const etag = res.headers.get("etag");
    const body = (acceptRaw ? await res.text() : await res.json()) as unknown;
    if (etag && !acceptRaw) cachePut(url, etag, body);
    return { body: body as T, status: res.status };
  }

  private classify(res: Response): GitHubHttpError {
    const remaining = res.headers.get("x-ratelimit-remaining");
    const reset = res.headers.get("x-ratelimit-reset");
    const resetAt = reset ? new Date(Number(reset) * 1000).toISOString() : undefined;
    if (res.status === 403 || res.status === 429) {
      if (remaining === "0") {
        return new GitHubHttpError("RATE_LIMITED", res.status, "GitHub API rate limit exceeded.", resetAt);
      }
      return new GitHubHttpError("UNAVAILABLE", res.status, "GitHub API refused the request.");
    }
    if (res.status === 404) {
      // Without auth GitHub cannot distinguish missing vs private — be honest.
      return new GitHubHttpError("NOT_FOUND_OR_PRIVATE", 404, "Repository not found, or it is private.");
    }
    if (res.status === 409) return new GitHubHttpError("EMPTY_REPO", 409, "Repository is empty.");
    if (res.status === 451) return new GitHubHttpError("UNAVAILABLE", 451, "Repository is unavailable (legal restriction).");
    if (res.status === 400 && !this.versionHeaderBroken) {
      this.versionHeaderBroken = true; // retry without version header next time
      return new GitHubHttpError("UNAVAILABLE", 400, "GitHub API rejected the request version.");
    }
    if (res.status >= 500) return new GitHubHttpError("UNAVAILABLE", res.status, "GitHub API is having trouble.");
    return new GitHubHttpError("UNAVAILABLE", res.status, "GitHub API returned an unexpected response.");
  }

  async getRepo(owner: string, repo: string): Promise<GitHubRepoResponse> {
    const { body } = await this.requestJson<GitHubRepoResponse>(`https://api.github.com/repos/${owner}/${repo}`, 8_000);
    return body;
  }

  async getTree(owner: string, repo: string, ref: string): Promise<FetchedTree> {
    const url = `https://api.github.com/repos/${owner}/${repo}/git/trees/${encodeURIComponent(ref)}?recursive=1`;
    // A 202 means GitHub is still generating the tree (huge/fresh repos);
    // honor bounded retries instead of silently treating it as an empty tree.
    let lastStatus = 0;
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) await new Promise((r) => setTimeout(r, 1_000));
      const { body, status } = await this.requestJson<GitHubTreeResponse>(url, 12_000);
      lastStatus = status;
      if (status === 202) continue;
      if (!Array.isArray(body.tree)) throw new GitHubHttpError("UNAVAILABLE", status, "Unexpected tree response.");
      return { entries: body.tree, truncated: Boolean(body.truncated) };
    }
    throw new GitHubHttpError("UNAVAILABLE", lastStatus, "Repository tree is still being generated by GitHub.");
  }

  async getBlobText(owner: string, repo: string, sha: string, maxBytes: number): Promise<string | null> {
    const { body } = await this.requestJson<GitHubBlobResponse>(
      `https://api.github.com/repos/${owner}/${repo}/git/blobs/${sha}`,
      8_000,
    );
    if (body.encoding !== "base64" || body.size > maxBytes) return null;
    const buf = Buffer.from(body.content.replace(/\n/g, ""), "base64");
    // Binary sniff: NUL byte in the first 1 KB.
    if (buf.subarray(0, 1024).includes(0)) return null;
    return buf.toString("utf8");
  }

  async rateLimit(): Promise<RateLimitSnapshot | null> {
    try {
      const { body } = await this.requestJson<{ resources: { core: { limit: number; remaining: number; reset: number } } }>(
        "https://api.github.com/rate_limit",
        5_000,
      );
      const core = body.resources?.core;
      if (!core) return this.lastLimit;
      return { limit: core.limit, remaining: core.remaining, resetAt: new Date(core.reset * 1000).toISOString() };
    } catch {
      return this.lastLimit;
    }
  }
}
