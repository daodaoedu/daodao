# Plan: Insight Playground + 新 LLM Backends + Model Management

## 目標
1. 新增 3 個 LLM backend（Cloudflare Workers AI / NVIDIA NIM / Cerebras）
2. ModelManagementPage 加入 CRUD（新增 / 編輯 / 刪除模型）
3. 後端新增 sync endpoint：呼叫各 provider API 拉取最新模型清單並 upsert 進 DB
4. 在 daodao-admin-ui Playground 加入「Insight 測試」Tab
5. Insight Tab：選使用者 + practice、編輯 system prompt、多 model 並排比較、資料區塊開關

---

## 核心設計原則

- 模型清單統一存 `llm_models` 表，不 hardcode 在前端
- Insight Tab 的模型選擇與 Chat Playground 共用同一資料來源（`GET /llm-models?provider=X&is_active=true`）
- `POST /playground/insight` 用 `model_id`（對應 `llm_models.id`），與 Chat Playground 一致
- 多 backend 並排 = 前端平行發送多個 POST，每個帶不同 `model_id`

---

## Part A：新 LLM Backends（daodao-ai-backend）

### 架構決策

四個新 provider 全部 OpenAI Chat Completions 相容 → 統一用 `OpenAIChatBackend`：

| Provider key | Base URL | 備註 |
|-------------|----------|------|
| `cloudflare` | `https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/ai/v1` | 需 `CLOUDFLARE_ACCOUNT_ID`（組 URL）+ `CLOUDFLARE_API_TOKEN`（Bearer auth），兩者缺一不可 |
| `nvidia` | `https://integrate.api.nvidia.com/v1` | API key from build.nvidia.com |
| `cerebras` | `https://api.cerebras.ai/v1` | API key from cerebras.ai |
| `openrouter` | `https://openrouter.ai/api/v1` | API key from openrouter.ai；可路由到數百個模型 |
| `ollama_cloud` | `https://ollama.com/v1` | 需 `OLLAMA_API_KEY`（Bearer auth）；需登入 ollama.com 建立 API key |

### Step A1 — 建立 `openai_chat_backend.py`

- 檔案：`src/services/llm/openai_chat_backend.py`（新建）
- Groq 已是同樣模式，這個 class 統一供 cloudflare / nvidia / cerebras 共用

```python
class OpenAIChatBackend(BaseLLMBackend):
    def __init__(self, config: dict):
        super().__init__(config)
        self._client = AsyncOpenAI(
            api_key=config.get("api_key"),
            base_url=config.get("url"),
        )
        self._backend_name = config.get("backend_name", "openai_chat")

    async def generate(self, prompt: str, **kwargs) -> Tuple[str, float, Dict, str]:
        response = await self._client.chat.completions.create(
            model=self.config["model"],
            messages=[{"role": "user", "content": prompt}],
            max_tokens=kwargs.get("max_tokens", 600),
            temperature=kwargs.get("temperature", 0.7),
        )
        output = response.choices[0].message.content or "未提供回應"
        usage_dict = {
            "input_tokens": response.usage.prompt_tokens,
            "output_tokens": response.usage.completion_tokens,
        }
        cost = self._calc_cost(usage_dict)
        return output, cost, usage_dict, self._backend_name
```

### Step A2 — 更新 `config.py`

```python
"cloudflare": {
    "url": "https://api.cloudflare.com/client/v4/accounts/PLACEHOLDER/ai/v1",
    "model": "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
},
"nvidia": {
    "url": "https://integrate.api.nvidia.com/v1",
    "model": "meta/llama-3.3-70b-instruct",
},
"cerebras": {
    "url": "https://api.cerebras.ai/v1",
    "model": "llama3.1-8b",
},
"openrouter": {
    "url": "https://openrouter.ai/api/v1",
    "model": "meta-llama/llama-3.3-70b-instruct:free",
},
"ollama_cloud": {
    "url": "https://ollama.com/v1",
    "model": "gpt-oss:120b",
},
```

