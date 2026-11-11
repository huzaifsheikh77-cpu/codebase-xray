import type { ScanStage } from "@/lib/types/analysis";

/**
 * The nine stages of the scan readout.
 *
 * These lines describe what the engine actually does. They are NOT
 * telemetry: no cloning speed, no AST-progress counters, no invented quota
 * numbers. The UI labels the progress as illustrative because the real work
 * happens server-side in one request.
 *
 * `weight` is relative; the timer driver normalizes all weights to the
 * animation duration. Pure data — no timing logic here.
 */
export const SCAN_STAGES: ScanStage[] = [
  {
    id: "init",
    label: "INITIALIZING X-RAY",
    weight: 6,
    log: ["xray.engine v3.0.0", "loading inspection budget", "deterministic engine ready"],
  },
  {
    id: "connect",
    label: "CONNECTING TO GITHUB",
    weight: 7,
    log: ["requesting repository metadata", "GitHub REST API (server-side)", "no repository code is executed"],
  },
  {
    id: "fetch",
    label: "READING FILE TREE",
    weight: 14,
    log: ["fetching recursive tree", "classifying files", "applying content filters"],
  },
  {
    id: "parse",
    label: "PARSING SOURCE STRUCTURE",
    weight: 12,
    log: ["prioritising files within budget", "parsing TypeScript/JavaScript syntax trees", "Python uses indentation analysis"],
  },
  {
    id: "deps",
    label: "ANALYZING DEPENDENCIES",
    weight: 11,
    log: ["reading manifests and lockfiles", "resolving workspace relationships", "mapping import specifiers"],
  },
  {
    id: "quality",
    label: "MEASURING CODE STRUCTURE",
    weight: 13,
    log: ["measuring function spans", "counting decision points", "comparing normalised blocks"],
  },
  {
    id: "security",
    label: "CHECKING SECURITY SIGNALS",
    weight: 12,
    log: ["scanning credential patterns (values redacted)", "checking risky configuration patterns", "recording verification advice"],
  },
  {
    id: "map",
    label: "BUILDING CODEBASE MAP",
    weight: 12,
    log: ["grouping modules", "resolving aliases", "counting unresolved imports"],
  },
  {
    id: "report",
    label: "GENERATING REPORT",
    weight: 13,
    log: ["scoring six sectors", "attaching evidence", "writing coverage limits"],
  },
];
