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
