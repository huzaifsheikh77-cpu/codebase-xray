/**
 * Public-endpoint quota enforcement.
 *
 * Two layers, deliberately separate:
 *  - `checkRateLimit` is the original in-memory sliding window. It is used
 *    by unit tests and as the local/preview fallback.
 *  - `enforceQuota` is the production path: a shared atomic counter plus a
 *    global service budget. Counters are incremented only when the request
 *    is admitted, so rejected traffic cannot exhaust the shared budget. It
 *    fails closed on a Vercel production
 *    deployment when no shared store is configured, because per-instance
 *    memory cannot protect the shared GitHub quota or AI credits.
 *
 * Identity: on Vercel, the platform overwrites `x-forwarded-for` and also
 * exposes `x-vercel-forwarded-for` (identical, but survives an upstream
 * proxy). We trust those only when `VERCEL === "1"`, and only as a coarse
 * anonymous bucket — never as authentication. Outside Vercel the headers
 * are client-controlled, so the fallback is documented as best-effort.
 */

import { createHash } from "node:crypto";
import { memoryQuotaStore, type QuotaStore, sharedQuotaStore } from "./quota-store";

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
    const oldestKey = hits.keys().next().value;
    if (oldestKey !== undefined && oldestKey !== clientKey) hits.delete(oldestKey);
  }

  return { allowed: true, retryAfterSeconds: 0, remaining: MAX_REQUESTS - recent.length };
}

/**
 * Coarse caller identity. On Vercel the platform sets these headers; we do
 * not trust them elsewhere. The value is hashed before it becomes a storage
 * key, so raw IPs are not retained in the quota store.
 */
export function clientKeyFrom(request: Request): string {
  if (process.env.VERCEL === "1") {
    const trusted = request.headers.get("x-vercel-forwarded-for") ?? request.headers.get("x-forwarded-for");
    const first = trusted?.split(",")[0]?.trim();
    if (first) return first;
  }
  const forwarded = request.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  const real = request.headers.get("x-real-ip")?.trim();
  return first || real || "unknown";
}

function hashedKey(scope: string, request: Request): string {
  return createHash("sha256").update(`${scope}:${clientKeyFrom(request)}`).digest("hex").slice(0, 32);
}

export interface QuotaDecision {
  allowed: boolean;
  retryAfterSeconds: number;
  remaining: number;
  /** set when the limiter itself is unavailable (production fails closed) */
  unavailable?: boolean;
}

/** Production on Vercel, or an operator explicitly requiring shared state. */
export function requiresSharedQuota(): boolean {
  return process.env.VERCEL_ENV === "production" || process.env.REQUIRE_SHARED_QUOTA === "1";
}

/**
 * The store used for enforcement: shared when configured, in-memory only
 * when this is not a production deployment. Null means "cannot enforce".
 */
export function activeQuotaStore(): QuotaStore | null {
  const shared = sharedQuotaStore();
  if (shared) return shared;
  // Explicit, auditable opt-out for local `next start` and preview hosts.
  // Never enable this on a public deployment: state is per instance.
  if (process.env.ALLOW_MEMORY_QUOTA === "1") return memoryQuotaStore;
  if (requiresSharedQuota()) return null;
  return memoryQuotaStore;
}

