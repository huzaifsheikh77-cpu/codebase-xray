import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryQuotaStore, RestQuotaStore } from "./quota-store";
import {
  activeQuotaStore,
  clientKeyFrom,
  enforceQuota,
  quotaLimits,
  resetRateLimits,
} from "./rate-limit";

const originalEnv = { ...process.env };

function request(headers: Record<string, string>): Request {
  return new Request("http://localhost/api/analyze", { method: "POST", headers });
}

describe("MemoryQuotaStore", () => {
  it("increments atomically per key and reports the window TTL", async () => {
    const store = new MemoryQuotaStore();
    await expect(store.incr("k", 1_000)).resolves.toEqual({ count: 1, ttlMs: 1_000 });
    const second = await store.incr("k", 1_000);
    expect(second.count).toBe(2);
    expect((await store.incr("other", 1_000)).count).toBe(1);
  });

  it("only lets one caller hold a lock until it expires or is released", async () => {
    vi.useFakeTimers();
    const store = new MemoryQuotaStore();
    expect(await store.acquireLock("scan:a/b", 1_000)).toBe(true);
    expect(await store.acquireLock("scan:a/b", 1_000)).toBe(false);
    await store.releaseLock("scan:a/b");
    expect(await store.acquireLock("scan:a/b", 1_000)).toBe(true);
    vi.setSystemTime(Date.now() + 1_001);
    expect(await store.acquireLock("scan:a/b", 1_000)).toBe(true);
    vi.useRealTimers();
  });
});

describe("RestQuotaStore", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("sends EVAL/SET NX/DEL as documented JSON commands over TLS with a bearer token", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as unknown[];
      const result = body[0] === "EVAL" ? [3, 45_000] : body[0] === "SET" ? "OK" : 1;
      return new Response(JSON.stringify({ result }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);
    const store = new RestQuotaStore({ url: "https://example.upstash.io", token: "secret" });

    await expect(store.incr("key", 60_000)).resolves.toEqual({ count: 3, ttlMs: 45_000 });
    await expect(store.acquireLock("lock", 90_000)).resolves.toBe(true);
    await store.releaseLock("lock");

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://example.upstash.io");
    expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer secret");
    const evalBody = JSON.parse(String(init?.body)) as unknown[];
    expect(evalBody[0]).toBe("EVAL");
    expect(evalBody[3]).toBe("key");
    expect(evalBody[4]).toBe("60000");
  });

  it("treats a null SET result as a held lock", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ result: null }), { status: 200 })),
    );
    const store = new RestQuotaStore({ url: "https://example.upstash.io", token: "t" });
    await expect(store.acquireLock("lock", 1_000)).resolves.toBe(false);
  });

  it("sends one atomic consume script containing both budgets", async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      void url;
      void init;
      return new Response(JSON.stringify({ result: [1, 42_000, 1, 2] }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);
    const store = new RestQuotaStore({ url: "https://example.upstash.io", token: "secret" });

    await expect(
      store.consume(
        [
          { key: "xray:analysis:id:abc", limit: 6 },
          { key: "xray:analysis:global", limit: 8 },
        ],
        60_000,
      ),
    ).resolves.toEqual({ allowed: true, ttlMs: 42_000, counts: [1, 2] });

    const [, init] = fetchMock.mock.calls[0]!;
    const body = JSON.parse(String(init?.body)) as unknown[];
    expect(body[0]).toBe("EVAL");
    expect(body[2]).toBe("2");
    expect(body[3]).toBe("xray:analysis:id:abc");
    expect(body[4]).toBe("xray:analysis:global");
    expect(body[5]).toBe("6");
    expect(body[6]).toBe("8");
    expect(body[7]).toBe("60000");
  });
});

describe("quota enforcement", () => {
  beforeEach(() => {
    resetRateLimits();
    process.env = { ...originalEnv };
    delete process.env.VERCEL_ENV;
    delete process.env.VERCEL;
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("fails closed on a Vercel production deployment with no shared store", async () => {
    process.env.VERCEL_ENV = "production";
    await expect(enforceQuota("analysis", request({}))).resolves.toMatchObject({
      allowed: false,
      unavailable: true,
    });
    expect(activeQuotaStore()).toBeNull();
  });

  it("uses the shared store when configured, even in production", () => {
    process.env.VERCEL_ENV = "production";
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "t";
    expect(activeQuotaStore()).not.toBeNull();
  });

  it("ignores a spoofed x-forwarded-for when Vercel supplies the trusted header", async () => {
    process.env.VERCEL = "1";
    process.env.ANALYSIS_RATE_LIMIT = "2";
    process.env.ANALYSIS_GLOBAL_LIMIT = "100";

    expect(clientKeyFrom(request({ "x-vercel-forwarded-for": "203.0.113.9", "x-forwarded-for": "1.1.1.1" }))).toBe(
      "203.0.113.9",
    );

    const a = request({ "x-vercel-forwarded-for": "203.0.113.9", "x-forwarded-for": "1.1.1.1" });
    const b = request({ "x-vercel-forwarded-for": "203.0.113.9", "x-forwarded-for": "2.2.2.2" });
    expect((await enforceQuota("analysis", a)).allowed).toBe(true);
    expect((await enforceQuota("analysis", b)).allowed).toBe(true);
    expect((await enforceQuota("analysis", b)).allowed).toBe(false);
  });

  it("separates identities and enforces the global budget", async () => {
    process.env.ANALYSIS_RATE_LIMIT = "10";
    process.env.ANALYSIS_GLOBAL_LIMIT = "2";
    process.env.VERCEL = "1";
    const first = request({ "x-vercel-forwarded-for": "198.51.100.1" });
    const second = request({ "x-vercel-forwarded-for": "198.51.100.2" });
    expect((await enforceQuota("analysis", first)).allowed).toBe(true);
    expect((await enforceQuota("analysis", second)).allowed).toBe(true);
    const third = request({ "x-vercel-forwarded-for": "198.51.100.3" });
    const decision = await enforceQuota("analysis", third);
    expect(decision.allowed).toBe(false);
    expect(decision.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("never lets a local client bypass the per-client budget by rotating headers", async () => {
    process.env.ANALYSIS_RATE_LIMIT = "1";
    process.env.ANALYSIS_GLOBAL_LIMIT = "100";
    const a = request({ "x-forwarded-for": "10.0.0.1" });
    const b = request({ "x-forwarded-for": "10.0.0.2" });
    expect((await enforceQuota("analysis", a)).allowed).toBe(true);
    // Distinct local identities have distinct budgets; the global cap still bounds them.
    expect((await enforceQuota("analysis", b)).allowed).toBe(true);
    expect(quotaLimits("analysis").perClient).toBe(1);
  });

  it("does not consume global capacity when a client is already blocked", async () => {
    process.env.VERCEL = "1";
    process.env.ANALYSIS_RATE_LIMIT = "1";
    process.env.ANALYSIS_GLOBAL_LIMIT = "2";
    const a = request({ "x-vercel-forwarded-for": "203.0.113.10" });
    const b = request({ "x-vercel-forwarded-for": "203.0.113.11" });
    const c = request({ "x-vercel-forwarded-for": "203.0.113.12" });

    expect((await enforceQuota("analysis", a)).allowed).toBe(true);
    // This request is rejected by the per-client limit. If it consumed the
    // global bucket, client b's request below would be rejected too.
    expect((await enforceQuota("analysis", a)).allowed).toBe(false);
    expect((await enforceQuota("analysis", b)).allowed).toBe(true);
    expect((await enforceQuota("analysis", c)).allowed).toBe(false);
  });
});
