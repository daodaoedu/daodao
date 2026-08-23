---
name: gh-pipeline
description: daodao Board→Issue→Plan→PR 自動化 pipeline 的 routine 行為規範（GitHub Projects 版）。Use when running Routine A/B/C, dispatching a central issue, implementing an auto issue, opening a pipeline PR, or writing pipeline comments. Triggered by keywords: routine, pipeline, auto issue, dispatch, board sync, handler, agentic phase. 取代已退役的 notion-pipeline。
---

# gh-pipeline

daodao 自動化 pipeline 行為規範。Routine A/C 是純 script（GitHub Actions 執行）；
只有 Routine B（agentic 實作）由 Claude cloud routine 執行，執行前必須載入此 skill。

Monorepo root: `/Users/xiaoxu/Projects/daodao`

**任務管理層**（source of truth）：
- 中央 issues：https://github.com/daodaoedu/daodao/issues（feature 卡，product 視角）
- Org board：https://github.com/orgs/daodaoedu/projects/10「Planning」
- Status 流：`Todo`（待規劃）→ `Ready for Dev`（spec 完成、可 dispatch）→ `In Progress`（已 dispatch / 開發中）→ `Done`

**Board 常數**：Project ID `PVT_kwDOBTLl0c4Bgxef`；Status field `PVTSSF_lADOBTLl0c4Bgxefzhfvwto`（Todo `f75ad846` / In Progress `47fc9ee4` / Ready for Dev `c9e0e5d5` / Done `98236657`）

**雙軌 issue**：中央 issue 管「要做什麼」；Routine A dispatch 時在目標 sub-repo 開**鏡像 issue**（掛為中央 issue 的 sub-issue）給 agent 實作，PR 開在 sub-repo。

---

## Routine A（Board → Sub-repo Dispatch）— **由 GitHub Actions 執行，非 Claude**

實作：`bin/pipeline/dispatch.ts`（純 script，`--dry-run` 支援），由
`.github/workflows/pipeline-dispatch.yml` 每小時執行。Claude 只在手動情境介入
（debug、或使用者要求手動 dispatch 時直接跑 `pnpm tsx bin/pipeline/dispatch.ts --dry-run` 先看）。

Script 行為（判斷邏輯在 `bin/pipeline/lib.ts`，有 vitest 測試）：
1. `.automation-paused` 存在 → exit 0
2. 掃 board `Status=Ready for Dev`，issue 需無 `dispatched`/`needs-spec`/`human-driving`、state open（Ready for Dev 即派工；`human-driving` 是退出閥）
3. **Spec gate**：body 的 `OpenSpec: <slug>` 註記 + `openspec/changes/<slug>/tasks.md` 存在，否則標 `needs-spec` + comment
4. **規則化拆卡**：tasks.md 每個 `## section` 一張鏡像 issue；target repo 依「section 標題 → task 內文提及的 sub-repo 名稱 → 卡片唯一 `repo:*` label」判定，判不出 → `needs-spec` 退回
5. 鏡像 issue 掛 sub-issue、中央卡 `dispatched` + comment、board → In Progress；每輪最多 3 張卡
6. 冪等：以鏡像 title + body 的 `Parent:` 反查去重，部分失敗不標 `dispatched`，下輪續跑

高風險 repo（`daodao-storage` / `daodao-infra`）：鏡像 issue 一律 `auto:plan-only`，不論中央卡 label。
執行模式：中央卡有 `auto:auto-pr` → 鏡像 issue 直接開 code PR；否則一律 plan-only。

---

## Routine B（Dispatch + PR patrol）

與 Notion 時代邏輯相同，僅資料來源不變（sub-repo auto issues 本來就是輸入）：

```
階段 0：cd monorepo root；確認 .automation-paused 不存在
階段 1：pnpm tsx bin/routine-dispatch/spec-merged-scan.ts
        成功 → 更新 state-store.json:last_scan_at；失敗 → 跳過 timestamp 更新，繼續
階段 2：對 8 個 sub-repo 掃 auto issue（每輪實際操作最多 5 個）
        gh issue list --repo daodaoedu/<repo> --label auto --state open --json number,labels --limit 10
        對每個 issue：bash bin/routine-dispatch/main.sh <repo> <issue-num>
階段 3：PR patrol（verbatim 保留既有 trig_01KATY 邏輯）
```

Sub-repos: `daodao-server / daodao-f2e / daodao-ai-backend / daodao-storage / daodao-admin-ui / daodao-infra / daodao-mcp / daodao-worker`
高風險（`storage / infra`）：state.ts 規則 0 強制 plan-only，不論 issue label

---

## Routine C（PR merged → Board Done）— **由 GitHub Actions 執行，非 Claude**

實作：`bin/pipeline/board-sync.ts`（`--dry-run` / `--hours <n>` 支援），由
`.github/workflows/pipeline-board-sync.yml` 每小時執行。

Script 行為：
1. `.automation-paused` 存在 → exit 0
2. 掃 lookback 內各 sub-repo merged 的 `auto` PR，依 body 的 `Closes #n` 補關鏡像 issue
3. 從鏡像 issue body 的 `Parent: daodaoedu/daodao#<n>` 反查中央卡：
   - 全部鏡像 closed → `✅ 全部完成` comment + board → `Done`；**不自動 close 中央 issue**（留給 product 驗收）
   - 尚有 open → `⏳ {done}/{total}` 進度 comment（同日同進度去重）

---

## Agentic Implementation（Handler 呼叫 Claude 時）

執行前讀取：
- 鏡像 issue body（Description + Acceptance Criteria + Parent 連結）
- Spec（若有）：`openspec/changes/{change_id}/`
- ADR：`docs/adr/`（grep 關鍵字）
- 確認 branch 為 `auto/{issue_num}-{slug}`

依 scope 執行流程 → 見 `references/agentic-flows.md`

PR body 模板 → 見 `references/templates.md#pr-body`

---

## Issue Comment 語句

留言時直接套用 → 見 `references/templates.md#comments`

---

## Commit 規範

```
{type}({area}): {description}

Co-Authored-By: daodao-pipeline <noreply@daodaoedu.github.com>
```

type: `feat` / `fix` / `test` / `plan` / `chore`
**不使用** `format-commit` skill（那是互動式的）

---

## 錯誤處理快查

| 情況 | 處置 |
|------|------|
| token 超 cap | 加 `human-coding` label，留 comment，exit |
| 偵測到 `human-driving` | 呼叫 `handoff.sh`，不繼續 |
| verification 2 次失敗 | 加 `human-coding`，留 comment，exit |
| tool 被 blocklist 擋 | log BLOCKED，exit 3 |
| openspec-headless exit 2 | 留 comment 說明缺什麼，exit |
| board item-edit 失敗 | 留 comment 註記「board 未更新，需手動拖卡」，繼續其他工作 |

詳細架構 → `docs/automation/github-pipeline.md`
