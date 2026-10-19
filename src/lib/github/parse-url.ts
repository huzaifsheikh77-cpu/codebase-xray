/**
 * Parse a user-supplied GitHub repository reference into `{ owner, repo }`.
 *
 * Accepts:
 *   https://github.com/{owner}/{repo}
 *   http://github.com/{owner}/{repo}
 *   github.com/{owner}/{repo}
 *   {owner}/{repo}
 * ...with an optional trailing `.git`, trailing `/`, and an optional
 * `/tree/...` or `/blob/...` suffix (the ref part is ignored — analysis
 * always targets the default branch).
 *
 * Pure function — no network, no exceptions. Returns `null` for anything
 * that is not an unambiguous public-repo reference. The client-side check
 * is UX only; the server re-validates through this module.
 */

export interface ParsedRepoUrl {
  owner: string;
  repo: string;
}

const OWNER_RE = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/; // GitHub username rules
const REPO_RE = /^[A-Za-z0-9._-]{1,100}$/;

export function parseRepoUrl(input: string): ParsedRepoUrl | null {
  const raw = input.trim();
  if (!raw || raw.length > 300) return null;

  let segments: string[];

  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) || raw.startsWith("github.com/") || raw.startsWith("www.github.com/")) {
    let url: URL;
    try {
      url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`);
    } catch {
      return null;
    }
    if (url.hostname.replace(/^www\./, "").toLowerCase() !== "github.com") return null;
    if (url.username || url.password || url.search || url.hash) return null;
    segments = url.pathname.split("/").filter(Boolean);
  } else {
    // bare "owner/repo" shorthand
    segments = raw.split("/").filter(Boolean);
    if (segments.length !== 2) return null;
  }

  if (segments.length < 2) return null;
  // tolerate /tree/<ref> and /blob/<ref> deep links
  if (segments.length > 2 && !["tree", "blob"].includes(segments[2])) return null;

  const owner = segments[0];
  let repo = segments[1];
  if (repo.toLowerCase().endsWith(".git")) repo = repo.slice(0, -4);
  if (repo === "." || repo === "..") return null;

  if (!OWNER_RE.test(owner) || !REPO_RE.test(repo)) return null;
  return { owner, repo };
}
