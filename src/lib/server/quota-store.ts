/**
 * Shared quota primitives.
 *
 * Production uses a Redis-compatible HTTP store (Upstash REST, which also
 * backs Vercel's KV integration). No SDK is required: three commands are
 * sent as JSON over fetch, and the counter increment is a single Lua script
 * so concurrent serverless instances cannot race past the limit.
 *
 * When no store is configured the in-memory implementation is used ONLY
 * outside a production deployment. Production fails closed (see
 * `rate-limit.ts`) instead of falling back to per-instance state.
 */

export interface QuotaHit {
  count: number;
  /** milliseconds until the current window expires */
  ttlMs: number;
}

export interface QuotaStore {
  /** Atomically increment a fixed-window counter. */
  incr(key: string, windowMs: number): Promise<QuotaHit>;
  /**
   * Atomically check every budget and increment only when all have room.
   * Rejected calls must not consume any counter.
   */
  consume(
    keys: { key: string; limit: number }[],
    windowMs: number,
  ): Promise<{ allowed: boolean; counts: number[]; ttlMs: number }>;
  /** SET NX with a TTL: true only for the caller that created the lock. */
  acquireLock(key: string, ttlMs: number): Promise<boolean>;
  releaseLock(key: string): Promise<void>;
}

const INCR_LUA =
  "local c=redis.call('INCR',KEYS[1]) " +
  "if c==1 then redis.call('PEXPIRE',KEYS[1],ARGV[1]) end " +
  "return {c,redis.call('PTTL',KEYS[1])}";

/** Check all keys first; only then increment. Rejected traffic consumes nothing. */
const CONSUME_LUA =
  "local counts={} " +
  "for i,key in ipairs(KEYS) do " +
  "  local current=tonumber(redis.call('GET',key) or '0') " +
  "  if current >= tonumber(ARGV[i]) then return {0,redis.call('PTTL',key)} end " +
  "end " +
  "for i,key in ipairs(KEYS) do " +
  "  local c=redis.call('INCR',key) " +
  "  if c==1 then redis.call('PEXPIRE',key,ARGV[#KEYS+1]) end " +
  "  counts[i]=c " +
  "end " +
  "local out={1,redis.call('PTTL',KEYS[1])} " +
  "for i=1,#KEYS do out[#out+1]=counts[i] end " +
  "return out";

/** Deterministic in-memory store for tests and local development. */
export class MemoryQuotaStore implements QuotaStore {
  private readonly buckets = new Map<string, { count: number; expires: number }>();
  private readonly locks = new Map<string, number>();

  async incr(key: string, windowMs: number): Promise<QuotaHit> {
    const now = Date.now();
    const current = this.buckets.get(key);
    if (!current || current.expires <= now) {
      const expires = now + windowMs;
      this.buckets.set(key, { count: 1, expires });
      return { count: 1, ttlMs: windowMs };
    }
    current.count += 1;
    return { count: current.count, ttlMs: Math.max(0, current.expires - now) };
  }

  async consume(
    keys: { key: string; limit: number }[],
    windowMs: number,
  ): Promise<{ allowed: boolean; counts: number[]; ttlMs: number }> {
    const now = Date.now();
    const current = keys.map(({ key }) => {
      const bucket = this.buckets.get(key);
      return bucket && bucket.expires > now ? bucket : null;
    });
    const blocked = current.some((bucket, i) => (bucket?.count ?? 0) >= keys[i].limit);
    if (blocked) {
      const ttlMs = Math.max(0, ...current.map((bucket) => (bucket ? bucket.expires - now : 0)));
      return { allowed: false, counts: current.map((bucket) => bucket?.count ?? 0), ttlMs };
    }
    const counts = keys.map(({ key }, i) => {
      if (!current[i]) this.buckets.set(key, { count: 1, expires: now + windowMs });
      else current[i]!.count += 1;
      return this.buckets.get(key)!.count;
    });
    const ttlMs = Math.max(0, ...keys.map(({ key }) => (this.buckets.get(key)?.expires ?? now) - now));
    return { allowed: true, counts, ttlMs };
  }

  async acquireLock(key: string, ttlMs: number): Promise<boolean> {
    const now = Date.now();
    const expires = this.locks.get(key);
    if (expires !== undefined && expires > now) return false;
    // Opportunistic cleanup so the map cannot grow without bound.
    if (this.locks.size > 1_000) {
      for (const [k, exp] of this.locks) if (exp <= now) this.locks.delete(k);
    }
    this.locks.set(key, now + ttlMs);
    return true;
  }

  async releaseLock(key: string): Promise<void> {
    this.locks.delete(key);
  }

  /** Test seam. */
  clear(): void {
    this.buckets.clear();
    this.locks.clear();
  }
}

interface RestConfig {
  url: string;
  token: string;
}

/** The configured shared store, or null. Env is read on each call for testability. */
export function restConfigFromEnv(): RestConfig | null {
  const url = (process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL ?? "").trim();
  const token = (process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN ?? "").trim();
  if (!url || !token) return null;
  if (!/^https:\/\//.test(url)) return null; // never send a token to a non-TLS endpoint
  return { url: url.replace(/\/+$/, ""), token };
}

/** Redis-over-HTTP adapter. Commands are sent in Upstash's documented array form. */
export class RestQuotaStore implements QuotaStore {
  constructor(private readonly config: RestConfig) {}

  private async command(payload: unknown[]): Promise<unknown> {
    let res: Response;
    try {
      res = await fetch(this.config.url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(2_000),
        cache: "no-store",
      });
    } catch {
      throw new Error("quota store unreachable");
    }
    if (!res.ok) throw new Error(`quota store ${res.status}`);
    const json = (await res.json()) as { result?: unknown; error?: string };
    if (json.error) throw new Error("quota store command failed");
    return json.result;
  }

  async incr(key: string, windowMs: number): Promise<QuotaHit> {
    const result = await this.command(["EVAL", INCR_LUA, "1", key, String(windowMs)]);
    if (!Array.isArray(result) || result.length < 2) throw new Error("quota store returned an unexpected result");
    return { count: Number(result[0]), ttlMs: Math.max(0, Number(result[1])) };
  }

  async consume(
    keys: { key: string; limit: number }[],
    windowMs: number,
  ): Promise<{ allowed: boolean; counts: number[]; ttlMs: number }> {
    const result = await this.command([
      "EVAL",
      CONSUME_LUA,
      String(keys.length),
      ...keys.map(({ key }) => key),
      ...keys.map(({ limit }) => String(limit)),
      String(windowMs),
    ]);
    if (!Array.isArray(result) || result.length < 2) throw new Error("quota store returned an unexpected result");
    return {
      allowed: Number(result[0]) === 1,
      ttlMs: Math.max(0, Number(result[1])),
      counts: result.slice(2).map(Number),
    };
  }

  async acquireLock(key: string, ttlMs: number): Promise<boolean> {
    const result = await this.command(["SET", key, "1", "NX", "PX", String(ttlMs)]);
    return result === "OK";
  }

  async releaseLock(key: string): Promise<void> {
    await this.command(["DEL", key]);
  }
}

export const memoryQuotaStore = new MemoryQuotaStore();

export function sharedQuotaStore(): QuotaStore | null {
  const config = restConfigFromEnv();
  return config ? new RestQuotaStore(config) : null;
}
