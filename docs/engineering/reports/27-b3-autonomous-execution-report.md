# 27 — B3 Autonomous Execution Report

**Date:** 2026-11-07
**Repository:** `D:\CODEBASEXRAY`
**Branch:** `master`
**HEAD:** `e287e079b2ab086e5339192dd1bd86c1c48192cf`
**Execution mode:** autonomous local engineering; no commit, push, staging, deployment or production configuration change.

## 1. Executive verdict

**B — READY AFTER SPECIFIC CORRECTIONS.**

The local engineering position is materially stronger than B2.1:

- The two B2.1 HOLD items are resolved without restoring obsolete code or rewriting history.
- Playwright, including the full demo-report axe scan, is wired into the existing CI workflow.
- The browser suite passes **14 tests with 1 gated live skip**.
- The full Vitest suite passes **28 files / 165 tests**.
- Typecheck, lint and the production build pass.
- Accessibility defects exposed by axe were fixed in the product, not suppressed in the test.
- Quota is no longer consumed by malformed URLs, malformed JSON or missing production configuration.
- Three adversarial reliability tests prove that malformed source and failed blob requests produce controlled partial results.

This is not yet an **A** because the following are still unverified or require an owner decision:

1. The CI workflow has been syntax-validated locally but has **not executed on a GitHub runner** (no push was authorized).
2. No isolated Upstash instance, live AI provider call, production GitHub token, or Vercel deployment was tested.
3. The `postcss` high advisory remains nested under Next.js 15; `npm audit` says the only offered fix is Next **16.4.5**, a semver-major upgrade.
4. Manual screen-reader, reduced-motion and 200% zoom checks were not performed.
5. The application does not send a `Strict-Transport-Security` header itself; edge behavior on Vercel is unverified.

Those are specific release corrections/checks, not evidence of a broad design failure.

## 2. Repository state

### Initial B3 state

Captured before B3 edits:

| Measure | Value |
|---|---:|
| Repository root | `D:/CODEBASEXRAY` |
| Branch | `master` |
| HEAD | `e287e079b2ab086e5339192dd1bd86c1c48192cf` |
| Staged entries | 0 |
| Modified tracked files | 37 |
| Deleted tracked files | 1 |
| Untracked files (`-uall`) | 101 |
| Total status entries | 139 |
| Tracked diff | 38 files, +3,053 / −1,192 |
| `git diff --check` | exit 0 |

### Final B3 state

Measured after the code, tests, reports and living-documentation updates:

```text
total=151 staged=0 modified=42 deleted=1 untracked=108
43 files changed, 3193 insertions(+), 1203 deletions(-)
```

| Measure | Value |
|---|---:|
| Staged entries | **0** |
| Modified tracked files | **42** |
| Deleted tracked files | **1** |
| Untracked files (`-uall`) | **108** |
| Total status entries | **151** |
| Tracked diff | **43 files, +3,193 / −1,203** |

The only deletion remains `src/components/ui/score-pill.tsx`. Nothing was added to the index.

## 3. HOLD resolution

| B2.1 HOLD | Decision | Evidence | Release status |
|---|---|---|---|
| Deleted `src/components/ui/score-pill.tsx` | **Accept deletion; do not restore** | `git show HEAD:src/components/ui/score-pill.tsx` shows a standalone large-score-plus-band-chip component. No import or reference remains. `AnalysisSummary` now renders a `text-7xl` score, `/100`, band label and meter inline. The production build passes without the file. Restoring it would create a second, inconsistent score presentation. | Resolved; deletion included in the candidate with owner review |
| `25-public-beta-cost-and-operations-report.md` says 40/min global | **Preserve history; add dated correction** | A dated B3 notice now says the current default is **8/min** (`ANALYSIS_GLOBAL_LIMIT`), per-client is **6/min**, and hourly admission is **24 scans/hour**. The original 40/min sentence remains, explicitly annotated as superseded. | Resolved; documentation correction included |

The historical intent behind the score-pill deletion is still not provable. The decision accepts the deletion because the current implementation is coherent and the component is unused, not because the original author's intent is known.

