# docs/archive/automation — 已退役的自動派工文件

> 封存日期：2026-09-20（daodaoedu/daodao#241，接續 #237 的 OpenSpec 退役）。
> 這裡的內容只供考古，不是現行指示；不要依它們設定 label、Ready for Dev 或觸發 workflow。

## 為什麼退役

- **Routine A（Board → Sub-repo Dispatch）**：`bin/pipeline/dispatch.ts` + `.github/workflows/pipeline-dispatch.yml`。Spec gate 讀 `openspec/changes/<slug>/tasks.md` 決定要拆哪些鏡像 issue；OpenSpec 於 #237 退役後目錄不存在，每張 Ready for Dev 卡只會被退回 `needs-spec`。workflow 先手動 disable，#241 刪除程式與 workflow。
- **Routine B（Claude cloud 實作）**：依賴 Routine A 的鏡像 issue，從未穩定跑通。cloud routine 已停用。
- 目前所有開發走人工 `dev-task`（`.claude/skills/dev-task/`）。

## 封存清單

| 檔案 | 原位置 | 內容 |
|---|---|---|
| [routine-a-prompt.md](routine-a-prompt.md) | `docs/automation/` | Routine A Actions script 運維手冊 |
| [routine-b-prompt-v2.md](routine-b-prompt-v2.md) | `docs/automation/` | Routine B Claude cloud routine prompt |
| [routine-b-prompt-diff.md](routine-b-prompt-diff.md) | `docs/automation/` | Routine B prompt v1 → v2 差異 |
| [manual-issue-to-routine.md](manual-issue-to-routine.md) | `docs/automation/` | 人工手寫 issue 反向丟給 routine 的指南 |
| [spec-drafter-spike.md](spec-drafter-spike.md) | `docs/automation/` | Actions + Workers AI 自動起草 OpenSpec 的 spike |
| [gh-pipeline-references/agentic-flows.md](gh-pipeline-references/agentic-flows.md) | `.claude/skills/gh-pipeline/references/` | Routine B 依 scope 的 agentic 實作流程 |
| [gh-pipeline-references/templates.md](gh-pipeline-references/templates.md) | `.claude/skills/gh-pipeline/references/` | 鏡像 issue／PR body／comment 模板 |

同批刪除（不封存，git 歷史可考）：`bin/pipeline/dispatch.ts`、`bin/pipeline/review-evals.ts`（+ 測試）、`bin/openspec-headless.ts`（+ 測試）、`bin/__tests__/pipeline-status.test.ts`、`bin/setup-auto-labels.sh`、`.github/workflows/pipeline-dispatch.yml`、`.github/skills/openspec-*`（10 個）。`bin/pipeline/lib.ts`／`gh.ts`／`types.ts` 只保留 Routine C 用到的函式與常數。

## 仍在運作的部分

- **Routine C**（merged PR → Board Done）：`bin/pipeline/board-sync.ts` + `.github/workflows/pipeline-board-sync.yml`，每小時 `:37` UTC，支援 `workflow_dispatch` dry-run。
- 現行說明：`docs/automation/github-pipeline.md`、`docs/automation/routine-c-prompt.md`、`.claude/skills/gh-pipeline/SKILL.md`。

## Labels

`auto`／`auto:plan-only`／`auto:auto-pr`／`needs-spec`／`dispatched`／`spec-pending`／`spec-merged`／`human-coding`／`manual`／`stop-after-plan`／`automation:hold` 等派工 labels **不再使用，但保留不刪**（舊卡片仍帶有）。`human-driving` 仍是人工開工標記；`scope:*`／`repo:*` 仍用於規劃與 board 篩選。
