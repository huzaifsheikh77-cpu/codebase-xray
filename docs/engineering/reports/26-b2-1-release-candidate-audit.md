# 26 — B2.1 Release Candidate Audit

**Project:** Codebase X-Ray
**Repository:** `D:\CODEBASEXRAY`
**Branch:** `master`
**HEAD:** `e287e079b2ab086e5339192dd1bd86c1c48192cf`
**Audit date:** 2026-11-06
**Mode:** Read-only forensic audit and release preparation. No commit, push, deployment, staging, reset, clean, stash, restore or destructive operation was performed.

---

## 1. Executive verdict

**B — RELEASE CANDIDATE READY AFTER OWNER REVIEW.**

The B1/B2 implementation is coherent and all local release gates pass. The working tree is not ready for an unconditional release because three decisions remain owner-owned:

1. The pre-existing deletion of `src/components/ui/score-pill.tsx` cannot be proven intentional from the available two-commit history.
2. The historical cost report says the global analysis limit is 40/min, while `src/lib/server/rate-limit.ts` defaults it to 8/min.
3. Live Upstash, live AI/provider and production Vercel provenance remain externally unverified; the Playwright live GitHub test is gated and skipped locally.

There is no evidence of exposed credentials, unexplained source changes, debug code, accidental source deletion or a broken build. The proposed release manifest is the complete 138-row inventory in `26-b2-1-release-candidate-manifest.md`.

---

## 2. Initial Git baseline

Captured before any B2.1 change:

| Item | Result |
|---|---|
| Repository root | `D:/CODEBASEXRAY` |
| Branch | `master` |
| HEAD | `e287e079b2ab086e5339192dd1bd86c1c48192cf` |
| Staged files | **0** |
| Modified tracked | **37** |
| Deleted tracked | **1** |
| Renamed tracked | **0** |
| Untracked files (`git status -uall`) | **100** |
| Untracked directories (historical handover count) | 36 |
| Tracked diff | **38 files, +3,050 / −1,192** |
| `git diff --check` | exit **0** |

The historical handover said “36 untracked entries.” That was a directory-level count; the file-level truth was 100 untracked files. This is the only baseline discrepancy. The historical HEAD, branch, staged count, modified count and deletion count matched.

Ignored and relevant to reproduction: `.next/`, `test-results/`, `playwright-report/`, `node_modules/`, `*.tsbuildinfo`, `.env*`, `.vercel/`, `.freebuff/`. The `docs/` and `benchmarks/` trees are excluded from Vercel deployment by `.vercelignore`.

---

## 3. Final Git baseline

After the B2.1 audit changes:

| Item | Result |
|---|---|
| Repository root | `D:/CODEBASEXRAY` |
| Branch | `master` |
| HEAD | `e287e079b2ab086e5339192dd1bd86c1c48192cf` |
| Staged files | **0** |
| Modified tracked | **37** |
| Deleted tracked | **1** |
| Untracked files (`-uall`) | **101** after both B2.1 reports |
| Tracked diff | **38 files, +3,053 / −1,192** |
| `git diff --check` | exit **0** |

The tracked diff grew by three lines in `.gitignore`. The untracked count moved from 100 to 99 when `.cloud-attachments/` was ignored, then to 101 with the two B2.1 reports. No file was staged or deleted. The `.cloud-attachments` transcript remains on disk.

### B2.1 changes made during this audit

1. `.gitignore` — added `/.cloud-attachments/` so the imported 1.8 MB conversation transcript cannot be staged accidentally.
2. `src/app/api/ai/route.ts` — the streamed-body size rejection now returns HTTP **413** with `PAYLOAD_TOO_LARGE`; it previously returned 400 for the same condition.
3. `src/app/api/ai/route.test.ts` — added a regression test for the 413 path.
4. `src/lib/server/rate-limit.ts` — corrected indentation of the analysis `global` default; no behavior change.
5. `docs/engineering/PUBLIC_BETA_CHECKLIST.md` — test count updated from 158 to 159.
6. The two new B2.1 reports.

No other source change was made.

---

## 4. Complete file inventory

The complete, individual-path inventory is the 138-row table in:

`docs/engineering/reports/26-b2-1-release-candidate-manifest.md`

