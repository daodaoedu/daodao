# DAODAO 未來規劃：學習型 AI Agent 工作流平台

> 版本：v1.0 | 日期：2026-05-15 | 規劃者：Claude (Omni)

---

## 1. 願景與定位

### 1.1 願景聲明
**「讓每個人都擁有一個理解他們、隨他們一起成長的 AI 学習夥伴」**

### 1.2 定位陳述
DAODAO 從「個人發展行動建議引擎」進化為 **學習型 AI Agent 工作流平台**——一個能夠：
- 理解用戶的全貌（學習歷程、行為模式、偏好、目標）
- 主動設計並執行個人化學習工作流（不只是靜態建議）
- 持續從互動中進化，讓 AI Agent 越用越聰明
- 橫向擴展到生活各個場景（學習、健身、職涯、財務、創作...）

### 1.3 核心價值主張

| 傳統模式（現狀） | DAODAI Agent 平台（目標） |
|---|---|
| 被動回應：使用者問，模型答 | 主動引導：Agent 設計學習路徑並推動執行 |
| 一次性響應 | 持續性的學習夥伴關係 |
| 無狀態記憶 | 完整用戶學習記憶與進化 |
| 單一場景（action-maker） | 多元場景 Agent 生態 |
| 通用建議 | 深度個人化工作流 |

---

## 2. 架構設計

### 2.1 總體架構圖

```
┌─────────────────────────────────────────────────────────────┐
│                      用戶觸點層 (User Touchpoints)          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │   App    │  │  Web     │  │  API     │  │  MCP     │   │
│  │  (f2e)   │  │  (Next)  │  │  Gateway │  │ Servers  │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
│       │              │              │              │         │
├───────┴──────────────┴──────────────┴──────────────┴─────────┤
│                    Orchestration Layer                        │
│  ┌─────────────────────────────────────────────────────┐    │
│  │           Agent Workflow Engine (AWE)                │    │
│  │  ┌─────────┐  ┌──────────┐  ┌──────────┐           │    │
│  │  │ Planner │→ │ Executor │→ │ Monitor  │           │    │
│  │  └─────────┘  └──────────┘  └──────────┘           │    │
│  └─────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────┤
│                    Agent 執行層 (Agent Runtime)               │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │ Learning   │  │ Action     │  │ Insight    │            │
│  │ Agent      │  │ Maker      │  │ Agent      │            │
│  │ (學習規劃)  │  │ (行動生成)  │  │ (洞察分析)  │            │
│  └────────────┘  └────────────┘  └────────────┘            │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │ Habit      │  │ Career     │  │ Creative   │            │
│  │ Agent      │  │ Agent      │  │ Agent      │            │
│  └────────────┘  └────────────┘  └────────────┘            │
├─────────────────────────────────────────────────────────────┤
│                    資料與記憶層 (Data & Memory)               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ User Profile │  │ Learning     │  │ Vector Store     │  │
│  │ & State      │  │ Memory       │  │ (Embedding DB)   │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ PostgreSQL   │  │ Redis        │  │ Notion MCP Sync  │  │
│  │ (持久化)     │  │ (快取/Queue) │  │ (外部知識同步)   │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 核心元件定義

#### Agent Workflow Engine (AWE) — 核心中樞
```
負責：Agent 之間的協調、工作流的定義與義與執行、狀態管理
實現：基於狀態機（State Machine）的 Workflow Engine
位置：daodao-worker 或新增 daodao-orchestrator 專案
```

**Workflow Lifecycle：**
```
CREATED → PLANNING → EXECUTING → [WAITING_FOR_USER] → COMPLETED
                          ↓
                     FAILED → RETRYING → ...
