# daodao-worker 實作計畫

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立 `daodao-worker` Cloudflare Worker 服務，提供 Action Maker 行動建議生成（IP rate limit）和 Checkin 鼓勵回饋（JWT 驗證）兩個 AI 端點，並整合 Langfuse 可觀測性。

**Architecture:** 使用 Hono 框架在 Cloudflare Workers 上建構 API 路由，利用 Workers AI（Qwen3）進行 LLM 推論，KV 做 IP rate limiting，jose 做 JWT 驗證，Langfuse 追蹤所有 AI 呼叫。前端直接呼叫 Worker，無需透過 Linode。

**Tech Stack:** Cloudflare Workers、Hono、Workers AI（@cf/qwen/qwen3-30b-a3b-fp8）、Cloudflare KV、jose（JWT）、langfuse、@cloudflare/vitest-pool-workers、TypeScript

---

## 檔案結構

**新建 repo：`daodao-worker/`**

| 路徑 | 職責 |
|------|------|
| `src/index.ts` | Hono app 進入點，掛載 CORS、所有路由 |
| `src/types.ts` | Cloudflare Env binding 型別定義 |
| `src/domain-types.ts` | 共享領域型別（CategoryType、IAction、Locale） |
| `src/middleware/rate-limit.ts` | IP-based KV rate limit（每 IP 10 分鐘 5 次） |
| `src/middleware/auth.ts` | JWT Bearer token 驗證（jose） |
| `src/utils/langfuse.ts` | Langfuse client 初始化與 trace helper |
| `src/prompts/action-maker.ts` | Action Maker system/user prompt 組裝（支援 zh-TW/en） |
| `src/prompts/checkin.ts` | Checkin 鼓勵 system/user prompt 組裝 |
| `src/routes/action-maker.ts` | POST /action-maker/generate 路由處理 |
| `src/routes/checkin.ts` | POST /checkin/encourage 路由處理 |
| `test/middleware/rate-limit.test.ts` | rate-limit middleware 單元測試 |
| `test/middleware/auth.test.ts` | auth middleware 單元測試 |
| `test/routes/action-maker.test.ts` | action-maker 路由整合測試 |
| `test/routes/checkin.test.ts` | checkin 路由整合測試 |
| `wrangler.toml` | Cloudflare Worker 設定（preview/production environments） |
| `vitest.config.ts` | vitest + @cloudflare/vitest-pool-workers 設定 |
| `package.json` | 依賴與 scripts |
| `tsconfig.json` | TypeScript 設定 |

**修改現有檔案：`daodao-f2e/`**

| 路徑 | 修改內容 |
|------|----------|
| `packages/features/action-maker/src/hooks/use-generate-actions.ts` | 移除 mock，改為真實 API 呼叫 Worker |

---

## Chunk 1：專案骨架

### Task 1：初始化專案

**Files:**
- Create: `daodao-worker/package.json`
- Create: `daodao-worker/tsconfig.json`
- Create: `daodao-worker/wrangler.toml`
- Create: `daodao-worker/vitest.config.ts`

- [ ] **Step 1：在 daodao/ 根目錄下建立 daodao-worker 目錄並初始化**

```bash
cd /Users/xiaoxu/Projects/daodao
mkdir daodao-worker && cd daodao-worker
git init
```

- [ ] **Step 2：建立 `package.json`**

```json
{
  "name": "daodao-worker",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "wrangler dev",
    "deploy:preview": "wrangler deploy --env preview",
    "deploy:production": "wrangler deploy --env production",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "hono": "^4.6.0",
    "jose": "^5.9.6",
    "langfuse": "^3.30.0"
  },
  "devDependencies": {
    "@cloudflare/vitest-pool-workers": "^0.5.0",
    "@cloudflare/workers-types": "^4.20241205.0",
    "typescript": "^5.7.0",
    "vitest": "^2.1.0",
    "wrangler": "^3.91.0"
  }
}
```

- [ ] **Step 3：安裝依賴**

```bash
cd /Users/xiaoxu/Projects/daodao/daodao-worker
npm install
```

Expected: 安裝成功，無 peer dependency 錯誤

- [ ] **Step 4：建立 `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "types": ["@cloudflare/workers-types"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*", "test/**/*", "vitest.config.ts"]
}
```

- [ ] **Step 5：建立 `wrangler.toml`**

```toml
name = "daodao-worker"
main = "src/index.ts"
compatibility_date = "2024-12-01"
compatibility_flags = ["nodejs_compat"]

[ai]
binding = "AI"

[vars]
LANGFUSE_BASEURL = "https://langfuse.daodao.so"

[[kv_namespaces]]
binding = "CACHE"
id = "REPLACE_WITH_DEV_KV_ID"

[env.production]
name = "daodao-worker-production"
routes = [
  { pattern = "worker.daodao.so/*", zone_name = "daodao.so" }
]

[env.production.ai]
binding = "AI"

[[env.production.kv_namespaces]]
binding = "CACHE"
id = "REPLACE_WITH_PRODUCTION_KV_ID"

[env.preview]
name = "daodao-worker-preview"
routes = [
  { pattern = "worker-dev.daodao.so/*", zone_name = "daodao.so" }
]

[env.preview.ai]
binding = "AI"

[[env.preview.kv_namespaces]]
binding = "CACHE"
id = "REPLACE_WITH_PREVIEW_KV_ID"
```

- [ ] **Step 6：建立 `vitest.config.ts`**

```typescript
import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: { configPath: "./wrangler.toml" },
        miniflare: {
          kvNamespaces: ["CACHE"],
          bindings: {
            JWT_SECRET: "test-secret-key-minimum-32-chars-long",
            LANGFUSE_SECRET_KEY: "sk-lf-test",
            LANGFUSE_PUBLIC_KEY: "pk-lf-test",
            LANGFUSE_BASEURL: "https://langfuse.daodao.so",
          },
        },
      },
    },
  },
});
```

- [ ] **Step 7：驗證 wrangler 可以解析設定**

```bash
cd /Users/xiaoxu/Projects/daodao/daodao-worker
npx wrangler types
```

Expected: 生成 `.wrangler/types/runtime.d.ts`（或顯示設定讀取成功）

---

### Task 2：基礎型別與 Hono 進入點

**Files:**
- Create: `daodao-worker/src/types.ts`
- Create: `daodao-worker/src/index.ts`
- Create: `daodao-worker/src/middleware/` (目錄)
- Create: `daodao-worker/src/routes/` (目錄)
- Create: `daodao-worker/src/prompts/` (目錄)
- Create: `daodao-worker/src/utils/` (目錄)

