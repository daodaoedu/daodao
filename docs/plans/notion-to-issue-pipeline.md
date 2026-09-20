# Notion → GitHub Issue → Plan → PR 自動化 Pipeline

> **狀態**：✅ FINAL — 5 輪 Architect/Critic consensus + 多輪使用者反饋
> **作者**：Claude (consensus mode, RALPLAN-DR short)
> **日期**：2026-05-08
> **設計哲學**：The walls matter more than the model — agent 周圍的 guardrails 比 LLM 選擇更重要

---

## 1. Goal & Scope

把 Notion 任務 DB（`https://www.notion.so/daodaolearn/3549cc8126978036803af61048468bde`）裡標記為「可開發」的卡片自動同步成 GitHub `daodaoedu/<sub-repo>` 的 issue，再由 Claude Code routine 接力做 plan、code、開 PR，直到送上 review。

**範圍邊界**：
- 全自動程度：Notion → Issue → Plan → PR（人類只在 Notion 端把關 + PR review 把關）
- 涉及 **8 個 sub-repo**：`daodao-server`、`daodao-f2e`、`daodao-ai-backend`、`daodao-storage`、`daodao-admin-ui`、`daodao-infra`、`daodao-mcp`、`daodao-worker`
- **高風險 repo 強制 plan-only**：`daodao-storage`（SQL migration，零容忍）與 `daodao-infra`（IaC、ops）— handler 層硬拒 auto-pr，不論 Notion `Auto Mode` 設定為何（defense in depth）
- OpenSpec：`openspec/changes/` 在 monorepo 根（`daodaoedu/daodao`），code 落在 sub-repo
- 既有 routine：`trig_01KATYQz7tm8pGqqiLHdt4u5`（簡稱 trig_01KATY）已在做 issue→PR + PR 巡邏；本 plan 是擴充而非取代

**不在範圍**：
- 不自動 merge PR（人類仍是最後守門員）
- 不處理 Notion 端任務建立流程
- 完整 Notion 反向同步（PR merge → Notion comment / label / assignee 雙向）為下一版範圍；本版只做最簡單的 issue closed → Notion `Status=Done`

---

## 2. Design Philosophy

### Principles

1. **Two-gate filter**：Notion 端用 `Status=Ready for Dev` + `Sync to GitHub=true` 兩道閘門才同步。
2. **Risk-tiered automation**：依 scope 分流。XS/S 走快線、M 強制 spec 雙階段、L 強制人類接 code。
3. **Idempotent dedup**：upsert 靠 `notion:<short-id>` label 直接 match — label index 即時，避免 search index 延遲 race。
4. **Decoupled inputs**：Routine A（資料來源）與 Routine B（dispatch 引擎）解耦。跨 repo 是 inherent coupling，不假裝解耦，集中由 Routine B 處理。
5. **Existing-system-first**：擴充 trig_01KATY + OpenSpec workflow，新增工具視為「為既有 skill 補 headless 接口」。
6. **Human override at any layer**：人類加上特定 label 就能讓 routine 退場或停下，不需解鎖、不需等待狀態機收斂。**自動化是輔助，不是替代**。

### Decision Drivers

1. **安全性**：自動開 PR 是高風險動作，必須有 scope 硬閘門 + kill switch + 並發/誤勾防護。
2. **可觀測性 / 可逆性**：每一步可追溯（Notion ID ↔ Issue ↔ Spec PR ↔ Code PR），失敗不靜默。
3. **實作成本與維護負擔**：複雜邏輯放 monorepo `bin/`，可 review、可單測；routine prompt ≤60 行。

### The Walls > The Model

設計哲學收斂自 Stripe Minions 團隊原話：**The walls matter more than the model**。Routine 本身只是 Sonnet/Opus，真正承載可靠性的是 §5 列的 15 個 wall。

---

## 3. Pipeline Architecture

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

### Pull-based Cross-Repo State

Routine B 啟動時讀 `bin/routine-dispatch/state-store.json:last_scan_at`，掃 monorepo 從那時間點起所有 merged spec PR：

```bash
LAST_SCAN=$(jq -r '.last_scan_at // ""' bin/routine-dispatch/state-store.json)
# 冷啟動或 last_scan_at 缺失 → 取 24h 前作為 fallback 上限
SINCE=${LAST_SCAN:-$(date -v-1d -u +%Y-%m-%dT%H:%M:%SZ)}
gh pr list --repo daodaoedu/daodao --state merged \
  --search "openspec/changes/ merged:>$SINCE" \
  --json number,body,mergedAt,headRefName
# 成功完成所有 cross-repo label 寫入後，atomic 更新 last_scan_at = now()
```

- 解析 PR body 的 `Closes daodaoedu/<repo>#<num>` → 對應 sub-repo issue 加 `spec-merged` label
- 失敗時不更新 `last_scan_at`，下輪自動重試該時段；routine 停擺 N 天重啟後**不會漏窗**
- sub-repo issue 的 label 只是 cache；monorepo 的 merged PR + state-store.json 才是 source of truth

---

## 4. Why This Design — ADR

### Decision

採用 **Option B+：雙 routine + scope 分流 + pull-based cross-repo state**。

### Alternatives Considered

| Option | 為何不選 |
|---|---|
| A 單 routine 全包 | 單點故障、prompt 過長難 debug、與既有 trig_01KATY 衝突 |
| C 三 routine 拆 plan/code | 採 pull-based 後 C 並未真的解耦 cross-repo，反增 trigger 管理成本與運維面（兩條 routine 重複 query monorepo PR 狀態）|
| D Notion webhook → Cloud Function | 需 always-on 服務、Notion webhook 要付費 plan、cron 補洞仍需要兩套機制併存 |
| E GitHub Projects v2 取代 Notion | PM 工作流綁 Notion（與設計、stakeholder 共用），遷移超出本 plan 範圍；後段邏輯不變 |
| F 純 GitHub Actions（不用 routine）| GH Actions 跑不動 LLM agent，喪失 routine 核心價值；失去 PR 巡邏能力 |

### Why Chosen

B+ 在「跨 repo 邏輯集中於一處」與「每階段可獨立 disable / 重試」之間取得務實平衡。Pull-based 取代 push-based workflow 消除三個 actor 改 label 的不一致風險，且天然支援 backfill（重啟 routine 自動補洞）。

### Consequences

**正面**：
- 整條 pipeline 從 Notion 到 PR 全自動，PM 端只需勾選兩個 checkbox。
- 失敗易回退（kill switch 4 粒度 + `--legacy` flag）。
- M/L scope 強制人類在 plan 階段把關。

