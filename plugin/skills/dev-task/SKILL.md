---
name: dev-task
description: >-
  以 issue 為單位的隔離平行開發流程。每個 issue 在 worktrees/編號-slug/ 建立獨立 worktree（或 clone）+ task.md manifest，多個 session 可同時開發不同 issue 互不干擾。Use when starting development on a GitHub issue, running parallel multi-issue development, or resuming a task from worktrees/. Trigger words: 開發 issue、開工、dev-task、平行開發、接手任務、發 PR、任務收尾。取代已退役的 dev-branch-workflow。
---

# Dev Task — Issue 隔離開發流程

一個 issue = 一個隔離資料夾 = 一個 session。`projects/` 下的 submodule 作為建立 worktree 的來源，保留其目前分支、工作檔案與暫存區；所有任務開發都在 `worktrees/` 進行。來源不在 `dev` 或有未提交變更，不構成開工阻擋。

```
daodao/
├── projects/<repo>/              ← 保留既有狀態，僅作為 worktree 來源
└── worktrees/                    ← gitignored
    └── <issue#>-<slug>/          ← 一個 issue 一個資料夾
        ├── task.md               ← 任務 manifest（唯一入口，接手先讀這個）
        ├── daodao-f2e/           ← worktree @ feat/<slug>
        └── daodao-server/        ← 跨 repo 時同名 branch
```

## AI 檢核與人審核

先讀 [共用交接規則](../../docs/ai-human-review-workflow.md)。AI 負責查核來源、實作、驗證、自審與修訂；人審閱結果並決定產品取捨。能由程式碼、測試或執行證據查明的問題先自行調查，不交由人猜測。交審附上已檢核事項、已修正問題、未驗證限制及待決策事項。

以下流程在 Claude、Codex 共用；瀏覽器、檔案讀取與提問以當前可用工具執行。Claude hook 是否啟用須實查，Codex 不可假定自動執行：發 PR 前須主動完成同等檢查。Commit、push、Issue comment、文件發布等外部動作沿用既有授權；無授權時先完成本機成果，依專案規則在該動作前確認。

## 判斷階段

依使用者輸入判斷進入哪個階段。上面的共用交接規則每個階段都適用；階段步驟**只讀當前階段的檔案**。每個階段檔結尾寫著完成條件，條件達成才讀下一個階段檔，不要先讀後面的階段。

| 輸入 | 階段 | 讀這個 |
|---|---|---|
| issue 編號/URL + （PRD／既有 FRD、Figma/Drive 或分支連結） | **start**（Phase 1） | [references/phases/start.md](references/phases/start.md) |
| 「接手 <task>」或目前已在 worktrees/ 某資料夾內 | **dev**（Phase 2） | [references/phases/dev.md](references/phases/dev.md) |
| 「驗證」「檢查畫面」或 dev 全部 phase 完成 | **verify**（Phase 3） | [references/phases/verify.md](references/phases/verify.md) |
| 「發 PR」「開發完成」 | **finish**（Phase 4；前置：verify 必須通過，`task.md` Status = `verified`） | [references/phases/finish.md](references/phases/finish.md) |
| 「merge 了」「收尾」 | **cleanup**（Phase 5） | [references/phases/cleanup.md](references/phases/cleanup.md) |

接手既有任務時，先讀 `task.md` 的 Status 決定階段：`planning` → start（從 1.5 驗收契約接續）；`implementing` 且還有未勾的 phase → dev，phase 全部勾完 → verify；`verified` → finish；`in-review` → 等 merge，merge 後 cleanup。

實跑卡住（環境、登入、toast、寄信、DB、GraphQL 限流）先查 [references/gotchas.md](references/gotchas.md)；多任務並行、撞 port、issue 依賴、rebase 時機見 [references/parallel-dev.md](references/parallel-dev.md)。

## 注意事項

1. 永遠從 `origin/dev` 開分支，PR 開回 `dev`
2. 不在 monorepo 根目錄 commit submodule 指標變更（submodule 各自管理）
3. `projects/` 不在 `dev` 或有未提交變更時，保留原狀並從明確的 `origin/dev` 建立隔離 worktree，無需為此詢問。只有需要變更來源工作目錄、暫存區或目前分支，或發現同一任務已存在、開發範圍高度重疊時，才停下來確認。
4. worktree add 失敗說 branch 已存在 → 該 issue 可能已在進行，`git worktree list` 查證
