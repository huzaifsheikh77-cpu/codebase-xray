# Known Limitations Register

*Updated for the B3 autonomous-engineering batch, 2026-11-07.*

## Analysis

| ID | Limitation | Impact | Status |
|---|---|---|---|
| L1 | Large repositories are sampled (48–128 files), prioritised not representative | file-level findings describe the sample | disclosed (`/08`, warnings) |
| L2 | LOC outside the sample is estimated from tree bytes | language/LOC shares approximate | disclosed in stats |
| L3 | Dependencies read from manifests only; no lockfile graph or transitive resolution | unused/duplicate dependency claims impossible | documented |
| L4 | Python is structural, not AST; several languages are import-only | no reliable Go/Java structure | matrix + labels |
| L5 | Complexity is decision-point count; duplication is 6-line similarity | proxies, not semantic truth | `limitation` field |
| L6 | Graph capped; unresolved imports counted | large monorepos partially represented | `omittedModules` |
| L7 | Test/source ratio is not coverage | no coverage % reported | enforced |
| L8 | No performance or technical-debt panel | dimensions absent | Report 14 |
| L9 | Critical classification is path-based | behaviour cannot be inferred from paths | UI disclaimer |
| L10 | No CVE/advisory feed | no vulnerability confirmation | documented |
| L11 | Security score starts at 82 and subtracts findings | absence of findings is not a security audit | explicit in sector explanation |
| L12 | Flat but well-structured repositories can still score below conventional `src/` layouts | architecture score is a layout heuristic | damped, not authoritative |

## AI

| ID | Limitation | Impact |
|---|---|---|
| A1 | No source-code access | cannot explain function internals; must say so |
| A2 | Live provider unverified | success/timeout/5xx behaviour unknown |
| A3 | Brief truncated (12 issues, 400 paths) | very large analyses answered from a subset |
| A4 | No conversation history/streaming | single-shot Q&A |
| A5 | Prompt injection mitigated, not proven | adversarial model behaviour still needs a live evaluation |
| A6 | Recommendations not mechanically checked | generic advice possible |
| A7 | Hosted Vercel AI is opt-in | without `AI_PUBLIC_ENABLED=1` and `AI_ANALYSIS_SECRET`, live AI returns 503/403 by design on both production and preview |
| A8 | Analysis token is an expiring integrity binding, not a single-use nonce | the same token and payload can be replayed until expiry; add a nonce/consumption store if single-use is required |

## Operations

| ID | Limitation | Impact |
|---|---|---|
| O1 | Shared limiter implemented and unit-tested but not verified against live Redis | multi-instance enforcement unproven in practice |
| O2 | GitHub 60/h unauthenticated | medium scans impossible without a token |
| O3 | No shared result cache by commit SHA | repeat scans repeat API work |
| O4 | No persistence/history | no trends, sharing or export |
| O5 | `postcss` high advisory via Next | unresolved upstream; `npm audit` offers only Next 16.4.5, a semver-major upgrade |
| O6 | No licence | no legal reuse grant |
| O7 | CI not executed on GitHub | workflow includes Playwright, but a clean GitHub runner has not run it |
| O8 | No manual screen-reader, reduced-motion, 200% zoom, real-device or load/memory tests | automated axe/browser coverage does not verify assistive technology or scale behaviour |
| O9 | Duplicate scans are rejected, not joined | second user must retry |
| O10 | GitHub admission is an estimate, not a reservation | a scan can still exhaust quota mid-flight under unusual concurrency |
| O11 | Live Vercel URL observed 200, but deployment commit/environment unverified | production headers/quota/latency and the deployed build remain unproven |
| O13 | Application does not send `Strict-Transport-Security` | edge behavior is unverified; HSTS policy is an owner decision |
| O14 | CSP covers framing/base/form-action only | no nonce-based `script-src`; not a complete XSS policy |

### Resolved

| ID | Former limitation | Resolution |
|---|---|---|
| O12 | Browser E2E was not wired into CI | B3 adds Chromium installation and the Playwright suite to `.github/workflows/ci.yml`; the first remote run is still pending |

## Accuracy

| ID | Limitation | Impact |
|---|---|---|
| C1 | Benchmark is conformance-based (7 fixtures) | not an independent oracle |
| C2 | No pinned public-repository corpus | no real-repo precision/recall |
| C3 | No labelled ground truth for security patterns on real code | false-positive rate unknown |
