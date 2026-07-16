## ADDED Requirements

### Requirement: playground chat 接受對話歷史
`POST /api/v1/admin/playground/chat` SHALL 接受選填欄位 `history`：一個由 `{ role, content }` 組成的陣列，`role` 限 `user` 或 `assistant`，依時間先後排序。未提供 `history` 時，行為 SHALL 與現行單次對話完全相同。

#### Scenario: 帶歷史的多輪呼叫
- **WHEN** admin 呼叫 chat 並傳入 `history`（含先前多輪 user/assistant 訊息）與最新 `message`
- **THEN** 系統 SHALL 將 system prompt、攤平後的歷史紀錄、最新訊息組成單一 prompt 呼叫 LLM，回應反映先前對話脈絡

#### Scenario: 不帶歷史的舊呼叫（向後相容）
- **WHEN** admin 呼叫 chat 且未提供 `history`
- **THEN** 系統 SHALL 以現行邏輯（system prompt + `---` + message）組 prompt，回應格式不變

#### Scenario: 歷史超過上限被拒
- **WHEN** `history` 超過 60 則，或任一 `content`（含 `message`）超過 8,000 字元
- **THEN** 系統 SHALL 回傳 `422 Unprocessable Entity`（Pydantic 驗證錯誤），不呼叫 LLM

### Requirement: 歷史內容的 guardrail 清洗
系統 SHALL 對最新 `message` 與 `history` 中所有 `role="user"` 的 `content` 套用 `GuardrailLayer.sanitize_user_input`；`role="assistant"` 的內容 SHALL NOT 被清洗。

#### Scenario: 歷史中的 user 訊息違規
- **WHEN** `history` 內任一 user 訊息觸發 `GuardrailViolationError`
- **THEN** 系統 SHALL 回傳錯誤（依 `api_response_decorator` 既有慣例：HTTP 200 ＋
  `success: false` envelope，`error.details.status_code = 400`）並附違規說明，不呼叫 LLM

### Requirement: 多輪呼叫的記錄與配額
每一輪多輪對話呼叫 SHALL 與現行單次呼叫相同：經 `LoggingLLMClient` 寫入 `ai_query_logs`（context=`playground`、user_id=admin id），並於呼叫前檢查 token 配額。

#### Scenario: 配額用盡
- **WHEN** admin 當月（或當日）token 用量已達 `user_token_quotas` 上限
- **THEN** 系統 SHALL 回傳配額錯誤（同上述 envelope 慣例，`status_code = 429`）
  並附中文配額訊息，與現行行為一致

### Requirement: admin-ui 對話串介面
PlaygroundPage 的 chat 功能 SHALL 提供對話模式：以訊息串（thread）顯示雙方往來，每次送出時 SHALL 將完整歷史（不含 system prompt）與新訊息一併送至 API，並提供「清除對話」重新開始。模型、system prompt、生成參數選擇 SHALL 沿用既有元件；對話進行中 SHALL 鎖定 system prompt 切換（避免中途換人格）。

#### Scenario: 進行多輪對話
- **WHEN** admin 選定模型與 `life_design_coach` prompt 後連續送出多則訊息
- **THEN** UI SHALL 依序顯示訊息串，且每輪回應延續先前脈絡；每輪的 token/cost/latency SHALL 顯示於該則回應

#### Scenario: 清除對話
- **WHEN** admin 點擊「清除對話」
- **THEN** UI SHALL 清空訊息串並解鎖 system prompt 選擇；下一次送出不帶任何 `history`

#### Scenario: 頁面重新整理
- **WHEN** admin 重新整理頁面
- **THEN** UI SHALL 從 sessionStorage 還原進行中的對話串（比照頁面既有結果快取模式）

### Requirement: stage_summary 摺疊顯示
UI SHALL 將回應中的 `<stage_summary stage="...">...</stage_summary>` 區塊從正文抽出，以可展開的摺疊元件顯示（預設收合，標示 stage 名稱）；抽出後的正文 SHALL 不含該標籤。送回 API 的 `history` 中 assistant `content` SHALL 保留原文（含標籤），確保教練記得已完成的階段。

#### Scenario: 回應含 stage summary
- **WHEN** LLM 回應包含一個 `<stage_summary stage="you_are_here">…</stage_summary>` 區塊
- **THEN** 訊息卡片 SHALL 顯示乾淨正文＋一個「階段小結（you_are_here）」摺疊區；展開可見小結內容

#### Scenario: 回應不含 stage summary
- **WHEN** LLM 回應無該標籤
- **THEN** 訊息卡片 SHALL 正常顯示全文，無摺疊區