**負面**：
- Routine B 邏輯偏重，必須投資 unit test 與 shellcheck。
- 跨 repo state 仰賴 routine 規律執行；長時間停擺後 sub-repo issue 的 `spec-merged` label 會落後（但 backfill 可恢復）。
- `bin/openspec-headless.ts` 是「為既有 skill 補 headless 接口」的妥協，與 Principle 5 有微妙張力。
- Tier 3 嚴肅治理（Discord trigger / sub-agent council / runtime isolation）大幅增加實作複雜度（+10 個 module），長期回報是符合 Stripe / Ramp 等公司治理水準，但短期上線時間拉長。
- Sub-agent council 多次 LLM 呼叫使 token cost 比單 agent 高 3~5 倍；token budget cap 必須對應放寬，否則 scope:M 任務頻繁 abort。
- Discord-first trigger 引入新 ops 表面（Cloudflare Worker / fly.io）；建議單獨 defer 到 v1 上線後 1 個月再加。

### Follow-ups

1. v1 上線 2 週後檢視 risk #2 / #7 / #12 實際發生率，調整每日上限。
2. 若 PM 端反映 cron 延遲不可接受（>1h），評估升級到 Option D（webhook）。
3. 完整 Notion 反向同步（評論、label、assignee 雙向）。
4. `state.ts` state machine transition table（便於新人理解）。
5. 手動審核 OpenSpec skip-skill-layer fallback 路徑 — 上線後 30 天內若觸發次數 >0，補一個 ADR。
6. Visual DOM verification（Ramp Inspect 風格）— 前端 PR 自動截圖比對。
7. 擴展 sub-agent council 到 scope:S — 看 weekly evals dissent rate 決定。
8. Devbox / containerized sandbox（Stripe 風格）取代 worktree-based isolation — 上線 3 個月後評估。
9. Council 多 model 分歧偵測 — reviewer 用 GPT-4 或 Gemini Pro 跨家對比（呼應 OMC ccg skill 哲學）。

---

## 5. The Walls — 15 Engineering Disciplines

對齊 Stripe Minions / Ramp Inspect / Coinbase Cloudbot / Spotify Honk 共通模式 + AI Native 18 條實踐。把 disciplines 編進實作而非只當口號。

### 5.1 Blueprint Architecture（meta-pattern，applies to all handlers）

每個 handler 必須明確標出 deterministic / agentic / verification 段，呼應 Stripe Minions 5 層 pipeline。Handler 跑一次的標準節奏：

```
deterministic：cd worktree、git checkout -b auto/、source policy、pull base
agentic：     LLM 寫 code（Sonnet）
verification：pnpm lint && pnpm test
agentic（fail）：LLM 看 stderr 修（最多 2 次）
deterministic：git push、open PR
```

### 5.2 Tool & Write-Path Allowlist（Toolshed pattern）

**檔案**：
- `bin/routine-dispatch/policy/tool-allowlist.json`
- `bin/routine-dispatch/policy/write-path-blocklist.json`
- `bin/routine-dispatch/policy/enforce.sh`：handler 啟動時 source，wrap 所有 shell 命令做檢查

**Tool allowlist**（呼叫前過濾）：
- `gh issue *`、`gh pr *`、`gh label *`
- `git status/add/commit/push/diff`
- `pnpm install/test/lint/tsc`、`pytest`
- `bin/openspec-headless.ts`、`shellcheck`

**Write-path blocklist**（寫操作前過濾）：
- `.github/workflows/**`、`.env*`、`secrets/**`
- `migrate/sql/*` 中已 merged migration（用 `git log <base>..HEAD` 判斷）
- `apps/*/dist/`、`node_modules/`

**行為**：handler 嘗試呼叫不在 allowlist 的 tool（如 `curl https://example.com`）→ log「BLOCKED: tool 'X' not in allowlist」+ exit 3。寫到 blocklist path → 同樣 BLOCKED。

### 5.3 Verification Loop + Context Overflow Guard

**檔案**：`bin/routine-dispatch/verification-loop.sh`、`bin/routine-dispatch/estimate-context.ts`

```
attempt=0
estimated=$(bin/estimate-context.ts <repo> <issue>)
if [ $estimated -gt $((CONTEXT_WINDOW * 70 / 100)) ]; then
  escalate "context overflow predicted ($estimated tokens)"
  exit 4
fi
while [ $attempt -lt 2 ]; do
  run-handler-attempt
  pnpm lint && pnpm test && break
  attempt=$((attempt+1))
  feed-error-to-agent
done
if [ $attempt -ge 2 ]; then
  add-label human-coding
  add-comment "🚨 verification loop exhausted (2 retries). Escalating."
  exit 5
fi
```

呼應 Stripe 經驗「第 3 次修不好就不會修好」：第 3 次直接 escalate。

### 5.4 Token Budget per Issue

**檔案**：`bin/routine-dispatch/token-budget.ts`

**Hard-coded cap**（修改需 PR review）：

| Scope | Cap |
|---|---|
| `scope:XS` | 50,000 tokens |
| `scope:S` | 200,000 tokens |
| `scope:M` | 800,000 tokens（spec PR + code PR 共用） |
| `scope:L` | 1,500,000 tokens |

**行為**：handler 每次 LLM call 後 accumulator += response_tokens；超 cap 立刻 abort + comment「⚠️ Token budget exceeded（used X / cap Y），escalate」+ 加 `human-coding` label。

**持久化**：`state-store.json:token_usage_by_issue`，方便 weekly evals 看 token cost p99。

### 5.5 Model Selection + ADR Injection

**檔案**：`bin/routine-dispatch/model-router.ts`

| 工作 | Model | 理由 |
|---|---|---|
| dispatch routing（state.ts 推導）| **Haiku 4.5** | 純 label 分流，不需推理深度 |
| XS/S handler 寫 code | **Sonnet 4.6** | 日常開發、code review、test 生成 |
| M/L spec 生成（openspec-headless）| **Opus 4.7** | 架構設計、需要深度推理 |
| reviewer-agent（council）| Sonnet 4.6 | 與 writer 平等對話 |
| judge-agent（council 仲裁）| **Haiku 4.5** | 結構化判斷，速度為先 |

**ADR injection**：handler prompt 在 system message 自動注入：
- `openspec/changes/<id>/proposal.md`（若存在）
- `openspec/specs/<related-domain>/spec.md`（用 issue body 的 area 推導）
- `docs/adr/*.md` 中與 target_repo 相關的 ADR（grep tag）