## 4. Release manifest revalidation

The B2.1 manifest contained 138 inventory rows. It has not been rewritten. B3 changed the inventory as follows:

| Delta | Count | Paths |
|---|---:|---|
| New B3 test files | 2 | `benchmarks/b3-performance.test.ts`, `src/lib/analysis/pipeline-reliability.test.ts` |
| New required B3 reports | 5 | `docs/engineering/reports/27-b3-*.md` |
| Previously clean tracked files now modified | 5 | `src/components/analysis/analysis-summary.tsx`, `src/components/ui/meter.tsx`, `src/components/ui/severity-chip.tsx`, `src/lib/utils/format.ts`, `src/app/globals.css` |
| Net inventory increase | **+12** | 139 → **151** status entries |

Every pre-existing modification and untracked file remains. The B2.1 HOLD statuses should be read as superseded only for the two rows above. The old 138-row table is still useful as the B2.1 baseline, but it is not the final B3 inventory.

## 5. Workstream results

| Workstream | Result | Evidence |
|---|---|---|
| HOLD resolution | Complete | Section 3; no restoration; dated correction |
| Playwright CI | Implemented, not remotely executed | `.github/workflows/ci.yml`; local js-yaml parse; equivalent local commands |
| External services | Reviewed locally; live checks not authorized | Section 7 |
| Security expansion | Complete locally | quota ordering, three route regressions, three reliability tests |
| Performance | Harness added; measurements recorded | `27-b3-performance-results.md` |
| Accessibility | Automated defects fixed; manual checks remain | 14 passed / 1 skipped; axe serious/critical clean |
| Report/product quality | Sampled review; no unsupported new claim introduced | demo review and existing disclaimers; no redesign |
| Dependency assessment | Audited; major migration deferred | 1 high + 1 moderate, Next 16.4.5 only offered fix |
| Observability | Two safe fields added | `partial`, `inspectedFiles` |
| Documentation | B3 package plus living-doc corrections | this report set; README/checklist/status/limitations |

## 6. Playwright CI implementation

The existing workflow was extended rather than duplicated:

- Triggers: pushes to `master`/`main` and pull requests.
- Permissions: `contents: read`.
- Concurrency: one group per workflow/ref, cancel in progress.
- Node 22, `npm ci`, lint, typecheck, Vitest, benchmark, production build.
- `npx playwright install --with-deps chromium`.
- `npm run test:e2e`.
- On failure only: upload `test-results/` and `playwright-report/` for 7 days.
- The live GitHub scan remains opt-in through `RUN_LIVE_GITHUB_E2E=1` and is skipped in ordinary CI.

Local validation:

```text
js-yaml parse of .github/workflows/ci.yml: OK
keys: name, on, permissions, concurrency, jobs
```

Equivalent local sequence passed: lint 0, typecheck 0, 165 tests, benchmark 2 tests, build 0, Playwright 14 passed / 1 skipped.

**Not proven:** the workflow has not run on GitHub Actions. No push was made. A clean runner can still expose OS-specific browser or cache issues that local Windows execution cannot.

## 7. External service verification matrix

