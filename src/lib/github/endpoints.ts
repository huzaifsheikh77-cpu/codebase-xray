/**
 * Raw GitHub REST response shapes (only the fields we consume).
 * Kept separate from the analysis engine — nothing here leaks to the client.
 */

export interface GitHubRepoResponse {
  name: string;
  description: string | null;
  default_branch: string;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  license: { spdx_id: string | null } | null;
  created_at: string;
  pushed_at: string;
  /** repository size in KB, as reported by GitHub */
  size: number;
  private: boolean;
}

export interface GitHubTreeEntry {
  path: string;
  mode: string;
  type: "blob" | "tree" | "commit";
  /** byte size — present on blobs */
  size?: number;
  sha: string;
}

export interface GitHubTreeResponse {
  sha: string;
  tree: GitHubTreeEntry[];
  truncated: boolean;
}

export interface GitHubBlobResponse {
  sha: string;
  size: number;
  /** base64-encoded content */
  content: string;
  encoding: string;
}