- [ ] **Step 1：建立目錄結構**

```bash
mkdir -p /Users/xiaoxu/Projects/daodao/daodao-worker/src/{middleware,routes,prompts,utils}
mkdir -p /Users/xiaoxu/Projects/daodao/daodao-worker/test/{middleware,routes}
```

- [ ] **Step 2：建立 `src/types.ts`**

定義 Cloudflare Env binding 型別，讓 TypeScript 能夠正確型別推斷所有 Workers 環境變數。

```typescript
export interface Env {
  // KV Namespace
  CACHE: KVNamespace;
  // Workers AI
  AI: Ai;
  // Secrets（透過 wrangler secret put 設定）
  JWT_SECRET: string;
  LANGFUSE_SECRET_KEY: string;
  LANGFUSE_PUBLIC_KEY: string;
  // Vars（寫在 wrangler.toml）
  LANGFUSE_BASEURL: string;
}
```

- [ ] **Step 3：建立 `src/index.ts`（基礎 Hono app，先不掛路由）**

```typescript
import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env } from "./types";

const app = new Hono<{ Bindings: Env }>();

// CORS：允許前端來源
app.use(
  "*",
  cors({
    origin: [
      "https://daodao.so",
      "https://app.daodao.so",
      "http://localhost:3000",
    ],
    allowMethods: ["POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  }),
);

// 健康檢查
app.get("/health", (c) => c.json({ status: "ok" }));

// 404 fallback
app.notFound((c) => c.json({ success: false, error: "NotFound" }, 404));

export default app;
```

- [ ] **Step 4：確認 TypeScript 無型別錯誤**

```bash
cd /Users/xiaoxu/Projects/daodao/daodao-worker
npx tsc --noEmit
```

Expected: 無錯誤輸出

- [ ] **Step 5：commit**

```bash
cd /Users/xiaoxu/Projects/daodao/daodao-worker
git add .
git commit -m "chore: initialize daodao-worker project scaffold"
```

---

## Chunk 2：Middleware

### Task 3：Rate Limit Middleware

**Files:**
- Create: `daodao-worker/src/middleware/rate-limit.ts`
- Create: `daodao-worker/test/middleware/rate-limit.test.ts`

Rate limit 使用 Cloudflare KV 儲存每個 IP 在目前視窗的請求次數。KV value 格式：`{ count: number, resetAt: number }`（Unix timestamp ms）。視窗固定 10 分鐘，每 IP 最多 5 次。

- [ ] **Step 1：寫失敗測試**

建立 `test/middleware/rate-limit.test.ts`：

```typescript
import {
  env,
  createExecutionContext,
  waitOnExecutionContext,
  SELF,
} from "cloudflare:test";
import { describe, it, expect, beforeEach } from "vitest";

// 使用 SELF 測試整個 worker（需要先在 index.ts 掛載 rate-limit 的測試路由）
// 但更好的方式是直接測試 middleware 函數邏輯
// 這裡用 SELF 測試 /action-maker/generate 端點的 rate limit 行為

describe("Rate Limit Middleware", () => {
  beforeEach(async () => {
    // 清空 KV
    const keys = await env.CACHE.list();
    for (const key of keys.keys) {
      await env.CACHE.delete(key.name);
    }
  });

  it("第 1-5 次請求應該通過", async () => {
    for (let i = 0; i < 5; i++) {
      const res = await SELF.fetch("http://localhost/action-maker/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "CF-Connecting-IP": "1.2.3.4",
        },
        body: JSON.stringify({
          category: "interest",
          topic: "學吉他",
        }),
      });
      // 不是 429 就算通過（AI 可能 500，但不是 rate limited）
      expect(res.status).not.toBe(429);
    }
  });

  it("第 6 次請求應該被 rate limit（429）", async () => {
    // 先打 5 次
    for (let i = 0; i < 5; i++) {
      await SELF.fetch("http://localhost/action-maker/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "CF-Connecting-IP": "1.2.3.4",
        },
        body: JSON.stringify({ category: "interest", topic: "學吉他" }),
      });
    }
    // 第 6 次
    const res = await SELF.fetch("http://localhost/action-maker/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "CF-Connecting-IP": "1.2.3.4",
      },
      body: JSON.stringify({ category: "interest", topic: "學吉他" }),
    });
    expect(res.status).toBe(429);
    const body = await res.json() as Record<string, unknown>;
    expect(body.success).toBe(false);
    expect(body.error).toBe("rate_limited");
    expect(typeof body.retry_after).toBe("number");
    expect(res.headers.get("Retry-After")).toBeTruthy();
  });

  it("不同 IP 的 rate limit 互相獨立", async () => {
    // IP A 打 5 次
    for (let i = 0; i < 5; i++) {
      await SELF.fetch("http://localhost/action-maker/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "CF-Connecting-IP": "1.1.1.1",
        },
        body: JSON.stringify({ category: "interest", topic: "學吉他" }),
      });
    }
    // IP B 的第 1 次應該通過
    const res = await SELF.fetch("http://localhost/action-maker/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "CF-Connecting-IP": "2.2.2.2",
      },
      body: JSON.stringify({ category: "interest", topic: "學吉他" }),
    });
    expect(res.status).not.toBe(429);
  });
});
```

- [ ] **Step 2：執行測試確認它失敗（因為路由尚未實作）**

```bash
cd /Users/xiaoxu/Projects/daodao/daodao-worker
npm test -- test/middleware/rate-limit.test.ts
```

Expected: FAIL（找不到路由，或 import 錯誤）

- [ ] **Step 3：建立 `src/middleware/rate-limit.ts`**

```typescript
import type { Context, Next } from "hono";
import type { Env } from "../types";

const WINDOW_MS = 10 * 60 * 1000; // 10 分鐘
const MAX_REQUESTS = 5;

interface RateLimitEntry {
  count: number;
  resetAt: number; // Unix timestamp ms
}

export function createRateLimiter(prefix: string) {
  return async function rateLimitMiddleware(
    c: Context<{ Bindings: Env }>,
    next: Next,
  ): Promise<void | Response> {
    const ip = c.req.header("CF-Connecting-IP") ?? "unknown";
    const key = `rl:${prefix}:${ip}`;
    const now = Date.now();

  const raw = await c.env.CACHE.get(key);
  let entry: RateLimitEntry = raw
    ? (JSON.parse(raw) as RateLimitEntry)
    : { count: 0, resetAt: now + WINDOW_MS };

  // 視窗已過期，重置
  if (now > entry.resetAt) {
    entry = { count: 0, resetAt: now + WINDOW_MS };
  }

  if (entry.count >= MAX_REQUESTS) {
    const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
    return c.json(
      { success: false, error: "rate_limited", retry_after: retryAfterSec },
      429,
      { "Retry-After": String(retryAfterSec) },
    );
  }

  // 遞增計數，TTL 設為視窗剩餘秒數 + 10 秒緩衝
  entry.count += 1;
  const ttlSec = Math.ceil((entry.resetAt - now) / 1000) + 10;
    await c.env.CACHE.put(key, JSON.stringify(entry), {
      expirationTtl: ttlSec,
    });

    await next();
  };
}
```