### 5.6 Test-First Discipline（scope:S+）

**scope:S** handler commit 順序強制：
1. `tests: <name>` — 跑一次驗證為紅（fail）
2. `feat/fix: <name>` — 跑一次驗證為綠（pass）
3. push 為 PR

**scope:M Phase 1** spec PR 必含 `tasks.md`，每張 acceptance test 1 行 given/when/then。
**scope:M Phase 2** code PR：commit 1 = test、commit 2+ = code。

**強制機制**：handler 寫完 test 後跑 pnpm test 必須 fail；若 pass 表示 test 沒測到實際 behavior，escalate。

### 5.7 Security Guardrails（Pre-commit + CI）

每 sub-repo `.husky/pre-commit`：
```bash
ggshield secret scan pre-commit       # 或 gitleaks
pnpm audit --audit-level=high         # node sub-repo
pip-audit --strict                    # python sub-repo
```

CI 補一次同樣的檢查，雙保險。

### 5.8 Observability + Per-PR Evals

**輸出**：
- `docs/automation/pipeline-status.md`（既有，每輪 routine 更新）
- `docs/automation/evals.md`（weekly 更新）

**指標**：
- per-scope merge 率（scope:XS PR merged within 7d / total opened）
- 失敗分類（CI fail / context overflow / token overrun / human takeover / dedup race / spec rejected by reviewer / judge dissent）
- per-PR token cost
- per-issue intervention count（介入定義對齊 §11.1）
- council dissent rate — 用於偵測 rubber-stamp（risk #19）

**Cron**：weekly job `pnpm tsx bin/evals-snapshot.ts`，commit 回 monorepo dev（含 `[skip ci]`）。

### 5.9 Trigger Layer（Cron + Discord）

**Cron**（默認）：
- Routine A：每小時 `0 * * * *`
- Routine B：既有 schedule

**Discord**（補 cron 之外的低延遲路徑，Tier 3）：
- Slash command `/automate <repo>#<issue-num>` → 立即觸發 routine B 處理單張 issue（不等下輪 cron）
- Emoji `:create-minion:` 加在含 issue link 的 Discord 訊息上 → 同上（呼應 Stripe Minions UX）
- 部署：Cloudflare Worker 或 fly.io 接 Discord webhook
- 權限：只有 `engineering` channel 成員可觸發；事件全部 log 到 `evals.md`

### 5.10 Sub-Agent Council（scope:M+ only）

**Council 組成**：
- **writer-agent**（Sonnet）：寫 code，輸出 diff
- **reviewer-agent**（Sonnet，**獨立 context**，不共用 writer 的 prompt history）：給 `approve` / `request-changes` + 理由
- **judge-agent**（Haiku）：仲裁分歧

**流程**：
```
writer 寫 → reviewer 看 →
  approve → 進 PR
  request-changes →
    writer 改一次 → reviewer 再看 →
      approve → 進 PR
      仍 request-changes → judge 仲裁 →
        approve → PR
        reject → escalate human（label `human-coding` + comment）
```

**故意不做 Coinbase 風格 auto-merge**：council 通過仍只是開 PR，人類仍要 review PR 才能 merge。守 Article 1 #14「production-affecting decisions need human approval」。

### 5.11 Runtime Isolation（Worktree + Port + DB Schema）

**檔案**：`bin/routine-dispatch/sandbox.sh`、`bin/routine-dispatch/sandbox-cleanup.sh`

每個 issue 開 dedicated worktree：`.git/worktrees/auto-<repo>-<issue-num>/`，handler 一律在 worktree CWD 跑，不在主 working tree 操作。

若 issue 需要 server / db（test 需要）：
- 隨機 port（從 `state-store.json:ports_in_use` 排除）
- 獨立 db schema：postgres `?currentSchema=auto_<issue>` 或臨時 sqlite

**孤兒清理**：每次 routine B 啟動時掃 `.git/worktrees/`，刪除超過 24h 的 orphan worktree（`git worktree remove --force`）。

---

## 6. Human Intervention Layer

對應 Principle 6「Human override at any layer」。涵蓋 4 種人類接手情境。

### Scenarios

#### A — Notion 同步、人類自己開發（`Auto Mode = manual`）

PM 在 Notion 卡上把 `Auto Mode` 設成 `manual`。Routine A 仍同步 issue（含 `notion:<id>` 雙向綁定），但**不**加 `auto` label，改加 `manual`。Routine B 自然跳過。

#### B — 人類中途接手（`human-driving` label，永久退場）

任何時間點人類加 `human-driving` label：
- Routine B dispatch stage 跳過此 issue
- PR 巡邏 stage 不再回覆 review、不再 push
- `bin/routine-dispatch/handoff.sh` 自動移除 `auto`/`auto:*` label，留 audit comment「🤝 已交接給人類，routine 退場於 <timestamp>」

要恢復自動化必須人類手動移除 `human-driving` 並加回 `auto`。

#### F — Plan 後停（`stop-after-plan` label，任何 scope 適用）

人類在 issue 上加 `stop-after-plan`：routine B 跑完 plan 階段（plan PR 或 spec PR）就停，不進入 code 階段。等價於「動態升級到 L scope 的 plan-only 行為」，但不需要改 scope。

#### C — 人類手寫 issue 反向丟給 routine

工程師在 sub-repo 直接手寫 issue，加 labels：`auto` + `auto:auto-pr|plan-only` + `scope:XS|S|M|L` + `target-repo:<repo>`，**不需要** `notion:*`。Routine B 下輪掃到正常 dispatch。

文件化於 `docs/automation/manual-issue-to-routine.md`，含複製貼上的 label 模板。

### Label Precedence（state machine 衝突解析）

Routine B dispatch 開頭固定先做 label 優先序檢查：

```
0. target-repo:storage|infra → 強制降級為 plan-only（不論 Notion AutoMode）
                              high-risk repo 永遠不自動 PR
1. automation:hold           → skip this round（溫和暫停）
2. human-driving             → skip permanently（人類接管）
3. manual                    → skip permanently（manual mode）
4. stop-after-plan           → 已有 plan PR ⇒ skip；否則 dispatch 但只跑 plan
5. 標準 dispatch             → 依 auto:* + scope:* + spec-merged 處理
```

**規則 0（high-risk repo 強制 plan-only）的實作位置**：
- `bin/routine-dispatch/state.ts` 在推導 dispatch 行為前先讀 issue 的 `target-repo:` label
- 若是 `daodao-storage` 或 `daodao-infra`，自動把處理路徑改為 plan-only（不論 issue 上的 `auto:auto-pr` 是否存在）
- 規則 0 的 repo 清單 hard-coded 於 state.ts，修改需 PR review（不從 env / config 讀）

