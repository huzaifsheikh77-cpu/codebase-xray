import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST } from "./route";

const ORIGINAL_ENV = { ...process.env };

function request(body: unknown): Request {
  return new Request("https://xray.example.com/api/ai", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/ai hosted gates", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env.VERCEL_ENV;
    delete process.env.AI_PUBLIC_ENABLED;
    delete process.env.AI_DISABLED;
    delete process.env.AI_ANALYSIS_SECRET;
    process.env.AI_API_KEY = "test-only-key";
    process.env.AI_BASE_URL = "http://127.0.0.1";
    process.env.AI_MODEL = "test-model";
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("requires explicit opt-in on preview deployments, not only production", async () => {
    process.env.VERCEL_ENV = "preview";
    const response = await POST(request({}));
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ ok: false, code: "AI_UNAVAILABLE" });
  });

  it("allows preview requests through to validation only after opt-in", async () => {
    process.env.VERCEL_ENV = "preview";
    process.env.AI_PUBLIC_ENABLED = "1";
    const response = await POST(request({}));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ ok: false, code: "MALFORMED_REQUEST" });
  });

  it("honours the emergency AI_DISABLED switch before configuration checks", async () => {
    process.env.AI_DISABLED = "1";
    const response = await POST(request({}));
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ ok: false, code: "AI_UNAVAILABLE" });
  });

  it("returns 413 for an oversized body before quota or provider work", async () => {
    const response = await POST(
      new Request("https://xray.example.com/api/ai", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "x".repeat(513 * 1024),
      }),
    );
    expect(response.status).toBe(413);
    expect(await response.json()).toMatchObject({ ok: false, code: "PAYLOAD_TOO_LARGE" });
  });
});