- [ ] **Step 4：在 `src/index.ts` 掛載 action-maker 路由（先用 stub），讓測試可以執行**

在 `src/index.ts` 中新增（在 health check 之後）：

```typescript
import { actionMakerRouter } from "./routes/action-maker";

// 掛載路由
app.route("/action-maker", actionMakerRouter);
```

同時建立 stub 路由 `src/routes/action-maker.ts`（暫時版本，Task 7 會完整實作）：

```typescript
import { Hono } from "hono";
import type { Env } from "../types";
import { createRateLimiter } from "../middleware/rate-limit";

export const actionMakerRouter = new Hono<{ Bindings: Env }>();

actionMakerRouter.post("/generate", createRateLimiter("action-maker"), async (c) => {
  // Stub：Task 7 完整實作
  return c.json({ success: true, data: { actions: [] } });
});
```

- [ ] **Step 5：執行 rate limit 測試，確認通過**

```bash
cd /Users/xiaoxu/Projects/daodao/daodao-worker
npm test -- test/middleware/rate-limit.test.ts
```

Expected: PASS（3 個測試全過）

- [ ] **Step 6：確認 TypeScript 無型別錯誤**

```bash
npx tsc --noEmit
```

Expected: 無錯誤

- [ ] **Step 7：commit**

```bash
git add src/middleware/rate-limit.ts src/routes/action-maker.ts src/index.ts test/middleware/rate-limit.test.ts
git commit -m "feat: add IP rate limit middleware with KV backend"
```

---

### Task 4：JWT Auth Middleware

**Files:**
- Create: `daodao-worker/src/middleware/auth.ts`
- Create: `daodao-worker/test/middleware/auth.test.ts`

JWT 驗證使用 `jose` library，驗證 HS256 簽名與過期時間。JWT secret 與 daodao-server 共用。

- [ ] **Step 1：寫失敗測試**

建立 `test/middleware/auth.test.ts`：

```typescript
import { SELF, env } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import { SignJWT } from "jose";

const JWT_SECRET = "test-secret-key-minimum-32-chars-long";

async function makeValidJWT(): Promise<string> {
  const secret = new TextEncoder().encode(JWT_SECRET);
  return new SignJWT({ sub: "user-123" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(secret);
}

async function makeExpiredJWT(): Promise<string> {
  const secret = new TextEncoder().encode(JWT_SECRET);
  return new SignJWT({ sub: "user-123" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(Math.floor(Date.now() / 1000) - 7200) // 2 小時前
    .setExpirationTime(Math.floor(Date.now() / 1000) - 3600) // 1 小時前過期
    .sign(secret);
}

describe("JWT Auth Middleware", () => {
  it("有效 JWT 應該通過驗證（200）", async () => {
    const token = await makeValidJWT();
    const res = await SELF.fetch("http://localhost/checkin/encourage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        practice_title: "每日冥想",
        checkin_count: 5,
      }),
    });
    // 不是 401 就算通過（AI 可能 500）
    expect(res.status).not.toBe(401);
  });

  it("無 Authorization header 應回傳 401", async () => {
    const res = await SELF.fetch("http://localhost/checkin/encourage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ practice_title: "冥想", checkin_count: 1 }),
    });
    expect(res.status).toBe(401);
    const body = await res.json() as Record<string, unknown>;
    expect(body.success).toBe(false);
    expect(body.error).toBe("Unauthorized");
  });

  it("過期的 JWT 應回傳 401", async () => {
    const token = await makeExpiredJWT();
    const res = await SELF.fetch("http://localhost/checkin/encourage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ practice_title: "冥想", checkin_count: 1 }),
    });
    expect(res.status).toBe(401);
  });

  it("無效簽名的 JWT 應回傳 401", async () => {
    const res = await SELF.fetch("http://localhost/checkin/encourage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyIn0.invalid-signature",
      },
      body: JSON.stringify({ practice_title: "冥想", checkin_count: 1 }),
    });
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 2：執行測試確認失敗**

```bash
npm test -- test/middleware/auth.test.ts
```

Expected: FAIL（/checkin/encourage 路由不存在）

- [ ] **Step 3：建立 `src/middleware/auth.ts`**

```typescript
import type { Context, Next } from "hono";
import { jwtVerify } from "jose";
import type { Env } from "../types";

export async function authMiddleware(
  c: Context<{ Bindings: Env }>,
  next: Next,
): Promise<void | Response> {
  const authHeader = c.req.header("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ success: false, error: "Unauthorized" }, 401);
  }

  const token = authHeader.slice(7);

  try {
    const secret = new TextEncoder().encode(c.env.JWT_SECRET);
    await jwtVerify(token, secret, { algorithms: ["HS256"] });
  } catch {
    return c.json({ success: false, error: "Unauthorized" }, 401);
  }

  await next();
}
```

- [ ] **Step 4：建立 checkin stub 路由 `src/routes/checkin.ts`（Task 7 完整實作）**

```typescript
import { Hono } from "hono";
import type { Env } from "../types";
import { authMiddleware } from "../middleware/auth";

export const checkinRouter = new Hono<{ Bindings: Env }>();

checkinRouter.post("/encourage", authMiddleware, async (c) => {
  // Stub：Task 7 完整實作
  return c.json({
    success: true,
    data: { message: "做得很好！", emoji: "🎉" },
  });
});
```

- [ ] **Step 5：在 `src/index.ts` 掛載 checkin 路由**

在 `src/index.ts` 新增：

```typescript
import { checkinRouter } from "./routes/checkin";

