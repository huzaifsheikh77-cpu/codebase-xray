# 27 — B3 Private-Beta Operations Runbook

**Date:** 2026-11-07
**Audience:** the owner/operator of a closed private beta.
**Scope:** operating the current tree; this runbook is not evidence that a deployment exists or matches it.

## 1. What the service does

`POST /api/analyze` accepts a public GitHub repository URL, reads a bounded sample through the GitHub REST API, and returns a deterministic engineering report. `POST /api/ai` optionally explains that report. The browser has no database, accounts, billing or persistence.

## 2. Required configuration

| Variable | Required | Default / behavior |
|---|---|---|
| `GITHUB_TOKEN` | Production | Public read-only fine-grained token recommended. Without it, production refuses scans unless the explicit anonymous escape hatch is set. Never expose it to the browser. |
| `UPSTASH_REDIS_REST_URL` | Production | Shared quota store REST URL. |
| `UPSTASH_REDIS_REST_TOKEN` | Production | Shared quota store token. |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | Production alternative | Accepted KV naming convention. |
| `ANALYSIS_GLOBAL_LIMIT` | No | **8** scans/minute globally. |
| `ANALYSIS_RATE_LIMIT` | No | **6** scans/minute per client bucket. |
| `SCAN_HOURLY_LIMIT` | No | **24** admitted scans/hour globally. |
| `AI_API_KEY` | No | Enables the assistant only when all other gates pass. |
| `AI_ANALYSIS_SECRET` | Production AI | Signs/verifies the analysis-to-AI binding. |
| `AI_PUBLIC_ENABLED` | Hosted AI | Must be `1` on Vercel production or preview; otherwise AI returns 503. |
| `AI_DISABLED` | Emergency | `1` disables AI regardless of other settings. |
| `ANALYSIS_DISABLED` | Emergency | `1` disables new scans. |
| `ANALYSIS_MAX_FILES` | No | Clamped file-budget override (ceiling 160). |
| `ANALYSIS_CONCURRENCY` | No | Clamped blob concurrency override (ceiling 10). |
| `ALLOW_MEMORY_QUOTA` | Local/non-Vercel only | Per-instance limiter; **not safe for a public multi-instance deployment**. |
| `REQUIRE_SHARED_QUOTA` | Non-Vercel production | Forces the shared-store requirement. |
| `ALLOW_ANONYMOUS_GITHUB` | No | Explicit escape hatch; not recommended. |

Do not read, print, paste or commit secret values. Set them in the hosting provider's encrypted environment/secret UI.

## 3. Normal request flow

```text
same-origin check
→ streaming 4 KiB body cap
→ URL parse
→ demo branch (local fixture, no GitHub)
→ production config check
→ per-client + global quota admission
→ hourly scan admission and duplicate lock
→ GitHub metadata / public-only guard / admission estimate
→ bounded tree + blob fetch
→ deterministic analysis
→ no-store JSON response
```

Only admitted, valid work should consume quota. B3 added regressions for malformed URL, malformed JSON and missing configuration.

## 4. Failure codes and first response

| Code | HTTP | Meaning | First action |
|---|---:|---|---|
| `MALFORMED_URL` | 400 | Not a GitHub repository URL | Correct the client input; no action if malicious traffic |
| `FORBIDDEN_ORIGIN` | 403 | Browser request from another origin | Check proxy/host rewriting and the client `Origin`; do not disable the check casually |
| `PAYLOAD_TOO_LARGE` | 413 | Body exceeded the streaming cap | Inspect client payload; this should not happen for a normal URL |
| `NOT_FOUND_OR_PRIVATE` | 404 | Missing, or private/invisible to the token | Verify the repository is public; never grant the deployment token broad private-repo scope |
| `PRIVATE_REPOSITORY_NOT_SUPPORTED` | 422 | Metadata says private | Expected policy; no contents were fetched |
| `INVALID_REPOSITORY_METADATA` | 502 | GitHub returned unusable metadata | Retry once later; inspect upstream status, not source |
| `RATE_LIMITED` | 429 | Per-client, global, hourly or GitHub limit | Check `Retry-After`, quota logs and GitHub reset time; lower limits if abuse |
| `SCAN_IN_PROGRESS` | 429 | Same repository already being scanned | Wait; the duplicate is rejected rather than joined |
| `QUOTA_UNAVAILABLE` | 503 | Shared store unavailable or absent | Restore Redis/config; service should fail closed |
| `CONFIGURATION_REQUIRED` | 503 | Required production token/config missing | Fix environment configuration; do not bypass with anonymous mode |
| `EMPTY_REPO` | 409 | Repository has no content | Expected |
| `UNAVAILABLE` | 502 | GitHub/upstream failure | Check GitHub status and logs; retry later |
| `TIMEOUT` | 504 | Scan deadline or GitHub timeout | Retry once; if persistent, lower scope or investigate GitHub latency |
| `CANCELLED` | 408 | Client aborted | No operator action |
| `ANALYSIS_FAILED` | 500 | Unexpected engine failure | Capture request ID and safe logs; reproduce locally before redeploying |

## 5. Diagnosing with logs

Structured logs contain:

- `requestId`
- `route`
- `outcome` (`error:<CODE>` or success)
- duration where emitted
- GitHub failure category where emitted
- `partial` and `inspectedFiles` on successful analysis

Safe to inspect: request IDs, status codes, route names, durations, quota categories, coverage counts.

