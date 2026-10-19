import { describe, expect, it } from "vitest";
import type { GitHubTreeEntry } from "@/lib/github/endpoints";
import { isVendoredPath, prioritize } from "./tree-utils";

function entry(path: string, size = 100): GitHubTreeEntry {
  return { path, mode: "100644", type: "blob", size, sha: `sha-${path}` };
}

const paths = (entries: GitHubTreeEntry[]): string[] => entries.map((e) => e.path);

describe("prioritize (content-fetch order)", () => {
  it("puts workspace manifests and real source ahead of a larger vendored bundle", () => {
    const entries = [
      entry("packages/next/compiled/bundle.js", 250_000), // largest by far
      entry("packages/next/src/server/app-render.ts", 90_000),
      entry("pnpm-workspace.yaml", 200),
      entry("package.json", 1_500),
      entry("README.md", 900),
    ];
    const order = paths(prioritize(entries, 4));

    expect(order[0]).toBe("README.md");
    expect(order.slice(0, 3).sort()).toEqual(["README.md", "package.json", "pnpm-workspace.yaml"]);
    expect(order.indexOf("pnpm-workspace.yaml")).toBeLessThan(
      order.indexOf("packages/next/src/server/app-render.ts"),
    );
    expect(order.indexOf("packages/next/src/server/app-render.ts")).toBeLessThan(
      order.indexOf("packages/next/compiled/bundle.js"),
    );
    // vendored content is last resort
    expect(order.at(-1)).toBe("packages/next/compiled/bundle.js");
  });

  it("does not let vendored bundles consume the 24-file fetch budget (regression: vercel/next.js sampled compiled/ and produced 0 edges)", () => {
    const entries: GitHubTreeEntry[] = [
      entry("README.md", 500),
      entry("package.json", 1_000),
      entry("pnpm-workspace.yaml", 100),
    ];
    for (let i = 0; i < 30; i++) entries.push(entry(`packages/next/compiled/vendor-${i}.js`, 200_000 + i));
    for (let i = 0; i < 30; i++) entries.push(entry(`packages/next/src/server/module-${i}.ts`, 40_000 + i));

    const budgeted = prioritize(entries, 4).slice(0, 24);
    const vendored = budgeted.filter((e) => isVendoredPath(e.path));
    const source = budgeted.filter((e) => e.path.startsWith("packages/next/src/"));

    expect(budgeted).toHaveLength(24);
    // With real source available, not one byte of the budget goes to compiled bundles.
    expect(vendored).toHaveLength(0);
    expect(source.length).toBeGreaterThanOrEqual(21);
  });

  it("treats compiled, vendor, generated and minified files as vendored", () => {
    for (const path of [
      "packages/next/compiled/react-dom.js",
      "vendor/jquery.js",
      "third_party/zlib.c",
      "src/api.generated.ts",
      "src/schema.pb.go",
      "public/app.min.js",
      "dist/app.bundle.js",
    ]) {
      expect(isVendoredPath(path), path).toBe(true);
    }
    for (const path of ["src/server/router.ts", "packages/ui/src/button.tsx", "generate.ts"]) {
      expect(isVendoredPath(path), path).toBe(false);
    }
  });

  it("keeps manifests, entry points and tests capped so one category cannot fill the budget", () => {
    const entries: GitHubTreeEntry[] = [entry("README.md", 400), entry("package.json", 900)];
    for (let i = 0; i < 10; i++) entries.push(entry(`packages/pkg-${i}/package.json`, 300));
    for (let i = 0; i < 10; i++) entries.push(entry(`packages/pkg-${i}/src/index.ts`, 500));
    for (let i = 0; i < 10; i++) entries.push(entry(`tests/spec-${i}.test.ts`, 600));

    const order = paths(prioritize(entries, 2));
    const firstBlock = order.slice(0, 12);

    expect(firstBlock.filter((p) => p.endsWith("package.json") && p !== "package.json").length).toBeLessThanOrEqual(4);
    expect(firstBlock.filter((p) => p.endsWith(".test.ts")).length).toBeLessThanOrEqual(2);
    // real source is fetched before the overflow of package manifests/tests
    expect(firstBlock).toContain("packages/pkg-0/src/index.ts");
  });

  it("is deterministic for identical input", () => {
    const entries = [
      entry("src/b.ts", 200),
      entry("src/a.ts", 200),
      entry("README.md", 10),
      entry("vendor/x.js", 500),
    ];
    expect(paths(prioritize(entries, 4))).toEqual(paths(prioritize(entries, 4)));
  });
});
