# 18 — Shared Rate Limiting

**Status:** IMPLEMENTED, PARTIALLY VERIFIED — logic and adapters tested; no live Redis instance available to verify against. Updated by B1: atomic check-and-increment, rejected requests consume nothing.

## Architecture

```
request → enforceQuota(scope)
        → identity hash (SHA-256 of trusted header, truncated)
        → atomic CHECK both budgets ─┐
        → INCR only when both allow  ─┴→ shared Redis (Upstash REST)
        → allow / 429 + Retry-After
        → store error / absent → 503 (fail closed in production)
```

- **Store:** Upstash Redis REST (`UPSTASH_REDIS_REST_URL`/`_TOKEN`) or Vercel KV names (`KV_REST_API_*`). No SDK, no new dependency; commands are JSON over HTTPS.
- **Atomicity:** one Lua script checks every budget and increments only when all have room (`INCR` + `PEXPIRE` on first hit + `PTTL`). Concurrent instances cannot race, and rejected requests consume no capacity.
- **Counters:** per-client and global, per 60 s fixed window; plus an hourly scan admission budget (default 24) and an AI daily ceiling (default 200).
- **Budgets:** analysis 6/client, 8 global; AI 4/client, 20 global (env-overridable).
- **Duplicate scans:** `SET key 1 NX PX 90000` per `owner/repo`; a second concurrent scan gets 429 `SCAN_IN_PROGRESS` with `Retry-After: 20`. Released in `finally`; TTL covers crashes.
- **Identity:** on Vercel (`VERCEL=1`) the platform overwrites `x-forwarded-for` and supplies `x-vercel-forwarded-for`; only those are trusted, hashed with SHA-256 before storage. Outside Vercel the header is treated as best-effort and documented as such. IP is a coarse bucket, never authentication.
- **Failure policy:** analysis and AI **fail closed** (`503 QUOTA_UNAVAILABLE`) when the store is missing in production or errors at runtime. The route never crashes, and unlimited usage is never silently allowed.
- **Emergency:** `ANALYSIS_DISABLED=1`, `AI_DISABLED=1`.

## Verified

| Behaviour | Evidence |
|---|---|
| 6 requests allowed then 429 with retry hint | `rate-limit.test.ts` |
| trusted `x-vercel-forwarded-for` beats a spoofed `x-forwarded-for` | `quota-store.test.ts` (3 requests, same bucket) |
| rotating spoofed headers cannot reset the Vercel identity | same test |
| global budget blocks a fresh identity, and a rejected per-client request does not consume it | `quota-store.test.ts` |
| production without a store fails closed | test + **live build probe**: 503 `QUOTA_UNAVAILABLE` |
| store configured ⇒ active in production | unit test |
| lock is exclusive, expires, releases | `MemoryQuotaStore` test |
| REST adapter sends EVAL/SET NX/DEL with bearer auth | mocked-fetch test |
| local escape hatch `ALLOW_MEMORY_QUOTA=1` | code path (re-probed) |

Live probes:

```
VERCEL_ENV=production, no store  → 503 QUOTA_UNAVAILABLE (analysis and demo)
VERCEL_ENV=production, no token  → 503 CONFIGURATION_REQUIRED (with store/escape)
```

## Not verified

- A real Upstash instance (no credentials). Adapter is tested against documented command shapes only.
- Multi-instance contention under load.
- Store latency impact on p95 request time.

## Residual risk

- IP-based buckets can still be evaded by distributed clients; the **global** and hourly budgets are the backstop. GitHub admission is an estimate, not a reservation.
- The scan lock rejects duplicates rather than joining them; a legitimate second user sees a retry prompt.
- Per-instance memory is still used for preview/local; an operator who sets `ALLOW_MEMORY_QUOTA=1` in public production re-opens the Milestone 2 hole. It is documented as a non-production escape hatch.
