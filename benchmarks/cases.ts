/**
 * ACCURACY BENCHMARK CORPUS.
 *
 * Controlled, deterministic fixtures with explicit ground truth. Expectations
 * are limited to findings that the detectors can prove from the fixture, so
 * precision/recall here measures the ENGINE against its own documented rules —
 * it is not a claim about arbitrary public repositories.
 *
 * `forbidden` titles are labelled negatives: firing one counts as a false
 * positive. Any detected title that is neither expected nor forbidden is
 * reported as UNLABELLED and excluded from precision/recall.
 */

export interface BenchmarkCase {
  id: string;
  description: string;
  license: string | null;
  files: Record<string, string>;
  expected: {
    /** titles that MUST be detected (missing ⇒ false negative) */
    issues: string[];
    /** titles that MUST NOT be detected (present ⇒ false positive) */
    forbidden: string[];
    /** inspected paths that ground truth says are critical */
    criticalInspected?: string[];
    /** minimum graph edges that must exist */
    minEdges?: number;
    /** a specific edge that must exist */
    edge?: { from: string; to: string };
    /** parser depth tallies that must match exactly */
    capability?: { full?: number; partial?: number; importOnly?: number };
  };
}

const LONG_README = `# Fixture\n\n${"This document describes installation, configuration and usage. ".repeat(18)}\n`;

const CI = "name: CI\non: push\njobs:\n  test:\n    runs-on: ubuntu-latest\n";

const MANIFEST = (extra: Record<string, unknown> = {}) =>
  JSON.stringify({ name: "fixture", version: "1.0.0", license: "MIT", ...extra }, null, 2);