| Service | Local verification | Live verification | Credentials required | B3 result |
|---|---|---|---|---|
| GitHub REST | Client classification, timeout, ETag path, public-only metadata guard and mocked failures inspected; 15 focused analyze/reliability tests pass | **NOT TESTED** — no authorized live probe was needed for B3 | Server-side `GITHUB_TOKEN` for production; public read-only fine-grained token recommended | Locally verified; live capacity unverified |
| Upstash / shared quota | Atomic store adapter and 11 quota tests pass; fail-closed behavior covered by route tests | **NOT TESTED** — no isolated test instance was identified | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` or KV equivalents | Mocked only; contention/timeout unverified |
| AI provider | Disabled/opt-in paths, request schema, signing, tamper/rotation and output limits tested | **NOT TESTED** — no paid call made | `AI_API_KEY`, `AI_ANALYSIS_SECRET`, `AI_PUBLIC_ENABLED` | Safely gated; provider behavior unverified |
| Vercel | Build succeeds; production requirements documented; local production server headers checked | **NOT TESTED** — no deployment or production environment access | Owner Vercel account and production env | Deployed commit/provenance unverified |
| PostCSS / Next | Audit and dependency tree inspected | Not applicable | None | 1 high + 1 moderate; major upgrade required |

## 8. Security and reliability changes

### Quota admission ordering

`/api/analyze` now validates the URL and required production configuration **before** consuming a per-client or global quota slot. New regression tests prove:

- malformed URL → `400 MALFORMED_URL`, quota untouched;
- malformed JSON → `400 MALFORMED_URL` after body rejection, quota untouched;
- missing production config → `503 CONFIGURATION_REQUIRED`, quota untouched;
- six admitted demo requests succeed, the seventh is `429 RATE_LIMITED`.

### Reliability degradation

`src/lib/analysis/pipeline-reliability.test.ts` adds three deterministic tests:

1. HTTP 500 on one blob → `partial: true`, warning and reduced inspected count.
2. HTTP 404 mid-scan → controlled partial result, no crash.
3. malformed TypeScript and Python → nonzero `parseFailures`, warning and partial result.

### Live local header check

`npm start` on loopback returned HTTP 200 with:

```text
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
Cross-Origin-Opener-Policy: same-origin
Content-Security-Policy: frame-ancestors 'none'; base-uri 'self'; form-action 'self'
```

`/api/analyze` returned `400` for an invalid URL and `403 FORBIDDEN_ORIGIN` for `Origin: https://evil.example`, both with `cache-control: no-store` and `x-request-id`.

## 9. Performance summary

The deterministic harness is deliberately separate from the accuracy benchmark. Latest run:

| Case | Eligible | Inspected | Coverage | Parsed | Parse failures | Requests | Analysis | Wall |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| small-30 | 35 | 35 | 100% | 17 | 0 | 35 | 59 ms | 63.5 ms |
| medium-150 | 155 | 72 | 46.5% | 5 | 0 | 72 | 15 ms | 18.7 ms |
| large-1200 | 1,205 | 96 | 8% | 5 | 1 | 96 | 51 ms | 57.3 ms |

No code optimization was made. The measurements do not justify trading analysis coverage for synthetic fixture speed; GitHub request count is the dominant external cost. Full caveats are in `27-b3-performance-results.md`.

## 10. Accessibility and report quality

The first full-report axe run found real defects:

- six `role="progressbar"` meters without accessible names — `aria-progressbar-name`;
- low-contrast band labels and severity chips — `color-contrast` (ratios as low as 1.16:1).

Fixes:

- `Meter` accepts an explicit accessible label; overall and each sector meter now announce score context.
- `BAND_TEXT_COLOR` supplies dark text variants while bright band colors remain meter fills.
- Severity chips use dark text variants while retaining colored borders, dots and backgrounds.
- New colors are design tokens in `globals.css`.

After the fix:

```text
14 passed, 1 skipped (gated live GitHub scan), exit 0
completed demo report: no serious or critical axe violations
```

The browser suite also verifies landing controls, inline errors, AI-disabled honesty, cancellation, upstream failure, four responsive widths and keyboard reachability.

**Not tested:** manual screen-reader traversal, reduced-motion behavior and 200% browser zoom. The axe result is not a complete WCAG certification.

## 11. Dependency security status

`npm audit --omit=dev` exits 1 with **1 high and 1 moderate**:

- `postcss` high: GHSA-6g55-p6wh-862q, GHSA-fxqj-rqcc-2cmp, GHSA-r28c-9q8g-f849, GHSA-qx2v-qp2m-jg93.
- `next` moderate via its nested `postcss`.
- Only offered remediation: `next@16.4.5`, `isSemVerMajor: true`.

No `npm audit fix --force` was run. The app does not accept user CSS, and PostCSS is a build-time dependency of Next rather than an endpoint. That lowers practical runtime exposure; it does not make the supply-chain finding disappear. A Next 16 migration plan is in `27-b3-security-verification.md`.

## 12. Observability

