# Pipeline Architecture（v3 工單模式）

## Overview

Notion → GitHub Issue → Plan → PR 自動化 pipeline，把 Notion 任務 DB 中標記為「可開發」的卡片自動同步成 GitHub sub-repo issue，再由 Claude Code routine 接力做 plan、code、開 PR，並將進度回寫 Notion。

v3 的核心設計是「**工單模式（ticket mode）**」：所有決策與防護都在腳本裡（`next.sh` 出工單、`verify.sh` 驗收），CCR session 的模型只負責照工單實作程式碼——不呼叫巢狀 `claude` CLI、不產生子代理。護欄是確定性的、在執行路徑上強制執行的，任何尺寸的模型都能安全操作。設計緣由詳見 [docs/adr/005-ticket-mode-v3.md](../adr/005-ticket-mode-v3.md)。

**單一事實來源（SSOT）**：[`bin/pipeline.config.json`](../../bin/pipeline.config.json)——org、repo 清單（含 defaultBranch / install / 品質指令）、高風險 repo、scope caps、quotas、model 配置全部在此，其他任何地方不得硬編碼（見 [ADR-008](../adr/008-config-ssot.md)）。修改此檔需 PR review。

**兩道閘門**：`Status=Ready for Dev` AND `Sync to GitHub=true` 才觸發同步。

**8 個 sub-repo**：`daodao-server`、`daodao-f2e`、`daodao-ai-backend`、`daodao-storage`、`daodao-admin-ui`、`daodao-infra`、`daodao-mcp`、`daodao-worker`

**高風險 repo**（強制 plan-only）：`daodao-storage`（SQL migration，零容忍）、`daodao-infra`（IaC、ops）。清單維護在 `pipeline.config.json` 的 `highRiskRepos`，三層防護見 [ADR-001](../adr/001-high-risk-repos-plan-only.md)。

## Notion Status Lifecycle

Notion 任務的狀態由三個 Routine 協作維護，形成完整的進度追蹤：

```
Ready for Dev
    │ Routine A：建立 GitHub Issue
    ▼
In progress
    │
    ├─ M/L scope ──→ Routine B 建 spec PR（在 monorepo）
    │                    ▼
    │               Spec Review  ← 等人 review & merge
    │                    │ spec merged（spec-merged-scan 回貼 label）
    │                    │ Routine B 下一輪建 code PR
    │                    │
    └─ XS/S scope ───────┤ Routine B 直接建 code PR（在 sub-repo）
                         ▼
                     PR Open  ← Routine C（code PR open）
                         │
                         ▼
                     Review  ← Routine C（code PR merged）
                         │ 人工確認產出
                         ▼
                      Done  ← 人工手動
```

| Notion Status | 由誰寫 | 觸發條件 |
|---|---|---|
| `Ready for Dev` | 人工 | 任務建立，準備進入 pipeline |
| `In progress` | Routine A | GitHub issue 建立後 |
| `Spec Review` | verify.sh（Routine B） | Spec PR 建立後 |
| `PR Open` | Routine C | Code PR open（`tracked` label）|
| `Review` | Routine C | Code PR merged（`tracked` label）|
| `Done` | 人工 | 確認 merged 產出符合需求後手動標記 |

狀態**單向推進、永不倒退**（[ADR-004](../adr/004-monotonic-notion-status.md)）；merged 只推到 `Review`，`Done` 由人類收尾（[ADR-003](../adr/003-merge-sets-review-not-done.md)）。

## PR Naming Convention

所有 PR 標題與 label 規則由 `verify.sh` 強制執行：

| PR 類型 | 所在 repo | 標題格式 | Labels |
|---|---|---|---|
| Spec PR | **monorepo（daodao）** | `[spec] <repo>#<issue-num> <issue-title>` | `auto` + `spec-pending` |
| Routine B code PR | sub-repo | `[auto] #<issue-num> <issue-title>` | `auto` + `tracked` |
| 人工 PR | sub-repo | 自由格式 | 手動加 `tracked` 以納入 Notion 追蹤 |

