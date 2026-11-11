# 25 — B2 Independent Verification Report

**Project:** Codebase X-Ray
**Repository:** `D:\CODEBASEXRAY`
**Branch:** `master`
**HEAD at verification start:** `e287e079b2ab086e5339192dd1bd86c1c48192cf`
**Date:** 2026-11-06
**Scope:** private beta for 10–25 developers
**Verdict:** **B — READY AFTER EXTERNAL VERIFICATION**

No commit, push, deployment, production configuration change or access to `D:\DEVFLOW` was performed.

---

## 1. Initial repository state

Captured before B2 changes:

- Branch `master`, HEAD `e287e079b2ab086e5339192dd1bd86c1c48192cf`.
- 0 staged files.
- 36 tracked files changed, `+2,976 / −1,192`.
- 92 untracked files, including the B1 reports, API route additions, analysis modules and benchmark directory.
- Pre-existing B1 work was preserved. B2 additions are additive tests/configuration plus narrowly scoped fixes listed in §11.
- `.env.local` contains only a `VERCEL_OIDC_TOKEN` name; no GitHub or AI credential was present. Values were not read or printed.

The historical B1 handover was treated as a hypothesis, not as proof.

---

## 2. B1 verification matrix

| Claim | Implementation inspected | Test executed | Result | Remaining concern |
|---|---|---|---|---|
| Private repositories rejected before tree/blob retrieval | `runAnalysis` validates metadata, then checks `repoData.private` before `getTree`; route now checks the same metadata before dereferencing it | `pipeline-private.test.ts` (4 tests) | **PASS** | Live GitHub private-repository test requires a private fixture/token and was not run |
| Missing/malformed private metadata fails closed | `isUsableRepoMetadata` requires boolean `private`, finite counts and usable branch; route uses it before `repoData.private` | `pipeline-private.test.ts`; route guard code inspection | **PASS** | Route-level malformed response is covered by the shared validator, not a dedicated HTTP mock |
| AI requests deeply validated | `validateAnalysisForAi` checks nested fields, finite numbers, paths, array bounds, enum values and sizes | `request-schema.test.ts` (5 tests); `service.test.ts` | **PASS** | Not every possible malformed object was fuzzed |
| Signed token cannot be forged, tampered with or replayed | HMAC-SHA256 over a stable analysis digest; 15-minute expiry; timing-safe compare | Valid, tampered, different-scan, expiry, replay, rotated-secret and malformed-token tests | **PARTIAL** | Tampering/forgery pass. The token is **not single-use**: the same token and payload can be replayed until expiry. README corrected |
| AI citations cannot invent repository paths or finding IDs | `parseAnswer` drops unknown paths/issue IDs and reports `rejectedCitations` | `validate.test.ts`, `prompt-injection.test.ts` | **PASS for paths/IDs; PARTIAL for lines** | A positive line number is accepted without checking it against the file's actual line count |
| Quota rejection does not consume capacity | Lua checks all keys before incrementing; in-memory `consume` does the same | `quota-store.test.ts`; route quota regression | **PASS locally** | Live Redis behavior unverified |
| Shared quota operations are atomic | Single Lua `EVAL`; one command for all keys | Mocked REST command/atomicity tests | **PARTIAL** | No live Upstash contention test |
| Production quota failure fails closed | Missing shared store in Vercel production returns unavailable | `rate-limit.test.ts` | **PASS** | External production configuration not exercised |
| GitHub admission prevents obviously unaffordable scans | Size-based request estimate, 25-request reserve, hourly budget | `admission.test.ts`; route ordering inspected | **PASS for estimate; PARTIAL for reservation** | GitHub has no reservation API; a distributed reservation is not implemented |
| Request-body limits enforced while streaming | `readJsonBody` counts bytes, cancels at cap, releases the reader | `request-guards.test.ts`; route tests | **PASS** | Content-type handling is not separately enforced |
| Test-file detection handles documented conventions | Root `test.js`, `.test-d.ts`, `tests.py`, `spec/` etc. | `tree-utils.test.ts` | **PASS** | Convention-based, not a complete test discovery engine |
| Scoring remains deterministic | Pure extractors/scorers; injected `now` | Pipeline determinism test; sector tests | **PASS** | Deterministic does not mean semantically complete |
| Generic code smells are not presented as confirmed high-severity defects | Severity changes; evidence/confidence fields; benchmark negatives | Benchmark and detector tests | **PASS within the heuristic model** | Findings remain indicators, not proven defects |
| Analysis deadlines and client cancellation behave correctly | 35 s engine budget, 60 s route duration, 65 s client abort, stale-response token | Playwright cancellation test; budget tests | **PARTIAL** | No combined slow-parse/slow-network timeout matrix |
| AI remains disabled unless intentionally enabled | Key absence, `AI_DISABLED`, hosted opt-in, verification token | Playwright AI-disabled test; new route tests | **PASS** | Live provider call not tested |
| Logs do not expose secrets or source code | Structured fields only; no payloads or raw errors | Code inspection | **PARTIAL** | No automated log-scrubbing test |
| Documentation matches implementation | README, `.env.example`, limitations and checklist reviewed | Manual review | **PASS for living docs** | Historical B1 reports intentionally retain their original claims |

