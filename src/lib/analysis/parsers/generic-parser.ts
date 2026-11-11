import type { LanguageParser, ParsedFile, ParsedImport } from "./types";
import { emptyParsedFile, isParseablePath, languageOfPath, lineCount, scanTodos } from "./common";

/**
 * GENERIC FALLBACK PARSER.
 *
 * Used for languages where this project has no reliable structural parser
 * (Go, Rust, Java, C#, Ruby, PHP, C/C++, Swift…). It extracts only import
 * lines and TODO markers. It deliberately does NOT report function metrics —
 * inventing them from braces would be the exact kind of false precision this
 * project is trying to remove.
 */

const JS_IMPORT_RE =
  /(?:^|\n)\s*(?:import\s+(?:[\w*{},\s$]+from\s+)?|export\s+[\w*{},\s$]+from\s+|const\s+\w+\s*=\s*require\()\s*["']([^"']+)["']/g;
const INCLUDE_RE = /^\s*#\s*include\s*[<"]([^>"]+)[>"]/gm;
const GO_IMPORT_RE = /^\s*import\s+(?:\(\s*)?(?:[\w.]+\s+)?"([^"]+)"/gm;
const RUBY_REQUIRE_RE = /^\s*require(?:_relative)?\s+['"]([^'"]+)['"]/gm;
const PHP_USE_RE = /^\s*use\s+([\w\\]+)(?:\s+as\s+\w+)?\s*;/gm;

export const genericParser: LanguageParser = {
  id: "generic",
  label: "Generic import scanner",
  ast: false,
  capability: "Import lines and TODO markers only. No function or complexity metrics.",

  supports(path: string): boolean {
    return isParseablePath(path);
  },

  parse(path: string, content: string): ParsedFile {
    const file = emptyParsedFile(path, languageOfPath(path) ?? "Other", "generic");
    file.loc = lineCount(content);
    file.todos = scanTodos(content);

    const imports: ParsedImport[] = [];
    const lineOf = (index: number): number => content.slice(0, index).split("\n").length;

    const collect = (re: RegExp, kind: ParsedImport["kind"]): void => {
      re.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = re.exec(content)) !== null && imports.length < 400) {
        imports.push({ specifier: m[1], kind, line: lineOf(m.index) });
      }
    };

    collect(JS_IMPORT_RE, "static");
    collect(INCLUDE_RE, "include");
    collect(GO_IMPORT_RE, "static");
    collect(RUBY_REQUIRE_RE, "require");
    collect(PHP_USE_RE, "static");

    file.imports = imports;
    return file;
  },
};