app.route("/checkin", checkinRouter);
```

- [ ] **Step 6：執行 auth 測試確認通過**

```bash
npm test -- test/middleware/auth.test.ts
```

Expected: PASS（4 個測試全過）

- [ ] **Step 7：執行所有測試確認沒有退步**

```bash
npm test
```

Expected: 所有測試 PASS

- [ ] **Step 8：commit**

```bash
git add src/middleware/auth.ts src/routes/checkin.ts src/index.ts test/middleware/auth.test.ts
git commit -m "feat: add JWT auth middleware for checkin endpoint"
```

---

## Chunk 3：AI 功能

### Task 5：共享領域型別

**Files:**
- Create: `daodao-worker/src/domain-types.ts`

將 `CategoryType`、`IAction`、`Locale` 集中在一個檔案，避免三處重複定義。

- [ ] **Step 1：建立 `src/domain-types.ts`**

```typescript
/** 行動分類（與 daodao-f2e 保持一致） */
export type CategoryType =
  | "interest"
  | "social"
  | "health"
  | "academic"
  | "work"
  | "finance";

/** 合法的 category 值集合（runtime 驗證用） */
export const VALID_CATEGORIES = new Set<string>([
  "interest",
  "social",
  "health",
  "academic",
  "work",
  "finance",
]);

/** 支援的語系 */
export type Locale = "zh-TW" | "en";

/** 行動等級 */
export type ActionLevel = "beginner" | "intermediate" | "advanced";

/** AI 生成的行動建議結構（與 daodao-f2e IAction 一致） */
export interface IAction {
  id: string;
  categoryId: CategoryType;
  level: ActionLevel;
  locked: boolean;
  title: string | null;
  description: string | null;
  duration: string | null;
  tip: string | null;
  rationale: string | null;
}
```

- [ ] **Step 2：確認 TypeScript 無型別錯誤**

```bash
npx tsc --noEmit
```

Expected: 無錯誤

- [ ] **Step 3：commit**

```bash
git add src/domain-types.ts
git commit -m "chore: add shared domain types (CategoryType, IAction, Locale)"
```

---

### Task 6：Langfuse 工具函數

**Files:**
- Create: `daodao-worker/src/utils/langfuse.ts`

Langfuse client 在 Cloudflare Workers 環境使用 fetch-based 模式（不依賴 Node.js）。每次 AI 呼叫建立一個 trace，包含 input/output/latency/metadata。

- [ ] **Step 1：建立 `src/utils/langfuse.ts`**

```typescript
import { Langfuse } from "langfuse";
import type { Env } from "../types";

/** 建立 Langfuse 實例（每個 request 一個） */
export function createLangfuse(env: Env): Langfuse {
  return new Langfuse({
    secretKey: env.LANGFUSE_SECRET_KEY,
    publicKey: env.LANGFUSE_PUBLIC_KEY,
    baseUrl: env.LANGFUSE_BASEURL,
    flushAt: 1,       // Workers 環境：每個事件立即 flush
    flushInterval: 0, // 不使用 interval timer（Workers 沒有持久 timer）
  });
}

export interface TraceOptions {
  name: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  latencyMs: number;
}

/** 建立並送出一個 trace，使用 waitUntil 不阻塞 response */
export function traceAICall(
  langfuse: Langfuse,
  options: TraceOptions,
  waitUntil: (promise: Promise<unknown>) => void,
): void {
  const trace = langfuse.trace({
    name: options.name,
    input: options.input,
    output: options.output,
    metadata: {
      ...options.metadata,
      latencyMs: options.latencyMs,
    },
  });

  // 非阻塞 flush：Worker 回應後仍可完成送出
  waitUntil(langfuse.flushAsync());
}

/** 對 IP 進行簡單 hash，避免儲存原始 IP */
export async function hashIp(ip: string): Promise<string> {
  const data = new TextEncoder().encode(ip);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .slice(0, 8)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
```

- [ ] **Step 2：確認 TypeScript 無型別錯誤**

```bash
npx tsc --noEmit
```

Expected: 無錯誤

- [ ] **Step 3：commit**

```bash
git add src/utils/langfuse.ts
git commit -m "feat: add Langfuse trace utility for AI observability"
```

---

### Task 7：Action Maker Prompt 與路由

**Files:**
- Create: `daodao-worker/src/prompts/action-maker.ts`
- Modify: `daodao-worker/src/routes/action-maker.ts`（從 stub 改為完整實作）
- Create: `daodao-worker/test/routes/action-maker.test.ts`

Action Maker 接受 category/topic/tags/nickname/locale，呼叫 Workers AI 生成 3 個 IAction（beginner/intermediate/advanced）。AI 必須回傳合法 JSON，否則回 500。

- [ ] **Step 1：寫失敗測試**

建立 `test/routes/action-maker.test.ts`：

```typescript
import { SELF, env } from "cloudflare:test";
import { describe, it, expect, beforeEach } from "vitest";

describe("POST /action-maker/generate", () => {
  beforeEach(async () => {
    // 清空 KV rate limit 記錄
    const keys = await env.CACHE.list();
    for (const key of keys.keys) {
      await env.CACHE.delete(key.name);
    }
  });

  it("合法請求應回傳 200 與 3 個 actions", async () => {
    const res = await SELF.fetch("http://localhost/action-maker/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "CF-Connecting-IP": "1.2.3.4",
      },
      body: JSON.stringify({
        category: "interest",
        topic: "學吉他",
        tags: ["音樂", "創作"],
        locale: "zh-TW",
      }),
    });

    // Workers AI 在測試環境可能不可用，允許 200 或 500
    // 重點是確認 rate limit、input validation、response shape 正確
    if (res.status === 200) {
      const body = await res.json() as Record<string, unknown>;
      expect(body.success).toBe(true);
      const data = body.data as { actions: unknown[] };
      expect(Array.isArray(data.actions)).toBe(true);
      expect(data.actions).toHaveLength(3);
      const actions = data.actions as Array<Record<string, unknown>>;
      expect(actions[0]?.level).toBe("beginner");
      expect(actions[1]?.level).toBe("intermediate");
      expect(actions[2]?.level).toBe("advanced");
    } else {
      expect(res.status).toBe(500);
    }
  });

  it("缺少必填欄位 category 應回傳 400", async () => {
    const res = await SELF.fetch("http://localhost/action-maker/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "CF-Connecting-IP": "1.2.3.4",
      },
      body: JSON.stringify({ topic: "學吉他" }), // 缺少 category
    });
    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, unknown>;
    expect(body.success).toBe(false);
    expect(body.error).toBe("InvalidInput");
  });

  it("缺少必填欄位 topic 應回傳 400", async () => {
    const res = await SELF.fetch("http://localhost/action-maker/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "CF-Connecting-IP": "1.2.3.4",
      },
      body: JSON.stringify({ category: "interest" }), // 缺少 topic
    });
    expect(res.status).toBe(400);
  });

  it("非支援的 locale 應 fallback 到 zh-TW（不報錯）", async () => {
    const res = await SELF.fetch("http://localhost/action-maker/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "CF-Connecting-IP": "1.2.3.4",
      },
      body: JSON.stringify({
        category: "health",
        topic: "跑步",
        locale: "ja", // 非支援 locale
      }),
    });
    // 不應該是 400（locale 非必填，fallback 就好）
    expect(res.status).not.toBe(400);
  });

  it("無效的 category 值應回傳 400", async () => {
    const res = await SELF.fetch("http://localhost/action-maker/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "CF-Connecting-IP": "1.2.3.4",
      },
      body: JSON.stringify({ category: "invalid-category", topic: "測試" }),
    });
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2：執行測試確認失敗**

