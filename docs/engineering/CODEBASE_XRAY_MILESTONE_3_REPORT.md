# CODEBASE XRAY — MILESTONE 3 REPORT

> **Historical record (2026-11-05).** Superseded by the B1 trust-boundary batch. A public URL was later observed returning 200, but deployment provenance is unverified; see `CODEBASE_XRAY_MASTER_STATUS.md`.
## Vercel Public Beta Preparation, Security Hardening & Deployment Engineering

**Date:** 2026-11-05 · **Engine:** `xray.engine v3.0.0` · **Tree:** uncommitted
**Verdict:** **DEPLOYMENT PREPARED, NOT DEPLOYED — not yet public-beta ready**

---

## A. Executive summary

The public-beta blockers from Milestone 2 are implemented: production now requires a shared quota store and a GitHub token, identity no longer trusts spoofable headers on Vercel, counters are atomic across instances, duplicate scans are locked, and every failure path is explicit. A public-beta disclosure is rendered above the app.

Deployment could not be executed: this machine has no Vercel CLI, authentication, linked project, Redis credentials or GitHub token. Nothing is live, and no production test is claimed.

## B. Baseline verification

| Check | Before | After |
|---|---|---|
| typecheck | 0 | 0 |
| lint | 0 | 0 |
| tests | 19 files / 110 | **20 files / 120** |
| benchmark | pass | pass |
| build | pass (3.7 s) | pass (6.0 s) |
| audit | 2 (1 high, 1 moderate) | unchanged |

## C. Vercel architecture

Node.js runtime for both routes; `maxDuration = 60`; internal 35 s deadline. No `vercel.json` (Next.js preset + route config suffice); `.vercelignore` excludes docs/benchmarks. Production policy is driven by `VERCEL_ENV`. AI is optional and cannot prevent startup. Secrets are server-only.

## D. Rate limiting

Shared Upstash-REST store (KV naming supported), atomic Lua `INCR`+`PEXPIRE`, per-client and global windows, hashed trusted identity (`x-vercel-forwarded-for` only when `VERCEL=1`), 90 s scan locks, fail-closed on missing store or store error, `Retry-After` on 429. Defaults 6/40 analysis, 4/20 AI.

## E. GitHub protection

Token gate in production, early `/rate_limit` refusal below 10 remaining, global and per-client budgets, duplicate-scan lock, bounded 202 retries, ETag cache (per instance, 64). Shared SHA-keyed result cache deliberately **not** shipped (no verified store, size risk) and documented.

## F. Security audit

Headers revalidated live (pre-existing, not newly added). Same-origin, byte caps, no-store, redaction, SSRF-safe fixed API base. Two defects found and fixed: the production memory escape hatch was unreachable, and a security insight claimed filename hygiene was clean while a filename finding existed. Remaining: `postcss` high via Next, no licence, IP-rotation bounded only by the global cap.

## G. AI readiness

Disabled without a key; `AI_DISABLED` switch; own quota bucket; 4k question cap; no-store. Live provider verification explicitly postponed; no success claimed.

## H. UX

Public-beta notice added with coverage/language/audit limitations. New actionable errors for quota, configuration and duplicate scans. Responsive layout **not visually verified**; no feedback link added because no real destination exists.

## I. Deployment

No preview or production deployment. Exact commands, env setup and smoke tests are in Report 23. The build is Vercel-compatible locally but not proven on Vercel.

## J. Live tests

Local production build only: `/` 200 + headers; production without store → 503 `QUOTA_UNAVAILABLE`; without token → 503 `CONFIGURATION_REQUIRED`; AI 503; fresh `sindresorhus/p-map` scan 200 (14/14 files, 5 edges, 10 issues, 38/60 quota, 1,642 ms). No deployed-origin test exists.

## K. Cost model

No prices asserted. Bounded scans, shared quotas, disabled AI, no persistence, no cron, no domain. Owner must confirm plan limits and set provider-side spend caps.

## L. Testing

```
typecheck 0 · lint 0 · tests 20 files / 120 · benchmark 7 fixtures pass
build 0 · audit 2 advisories (1 high postcss via next, 1 moderate)
```

New coverage: quota store (memory/REST), trusted-identity spoofing, global budget, fail-closed production, lock exclusivity.

## M. Remaining blockers

1. No Vercel access/credentials → cannot deploy.
2. No shared Redis instance → live limiter unverified.
3. No GitHub token configured → production scans gated off.
4. No licence (owner decision).
5. `postcss` high advisory via Next.
6. No browser E2E; responsive and deployed headers unverified.
7. AI live behaviour unverified (postponed).

## N. Release verdict

**Deployment prepared, not deployed.** The code is ready for a preview deployment and has explicit production guards, but public accessibility cannot be claimed without a real deployment, a shared store and live verification.

## O. Owner actions

1. Provide Vercel account access or run the procedure in Report 23.
2. Create Upstash Redis (separate preview/production) and set both env vars.
3. Create a fine-grained public-read GitHub token and set `GITHUB_TOKEN`.
4. Decide the licence (none was added).
5. If enabling AI: provide a key **after** scheduling the evaluation milestone.
6. Approve the Vercel plan/billing implications; no plan was purchased.

## P. Next milestone

Deploy preview → verify shared quota and headers on the real origin → run production smoke tests → then the reserved AI live-verification milestone (provider success/failure, retrieval, citation validity, injection, hallucination rubric).
