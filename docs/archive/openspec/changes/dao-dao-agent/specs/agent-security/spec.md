## ADDED Requirements

### Requirement: prod DB 唯讀

系統對生產資料庫 SHALL 只允許 SELECT，MUST NOT 執行任何寫入操作。

#### Scenario: 拒絕 prod 寫入
- **WHEN** 任務試圖對 prod DB 執行 INSERT / UPDATE / DELETE
- **THEN** 系統 MUST 拒絕並回報該操作不被允許

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

### Requirement: Dynamic Skill 禁用寫入型工具

Dynamic Skill MUST NOT 呼叫寫入型或系統型工具（bash、write_file、cron_create、email/bulk、notifications）。此限制 MUST 由工具層白名單在呼叫前強制阻擋，而非依賴 Skill 定義的自律。

#### Scenario: 工具層攔截 Dynamic Skill 的寫入嘗試
- **WHEN** Dynamic Skill 在執行中嘗試呼叫 email/bulk
- **THEN** 工具層 MUST 攔截並回傳錯誤，不進入實際發送流程
