## Why

`.env.dev` 與 `src/config.py` 之間存在多處鍵名、值格式、預設值不一致，導致部分環境變數在開發環境中無法被正確載入（如 Redis TTL、Gemini model name），潛在造成 runtime 行為與預期不符。趁目前功能尚未擴展前整理乾淨，避免未來排查困難。

## What Changes

- **修正 `RedisSettings` / `PostgreSQLSettings` / `ClickHouseSettings` / `InsightSettings` 的 `env_file` 清單**：目前這四個子設定的 `model_config` 只列 `[".env", ENV_FILE_PATH]`，缺少 `.env.dev` / `.env.prod`，導致這些 settings 在開發環境下讀不到 `.env.dev` 的覆蓋值
- **修正 `REDIS_TTL_HOUR` → `REDIS_TTL_HOURS`（複數）並改為 int**：`.env.dev` 的鍵為 `REDIS_TTL_HOUR=3h`，但 `RedisSettings.ttl_hours` 期望 `int`（小時數）、env key suffix 為 `TTL_HOURS`；需統一為 `REDIS_TTL_HOURS=3`
- **修正 Gemini model name**：`.env.dev` 設 `LLM_BACKEND__GEMINI__MODEL=gemini`（無效值），應對齊 config.py 預設值 `gemini-2.5-flash`（同時升級 model）
- **修正 Gemini URL**：`.env.dev` 的 URL 帶有完整 path 與舊 model 名稱（`gemini-1.5-flash`），應改為 base URL `https://generativelanguage.googleapis.com`，與 config.py 預設一致
- **更新 OpenAI model**：`.env.dev` 為 `gpt-4`（舊），config.py 預設為 `gpt-4o`；統一為 `gpt-4o`
- **移除 `MY_TOKEN_ID`**：僅存在於 `.env.dev`，config.py 無對應欄位，為開發用暫時 token，不應進入設定系統；改由開發者自行管理或移至文件說明
- **新增 `.env.dev.sample` 同步更新**：確保 sample 檔反映修正後的正確鍵名與值格式

## Capabilities

### New Capabilities

無新 capability（純配置修正）。

### Modified Capabilities

- `env-config`: `.env.dev` 與 `config.py` 的環境變數鍵名、值格式、預設值對齊規範

## Impact

**影響範圍：`daodao-ai-backend`**

| 檔案 | 變更類型 |
|------|---------|
| `src/config.py` | 修正四個子 Settings 的 `env_file` 清單；`RedisSettings.ttl_hours` 型別保持 int |
| `.env.dev` | 修正 `REDIS_TTL_HOUR` → `REDIS_TTL_HOURS=3`；Gemini URL / model；OpenAI model；移除 `MY_TOKEN_ID` |
| `.env.dev.sample` | 同步上述所有鍵名與格式修正 |
| `.env.prod.sample` | 確認 `REDIS_TTL_HOURS`（int）鍵名正確 |

**無 API 破壞性變更**，僅影響本機開發環境載入行為。
