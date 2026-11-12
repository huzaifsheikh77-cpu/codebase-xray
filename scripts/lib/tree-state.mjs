// Tracked-working-tree snapshots used by the release-gate guard.
//
// The guard never edits, restores or stages anything: it records what Git
// reports before a gate, records it again afterwards, and reports the delta.
// Untracked files are deliberately ignored so preserved audit reports are not
// mistaken for release content.

import { execFileSync } from "node:child_process";

/** @typedef {{ index: string, worktree: string }} Entry */

/**
 * Snapshot every tracked path that Git reports as changed (staged, unstaged or
 * deleted). Untracked paths (`??`) are excluded.
 * @param {string} cwd
 * @returns {Map<string, Entry>}
 */
export function readTrackedTree(cwd) {
  const output = execFileSync("git", ["status", "--porcelain=v1", "-uall"], {
    cwd,
    encoding: "utf8",
  });
  const entries = new Map();
  for (const line of output.split(/\r?\n/)) {
    if (!line) continue;
    const index = line[0];
    const worktree = line[1];
    if (index === "?" && worktree === "?") continue;
    let file = line.slice(3);
    if (file.includes(" -> ")) file = file.split(" -> ").pop();
    entries.set(file, { index, worktree });
  }
  return entries;
}

/** @param {Entry} entry */
function kindOf(entry) {
  if (entry.index === "A") return "added";
  if (entry.index === "D" || entry.worktree === "D") return "deleted";
  if (entry.index !== " " && entry.index !== "?") return "staged";
  return "modified";
}

/**
 * Compare two snapshots and describe every difference.
 * @param {Map<string, Entry>} before
 * @param {Map<string, Entry>} after
 */
export function compareTrackedTrees(before, after) {
  const changes = [];
  const paths = new Set([...before.keys(), ...after.keys()]);
  for (const file of [...paths].sort()) {
    const previous = before.get(file);
    const current = after.get(file);
    if (previous && current && previous.index === current.index && previous.worktree === current.worktree) {
      continue;
    }
    if (!current) {
      changes.push({ file, kind: "restored", from: `${previous.index}${previous.worktree}`, to: "clean" });
      continue;
    }
    changes.push({
      file,
      kind: kindOf(current),
      from: previous ? `${previous.index}${previous.worktree}` : "clean",
      to: `${current.index}${current.worktree}`,
    });
  }
  return changes;
}

/** Human-readable lines for a dirty tree. */
export function formatChanges(changes) {
  return changes.map((change) => `  ${change.kind.padEnd(9)} ${change.file} (${change.from} -> ${change.to})`).join("\n");
}
