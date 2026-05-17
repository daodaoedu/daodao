## Context

daodao 現有 AI 功能（推薦、摘要）由 `daodao-ai-backend` 硬編碼執行。
本設計以通用 Workflow 引擎取代零散的硬編碼 AI 邏輯，讓營運團隊可自行設計、觸發、測試任意 AI 與業務邏輯流程，並為未來自主 AI agent 預留架構基礎。

**Phase 1 範圍**：Admin UI 手動觸發、線性流程為主（資料模型支援 DAG）。
**Phase 2 預留**：`scheduled` / `event` trigger、條件分支 UI、agent 自主執行。

## Goals / Non-Goals

**Goals:**
- Admin 可建立 Node / Edge 組成的 Workflow，支援七種 Node 類型（含 `skill-call`）
- Admin 可設定 Trigger（Phase 1 實作 `manual`，其餘預留）
- Admin 可對 Workflow 執行 dry-run A/B 對比測試
- Admin 可透過 UI 編輯器或 Agent 對話兩種方式建立與管理 Skill
- 執行紀錄保存每個 Node 的輸入 / 輸出
- Admin 可查看每個 run 的 cost（total_cost_usd）與 latency（total_latency_ms），以及各 node 的細項
- Admin 可對 run 結果標記評分（好 / 壞）並附備註，累積評估資料集
- 不可逆的 output 操作（如寫回 DB）需要 approval gate，admin 核准後才實際執行
- **[Phase 1]** `llm-call` 節點支援 Output Guards：可選設 `output_schema`，LLM 輸出不符格式時自動拒絕
- **[Phase 1]** `skill-call` 偵測死迴圈（連續相同 tool hash）+ Circuit Breaker（連續失敗 3 次觸發冷卻）
- **[Phase 1]** `skill-call` ReAct loop 支援 Context Compression：超過 token 閾值時自動壓縮歷史

**Non-Goals（Phase 1）:**
- 不實作 `scheduled` / `webhook` / `event` trigger 的實際觸發（schema 預留）
- 不做視覺化 graph editor（UI 維持卡片列表，資料模型支援 DAG）
- 不支援 Node 間迴圈執行
- 不整合現有產品端 AI 功能的自動切換

## Decisions

### 1. 核心模型：Node / Edge / Trigger 取代線性 Step

**決定**：Workflow 由 `workflow_nodes`（節點）與 `workflow_edges`（連線）組成有向圖，Trigger 獨立管理。

**理由**：線性 `position` 排序無法支援分支；Node/Edge 模型可從線性無縫演進至 DAG，不需改 schema。

---

### 2. 執行架構：daodao-server 作為 Orchestrator

**決定**：`daodao-server` 接收執行請求，依拓撲順序逐一執行 Node，並將每個 Node 的輸入/輸出寫入 `workflow_node_runs`。

**各 Node 的執行者**：
| Node 類型 | 執行者 |
|---|---|
| `llm-call` | daodao-ai-backend（維持 LLM 職責分離） |
| `skill-call` | daodao-ai-backend（載入 Skill + 工具迴圈） |
| `data-fetch` | daodao-server（有 Prisma DB 存取權） |
| `data-transform` | daodao-server（純資料操作） |
| `tool-call` | daodao-server（HTTP 呼叫外部 API） |
| `condition` | daodao-server（表達式求值） |
| `output` | daodao-server（寫回 DB / 發通知） |

---

### 3. Node 類型與 Config Schema

**`llm-call`**：
```json
{
  "provider": "groq",
  "model_override": null,
  "system_prompt": "...",
  "prompt_template": "根據以下資料：{{nodes.fetch-1.output}}",
  "output_schema": {
    "type": "object",
    "properties": {
      "summary": { "type": "string" },
      "score": { "type": "number" }
    },
    "required": ["summary"]
  }
}
```
`output_schema`（可選）：JSON Schema 格式。若設定，ai-backend 在 LLM 回傳後以此 schema 驗證輸出格式；不符合時 node_run 標記 `failed`，error 記錄驗證失敗細節（哪個欄位不符合）。未設定時跳過驗證。

**`data-fetch`**：
```json
{
  "source": "users",
  "scope": "single_user" | "all_users" | "query",
  "fields": ["user.learning_goals", "activity.viewed_resources"],
  "filters": {}
}
```

