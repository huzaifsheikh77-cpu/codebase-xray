import { beforeEach, describe, expect, it } from "vitest";
import { GET, POST } from "./route";
import { resetRateLimits } from "@/lib/server/rate-limit";

const ENDPOINT = "https://xray.example.com/api/analyze";

function post(body: BodyInit, headers: Record<string, string> = { "content-type": "application/json" }) {
  return new Request(ENDPOINT, { method: "POST", headers, body });
}

describe("POST /api/analyze validation (no GitHub calls)", () => {
  beforeEach(() => resetRateLimits());

  it("serves demo mode entirely offline", async () => {
    const res = await POST(post(JSON.stringify({ url: "https://github.com/nebula-labs/orbit-forge" })));
    const payload = (await res.json()) as { ok: boolean; analysis?: { analysis: { isDemoData: boolean } } };
    expect(res.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.analysis?.analysis.isDemoData).toBe(true);
  });

  it("rejects a non-GitHub URL with a 400 and a machine-readable code", async () => {
    const res = await POST(post(JSON.stringify({ url: "https://gitlab.com/owner/repo" })));
    const payload = (await res.json()) as { error: { code: string } };
    expect(res.status).toBe(400);
    expect(payload.error.code).toBe("MALFORMED_URL");
  });

  it("rejects invalid JSON without throwing", async () => {
    const res = await POST(post("{not json"));
    expect(res.status).toBe(400);
  });

  it("rejects oversized bodies (chunked, so Content-Length cannot lie)", async () => {
    const res = await POST(post(JSON.stringify({ url: "https://github.com/a/b", pad: "x".repeat(5000) })));
    const payload = (await res.json()) as { error: { code: string } };
    expect(res.status).toBe(413);
    expect(payload.error.code).toBe("PAYLOAD_TOO_LARGE");
  });

  it("does not consume quota for rejected oversized bodies", async () => {
    for (let i = 0; i < 6; i++) {
      const res = await POST(post(JSON.stringify({ url: "https://github.com/a/b", pad: "x".repeat(5_000) })));
      expect(res.status).toBe(413);
    }
    const valid = await POST(post(JSON.stringify({ url: "https://github.com/nebula-labs/orbit-forge" })));
    expect(valid.status).toBe(200);
  });

  it("does not consume quota for malformed URLs", async () => {
    const previous = process.env.ANALYSIS_RATE_LIMIT;
    process.env.ANALYSIS_RATE_LIMIT = "1";
    try {
      for (let i = 0; i < 3; i++) {
        const res = await POST(post(JSON.stringify({ url: "https://gitlab.com/owner/repo" })));
        expect(res.status).toBe(400);
      }
      const valid = await POST(post(JSON.stringify({ url: "https://github.com/nebula-labs/orbit-forge" })));
      expect(valid.status).toBe(200);
    } finally {
      if (previous === undefined) delete process.env.ANALYSIS_RATE_LIMIT;
      else process.env.ANALYSIS_RATE_LIMIT = previous;
    }
  });

  it("does not consume quota for malformed JSON", async () => {
    const previous = process.env.ANALYSIS_RATE_LIMIT;
    process.env.ANALYSIS_RATE_LIMIT = "1";
    try {
      for (let i = 0; i < 3; i++) {
        const res = await POST(post("{not json"));
        expect(res.status).toBe(400);
      }
      const valid = await POST(post(JSON.stringify({ url: "https://github.com/nebula-labs/orbit-forge" })));
      expect(valid.status).toBe(200);
    } finally {
      if (previous === undefined) delete process.env.ANALYSIS_RATE_LIMIT;
      else process.env.ANALYSIS_RATE_LIMIT = previous;
    }
  });

  it("rejects missing production configuration before consuming quota", async () => {
    const previousVercelEnv = process.env.VERCEL_ENV;
    const previousToken = process.env.GITHUB_TOKEN;
    const previousAllowAnonymous = process.env.ALLOW_ANONYMOUS_GITHUB;
    const previousRateLimit = process.env.ANALYSIS_RATE_LIMIT;
    process.env.VERCEL_ENV = "production";
    process.env.ANALYSIS_RATE_LIMIT = "1";
    delete process.env.GITHUB_TOKEN;
    delete process.env.ALLOW_ANONYMOUS_GITHUB;
    try {
      const response = await POST(post(JSON.stringify({ url: "https://github.com/owner/repo" })));
      expect(response.status).toBe(503);
      expect(await response.json()).toMatchObject({ ok: false, error: { code: "CONFIGURATION_REQUIRED" } });
    } finally {
      if (previousVercelEnv === undefined) delete process.env.VERCEL_ENV;
      else process.env.VERCEL_ENV = previousVercelEnv;
      if (previousToken === undefined) delete process.env.GITHUB_TOKEN;
      else process.env.GITHUB_TOKEN = previousToken;
      if (previousAllowAnonymous === undefined) delete process.env.ALLOW_ANONYMOUS_GITHUB;
      else process.env.ALLOW_ANONYMOUS_GITHUB = previousAllowAnonymous;
      if (previousRateLimit === undefined) delete process.env.ANALYSIS_RATE_LIMIT;
      else process.env.ANALYSIS_RATE_LIMIT = previousRateLimit;
    }
  });

  it("rejects cross-origin browser requests", async () => {
    const res = await POST(
      post(JSON.stringify({ url: "https://github.com/a/b" }), {
        "content-type": "application/json",
        origin: "https://evil.example",
      }),
    );
    const payload = (await res.json()) as { error: { code: string } };
    expect(res.status).toBe(403);
    expect(payload.error.code).toBe("FORBIDDEN_ORIGIN");
  });

  it("allows same-origin requests through to validation", async () => {
    const res = await POST(
      post(JSON.stringify({ url: "not a repo" }), {
        "content-type": "application/json",
        origin: "https://xray.example.com",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("rate-limits a client after six admitted requests in a minute", async () => {
    const headers = { "content-type": "application/json", "x-forwarded-for": "203.0.113.9" };
    for (let i = 0; i < 6; i++) {
      const res = await POST(post(JSON.stringify({ url: "https://github.com/nebula-labs/orbit-forge" }), headers));
      expect(res.status).toBe(200);
    }
    const limited = await POST(post(JSON.stringify({ url: "https://github.com/nebula-labs/orbit-forge" }), headers));
    expect(limited.status).toBe(429);
    expect(limited.headers.get("retry-after")).toBeTruthy();
  });

  it("returns 405 for GET", async () => {
    const res = GET();
    expect(res.status).toBe(405);
    expect(res.headers.get("allow")).toBe("POST");
  });
});
