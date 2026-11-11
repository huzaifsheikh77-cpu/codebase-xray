# 28 — B4 Controlled Release Candidate Report

**Date:** 2026-11-07
**Repository:** `D:\CODEBASEXRAY`
**Branch:** `master`
**HEAD:** `e287e079b2ab086e5339192dd1bd86c1c48192cf`
**Mode:** Autonomous release engineering with owner-approval gates. No staging, commit, push, deployment, production configuration change, paid AI call or destructive operation was performed.

---

## 1. Executive verdict

**B — READY AFTER SPECIFIC OWNER APPROVALS.**

The release candidate is coherent and locally verified. The manifest is complete, both inherited HOLD items are resolved, the browser and unit gates are green, the production build succeeds, and the B4 changes are limited to two verified product/documentation corrections plus release evidence.

It is not **A** because:

1. GitHub Actions has still not executed on a GitHub runner.
2. No isolated Upstash instance, live GitHub probe, live AI provider call or Vercel deployment was verified.
3. The uncommitted tree has **no candidate commit SHA**; preview deployment must wait for the owner-approved commit sequence.
4. The PostCSS high advisory remains unresolved; the only offered fix is Next **16.4.5**, a semver-major upgrade.
5. Manual screen-reader, reduced-motion and 200% zoom checks remain outstanding.
6. The application does not send HSTS itself, and its CSP is intentionally narrow.

Those are specific approvals/checks, not evidence of a broad implementation failure.

**Release position:** review the 155-row manifest, authorize the selective commit plan, run CI, then deploy the resulting SHA to an isolated preview with AI disabled.

---

## 2. Initial repository baseline

Captured before B4 changes:

| Measure | Value |
|---|---:|
| Repository root | `D:/CODEBASEXRAY` |
| Branch | `master` |
| HEAD | `e287e079b2ab086e5339192dd1bd86c1c48192cf` |
| Staged files | **0** |
| Modified tracked files | **42** |
| Deleted tracked files | **1** |
| Untracked files (`-uall`) | **108** |
| Total status entries | **151** |
| Tracked diff | **43 files, +3,193 / −1,203** |
| `git diff --check` | exit **0** |

The only deletion was `src/components/ui/score-pill.tsx`. All pre-existing work was preserved. No `D:\DEVFLOW` access occurred.

---

## 3. Final repository baseline

B4 changed:

1. `README.md` — corrected the request-flow diagram (URL/config validation now precedes quota) and replaced the false “no database” claim with the shared Redis counter-store contract; added missing quota/emergency variables to the table.
2. `src/lib/ai/config.ts` — public AI status now mirrors the route’s hosted opt-in, `AI_DISABLED` emergency switch and production `AI_ANALYSIS_SECRET` requirement.
3. `src/lib/ai/config.test.ts` — four regressions for those status gates.
4. The B4 manifest, this report and the B4.1 owner manifest review.
5. A small B4 section in the living release checklist and master status.

Final measured state after this report:

| Measure | Value |
|---|---:|
| Staged files | **0** |
| Modified tracked files | **42** |
| Deleted tracked files | **1** |
| Untracked files (`-uall`) | **112** |
| Total status entries | **155** |
| Tracked diff | **43 files, +3,199 / −1,205** |
| `git diff --check` | exit **0** |
| Candidate commit SHA | **none — tree is uncommitted** |

The 155 entries equal the 155-row manifest: 42 modified + 1 deleted + 112 untracked. The untracked count includes the four B4/B4.1 additions (`config.test.ts`, manifest, report, B4.1 review); no generated browser or build output is tracked.

B4.2 later created `28-b4-2-final-manifest-corrections.md` outside the 155-row manifest. The current status is 42 modified, 1 deleted, 113 untracked, 156 total, staged 0; the table above records the B4-time state.

---

## 4. Release manifest and audit result

The complete inventory is:

`docs/engineering/reports/28-b4-release-candidate-manifest.md`

It lists every modified, deleted and untracked path with status, origin, purpose, decision, proposed commit group and review risk. The B4.1 owner review is included as path 155 in B4-09. There are **no HOLD rows**. `INCLUDE` and `DEPENDENCY` are both part of the candidate; dependency means “required by an included path.”

