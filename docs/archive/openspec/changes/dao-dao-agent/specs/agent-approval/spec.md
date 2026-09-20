## ADDED Requirements

### Requirement: 批次寫入觸發審批

Harness SHALL 在批次寫入操作（如發信、推播）執行前主動推出 `approval_request`。Turn MUST 在此暫停，等待用戶回傳 `allow` 或 `deny` 後才繼續。

#### Scenario: 發信前要求審批
- **WHEN** Agent 準備執行批次發信
- **THEN** 系統 MUST 先發出 approval_request 並暫停 Turn，不得在未取得 allow 前發送

#### Scenario: 用戶拒絕
- **WHEN** 用戶對 approval_request 回傳 deny
- **THEN** 系統 MUST 取消該批次操作並回報已取消，不執行任何寫入

#### Scenario: 用戶同意
- **WHEN** 用戶對 approval_request 回傳 allow
- **THEN** 系統 SHALL 續行該批次操作並回報執行結果

### Requirement: 反向請求通道

審批為 server 向 client 發請求，方向與一般 request-response 相反。系統 SHALL 提供支撐此反向請求的雙向通訊機制。

#### Scenario: server 主動發起確認
- **WHEN** Turn 暫停在 approval_request
- **THEN** server MUST 能主動向 client 推送該請求，並接收 client 後續回傳的 allow/deny
