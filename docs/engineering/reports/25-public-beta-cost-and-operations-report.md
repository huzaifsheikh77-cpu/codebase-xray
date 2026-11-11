# 25 — Cost and Operations

> **B3 correction notice — 2026-11-07 (supersedes one figure below).** The
> original report states a **40/min global analysis limit**. The current
> implementation defaults to **8/min** globally in
> `src/lib/server/rate-limit.ts` (`ANALYSIS_GLOBAL_LIMIT=8`). The per-client
> default is 6/min (`ANALYSIS_RATE_LIMIT=6`), and the hourly admission budget
> defaults to 24 scans/hour (`SCAN_HOURLY_LIMIT=24`). All three are
> environment-configurable and clamped to positive integers. The historical
> text below is retained unchanged for auditability; treat the 40/min figure
> as a superseded snapshot, not current operating guidance. See the B3
> operations runbook and audit for the verified current values.

## Cost-generating resources

| Resource | Allowance / limit | Exposure | Safeguard |
|---|---|---|---|
| Vercel hosting | plan-dependent (owner confirms) | bandwidth + function GB-hours | 60 s max, bounded response size |
| Vercel build minutes | plan-dependent | builds | one project, no cron |
| Upstash Redis | free tier (owner confirms) | command count | 2 INCR + lock per scan |
| GitHub API | 5,000/h with token | one shared token | global budget, early quota check, scan lock |
| AI provider | per-token pricing if enabled | unbounded without caps | disabled by default; 4/20 per minute; 24k context |
| Domain | none purchased | none | use `*.vercel.app` |

Prices and free-tier limits are **not** asserted here: provider pricing changes and no billing account was inspected. Confirm in each dashboard before launch.

## Safe defaults (implemented)

- 6 analysis requests/client/min; 40/min globally. **[Superseded: the current default is 8/min globally; see the B3 correction notice above.]**
- 4 AI requests/client/min; 20/min globally.
- 48–128 files, 6–12 MiB, 160 ceiling, 8 concurrency, 35 s.
- 90 s per-repo scan lock.
- AI disabled without a key.

## Emergency controls

`ANALYSIS_DISABLED=1` → all new scans 503. `AI_DISABLED=1` → assistant 503. Lower `ANALYSIS_GLOBAL_LIMIT`/`ANALYSIS_RATE_LIMIT` to throttle without redeploying code (env change + redeploy on Vercel). Unpublish the deployment to take it offline.

## Operating assumptions

- Anonymous beta, no accounts, no persistence.
- Stateless functions; Redis holds only counters and short-lived locks (hashed IPs, no content).
- AI summaries are not stored.

## Owner actions

Confirm plan limits, create Upstash, fund/limit the AI provider if enabling, and set a provider-side spend cap. No paid plan was purchased.
