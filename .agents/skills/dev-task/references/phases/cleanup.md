# Phase 5: cleanup — merge 後收尾

1. 確認所有 PR 已 merge（`gh pr view <link>`）
1a. **部署後冒煙，通過前不刪任務資料夾**：merge 不等於可用（#179 是使用者在 dev 撞到的）。依 `post-merge-wrapup` skill 的「目標環境冒煙」段，用 task.md 的核心旅程矩陣在部署後的 dev 環境（dev 前端 + server-dev，或對應環境）重跑全部正常列 + 至少一列錯誤路徑，把「dev 冒煙」表回寫到 issue comment；冒煙失敗走 `file-bug-issue`，並在 comment 標明「已合併，dev 冒煙未過」。沒有部署證據（CD run 尚未跑到該 revision）就先停在這一步，不宣稱可用
2. 移除 worktree 與 branch：

```bash
cd "$ROOT/projects/<repo>"
git worktree remove "$TASK/<repo>"
git branch -d feat/<slug>
git fetch origin dev   # 僅更新 origin/dev，不移動 projects/ 的本機分支
```

3. 刪任務資料夾：`rm -rf "$TASK"`（刪之前確認核心旅程矩陣與 dev 冒煙結果已在 issue comment；task.md 其他有留存價值的內容先摘要進 comment）
4. 接 `post-merge-wrapup` skill（更新 docs/product 與驗收狀態）；board 卡的 `Acceptance`（交給 PM）／`Need Fix`，以及 `acceptance:engineering` 卡的關閉，由該 skill 依冒煙結果執行，`Done` 只由 PM 驗收通過（關 issue）產生，這裡不要提前移 Done
5. clone 模式的任務：確認無未 push commit 後 `rm -rf`
6. **順手掃殘留**：`ls worktrees/` 列出其他任務資料夾，PR 已 merge 的提醒使用者一併收尾，避免堆積

---

**完成條件**：dev 冒煙結果已回寫 issue comment，worktree、branch、任務資料夾都已移除，並已接手 `post-merge-wrapup`。
