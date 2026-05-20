# Pipeline Architecture

## Overview

Notion → GitHub Issue → Plan → PR 自動化 pipeline，把 Notion 任務 DB 中標記為「可開發」的卡片自動同步成 GitHub sub-repo issue，再由 Claude Code routine 接力做 plan、code、開 PR，並將進度回寫 Notion。

**兩道閘門**：`Status=Ready for Dev` AND `Sync to GitHub=true` 才觸發同步。

**8 個 sub-repo**：`daodao-server`、`daodao-f2e`、`daodao-ai-backend`、`daodao-storage`、`daodao-admin-ui`、`daodao-infra`、`daodao-mcp`、`daodao-worker`

**高風險 repo**（強制 plan-only）：`daodao-storage`（SQL migration，零容忍）、`daodao-infra`（IaC、ops）

## Notion Status Lifecycle

Notion 任務的狀態由三個 Routine 協作維護，形成完整的進度追蹤：

```
Ready for Dev
    │ Routine A：建立 GitHub Issue
    ▼
In progress
    │
    ├─ M/L scope ──→ Routine B 建 spec PR
    │                    ▼
    │               Spec Review  ← 等人 review & merge
    │                    │ spec merged
    │                    │ Routine B 下一輪建 code PR
    │                    │
    └─ XS/S scope ───────┤ Routine B 直接建 code PR
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
| `Spec Review` | Routine B | Spec PR 建立後 |
| `PR Open` | Routine C | Code PR open（`tracked` label）|
| `Review` | Routine C | Code PR merged（`tracked` label）|
| `Done` | 人工 | 確認 merged 產出符合需求後手動標記 |

## PR Naming Convention

所有 PR 標題與 label 規則由 Routine B 強制執行：

| PR 類型 | 標題格式 | Labels |
|---|---|---|
| Spec PR | `[spec] #<issue-num> <issue-title>` | `auto` + `spec-pending` |
| Routine B code PR | `[auto] #<issue-num> <issue-title>` | `auto` + `tracked` |
| 人工 PR | 自由格式 | 手動加 `tracked` 以納入 Notion 追蹤 |

**`tracked` label**：表示「此 PR 需回寫 Notion 進度」，與 `auto`（Routine B dispatch trigger）語意分開。Spec PR 不加 `tracked`，由 Routine B 直接呼叫 `update-status.ts` 寫回。

## ASCII Diagram

```
                     ┌─────────────────────┐
                     │  Notion DB          │
                     │  (daodaolearn 任務)  │
                     └─────────┬───────────┘
                               │ Notion API (cron)
                               ▼
   ┌────────────────────────────────────────────────────────┐
   │ Routine A：Notion-to-Issue                             │
   │  • cron 每小時                                          │
   │  • 篩 Status=Ready for Dev ∧ SyncToGitHub=true         │
   │  • upsert issue（用 label `notion:<short-id>` 去重）   │
   │  • 加 label: auto / auto:plan-only|auto-pr / scope:*   │
   │             / target-repo:server|f2e|ai-backend|stor   │
   │  • 寫回 Notion 「GitHub Issue」欄位                     │
   │  • 寫回 Notion Status = "In progress"                  │
   │  • flock 鎖：同一時間只能跑一個 instance               │
   └─────────────────────┬──────────────────────────────────┘
                         │
                         ▼
        ┌──────────────────────────────────────┐
        │  GitHub Issue（在 sub-repo）           │
        │  labels: auto / auto:* / scope:*      │
        │          notion:<short-id>            │
        │  body 含 Notion link（可讀，非 dedup） │
        └─────────────────┬────────────────────┘
                          │ Routine B watch
                          ▼
   ┌────────────────────────────────────────────────────────┐
   │ Routine B（改造 trig_01KATY）                           │
   │                                                        │
   │  入口：cd 到 monorepo 根                                │
   │  step 0：跑 spec-merged-scan.ts                       │
   │           query monorepo merged spec PRs（自上次掃描起）│
   │           解析 PR body 的 issue ref → 寫               │
   │           `spec-merged` label 到對應 sub-repo issue    │
   │                                                        │
   │  step 1：對每個 auto issue 跑 state machine             │
   │           dispatch by labels:                          │
   │  ┌──────────────────────────────────────────────┐      │
   │  │ scope:XS → plan+code 一個 PR (sub-repo)       │      │
   │  │   PR: [auto] #<num> <title>  labels: auto+tracked  ││
   │  │ scope:S  → plan.md + code 一個 PR             │      │
   │  │   PR: [auto] #<num> <title>  labels: auto+tracked  ││
   │  │ scope:M  → 兩階段：                           │      │
   │  │   needs-spec: 在 sub-repo 開 spec PR          │      │
   │  │     PR: [spec] #<num> <title>  labels: auto+spec-pending  ││
   │  │     → 回寫 Notion Status="Spec Review"        │      │
   │  │   needs-code: 在 sub-repo 開 code PR          │      │
   │  │     PR: [auto] #<num> <title>  labels: auto+tracked  ││
   │  │ scope:L  → 只開 spec PR，code 由人類接手      │      │
   │  │ auto:plan-only → 永遠停在 plan 階段          │      │
   │  └──────────────────────────────────────────────┘      │
   │                                                        │
   │  + PR 巡邏 Stage 3：                                   │
   │    spec-pending label → 跳過（spec 由人類 review）      │
   │    human-driving label → 跳過                          │
   │    requested changes / failing CI → 修改 push          │
   └────────────────────────────────────────────────────────┘
                          │
                          ▼
   ┌────────────────────────────────────────────────────────┐
   │ Routine C：PR State → Notion Status                    │
   │  • cron 每小時                                          │
   │  • 掃 tracked label 的 open PR → Status="PR Open"      │
   │  • 掃 tracked label 的 merged PR → Status="Review"     │
   │    （人工確認產出後手動改 Done）                       │
   │  • 跳過有 spec-pending label 的 PR                     │
   │  • 同時寫回 Notion「GitHub PR」欄位                     │
   └────────────────────────────────────────────────────────┘
```

