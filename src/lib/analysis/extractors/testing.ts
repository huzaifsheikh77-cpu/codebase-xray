import type { AnalysisContext } from "../context";
import { classifyPath, fileName } from "../tree-utils";
import type { DependencySignals } from "./dependencies";

export interface TestingSignals {
  testDirectories: string[];
  testFiles: number;
  sourceFiles: number;
  ratio: number | null;
  /** frameworks inferred from dependencies + config files */
  frameworks: string[];
  /** test config files found in the tree */
  configFiles: string[];
}

const FRAMEWORK_BY_DEP: Record<string, string> = {
  jest: "Jest",
  vitest: "Vitest",
  mocha: "Mocha",
  "jasmine-core": "Jasmine",
  ava: "AVA",
  playwright: "Playwright",
  "@playwright/test": "Playwright",
  cypress: "Cypress",
  pytest: "pytest",
  nose: "nose",
  rspec: "RSpec",
  minitest: "Minitest",
  junit: "JUnit",
  "testify/assert": "Testify",
  "testing": "Go testing",
};

const TEST_CONFIG_FILES = [
  "jest.config.js", "jest.config.ts", "jest.config.mjs", "jest.config.cjs", "jest.config.json",
  "vitest.config.ts", "vitest.config.mts", "vitest.config.js", "vitest.config.mjs",
  "playwright.config.ts", "playwright.config.js",
  "cypress.config.ts", "cypress.config.js", "cypress.json",
  "pytest.ini", "pyproject.toml", "setup.cfg", "tox.ini", "conftest.py",
  ".mocharc.yml", ".mocharc.json", "karma.conf.js",
  "phpunit.xml", "phpunit.xml.dist",
];

const TEST_DIRS = new Set(["test", "tests", "__tests__", "spec", "e2e", "integration", "unit"]);

export function extractTesting(ctx: AnalysisContext, deps: DependencySignals): TestingSignals {
  const testDirs = new Set<string>();
  let testFiles = 0;
  let sourceFiles = 0;

  for (const entry of ctx.entries) {
    const topDirs = entry.path.split("/").slice(0, -1);
    for (const d of topDirs) {
      if (TEST_DIRS.has(d.toLowerCase())) testDirs.add(d.toLowerCase());
    }
    const kind = classifyPath(entry.path);
    if (kind === "test") testFiles++;
    else if (kind === "source") sourceFiles++;
  }

  // frameworks from dependency names across all parsed ecosystems
  const frameworks = new Set<string>();
  for (const eco of deps.ecosystems) {
    for (const name of eco.names) {
      const fw = FRAMEWORK_BY_DEP[name] ?? FRAMEWORK_BY_DEP[name.toLowerCase()];
      if (fw) frameworks.add(fw);
    }
  }
  // frameworks/config from test config files in the tree
  const configFiles: string[] = [];
  for (const entry of ctx.entries) {
    const base = fileName(entry.path);
    if (TEST_CONFIG_FILES.includes(base) && entry.path.split("/").length <= 2) {
      configFiles.push(entry.path);
      if (base.startsWith("jest")) frameworks.add("Jest");
      if (base.startsWith("vitest")) frameworks.add("Vitest");
      if (base.startsWith("playwright")) frameworks.add("Playwright");
      if (base.startsWith("cypress")) frameworks.add("Cypress");
      if (base === "pytest.ini" || base === "conftest.py") frameworks.add("pytest");
    }
  }

  return {
    testDirectories: [...testDirs].sort(),
    testFiles,
    sourceFiles,
    ratio: sourceFiles > 0 ? Math.round((testFiles / sourceFiles) * 100) / 100 : null,
    frameworks: [...frameworks].sort(),
    configFiles: configFiles.sort(),
  };
}
