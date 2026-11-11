# CODEBASE XRAY — MASTER STATUS

**B4 controlled release candidate prepared — local/browser gates green; owner approvals and external checks pending** · 2026-11-07
Engine `xray.engine v3.0.0` · Scoring `xray.score v3.0.0` · Next 15.5.29 · Node ≥20.9

## Release verdict

**B — READY AFTER SPECIFIC OWNER APPROVALS.** B4 revalidated a 154-path candidate, resolved the remaining documentation/status drift, and re-ran the full local release gates. The remaining blockers are an owner-approved commit SHA, a first green CI run, live Upstash/AI/deployment verification, the PostCSS/Next 16 decision, HSTS edge behavior and manual accessibility checks.

A public Vercel URL was observed returning 200 during an earlier audit. Its deployed commit, environment variables and quota implementation are unknown. No deployment or production configuration change was performed.

## B4 summary

| Workstream | Status | Evidence |
|---|---|---|
| Release manifest | COMPLETE | 154 paths; 42M + 1D + 111U; no HOLD; report 28 |
| B4 product corrections | VERIFIED LOCALLY | README flow/shared-store claims; AI public status gates |
| Local gates | GREEN | typecheck 0, lint 0, 169 tests, 2 benchmarks, build 0 |
| Browser | GREEN | 14 passed / 1 gated skip; axe no serious/critical |
| Security probe | GREEN LOCALLY | headers, 400, 403, no-store, request IDs, AI 503 |
| Dependency audit | UNRESOLVED | 1 high + 1 moderate; only Next 16.4.5 offered |
| CI / preview | PENDING APPROVAL | no commit, push or deployment |

**B4 final local gates:** typecheck 0 · lint 0 · 169 tests (29 files) · benchmark 2 tests · build 0 · Playwright 14 passed / 1 gated skip · audit 1 (2 vulnerabilities).

## B3 summary

| Workstream | Status | Evidence |
|---|---|---|
| HOLD resolution | COMPLETE | score-pill deletion accepted; dated 8/min correction in report 25 |
| Playwright CI | IMPLEMENTED, NOT REMOTE-RUN | Chromium install, E2E, failure artifacts in `.github/workflows/ci.yml` |
| Quota ordering | VERIFIED LOCALLY | invalid URL/JSON/config reject before consume; 12 route tests |
| Reliability | VERIFIED LOCALLY | 500/404 blob and malformed-source partial-result tests |
| Accessibility | AUTOMATED PASS | 6 progressbar names + contrast fixed; 14 passed / 1 skip |
| Performance | MEASURED | small 35/35, medium 72/155, large 96/1205; report 27 |
| Dependency audit | UNRESOLVED | 1 high + 1 moderate; only Next 16.4.5 offered |

**B3 final local gates:** typecheck 0 · lint 0 · 165 tests (28 files) · benchmark 2 tests · build 0 · Playwright 14 passed / 1 gated skip · audit 1 (2 vulnerabilities).

## B2 verification summary

| Workstream | Status | Evidence |
|---|---|---|
| Private repository rejection | VERIFIED LOCALLY | pipeline rejects before tree/blob; route metadata guard; injected-client tests |
| Token policy | DOCUMENTED + RUNTIME GUARD | public-only fine-grained token contract; `repoData.private` check |
| Atomic quota | VERIFIED LOCALLY (MOCKED SHARED STORE) | check-and-increment `consume`; rejected requests consume nothing; live Redis unverified |
| GitHub admission | VERIFIED LOCALLY | size-based estimate + 25-request reserve + hourly scan budget; no distributed reservation |
| Streaming body limits | VERIFIED LOCALLY | oversized chunked stream cancelled; both routes use it |
| AI validation | VERIFIED LOCALLY | full nested schema; controlled 400s; context build guarded |
| AI integrity | VERIFIED EXCEPT REPLAY | HMAC binding, 15-minute expiry, tamper/rotation tests; same payload is replayable until expiry |
| AI spend controls | IMPLEMENTED + PREVIEW GATE | per-client quota, daily ceiling, production **and preview** opt-in, output cap |
| Accuracy | VERIFIED LOCALLY | declared fixtures; benchmark FP 0 / FN 0; not a real-repo oracle |
| Client reliability | VERIFIED IN BROWSER | 65 s abort, cancel action, stale-response guard |
| Version consistency | VERIFIED | one `src/lib/version.ts`; UI imports it |
| Observability | IMPLEMENTED | JSON request logs, request IDs, failure categories; no automated log-secret scan |
| Browser E2E | VERIFIED LOCALLY | 14 Playwright tests: 13 pass, 1 gated skip; live scan separately passes |
| Accessibility | PARTIAL | keyboard + axe landing pass; manual screen-reader/reduced-motion audit outstanding |

## Final local gate

```text
typecheck 0 · lint 0 · tests 27 files / 158 passed
build 0 (Next 15.5.29) · Playwright 13 passed / 1 skipped · live scan 1 passed
audit 2 (1 high postcss via next, 1 moderate)
```

## Verified behaviours

- Private metadata causes `PRIVATE_REPOSITORY_NOT_SUPPORTED` before `getTree`/`getBlobText`.
- Missing/malformed metadata fails closed before retrieval.
- A blocked per-client request does not increment the global counter; oversized bodies are rejected before quota consumption.
- Duplicate scans acquire the repository lock before consuming the hourly scan budget.
- GitHub admission refuses a scan that would consume the safety reserve.
- Malformed nested AI payloads are rejected at the route boundary.
- A modified analysis fails the signed-binding verification; expired/rotated tokens fail. The token is not single-use.
- Oversized chunked bodies are cancelled while streaming.
- Same-origin comparison uses the Host authority, avoiding false 403s after URL normalization/proxying.
- The live `octocat/Hello-World` scan, demo report, cancellation, upstream error and mobile report render correctly.
- Demo and live labels are distinct and honest; AI-disabled state is explicit.

## Open blockers

1. No owner-approved candidate commit SHA exists yet.
2. CI workflow has not run on a GitHub runner.
3. Live deployment commit/environment unverified.
4. Real Upstash contention/timeout behavior unverified.
5. `postcss` high advisory via Next; only offered fix is Next 16.4.5 (semver-major).
6. No licence (owner decision).
7. AI live provider call and live prompt-injection behavior unverified; production AI requires `AI_PUBLIC_ENABLED=1` and `AI_ANALYSIS_SECRET`.
8. Manual screen-reader, reduced-motion and 200% zoom checks outstanding.
9. HSTS is absent from application headers; edge behavior unverified.

## Next

Review `docs/engineering/reports/28-b4-release-candidate-manifest.md` and `28-b4-controlled-release-report.md`, approve the selective commit sequence, run CI on the resulting SHA, then deploy that SHA to an isolated preview with `REQUIRE_SHARED_QUOTA=1` and `AI_DISABLED=1`. Run the report 28 smoke script and `docs/engineering/reports/27-b3-private-beta-operations-runbook.md` against that origin. Do not invite beta users from local test results alone.

See `docs/engineering/reports/25-b2-independent-verification-report.md` and `docs/engineering/reports/25-b2-owner-release-checklist.md`.
