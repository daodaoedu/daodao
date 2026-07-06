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

### Requirement: 審批雙模式（auto / normal）

系統 SHALL 支援兩種審批模式，參考 Claude Code 的 allow / deny action 模型：
- **normal（預設）**：所有寫入型 action MUST 逐一推出 `approval_request` 等待 allow/deny。
- **auto**：allowlist 內的 action SHALL 直接放行不審批；denylist 內的 action MUST 一律拒絕且不可被 auto 模式覆蓋；不在兩清單內的 action 仍 MUST 走審批。

allowlist / denylist SHALL 由設定層管理（解析優先序 config > db > env）。排程（無人值守）執行 MUST 採 auto 模式並搭配明確 allowlist。

#### Scenario: auto 模式放行 allowlist action
- **WHEN** 審批模式為 auto，且觸發的寫入型 action 在 allowlist 內
- **THEN** 系統 SHALL 直接執行該 action，不推出 approval_request

#### Scenario: denylist 不可被 auto 覆蓋
- **WHEN** 審批模式為 auto，且觸發的 action 在 denylist 內
- **THEN** 系統 MUST 拒絕執行並回報，即使該 action 同時出現在 allowlist

#### Scenario: 排程執行不卡審批
- **WHEN** 一個排程 Skill 在無人值守下觸發 allowlist 內的寫入 action
- **THEN** 系統 SHALL 以 auto 模式放行，Turn 不因等待審批而停滯

### Requirement: 反向請求通道

審批為 server 向 client 發請求，方向與一般 request-response 相反。系統 SHALL 提供支撐此反向請求的雙向通訊機制。

#### Scenario: server 主動發起確認
- **WHEN** Turn 暫停在 approval_request
- **THEN** server MUST 能主動向 client 推送該請求，並接收 client 後續回傳的 allow/deny
