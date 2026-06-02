## ADDED Requirements

### Requirement: Admin 可透過對話建立 Workflow draft
系統 SHALL 允許 admin 用自然語言描述自動化需求，並由 AI 產生可審核的 Workflow draft。Draft 至少包含 workflow 名稱、描述、trigger、nodes、edges、警告與需要 admin 補充的問題。

#### Scenario: 從自然語言產生寄信 Workflow draft
- **WHEN** admin 輸入「只要用戶完成實踐，就寄信給他，信裡內容根據我選定的資料由 LLM 生成」
- **THEN** 系統產生一個 draft，包含 `event` trigger（`practice.completed`）、`data-fetch` Node、`llm-call` 或 `skill-call` Node、`output` Node，以及對應 edges
- **AND** `output` Node 預設 `require_approval: true`
- **AND** draft 標示 `event` trigger 為 Phase 2 預留；Phase 1 可改用 `manual` trigger 測試

#### Scenario: 依需求判斷使用 llm-call 或 skill-call
- **WHEN** admin 的需求只是一次性生成或判斷
- **THEN** generator SHALL 優先產生 `llm-call` Node
- **WHEN** admin 明確要求使用既有 Skill，或需求符合可重用領域能力（穩定語氣、範例、templates、references、scripts）
- **THEN** generator SHALL 產生 `skill-call` Node，並要求指定 `skill_id` 與 `skill_version`

#### Scenario: 需求資訊不足時追問
- **WHEN** admin 描述「寄信給他」但未說明觸發時機或收件對象
- **THEN** 系統不產生不完整 draft，改回傳需要補充的問題，例如「何時寄送？」、「收件人欄位是哪個？」

#### Scenario: 需求適合 Skill 但沒有既有 Skill
- **WHEN** admin 描述一套會重複使用的領域規則，但系統找不到合適 Skill
- **THEN** generator SHALL 回傳 warning 或 question，建議先建立 Skill
- **AND** 不得把大量可重用領域規則硬塞進單一 workflow prompt 作為長期方案

#### Scenario: Draft 不直接啟用
- **WHEN** 系統產生 Workflow draft
- **THEN** draft 不會自動寫入正式 Workflow 或啟用 trigger
- **AND** admin 必須預覽並確認後才可套用

---

### Requirement: Generator 僅可使用已允許的資料欄位
系統 SHALL 在產生 `data-fetch` Node 時，只使用 `workflow_data_source_config.allowed_fields` 中已啟用的欄位。

#### Scenario: 使用已啟用欄位
- **WHEN** admin 選定或需求中提到 `user.name`、`user.email`、`user.learning_goals`
- **AND** 這些欄位已在資料來源設定中啟用
- **THEN** draft 的 `data-fetch` Node config 可包含這些欄位

#### Scenario: 需求提到未啟用欄位
- **WHEN** admin 要求使用尚未啟用的欄位，例如 `practice.reflection`
- **THEN** draft 不得直接加入該欄位
- **AND** response SHALL 在 `missing_fields` 或 `warnings` 中提示 admin 先到資料來源設定啟用該欄位

---

### Requirement: Generator 產生可驗證的 Node config
系統 SHALL 要求 AI 回傳符合既有 node config schema 的結構化 draft，並由 daodao-server 在套用前執行 Zod 驗證與 workflow 靜態分析。

#### Scenario: 產生 llm-call 節點
- **WHEN** draft 包含 `llm-call` Node
- **THEN** Node config SHALL 包含 provider、system_prompt、prompt_template
- **AND** 若輸出會被後續 output Node 使用，SHALL 建議 `output_schema`，例如 `{ subject, body }`

#### Scenario: 產生 skill-call 節點
- **WHEN** draft 包含 `skill-call` Node
- **THEN** Node config SHALL 包含 `skill_id`、`skill_version`、provider、input_template
- **AND** `skill_version` SHALL 指向已通過 validation 與 safety review 的版本，除非 draft 明確標示為測試用途

#### Scenario: 產生 output 節點
- **WHEN** draft 包含 email / notification / db 類型的 `output` Node
- **THEN** Node config SHALL 包含 target、mapping
- **AND** 預設 `require_approval: true`

#### Scenario: 套用前驗證失敗
- **WHEN** admin 嘗試套用 draft，但 nodes / edges / template references 無法通過驗證
- **THEN** 系統拒絕套用並顯示具體錯誤，不建立 Workflow

---

### Requirement: Admin 可預覽、修改並套用 Workflow draft
系統 SHALL 在 UI 中顯示 AI 產生的 Workflow draft，讓 admin 預覽 trigger、nodes、edges、欄位引用、prompt、output mapping 與 warnings，並可在套用前修改。

#### Scenario: 預覽 Workflow draft
- **WHEN** AI 產生 draft
- **THEN** UI 顯示節點列表、連線順序、trigger、資料欄位、LLM prompt 或 Skill 名稱與版本、output mapping 與風險提示

#### Scenario: 套用 draft
- **WHEN** admin 點擊「套用成 Workflow」
- **THEN** daodao-server 建立 workflow、nodes、edges、triggers
- **AND** 成功後導向 Workflow 編輯頁

#### Scenario: Phase 1 將 event trigger 改為 manual 測試
- **WHEN** draft 包含 `event` trigger 但 Phase 1 尚未支援實際 event 執行
- **THEN** UI SHALL 提供「改成 manual trigger 供測試」選項
- **AND** 套用後建立 `manual` trigger，但保留原始 event 意圖於 workflow description 或 draft metadata

---

### Requirement: Generator 對話紀錄可延續
系統 SHALL 支援同一個 Workflow draft 的多輪對話，admin 可要求 AI 調整 trigger、資料欄位、prompt、provider、output mapping 或 approval 設定。

#### Scenario: 連續修改 draft
- **WHEN** admin 在 draft 產生後輸入「信件語氣再溫暖一點，並加入下一步建議」
- **THEN** 系統更新 draft 中對應的 `llm-call.prompt_template` 或 Skill 設定
- **AND** 保留原本的 trigger、data-fetch 與 output mapping，除非 admin 明確要求修改

#### Scenario: 切換為既有 Skill
- **WHEN** admin 表示「用我之前建立的鼓勵信 Skill」
- **THEN** 系統可將 `llm-call` Node 改為 `skill-call` Node
- **AND** Node config SHALL 引用指定 Skill 與固定 version，並保留 input_template 的資料引用

---

### Requirement: 系統保存 Generator 對話與 Draft 版本
系統 SHALL 將對話式 Workflow 建立過程保存到資料庫，包含 conversation、messages、每一版 WorkflowDraft，以及套用後對應的正式 Workflow。

#### Scenario: 建立對話紀錄
- **WHEN** admin 開始用對話建立 Workflow
- **THEN** 系統建立 `workflow_generator_conversations` 記錄
- **AND** admin 與 assistant 的每則訊息寫入 `workflow_generator_messages`

#### Scenario: 保存 Draft 版本
- **WHEN** AI 產生或修改 WorkflowDraft
- **THEN** 系統將完整 draft JSON 寫入 `workflow_generator_drafts`
- **AND** version 依同一 conversation 遞增
- **AND** warnings、missing_fields、validation_errors 一併保存

#### Scenario: 套用後關聯正式 Workflow
- **WHEN** admin 將某版 draft 套用成正式 Workflow
- **THEN** 系統建立 `workflows`、`workflow_nodes`、`workflow_edges`、`workflow_triggers`
- **AND** 將 `workflow_generator_drafts.applied_workflow_id` 指向建立出的 workflow
- **AND** 原始 draft 不被覆寫，保留為生成歷史
