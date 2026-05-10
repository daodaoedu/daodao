---
name: notion-pipeline
description: daodao Notion→Issue→Plan→PR 自動化 pipeline 的 routine 行為規範。Use when running Routine A/B, implementing an auto issue, opening a pipeline PR, or writing pipeline comments. Triggered by keywords: routine, pipeline, auto issue, handler, agentic phase, notion-sync, dispatch.
---

# notion-pipeline

daodao 自動化 pipeline 行為規範。Routine A/B 在 agentic phase 前必須載入此 skill。

Monorepo root: `/Users/xiaoxu/Projects/daodao`

---

## Routine A（Notion → Issue）

1. 確認三個 env 存在（`NOTION_API_KEY` / `NOTION_DB_ID` / `GITHUB_TOKEN`），缺任一 → abort
2. 確認 `.automation-paused` 不存在，否則 exit 0
3. 執行：`flock -n /tmp/notion-sync.lock pnpm tsx bin/notion-sync/sync.ts`
4. 回報完整 stdout/stderr + exit code；若非 0，印 `.omc/logs/notion-sync-latest.log` 後 80 行
5. 執行：`pnpm tsx bin/pipeline-status.ts` → commit + push（`[skip ci]`）

Issue body 模板 → 見 `references/templates.md#issue-body`

---

## Routine B（Dispatch + PR patrol）

```
階段 0：cd monorepo root；確認 .automation-paused 不存在
階段 1：pnpm tsx bin/routine-dispatch/spec-merged-scan.ts
        成功 → 更新 state-store.json:last_scan_at；失敗 → 跳過 timestamp 更新，繼續
階段 2：對 8 個 sub-repo 掃 auto issue（最多 3 個）
        gh issue list --repo daodaoedu/<repo> --label auto --state open --json number,labels --limit 3
        對每個 issue：bash bin/routine-dispatch/main.sh <repo> <issue-num>
階段 3：PR patrol（verbatim 保留既有 trig_01KATY 邏輯）
```

Sub-repos: `daodao-server / daodao-f2e / daodao-ai-backend / daodao-storage / daodao-admin-ui / daodao-infra / daodao-mcp / daodao-worker`
高風險（`storage / infra`）：state.ts 規則 0 強制 plan-only，不論 issue label

---

## Agentic Implementation（Handler 呼叫 Claude 時）

執行前讀取：
- Issue body（Description + Acceptance Criteria）
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

詳細 ADR 與架構 → `docs/automation/architecture.md`

---

## Routine C（PR merge → Notion Status = Done）

```
執行：pnpm tsx bin/routine-c/sync-done.ts [--dry-run] [--hours <n>]
```

流程：
1. 確認 `.automation-paused` 不存在，否則 exit 0
2. 掃描過去 48 小時（預設）各 sub-repo 中已 merge 的 `auto` label PR
3. 從 linked issue body 抓 `Notion page ID: \`...\``
4. 呼叫 Notion API 把對應卡片 Status 改成 `Done`

建議在 Routine B 跑完後接著執行，或在確認 PR 已 merge 時手動觸發。
