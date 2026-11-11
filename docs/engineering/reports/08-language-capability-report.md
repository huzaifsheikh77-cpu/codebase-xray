# 08 — Language Capability Report

**Status:** VERIFIED (matrix derived from the parser registry; tests forbid overclaiming)

---

## Depth vocabulary

| Level | Meaning |
|---|---|
| **full** | real syntax tree; function spans, params, classes, imports, decision-point complexity, exact line evidence |
| **partial** | structural parse (indentation/heuristics); spans approximate; **not** an AST |
| **import-only** | imports and TODO markers; no functions, classes, spans or complexity |
| **unsupported** | recognised code file with no parser; counted as `unsupportedSourceFiles` |

## Matrix (as implemented today)

| Language | Extensions | Parser | Level | Functions/classes | Imports | Complexity | Syntax errors | Line evidence |
|---|---|---|---|---|---|---|---|---|
| TypeScript / JavaScript | ts, tsx, mts, cts, js, jsx, mjs, cjs | `typescript` (compiler API) | **full** | yes | static/type/dynamic/require | yes (decision points) | yes (parse diagnostics) | yes |
| Python | py | `python` | **partial** | yes (indentation) | yes | yes (proxy) | no | yes |
| Go | go | `generic` | import-only | no | yes | no | no | yes |
| Rust | rs | `generic` | import-only | no | yes | no | no | yes |
| Java | java | `generic` | import-only | no | yes | no | no | yes |
| Kotlin | kt | `generic` | import-only | no | yes | no | no | yes |
| C# | cs | `generic` | import-only | no | yes | no | no | yes |
| Ruby | rb | `generic` | import-only | no | yes | no | no | yes |
| PHP | php | `generic` | import-only | no | yes | no | no | yes |
| C / C++ | c, h, cpp, hpp, cc | `generic` | import-only | no | `#include` | no | no | yes |
| Swift | swift | `generic` | import-only | no | yes | no | no | yes |

Everything else is **unsupported** (not parsed). Docs, config and binary assets are not counted as unsupported source.

## Verification

`src/lib/analysis/capabilities.test.ts` asserts:

1. any capability marked `full` maps to a parser whose `ast` flag is true, and reports function support;
2. any `import-only` capability reports no functions and no complexity;
3. `capabilityFor` resolves TS → full, Python → partial, Go → import-only, markdown → none;
4. the tally does not count documentation or binary assets as unsupported source.

`registry.test.ts` separately asserts the TypeScript parser's import kinds, exports, spans, class methods and complexity, and that Python/Go behave as declared.

## Parser failure reporting

Each fetched file ends in one of: parsed (ok), parsed with syntax diagnostics (`failedFiles`), or unsupported. `AnalysisCoverage` now reports:

- `parsedFiles`, `parseFailures`, `unsupportedSourceFiles`
- `capabilities { full, partial, importOnly, unsupported }`
- `astLanguages` (only parsers with `ast: true`)

Nothing is silently skipped: the pipeline emits a warning when parse diagnostics occur and counts unsupported source files.

## Gaps and honest claims

- Java and Go are **priority-2** in the brief, but remain import-only. No Java/Go structural parser was added in this milestone: a reliable one requires a real grammar, and shipping a regex approximation labelled as "structure" would violate the product's honesty rule.
- Python is **not** an AST. Function spans come from indentation; syntax errors are not detected.
- Resolution depth differs per language: TypeScript resolves relative paths, `tsconfig` aliases and workspace package names; Python resolves dotted module roots; other languages produce unresolved specifiers unless they match a workspace node.
- Cross-language analysis (e.g. a Python service calling a Go binary) is not modelled.
- No parser is incremental; every scan re-parses its sample.

## Next step (evidence-based)

Add a Java parser only if a maintained, Workers-compatible grammar is available; otherwise keep the import-only label. The highest-value next step is not more languages but **verified accuracy on real repositories** (see Report 07 gap).
