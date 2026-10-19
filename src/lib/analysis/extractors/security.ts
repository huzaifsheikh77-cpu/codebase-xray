import type { AnalysisContext } from "../context";
import { SECRET_LIKE_FILENAMES } from "../limits";
import { fileName } from "../tree-utils";
import type { DependencySignals } from "./dependencies";

/**
 * SECURITY SIGNALS — deliberately conservative (Phase-2 amendment #5):
 * only high-confidence, well-known token formats are matched. Generic
 * "looks like a password" heuristics are intentionally omitted to keep
 * the false-positive rate low. Matched VALUES ARE NEVER STORED OR SENT —
 * only the pattern name, file path and line number survive redaction.
 */

interface SecretPattern {
  /** pattern family name shown in evidence */
  name: string;
  re: RegExp;
}

const SECRET_PATTERNS: SecretPattern[] = [
  { name: "AWS Access Key ID", re: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: "AWS Secret Access Key", re: /\baws_secret_access_key\s*[:=]\s*["'][A-Za-z0-9/+=]{40}["']/ },
  { name: "Private Key Block", re: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY(?: BLOCK)?-----/ },
  { name: "GitHub Token", re: /\bgh[pousr]_[A-Za-z0-9]{36}\b/ },
  { name: "Slack Token", re: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/ },
  { name: "Google API Key", re: /\bAIza[0-9A-Za-z_-]{35}\b/ },
  { name: "Stripe Live Key", re: /\b(?:sk|rk)_live_[0-9a-zA-Z]{24,}\b/ },
];

export interface SecretFinding {
  path: string;
  /** exact 1-based line number — we have the content, so this is real */
  line: number;
  /** pattern family only — the matched value is redacted and discarded */
  pattern: string;
}

export interface SecuritySignals {
  /** committed .env files excluding .example/.sample/.template */
  committedEnvFiles: string[];
  /** filenames that look like they may contain credentials */
  secretLikeFilenames: string[];
  /** conservative secret-pattern findings, values redacted */
  secretFindings: SecretFinding[];
  hasSecurityPolicy: boolean;
  ciWorkflows: string[];
  hasLockfileDependencyProtection: boolean;
}

/** files whose content is never scanned for secrets (noise sources) */
const SCAN_SKIP = /(\.lock$|\.sum$|\.svg$|\.map$)/i;

export function extractSecurity(ctx: AnalysisContext, deps: DependencySignals): SecuritySignals {
  const committedEnvFiles: string[] = [];
  const secretLikeFilenames = new Set<string>();
  const ciWorkflows: string[] = [];
  const secretFindings: SecretFinding[] = [];

  for (const entry of ctx.allEntries) {
    if (entry.type !== "blob") continue;
    const base = fileName(entry.path);

    // committed .env — but .env.example/.sample/.template are GOOD practice
    if (/^\.env(\..+)?$/.test(base) && !/\.(example|sample|template)$/i.test(base)) {
      committedEnvFiles.push(entry.path);
    }

    for (const re of SECRET_LIKE_FILENAMES) {
      if (re.test(base)) {
        secretLikeFilenames.add(entry.path);
        break;
      }
    }

    if (entry.path.startsWith(".github/workflows/") && /\.ya?ml$/.test(base)) {
      ciWorkflows.push(entry.path);
    }
  }

  // Scan only fetched text files (bounded set), skip lockfiles/maps.
  for (const [path, content] of ctx.fetched) {
    if (SCAN_SKIP.test(path)) continue;
    const lines = content.split("\n");
    const cap = Math.min(lines.length, 4000); // bound per-file work
    for (let i = 0; i < cap; i++) {
      for (const { name, re } of SECRET_PATTERNS) {
        re.lastIndex = 0;
        if (re.test(lines[i])) {
          secretFindings.push({ path, line: i + 1, pattern: name });
          break; // one finding per line
        }
      }
      if (secretFindings.length >= 20) break; // hard cap — detector noise guard
    }
    if (secretFindings.length >= 20) break;
  }

  secretFindings.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : a.line - b.line));

  return {
    committedEnvFiles: committedEnvFiles.sort(),
    secretLikeFilenames: [...secretLikeFilenames].sort(),
    secretFindings,
    hasSecurityPolicy: ctx.allEntries.some(
      (e) => e.type === "blob" && /^security(\.md)?$/i.test(fileName(e.path)) && e.path.split("/").length === 1,
    ),
    ciWorkflows: ciWorkflows.sort(),
    hasLockfileDependencyProtection: deps.hasLockfile,
  };
}