### Race Handling

每個 destructive action（push / open PR / comment）執行**前 1 秒內**重新 query 一次 issue labels；若期間人類加了 `human-driving` / `automation:hold`，立刻 abort 並留言「⏸️ 偵測到人類接管訊號，已停止」。

---

## 7. Data Models

### 7.1 Notion DB Schema（PM 端建立）

| 欄位 | 型別 | 必要 | 預設 | 用途 |
|---|---|---|---|---|
| Title | title | ✓ | — | issue title |
| Status | single-select | ✓ | `Idea` | 第一道閘門：必須 `Ready for Dev` 才同步 |
| Sync to GitHub | checkbox | ✓ | `false` | 第二道閘門 |
| Auto Mode | single-select | ✓ | `plan-only` | `plan-only` / `auto-pr` / `manual`，預設保守 |
| Scope | single-select | ✓ | `M` | `XS` / `S` / `M` / `L`，預設保守 |
| Target Repo | single-select | ✓ | `daodao-f2e` | 8 sub-repo 之一：`daodao-server` / `daodao-f2e` / `daodao-ai-backend` / `daodao-storage`† / `daodao-admin-ui` / `daodao-infra`† / `daodao-mcp` / `daodao-worker`（†高風險，handler 強制 plan-only）|
| Acceptance Criteria | rich text | 建議 | — | 灌進 issue body |
| Labels | multi-select | 可選 | — | 對應 GitHub label |
| GitHub Issue | URL | 自動 | — | Routine A 寫回 |
| Notion Page ID | formula `id()` | 自動 | — | dedup primary key（前 8 碼當 short-id）|

**Schema 驗證**：Routine A 啟動時驗證所有必要欄位；缺欄位則 fail-loud（log 錯誤、寫 GH Actions annotation、不建任何 issue），不 silent skip。

**Relaxed mode fallback**（過渡期，hard-coded **不**從 env 讀，改 fallback 值需 PR review）：
- `Auto Mode` → `plan-only`（永遠不自動 PR）
- `Scope` → `M`（強制走兩階段）
- `Target Repo` → `daodao-f2e`（issue body 警示「⚠️ 缺 Target Repo 欄位，預設導向 daodao-f2e，請人工確認」）

此鎖死防止「relaxed mode 變成靜默 auto-PR 漏洞」。

### 7.2 GitHub Label Catalog（single source of truth）

每個 sub-repo 需有以下 fixed labels（用 `bin/setup-auto-labels.sh` 一次性建立）：

| Label | 用途 |
|---|---|
| `auto` | routine B dispatch 觸發條件（既有）|
| `auto:plan-only` | 自動 mode：永遠停在 plan 階段 |
| `auto:auto-pr` | 自動 mode：通過 scope 閘門可開 PR |
| `scope:XS` / `S` / `M` / `L` | 任務大小，控制 dispatch 路徑 |
| `target-repo:<name>` | 一致性 label（雖然 issue 已在 target repo）|
| `notion:<short-id>` | dynamic prefix，sync 時動態建，dedup primary key |
| `spec-pending` | M scope Phase 1 已開 spec PR，等 merge |
| `spec-merged` | M scope spec PR 已 merge，可進 Phase 2 |
| `human-coding` | escalate：routine 主動丟給人類 |
| `manual` | manual mode（情境 A）|
| `human-driving` | 人類接管，永久退場（情境 B）|
| `stop-after-plan` | plan 階段後停（情境 F）|
| `automation:hold` | 溫和暫停，可恢復 |

### 7.3 State Store

**檔案**：`bin/routine-dispatch/state-store.json`，atomic 寫入（寫到 `.tmp` + rename）

**欄位**：
- `last_scan_at`：spec-merged-scan 上次成功掃描的 timestamp（避免長時間停擺後漏窗）
- `last_dispatch_run_at`：最後一輪 dispatch 完成時間
- `pause_reason`：若有手動暫停，記錄原因
- `token_usage_by_issue`：per-issue token 累計，用於 weekly evals
- `ports_in_use`：runtime isolation 已佔用 port

git 策略：commit 但每次 update 加 `[skip ci]` 避免 CI loop。

---

## 8. Implementation Phases

### Phase 1：Infrastructure

#### 1.1 Notion API 整合 + label-based dedup
**檔案**：
- `bin/notion-sync/notion-client.ts`：`@notionhq/client` wrapper
- `bin/notion-sync/dedup.ts`：用 `gh issue list --label notion:<short-id>` 即時查
- `bin/notion-sync/sync.ts`：主流程
- `bin/notion-sync/types.ts`：Zod schema for Notion DB row
- `bin/notion-sync/schema-validate.ts`：DB schema 驗證
- `bin/notion-sync/__tests__/`：fixture-based unit tests，至少 8 案例

**Secrets**（透過 routine env / GH Actions secret，**不**寫進 routine prompt）：
- `NOTION_API_KEY`
- `NOTION_DB_ID=3549cc8126978036803af61048468bde`
- `GITHUB_TOKEN`

#### 1.2 Issue label 規範
`bin/setup-auto-labels.sh`：每 sub-repo 執行一次，建出 §7.2 列出的所有 fixed labels。Idempotent（用 `gh label create --force` 或先 `--list` check）。

#### 1.3 Issue template
每 sub-repo `.github/ISSUE_TEMPLATE/auto.md`：對應 Notion 欄位的 markdown 結構（Description / Acceptance Criteria / Notion link / `<!-- managed by Routine A -->`）。

### Phase 2：Routine A — Notion → Issue

在 Claude Code Console 建立 trigger `Notion to GitHub Issue Sync`：

- **Schedule**：每小時 `0 * * * *`，可手動 trigger
- **Prompt**（≤25 行，所有邏輯在 script）：
  ```
  你是 Notion → GitHub issue 同步代理。
  cd 到 daodao monorepo 根。
  跑 `flock /tmp/notion-sync.lock pnpm tsx bin/notion-sync/sync.ts`。
  把 stdout 輸出與 exit code 貼回來。
  失敗時讀 .omc/logs/notion-sync-latest.log 後 80 行回報。
  ```

### Phase 3：Routine B — 改造 trig_01KATY

#### 3.1 Dispatch 邏輯抽到 monorepo

