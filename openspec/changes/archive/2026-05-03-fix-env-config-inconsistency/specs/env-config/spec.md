## ADDED Requirements

### Requirement: 子設定類別必須能讀取環境特定 env 檔案
`RedisSettings`、`PostgreSQLSettings`、`ClickHouseSettings`、`InsightSettings` 的 `model_config.env_file` SHALL 包含 `_ENV_FILE`（即 `.env.dev` 或 `.env.prod`），使其能讀取環境覆蓋值。

#### Scenario: 開發環境子設定讀取 .env.dev
- **WHEN** `ENVIRONMENT=development` 且 `.env.dev` 中設有 `REDIS_URL=redis://redis-dev:6379`
- **THEN** `RedisSettings().url` MUST 等於 `redis://redis-dev:6379`

#### Scenario: 子設定 env_file 優先順序
- **WHEN** `_ENV_FILE`、`.env`、`ENV_FILE_PATH` 同時存在且同一鍵有不同值
- **THEN** 後者優先級高於前者（pydantic-settings 載入順序：`_ENV_FILE` < `.env` < `ENV_FILE_PATH`）

---

### Requirement: Redis TTL 環境變數鍵名與型別統一
環境變數鍵 SHALL 為 `REDIS_TTL_HOURS`（複數），值 SHALL 為純整數（代表小時數）。

#### Scenario: 正確格式被接受
- **WHEN** `.env.dev` 中設有 `REDIS_TTL_HOURS=3`
- **THEN** `RedisSettings().ttl_hours` MUST 等於整數 `3`

#### Scenario: 舊格式鍵名不被採用
- **WHEN** `.env.dev` 中只有 `REDIS_TTL_HOUR=3h`（舊格式）
- **THEN** `RedisSettings().ttl_hours` MUST 回傳預設值 `6`（config.py 定義的 default）

---

### Requirement: Gemini LLM 設定使用 base URL 與有效 model name
`LLM_BACKEND__GEMINI__URL` SHALL 為 base URL `https://generativelanguage.googleapis.com`，不含 path 或 model name。`LLM_BACKEND__GEMINI__MODEL` SHALL 為有效的 Gemini model name（如 `gemini-2.5-flash`）。

#### Scenario: Gemini backend 使用 base URL
- **WHEN** `LLM_BACKEND__GEMINI__URL=https://generativelanguage.googleapis.com`
- **THEN** `gemini_backend.py` 能正確組裝完整 API endpoint URL（含 model name）

#### Scenario: 無效 model name 被替換
- **WHEN** `.env.dev` 中 `LLM_BACKEND__GEMINI__MODEL=gemini`（無效值）
- **THEN** 呼叫 Gemini API 時 MUST 回傳 error 或 404（現況）；修正後 model 為 `gemini-2.5-flash`，API 呼叫正常

---

### Requirement: OpenAI model 使用當前版本
`LLM_BACKEND__OPENAI__MODEL` 在 `.env.dev` 中 SHALL 與 config.py `_LLM_BACKEND_DEFAULTS` 的預設值一致，即 `gpt-4o`。

#### Scenario: .env.dev 與 config default 一致
- **WHEN** `.env.dev` 設有 `LLM_BACKEND__OPENAI__MODEL=gpt-4o`
- **THEN** `settings.llm_backend["openai"].model` MUST 等於 `gpt-4o`

---

### Requirement: MY_TOKEN_ID 不出現於設定系統
`MY_TOKEN_ID` SHALL 不存在於 `.env.dev`、`.env.dev.sample`、`.env.prod.sample` 中，因 config.py 無對應欄位且此 token 不屬於應用程式設定。

#### Scenario: sample 檔不含 MY_TOKEN_ID
- **WHEN** 開發者複製 `.env.dev.sample` 建立 `.env.dev`
- **THEN** `.env.dev` 中 MUST 不含 `MY_TOKEN_ID` 鍵
