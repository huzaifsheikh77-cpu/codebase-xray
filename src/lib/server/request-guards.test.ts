import { describe, expect, it } from "vitest";
import { isCrossOrigin, readJsonBody } from "./request-guards";

describe("isCrossOrigin", () => {
  it("accepts a same-authority origin when the runtime normalises request.url", () => {
    const request = new Request("http://localhost/api/analyze", {
      headers: { origin: "http://127.0.0.1:3210", host: "127.0.0.1:3210" },
    });
    expect(isCrossOrigin(request)).toBe(false);
  });

  it("rejects a foreign browser origin", () => {
    const request = new Request("http://127.0.0.1:3210/api/analyze", {
      headers: { origin: "https://evil.example", host: "127.0.0.1:3210" },
    });
    expect(isCrossOrigin(request)).toBe(true);
  });

  it("allows non-browser clients with no Origin header", () => {
    const request = new Request("http://127.0.0.1:3210/api/analyze");
    expect(isCrossOrigin(request)).toBe(false);
  });
});

describe("readJsonBody", () => {
  it("parses a normal JSON body and reports its byte count", async () => {
    const request = new Request("http://localhost/api/analyze", {
      method: "POST",
      body: JSON.stringify({ url: "github.com/o/r" }),
    });
    const result = await readJsonBody(request, 1_024);
    expect(result.ok).toBe(true);
    expect(result.body).toEqual({ url: "github.com/o/r" });
    expect(result.bytes).toBeGreaterThan(0);
  });

  it("rejects malformed JSON without throwing", async () => {
    const request = new Request("http://localhost/api/analyze", { method: "POST", body: "{" });
    await expect(readJsonBody(request, 1_024)).resolves.toMatchObject({ ok: false, code: "MALFORMED_JSON" });
  });

  it("stops reading an oversized chunked stream instead of buffering it", async () => {
    let reads = 0;
    const chunk = new TextEncoder().encode("x".repeat(20));
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        reads += 1;
        controller.enqueue(chunk);
      },
    });
    const request = new Request("http://localhost/api/analyze", {
      method: "POST",
      body: stream,
      duplex: "half",
    } as RequestInit & { duplex: "half" });

    const result = await readJsonBody(request, 20);
    expect(result.ok).toBe(false);
    expect(result.code).toBe("PAYLOAD_TOO_LARGE");
    // The reader must cancel after crossing the cap, not consume indefinitely.
    expect(reads).toBeLessThan(5);
  });
});