## Key Components

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

### Routine B — Dispatch (`docs/automation/routine-b-prompt-v2.md`)

| 檔案 | 用途 |
|---|---|
| `state.ts` | 推導 issue 狀態（needs-spec / spec-in-review / needs-code / done / human-blocked / …） |
| `spec-merged-scan.ts` | 掃 sub-repo merged spec PR，cross-repo 寫 `spec-merged` label |
| `handlers/{xs,s,m,l}.sh` | 依 scope 執行的 handler |
| `handoff.sh` | human-driving 時清 auto label + audit comment |
| `state-store.json` | 持久化 last_scan_at / token_usage / ports_in_use |

### Routine C — PR State → Notion (`bin/routine-c/`)

| 檔案 | 用途 |
|---|---|
| `sync-done.ts` | 掃 `tracked` label 的 PR，回寫 Notion Status + GitHub PR URL |

- **Open PR** → `PR Open`
- **Merged PR** → `Review`（人工確認產出後手動改 `Done`）
- **跳過** 有 `spec-pending` label 的 PR（spec 狀態由 Routine B 直接寫）

### Label 一覽

| Label | 意義 | 由誰加 |
|---|---|---|
| `auto` | Routine B dispatch trigger | Routine A / Routine B |
| `notion:<short-id>` | dedup 用，對應 Notion pageId | Routine A |
| `scope:XS/S/M/L` | 任務規模 | Routine A |
| `spec-pending` | Spec PR 等待 review | Routine B |
| `spec-merged` | Spec PR 已 merge，可進入 code 階段 | spec-merged-scan |
| `auto-pr-open` | Code PR 已建立，防止重複 dispatch | Routine B |
| `tracked` | **此 PR 需回寫 Notion 進度** | Routine B（code PR）/ 人工 |
| `automation:hold` | 暫停此 issue 的自動化 | 人工 |
| `human-driving` | 人類永久接管 | 人工 |
| `human-coding` | 驗證失敗，升級給人類 | Routine B |

### Label Precedence（state machine 衝突解析）

```
0. target-repo:storage|infra → 強制 plan-only（hard-coded，修改需 PR review）
1. auto-pr-open              → done（code PR 已建立）
2. automation:hold           → skip this round
3. human-driving             → skip permanently
4. human-coding              → skip permanently
5. manual                    → skip permanently
6. stop-after-plan           → 跑到 plan 階段後停
7. 標準 dispatch             → 依 auto:* + scope:* + spec-merged 處理
```

### The Walls（15 Engineering Disciplines）

詳見 plan §5。關鍵 wall：

- **Tool allowlist**（`policy/tool-allowlist.json`）：handler 只能呼叫預核可的命令
- **Write-path blocklist**（`policy/write-path-blocklist.json`）：禁止寫入 `.github/workflows/`、`.env*`、`secrets/`、已 merged migration 等
- **Verification loop**：最多 2 次 retry，第 3 次直接 escalate + 加 `human-coding` label
- **Token budget**：per-scope cap hard-coded（XS=50k / S=200k / M=800k / L=1.5M）
- **Model routing**：dispatch=Haiku / handler=Sonnet / spec=Opus / judge=Haiku

## Kill Switches（4 粒度）

| 粒度 | 方式 |
|---|---|
| 全域暫停 | `touch .automation-paused` |
| Per-repo 暫停 | `touch .automation-paused-<repo>` |
| Per-issue 暫停 | 加 label `automation:hold` |
| 人類接管 | 加 label `human-driving` |