**`data-transform`**：
```json
{
  "operations": [
    { "type": "filter", "field": "score", "op": ">", "value": 0.8 },
    { "type": "limit", "value": 10 }
  ]
}
```

**`tool-call`**：
```json
{
  "method": "POST",
  "url": "https://...",
  "headers": {},
  "body_template": "{{nodes.llm-1.output}}"
}
```

**`skill-call`**：
```json
{
  "skill_id": "uuid-of-skill",
  "provider": "anthropic",
  "model_override": null,
  "input_template": "請根據以下資料協助用戶：{{nodes.fetch-1.output}}",
  "max_iterations": 10,
  "context_compress_threshold": 8000,
  "tool_tags": ["search", "data"]
}
```
`max_iterations`：ReAct agent loop 的最大步數，預設 10；超出時中止執行並將 node_run 標記 `failed`。
`context_compress_threshold`：ReAct loop 累積 context 超過此 token 數（預設 8000）時，ai-backend 自動呼叫 LLM 對舊步驟歷史做摘要壓縮，保留最新 3 步 + 壓縮後摘要，繼續 loop。
`tool_tags`（可選）：指定此次執行只載入 Tool Registry 中 tags 有交集的工具，避免超過 20 個工具導致 LLM 選擇錯誤。未設定時預設載入全部工具。
`skill-call` Node 執行時，daodao-ai-backend 載入指定 Skill 的 SKILL.md（system prompt）+ scripts/ 工具定義，以三層漸進揭露執行，LLM 按需呼叫 scripts/ 工具（mini ReAct agent loop）。

**`condition`**：
```json
{
  "expression": "{{nodes.llm-1.output.score}} > 0.8"
}
```
`condition` Node 的出邊（Edge）帶 label `true` / `false`，執行時根據表達式結果選擇對應 Edge。

**`output`**：
```json
{
  "target": "db" | "notification" | "webhook",
  "require_approval": false,
  "mapping": {
    "table": "user_ai_suggestions",
    "fields": {
      "user_id": "{{input.user_id}}",
      "content": "{{nodes.llm-2.output}}"
    }
  }
}
```
`require_approval`：設為 `true` 時，執行引擎到達此 node 時暫停 run（status 改為 `pending_approval`），建立 `workflow_approval_requests` 記錄，等待 admin 核准後繼續；拒絕後 run 標記 `failed`。

---

### 4. 節點間資料傳遞：`{{nodes.<nodeId>.output}}`

**決定**：prompt 或 config 中用 `{{nodes.<nodeId>.output}}` 引用任意前驅節點的輸出，不限制只能引用上一步。

**理由**：比 `{{prev_output}}` 更通用，支援非線性引用（如 condition 分支後的節點需引用分支前的資料）。

---

### 5. Trigger 系統

**決定**：`workflow_triggers` 獨立 table，一個 Workflow 可有多個 Trigger。Phase 1 只實作 `manual`，其他類型 schema 預留。

| Trigger 類型 | config 結構 | Phase 1 |
|---|---|---|
| `manual` | `{}` | ✅ 實作 |
| `scheduled` | `{ "cron": "0 9 * * 1" }` | ⏳ 預留 |
| `webhook` | `{ "secret": "..." }` | ⏳ 預留 |
| `event` | `{ "event_name": "user.resource.saved" }` | ⏳ 預留 |

---

### 6. A/B 測試：dry-run + `workflow_ab_tests` 關聯

**決定**：A/B 測試建立兩筆 `workflow_runs`（`is_dry_run: true`），並用 `workflow_ab_tests` 關聯。dry-run 執行不寫回業務資料。

---

### 7. Admin UI：Phase 1 維持卡片列表，底層資料模型支援 DAG

**決定**：`workflow_edges` 記錄節點連線，但 Phase 1 UI 只呈現線性排序的卡片列表，不做 graph editor。`condition` 節點在 Phase 1 不開放。

**理由**：避免提前引入 React Flow 等重型函式庫；資料模型已支援 DAG，UI 演進不需改 schema。

---

### 8. Provider 管理：daodao-ai-backend 為 Single Source of Truth

**讀取鏈路**：
```
daodao-admin-ui
  → GET /api/admin/ai-providers（daodao-server）
    → GET /internal/providers（daodao-ai-backend）
      → 讀 _LLM_BACKEND_DEFAULTS config
```

