/**
 * Worktree metadata audit (pure logic; filesystem reads live in worktree-audit.ts).
 *
 * Each checkout under worktrees/<task>/<repo>/ has a `.git` file pointing at a metadata dir
 * (`.git/worktrees/<name>` or `.git/modules/projects/<repo>/worktrees/<name>`), whose `gitdir`
 * file points back at the checkout. `git worktree remove` deletes that metadata dir no matter who
 * else uses it: on 2026-10-10 two task folders had been created by copying another task folder,
 * so removing 240/290 also broke 233/214, whose `.git` files pointed at the same metadata.
 */

/** A checkout found on disk: its directory and the metadata dir its `.git` file points at. */
export type Checkout = { path: string; gitdir: string };

/** A worktree metadata dir: where its `gitdir` file points back to, and the branch it has checked out. */
export type WorktreeMeta = {
  dir: string;
  /** Path written in the metadata's `gitdir` file (the checkout's `.git` file), or null if unreadable. */
  backPointer: string | null;
  /** Whether that back-pointer target still exists on disk. */
  backPointerExists: boolean;
  /** `refs/heads/<branch>`, a detached sha, or null. */
  head: string | null;
};

export type WorktreeFindingKind = "shared" | "broken" | "copied" | "orphan-meta";

export type WorktreeFinding = {
  kind: WorktreeFindingKind;
  /** error = removing anything involved can break another checkout; warn = safe to prune after a look. */
  severity: "error" | "warn";
  paths: string[];
  meta?: string;
  message: string;
};

const trimSlash = (p: string) => p.replace(/\/+$/, "");
const branchOf = (m: WorktreeMeta | undefined) => (m?.head ?? "?").replace(/^refs\/heads\//, "");

export function auditWorktrees(checkouts: Checkout[], metas: WorktreeMeta[]): WorktreeFinding[] {
  const findings: WorktreeFinding[] = [];
  const metaByDir = new Map(metas.map((m) => [trimSlash(m.dir), m]));
  const byGitdir = new Map<string, Checkout[]>();
  for (const c of checkouts) {
    const key = trimSlash(c.gitdir);
    byGitdir.set(key, [...(byGitdir.get(key) ?? []), c]);
  }

  for (const [gitdir, group] of byGitdir) {
    const meta = metaByDir.get(gitdir);
    const paths = group.map((c) => c.path).sort();
    if (!meta) {
      findings.push({
        kind: "broken",
        severity: "error",
        paths,
        meta: gitdir,
        message: `metadata 不存在：${gitdir}。checkout 已壞，不要再 git worktree remove；依 gotchas 重建 metadata 或確認沒有未推的修改後直接刪資料夾`,
      });
      continue;
    }
    if (group.length > 1) {
      findings.push({
        kind: "shared",
        severity: "error",
        paths,
        meta: gitdir,
        message: `${group.length} 個 checkout 共用同一份 metadata（分支 ${branchOf(meta)}）。移除任何一個都會弄壞其他的；先分辨各自的分支，再為複製出來的那個重建 metadata`,
      });
      continue;
    }
    const expected = `${trimSlash(group[0].path)}/.git`;
    if (meta.backPointer !== null && trimSlash(meta.backPointer) !== expected) {
      findings.push({
        kind: "copied",
        severity: "error",
        paths,
        meta: gitdir,
        message: `metadata 反指的是 ${meta.backPointer}，不是這個 checkout：這個資料夾是複製來的。對它跑 git worktree remove 會刪掉別人的 metadata`,
      });
    }
  }

  const referenced = new Set(byGitdir.keys());
  for (const m of metas) {
    if (referenced.has(trimSlash(m.dir)) || m.backPointerExists) continue;
    findings.push({
      kind: "orphan-meta",
      severity: "warn",
      paths: m.backPointer ? [m.backPointer] : [],
      meta: m.dir,
      message: `metadata 指向的 checkout 已不存在（分支 ${branchOf(m)}）：確認沒有別的資料夾在用後，可以 git worktree prune`,
    });
  }

  const order: Record<WorktreeFindingKind, number> = { shared: 0, copied: 1, broken: 2, "orphan-meta": 3 };
  return findings.sort((a, b) => order[a.kind] - order[b.kind] || (a.meta ?? "").localeCompare(b.meta ?? ""));
}