| Decision | Count |
|---|---:|
| INCLUDE | 134 |
| DEPENDENCY | 21 |
| HOLD | 0 |
| Total inventory | **155** |

### Excluded content

- `.cloud-attachments/imported-conversation-*.json` — private transcript; ignored, retained on disk, never release content.
- `.env.local` — local environment values; not read in B4.
- `.next/`, `test-results/`, `playwright-report/`, `node_modules/`, `*.tsbuildinfo`, `.vercel/`, `.freebuff/` — generated, local or provider state.
- Temporary benchmark output outside the workspace.
- `.vercel/project.json` — local linkage only; ignored.

No accidental screenshot, trace, build directory, transcript or environment file is in the manifest. The only deleted path is the accepted unused `score-pill.tsx`.

### Manifest limitation

The manifest is a proposal, not a commit. It cannot supply a deployable SHA until the owner approves staging and commits.

---

## 5. HOLD decisions

| Item | Decision | Evidence |
|---|---|---|
| `src/components/ui/score-pill.tsx` | **Accepted deletion; do not restore** | The HEAD version is a standalone score/band component. No import or reference remains. `AnalysisSummary` renders the score, `/100`, band and meter inline. Typecheck and production build pass without it. |
| Report 25’s historical 40/min statement | **Preserve history; dated correction** | Current defaults are **6/min per client**, **8/min global** and **24 scans/hour**. The original sentence remains annotated as superseded. |
| PostCSS/Next | **Owner decision required** | See §6. No forced override or major upgrade was applied. |

No new HOLD was created. The B2.1 HOLD statuses are superseded only for these rows.

---

## 6. Dependency security decision

Fresh audit:

```text
npm audit --omit=dev
exit 1
production dependencies: 63
1 high, 1 moderate, 0 critical
```

| Package | Severity | Path / range | Fix |
|---|---|---|---|
| `postcss` | **High** | nested under `next@15.5.29`; installed `8.4.31`; affected `<=8.5.22` | `next@16.4.5` only |
| `next` | Moderate | direct; affected `9.3.4-canary.0 – 16.3.0-preview.10` | `next@16.4.5`, semver-major |

Advisories:

- `GHSA-qx2v-qp2m-jg93` — moderate XSS via unescaped `</style>` in stringify output;
- `GHSA-6g55-p6wh-862q` — high arbitrary file read via source-map comments;
- `GHSA-fxqj-rqcc-2cmp` — incomplete fix of the same source-map issue;
- `GHSA-r28c-9q8g-f849` — high path traversal in previous source-map loading.

Investigation:

- The newest published Next 15 release is **15.5.29**, the installed version. There is no patched Next 15 release on the registry.
- Next 16.4.5 declares `postcss@8.5.23`, which is outside the affected `<=8.5.22` range.
- `@tailwindcss/postcss@4.3.3` uses its own `postcss@8.5.29`; only the Next copy is affected.
- An npm `overrides` entry forcing Next’s private PostCSS copy to 8.5.29 is technically tempting but is an untested dependency substitution inside the framework build. It was **not** applied.
- `npm audit fix --force` would install Next 16.4.5. It was **not** run.

**Recommendation:** for a closed, owner-authorized preview with AI disabled and no untrusted CSS build path, accept this as a documented build/supply-chain risk with a review date. Schedule Next 16.4.5 as a separate migration; do not mix it with beta release fixes. If the owner wants an unconditional public release, resolve it before inviting users.

---

## 7. CI readiness

Workflow: `.github/workflows/ci.yml`.

| Property | Current state |
|---|---|
| Triggers | Push to `master`/`main`; pull requests |
| Permissions | `contents: read` |
| Concurrency | One group per workflow/ref; cancel in progress |
| Runtime | Node 22 |
| Install | `npm ci` |
| Gates | Lint, typecheck, Vitest, benchmark, production build, Chromium install, Playwright |
| Artifacts | `test-results/` and `playwright-report/` only on failure, 7-day retention |
| Live GitHub case | Gated by `RUN_LIVE_GITHUB_E2E=1`; ordinary CI skips it |
| Timeout | 30 minutes |

YAML parse result:

```json
{"ok":true,"keys":["name","on","permissions","concurrency","jobs"],"jobs":["verify"]}
```

Equivalent local sequence:

| Stage | Result |
|---|---|
| Lint | exit 0 |
| Typecheck | exit 0 |
| Vitest | **29 files / 169 tests passed** |
| Benchmark | **2 files / 2 tests passed**; isolated accuracy output |
| Production build | exit 0; Next 15.5.29 |
| Playwright | **14 passed / 1 skipped** |
| Audit | exit 1; known PostCSS/Next finding |

**Not proven:** no GitHub Actions run exists. A parsed workflow is not a green remote run. The live GitHub scan did not execute.

Playwright emitted a Next dev warning about cross-origin `/_next/*` requests and `allowedDevOrigins`. It is a development-server warning, not a production security failure; it should be considered separately if the dev origin configuration changes.

---

## 8. External service status

| Service | Local evidence | Live evidence | B4 status |
|---|---|---|---|
| GitHub REST | Client classification, timeout, ETag cache, admission estimate and mocked failure tests inspected; private/metadata boundaries tested | **No live call in B4** | Local only; no token examined |
| Upstash / shared quota | Lua `consume` does check-then-increment; rejected requests consume nothing; tests cover atomic intent and fail-closed behavior | **No isolated instance identified** | Mocked only; contention/TTL/timeout unverified |
| AI | Disabled/opt-in/schema/signing/tamper tests; B4 fixes status honesty | **No provider call** | Safely gated; provider behavior unverified |
| Vercel | `.vercel/project.json` confirms local linkage to the project; no `vercel.json`; Next build is standard | **No deployment or environment inspection** | Linkage known; deployed SHA/config unknown |
| PostCSS | Fresh audit and registry metadata | Not applicable | Major-only remediation |

No secret values were read or printed. `.env.local` was not read. The Vercel project/org IDs are intentionally omitted from this report.

---

## 9. Preview deployment preparation

### 9.1 Candidate identity

There is **no candidate commit SHA** because the working tree is deliberately uncommitted. `HEAD` alone is not the candidate: the candidate is `HEAD` plus the 155-path working tree.

After the owner approves the commit sequence, deploy the resulting reviewed SHA. Do not call the current `HEAD` the release candidate and do not deploy the uncommitted tree.

### 9.2 Configuration matrix

| Variable | Required | Preview setting | Purpose |
|---|---|---|---|
| `GITHUB_TOKEN` | Yes | Public read-only fine-grained token | Authenticated GitHub REST access; no private scopes |
| `UPSTASH_REDIS_REST_URL` | Yes | Isolated preview database | Shared quota store |
| `UPSTASH_REDIS_REST_TOKEN` | Yes | Isolated preview database | Shared quota auth |
| `REQUIRE_SHARED_QUOTA` | Yes | `1` | Forces fail-closed shared quota on preview; without this, preview can fall back to per-instance memory |
| `ANALYSIS_RATE_LIMIT` | No | `6` | Per-client burst |
| `ANALYSIS_GLOBAL_LIMIT` | No | `8` | Global burst |
| `SCAN_HOURLY_LIMIT` | No | `24` | Hourly backstop |
| `ANALYSIS_DISABLED` | No | unset | Scans enabled |
| `AI_DISABLED` | Yes for AI-off preview | `1` | Explicit emergency/disabled state |
| `AI_PUBLIC_ENABLED` | No | unset | Do not opt in |
| `AI_API_KEY` | No | unset | No provider spend |
| `AI_ANALYSIS_SECRET` | No | unset | No AI binding issued |
| `ALLOW_ANONYMOUS_GITHUB` | No | unset | Do not permit anonymous production-style scans |
| `ALLOW_MEMORY_QUOTA` | No | unset | Never use per-instance quota on a public preview |
| `VERCEL_ENV` | Platform | `preview` | Supplied by Vercel; do not set manually |
| `VERCEL` | Platform | `1` | Supplied by Vercel; do not set manually |

`REQUIRE_SHARED_QUOTA=1` is important: the current code only makes shared quota mandatory for `VERCEL_ENV=production` or this explicit flag. A preview without it can use the in-memory fallback.

### 9.3 Preflight checklist

