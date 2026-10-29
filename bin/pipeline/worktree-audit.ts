#!/usr/bin/env node
/**
 * Read-only audit of worktree metadata across the monorepo (develop cleanup step 2, before any
 * `git worktree remove` or batch cleanup). Finds checkouts that share metadata, copies whose
 * metadata points elsewhere, broken checkouts, and orphan metadata. Never modifies anything.
 *
 * Usage:
 *   pnpm -s tsx bin/pipeline/worktree-audit.ts [--json] [--root <repo root>]
 *
 * Exit 0 = no error findings, 1 = at least one error (do not batch-remove), 2 = usage error.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { auditWorktrees, emptyTaskDirs, type Checkout, type WorktreeMeta } from "./worktree.js";

const argv = process.argv.slice(2);
const json = argv.includes("--json");
const rootIdx = argv.indexOf("--root");
const root = path.resolve(
  rootIdx >= 0 ? argv[rootIdx + 1] ?? "." : execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim(),
);

const read = (p: string) => {
  try {
    return fs.readFileSync(p, "utf8").trim();
  } catch {
    return null;
  }
};
const isDir = (p: string) => fs.existsSync(p) && fs.statSync(p).isDirectory();
const children = (p: string) => (isDir(p) ? fs.readdirSync(p).map((e) => path.join(p, e)).filter(isDir) : []);

// Metadata dirs: root repo, submodules under .git/modules/projects/*, standalone repos under projects/*/.git,
// and standalone clones directly under the root (daodao-f2e/、daodao-server/ are gitignored clones with their own worktrees)
const standaloneGitDirs = [...children(path.join(root, "projects")), ...children(root)]
  .map((p) => path.join(p, ".git"))
  .filter(isDir);
const metaDirs = new Set([
  ...children(path.join(root, ".git", "worktrees")),
  ...children(path.join(root, ".git", "modules", "projects")).flatMap((m) => children(path.join(m, "worktrees"))),
  ...standaloneGitDirs.flatMap((g) => children(path.join(g, "worktrees"))),
]);
const toMeta = (dir: string): WorktreeMeta => {
  const backPointer = read(path.join(dir, "gitdir"));
  const head = read(path.join(dir, "HEAD"));
  return {
    dir,
    backPointer,
    backPointerExists: backPointer !== null && fs.existsSync(backPointer),
    head: head?.startsWith("ref: ") ? head.slice(5) : head ? head.slice(0, 8) : null,
  };
};
const metas: WorktreeMeta[] = [...metaDirs].map(toMeta);

// Checkouts: worktrees/<task>/<repo>, worktrees/<name> itself (some were added straight under worktrees/,
// e.g. worktrees/rename-develop), .claude/worktrees/<name>, and wherever a metadata dir points
const candidates = new Set<string>([
  ...children(path.join(root, "worktrees")),
  ...children(path.join(root, "worktrees")).flatMap(children),
  ...children(path.join(root, ".claude", "worktrees")),
  ...metas.filter((m) => m.backPointerExists && m.backPointer).map((m) => path.dirname(m.backPointer!)),
]);
const checkouts: Checkout[] = [];
for (const dir of candidates) {
  const dotGit = path.join(dir, ".git");
  if (!fs.existsSync(dotGit) || isDir(dotGit)) continue; // not a linked worktree
  const line = read(dotGit);
  const m = line?.match(/^gitdir:\s*(.+)$/);
  if (!m) continue;
  checkouts.push({ path: dir, gitdir: path.resolve(dir, m[1].trim()) });
}
// A checkout may point at metadata in a repo we did not enumerate; if it exists on disk it is not broken
for (const c of checkouts) {
  if (!metaDirs.has(c.gitdir) && isDir(c.gitdir)) {
    metaDirs.add(c.gitdir);
    metas.push(toMeta(c.gitdir));
  }
}

const findings = auditWorktrees(checkouts, metas);
// Task folders that no longer hold any checkout (only task.md / evidence left): cleanup step 6 candidates
const taskDirs = children(path.join(root, "worktrees"));
const emptyTasks = emptyTaskDirs(taskDirs, checkouts);
const errors = findings.filter((f) => f.severity === "error");

if (json) {
  console.log(JSON.stringify({ root, checkouts: checkouts.length, metadata: metas.length, taskDirs: taskDirs.length, emptyTasks, findings }, null, 2));
} else {
  const rel = (p: string) => {
    const r = path.relative(root, p);
    return r.startsWith("..") ? p : r || ".";
  };
  console.log(`掃描 ${checkouts.length} 個 checkout、${metas.length} 份 worktree metadata（${root}）`);
  if (!findings.length) console.log("✅ 沒有共用、複製、損壞或孤兒 metadata");
  for (const f of findings) {
    console.log(`\n${f.severity === "error" ? "❌" : "⚠️"} ${f.kind}${f.meta ? `  ${rel(f.meta)}` : ""}`);
    for (const p of f.paths) console.log(`   - ${rel(p)}`);
    console.log(`   ${f.message}`);
  }
  if (findings.length) console.log(`\n共 ${errors.length} 個錯誤、${findings.length - errors.length} 個警告`);
  console.log(`worktrees/ 有 ${taskDirs.length} 個任務資料夾，其中 ${emptyTasks.length} 個已沒有任何 checkout（只剩 task.md／證據，可依 cleanup 第 3 步收尾）`);
}
process.exit(errors.length ? 1 : 0);
