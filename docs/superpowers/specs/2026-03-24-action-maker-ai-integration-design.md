# Action Maker AI Integration Design

## Goal

將 action-maker 從純前端 mock 升級為完整的 AI 驅動功能：Worker AI 生成行動建議、AI 協作自訂行動、生成紀錄存進 DB、用戶可直接從結果建立 practice。

## Architecture

```
Frontend (action-maker)
  ├─ POST Worker /action-maker/generate    → AI 生成 3 個分級 actions
  ├─ POST Worker /action-maker/refine      → AI 潤色自訂 action
  ├─ PATCH daodao-server /api/v1/ai-generations/:sessionId
  │                                         → 回報用戶選擇/互動
  └─ POST daodao-server /api/v1/practices  → 建立 practice（需登入）

Worker (daodao-worker)
  ├─ Workers AI (Qwen3) 生成內容
  ├─ Langfuse trace（可觀測性）
  └─ POST daodao-server /api/internal/ai-generations → 存生成紀錄

daodao-server
  ├─ 現有 POST /api/v1/practices（不變）
  ├─ 新增 POST  /api/internal/ai-generations       → Worker 存紀錄
  └─ 新增 PATCH /api/v1/ai-generations/:sessionId → 前端回報互動

daodao-storage
  └─ 新增 migration 029: ai_generations table
```

## Decision Log

| 決策 | 選擇 | 理由 |
|------|------|------|
| Worker 與 DB 的關係 | 方案 C：Worker 純生成，存取走 daodao-server | Worker 職責單一，不直連 DB |
| 生成紀錄儲存 | Worker → daodao-server internal API | 資料不遺漏，不依賴前端回報 |
| 建立 practice 登入 | 必須登入，未登入彈登入框 | 現有 auth 基礎設施已支援 |
| 登入後跳轉 | 跳轉到 `/practices/{id}` | 用戶意圖是開始實踐，閉環更完整 |
| Practice 預設值 | 今天開始、14 天、每天一次 | 保持 action-maker 輕量，practice 頁可自行修改 |
| Checkin 鼓勵端點 | 不在此次範圍 | 先聚焦 action-maker |
| ai_generations table | 通用設計，feature 欄位區分 | 未來 checkin 鼓勵等功能可共用 |

---

## 1. Database: `ai_generations` Table

通用 AI 生成紀錄表，以 `feature` + `action_type` 區分不同功能。

### Migration: `029_create_table_ai_generations.sql`

```sql
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_generations') THEN
        CREATE TABLE ai_generations (
            id SERIAL PRIMARY KEY,
            external_id UUID UNIQUE DEFAULT gen_random_uuid(),

            -- 通用欄位
            feature VARCHAR(50) NOT NULL,
            action_type VARCHAR(20) NOT NULL,
            session_id VARCHAR(64),
            ip_hash VARCHAR(16),                -- SHA-256 truncated to first 8 bytes (16 hex chars)
            user_id INT REFERENCES users(id),
            status VARCHAR(20) DEFAULT 'success', -- success | error | timeout

            -- AI 呼叫
            input JSONB NOT NULL,
            output JSONB,                         -- nullable for error/timeout cases
            model VARCHAR(100),
            latency_ms INT,

            -- 用戶互動（前端後續回報）
            user_interaction JSONB,

            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX idx_ai_generations_feature ON ai_generations(feature);
        CREATE INDEX idx_ai_generations_session_id ON ai_generations(session_id);
        CREATE INDEX idx_ai_generations_user_id ON ai_generations(user_id);
        CREATE INDEX idx_ai_generations_created_at ON ai_generations(created_at);

        -- auto-update updated_at on row modification
        CREATE OR REPLACE FUNCTION update_ai_generations_updated_at()
        RETURNS TRIGGER AS $t$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $t$ LANGUAGE plpgsql;

        CREATE TRIGGER trg_ai_generations_updated_at
            BEFORE UPDATE ON ai_generations
            FOR EACH ROW
            EXECUTE FUNCTION update_ai_generations_updated_at();
    END IF;
END $$;
```

