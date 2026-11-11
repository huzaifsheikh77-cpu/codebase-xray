# 22 — Public-Beta UX

## Added

- **Public-beta notice** above the app (`role`/`aria-label` aside): bounded prioritised sample, differing language depths, findings are indicators not an audit, verify independently. No marketing claims, no dead links, no invented contact address.
- **Error copy for new states**: quota unavailable, configuration missing, scan already in progress. Messages are actionable and do not expose internals.
- **Existing honesty preserved**: zero-findings empty state, partial-coverage warnings, critical-path disclaimer, AI-disabled explanation, demo-data label.

## States reviewed in code

validation error · loading · success · zero findings · partial coverage · unsupported language · budget exhaustion · GitHub rate limit (with reset) · shared-storage failure (503) · scan duplicate (429) · AI unavailable/disabled.

No indefinite spinner was introduced; every failure maps to a message.

## Responsive behaviour

Unchanged layout; the notice is a single wrapping line. **Not visually verified** this milestone — no browser automation was added, and no screenshot inspection was performed. The 360 px/1440 px flows remain an owner/QA check.

## Feedback mechanism

Not added: no real destination is configured, and the milestone forbids inventing one. A feedback link should be added once the owner supplies an address.

## Gaps

- No browser E2E for the new 503/429 states.
- The beta notice is not dismissible (intentional: it is a disclosure).
