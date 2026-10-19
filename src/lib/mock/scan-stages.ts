import type { ScanStage } from "@/lib/types/analysis";

/**
 * The nine scan stages of the simulated analysis.
 * `weight` is relative; the timer driver normalizes all weights to the
 * total scan duration (5–7s). Pure data — no timing logic here.
 */
export const SCAN_STAGES: ScanStage[] = [
  {
    id: "init",
    label: "INITIALIZING X-RAY",
    weight: 6,
    log: [
      "xray.engine v2.7.3 — cold start",
      "loading analysis profiles",
      "sandbox ready",
    ],
  },
  {
    id: "connect",
    label: "CONNECTING TO GITHUB",
    weight: 7,
    log: [
      "resolving github.com",
      "tls handshake ok",
      "rate-limit budget: 4,981 / 5,000",
    ],
  },
  {
    id: "fetch",
    label: "FETCHING REPOSITORY",
    weight: 14,
    log: [
      "GET repos/nebula-labs/orbit-forge",
      "cloning @ 12.4 MB/s",
      "objects: 18,204 · delta: 312",
    ],
  },
  {
    id: "parse",
    label: "PARSING FILE STRUCTURE",
    weight: 12,
    log: [
      "walking tree (depth 9)",
      "indexing 1,248 files",
      "ast parse: ts/tsx/py/go",
    ],
  },
  {
    id: "deps",
    label: "ANALYZING DEPENDENCIES",
    weight: 11,
    log: [
      "resolving 12 direct deps",
      "lockfile audit: 0 critical",
      "graph edges: 47",
    ],
  },
  {
    id: "quality",
    label: "SCANNING CODE QUALITY",
    weight: 13,
    log: [
      "complexity pass · 6 hotspots",
      "duplication: 4.2%",
      "type coverage: 91.4%",
    ],
  },
  {
    id: "security",
    label: "CHECKING SECURITY",
    weight: 12,
    log: [
      "secret scan: 1 finding",
      "sast rules: 214 applied",
      "supply chain: 2 advisories",
    ],
  },
  {
    id: "map",
    label: "BUILDING CODEBASE MAP",
    weight: 12,
    log: [
      "clustering modules",
      "iso projection: 8 sectors",
      "layout solver converged",
    ],
  },
  {
    id: "report",
    label: "GENERATING REPORT",
    weight: 13,
    log: [
      "scoring 6 sectors",
      "compiling evidence chains",
      "report ready",
    ],
  },
];