**檔案**：
- `bin/routine-dispatch/main.sh`：dispatch entry
- `bin/routine-dispatch/state.ts`：給定 `(repo, issue_num)` 回傳 unique state（`needs-spec` / `spec-in-review` / `needs-code` / `done` / `human-blocked` / `manual-mode` / `human-driving` / `stop-after-plan-done`）。**先**檢查 §6 label 優先序，**後**做 scope dispatch
- `bin/routine-dispatch/handoff.sh`：human-driving 時清 auto label + audit comment（idempotent）
- `bin/routine-dispatch/handlers/{xs,s,m,l}.sh`：依 scope dispatch 的 handler，每個遵循 §5.1 Blueprint
- `bin/routine-dispatch/spec-merged-scan.ts`：pull-based 掃 monorepo merged spec PR，cross-repo 寫 `spec-merged` label；讀寫 `state-store.json:last_scan_at`
- `bin/routine-dispatch/__tests__/`：handler 各 ≥3 fixture（happy / 重跑 / 失敗）；spec-merged-scan 額外 3 fixture（冷啟動 / 7 天前 / scan 失敗 → 不更新 timestamp）

#### 3.2 Routine prompt 改造

保留既有「PR 巡邏」段（verbatim）。Issue 處理段精簡為：
```
階段 0：cd 到 daodao monorepo 根
階段 1：跑 spec-merged-scan.ts（cross-repo label sync）
階段 2：對每個 sub-repo `auto` issue 跑 main.sh
        最多 3 個（既有限制保留）
階段 3：（既有 PR 巡邏，verbatim 保留）
```

`--legacy` flag fallback：傳 `--legacy` 跑舊邏輯（緊急回退用）。

prompt diff 文件化於 `docs/automation/routine-b-prompt-diff.md`。

#### 3.3 OpenSpec headless 接口

`bin/openspec-headless.ts`：包裝既有 `openspec-ff-change` 流程，加：
- `< /dev/null` stdin redirect（無 TTY）
- `OPENSPEC_NONINTERACTIVE=1` env
- 30s timeout
- 退出碼 `0`（成功）/ `1`（缺資訊）/ `2`（內部錯誤）

**Fallback 路徑**（最後手段，需手動審核）：若 `openspec-ff-change` 仍有 interactive 殘留，直接操作 `openspec/changes/<id>/` 檔案結構，跳過 skill 層。

### Phase 4：Operational Safety

#### 4.1 Pipeline 狀態 dashboard
`bin/pipeline-status.ts` → `docs/automation/pipeline-status.md`：未同步卡 / 已同步 / 待 plan / spec-in-review / spec-merged / code PR open / 最近 routine 失敗。

Routine A 結尾自動跑、commit 回 monorepo `dev`（commit message：`chore(automation): refresh pipeline status [skip ci]`）。

#### 4.2 Kill switch（4 粒度）
- `.automation-paused`（總開關）
- `.automation-paused-<repo>`（per-repo）
- issue label `automation:hold`（per-issue）
- runtime 中止：每處理一張卡前檢查暫停檔，已跑的 git 操作允許跑完（避免半完成 commit）

### Phase 5：AI-Native Walls（實作 §5 disciplines）

依 §5.2 ~ §5.11 建立每個 wall 的對應檔案。建議分批上線：

**Tier 1（必上 — 上線前完成）**：
- 5.2 Tool & write-path allowlist
- 5.3 Verification loop + context guard
- 5.4 Token budget tracker
- 5.5 Model router + ADR injection
- 5.6 Test-first 強制
- 5.7 Pre-commit ggshield + dependency audit

**Tier 2（強化治理 — 上線後 2 週內）**：
- 5.8 Observability dashboard 擴充

**Tier 3（嚴肅治理 — 上線後分批，1~3 個月內）**：
- 5.9 Discord trigger
- 5.10 Sub-agent council
- 5.11 Runtime isolation

---

## 9. Risks and Mitigations

