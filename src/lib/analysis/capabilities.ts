/**
 * LANGUAGE CAPABILITY REGISTRY.
 *
 * Advertises what the engine can actually do per language, with an explicit
 * depth vocabulary. It is derived from the parser registry so the matrix and
 * the implementation cannot drift apart silently: a parser that is not
 * AST-backed can never be reported as full structural support.
 *
 *   full         — real syntax tree, spans, imports, structure, complexity
 *   partial      — structural parse (indentation/heuristics), spans approximate
 *   import-only  — imports + TODO markers; no functions, classes or spans
 *   unsupported  — file type is recognised but not parsed
 */

import { parserFor } from "./parsers/registry";

export type CapabilityLevel = "full" | "partial" | "import-only" | "unsupported";

export interface LanguageCapability {
  language: string;
  extensions: string[];
  parser: string;
  /** what this level is based on, in user-facing words */
  basis: string;
  level: CapabilityLevel;
  syntaxErrors: boolean;
  functions: boolean;
  classes: boolean;
  imports: boolean;
  complexity: boolean;
  lineEvidence: boolean;
}

export const LANGUAGE_CAPABILITIES: LanguageCapability[] = [
  {
    language: "TypeScript / JavaScript",
    extensions: [".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"],
    parser: "typescript",
    basis: "TypeScript compiler API syntax tree",
    level: "full",
    syntaxErrors: true,
    functions: true,
    classes: true,
    imports: true,
    complexity: true,
    lineEvidence: true,
  },
  {
    language: "Python",
    extensions: [".py"],
    parser: "python",
    basis: "indentation-aware structural scan (not an AST)",
    level: "partial",
    syntaxErrors: false,
    functions: true,
    classes: true,
    imports: true,
    complexity: true,
    lineEvidence: true,
  },
  {
    language: "Go",
    extensions: [".go"],
    parser: "generic",
    basis: "import-line scan",
    level: "import-only",
    syntaxErrors: false,
    functions: false,
    classes: false,
    imports: true,
    complexity: false,
    lineEvidence: true,
  },
  {
    language: "Rust",
    extensions: [".rs"],
    parser: "generic",
    basis: "import-line scan",
    level: "import-only",
    syntaxErrors: false,
    functions: false,
    classes: false,
    imports: true,
    complexity: false,
    lineEvidence: true,
  },
  {
    language: "Java",
    extensions: [".java"],
    parser: "generic",
    basis: "import-line scan",
    level: "import-only",
    syntaxErrors: false,
    functions: false,
    classes: false,
    imports: true,
    complexity: false,
    lineEvidence: true,
  },
  {
    language: "Kotlin",
    extensions: [".kt"],
    parser: "generic",
    basis: "import-line scan",
    level: "import-only",
    syntaxErrors: false,
    functions: false,
    classes: false,
    imports: true,
    complexity: false,
    lineEvidence: true,
  },
  {
    language: "C#",
    extensions: [".cs"],
    parser: "generic",
    basis: "import-line scan",
    level: "import-only",
    syntaxErrors: false,
    functions: false,
    classes: false,
    imports: true,
    complexity: false,
    lineEvidence: true,
  },
  {
    language: "Ruby",
    extensions: [".rb"],
    parser: "generic",
    basis: "require-line scan",
    level: "import-only",
    syntaxErrors: false,
    functions: false,
    classes: false,
    imports: true,
    complexity: false,
    lineEvidence: true,
  },
  {
    language: "PHP",
    extensions: [".php"],
    parser: "generic",
    basis: "include/use-line scan",
    level: "import-only",
    syntaxErrors: false,
    functions: false,
    classes: false,
    imports: true,
    complexity: false,
    lineEvidence: true,
  },
  {
    language: "C / C++",
    extensions: [".c", ".h", ".cpp", ".hpp", ".cc"],
    parser: "generic",
    basis: "#include scan",
    level: "import-only",
    syntaxErrors: false,
    functions: false,
    classes: false,
    imports: true,
    complexity: false,
    lineEvidence: true,
  },
  {
    language: "Swift",
    extensions: [".swift"],
    parser: "generic",
    basis: "import-line scan",
    level: "import-only",
    syntaxErrors: false,
    functions: false,
    classes: false,
    imports: true,
    complexity: false,
    lineEvidence: true,
  },
];

/** Which capability applies to a path, using the parser registry as truth. */
export function capabilityFor(path: string): LanguageCapability | null {
  const parser = parserFor(path);
  if (!parser) return null;
  const declared = LANGUAGE_CAPABILITIES.find((c) => c.parser === parser.id);
  return declared ?? null;
}

export interface CapabilityTally {
  full: number;
  partial: number;
  "import-only": number;
  unsupported: number;
}

/** Counts inspected files by capability depth (unsupported = no parser). */
export function tallyCapabilities(paths: string[]): CapabilityTally {
  const tally: CapabilityTally = { full: 0, partial: 0, "import-only": 0, unsupported: 0 };
  for (const path of paths) {
    const capability = capabilityFor(path);
    if (!capability) {
      // Only code-like files count as unsupported; docs, config and binary
      // assets are not expected to have a parser.
      if (
        /\.(ts|tsx|mts|cts|js|jsx|mjs|cjs|py|go|rs|java|kt|kts|rb|php|cs|c|h|cpp|hpp|cc|swift|scala|sh|bash|lua|dart|ex|exs|vue|svelte)$/i.test(
          path,
        )
      ) {
        tally.unsupported++;
      }
      continue;
    }
    tally[capability.level]++;
  }
  return tally;
}
