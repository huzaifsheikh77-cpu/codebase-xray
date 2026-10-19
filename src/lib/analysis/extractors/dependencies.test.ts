import { describe, expect, it } from "vitest";
import type { AnalysisContext } from "../context";
import { extractDependencies } from "./dependencies";

function makeCtx(paths: string[], files: Record<string, string> = {}): AnalysisContext {
  const allEntries = paths.map((path) => ({
    path,
    mode: "100644",
    type: "blob" as const,
    size: files[path]?.length ?? 100,
    sha: path,
  }));
  return {
    repo: {
      owner: "o", name: "r", description: "", defaultBranch: "main",
      stars: 0, forks: 0, openIssues: 0, licenseSpdx: null,
      createdAt: "2024-01-01T00:00:00Z", pushedAt: "2026-01-01T00:00:00Z", sizeKb: 10,
    },
    allEntries,
    entries: allEntries,
    treeTruncated: false,
    fetched: new Map(Object.entries(files)),
    degraded: false,
    warnings: [],
    rateLimit: null,
  };
}

describe("extractDependencies", () => {
  it("parses package.json dependencies and counts lockfile", () => {
    const pkg = JSON.stringify({
      dependencies: { react: "^19.0.0", lodash: "4.17.21" },
      devDependencies: { vitest: "^3.0.0" },
    });
    const sig = extractDependencies(
      makeCtx(["package.json", "package-lock.json"], { "package.json": pkg }),
    );
    expect(sig.ecosystems).toHaveLength(1);
    expect(sig.ecosystems[0].count).toBe(3);
    expect(sig.ecosystems[0].names).toEqual(["lodash", "react", "vitest"]);
    expect(sig.hasLockfile).toBe(true);
    expect(sig.pinnedRatio).toBeCloseTo(1 / 3, 2);
  });

  it("parses PEP-621 pyproject.toml [project] dependencies (regression: sqlite-utils showed 0)", () => {
    const pyproject = [
      "[build-system]",
      "requires = [\"setuptools\"]",
      "",
      "[project]",
      `dependencies = [`,
      `    "click>=7.1.1, <8.2",`,
      "    'click_aliases~=1.0',",
      `    "sqlite-fts4 ; python_version != '3.9.'",`,
      `    "decorator==4.4.2",`,
      `    "tqdm~=4.66"`,
      "]",
      "",
      "[project.optional-dependencies]",
      "test = [\"pytest\"]",
    ].join("\n");
    const sig = extractDependencies(makeCtx(["pyproject.toml"], { "pyproject.toml": pyproject }));
    expect(sig.ecosystems).toHaveLength(1);
    expect(sig.ecosystems[0].manifestPath).toBe("pyproject.toml");
    expect(sig.ecosystems[0].count).toBe(5);
    expect(sig.ecosystems[0].names).toContain("click");
    expect(sig.ecosystems[0].names).toContain("decorator");
    // optional-dependencies groups and build-system.requires must NOT leak in
    expect(sig.ecosystems[0].names).not.toContain("pytest");
    expect(sig.ecosystems[0].names).not.toContain("setuptools");
  });

  it("parses go.mod require blocks", () => {
    const goMod = ["module example.com/x", "", "require (", "\tgithub.com/spf13/cobra v1.8.0", "\tgolang.org/x/text v0.14.0", ")"].join("\n");
    const sig = extractDependencies(makeCtx(["go.mod"], { "go.mod": goMod }));
    expect(sig.ecosystems[0].count).toBe(2);
    expect(sig.ecosystems[0].names).toContain("github.com/spf13/cobra");
  });

  it("reports a manifest present but unfetched with count 0 (budget degradation)", () => {
    const sig = extractDependencies(makeCtx(["Cargo.toml"]));
    expect(sig.ecosystems).toHaveLength(1);
    expect(sig.ecosystems[0].count).toBe(0);
    expect(sig.ecosystems[0].names).toEqual([]);
  });

  it("no manifests → empty ecosystems", () => {
    const sig = extractDependencies(makeCtx(["src/a.ts"]));
    expect(sig.ecosystems).toEqual([]);
    expect(sig.totalDirect).toBe(0);
  });
});