It includes every modified tracked file, the one deleted tracked file and every untracked file seen in the baseline, with status, A–E classification, purpose, release decision, evidence and risk. The two B2.1 reports are proposed additions, not part of the 138-row baseline.

No file was skipped in the inventory. Files that Git does not report because they are ignored (`.env.local`, `.next`, browser output) are listed in the EXCLUDE section of the manifest, not as inventory rows.

---

## 5. B1 / B2 / pre-existing classification

| Class | Count | Scope |
|---|---:|---|
| A — pre-existing project work | 1 | `src/components/ui/score-pill.tsx` deletion |
| B — B1 implementation | 114 | Analysis engine, parsers, scoring, pipeline, GitHub boundary, quota/server foundation, UI, tests, benchmarks, B1 reports and CI |
| C — B2 implementation | 8 | Playwright harness/spec, AI route regression test, two B2 reports, three B2 evidence PNGs |
| D — mixed B1/B2 | 14 | `.env.example`, `.gitignore`, `README.md`, `package.json`, `package-lock.json`, both analyze-route files, both request-guard files, AI route, token test, and three living status/checklist documents |
| E — generated/disposable/sensitive | 1 | `.cloud-attachments/imported-conversation-…json` |

### Classification limits

- Classification used the B1/B2 reports, current diffs, imports, test references, package changes and documentation. Modification timestamps were not used as proof.
- The B1 report calls the score-pill deletion pre-existing. The repository has only two visible commits, so independent proof of intent is unavailable. It is treated as **A with an unresolved origin**, not as a B1/B2 deletion.
- B1 and B2 both touched the 14 mixed files; they are not separable into clean single-mission commits without reviewing hunk ownership. The proposed sequence keeps those files together where their behavior is interdependent.
- The `.cloud-attachments` JSON is a transcript, not project work. It is sensitive and excluded.

---

## 6. Security and secret exposure audit

### Result

No live credential was found in the scanned source, tests, documentation, CI or e2e tree.

Scans performed over `src`, `e2e`, `docs` and `.github` for:

- GitHub classic/fine-grained token shapes (`ghp_`, `gho_`, `ghu_`, `ghs_`, `ghr_`, `github_pat_`);
- `sk-`-style provider keys;
- PEM private-key blocks.

No hits. `.env.local` values were not read or printed. `.env` and `.env.local` remain ignored. `.env.example` contains names/defaults, not live credentials.

### Findings

| Finding | Severity | Status |
|---|---|---|
| `.cloud-attachments/imported-conversation-…json` was untracked and not ignored; 1.8 MB of imported conversation could be staged by `git add -A` | High privacy risk | **Mitigated**: added `/.cloud-attachments/` to `.gitignore`; file retained on disk and excluded |
| `score-pill.tsx` deletion | Low/unknown | HOLD; no import, build passes, origin not independently provable |
| Mock/AI tests use `AI_API_KEY=test-only-key` | None | Test-local value, not a credential; no provider call |
| Development HMAC fallback `codebase-xray-development-only-analysis-secret` | Low | Intentional non-production fallback; production requires `AI_ANALYSIS_SECRET` |
| Analysis token is replayable until expiry | Documented limitation | Not a secret leak; README, `KNOWN_LIMITATIONS` and master status state it is not single-use |
| Playwright traces/screenshots | Low | `test-results/` and `playwright-report/` ignored; `trace: retain-on-failure`, screenshots only on failure; B2 evidence copies are explicit documentation artifacts |
| CI does not run Playwright | Coverage limitation | E2E is local/manual; CI runs lint, typecheck, unit/integration tests, benchmark and build |

The scan is pattern-based, not a full entropy or image-OCR audit. No credential-like material was observed in the documentation or evidence filenames. The `.cloud-attachments` transcript is still sensitive even though ignored; it should not be published or attached to a release.

---

## 7. Code quality findings

### Confirmed correct

