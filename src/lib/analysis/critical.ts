/**
 * CRITICAL-PATH CLASSIFICATION.
 *
 * File coverage alone says nothing about whether the parts that matter were
 * inspected. A scan can read 90% of a repository and still miss the auth
 * module, the database layer and every API route.
 *
 * This module classifies paths into the categories whose absence would make a
 * security or architecture assessment misleading. Classification is
 * PATH-BASED — it is a prioritisation and disclosure signal, never a claim
 * that a file implements a behaviour. Content-based confirmation happens (if
 * at all) in the detectors, and is labelled separately.
 */

export type CriticalCategory =
  | "entry"
  | "api"
  | "auth"
  | "data"
  | "security-config"
  | "test";

export interface CriticalClass {
  category: CriticalCategory;
  /** why this path is considered critical — shown to the user */
  reason: string;
}

interface Rule {
  category: CriticalCategory;
  reason: string;
  test: (path: string, base: string, depth: number) => boolean;
}

const RULES: Rule[] = [
  {
    category: "security-config",
    reason: "security or deployment configuration",
    test: (p, base) =>
      /^(security\.md|\.env(\..+)?|Dockerfile.*|docker-compose.*|nginx\.conf|Caddyfile)$/i.test(base) ||
      /(^|\/)(\.github\/workflows|terraform|helm|k8s|kubernetes|deploy)(\/|$)/i.test(p) ||
      /(^|\/)(security|auth)\.(config|conf)\.[cm]?[jt]s$/i.test(p),
  },
  {
    category: "auth",
    reason: "authentication or authorization code",
    test: (p) =>
      /(^|\/)(auth|authentication|authorization|oauth|oauth2|session|sessions|jwt|rbac|acl|permissions?|login|logout|signup|password|passport)(\/|[-_.]|$)/i.test(
        p,
      ) ||
      /(^|\/)middleware(\/|[-_.]|$)/i.test(p),
  },
  {
    category: "api",
    reason: "API surface or request handling",
    test: (p) =>
      /(^|\/)(api|routes?|router|controllers?|handlers?|endpoints?|resolvers?|graphql|grpc|webhooks?)(\/|[-_.]|$)/i.test(
        p,
      ),
  },
  {
    category: "data",
    reason: "persistence or data-access code",
    test: (p) =>
      /(^|\/)(db|database|databases|models?|entities|repositories?|repository|migrations?|schema|schemas|prisma|orm|sequelize|typeorm|drizzle|sql|queries|persistence)(\/|[-_.]|$)/i.test(
        p,
      ),
  },
  {
    category: "entry",
    reason: "application entry point",
    test: (p, base, depth) =>
      depth <= 2 && /^(index|main|server|app|cli|__main__|mod)\.(ts|tsx|js|jsx|mjs|cjs|py|go|rs|java|kt)$/i.test(base),
  },
  {
    category: "test",
    reason: "test or fixture code",
    test: (p) => /(\.(test|spec)\.[cm]?[jt]sx?$|_test\.(go|py|rs)$|(^|\/)(tests?|__tests__|spec)(\/|$))/i.test(p),
  },
];

export function classifyCritical(path: string): CriticalClass | null {
  const base = path.split("/").pop() ?? path;
  const depth = path.split("/").length - 1;
  for (const rule of RULES) {
    if (rule.test(path, base, depth)) return { category: rule.category, reason: rule.reason };
  }
  return null;
}

export interface CriticalCoverageEntry {
  category: CriticalCategory;
  discovered: number;
  inspected: number;
}

/**
 * Per-category discovered vs inspected counts. `allPaths` are the pruned,
 * eligible paths; `inspected` is what actually reached the parser budget.
 * Categories with zero discovered files are omitted rather than reported as
 * a misleading 100%.
 */
export function criticalCoverage(allPaths: string[], inspected: Set<string>): CriticalCoverageEntry[] {
  const counts = new Map<CriticalCategory, { discovered: number; inspected: number }>();
  for (const path of allPaths) {
    const cls = classifyCritical(path);
    if (!cls) continue;
    const entry = counts.get(cls.category) ?? { discovered: 0, inspected: 0 };
    entry.discovered++;
    if (inspected.has(path)) entry.inspected++;
    counts.set(cls.category, entry);
  }
  return [...counts.entries()]
    .map(([category, v]) => ({ category, ...v }))
    .sort((a, b) => b.discovered - a.discovered);
}

/** Security-relevant categories whose absence weakens the assessment. */
const SECURITY_SENSITIVE: CriticalCategory[] = ["auth", "api", "data", "security-config"];

/**
 * Warnings for critical categories that exist but were only partly (or not
 * at all) inspected. Returns [] when every discovered critical file was read.
 */
export function criticalCoverageWarnings(entries: CriticalCoverageEntry[]): string[] {
  const warnings: string[] = [];
  for (const entry of entries) {
    if (entry.discovered === 0 || entry.inspected === entry.discovered) continue;
    if (!SECURITY_SENSITIVE.includes(entry.category)) continue;
    const label = entry.category.toUpperCase().replace(/-/g, " ");
    warnings.push(
      `CRITICAL PATH NOT FULLY INSPECTED — ${label}: ${entry.inspected} OF ${entry.discovered} FILES READ. FINDINGS MAY NOT COVER THIS AREA.`,
    );
  }
  return warnings;
}