---

### 9. Skill 管理：UI 編輯器 + Agent 對話兩種模式

**決定**：`workflow-skill-manager` 支援兩種操作模式，資料統一存入 `workflow_skills` / `workflow_skill_files` / `workflow_skill_conversations` tables。

**模式一：UI 直接編輯**
- Admin 透過 textarea 直接編輯 SKILL.md（YAML frontmatter + Markdown 說明）
- 上傳 scripts/、references/、assets/ 各子目錄的檔案
- PATCH `/api/admin/workflow-skills/:id` 存入 DB

**模式二：Agent 對話**
- Admin 在聊天面板與 AI Agent 對話，描述想要的 Skill 功能
- daodao-server 轉發對話到 daodao-ai-backend，ai-backend 以 LLM 生成或修改 Skill 內容並回傳差異
- 對話記錄存入 `workflow_skill_conversations`；確認後寫回 `workflow_skills`

**Skill 結構**（對應 Claude Skills 三層揭露）：
```
skill/
  SKILL.md              ← system prompt + metadata（YAML frontmatter）
  scripts/              ← LLM 可呼叫的工具（shell / Python / JS）
  references/           ← 參考文件（Markdown）
  assets/               ← 靜態資源（圖片、JSON 等）
```

**`skill-call` 執行鏈路**：
```
daodao-server
  → POST /internal/execute/skill-call（daodao-ai-backend）
    body: { skill_id, provider, model_override, input }
    → ai-backend 從 DB 讀取 Skill 檔案
    → 組裝 system prompt（SKILL.md）
        + Tool Registry 內建工具（#12：query_user_stats、search_practices 等）
        + Skill 自定義工具（scripts/，可選）
    → 以 ReAct agent loop 執行，LLM 按需呼叫任意已註冊工具
    → 回傳最終 output
```

**依賴**：`skill-call` 需要 #12 LLM Tool System 完成後才能發揮完整效益；#12 未完成前，skill-call 仍可執行但只有 SKILL.md system prompt，無 tool calling 能力。

---

### 10. DB Schema

