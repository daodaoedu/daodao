# daodao-worker 設計文件

**日期：** 2026-03-13
**狀態：** 已確認，待實作

---

## 背景

daodao 需要一個基於 Cloudflare Workers AI 的邊緣 AI 服務，補充現有的 `daodao-ai-backend`（Python）。兩個服務並存，技術路線不同：

- `daodao-ai-backend`：Python FastAPI，跑在 Linode，負責推薦等功能
- `daodao-worker`：Cloudflare Worker，跑在 Cloudflare Edge，負責即時生成類功能

---

## 功能範圍（Phase 1）

### 1. Action Maker 內容生成

**背景：** `daodao-f2e` 的 Action Maker 功能（`/action-maker`）目前在 `use-generate-actions.ts` 中用靜態 fallback 資料，有 TODO 等待後端 ready。

**功能：** 根據用戶填寫的分類、主題、標籤，生成個人化的行動建議（beginner / intermediate / advanced 三個等級）。

**特性：**
- 公開端點，不需要登入
- IP rate limit：每個 IP 每 10 分鐘最多 5 次（Cloudflare KV）
- JSON 回應（非 stream）

### 2. Checkin 鼓勵回饋

**背景：** 用戶在 daodao 打卡或寫 note 後，給予 AI 生成的鼓勵文字。

**功能：** 根據實踐名稱、打卡備註、累積打卡次數，生成簡短鼓勵訊息（50-100 字）。

**特性：**
- 需要登入（JWT 驗證）
- 非 stream，快速回應
- JWT secret 與 daodao-server 共用

---

## 架構

### 方案選擇

選擇**方案 B：Worker 驗 JWT**。

前端直接打 Worker，充分利用 Cloudflare edge 低延遲優勢。Action Maker 公開，Checkin 鼓勵帶 JWT。

### 資料流

```
Action Maker：
  前端 → POST worker.daodao.so/action-maker/generate
       → IP rate limit check（KV）
       → Workers AI（Qwen3）
       → Langfuse trace
       → JSON 回傳

Checkin 鼓勵：
  前端 → POST worker.daodao.so/checkin/encourage（帶 JWT）
       → JWT 驗證（shared secret）
       → Workers AI（Qwen3）
       → Langfuse trace
       → JSON 回傳
```

---

## Repo 結構

**新 Repo：`daodao-worker`**（獨立 Cloudflare Worker 專案）

```
daodao-worker/
├── src/
│   ├── index.ts                  # Hono app entry，掛載所有路由
│   ├── types.ts                  # Env bindings 型別定義
│   ├── middleware/
│   │   ├── auth.ts               # JWT 驗證 middleware
│   │   └── rate-limit.ts         # IP-based KV rate limit
│   ├── routes/
│   │   ├── action-maker.ts       # POST /action-maker/generate
│   │   └── checkin.ts            # POST /checkin/encourage
│   ├── prompts/
│   │   ├── action-maker.ts       # Action Maker system prompt
│   │   └── checkin.ts            # Checkin 鼓勵 system prompt
│   └── utils/
│       └── langfuse.ts           # Langfuse client 初始化與 trace helper
├── wrangler.toml
├── package.json
└── tsconfig.json
```

---

## API 規格

### `POST /action-maker/generate`

**Auth：** 無（IP rate limit）
**Headers：** `Content-Type: application/json`
**Response Content-Type：** `application/json`

**Request：**
```ts
{
  category: "interest" | "social" | "health" | "academic" | "work" | "finance"
  topic: string          // e.g. "想學吉他"
  nickname?: string      // 用戶暱稱，用於個人化 prompt（可選）
  tags?: string[]        // 用戶選的標籤
  locale?: "zh-TW" | "en"  // 預設 zh-TW；非支援值 fallback 到 zh-TW
}
```

**Response（JSON）：**
```ts
{
  success: true,
  data: { actions: IAction[] }   // 固定 3 個（beginner / intermediate / advanced）
}
```

**AI 生成失敗時：** 回傳 500，前端 fallback 靜態資料（現有 `getFallbackActions` 邏輯）。

`IAction` 結構與 `daodao-f2e/packages/features/action-maker/src/types/index.ts` 完全一致：
```ts
interface IAction {
  id: string                                          // e.g. "interest-beginner-001"
  categoryId: CategoryType
  level: "beginner" | "intermediate" | "advanced"
  locked?: boolean                                    // Worker 固定回傳 false（前端控制鎖定邏輯）
  title: string
  description: string
  duration: string                                    // e.g. "約 15 分鐘"
  tip: string
  rationale: string
}
```

Worker 固定回傳 3 個 IAction（每個 level 各一個）。

**locale 行為：** prompt 依 locale 切換語言；`zh-TW` 用中文 prompt 和中文輸出，`en` 用英文 prompt 和英文輸出。

**Rate limit：**
- KV key 格式：`rl:action-maker:<ip>` → 儲存當前視窗的請求次數
- 視窗：10 分鐘，每 IP 最多 5 次
- IP 取得：`request.headers.get('CF-Connecting-IP')`（Cloudflare 保證此 header 正確）

**錯誤回應：**
```ts
429 { success: false, error: "rate_limited", retry_after: 60 }   // HTTP header: Retry-After
400 { success: false, error: "InvalidInput", message: string }
500 { success: false, error: "AIError", message: string }
```

---

### `POST /checkin/encourage`

**Auth：** `Authorization: Bearer <JWT>`

**JWT 驗證說明：** Worker 驗證的是**使用者的 JWT token**，由 daodao-server 簽發。Worker 與 daodao-server 共用環境變數 `JWT_SECRET`。驗證只確認 token 有效（簽名正確、未過期），不使用 payload 中的 user_id（鼓勵生成不需要查詢資料庫）。

