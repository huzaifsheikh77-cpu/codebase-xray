import type { LanguageParser, ParseSummary, ParsedFile } from "./types";
import { isParseablePath } from "./common";
import { typescriptParser } from "./typescript-parser";
import { pythonParser } from "./python-parser";
import { genericParser } from "./generic-parser";

/**
 * PARSER REGISTRY — first match wins, in descending order of reliability.
 *
 * Parsers are pure: same path + content ⇒ same ParsedFile. The registry is
 * where a future language parser is added; nothing else needs to change.
 */
const PARSERS: LanguageParser[] = [typescriptParser, pythonParser, genericParser];

export function parserFor(path: string): LanguageParser | null {
  if (!isParseablePath(path)) return null;
  return PARSERS.find((p) => p.supports(path)) ?? null;
}

export function registeredParsers(): { id: string; label: string; ast: boolean; capability: string }[] {
  return PARSERS.map((p) => ({ id: p.id, label: p.label, ast: p.ast, capability: p.capability }));
}

/** Parse every fetched file that a language parser claims. */
export function parseFiles(fetched: Map<string, string>): ParseSummary {
  const files: ParsedFile[] = [];
  const byPath = new Map<string, ParsedFile>();
  let failedFiles = 0;
  let unsupportedFiles = 0;

  for (const [path, content] of fetched) {
    const parser = parserFor(path);
    if (!parser) {
      unsupportedFiles++;
      continue;
    }
    let parsed: ParsedFile;
    try {
      parsed = parser.parse(path, content);
    } catch (error) {
      parsed = {
        path,
        language: "Unknown",
        parser: parser.id,
        ok: false,
        error: error instanceof Error ? error.name : "parser failure",
        loc: content.split("\n").length,
        imports: [],
        exports: [],
        functions: [],
        classes: [],
        todos: [],
      };
    }
    if (!parsed.ok) failedFiles++;
    files.push(parsed);
    byPath.set(path, parsed);
  }

  const languages = [...new Set(files.map((f) => f.language))].sort();
  const astLanguages = [...new Set(files.filter((f) => f.parser === "typescript").map((f) => f.language))].sort();

  return {
    files,
    byPath,
    parsedFiles: files.length,
    failedFiles,
    unsupportedFiles,
    languages,
    astLanguages,
  };
}
