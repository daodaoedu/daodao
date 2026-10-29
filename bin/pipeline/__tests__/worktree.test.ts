import { describe, expect, it } from "vitest";
import { auditWorktrees, type Checkout, type WorktreeMeta } from "../worktree.js";

const ROOT = "/repo";
const checkout = (task: string, repo: string, gitdir: string): Checkout => ({
  path: `${ROOT}/worktrees/${task}/${repo}`,
  gitdir,
});
const meta = (dir: string, backPointer: string | null, over: Partial<WorktreeMeta> = {}): WorktreeMeta => ({
  dir,
  backPointer,
  backPointerExists: backPointer !== null,
  head: "refs/heads/feat/x",
  ...over,
});
const F2E_META = `${ROOT}/.git/modules/projects/daodao-f2e/worktrees/daodao-f2e20`;

describe("auditWorktrees", () => {
  it("健康的 checkout：metadata 存在且反指回自己，不回報", () => {
    const c = checkout("233-settings-overflow", "daodao-f2e", F2E_META);
    expect(auditWorktrees([c], [meta(F2E_META, `${c.path}/.git`)])).toEqual([]);
  });

  // 2026-10-10：240 是複製 233 的任務資料夾建的，兩個 .git 指向同一份 metadata，移除 240 弄壞了 233
  it("兩個 checkout 指向同一份 metadata：回報 shared 錯誤並列出兩個路徑與分支", () => {
    const a = checkout("233-settings-overflow", "daodao-f2e", F2E_META);
    const b = checkout("240-settings-page-shell", "daodao-f2e", F2E_META);
    const findings = auditWorktrees([b, a], [meta(F2E_META, `${a.path}/.git`, { head: "refs/heads/fix/settings-overflow" })]);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ kind: "shared", severity: "error", paths: [a.path, b.path].sort() });
    expect(findings[0].message).toContain("fix/settings-overflow");
  });

  it("只有一個 checkout，但 metadata 反指別的資料夾：回報 copied 錯誤（對它 remove 會刪掉別人的 metadata）", () => {
    const copy = checkout("240-settings-page-shell", "daodao-f2e", F2E_META);
    const findings = auditWorktrees([copy], [meta(F2E_META, `${ROOT}/worktrees/233-settings-overflow/daodao-f2e/.git`)]);
    expect(findings).toEqual([expect.objectContaining({ kind: "copied", severity: "error", paths: [copy.path] })]);
  });

  it("checkout 指向的 metadata 已不存在：回報 broken 錯誤", () => {
    const c = checkout("214-sidebar-popup-clip", "daodao", `${ROOT}/.git/worktrees/daodao4`);
    expect(auditWorktrees([c], [])).toEqual([expect.objectContaining({ kind: "broken", severity: "error", paths: [c.path] })]);
  });

  it("metadata 指向的 checkout 已不在、也沒有別人在用：回報 orphan-meta 警告，不是錯誤", () => {
    const orphan = meta(`${ROOT}/.git/worktrees/srv431`, "/tmp/srv431/.git", { backPointerExists: false });
    expect(auditWorktrees([], [orphan])).toEqual([expect.objectContaining({ kind: "orphan-meta", severity: "warn" })]);
  });

  it("metadata 的反指檔案不在，但仍有 checkout 指向它：不算孤兒（那是 copied）", () => {
    const c = checkout("240-settings-page-shell", "daodao-f2e", F2E_META);
    const m = meta(F2E_META, "/gone/.git", { backPointerExists: false });
    expect(auditWorktrees([c], [m]).map((f) => f.kind)).toEqual(["copied"]);
  });

  it("路徑結尾多一個斜線不影響比對", () => {
    const c = checkout("233-settings-overflow", "daodao-f2e", `${F2E_META}/`);
    expect(auditWorktrees([c], [meta(F2E_META, `${c.path}/.git`)])).toEqual([]);
  });

  it("錯誤排在警告前面：shared → copied → broken → orphan-meta", () => {
    const a = checkout("1-a", "r", `${ROOT}/.git/worktrees/s`);
    const b = checkout("2-b", "r", `${ROOT}/.git/worktrees/s`);
    const copy = checkout("3-c", "r", `${ROOT}/.git/worktrees/c`);
    const broken = checkout("4-d", "r", `${ROOT}/.git/worktrees/missing`);
    const metas = [
      meta(`${ROOT}/.git/worktrees/o`, "/tmp/o/.git", { backPointerExists: false }),
      meta(`${ROOT}/.git/worktrees/c`, "/elsewhere/.git"),
      meta(`${ROOT}/.git/worktrees/s`, `${a.path}/.git`),
    ];
    expect(auditWorktrees([broken, copy, b, a], metas).map((f) => f.kind)).toEqual(["shared", "copied", "broken", "orphan-meta"]);
  });
});
