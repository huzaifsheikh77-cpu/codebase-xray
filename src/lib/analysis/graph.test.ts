import { describe, expect, it } from "vitest";
import type { AnalysisContext } from "./context";
import type { GitHubTreeEntry } from "@/lib/github/endpoints";
import { parseFiles } from "./parsers/registry";
import { buildGraph } from "./graph";

function entry(path: string, content: string): GitHubTreeEntry {
  return { path, mode: "100644", type: "blob", size: content.length, sha: `sha-${path}` };
}

function ctxOf(files: Record<string, string>): AnalysisContext {
  const entries = Object.entries(files).map(([p, c]) => entry(p, c));
  return {
    repo: {
      owner: "o",
      name: "r",
      description: "",
      defaultBranch: "main",
      stars: 0,
      forks: 0,
      openIssues: 0,
      licenseSpdx: null,
      createdAt: "2024-01-01T00:00:00Z",
      pushedAt: "2026-01-01T00:00:00Z",
      sizeKb: 1,
    },
    allEntries: entries,
    entries,
    treeTruncated: false,
    fetched: new Map(Object.entries(files)),
    degraded: false,
    warnings: [],
    rateLimit: null,
  };
}

function graphOf(files: Record<string, string>) {
  const ctx = ctxOf(files);
  return buildGraph(ctx, null, parseFiles(ctx.fetched));
}

describe("buildGraph", () => {
  it("creates a root module so root-level entry files produce edges (regression: p-map had 6 nodes / 0 edges)", () => {
    const graph = graphOf({
      "index.js": 'import { helper } from "./lib/helper.js";\nexport const run = helper;',
      "lib/helper.js": "export const helper = 1;",
    });

    const ids = graph.nodes.map((n) => n.id);
    expect(ids).toContain("__root__");
    expect(ids).toContain("lib");
    expect(graph.edges).toContainEqual({ from: "__root__", to: "lib" });
    expect(graph.unresolvedImports).toBe(0);
  });

  it("resolves tsconfig path aliases to the target module", () => {
    const withAlias = graphOf({
      "tsconfig.json": JSON.stringify({
        compilerOptions: { baseUrl: ".", paths: { "@/*": ["./shared/*"] } },
      }),
      "src/main.ts": 'import { util } from "@/util";\nexport const x = util;',
      "shared/util.ts": "export const util = 2;",
    });

    expect(withAlias.edges).toContainEqual({ from: "src", to: "shared" });

    // Without the alias declaration the specifier cannot be resolved and the
    // edge is omitted rather than invented.
    const withoutAlias = graphOf({
      "src/main.ts": 'import { util } from "@/util";\nexport const x = util;',
      "shared/util.ts": "export const util = 2;",
    });
    expect(withoutAlias.edges).toEqual([]);
  });

  it("counts internal imports that resolve to nothing", () => {
    const graph = graphOf({
      "src/a.ts": 'import { x } from "./missing";\nexport const y = x;',
      "src/b.ts": "export const z = 1;",
    });
    expect(graph.unresolvedImports).toBe(1);
    expect(graph.edges).toEqual([]);
  });

  it("does not count bare third-party packages as unresolved internals", () => {
    const graph = graphOf({
      "src/a.ts": 'import React from "react";\nexport const x = React;',
    });
    expect(graph.unresolvedImports).toBe(0);
  });

  it("keeps top-level modules and aliases when workspace packages exist (regression: monorepo alias edge disappeared)", () => {
    const graph = graphOf({
      "package.json": JSON.stringify({ workspaces: ["packages/*"] }),
      "tsconfig.json": JSON.stringify({ compilerOptions: { baseUrl: ".", paths: { "@/*": ["./shared/*"] } } }),
      "src/main.ts": 'import { util } from "@/util";\nexport const x = util;',
      "shared/util.ts": "export const util = 2;",
      "packages/core/package.json": JSON.stringify({ name: "@acme/core" }),
      "packages/core/src/index.ts": "export const core = 1;",
    });
    const ids = graph.nodes.map((n) => n.id);
    expect(ids).toContain("packages/core");
    expect(ids).toContain("src");
    expect(ids).toContain("shared");
    expect(graph.edges).toContainEqual({ from: "src", to: "shared" });
  });

  it("maps workspace package-name imports onto workspace nodes", () => {
    const graph = graphOf({
      "package.json": JSON.stringify({ workspaces: ["packages/*"] }),
      "packages/core/package.json": JSON.stringify({ name: "@acme/core" }),
      "packages/core/src/index.ts": "export const core = 1;",
      "packages/ui/package.json": JSON.stringify({ name: "@acme/ui" }),
      "packages/ui/src/button.tsx": 'import { core } from "@acme/core";\nexport const B = core;',
    });
    expect(graph.edges).toContainEqual({ from: "packages/ui", to: "packages/core" });
  });

  it("ignores type-only imports when building runtime edges", () => {
    const graph = graphOf({
      "src/a.ts": 'import type { T } from "./b";\nexport const x = 1;',
      "src/b.ts": "export type T = number;",
    });
    expect(graph.edges).toEqual([]);
  });
});
