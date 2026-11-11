# 19 — GitHub API Protection

**Status:** PARTIALLY VERIFIED

## Token architecture

- Read server-side only in `config/env.ts`; attached per request in `github/client.ts`.
- Never returned, logged, or placed in an error message. Format warning logs only the fact, never the value.
- Public repositories need **no scopes**; use a fine-grained public-read token.
- A revoked/invalid token surfaces as 401 → classified `UNAVAILABLE` with a generic message (no upstream body).
- Production gate: `githubTokenRequired()` returns 503 `CONFIGURATION_REQUIRED` unless `ALLOW_ANONYMOUS_GITHUB=1`.

## Quota controls added

1. **Early check** — `/rate_limit` (does not consume core quota) is called before a scan; fewer than 10 remaining requests returns 429 with the reset time instead of a half-finished report.
2. **Global and per-client request budgets** — shared quota layer (Report 18).
3. **Duplicate-scan lock** — one in-flight scan per `owner/repo`, cross-instance.
4. **Per-scan budget** — unchanged: 48–128 files, 6–12 MiB, 8 concurrency, 35 s deadline, 160-file ceiling.
5. **Bounded retries** — only tree generation (202) retries, max 3 with 1 s spacing. 403/429 are never retried.
6. **ETag cache** — per-instance, 64 entries; conditional requests do not spend quota. Not shared across instances.

## Not implemented

- **Shared analysis-result cache by commit SHA.** Requires resolving the branch to a SHA and storing large JSON; Upstash value limits and no credentials made this unsafe to ship unverified. Documented as the next optimization, not claimed.
- **Distributed in-progress join.** Duplicates are rejected, not awaited.
- **Primary vs secondary rate-limit distinction.** Both map to `RATE_LIMITED` with reset time when available.

## Live evidence (local production build, not Vercel)

`sindresorhus/p-map`: 14 eligible, 14 inspected, 7 parsed, 5 edges, 10 issues, 38/60 quota remaining, 1,642 ms. Two requests (`repo` + tree) plus blobs; content filter excluded 2 ignored-dir and 1 oversized entry.

Production fail-closed probes: 503 `QUOTA_UNAVAILABLE` without a store; 503 `CONFIGURATION_REQUIRED` without a token (with the memory escape hatch enabled).

## Risks

- Anonymous quota (60/h) cannot support a medium scan; hence the token gate.
- The `/rate_limit` pre-check adds one request per scan but protects the budget.
- No backoff on transient 5xx; the scan fails honestly rather than retrying into the quota.