| # | Risk | L | I | Mitigation |
|---|---|---|---|---|
| 1 | Notion → Issue 重複建立（dedup race）| 低 | 高 | label `notion:<short-id>` 直接 match（label index 即時，無 search 延遲）；Routine A 結尾跑 `gh issue list --label notion:` 重複檢查，多餘的 close 並留言 |
| 2 | Routine 一次開 N 個錯誤 PR | 中 | 高 | (a) `.automation-paused` kill switch (b) 每輪最多 3 issue (c) `auto-pr` 預設關閉 (d) 每天每 repo 最多 5 個新 PR |
| 3 | Cross-repo state 不一致（spec PR merged 但 sub-repo issue 沒拿到 label）| 中 | 中 | (a) pull-based scan 每輪自我 reconcile，不依賴 workflow (b) `state-store.json:last_scan_at` 持久化，停擺 N 天重啟不漏窗 (c) scan 失敗不更新 timestamp，下輪重試 |
| 4 | Handler script 把 dev branch push 壞 | 低 | 高 | (a) `auto/` 前綴 branch；push 前驗 base ≠ dev/main (b) 一律 `git push origin auto/* --no-force` (c) handler 起頭 `git rev-parse --abbrev-ref HEAD` 必須 match `auto/*` 才繼續 (d) test fail 不 push |
| 5 | Notion API 限流（3 req/s per workspace）| 低 | 低 | batch query；指數 backoff；單 cron 跑滿 50 卡仍在限額內 |
| 6 | OpenSpec change name 衝突（同 issue 號重複）| 低 | 中 | folder 命名 `<repo-prefix>-<issue-num>-<slug>`（例：`f2e-123-batch-reactions`）|
| 7 | trig_01KATY 改造後行為退化 | 中 | 中 | (a) `--legacy` flag 一鍵回退 (b) 上線前先在 `daodao-storage`（量最小）試跑 7 天，成功標準：「7 天內 ≥3 張測試卡跑完整 pipeline 出 PR、0 個錯誤 PR、人介次數 ≤2」 |
| 8 | Token 過期 / 權限不夠 | 中 | 中 | Routine 開頭跑 `gh auth status` + Notion `users.me`，失敗只留言不執行；secret 從 env 讀，不寫進 prompt |
| 9 | Notion API token 經 routine prompt 傳遞洩漏 | 中 | 高 | secret 透過 routine env / GH Actions secret 注入；routine prompt 純文字無 secret；`bin/notion-sync/` 結尾 `grep -i 'token\|secret\|key' .omc/logs/* && exit 1` 自檢；CI 加 `gitleaks` |
| 10 | PM 並發編輯 Notion 卡 + Routine A 同時跑 | 低 | 中 | Routine A 同步前讀 `last_edited_time`，sync 完成後再讀一次；若 timestamp 變更，update issue 並 log；下輪 cron 自然會 reconcile |
| 11 | PR merge 後 Notion 狀態未回寫 | 高 | 低 | v1 範圍：Routine A 同步前若 issue 已 closed，把 Notion Status 改成 `Done`（簡易反向同步）；完整反向同步留下一版 |
| 12 | PM 大量誤勾 SyncToGitHub（一次 N 張）| 中 | 高 | (a) Routine A 單輪上限 5 張新建（超過則建 5 張、log 警告、剩餘下輪）(b) 同 repo 24h 累計上限 10 張新建，超過暫停並通知 (c) 每張新建在 issue body 註記建立時間 + 「自動建立，誤建請 close」|
| 13 | OpenSpec headless wrapper 卡在 interactive prompt | 中 | 中 | (a) 強制 stdin redirect from `/dev/null` (b) 設 `OPENSPEC_NONINTERACTIVE=1` env (c) 30s timeout 殺掉並 exit 2 (d) handler 收到 exit 2 不開 PR、加 issue comment 通知人類 |
| 14 | 人類加 human-driving label 與 routine 動作 race | 中 | 高 | (a) destructive action（push/open PR/comment）前 1 秒內 re-query labels (b) 若偵測到 human-driving，abort 並留言「⏸️ 偵測到人類接管訊號」(c) routine 已開出的 branch 不自動刪除（人類可選擇接著用或自己 reset）|
| 15 | manual mode 設定後 PM 又改回 auto-pr | 低 | 中 | (a) Routine A 偵測 Notion AutoMode 變更時：移除舊 `manual` label、加上 `auto` + 對應 `auto:*` (b) 若 issue 已被人類動過（commit history 非空），改 label 但加 comment「⚠️ 此 issue 已有人類進度，routine 將從現狀接手」(c) 列在 docs/automation/troubleshooting.md |
| 16 | Token cost 失控 | 中 | 高 | (a) per-issue cap 硬編碼於 `token-budget.ts`，修改需 PR review (b) weekly evals 看 token cost p99，異常 spike alert (c) 超 cap = abort + escalate，不只 warn (d) 持久化 token 用量到 state-store，可審計 |
| 17 | Agent loop 卡死 / context 爆 | 中 | 中 | (a) verification loop max 2 retries (b) context >70% 預估拒跑 (c) handler 整體 wall-clock 30 min timeout (d) Stripe 經驗：第 3 次修不好就不會修好，直接 escalate |
| 18 | Tool allowlist bypass | 低 | 高 | (a) allowlist 在 shell wrapper 強制（不靠 prompt 自律）(b) CI 跑 audit script 比對 handler 實際使用的命令是否都在 allowlist (c) 新增 tool 必走 PR review，不可運行時動態加 |
| 19 | Sub-agent council 互相 rubber-stamp（Coinbase 風險）| 中 | 中 | (a) reviewer-agent context 與 writer 完全獨立（不共用 prompt history）(b) judge-agent fixture test：對 5 種 obvious bug 必 100% 偵測 (c) weekly evals 看 council dissent rate，<5% 視為 rubber-stamp 警示、>30% 視為 reviewer 過嚴 |
| 20 | Worktree pile-up（disk leak）| 中 | 低 | (a) handler 結束 mandatory cleanup (b) 啟動時掃 `.git/worktrees/` 內 >24h 的 orphan，強制刪除 (c) disk usage > 10GB 觸發 monorepo 告警 |
| 21 | high-risk repo（storage/infra）誤勾 auto-pr | 中 | 高 | (a) state.ts 規則 0：target-repo:storage\|infra → 強制 plan-only，hard-coded (b) Routine A 在 issue body 加警示「⚠️ high-risk repo，自動執行限制為 plan-only」 (c) acceptance 驗證：0% auto-pr 開到 storage/infra |

---

## 10. Verification Plan

### 約定
- 所有 `gh` 命令一律帶 `--repo daodaoedu/<sub>` 防止 cwd 漂移
- 「無待同步卡」是合法成功狀態（exit 0），驗證腳本不視為失敗

### Phase 1 驗證

```bash
# 1.1.a — Notion sync dry-run（檢 exit code，不靠 grep）
pnpm tsx bin/notion-sync/sync.ts --dry-run
test $? -eq 0 || { echo "FAIL: dry-run exit non-zero"; exit 1; }

# 1.1.b — Idempotency（每 repo 都檢）
for r in daodao-server daodao-f2e daodao-ai-backend daodao-storage daodao-admin-ui daodao-infra daodao-mcp daodao-worker; do
  BEFORE=$(gh issue list --repo daodaoedu/$r --label auto --state open --json number | jq length)
  pnpm tsx bin/notion-sync/sync.ts
  AFTER=$(gh issue list --repo daodaoedu/$r --label auto --state open --json number | jq length)
  test $BEFORE -eq $AFTER || { echo "FAIL: $r idempotency"; exit 1; }
done

# 1.1.c — Schema validation（缺欄位 fail-loud）
NOTION_DB_ID=fake-broken-db pnpm tsx bin/notion-sync/sync.ts --dry-run
test $? -ne 0 || { echo "FAIL: should reject broken schema"; exit 1; }

# 1.1.d — Secret 不外洩
pnpm tsx bin/notion-sync/sync.ts --dry-run 2>&1 \
  | grep -E 'NOTION_API_KEY|secret_[a-zA-Z0-9]{20,}' \
  && { echo "FAIL: secret leaked"; exit 1; }

# 1.2 — Labels exist（每 repo）
bash bin/setup-auto-labels.sh
for r in daodao-server daodao-f2e daodao-ai-backend daodao-storage daodao-admin-ui daodao-infra daodao-mcp daodao-worker; do
  for L in auto auto:plan-only auto:auto-pr scope:XS scope:S scope:M scope:L \
           spec-pending spec-merged human-coding manual human-driving \
           stop-after-plan automation:hold; do
    gh label list --repo daodaoedu/$r | grep -q "^$L\b" \
      || { echo "FAIL: $r missing $L"; exit 1; }
  done
done
bash bin/setup-auto-labels.sh   # 第二次跑：idempotent
test $? -eq 0 || { echo "FAIL: setup-auto-labels not idempotent"; exit 1; }
```

### Phase 2 驗證

