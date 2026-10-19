/**
 * Best-effort abuse guard for POST /api/analyze.
 *
 * This is a per-instance in-memory limiter, deliberately dependency-free:
 * it bounds how much GitHub quota a single client can spend from one
 * serverless instance. It is NOT a global quota — instances do not share
 * state and cold starts reset it. That limitation is documented in the
 * README; a distributed limiter would require a database, which this phase
 * explicitly avoids.
 */

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 6;
const MAX_TRACKED_CLIENTS = 2_000;

const hits = new Map<string, number[]>();

export interface RateLimitResult {
  allowed: boolean;
  /** seconds until the oldest request leaves the window */
  retryAfterSeconds: number;
  remaining: number;
}

export function checkRateLimit(clientKey: string, now = Date.now()): RateLimitResult {
  const cutoff = now - WINDOW_MS;
  const recent = (hits.get(clientKey) ?? []).filter((t) => t > cutoff);

  if (recent.length >= MAX_REQUESTS) {
    hits.set(clientKey, recent); // refresh LRU position
    const oldest = recent[0] ?? now;
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((oldest + WINDOW_MS - now) / 1000)),
      remaining: 0,
    };
  }

  recent.push(now);
  hits.set(clientKey, recent);

  if (hits.size > MAX_TRACKED_CLIENTS) {
    // Drop the least-recently-updated client instead of growing unbounded.
    const oldestKey = hits.keys().next().value;
    if (oldestKey !== undefined && oldestKey !== clientKey) hits.delete(oldestKey);
  }

  return { allowed: true, retryAfterSeconds: 0, remaining: MAX_REQUESTS - recent.length };
}

/** Behind a trusted proxy (Vercel/most hosts) this is the caller's IP. */
export function clientKeyFrom(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  const real = request.headers.get("x-real-ip")?.trim();
  return first || real || "unknown";
}

/** Test seam — clears tracked windows. */
export function resetRateLimits(): void {
  hits.clear();
}