### Action-Maker 的 input/output 結構

**feature = `action-maker`, action_type = `generate`:**

```jsonc
// input
{
  "category": "interest",
  "topic": "學吉他",
  "tags": ["音樂", "創作"],
  "locale": "zh-TW"
}

// output
{
  "actions": [
    { "id": "interest-beginner-001", "categoryId": "interest", "level": "beginner", "locked": false, "title": "...", "description": "...", "duration": "...", "tip": "...", "rationale": "..." },
    { "id": "interest-intermediate-001", "categoryId": "interest", "level": "intermediate", "locked": false, ... },
    { "id": "interest-advanced-001", "categoryId": "interest", "level": "advanced", "locked": false, ... }
  ]
}
```

**feature = `action-maker`, action_type = `refine`:**

```jsonc
// input
{
  "category": "interest",
  "topic": "學吉他",
  "level": "beginner",
  "user_title": "練吉他",
  "user_description": "每天練一下"
}

// output
{
  "action": {
    "id": "custom-refined",
    "categoryId": "interest",
    "level": "beginner",
    "locked": false,
    "title": "練習吉他基礎和弦轉換",
    "description": "每天花 15 分鐘練習 C、G、Am、F 四個和弦...",
    "duration": "約 15 分鐘",
    "tip": "先慢後快，確保每個和弦聲音乾淨再加速",
    "rationale": "固定短時間練習比長時間偶爾練更有效"
  }
}
```

**user_interaction（前端回報）:**

```jsonc
{
  "selected_action_id": "interest-beginner-001",
  "selected_level": "beginner",
  "used_refine": false,
  "created_practice_id": 12345,
  "completed_flow": true
}
```

---

## 2. Worker: `daodao-worker`

Cloudflare Worker，使用 Hono 框架，Workers AI 推論。

### Tech Stack

- Cloudflare Workers + Hono
- Workers AI: `@cf/qwen/qwen3-30b-a3b-fp8`
- Cloudflare KV: IP rate limiting
- jose: JWT 驗證（保留，本次不使用）
- Langfuse: AI 可觀測性
- TypeScript + vitest + @cloudflare/vitest-pool-workers

### Env Bindings

```typescript
interface Env {
  CACHE: KVNamespace;
  AI: Ai;
  JWT_SECRET: string;
  LANGFUSE_SECRET_KEY: string;
  LANGFUSE_PUBLIC_KEY: string;
  LANGFUSE_BASEURL: string;
  INTERNAL_API_URL: string;    // daodao-server internal URL
  INTERNAL_API_KEY: string;    // internal API 驗證
}
```

### CORS

Hono `cors()` middleware，允許前端跨域呼叫：

```typescript
app.use("*", cors({
  origin: ["https://daodao.so", "https://app.daodao.so", "http://localhost:3000"],
  allowMethods: ["POST", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
}));
```

### Endpoints

#### `POST /action-maker/generate`

- **驗證:** IP rate limit（每 IP 10 分鐘 5 次）
- **Input:**
  ```typescript
  {
    category: CategoryType;   // required
    topic: string;            // required
    tags?: string[];
    locale?: "zh-TW" | "en"; // default "zh-TW"
    session_id?: string;      // 前端生成，串聯流程
  }
  ```
- **Output:**
  ```typescript
  {
    success: true;
    data: {
      actions: IAction[];     // 3 個：beginner, intermediate, advanced
      session_id: string;     // 回傳給前端，後續回報用
    }
  }
  ```
- **流程:**
  1. 驗證 input
  2. 組裝 prompt（system + user）
  3. 呼叫 Workers AI
  4. 解析 JSON 回應（`text.match(/\{[\s\S]*\}/)` 提取）
  5. Langfuse trace
  6. 呼叫 daodao-server 存 ai_generations 紀錄
  7. 回傳 actions

#### `POST /action-maker/refine`

