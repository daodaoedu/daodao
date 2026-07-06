## ADDED Requirements

### Requirement: 工具定義能力邊界

系統 SHALL 以工具定義 Agent 的能力邊界，但具體用途由對話決定，不在工具層預設業務場景。

#### Scenario: 同一工具支援多用途
- **WHEN** 不同對話對同一工具（如 DB query）提出不同需求
- **THEN** 系統 SHALL 依對話脈絡決定查詢內容，而非限定單一用途

### Requirement: 資料查詢層

系統 SHALL 提供資料查詢工具，至少包含：MCP pg 的 `daodao-pg-dev::query`、`daodao-pg-prod::query`、`describe_schema`、`get_user_full_context`，以及 daodao-server 的 `GET /api/admin/statistics/*`、`GET /api/admin/users`，與 daodao-ai-backend 的 `GET /v1/users/insights`、`GET /v1/recommendation`。

#### Scenario: 透過 MCP pg 查詢
- **WHEN** 任務需要從生產資料庫取數
- **THEN** 系統 SHALL 透過 `daodao-pg-prod::query` 執行唯讀 SELECT

#### Scenario: dev DB 亦僅供查詢
- **WHEN** 任務透過 `daodao-pg-dev::query` 存取開發資料庫
- **THEN** 系統 SHALL 僅允許 SELECT，寫入語句由工具層攔截（見 agent-security）

### Requirement: 通訊 & 整合層

系統 SHALL 提供通訊與整合工具，至少包含：`POST /api/email/send`、`POST /api/email/bulk`（需 admin token）、`POST /api/notifications`、Notion MCP（建立 / 更新 / 搜尋頁面）。可用 Email 模板 SHALL 至少包含 `welcome`、`onboarding`、`practice`、`notification-digest`、`marathon`、`wish-linked`。

#### Scenario: 批次發信需 admin token
- **WHEN** Agent 呼叫 `POST /api/email/bulk`
- **THEN** 系統 MUST 附帶 admin token，否則不得執行

### Requirement: 通用工具層

系統 SHALL 提供不限業務情境、隨時可用的通用工具，至少包含：`stealth_fetch`、`web_search`、`python_repl`、`read_file` / `write_file`、`bash`，以及 `cron_create` / `cron_list` / `cron_delete`。

#### Scenario: 抓取外部網頁
- **WHEN** 任務需要抓取外部網頁內容
- **THEN** 系統 SHALL 使用 `stealth_fetch`（自動繞過反爬蟲），而非一般 fetch

#### Scenario: 以 cron 完成升格
- **WHEN** 一個 Skill 要升格為自動化排程
- **THEN** 系統 SHALL 透過 `cron_create` 建立排程任務作為最後一步

### Requirement: 工具憑證供裝

工具與 connector 所需的第三方憑證 SHALL 由系統設定層統一解析，優先序 MUST 為 config 檔 > DB 設定 > 環境變數；工具層 MUST NOT 接受來自對話內容的憑證（見 agent-security）。

#### Scenario: 憑證依優先序解析
- **WHEN** 同一 connector 的 token 同時存在於 config 檔與環境變數
- **THEN** 系統 SHALL 採用 config 檔中的值

### Requirement: 檔案暫存 30 天

`write_file` 等檔案工具產生的暫存產物 SHALL 記錄建立時間並保留 30 天，逾期 MUST 由清理任務移除。需長期保存的產物 SHALL 升格進 repo 或寫入 Notion 等正式儲存。

#### Scenario: 逾期檔案被清除
- **WHEN** 一個 Agent 產生的暫存檔案建立已超過 30 天
- **THEN** 清理任務 MUST 將其移除，且不影響 30 天內的檔案