```bash
npm test -- test/routes/action-maker.test.ts
```

Expected: FAIL（目前是 stub，沒有 input validation）

- [ ] **Step 3：建立 `src/prompts/action-maker.ts`**

```typescript
import type { CategoryType, Locale } from "../domain-types";

interface ActionMakerPromptInput {
  category: CategoryType;
  topic: string;
  tags?: string[];
  nickname?: string;
  locale: Locale;
}

const CATEGORY_LABELS_ZH: Record<CategoryType, string> = {
  interest: "興趣探索",
  social: "社交關係",
  health: "健康習慣",
  academic: "學習成長",
  work: "職業發展",
  finance: "財務管理",
};

const CATEGORY_LABELS_EN: Record<CategoryType, string> = {
  interest: "Interest Exploration",
  social: "Social Connections",
  health: "Health Habits",
  academic: "Learning & Growth",
  work: "Career Development",
  finance: "Financial Management",
};

export function buildActionMakerSystemPrompt(locale: Locale): string {
  if (locale === "en") {
    return `You are a personal development coach who creates personalized action suggestions.
You MUST respond with ONLY a valid JSON object, no markdown, no explanation.

The JSON must have this exact structure:
{
  "actions": [
    {
      "id": "<categoryId>-beginner-001",
      "categoryId": "<categoryId>",
      "level": "beginner",
      "locked": false,
      "title": "Short action title",
      "description": "Concrete actionable steps under 50 words",
      "duration": "about X minutes",
      "tip": "Practical tip under 30 words",
      "rationale": "Why this helps under 30 words"
    },
    {
      "id": "<categoryId>-intermediate-001",
      "categoryId": "<categoryId>",
      "level": "intermediate",
      "locked": false,
      "title": "Short action title",
      "description": "Concrete actionable steps under 50 words",
      "duration": "about X minutes",
      "tip": "Practical tip under 30 words",
      "rationale": "Why this helps under 30 words"
    },
    {
      "id": "<categoryId>-advanced-001",
      "categoryId": "<categoryId>",
      "level": "advanced",
      "locked": false,
      "title": "Short action title",
      "description": "Concrete actionable steps under 50 words",
      "duration": "about X minutes",
      "tip": "Practical tip under 30 words",
      "rationale": "Why this helps under 30 words"
    }
  ]
}

Rules:
- Always return exactly 3 actions (beginner, intermediate, advanced)
- duration format: "about X minutes" or "about X hours"
- title: concise and specific (under 20 words)
- description: actionable steps (under 50 words)
- tip: practical advice (under 30 words)
- rationale: why this helps (under 30 words)
- locked: always false`;
  }

  return `你是一位個人成長教練，負責生成個人化行動建議。
你必須只回傳合法的 JSON 物件，不得包含 markdown、解釋文字或任何其他內容。

JSON 必須符合以下結構：
{
  "actions": [
    {
      "id": "<categoryId>-beginner-001",
      "categoryId": "<categoryId>",
      "level": "beginner",
      "locked": false,
      "title": "簡潔具體的行動標題",
      "description": "可執行步驟描述，50 字以內",
      "duration": "約 X 分鐘",
      "tip": "實用技巧，30 字以內",
      "rationale": "說明為何有效，30 字以內"
    },
    {
      "id": "<categoryId>-intermediate-001",
      "categoryId": "<categoryId>",
      "level": "intermediate",
      "locked": false,
      "title": "簡潔具體的行動標題",
      "description": "可執行步驟描述，50 字以內",
      "duration": "約 X 分鐘",
      "tip": "實用技巧，30 字以內",
      "rationale": "說明為何有效，30 字以內"
    },
    {
      "id": "<categoryId>-advanced-001",
      "categoryId": "<categoryId>",
      "level": "advanced",
      "locked": false,
      "title": "簡潔具體的行動標題",
      "description": "可執行步驟描述，50 字以內",
      "duration": "約 X 分鐘",
      "tip": "實用技巧，30 字以內",
      "rationale": "說明為何有效，30 字以內"
    }
  ]
}

規則：
- 固定回傳 3 個行動（beginner、intermediate、advanced 各一）
- duration 格式：「約 X 分鐘」或「約 X 小時」
- title：簡潔具體（20 字以內）
- description：可執行步驟（50 字以內）
- tip：實用技巧（30 字以內）
- rationale：解釋為何有效（30 字以內）
- locked：固定為 false`;
}

export function buildActionMakerUserPrompt(
  input: ActionMakerPromptInput,
): string {
  const { category, topic, tags, nickname, locale } = input;
  const categoryLabels =
    locale === "en" ? CATEGORY_LABELS_EN : CATEGORY_LABELS_ZH;
  const categoryLabel = categoryLabels[category];

  if (locale === "en") {
    const nicknameStr = nickname ? ` for ${nickname}` : "";
    const tagsStr =
      tags && tags.length > 0 ? `\nUser interests: ${tags.join(", ")}` : "";
    return `Generate personalized action suggestions${nicknameStr}.
Category: ${categoryLabel} (categoryId: "${category}")
Topic: ${topic}${tagsStr}

Respond with ONLY the JSON.`;
  }

  const nicknameStr = nickname ? `用戶暱稱：${nickname}\n` : "";
  const tagsStr =
    tags && tags.length > 0 ? `\n用戶興趣標籤：${tags.join("、")}` : "";
  return `請為以下情境生成個人化行動建議。
${nicknameStr}分類：${categoryLabel}（categoryId: "${category}"）
主題：${topic}${tagsStr}

請只回傳 JSON，不要有其他內容。`;
}
```

- [ ] **Step 4：完整實作 `src/routes/action-maker.ts`**