**Request：**
```ts
{
  practice_title: string   // 實踐名稱
  note?: string            // 打卡備註（可選）
  checkin_count: number    // 第幾次打卡（用於調整鼓勵語氣）
}
```

**Response：**
```ts
{
  success: true,
  data: {
    message: string   // 鼓勵文字，50-100 字
    emoji: string     // AI 選取的相關 emoji（一個）
  }
}
```

`emoji` 由 AI 根據 practice_title 和打卡情境自由選取，不使用固定規則。

**錯誤回應：**
```ts
401 { success: false, error: "Unauthorized" }
500 { success: false, error: "AIError", message: string }
```

---

## Cloudflare 資源

| 資源 | Binding | 用途 |
|------|---------|------|
| Workers AI | `AI` | LLM 生成 |
| KV Namespace | `CACHE` | Rate limiting |

**不需要：** D1、Vectorize（Phase 1 純生成，無 RAG）

---

## Observability：Langfuse

使用 [Langfuse](https://langfuse.com) 追蹤所有 AI 呼叫，提供 prompt、input/output、延遲、token 用量的可觀測性。

**部署方式：** Self-hosted，跑在 VPS 的 Docker Compose 上，對外網址為 `https://langfuse.daodao.so`。資料存在 VPS 的 PostgreSQL（與 daodao-server 共用同一個 Postgres instance，使用獨立的 `langfuse` database）。Langfuse server 啟動時自動執行 migration，建立所需的表。

**整合方式：** 使用 `langfuse` npm package，在 Cloudflare Worker 環境中以 fetch-based client 運作（不依賴 Node.js runtime）。

**Trace 內容：**
- `name`：`action-maker.generate` / `checkin.encourage`
- `input`：request body（category、topic、tags 等）
- `output`：AI 回傳的 actions 或 message
- `metadata`：ip（hash 後）、locale、checkin_count
- `latency`：AI 呼叫耗時

**環境隔離：** 在 Langfuse dashboard 建立兩個獨立 project（`daodao-worker-production`、`daodao-worker-preview`），各自擁有獨立的 API key pair。wrangler 的 `preview` / `production` 環境分別設定對應的 key，trace 資料完全隔離，metrics 不混用。

**環境變數：**
- `LANGFUSE_SECRET_KEY`：透過 `wrangler secret put --env <preview|production>` 分別設定（兩個 project 的 key 不同）
- `LANGFUSE_PUBLIC_KEY`：同上
- `LANGFUSE_BASEURL`：寫入 wrangler.toml vars（`https://langfuse.daodao.so`，兩個環境共用同一個 self-hosted instance）

**Flush 策略：** 使用 `c.executionCtx.waitUntil(langfuse.flushAsync())` 確保 Worker 回應後仍完成送出，不阻塞 response。

---

## 模型選擇

**`@cf/qwen/qwen3-30b-a3b-fp8`**，兩個 feature 統一使用。

- Qwen3 MoE 架構，總參數 30B，激活 3B，效率高
- 中文能力優秀，遠優於 Llama 3.1
- 支援 instruction following 和結構化輸出

---

## Cloudflare 設定

```toml
# wrangler.toml
name = "daodao-worker"
main = "src/index.ts"
compatibility_date = "2024-12-01"
compatibility_flags = ["nodejs_compat"]

[env.production]
name = "daodao-worker-production"
routes = [
  { pattern = "worker.daodao.so/*", zone_name = "daodao.so" }
]

[env.production.ai]
binding = "AI"

[[env.production.kv_namespaces]]
binding = "CACHE"
id = "<production-kv-id>"

[env.preview]
name = "daodao-worker-preview"
routes = [
  { pattern = "worker-dev.daodao.so/*", zone_name = "daodao.so" }
]

[env.preview.ai]
binding = "AI"

[[env.preview.kv_namespaces]]
binding = "CACHE"
id = "<preview-kv-id>"
```

---

## 與現有系統整合

### 前端（daodao-f2e）

`use-generate-actions.ts` 的 TODO 移除，改為真實 API 呼叫：

```ts
// 現在
// TODO: restore API call when backend is ready
// Mock: simulate loading delay then use fallback data

// 改為
const response = await fetch(`${WORKER_URL}/action-maker/generate`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ category, topic, nickname, tags, locale }),
})
const json = await response.json()
if (!response.ok) throw new Error(json.error)
setActions(json.data.actions)
```

### nginx

不需要修改 nginx。`worker.daodao.so` 直接由 Cloudflare 管理，不過 Linode nginx。

---

## 非功能性需求

**CORS：** 允許 `https://daodao.so`、`https://app.daodao.so`、`http://localhost:3000`（開發）。

**Cloudflare Plan：** Workers Paid（$5/mo），支援 30 秒 CPU time，足以容納 LLM 推論。免費方案 10ms CPU time 不適用。

**Observability：** 使用 Langfuse（詳見上方章節）。

**環境變數管理：**
- `JWT_SECRET`、`LANGFUSE_SECRET_KEY`、`LANGFUSE_PUBLIC_KEY`：透過 `wrangler secret put` 設定，不寫入 wrangler.toml
- `LANGFUSE_BASEURL`：寫入 wrangler.toml vars
- preview / production 各自獨立設定

---

## 非目標（Phase 1 不做）

- RAG 問答（需要 Vectorize，留待 Phase 2）
- 個人化推薦（留待 Phase 2）
- 用戶配額系統（Phase 1 只做 IP rate limit）
- D1 資料庫（Phase 1 無需持久化）
