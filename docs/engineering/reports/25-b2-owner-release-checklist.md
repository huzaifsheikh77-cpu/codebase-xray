# B2 Owner Release Checklist

**Verdict: B — ready after external verification.** Do not invite beta users from the local test result alone. No commit, push or deployment was performed.

## Approve before release

- [ ] Review the B2 report and authorize a commit of the reviewed working tree.
- [ ] Record the exact commit SHA that will be deployed.
- [ ] Decide whether to accept the unresolved `postcss` high advisory temporarily or schedule the Next.js 16 migration.
- [ ] Choose the project licence (still undecided).
- [ ] Confirm the beta remains limited to **10–25 developers** and **public repositories only**.

## Configure the deployment

- [ ] Set `GITHUB_TOKEN` with public read-only access; do not use a broad private-repo token.
- [ ] Set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` (or Vercel KV equivalents).
- [ ] Keep AI disabled for the first beta unless spend is explicitly approved: leave `AI_PUBLIC_ENABLED` unset and `AI_DISABLED=1` if needed.
- [ ] If AI is enabled: set `AI_ANALYSIS_SECRET`, `AI_PUBLIC_ENABLED=1`, a provider key and a spend cap. AI is opt-in on preview too.
- [ ] Do not enable `ALLOW_ANONYMOUS_GITHUB` for a public beta.
- [ ] Confirm no secret is present in a `NEXT_PUBLIC_*` variable or client bundle.

## Verify the deployed build

- [ ] Open the preview URL and confirm the page is the deployment for the recorded SHA.
- [ ] Check security headers, especially CSP, `X-Frame-Options`, `nosniff` and COOP.
- [ ] Run a real public scan and confirm the report says `LIVE ANALYSIS — GITHUB` and shows the correct repository.
- [ ] Confirm malformed input, body cap, foreign Origin and unknown repository return controlled errors.
- [ ] Confirm private repository attempts are rejected without tree/blob retrieval.
- [ ] Trigger the per-client/global quota and confirm `429` behavior.
- [ ] Confirm duplicate-scan rejection and hourly budget behavior.
- [ ] Confirm AI-disabled state, or complete a full live AI sign-in/answer/timeout check if enabled.
- [ ] Confirm logs contain request IDs but no source code, tokens, keys or repository descriptions.

## Remaining verification gaps

- [ ] Live Upstash multi-instance contention and timeout behavior.
- [ ] Real private-repository rejection with a controlled fixture.
- [ ] Manual screen-reader, reduced-motion and 200% zoom pass.
- [ ] Playwright in CI (install Chromium and run `npm run test:e2e`).
- [ ] Large-repository and load tests on staging, within quota limits.
- [ ] Next.js 16 dependency migration assessment.

## Stop conditions

Stop the beta rollout if any of these occur:

- Private repository contents are fetched or exposed.
- AI is reachable without the intended opt-in or secret.
- Quota counters fail open in production.
- The deployed SHA cannot be identified.
- A scan produces a misleading “complete” or security-audit claim.
- A secret appears in client output or logs.

## Single next action

Authorize the reviewed commit, deploy that exact SHA to a preview with the required shared store and GitHub token, then execute the deployed smoke checklist above.