```typescript
import { Hono } from "hono";
import type { Env } from "../types";
import { createRateLimiter } from "../middleware/rate-limit";
import {
  buildActionMakerSystemPrompt,
  buildActionMakerUserPrompt,
} from "../prompts/action-maker";
import { createLangfuse, traceAICall, hashIp } from "../utils/langfuse";
import {
  type CategoryType,
  type IAction,
  type Locale,
  VALID_CATEGORIES,
} from "../domain-types";

interface AIResponse {
  actions: IAction[];
}

export const actionMakerRouter = new Hono<{ Bindings: Env }>();

actionMakerRouter.post("/generate", createRateLimiter("action-maker"), async (c) => {
  // 解析 body
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json(
      { success: false, error: "InvalidInput", message: "Invalid JSON body" },
      400,
    );
  }

  if (typeof body !== "object" || body === null) {
    return c.json(
      { success: false, error: "InvalidInput", message: "Body must be an object" },
      400,
    );
  }

  const { category, topic, tags, nickname, locale } = body as Record<
    string,
    unknown
  >;

  // 驗證必填欄位
  if (typeof category !== "string" || !VALID_CATEGORIES.has(category)) {
    return c.json(
      {
        success: false,
        error: "InvalidInput",
        message:
          "category must be one of: interest, social, health, academic, work, finance",
      },
      400,
    );
  }

  if (typeof topic !== "string" || topic.trim() === "") {
    return c.json(
      { success: false, error: "InvalidInput", message: "topic is required" },
      400,
    );
  }

  // locale fallback
  const resolvedLocale: Locale =
    locale === "en" || locale === "zh-TW" ? locale : "zh-TW";

  const resolvedTags = Array.isArray(tags)
    ? (tags as unknown[]).filter((t) => typeof t === "string").map(String)
    : undefined;

  const resolvedNickname =
    typeof nickname === "string" ? nickname : undefined;

  // 建立 prompt
  const systemPrompt = buildActionMakerSystemPrompt(resolvedLocale);
  const userPrompt = buildActionMakerUserPrompt({
    category: category as CategoryType,
    topic: topic.trim(),
    tags: resolvedTags,
    nickname: resolvedNickname,
    locale: resolvedLocale,
  });

  const langfuse = createLangfuse(c.env);
  const startTime = Date.now();

  // 呼叫 Workers AI
  let aiResult: AIResponse;
  try {
    const response = await c.env.AI.run("@cf/qwen/qwen3-30b-a3b-fp8", {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 1500,
    });

    const text =
      typeof response === "object" && response !== null && "response" in response
        ? String((response as { response: unknown }).response)
        : String(response);

    // 從 AI 回應中提取 JSON（處理 code fence、前後多餘文字等情況）
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON object found in AI response");
    }
    aiResult = JSON.parse(jsonMatch[0]) as AIResponse;

    if (!Array.isArray(aiResult.actions) || aiResult.actions.length !== 3) {
      throw new Error("AI returned invalid actions array");
    }
  } catch (err) {
    const latencyMs = Date.now() - startTime;
    const ip = c.req.header("CF-Connecting-IP") ?? "unknown";

    traceAICall(
      langfuse,
      {
        name: "action-maker.generate",
        input: { category, topic, tags: resolvedTags, locale: resolvedLocale },
        output: { error: String(err) },
        metadata: { ipHash: await hashIp(ip), success: false },
        latencyMs,
      },
      c.executionCtx.waitUntil.bind(c.executionCtx),
    );

    return c.json(
      { success: false, error: "AIError", message: "Failed to generate actions" },
      500,
    );
  }

  const latencyMs = Date.now() - startTime;
  const ip = c.req.header("CF-Connecting-IP") ?? "unknown";

  traceAICall(
    langfuse,
    {
      name: "action-maker.generate",
      input: { category, topic, tags: resolvedTags, locale: resolvedLocale },
      output: { actions: aiResult.actions },
      metadata: { ipHash: await hashIp(ip), locale: resolvedLocale },
      latencyMs,
    },
    c.executionCtx.waitUntil.bind(c.executionCtx),
  );

  return c.json({ success: true, data: { actions: aiResult.actions } });
});
```

- [ ] **Step 5：執行 action-maker 路由測試**

```bash
npm test -- test/routes/action-maker.test.ts
```

Expected: PASS（注意：AI 呼叫在測試環境可能失敗，測試已考慮到這點）

- [ ] **Step 6：執行所有測試確認無退步**

```bash
npm test
```

Expected: 所有測試 PASS

- [ ] **Step 7：commit**

```bash
git add src/prompts/action-maker.ts src/routes/action-maker.ts test/routes/action-maker.test.ts
git commit -m "feat: implement action-maker generate endpoint with AI and rate limiting"
```

---

### Task 8：Checkin Prompt 與路由

**Files:**
- Create: `daodao-worker/src/prompts/checkin.ts`
- Modify: `daodao-worker/src/routes/checkin.ts`（從 stub 改為完整實作）
- Create: `daodao-worker/test/routes/checkin.test.ts`

Checkin 鼓勵端點接受 practice_title/note/checkin_count，需要 JWT 驗證，回傳鼓勵訊息（50-100 字）和 emoji。

- [ ] **Step 1：寫失敗測試**

建立 `test/routes/checkin.test.ts`：

```typescript
import { SELF } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import { SignJWT } from "jose";

const JWT_SECRET = "test-secret-key-minimum-32-chars-long";

async function makeValidJWT(): Promise<string> {
  const secret = new TextEncoder().encode(JWT_SECRET);
  return new SignJWT({ sub: "user-123" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(secret);
}

describe("POST /checkin/encourage", () => {
  it("合法請求（含 JWT）應回傳 200 或 500（AI）", async () => {
    const token = await makeValidJWT();
    const res = await SELF.fetch("http://localhost/checkin/encourage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        practice_title: "每日冥想",
        note: "今天靜心了 20 分鐘，感覺很好",
        checkin_count: 7,
      }),
    });

    if (res.status === 200) {
      const body = await res.json() as Record<string, unknown>;
      expect(body.success).toBe(true);
      const data = body.data as { message: string; emoji: string };
      expect(typeof data.message).toBe("string");
      expect(data.message.length).toBeGreaterThan(0);
      expect(typeof data.emoji).toBe("string");
      expect(data.emoji.length).toBeGreaterThan(0);
    } else {
      expect(res.status).toBe(500);
    }
  });

  it("缺少 JWT 應回傳 401", async () => {
    const res = await SELF.fetch("http://localhost/checkin/encourage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ practice_title: "冥想", checkin_count: 1 }),
    });
    expect(res.status).toBe(401);
  });

  it("缺少必填欄位 practice_title 應回傳 400", async () => {
    const token = await makeValidJWT();
    const res = await SELF.fetch("http://localhost/checkin/encourage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ checkin_count: 1 }), // 缺少 practice_title
    });
    expect(res.status).toBe(400);
  });

  it("checkin_count 必須是數字", async () => {
    const token = await makeValidJWT();
    const res = await SELF.fetch("http://localhost/checkin/encourage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        practice_title: "冥想",
        checkin_count: "not-a-number",
      }),
    });
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2：執行測試確認失敗**

```bash
npm test -- test/routes/checkin.test.ts
```

Expected: FAIL（stub 沒有 input validation）

- [ ] **Step 3：建立 `src/prompts/checkin.ts`**

```typescript
interface CheckinPromptInput {
  practice_title: string;
  note?: string;
  checkin_count: number;
}

