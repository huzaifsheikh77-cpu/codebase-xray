/**
 * Shared request guards for API routes.
 *
 * The origin check exists to stop *browser* cross-site abuse. It is
 * deliberately permissive for non-browser clients (no Origin header), which
 * is documented in the README: the endpoint is a public API, protected by
 * rate limiting rather than authentication.
 */

export function isCrossOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false; // curl/server-to-server: no browser context to spoof
  try {
    const sent = new URL(origin);
    const self = new URL(request.url);
    // `request.url` can be normalised by a dev server or reverse proxy (for
    // example 127.0.0.1 becomes localhost). The Host header is the authority
    // the browser actually addressed, so compare against it when present.
    const host = request.headers.get("host") ?? self.host;
    return sent.host !== host;
  } catch {
    return true;
  }
}

export interface BodyGuardResult {
  ok: boolean;
  body?: unknown;
  bytes: number;
  code?: "PAYLOAD_TOO_LARGE" | "MALFORMED_JSON";
}

/**
 * Read and size-check a JSON body while streaming. The limit is enforced on
 * actual bytes, before an oversized chunked body can be buffered in full.
 */
export async function readJsonBody(request: Request, maxBytes: number): Promise<BodyGuardResult> {
  const reader = request.body?.getReader();
  if (!reader) return { ok: false, bytes: 0, code: "MALFORMED_JSON" };

  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      bytes += value.byteLength;
      if (bytes > maxBytes) {
        await reader.cancel().catch(() => undefined);
        return { ok: false, bytes, code: "PAYLOAD_TOO_LARGE" };
      }
      chunks.push(value);
    }
  } catch {
    await reader.cancel().catch(() => undefined);
    return { ok: false, bytes, code: "MALFORMED_JSON" };
  } finally {
    reader.releaseLock();
  }

  const joined = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) {
    joined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const raw = new TextDecoder().decode(joined);
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null) return { ok: false, bytes, code: "MALFORMED_JSON" };
    return { ok: true, body: parsed, bytes };
  } catch {
    return { ok: false, bytes, code: "MALFORMED_JSON" };
  }
}
