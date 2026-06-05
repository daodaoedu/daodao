## Why

daodao 的 AI 功能與業務邏輯目前由工程師硬編碼，無法讓營運團隊自行調整策略或快速實驗。
建立通用 Workflow 引擎，讓 admin 能以視覺化方式設計、觸發、測試任意 AI 與業務邏輯流程，並透過 Claude Skills 系統封裝可重用的領域知識，為未來自主 AI agent 預留完整架構空間。

## What Changes

- **新增** Workflow 設計介面：admin 建立由 Node 和 Edge 組成的有向流程圖，支援線性與條件分支
- **新增** Node 類型八種：`llm-call`（呼叫 LLM）、`data-fetch`（抓取 daodao 資料）、`data-transform`（過濾/轉換）、`tool-call`（呼叫外部 API）、`skill-call`（執行 versioned Skill bundle，含 SKILL.md + scripts + references + assets + templates）、`condition`（條件分支）、`approval-gate`（人工流程關卡）、`output`（寫回 DB / 發通知）
- **新增** Trigger 系統：`manual`（手動）、`scheduled`（cron）、`webhook`（外部 HTTP）、`event`（daodao 內部事件）
- **新增** 多 Provider 模型切換：`llm-call` / `skill-call` 可選擇任意 daodao-ai-backend 支援的 AI provider
- **新增** 節點間資料引用：prompt 可用 `{{nodes.<id>.output}}` 引用任意前驅節點輸出
- **新增** A/B 測試：對兩個 Workflow dry-run 並排對比輸出
- **新增** 對話式 Workflow 生成：admin 可用自然語言描述自動化需求，由 AI 產生 Workflow draft（trigger、data-fetch 欄位、llm-call / skill-call 設定、output mapping），admin 預覽確認後才寫入正式 Workflow
- **新增** 場景分類與學習旅程規劃：將應用場景區分為「營運自動化」、「個人學習旅程體驗」、「學習生態圈」，並補充階段式 / 漏斗式 Journey Workflow 規劃
- **新增** 產品規劃口徑：Workflow 負責觸發、資料、節點順序、關卡與最後行動；Skill 負責可重用領域能力、語氣、範例、templates、references 與 scripts
- **新增** 最後行動目錄：email、站內通知、push、DB 寫回、草稿、badge、任務 / 實踐、推薦卡、外部 API、dry-run，並依風險決定是否加 `approval-gate`
- **新增** Skill 管理：admin 可透過 UI 編輯器或 Agent 對話兩種方式建立與管理符合 Claude Agent Skills 模型的 versioned skill bundle（必備 SKILL.md，選配 scripts/、references/、assets/、templates/）
- **新增** `skill-call` Node：掛載指定 Skill version 後，ai-backend 將 Skill materialize 成標準資料夾並在 sandbox runtime 中以三層漸進揭露執行，LLM 可按需讀取 references/templates 或呼叫 scripts 工具
- **新增** 執行紀錄：每次 run 保存每個 Node 的輸入/輸出，可追蹤每步執行狀態
- **新增** Observability（Phase 1）：每個 node run 記錄 token_count、latency_ms、cost_usd；run 層級彙總 total_cost_usd / total_latency_ms；整合 Langfuse LLM trace + PostHog product analytics
- **新增** Observability（Phase 2）：daodao-server / daodao-ai-backend 加入 OpenTelemetry SDK，匯出 infra metrics（API latency P95、error rate、active runs、node latency by type）到 Grafana dashboard
- **新增** Eval 標記系統（Phase 1）：run 完成後 admin 可標記「好/壞」並附備註，累積評估資料集
- **新增** Eval 進階（Phase 2）：admin 標記同步到 Langfuse score annotation；LLM-as-judge 自動評分（auto_score）；skill-call trajectory 記錄與評估
- **新增** 流程關卡：`condition` 支援自動判斷分支；`approval-gate` 支援在任意節點後暫停等待 admin 核准 / 拒絕 / 調整後繼續；`output` node 仍可設定 `require_approval: true` 作為不可逆操作的最後防線
- **新增** Budget / Iteration 限制：`skill-call` node 加 `max_iterations`（預設 10），workflow 層級加 `max_cost_usd`；超出時 run 標記 `failed` 並記錄原因
- **新增** Output Guards（Phase 1）：`llm-call` node 可設 `output_schema`（JSON Schema），LLM 輸出不符合格式時自動拒絕並將 node_run 標記 `failed`
- **新增** Dead Loop Detection + Circuit Breaker（Phase 1）：`skill-call` 偵測連續相同 tool hash（連續 3 步）視為死迴圈自動中止；同一 node 30 分鐘內連續失敗 3 次觸發 Circuit Breaker 冷卻 10 分鐘，run 標記 `circuit_open`
- **新增** Context Compression（Phase 1）：`skill-call` ReAct loop 累積 context 超過 `context_compress_threshold`（預設 8000 tokens）時，自動以 LLM 摘要壓縮舊步驟歷史，保留最新 3 步繼續執行
- **新增** Checkpoint-Resume（Phase 2）：long-running workflow 每個 node 完成後自動存入 checkpoint；failed run 可從斷點繼續執行，跳過已完成 node 節省重試成本
- **新增** Tool Registry 動態過濾（Phase 2）：`skill-call` 可設 `tool_tags` 只載入相關工具，避免超過 20 個工具導致 LLM 選擇錯誤
- **新增** Memory Extractor（Phase 2）：run 完成後自動以 LLM 分析 trajectory 提取 episodic/semantic 記憶，存入 `workflow_skill_memories`；下次同 Skill 執行時注入歷史記憶改善輸出品質

