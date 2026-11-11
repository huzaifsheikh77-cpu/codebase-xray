import type { Confidence } from "@/lib/types/analysis";
import type { AnalysisContext } from "./context";
import type { ArchitectureSignals } from "./extractors/architecture";

/**
 * ARCHITECTURE PROFILE — inference with explicit confidence.
 *
 * Folder names are weak evidence. A pattern is only labelled `high` when at
 * least two independent signals agree; a single folder-name signal yields
 * `heuristic`; nothing yields `incomplete`. This replaces the previous
 * behaviour of asserting a layout from one top-level directory.
 */

export interface ArchitectureProfile {
  pattern: string;
  confidence: Confidence;
  evidence: string[];
  limitations: string;
}

const hasDir = (dirs: Set<string>, name: string): boolean => dirs.has(name);

export function inferArchitecture(ctx: AnalysisContext, arch: ArchitectureSignals): ArchitectureProfile {
  const top = new Set(arch.topLevelDirs.map((d) => d.name));
  const evidence: string[] = [];
  const signals: { pattern: string; weight: number; note: string }[] = [];

  if (arch.monorepoWorkspaces) {
    signals.push({ pattern: "monorepo / workspace layout", weight: 2, note: "apps|packages|libs present at the root" });
  }
  if (ctx.fetched.has("pnpm-workspace.yaml") || /"workspaces"\s*:/.test(ctx.fetched.get("package.json") ?? "")) {
    signals.push({ pattern: "monorepo / workspace layout", weight: 3, note: "workspace declaration in a manifest" });
  }
  if (hasDir(top, "src")) {
    signals.push({ pattern: "layered application (src root)", weight: 1, note: "src/ holds the source tree" });
  }
  const layerDirs = ["controllers", "services", "repositories", "models", "routes", "handlers", "domain"].filter((d) =>
    hasDir(top, d),
  );
  if (layerDirs.length >= 2) {
    signals.push({ pattern: "layered (MVC-style) architecture", weight: 2, note: `${layerDirs.length} layer directories at the root` });
  }
  const splitDirs = ["client", "server", "frontend", "backend", "web", "api"].filter((d) => hasDir(top, d));
  if (splitDirs.length >= 2) {
    signals.push({ pattern: "frontend/backend split", weight: 2, note: `root directories: ${splitDirs.join(", ")}` });
  }
  if (hasDir(top, "features") || hasDir(top, "modules")) {
    signals.push({ pattern: "feature/module-oriented structure", weight: 1, note: "features/ or modules/ groups by capability" });
  }
  if (hasDir(top, "plugins") || hasDir(top, "extensions")) {
    signals.push({ pattern: "plugin architecture", weight: 1, note: "plugins/ or extensions/ directory" });
  }
  if (arch.topLevelDirs.length <= 2 && !hasDir(top, "src")) {
    signals.push({ pattern: "flat / single-package layout", weight: 1, note: `${arch.topLevelDirs.length} top-level directories` });
  }

  if (signals.length === 0) {
    return {
      pattern: "undetermined",
      confidence: "incomplete",
      evidence: ["no structural signal met the evidence threshold"],
      limitations: "Architecture cannot be inferred from the inspected sample; no claim is made.",
    };
  }

  // Group by pattern and sum independent weights.
  const grouped = new Map<string, { weight: number; notes: string[] }>();
  for (const s of signals) {
    const g = grouped.get(s.pattern) ?? { weight: 0, notes: [] };
    g.weight += s.weight;
    g.notes.push(s.note);
    grouped.set(s.pattern, g);
  }
  const ranked = [...grouped.entries()].sort((a, b) => b[1].weight - a[1].weight || a[0].localeCompare(b[0]));
  const [pattern, group] = ranked[0];
  for (const note of group.notes) evidence.push(note);

  const confidence: Confidence = group.weight >= 3 ? "high" : group.weight >= 2 ? "heuristic" : "heuristic";

  return {
    pattern,
    confidence,
    evidence,
    limitations:
      confidence === "high"
        ? "Inferred from multiple independent structural signals; runtime wiring and module boundaries were not verified."
        : "Inferred from folder structure only; naming conventions can mislead. Treat as a hypothesis, not a measurement.",
  };
}
