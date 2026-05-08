# Pipeline Architecture

## Overview

Notion → GitHub Issue → Plan → PR 自動化 pipeline，把 Notion 任務 DB 中標記為「可開發」的卡片自動同步成 GitHub sub-repo issue，再由 Claude Code routine 接力做 plan、code、開 PR。

**兩道閘門**：`Status=Ready for Dev` AND `Sync to GitHub=true` 才觸發同步。

**8 個 sub-repo**：`daodao-server`、`daodao-f2e`、`daodao-ai-backend`、`daodao-storage`、`daodao-admin-ui`、`daodao-infra`、`daodao-mcp`、`daodao-worker`

**高風險 repo**（強制 plan-only）：`daodao-storage`（SQL migration，零容忍）、`daodao-infra`（IaC、ops）

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
   │  step 1：對每個 auto issue 跑                          │
   │           `bin/routine-dispatch/main.sh <repo> <num>`  │
   │           dispatch by labels:                          │
   │  ┌──────────────────────────────────────────────┐      │
   │  │ scope:XS → plan+code 一個 PR (sub-repo)       │      │
   │  │ scope:S  → plan.md + code 一個 PR             │      │
   │  │ scope:M  → 兩階段：                           │      │
   │  │   Phase 1 (無 spec-merged):                  │      │
   │  │     在 monorepo 開 spec PR (headless)         │      │
   │  │   Phase 2 (有 spec-merged):                  │      │
   │  │     在 sub-repo 開 code PR                    │      │
   │  │ scope:L  → 只跑 Phase 1，加 human-coding     │      │
   │  │ auto:plan-only → 永遠停在 plan 階段          │      │
   │  └──────────────────────────────────────────────┘      │
   │                                                        │
   │  + PR 巡邏（既有邏輯保留 verbatim）                     │
   └────────────────────────────────────────────────────────┘
```

## Key Components

### Routine A — Notion-to-Issue (`bin/notion-sync/`)

| 檔案 | 用途 |
|---|---|
| `notion-client.ts` | `@notionhq/client` wrapper |
| `dedup.ts` | 用 `gh issue list --label notion:<short-id>` 即時查重 |
| `sync.ts` | 主流程 |
| `types.ts` | Zod schema for Notion DB row |
| `schema-validate.ts` | DB schema 驗證（fail-loud） |

**Relaxed mode fallback**（Notion schema 尚未補齊時）：
- `Auto Mode` 缺失 → 鎖定 `plan-only`
- `Scope` 缺失 → 鎖定 `M`
- `Target Repo` 缺失 → 鎖定 `daodao-f2e` + 警示 comment

### Routine B — Dispatch (`bin/routine-dispatch/`)

| 檔案 | 用途 |
|---|---|
| `main.sh` | dispatch entry |
| `state.ts` | 推導 issue 狀態（needs-spec / spec-in-review / needs-code / done / human-blocked / …） |
| `spec-merged-scan.ts` | pull-based 掃 monorepo merged spec PR，cross-repo 寫 `spec-merged` label |
| `handlers/{xs,s,m,l}.sh` | 依 scope 執行的 handler |
| `handoff.sh` | human-driving 時清 auto label + audit comment |
| `state-store.json` | 持久化 last_scan_at / token_usage / ports_in_use |

### Label Precedence（state machine 衝突解析）

```
0. target-repo:storage|infra → 強制 plan-only（hard-coded，修改需 PR review）
1. automation:hold           → skip this round
2. human-driving             → skip permanently
3. manual                    → skip permanently
4. stop-after-plan           → 跑到 plan 階段後停
5. 標準 dispatch             → 依 auto:* + scope:* + spec-merged 處理
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