```bash
# 2.1 — End-to-end smoke
# Notion 卡：Status=Ready for Dev / SyncToGitHub=true / Scope=XS
#           AutoMode=plan-only / TargetRepo=daodao-storage
# 手動 trigger Routine A，等 1 分鐘
gh issue list --repo daodaoedu/daodao-storage --label auto --state open \
  --search "<title>" --json number,labels
# 期望：1 個 issue，labels 含 auto / auto:plan-only / scope:XS / notion:<short>

# 2.1.b — Notion 反向寫回：開 Notion 卡，確認 GitHub Issue 欄位有 URL

# 2.1.c — 並發 lock
flock -n /tmp/notion-sync.lock sleep 5 &
pnpm tsx bin/notion-sync/sync.ts 2>&1 | grep -q 'flock' \
  || { echo "FAIL: lock not enforced"; exit 1; }
wait
```

### Phase 3 驗證

```bash
# 3.1 — XS smoke
# 改 Notion 測試卡：AutoMode=auto-pr，等 routine B 跑
gh pr list --repo daodaoedu/daodao-storage --search "auto/" --state open \
  --json headRefName,baseRefName
# 期望：1 個 PR，headRefName 為 auto/*，baseRefName=dev

# 3.2 — M scope 兩階段
# 改測試卡：Scope=M
# Phase 1：等 Routine B 跑 → 期望 monorepo 出現 spec PR
gh pr list --repo daodaoedu/daodao --search "openspec/changes/" --state open
# 人類 merge spec PR
# Phase 2：等下一輪 Routine B → 期望 sub-repo 多一個 code PR

# 3.3 — Headless OpenSpec
echo '' | OPENSPEC_NONINTERACTIVE=1 timeout 60 \
  pnpm tsx bin/openspec-headless.ts \
    --issue-num 1 --repo daodao-f2e --slug test-headless < /dev/null
test $? -eq 0 || { echo "FAIL: headless OpenSpec hung or errored"; exit 1; }

# Negative cases
## (a) Notion 卡缺必填 → fail-loud
NOTION_DB_ID=db-with-missing-field pnpm tsx bin/notion-sync/sync.ts
test $? -ne 0

## (b) GH push 拒絕（branch protection）
# staging repo 開 dev branch protection（require PR review）
# 跑 handler，期望 push 失敗 → handler exit 非 0、issue 上有 comment

## (c) Race（兩條 routine 同時跑同一 issue）
# 同時 trigger Routine B 兩次
# 期望：只有一個 PR 開出，第二個 instance log 「branch already exists, skipping」

## (d) --legacy fallback
# routine prompt 注入 --legacy
# 期望：跑舊版 dispatch，不 touch 任何新加的 bin/ script

## (e) Reverse sync（Risk #11）
gh issue close N --repo daodaoedu/daodao-storage --reason completed
# 觸發 Routine A 下一輪
# 期望：staging Notion 卡 Status 自動變成 Done

## (f) spec-merged-scan：last_scan_at 持久化
# monorepo merge 一個測試 spec PR → 跑 scan → 確認 sub-repo issue 拿到 spec-merged
# 把 last_scan_at 改回 7 天前 → 重跑 → 期望「不重複加 label」
# Mock gh CLI exit 1 跑 scan → 期望 last_scan_at 不更新

## (g) 人工介入情境 A — manual mode
# Notion 卡：AutoMode=manual
# 期望：issue 出現含 manual 但無 auto label；routine B log "skipped: manual mode"

## (h) 人工介入情境 B — human-driving 接管
gh issue edit N --repo daodaoedu/daodao-storage --add-label human-driving
# 期望：handoff.sh 移除 auto label、留 audit comment、PR 巡邏不再回覆

## (i) 人工介入情境 F — stop-after-plan
# routine B 開出 plan commit 後立刻：
gh issue edit N --repo daodaoedu/daodao-f2e --add-label stop-after-plan
# 期望下一輪 routine B：不 push code、PR 維持只有 plan.md

## (j) 人工介入情境 C — 人類手寫 issue
gh issue create --repo daodaoedu/daodao-server \
  --title "Manual test: add /health endpoint" \
  --body "Description: ...\n## Acceptance Criteria\n- [ ] GET /health returns 200" \
  --label "auto" --label "auto:auto-pr" --label "scope:XS" --label "target-repo:server"
# 期望：routine B 下輪正常 dispatch、開出 PR

## (k) Race condition (Risk #14)
# routine B 開始處理 issue #N → handler push 前 0.5 秒 add label human-driving
# 期望：handler 偵測、abort、不 push、留言「⏸️ 偵測到人類接管訊號」

## (l) Token budget enforcement
# 注入假 issue body 模擬大 task，scope=XS（cap 50k）
# Mock LLM 累計 token 達 60k → 期望 handler abort + comment "Token budget exceeded"

## (m) Tool allowlist denial
# Handler 嘗試 `curl https://example.com`
# 期望：log "BLOCKED: tool 'curl' not in allowlist" + exit 3 + issue comment

## (n) Verification loop max retries
# Mock pnpm test 永遠 fail
# 期望：handler 跑 3 次後 escalate，加 human-coding label

## (o) Model routing
# 啟用 trace mode，跑 m scope handler
# grep log model 欄位：dispatch=haiku / handler=sonnet / spec=opus / judge=haiku 各≥1 次

## (p) Test-first ordering（scope:S+）
# scope:S issue 跑完 PR
# 檢查 git log：第一個 commit 必須以 "test/tests:" 開頭
# 該 commit checkout 後 pnpm test 必為 fail；第二 commit 後 pass

## (q) Discord trigger
# Discord 跑 `/automate daodao-storage 42`
# 期望：≤2 min 內 routine B 開始處理；evals.md log "manually triggered"

## (r) Sub-agent council
# Fixture：注入 writer-agent 寫的明顯 bug（off-by-one）
# 期望：reviewer reject、judge 仲裁也 reject、PR 不開、issue 加 human-coding label

## (s) Worktree cleanup
# 跑一次 handler → 結束後 worktree path 不存在
# 模擬 SIGKILL → 下次啟動 orphan-scan 必清掉
```

### Phase 4 驗證

```bash
# 4.1 — Dashboard
pnpm tsx bin/pipeline-status.ts
test -f docs/automation/pipeline-status.md
grep -q '## Pending sync' docs/automation/pipeline-status.md

# 4.2 — Kill switch（4 粒度）
touch .automation-paused
# 下一輪 Routine A：期望 stdout 「⏸️ paused」、exit 0、無新 issue
rm .automation-paused

touch .automation-paused-daodao-f2e
# Routine B：期望跳過 daodao-f2e，照常處理其他 3 個 repo
rm .automation-paused-daodao-f2e