```sql
-- Migration: add_workflow_engine_tables

CREATE TABLE workflows (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  description  TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT false,
  max_cost_usd NUMERIC(10,4),  -- workflow 層級成本上限；NULL 表示無限制
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE workflow_nodes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  node_type   TEXT NOT NULL,  -- llm-call, data-fetch, data-transform, tool-call, condition, output
  label       TEXT,
  config      JSONB NOT NULL DEFAULT '{}',
  position_x  INTEGER,  -- 預留給未來 graph editor
  position_y  INTEGER,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE workflow_edges (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id    UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  source_node_id UUID NOT NULL REFERENCES workflow_nodes(id) ON DELETE CASCADE,
  target_node_id UUID NOT NULL REFERENCES workflow_nodes(id) ON DELETE CASCADE,
  label          TEXT,  -- 'true' / 'false' for condition nodes, null for others
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE workflow_triggers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id  UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('manual', 'scheduled', 'webhook', 'event')),
  config       JSONB NOT NULL DEFAULT '{}',
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE workflow_runs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id      UUID NOT NULL REFERENCES workflows(id),
  trigger_id       UUID REFERENCES workflow_triggers(id),
  is_dry_run       BOOLEAN NOT NULL DEFAULT false,
  status           TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled', 'pending_approval', 'circuit_open')),
  input            JSONB NOT NULL DEFAULT '{}',
  total_cost_usd   NUMERIC(10,4),   -- run 完成後彙總所有 node 的 cost_usd
  total_latency_ms INTEGER,         -- run 完成後彙總所有 node 的 latency_ms
  checkpoint_state JSONB,           -- Checkpoint-Resume：已完成 node 的 output 快照 { nodeId: output }
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at       TIMESTAMPTZ,
  finished_at      TIMESTAMPTZ
);

CREATE TABLE workflow_node_runs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id      UUID NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
  node_id     UUID NOT NULL REFERENCES workflow_nodes(id),
  status      TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped')),
  input       JSONB,
  output      JSONB,
  error       TEXT,
  token_count INTEGER,          -- llm-call / skill-call 消耗的 token 數
  latency_ms  INTEGER,          -- 該 node 執行耗時（ms）
  cost_usd    NUMERIC(10,6),    -- 該 node 的估算成本（USD）
  trajectory  JSONB,            -- Phase 2: skill-call ReAct loop 每步記錄 { step, tool_name, tool_input, tool_output, reasoning }[]
  started_at  TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
);

CREATE TABLE workflow_ab_tests (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_a_run_id UUID NOT NULL REFERENCES workflow_runs(id),
  workflow_b_run_id UUID NOT NULL REFERENCES workflow_runs(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE workflow_approval_requests (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id       UUID NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
  node_run_id  UUID NOT NULL REFERENCES workflow_node_runs(id) ON DELETE CASCADE,
  status       TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  preview      JSONB,           -- output node 擬寫入的資料快照，供 admin 審閱
  decided_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE workflow_run_evals (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id     UUID NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
  rating     TEXT CHECK (rating IN ('good', 'bad')),  -- admin 手動標記（Phase 1）
  notes      TEXT,
  auto_score NUMERIC(4,3),  -- Phase 2: LLM-as-judge 自動評分（0.000–1.000）
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE workflow_data_source_config (
  id             TEXT PRIMARY KEY DEFAULT 'singleton' CHECK (id = 'singleton'),
  allowed_fields JSONB NOT NULL DEFAULT '[]',
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE workflow_skills (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  skill_md    TEXT NOT NULL DEFAULT '',  -- SKILL.md 全文
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE workflow_skill_files (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id   UUID NOT NULL REFERENCES workflow_skills(id) ON DELETE CASCADE,
  category   TEXT NOT NULL CHECK (category IN ('scripts', 'references', 'assets')),
  filename   TEXT NOT NULL,
  content    TEXT,      -- 文字型檔案（scripts / references）
  bytes      BYTEA,     -- 二進位型檔案（assets）
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (skill_id, category, filename)
);

CREATE TABLE workflow_skill_conversations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id   UUID NOT NULL REFERENCES workflow_skills(id) ON DELETE CASCADE,
  role       TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE workflow_skill_memories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id    UUID NOT NULL REFERENCES workflow_skills(id) ON DELETE CASCADE,
  run_id      UUID NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
  memory_type TEXT NOT NULL CHECK (memory_type IN ('episodic', 'semantic')),
  content     TEXT NOT NULL,  -- LLM 提取的記憶內容（成功工具路徑、有用中間輸出等）
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

### 11. API 設計

```
# Workflows
GET    /api/admin/workflows
POST   /api/admin/workflows
GET    /api/admin/workflows/:id
PATCH  /api/admin/workflows/:id
DELETE /api/admin/workflows/:id

# Nodes
GET    /api/admin/workflows/:id/nodes
POST   /api/admin/workflows/:id/nodes
PATCH  /api/admin/workflows/:id/nodes/:nodeId
DELETE /api/admin/workflows/:id/nodes/:nodeId

# Edges
GET    /api/admin/workflows/:id/edges
POST   /api/admin/workflows/:id/edges
DELETE /api/admin/workflows/:id/edges/:edgeId

# Triggers
GET    /api/admin/workflows/:id/triggers
POST   /api/admin/workflows/:id/triggers
PATCH  /api/admin/workflows/:id/triggers/:triggerId
DELETE /api/admin/workflows/:id/triggers/:triggerId

# Runs
POST   /api/admin/workflows/:id/runs           # 執行（可帶 dry_run, scope）
GET    /api/admin/workflows/:id/runs
GET    /api/admin/workflow-runs/:runId         # 含所有 node_runs

# A/B Tests
POST   /api/admin/workflow-ab-tests
GET    /api/admin/workflow-ab-tests
GET    /api/admin/workflow-ab-tests/:id

# Approval Gates
POST   /api/admin/workflow-runs/:runId/approve   # 核准 approval request，繼續執行 run
POST   /api/admin/workflow-runs/:runId/reject    # 拒絕 approval request，run 標記 failed

# Checkpoint-Resume
POST   /api/admin/workflow-runs/:runId/resume    # 從上次 checkpoint 繼續執行（跳過已完成 node）

# Evals
POST   /api/admin/workflow-runs/:runId/eval      # 標記評分（rating: good/bad, notes?: string）
GET    /api/admin/workflow-run-evals             # eval 歷史（可篩選 workflow_id、rating）