- [ ] Review the 155-row manifest and confirm no HOLD remains.
- [ ] Approve the 10-commit sequence in §13.
- [ ] Confirm the candidate commit is based on `e287e079b2ab086e5339192dd1bd86c1c48192cf` and contains every INCLUDE/DEPENDENCY row.
- [ ] Run `git diff --check` and `git status --porcelain=v1 -uall` on the exact candidate.
- [ ] Run all local gates on the exact candidate.
- [ ] Obtain a green GitHub Actions run on that commit/PR.
- [ ] Confirm the Vercel project linkage and preview environment.
- [ ] Set the public-only GitHub token and isolated Upstash values in the host secret UI.
- [ ] Set `REQUIRE_SHARED_QUOTA=1` and `AI_DISABLED=1`.
- [ ] Confirm no `ALLOW_MEMORY_QUOTA`, `ALLOW_ANONYMOUS_GITHUB`, `AI_PUBLIC_ENABLED` or `AI_API_KEY` is present.
- [ ] Confirm the database/namespace is isolated from production.
- [ ] Record the deployment SHA and URL.
- [ ] Identify the last known-good deployment for rollback.
- [ ] Run the smoke test in §9.4.

### 9.4 Post-deployment smoke test

This script was **not executed** in B4 because no preview exists. It is intentionally curl-based and consumes one small public scan. Replace `<preview-origin>` with the exact deployed HTTPS origin; `Origin` must equal that origin.

```bash
set -u
BASE="https://<preview-origin>"
ORIGIN="$BASE"
TMP="$(mktemp -d)"

echo "1) landing and headers"
curl -sS -D "$TMP/headers" -o /dev/null "$BASE/"
grep -Ei '^(HTTP/|x-content-type-options|x-frame-options|referrer-policy|permissions-policy|cross-origin-opener-policy|content-security-policy|strict-transport-security):' "$TMP/headers" || true

echo "2) invalid URL"
curl -sS -D "$TMP/invalid.h" -o "$TMP/invalid.json" \
  -X POST "$BASE/api/analyze" \
  -H 'content-type: application/json' -H "origin: $ORIGIN" \
  --data '{"url":"not-a-github-url"}'
grep -Ei '^(HTTP/|cache-control|x-request-id):' "$TMP/invalid.h"
cat "$TMP/invalid.json"; echo

echo "3) malformed JSON"
curl -sS -D "$TMP/malformed.h" -o "$TMP/malformed.json" \
  -X POST "$BASE/api/analyze" \
  -H 'content-type: application/json' -H "origin: $ORIGIN" \
  --data '{not-json'
grep -Ei '^(HTTP/|cache-control|x-request-id):' "$TMP/malformed.h"

echo "4) oversized body"
printf '{"url":"https://github.com/octocat/Hello-World","pad":"' > "$TMP/large.json"
head -c 5000 /dev/zero | tr '\0' 'x' >> "$TMP/large.json"
printf '"}' >> "$TMP/large.json"
curl -sS -D "$TMP/large.h" -o "$TMP/large.out" \
  -X POST "$BASE/api/analyze" \
  -H 'content-type: application/json' -H "origin: $ORIGIN" \
  --data-binary "@$TMP/large.json"
grep -Ei '^(HTTP/|cache-control|x-request-id):' "$TMP/large.h"

echo "5) foreign origin"
curl -sS -D "$TMP/foreign.h" -o "$TMP/foreign.json" \
  -X POST "$BASE/api/analyze" \
  -H 'content-type: application/json' -H 'origin: https://evil.example' \
  --data '{"url":"https://github.com/octocat/Hello-World"}'
grep -Ei '^(HTTP/|cache-control|x-request-id):' "$TMP/foreign.h"
cat "$TMP/foreign.json"; echo

echo "6) AI disabled"
curl -sS -D "$TMP/ai.h" -o "$TMP/ai.json" \
  -X POST "$BASE/api/ai" \
  -H 'content-type: application/json' -H "origin: $ORIGIN" \
  --data '{}'
grep -Ei '^(HTTP/|cache-control|x-request-id):' "$TMP/ai.h"
cat "$TMP/ai.json"; echo

echo "7) one bounded public scan (consumes GitHub quota)"
curl -sS -D "$TMP/scan.h" -o "$TMP/scan.json" \
  -X POST "$BASE/api/analyze" \
  -H 'content-type: application/json' -H "origin: $ORIGIN" \
  --data '{"url":"https://github.com/octocat/Hello-World"}'
grep -Ei '^(HTTP/|cache-control|x-request-id):' "$TMP/scan.h"
node -e 'const a=require(process.argv[1]); const r=a.analysis; console.log(JSON.stringify({ok:a.ok,code:a.error?.code,partial:r?.analysis?.partial,coverage:r?.analysis?.coverage&&{inspected:r.analysis.coverage.inspectedFiles,eligible:r.analysis.coverage.eligibleFiles,pct:r.analysis.coverage.inspectedPct},issues:r?.issues?.length},null,2))' "$TMP/scan.json"

echo "8) optional private-repository check"
echo "Use only an owner-known private repository. A 404/NOT_FOUND_OR_PRIVATE or 422 PRIVATE_REPOSITORY_NOT_SUPPORTED is acceptable; no private contents may be fetched."
```