- **驗證:** IP rate limit（共用 action-maker rate limit pool）
- **Input:**
  ```typescript
  {
    category: CategoryType;   // required
    topic: string;            // required
    level: ActionLevel;       // required: "beginner" | "intermediate" | "advanced"
    title: string;            // required, 用戶填的
    description?: string;     // 用戶填的
    session_id?: string;
  }
  ```
- **Output:**
  ```typescript
  {
    success: true;
    data: {
      action: IAction;        // AI 潤色後的單一 action
      session_id: string;
    }
  }
  ```
- **流程:** 同 generate，但 prompt 不同（指示 AI 潤色而非從零生成）

#### `GET /health`

- 無驗證，回傳 `{ status: "ok" }`

### Rate Limiting

使用 `createRateLimiter(prefix)` factory：
- generate 和 refine 共用 `rl:action-maker:{ip}` 計數
- 每 IP 10 分鐘 5 次（generate + refine 合計）
- KV 儲存 `{ count, resetAt }` with TTL
- IP 來源：`CF-Connecting-IP` header（**不使用 X-Forwarded-For**）
- Worker 必須部署在 Cloudflare proxy 後方（orange-clouded），確保 IP 來源可信
- IP hash 演算法：SHA-256，取前 8 bytes 轉 hex（16 chars），不儲存原始 IP

### Langfuse Integration

每次 AI call 建立一個 trace：
- `name`: `action-maker.generate` 或 `action-maker.refine`
- `input`: 請求參數
- `output`: AI 回應
- `metadata`: `{ ipHash, locale, latencyMs, model, success }`
- 使用 `waitUntil` 非阻塞 flush

### Session ID

- 前端 **必須** 生成 `session_id`（`crypto.randomUUID()`）並傳入
- Worker 使用前端傳入的 session_id，若缺少則由 Worker 生成
- session_id 存入前端 sessionStorage，串聯 generate → refine → 回報互動

### Input Sanitization

- `topic`: max 100 chars（與前端 `limits.TOPIC_MAX_LENGTH` 一致）
- `title` (refine): max 30 chars（與 `limits.CUSTOM_TITLE_MAX_LENGTH` 一致）
- `description` (refine): max 200 chars（與 `limits.CUSTOM_DESCRIPTION_MAX_LENGTH` 一致）
- `tags`: max 10 items, each max 20 chars
- Worker 在嵌入 prompt 前截斷超長輸入

### Internal API Call

- Worker → daodao-server 的 internal API call 使用 `waitUntil` 非阻塞
- Timeout: 5 秒，不重試
- 失敗不影響 Worker 回應（Langfuse 仍有紀錄作為備份）

---

## 3. daodao-server: Internal API

### `POST /api/internal/ai-generations`

Worker 呼叫，存 AI 生成紀錄。

- **驗證:** `X-Internal-API-Key` header
- **Input:**
  ```typescript
  {
    feature: string;
    action_type: string;
    session_id?: string;
    ip_hash?: string;
    input: Record<string, unknown>;
    output: Record<string, unknown>;
    model?: string;
    latency_ms?: number;
    status?: string;      // 'success' | 'error' | 'timeout', default 'success'
  }
  ```
- **Response:** `{ id: number, external_id: string }`

### `PATCH /api/v1/ai-generations/:sessionId`

前端呼叫，回報用戶互動。更新該 session_id 下**所有** ai_generations rows（一個 session 可能有 generate + refine 兩筆）。

- **驗證:** JWT required（此端點只在用戶登入建立 practice 後呼叫）
- **Input:**
  ```typescript
  {
    user_interaction: {
      selected_action_id?: string;
      selected_level?: string;
      used_refine?: boolean;
      created_practice_id?: number;
      completed_flow?: boolean;
    };
  }
  ```
- **行為:**
  - `user_id` 從 JWT 中提取（`req.user.id`），不由前端傳入
  - 更新所有 `session_id` 匹配的 rows 的 `user_interaction` 和 `user_id`
- **Response:** `{ success: true, updated_count: number }`

---

## 4. Frontend Changes

### 4a. `use-generate-actions.ts`

從 mock 改為呼叫 Worker：

