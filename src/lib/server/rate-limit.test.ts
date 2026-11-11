import { beforeEach, describe, expect, it } from "vitest";
import { checkRateLimit, clientKeyFrom, resetRateLimits } from "./rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => resetRateLimits());

  it("allows six requests per minute, then blocks with a retry hint", () => {
    const now = 1_000_000;
    for (let i = 0; i < 6; i++) {
      expect(checkRateLimit("1.2.3.4", now + i).allowed).toBe(true);
    }
    const blocked = checkRateLimit("1.2.3.4", now + 10);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    expect(blocked.retryAfterSeconds).toBeLessThanOrEqual(60);
  });

  it("frees a slot once the oldest request leaves the window", () => {
    const now = 2_000_000;
    for (let i = 0; i < 6; i++) checkRateLimit("1.2.3.4", now);
    expect(checkRateLimit("1.2.3.4", now + 1_000).allowed).toBe(false);
    expect(checkRateLimit("1.2.3.4", now + 60_001).allowed).toBe(true);
  });

  it("tracks clients independently", () => {
    for (let i = 0; i < 6; i++) checkRateLimit("a", 5_000);
    expect(checkRateLimit("a", 5_000).allowed).toBe(false);
    expect(checkRateLimit("b", 5_000).allowed).toBe(true);
  });
});

describe("clientKeyFrom", () => {
  const original = process.env.VERCEL;

  it("does not trust Vercel-only headers outside a Vercel deployment", () => {
    delete process.env.VERCEL;
    const req = new Request("http://localhost/", { headers: { "x-vercel-forwarded-for": "203.0.113.9" } });
    expect(clientKeyFrom(req)).toBe("unknown");
    if (original === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = original;
  });
});