## Capabilities

### New Capabilities

- `ai-workflow-builder`: Workflow CRUD + Node / Edge / Trigger 管理介面，Phase 1 支援線性流程，資料模型支援 DAG，新增 `skill-call` node 類型
- `ai-workflow-nlp-generator`: 對話式 Workflow 生成器，將 admin 的自然語言需求轉成可審核的 Workflow draft；可判斷使用一次性 `llm-call` 或既有 versioned `skill-call`，確認後建立 Workflow / Node / Edge / Trigger
- `ai-data-source-config`: 設定 `data-fetch` 節點可存取的 daodao 資料欄位白名單
- `ai-workflow-ab-test`: 對比執行兩個 Workflow 的 A/B dry-run，並排顯示每個節點的輸出差異
- `workflow-skill-manager`: Skill CRUD 介面，支援 UI 直接編輯（SKILL.md + 檔案上傳）與 Agent 對話兩種操作模式

### Modified Capabilities

（無，現有 `env-config` spec 不受影響）

## Impact

- **daodao-admin-ui**：新增 Workflow 管理頁面（列表、Node/Edge Builder、Trigger 設定、對話式建立、A/B 測試）、Skill 管理頁面（UI 編輯器 + Agent 對話面板）
- **daodao-server**：新增 `/api/admin/workflows` REST API（CRUD、Node/Edge/Trigger 管理、執行觸發）、`/api/admin/workflow-generator` API（對話式 Workflow draft 生成 / 套用）、`/api/admin/workflow-skills` API（Skill CRUD + 檔案管理 + Agent 對話）
- **daodao-ai-backend**：新增 `llm-call` / `skill-call` 節點執行 endpoint、Skill bundle materialization + sandbox runtime、`/internal/providers` endpoint、`/internal/workflow-generator/chat` endpoint
- **daodao-storage**：新增 `workflows`、`workflow_nodes`、`workflow_edges`、`workflow_triggers`、`workflow_runs`、`workflow_node_runs`、`workflow_ab_tests`、`workflow_data_source_config`、`workflow_skills`、`workflow_skill_versions`、`workflow_skill_files`、`workflow_skill_conversations`、`workflow_generator_conversations`、`workflow_generator_messages`、`workflow_generator_drafts`、`workflow_approval_requests`、`workflow_run_evals`、`workflow_skill_memories` tables（共 18 張）
- **daodao-worker**：Phase 1 暫不影響；`scheduled` / `event` trigger 未來可由 Worker 分發