Expected:

- landing page 200 with the configured headers;
- invalid/malformed/oversized requests: controlled 400/400/413, `cache-control: no-store`, request ID;
- foreign origin: 403 `FORBIDDEN_ORIGIN`;
- AI: 503 `AI_UNAVAILABLE` with no provider call;
- one small public scan: 200 report or a controlled partial/error, never an HTML crash;
- no secret in any response or console;
- HSTS either present at the edge or recorded as an owner decision.

Do not use this script to run repeated scans until quota is exhausted. Quota behavior is tested with an isolated `ANALYSIS_RATE_LIMIT`/Upstash test, not by draining a preview.

### 9.5 Rollback

1. Identify the last known-good Vercel deployment before deploying.
2. If smoke or auth fails, promote/roll back to that deployment; do not delete data.
3. Keep environment values available but do not print them.
4. Re-run the smoke script against the restored origin.
5. Record the failed and restored SHA/URL.
6. If quota keys are contaminated, stop using the preview namespace and create a replacement isolated database; never delete production data as a rollback shortcut.

No rollback was executed; no deployment exists from B4.

---

## 10. Security verification

### Verified locally

| Boundary | Result |
|---|---|
| Foreign browser origin on `/api/analyze` | 403 `FORBIDDEN_ORIGIN` |
| Invalid same-origin URL | 400 `MALFORMED_URL` |
| API response cache | `cache-control: no-store` |
| Request correlation | `x-request-id` on success/error |
| Oversized streamed body | 413 and cancellation; route tests |
| Quota ordering | malformed URL/JSON/config reject before consume |
| Private repository | rejected before tree/blob retrieval; injected-client tests |
| Malformed metadata | fail closed |
| Quota rejection | rejected requests do not consume capacity |
| AI unconfigured | 503 `AI_UNAVAILABLE`, no invented answer |
| AI hosted/emergency gate | B4 status now matches route; four tests |
| HMAC binding | tamper, expiry, rotation and replay behavior tested |
| Secret scan | only a synthetic `ghp_…` fixture in `benchmarks/cases.ts` |

### Headers observed on the final local production build

```text
HTTP/1.1 200 OK
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
Cross-Origin-Opener-Policy: same-origin
Content-Security-Policy: frame-ancestors 'none'; base-uri 'self'; form-action 'self'
```

`Strict-Transport-Security` is **absent from application headers**. Vercel edge behavior is unverified. The CSP is not a complete XSS policy: it lacks `default-src`/`script-src` nonces.

### AI status correction

Before B4, `aiPublicStatus()` could say `available: true` whenever a key existed, even when `/api/ai` would return 503 because hosted opt-in was missing, `AI_DISABLED=1`, or production lacked `AI_ANALYSIS_SECRET`. B4 adds those gates to the public status and tests all four states. This is a product-honesty fix, not a change to provider behavior.

---

## 11. Accessibility status

Automated:

- 14 Playwright tests passed; 1 live GitHub test skipped;
- landing and completed demo report axe scans have no serious/critical violations;
- responsive checks pass at 390×844, 360×800, 768×1024 and 1440×900;
- keyboard reaches the repository input and submit button;
- mobile report has no horizontal overflow in the tested viewport.

Manual checks still required:

- screen-reader traversal of score, six sectors, meter labels, findings, coverage, partial warning and AI-disabled state;
- reduced-motion preference;
- browser 200% zoom at desktop and narrow mobile;
- focus behavior in overlays and full report navigation;
- real-device readability.

