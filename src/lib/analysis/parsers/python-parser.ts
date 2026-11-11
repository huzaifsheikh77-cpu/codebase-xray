import type { LanguageParser, ParsedClass, ParsedFile, ParsedFunction, ParsedImport } from "./types";
import { emptyParsedFile, languageOfPath, lineCount, scanTodos } from "./common";

/**
 * PYTHON PARSER — indentation-based structural analysis.
 *
 * This is explicitly NOT an AST parser (`ast: false`). Python's block
 * structure is recoverable from indentation with high reliability for
 * well-formed files, which is enough for function spans, parameter counts,
 * complexity proxies and import edges. Every consumer must present these as
 * structural estimates, never as compiler-verified facts.
 */

function indentOf(line: string): number {
  const prefix = line.match(/^[ \t]*/)?.[0] ?? "";
  return prefix.replace(/\t/g, "    ").length;
}

const DEF_RE = /^(\s*)(?:async\s+)?def\s+([A-Za-z_]\w*)\s*\(([^)]*)\)/;
const CLASS_RE = /^(\s*)class\s+([A-Za-z_]\w*)/;
const IMPORT_RE = /^(\s*)import\s+(.+?)\s*$/;
const FROM_RE = /^(\s*)from\s+([\w.]+)\s+import\s/;

/** Block end: first non-blank line at the same or lower indentation. */
function blockEnd(lines: string[], start: number, indent: number): number {
  for (let j = start + 1; j < lines.length; j++) {
    const line = lines[j];
    if (line.trim() === "") continue;
    if (indentOf(line) <= indent) return j - 1;
  }
  return lines.length - 1;
}

export const pythonParser: LanguageParser = {
  id: "python",
  label: "Python indentation parser",
  ast: false,
  capability:
    "Structural only: functions, classes, parameters, complexity proxies and imports recovered from indentation.",

  supports(path: string): boolean {
    return /\.py$/i.test(path);
  },

  parse(path: string, content: string): ParsedFile {
    const file = emptyParsedFile(path, languageOfPath(path) ?? "Python", "python");
    file.loc = lineCount(content);
    file.todos = scanTodos(content);

    const lines = content.split("\n");
    const imports: ParsedImport[] = [];
    const functions: ParsedFunction[] = [];
    const classes: ParsedClass[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const indent = indentOf(line);

      const from = FROM_RE.exec(line);
      if (from) {
        imports.push({ specifier: from[2], kind: "from", line: i + 1 });
        continue;
      }
      const imp = IMPORT_RE.exec(line);
      if (imp) {
        for (const part of imp[2].split(",")) {
          const spec = part.trim().split(/\s+as\s+/)[0].trim();
          if (spec) imports.push({ specifier: spec, kind: "static", line: i + 1 });
        }
        continue;
      }

      const def = DEF_RE.exec(line);
      if (def) {
        const end = blockEnd(lines, i, indent);
        const body = lines.slice(i + 1, end + 1).join("\n");
        const decisions = (body.match(/\b(if|elif|for|while|except|with|assert|and|or)\b/g) ?? []).length;
        const params = def[3]
          .split(",")
          .map((p) => p.trim())
          .filter((p) => p && p !== "self" && p !== "cls" && p !== "*" && p !== "/").length;
        if (functions.length < 400) {
          functions.push({
            name: def[2],
            line: i + 1,
            endLine: end + 1,
            lines: Math.max(1, end - i + 1),
            params,
            complexity: 1 + decisions,
            async: /^\s*async\s+def/.test(line),
            method: indent > 0 || undefined,
          });
        }
        continue;
      }

      const cls = CLASS_RE.exec(line);
      if (cls) {
        const end = blockEnd(lines, i, indent);
        const body = lines.slice(i + 1, end + 1);
        if (classes.length < 100) {
          classes.push({
            name: cls[2],
            line: i + 1,
            endLine: end + 1,
            lines: Math.max(1, end - i + 1),
            methods: body.filter((l) => /^\s+(?:async\s+)?def\s/.test(l)).length,
          });
        }
      }
    }

    file.imports = imports;
    file.functions = functions;
    file.classes = classes;
    return file;
  },
};
