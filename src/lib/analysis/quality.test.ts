import { describe, expect, it } from "vitest";
import { parseFiles } from "./parsers/registry";
import { extractQuality } from "./quality";

function analyse(files: Record<string, string>) {
  const fetched = new Map(Object.entries(files));
  return extractQuality(parseFiles(fetched), fetched);
}

describe("extractQuality", () => {
  it("measures long functions from real spans, with a line number", () => {
    const body = Array.from({ length: 90 }, (_, i) => `  const v${i} = ${i};`).join("\n");
    const source = `export function huge() {\n${body}\n  return v0;\n}`;
    const quality = analyse({ "src/huge.ts": source });

    expect(quality.functionsMeasured).toBe(1);
    expect(quality.longFunctions).toHaveLength(1);
    expect(quality.longFunctions[0]).toMatchObject({ path: "src/huge.ts", name: "huge", line: 1 });
    expect(quality.longFunctions[0].lines).toBeGreaterThan(80);
  });

  it("flags high complexity and excessive parameters", () => {
    const branches = Array.from({ length: 20 }, (_, i) => `  if (a > ${i}) { b++; }`).join("\n");
    const quality = analyse({
      "src/branchy.ts": `export function tangled(a, b, c, d, e, f) {\n${branches}\n  return b;\n}`,
    });
    expect(quality.complexFunctions[0]).toMatchObject({ name: "tangled" });
    expect(quality.complexFunctions[0].complexity).toBeGreaterThan(15);
    expect(quality.highParamFunctions[0]).toMatchObject({ name: "tangled", params: 6 });
  });

  it("detects an identical normalised block across two files", () => {
    const block = [
      "export function validateTarget(target: string): boolean {",
      "  if (!target) { return false; }",
      "  const parts = target.split('/');",
      "  if (parts.length !== 2) { return false; }",
      "  const [owner, repo] = parts;",
      "  return Boolean(owner && repo);",
      "}",
    ].join("\n");
    const quality = analyse({
      "packages/web/src/validate.ts": block,
      "packages/cli/src/validate.ts": block,
    });
    expect(quality.duplicateGroups.length).toBeGreaterThanOrEqual(1);
    expect(quality.duplicateGroups[0].files).toHaveLength(2);
  });

  it("states its own limitations and degrades safely with no parseable content", () => {
    const quality = analyse({ "README.md": "# only docs" });
    expect(quality.functionsMeasured).toBe(0);
    expect(quality.averageFunctionLines).toBe(0);
    expect(quality.limitations.some((l) => /no function spans/i.test(l))).toBe(true);
    expect(quality.limitations.some((l) => /similarity signal/i.test(l))).toBe(true);
  });
});
