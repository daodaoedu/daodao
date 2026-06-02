## Why

`daodao-ai-backend` 目前只有針對特定場景寫死的 AI 流程（每日洞察、推薦），缺乏一個能用自然語言對話、即時組合島島資料與服務來完成任意業務需求的通用代理。營運與產品團隊許多重複性工作（寄慶賀信、整理月報、臨時撈數據）仍需工程師手動處理。Dao Dao Agent 將這些能力收斂成一個對話式入口，並透過 Skill 機制把重複流程沉澱為可一句話觸發、可升格為排程的資產。

## What Changes

- 新增 **Dao Dao Agent Harness**：任務循環引擎（QueryEngine）、脈絡注入（Context）、會話狀態（AppState）、審批流程（Approval Flow）、Context 耐久性管理、Model Drift 偵測六大核心職責。
- 新增 **對話三基本單位**：Thread（持久化對話容器，支援 create / resume / fork / archive）、Turn（一次完整工作週期，可在中途因 Approval 暫停）、Item（user_message / agent_message / tool_call / approval_request / result，各有 `started → delta → completed` 生命週期）。
- 新增 **Skill 系統**：Static Skills（檔案系統 `SKILL.md`，版本控制）+ Dynamic Skills（PostgreSQL `agent_skills` 表，runtime 產生，`draft → active → archived`）+ Memory/KV Store（動態行為參數），啟動時合併兩來源 metadata，漸進式載入完整內容。
- 新增 **Skill：practice-completion-email**：查詢完成實踐的用戶 → LLM 生成個人化慶賀信 → 預覽 → 批次發送 → 回報，預設 `dry_run=true`，建議排程每日 09:00。
- 新增 **Skill：monthly-insights**：查詢指定月份活躍與互動指標 → LLM 撰寫洞察 → 輸出 Markdown / 寫入 Notion，建議排程每月 1 日。
- 新增 **工具清單與能力邊界**：資料查詢層（MCP pg、admin REST API）、通訊整合層（Email、Notification、Notion）、通用工具層（stealth_fetch、web_search、python_repl、檔案讀寫、bash、cron），工具定義能力邊界，具體做什麼由對話決定。
- 新增 **多 provider 模型層**：透過現有 `LLMClient` 驅動，以開源模型為主（OpenRouter / Groq / Cloudflare / Gemini / Ollama），對話中可任意切換，預設 `openrouter` + `deepseek/deepseek-v4-flash`。
- 新增 **安全規範**：prod DB 唯讀、預覽先行、批次上限 500 封、PII 保護、Dry-run 預設。

## Capabilities

### New Capabilities

- `agent-harness`: Agent 核心基礎設施——QueryEngine 任務循環、Context 注入、AppState 會話狀態、Context 耐久性、Model Drift 偵測。
- `agent-conversation`: Thread / Turn / Item 三基本單位的建模、生命週期與持久化（resume / fork / archive、streaming delta）。
- `agent-approval`: 批次寫入操作的 Approval Flow——server → client 反向請求、Turn 暫停與 allow/deny 續行。
- `agent-skills`: Skill 系統——Static / Dynamic 雙來源、Memory 層、漸進式載入、升格流程、生命週期。
- `agent-tools`: 工具層能力邊界——資料查詢、通訊整合、通用工具的封裝與可用清單。
- `agent-model-routing`: 多 provider 模型路由——LLMClient 後端切換、預設模型、對話中指令切換。
- `agent-security`: 安全規範——prod 唯讀、預覽先行、批次上限、PII 保護、dry-run 預設。
- `skill-practice-completion-email`: 完成實踐慶賀信 Skill 的查詢、LLM 生成、預覽、批次發送、去重與回報需求。
- `skill-monthly-insights`: 月度洞察 Skill 的指標查詢、留存計算、LLM 撰寫、報告組裝與輸出需求。

### Modified Capabilities

<!-- 無既有 spec 的需求層級異動；本 change 為全新能力。 -->

## Impact

- **daodao-ai-backend**：新增 `src/services/agent/`（engine / state / context / approval / agent / skills / tools）與 `src/routers/agent.py` 對話 API 端點。`config.py` 需將 `openrouter.model` 更新為 `deepseek/deepseek-v4-flash` 並確認各 provider API key。
- **daodao-storage**：新增 `agent_threads`、`agent_skills`、`agent_memory` 等資料表與對應 SQL migration（`migrate/sql/`）。
- **daodao-server**：沿用既有 `POST /api/email/send`、`/api/email/bulk`、`/api/notifications`、`/api/admin/statistics/*`、`/api/admin/users`，Agent 以 admin token 呼叫；無新增 server 路由。
- **外部整合**：MCP pg（dev / prod 唯讀）、Notion MCP；皆為現有連線。
- **Non-goals**：
  - 不實作前端對話 UI（本 change 聚焦後端 Agent 與 API 契約）。
  - 不修改既有 daodao-server REST 介面，僅呼叫。
  - 不將使用者 DNA / persona 注入 RAG（屬 `add-learner-persona` 範疇）。
  - 不在本 change 內建立實際 cron 排程，僅定義 Skill 的「建議排程」與升格路徑。
- **無 breaking changes**：所有能力為新增，不改動既有介面。
