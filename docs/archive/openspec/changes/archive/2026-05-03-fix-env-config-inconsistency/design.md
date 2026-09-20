## Context

`daodao-ai-backend` 使用 `pydantic-settings` 管理環境設定，採用「主設定 `Settings` + 子設定 (`RedisSettings`, `PostgreSQLSettings` 等)」的巢狀結構。問題根源在於：子設定類別各自宣告了 `model_config`，但 `env_file` 清單只列 `.env` 和 `ENV_FILE_PATH`，遺漏了 `_ENV_FILE`（即 `.env.dev` / `.env.prod`）。此外，`.env.dev` 有多處鍵名、值格式與 config.py 欄位定義不一致，導致覆蓋值無法生效。

受影響檔案：`src/config.py`、`.env.dev`、`.env.dev.sample`、`.env.prod.sample`。

## Goals / Non-Goals

**Goals:**
- 確保所有子設定在開發 / 正式環境都能正確讀取 `.env.dev` / `.env.prod`
- 統一 `REDIS_TTL_HOURS` 鍵名（複數）與值格式（純整數）
- 修正 `.env.dev` 中 Gemini URL、model name、OpenAI model 三處錯誤值
- 移除 `MY_TOKEN_ID`（config.py 無對應欄位，不應出現在設定系統中）
- 同步更新 `.env.dev.sample` 與 `.env.prod.sample` 以避免新開發者踩坑

**Non-Goals:**
- 重構設定架構（如改用單一 Settings class 或 12-factor env injection）
- 新增 Grok（X.AI）provider 支援（`.env.prod.sample` 已有，但 config.py 無對應，留待獨立 PR）
- 調整 Insight LLM backend 預設值（`groq` vs `gemini` 分歧由另一 PR 決策）
- 變更 `.env.prod`（生產環境實際值由部署流程管理）

## Decisions

### D1：子設定 `env_file` 加入 `_ENV_FILE`

**問題**：`RedisSettings`、`PostgreSQLSettings`、`ClickHouseSettings`、`InsightSettings` 各自的 `model_config.env_file` 只有 `[".env", str(ENV_FILE_PATH)]`，無法讀取 `.env.dev`。

**選項比較**：

| 選項 | 做法 | 優 | 劣 |
|------|------|----|----|
| A（採用）| 在每個子設定的 `env_file` 加入 `_ENV_FILE` | 最小改動，行為明確 | 四處重複 `_ENV_FILE` |
| B | 移除子設定的 `model_config`，改由 `Settings` 統一載入後注入 | 集中管理 | 架構重構，改動範圍大 |
| C | 讓子設定繼承 `BaseConfigSettings` 而不覆蓋 `model_config` | 減少重複 | 子設定需要的 `env_prefix` 只能靠 `BaseConfigSettings` 不支援 |

**決策**：採用 A。改動最小、最安全，不改變 pydantic-settings 的使用方式。

修正後格式：
```python
model_config = SettingsConfigDict(
    env_file=[_ENV_FILE, ".env", str(ENV_FILE_PATH)],
    ...
)
```

---

### D2：`REDIS_TTL_HOUR` → `REDIS_TTL_HOURS`，值改為純整數

**問題**：
- `RedisSettings.ttl_hours: int` 期望整數（小時數）
- pydantic-settings 的 env key 為 `REDIS_TTL_HOURS`（`env_prefix="REDIS_"` + field name `ttl_hours`）
- `.env.dev` / `.env.dev.sample` / `.env.prod.sample` 均寫 `REDIS_TTL_HOUR=3h`（鍵名單數 + 字串格式）

**決策**：將所有 env 檔中的 `REDIS_TTL_HOUR=3h` 改為 `REDIS_TTL_HOURS=3`（複數，純整數）。config.py `ttl_hours: int` 欄位定義不變。

---

### D3：修正 `.env.dev` Gemini 設定

| 鍵 | 舊值（.env.dev） | 正確值 |
|----|----------------|--------|
| `LLM_BACKEND__GEMINI__URL` | `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent` | `https://generativelanguage.googleapis.com` |
| `LLM_BACKEND__GEMINI__MODEL` | `gemini` | `gemini-2.5-flash` |

URL 應為 base URL，具體 path 由 `gemini_backend.py` 組裝（model name 動態帶入）。
同時升級 model 至 `gemini-2.5-flash`（見先前 model 建議分析）。

---

### D4：更新 `.env.dev` OpenAI model

`gpt-4` → `gpt-4o`，與 config.py `_LLM_BACKEND_DEFAULTS` 預設值一致。

---

### D5：移除 `MY_TOKEN_ID`

`MY_TOKEN_ID` 僅為開發者測試用的臨時 JWT token，不屬於應用程式設定。
移除方式：從 `.env.dev`、`.env.dev.sample`、`.env.prod.sample` 中刪除此行。
若開發者需要 token，在 README 或 CLAUDE.md 說明如何手動產生即可。

## Risks / Trade-offs

- **[風險] 子設定 env_file 載入優先順序**  
  pydantic-settings 多個 env_file 時，**後面的優先級更高**（後覆蓋前）。將 `_ENV_FILE` 放在清單最前面，確保 `.env.dev` 的值被 `.env` 與 `ENV_FILE_PATH` 覆蓋，這與 `Settings` class 的行為一致。  
  → 統一寫法：`[_ENV_FILE, ".env", str(ENV_FILE_PATH)]`

- **[風險] `InsightSettings` 的 `env_prefix="INSIGHT__"` 雙重前綴**  
  `Settings` 使用 `env_nested_delimiter="__"`，載入 `insight` 欄位時會尋找 `INSIGHT__*`；`InsightSettings` 自身也有 `env_prefix="INSIGHT__"`，兩者在 pydantic-settings v2 中行為不同（子設定獨立讀 env）。加入 `_ENV_FILE` 後能讀到值，現有行為不變。無需額外修正。

- **[風險] `.env.dev` 含有真實 API keys**  
  `.env.dev` 已在 `.gitignore` 中，不會 commit。本次修正不涉及 secret rotation，但建議事後輪換已洩漏的 Gemini / Groq API key（此 key 曾短暫存在 git history 或本機）。

## Migration Plan

1. 修改 `src/config.py`：四個子設定 `env_file` 加入 `_ENV_FILE`
2. 修改 `.env.dev`：REDIS TTL、Gemini URL/model、OpenAI model、移除 MY_TOKEN_ID
3. 修改 `.env.dev.sample`：REDIS TTL 鍵名格式
4. 修改 `.env.prod.sample`：REDIS TTL 鍵名格式、移除 MY_TOKEN_ID
5. 本地跑 `make dev` 確認服務啟動正常，無 pydantic ValidationError

**Rollback**：純設定修正，回滾只需 `git revert`，無資料庫或 API 變更。

## Open Questions

- `InsightSettings.llm_backend` 預設值：config.py 為 `"groq"`，`.env.dev` 設為 `"gemini"`，需確認開發環境的 default 策略（暫保留現況，另 PR 決策）
