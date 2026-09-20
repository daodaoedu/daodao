---
name: gh-pipeline
description: 島島阿學 Planning Board 狀態操作與稽核：六欄語意、bin/pipeline/board.ts set／remove／audit、GitHub 內建 workflow 限制與除錯。
---

先讀 [AI 檢核與人工審核共用流程](../../../docs/automation/ai-human-review-workflow.md)，依當前客戶端可用工具執行；先完成適用檢核與修訂，再交人審核決策。

# gh-pipeline

> **退役註記（2026-09-20）**：自動派工 Routine A／B（#241）與 merge 回寫 Routine C（同日稍後）皆已退役，`bin/pipeline/` 只剩 `board.ts` 這支人工 CLI。舊 prompt、pipeline 總覽與運維手冊封存於 `docs/archive/automation/`（索引見該目錄 `README.md`）。板上狀態現在由 gh-card／dev-task／post-merge-wrapup 各自呼叫 `board.ts` 寫回，沒有任何 cron。

Monorepo root: `/Users/xiaoxu/Projects/daodao`

**任務管理層**（source of truth）：
- 中央 issues：https://github.com/daodaoedu/daodao/issues（feature 卡，product 視角）
- Org board：https://github.com/orgs/daodaoedu/projects/10「Planning」

## Status 六欄與誰負責移卡

稽核與決策紀錄見 `docs/plans/board-audit-2026-09-20.md`。

| Status | 意思 | 誰移 |
|---|---|---|
| `Todo` | 已開卡，還沒人做 | gh-card（`board.ts set <n> todo`） |
| `Ready for Dev` | PRD／AC 定稿可開工；選用，允許空 | 人工，需使用者要求 |
| `In Progress` | 有 worktree／branch 在跑 | dev-task start（`set <n> wip --add-label human-driving`） |
| `Review` | PR 已開；**merged 後仍留這裡等驗收** | dev-task finish（`set <n> review`） |
| `Need Fix` | 驗收（dev 冒煙）退回，待修 | post-merge-wrapup（`set <n> needfix`）；開修時 dev-task start 移回 In Progress |
| `Done` | 全部 PR merged + dev 冒煙通過；issue close | post-merge-wrapup（`set <n> done --remove-label human-driving`） |

每張 Review／Need Fix 的卡要有一則最新的狀態 comment（PR 連結、等誰做什麼、驗收方式），PM 只看 board 也能追。

**Board 常數**：Project ID `PVT_kwDOBTLl0c4Bgxef`；Status field `PVTSSF_lADOBTLl0c4Bgxefzhfvwto`（Todo `f75ad846` / Ready for Dev `c9e0e5d5` / In Progress `47fc9ee4` / Review `f25bace1` / Need Fix `bb831d2b` / Done `98236657`），程式碼在 `bin/pipeline/types.ts`（`BOARD.statusOptions`、`STATUS_ALIASES`、`DEAD_LABELS`）。

**GitHub 內建 workflow（board 設定頁，API 只讀得到名稱）**：`Item added → Todo`、`Item closed → Done`、`Auto-close issue`（設 Done 就 close issue）、`Pull request linked / merged`、`Auto-add (sub-)issues` 七個都開著。它們只認**同 repo** 用 closing keyword 連結的 PR；sub-repo PR 依 `docs/workflow.md` 用 `Refs`，所以不會自動移卡——這就是 2026-09-20 前卡片全堆在 In Progress 的原因。各 workflow 目標欄位（2026-09-20 於設定頁確認）：Item added → Todo、PR linked → In Progress、**PR merged → Review**（原本是 Done，同日改掉以配合「merged 留 Review」）、Item closed → Done。這些只影響同 repo PR，仍以 skill 的 `board.ts set` 為準。

**Labels 現況**：`human-driving` 是人工開工標記（dev-task start 掛、post-merge-wrapup 移 Done 時拔）。`auto`／`auto:plan-only`／`auto:auto-pr`／`needs-spec`／`dispatched`／`spec-pending`／`human-coding`／`manual` 等派工 labels **不再使用**（label 本身保留不刪；2026-09-20 已從活躍卡片整批移除，`audit` 會把殘留當「死 label」列出）。

## board.ts — 移卡與稽核 CLI

```bash
pnpm -s tsx bin/pipeline/board.ts set <issue#> <status> [--add-label x] [--remove-label y] [--dry-run]
pnpm -s tsx bin/pipeline/board.ts remove <issue#>            # 從 board 移除（issue 保留），例：Review 彙整報告卡
pnpm -s tsx bin/pipeline/board.ts audit [--json] [--stale-days 3]
```

- status 接受別名：`todo` / `ready` / `wip`／`in-progress` / `review` / `needfix` / `done`（大小寫、`-`、`_`、空白互通）
- `set` 不在 board 會先 `item-add`；改完回讀 Status，不一致直接 exit 1
- `audit` 把每張卡的 Status 對 issue open／closed、關聯 PR（跨 repo cross-reference）、labels 比對，列出：Done 但 issue open、issue closed 卻卡在 Todo／In Progress、Todo 有 open PR、sub-repo PR 全 merged 卻 N 天沒移 Review、Review 沒 PR、死 label、Done 仍掛 `human-driving`。中央 repo 的 docs PR 不算實作，不觸發 merged 規則。純函式 `auditCards` 在 `lib.ts`，測試 `bin/pipeline/__tests__/board.test.ts`
- 不要用 `gh project item-list` 批次查：它每次拉全部欄位，跑十幾次就撞 Projects rate limit（2026-09-20 實測）；`board.ts` 走精簡 GraphQL（`listBoardItemsLite`、`findBoardItemForIssue`）
- GraphQL 額度是**使用者 PAT 共用的 5000/hr**，Actions 裡的 Sync Shared Config 也用同一顆；大批操作前先 `gh api rate_limit --jq .resources.graphql`

```bash
# 純函式測試（不要跑裸 pnpm test，會掃到 worktrees/）
pnpm exec vitest run bin/pipeline --exclude "**/worktrees/**"
```

## 除錯快查

| 症狀 | 檢查 |
|---|---|
| merge 了但卡沒動 | 正常——沒有 cron；跑 post-merge-wrapup，它會依冒煙結果 `set done`／`set needfix` |
| `set` 回讀失敗 | 是否撞 rate limit（`gh api rate_limit`）；item 是否被人手動刪掉（`audit` 會列不在 board 的卡） |
| board 操作 403 | PAT 缺 `project` scope |
| 卡 close 了卻在 Todo | 內建 `Item closed → Done` 應會處理；沒有就 `set <n> done` |
| 有人開 PR 但卡在 Todo | sub-repo PR 不會被內建 workflow 認到；`set <n> wip` |

## 本 skill 不做的事

- 不派工、不開鏡像 issue、不在雲端實作——這些能力已退役，需要時另開卡重新設計。
- 不修改 labels 集合、不刪舊 label（從個別卡片拔死 label 是 `audit` 建議項，可以做）。
- 不改 GitHub 內建 workflow 的目標欄位（API 無 mutation，只能在 board 設定頁手動改）。
- `Ready for Dev` 只是管理狀態，設定它需在使用者要求範圍內。