gh issue edit <num> --repo daodaoedu/daodao-storage --add-label automation:hold
# Routine B：期望跳過此 issue
gh issue edit <num> --repo daodaoedu/daodao-storage --remove-label automation:hold

# Runtime 中止：在 routine 處理某 issue 中途 touch .automation-paused
# 期望：該 issue 跑完，下一個 issue 不開始
```

---

## 11. Acceptance Criteria

### 11.1 Functional（系統行為）

- [ ] **End-to-end SLA**：staging 階段 7 天測試，連續至少 5 張測試卡（涵蓋 XS/S/M/L 各≥1 張）：
  - 從 Notion 端勾選 SyncToGitHub 起算
  - 同步 issue 出現 SLA：≤ **75 分鐘**（cron 1h + buffer 15min）
  - PR 出現 SLA（XS/S）：≤ **2 小時**
  - 期間人類介入次數 ≤ **2 次**
- [ ] **「介入」定義**：人類在 GitHub 上對 issue/PR 做出寫操作（comment、label change、close、merge），但**不**含 spec PR 的純閱讀 review；spec PR merge 算 1 次介入。釘定於 `docs/automation/troubleshooting.md#intervention-definition`。
- [ ] **可追溯**：每個 failure mode（Notion API 錯、GH push 拒、test 失敗、permission denied、headless OpenSpec timeout）都有對應 log location 文件化，可從 issue comment 一鍵跳到 log
- [ ] **Kill switch SLA**：`touch .automation-paused` 後到下一輪 routine 變安靜 ≤ **65 分鐘**
- [ ] **Dedup**：同 Notion 卡跑 100 次 sync，建出 issue 數 = 1
- [ ] **Risk-tier**：M scope 任務必先有 spec PR 才有 code PR；L scope 0% 自動 code PR 率
- [ ] **High-risk repo override**：staging 7 天測試期間，`daodao-storage` 與 `daodao-infra` 各嘗試 ≥2 次 `auto:auto-pr` 設定 → 100% 被降級為 plan-only（驗 state.ts 規則 0）
- [ ] **PR 巡邏 regression**：trig_01KATY 既有 PR 巡邏行為在改造後 100% 保留（回歸測試 fixture：3 個過往 PR review feedback 範例 → 行為一致）
- [ ] **Human Intervention 4 情境 SLA**：
  - 情境 A（manual）：100% manual 卡片 → issue 出現但無 `auto` label、Routine B 0% touch rate
  - 情境 B（human-driving）：加 label 後 ≤ 1 輪 routine（≤ 65 min）內 routine 完全退場
  - 情境 F（stop-after-plan）：加 label 後 routine 0% 進入 code 階段
  - 情境 C（人類手寫）：依文件加齊 4 個 label 後 ≤ 1 輪內進入 dispatch
  - Race condition：destructive action 前 re-query 機制 100% 偵測率
- [ ] **AI-Native Guardrails SLA**：
  - **Token budget compliance**：100% PR token 使用量 ≤ scope cap（任何超 cap 必觸發 abort）
  - **Tool allowlist coverage**：handler 實際呼叫的 tool 100% 在 allowlist 內（CI audit 證明）
  - **Model routing 分布**：weekly evals 顯示 dispatch ≥ 80% 用 Haiku、spec generation ≥ 80% 用 Opus
  - **Test-first compliance**（scope:S+）：PR commit history 100% 符合 test-then-code 順序
  - **Council dissent rate**（scope:M+ auto-pr）：5% ~ 30% 區間
  - **Verification loop**：CI fail 第 3 次必 escalate，0% 進入第 4 次嘗試
  - **Worktree cleanup**：成功 / 失敗 / SIGKILL 三種情境下，孤兒 worktree 24h 內 100% 被清

### 11.2 Non-Functional（內部品質）

- [ ] Routine prompt ≤ 60 行
- [ ] `bin/notion-sync/` + `bin/routine-dispatch/` unit test coverage ≥ 80%
- [ ] handler shell script 過 `shellcheck`
- [ ] CI 跑 `gitleaks` 無 warning
- [ ] pre-commit `ggshield` + `pnpm audit --audit-level=high` 通過
- [ ] handler 改動檔數遵守 per-scope cap（XS ≤3 / S ≤10 / M ≤30）
- [ ] weekly `evals.md` 自動產生且含 5 類指標（per-scope merge 率、failure 分類、token cost、人介次數、council dissent rate）
- [ ] 文件齊備：`docs/automation/{architecture.md,troubleshooting.md,routine-b-prompt-diff.md,pipeline-status.md,manual-issue-to-routine.md}`

---

## 12. Open Questions

1. **OpenSpec change folder 命名**：`<repo-prefix>-<issue-num>-<slug>` 是建議；上線前 grep 既有 `openspec/changes/` 確認與現有命名不衝突。
2. **Migration 模式時長**：PM 補完 Notion DB schema 後何時取消 `migration-mode: relaxed`？建議：上線後 2 週內取消，期間 Routine A log 警示。
3. **Discord 升級觸發點**：何時從 cron-only 升到含 Discord 即時觸發？建議：v1 上線 1 個月後，依 PM 反饋與 evals 決定。

---

## Appendix: Plan Evolution

這份 plan 經過 5 輪 Architect/Critic consensus + 多輪使用者反饋演進到目前狀態：

1. **初稿** — Option B 雙 routine + scope 分流的核心架構
2. **Architect/Critic 第一輪** — 補 Option D/E/F invalidation、改 pull-based、改 label dedup、改 OpenSpec headless、補 4 個 risks（token / PM 並發 / 反向同步 / 大量誤勾）、改寫可量測 acceptance、補 negative cases
3. **Architect/Critic 第二輪 must-fix** — last-scan timestamp 持久化、relaxed mode fallback 鎖死值
4. **使用者反饋（人工介入）** — 加 Auto Mode `manual`、`human-driving` / `stop-after-plan` label、4 情境 + label 優先序 + race handling
5. **使用者反饋（AI Native 對齊）** — 吸收 Stripe Minions / Ramp Inspect / Coinbase Cloudbot / Spotify Honk 共通模式 + AI Native 18 條實踐，加 §5 全套 15 disciplines

**關鍵外部影響**：
- [Stripe Minions deep dive](https://quidproquo.cc/posts/ai/2026-04-04-internal-ai-coding-agents/)
- [AI Native team practices](https://quidproquo.cc/posts/ai/2026-04-17-ai-native-team-practices/)
- Stripe 經典格言：**The walls matter more than the model**
