# 03 — Evidence, Scoring and Report Intelligence

**Phase:** 3 of 5 · **Status:** COMPLETED (report sections partially mapped) · **Scoring:** `xray.score v3.0.0`

---

## A. Executive Summary

Findings are now a typed evidence record rather than prose, every sector score carries a confidence label and a written explanation, the methodology is versioned, and damping is applied uniformly so missing evidence cannot read as excellence. Coverage is computed from inspected-versus-eligible files and bytes and is disclosed in the report.

The requested 14-section report outline was **not** implemented as 14 new panels: the existing 10-section visual identity was preserved and the new material was mapped into it (see section H).

## B. Original Problems

- Findings were inconsistent: some had a file, some a line, none had a detection method or limitation.
- No confidence vocabulary existed; heuristic guesses and exact measurements looked identical.
- No coverage model: a 24-file sample and a complete scan produced the same wording.
- Scoring weights were spread across sectors with no version and no explanation of damping.
- Security and documentation escaped damping, so a one-file repository could score 100/100.
- Empty sectors could return a positive-looking score with no evidence.
- The report had no explicit "what we did not inspect" section.

## C. Work Completed

### Evidence model (`src/lib/types/analysis.ts`)

```ts
interface Issue {
  id: string;                 // ISS-001 … stable within a scan
  category: IssueCategory;    // security | quality | testing | documentation
                              // | architecture | dependencies | reliability
  title: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  confidence: Confidence;     // verified | high | heuristic | incomplete
  detectionMethod: string;    // "typescript AST" | "manifest parse" | "pattern" …
  file?: string;
  line?: number;
  detail: string;
  evidence: string[];         // minimal, redacted excerpts/metadata
  limitation?: string;
  recommendation: string;
  affectedFiles?: string[];
}
```

No full source file is ever placed in `evidence`; credential values are removed before the finding is built.

### Confidence and coverage

- `Confidence` is a four-value vocabulary used by findings and sectors.
- `AnalysisCoverage` reports `eligibleFiles`, `inspectedFiles`, `inspectedPct`, `eligibleBytes`, `inspectedBytes`, `parsedFiles`, `parseFailures`, `unresolvedImports`, `truncated`, `astLanguages`.
- Coverage compares like with like: only files that survived pruning are "eligible", so a repository with many vendored files is not penalised for ignoring them. Total tree files remain available as `structure.stats.totalFiles`.
- When `inspectedPct < 100` the analysis is marked `partial` and the warnings quantify the gap.

### Scoring (`src/lib/analysis/scoring/`)

`SCORING_VERSION = "xray.score v3.0.0"`, emitted as `analysis.scoringVersion`.

| Sector | Weight | Signals |
|---|---|---|
| Code quality | 0.20 | oversized ratio 35, largest-file share 20, measured function pressure 15, TODO density 15, nesting 15 |
| Security | 0.20 | penalties: env file 25 (cap 50), secret 20 (cap 60), key-like filename 10 (cap 20), risk finding 6 (cap 30); bonuses: SECURITY.md 5, lockfile 5, env example 5 |
| Testing | 0.15 | test:source ratio 80 (full marks at 1:2), framework 10, config 10 |
| Architecture | 0.15 | organisation 30, oversized pressure 25, nesting 15, god dirs 10, unresolved boundaries 20 |
| Documentation | 0.15 | README 35 (stub 15), CONTRIBUTING 15, license 20, docs dir 10, API docs 5, env example 5, SECURITY 5, rich markdown 5 |
| Maintainability | 0.15 | dependency load 30 (ceiling 40), CI 25, file spread 25, lockfile 10, pinning 10 |

Damping: `evidence = min(1, 0.5·sources/10 + 0.5·LOC/1000)`, then `score' = 50 + (score − 50)·(0.4 + 0.6·evidence)`. Applied to **all six** sectors. A sector with no evidence returns exactly 50 with an explanation that says "neutral score, not a positive result".

Testing never invents coverage: only the test/source file ratio is used, and the report says a test file's existence does not prove coverage.

## D. Files Created