新增 `cloudflare_account_id: str = ""` 至 Settings，factory 組裝 URL 時替換 `PLACEHOLDER`。
`api_key` 欄位對應 Cloudflare API Token（需有 Workers AI Read + Edit 權限）。

### Step A3 — 更新 `factory.py`

```python
"cloudflare": OpenAIChatBackend,
"nvidia": OpenAIChatBackend,
"cerebras": OpenAIChatBackend,
"openrouter": OpenAIChatBackend,
"ollama_cloud": OpenAIChatBackend,
```

各 instance 透過 config 中的 `backend_name` 欄位區分 log。

### Step A4 — 更新 `.env.prod.sample`

```
CLOUDFLARE_ACCOUNT_ID=                      # 用於組裝 base URL
LLM_BACKEND__CLOUDFLARE__API_KEY=           # Cloudflare API Token（Workers AI Read + Edit 權限）
LLM_BACKEND__NVIDIA__API_KEY=
LLM_BACKEND__CEREBRAS__API_KEY=
LLM_BACKEND__OPENROUTER__API_KEY=
LLM_BACKEND__OLLAMA_CLOUD__API_KEY=          # ollama.com API key（Bearer auth）
```

---

## Part B：後端 Insight Playground Endpoints（daodao-ai-backend）

### Step C1 — 修改 `_build_prompt`

- 檔案：`src/services/insight/insight_service.py`
- 新增 include_* 開關 + system_prompt_override（全有預設值，排程器不受影響）
- 使用者資訊區塊（null 欄位省略）：nickname、personal_slogan、professional_field、custom_position、tag_list、education_stage

### Step C2 — 新增 Schema

- 檔案：`src/schemas/admin/playground.py`

```python
class PlaygroundInsightRequest(BaseModel):
    practice_id: int
    model_id: int                            # 對應 llm_models.id（與 Chat Playground 一致）
    save: bool = False
    system_prompt_override: Optional[str] = None
    include_user_profile: bool = True
    include_practice_info: bool = True
    include_checkin_stats: bool = True
    include_notable_notes: bool = True

class InsightCheckinStats(BaseModel):
    total: int
    max_streak: int
    top_weekdays: list[str]
    mood_summary: str

class PlaygroundInsightResponse(BaseModel):
    insight: str
    prompt_used: str
    checkin_stats: InsightCheckinStats
    user_profile_used: dict
    model_used: str        # "{provider}/{model_name}"（與 Chat Playground 一致）
    input_tokens: int
    output_tokens: int
    cost_usd: float
    latency_ms: int
    saved: bool
```

### Step C3 — 新增 3 個 Endpoints

- 檔案：`src/routers/admin/playground.py`

**GET /playground/insight/users**
```sql
SELECT DISTINCT u.id, u.nickname
FROM users u JOIN practices p ON p.user_id = u.id
WHERE p.status = 'completed' AND p.deleted_at IS NULL
ORDER BY u.nickname
```

**GET /playground/insight/practices?user_id=X**
```sql
SELECT id, title, insight IS NOT NULL as has_insight
FROM practices
WHERE user_id = :user_id AND status = 'completed' AND deleted_at IS NULL
ORDER BY updated_at DESC
```

**POST /playground/insight**
```
1. 查 llm_models by model_id（404 if not found or inactive）
2. 取 practice（404 if not found）
3. 取 user（含 profile 欄位）
4. get_checkins_for_practice
5. _analyze_checkins → stats
6. _build_prompt（帶入 include_* + system_prompt_override）
7. 建立 LLMClient（model.provider），覆寫 model 為 model.model_name
8. LoggingLLMClient.generate（context='playground_insight'）
9. if save → update practices.insight
10. 回傳 PlaygroundInsightResponse
```

---

## Part C：前端 Insight Tab（daodao-admin-ui）

### Step C1 — API Functions + Types

```ts
// 複用現有
listLLMModels({ provider?: string, is_active?: boolean })

// 新增
listInsightUsers()     → GET /api/v1/admin/playground/insight/users
listInsightPractices(userId)  → GET /api/v1/admin/playground/insight/practices
playgroundInsight(body: PlaygroundInsightRequest)  → POST /api/v1/admin/playground/insight
```

