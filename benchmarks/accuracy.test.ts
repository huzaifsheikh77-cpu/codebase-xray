import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ENGINE_VERSION } from "@/lib/analysis/pipeline";
import { CASES } from "./cases";
import { runCase, summarise, type BenchmarkReport } from "./runner";

const OUT_DIR = process.env.BENCHMARK_OUT_DIR
  ? path.resolve(process.env.BENCHMARK_OUT_DIR)
  : path.resolve(__dirname, "../docs/engineering/benchmarks");

function toMarkdown(report: BenchmarkReport): string {
  const pct = (v: number | null) => (v === null ? "n/a" : `${(v * 100).toFixed(1)}%`);
  const rows = report.cases
    .map(
      (c) =>
        `| ${c.id} | ${c.inspected}/${c.eligible} | ${c.inspectedPct}% | ${c.parsed} | ${c.nodes}/${c.edges} | ${c.truePositives.length} | ${c.falsePositives.length} | ${c.falseNegatives.length} | ${c.durationMs} ms | ${c.requests} |`,
    )
    .join("\n");

  const details = report.cases
    .map((c) => {
      const parts = [`### ${c.id}`, "", c.description, ""];
      parts.push(`- inspected: ${c.inspected}/${c.eligible} (${c.inspectedPct}%) · parsed ${c.parsed} · failures ${c.parseFailures}`);
      parts.push(`- graph: ${c.nodes} nodes / ${c.edges} edges · unresolved ${c.unresolvedImports}`);
      if (c.edgeList.length) parts.push(`- edges: ${c.edgeList.join(", ")}`);
      parts.push(
        `- findings: TP ${c.truePositives.length} · FP ${c.falsePositives.length} · FN ${c.falseNegatives.length} · unlabelled ${c.unlabelled.length}`,
      );
      if (c.truePositives.length) parts.push(`- detected: ${c.truePositives.join(", ")}`);
      if (c.falseNegatives.length) parts.push(`- **missed**: ${c.falseNegatives.join(", ")}`);
      if (c.falsePositives.length) parts.push(`- **false positives**: ${c.falsePositives.join(", ")}`);
      if (c.unlabelled.length) parts.push(`- unlabelled (excluded from metrics): ${c.unlabelled.join(", ")}`);
      parts.push(`- critical-path recall: ${c.criticalInspected}/${c.criticalExpected}`);
      parts.push(`- structural assertions: capability ${c.capabilityOk ? "pass" : "FAIL"} · edges ${c.edgeOk ? "pass" : "FAIL"}`);
      if (c.error) parts.push(`- **error**: ${c.error}`);
      return parts.join("\n");
    })
    .join("\n\n");

  return `# Analysis Accuracy Benchmark — latest run

Generated: ${report.generatedAt}
Engine: ${report.engineVersion}

> These metrics are measured against **controlled fixtures with explicit
> ground truth**. They validate the engine against its own documented rules;
> they are not a claim of accuracy on arbitrary public repositories.
> Unlabelled detections are listed but excluded from precision/recall.

## Totals

| Metric | Value |
|---|---|
| Labelled findings (TP) | ${report.totals.tp} |
| False positives | ${report.totals.fp} |
| Missed (FN) | ${report.totals.fn} |
| Precision | ${pct(report.totals.precision)} |
| Recall | ${pct(report.totals.recall)} |
| F1 | ${pct(report.totals.f1)} |
| Critical-path selection recall | ${report.totals.criticalInspected}/${report.totals.criticalExpected} (${pct(report.totals.criticalRecall)}) |
| Structural assertions | ${report.totals.structuralPassed}/${report.totals.structuralChecks} |

## Cases

| Case | Inspected | Coverage | Parsed | Graph | TP | FP | FN | Time | Requests |
|---|---|---|---|---|---|---|---|---|---|
${rows}

## Detail

${details}
`;
}

describe("analysis accuracy benchmark", () => {
  it("runs the labelled corpus, writes artifacts and enforces thresholds", async () => {
    const cases = [];
    for (const c of CASES) cases.push(await runCase(c));
    const report = summarise(cases, ENGINE_VERSION);

    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(path.join(OUT_DIR, "latest.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
    fs.writeFileSync(path.join(OUT_DIR, "latest.md"), toMarkdown(report), "utf8");

    // Every fixture must complete.
    expect(report.cases.filter((c) => c.error)).toEqual([]);

    // No labelled negative may fire.
    expect(report.totals.fp).toBe(0);

    // All expected findings must be found (ground truth is constructed from
    // the detectors' own documented rules).
    expect(report.totals.fn).toBe(0);

    // Structural assertions (capability depth + edges) must all hold.
    expect(report.totals.structuralPassed).toBe(report.totals.structuralChecks);

    // Critical paths in the fixtures must all be inspected.
    expect(report.totals.criticalRecall).toBe(1);
  });
});
