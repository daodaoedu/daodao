## ADDED Requirements

### Requirement: DB 一律唯讀（prod 與 dev）

系統對生產與開發資料庫 SHALL 皆只允許 SELECT，MUST NOT 對任一環境執行寫入操作。資料寫入 MUST 一律透過 daodao-server REST API（admin token + Approval Flow）。

#### Scenario: 拒絕 prod 寫入
- **WHEN** 任務試圖對 prod DB 執行 INSERT / UPDATE / DELETE
- **THEN** 系統 MUST 拒絕並回報該操作不被允許

#### Scenario: 拒絕 dev 寫入
- **WHEN** 任務試圖對 dev DB 執行 INSERT / UPDATE / DELETE
- **THEN** 系統 MUST 同樣拒絕，並提示寫入應透過 daodao-server API 進行

### Requirement: 預覽先行

批次操作（寄信、通知）執行前 MUST 先輸出樣本供用戶確認。

#### Scenario: 批次前輸出樣本
- **WHEN** Agent 準備批次寄信
- **THEN** 系統 MUST 先輸出樣本內容並等待確認，不得直接發送

### Requirement: 批次上限

單次發信 SHALL NOT 超過 500 封；超過時 MUST 要求二次確認。

#### Scenario: 超過上限二次確認
- **WHEN** 一次批次發信對象超過 500 封
- **THEN** 系統 MUST 要求額外的二次確認後才繼續

### Requirement: PII 保護

email、phone 等個資 MUST NOT 寫入 Notion 或其他外部服務。

#### Scenario: 報告不含個資
- **WHEN** Agent 將報告或數據寫入 Notion
- **THEN** 輸出 MUST NOT 包含 email 或 phone，最多顯示 display_name 與 user_id

### Requirement: Dry-run 預設

所有 Skill SHALL 預設 `dry_run=true`，MUST 在用戶明確切換為 `dry_run=false` 後才實際執行寫入或發送。

#### Scenario: 預設不實際執行
- **WHEN** Skill 在未指定 dry_run 的情況下被觸發
- **THEN** 系統 SHALL 以 dry_run 模式執行，僅預覽不實際寫入或發送

### Requirement: 第三方憑證由開發者供裝

Tools / connectors 所需的第三方 API token SHALL 由開發人員預先供裝，解析優先序 MUST 為 config 檔 > DB 設定 > 環境變數。系統 MUST NOT 接受用戶在對話中提供的 token 來接入未經供裝的外部應用。第三方 connector 的可用範圍 SHALL 依角色與組織綁定管理。

#### Scenario: 拒絕用戶自帶 token
- **WHEN** 用戶在對話中貼上自己的 Notion token 要求 Agent 接入其工作區
- **THEN** 系統 MUST 拒絕使用該 token，並說明外部整合須由開發者供裝

#### Scenario: 依角色限定 connector
- **WHEN** 一位不具對應角色的用戶嘗試使用某組織綁定的 connector
- **THEN** 系統 MUST 拒絕該工具呼叫並回報權限不足

### Requirement: 全程 Trace / Audit

系統 MUST 將每個 Turn 的 LLM 呼叫、tool_call（工具名、參數摘要、結果摘要）、approval 決策（模式、allow/deny、操作者）與 Skill 觸發寫入 audit log（`agent_audit_log`），並支援依 thread、user、時間區間查詢。audit 記錄 MUST NOT 包含 email / phone 等 PII 明文。

#### Scenario: 工具呼叫留下稽核記錄
- **WHEN** Agent 於某 Turn 執行一次 tool_call
- **THEN** 系統 MUST 寫入含 thread ID、user、工具名、參數摘要與時間戳的 audit 記錄

#### Scenario: 稽核查詢
- **WHEN** 管理者要求調閱某用戶某段時間的 Agent 操作
- **THEN** 系統 SHALL 能依 user 與時間區間回傳完整操作軌跡

### Requirement: Dynamic Skill 禁用寫入型工具

Dynamic Skill MUST NOT 呼叫寫入型或系統型工具（bash、write_file、cron_create、email/bulk、notifications）。此限制 MUST 由工具層白名單在呼叫前強制阻擋，而非依賴 Skill 定義的自律。

#### Scenario: 工具層攔截 Dynamic Skill 的寫入嘗試
- **WHEN** Dynamic Skill 在執行中嘗試呼叫 email/bulk
- **THEN** 工具層 MUST 攔截並回傳錯誤，不進入實際發送流程