**Spec PR 住在 monorepo**：spec 內容寫在 monorepo 的 `openspec/changes/<repo>-<num>-<slug>/`，PR body 用 `Spec-For: daodaoedu/<repo>#<num>` 標記對應 issue（而非 `Closes`，避免 GitHub 在 spec merge 時自動關閉 sub-repo issue）。`spec-merged-scan.ts` 解析 `Spec-For:`（也支援 Closes/Fixes/Resolves）回貼 `spec-merged` label。詳見 [ADR-007](../adr/007-spec-prs-in-monorepo.md)。

**`tracked` label**：表示「此 PR 需回寫 Notion 進度」，與 `auto`（dispatch trigger）語意分開（[ADR-002](../adr/002-tracked-vs-auto-labels.md)）。Spec PR 不加 `tracked`，由 verify.sh 直接呼叫 `update-status.ts` 寫回 `Spec Review`。

## ASCII Diagram

```
                     ┌─────────────────────┐
                     │  Notion DB          │
                     │  (daodaolearn 任務)  │
                     └─────────┬───────────┘
                               │ Notion API (cron)
                               ▼
   ┌────────────────────────────────────────────────────────┐
   │ Routine A：Notion-to-Issue（bin/notion-sync/，無 LLM）  │
   │  • cron 每小時                                          │
   │  • 篩 Status=Ready for Dev ∧ SyncToGitHub=true         │
   │  • upsert issue（用 label `notion:<short-id>` 去重）   │
   │  • 加 label: auto / auto:plan-only|auto-pr / scope:*   │
   │      / target-repo:daodao-server|daodao-f2e            │
   │        |daodao-ai-backend|daodao-storage               │
   │        |daodao-admin-ui|daodao-infra                   │
   │        |daodao-mcp|daodao-worker                       │
   │  • 寫回 Notion 「GitHub Issue」欄位                     │
   │  • 寫回 Notion Status = "In progress"                  │
   │  • flock 鎖：同一時間只能跑一個 instance               │
   └─────────────────────┬──────────────────────────────────┘
                         │
                         ▼
        ┌──────────────────────────────────────┐
        │  GitHub Issue（在 sub-repo）           │
        │  labels: auto / auto:* / scope:*      │
        │          target-repo:* / notion:<id>  │
        │  body 含 Notion link（可讀，非 dedup） │
        └─────────────────┬────────────────────┘
                          │ Routine B（CCR session）
                          ▼
   ┌────────────────────────────────────────────────────────┐
   │ Routine B：工單模式（v3）                               │
   │                                                        │
   │  固定迴圈（prompt 見 routine-b-prompt-v3.md）：         │
   │                                                        │
   │  ① bash bin/routine-dispatch/next.sh                   │
   │     • kill-switch 檢查（.automation-paused*）           │
   │     • 每小時輪次 quota（operatePerRound=5）             │
   │     • 跑 spec-merged-scan.ts（回貼 spec-merged label） │
   │     • 掃各 repo auto issues（fetchPerRepo=10）          │
   │     • state.ts 推導狀態；human-driving → handoff.sh    │
   │     • 準備工作區與 branch：                             │
   │       code：clone 到 /tmp/daodao-work/<repo>，          │
   │             branch auto/<num>-<slug>                   │
   │       spec：monorepo，branch                            │
   │             auto/spec-<repo>-<num>-<slug>，             │
   │             change dir openspec/changes/               │
   │                        <repo>-<num>-<slug>/            │
   │     • 寫 run-state 到 bin/routine-dispatch/runs/       │
   │     • 印出 PIPELINE TICKET                             │
   │                                                        │
   │  ② session 模型照工單親自實作（寫 code 或寫 spec；      │
   │     不呼叫 claude CLI、不產生子代理）                   │
   │                                                        │
   │  ③ bash bin/routine-dispatch/verify.sh（唯一品質閘門） │
   │     exit 0 → 已 push + 開 PR + 貼 label → 回到 ①       │
   │     exit 4 → 照缺陷清單修正，重跑同一個 verify.sh      │
   │     exit 5 → 重試耗盡（verifyAttempts=2），             │
   │              已自動貼 human-coding 升級 → 回到 ①        │
   │                                                        │
   │  ④ PR 巡邏（prPatrolPerRound=3）：                      │
   │     spec-pending / human-driving → 跳過                │
   │     requested changes / failing CI → 修改 push         │
   └────────────────────────┬───────────────────────────────┘
                            │
                            ▼
   ┌────────────────────────────────────────────────────────┐
   │ Routine C：PR State → Notion Status（無 LLM）           │
   │  • cron 每小時                                          │
   │  • 掃 tracked label 的 open PR → Status="PR Open"      │
   │  • 掃 tracked label 的 merged PR → Status="Review"     │
   │    （人工確認產出後手動改 Done）                       │
   │  • 跳過有 spec-pending label 的 PR                     │
   │  • 同時寫回 Notion「GitHub PR」欄位                     │
   └────────────────────────────────────────────────────────┘
```