---

## 3. Browser E2E results

Harness: Playwright `1.65.0`, local full Chromium, Next.js dev server at `http://127.0.0.1:3210`.

Command:

```bash
npx playwright test --reporter=list
```

Result: **exit 0 — 13 passed, 1 skipped, 0 failed** (14 tests, 32.7 s).

Covered journeys:

- Landing page loads; product value proposition, repository input, submit control, version label and “not a security audit” notice visible.
- Empty input and malformed non-GitHub URL produce accessible inline errors (`#repo-url-error`); no analysis-complete state appears.
- Demo report renders: overall score, six sector cards, Top Issues, Codebase Visualization, Coverage & Limitations, demo labels and assistant-offline state.
- Demo report at 390×844 is usable with no horizontal overflow and a readable score card.
- AI endpoint returns a controlled `AI_UNAVAILABLE` response; no secret-shaped value is returned.
- Cancellation aborts the request, shows `SCAN FAILED — CANCELLED`, and never applies the late response.
- Upstream `429` renders a structured retryable error.
- No horizontal overflow at 390×844, 360×800, 768×1024 and 1440×900.
- Keyboard reaches the repository input and submit button in a logical order.
- axe scan on the landing page: **0 serious/critical violations**.

Gated live journey:

```bash
RUN_LIVE_GITHUB_E2E=1 npx playwright test -g "live GitHub scan" --reporter=list
```

Result: **exit 0 — 1 passed** against `octocat/Hello-World`. The report showed `LIVE ANALYSIS — GITHUB`, the real repository slug, GitHub REST source, live-data labeling and a completed scan (observed 1,042 ms in the captured run).

A real defect was found during this work: the same-origin guard compared the browser `Origin` against `request.url`, which Next normalized to `localhost` while the page was served on `127.0.0.1`. The live request was rejected with `403 FORBIDDEN_ORIGIN`. The guard now compares against the request `Host` header and has a regression test. This also protects proxied deployments from the same false rejection.

The first live run also exposed test-only strict-locator issues (two version labels; two live labels), not product defects. They were corrected with `.first()`.

Evidence:

- [b2-demo-desktop.png](b2-evidence/b2-demo-desktop.png)
- [b2-demo-mobile.png](b2-evidence/b2-demo-mobile.png)
- [b2-live-desktop.png](b2-evidence/b2-live-desktop.png)

Known harness limitation: Playwright’s separate headless-shell download timed out on this host, so the configuration uses the installed full Chromium binary. CI does not yet install Playwright or run this suite.

---

## 4. Accessibility findings

Verified:

- Keyboard tab order reaches `#repo-url`, then the submit button.
- Repository input has an associated label and inline error via `aria-describedby`.
- Error text uses `role="alert"` on the repository error.
- Automated axe scan on the landing page reports no serious or critical violations.
- 390×844 and 360×800 layouts do not horizontally overflow; mobile demo report is readable.

Not verified / residual risk:

- No screen-reader walkthrough (NVDA/VoiceOver).
- No manual dialog/overlay focus-cycle or Escape-key test; the scan panel is an inline overlay, not a modal dialog.
- No reduced-motion test.
- No automated axe scan of the completed report, only the landing page.
- No 200% text-zoom or OS high-contrast check.

No critical accessibility blocker was found. Manual assistive-technology review remains a beta prerequisite, not a proven pass.

---

## 5. Security verification

| Test | Expected behavior | Actual behavior | Evidence | Result |
|---|---|---|---|---|
| Public repository | Analysis proceeds | Live `octocat/Hello-World` completed | Live Playwright journey | **PASS** |
| Private repository | Reject before tree/blob | Rejected with `PRIVATE_REPOSITORY_NOT_SUPPORTED`; no tree/blob calls | `pipeline-private.test.ts` | **PASS** |
| Missing/malformed metadata | Fail closed | `INVALID_REPOSITORY_METADATA`; no retrieval | `pipeline-private.test.ts`; route guard | **PASS** |
| Error disclosure | No token/scope/source disclosure | Generic error messages; no source or credentials | Code inspection, route tests | **PASS** |
| Valid token | Accepted | Verification true | Token tests | **PASS** |
| Tampered token | Rejected | Verification false | Token tests | **PASS** |
| Expired token | Rejected | False after 15 min + 1 ms | New token test | **PASS** |
| Replayed token | One-time use | **Accepted for the same payload until expiry** | New replay test | **PARTIAL / documented** |
| Wrong scan binding | Rejected | False for different analysis | Token tests | **PASS** |
| Wrong secret / rotation | Old token rejected | False after secret change | New token test | **PASS** |
| Missing/malformed token | Rejected | False | Token tests | **PASS** |
| Malformed AI payload | Controlled 400, no exception | Schema rejects representative bad fields/types/sizes; route returns validation errors | `request-schema.test.ts`; service tests | **PASS** |
| Invented paths/finding IDs | Dropped and counted | `rejectedCitations` increments; citations removed | `validate.test.ts`, injection corpus | **PASS** |
| Invented line number | Rejected or checked | Positive integer accepted; not checked against file line count | `validate.ts` inspection | **PARTIAL** |
| Prompt injection in repository text | Treated as untrusted data | Prompt says data-only; adversarial fixtures do not override validation | `prompt-injection.test.ts` | **PARTIAL** — live model behavior unverified |
| Per-client/global quota | Atomic; rejected traffic consumes nothing | Mocked/Lua behavior passes; route regression covers oversized body | `quota-store.test.ts`; route test | **PASS locally / PARTIAL live** |
| Redis error/timeout | Fail closed | Returns unavailable; no unlimited fallback | `rate-limit.test.ts` | **PASS locally** |
| Oversized chunked body | Stop at cap | Reader cancelled; 413 | `request-guards.test.ts`; route test | **PASS** |
| Same-origin request | Allow same authority; reject foreign | Host-based comparison; new regression | `request-guards.test.ts`; live journey | **PASS locally** |
| Content-Type enforcement | Reject unexpected types | Not separately enforced; JSON parsing is the effective gate | Code inspection | **NOT TESTED** |
| Log secret leakage | No secrets/source in logs | Structured fields only | Code inspection | **PARTIAL** |

### Important security caveat

The analysis token is an **expiring integrity binding, not a nonce**. It prevents a caller from modifying the analysis or presenting a token issued for another scan. It does **not** prevent replay of the same token with the same payload within 15 minutes. This is now stated explicitly in the README and tested. If single-use is required, add a server-side nonce/consumption store; that is a separate design change.

### Rate-limit note