**Never** log or paste: authorization headers, API keys, Redis tokens, raw repository source, full environment values, private URLs or client-identifying content.

Correlate one user report by `x-request-id` from the API response. Do not ask a beta user to send a token or `.env` file.

## 6. Quota and capacity

Current published defaults:

```text
6 analyses/client/minute
8 analyses/minute globally
24 admitted scans/hour
25-request GitHub safety reserve
48 / 72 / 96 / 128 files depending on repository tier
```

- Rejected requests should not increment the global counter.
- GitHub admission estimates the scan's request cost before tree/blob retrieval.
- The estimate is **not** a reservation; unusual concurrency can still exhaust quota mid-flight.
- If GitHub is exhausted, do not raise limits. Wait for the reset or reduce admitted work.
- The hourly budget is the backstop against a token being drained by many small scans.

## 7. Shared Redis failure

Symptoms: `QUOTA_UNAVAILABLE` 503, quota commands timing out, or all requests failing closed.

1. Confirm the environment still has the REST URL/token names (do not print values).
2. Check the Upstash/Vercel KV dashboard for availability, command limits and latency.
3. Confirm the deployment is using the intended database, not a preview/production mix-up.
4. Restore the store. The service is designed to fail closed rather than silently use per-instance memory.
5. Do **not** set `ALLOW_MEMORY_QUOTA=1` on a multi-instance public deployment as a “quick fix.”

## 8. AI controls

Disable immediately:

```text
AI_DISABLED=1
```

Then redeploy/restart as required by the host. This takes precedence over configuration checks.

Other states:

- no `AI_API_KEY` → assistant unavailable, analysis unaffected;
- hosted Vercel without `AI_PUBLIC_ENABLED=1` → 503 on preview and production;
- missing `AI_ANALYSIS_SECRET` in production → AI cannot verify the scan binding and should fail closed;
- token replay: a valid token/payload can be replayed until expiry; do not describe it as single-use.

If enabling AI, set a provider-side spend cap independently of application limits. The app's daily ceiling is not a billing guarantee.

## 9. GitHub token and repository policy

- Use a fine-grained token with **public read-only** access.
- Do not grant private-repository scopes to the shared deployment token.
- The runtime still rejects `private: true` metadata before tree/blob retrieval; do not rely on token scope alone.
- If GitHub returns 401/403 for a repository that should be public, check token expiry and GitHub status before changing policy.
- Rotate by setting a new value in the host, deploying/restarting, then revoking the old token.

## 10. Safe smoke test for a preview

Use only the owner-authorized preview origin. A live scan consumes GitHub quota.

```bash
BASE="https://<authorized-preview-origin>"

# 1. Page and security headers
curl -sS -D - -o /dev/null "$BASE/" | sed -n '1,25p'

# 2. Invalid URL: 400, no-store, request ID
curl -sS -D - -o /tmp/smoke-invalid.json \
  -X POST "$BASE/api/analyze" \
  -H 'content-type: application/json' \
  -H "origin: $BASE" \
  --data '{"url":"not-a-github-url"}'

# 3. Foreign origin: 403
curl -sS -D - -o /tmp/smoke-foreign.json \
  -X POST "$BASE/api/analyze" \
  -H 'content-type: application/json' \
  -H 'origin: https://evil.example' \
  --data '{"url":"https://github.com/octocat/Hello-World"}'

# 4. One bounded public scan; use a small repository
curl -sS -D - -o /tmp/smoke-scan.json \
  -X POST "$BASE/api/analyze" \
  -H 'content-type: application/json' \
  -H "origin: $BASE" \
  --data '{"url":"https://github.com/octocat/Hello-World"}'
```

Check:

- headers match section 11;
- 400/403 responses have `cache-control: no-store` and `x-request-id`;
- the scan returns a report or a controlled partial/error, never an HTML crash;
- `analysis.partial` and `analysis.coverage` tell the truth;
- no secret appears in the response or browser console.

## 11. Expected security headers

```text
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
Cross-Origin-Opener-Policy: same-origin
Content-Security-Policy: frame-ancestors 'none'; base-uri 'self'; form-action 'self'
```

`Strict-Transport-Security` is not set by the application. Check whether the hosting edge adds it; if not, that is an owner decision before inviting users.

## 12. Rollback

The owner controls deployment. A safe rollback is:

1. Identify the last known-good deployment in the host dashboard.
2. Promote/roll back to that deployment without changing database keys unnecessarily.
3. Keep the previous environment values available but do not print them.
4. Re-run the smoke test above against the restored origin.
5. Confirm the exact commit and environment revision in the deployment record.

No rollback was executed in B3 because no deployment was made.

## 13. Incident checklist

- [ ] Capture the request ID and HTTP status.
- [ ] Classify: input, origin, quota, GitHub, Redis, AI, timeout or engine.
- [ ] Check whether other users see the same failure.
- [ ] If cost is at risk: disable AI and/or lower analysis limits.
- [ ] If confidentiality is at risk: disable analysis, rotate affected tokens, preserve logs.
- [ ] Do not paste secrets or source into chat/tickets.
- [ ] Record the timeline and the exact deployment revision.
- [ ] Re-run smoke tests after mitigation.

## 14. Known operational gaps

- No automated alerting, paging or dashboards.
- No persistence, so incidents cannot be reconstructed from application history.
- No live Redis contention test or live AI call in B3.
- No deployed-origin verification.
- CI has not yet run on GitHub.

Treat this as a closed-beta runbook, not a 24/7 production operations program.