```

**核心能力：**
- **Workflow 定義 DSL**：JSON/YAML-based，描述 Agent 序列、條件分支、循環
- **狀態管理**：每個 workflow instance 有完整狀態快照
- **斷點續傳**：用戶中斷後可從任意步驟恢復
- **多 Agent 協作**：支援串聯、並行、分支 Agent 協同

#### Learning Agent — 核心創新
```
負責：理解用戶學習需求、設計個人化學習路徑、動態調整
```

**三層記憶體架構：**
1. **Working Memory**（工作記憶）：當前對話上下文、短期目標
2. **Episodic Memory**（情景記憶）：歷次學習歷程、完成/失敗紀錄
3. **Semantic Memory**（語義記憶）：用戶知識模型、能力評估、偏好模式

**核心演算法：**
- Knowledge Tracing（知識追蹤）：Spaced Repetition + 貝氏知識追蹤
- Learning Path Planning：基於能力差距的動態路徑規劃
- Difficulty Calibration：根據用戶表現動態調整難度

### 2.3 技術棧演進

| 層級 | 現有技術 | 目標技術 | 變更理由 |
|------|---------|---------|---------|
| Worker API | Hono + CF Workers | Hono + CF Workers + Durable Objects | 長期狀態管理 |
| AI 模型/路由 | Qwen3-30B (CF AI) 單模型 | **daodao-ai-backend 多 Provider 路由** (9 providers + fallback chain + 自動降級) | 品質/成本/可用性最優化；直接沿用現有 BaseLLMBackend 策略模式 |
| 記憶存儲 | PostgreSQL | PostgreSQL + Vector DB (pgvector) | 語義記憶检索 |
| 消息佇列 | — | Redis (via ai-backend 現有 redis_utils) | Workflow 排程與去抖 |
| 觀測性 | Langfuse | Langfuse + AIQueryLog (ai-backend 現有用量追蹤) | 完整可觀察性 + 成本監控 |
| 前端 | React (Turborepo) | React + State Machine (XState) | 複雜狀態管理 |

---

## 3. 階段路線圖

### Phase 1：基建擴展（1-2 個月）
**目標：為 Agent 平台打下堅實基礎**

#### 1.1 記憶系統（Memory System）
- [ ] **User Profile Service**：擴展用戶模型，增加 `learning_profile`、`preference_vector`、`goal_state`
- [ ] **Learning Memory Schema**：
  ```sql
  -- 用戶學習記憶表
  CREATE TABLE learning_memories (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    memory_type TEXT CHECK (memory_type IN ('episodic', 'semantic', 'working')),
    content JSONB NOT NULL,          -- 記憶內容
    embedding vector(1536),          -- 語義向量
    created_at TIMESTAMPTZ DEFAULT NOW(),
    accessed_at TIMESTAMPTZ,
    recall_count INT DEFAULT 0,      -- 被召回次數
    decay_factor FLOAT DEFAULT 1.0   -- 衰減因子
  );
  
  -- 用戶能力模型
  CREATE TABLE user_competencies (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    domain TEXT NOT NULL,            -- 領域（如：react、健身、投資）
    level FLOAT DEFAULT 0.0,         -- 能力值 0-1
    confidence FLOAT DEFAULT 0.5,    -- 置信度
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```
- [ ] **向量檢索服務**：基於 `pgvector` 的語義搜索，支援記憶召回
- [ ] **記憶管理 API**：CRUD + 語義搜索 + 定期整理（Memory Consolidation）

#### 1.2 Agent 基礎框架
- [ ] **Agent 抽象接口**：
  ```typescript
  interface Agent {
    id: string;
    name: string;
    role: string;
    systemPrompt: string;
    tools: Tool[];
    execute(context: AgentContext): Promise<AgentResult>;
    observe(feedback: Feedback): void;  // 從反饋中學習
  }
  ```
- [ ] **Tool System**：Agent 可調用的工具框架（查 DB、搜 Notion、調 API、生成內容）
- [ ] **Agent Registry**：Agent 註冊與發現中心

#### 1.3 Workflow Engine MVP
- [ ] 狀態機引擎（基於 XState 或自研）
- [ ] Workflow 定義 DSL
- [ ] 基本執行器（串行 Agent 執行）
- [ ] 持久化與斷點續傳

### Phase 2：核心 Agent 能力（2-3 個月）
**目標：實現第一套完整的學習 Agent 工作流**

#### 2.1 Learning Agent
- [ ] **學習路徑規劃**：根據用戶目標 + 現有能力 + 可用時間，生成個人化學習計劃
- [ ] **每日推薦引擎**：每天推薦當天應該做的學習行動（結合 Spaced Repetition）
- [ ] **進度追蹤與適應**：根據完成情況動態調整後續計劃
- [ ] **學習風格識別**：從用戶行為中學習偏好的學習方式（視覺/聽覺/實踐）

#### 2.2 Action Maker Agent 升級
- [ ] 從靜態 prompt → **動態 Agent**：
  - 記憶用戶過去生成的行動
  - 了解用戶的完成率與偏好
  - 生成更精準、更連貫的建議
  - 主動跟進：「上次的 X 行動進行得怎樣？」
- [ ] **行動鏈**：不再只是單一行動，而是生成相互關聯的行動序列
- [ ] **場景擴展**：從 personal development 擴展到：
  - 📚 學習規劃（語言、技術、考試）
  - 💪 健身與健康
  - 💼 職涯發展
  - 🎨 創意與寫作

#### 2.3 Insight Agent
- [ ] **週報/月報自動生成**：分析用戶一段時間的學習數據與行動完成情況
- [ ] **模式發現**：識別用戶的學習瓶頸、高效率時段、放棄點
- [ ] **動機引擎**：在恰當時機給予鼓勵、提醒、挑戰

### Phase 3：多 Agent 協作（2-3 個月）
**目標：實現 Agent 之間的協作與複雜工作流**

#### 3.1 多 Agent 工作流示例：「30 天學習計劃」
```
用戶：「我想在 30 天內學會 TypeScript 基礎」

1. Learning Agent 分析用戶當前水平 → 生成學習路徑
2. Action Maker Agent 將路徑拆解為每日行動
3. Tracker Agent 每日跟進完成情況
4. Insight Agent 週末分析進度 → 動態調整後續計劃
5. Motivation Agent 在用戶停頓時觸發介入
```

#### 3.2 Workflow Engine 進階
- [ ] **並行 Agent 執行**：多 Agent 同時工作
- [ ] **條件分支**：根據執行結果動態選擇下一步
- [ ] **Agent 間通訊**：一個 Agent 的輸出是另一個 Agent 的輸入
- [ ] **人機協作節點**：需要用戶介入的步驟（review、選擇、補充資訊）

#### 3.3 MCP 生態擴展
- [ ] **Notion MCP 雙向同步**：學習計劃 ↔ Notion 頁面自動同步
- [ ] **新 MCP Server**：
  - Calendar MCP：讀取/寫入用戶日程
  - File MCP：讀取用戶本地文件（學習資料）
  - Browser MCP：幫助用戶研究學習資源

### Phase 4：生態與擴展（持續）
**目標：開放平台，讓更多人創建和分享 Agent/工作流**

#### 4.1 Agent Marketplace
- [ ] 用戶可以瀏覽、訂閱他人創建的 Agent
- [ ] Agent 模板市場（學語言 Agent、健身 Agent、職涯 Agent...）
- [ ] Agent 評價與反饋系統

#### 4.2 自定義工作流編輯器
- [ ] 可視化 Workflow 編輯器（前端）
- [ ] 用戶可以拖拽組合 Agent 與工具
- [ ] 分享與 Fork 工作流

#### 4.3 開放 API
- [ ] 第三方開發者可以註冊自己的 Agent
- [ ] Webhook 支持（外部系統觸發工作流）
- [ ] Plugin 機制擴展 Agent 能力

---

## 4. 關鍵技術設計

### 4.1 LLM 調用策略

> **設計原則：直接沿用 `daodao-ai-backend` 的現有多 Provider 路由架構，並在其基礎上擴展 Fallback 與 Agent 路由能力。**

#### 4.1.1 現有基礎（daodao-ai-backend 已實作）

`ai-backend` 已實作一套完整的 Strategy + Factory 模式的 LLM 路由系統：

```
src/services/llm/
├── base.py                  # BaseLLMBackend (ABC) — 統一介面
├── client.py                # LLMClient (facade) + _BACKEND_MAP
├── factory.py               # make_llm_client() singleton
├── logging_client.py        # LoggingLLMClient (wrapper，自動寫 AIQueryLog)
├── openai_backend.py        # OpenAI Responses API (AsyncOpenAI SDK)
├── openai_chat_backend.py   # 通用 OpenAI Chat Compat (CF/NVIDIA/Cerebras/OpenRouter/Ollama Cloud)
├── anthropic_backend.py     # Anthropic Messages API
├── gemini_backend.py        # Google Gemini (google-genai SDK)
├── groq_backend.py          # Groq (OpenAI-compatible)
└── ollama_backend.py        # 本地 Ollama (httpx direct)
```

**支援 9 個 Provider，分為三類：**

| 類別 | Provider | Backend Class | SDK/方式 |
|------|---------|---------------|---------|
| **專屬 SDK** | OpenAI | `OpenAIBackend` | `AsyncOpenAI` + Responses API |
| | Anthropic | `AnthropicBackend` | `AsyncAnthropic` + /v1/messages |
| | Google Gemini | `GeminiBackend` | `google-genai` SDK |
| | Groq | `GroqBackend` | `AsyncOpenAI` (兼容端點) |
| **通用 Chat Compat** | Cloudflare Workers AI | `OpenAIChatBackend` | OpenAI-compatible |
| | NVIDIA NIM | `OpenAIChatBackend` | OpenAI-compatible |
| | Cerebras | `OpenAIChatBackend` | OpenAI-compatible |
| | OpenRouter | `OpenAIChatBackend` | OpenAI-compatible |
| | Ollama Cloud | `OpenAIChatBackend` | OpenAI-compatible |
| **本地部署** | Ollama | `OllamaBackend` | `httpx` direct `/api/generate` |

**統一回傳格式**：`Tuple[str, float, Dict[str, Any], str]` → `(output, cost_usd, usage, backend_name)`

**配置方式**：Pydantic Settings + 環境變數（`LLM_BACKEND__<PROVIDER>__<KEY>`）

#### 4.1.2 需擴展的能力

現有架構是 **單一 Provider 綁定**（factory 直接硬綁定 gemini），缺少以下能力：

```
┌─────────────────────────────────────────────────────────────┐
│                   擴展後的 LLM Router                       │
│                                                             │
│  ┌──────────┐   ┌───────────────┐   ┌───────────────────┐  │
│  │ Task     │──→│ Provider      │──→│ Fallback Chain    │  │
│  │ Router   │   │ Selector      │   │ (自動降級)         │  │
│  └──────────┘   └───────────────┘   └───────────────────┘  │
│       │               │                     │              │
│       ↓               ↓                     ↓              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │            統計層 (CostGuard)                        │   │
│  │  - Token 用量追蹤  - 成本預算控制  - 速率限制         │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**具體擴展項目：**

1. **Fallback Chain**：當前沒有自動 fallback。需實作：
   ```python
   # Provider 優先順序配置
   FALLBACK_CHAINS = {
       "default": ["gemini", "openai", "anthropic", "groq", "ollama"],
       "high_quality": ["claude-sonnet", "gpt-4o", "gemini-2.5-pro"],
       "budget": ["groq", "ollama", "gemini-flash", "openai-mini"],
   }
   ```

2. **Task-based Router**：根據 Agent 任務類型自動選擇最佳 Provider：
   ```python
   TASK_ROUTING = {
       "quick_lookup":    {"provider": "groq",      "model": "llama-3.3-8b",    "reason": "快、便宜"},
       "reasoning":       {"provider": "anthropic",  "model": "claude-3.5-sonnet", "reason": "推理強"},
       "code_generation": {"provider": "openai",     "model": "gpt-4o",          "reason": "代碼優"},
       "creative":        {"provider": "gemini",     "model": "gemini-2.5-pro",  "reason": "創意好"},
       "batch_cheap":     {"provider": "ollama",     "model": "qwen2.5:14b",     "reason": "本地免費"},
   }
   ```

3. **CostGuard 模組**：在 `LoggingLLMClient` 之上增加：
   - 每個 workflow 的累積成本追蹤
   - 超過預算自動降級到更便宜 Provider
   - Token 使用量的即時監控與警報

4. **Model Sync → Agent 動態選型**：利用現有 `model_sync_service.py` 同步的 `llm_models` 表，結合費率欄位 (`input_cost_per_1m`, `output_cost_per_1m`) 實現 **成本最優的自動模型選擇**。

#### 4.1.3 整合架構圖

```
Agent Workflow Engine
    │
    ├── Learning Agent ──────→ ai-backend (Routing + Fallback + CostGuard)
    │                            ├── OpenAI (gpt-4o) — 複雜推理
    │                            ├── Anthropic (claude) — 教練對話
    │                            ├── Gemini (flash) — 日常任務
    │                            ├── Groq/NVIDIA — 快速查詢
    │                            └── Ollama — 本地開發/離線
    │
    ├── Action Maker Agent ──→ 沿用現有 action-maker (daodao-worker)
    │                            (可替換後端為 ai-backend routing)
    │
    └── Insight Agent ───────→ ai-backend (分析 + 報告生成)
```

### 4.2 記憶管理設計

```
User Request
    ↓
[Context Builder]
    ↓
┌──────────────────────────────────────────┐
│          記憶召回 (Memory Recall)          │
│                                          │
│  ┌─────────┐  ┌──────────┐  ┌─────────┐  │
│  │ Working │  │Semantic  │  │Episodic │  │
│  │ Memory  │  │ Vector   │  │ Store   │  │
│  │ (Redis) │  │ Search   │  │(PG+Vec) │  │
│  └─────────┘  └──────────┘  └─────────┘  │
│       ↓            ↓              ↓       │
│  ┌─────────────────────────────────────┐  │
│  │         Context Window Builder       │  │
│  │  (Relevance Filter + Token Budget)  │  │
│  └─────────────────────────────────────┘  │
│                 ↓                          │
│          LLM Prompt                       │
└──────────────────────────────────────────┘
```

**Memory Consolidation 機制：**
- 每週自動執行：將短期記憶歸納為長期記憶
- 記憶衰減：較舊的記憶逐漸降低權重（除非被反覆召回）
- 重要性標記：用戶標記「重要」的反饋 → 加權保存

### 4.3 Workflow 定義 DSL 設計

```yaml
# 範例：30天學習計劃工作流
workflow:
  name: "30-day TypeScript Learning"
  trigger:
    type: user_request
    pattern: "我想在 {days} 天內學會 {topic}"
  
  parameters:
    topic: string
    days: int (default: 30)
    daily_time: int (default: 60)  # minutes
    current_level: enum (beginner, intermediate, advanced)
  
  agents:
    planner:
      type: learning_planner
      input: [topic, days, current_level]
      output: learning_path
    
    action_maker:
      type: action_generator
      depends_on: [planner]
      input: [learning_path, daily_time]
      output: daily_actions
      repeat: daily
    
    tracker:
      type: progress_tracker
      depends_on: [action_maker]
      input: [daily_actions]
      output: progress_report
      trigger: daily_check_in
    
    adjuster:
      type: plan_adjuster
      depends_on: [tracker]
      input: [progress_report, original_plan]
      output: adjusted_plan
      trigger: weekly
      condition: completion_rate < 0.7
    
    reporter:
      type: insight_reporter
      depends_on: [tracker]
      input: [progress_report]
      output: weekly_report
      trigger: weekly

  flow:
    - step: plan
      agent: planner
    - step: generate_daily
      agent: action_maker
      loop: daily
    - parallel:
        - step: track
          agent: tracker
        - step: report
          agent: reporter
          interval: weekly
      - step: adjust
        agent: adjuster
        condition: needed
```

### 4.4 與 ai-backend 的模型同步整合

`daodao-ai-backend` 的 `model_sync_service.py` 已實作 9 個 Provider 的模型清單同步（Upsert 至 `llm_models` 表），可透過此機制驅動智能路由：

1. **動態模型選型**：依 `llm_models` 表中的 `input_cost_per_1m` / `output_cost_per_1m` / `cached_input_cost_per_1m` 欄位，實時計算成本最低的可用模型
2. **模型健康檢查**：利用 backend 的 `check_health()` 介面，自動剔除異常 Provider
3. **自動激活新模型**：新同步的模型 `is_active=False`，需經過自動評估（品質門檻 + 成本門檻）後自動啟用

### 4.5 用戶學習模型 (User Learning Model)

```typescript
interface UserLearningModel {
  // 基本信息
  userId: string;

  // === AI-backend 整合 ===
  // 透過 ai-backend 的 AIQueryLog 分析用戶的歷史 LLM 交互模式
  preferredProvider: string | null;   // 用戶偏好的 provider（從反饋學習）
  preferredModel: string | null;      // 用戶偏好的模型
  estimatedMonthlyCost: number;       // 預估月成本（基於歷史用量）

  // 能力模型（多維度）
  competencies: Map<string, Competency>;  // domain → level

  // 學習偏好
  learningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'mixed';
  preferredDifficulty: 'easy' | 'moderate' | 'challenging';
  optimalSessionLength: number;      // minutes
  bestLearningTime: TimeWindow[];

  // 行為模式
  completionRate: number;
  averageTimePerAction: number;
  dropOffPoints: DropOffPattern[];
  motivationTriggers: MotivationType[];

  // 進度追蹤
  activeGoals: Goal[];
  completedMilestones: Milestone[];
  streaks: { domain: string; count: number }[];

  // 記憶衰減模型
  memoryDecayCurve: MemoryDecayParams;
  spacedRepetitionSchedule: SRSchedule;
}
```

---

## 5. 階段交付里程碑

| 階段 | 時間 | 關鍵交付 | 驗收標準 |
|------|------|---------|---------|
| Phase 0 | 即刻 | **修復 ai-backend + Fallback Chain + CostGuard** | 依賴注入修復、多 Provider fallback 測試通過、Task Router 可用 |
| Phase 1 | Month 1-2 | Memory System + Agent Framework + Workflow Engine MVP | 記憶可存可讀取、Agent 可載入工具、Workflow 可串行執行、LLM 調用 100% 走 ai-backend routing |
| Phase 2 | Month 3-5 | Learning Agent + 升級 Action Maker + Insight Agent | 用戶可被問卷評估、每日自動推薦、週報可生成、成本控制在預算內 |
| Phase 3 | Month 6-8 | 多 Agent 協作 + MCP 生態擴展 | 複雜工作流可執行、Notion 雙向同步、Provider 按 Agent 任務自動選型 |
| Phase 4 | Month 9+ | Agent Marketplace + 可視化編輯器 + 開放 API | 第三方可註冊 Agent + 自帶 Provider、用戶可自定義工作流 |

---

## 6. 風險與應對

### 6.1 技術風險

| 風險 | 機率 | 影響 | 緩解措施 |
|------|------|------|---------|
| LLM 調用成本失控 | 中 | 高 | 分層路由 + 硬額度限制 + 快取策略 |
| 記憶膨脹 / 向量檢索慢 | 中 | 中 | 分區存儲 + 定期整理 + 混合檢索（關鍵字 + 向量） |
| Workflow 執行失敗 / 超時 | 高 | 中 | 重試機制 + 超時斷點 + 用戶通知 |
| Agent 響應品質不一致 | 高 | 高 | 多模型 fallback + 輸出校驗 + 用戶反饋迴圈 |
| 多 Agent 協作死鎖 | 低 | 高 | 超時中斷 + 監控警報 + 自動恢復 |
| ai-backend Provider 全掛 | 低 | 致命 | Fallback Chain 兜底 + 本地 Ollama 離線備援 |
| 硬幣種成本失控 | 中 | 高 | CostGuard 每 workflow 設定預算上限，超限自動降級到免費/低成本 Provider |
| ai-backend Provider 全掛 | 低 | 致命 | Fallback Chain 兜底 + 本地 Ollama 離線備援 |
| 硬幣種成本失控 | 中 | 高 | CostGuard 每 workflow 設定預算上限，超限自動降級到免費/低成本 Provider |

### 6.2 產品風險

| 風險 | 緩解措施 |
|------|---------|
| 用戶習慣改變太慢 | 漸進式導入，先保持現有功能完整運作 |
| 過度自動化導致用戶失去主動性 | 設計「建議 vs 自動執行」模式，讓用戶選擇 |
| 隱私與數據安全 | 本地化記憶存儲、用戶可隨時刪除、端到端加密 |

### 6.3 商業風險

| 風險 | 緩解措施 |
|------|---------|
| 開放平台生態短期難以建立 | 先內建核心 Agent，驗證價值後再開放 |
| 與 Notion 等既有工具競爭 | 定位補充而非替代，重在「學習執行」而非「知識管理」 |

---

## 7. 具體實施建議（立即可動作）

### Phase 0：修復 ai-backend + 建立 Fallback Chain（1 週）
**前置目標**：在啟動任何 Agent 新功能之前，先讓現有 ai-backend 的多 Provider 架構真正可用。

**問題清單**（來自代碼審查）：
1. `factory.py` 中 `make_llm_client()` **硬綁定 `"gemini"`** — 整個 app 只能用一個 Provider
2. `main.py` 中 `app.state.llm_client` 被註解掉
3. `dependencies.py` 的 `get_llm_client` 未被正確注入
4. **沒有 Fallback Chain** — 任何 Provider 掛了就全掛
5. **沒有 Task-based Router** — 所有任務都用同一個 Provider

**具體動作：**

1. **修復依賴注入**
   ```python
   # factory.py — 改為接受 provider 參數
   def make_llm_client(provider: str = "gemini") -> LLMClient:
       model_config = settings.get_provider_config(provider)
       backend_class = _BACKEND_MAP[provider]
       return LLMClient(backend_class(model_config))
   ```

2. **新增 FallbackRouter**
   ```python
   FALLBACK_CHAINS = {
       "default": ["gemini-flash", "openai-mini", "groq", "ollama"],
       "high_quality": ["claude-sonnet-4-2", "gpt-4o", "gemini-2.5-pro"],
       "batch_cheap": ["groq", "ollama", "gemini-flash"],
   }
   
   class FallbackRouter:
       async def generate(self, prompt, chain="default"):
           for provider in FALLBACK_CHAINS[chain]:
               try:
                   client = make_llm_client(provider)
                   return await client.generate(prompt)
               except Exception as e:
                   logger.warning(f"{provider} failed, trying next...")
           raise AllProvidersFailedError()
   ```

3. **實作 TaskRouter（Provider 選型策略）**
   ```python
   TASK_STRATEGY = {
       "agent_planning":  {"routing": "high_quality", "model_overrides": {"max_tokens": 8192}},
       "action_generation": {"routing": "default", "model_overrides": {}},
       "insight_summary":   {"routing": "default", "model_overrides": {}},
       "quick_check":       {"routing": "batch_cheap", "model_overrides": {"max_tokens": 512}},
   }
   ```

4. **CostGuard 層**
   - 在 `LoggingLLMClient` 之上包裝
   - 每個 workflow instance 累積成本追蹤
   - 超過預算自動降級到 `batch_cheap` 路由
   - 配合 `ai-backend` 現有的 `AIQueryLog.cost_usd` 欄位

5. **Smoke Test**
   ```bash
   # 逐一測試每個 Provider
   for provider in gemini openai anthropic groq ollama cloudflare nvidia cerebras openrouter; do
     curl -X POST localhost:8000/api/test-provider \
       -H "Content-Type: application/json" \
       -d "{\"provider\": \"$provider\", \"prompt\": \"hello\"}"
   done
   ```

**驗收標準：**
- [ ] 所有 9 個 Provider 的 health check 通過
- [ ] Fallback 測試：模擬主 Provider 失敗，自動降級成功
- [ ] TaskRouter 可根據任務類型返回不同 Provider
- [ ] CostGuard 在超額時正確降級
- [ ] `LLMClient` 正確注入到 FastAPI 的 dependency injection

---

### 7.1 第一步：記憶系統 MVP（2 週）

**目標**：讓 action-maker 「記住」用戶 — 這個階段同時也是 Phase 1 的開始。

**前置條件**：Phase 0（ai-backend 修復）已完成。

1. 在 PostgreSQL 中新增 `learning_memories` 與 `user_competencies` 資料表
2. 建立 MCP Server 封裝記憶 CRUD（利用現有 `daodao-mcp/packages/pg` 模式）
3. 在 action-maker 中加入「記憶回顧」邏輯：
   ```typescript
   // 生成行動前，先檢索用戶記憶（走 ai-backend 的 FallbackRouter）
   const memories = await memoryService.search(userId, {
     query: topic,
     limit: 10,
     minRelevance: 0.7
   });
   
   // 在 prompt 中注入記憶
   const memoryContext = memories.map(m => 
     `- ${m.content} (完成度: ${m.completion}%)`
   ).join('\n');
   ```
4. 在 action-maker generate 的 prompt 中加入記憶上下文
5. **LLM 調用統一經過 ai-backend**：action-maker 不再直接調用 CF Workers AI，而是透過 `ai-backend` 的 FallbackRouter

### 7.2 第二步：行動追蹤與反饋（3 週）

**目標**：建立「生成 → 執行 → 反饋」閉環

1. 新增 `POST /action-maker/status` API：用戶回報行動完成狀態
2. 設計反饋型 prompt：
   ```
   [用戶反饋]
   - 行動「每天閱讀 30 分鐘」：已執行 5/7 天，有 2 天中斷
   - 用戶表示「下班後太累沒讀進去」
   
   [任務]
   根據以上反饋，调整學習建議：
   1. 分析中斷原因
   2. 提出更具體的替代方案（如：通勤時用聽書替代）
   3. 微調行動描述使其更可行
   ```
3. 將反饋存入記憶系統，供後續生成使用
4. **成本追蹤**：利用 ai-backend 的 `AIQueryLog` 追蹤每個用戶的 LLM 成本
5. **路由優化**：根據 Phase 0 的 TaskRouter，讓反饋分析用高品質模型、日常回應用低成本模型

### 7.3 第三步：學習路徑規劃 Agent（4 週）

**目標**：從「單次行動建議」升級為「持續學習路徑」

1. 建立 Learning Agent，包含：
   - 用戶能力評估（初始問卷 + 持續追蹤）
   - 學習路徑生成（基於目標 + 現有能力的差距分析）
   - 進度追蹤與動態調整
2. 實現 Workflow Engine MVP，支持：
   - 串行 Agent 執行（Planner → Action Maker → Tracker）
   - 斷點續傳
   - 定期觸發（每日/每週）
3. **Multi-Provider 協作**：每個 Agent 可選用不同 Provider
   ```yaml
   agents:
     planner:
       provider: anthropic  # 推理強，用 claude-sonnet
     action_maker:
       provider: gemini     # 創意好，用 gemini-flash
     tracker:
       provider: groq       # 速度快，用 llama-3.3-70b
     insight:
       provider: openai     # 報告規整，用 gpt-4o
   ```

---

## 8. 與現有架構的整合方式

### 8.1 從 daodao-ai-backend 出發：LLM 能力升級路徑

**核心策略：不重複造輪子，直接在 ai-backend 的多 Provider 路由上擴展。**

```
┌──────────────────────────────────────────────────────────────────┐
│                    現有 ai-backend 能力                           │
│                                                                  │
│  ✅ 9 個 Provider 接入 (OpenAI/Anthropic/Gemini/Groq/           │
│     Cloudflare/NVIDIA/Cerebras/OpenRouter/Ollama)                │
│  ✅ Strategy + Factory 模式 (易於擴展新 Provider)                │
│  ✅ 統一回傳格式 (output, cost, usage, backend_name)            │
│  ✅ AIQueryLog 用量追蹤 (自動寫入 PostgreSQL)                    │
│  ✅ Token Quota 檢查 (Redis-based)                               │
│  ✅ Model Sync Service (9 個 Provider 模型列表自動同步)          │
│  ⚠️  無自動 Fallback Chain (需新增)                              │
│  ⚠️  無 Task-based Router (需新增)                               │
│  ⚠️  Singleton 綁定 gemini (需改為動態選型)                     │
│  ⚠️  LLMClient 未被正確注入依賴 (需修復)                        │
└──────────────────────────────────────────────────────────────────┘
```

**Phase 0 (立即動作)：修復並升級 ai-backend**

在啟動任何 Agent 功能之前，先完成以下基建工作：

1. **修復依賴注入問題**
   - `main.py` 中 `app.state.llm_client` 被註解掉了，需要解除註解
   - `dependencies.py` 的 `get_llm_client` 需改為支持動態 Provider 選擇，而非返回 singleton
   - `factory.py` 的 `make_llm_client()` 需從硬綁定 `"gemini"` 改為接受 provider 參數

2. **新增 Fallback Chain**
   ```python
   # 新增到 llm_router.py
   class FallbackRouter:
       def __init__(self, chains: Dict[str, List[str]]):
           self.chains = chains  # e.g. {"default": ["gemini", "openai", "anthropic"]}
       
       async def generate_with_fallback(self, prompt, task_type="default"):
           chain = self.chains.get(task_type, self.chains["default"])
           last_error = None
           for provider_name in chain:
               try:
                   client = LLMClient(provider=provider_name)
                   return await client.generate(prompt)
               except Exception as e:
                   last_error = e
                   logger.warning(f"{provider_name} failed: {e}, trying next...")
           raise FallbackExhaustedError(chain, last_error)
   ```

3. **實作 Task-based Router**
   ```python
   TASK_ROUTING = {
       "quick_lookup":    {"providers": ["groq"],          "fallback": "ollama"},
       "reasoning":       {"providers": ["anthropic"],      "fallback": "openai"},
       "code_generation": {"providers": ["openai"],         "fallback": "gemini"},
       "creative":        {"providers": ["gemini"],         "fallback": "anthropic"},
       "batch_cheap":     {"providers": ["ollama", "groq"], "fallback": "gemini-flash"},
   }
   ```

4. **CostGuard 模組**
   - 在 `LoggingLLMClient` 之上包裝
   - 追蹤每個 workflow instance 的累積成本
   - 超過預算自動降級到 `batch_cheap` routing

### 8.2 現有 MCP 資源整合

```
┌─────────────────────────────────────────────────────────────┐
│                    MCP 生態整合                               │
│                                                             │
│  Notion MCP ←→ 用戶學習計劃同步                               │
│  ├── Notion 頁面自動生成學習計劃                              │
│  ├── Notion Database 追蹤學習進度                            │
│  └── 用戶在 Notion 中記錄筆記 → 自動同步回 Agent             │
│                                                             │
│  PostgreSQL MCP ←→ 用戶記憶查詢 + ai-backend 數據            │
│  ├── learning_memories (新)                                  │
│  ├── user_competencies (新)                                  │
│  ├── AIQueryLog (ai-backend 現有) → 用於成本分析             │
│  └── llm_models (ai-backend 現有) → 用於動態選型             │
│                                                             │
│  Redis MCP ←→ Workflow 狀態快取 + Quota 控制                 │
│  ├── 當前進度                                                │
│  ├── Pending 動作                                            │
│  ├── 排程觸發                                                │
│  └── Rate Limit 狀態 (ai-backend middleware 現有)            │
│                                                             │
│  ➕ 新增 MCP Servers (Phase 3)                               │
│  ├── Calendar MCP：讀取/寫入用戶日程                          │
│  ├── File MCP：讀取用戶本地學習資料                           │
│  └── Browser MCP：幫助用戶研究學習資源                        │
└─────────────────────────────────────────────────────────────┘
```

### 8.3 現有 action-maker 的演化路徑 (含 ai-backend 整合)

```
V1.0 (現有)       → 靜態 prompt 於 daodao-worker CF Worker，一次生成 3 行動
V1.5 (Phase 1)    → 帶記憶的生成 + 後端升級到 ai-backend routing
                    ‣ action-maker 調用 ai-backend 的 FallbackRouter
                    ‣ 記憶召回結果注入 prompt
V2.0 (Phase 2)    → 持續學習 Agent
                    ‣ Learning Agent 使用 TaskRouter 按任務選型
                    ‣ CostGuard 控制在預算內
                    ‣ 自動跟進：「上次的 X 行動進行得怎樣？」
V3.0 (Phase 3)    → 多 Agent 協作工作流
                    ‣ AWE 調用多個 Agent，每個 Agent 可選不同 Provider
                    ‣ Planner 用 claude-sonnet，Tracker 用 groq，Reporter 用 gemini
V4.0 (Phase 4)    → 開放平台
                    ‣ 第三方開發者可註冊自定義 Agent + Provider
                    ‣ 用戶可見的 Provider 選擇 UI
```

---

## 9. ADR（架構決策記錄）

### ADR-001：選擇狀態機而非簡單腳本引擎
- **Decision**：使用 XState（或類似方案）作為 Workflow Engine 基礎
- **Drivers**：需要可視化調試、斷點續續傳、錯誤恢復
- **Alternatives**：
  - 簡單腳本引擎（Node-RED 風格）：學習門檻低但擴展性差
  - 純代碼定義（TS function chain）：靈活但難以維護和除錯
  - **選擇：狀態機** — 可視化、正式語義、易於測試
- **Why chosen**：狀態機提供正式的執行語義，支持可視化調試，適合長時間運行的學習工作流
- **Consequences**：需要學習狀態機概念，但換來的是可維護性和可靠性

### ADR-002：多模型路由而非單一模型
- **Decision**：基於成本/品質動態選擇 LLM 提供商
- **Drivers**：成本控制、品質要求、供應商冗餘
- **Alternatives**：
  - 單一模型：簡單但成本高或品質受限
  - 人工選擇：靈活但不適合自動化
  - **選擇：自動路由** — 根據任務複雜度和預算自動分配
- **Why chosen**：用戶的 action-maker 調用頻繁，成本差異巨大（10x-100x）
- **Consequences**：需要統一 prompt 格式和響應解析，增加系統複雜度

### ADR-003：本地存儲為主，雲端同步為輔
- **Decision**：用戶數據本地存儲，支持可選雲端同步
- **Drivers**：隱私、數據主權、離線可用性
- **Alternatives**：
  - 純雲端：依賴賴網路，隱私風險
  - 純本地：無法跨設備同步
  - **選擇：本地 + 可選同步** — 兼顧隱私與便利性
- **Why chosen**：用戶的學習記憶高度敏感，應優先保護
- **Consequences**：需要同步衝突解決機制，增加客戶端複雜度

### ADR-004：自動 Fallback Chain 機制
- **Decision**：在 ai-backend 的 `LLMClient` 之上新增 FallbackRouter，當主 Provider 失敗時自動降級
- **Drivers**：
  - ai-backend 的 `factory.py` 硬綁定 `"gemini"`，無法自動切換
  - `LoggingLLMClient` 已記錄失敗，但沒有自動重試邏輯
  - 單一 Provider 掛掉會導致整個 Agent 功能不可用
- **Alternatives**：
  - 每次呼叫前健康檢查：增加延遲，不適合高頻調用
  - 人工切換：需要人工介入，不適合自動化 Agent
  - **選擇：Failover Chain** — 失敗自動嘗試下一個 Provider
- **Why chosen**：成本接近零（正常情況下不會觸發 fallback），但能大幅提升系統可用性
- **Consequences**：
  - 不同 Provider 的 response format 略有差異，需要統一解析層
  - fallback 過程中，用量/成本會記在原 Provider 名下，需在 AIQueryLog 中標記 `fallback_from`

### ADR-005：任務驅動的 Provider 路由
- **Decision**：根據 Agent 任務類型自動選擇最合適的 Provider + 模型組合
- **Drivers**：
  - 9 個 Provider 的價格差異達 10x-100x（Ollama 免費 vs Claude Sonnet 每百萬 token $10+）
  - 不同任務對模型能力的需求不同：推理→需要強模型，檢索→需要快模型
  - ai-backend 的 `model_sync_service.py` 已同步所有模型費率資訊
- **Alternatives**：
  - 全用最強模型：品質好但成本不可控
  - 全用最便宜模型：成本低但品質差，尤其在推理/創意場景
  - **選擇：Task-based Router** — 按需分配，平衡品質與成本
- **Why chosen**：透過 `TASK_STRATEGY` 配置表，可以在不修改業務代碼的情況下調整路由策略
- **Consequences**：
  - 需要維護一份 TASK→Provider 的映射表（但這是配置而非代碼，易於調整）
  - 同一用戶的不同 Agent 會使用不同 Provider，可能導致體驗不一致

### ADR-006：Provider 故障隔離
- **Decision**：每個 Agent 維護一個 Provider 健康分數，異常時自動剔除
- **Drivers**：
  - ai-backend 的 `check_health()` 已存在但未被利用
  - Cloudflare Workers AI 偶發超時（CF 節點問題）
  - Ollama 本地部署可能因資源不足而崩潰
- **Alternatives**：
  - 不做隔離：某個 Provider 掛了影響所有功能
  - 定期輪詢：增加不必要的網路開銷
  - **選擇：被動健康檢測** — 失敗 N 次後標記為異常，間隔恢復
- **Why chosen**：無額外開銷，在正常調用中自然累積健康數據
- **Consequences**：首次調用異常的 Provider 仍會失敗一次（無法預防首失誤）

---

## 10. 驗收標準與測試策略

### 10.1 測試金字塔

```
          ╱  E2E 測試（完整工作流）  ╲       ← 少量但關鍵
         ╱   整合測試（Agent 間協作）   ╲     ← 中量
        ╱    單元測試（Service/Agent）     ╲   ← 大量
       ╱     Prompt 測試（LLM 響應品質）    ╲  ← 特殊
      ╱       性能測試（成本/延遲）          ╲ ← 關鍵指標
```

### 10.2 關鍵指標 (KPIs)

| 指標 | 目標 | 測量方式 |
|------|------|---------|
| 行動完成率 | > 60% | 用戶回報完成數 / 生成數 |
| Agent 響應品質 | 滿意度 > 4/5 | 用戶評分 + 自動評估 |
| 學習路徑準確度 | > 70% 推薦被採用 | 用戶接受/跳過率 |
| 系統延遲 (p95) | < 2s | APM 監控 |
| LLM 成本控制 | 每月不超預算 | 成本監控 Dashboard |
| 連續使用天數 | > 7 天 | 使用者留存率 |

### 10.3 第一階段驗收清單
- [x] 從 daodao-ai-backend 分析多 Provider 架構（已完成）
- [ ] 用戶重新訪問時，action-maker 能引用之前的行動記錄
- [ ] 用戶回報完成後，後續建議有所調整
- [ ] Memory CRUD API 正常運作，延遲 < 200ms
- [ ] Workflow Engine 能執行簡單的串行 Agent 任務
- [ ] 單元測試覆蓋率 > 80%

---

## 10.4 成本預估與月費模型

### 各 Provider 費率參考（基於 ai-backend model_sync_service 同步的 llm_models 資料）

| Provider | Model | Input / 1M tokens | Output / 1M tokens | 定位 |
|----------|-------|--------------------|---------------------|------|
| Groq | Llama 3.3 70B | ~$0.08 | ~$0.08 | 快速推理 |
| Groq | Llama 3.3 8B | ~$0.008 | ~$0.008 | 高速低成本 |
| OpenAI | GPT-4o | $2.50 | $10.00 | 通用高品質 |
| OpenAI | GPT-4o-mini | $0.15 | $0.60 | 經濟型 |
| OpenAI | GPT-4o | $1.25 (cached) | $5.00 (cached) | 快取優惠 |
| Anthropic | Claude Sonnet 4 | $3.00 | $15.00 | 深度推理 |
| Anthropic | Claude Haiku 4 | $0.08 | $0.40 | 快速經濟 |
| Google | Gemini 2.5 Pro | $1.25 | $5.00 | 多用途 |
| Google | Gemini 2.5 Flash | $0.10 | $0.40 | 輕量快速 |
| Cloudflare | Llama 3.3 70B | ~$0.90 | ~$0.90 | Workers AI |
| NVIDIA | Llama 3.3 70B | ~$0.90 | ~$0.90 | NIM |
| Ollama (本地) | Qwen 2.5 14B | $0.00 | $0.00 | 免費 |

### 月度成本估算（以 1,000 活躍用戶為例）

| 使用場景 | 日均請求數 | 月請求量 | 路由策略 | 估算月成本 |
|----------|-----------|---------|---------|-----------|
| **紀念模式**（最省） | 全部走 Groq/Ollama | 30K | batch_cheap | **$5-15** |
| **均衡模式**（預設） | 70% 便宜 + 30% 品質 | 50K | Task-based | **$50-150** |
| **高品質模式** | 50% 品质 + 50% 推理 | 80K | high_quality | **$200-600** |
| **重度用戶**（每人每天 5 次） | 混合路由 + 快取 | 150K | adaptive + cache | **$300-800** |

### 成本控制策略

```
┌──────────────────────────────────────────────────┐
│              成本控制三層防線                       │
│                                                   │
│  Layer 1: TaskRouter（預防）                        │
│  ├── 簡單任務 → 自動選便宜 Provider                │
│  └── 複雜任務 → 才用高品質 Provider                │
│                                                   │
│  Layer 2: CostGuard（監控）                        │
│  ├── 每 workflow 累積成本追蹤                      │
│  ├── 超過預設門檻 → 自動降級                       │
│  └── 日/週/月報警（Slack/Webhook）                │
│                                                   │
│  Layer 3: Prompt Cache（優化）                     │
│  ├── 相同 prompt + context → 快取結果             │
│  ├── CF Workers AI 原生支援 prompt caching        │
│  └── 估算可節省 30-60% 的 token 費用              │
└──────────────────────────────────────────────────┘
```

### 月費模型建議

| 方案 | 月費 | 包含 | 適合對象 |
|------|------|------|---------|
| **免費版** | $0 | 每日 3 次行動生成，Groq/Ollama 路由 | 試用用戶 |
| **學習版** | ~$5/月 | 無限生成，Task-based 路由，記憶系統 | 個人學習者 |
| **進階版** | ~$20/月 | 無限 + 多 Agent 工作流，優先使用高品質 Provider | 重度學習者 |
| **團隊版** | ~$50/人/月 | 團隊管理 + 組織能力矩陣 + 數據報告 | 企業/教育機構 |

> 💡 關鍵洞察：ai-backend 的 AIQueryLog 已記錄所有調用的 cost_usd，只要加上 用戶ID 過濾，即可即時計算每個用戶的月度用量，免費方案用戶超額時自動降級到免費 Provider，實現 **零人工干涉的精準成本控制**。

---

## 11. 未來展望（6-12 個月）

1. **Agent 社交**：用戶可以分享自己的 Agent 配置與學習路徑
2. **競技/合作學習**：多個用戶的 Agent 可以協作完成挑戰
3. **多模態學習**：支援圖片、語音、影片的學習內容處理
4. **AI Mentor**：不只是建議，而是能追問、引導、激發思考的對話式學習夥伴
5. **企業版**：團隊學習管理、組織能力矩陣、培訓 ROI 分析
6. **Provider 市場**：用戶可訂閱第三方開發的 Agent + Provider 組合

---

> **下一步行動**：規劃完成！推薦立即啟動 **Phase 0**：修復 ai-backend 的依賴注入問題 + 實作 Fallback Chain。這是所有後續功能的基礎，預計 1 週可完成。Phase 1 的 Memory System MVP 可同步進行，互不依賴。