The Lua `consume` script checks every key before incrementing, so a rejected request does not consume a counter. The local/mock tests prove that logic. They do **not** prove Upstash behavior under multi-instance contention. The 2-second REST timeout and fail-closed path are implemented.

---

## 6. Infrastructure verification

### Shared quota / Upstash

Inspected:

- `quota-store.ts`: TLS-only REST configuration, 2-second timeout, `EVAL` Lua scripts, `SET NX PX` locks.
- `rate-limit.ts`: hashed client identity, per-client + global consume, hourly scan budget, daily AI budget, production fail-closed behavior.
- Route ordering now rejects malformed/oversized bodies before consuming quota; duplicate scans acquire the repository lock before consuming the hourly scan budget.

Limitations:

- **No live Upstash instance was available.** Atomicity is proven only against the mocked REST/Lua contract and the in-memory implementation.
- No multi-instance contention test.
- No production Redis timeout/error injection against a real service.

### GitHub API

- Live tiny-repository scan succeeded without a GitHub token.
- Admission is an estimate, not a reservation: `estimateGitHubRequests` uses repository size, caps file estimates, and reserves 25 requests.
- The default 24 scans/hour is plausible with a 5,000/hour authenticated token for small/medium scans, but it is not defensible for anonymous quota or adversarial simultaneous large scans. Production requires `GITHUB_TOKEN` unless `ALLOW_ANONYMOUS_GITHUB=1`.
- No large-repository live scan was run to avoid consuming quota.
- The live test proves one real public path works; it does not prove rate-limit boundary behavior.

### Execution budget

- `/api/analyze`: `maxDuration = 60`; engine deadline default 30 s, ceiling 35 s; concurrency ceiling 10; body cap 4 KiB.
- `/api/ai`: `maxDuration = 60`; body cap 512 KiB; provider uses a bounded timeout; client aborts analysis at 65 s.
- The 35 s engine deadline leaves serialization margin inside the 60 s route limit for normal runs. No combined slow-network + slow-parse test was run.

---

## 7. Dependency audit

Command:

```bash
npm audit --omit=dev
```

Result: **exit 1 — 2 vulnerabilities (1 moderate, 1 high)**.

Affected tree:

```text
next@15.5.29
└── postcss@8.4.31   (node_modules/next/node_modules/postcss)
```

Advisories reported under PostCSS:

- `GHSA-qx2v-qp2m-jg93` — high — XSS via unescaped `</style>` in stringify output.
- `GHSA-6g55-p6wh-862q` — arbitrary file read / information disclosure via attacker-controlled `sourceMappingURL`.
- `GHSA-fxqj-rqcc-2cmp` — incomplete fix of the previous source-map issue.
- `GHSA-r28c-9q8g-f849` — path traversal in previous source-map auto-loading.

The only automated remediation is `npm audit fix --force`, which proposes **`next@16.4.5`**, a breaking major upgrade. It was **not applied**.

Assessment:

- The vulnerable `postcss` is nested under Next and is primarily build/tooling code. No application path was found that processes attacker-controlled CSS with it.
- This is still an unresolved high advisory and must be treated as residual risk, not marked fixed.
- A Next 16 migration needs a separate compatibility pass over route handlers, React 19, build output, Node version and deployment behavior. Forcing it in B2 would violate the change-safety rules.
- `@tailwindcss/postcss` and the Vite dependency resolve to `postcss@8.5.29`, which is outside the audited vulnerable range.

---

## 8. Performance results

Measured locally:

| Measurement | Result | Notes |
|---|---|---|
| Live tiny scan (`octocat/Hello-World`) | ~1.0 s (1,042 ms in captured run) | Real GitHub request, 1 file inspected, no AI |
| Synthetic medium fixture | 136 ms | 262 eligible files, 72 inspected (small tier), 14 MB heap delta, 2 issues, partial coverage |
| Browser suite | 32.7 s for 14 tests | One worker, includes dev-server startup and demo animation |
| Production build | Next 15.5.29, exit 0 | `/` 122 kB / 225 kB first load; API routes dynamic |