### Step C2 — PlaygroundPage 加 Tab 切換

- `Chat` / `Insight 測試` Tab bar
- 現有聊天 UI 包在 `tab === 'chat'` 條件下

### Step C3 — InsightTab 元件

**左側欄（設定）：**

```
[使用者] 下拉
  ↓ 選完後
[Practice] 下拉（title + ✓ 標示已有 insight）

[比較模型] 最多 3 個，可動態新增/移除
  每個 row：
  [Provider 下拉] → 選完後從 DB 載入該 provider 的模型
  [Model 下拉]（from GET /llm-models?provider=X&is_active=true）

[資料區塊]
  ☑ 使用者個人資訊
  ☑ 實踐資訊
  ☑ 打卡統計
  ☑ 精選筆記

[System Prompt] ▸ 可展開
  <textarea 預填 active insight prompt>
  [重置回預設]
```

Provider 下拉選項：`groq / anthropic / gemini / openai / cloudflare / nvidia / cerebras / openrouter / ollama_cloud`

**中央結果區：**

```
[預覽] [生成並儲存（警告色）]

每個選中 model 一欄（最多 3 欄）：
┌──────────────────────┐ ┌──────────────────────┐
│ cerebras/gpt-oss-120b│ │ cloudflare/llama-3.3  │
│ 3000 tok/s · 0.8s   │ │ · 1.2s               │
├──────────────────────┤ ├──────────────────────┤
│ Insight 文字...      │ │ Insight 文字...       │
│ ▸ Prompt 內容        │ │ ▸ Prompt 內容         │
│ ▸ 打卡統計           │ │ ▸ 打卡統計            │
│ ▸ 使用者資訊         │ │ ▸ 使用者資訊          │
│ [儲存此結果]         │ │ [儲存此結果]          │
└──────────────────────┘ └──────────────────────┘
```

- 「預覽」→ 對每個 model_id 平行 POST（save=false）
- 「生成並儲存」→ 對每個 model_id 平行 POST（save=true），最後一個成功的覆蓋 insight
- 各欄獨立 loading / error 狀態
- System prompt textarea mount 時呼叫 `listSystemPrompts({ name: 'insight', is_active: true })`（已有 API）預填

---

## Part D：後端 Model Sync Endpoint（daodao-ai-backend）

### 各 Provider 取得模型清單的方式

| Provider | 方式 | Endpoint |
|----------|------|---------|
| groq | OpenAI-compatible | `GET https://api.groq.com/openai/v1/models` |
| openai | OpenAI SDK | `GET https://api.openai.com/v1/models` |
| anthropic | Anthropic API | `GET https://api.anthropic.com/v1/models` |
| gemini | Google API | `GET https://generativelanguage.googleapis.com/v1beta/models` |
| nvidia | OpenAI-compatible | `GET https://integrate.api.nvidia.com/v1/models` |
| cerebras | OpenAI-compatible | `GET https://api.cerebras.ai/v1/models` |
| cloudflare | CF API | `GET https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/ai/models/search` |
| openrouter | OpenAI-compatible | `GET https://openrouter.ai/api/v1/models` |
| ollama_cloud | Ollama API | `GET https://ollama.com/api/tags`（需 Bearer auth） |
| ollama | Local | `GET http://ollama:11434/api/tags` |

### Step D1 — 新增 sync service

- 檔案：`src/services/admin/model_sync_service.py`
- 每個 provider 一個 sync 函式，統一回傳 `list[dict]`（包含 model_name、display_name）
- 只 sync `text-generation` 類型的模型（過濾 embedding、image、speech 等）
- Upsert 邏輯：`INSERT ... ON CONFLICT (provider, model_name) DO UPDATE SET display_name = EXCLUDED.display_name`（不覆蓋 is_active、cost 欄位）

### Step D2 — 新增 sync endpoint

- 檔案：`src/routers/admin/llm_models.py`

