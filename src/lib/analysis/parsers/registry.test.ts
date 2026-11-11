import { describe, expect, it } from "vitest";
import { parseFiles, parserFor, registeredParsers } from "./registry";
import { typescriptParser } from "./typescript-parser";
import { pythonParser } from "./python-parser";

describe("parser registry", () => {
  it("routes file types to the most reliable parser", () => {
    expect(parserFor("src/a.ts")?.id).toBe("typescript");
    expect(parserFor("src/a.tsx")?.id).toBe("typescript");
    expect(parserFor("pkg/main.py")?.id).toBe("python");
    expect(parserFor("cmd/main.go")?.id).toBe("generic");
    expect(parserFor("README.md")).toBeNull();
    expect(registeredParsers().find((p) => p.id === "typescript")?.ast).toBe(true);
    expect(registeredParsers().find((p) => p.id === "python")?.ast).toBe(false);
  });

  it("TypeScript: extracts static, type-only, require and dynamic imports", () => {
    const parsed = typescriptParser.parse(
      "src/entry.ts",
      [
        'import fs from "node:fs";',
        'import type { X } from "./types";',
        'export const a = 1;',
        "export function f(x: number) {",
        "  if (x > 0) { return 1; }",
        "  return 2;",
        "}",
        "class C { m() {} }",
        "const late = require('legacy');",
        "const dyn = import('@scope/pkg');",
      ].join("\n"),
    );

    expect(parsed.ok).toBe(true);
    expect(parsed.parser).toBe("typescript");
    const specs = parsed.imports.map((i) => i.specifier);
    expect(specs).toContain("node:fs");
    expect(specs).toContain("./types");
    expect(specs).toContain("legacy");
    expect(specs).toContain("@scope/pkg");
    expect(parsed.imports.find((i) => i.specifier === "./types")?.typeOnly).toBe(true);
    // `class C` is not exported in this fixture — only exported declarations
    // may appear here.
    expect(parsed.exports).toEqual(expect.arrayContaining(["a", "f"]));
    expect(parsed.exports).not.toContain("C");
    expect(parsed.functions.length).toBeGreaterThanOrEqual(2);
    expect(parsed.classes[0]?.name).toBe("C");
    expect(parsed.classes[0]?.methods).toBe(1);
    expect(parsed.imports[0]?.line).toBe(1);
  });

  it("TypeScript: measures cyclomatic complexity from decision points", () => {
    const parsed = typescriptParser.parse(
      "src/complex.ts",
      "export function decide(a: number, b: number) {\n" +
        "  if (a && b) { return 1; }\n" +
        "  for (let i = 0; i < 3; i++) { if (i) { return 2; } }\n" +
        "  return a ? 3 : 4;\n" +
        "}",
    );
    const fn = parsed.functions.find((f) => f.name === "decide");
    expect(fn).toBeDefined();
    // 1 base + if + && + for + if + ternary = 6
    expect(fn!.complexity).toBeGreaterThanOrEqual(6);
    expect(fn!.params).toBe(2);
    expect(fn!.lines).toBeGreaterThan(1);
  });

  it("Python: structural parse of functions, classes and imports", () => {
    const parsed = pythonParser.parse(
      "pkg/cli.py",
      [
        "import click",
        "from pkg.db import table",
        "",
        "class Commands:",
        "    def run(self):",
        "        pass",
        "",
        "def main(verbose, count):",
        "    if verbose and count:",
        "        for i in range(count):",
        "            click.echo(i)",
        "    return 0",
      ].join("\n"),
    );

    expect(parsed.parser).toBe("python");
    expect(parsed.imports.map((i) => i.specifier)).toEqual(expect.arrayContaining(["click", "pkg.db"]));
    const main = parsed.functions.find((f) => f.name === "main");
    expect(main).toBeDefined();
    expect(main!.params).toBe(2);
    expect(main!.complexity).toBeGreaterThanOrEqual(4); // if + and + for
    expect(parsed.classes[0]?.name).toBe("Commands");
    expect(parsed.classes[0]?.methods).toBe(1);
    expect(main!.line).toBe(8);
  });

  it("aggregates a repository parse with honest AST reporting", () => {
    const summary = parseFiles(
      new Map([
        ["src/a.ts", "export const a = 1;"],
        ["src/b.py", "import os"],
        ["cmd/main.go", 'import "fmt"'],
        ["README.md", "# hi"],
      ]),
    );
    expect(summary.parsedFiles).toBe(3);
    expect(summary.unsupportedFiles).toBe(1);
    expect(summary.failedFiles).toBe(0);
    expect(summary.astLanguages).toContain("TypeScript");
    expect(summary.astLanguages).not.toContain("Python");
  });
});
