/**
 * SCORING WEIGHTS — the single source of truth for how each sector score
 * is computed. Every entry is documented so scores are explainable.
 *
 * Conventions:
 * - Each signal maps to a 0–100 sub-score; the sector score is the weighted
 *   mean of its signals.
 * - Small-repository damping (see sectors.ts): repositories below
 *   SMALL_REPO_* thresholds produce low-confidence evidence, so the sector
 *   score is pulled toward the neutral 50 midpoint instead of the extreme —
 *   a 3-file repo must not yield a misleading 0 or 100.
 */

export const SMALL_REPO_MIN_SOURCES = 10;
export const SMALL_REPO_MIN_LOC = 1_000;

/** overall = Σ sectorWeight × sectorScore (weights sum to 1) */
export const SECTOR_WEIGHTS = {
  code_quality: 0.2,
  security: 0.2,
  testing: 0.15,
  architecture: 0.15,
  documentation: 0.15,
  maintainability: 0.15,
} as const;

/** Code Quality — penalised by size extremes, TODO churn and nesting */
export const CODE_QUALITY_WEIGHTS = {
  oversizedRatio: 40, // share of source modules exceeding review thresholds
  largestFileShare: 25, // largest module's share of total LOC
  todoDensity: 20, // TODO/FIXME/HACK density in fetched files
  nesting: 15, // deep-path pressure
} as const;

/** Security — starts from 100 and subtracts for real findings */
export const SECURITY_PENALTIES = {
  committedEnvFile: 25, // each committed .env (capped below)
  committedEnvCap: 50,
  secretFinding: 20, // each high-confidence pattern hit (capped below)
  secretFindingsCap: 60,
  secretLikeFilename: 10, // per file, capped
  secretLikeFilenamesCap: 20,
} as const;
export const SECURITY_BONUSES = {
  securityPolicy: 5, // SECURITY.md
  lockfile: 5, // reproducible dependency resolution
  envExample: 5, // documented configuration surface
} as const;

/** Testing — ratio-driven with framework/config bonuses */
export const TESTING_WEIGHTS = {
  coverageRatio: 80, // testFiles / sourceFiles, mapped through RATIO_TARGET
  framework: 10,
  config: 10,
} as const;
/** a 1:2 test:source ratio scores full marks on the ratio signal */
export const TESTING_RATIO_TARGET = 0.5;

/** Architecture */
export const ARCHITECTURE_WEIGHTS = {
  organization: 35, // src-dir / workspace organization
  oversizedPressure: 30, // oversized modules as share of sources
  nesting: 20, // deep-path pressure
  godDirs: 15, // extreme directory outliers
} as const;

/** Documentation — additive points, clamped to 100 */
export const DOCUMENTATION_POINTS = {
  readmeFull: 35,
  readmeStub: 15,
  contributing: 15,
  license: 20,
  docsDirectory: 10,
  apiDocs: 5,
  envExample: 5,
  securityPolicy: 5,
  richMarkdown: 5, // ≥ 10 markdown files
} as const;

/** Maintainability */
export const MAINTAINABILITY_WEIGHTS = {
  dependencyLoad: 30, // direct dependency count vs a sane ceiling
  ciAutomation: 25, // CI pipelines present
  fileSpread: 25, // LOC concentration (1 - largest-file share)
  lockfile: 10,
  pinning: 10, // pinned versions where measurable
} as const;
/** more than this many direct dependencies starts to cost points */
export const DEPENDENCY_CEILING = 40;