```python
@router.post("/llm-models/sync/{provider}")
@api_response_decorator
async def sync_provider_models(
    provider: str,
    admin: AdminDep,
    db: SessionDep,
    cache: CacheDep,
    settings: SettingsDep,
) -> dict:
    """
    呼叫指定 provider 的 API 取得最新模型清單，upsert 進 llm_models 表。
    回傳：新增數量、已存在數量、provider 名稱。
    """
```

- 不支援的 provider → 422
- API 呼叫失敗 → 502（顯示原始錯誤給 admin 參考）
- sync 完畢後 invalidate Redis cache

---

## Part E：前端 ModelManagementPage CRUD + Sync（daodao-admin-ui）

### Step E1 — 新增模型（Create）

目前頁面「無法在此新增」→ 改為支援新增：

- 右側面板加「新增模型」按鈕 → 開啟 modal/form
- 欄位：Provider（下拉，固定 8 個選項）、model_name、display_name、is_active、input_cost_per_1m、output_cost_per_1m、notes
- 呼叫 `POST /llm-models`

### Step E2 — 編輯模型（Update）

- 右側詳情頁加「編輯」按鈕 → inline 編輯或 modal
- 可修改：display_name、is_active、費率、notes
- `model_name` + `provider` 不可修改（是 unique key）
- 呼叫 `PUT /llm-models/{id}`

### Step E3 — 刪除模型（Delete）

- 右側詳情頁加「刪除」按鈕 → confirm dialog
- 呼叫 `DELETE /llm-models/{id}`

### Step E4 — 同步最新模型（Sync）

- 左側列表頂部，按 provider 分組顯示
- 每個 provider group 旁有「同步」按鈕 → 呼叫 `POST /llm-models/sync/{provider}`
- 同步中顯示 loading；完成後顯示「新增 X 筆 / 已存在 Y 筆」
- 新同步進來的模型預設 `is_active=false`，需 admin 手動啟用（避免未知模型自動上線）

---

## 分支策略

| Repo | 來源分支 | 工作分支 |
|------|---------|---------|
| daodao-ai-backend | `dev` | `feat/insight-playground` |
| daodao-admin-ui | `dev` | `feat/insight-playground` |

---

## 驗收條件

### Backends
- [ ] `cloudflare` / `nvidia` / `cerebras` backend 可正常 generate 並記錄到 ai_query_logs
- [ ] `llm_models` 表有對應 provider 的模型記錄（migration 執行後）

### Endpoints
- [ ] `GET /playground/insight/users` 只回傳有 completed practice 的使用者
- [ ] `GET /playground/insight/practices?user_id=X` 只列該使用者的 completed practices
- [ ] `POST /playground/insight` with model_id → 正確使用對應 provider/model
- [ ] `system_prompt_override` 有值時，`prompt_used` 使用覆寫內容
- [ ] `save=false` → DB 不變；`save=true` → practices.insight 確實寫入
- [ ] 不合法 model_id → 404；inactive model → 422

### 前端
- [ ] Provider 下拉選完後，Model 下拉從 DB 動態載入（`listLLMModels`）
- [ ] 最多 3 個 model row，可動態新增/移除
- [ ] 並排結果各欄獨立 loading / error 顯示
- [ ] System prompt textarea 預填 DB active insight prompt，重置按鈕有效
- [ ] 切換 Tab → Chat 功能不受影響

---

## 風險與緩解

| 風險 | 緩解 |
|------|------|
| Cloudflare ACCOUNT_ID 動態注入 URL | Settings 新增 `cloudflare_account_id`，factory 組裝時替換 |
| NVIDIA 某些模型需接受使用條款 | API 錯誤時顯示清楚訊息；admin 手動新增模型時留意需授權的模型 |
| Cerebras preview 模型可能下線 | `notes` 欄位標注 Preview；前端 model 名稱旁顯示 notes |
| 並排 3 欄在小螢幕跑版 | 最多 3 欄；小螢幕改為垂直排列 |
| `_build_prompt` 改動影響排程器 | 所有新參數有預設值 |
| 「生成並儲存」多欄同時 save=true 結果不一致 | 各欄獨立「儲存此結果」按鈕，而非全部同時儲存 |
