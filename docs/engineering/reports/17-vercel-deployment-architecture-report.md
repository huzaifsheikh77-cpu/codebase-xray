# 17 — Vercel Deployment Architecture

> **Historical record.** Deployment was not executed in this report. A public URL was later observed returning 200, but its commit/environment remains unverified; see `../CODEBASE_XRAY_MASTER_STATUS.md` and Report 24.

**Status:** PREPARED, NOT DEPLOYED

## Runtime decision

Both API routes run on the **Node.js runtime**:

- `src/app/api/analyze/route.ts` — Node is required: `Buffer` (base64 blobs), the TypeScript compiler API, and 8-way concurrent fetches. Edge would lose `node:crypto` (quota key hashing) and the TS compiler.
- `src/app/api/ai/route.ts` — Node for `node:crypto`-free provider fetch and shared quota; Edge offers no benefit here.

`export const maxDuration = 60` is set in both route files. This is the correct Next.js-native mechanism; no `vercel.json` `functions` block was added, because framework detection plus route segment config already covers it and a path pattern can fail validation against built serverless functions.

## Serverless compatibility audit

| Concern | Reality | Handling |
|---|---|---|
| Per-instance memory | modules freeze/thaw unpredictably | shared quota store; memory only outside production |
| In-flight state | no shared dedupe | Redis `SET NX` scan lock with 90 s TTL |
| Execution time | Hobby/pro plan limits | 35 s internal deadline < 60 s route max |
| Response size | analysis JSON can be large | no-store, no caching of results; bounded sample |
| Filesystem | read-only except `/tmp` | no filesystem writes at runtime |
| Build | `next build` only | `.vercelignore` excludes docs/benchmarks |
| Fonts | `next/font/google` fetched at build | unchanged; Vercel build has network |

## Files

- `.vercelignore` — excludes `docs/`, `benchmarks/`, `.github/`, `.freebuff/`, `.cloud-attachments/`, `*.tsbuildinfo`.
- No `vercel.json`: unnecessary, and the Next.js preset should not be overridden.
- No `.env` committed; `.env.example` documents every variable.

## Environment variables

| Variable | Required | Scope | Secret | Purpose |
|---|---|---|---|---|
| `GITHUB_TOKEN` | **yes in production** | server | yes | 5,000/h quota; public-read token, no scopes |
| `UPSTASH_REDIS_REST_URL` | **yes in production** | server | no | shared counters/locks |
| `UPSTASH_REDIS_REST_TOKEN` | **yes in production** | server | yes | store auth |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | alternative | server | token yes | Vercel KV naming |
| `AI_API_KEY` | optional | server | yes | assistant; absence = disabled panel |
| `AI_MODEL`, `AI_BASE_URL` | optional | server | no | provider config |
| `VERCEL_ENV` | injected | server | no | selects production policy |
| `ALLOW_MEMORY_QUOTA` | optional | server | no | local/preview escape hatch only |
| `ALLOW_ANONYMOUS_GITHUB` | optional | server | no | explicit opt-out of token requirement |
| `ANALYSIS_RATE_LIMIT` / `ANALYSIS_GLOBAL_LIMIT` | optional | server | no | defaults 6 / 40 per minute |
| `AI_RATE_LIMIT` / `AI_GLOBAL_LIMIT` | optional | server | no | defaults 4 / 20 |
| `ANALYSIS_MAX_FILES`, `ANALYSIS_CONCURRENCY` | optional | server | no | clamped budget overrides |
| `ANALYSIS_DISABLED`, `AI_DISABLED` | optional | server | no | emergency switches |

No secret is prefixed `NEXT_PUBLIC_`. No variable is read in a client component.

## Environments

- **Local:** no `VERCEL_ENV` → in-memory limiter allowed; `.env.local` for optional token/AI.
- **Preview:** `VERCEL_ENV=preview` → in-memory allowed, but use *separate* Upstash and GitHub credentials so preview cannot spend production quota.
- **Production:** `VERCEL_ENV=production` → shared store and GitHub token required; analysis returns 503 `QUOTA_UNAVAILABLE` / `CONFIGURATION_REQUIRED` otherwise.

## Build validation

`npm run build` succeeds locally (Node 24). Vercel uses Node 20/22; `engines` requires ≥20.9.0. No Node-24-only API is used (`AbortSignal.timeout` is available in 20).