- **Same-origin boundary.** `isCrossOrigin` compares the `Origin` host with the request `Host` header, falling back to the normalized request URL. This addresses dev-server host rewriting and has tests. Non-browser requests without `Origin` remain accepted by design and are rate-limited; this is documented.
- **AI validation ordering.** `/api/ai` checks same-origin, emergency disable, hosted deployment opt-in, configuration, declared body size, streamed body size, task, full analysis shape, token binding, question limits and only then quota and daily budget.
- **Signed analysis binding.** The HMAC covers a stable digest of the analysis excluding `aiToken`; expiry, tamper and rotation paths are tested. It is intentionally not single-use.
- **Quota admission.** The shared store checks all budgets before incrementing, so rejected traffic does not consume the per-client or global budget. Production without a shared store fails closed.
- **Premium-work admission.** The duplicate-scan lock is acquired before the hourly scan budget is consumed. Metadata is validated and private repositories rejected before tree retrieval.
- **Body streaming.** `readJsonBody` enforces actual bytes, cancels oversized streams and has a declared-length fast path.
- **UI cancellation.** Playwright covers aborting a scan and not applying a stale result, plus structured upstream failure and responsive/accessibility checks.

### Defects found and fixed

1. **AI oversized-body status (fixed).** `/api/ai` mapped a streamed `PAYLOAD_TOO_LARGE` to 400. The declared-length path returned 413. The route now uses 413 for both and the regression test asserts it.
2. **Missing ignore rule (fixed).** The imported transcript was not ignored; `/.cloud-attachments/` was added.
3. **Quota default indentation (fixed).** The analysis `global` property was misindented; behavior was already correct.
4. **Living test count (fixed).** `PUBLIC_BETA_CHECKLIST.md` still said 158 tests after B2.1 added one; updated to 159.

### Remaining quality observations (not changed)

- CI has no Chromium installation or Playwright step. Browser coverage is local/owner-run, not enforced in CI.
- The historical B1 cost report is stale on the global limit (see §11). It was not rewritten.
- `npm run benchmark` was not rerun in B2.1 because it can overwrite generated benchmark artifacts. It remains a CI gate and was not part of the B2.1 minimum test set.
- `console.warn`/`console.error` in quota and analyze failure paths are intentional classification logs; no debug `console.log` or `debugger` was found. TODO matches under `src/lib/analysis/` are product detectors, not accidental markers.
- The AI token is not single-use; any future public deployment must either accept the replay window or add a consumption store.

---

## 8. Deleted-file investigation

`src/components/ui/score-pill.tsx` is the only tracked deletion.

- It exists at HEAD and is absent in the working tree.
- `rg`/`grep` found no `score-pill` or `ScorePill` imports or references in `src`.
- `npm run build` passes without it.
- The B1 report identifies it as pre-existing.
- The Git history available here has only two visible commits; it cannot prove whether the deletion was deliberate or an accidental local loss.
- No replacement component with the same role was found.
- Restoring it would not overwrite a current file, but could overwrite the owner's deliberate removal decision.

**Decision: HOLD.** Do not restore automatically and do not include the deletion in the release candidate until the owner confirms it. There are no other deleted, missing or renamed tracked files and no orphaned import was found.

---

## 9. Test results

Run in the working tree after the B2.1 fixes:

| Check | Result |
|---|---|
| `npm run typecheck` | **Exit 0** — `tsc --noEmit` |
| `npm run lint` | **Exit 0** — ESLint |
| `npm test` | **Exit 0 — 27 files / 159 tests passed** |
| `npm run build` | **Exit 0** — Next.js **15.5.29** production build |
| `npx playwright test --reporter=list --output=/tmp/b21-playwright2` | **Exit 0 — 13 passed, 1 skipped** |
| `npm audit --omit=dev` | **Exit 1** — 2 vulnerabilities (1 high, 1 moderate) from nested `next/node_modules/postcss` |

The skipped Playwright case is the gated live GitHub scan; it did not consume GitHub quota. No live AI/provider call was made. The browser suite used the local Next dev server and a fresh output directory; ignored `test-results/`/`playwright-report/` artifacts may have been refreshed, but the preserved evidence under `docs/engineering/reports/b2-evidence/` was not overwritten.

The suite was 158 tests before the new 413 regression test; the final count is 159. B2's historical report remains a record of its own 158-test run.

Not run in B2.1: the benchmark suite, live Upstash, live AI, live production Vercel checks, and the gated live GitHub journey. These are external verification gaps, not suppressed failures.

---

## 10. Dependency and license status

### Direct dependencies

Production: `next` MIT, `react`/`react-dom` MIT, `lucide-react` ISC, `recharts` MIT, `typescript` Apache-2.0.

