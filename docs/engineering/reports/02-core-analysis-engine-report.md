# 02 — Core Analysis Engine Report

**Phase:** 2 of 5 · **Status:** COMPLETED (with documented limits) · **Engine:** `xray.engine v3.0.0`

---

## A. Executive Summary

The engine no longer samples a fixed 24 files with regexes. It now plans an adaptive budget, prioritises the tree against that budget, parses TypeScript/JavaScript with the real compiler API, parses Python structurally, and scans other languages for imports only — each parser declaring its own capability. Structure, quality, security and architecture modules were added, and the graph was rebuilt around actual parsed imports with explicit unresolved accounting.

The report states inspected/eligible files and bytes, parse failures, unresolved imports, truncation and the budget applied. Partial analysis is never labelled complete.

## B. Original Problems

- Hard cap of **24 fetched files**, regardless of repository size, with no coverage metric.
- Graph nodes derived only from directories and workspace manifests; root-level files vanished.
- No path-alias support; imports were matched by string heuristics.
- Regex-only extraction, with no way to distinguish AST accuracy from heuristics.
- No measured function-level metrics; no cyclomatic complexity.
- Security detection limited to a few patterns with no severity/confidence/method model.
- Dependency extraction read a single root manifest and never disclosed that limitation.
- No disclosure of what was skipped, or why.

## C. Work Completed

### Adaptive budgets (`src/lib/analysis/budgets.ts`)

`planBudget(eligibleCount, overrides?)` returns a full `AnalysisBudget`:

| Tier | Eligible files | Files | Bytes | Concurrency | Deadline |
|---|---|---|---|---|---|
| small | ≤ 150 | 48 | 6 MiB | 8 | 35 s |
| medium | ≤ 800 | 72 | 8 MiB | 8 | 35 s |
| large | ≤ 5,000 | 96 | 10 MiB | 8 | 35 s |
| huge | > 5,000 | 128 | 12 MiB | 8 | 35 s |

Overrides come from `ANALYSIS_MAX_FILES` / `ANALYSIS_CONCURRENCY` and are clamped to absolute ceilings (file cap 160, byte cap 12 MiB, concurrency 10, deadline 40 s). The default deadline is 35 s for every tier. Per-file size stays 256 KiB. The applied budget is serialised into `analysis.budget`, so the report can explain itself.

### Parser registry (`src/lib/analysis/parsers/`)

| Module | Language | Method | Declares |
|---|---|---|---|
| `typescript-parser.ts` | TS/JS/TSX/JSX | `ts.createSourceFile` | `ast: true`, parse diagnostics |
| `python-parser.ts` | `.py` | indentation + structure scan | `ast: false` |
| `generic-parser.ts` | Go, Rust, Java, C#, Ruby, PHP, C/C++, Swift, Kotlin | import-line scan | `ast: false` |
| `registry.ts` | — | routing + aggregate `ParseSummary` | parsed/unsupported/failed counts, AST languages |

Each parser returns `ParsedFile { parser, ast, ok, diagnostics, imports[], exports[], functions[], classes[], todos[] }`. Imports carry `specifier`, `kind` (`static`/`type`/`dynamic`/`require`/`include`), `line` and `typeOnly`.

**Honesty constraint observed:** only the TypeScript parser is described as AST-based. Python and the generic scanner are described as structural/heuristic in code, README and the report.

### Quality (`src/lib/analysis/quality.ts`)

Measured where spans exist: function length, parameter count, cyclomatic-complexity proxy (decision points), class method counts, file size, and normalised 6-line duplicate blocks grouped across files. Also reports `functionsMeasured`, `averageFunctionLines`, `p90FunctionLines` and a `limitations[]` list. With no function spans it says so and scores nothing.

### Security (`src/lib/analysis/security-rules.ts`)

Credential patterns (AWS, GitHub, Slack, Stripe, Google, private keys, JWT, generic assignments), committed env files, key-like filenames, and risk patterns: `eval`/`Function`, child-process shell interpolation, `dangerouslySetInnerHTML`/`innerHTML`, SQL string interpolation, disabled TLS verification, MD5/SHA-1, permissive CORS, JWT decoded without verification, `pickle.loads`/`yaml.load`. Values are redacted at detection time; only the pattern name, file and line survive.

