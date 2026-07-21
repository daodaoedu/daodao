# env-config
- 涉及 repo: ai-backend (src/config.py, .env.dev.sample, .env.prod.sample)
- 對應 archived change: 無
- 總計: 5 條 requirement / 9 個 scenario | ✅6 ⚠️0 ❌0 ❓3
- 註：runtime `.env.dev`/`.env.prod` 為 gitignore（git 中不存在），涉及實際 runtime 值的 scenario 只能以 sample + config default 推斷，標 ❓

## Requirement: 子設定類別必須能讀取環境特定 env 檔案 → ✅
證據: daodao-ai-backend:src/config.py:15 `_ENV_FILE = ".env.prod" if production else ".env.dev"`；RedisSettings(36)/PostgreSQLSettings(53)/ClickHouseSettings(77)/InsightSettings(94) 的 model_config env_file 皆為 `[_ENV_FILE, ".env", ENV_FILE_PATH]`
- Scenario: 開發環境子設定讀 .env.dev → ❓ — env_file 含 _ENV_FILE，機制正確 (config.py:36)，但 .env.dev 不在 git，實際值無法驗證
- Scenario: 子設定 env_file 優先順序 → ✅ — env_file 順序 `[_ENV_FILE, ".env", ENV_FILE_PATH]` 與 spec 描述一致（pydantic-settings 後者覆寫前者） (config.py:36,53,77,94)

## Requirement: Redis TTL 環境變數鍵名與型別統一 → ✅
證據: daodao-ai-backend:src/config.py:44 env_prefix="REDIS_" + field `ttl_hours: int = 6` → 鍵名解析為 REDIS_TTL_HOURS（複數、純整數）；.env.dev.sample/.env.prod.sample `REDIS_TTL_HOURS=3`
- Scenario: 正確格式被接受 → ✅ — REDIS_TTL_HOURS 整數，sample 為 3，型別 int (config.py:46)
- Scenario: 舊格式鍵名不被採用 → ✅ — 只認 REDIS_TTL_HOURS；REDIS_TTL_HOUR(單數) 不對應任何 field，回 default 6 (config.py:46, extra="ignore")

## Requirement: Gemini LLM 設定使用 base URL 與有效 model name → ✅
證據: daodao-ai-backend:src/config.py:108-110 `"gemini": { "url": "https://generativelanguage.googleapis.com", "model": "gemini-2.5-flash" }`；samples 同值
- Scenario: Gemini backend 使用 base URL → ✅ — URL 為 base（無 path/model），gemini_backend 組裝完整 endpoint (config.py:109)
- Scenario: 無效 model name 被替換 → ❓ — config default 已是 gemini-2.5-flash（有效）；「無效值現況回 error/404」描述舊狀態，無法從 git 驗證 runtime .env.dev 是否曾有 `gemini`

## Requirement: OpenAI model 使用當前版本 → ✅
證據: daodao-ai-backend:src/config.py:107 `"openai": {..., "model": "gpt-4o"}`；.env.dev.sample/.env.prod.sample `LLM_BACKEND__OPENAI__MODEL=gpt-4o`
- Scenario: .env.dev 與 config default 一致 → ❓ — sample 與 config default 皆 gpt-4o（一致），但實際 .env.dev 不在 git 無法直接驗證

## Requirement: MY_TOKEN_ID 不出現於設定系統 → ✅
證據: .env.dev.sample / .env.prod.sample grep MY_TOKEN_ID 計數皆為 0；config.py 無對應 field
- Scenario: sample 檔不含 MY_TOKEN_ID → ✅ — 兩個 sample 檔均無 MY_TOKEN_ID 鍵