export function buildCheckinSystemPrompt(): string {
  return `你是一位溫暖的個人成長夥伴，負責為用戶的打卡行為生成鼓勵訊息。
你必須只回傳合法的 JSON 物件，不得包含 markdown 或解釋文字。

JSON 結構：
{
  "message": "鼓勵訊息（50-100 字，繁體中文，溫暖有力，針對具體行為給予肯定）",
  "emoji": "一個最能代表這個實踐精神的 emoji"
}

規則：
- message 長度：50-100 字（不包含 emoji）
- 根據 checkin_count 調整語氣：次數少時給予鼓勵起步，次數多時給予堅持肯定
- emoji 由你根據情境自由選取，選一個最貼切的
- 只回傳 JSON，不要其他內容`;
}

export function buildCheckinUserPrompt(input: CheckinPromptInput): string {
  const { practice_title, note, checkin_count } = input;
  const noteStr = note ? `\n打卡備註：${note}` : "";
  const countContext =
    checkin_count === 1
      ? "（這是他第一次打卡！）"
      : checkin_count < 7
        ? `（已累積 ${checkin_count} 次打卡）`
        : checkin_count < 30
          ? `（已持續打卡 ${checkin_count} 次，相當不錯！）`
          : `（已堅持打卡 ${checkin_count} 次，非常厲害！）`;

  return `用戶完成了一次打卡 ${countContext}
實踐名稱：${practice_title}${noteStr}

請給他一段鼓勵訊息，回傳 JSON。`;
}
```

- [ ] **Step 4：完整實作 `src/routes/checkin.ts`**

```typescript
import { Hono } from "hono";
import type { Env } from "../types";
import { authMiddleware } from "../middleware/auth";
import {
  buildCheckinSystemPrompt,
  buildCheckinUserPrompt,
} from "../prompts/checkin";
import { createLangfuse, traceAICall } from "../utils/langfuse";

interface CheckinResponse {
  message: string;
  emoji: string;
}

export const checkinRouter = new Hono<{ Bindings: Env }>();

checkinRouter.post("/encourage", authMiddleware, async (c) => {
  // 解析 body
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json(
      { success: false, error: "InvalidInput", message: "Invalid JSON body" },
      400,
    );
  }

  if (typeof body !== "object" || body === null) {
    return c.json(
      { success: false, error: "InvalidInput", message: "Body must be an object" },
      400,
    );
  }

  const { practice_title, note, checkin_count } = body as Record<
    string,
    unknown
  >;

  // 驗證必填欄位
  if (typeof practice_title !== "string" || practice_title.trim() === "") {
    return c.json(
      {
        success: false,
        error: "InvalidInput",
        message: "practice_title is required",
      },
      400,
    );
  }

  if (typeof checkin_count !== "number" || !Number.isFinite(checkin_count)) {
    return c.json(
      {
        success: false,
        error: "InvalidInput",
        message: "checkin_count must be a number",
      },
      400,
    );
  }

  const resolvedNote =
    typeof note === "string" ? note.trim() : undefined;

  // 建立 prompt
  const systemPrompt = buildCheckinSystemPrompt();
  const userPrompt = buildCheckinUserPrompt({
    practice_title: practice_title.trim(),
    note: resolvedNote,
    checkin_count,
  });

  const langfuse = createLangfuse(c.env);
  const startTime = Date.now();

  // 呼叫 Workers AI
  let aiResult: CheckinResponse;
  try {
    const response = await c.env.AI.run("@cf/qwen/qwen3-30b-a3b-fp8", {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 400,
    });

    const text =
      typeof response === "object" && response !== null && "response" in response
        ? String((response as { response: unknown }).response)
        : String(response);

    // 從 AI 回應中提取 JSON（處理 code fence、前後多餘文字等情況）
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON object found in AI response");
    }
    aiResult = JSON.parse(jsonMatch[0]) as CheckinResponse;

    if (typeof aiResult.message !== "string" || typeof aiResult.emoji !== "string") {
      throw new Error("AI returned invalid response structure");
    }
  } catch (err) {
    const latencyMs = Date.now() - startTime;

    traceAICall(
      langfuse,
      {
        name: "checkin.encourage",
        input: { practice_title, checkin_count, hasNote: !!resolvedNote },
        output: { error: String(err) },
        metadata: { success: false },
        latencyMs,
      },
      c.executionCtx.waitUntil.bind(c.executionCtx),
    );

    return c.json(
      { success: false, error: "AIError", message: "Failed to generate encouragement" },
      500,
    );
  }

  const latencyMs = Date.now() - startTime;

  traceAICall(
    langfuse,
    {
      name: "checkin.encourage",
      input: { practice_title, checkin_count, hasNote: !!resolvedNote },
      output: { message: aiResult.message, emoji: aiResult.emoji },
      metadata: { checkin_count },
      latencyMs,
    },
    c.executionCtx.waitUntil.bind(c.executionCtx),
  );

  return c.json({
    success: true,
    data: { message: aiResult.message, emoji: aiResult.emoji },
  });
});
```

- [ ] **Step 5：執行 checkin 路由測試**

```bash
npm test -- test/routes/checkin.test.ts
```

Expected: PASS

- [ ] **Step 6：執行所有測試確認無退步**

```bash
npm test
```

Expected: 所有測試 PASS

- [ ] **Step 7：確認 TypeScript 無型別錯誤**

```bash
npx tsc --noEmit
```

Expected: 無錯誤

- [ ] **Step 8：commit**

```bash
git add src/prompts/checkin.ts src/routes/checkin.ts test/routes/checkin.test.ts
git commit -m "feat: implement checkin encourage endpoint with JWT auth and AI"
```

---

## Chunk 4：前端整合

### Task 9：更新前端 use-generate-actions.ts

**Files:**
- Modify: `daodao-f2e/packages/features/action-maker/src/hooks/use-generate-actions.ts`

移除 mock 模式，改為真實呼叫 daodao-worker。AI 失敗時 fallback 靜態資料（現有邏輯保留）。

- [ ] **Step 1：閱讀現有 hook 的完整實作**

```bash
cat /Users/xiaoxu/Projects/daodao/daodao-f2e/packages/features/action-maker/src/hooks/use-generate-actions.ts
```

（確認理解現有 interface、state 管理、abort controller 邏輯）

- [ ] **Step 2：確認 WORKER_URL 環境變數的設定位置**

```bash
grep -r "WORKER_URL\|NEXT_PUBLIC_WORKER\|worker.daodao" /Users/xiaoxu/Projects/daodao/daodao-f2e --include="*.ts" --include="*.tsx" --include="*.env*" -l
```

Expected: 找到相關的環境變數設定文件，或確認需要新增

- [ ] **Step 3：確認 .env 文件結構**

```bash
ls /Users/xiaoxu/Projects/daodao/daodao-f2e/apps/web/.env* 2>/dev/null
cat /Users/xiaoxu/Projects/daodao/daodao-f2e/apps/web/.env.example 2>/dev/null || echo "找不到 .env.example"
```

- [ ] **Step 4：在 f2e 新增環境變數（如果不存在）**

若 `apps/web/.env.local` 中沒有 `NEXT_PUBLIC_WORKER_URL`，新增：

```bash
echo "NEXT_PUBLIC_WORKER_URL=http://localhost:8787" >> /Users/xiaoxu/Projects/daodao/daodao-f2e/apps/web/.env.local
```

（本機開發時指向 `wrangler dev` 的本機 port；production 用 `https://worker.daodao.so`）