## Key Components

### SSOT — `bin/pipeline.config.json`

| 區塊 | 內容 |
|---|---|
| `org` / `monorepo` / `workRoot` | `daodaoedu` / `daodao` / `/tmp/daodao-work` |
| `repos` | 8 個 sub-repo 的 defaultBranch、install 指令、品質指令（fix/lint/typecheck/test） |
| `highRiskRepos` | `daodao-storage`、`daodao-infra`（強制 plan-only） |
| `scopeCaps` | 每個 scope 的 `maxFiles` + `maxDiffLines`（XS=3/300、S=10/1200、M=30/4000、L=0/0） |
| `quotas` | `fetchPerRepo=10`、`operatePerRound=5`、`prPatrolPerRound=3`、`verifyAttempts=2` |
| `models` | dispatch / reviewer / judge 皆為 `claude-haiku-4-5-20251001` |

### Routine A — Notion-to-Issue (`bin/notion-sync/`)

| 檔案 | 用途 |
|---|---|
| `notion-client.ts` | `@notionhq/client` wrapper |
| `dedup.ts` | 用 `gh issue list --label notion:<short-id>` 即時查重 |
| `sync.ts` | 主流程；建立 issue 後回寫 Issue URL + Status=`In progress` |
| `types.ts` | Zod schema for Notion DB row |
| `schema-validate.ts` | DB schema 驗證（fail-loud） |
| `update-status.ts` | CLI 工具：`<pageId> <status>` → 更新 Notion Status 欄位 |

**Relaxed mode fallback**（Notion schema 尚未補齊時）：
- `Auto Mode` 缺失 → 鎖定 `plan-only`
- `Scope` 缺失 → 鎖定 `M`
- `Target Repo` 缺失 → 鎖定 `daodao-f2e` + 警示 comment

### Routine B — 工單模式 (`bin/routine-dispatch/`)

| 檔案 | 用途 |
|---|---|
| `next.sh` | **確定性 driver**：kill-switch、輪次 quota、spec-merged-scan、掃 auto issues、state 推導、工作區/branch 準備、寫 run-state、印出 PIPELINE TICKET |
| `verify.sh` | **唯一品質閘門**：write-path blocklist、scope caps（檔案數 + diff 行數）、scope:S 需 PLAN.md、spec-mode 邊界檢查、跑 per-repo 品質指令；通過 → push + PR + label + comment + Notion 回寫；失敗 → 重試（最多 2 次）→ `human-coding` 升級（exit 5） |
| `state.ts` | 推導 issue 狀態（needs-spec / spec-in-review / needs-code / done / human-blocked / …），label → state 唯一權威 |
| `spec-merged-scan.ts` | 掃 monorepo merged spec PR，解析 `Spec-For:`（及 Closes/Fixes/Resolves）refs，cross-repo 寫 `spec-merged` label |
| `handoff.sh` | human-driving 時清 auto label + audit comment |
| `kill-switch.sh` | 檢查 `.automation-paused*` 檔案 |
| `config.ts` | 讀取 `bin/pipeline.config.json` |
| `policy/write-path-blocklist.json` | 禁改路徑清單（verify.sh 強制執行） |
| `runs/` | per-issue run-state（attempt 次數、workspace、branch） |

CCR session prompt 見 [routine-b-prompt-v3.md](routine-b-prompt-v3.md)；操作 SOP 見 [OPERATOR.md](OPERATOR.md)。

### Routine C — PR State → Notion (`bin/routine-c/`)

| 檔案 | 用途 |
|---|---|
| `sync-done.ts` | 掃 `tracked` label 的 PR，回寫 Notion Status + GitHub PR URL |

