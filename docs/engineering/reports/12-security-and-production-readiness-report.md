# 12 — Security and Production Readiness

**Status:** PARTIALLY VERIFIED — several controls confirmed live; shared quota remains a release blocker

---

## Verified controls

| Control | Evidence |
|---|---|
| Security headers | live `curl -D`: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, `CSP: frame-ancestors 'none'; base-uri 'self'; form-action 'self'` |
| Same-origin enforcement | `isCrossOrigin` on both POST routes; route test returns 403 for a foreign `Origin` |
| Body-size caps | streamed read with a hard cap (4 KiB analyse, 512 KiB AI); a lying `Content-Length` cannot bypass it; route test 413 |
| Rate limiting | 6 allowed then 429 with `Retry-After` (route test; live probe `400×6 → 429`) |
| Secret isolation | AI key read only in server config; `aiPublicStatus()` is secret-free; credential values redacted before findings are built |
| AI output validation | strict JSON, field clamps, unknown citations dropped and counted |
| No code execution | repository content is never executed |
| Error hygiene | route errors are mapped to codes; provider text is not echoed |

## GitHub token handling

- Read from `GITHUB_TOKEN` in the server-only client; never returned in a response.
- No token is required for public repositories; scopes needed: none.
- Error messages do not interpolate headers or URLs containing credentials.
- `.env.example` contains empty placeholders only; `.env*` is git-ignored.

## Quota architecture — the main blocker

Current limiter: in-memory `Map`, per process, key 6 requests/minute. Key derivation trusts `x-forwarded-for` (spoofable).

**Empirical evidence collected this milestone:** six requests with key `203.0.113.55` returned 400 and the seventh returned 429; a request with a different forwarded key was treated as a fresh budget. That is the intended per-key behaviour and simultaneously proof that the key is attacker-controlled. In a multi-instance deployment each instance also has its own map, multiplying the real allowance.

**Consequence:** a public deployment cannot protect the shared 60 requests/hour unauthenticated GitHub quota, nor the operator's AI credits. A single large scan (48–128 blobs) exceeds the entire hourly quota.

**Design (not implemented — requires infrastructure):**

1. A shared counter store (Redis/Upstash or a hosted KV) keyed by a server-derived identity (signed session, or a coarse IP bucket from the platform's trusted header), with sliding-window limits.
2. Token-bucket per scan size: a 128-file scan costs proportionally more than a 16-file scan.
3. Repository-level result cache keyed by `owner/repo@commit` (TTL 10–30 min) to deduplicate repeat scans.
4. A global concurrency semaphore per instance, plus a queue with a bounded wait.
5. Require `GITHUB_TOKEN` in production; refuse unauthenticated large scans rather than failing halfway.

Until (1) and (2) exist, the app is **not** safe for anonymous public traffic.

## Dependency audit

`npm audit --omit=dev` → **2 vulnerabilities (1 high, 1 moderate)** after upgrading Next 15.5.27 → 15.5.29 (which removed the critical RCE/DoS advisory).

- The high advisory is `postcss` nested inside `next`. The audit's only fix path is a Next version outside the current range; no override was forced, because an incompatible override can break the build.
- The moderate advisory is likewise reported through the `next` dependency chain.
- No production dependency was added in this milestone; test-only dev dependencies were added (`jsdom`, Testing Library, `@vitejs/plugin-react`).

## Licensing

No licence file exists. Default copyright applies: the code is public but not legally reusable, and contributors have no explicit grant. **This decision belongs to the owner.** Options: MIT or Apache-2.0 (permissive, Apache adds a patent grant), GPL-3.0 (copyleft), or proprietary. Before deciding: confirm authorship/employment ownership and whether a CLA is wanted. No licence was added.

## Input/repository safety

- URL parsing accepts only `github.com/owner/repo` forms; branch and path are normalised.
- Tree entries are treated as untrusted strings; paths are never used for filesystem access (no local writes).
- Oversized/binary/ignored files are pruned before fetch.
- Repository text is untrusted in the AI prompt (delimited, explicitly labelled data).

## Production blockers (ranked)

1. Shared quota/rate limiting (above) — **high**.
2. No licence — **high** (business/legal).
3. Unauthenticated GitHub quota makes large scans fail — **high**.
4. `postcss` high advisory via Next — **medium**.
5. No authentication or per-user budgets — **medium**.
6. AI provider path unverified — **medium**.
7. No persistence/history — **low** (product scope).
