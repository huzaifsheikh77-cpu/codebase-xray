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

  it("rate-limits a client after six requests in a minute", async () => {
    const headers = { "content-type": "application/json", "x-forwarded-for": "203.0.113.9" };
    for (let i = 0; i < 6; i++) {
      const res = await POST(post(JSON.stringify({ url: "bad" }), headers));
      expect(res.status).toBe(400);
    }
    const limited = await POST(post(JSON.stringify({ url: "bad" }), headers));
    expect(limited.status).toBe(429);
    expect(limited.headers.get("retry-after")).toBeTruthy();
  });

  it("returns 405 for GET", async () => {
    const res = GET();
    expect(res.status).toBe(405);
    expect(res.headers.get("allow")).toBe("POST");
  });
});
