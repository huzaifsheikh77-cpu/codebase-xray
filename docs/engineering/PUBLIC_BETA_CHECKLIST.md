# Public Beta Release Checklist

**Verdict: B4 LOCAL/BROWSER RELEASE CANDIDATE READY — OWNER APPROVALS, CI RUNNER, EXTERNAL SERVICES AND PREVIEW UNVERIFIED.** No commit or deployment was performed in this batch.

B4 rechecked the full working tree, produced the 154-path release manifest, corrected stale README flow/shared-store claims, and made the public AI status match the actual hosted, emergency and production-secret gates. Local evidence is in `reports/28-b4-controlled-release-report.md`; the release decision remains **B — ready after specific owner approvals**.

A public Vercel URL returned HTTP 200 during the 2026-11-06 audit, but its commit, environment variables and quota implementation are not verified. Do not treat the live URL as beta-ready until the post-deploy smoke test is run against it.

## Closed in B1

- [x] Private repositories rejected before tree/blob retrieval.
- [x] Public-only GitHub token policy documented; runtime guard does not rely on token scope.
- [x] Atomic quota check-and-increment; rejected requests consume no capacity.
- [x] Conservative GitHub request-cost admission control + 25-request safety reserve.
- [x] Hourly scan budget (default 24) aligned with the 5,000/hour token model.
- [x] Streaming request-body cap in both API routes.
- [x] Full nested AI payload validation; malformed payloads return 400.
- [x] Signed analysis-to-AI binding token with 15-minute expiry.
- [x] AI production opt-in (`AI_PUBLIC_ENABLED=1`), global daily ceiling and spend controls.
- [x] Client timeout, cancel action and stale-response protection.
- [x] One authoritative engine version; stale `v2.7.3` labels removed.
- [x] Test-file detection covers root `test.js`, `.test-d.ts`, `tests.py`, `spec/`.
- [x] Large-file/no-test severity reduced from high to medium.
- [x] Structured request logs with request IDs and failure categories.
- [x] 27 test files / 159 tests, typecheck, lint and build green locally.
- [x] Playwright browser journeys, responsive checks, keyboard check and landing axe scan green.
- [x] Gated live GitHub scan against `octocat/Hello-World` green.
- [x] Same-origin Host-header regression fixed; oversized bodies and duplicate scans cannot consume quota.
- [x] Token replay limitation documented and tested; preview AI opt-in corrected.

## Closed in B3

- [x] `score-pill.tsx` deletion accepted after history/no-reference/build review; not restored.
- [x] Stale 40/min global-limit claim retained historically with a dated 8/min correction.
- [x] Playwright and Chromium installation added to the existing CI workflow; failure artifacts retained.
- [x] Quota is not consumed for malformed URL, malformed JSON or missing production config.
- [x] Accessibility: six unnamed progressbars and low-contrast band/severity labels fixed; full demo-report axe scan passes.
- [x] Reliability: HTTP 500/404 blob failures and malformed source produce controlled partial results.
- [x] Performance harness added without overwriting accuracy artifacts.
- [x] Full suite: 28 files / 165 tests; browser: 14 passed / 1 gated skip.

## Closed in B4

- [x] Full 154-path inventory generated from `git status`, with no HOLD rows.
- [x] README request flow corrected to show URL/config validation before quota.
- [x] README no longer claims there is no database; the shared Redis counter store is documented.
- [x] AI public status mirrors `AI_DISABLED`, hosted `AI_PUBLIC_ENABLED` and production `AI_ANALYSIS_SECRET` gates.
- [x] Four AI-status regressions added; full suite is 29 files / 169 tests.
- [x] Benchmark 2 tests, production build and 14 Playwright passes / 1 gated skip re-run.
- [x] Final production build passed after Playwright; loopback headers, 400, 403 and AI-disabled 503 observed.
- [x] Commit sequence, preview variable matrix, smoke script, rollback and approval gates documented.

## Still required before announcing

- [ ] Verify the deployed commit and environment variables.
- [ ] Run the deployed smoke test: headers, real scan, private rejection, 429, admission refusal, body cap, AI state.
- [ ] Run the Playwright CI workflow on a clean GitHub runner and record a green run.
- [ ] Verify a real Upstash instance under multi-instance contention.
- [ ] Manual screen-reader, reduced-motion and 200% zoom pass.
- [ ] Resolve or formally accept the `postcss` high advisory via Next 16.4.5.
- [ ] Choose a licence (owner decision).
- [ ] Confirm AI provider spend cap and `AI_ANALYSIS_SECRET` are set if AI is enabled.
- [ ] Confirm no secret in client bundles.

## Verified locally

- [x] typecheck, lint, 165 tests, production build.
- [x] Playwright 14 passed / 1 gated skip after the accessibility fixes.
- [x] Private repository rejection occurs before tree/blob calls (injected-client test).
- [x] Rejected per-client requests do not consume global quota.
- [x] Oversized chunked body is cancelled before full buffering.
- [x] AI nested schema, signed binding and tamper rejection.
- [x] `p-map`-style test filenames classify as tests.
- [x] Security headers / no-store / same-origin behavior (local, including Host normalization).
- [x] AI disabled state remains safe and honest.
- [x] Live public scan, demo report, cancellation, upstream error and mobile report.

## Owner decisions

Licence, Vercel/Upstash plan, whether to enable AI, provider spend cap, feedback contact address.
