# 14 — Report and Scoring Completeness

**Status:** PARTIALLY COMPLETED — all 14 dimensions are accounted for, but they are rendered in 10 panels, not 14

---

## Dimension coverage

| # | Dimension | State | Where it lives | Evidence quality |
|---|---|---|---|---|
| 01 | Repository overview | implemented | `/00` manifest | verified metadata |
| 02 | Architecture | implemented | `/03` structure, `/04` graph | inferred, confidence-labelled |
| 03 | Dependency graph | partial | `/04` | workspace + resolved imports; unresolved counted |
| 04 | Code quality | implemented | `/05` findings, `/02` sector | measured spans + heuristics |
| 05 | Maintainability | partial | `/02` sector, `/06` insights | weighted signals |
| 06 | Security | implemented | `/05` findings, `/02` sector | pattern-level, never “confirmed” |
| 07 | Testing | partial | `/02` sector | test/source ratio; **no coverage %** |
| 08 | Documentation | implemented | `/02` sector, `/05` | existence + size |
| 09 | Performance indicators | **missing** | — | no reliable static measurement |
| 10 | Technical debt | partial | insights + quality findings | no dedicated panel or score |
| 11 | Dependency health | partial | `/03` counts, findings | manifest-level only |
| 12 | Engineering risks | implemented | `/05` + insights | severity × confidence |
| 13 | Coverage and limitations | implemented | `/08` | measured counts + declared limits |
| 14 | Recommendations and priorities | partial | `/05`, `/06`, AI task | rule-based text; no ranked plan without AI |

No empty panel was added to reach 14: performance and technical-debt have no deterministic measurement yet, and a placeholder would violate the brief.

## Scoring model (v3)

- Six sectors, weights 0.20/0.20/0.15/0.15/0.15/0.15.
- Uniform small-repository damping toward 50, applied to all six sectors.
- Empty evidence returns exactly 50 with “neutral score, not a positive result”.
- Every sector carries a confidence label and a written explanation.
- `analysis.scoringVersion` identifies the methodology; scores are comparable only within a version.

### Can the score be manipulated by excluded files?

Yes, in a limited sense: pruning removes vendored/binary/oversized files before scoring, and sampling can remove ordinary source. Damping reduces (but does not eliminate) the effect of a tiny sample; `partial` and coverage are shown next to the score. A repository can look better by moving code into ignored directories — this is a known limitation of any path-based heuristic.

### What the score is not

It is not an absolute measure of quality, not a security verdict, and not comparable across scoring versions. The UI states this in `/08`.

## Recommendation prioritisation

Findings are sorted by severity; each carries category, confidence, detection method, limitation and a file/line reference. Insights inherit confidence. There is no quantitative impact/effort model, so the product does **not** claim a precise priority ordering. AI recommendations, when enabled, are instructed to order by risk and effort but are unverified (Report 10).

## Gaps accepted for this milestone

- No performance or technical-debt panel.
- No dependency-health score.
- No historical trend (single-scan snapshot only).
- No machine-verifiable prioritisation framework.