export const CASES: BenchmarkCase[] = [
  {
    id: "security-known-bad",
    description: "Committed env file, known token format, SQL interpolation and a raw HTML sink.",
    license: "MIT",
    files: {
      "package.json": MANIFEST({ dependencies: { express: "4.18.2" } }),
      "README.md": LONG_README,
      LICENSE: "MIT",
      ".github/workflows/ci.yml": CI,
      ".env": "API_KEY=placeholder\n",
      "src/auth/session.ts": 'export const token = "ghp_0123456789abcdefghijklmnopqrstuvwxyz";\n',
      "src/db/users.ts": "export function find(id: string) {\n  return `SELECT * FROM users WHERE id = ${id}`;\n}\n",
      "src/render.ts": "export function render(el: HTMLElement, html: string) {\n  el.innerHTML = html;\n}\n",
      "tests/session.test.ts": 'import { token } from "../src/auth/session";\nexport const t = token;\n',
    },
    expected: {
      issues: [
        "HARDCODED CREDENTIAL PATTERN",
        "COMMITTED ENVIRONMENT FILE",
        "SQL STRING INTERPOLATION",
        "RAW HTML INJECTION SINK",
      ],
      forbidden: ["MISSING LICENSE", "MISSING README", "NO CI PIPELINE"],
      criticalInspected: ["src/auth/session.ts", "src/db/users.ts"],
      minEdges: 1,
    },
  },
  {
    id: "quality-known-bad",
    description: "A 90-line function, a high-complexity function and an identical block in two files.",
    license: "MIT",
    files: (() => {
      const longBody = Array.from({ length: 90 }, (_, i) => `  const v${i} = ${i};`).join("\n");
      const branches = Array.from({ length: 20 }, (_, i) => `  if (a > ${i}) { b++; }`).join("\n");
      const block = [
        "export function validateTarget(target: string): boolean {",
        "  if (!target) { return false; }",
        "  const parts = target.split('/');",
        "  if (parts.length !== 2) { return false; }",
        "  const [owner, repo] = parts;",
        "  return Boolean(owner && repo);",
        "}",
      ].join("\n");
      return {
        "package.json": MANIFEST(),
        "README.md": LONG_README,
        LICENSE: "MIT",
        ".github/workflows/ci.yml": CI,
        "src/long.ts": `export function huge() {\n${longBody}\n  return v0;\n}`,
        "src/complex.ts": `export function tangled(a: number, b: number) {\n${branches}\n  return b;\n}`,
        "src/web/validate.ts": block,
        "src/cli/validate.ts": block,
      };
    })(),
    expected: {
      issues: ["LONG FUNCTION", "HIGH CYCLOMATIC COMPLEXITY", "DUPLICATED CODE BLOCK"],
      forbidden: ["HARDCODED CREDENTIAL PATTERN", "COMMITTED ENVIRONMENT FILE"],
      capability: { full: 4 },
    },
  },
  {
    id: "clean-small",
    description: "Small, documented, licensed, CI-backed TypeScript project with clean imports.",
    license: "MIT",
    files: {
      "package.json": MANIFEST(),
      "README.md": LONG_README,
      LICENSE: "MIT",
      ".github/workflows/ci.yml": CI,
      "src/index.ts": 'import { add } from "./lib/math";\nexport const sum = add(1, 2);\n',
      "src/lib/math.ts": "export const add = (a: number, b: number) => a + b;\n",
      "tests/math.test.ts": 'import { add } from "../src/lib/math";\nexport const t = add(1, 1);\n',
    },
    expected: {
      issues: [],
      forbidden: [
        "HARDCODED CREDENTIAL PATTERN",
        "COMMITTED ENVIRONMENT FILE",
        "MISSING LICENSE",
        "MISSING README",
        "UNTESTED CODEBASE",
        "NO CI PIPELINE",
      ],
      minEdges: 1,
    },
  },
  {
    id: "missing-docs",
    description: "Ten source files with no README, no licence file, no declared licence and no CI.",
    license: null,
    files: Object.fromEntries([
      ["package.json", JSON.stringify({ name: "fixture", version: "1.0.0" })],
      ...Array.from({ length: 10 }, (_, i) => [`src/mod${i}.ts`, `export const v${i} = ${i};\n`] as const),
    ]),
    expected: {
      issues: ["MISSING LICENSE", "MISSING README", "NO CI PIPELINE"],
      forbidden: ["HARDCODED CREDENTIAL PATTERN"],
    },
  },
  {
    id: "monorepo-alias",
    description: "Workspace packages plus a tsconfig alias that resolves across directories.",
    license: "MIT",
    files: {
      "package.json": MANIFEST({ workspaces: ["packages/*"] }),
      "tsconfig.json": JSON.stringify({ compilerOptions: { baseUrl: ".", paths: { "@/*": ["./shared/*"] } } }),
      "README.md": LONG_README,
      "shared/util.ts": "export const util = 2;\n",
      "src/main.ts": 'import { util } from "@/util";\nexport const x = util;\n',
      "packages/core/package.json": JSON.stringify({ name: "@acme/core" }),
      "packages/core/src/index.ts": "export const core = 1;\n",
      "packages/ui/package.json": JSON.stringify({ name: "@acme/ui" }),
      "packages/ui/src/button.tsx": 'import { core } from "@acme/core";\nexport const B = core;\n',
    },
    expected: {
      issues: [],
      forbidden: ["UNRESOLVED INTERNAL IMPORTS"],
      minEdges: 2,
    },
  },
  {
    id: "python-service",
    description: "Python package with cross-module imports and a test package.",
    license: "MIT",
    files: {
      "README.md": LONG_README,
      "pyproject.toml": '[project]\nname = "fixture"\ndependencies = ["click>=8", "fastapi"]\n',
      "pkg/__init__.py": "",
      "pkg/cli.py": "import click\nfrom pkg.db import table\n\ndef main(verbose):\n    if verbose:\n        click.echo('on')\n    return table\n",
      "pkg/db.py": "import pathlib\n\nclass Table:\n    def read(self):\n        return pathlib.Path('.')\n",
      "tests/test_cli.py": "from pkg.cli import main\n\ndef test_main():\n    assert main(False)\n",
    },
    expected: {
      issues: [],
      forbidden: ["HARDCODED CREDENTIAL PATTERN"],
      edge: { from: "tests", to: "pkg" },
      capability: { partial: 4 },
    },
  },
  {
    id: "unsupported-go",
    description: "Go module: imports are extractable, structure and complexity are not.",
    license: "MIT",
    files: {
      "README.md": LONG_README,
      "go.mod": "module example.com/fixture\n\ngo 1.22\n",
      "main.go": 'package main\n\nimport "fmt"\n\nfunc main() {\n\tfmt.Println("hi")\n}\n',
    },
    expected: {
      issues: [],
      forbidden: ["HARDCODED CREDENTIAL PATTERN", "UNRESOLVED INTERNAL IMPORTS"],
      capability: { importOnly: 1 },
    },
  },
];
