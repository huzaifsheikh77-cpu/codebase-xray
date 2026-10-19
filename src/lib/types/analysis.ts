/**
 * Codebase X-Ray — data contract.
 *
 * The presentation layer consumes ONLY this shape. Today it is filled by
 * `src/lib/mock/repo-analysis.ts`; tomorrow the real analysis engine fills
 * the same object and no UI code changes.
 */

/* ---------------------------------- score --------------------------------- */

export type Band = "excellent" | "good" | "fair" | "weak" | "critical";

export interface Score {
  value: number; // 0–100
  band: Band;
}

export type SectorId =
  | "code_quality"
  | "security"
  | "testing"
  | "architecture"
  | "documentation"
  | "maintainability";

export interface Sector {
  id: SectorId;
  label: string;
  score: Score;
  explanation: string;
}

/* -------------------------------- structure ------------------------------- */

export interface TreeNode {
  name: string;
  path: string;
  type: "dir" | "file";
  children?: TreeNode[];
  /** lines of code — files only */
  loc?: number;
  language?: string;
}

export interface RepoStats {
  totalFiles: number;
  /** files whose contents were actually fetched — findings describe this sample */
  analyzedFiles?: number;
  /** LOC counted from fetched content… */
  exactLocFiles?: number;
  /** …and LOC estimated from tree byte sizes (the rest) */
  estimatedLocFiles?: number;
  linesOfCode: number;
  languages: number;
  dependencies: number;
  repoSizeKb: number;
  testFiles: number;
}

export interface Language {
  name: string;
  pct: number;
  loc: number;
  color: string;
}

/* ----------------------------- dependency graph --------------------------- */

export type GraphNodeKind = "app" | "package" | "lib" | "external";

export interface GraphNode {
  id: string;
  label: string;
  cluster: string;
  kind: GraphNodeKind;
}

export interface GraphEdge {
  from: string;
  to: string;
  label?: string;
}

export interface GraphCluster {
  id: string;
  label: string;
  color: string;
}

/* --------------------------------- issues --------------------------------- */

export type Severity = "critical" | "high" | "medium" | "low";

export interface Issue {
  id: string;
  title: string; // e.g. "LARGE FILE SIZE"
  severity: Severity;
  detail: string;
  /** path of the offending file, e.g. "src/components/Editor.tsx" */
  file?: string;
  /** a specific source-code line number (not a count) */
  line?: number;
  /** total lines in the file (e.g. 1248 for a 1,248-line component) */
  fileLineCount?: number;
  evidence?: string[];
  recommendation?: string;
}

/* -------------------------------- insights -------------------------------- */

export interface Insight {
  id: string;
  tag: string; // e.g. "ARCHITECTURE"
  title: string;
  explanation: string;
  evidence: string[];
  recommendation: string;
}

/* ------------------------------ system status ----------------------------- */

export type ServiceStatus = "connected" | "ready" | "degraded" | "offline";

export interface SystemService {
  id: string;
  label: string;
  status: ServiceStatus;
  latencyMs: number;
  lastChecked: string; // ISO timestamp
  version: string;
}

/* ------------------------------ analysis meta ----------------------------- */

/** Machine-readable failure codes shared between the API route and the client. */
export type AnalysisErrorCode =
  | "MALFORMED_URL"
  | "PAYLOAD_TOO_LARGE"
  | "FORBIDDEN_ORIGIN"
  | "NOT_FOUND_OR_PRIVATE"
  | "RATE_LIMITED"
  | "REPO_TOO_LARGE"
  | "EMPTY_REPO"
  | "UNAVAILABLE"
  | "TIMEOUT"
  | "ANALYSIS_FAILED";

export interface AnalysisError {
  code: AnalysisErrorCode;
  /** Human-readable, safe-to-display message (no internal details). */
  message: string;
  /** ISO instant when the GitHub rate-limit window resets (RATE_LIMITED only). */
  resetAt?: string;
}

/* ------------------------------- scan engine ------------------------------ */

export interface ScanStage {
  id: string;
  label: string;
  /** relative duration weight; the driver normalizes to a 5–7s total */
  weight: number;
  /** log lines revealed while this stage runs */
  log: string[];
}

/* ------------------------------- root object ------------------------------ */

export interface RepoAnalysis {
  repo: {
    url: string;
    slug: string;
    owner: string;
    name: string;
    description: string;
    defaultBranch: string;
    stars: number;
    forks: number;
    openIssues: number;
    license: string;
    createdAt: string; // ISO
    pushedAt: string; // ISO
  };
  analysis: {
    generatedAt: string; // ISO
    engineVersion: string;
    durationMs: number;
    scanId: string;
    isDemoData: boolean;
    /** true when the scan degraded (deadline, truncation, budget) — never fabricated */
    partial?: boolean;
    /** human-readable degradation notes shown by the UI */
    warnings?: string[];
    /** GitHub REST quota remaining at scan time (live analysis only) */
    rateLimitRemaining?: number;
  };
  score: {
    overall: Score;
    sectors: Sector[];
  };
  structure: {
    fileTree: TreeNode[];
    stats: RepoStats;
    languages: Language[];
  };
  graph: {
    nodes: GraphNode[];
    edges: GraphEdge[];
    clusters: GraphCluster[];
    /** workspace packages omitted from the node budget (graph is not exhaustive) */
    omittedModules?: number;
  };
  issues: Issue[];
  insights: Insight[];
  system: SystemService[];
}

/** Phase of the one-page experience shell. */
export type ScanPhase = "idle" | "scanning" | "complete" | "error";