### Architecture profile (`src/lib/analysis/architecture-profile.ts`)

Infers layered, modular-monolith, frontend/backend split, MVC-like and monorepo shapes **only** when structural evidence exists, and always returns `confidence: "heuristic"` with the evidence list. It does not assign a pattern from folder names alone.

## D. Files Created

| Path | Purpose |
|---|---|
| `src/lib/analysis/budgets.ts` | Adaptive tier planning + clamping |
| `src/lib/analysis/parsers/types.ts` | Shared parser contract |
| `src/lib/analysis/parsers/common.ts` | Line helpers, TODO scan, shared normalisation |
| `src/lib/analysis/parsers/typescript-parser.ts` | Compiler-API parser |
| `src/lib/analysis/parsers/python-parser.ts` | Structural Python parser |
| `src/lib/analysis/parsers/generic-parser.ts` | Import-only fallback |
| `src/lib/analysis/parsers/registry.ts` | Routing + aggregate summary |
| `src/lib/analysis/quality.ts` | Measured quality metrics |
| `src/lib/analysis/security-rules.ts` | Risk-pattern detection |
| `src/lib/analysis/architecture-profile.ts` | Evidence-backed pattern inference |
| tests: `budgets.test.ts`, `parsers/registry.test.ts`, `quality.test.ts`, `graph.test.ts` | Regression coverage |

## E. Files Modified

- `src/lib/analysis/pipeline.ts` — budget planning, parsing, coverage, quality/security/architecture wiring, version bump.
- `src/lib/analysis/graph.ts` — root node, alias resolution, unresolved counting, parser-derived imports.
- `src/lib/analysis/tree-utils.ts` — unchanged prioritisation contract, now fed by the plan.
- `src/lib/analysis/issues/detectors.ts` — new detectors and optional signals.
- `src/lib/analysis/extractors/*` — unchanged contracts, consumed by new modules.
- `src/lib/types/analysis.ts` — `AnalysisBudget`, `AnalysisCoverage`, `Sector.confidence`, `graph.unresolvedImports`, `structure.architectureProfile`.

## F. Architecture Changes

```
planBudget(eligible) ─► prioritize(entries, maxFiles) ─► bounded fetch
       │                                                   │
       │                                        parsers/registry.parseFiles
       │                                                   │
       ├── extractStats/Dependencies/Testing/Docs/Security/Architecture
       │                                                   │
       ├── quality.ts ── security-rules.ts ── architecture-profile.ts
       │                                                   │
       └────────────────────────► graph.ts ◄───────────────┘
                                   │
                          detectors → scoring → insights
```

The pipeline remains a pure function over an injected `GitHubClient`; parsing and analysis never touch the network.

## G. Features Implemented

- Adaptive file budgets with byte/concurrency/deadline limits.
- Real AST parsing for TypeScript/JavaScript (imports, exports, functions, classes, complexity).
- Structural parsing for Python; import-only scanning for nine further languages.
- Inspected-vs-eligible coverage, parsed counts and parse failures in the contract.
- Root-aware, alias-aware graph with unresolved-import accounting.
- Measured function/duplicate metrics with file+line evidence and explicit limitations.
- Security signals with severity, confidence, detection method, consequence, verification and remediation fields.
- Architecture inference with evidence and a heuristic confidence label.

## H. Features Partially Implemented

- **Dependency analysis** still reads root manifests (plus workspace manifests where fetched). No lockfile graph and no transitive resolution; this is stated in the report and UI.
- **Unused dependencies** are not claimed. A text search is not reliable evidence and was deliberately not used.
- **Python** has no AST; its function spans are indentation-derived and marked heuristic.
- **Duplication** is a normalised-block similarity signal, not semantic equivalence; it is labelled as such.
- **Cyclomatic complexity** is a decision-point proxy, not a control-flow-graph measurement.
- **Architecture patterns** are inferred, with `confidence: heuristic`.

## I. Bugs Fixed