Development/testing: `@playwright/test` Apache-2.0, `vitest` MIT, `@vitejs/plugin-react` MIT, `jsdom` MIT, Testing Library packages MIT, `tailwindcss`/`@tailwindcss/postcss` MIT, `eslint` MIT, `eslint-config-next` MIT, type packages MIT/Apache-2.0 as published.

No copyleft license was identified among the direct dependencies. A complete transitive license scan was not performed; that remains a commercial-release review item.

### Security

`npm audit --omit=dev` reports:

- **1 high** and **1 moderate** vulnerability;
- both attributable to `postcss <= 8.5.22` nested under `next`;
- advisories include `GHSA-qx2v-qp2m-jg93`, `GHSA-6g55-p6wh-862q`, `GHSA-fxqj-rqcc-2cmp`, `GHSA-r28c-9q8g-f849`;
- the suggested fix is `next@16.4.5`, a breaking major upgrade.

The forced upgrade was **not** applied. The vulnerability is in the production dependency tree and should be tracked as an accepted temporary risk or resolved in a separate Next 16 upgrade mission. Playwright is correctly a development dependency.

No demonstrably unused dependency was removed. No dependency was added in B2.1.

---

## 11. Documentation consistency

| Document | Finding | Action |
|---|---|---|
| `README.md` | Says global analysis limit defaults to 8; AI opt-in and token replay limitation are accurate | Consistent |
| `.env.example` | Documents opt-in/emergency variables; no live values | Consistent |
| `PUBLIC_BETA_CHECKLIST.md` | B2 still says 158 tests; B2.1 added one | Updated to 159 |
| `CODEBASE_XRAY_MASTER_STATUS.md` | Records AI as verified except replay; matches implementation | Consistent |
| `KNOWN_LIMITATIONS.md` | Documents preview opt-in and non-single-use token | Consistent |
| `docs/engineering/reports/25-public-beta-cost-and-operations-report.md` | Says **40/min globally**; code default is **8/min** | **HOLD**; do not rewrite historical report; owner correction note |
| `docs/engineering/reports/25-b2-independent-verification-report.md` | 158 tests is the B2 run record | Historical; B2.1 report records 159 |
| `docs/engineering/reports/23-vercel-deployment-execution-report.md` | Contains historical `git add -A && git commit` procedure | Do not execute; selective manifest supersedes it |
| Deployment provenance | No live Vercel/Upstash/AI verification in B2.1 | Unverified; do not claim production validation |
| CI | No Playwright step | Documented coverage gap |

---

## 12. Proposed release manifest

The full 138-row table is in `26-b2-1-release-candidate-manifest.md`.

### INCLUDE

All product source, tests, package metadata, `.env.example`, Next/Vitest/Playwright configuration, `.gitignore`, CI/deployment metadata, benchmark fixtures and engineering records marked INCLUDE. Shared runtime and configuration modules marked DEPENDENCY are included with their importers. The candidate includes the B1 analysis pipeline and security boundary, the B2 browser harness and regression tests, and the B2.1 fixes.

### HOLD

- `src/components/ui/score-pill.tsx` — owner must confirm the deletion.
- `docs/engineering/reports/25-public-beta-cost-and-operations-report.md` — stale 40/min claim; needs an owner-approved correction or deliberate exclusion.

### EXCLUDE

- `.cloud-attachments/imported-conversation-…json` — sensitive 1.8 MB transcript; now ignored.
- `.next/`, `test-results/`, `playwright-report/`, `node_modules/`, `*.tsbuildinfo`, `.env.local`, `.vercel/`, `.freebuff/` — generated, local or secret-bearing.

### Dependency completeness

The manifest includes the modules imported by both API routes, the shared quota/request/observability/GitHub-admission modules, the analysis engine, the Playwright config and spec, and the package lock. No missing import or broken test script was found. The only intentional deletion has no remaining reference.

---

## 13. Proposed commit sequence (not executed)

**Exact path membership:** every path in the manifest marked INCLUDE is in exactly one group below. The scope text names the group selector; the manifest table is authoritative for the literal paths.