# Providers & Data Sources
GET    /api/admin/ai-providers
GET    /api/admin/workflow-data-sources
PATCH  /api/admin/workflow-data-sources

# Workflow Skills
GET    /api/admin/workflow-skills
POST   /api/admin/workflow-skills
GET    /api/admin/workflow-skills/:skillId
PATCH  /api/admin/workflow-skills/:skillId
DELETE /api/admin/workflow-skills/:skillId

# Skill Files
GET    /api/admin/workflow-skills/:skillId/files
POST   /api/admin/workflow-skills/:skillId/files          # 上傳檔案
DELETE /api/admin/workflow-skills/:skillId/files/:fileId

# Skill Agent Conversation
GET    /api/admin/workflow-skills/:skillId/conversations
POST   /api/admin/workflow-skills/:skillId/chat           # 送出訊息，ai-backend 回傳 reply + skill diff
POST   /api/admin/workflow-skills/:skillId/apply          # 確認並寫回 skill_md / files
```

### 12. Observability：四層方案

#### Phase 1：LLM Tracing + Product Analytics + 自建成本追蹤

**LLM Tracing（Langfuse）**：
- ai-backend 在每次 llm-call / skill-call 執行前建立 Langfuse trace（`trace_id = node_run_id`），執行完成後結束 span 並附上 token / cost metadata
- Langfuse api_key 未設定時靜默跳過，不影響執行

**Cost 追蹤**：
- ai-backend 依 provider pricing table 估算 `cost_usd`（token_count × price_per_token）；無定價資料時回傳 null
- daodao-server 寫入 `workflow_node_runs`；run 完成時彙總至 `workflow_runs.total_cost_usd` / `total_latency_ms`

**Product Analytics（PostHog）**：
- ai-backend 執行後發送 `$ai_generation` 事件（provider、token 數、latency_ms）
- PostHog api_key 未設定時靜默跳過

**Admin UI**：執行結果頁頁頭顯示 `total_cost_usd` 與 `total_latency_ms`；每個 node_run 展開後顯示 `token_count`、`latency_ms`、`cost_usd`。

#### Phase 2：Infrastructure Metrics（OpenTelemetry）

**決定**：daodao-server 與 daodao-ai-backend 加入 OpenTelemetry SDK，匯出 trace / metrics 到 OTLP Collector，再接 Grafana 視覺化。

**daodao-server（Node.js）**：
- 使用 `@opentelemetry/sdk-node` 自動 instrument Express routes
- 追蹤指標：API latency（P50/P95/P99）、error rate、active workflow runs 數量、node execution latency by node_type

**daodao-ai-backend（FastAPI/Python）**：
- 使用 `opentelemetry-instrumentation-fastapi` 自動 instrument
- 追蹤指標：LLM call latency by provider、ReAct loop 步數分佈、guardrail 觸發率

**部署**：OTLP Collector → Grafana（self-hosted）或 Grafana Cloud；Phase 2 視基礎設施狀況決定部署方式。

---

### 13. Evals：Admin 標記 + 評估資料集

#### Phase 1：自建輕量標記

**決定**：run 完成（status = `completed` 或 `failed`）後，admin 可在執行結果頁底部標記 `good` / `bad` 並附備註，儲存至 `workflow_run_evals`；每個 run 可有多筆 eval（允許多人標記）。

**評估資料集**：`GET /api/admin/workflow-run-evals` 支援篩選 `workflow_id` 與 `rating`，可匯出作為 LLM 評估資料集。

#### Phase 2：Langfuse Evals 整合 + LLM-as-judge

**Langfuse Evals**：將 admin 標記的 `good` / `bad` 同步 push 到 Langfuse Trace 的 score annotation，使 eval 資料與 LLM trace co-located，方便在 Langfuse dashboard 直接分析品質趨勢。

**LLM-as-judge**：為指定 workflow 設定自動評估 prompt，每次 run 完成後由 LLM 自動對輸出評分（0–1），結果寫入 `workflow_run_evals.auto_score`，並同步到 Langfuse；需在 `workflow_run_evals` 加 `auto_score NUMERIC(4,3)` 欄位。

**Trajectory Evaluation**：評估 skill-call ReAct loop 的工具選擇正確率（tool selection accuracy）——記錄每步的 tool_name 與 LLM reasoning，由 judge LLM 事後評分。

---

### 14. Approval Gates：Output Node 暫停機制

**決定**：`output` node config 加 `require_approval: boolean`（預設 `false`）。執行引擎到達此 node 時：
1. 將擬寫入資料快照存入 `workflow_approval_requests.preview`
2. `workflow_runs.status` 改為 `pending_approval`，執行暫停
3. Admin 在 UI 看到「等待核准」狀態，可預覽 preview 內容後核准或拒絕
4. 核准 → run status 回 `running`，繼續執行 output node 的實際寫入
5. 拒絕 → run status 改 `failed`，node_run 標記 `failed`，記錄拒絕原因

**API**：`POST /api/admin/workflow-runs/:runId/approve` / `POST /api/admin/workflow-runs/:runId/reject`

**理由**：不可逆操作（寫回 DB、發通知）應由人工確認，避免 LLM 輸出錯誤直接影響生產資料。

---

### 15. Budget / Iteration Limits：兩層限制

**決定**：

**Node 層（skill-call max_iterations）**：
- `skill-call` config 加 `max_iterations`（integer，預設 10）
- ai-backend 執行 ReAct loop 超過此步數時中止並回傳錯誤
- daodao-server 將 node_run 標記 `failed`，run 標記 `failed`，error 記錄「超過 max_iterations 限制」

**Workflow 層（max_cost_usd）**：
- `workflows` table 加 `max_cost_usd NUMERIC(10,4)`（NULL 表示無限制）
- 執行引擎每個 node 完成後，累加 `cost_usd`；若累計值超過 `max_cost_usd`，立即中止後續 node，run 標記 `failed`，error 記錄「超過 max_cost_usd 限制（已花費 X USD）」

**理由**：防止 skill-call 無限迴圈與意外高額 LLM 費用，同時保持設計簡單（不引入複雜 quota 系統）。

---

### 16. Context Engineering：Write / Select / Compress / Isolate

**決定**：`skill-call` ReAct loop 採用四項 context 管理策略，統稱 Context Engineering：

1. **Write**：trajectory 每步記錄到 `workflow_node_runs.trajectory`，供事後分析與 Memory Extractor 使用。
2. **Select**：透過 `tool_tags` 過濾 Tool Registry，只載入與任務相關的工具（詳見 Decision #20）。
3. **Compress**：當累積 context 超過 `context_compress_threshold`（預設 8000 tokens）時，以 LLM 摘要壓縮舊步驟歷史，保留最新 3 步 + 壓縮摘要（詳見 Decision #19）。
4. **Isolate**：每次 skill-call 執行有獨立 context 空間，不同 run 間不共享（Memory 透過 `workflow_skill_memories` 顯式注入，不隱式洩漏）。

**理由**：長 ReAct loop 容易因 context 過長導致模型注意力漂移或超出 token 限制；系統性管理 context 生命週期可提升執行品質與穩定性。

---

### 17. Checkpoint-Resume

**決定**：每個 node 執行完成後，將已完成 node 的 output 快照存入 `workflow_runs.checkpoint_state`（JSONB，格式為 `{ [nodeId]: output }`）。

**Resume 流程**：
1. Admin 呼叫 `POST /api/admin/workflow-runs/:runId/resume`
2. Server 讀取 `checkpoint_state`，跳過其中已記錄的 node（標記為 `skipped`）
3. 從第一個未完成的 node 繼續執行
4. run status 改回 `running`，繼續正常執行流程

**前提條件**：只有 status 為 `failed` 且 `checkpoint_state` 非空的 run 才可 resume。

**Admin UI**：failed run 詳情頁顯示「從斷點繼續」按鈕，僅在上述條件滿足時顯示。

**理由**：long-running workflow（含多個 skill-call / llm-call）失敗時重跑成本高；從斷點繼續可節省 token 成本與時間。

---

### 18. Output Guards

**決定**：`llm-call` node config 加 `output_schema?: JSONSchema`（可選）。

**執行流程**：
1. ai-backend 執行 LLM call 並取得輸出
2. 若 `output_schema` 已設定，以 JSON Schema 驗證輸出
3. 驗證通過 → 正常回傳
4. 驗證失敗 → 回傳 422，body 含 `{ error: "output_schema_violation", details: [...] }`
5. daodao-server 接收後將 node_run 標記 `failed`，error 記錄驗證失敗細節

**Schema 範例**：
```json
{
  "type": "object",
  "properties": {
    "summary": { "type": "string" },
    "score": { "type": "number", "minimum": 0, "maximum": 1 }
  },
  "required": ["summary", "score"]
}
```

**daodao-server Zod 整合**：`llmCallConfigSchema` 加入 `output_schema: z.object({}).passthrough().optional()`，允許任意合法 JSON Schema 物件。

**理由**：LLM 輸出格式不穩定是常見問題；在 harness 層強制驗證可避免格式錯誤的輸出流入後續 node 或寫回 DB。

---

### 19. Dead Loop Detection + Circuit Breaker

**Dead Loop 偵測**：
- skill-call ReAct loop 中，對每步 `tool_name + JSON.stringify(tool_input)` 計算 hash
- 若連續 3 步的 hash 相同，視為死迴圈，ai-backend 立即中止並回傳 `{ error: "dead_loop_detected", step: N }` (500)
- daodao-server 接收後 node_run 標記 `failed`，error 記錄「偵測到死迴圈（第 N 步重複）」

**Circuit Breaker**：
- daodao-server 記錄每個 node（by `node_id`）的失敗時間戳，存入 Redis（或 in-memory 快取）
- 30 分鐘內同一 node 連續失敗 3 次時，Circuit Breaker 啟動：
  - run 標記 `circuit_open`（新增此 status）
  - node_run 標記 `failed`
  - error 記錄「Circuit Breaker 啟動，冷卻至 {時間}」（冷卻時間 = 第 3 次失敗時間 + 10 分鐘）
- 冷卻期間，同一 node 的新 run 請求直接標記 `circuit_open` 而不實際執行

**Admin UI**：run status 為 `circuit_open` 時，顯示橘色警告「執行被 Circuit Breaker 中止」並顯示冷卻結束時間。

**理由**：防止反覆失敗的 node 持續消耗 LLM token 與 API quota；Circuit Breaker 模式給予下游系統恢復時間。

---

### 20. Tool Registry 動態過濾

**決定**：
- Tool Registry 的 `ToolDefinition` 加 `tags: string[]` 欄位（例如 `["search", "data", "notification"]`）
- `skill-call` node config 加 `tool_tags?: string[]`
- ai-backend 執行 skill-call 時，若 `tool_tags` 已設定，只載入 tags 有至少一個交集的工具
- 未設定 `tool_tags` 時，預設載入全部工具

**目的**：避免單次 skill-call 載入超過 20 個工具，導致 LLM 選擇錯誤或 token 浪費。

**Admin UI**：skill-call Node 設定表單加 `tool_tags` 多選欄位，選項從 Tool Registry 取得所有可用 tags（`GET /internal/tool-registry/tags`）。

**理由**：Tool Registry 隨功能擴展會累積大量工具；動態過濾確保每次 skill-call 只暴露任務相關工具，提升 LLM 選擇準確率。

---

### 21. Memory Extractor

**決定**：run 完成後（status = `completed`），若有 skill-call node，非同步提取並儲存記憶。

**流程**：
1. daodao-server 偵測到 run status 變為 `completed` 且有 skill-call node_run
2. 非同步呼叫 ai-backend `POST /internal/workflow-skills/:skillId/extract-memory`，傳入 trajectory
3. ai-backend 以 LLM 分析 trajectory，提取有長期價值的資訊（成功工具路徑、有用中間輸出、避免的錯誤路徑）
4. 回傳 `{ memories: [{ type: "episodic" | "semantic", content: string }] }`
5. daodao-server 將結果寫入 `workflow_skill_memories`（skill_id、run_id、memory_type、content）

**注入時機**：下次同一 skill 執行 skill-call 前，ai-backend 從 `workflow_skill_memories` 拉取最近 10 筆 episodic memory，以 XML block 注入 system prompt：
```xml
<past_learnings>
  <memory type="episodic">上次執行 search_practices 時，使用關鍵字「學習目標」效果最佳</memory>
  ...
