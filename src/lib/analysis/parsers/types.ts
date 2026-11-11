/**
 * PARSER CONTRACT.
 *
 * Every parser — AST-backed or heuristic — returns the same shape and must
 * declare its own honesty level (`ast: boolean`). Nothing downstream may
 * present a heuristic parse as AST-level accuracy.
 */

export type ParserId = "typescript" | "python" | "generic";

export type ImportKind = "static" | "dynamic" | "require" | "from" | "include";

export interface ParsedImport {
  specifier: string;
  kind: ImportKind;
  /** 1-based line in the source file */
  line: number;
  /** `import type` / `export type` — never counted as a runtime edge */
  typeOnly?: boolean;
}

export interface ParsedFunction {
  name: string;
  line: number;
  endLine: number;
  lines: number;
  params: number;
  /** approximated cyclomatic complexity: 1 + decision points */
  complexity: number;
  async?: boolean;
  method?: boolean;
}

export interface ParsedClass {
  name: string;
  line: number;
  endLine: number;
  lines: number;
  methods: number;
}

export type TodoTag = "TODO" | "FIXME" | "HACK";

export interface ParsedTodo {
  line: number;
  tag: TodoTag;
}

export interface ParsedFile {
  path: string;
  language: string;
  parser: ParserId;
  /** false when the parser could not produce a structural result */
  ok: boolean;
  /** parser error message (safe: never includes file content) */
  error?: string;
  loc: number;
  imports: ParsedImport[];
  exports: string[];
  functions: ParsedFunction[];
  classes: ParsedClass[];
  todos: ParsedTodo[];
}

export interface LanguageParser {
  id: ParserId;
  label: string;
  /** true only for parsers backed by a real syntax tree */
  ast: boolean;
  /** plain-language capability note shown in reports */
  capability: string;
  supports(path: string): boolean;
  parse(path: string, content: string): ParsedFile;
}

export interface ParseSummary {
  files: ParsedFile[];
  byPath: Map<string, ParsedFile>;
  /** files successfully parsed (ok === true) */
  parsedFiles: number;
  /** files where the parser reported a structural failure */
  failedFiles: number;
  /** fetched files that no language parser claims */
  unsupportedFiles: number;
  /** language labels actually parsed */
  languages: string[];
  /** languages parsed with an AST */
  astLanguages: string[];
}