- [ ] **Step 5：更新 `use-generate-actions.ts`**

將現有的 mock 替換為真實 API 呼叫。保留 `getFallbackActions` 作為 AI 失敗時的 fallback，保留 `isFallback` 狀態。

```typescript
"use client";

import { useEffect, useRef, useState } from "react";
import type { CategoryType, IAction } from "../types";
import { getFallbackActions } from "../utils/fallback-actions";

const WORKER_URL =
  process.env.NEXT_PUBLIC_WORKER_URL ?? "https://worker.daodao.so";

interface UseGenerateActionsInput {
  category: CategoryType;
  topic: string;
  tags?: string[];
  nickname?: string;
  locale?: "zh-TW" | "en";
}

interface UseGenerateActionsReturn {
  actions: IAction[] | null;
  isLoading: boolean;
  error: Error | null;
  isFallback: boolean;
}

/**
 * Hook to call daodao-worker to generate personalized action suggestions.
 * Falls back to static data on API failure.
 */
export function useGenerateActions(
  input: UseGenerateActionsInput | null,
): UseGenerateActionsReturn {
  const [actions, setActions] = useState<IAction[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isFallback, setIsFallback] = useState(false);
  const hasRequested = useRef(false);

  useEffect(() => {
    if (!input || hasRequested.current) return;
    hasRequested.current = true;

    const controller = new AbortController();

    const generate = async () => {
      setIsLoading(true);
      setError(null);
      setIsFallback(false);

      try {
        const response = await fetch(`${WORKER_URL}/action-maker/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category: input.category,
            topic: input.topic,
            tags: input.tags,
            nickname: input.nickname,
            locale: input.locale ?? "zh-TW",
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Worker returned ${response.status}`);
        }

        const json = (await response.json()) as {
          success: boolean;
          data: { actions: IAction[] };
        };

        if (!json.success || !Array.isArray(json.data?.actions)) {
          throw new Error("Invalid response from worker");
        }

        setActions(json.data.actions);
        setIsFallback(false);
      } catch (err) {
        if (controller.signal.aborted) return;

        // AI 失敗：fallback 靜態資料
        const fallback = getFallbackActions(input.category);
        if (fallback.length > 0) {
          setActions(fallback);
          setIsFallback(true);
        } else {
          setError(
            err instanceof Error ? err : new Error("Failed to generate actions"),
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    generate();

    return () => {
      controller.abort();
      hasRequested.current = false;
    };
  }, [input]);

  return { actions, isLoading, error, isFallback };
}
```

- [ ] **Step 6：確認 TypeScript 無型別錯誤**

```bash
cd /Users/xiaoxu/Projects/daodao/daodao-f2e
npx tsc --noEmit --project packages/features/action-maker/tsconfig.json 2>/dev/null || npx tsc --noEmit
```

Expected: 無型別錯誤

- [ ] **Step 7：本機驗證（wrangler dev + 前端）**

開兩個終端機：

終端機 1（Worker）：
```bash
cd /Users/xiaoxu/Projects/daodao/daodao-worker
npx wrangler dev
```
Expected: Worker 在 http://localhost:8787 啟動

終端機 2（測試 action-maker）：
```bash
curl -X POST http://localhost:8787/action-maker/generate \
  -H "Content-Type: application/json" \
  -d '{"category":"interest","topic":"學吉他","locale":"zh-TW"}'
```
Expected: 回傳包含 3 個 actions 的 JSON（或 500 如果本機沒有 Workers AI）

- [ ] **Step 8：commit（在 daodao-f2e repo 中）**

```bash
cd /Users/xiaoxu/Projects/daodao/daodao-f2e
git add packages/features/action-maker/src/hooks/use-generate-actions.ts
git commit -m "feat: connect action-maker to daodao-worker API"
```

---

## 部署步驟（計畫外、手動操作）

以下為部署前需完成的 Cloudflare 設定，不包含在自動化任務中：

1. **建立 KV Namespaces**
   ```bash
   wrangler kv:namespace create CACHE --env preview
   wrangler kv:namespace create CACHE --env production
   ```
   將回傳的 ID 填入 `wrangler.toml` 中 `REPLACE_WITH_*_KV_ID` 的位置。

2. **在 Langfuse dashboard（`https://langfuse.daodao.so`）建立兩個 Project**
   - `daodao-worker-preview`
   - `daodao-worker-production`

   各自取得 Secret Key 與 Public Key。

3. **設定 Secrets**

   preview 環境（填入 `daodao-worker-preview` 的 key）：
   ```bash
   wrangler secret put JWT_SECRET --env preview
   wrangler secret put LANGFUSE_SECRET_KEY --env preview
   wrangler secret put LANGFUSE_PUBLIC_KEY --env preview
   ```

   production 環境（填入 `daodao-worker-production` 的 key）：
   ```bash
   wrangler secret put JWT_SECRET --env production
   wrangler secret put LANGFUSE_SECRET_KEY --env production
   wrangler secret put LANGFUSE_PUBLIC_KEY --env production
   ```

4. **部署**
   ```bash
   wrangler deploy --env preview
   wrangler deploy --env production
   ```
