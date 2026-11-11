# 27 — B3 Security Verification

**Date:** 2026-11-07
**Scope:** local source, tests, production build and loopback production server. No live deployment, Redis instance, GitHub token test or AI provider call.

## 1. Security verdict

The trust boundaries inspected in B3 remain coherent:

- private repository contents are rejected before tree/blob retrieval;
- malformed or missing repository metadata fails closed;
- request bodies are capped while streaming;
- same-origin checks reject foreign browser origins;
- quota is consumed only after URL/config admission;
- AI is disabled without explicit configuration and its analysis binding is integrity-protected;
- per-file GitHub failures degrade to a disclosed partial result rather than a crash.

Residual issues are listed in section 8. They are not hidden by the local pass.

## 2. Trust-boundary checks

| Boundary | Control | Evidence | Result |
|---|---|---|---|
| Browser → `/api/analyze` | Cross-origin POST rejected | live `403 FORBIDDEN_ORIGIN`; route tests | Pass |
| Browser → `/api/analyze` | Body cap while streaming | oversized chunk tests, 4 KiB cap | Pass |
| `/api/analyze` → quota | URL/config validated before consume | new tests for malformed URL, malformed JSON, missing config | Pass |
| `/api/analyze` → GitHub | public-only metadata guard | `isUsableRepoMetadata`, `repoData.private` check; private tests | Pass |
| GitHub → pipeline | per-file failure boundary | 500/404/malformed reliability tests | Pass |
| Browser → `/api/ai` | schema + origin + body cap + hosted gate | AI route tests, request-schema tests | Pass |
| `/api/analyze` → `/api/ai` | HMAC binding and expiry | analysis-token tests, tamper/rotation tests | Pass, with replay caveat |
| Server → provider | no repository source in prompt | context/projection code and tests | Pass locally |
| Response → browser | no-store on API responses | observed live headers | Pass |

## 3. Live loopback checks

A production server was started locally on port 3211 and probed with curl. No external request was made.

### Page headers

```text
HTTP/1.1 200 OK
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
Cross-Origin-Opener-Policy: same-origin
Content-Security-Policy: frame-ancestors 'none'; base-uri 'self'; form-action 'self'
```

### Invalid same-origin request

```text
POST /api/analyze
Origin: http://127.0.0.1:3211
body: {"url":"not-a-github-url"}

HTTP/1.1 400 Bad Request
cache-control: no-store
x-request-id: <present>
{"ok":false,"error":{"code":"MALFORMED_URL",...}}
```

### Foreign-origin request

```text
POST /api/analyze
Origin: https://evil.example

HTTP/1.1 403 Forbidden
cache-control: no-store
{"ok":false,"error":{"code":"FORBIDDEN_ORIGIN",...}}
```

## 4. Header assessment

| Header | Status | Notes |
|---|---|---|
| `X-Content-Type-Options` | Present | `nosniff` |
| `X-Frame-Options` | Present | `DENY`; CSP also sets `frame-ancestors 'none'` |
| `Referrer-Policy` | Present | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | Present | camera, microphone, geolocation and payment disabled |
| `Cross-Origin-Opener-Policy` | Present | `same-origin` |
| `Content-Security-Policy` | Partial | `frame-ancestors`, `base-uri`, `form-action` only; no `default-src`/`script-src` |
| `Strict-Transport-Security` | **Absent in application code** | Vercel edge behavior was not verified |

The CSP is deliberately conservative because a strict `script-src` policy for the App Router needs per-request nonces. It prevents framing, base-tag injection and cross-origin form submission, but it is **not** a complete XSS mitigation. Do not describe it as one.

HSTS should be verified at the deployed origin. If Vercel does not add it, add a production-only header with a deliberate `max-age` and decide separately whether `includeSubDomains`/`preload` is appropriate.

## 5. API and quota regressions

`src/app/api/analyze/route.test.ts` now has 12 tests, including:

- non-GitHub URL → 400;
- malformed JSON → controlled rejection;
- oversized chunked body → 413;
- malformed URL, malformed JSON and missing production config do **not** consume quota;
- six admitted demo requests then 429;
- foreign origin → 403;
- same-origin request reaches validation.

The earlier rate-limit test was updated to admit six requests before expecting a 429; that reflects the real ordering rather than weakening the assertion.

## 6. Partial-analysis reliability

New tests use fake GitHub clients only:

| Scenario | Assertion |
|---|---|
| One blob returns HTTP 500 | `partial === true`; warning mentions files could not be fetched; inspected count decreases |
| One blob returns HTTP 404 mid-scan | `partial === true`; no uncaught error |
| Malformed TypeScript and Python | `parseFailures > 0`; partial warning; report still returned |

These tests do not prove immunity to denial of service. They prove controlled degradation for representative failures.

## 7. Secret handling

A source scan for common live-credential patterns found one match:

- `benchmarks/cases.ts:53` — a synthetic benchmark fixture containing a fake credential inside `src/auth/session.ts`.

The matched value was replaced with `[REDACTED]` before inspection and was not printed in this report. It is test data, not a live credential. The scan excluded `.env.local`, `.cloud-attachments/`, `node_modules`, `.next` and browser artifacts. `.env.local` was not read. No secrets were added to source, test output, browser fixtures or the B3 reports.

This is a targeted pattern scan, not a complete entropy or provider-secret audit.

## 8. Dependency security

### Audit result

Command:

```bash
npm audit --omit=dev
```

Exit: **1**; production dependency count: 63.

| Package | Severity | Direct | Via | Fix |
|---|---|---|---|---|
| `postcss` | **high** | No | GHSA-6g55-p6wh-862q (high), GHSA-fxqj-rqcc-2cmp, GHSA-r28c-9q8g-f849 (high), GHSA-qx2v-qp2m-jg93 (moderate) | `next@16.4.5` only |
| `next` | moderate | Yes | nested `postcss` | `next@16.4.5`, semver-major |

Installed tree:

```text
next@15.5.29
└── postcss@8.4.31
@tailwindcss/postcss@4.3.3
└── postcss@8.5.29
```

The affected copy is the nested `postcss@8.4.31`. The top-level Tailwind PostCSS copy is 8.5.29 and satisfies the published ranges. The advisories concern CSS stringification and source-map path handling.

### Exposure assessment

- The application does not accept user-supplied CSS and has no CSS-processing endpoint.
- PostCSS is used by the Next build pipeline, not in the request path for analysis or AI.
- That makes remote exploitation through the product's HTTP surface unlikely; it does **not** remove the build/supply-chain exposure.
- An attacker who can influence CSS inputs during a build, or who compromises an upstream package, is a different threat model.
- The advisory is not dismissed as “build-only”; it remains a release risk until Next is upgraded or the owner formally accepts it.

### Why no fix was applied

`npm audit fix --force` would install `next@16.4.5`, a semver-major framework migration. That is outside a narrow security patch. No override was forced onto Next's pinned PostCSS because that would be an untested dependency substitution.

### Next 16 migration plan (not executed)

1. Create a branch from the reviewed B3 candidate; do not mix the migration with beta fixes.
2. Read the Next 16 upgrade guide and release notes for App Router, route-handler, caching and Node-version changes.
3. Upgrade `next`, `eslint-config-next`, React/React DOM only where the adapter requires it, and regenerate the lockfile.
4. Run typecheck, lint, all 165 tests, benchmark, production build and Playwright.
5. Recheck `/api/analyze` Node runtime, 60-second `maxDuration`, streaming body guards, `serverExternalPackages: ["typescript"]` and security headers.
6. Recheck Vercel build/runtime behavior on a preview, not production.
7. Run `npm audit --omit=dev` and compare; do not declare success from a lockfile alone.
8. Roll back by restoring the previous deployment and the reviewed dependency lockfile if any route, build or browser journey regresses.

The migration is a separate milestone. The current recommendation is to accept the documented residual risk only for a closed, owner-authorized preview, with no untrusted CSS build path.

## 9. AI-specific caveats

- The analysis token is an **expiring integrity binding, not a single-use nonce**. The same token/payload can be replayed until expiry.
- No live provider call was made. Provider timeout, 5xx, moderation behavior and prompt-injection resistance remain unverified at the provider.
- Hosted AI remains disabled without `AI_PUBLIC_ENABLED=1` and requires `AI_ANALYSIS_SECRET` in production.
- `AI_DISABLED=1` is the emergency stop path.

## 10. NOT TESTED

- Live GitHub API capacity, secondary rate limits or private-repository rejection against the real API.
- Live Upstash contention, timeout, failover or key expiry.
- Live AI provider success, failure, timeout or cost behavior.
- Vercel production headers, HSTS, commit provenance, environment values or quota implementation.
- Manual screen-reader, reduced-motion and 200% zoom behavior.
- A formal penetration test or complete secret-entropy scan.
