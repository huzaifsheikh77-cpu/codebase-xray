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
