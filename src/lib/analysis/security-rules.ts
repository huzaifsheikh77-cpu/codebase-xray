import type { Severity, Confidence } from "@/lib/types/analysis";
import type { AnalysisContext } from "./context";
import { scanTodos } from "./parsers/common";

/**
 * SECURITY RISK RULES — pattern-level indicators, never confirmed
 * vulnerabilities.
 *
 * Every rule declares:
 *   - what it detects,
 *   - how confident that detection is,
 *   - what the evidence does NOT prove,
 *   - how a human would verify it.
 *
 * No matched value is ever stored: only the rule id, file and line.
 */

export interface SecurityRisk {
  ruleId: string;
  title: string;
  severity: Severity;
  confidence: Confidence;
  path: string;
  line: number;
  detail: string;
  consequence: string;
  verification: string;
  recommendation: string;
}

interface Rule {
  id: string;
  title: string;
  severity: Severity;
  confidence: Confidence;
  /** only run on these extensions (empty = all text) */
  extensions: string[];
  re: RegExp;
  detail: string;
  consequence: string;
  verification: string;
  recommendation: string;
}

const RULES: Rule[] = [
  {
    id: "SEC-EVAL",
    title: "DYNAMIC CODE EXECUTION",
    severity: "medium",
    confidence: "high",
    extensions: ["ts", "tsx", "js", "jsx", "mjs", "cjs"],
    re: /\beval\s*\(|\bnew\s+Function\s*\(/,
    detail: "Source passes strings to eval() or the Function constructor.",
    consequence: "Any untrusted input reaching this call becomes arbitrary code execution.",
    verification: "Trace whether the evaluated string can contain request, file or environment data.",
    recommendation: "Replace with an explicit parser/dispatch table; if unavoidable, allowlist the accepted expressions.",
  },
  {
    id: "SEC-CMD",
    title: "SHELL COMMAND CONSTRUCTION",
    severity: "high",
    confidence: "heuristic",
    extensions: ["ts", "tsx", "js", "jsx", "py"],
    re: /(?:child_process|subprocess)[\s\S]{0,80}?(?:exec|execSync|Popen|call)\s*\(\s*(?:`[^`]*\$\{|[\w.\][]+\s*\+)/,
    detail: "A shell/process call appears to be built from an interpolated or concatenated string.",
    consequence: "Command injection when any interpolated component is attacker-influenced.",
    verification: "Confirm the interpolated value's origin; check whether execFile/spawn with an argument array is used instead.",
    recommendation: "Use an argument array with execFile/spawn (no shell), and validate all interpolated values against an allowlist.",
  },
  {
    id: "SEC-HTML",
    title: "RAW HTML INJECTION SINK",
    severity: "medium",
    confidence: "high",
    extensions: ["tsx", "jsx", "js", "ts"],
    re: /dangerouslySetInnerHTML|\.innerHTML\s*=/,
    detail: "Content is written as raw HTML rather than text.",
    consequence: "Cross-site scripting if the content includes user or repository-derived data.",
    verification: "Check whether the value is a static constant or derives from input; look for a sanitiser on the path.",
    recommendation: "Render as text, or sanitise with a maintained HTML sanitiser before injection.",
  },
  {
    id: "SEC-SQL",
    title: "SQL STRING INTERPOLATION",
    severity: "high",
    confidence: "heuristic",
    extensions: ["ts", "tsx", "js", "jsx", "py", "rb", "php", "go", "java"],
    re: /(?:SELECT|INSERT\s+INTO|UPDATE|DELETE\s+FROM)[^;\n]{0,120}(?:\$\{|\+\s*[\w.]|%s|'\s*\+)/i,
    detail: "A SQL statement appears to be assembled with interpolation or concatenation.",
    consequence: "SQL injection if any interpolated fragment is user-controlled.",
    verification: "Confirm whether the query uses bound parameters elsewhere; inspect the interpolated variable's source.",
    recommendation: "Use parameterised queries exclusively; never interpolate identifiers without an allowlist.",
  },
  {
    id: "SEC-TLS",
    title: "TLS VERIFICATION DISABLED",
    severity: "high",
    confidence: "high",
    extensions: ["ts", "tsx", "js", "jsx", "py"],
    re: /rejectUnauthorized\s*:\s*false|NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*["']?0/,
    detail: "Certificate validation is explicitly disabled in this code or configuration.",
    consequence: "Any network attacker on the path can impersonate the remote endpoint.",
    verification: "Check whether this is scoped to a local development branch and excluded from production builds.",
    recommendation: "Remove the override and trust the system CA store; use a development-only CA instead.",
  },
  {
    id: "SEC-WEAK-HASH",
    title: "WEAK CRYPTOGRAPHIC HASH",
    severity: "low",
    confidence: "high",
    extensions: ["ts", "tsx", "js", "jsx", "py", "go", "java", "rb", "php"],
    re: /createHash\s*\(\s*["'](?:md5|sha1)["']|hashlib\.(?:md5|sha1)\s*\(/i,
    detail: "MD5 or SHA-1 is used for hashing.",
    consequence: "Collision and preimage weaknesses make these unsuitable for integrity or password storage.",
    verification: "Confirm whether the hash is used for non-security purposes (cache keys, checksums).",
    recommendation: "Use SHA-256 for integrity and a memory-hard KDF (argon2/bcrypt/scrypt) for passwords.",
  },
  {
    id: "SEC-CORS",
    title: "PERMISSIVE CORS POLICY",
    severity: "low",
    confidence: "heuristic",
    extensions: ["ts", "tsx", "js", "jsx", "py", "go", "rb", "php"],
    re: /Access-Control-Allow-Origin["']?\s*[,:]\s*["']\*["']|cors\s*\(\s*\{\s*origin\s*:\s*["']\*["']/,
    detail: "Any origin is allowed to call this endpoint.",
    consequence: "Browser-based cross-origin reads become possible for unauthenticated resources.",
    verification: "Check whether the affected route serves authenticated or personal data.",
    recommendation: "Allowlist known origins and send credentials only to those origins.",
  },
  {
    id: "SEC-JWT",
    title: "JWT READ WITHOUT VERIFICATION",
    severity: "medium",
    confidence: "heuristic",
    extensions: ["ts", "tsx", "js", "jsx"],
    re: /\bjwt\.decode\s*\(/,
    detail: "A JWT is decoded without an accompanying verify() call in this file.",
    consequence: "Claims read from an unverified token can be forged by anyone.",
    verification: "Confirm no verify()/jwtVerify() runs on the same value before it is trusted.",
    recommendation: "Verify the signature and claims before reading authorization data from a token.",
  },
];

const SKIP_PATH = /(\.min\.(?:js|css)$|\.map$|\.lock$)/i;

function extOf(path: string): string {
  const base = path.split("/").pop() ?? "";
  const dot = base.lastIndexOf(".");
  return dot === -1 ? "" : base.slice(dot + 1).toLowerCase();
}

export function detectSecurityRisks(ctx: AnalysisContext, limit = 12): SecurityRisk[] {
  const risks: SecurityRisk[] = [];
  const seen = new Set<string>();
  let scanned = 0;

  for (const [path, content] of ctx.fetched) {
    if (SKIP_PATH.test(path)) continue;
    if (++scanned > 150) break;
    if (content.length > 200_000) continue;
    const ext = extOf(path);
    const lines = content.split("\n");
    const cap = Math.min(lines.length, 6_000);

    for (const rule of RULES) {
      if (risks.length >= limit) break;
      if (rule.extensions.length > 0 && !rule.extensions.includes(ext)) continue;
      const key = `${rule.id}::${path}`;
      if (seen.has(key)) continue;

      let hit = -1;
      for (let i = 0; i < cap; i++) {
        rule.re.lastIndex = 0;
        if (rule.re.test(lines[i])) {
          hit = i + 1;
          break;
        }
      }
      if (hit === -1) continue;

      seen.add(key);
      risks.push({
        ruleId: rule.id,
        title: rule.title,
        severity: rule.severity,
        confidence: rule.confidence,
        path,
        line: hit,
        detail: rule.detail,
        consequence: rule.consequence,
        verification: rule.verification,
        recommendation: rule.recommendation,
      });
    }
    if (risks.length >= limit) break;
  }

  risks.sort(
    (a, b) =>
      ({ critical: 0, high: 1, medium: 2, low: 3 } as const)[a.severity] -
        ({ critical: 0, high: 1, medium: 2, low: 3 } as const)[b.severity] ||
      a.path.localeCompare(b.path),
  );
  return risks;
}

/** Small helper used by detectors to keep TODO evidence exact. */
export function todoMarkers(content: string, limit = 20): { line: number; tag: string }[] {
  return scanTodos(content, limit);
}
