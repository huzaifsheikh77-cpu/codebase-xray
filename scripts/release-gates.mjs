#!/usr/bin/env node
// Release-gate runner with a tracked-working-tree guard.
//
//   node scripts/release-gates.mjs                 # run every gate
//   node scripts/release-gates.mjs --verify-clean  # assert the tree is clean
//
// The runner never stages, restores, discards, commits, pushes or deploys. It
// stops at the first failing gate and at the first unexpected tracked change,
// printing the exact paths so the owner can decide what to do with the output.

import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { compareTrackedTrees, formatChanges, readTrackedTree } from "./lib/tree-state.mjs";

const cwd = process.cwd();
const verifyOnly = process.argv.includes("--verify-clean");

function fail(message) {
  console.error(`\nGATE GUARD: ${message}`);
  process.exit(1);
}

const initial = readTrackedTree(cwd);
if (verifyOnly) {
  if (initial.size > 0) {
    fail(`tracked working tree is not clean:\n${formatChanges([...initial].map(([file, entry]) => ({ file, kind: "staged-or-dirty", from: "clean", to: `${entry.index}${entry.worktree}` })))}`);
  }
  console.log("GATE GUARD: tracked working tree is clean.");
  process.exit(0);
}
if (initial.size > 0) {
  fail(
    `refusing to run gates on a dirty tree:\n${formatChanges(
      [...initial].map(([file, entry]) => ({ file, kind: "dirty", from: "clean", to: `${entry.index}${entry.worktree}` })),
    )}`,
  );
}

const benchmarkOut = path.join(os.tmpdir(), `codexray-benchmark-${Date.now()}`);
mkdirSync(benchmarkOut, { recursive: true });

const gates = [
  { name: "tests", command: "npm", args: ["test"] },
  { name: "lint", command: "npm", args: ["run", "lint"] },
  { name: "typecheck", command: "npm", args: ["run", "typecheck"] },
  {
    name: "benchmark",
    command: "npm",
    args: ["run", "benchmark"],
    // Canonical records in docs/ are updated only by an explicit, reviewed
    // run; a release gate writes to a disposable directory instead.
    env: { BENCHMARK_OUT_DIR: benchmarkOut },
  },
  { name: "build", command: "npm", args: ["run", "build"] },
  { name: "e2e", command: "npm", args: ["run", "test:e2e"] },
];

let failed = false;
for (const gate of gates) {
  const before = readTrackedTree(cwd);
  console.log(`\n=== gate: ${gate.name}`);
  const result = spawnSync(gate.command, gate.args, {
    cwd,
    stdio: "inherit",
    env: { ...process.env, ...(gate.env ?? {}) },
    shell: process.platform === "win32",
  });
  const after = readTrackedTree(cwd);
  const changes = compareTrackedTrees(before, after);
  const exitCode = result.status ?? 1;

  if (exitCode !== 0) {
    console.error(`\nGATE FAILED: ${gate.name} exited ${exitCode}.`);
    if (changes.length > 0) {
      console.error(`Tracked files also changed during this gate:\n${formatChanges(changes)}`);
    }
    failed = true;
    break;
  }
  if (changes.length > 0) {
    console.error(
      `\nGATE DIRTY: ${gate.name} modified tracked files without approval:\n${formatChanges(changes)}` +
        `\nNothing was restored or staged. Reconcile these paths deliberately, then rerun.`,
    );
    failed = true;
    break;
  }
  console.log(`GATE PASSED: ${gate.name}`);
}

if (failed) process.exit(1);
console.log("\nGATE GUARD: all gates passed with no tracked changes.");
