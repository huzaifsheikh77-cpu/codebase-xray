/**
 * Server-only environment access.
 *
 * `GITHUB_TOKEN` is OPTIONAL: without it every scan runs on GitHub's
 * unauthenticated quota (60 requests/hour per IP). With it, 5,000/hour.
 * The value is read at request time on the server and never serialized into
 * a response, a log line, or client-side code.
 */

let warnedAboutFormat = false;

function looksLikeGitHubToken(value: string): boolean {
  return /^(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})$/.test(value);
}

export function githubToken(): string | undefined {
  const raw = process.env.GITHUB_TOKEN?.trim();
  if (!raw) return undefined;

  if (!looksLikeGitHubToken(raw) && !warnedAboutFormat) {
    warnedAboutFormat = true;
    // Never log the value itself — only the fact that the format is unexpected.
    console.warn(
      "[xray] GITHUB_TOKEN is set but does not look like a GitHub token (expected ghp_…/github_pat_…). Requests still use it.",
    );
  }
  return raw;
}

/** True when the deployment can spend authenticated GitHub quota. */
export function hasGitHubToken(): boolean {
  return Boolean(process.env.GITHUB_TOKEN?.trim());
}

/** A real Vercel production deployment (preview/development excluded). */
export function isVercelProduction(): boolean {
  return process.env.VERCEL_ENV === "production";
}

/**
 * Production refuses anonymous scans by default: one medium scan costs more
 * than GitHub's entire 60 requests/hour anonymous budget. Set
 * ALLOW_ANONYMOUS_GITHUB=1 to opt out deliberately.
 */
export function githubTokenRequired(): boolean {
  return isVercelProduction() && !hasGitHubToken() && process.env.ALLOW_ANONYMOUS_GITHUB !== "1";
}