Axe is not a WCAG certification and was not treated as one.

---

## 12. Test results

| Command | Exit | Result |
|---|---:|---|
| `npm run typecheck` | 0 | clean |
| `npm run lint` | 0 | clean |
| `npm test` | 0 | **29 files / 169 tests passed** |
| `BENCHMARK_OUT_DIR=/tmp/b4-bench npm run benchmark` | 0 | **2 files / 2 tests passed** |
| `npm run build` | 0 | Next 15.5.29; `/` 225 kB first-load |
| `npx playwright test --reporter=list` | 0 | **14 passed / 1 skipped** |
| `npm audit --omit=dev` | 1 | 1 high + 1 moderate; Next 16.4.5 only fix |
| `git diff --check` | 0 | clean |

Scratch fixture from the local test run:

| Test area | Count |
|---|---:|
| New B4 AI status tests | 4 |
| Analyze route | 12 |
| Private metadata | 4 |
| Reliability | 3 |
| **Focused total** | **23** |

Benchmark output (isolated; did not overwrite historical accuracy records):

| Case | Inspected / eligible | Coverage | Requests | Analysis |
|---|---:|---:|---:|---:|
| small-30 | 35 / 35 | 100% | 35 | 61 ms |
| medium-150 | 72 / 155 | 46.5% | 72 | 16 ms |
| large-1200 | 96 / 1,205 | 8% | 96 | 64 ms |

The first production server start after Playwright correctly failed because the dev server had replaced `.next`. B4 rebuilt after Playwright and then verified `next start`; the final build and header probe are the recorded production evidence.

### Not run

- GitHub Actions on a real runner.
- `npm ci` from a clean checkout (local dependencies are installed; CI is where this will be proven).
- Live GitHub API scan.
- Live Upstash contention/TTL/timeout.
- Live AI provider call.
- Vercel preview deployment or production provenance check.
- Manual accessibility checks.

---

## 13. Proposed commit sequence

The exact path membership is the **Commit group** column of the 155-row manifest. Nothing is staged. The sequence preserves dependency direction and keeps the deletion separate.

| # | Commit title | Paths | Depends on | Required checks | Risk / review |
|---|---|---:|---|---|---|
| 1 | `chore(release): establish shared contracts and candidate configuration` | 15 | — | typecheck, lint, focused config tests | Medium: env/package/security headers; review |
| 2 | `feat(analysis): add deterministic engine, parsers and scoring` | 34 | 1 | full unit tests, build | Medium: scoring/report correctness |
| 3 | `feat(security): add GitHub admission and shared quota controls` | 10 | 1, 2 | full tests, route tests | High: live Redis unverified |
| 4 | `feat(ai): add validated explanation boundary and availability gates` | 14 | 1, 2 | AI/token/schema tests | High: provider unverified |
| 5 | `feat(api): harden analyze admission and error handling` | 2 | 1–4 | full tests, build | High: primary request boundary |
| 6 | `feat(ui): render accessible report and coverage states` | 19 | 2 | component tests, build, axe | Medium: visual/accessibility review |
| 7 | `test(e2e): add browser and accessibility journeys` | 2 | 5, 6 | Playwright | Medium: CI unverified |
| 8 | `ci: run full release gates and Playwright` | 5 | 1–7 | YAML parse, local equivalent | Medium: first remote run pending |
| 9 | `docs: record release evidence, limits and operations` | 53 | 1–8 | documentation consistency | Low |
| 10 | `chore: remove unused score-pill component` | 1 | 6 | build, no-reference check | Low: accepted deletion |

### Boundary notes

- Group 1 includes `package.json`/lock, environment contract, Next/Vitest config, shared types, version, formatting and the AI signing/config primitives. It is the foundation for the engine and routes.
- Group 2 includes the full analysis engine, fixtures and tests; it is the largest review surface.
- Group 3 includes the GitHub client, admission, quota store, request guards and observability.
- Group 4 includes the AI provider/schema/token consumers and the AI route; group 5 then wires the analyze route to all boundaries.
- Group 9 contains all historical and living documentation. It is documentation-only and must not be used to smuggle source changes.
- Group 10 must be last and reviewed separately, even though the deletion is accepted.