| # | Proposed commit | Exact scope | Depends on | Required checks | Risk / owner review |
|---|---|---|---|---|---|
| 1 | Server security and quota foundation | `src/lib/server/request-guards.ts`, `request-guards.test.ts`, `rate-limit.ts`, `rate-limit.test.ts`, `quota-store.ts`, `quota-store.test.ts`, `observability.ts`; `src/lib/config/env.ts`; `src/lib/github/admission.ts`, `admission.test.ts`; `next.config.ts` | None | typecheck, lint, unit tests, build | Medium; review fail-closed Redis and Host-header logic |
| 2 | Analysis engine, scoring and types | `src/lib/analysis/**`; `src/lib/types/analysis.ts`; `src/lib/mock/**`; `src/lib/version.ts` | 1 where server types are shared | typecheck, lint, full unit tests, build | Medium; scoring changes affect report correctness |
| 3 | Analyze API hardening | `src/app/api/analyze/route.ts`, `route.test.ts` | 1, 2 | full unit tests, build | Medium; metadata/privacy/quota ordering |
| 4 | AI validation and token boundary | `src/lib/ai/**`; `src/app/api/ai/route.ts`, `route.test.ts` | 1, 2 | full unit tests, build | Medium; no live provider test |
| 5 | UI, cancellation and report rendering | `src/app/page.tsx`; `src/components/**` | 2 | typecheck, lint, component tests, build | Medium; visual behavior not re-reviewed in B2.1 |
| 6 | Browser E2E infrastructure | `e2e/b2-public-beta.spec.ts`; `playwright.config.ts`; `package.json`; `package-lock.json`; `.gitignore` | 3, 4, 5 | unit tests, build, Playwright | Medium; Chromium/local-only and CI gap |
| 7 | Documentation, benchmark records and release evidence | `README.md`; `.env.example`; `docs/engineering/**`; `benchmarks/**`; `.github/workflows/ci.yml`; `.vercelignore` | 1–6 for accurate references | documentation consistency review | Low; exclude HOLD report until corrected |
| 8 | Deletion decision | `src/components/ui/score-pill.tsx` | Owner decision | build; no-import check | **HOLD — do not execute** |

Tests: the full suite is appropriate for groups 1–5; group 6 requires the Playwright suite; group 7 needs no new test but must not contradict the implementation. No commit hash was generated. Nothing was staged.

---

## 14. Files requiring owner review

1. `src/components/ui/score-pill.tsx` — confirm intentional deletion or restore deliberately.
2. `docs/engineering/reports/25-public-beta-cost-and-operations-report.md` — correct 40/min to 8/min, or exclude from the release docs.
3. `package.json` / `package-lock.json` — accept the unresolved PostCSS advisories until a planned Next 16 upgrade.
4. `src/app/api/analyze/route.ts`, `src/app/api/ai/route.ts`, `src/lib/server/rate-limit.ts`, `src/lib/server/request-guards.ts` — final security-owner review; local tests pass but live Upstash/provider behavior is unverified.
5. `.github/workflows/ci.yml` — decide whether to add Playwright to CI.
6. `.cloud-attachments` — confirm deletion from the workspace if it contains private material; it is now ignored, not deleted.

---

## 15. Remaining risks

- **External verification gap:** no live Upstash quota check, no live AI call, no live production Vercel provenance, and the live GitHub Playwright case is gated/skipped.
- **Replay window:** the analysis token can be reused with the same payload until it expires. This is documented, not fixed.
- **PostCSS:** high/moderate advisories remain in the production Next dependency tree; the only offered fix is a breaking major upgrade.
- **Browser coverage:** Playwright is local/owner-run; CI does not install Chromium or run it. The live case requires a token and is skipped.
- **Documentation drift:** the historical 40/min claim is wrong relative to the code.
- **Deletion uncertainty:** score-pill origin is not independently provable from the available history.
- **Sensitive local transcript:** `.cloud-attachments` remains on disk despite being ignored.
- **Visual review:** B2.1 did not re-inspect every UI screen; the existing B2 evidence and Playwright checks are the visual record.

---

## 16. Final recommendation

Approve **B**: use the INCLUDE manifest for the release candidate, keep the two HOLD items out until owner decisions, keep `.cloud-attachments` and all generated output out, and do not stage or commit yet. Before a public deployment, run the live Upstash quota test, the live GitHub gated journey, and a real AI provider smoke test; record the PostCSS risk and the absence of CI Playwright coverage.

**Next owner action:** confirm the score-pill deletion and the 40/min report correction, then authorize a selective staging/commit pass following the eight-group sequence. This audit does not authorize that pass.