| Path | Purpose |
|---|---|
| `src/components/system/coverage-section.tsx` | `/08` coverage, budget, parse and limitation panel |
| `src/lib/analysis/scoring/weights.ts` (rewritten) | Versioned, documented weights |
| `src/lib/analysis/scoring/sectors.ts` (rewritten) | Uniform damping, confidence, neutral states |
| `src/lib/analysis/issues/detectors.ts` (rewritten) | Evidence-complete findings, new detectors |

## E. Files Modified

- `src/lib/types/analysis.ts` — optional evidence/confidence/coverage/budget fields (kept optional so fixtures and the demo remain valid).
- `src/lib/analysis/insights.ts` — confidence mapping, prioritisation by severity × confidence.
- `src/lib/analysis/pipeline.ts` — emits coverage, budget, scoringVersion and AI status.
- `src/components/presentation-layer.tsx` — `/08` and `/09` sections.

## F. Architecture Changes

Scoring inputs are a single `DetectionInput` object; sectors are pure functions of it, so a score can be recomputed from stored signals without re-fetching a repository. Findings and sectors share one confidence vocabulary, and the report renders both.

## G. Features Implemented

- Evidence-backed findings with category, confidence, method, limitation and recommendation.
- Versioned scoring with a single weights module.
- Uniform damping and confidence on all six sectors.
- Neutral (50) scores for empty sectors, explicitly labelled.
- Coverage panel showing inspected/eligible, bytes, parsed files, parse failures, unresolved imports, truncation, AST languages and the applied budget.
- Filtering by severity and category, with an empty state when filters exclude everything.

## H. Features Partially Implemented

- **Report outline.** The brief requested 14 sections (00–14). The delivered report has 10 (`/00`–`/09`): manifest, score, structure, architecture/graph, issues, insights, system status, coverage, assistant. *Performance indicators* and *technical debt* are currently expressed through quality findings, insights and coverage rather than dedicated panels. This is a deliberate preservation of the existing visual structure, not an oversight — but it does not meet the letter of the 14-section request.
- **Line ranges** are recorded as a single `line`, not a range.
- **Evidence excerpts** are short strings, not expandable source previews; no source text is retained in the response.
- **Scoring calibration** has no labelled corpus, so weights remain expert-set rather than empirically fitted.

## I. Bugs Fixed

- Security and documentation bypassed damping → both now damp.
- Empty sectors returned arbitrary positive values → explicit neutral state.
- Findings lacked file/line or method → typed evidence fields, detectors populated.
- `scoringVersion` was absent → emitted and bumped with the methodology.
- Zero-issue rendering (Phase 1) is now also filter-safe: an empty filtered list renders an empty state rather than crashing.

## J. Testing Results

```
npm test          → 87 tests / 13 files passed
npm run typecheck → 0 errors
npm run lint      → 0 errors
```

Scoring tests (`sectors.test.ts`, 5 tests) still pass with uniform damping; new tests cover budgets, graph resolution, parser capability, quality metrics and AI validation. No test asserts a *specific* score for a live repository, because that would encode an unvalidated calibration.

## K. Accuracy and Benchmark Results

Observed sector outcomes are only reported through the live probes (see Report 02). No accuracy percentage is claimed: there is no ground-truth set of "correct" scores, and inventing one would violate the brief. The confidence labels are qualitative by design.

## L. Security Implications

- Evidence is minimal and redacted; secret values never enter findings, the API response, or AI context.
- `limitation` fields prevent over-reading a heuristic finding.
- Scores cannot be inflated by missing evidence, which removes an incentive to under-scan.

## M. Performance Implications

- Scoring is arithmetic over already-computed signals; no additional I/O.
- The coverage panel adds no requests; all values ship in the existing payload.

## N. Dependencies

None added. Evidence and scoring use existing types and utilities.

## O. Remaining Issues

- 14-section report outline not fully realised (performance/technical-debt panels absent).
- Score calibration unvalidated against expert ratings.
- No historical comparison; scores are single-scan snapshots.
- `affectedFiles` is populated only by detectors that can identify multiple files reliably.

## P. Next Phase

Build the optional AI layer strictly on top of this evidence model, with citation validation and a fail-closed disabled state (Phase 4).
