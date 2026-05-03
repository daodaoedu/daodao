## 1. 修正 config.py 子設定 env_file（daodao-ai-backend）

- [x] 1.1 `RedisSettings.model_config.env_file` 加入 `_ENV_FILE` 為第一個元素，改為 `[_ENV_FILE, ".env", str(ENV_FILE_PATH)]`
  - 驗收：`REDIS_URL` 在 `.env.dev` 中設定後，`RedisSettings().url` 能正確讀取
- [x] 1.2 `PostgreSQLSettings.model_config.env_file` 加入 `_ENV_FILE`，改為 `[_ENV_FILE, ".env", str(ENV_FILE_PATH)]`
  - 驗收：`POSTGRES_DB_HOST` 在 `.env.dev` 中設定後，`PostgreSQLSettings().db_host` 能正確讀取
- [x] 1.3 `ClickHouseSettings.model_config.env_file` 加入 `_ENV_FILE`，改為 `[_ENV_FILE, ".env", str(ENV_FILE_PATH)]`
  - 驗收：`CLICKHOUSE_HOST` 在 `.env.dev` 中設定後，`ClickHouseSettings().host` 能正確讀取
- [x] 1.4 `InsightSettings.model_config.env_file` 加入 `_ENV_FILE`，改為 `[_ENV_FILE, ".env", str(ENV_FILE_PATH)]`
  - 驗收：`INSIGHT__LLM_BACKEND` 在 `.env.dev` 設為 `gemini` 後，`InsightSettings().llm_backend` 等於 `"gemini"`

## 2. 修正 .env.dev 錯誤值（daodao-ai-backend）

- [x] 2.1 `REDIS_TTL_HOUR=3h` → `REDIS_TTL_HOURS=3`（鍵名改複數，值改純整數）
  - 驗收：`RedisSettings().ttl_hours` 等於整數 `3`
- [x] 2.2 `LLM_BACKEND__GEMINI__URL` 改為 `https://generativelanguage.googleapis.com`（移除 path 與舊 model）
  - 驗收：URL 不包含 `/v1beta/models/` 路徑
- [x] 2.3 `LLM_BACKEND__GEMINI__MODEL=gemini` 改為 `gemini-2.5-flash`
  - 驗收：`settings.llm_backend["gemini"].model` 等於 `"gemini-2.5-flash"`
- [x] 2.4 `LLM_BACKEND__OPENAI__MODEL=gpt-4` 改為 `gpt-4o`
  - 驗收：`settings.llm_backend["openai"].model` 等於 `"gpt-4o"`
- [x] 2.5 移除 `MY_TOKEN_ID` 行（含上方的 comment 行若有）
  - 驗收：`.env.dev` 中不存在 `MY_TOKEN_ID` 鍵

## 3. 同步 sample 檔案（daodao-ai-backend）

- [x] 3.1 `.env.dev.sample`：`REDIS_TTL_HOUR=3h` → `REDIS_TTL_HOURS=3`；移除 `MY_TOKEN_ID`
  - 驗收：新開發者複製 sample 後無 Redis TTL 格式錯誤
- [x] 3.2 `.env.prod.sample`：`REDIS_TTL_HOUR=3h` → `REDIS_TTL_HOURS=3`；移除 `MY_TOKEN_ID`
  - 驗收：prod sample 與 dev sample Redis TTL 鍵名一致

## 4. 測試驗證（daodao-ai-backend）

- [x] 4.1 新增或更新 `tests/test_config.py`，加入以下測試案例：
  - `REDIS_TTL_HOURS=3` → `RedisSettings().ttl_hours == 3`
  - `REDIS_TTL_HOUR=3h` → `RedisSettings().ttl_hours == 6`（fallback 預設值）
  - 驗收：`uv sync && make test` 全綠（需先建立 .venv）
- [ ] 4.2 本機執行 `make dev`，確認服務啟動無 `pydantic.ValidationError`
  - 驗收：`GET /health` 回傳 200