</past_learnings>
```

**理由**：Skill 每次執行的有效路徑可作為未來執行的參考；系統性累積 episodic memory 讓 skill-call 隨執行次數增加而改善品質。

---

### 22. Phase 3 — Generator-Evaluator 即時迴圈

**決定（Phase 3 規劃）**：skill-call 執行中可選配 Evaluator Agent：每 N 步後，以獨立 LLM 呼叫評審目前輸出品質；若評分低於 `min_score` 閾值，Generator 繼續迭代而非輸出。

**config 草案**：
```json
{
  "evaluator": {
    "every_n_steps": 3,
    "min_score": 0.7,
    "max_evals": 5
  }
}
```

**狀態**：Phase 3 規劃中，詳細設計與 AC 待 Phase 3 設計階段定義。不在本 change 實作範圍內。

---

### 23. Phase 3 — Context Durability 監測

**決定（Phase 3 規劃）**：skill-call 執行過程中，定期採樣模型輸出與初始指令的 embedding cosine similarity；若相似度低於閾值，自動注入 reminder prompt 重申初始目標。每步的 `drift_score` 記錄到 trajectory。

**狀態**：Phase 3 規劃中，詳細設計與 AC 待 Phase 3 設計階段定義。不在本 change 實作範圍內。

---

## Dependencies（外部 Issues）

以下 daodao-ai-backend issues 影響本 change 的實作品質，需同步追蹤：

| Issue | 影響 | 處理方式 |
|---|---|---|
| **#8 [B1] 抽象化各 provider system prompt 傳遞方式** | `llm-call` 節點依賴 ai-backend 正確傳遞 system prompt；Anthropic 目前有 prepend bug | **前置依賴**：此 issue 需在 `llm-call` 節點上線前完成 |
| **#10 [A5] 實作 fallback model chain** | `llm-call` 節點 provider 失敗時整個 run 失敗 | `llm-call` node config 加 `fallback_provider?: string` 欄位，或依賴 ai-backend 統一處理 |
| **#12 [A3] 實作 LLM Tool System（function calling）** | `skill-call` 節點的 Tool Registry 內建工具（query_user_stats 等）依賴此 issue | `skill-call` 未完成前退化為純 SKILL.md system prompt 執行，tool calling 能力待 #12 完成後啟用 |
| **#7 [C5] 實作通用 GuardrailLayer** | admin 可自由填 prompt，有 prompt injection 風險 | `llm-call` / `skill-call` 節點執行前，ai-backend 須通過 guardrail 掃描 |
| **#17 Langfuse / #18 PostHog LLM 事件** | `workflow_node_runs` 記錄執行資料，應同步送 observability 事件 | **已納入本 change**（Decision #12）：`llm-call` / `skill-call` 執行完畢後，ai-backend 發送 Langfuse trace + PostHog `$ai_generation` 事件；token_count / cost_usd 回傳並寫入 node_run |

## Risks / Trade-offs

- **[Risk] Node config JSONB 缺乏 DB 層約束** → server 用 Zod 針對每種 node_type 做 config 驗證
- **[Risk] `{{nodes.<id>.output}}` 引用不存在的 node** → 執行前做靜態分析，發現懸空引用時拒絕執行
- **[Risk] A/B 測試用真實用戶資料涉及隱私** → dry-run 結果只存 admin DB，不對外暴露
- **[Risk] 執行時間過長（llm-call / tool-call）** → polling 查詢 run 狀態；Phase 2 可加 webhook 回調
- **[Risk] admin 自填 prompt 的 prompt injection** → 依賴 #7 GuardrailLayer，上線前須確認已實作
- **[Risk] provider system prompt 傳遞不一致** → 依賴 #8 修復，Anthropic bug 未修前 llm-call 跨 provider 行為可能不一致
- **[Trade-off] Phase 1 UI 不支援 condition 節點** → 資料模型已支援，UI 演進不需改 schema

## Migration Plan

1. 新增 SQL migration（`daodao-storage`）
2. 部署 `daodao-server` 新 API routes
3. 部署 `daodao-ai-backend` 新 internal endpoints
4. 部署 `daodao-admin-ui` 新頁面
5. Rollback：新 tables 獨立，刪除不影響現有功能

## Open Questions

- `output` 節點寫回 DB 的 table 白名單應由 admin 設定還是工程師預設？
- `tool-call` 節點是否需要 API key 管理（存在哪裡、如何加密）？
- `scheduled` / `event` trigger 是由 daodao-worker 還是 daodao-server 負責分發？
