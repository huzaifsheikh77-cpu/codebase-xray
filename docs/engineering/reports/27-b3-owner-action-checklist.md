# 27 — B3 Owner Action Checklist

**Date:** 2026-11-07
**Purpose:** the specific decisions and external checks that remain before a controlled private beta. No item below was performed by the autonomous B3 run unless explicitly marked complete.

## A. Review the candidate

- [ ] Read `27-b3-autonomous-execution-report.md`, `27-b3-security-verification.md`, `27-b3-performance-results.md` and the operations runbook.
- [ ] Review the 43-file tracked diff and the new tests/reports; confirm nothing unrelated was changed.
- [ ] Confirm the pre-existing work in the working tree is still present. Nothing was staged, committed or discarded.
- [ ] Confirm the only deletion is `src/components/ui/score-pill.tsx` and accept the documented deletion rationale.
- [ ] Confirm the dated correction in `25-public-beta-cost-and-operations-report.md` is sufficient; the historical 40/min claim was not rewritten.
- [ ] Decide whether to include the B3 reports and test harness in the release-candidate commit.

## B. Local gates (repeat on the reviewed tree)

```bash
npm run typecheck
npm run lint
npm test
BENCHMARK_OUT_DIR=/tmp/bench-review npm run benchmark
npm run build
npx playwright install --with-deps chromium
npx playwright test --reporter=list
npm audit --omit=dev
```

Expected:

- typecheck, lint, build exit 0;
- **28 files / 165 tests** pass;
- benchmark **2 tests** pass without overwriting historical artifacts;
- Playwright **14 passed / 1 skipped**; the skip is the gated live GitHub scan;
- audit exits **1** with 1 high + 1 moderate PostCSS/Next findings.

Do not “fix” the audit with `npm audit fix --force`.

## C. CI on a real runner

- [ ] Review `.github/workflows/ci.yml`.
- [ ] Commit/push only when you intend to trigger CI (B3 did not do this).
- [ ] Confirm the workflow installs Chromium with `--with-deps`.
- [ ] Confirm the gated live GitHub scan remains skipped without `RUN_LIVE_GITHUB_E2E=1`.
- [ ] Confirm failure artifacts appear only on failure and contain no secrets.
- [ ] Record the first green Actions run and its duration.

A locally parsed YAML file is not a green CI run.

## D. Preview deployment

- [ ] Authorize a preview deployment of the reviewed commit.
- [ ] Set `GITHUB_TOKEN` (public read-only, fine-grained).
- [ ] Set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` (or KV equivalents) for an isolated preview database.
- [ ] Confirm the deployment uses the intended database, not production quota keys.
- [ ] Do **not** set `ALLOW_MEMORY_QUOTA=1` on a multi-instance public preview.
- [ ] Record the exact commit SHA and deployment URL.
- [ ] Run the smoke test in `27-b3-private-beta-operations-runbook.md` section 10.
- [ ] Confirm headers, `cache-control: no-store`, `x-request-id`, same-origin 403 and one bounded public scan.

## E. External service verification

### Upstash

- [ ] Use an isolated test database, not production.
- [ ] Verify atomic check-and-increment with two concurrent requests.
- [ ] Verify a rejected request consumes no capacity.
- [ ] Verify TTL/expiry and recovery.
- [ ] Verify timeout/error handling fails closed (`QUOTA_UNAVAILABLE`).
- [ ] Clean up only keys created by the test, in the confirmed namespace.

### GitHub

- [ ] Confirm the token is public read-only.
- [ ] Perform at most one or two bounded checks against a small public repository.
- [ ] Confirm rate-limit headers parse and admission refuses an oversized scan before tree/blob retrieval.
- [ ] Do not scan a large repository or access a private repository.

### AI

- [ ] Decide whether beta AI is enabled.
- [ ] If yes: set `AI_API_KEY`, `AI_ANALYSIS_SECRET` and `AI_PUBLIC_ENABLED=1`; set a provider-side spend cap.
- [ ] If no: leave AI disabled; verify the panel reports unavailable rather than inventing an answer.
- [ ] Test one provider success, one timeout/error and the `AI_DISABLED=1` emergency path.
- [ ] Record that the analysis token is replayable until expiry, not single-use.

## F. Security decisions

- [ ] Decide whether to accept the PostCSS high advisory for a closed preview or schedule the Next 16.4.5 migration first.
- [ ] If accepting: document the exposure (build-time CSS processing, no user CSS endpoint) and the review date.
- [ ] If migrating: follow the plan in `27-b3-security-verification.md`; do not combine it with beta features.
- [ ] Check whether the hosting edge sends `Strict-Transport-Security`; if not, decide on an HSTS policy.
- [ ] Confirm the narrow CSP is acceptable or fund a nonce-based CSP project.
- [ ] Rotate any token that was ever pasted into chat, logs or a transcript.

## G. Accessibility and product review

- [ ] Manual keyboard pass: tab through input, submit, cancel, report sections and AI controls.
- [ ] Confirm visible focus and logical tab order.
- [ ] Screen-reader pass on the demo report: score, six sectors, findings, coverage and partial warning.
- [ ] Reduced-motion pass.
- [ ] 200% zoom at desktop and a narrow phone width; check no horizontal overflow.
- [ ] Confirm the report distinguishes heuristics from verified vulnerabilities, import graph from call graph, test-file presence from coverage, and absence of findings from proof of security.
- [ ] Do not claim a complete accessibility audit from the axe result alone.

## H. Release administration

- [ ] Choose a licence; none is currently declared.
- [ ] Confirm the public-beta feedback/contact channel.
- [ ] Confirm the Vercel/Upstash plan and spending limits.
- [ ] Confirm no secret is present in client bundles or uploaded artifacts.
- [ ] Confirm the release commit contains no `.env.local`, `.cloud-attachments/`, `test-results/`, `playwright-report/`, `.next/` or local transcript.
- [ ] Tag or record the exact reviewed SHA after approval.
- [ ] Keep a rollback deployment identified.

## I. Go / no-go

Invite the first 10–25 developers only when:

- [ ] the reviewed tree has a green local gate run;
- [ ] CI has run green on the host;
- [ ] the preview/production smoke test passes on the exact deployed SHA;
- [ ] Upstash contention and fail-closed behavior have been observed;
- [ ] AI is either explicitly disabled or explicitly enabled with a spend cap and secret;
- [ ] the PostCSS residual risk is accepted in writing or resolved;
- [ ] manual accessibility checks are complete;
- [ ] a rollback target exists.

Otherwise, keep the deployment private and continue with a **B** status.