- Root-level source files produced no edges → `__root__` node.
- `tsconfig` aliases were ignored → `parseTsPaths` + `resolveAlias`.
- `baseUrl: "."` produced `././...` paths after the first implementation → normalised (caught by the new graph test).
- Sampling was silent → coverage + `SAMPLED COVERAGE` warning with exact counts.
- Fetch-budget exhaustion was silent → `FETCH BUDGET REACHED` warning.
- Unresolvable internal imports were invisible → `graph.unresolvedImports` + detector + warning.
- Graph node/edge budgets dropped workspaces silently → `omittedModules` disclosure (retained and tested).

## J. Testing Results

```
npm run typecheck   → 0 errors
npm run lint        → 0 errors
npm test            → 13 files / 87 tests passed
npm run build       → success (Next.js 15.5.29, compiled in ~8 s)
```

Engine-specific coverage includes: parser routing, TS import kinds (static/type/require/dynamic), complexity counting, Python functions/classes/imports, aggregate AST reporting, root-node edges, alias resolution with and without `tsconfig`, unresolved counting, third-party exclusion, workspace edges, type-only exclusion, quality spans/params/duplicates, and budget tiers/clamps.

The pipeline suite exercises a fake GitHub client and still passes after the rewrite (10 tests): determinism, mid-scan rate limit → partial, Python edges, pnpm workspaces, node-budget disclosure, truncated tree, sampled coverage, and all-null blob fetches.

## K. Accuracy and Benchmark Results

Live scans against the production build (no `GITHUB_TOKEN`):

| Repository | Eligible | Inspected | Coverage | Parsed | Unresolved | Nodes / Edges | Issues | Score |
|---|---|---|---|---|---|---|---|---|
| `octocat/Hello-World` | 1 | 1 | 100% | 0 | 0 | 0 / 0 | 2 | 53 |
| `sindresorhus/p-map` | 14 | 14 | 100% | 7 | 0 | 9 / 5 | 10 | 55 |
| `expressjs/express` | 210 | 20 | 9.52% | 18 | 16 | 12 / 4 | 10 | 58 |
| demo fixture (fictional) | 1,180 | 1,180 | 100% (fictional) | 642 | 6 | 11 / 13 | 6 | 68 |

Notes:
- `p-map` previously produced **6 nodes / 0 edges**; it now produces `__root__` plus 8 external nodes and 5 edges. This is a verified behavioural fix, not a benchmark of accuracy.
- `expressjs/express` hit the unauthenticated GitHub quota mid-scan at 20 of 72 files. The response was marked `partial` with both a sampling warning and a rate-limit warning — the intended degradation path.
- Its 16 unresolved imports are concentrated in `test/` files whose relative targets were outside the fetched sample; they are counted, not hidden.
- No false-positive/false-negative rate is claimed: no labelled ground-truth corpus exists for this engine yet.

## L. Security Implications

- Credential values are redacted before findings are constructed; tests assert the value does not appear in output.
- Repository content is treated as data throughout; nothing is executed.
- Risk patterns are reported as *potential* with a verification step, not as confirmed vulnerabilities.
- No CVE or advisory feed is integrated, and the report says so.

## M. Performance Implications

- Budgets bound the worst case: ≤ 128 files (≤ 160 by override), ≤ 256 KiB per file, ≤ 12 MiB per scan, 8 concurrent fetches.
- The TypeScript compiler is loaded server-side only and marked `serverExternalPackages`, keeping it out of the client bundle.
- Parsing is linear in fetched bytes; only 128 files maximum reach the parser.
- Duplicate detection is O(files × windows) over a small, bounded sample.

## N. Dependencies

- `typescript` promoted to `dependencies` (^5) — required at runtime by the AST parser.
- `next.config.ts` adds `serverExternalPackages: ["typescript"]`.
- No parser library was added for Python or other languages: each would have been a large dependency with unclear reliability, so structural scanning is used and labelled as such.

## O. Remaining Issues

- Python has no true AST; Java/C#/Go/etc. have imports only.
- Dependency analysis is manifest-level, not resolved.
- Complexity is a proxy; no cognitive-complexity metric.
- No incremental or cached analysis between scans.
- The graph is capped at 32 nodes / 60 edges, so very large monorepos are represented by their highest-priority modules only (`omittedModules` reports the gap).

## P. Next Phase

Formalise the evidence model, confidence and coverage in the contract, and make scoring explainable and versioned (Phase 3).