```typescript
const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL ?? "https://worker.daodao.so";

// 生成 session_id 並存入 sessionStorage
const sessionId = crypto.randomUUID();

const response = await fetch(`${WORKER_URL}/action-maker/generate`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ category, topic, tags, locale, session_id: sessionId }),
  signal: controller.signal,
});
```

失敗時 fallback 到現有靜態資料（`getFallbackActions`），行為不變。

### 4b. 自訂表單 AI 協作流程

「我想自己設定」按鈕後的新流程：

```
1. 選分級（beginner / intermediate / advanced）
   - 三個按鈕/卡片，簡短說明各級強度

2. 填寫表單
   - 標題（required, max 30 chars）
   - 描述（optional, max 200 chars）
   - 預估時間（optional）

3. 按「AI 幫我完善」
   - 呼叫 POST /action-maker/refine
   - Loading 狀態

4. 顯示 AI 潤色結果
   - 並排或切換顯示：原版 vs AI 版
   - 三個選擇：
     a. 「採用 AI 版本」→ 用 AI 版進入 detail
     b. 「自己修改」→ 回到編輯表單（預填 AI 版內容）
     c. 「用我原本的」→ 用原版進入 detail

5. 用戶也可以跳過 AI：
   - 表單底部「直接使用」按鈕，不經過 refine
```

### 4c. 結果頁「開始實踐」

```
現有按鈕：「分享」「再玩一次」

新增按鈕：「開始實踐」（主要 CTA）

流程：
1. 已登入 → 呼叫 createPractice API → 跳轉 /practices/{id}
2. 未登入 → 彈登入框 → 登入成功 → 自動呼叫 createPractice → 跳轉

createPractice payload:
{
  title: result.action.title,
  practiceAction: result.action.description,
  otherContext: result.triggerTiming,
  tags: [result.category],
  startDate: new Date().toISOString().split('T')[0], // date-only: "2026-03-24"
  durationDays: 14,
  frequencyMinDays: 1,
  frequencyMaxDays: 1,
  isDraft: false,
}

建立成功後回報 ai_generations（已登入，JWT 驗證）:
PATCH /api/v1/ai-generations/{sessionId}
{
  user_interaction: {
    selected_action_id: result.action.id,
    selected_level: result.action.level,
    used_refine: boolean,
    created_practice_id: newPracticeId,
    completed_flow: true,
  },
}
// user_id 由 server 從 JWT 提取，不由前端傳入
```

### 按鈕優先級調整

結果頁按鈕順序：
1. **「開始實踐」** — 主要 CTA（最醒目）
2. **「分享」** — 次要
3. **「再玩一次」** — 三級

未登入時，「開始實踐」上方顯示文字提示「登入後即可開始你的微習慣追蹤」。

---

## 5. Error Handling

| 場景 | 處理 |
|------|------|
| Worker AI 呼叫失敗 | 前端 fallback 到靜態 actions |
| Worker AI 回傳無效 JSON | 同上，Worker 回 500 |
| refine 失敗 | 提示用戶，可選「用原本的」繼續 |
| daodao-server internal API 失敗 | Worker 不阻塞回應，log error，Langfuse 仍有紀錄 |
| createPractice 失敗 | 前端顯示 toast error，用戶可重試 |
| Rate limit | 前端顯示「請稍後再試」，附上 retry_after 秒數 |

---

## 6. Scope

### In Scope

- daodao-worker 建立（generate + refine 端點 + rate limit + Langfuse）
- JWT auth middleware（保留，本次不掛載到路由）
- ai_generations table migration
- daodao-server internal API（存紀錄 + 回報互動）
- 前端 use-generate-actions 改呼叫 Worker
- 自訂表單 AI 協作流程（選分級 → 填寫 → refine → 確認）
- 結果頁「開始實踐」（登入 → 建立 practice → 跳轉）
- Prisma schema 更新 + type generation

### Out of Scope

- Checkin 鼓勵端點
- Workers AI streaming（一次性回傳即可）
- 多語系 prompt 以外的 i18n（UI 文字暫用中文）
- practice 頁面修改
