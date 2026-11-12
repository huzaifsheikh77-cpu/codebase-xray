import { afterEach, describe, expect, it } from "vitest";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { compareTrackedTrees, readTrackedTree } from "./lib/tree-state.mjs";

const dirs = [];

function makeRepo() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "gate-guard-"));
  dirs.push(dir);
  execFileSync("git", ["init", "-q"], { cwd: dir });
  execFileSync("git", ["config", "user.email", "guard@test.local"], { cwd: dir });
  execFileSync("git", ["config", "user.name", "Gate Guard"], { cwd: dir });
  writeFileSync(path.join(dir, "a.txt"), "original\n");
  mkdirSync(path.join(dir, "docs", "engineering", "benchmarks"), { recursive: true });
  writeFileSync(path.join(dir, "docs", "engineering", "benchmarks", "latest.json"), "{}\n");
  execFileSync("git", ["add", "-A"], { cwd: dir });
  execFileSync("git", ["commit", "-q", "-m", "fixture"], { cwd: dir });
  return dir;
}

function runCommand(dir, code) {
  return spawnSync(process.execPath, ["-e", code], { cwd: dir, encoding: "utf8" });
}

function observe(dir, code, env = {}) {
  const before = readTrackedTree(dir);
  const result = spawnSync(process.execPath, ["-e", code], {
    cwd: dir,
    encoding: "utf8",
    env: { ...process.env, ...env },
  });
  const after = readTrackedTree(dir);
  return { result, changes: compareTrackedTrees(before, after) };
}

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("release-gate tracked-tree guard", () => {
  it("passes a clean gate with no tracked changes", () => {
    const dir = makeRepo();
    const { result, changes } = observe(dir, "process.exit(0)");
    expect(result.status).toBe(0);
    expect(changes).toEqual([]);
  });

  it("detects a modified tracked file", () => {
    const dir = makeRepo();
    const { changes } = observe(dir, "require('fs').writeFileSync('a.txt','changed\\n')");
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({ file: "a.txt", kind: "modified" });
  });

  it("detects a deleted tracked file", () => {
    const dir = makeRepo();
    const { changes } = observe(dir, "require('fs').unlinkSync('a.txt')");
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({ file: "a.txt", kind: "deleted" });
  });

  it("detects a newly added tracked file", () => {
    const dir = makeRepo();
    const { changes } = observe(
      dir,
      "const fs=require('fs');fs.writeFileSync('new.txt','x');require('child_process').execFileSync('git',['add','new.txt'])",
    );
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({ file: "new.txt", kind: "added" });
  });

  it("detects a staged change", () => {
    const dir = makeRepo();
    const { changes } = observe(
      dir,
      "const fs=require('fs');fs.appendFileSync('a.txt','staged\\n');require('child_process').execFileSync('git',['add','a.txt'])",
    );
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({ file: "a.txt", kind: "staged" });
  });

  it("detects benchmark output written to a tracked record, and not when isolated", () => {
    const dir = makeRepo();
    const dirty = observe(
      dir,
      "require('fs').writeFileSync('docs/engineering/benchmarks/latest.json','{\"generatedAt\":\"now\"}\\n')",
    );
    expect(dirty.changes).toHaveLength(1);
    expect(dirty.changes[0]).toMatchObject({
      file: "docs/engineering/benchmarks/latest.json",
      kind: "modified",
    });

    const out = path.join(dir, "..", `${path.basename(dir)}-benchmark-out`);
    dirs.push(out);
    const clean = observe(
      dir,
      "const fs=require('fs'),p=require('path');fs.mkdirSync(process.env.BENCHMARK_OUT_DIR,{recursive:true});fs.writeFileSync(p.join(process.env.BENCHMARK_OUT_DIR,'latest.json'),'{}')",
      { BENCHMARK_OUT_DIR: out },
    );
    expect(clean.changes).toEqual([]);
  });

  it("reports a failing gate together with the tracked files it dirtied", () => {
    const dir = makeRepo();
    const { result, changes } = observe(
      dir,
      "require('fs').writeFileSync('a.txt','dirty\\n');process.exit(3)",
    );
    expect(result.status).toBe(3);
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({ file: "a.txt", kind: "modified" });
  });

  it("ignores untracked audit reports so they are preserved", () => {
    const dir = makeRepo();
    mkdirSync(path.join(dir, "docs", "engineering", "reports"), { recursive: true });
  writeFileSync(path.join(dir, "docs", "engineering", "reports", "audit.md"), "audit\n", { flag: "w" });
    expect(readTrackedTree(dir).size).toBe(0);
  });
});