Successful analysis logs now include:

- `partial` — whether degradation occurred;
- `inspectedFiles` — how much content the analysis actually used.

Existing request IDs, route names, outcome categories, durations and error codes remain. No raw source, token, environment value or client-identifying content was added to logs.

## 13. Files changed or created by B3

Modified:

```text
.github/workflows/ci.yml
README.md
benchmarks/accuracy.test.ts
docs/engineering/CODEBASE_XRAY_MASTER_STATUS.md
docs/engineering/KNOWN_LIMITATIONS.md
docs/engineering/PUBLIC_BETA_CHECKLIST.md
docs/engineering/reports/25-public-beta-cost-and-operations-report.md
e2e/b2-public-beta.spec.ts
package.json
package-lock.json
src/app/api/analyze/route.ts
src/app/api/analyze/route.test.ts
src/app/globals.css
src/components/analysis/analysis-summary.tsx
src/components/ui/meter.tsx
src/components/ui/severity-chip.tsx
src/lib/server/observability.ts
src/lib/utils/format.ts
```

Created:

```text
benchmarks/b3-performance.test.ts
src/lib/analysis/pipeline-reliability.test.ts
docs/engineering/reports/27-b3-autonomous-execution-report.md
docs/engineering/reports/27-b3-performance-results.md
docs/engineering/reports/27-b3-security-verification.md
docs/engineering/reports/27-b3-private-beta-operations-runbook.md
docs/engineering/reports/27-b3-owner-action-checklist.md
```

`benchmarks/accuracy.test.ts` now supports `BENCHMARK_OUT_DIR` so the benchmark can run without overwriting historical `docs/engineering/benchmarks/` artifacts. Its default behavior is unchanged.

## 14. Final gate evidence

| Command | Exit | Result |
|---|---:|---|
| `npm run typecheck` | 0 | clean |
| `npm run lint` | 0 | clean |
| `npm test` | 0 | **28 files / 165 tests passed** |
| `npm run benchmark` with `BENCHMARK_OUT_DIR=/tmp/b3-bench` | 0 | 2 files / 2 tests passed; accuracy artifacts not overwritten |
| `npm run build` | 0 | Next 15.5.29; 225 kB first-load JS for `/` |
| `npx playwright test --reporter=list` | 0 | **14 passed / 1 skipped** |
| focused analyze + reliability tests | 0 | **15 passed** |
| `npm audit --omit=dev` | 1 | 1 high + 1 moderate; major-only fix |
| js-yaml parse of CI YAML | 0 | valid |
| local production header/API probe | 0 | headers, 400, 403 and no-store observed |

## 15. Failures and unresolved risks

1. **CI is unproven remotely.** A workflow file that parses is not a green Actions run.
2. **No live external verification.** GitHub live capacity, Upstash contention/timeout, AI provider behavior and deployment provenance remain untested.
3. **PostCSS advisories remain.** The only npm-offered fix is a Next major upgrade.
4. **HSTS is absent from application headers.** Vercel may add it at the edge; that has not been verified.
5. **CSP is intentionally narrow.** It sets `frame-ancestors`, `base-uri` and `form-action`, not a nonce-based `script-src`. It is not a complete XSS policy.
6. **Manual accessibility checks are outstanding.** Automated axe coverage is not a screen-reader audit.
7. **No deployment occurred.** The working tree is not proven to match any live URL.

## 16. Remaining owner approvals

- Review the diff and the B3 reports.
- Authorize the CI run (commit/push is outside this mission).
- Authorize a preview deployment and set production/preview secrets.
- Decide whether AI is enabled for beta and, if so, set a provider-side spend cap.
- Decide whether to accept the PostCSS/Next 16 risk temporarily or schedule the major upgrade.
- Complete manual accessibility checks.
- Choose a licence.

## 17. Recommendation

Proceed to an **owner-authorized preview deployment** after reviewing this diff. Run the operations-runbook smoke test against that exact preview, confirm the Upstash instance under two concurrent requests, and only then invite a small private cohort. Do not treat the local pass as proof of the deployed environment.
