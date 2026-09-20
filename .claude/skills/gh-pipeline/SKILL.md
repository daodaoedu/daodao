---
name: gh-pipeline
description: 查核並操作島島阿學 Planning Board 回寫 pipeline（Routine C：merged PR → Board Done），含 board-sync dry-run 與除錯。
---

先讀 [AI 檢核與人工審核共用流程](../../../docs/automation/ai-human-review-workflow.md)，依當前客戶端可用工具執行；先完成適用檢核與修訂，再交人審核決策。

# gh-pipeline

> **退役註記（2026-09-20，#241）**：自動派工 Routine A（Board → Sub-repo Dispatch，`bin/pipeline/dispatch.ts` + `pipeline-dispatch.yml`）與 Routine B（Claude cloud 實作）已整批退役；OpenSpec 已於 #237 退役，Routine A 的 spec gate 失去輸入後只會把卡退回，Routine B 從未穩定跑通。所有開發改走人工 [dev-task](../dev-task/SKILL.md)。舊 prompt、agentic flow 與 issue／PR 模板封存於 `docs/archive/automation/`（索引見該目錄 `README.md`）。本 skill 現在只描述仍在跑的 **Routine C**。

Monorepo root: `/Users/xiaoxu/Projects/daodao`

**任務管理層**（source of truth）：
- 中央 issues：https://github.com/daodaoedu/daodao/issues（feature 卡，product 視角）
- Org board：https://github.com/orgs/daodaoedu/projects/10「Planning」
- Status 流：`Todo`（待規劃）→ `Ready for Dev`（規格與授權齊備；**不再觸發派工**）→ `In Progress`（人工 `/dev-task` 開工）→ `Done`

**Board 常數**：Project ID `PVT_kwDOBTLl0c4Bgxef`；Status field `PVTSSF_lADOBTLl0c4Bgxefzhfvwto`（Todo `f75ad846` / In Progress `47fc9ee4` / Ready for Dev `c9e0e5d5` / Done `98236657`），程式碼在 `bin/pipeline/types.ts`。

**Labels 現況**：`human-driving` 仍是人工開工標記（`/dev-task` start 自動掛）。`auto`／`auto:plan-only`／`auto:auto-pr`／`needs-spec`／`dispatched`／`spec-pending` 等派工 labels **不再使用**（label 本身保留不刪，僅供歷史卡片辨識）。

---

## Routine C（PR merged → Board Done）— **由 GitHub Actions 執行，非 Claude**

| 元件 | 位置 |
|---|---|
| Workflow | `.github/workflows/pipeline-board-sync.yml`（每小時 `:37` UTC + `workflow_dispatch`，inputs `dry_run`／`hours`） |
| 入口 | `bin/pipeline/board-sync.ts`（`--dry-run` / `--hours <n>`，預設 48） |
| 純函式 | `bin/pipeline/lib.ts`：`parseParentIssue`、`parseClosingIssues`、`buildProgressComment`、`buildAllDoneComment`（vitest：`bin/pipeline/__tests__/lib.test.ts`） |
| gh 包裝 | `bin/pipeline/gh.ts`（board item-list／item-edit、issue view／comment／close、merged PR list） |
| Secret | `GIT_HUB_ACCESS_TOKEN`（PAT，需 `repo` + `project` scope；Actions 內建 token 摸不到 org project） |

### 行為

1. `.automation-paused` 存在於 repo root → exit 0
2. 掃 8 個 sub-repo lookback 內 merged 且帶 `auto` label 的 PR，依 body 的 `Closes／Fixes／Resolves #n` 補關同 repo 的子 issue
3. 從子 issue body 的 `Parent: daodaoedu/daodao#<n>` 反查中央卡（跨 repo 搜尋 + 精確比對）
4. 中央卡所有子 issue closed → `✅ 所有 sub-repo 任務完成` comment + board Status → `Done`；**不自動 close 中央 issue**（留給 product 驗收）
5. 尚有 open → `⏳ Sub-repo 進度：{done}/{total}` comment（同日同進度去重）

注意：跨 repo 子 PR 依 `docs/workflow.md` 用 `Refs` 不用 `Closes`，中央卡由冒煙通過後手動關；Routine C 只對仍用 `auto` label + `Closes #n` 的 PR 生效，目前多為保底。

### 手動操作與 dry-run

```bash
# 本機 dry-run（需 gh 已登入且 token 有 project scope）
pnpm tsx bin/pipeline/board-sync.ts --dry-run

# 拉長 lookback 補歷史
pnpm tsx bin/pipeline/board-sync.ts --dry-run --hours 168

# 從 GitHub 手動觸發
gh workflow run pipeline-board-sync.yml -R daodaoedu/daodao -f dry_run=true -f hours=48

# 看 run log
gh run list -R daodaoedu/daodao --workflow pipeline-board-sync.yml --limit 5
gh run view <run-id> -R daodaoedu/daodao --log

# 純函式測試（不要跑裸 pnpm test，會掃到 worktrees/）
pnpm exec vitest run bin/pipeline
```

### 除錯快查

| 症狀 | 檢查 |
|---|---|
| merge 了但中央卡沒動 | PR 有 `auto` label 嗎？body 有 `Closes #n` 嗎？子 issue body 的 `Parent:` 行格式對嗎（`parseParentIssue`） |
| board 沒移 Done | 中央卡是否還有 open 的子 issue（看 sub-issues 或 `⏳` comment） |
| board 操作 403 | `GIT_HUB_ACCESS_TOKEN` 缺 `project` scope |
| run 直接 exit 0 沒任何輸出 | repo root 有 `.automation-paused` |
| board item-edit 失敗 | 留 comment 註記「board 未更新，需手動拖卡」，其餘工作繼續 |

緊急停止：repo root 放 `.automation-paused` 檔案，Routine C 直接退出（下一輪 cron ≤ 65 分鐘內生效）。

---

## 本 skill 不做的事

- 不派工、不開鏡像 issue、不在雲端實作——這些能力已退役，需要時另開卡重新設計。
- 不修改 labels 集合、不刪舊 label。
- `Ready for Dev` 只是管理狀態，設定它需在使用者要求範圍內，不代表任何自動化會接手。

詳細架構 → `docs/automation/github-pipeline.md`；運維手冊 → `docs/automation/routine-c-prompt.md`。
