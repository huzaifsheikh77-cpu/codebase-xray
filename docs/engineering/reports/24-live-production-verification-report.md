# 24 — Live Production Verification

**Status:** PARTIAL — a public Vercel URL was observed returning 200 during the 2026-11-06 audit; deployment commit/environment and current behavior remain unverified. No deployment was performed in B1.

## What was executed (local production build only)

| Probe | Result |
|---|---|
| `GET /` | 200 |
| Security headers | CSP, XFO, nosniff, referrer, permissions present |
| Demo POST | 200 (dev config) |
| `VERCEL_ENV=production`, no store | 503 `QUOTA_UNAVAILABLE` (analysis and demo) |
| `VERCEL_ENV=production`, no GitHub token | 503 `CONFIGURATION_REQUIRED` |
| AI route | 503 `AI_UNAVAILABLE` |
| Fresh live scan (`sindresorhus/p-map`) | 200, 14/14 files, 7 parsed, 5 edges, 10 issues, 38/60 quota, 1,642 ms |
| Build | success, 6.0 s |

These are **not** deployment tests: same machine, `next start`, no Vercel edge, no shared Redis. The separately observed live URL is listed only as existence evidence, not as verification of the current working tree.

## Not measured

Cold start, serverless duration distribution, multi-instance quota consistency, deployed commit/environment, production headers, production rate-limit reset, memory, cross-region latency, cache behaviour.

## Rule applied

No old or local result is presented as fresh production evidence. The next milestone step is to run the updated smoke script in Report 23 against the deployed URL and record status codes, headers, private-rejection behavior and admission behavior verbatim.
