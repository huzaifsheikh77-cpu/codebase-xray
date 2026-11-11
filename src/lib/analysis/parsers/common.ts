import type { ParsedFile, ParsedTodo, TodoTag } from "./types";

/** Shared, parser-independent helpers. */

const TODO_RE = /\b(TODO|FIXME|HACK)\b/;

/** Collect TODO/FIXME/HACK markers with exact line numbers. */
export function scanTodos(content: string, limit = 200): ParsedTodo[] {
  const out: ParsedTodo[] = [];
  const lines = content.split("\n");
  const cap = Math.min(lines.length, 20_000);
  for (let i = 0; i < cap && out.length < limit; i++) {
    const m = TODO_RE.exec(lines[i]);
    if (m) out.push({ line: i + 1, tag: m[1] as TodoTag });
  }
  return out;
}

export function lineCount(content: string): number {
  if (content.length === 0) return 0;
  return content.split("\n").length;
}

const EXT_LANGUAGE: Record<string, string> = {
  ts: "TypeScript",
  mts: "TypeScript",
  cts: "TypeScript",
  tsx: "TSX",
  js: "JavaScript",
  mjs: "JavaScript",
  cjs: "JavaScript",
  jsx: "JSX",
  py: "Python",
  go: "Go",
  rs: "Rust",
  java: "Java",
  kt: "Kotlin",
  cs: "C#",
  rb: "Ruby",
  php: "PHP",
  c: "C",
  h: "C",
  cpp: "C++",
  cc: "C++",
  hpp: "C++",
  swift: "Swift",
  scala: "Scala",
};

export function languageOfPath(path: string): string | null {
  const base = path.split("/").pop() ?? path;
  const dot = base.lastIndexOf(".");
  if (dot === -1) return null;
  return EXT_LANGUAGE[base.slice(dot + 1).toLowerCase()] ?? null;
}

/** Files worth handing to a language parser. */
export function isParseablePath(path: string): boolean {
  return languageOfPath(path) !== null;
}

export function emptyParsedFile(
  path: string,
  language: string,
  parser: ParsedFile["parser"],
): ParsedFile {
  return {
    path,
    language,
    parser,
    ok: true,
    loc: 0,
    imports: [],
    exports: [],
    functions: [],
    classes: [],
    todos: [],
  };
}
