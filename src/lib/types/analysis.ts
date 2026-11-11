/**
 * Codebase X-Ray — data contract.
 *
 * The presentation layer consumes ONLY this shape. Every field that is
 * optional is optional for backwards compatibility with the demo fixture;
 * the live engine always populates the measurement/limitation fields.
 *
 * Confidence vocabulary (used by issues, sectors and coverage):
 *   verified   — measured from content we actually fetched (exact counts)
 *   high       — deterministic detection over fetched content/metadata
 *   heuristic  — structural inference from paths/patterns (can be wrong)
 *   incomplete — insufficient evidence to make a claim
 */

/* ---------------------------------- score --------------------------------- */

export type Band = "excellent" | "good" | "fair" | "weak" | "critical";

export type Confidence = "verified" | "high" | "heuristic" | "incomplete";

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
  /** how much evidence the score rests on (never a fake precision claim) */
  confidence?: Confidence;
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
  /** files classified as source code in the eligible tree */
  sourceFiles?: number;
  /** files that passed through a language parser (content available) */
  parsedFiles?: number;
  /** measured functions across parsed files */
  measuredFunctions?: number;
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

export type IssueCategory =
  | "security"
  | "architecture"
  | "quality"
  | "testing"
  | "documentation"
  | "dependencies"
  | "maintainability";

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

  /* --- evidence model (vNext) --- */
  category?: IssueCategory;
  confidence?: Confidence;
  /** how the finding was produced, e.g. "AST scan of fetched content" */
  detectionMethod?: string;
  /** what this finding does NOT prove */
  limitation?: string;
  /** every file the finding refers to (primary `file` first) */
  affectedFiles?: string[];
}

/* -------------------------------- insights -------------------------------- */

export interface Insight {
  id: string;
  tag: string; // e.g. "ARCHITECTURE"
  title: string;
  explanation: string;
  evidence: string[];
  recommendation: string;
  confidence?: Confidence;
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
  | "PRIVATE_REPOSITORY_NOT_SUPPORTED"
  | "INVALID_REPOSITORY_METADATA"
  | "RATE_LIMITED"
  | "SCAN_IN_PROGRESS"
  | "QUOTA_UNAVAILABLE"
  | "CONFIGURATION_REQUIRED"
  | "EMPTY_REPO"
  | "UNAVAILABLE"
  | "TIMEOUT"
  | "CANCELLED"
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
  /** relative duration weight; the driver normalizes to a total duration */
  weight: number;
  /** log lines revealed while this stage runs — descriptive, never telemetry */
  log: string[];
}

/* ------------------------------ coverage/budget --------------------------- */

/** Exactly what the scan inspected, so "partial" is never a vague claim. */
export interface AnalysisCoverage {
  /** files eligible after pruning (binaries/vendored/oversized removed) */
  eligibleFiles: number;
  /** files whose content was fetched and analysed */
  inspectedFiles: number;
  inspectedPct: number;
  eligibleBytes: number;
  inspectedBytes: number;
  /** files passed through a language parser */
  parsedFiles: number;
  /** parser failures / unreadable files */
  parseFailures: number;
  /** internal imports that could not be mapped to a module node */
  unresolvedImports: number;
  /** tree was truncated by GitHub (100k entries) */
  truncated: boolean;
  /** languages actually parsed with an AST (not heuristics) */
  astLanguages?: string[];
  /** prioritized files that did not fit the byte/file/deadline budget */
  skippedForBudget?: number;
  /** source-like files that no parser claims */
  unsupportedSourceFiles?: number;
  /** per-category critical-path coverage (path-based classification) */
  critical?: { category: string; discovered: number; inspected: number }[];
  /** inspected files by parser depth */
  capabilities?: { full: number; partial: number; importOnly: number; unsupported: number };
}

export interface AnalysisBudget {
  maxFiles: number;
  maxTotalBytes: number;
  maxFileBytes: number;
  concurrency: number;
  deadlineMs: number;
  tier: "small" | "medium" | "large" | "huge";
}

/** Public, secret-free description of the optional AI layer. */
export interface AiStatus {
  available: boolean;
  provider: string;
  model: string | null;
  reason?: string;
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
    /** methodology version — scores are only comparable within a version */
    scoringVersion?: string;
    coverage?: AnalysisCoverage;
    budget?: AnalysisBudget;
    ai?: AiStatus;
    /** short-lived, integrity-protected binding for optional AI requests */
    aiToken?: string;
  };
  score: {
    overall: Score;
    sectors: Sector[];
  };
  structure: {
    fileTree: TreeNode[];
    stats: RepoStats;
    languages: Language[];
    /** inferred layout/pattern, with the evidence and confidence behind it */
    architectureProfile?: {
      pattern: string;
      confidence: Confidence;
      evidence: string[];
      limitations: string;
    };
  };
  graph: {
    nodes: GraphNode[];
    edges: GraphEdge[];
    clusters: GraphCluster[];
    /** workspace packages omitted from the node budget (graph is not exhaustive) */
    omittedModules?: number;
    /** internal imports that could not be resolved onto a node */
    unresolvedImports?: number;
  };
  issues: Issue[];
  insights: Insight[];
  system: SystemService[];
}

/** Phase of the one-page experience shell. */
export type ScanPhase = "idle" | "scanning" | "complete" | "error";
