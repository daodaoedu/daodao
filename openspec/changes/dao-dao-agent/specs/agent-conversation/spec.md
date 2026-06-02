## ADDED Requirements

### Requirement: Thread 持久化對話容器

系統 SHALL 以 Thread 作為持久化對話容器，支援 create / resume / fork / archive 操作，並跨 session 保留狀態，使用戶重開瀏覽器或切換裝置可無縫繼續。

#### Scenario: 跨 session 續行
- **WHEN** 用戶關閉瀏覽器後重新開啟並 resume 既有 Thread
- **THEN** 系統 MUST 還原該 Thread 的對話歷史與會話狀態，讓用戶無縫繼續

#### Scenario: Fork 對話
- **WHEN** 用戶從既有 Thread 的某一點 fork
- **THEN** 系統 SHALL 建立新 Thread 並複製分岔點之前的歷史，原 Thread 不受影響

#### Scenario: Archive 對話
- **WHEN** 用戶 archive 一個 Thread
- **THEN** 該 Thread MUST 不再出現於活躍清單，但其內容仍可被查詢還原

### Requirement: Thread 權限控制

Thread 的讀取、resume、fork、archive 操作 SHALL 限定於 owner（`Thread.user_id`）或 admin 角色。寫入型工具（發信、批次通知等）MUST 額外要求 admin role，owner 若無 admin 角色不得執行。Fork 出的新 Thread `user_id` MUST 為執行 fork 的操作者，權限依操作者角色重新判定，不繼承原 Thread 的授權。

#### Scenario: 非 owner 非 admin 無法 resume
- **WHEN** 一位非 owner 且非 admin 的用戶嘗試 resume 他人 Thread
- **THEN** 系統 MUST 拒絕並回傳 403

#### Scenario: Owner 無 admin 角色不得執行寫入型工具
- **WHEN** Thread owner 不具 admin role，且 Turn 中觸發批次發信
- **THEN** 系統 MUST 拒絕執行並回報權限不足

#### Scenario: Fork 後權限依操作者角色判定
- **WHEN** 用戶 fork 一個高權 Thread
- **THEN** 新 Thread 的 user_id MUST 為該用戶，其可執行的工具範圍依其自身角色判定

### Requirement: Turn 工作週期

系統 SHALL 以 Turn 表示一次完整工作週期（從用戶輸入到所有工作完成）。當 Turn 中觸發 Approval Flow 時，Turn MUST 暫停並於確認後續行。

#### Scenario: Turn 完整週期
- **WHEN** 用戶送出輸入並觸發一連串工具呼叫
- **THEN** 系統 SHALL 在同一 Turn 內完成所有工具呼叫並產出最終 result item

#### Scenario: Approval 暫停與續行
- **WHEN** Turn 進行中觸發批次寫入操作
- **THEN** 該 Turn MUST 暫停於 approval_request，待用戶回應後再續行至完成

### Requirement: Item 生命週期

系統 SHALL 以 Item 建模 Turn 內的事件，至少支援類型：`user_message`、`agent_message`、`tool_call`、`approval_request`、`result`。每個 Item MUST 有 `started → delta → completed` 生命週期，支援 streaming，使前端可即時反映進度而不需等整個 Turn 完成。

#### Scenario: Streaming delta
- **WHEN** agent_message 正在生成中
- **THEN** 系統 SHALL 以 delta 事件逐步推送內容，前端可即時呈現

#### Scenario: Item 完成標記
- **WHEN** 一個 tool_call 執行結束
- **THEN** 對應 Item MUST 標記為 completed 並附帶執行結果