The synthetic fixture was a temporary harness and was removed after measurement. It is not a committed benchmark. No memory profile, load test, concurrency test or large real-repository scan was performed. The existing committed benchmark artifacts were deliberately not overwritten.

The synthetic graph produced only 3 nodes / 0 edges because of the fixture's path shape; this is not presented as a graph-quality result. It confirms the engine completed under the deterministic budget, not that graph modeling is complete.

---

## 9. Product and report quality

Reviewed desktop and mobile screenshots and the live report:

- Overall score is prominent, with six sector scores and explanations.
- Coverage (`files inspected / eligible`) and the “bounded sample, not a full audit” note are visible.
- Demo reports are labeled `SIMULATED ANALYSIS` / `DEMO DATA`; live reports are labeled `LIVE ANALYSIS — GITHUB` and show the GitHub REST source.
- Findings and issue sections expose evidence and recommendations.
- Assistant-offline state is explicit and does not imply an AI report exists.
- The UI does not claim the security score is a formal audit.

Known product limitations that remain correctly disclosed or should stay visible:

- Import graph is not a semantic call graph; there is no data-flow analysis.
- Python parsing is structural/regex-based; some languages are import-only.
- Monorepos are modeled flatly.
- Documentation scoring measures presence/size, not quality.
- Testing score does not establish coverage.
- Security score is heuristic and absence of findings is not proof of security.
- No persistence, scan history, sharing or export.
- Generic code smells are indicators; only path-backed findings should be treated as strongly evidenced.

No score was altered to improve the result.

---

## 10. Deployment and configuration readiness

- No deployment was performed. The previously observed Vercel URL is not proof that this HEAD is deployed; its commit and environment remain unverified.
- `next.config.ts` sets `nosniff`, `DENY`, referrer policy, permissions policy, COOP and a limited CSP (`frame-ancestors`, `base-uri`, `form-action`). A strict script-src CSP is not present.
- `/api/analyze` is Node runtime, `force-dynamic`, `maxDuration = 60`.
- `/api/ai` is Node runtime, `force-dynamic`, `maxDuration = 60`.
- Production analysis requires a GitHub token by default; production quota requires a shared Upstash/Vercel KV store.
- AI is opt-in on both Vercel **production and preview** now. The previous production-only gate was corrected. `AI_DISABLED=1` remains the emergency off switch.
- `.env.example` contains no real credential values; a secret-pattern scan of the example and README found none.
- CI runs lint, typecheck, unit tests, benchmark and build, but **not Playwright**. The browser suite is currently local-only.
- No response claim about deployed headers, quota or latency is made.

---

## 11. Changes made in B2

| File | Change |
|---|---|
| `package.json`, `package-lock.json` | Added `@playwright/test@1.65.0` and `test:e2e` |
| `playwright.config.ts` | New local Chromium/dev-server harness |
| `e2e/b2-public-beta.spec.ts` | New browser journeys, responsive/keyboard/axe checks, gated live scan, screenshots |
| `.gitignore` | Ignore Playwright reports/results |
| `src/app/api/analyze/route.ts` | Validate metadata before route dereference; body rejection before quota; lock before hourly budget |
| `src/app/api/analyze/route.test.ts` | Oversized-body-quota regression |
| `src/app/api/ai/route.ts` | Hosted preview opt-in; body/token validation before quota |
| `src/app/api/ai/route.test.ts` | Preview gate, opt-in and emergency-disable tests |
| `src/lib/server/request-guards.ts` | Same-origin comparison uses the request Host header |
| `src/lib/server/request-guards.test.ts` | Host-normalization/foreign-origin/no-Origin regression tests |
| `src/lib/ai/analysis-token.test.ts` | Expiry, replay, rotation and malformed-token tests |
| `README.md` | Corrected replay semantics and hosted preview AI wording; E2E commands |
| `.env.example` | Corrected preview/production AI opt-in wording |
| `docs/engineering/KNOWN_LIMITATIONS.md` | Added token replay and B2 coverage status |
| `docs/engineering/PUBLIC_BETA_CHECKLIST.md` | B2 status and remaining owner actions |
| `docs/engineering/CODEBASE_XRAY_MASTER_STATUS.md` | B2 status and test counts |
| `docs/engineering/reports/25-b2-independent-verification-report.md` | This report |
| `docs/engineering/reports/25-b2-owner-release-checklist.md` | Owner-facing checklist |
| `docs/engineering/reports/b2-evidence/*.png` | Browser evidence captures |

