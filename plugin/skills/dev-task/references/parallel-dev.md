# 平行開發約定

開工判斷要不要拆 session／subagent、兩個任務撞 repo 或 port、issue 之間有依賴、要不要 rebase 時讀這份。

- **執行載體選擇**（session vs subagent）：
  - M/L 任務（有中途決策點：驗證失敗判斷、force push、migration 過目）→ 獨立 Claude／Codex session，開場：「/dev-task 接手 worktrees/<n>-<slug>」或給 issue 編號
  - XS/S 任務（scope 明確、無決策點）→ 可整包委派一個 subagent 從 start 做到 finish（prompt 指明任務資料夾與本 skill 路徑），或標 `auto` 走 pipeline
  - 任何任務**內部**的機械子步驟（repo 查證、掃 caller、批次改檔、寫測試）→ 隨時 fan out subagent，唯讀調查用 Explore agent
  - 判斷原則：需要使用者中途點頭的工作不要塞進背景 subagent——要嘛卡住要嘛自作主張
- `git worktree list`（在 `projects/<repo>` 內執行）可查目前有哪些任務在進行
- DB/docker 是全機共享——migration 類任務一次只做一個
- 兩個任務要同時跑 dev server：後開的用 clone 模式或設 port offset
- **issue 之間有依賴**（B 需要 A 未 merge 的 code）：B 的 worktree 從 A 的分支開（`git worktree add ... -b feat/<B-slug> feat/<A-slug>`），PR base 先設 A 的分支並在 body 標注依賴；A merge 後 B rebase 回 dev、base 改回 dev。task.md 記清楚依賴鏈
- 並行數量甜蜜點是 2–3 個（Routine B 雲端實作已退役，XS/S 雜項也走本機 dev-task；優先把本機時間留給需要瀏覽器驗證/人工判斷的 M/L 任務）
- **rebase 政策**：別的 PR merge 了不用立刻 rebase——只在「發 PR 前」和「輪到自己 merge 前有 conflict」兩個時機 rebase，避免連鎖 rebase 稅
