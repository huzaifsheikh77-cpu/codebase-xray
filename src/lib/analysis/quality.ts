import type { ParseSummary } from "./parsers/types";

/**
 * CODE QUALITY — measured only from parsed structure.
 *
 * Every number here comes from a real function/class span produced by a
 * parser. Nothing is inferred from file size alone (file size is handled by
 * the architecture extractor). Duplicate detection is normalised-line
 * shingling: it finds identical 6-line blocks across different files, which
 * is a *similarity signal*, not a claim about semantic duplication.
 */

export interface LongFunction {
  path: string;
  name: string;
  line: number;
  lines: number;
}

export interface ComplexFunction {
  path: string;
  name: string;
  line: number;
  complexity: number;
}

export interface HighParamFunction {
  path: string;
  name: string;
  line: number;
  params: number;
}

export interface LargeClass {
  path: string;
  name: string;
  line: number;
  lines: number;
}

export interface DuplicateGroup {
  files: string[];
  blocks: number;
  lines: number;
  sample: string;
}

export interface QualitySignals {
  /** files with structural data available */
  measuredFiles: number;
  functionsMeasured: number;
  averageFunctionLines: number;
  longFunctions: LongFunction[];
  complexFunctions: ComplexFunction[];
  highParamFunctions: HighParamFunction[];
  largeClasses: LargeClass[];
  duplicateGroups: DuplicateGroup[];
  /** language labels that produced structure */
  measuredLanguages: string[];
  /** explicit statement of what was not measurable */
  limitations: string[];
}

const LONG_FUNCTION_LINES = 80;
const HIGH_COMPLEXITY = 15;
const HIGH_PARAMS = 5;
const LARGE_CLASS_LINES = 400;
const DUPLICATE_WINDOW = 6;
const MAX_WINDOWS_PER_FILE = 120;
const MAX_DUPLICATE_GROUPS = 5;

function normalise(line: string): string {
  return line
    .replace(/\s+/g, " ")
    .replace(/\/\/.*$/, "")
    .replace(/#.*$/, "")
    .replace(/\s+$/, "")
    .trim();
}

function isTrivial(line: string): boolean {
  return line.length < 12 || /^[}{()[\];,]+$/.test(line) || /^(import|export|from|require)\b/.test(line);
}

function detectDuplicates(fetched: Map<string, string>): DuplicateGroup[] {
  const windows = new Map<string, { files: Set<string>; count: number; sample: string }>();
  let scanned = 0;

  for (const [path, content] of fetched) {
    if (content.length > 200_000) continue;
    if (++scanned > 120) break;
    const lines = content
      .split("\n")
      .map(normalise)
      .filter((l) => l.length > 0);

    let windowsInFile = 0;
    for (let i = 0; i + DUPLICATE_WINDOW <= lines.length; i += 2) {
      if (windowsInFile >= MAX_WINDOWS_PER_FILE) break;
      const slice = lines.slice(i, i + DUPLICATE_WINDOW);
      // Require substance: at least two non-trivial lines.
      if (slice.filter((l) => !isTrivial(l)).length < 2) continue;
      const key = slice.join("\n");
      if (key.length < 120) continue;
      const existing = windows.get(key);
      if (existing) {
        existing.files.add(path);
        existing.count++;
      } else {
        windows.set(key, { files: new Set([path]), count: 1, sample: slice.find((l) => !isTrivial(l)) ?? slice[0] });
      }
      windowsInFile++;
    }
  }

  const groups: DuplicateGroup[] = [];
  for (const [, entry] of windows) {
    if (entry.files.size < 2) continue;
    groups.push({
      files: [...entry.files].sort(),
      blocks: entry.count,
      lines: DUPLICATE_WINDOW * entry.files.size,
      sample: entry.sample.slice(0, 80),
    });
  }

  groups.sort((a, b) => b.files.length - a.files.length || b.blocks - a.blocks);
  return groups.slice(0, MAX_DUPLICATE_GROUPS);
}

export function extractQuality(parsed: ParseSummary, fetched: Map<string, string>): QualitySignals {
  const longFunctions: LongFunction[] = [];
  const complexFunctions: ComplexFunction[] = [];
  const highParamFunctions: HighParamFunction[] = [];
  const largeClasses: LargeClass[] = [];
  let functionsMeasured = 0;
  let totalFunctionLines = 0;

  for (const file of parsed.files) {
    for (const fn of file.functions) {
      functionsMeasured++;
      totalFunctionLines += fn.lines;
      if (fn.lines > LONG_FUNCTION_LINES) {
        longFunctions.push({ path: file.path, name: fn.name, line: fn.line, lines: fn.lines });
      }
      if (fn.complexity > HIGH_COMPLEXITY) {
        complexFunctions.push({ path: file.path, name: fn.name, line: fn.line, complexity: fn.complexity });
      }
      if (fn.params > HIGH_PARAMS) {
        highParamFunctions.push({ path: file.path, name: fn.name, line: fn.line, params: fn.params });
      }
      if (longFunctions.length > 200 && complexFunctions.length > 200) break;
    }
    for (const cls of file.classes) {
      if (cls.lines > LARGE_CLASS_LINES) {
        largeClasses.push({ path: file.path, name: cls.name, line: cls.line, lines: cls.lines });
      }
    }
  }

  longFunctions.sort((a, b) => b.lines - a.lines);
  complexFunctions.sort((a, b) => b.complexity - a.complexity);
  highParamFunctions.sort((a, b) => b.params - a.params);
  largeClasses.sort((a, b) => b.lines - a.lines);

  const limitations: string[] = [];
  if (parsed.failedFiles > 0) limitations.push(`${parsed.failedFiles} file(s) had syntax diagnostics; their metrics are partial`);
  if (parsed.unsupportedFiles > 0) limitations.push(`${parsed.unsupportedFiles} fetched file(s) have no language parser`);
  if (!parsed.astLanguages.includes("TypeScript") && !parsed.astLanguages.includes("TSX") && !parsed.astLanguages.includes("JavaScript") && !parsed.astLanguages.includes("JSX")) {
    limitations.push("no TypeScript/JavaScript files were parsed with an AST");
  }
  if (functionsMeasured === 0) limitations.push("no function spans were measurable in the inspected sample");
  limitations.push("duplicate detection compares normalised 6-line blocks; it is a similarity signal, not semantic equivalence");

  return {
    measuredFiles: parsed.files.length,
    functionsMeasured,
    averageFunctionLines: functionsMeasured > 0 ? Math.round(totalFunctionLines / functionsMeasured) : 0,
    longFunctions: longFunctions.slice(0, 8),
    complexFunctions: complexFunctions.slice(0, 8),
    highParamFunctions: highParamFunctions.slice(0, 5),
    largeClasses: largeClasses.slice(0, 5),
    duplicateGroups: detectDuplicates(fetched),
    measuredLanguages: parsed.languages,
    limitations,
  };
}