- **Open PR** → `PR Open`
- **Merged PR** → `Review`（人工確認產出後手動改 `Done`，見 [ADR-003](../adr/003-merge-sets-review-not-done.md)）
- **跳過** 有 `spec-pending` label 的 PR（spec 狀態由 verify.sh 直接寫）
- **單向推進**：寫入前先讀 Notion 現有 Status，若已在目標狀態或更後面（如 `Done`）則跳過，避免倒退覆寫（[ADR-004](../adr/004-monotonic-notion-status.md)）

### Label 一覽

| Label | 意義 | 由誰加 |
|---|---|---|
| `auto` | Routine B dispatch trigger | Routine A / verify.sh |
| `notion:<short-id>` | dedup 用，對應 Notion pageId | Routine A |
| `scope:XS/S/M/L` | 任務規模 | Routine A |
| `target-repo:<repo>` | 對應 sub-repo（全名） | Routine A |
| `spec-pending` | Spec PR 等待 review | verify.sh |
| `spec-merged` | Spec PR 已 merge，可進入 code 階段 | spec-merged-scan |
| `auto-pr-open` | Code PR 已建立，防止重複 dispatch | verify.sh |
| `tracked` | **此 PR 需回寫 Notion 進度** | verify.sh（code PR）/ 人工 |
| `automation:hold` | 暫停此 issue 的自動化 | 人工 |
| `human-driving` | 人類永久接管 | 人工 |
| `human-coding` | 驗證失敗，升級給人類 | verify.sh |

### Label Precedence（state machine 衝突解析）

```
0. target-repo:daodao-storage|daodao-infra → 強制 plan-only
   （清單在 pipeline.config.json highRiskRepos，修改需 PR review）
1. auto-pr-open              → done（code PR 已建立）
2. automation:hold           → skip this round
3. human-driving             → skip permanently
4. human-coding              → skip permanently
5. manual                    → skip permanently
6. stop-after-plan           → 跑到 plan 階段後停
7. 標準 dispatch             → 依 auto:* + scope:* + spec-merged 處理
```

### 護欄（The Walls，v3）

所有護欄都是**確定性腳本**、都在**執行路徑上**（設計原則見 [ADR-005](../adr/005-ticket-mode-v3.md)）：

- **Write-path blocklist**（`policy/write-path-blocklist.json`）：禁止寫入 `.github/workflows/`、`.env*`、`secrets/`、已 merged migration 等——由 verify.sh 強制檢查
- **Scope caps**：per-scope 檔案數 + diff 行數上限（`pipeline.config.json` 的 `scopeCaps`），verify.sh 強制；token cap 已移除（無法強制執行，見 [ADR-006](../adr/006-scope-caps-replace-token-budget.md)）
- **Verification retry**：verify.sh 失敗最多重試 2 次（`verifyAttempts`），耗盡即 escalate + 加 `human-coding` label（exit 5）
- **Spec-mode 邊界**：spec ticket 只允許改 `openspec/changes/<change_id>/` 內的檔案，且必須含 `proposal.md` + `tasks.md`
- **Quota**：每輪最多操作 5 個 issue、巡邏 3 個 PR、每 repo 抓 10 個 issue
- **Push/PR 專責**：只有 verify.sh 能 push、開 PR、貼 label；模型不可自行執行

### 三層高風險防護

高風險 repo（`daodao-storage`、`daodao-infra`）永遠 plan-only，三層獨立防護：

1. **Routine A（sync.ts）**：建 issue 時直接鎖 `auto:plan-only`
2. **state.ts Rule 0**：dispatch 時強制降級為 plan-only
3. **verify.sh**：高風險 repo 無品質指令、scope caps 擋下任何 code diff

詳見 [ADR-001](../adr/001-high-risk-repos-plan-only.md)。

## Kill Switches（4 粒度）

| 粒度 | 方式 |
|---|---|
| 全域暫停 | 在 monorepo 根 `touch .automation-paused` |
| Per-repo 暫停 | `touch .automation-paused-<repo>` |
| Per-issue 暫停 | 加 label `automation:hold` |
| 人類接管 | 加 label `human-driving` |

## 相關文件

- [routine-b-prompt-v3.md](routine-b-prompt-v3.md) — CCR prompt（現行）
- [OPERATOR.md](OPERATOR.md) — 操作 SOP
- [troubleshooting.md](troubleshooting.md) — failure modes 與處置
- [docs/adr/](../adr/README.md) — 架構決策紀錄
- `.claude/skills/notion-pipeline/SKILL.md` — routine 行為規範 skill