No commit hash was generated. Do not use `git add -A`; stage selected paths only after owner review.

---

## 14. Owner approval package

### A. Commit approval

**Proposed action:** Review `28-b4-release-candidate-manifest.md`, then authorize selective staging and the 10 commits in §13.

**Files:** The 155-row manifest. Nothing is staged. The only deletion is `score-pill.tsx`. The only B4 source change is `src/lib/ai/config.ts` plus its test; the README correction is documentation.

**Tests:** Typecheck, lint, 29 files / 169 tests, 2 benchmark tests, production build, 14 Playwright passes / 1 gated skip, `git diff --check`.

**Risks:** The existing tree combines B1–B4 work; group boundaries are dependency-ordered but not individually CI-executed. Commit review must preserve the manifest and avoid `git add -A`.

**Rollback:** No staging is performed now. If a commit is wrong, use a normal revert of that commit; do not reset or discard the working tree.

**Expected outcome:** Ten coherent commits; the exact candidate SHA becomes available for CI and preview.

### B. CI execution approval

**Proposed action:** After the approved commit, push the branch or open a pull request to trigger `.github/workflows/ci.yml`.

**Exact expected workflow:** `npm ci` → lint → typecheck → 169 tests → benchmark → build → Chromium install → Playwright → failure artifact upload only on failure.

**Do not set:** `RUN_LIVE_GITHUB_E2E` for the first run; keep the live GitHub case skipped. Do not add secrets to the workflow.

**Expected outcome:** A green `verify` job. Record its run URL, duration and any skipped test. A YAML parse is not a substitute.

**Rollback:** If CI fails, fix the specific failing gate on a new commit; do not “fix” by weakening tests or adding suppressions.

### C. Preview deployment approval

**Proposed action:** Deploy the exact green SHA to Vercel preview with the configuration matrix in §9.2.

**SHA:** Not available yet by design. It must be the commit produced by approval A, not `HEAD` `e287e079…` and not the uncommitted tree.

**Infrastructure:** Isolated Upstash database, public read-only GitHub token, `REQUIRE_SHARED_QUOTA=1`, `AI_DISABLED=1`, no memory quota, no anonymous GitHub, no AI key.

**Smoke:** Run §9.4 against the preview origin, then manually verify a private-repository rejection with an owner-known private repo if available; otherwise mark it unverified.

**Rollback:** Promote the previous known-good deployment; preserve data and secrets; re-run smoke.

**Expected outcome:** A public preview URL that is AI-disabled, shared-quota-enforced, and reports its exact SHA/config.

### D. PostCSS decision

**Advisory:** `postcss@8.4.31` nested in `next@15.5.29`; high and moderate advisories, affected `<=8.5.22`.

**Exposure:** Build-time CSS processing; the product has no user CSS endpoint. It is not dismissed as “build-only,” but it is not remotely reachable through the analysis API.

**Options:**

1. **Accept for closed preview** — document the risk, keep AI disabled and no untrusted CSS builds; schedule Next 16.
2. **Migrate to Next 16.4.5** — separate branch, regenerate lockfile, rerun all gates and preview.
3. **Force an override** — not recommended; untested framework internals.

**Recommendation:** option 1 for this preview, with option 2 as the next dependency milestone. If the owner intends an unrestricted public launch, do option 2 first.

---

## 15. Remaining blockers

1. No GitHub Actions run exists.
2. No candidate commit SHA exists until approval A.
3. No isolated Upstash live test or preview deployment exists.
4. No live GitHub, AI provider or Vercel provenance verification.
5. PostCSS high advisory remains.
6. HSTS is absent from application headers; edge behavior unknown.
7. CSP is intentionally partial.
8. Manual accessibility checks are outstanding.
9. No licence is declared.
10. The Vercel project linkage is known, but deployed commit/environment is not.

The release candidate is appropriate for a **closed, owner-authorized preview** after the specific approvals above. It is not proven production-ready.

---

## 16. Recommendation

Approve the manifest and commit sequence, run CI on the resulting SHA, then deploy that SHA to an isolated preview with AI disabled and shared quota forced. Run the smoke script and the Upstash contention test before inviting the first cohort.

Do not describe the current working tree as deployed, CI-verified or public-beta ready. The local gates are strong evidence; they are not remote proof.