No existing benchmark artifact was replaced.

---

## 12. Tests executed

| Command | Exit | Result |
|---|---|---|
| `npm run typecheck` | 0 | pass |
| `npm run lint` | 0 | pass |
| `npm test` | 0 | **27 files / 158 tests passed** |
| `npm run build` | 0 | Next 15.5.29 production build |
| `npx playwright test` | 0 | **13 passed, 1 skipped** (live gate) |
| `RUN_LIVE_GITHUB_E2E=1 npx playwright test -g "live GitHub scan"` | 0 | **1 passed** |
| `npx vitest run src/lib/server/request-guards.test.ts` | 0 | 6 passed |
| Focused token/analyze route tests | 0 | 14 passed |
| Temporary offline performance fixture | 0 | 1 passed; 136 ms synthetic run |
| `npm audit --omit=dev` | 1 | 2 vulnerabilities (1 high, 1 moderate) |

Earlier browser runs had assertion/harness failures and one real `FORBIDDEN_ORIGIN` defect; they were fixed and the final runs above are the authoritative results.

---

## 13. Tests not executed and why

- Live Upstash contention, timeout and failover: no disposable staging credentials.
- Real AI provider success/timeout/5xx and live prompt-injection evaluation: no provider key; AI intentionally disabled.
- Real private GitHub repository rejection: requires a private fixture and credential; mocked boundary tests used instead.
- Production deployment provenance, headers, Vercel duration and quota: no deployment authorization/access; no deployed SHA established.
- Large real-repository scans and GitHub rate-limit boundary: quota conservation; tiny public repo used.
- Load, soak, memory-profile and concurrent-user tests: no safe staging environment.
- Manual screen-reader, reduced-motion and 200% zoom audit: not performed.
- Next.js 16 migration: breaking upgrade deliberately deferred.
- CI execution on GitHub: workflow exists but was not run remotely in this session.

---

## 14. Remaining blockers and risks

### P0

None found in the local implementation.

### P1

1. **Deployment provenance unverified.** The repository HEAD is not proven to be the deployed build.
2. **Shared quota is not live-verified.** Multi-instance Upstash behavior remains an external prerequisite.
3. **PostCSS high advisory remains unresolved.** No safe non-breaking fix exists in the current Next line; do not call it fixed.
4. **Production configuration is unverified.** GitHub token, shared store, AI opt-in and headers must be checked on a known deployment.

### P2

- Analysis token replay is possible for the same payload until expiry (documented; add nonce store if single-use is required).
- Citation line numbers are not checked against actual file line counts.
- GitHub admission is an estimate, not a distributed reservation.
- Browser E2E is not in CI.
- Report/citation behavior of a live model is unverified.

### P3

- Local Playwright uses full Chromium because the headless-shell artifact is unavailable on this host.
- Next dev emits an `allowedDevOrigins` warning for `127.0.0.1`; it does not affect the tested product behavior.
- Historical B1 reports retain old test counts and claims by design.

---

## 15. Final private-beta decision

**B — READY AFTER EXTERNAL VERIFICATION.**

The local implementation, security controls and browser journeys are sound enough for a controlled private beta once the owner supplies and verifies the external environment. This is not an A because live shared-quota behavior, production deployment provenance, a real AI provider call (if enabled) and the unresolved PostCSS advisory remain external or residual risks.

The single next action is: **authorize a reviewed commit, deploy that exact commit to a preview with the required GitHub/Upstash configuration, and run the deployed smoke test before inviting any beta user.**