function positiveInt(raw: string | undefined, fallback: number): number {
  const value = Number(raw ?? "");
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

export interface QuotaLimits {
  perClient: number;
  global: number;
  windowMs: number;
}

export function quotaLimits(scope: "analysis" | "ai"): QuotaLimits {
  if (scope === "ai") {
    return {
      perClient: positiveInt(process.env.AI_RATE_LIMIT, 4),
      global: positiveInt(process.env.AI_GLOBAL_LIMIT, 20),
      windowMs: WINDOW_MS,
    };
  }
  return {
    perClient: positiveInt(process.env.ANALYSIS_RATE_LIMIT, 6),
    global: positiveInt(process.env.ANALYSIS_GLOBAL_LIMIT, 8),
    windowMs: WINDOW_MS,
  };
}

/** Enforce a per-client AND a global budget atomically. */
export async function enforceQuota(scope: "analysis" | "ai", request: Request): Promise<QuotaDecision> {
  const limits = quotaLimits(scope);
  const store = activeQuotaStore();
  if (!store) {
    return { allowed: false, retryAfterSeconds: 60, remaining: 0, unavailable: true };
  }

  try {
    const identity = hashedKey(scope, request);
    const decision = await store.consume(
      [
        { key: `xray:${scope}:id:${identity}`, limit: limits.perClient },
        { key: `xray:${scope}:global`, limit: limits.global },
      ],
      limits.windowMs,
    );
    if (!decision.allowed) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil(decision.ttlMs / 1000)),
        remaining: 0,
      };
    }
    const [perClientCount = 0, globalCount = 0] = decision.counts;
    return {
      allowed: true,
      retryAfterSeconds: 0,
      remaining: Math.max(0, Math.min(limits.perClient - perClientCount, limits.global - globalCount)),
    };
  } catch (e) {
    // Never crash the route and never silently allow unlimited usage.
    console.warn(`[quota] store failure (${e instanceof Error ? e.message : "unknown"})`);
    return { allowed: false, retryAfterSeconds: 60, remaining: 0, unavailable: true };
  }
}

/**
 * A coarse hourly scan admission budget. It bounds total work independently
 * of the per-minute burst limit, which is what keeps a 5,000/hour GitHub
 * token from being consumed by a short burst of large scans.
 */
export async function enforceScanHourlyBudget(): Promise<QuotaDecision> {
  return enforceWindowBudget("scan-hour", positiveInt(process.env.SCAN_HOURLY_LIMIT, 24), 60 * 60_000);
}

/** Hard global ceiling for assistant calls per UTC day (all clients). */
export async function enforceAiDailyBudget(): Promise<QuotaDecision> {
  return enforceWindowBudget("ai-day", positiveInt(process.env.AI_DAILY_REQUESTS, 200), 24 * 60 * 60_000);
}

async function enforceWindowBudget(scope: string, limit: number, windowMs: number): Promise<QuotaDecision> {
  const store = activeQuotaStore();
  if (!store) return { allowed: false, retryAfterSeconds: 60, remaining: 0, unavailable: true };
  try {
    const bucket = new Date().toISOString().slice(0, scope === "ai-day" ? 10 : 13);
    const decision = await store.consume([{ key: `xray:${scope}:${bucket}`, limit }], windowMs);
    return {
      allowed: decision.allowed,
      retryAfterSeconds: decision.allowed ? 0 : Math.max(1, Math.ceil(decision.ttlMs / 1000)),
      remaining: decision.allowed ? Math.max(0, limit - (decision.counts[0] ?? 0)) : 0,
    };
  } catch (e) {
    console.warn(`[quota] ${scope} store failure (${e instanceof Error ? e.message : "unknown"})`);
    return { allowed: false, retryAfterSeconds: 60, remaining: 0, unavailable: true };
  }
}

/** Cross-instance duplicate-scan guard. Returns true when the caller owns the lock. */
export async function acquireScanLock(ownerRepo: string): Promise<boolean> {
  const store = activeQuotaStore();
  if (!store) return false;
  try {
    return await store.acquireLock(`xray:scan:${ownerRepo.toLowerCase()}`, 90_000);
  } catch {
    return false;
  }
}

export async function releaseScanLock(ownerRepo: string): Promise<void> {
  const store = activeQuotaStore();
  if (!store) return;
  try {
    await store.releaseLock(`xray:scan:${ownerRepo.toLowerCase()}`);
  } catch {
    // The TTL releases it; a failed unlock must not mask the scan result.
  }
}

/** Test seam — clears tracked windows. */
export function resetRateLimits(): void {
  hits.clear();
  memoryQuotaStore.clear();
}
