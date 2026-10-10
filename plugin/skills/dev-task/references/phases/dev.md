# Phase 2: dev — 開發中

1. **先讀 task.md** — 確認 scope、phases、目前狀態
2. 修改、安裝依賴、測試與 commit 的範圍鎖在自己的任務資料夾。`projects/` 僅允許唯讀查證、讀取環境檔複製至任務目錄，以及本流程所需的 Git metadata 操作；不變更其工作檔案、暫存區或目前分支，也不修改其他任務的 worktree。
3. **每完成一個 phase 的預設動作序列（自動執行，不要問使用者「要 commit 還是先看效果」）**：
   1. **自行輕量驗證並修訂**：UI 變更 → 起 dev server 用瀏覽器實際看過該 phase 的改動（typecheck 過 ≠ 畫面對）；**有可互動 POC 的 UI phase，這一步就要把 POC 同一畫面開在旁邊，對該 phase 的元件跑一遍 [poc-probe-checklist](../poc-probe-checklist.md) 的基本 probe**（不要等 verify 才第一次量，差異會累積到很難拆）；後端變更 → curl 打一輪；script / workflow / migration / skill 文件 → 依 `pre-commit-check` skill 步驟 3 的「變更類型 × 驗證」對照表。**任何類型的變更都有對應驗證，沒有「這種改動不用驗」這回事**。**這個 phase 碰到 form／mutation／controller／DTO 的，快篩就要真的送出一次：一筆真實輸入（中文、大寫、空白）成功、一筆 server 會拒絕的輸入失敗且訊息顯示出來**，先把 [核心旅程矩陣](../journey-matrix.md) 的列開出來，verify 階段再補齊。這是 phase 級的快篩，完整驗收留給 verify 階段
   2. **契約及測試完整性檢查**：依 [benchmark gates](../benchmark-gates.md) 執行適用 repo 的 schema／API signal 與測試完整性檢查，保留實際結果及限制。
   3. **高風險變更掃描**：跑 `bash ${CLAUDE_PLUGIN_ROOT}/hooks/stop-quality-gate.sh` 看逐檔就緒清單和高風險分類（migration / API / auth / env / CI）。有高風險標記的 phase 在 task.md 備註區補記「⚠ 高風險：<分類>」
   4. 驗證與 AI 自審通過 → `pre-commit-check` → `format-commit` skill；依專案規則及既有授權確認後 commit
   5. 更新 task.md 的 checkbox 與 Status
   6. 直接進下一個 phase
   7. 只有驗證**失敗且修不掉**、或發現 scope 之外的問題時才停下來問使用者
4. **連續執行原則**：phase 邊界是繼續點，不是回報暫停點。**禁止**在 phase 完成後用「下一步：…要繼續嗎？」「要推的話說一聲」等句式收尾等指示——commit 完就開始下一個 phase。合法的停下來只有四種：
   - 全部 phase 完成 → 進 verify
   - 碰到 task.md 記載的待決事項**且該 phase 無法繞過它先行**（能先做別的就先做）
   - 驗證失敗 2 次修不掉
   - 使用者主動喊停
   進度回報用一行 status 夾在過程中說，不要當成回合終點
5. 在 push 已授權並完成專案 review 流程時定期 push：`git push -u origin feat/<slug>`——task.md 是本機檔案（gitignored），push 過的 branch 才是災難時唯一留得住的；跨多天的大任務每完成一個 phase 在已授權的 issue comment 記一行進度，讓狀態不只活在這台機器
6. 跨 repo 依賴順序：`storage (migration) → server (API) → ai-backend → f2e`
7. 需要跑 dev server 時，檢查 task.md 的 Port offset，避免與其他任務相撞

---

**完成條件**：`task.md` 每個 phase 都已勾選並 commit。

達成後讀 [verify.md](verify.md) 做總驗收。
