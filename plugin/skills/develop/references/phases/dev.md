# Phase 2: dev — 開發中

1. **先讀 task.md** — 確認 scope、phases、目前狀態
2. 修改、安裝依賴、測試與 commit 的範圍鎖在自己的任務資料夾。`projects/` 僅允許唯讀查證、讀取環境檔複製至任務目錄，以及本流程所需的 Git metadata 操作；不變更其工作檔案、暫存區或目前分支，也不修改其他任務的 worktree。
3. **依 task.md 的「類型」先做第一步**（在第一個改動之前，不是做完再補）：
   - `fix`：第一個 phase 固定是重現。在實際出問題的介面（瀏覽器／curl）重現，修正前的輸出存成 `$TASK/evidence/repro-before.txt`（或截圖）。有便宜的測試入口就寫一個會失敗的測試，**單獨 commit 在修正之前**；沒有就寫重現腳本或 [核心旅程矩陣](../journey-matrix.md) 的列，並在 task.md 寫一句為什麼不寫測試。重現不了就不寫修正碼，回到 task.md 記錄已試過的條件。修正前先判斷觸發狀態本身合不合法，決定修在源頭還是下游；修完搜一次同樣寫法在 repo 其他地方有沒有出現。被證據推翻的假設，連同它帶進來的程式碼一起 revert，不留「可能有幫助」的防禦碼
   - `refactor`（或 task.md 標明零行為／零視覺差異）：動結構之前先釘住現況。UI 用 `references/rect-probe.mjs` 在 `origin/dev` 量一次存成 `$TASK/evidence/rect-before.json`（見 [browser-verify.md §4b](../browser-verify.md)）；邏輯用 characterization test 或現有測試的輸出快照。沒有改前基準就不動結構。先刪死碼與只有單一呼叫者的 wrapper 並單獨 commit，再做重整
   - `perf`：第一個 phase 固定是量測，不讀程式碼猜瓶頸。先在 task.md 寫下要宣稱的那句話（例如「活動列表 LCP p50 在 4G throttle 下從 X 降到 Y」），在 `origin/dev` 量基準存成 `$TASK/evidence/perf-before.json`；沒有基準就不動程式。修完後兩邊各跑至少 5 次、A／B 交錯，報中位數與範圍；差距小於每次之間的變動就算沒有可量測差異。確認工作真的有跑（沒有錯誤回應、request 真的送到 server、快取是冷是熱）。結論只能是四種之一：變快、變慢、沒有可量測差異、無法判定
   - `feature`：照下面的動作序列
4. **每完成一個 phase 的預設動作序列（自動執行，不要問使用者「要 commit 還是先看效果」）**：
   1. **自行輕量驗證並修訂**：UI 變更 → 起 dev server 用瀏覽器實際看過該 phase 的改動（typecheck 過 ≠ 畫面對）；**有可互動 POC 的 UI phase，這一步就要把 POC 同一畫面開在旁邊，對該 phase 的元件跑一遍 [poc-probe-checklist](../poc-probe-checklist.md) 的基本 probe**（不要等 verify 才第一次量，差異會累積到很難拆）；後端變更 → curl 打一輪；script / workflow / migration / skill 文件 → 依 `check-commit` skill 步驟 3 的「變更類型 × 驗證」對照表。**任何類型的變更都有對應驗證，沒有「這種改動不用驗」這回事**。**這個 phase 碰到 form／mutation／controller／DTO 的，快篩就要真的送出一次：一筆真實輸入（中文、大寫、空白）成功、一筆 server 會拒絕的輸入失敗且訊息顯示出來**，先把 [核心旅程矩陣](../journey-matrix.md) 的列開出來，verify 階段再補齊。這是 phase 級的快篩，完整驗收留給 verify 階段
   2. **契約及測試完整性檢查**：依 [benchmark gates](../benchmark-gates.md) 執行適用 repo 的 schema／API signal 與測試完整性檢查，保留實際結果及限制。
   3. **高風險變更掃描**：跑 `bash ${CLAUDE_PLUGIN_ROOT}/hooks/stop-quality-gate.sh` 看逐檔就緒清單和高風險分類（migration / API / auth / env / CI）。有高風險標記的 phase 在 task.md 備註區補記「⚠ 高風險：<分類>」
   4. 驗證與 AI 自審通過 → `check-commit` → `format-commit` skill；依專案規則及既有授權確認後 commit
   5. 更新 task.md 的 checkbox 與 Status
   6. 直接進下一個 phase
   7. 只有驗證**失敗且修不掉**、或發現 scope 之外的問題時才停下來問使用者
5. **連續執行原則**：phase 邊界是繼續點，不是回報暫停點。**禁止**在 phase 完成後用「下一步：…要繼續嗎？」「要推的話說一聲」等句式收尾等指示——commit 完就開始下一個 phase。合法的停下來只有四種：
   - 全部 phase 完成 → 進 verify
   - 碰到 task.md 記載的待決事項**且該 phase 無法繞過它先行**（能先做別的就先做）
   - 驗證失敗 2 次修不掉，而且已經做完下面的前提檢查
   **同一項驗證失敗 2 次**：先在 task.md 備註寫一行「兩次修正共同假設：<一句話>」，再做一個「這個前提如果是錯的，結果就會不同」的觀察（加 log、改輸入、看實際資料），結果寫在下面。前提被推翻就換方向繼續查，這次不算第 3 次重試；前提成立而且仍修不好才停，交給人時附上前提、觀察與結果
   - 使用者主動喊停
   進度回報用一行 status 夾在過程中說，不要當成回合終點。要換 session 或 context 快滿時，先把進行中的修改做成 `wip:` commit（不 push），更新 task.md「## 接手點」再停
6. 在 push 已授權並完成專案 review 流程時定期 push：`git push -u origin feat/<slug>`——task.md 是本機檔案（gitignored），push 過的 branch 才是災難時唯一留得住的；跨多天的大任務每完成一個 phase 在已授權的 issue comment 記一行進度，讓狀態不只活在這台機器
7. 跨 repo 依賴順序：`storage (migration) → server (API) → ai-backend → f2e`
8. 需要跑 dev server 時，檢查 task.md 的 Port offset，避免與其他任務相撞

---

**完成條件**：`task.md` 每個 phase 都已勾選並 commit。

達成後讀 [verify.md](verify.md) 做總驗收。
