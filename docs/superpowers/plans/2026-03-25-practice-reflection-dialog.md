# Practice 完成反思對話 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Practice 完成後，用戶可點擊按鈕開啟 AI 三輪反思對話，最終產出個人金句存入後端。

**Architecture:** Worker 處理所有 AI 邏輯（session 存 KV，prompt 模板存 KV），Server 負責 `reflectionQuote` 欄位的 CRUD，前端用 SheetManager/DialogManager 做彈窗 UI。三輪對話狀態由 Worker KV session 管理。

**Tech Stack:** Cloudflare Workers (Hono + zod-openapi), Express + Prisma, Next.js + React, Radix Dialog/Sheet primitives, motion/react

**Spec:** `docs/superpowers/specs/2026-03-25-practice-reflection-dialog-design.md`

---

## File Structure

### daodao-storage
- Create: `schema/725_add_reflection_quote_to_practices.sql`
- Create: `schema/726_create_table_reflection_sessions.sql`

### daodao-server
- Modify: `prisma/schema.prisma` — 加 `reflection_quote` 欄位
- Modify: `src/types/practice.types.ts` — PracticeEntity 加欄位（UpdatePracticeRequest 由 validator 推導）
- Modify: `src/validators/practice.validators.ts` — updatePracticeSchema 加驗證
- Modify: `src/services/practice.service.ts` — update() 支援新欄位
- Create: `src/routes/reflection-session.routes.ts` — reflection session CRUD
- Create: `src/services/reflection-session.service.ts` — reflection session 商業邏輯
- Create: `src/validators/reflection-session.validators.ts` — 驗證 schema

### daodao-worker
- Create: `src/utils/prompt-manager.ts` — 通用 prompt 管理（KV 存取 + fallback + 變數替換）
- Create: `src/routes/prompts.ts` — 通用 prompt CRUD API（admin-only）
- Create: `src/routes/reflection.ts` — reflection endpoints
- Create: `src/prompts/reflection.ts` — reflection prompt 預設模板 + builder
- Modify: `src/prompts/action-maker.ts` — 改用 prompt-manager 載入（KV 優先、fallback 預設）
- Modify: `src/prompts/refine.ts` — 同上
- Modify: `src/schemas.ts` — 加 reflection + prompt 管理 schemas
- Modify: `src/index.ts` — 註冊 reflection + prompts routes

### daodao-f2e
- Modify: `packages/api/src/services/practice.ts` — PracticeSummary type 加 reflectionQuote
- Modify: `packages/api/src/services/practice-hooks.ts` — 加 useUpdateReflectionQuote hook
- Create: `apps/product/src/components/practice/summary/reflection-dialog/use-reflection.ts`
- Create: `apps/product/src/components/practice/summary/reflection-dialog/reflection-dialog.tsx`
- Create: `apps/product/src/components/practice/summary/reflection-dialog/reflection-round.tsx`
- Create: `apps/product/src/components/practice/summary/reflection-dialog/reflection-loading.tsx`
- Create: `apps/product/src/components/practice/summary/reflection-dialog/reflection-result.tsx`
- Create: `apps/product/src/components/practice/summary/reflection-dialog/index.ts`
- Modify: `apps/product/src/components/practice/summary/practice-summary-page.tsx` — 加按鈕 + prefetch

---

## Task 1: Database Migration (daodao-storage)

**Files:**
- Create: `daodao-storage/schema/725_add_reflection_quote_to_practices.sql`

- [ ] **Step 1: Write migration SQL — reflection_quote column**

Create `daodao-storage/schema/725_add_reflection_quote_to_practices.sql`:

```sql
-- Add reflection_quote column for storing user's reflection quote after AI dialog
ALTER TABLE "practices" ADD COLUMN "reflection_quote" VARCHAR(100);
```

- [ ] **Step 2: Write migration SQL — reflection_sessions table**

Create `daodao-storage/schema/726_create_table_reflection_sessions.sql`:

```sql
-- Create reflection_sessions table for storing full AI reflection dialog history
CREATE TABLE "reflection_sessions" (
  "id" SERIAL PRIMARY KEY,
  "external_id" UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  "practice_id" INT NOT NULL REFERENCES "practices"("id"),
  "user_id" INT NOT NULL REFERENCES "users"("id"),
  "rounds" JSONB NOT NULL,
  "quote" VARCHAR(100),
  "status" VARCHAR(20) NOT NULL DEFAULT 'completed',
  "created_at" TIMESTAMPTZ DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX "idx_reflection_sessions_practice_id" ON "reflection_sessions"("practice_id");
CREATE INDEX "idx_reflection_sessions_user_id" ON "reflection_sessions"("user_id");
```

- [ ] **Step 3: Commit**

```bash
cd /Users/xiaoxu/Projects/daodao/daodao-storage
git add schema/725_add_reflection_quote_to_practices.sql schema/726_create_table_reflection_sessions.sql
git commit -m "feat(storage): add reflection_quote column and reflection_sessions table"
```

---

## Task 2: Server — Prisma Schema + Types (daodao-server)

**Files:**
- Modify: `daodao-server/prisma/schema.prisma`
- Modify: `daodao-server/src/types/practice.types.ts`

- [ ] **Step 1: Add fields to Prisma schema**

In `prisma/schema.prisma`, find the `practices` model, after the existing `reflection` field add:

```prisma
  reflection_quote     String?   @db.VarChar(100)
  reflection_sessions  reflection_sessions[]
```

Also add a new model at the end of the schema:

```prisma
model reflection_sessions {
  id            Int       @id @default(autoincrement())
  external_id   String    @unique @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  practice_id   Int
  user_id       Int
  rounds        Json
  quote         String?   @db.VarChar(100)
  status        String    @default("completed") @db.VarChar(20)
  created_at    DateTime? @default(now()) @db.Timestamptz(6)
  updated_at    DateTime? @db.Timestamptz(6)

  practices     practices @relation(fields: [practice_id], references: [id])
  users         users     @relation(fields: [user_id], references: [id])

  @@index([practice_id])
  @@index([user_id])
}
```

- [ ] **Step 2: Regenerate Prisma client**

```bash
cd /Users/xiaoxu/Projects/daodao/daodao-server
npx prisma generate
```

Expected: Prisma Client generated successfully

- [ ] **Step 3: Update PracticeEntity type**

In `src/types/practice.types.ts`, add to the `PracticeEntity` interface:

```typescript
reflectionQuote?: string | null;
```

- [ ] **Step 4: Note on UpdatePracticeRequest**

`UpdatePracticeRequest` is derived from `z.infer<typeof updatePracticeSchema>` in validators. Adding `reflectionQuote` to the Zod schema (Task 3) will automatically update the type. No manual change needed in `practice.types.ts` for the request type.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma src/types/practice.types.ts
git commit -m "feat(server): add reflectionQuote field to practice types and prisma schema"
```

---

## Task 3: Server — Validator + Service (daodao-server)

**Files:**
- Modify: `daodao-server/src/validators/practice.validators.ts`
- Modify: `daodao-server/src/services/practice.service.ts`

- [ ] **Step 1: Add validation to updatePracticeSchema**

In `src/validators/practice.validators.ts`, find `updatePracticeSchema` and add:

```typescript
reflectionQuote: z.string().max(100, "金句最多 100 字").optional(),
```

- [ ] **Step 2: Update practice service update()**

In `src/services/practice.service.ts`, find the `update()` method. In the Prisma `updateData` mapping, add:

```typescript
reflection_quote: data.reflectionQuote,
```

Also ensure the response mapping includes:

```typescript
reflectionQuote: practice.reflection_quote,
```

- [ ] **Step 3: Verify the server compiles**

```bash
cd /Users/xiaoxu/Projects/daodao/daodao-server
npm run build
```

Expected: No type errors

- [ ] **Step 4: Commit**

```bash
git add src/validators/practice.validators.ts src/services/practice.service.ts
git commit -m "feat(server): support reflectionQuote in practice update endpoint"
```

---

## Task 3.5: Server — Reflection Sessions API (daodao-server)

**Files:**
- Create: `daodao-server/src/routes/reflection-session.routes.ts`
- Create: `daodao-server/src/services/reflection-session.service.ts`
- Create: `daodao-server/src/validators/reflection-session.validators.ts`
- Modify: `daodao-server/src/index.ts` (or app setup) — 註冊路由

- [ ] **Step 1: Create validator**

```typescript
// src/validators/reflection-session.validators.ts
import { z } from "zod";

export const createReflectionSessionSchema = z.object({
  practiceId: z.string().uuid(),
  rounds: z.array(
    z.object({
      round: z.number().int().min(1).max(3),
      message: z.string(),
      options: z.array(z.string()),
      selection: z.string().max(200),
    })
  ).length(3),
  quote: z.string().max(100),
});

export type CreateReflectionSessionRequest = z.infer<typeof createReflectionSessionSchema>;
```

- [ ] **Step 2: Create service**

```typescript
// src/services/reflection-session.service.ts
import { PrismaClient } from "../../generated/prisma";

const prisma = new PrismaClient();

export async function createReflectionSession(
  userId: number,
  data: {
    practiceId: string;
    rounds: Array<{ round: number; message: string; options: string[]; selection: string }>;
    quote: string;
  }
) {
  // Find practice by external_id
  const practice = await prisma.practices.findUnique({
    where: { external_id: data.practiceId },
  });

  if (!practice) throw new Error("Practice not found");
  if (practice.user_id !== userId) throw new Error("Not authorized");

  return prisma.reflection_sessions.create({
    data: {
      practice_id: practice.id,
      user_id: userId,
      rounds: data.rounds,
      quote: data.quote,
      status: "completed",
    },
  });
}
```

- [ ] **Step 3: Create route**

```typescript
// src/routes/reflection-session.routes.ts
import { Router } from "express";
import { createReflectionSessionSchema } from "../validators/reflection-session.validators";
import { createReflectionSession } from "../services/reflection-session.service";
// import auth middleware per existing pattern

const router = Router();

// POST /api/v1/reflection-sessions
router.post("/", /* authMiddleware, */ async (req, res) => {
  const parsed = createReflectionSessionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error });
  }

  try {
    const userId = req.user.id; // from auth middleware
    const session = await createReflectionSession(userId, parsed.data);
    return res.status(201).json({ success: true, data: { id: session.external_id } });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

export default router;
```

- [ ] **Step 4: Register route in app setup**

Follow the existing route registration pattern to add:

```typescript
app.use("/api/v1/reflection-sessions", reflectionSessionRouter);
```

- [ ] **Step 5: Verify build**

```bash
cd /Users/xiaoxu/Projects/daodao/daodao-server
npm run build
```

- [ ] **Step 6: Commit**

```bash
git add src/routes/reflection-session.routes.ts src/services/reflection-session.service.ts src/validators/reflection-session.validators.ts
git commit -m "feat(server): add reflection sessions API for storing dialog history"
```

---

## Task 4: Worker — 通用 Prompt Manager (daodao-worker)

**Files:**
- Create: `daodao-worker/src/utils/prompt-manager.ts`

- [ ] **Step 1: Create prompt-manager utility**

```typescript
// src/utils/prompt-manager.ts

/**
 * 通用 Prompt 管理
 * - KV key pattern: prompt:{feature}:{name}
 * - 支援 {{variable}} 模板變數替換
 * - Fallback 到 hardcoded 預設值
 */

export interface PromptTemplate {
  template: string;
  variables: string[];
}

/**
 * 從 KV 載入 prompt，不存在時使用 fallback
 */
export async function loadPrompt(
  kv: KVNamespace,
  feature: string,
  name: string,
  fallback: string
): Promise<string> {
  const key = `prompt:${feature}:${name}`;
  const stored = await kv.get(key);
  return stored ?? fallback;
}

/**
 * 替換 {{variable}} 模板變數
 */
export function renderTemplate(
  template: string,
  variables: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    return variables[key] ?? match;
  });
}

/**
 * 載入 prompt 並替換變數（一步完成）
 */
export async function loadAndRenderPrompt(
  kv: KVNamespace,
  feature: string,
  name: string,
  fallback: string,
  variables: Record<string, string>
): Promise<string> {
  const template = await loadPrompt(kv, feature, name, fallback);
  return renderTemplate(template, variables);
}

/**
 * 儲存 prompt 到 KV
 */
export async function savePrompt(
  kv: KVNamespace,
  feature: string,
  name: string,
  template: string
): Promise<void> {
  const key = `prompt:${feature}:${name}`;
  await kv.put(key, template);
}

/**
 * 列出某功能下所有 prompt keys
 */
export async function listPrompts(
  kv: KVNamespace,
  feature: string
): Promise<string[]> {
  const prefix = `prompt:${feature}:`;
  const list = await kv.list({ prefix });
  return list.keys.map((k) => k.name.replace(prefix, ""));
}

/**
 * 列出所有已註冊功能
 */
export async function listFeatures(
  kv: KVNamespace
): Promise<{ feature: string; prompts: string[] }[]> {
  const list = await kv.list({ prefix: "prompt:" });
  const featureMap = new Map<string, string[]>();
  for (const key of list.keys) {
    const parts = key.name.replace("prompt:", "").split(":");
    const feature = parts[0];
    const name = parts.slice(1).join(":");
    if (!featureMap.has(feature)) featureMap.set(feature, []);
    featureMap.get(feature)!.push(name);
  }
  return Array.from(featureMap.entries()).map(([feature, prompts]) => ({
    feature,
    prompts,
  }));
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/xiaoxu/Projects/daodao/daodao-worker
git add src/utils/prompt-manager.ts
git commit -m "feat(worker): add generic prompt manager with KV storage and template rendering"
```

---

## Task 5: Worker — Prompt CRUD API (daodao-worker)

**Files:**
- Create: `daodao-worker/src/routes/prompts.ts`
- Modify: `daodao-worker/src/index.ts`

- [ ] **Step 1: Create prompts route (admin-only)**

```typescript
// src/routes/prompts.ts
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { z } from "zod";
import type { Env } from "../types";
import { verifyJWT } from "../middleware/auth";
import {
  loadPrompt,
  savePrompt,
  listPrompts,
  listFeatures,
} from "../utils/prompt-manager";

const prompts = new OpenAPIHono<{ Bindings: Env }>();

// All prompt management routes require JWT auth
prompts.use("/*", verifyJWT);

// GET /prompts/features — list all registered features
const listFeaturesRoute = createRoute({
  method: "get",
  path: "/features",
  tags: ["Prompts"],
  summary: "List all prompt features",
  responses: {
    200: {
      description: "Feature list",
      content: {
        "application/json": {
          schema: z.object({
            success: z.literal(true),
            data: z.array(
              z.object({
                feature: z.string(),
                prompts: z.array(z.string()),
              })
            ),
          }),
        },
      },
    },
  },
});

prompts.openapi(listFeaturesRoute, async (c) => {
  const features = await listFeatures(c.env.CACHE);
  return c.json({ success: true as const, data: features }, 200);
});

// GET /prompts?feature={feature} — list prompts for a feature
const listPromptsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Prompts"],
  summary: "List prompts for a feature",
  request: {
    query: z.object({ feature: z.string() }),
  },
  responses: {
    200: {
      description: "Prompt list",
      content: {
        "application/json": {
          schema: z.object({
            success: z.literal(true),
            data: z.object({
              feature: z.string(),
              prompts: z.record(z.string(), z.string()),
            }),
          }),
        },
      },
    },
  },
});

prompts.openapi(listPromptsRoute, async (c) => {
  const { feature } = c.req.valid("query");
  const names = await listPrompts(c.env.CACHE, feature);
  const result: Record<string, string> = {};
  for (const name of names) {
    result[name] = await loadPrompt(c.env.CACHE, feature, name, "");
  }
  return c.json(
    { success: true as const, data: { feature, prompts: result } },
    200
  );
});

// PUT /prompts — update a single prompt
const updatePromptRoute = createRoute({
  method: "put",
  path: "/",
  tags: ["Prompts"],
  summary: "Update a prompt template",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            feature: z.string().min(1),
            name: z.string().min(1),
            template: z.string().min(1),
          }),
        },
      },
    },
  },
  responses: {
    200: { description: "Prompt updated" },
  },
});

prompts.openapi(updatePromptRoute, async (c) => {
  const { feature, name, template } = c.req.valid("json");
  await savePrompt(c.env.CACHE, feature, name, template);
  return c.json({ success: true as const }, 200);
});

export { prompts };
```

- [ ] **Step 2: Register in index.ts**

In `src/index.ts`, add:

```typescript
import { prompts } from "./routes/prompts";
app.route("/prompts", prompts);
```

- [ ] **Step 3: Commit**

```bash
git add src/routes/prompts.ts src/index.ts
git commit -m "feat(worker): add generic prompt CRUD API (admin-only, JWT protected)"
```

---

## Task 6: Worker — Schemas (daodao-worker)

**Files:**
- Modify: `daodao-worker/src/schemas.ts`

- [ ] **Step 1: Add reflection schemas**

In `src/schemas.ts`, add the following schemas:

```typescript
// ── Reflection ──

export const ReflectionStartRequestSchema = z
  .object({
    practiceId: z.string().min(1),
    summaryData: z.object({
      userName: z.string().min(1).max(50),
      practiceName: z.string().min(1).max(50),
      checkInCount: z.number().int().min(1),
      topMoods: z.array(
        z.object({
          mood: z.string(),
          count: z.number().int(),
        })
      ),
      topNotes: z.array(z.string()),
      startDate: z.string(),
      endDate: z.string(),
    }),
  })
  .openapi("ReflectionStartRequest");

export const ReflectionNextRequestSchema = z
  .object({
    sessionId: z.string().uuid(),
    selection: z.union([
      z.string().max(200),
      z.object({ custom: z.string().max(200) }),
    ]),
  })
  .openapi("ReflectionNextRequest");

export const ReflectionRoundResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({
      sessionId: z.string().uuid(),
      round: z.number().int().min(1).max(3),
      message: z.string(),
      options: z.array(z.string().max(30)).min(3).max(4),
      allowCustom: z.literal(true),
    }),
  })
  .openapi("ReflectionRoundResponse");

// AI output validation schema (used inside Worker to validate LLM response)
export const ReflectionAIOutputSchema = z.object({
  message: z.string().min(1),
  options: z.array(z.string().max(30)).min(3).max(4),
});
```

- [ ] **Step 2: Verify types compile**

```bash
cd /Users/xiaoxu/Projects/daodao/daodao-worker
npm run typecheck
```

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/schemas.ts
git commit -m "feat(worker): add reflection request/response schemas"
```

---

## Task 7: Worker — Reflection Prompt Templates (daodao-worker)

**Files:**
- Create: `daodao-worker/src/prompts/reflection.ts`

- [ ] **Step 1: Create prompt builder file**

```typescript
// src/prompts/reflection.ts
import { loadAndRenderPrompt } from "../utils/prompt-manager";

interface ReflectionPromptInput {
  userName: string;
  practiceName: string;
  checkInCount: number;
  topMoods: { mood: string; count: number }[];
  topNotes: string[];
  startDate: string;
  endDate: string;
}

interface RoundContext {
  round: number;
  summaryData: ReflectionPromptInput;
  previousSelections: string[];
}

const MOOD_LABELS: Record<string, string> = {
  give_up: "想放棄",
  frustrated: "挫折",
  bored: "無聊",
  neutral: "普通",
  good: "不錯",
  happy: "開心",
};

function formatMoods(moods: { mood: string; count: number }[]): string {
  return moods
    .map((m) => `${MOOD_LABELS[m.mood] ?? m.mood}（${m.count} 次）`)
    .join("、");
}

function formatNotes(notes: string[]): string {
  if (notes.length === 0) return "（無筆記）";
  return notes.map((n, i) => `${i + 1}. 「${n}」`).join("\n");
}

const DEFAULT_SYSTEM_PROMPT = `你是一位溫暖的反思引導者。你的任務是引導用戶回顧他們完成的實踐旅程。

規則：
- 一律使用繁體中文
- 回應必須是 JSON 格式：{"message": "...", "options": ["...", "...", "..."]}
- message 是你對用戶說的話，要溫暖、具體、引用用戶的數據
- options 是 3-4 個選項，每個最多 30 字
- 不要使用 emoji
- 不要重複前面輪次已經出現過的選項`;

export async function buildReflectionSystemPrompt(kv: KVNamespace): Promise<string> {
  return loadAndRenderPrompt(kv, "reflection", "system", DEFAULT_SYSTEM_PROMPT, {});
}

export async function buildReflectionUserPrompt(kv: KVNamespace, ctx: RoundContext): Promise<string> {
  const { round, summaryData, previousSelections } = ctx;
  const { userName, practiceName, checkInCount, topMoods, topNotes, startDate, endDate } =
    summaryData;

  // 共用的變數，供模板替換
  const variables: Record<string, string> = {
    userName,
    practiceName,
    checkInCount: String(checkInCount),
    topMoods: formatMoods(topMoods),
    topNotes: formatNotes(topNotes),
    startDate,
    endDate,
    previousSelection1: previousSelections[0] ?? "",
    previousSelection2: previousSelections[1] ?? "",
  };

  const DEFAULTS: Record<number, string> = {
    1: `用戶：{{userName}}
實踐：「{{practiceName}}」
期間：{{startDate}} ~ {{endDate}}
打卡次數：{{checkInCount}}
常見心情：{{topMoods}}
筆記摘錄：
{{topNotes}}

這是第一輪「感受層」。
從上述數據中找到亮點（連續打卡、心情變化、筆記內容），生成一段溫暖的引言和 3-4 個「感受」選項。
選項要涵蓋不同感受方向（正面驚喜、克服困難、自我發現等）。

回傳 JSON：{"message": "引言", "options": ["選項1", "選項2", "選項3"]}`,
    2: `用戶：{{userName}}
實踐：「{{practiceName}}」
期間：{{startDate}} ~ {{endDate}}
打卡次數：{{checkInCount}}
常見心情：{{topMoods}}
筆記摘錄：
{{topNotes}}

用戶在第一輪選了：「{{previousSelection1}}」

這是第二輪「原因層」。
根據用戶的選擇和筆記內容，追問這個感受背後的原因。
找到筆記中具體的片段引用，讓用戶感覺你真的看過他的記錄。
生成 3-4 個「原因」選項。

回傳 JSON：{"message": "追問", "options": ["選項1", "選項2", "選項3"]}`,
    3: `用戶：{{userName}}
實踐：「{{practiceName}}」
期間：{{startDate}} ~ {{endDate}}
打卡次數：{{checkInCount}}
常見心情：{{topMoods}}
筆記摘錄：
{{topNotes}}

用戶的反思歷程：
- 第一輪感受：「{{previousSelection1}}」
- 第二輪原因：「{{previousSelection2}}」

這是第三輪「信念層」。
根據用戶的兩輪選擇，收斂成一句有力量的「實踐金句」。
金句要簡短有力（15-25 字），能代表用戶這段旅程的核心體悟。
生成 3-4 個金句選項。

回傳 JSON：{"message": "收斂語", "options": ["金句1", "金句2", "金句3"]}`,
  };

  return loadAndRenderPrompt(
    kv,
    "reflection",
    `round${round}`,
    DEFAULTS[round] ?? DEFAULTS[1],
    variables
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/prompts/reflection.ts
git commit -m "feat(worker): add reflection prompt templates with KV-backed prompt manager"
```

---

## Task 8: Worker — Reflection Route Handler (daodao-worker)

**Files:**
- Create: `daodao-worker/src/routes/reflection.ts`
- Modify: `daodao-worker/src/index.ts`

- [ ] **Step 1: Create reflection route file**

```typescript
// src/routes/reflection.ts
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { z } from "zod";
import type { Env } from "../types";
import {
  ReflectionStartRequestSchema,
  ReflectionNextRequestSchema,
  ReflectionRoundResponseSchema,
  ReflectionAIOutputSchema,
} from "../schemas";
import {
  buildReflectionSystemPrompt,
  buildReflectionUserPrompt,
} from "../prompts/reflection";
import { createLangfuse, traceAICall } from "../utils/langfuse";
import { hashIp } from "../utils/langfuse";
import { createRateLimiter } from "../middleware/rate-limit";

const AI_MODEL = "@cf/qwen/qwen3-30b-a3b-fp8";
const SESSION_TTL_SECONDS = 30 * 60; // 30 minutes
const MAX_RETRIES = 1;
const rateLimiter = createRateLimiter("reflection");

interface SessionData {
  practiceId: string;
  summaryData: z.infer<typeof ReflectionStartRequestSchema>["summaryData"];
  currentRound: number;
  selections: string[];
}

const reflection = new OpenAPIHono<{ Bindings: Env }>();

// ── Rate limiting ──
reflection.use("/*", rateLimiter);

// ── Helper: parse AI response ──
function parseAIResponse(raw: unknown): string {
  if (typeof raw === "string") return raw;
  if (typeof raw === "object" && raw !== null) {
    const r = raw as Record<string, unknown>;
    if ("response" in r) return String(r.response);
    if ("choices" in r && Array.isArray(r.choices)) {
      const choices = r.choices as Array<{ message?: { content?: string } }>;
      return choices[0]?.message?.content ?? "";
    }
  }
  return JSON.stringify(raw);
}

function extractJSON(text: string): unknown {
  const cleaned = text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON found in AI response");
    return JSON.parse(match[0]);
  }
}

// ── Fallback responses ──
const FALLBACKS: Record<number, { message: string; options: string[] }> = {
  1: {
    message: "恭喜你完成了這段實踐旅程！回顧這段時間，你最大的感受是？",
    options: ["比想像中有趣", "比想像中難，但撐下來了", "發現自己比想像中更有毅力"],
  },
  2: {
    message: "是什麼讓你有這樣的感受？",
    options: ["反覆嘗試，試到對為止", "看了某個教學才恍然大悟", "跟別人討論後才想通"],
  },
  3: {
    message: "如果要送一句話給未來挑戰新事物的自己：",
    options: ["不懂沒關係，做了就會懂", "撐過最難的那段，後面就順了", "比起天賦，我更相信累積"],
  },
};

// ── Helper: call AI with retry + fallback ──
async function generateRound(
  env: Env,
  ctx: { round: number; summaryData: SessionData["summaryData"]; selections: string[] }
): Promise<{ message: string; options: string[] }> {
  const systemPrompt = await buildReflectionSystemPrompt(env.CACHE);
  const userPrompt = await buildReflectionUserPrompt(env.CACHE, {
    round: ctx.round,
    summaryData: ctx.summaryData,
    previousSelections: ctx.selections,
  });

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const raw = await env.AI.run(AI_MODEL, {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 800,
      });

      const text = parseAIResponse(raw);
      const parsed = extractJSON(text);
      const validated = ReflectionAIOutputSchema.parse(parsed);

      // Simple traditional Chinese check (reject if mostly simplified)
      const hasTraditional = /[繁體實踐練習發現經歷認為]/u.test(validated.message);
      if (!hasTraditional && attempt < MAX_RETRIES) continue;

      return validated;
    } catch {
      if (attempt === MAX_RETRIES) {
        return FALLBACKS[ctx.round] ?? FALLBACKS[1];
      }
    }
  }

  return FALLBACKS[ctx.round] ?? FALLBACKS[1];
}

// ── POST /reflection/start ──
const startRoute = createRoute({
  method: "post",
  path: "/start",
  tags: ["Reflection"],
  summary: "Start a reflection dialog session",
  request: {
    body: {
      content: { "application/json": { schema: ReflectionStartRequestSchema } },
    },
  },
  responses: {
    200: {
      description: "First round generated",
      content: { "application/json": { schema: ReflectionRoundResponseSchema } },
    },
    500: { description: "AI generation failed" },
  },
});

reflection.openapi(startRoute, async (c) => {
  const body = c.req.valid("json");
  const sessionId = crypto.randomUUID();

  const langfuse = createLangfuse(c.env);
  const startTime = Date.now();
  const ip = c.req.header("CF-Connecting-IP") ?? "unknown";

  try {
    const result = await generateRound(c.env, {
      round: 1,
      summaryData: body.summaryData,
      selections: [],
    });

    // Store session in KV
    const session: SessionData = {
      practiceId: body.practiceId,
      summaryData: body.summaryData,
      currentRound: 1,
      selections: [],
    };
    await c.env.CACHE.put(`reflection:${sessionId}`, JSON.stringify(session), {
      expirationTtl: SESSION_TTL_SECONDS,
    });

    // Trace
    const latencyMs = Date.now() - startTime;
    const ipHash = await hashIp(ip);
    traceAICall(
      langfuse,
      {
        name: "reflection.start",
        input: { practiceId: body.practiceId, summaryData: body.summaryData },
        output: result,
        metadata: { ipHash, model: AI_MODEL, success: true, round: 1 },
        latencyMs,
      },
      c.executionCtx.waitUntil.bind(c.executionCtx)
    );

    return c.json(
      {
        success: true as const,
        data: {
          sessionId,
          round: 1 as const,
          message: result.message,
          options: result.options,
          allowCustom: true as const,
        },
      },
      200
    );
  } catch (err) {
    const latencyMs = Date.now() - startTime;
    const ipHash = await hashIp(ip);
    traceAICall(
      langfuse,
      {
        name: "reflection.start",
        input: { practiceId: body.practiceId },
        output: { error: String(err) },
        metadata: { ipHash, model: AI_MODEL, success: false },
        latencyMs,
      },
      c.executionCtx.waitUntil.bind(c.executionCtx)
    );
    return c.json({ success: false, error: "AIError", message: "Failed to generate reflection" }, 500);
  }
});

// ── POST /reflection/next ──
const nextRoute = createRoute({
  method: "post",
  path: "/next",
  tags: ["Reflection"],
  summary: "Continue to next reflection round",
  request: {
    body: {
      content: { "application/json": { schema: ReflectionNextRequestSchema } },
    },
  },
  responses: {
    200: {
      description: "Next round generated",
      content: { "application/json": { schema: ReflectionRoundResponseSchema } },
    },
    400: { description: "Invalid session or already completed" },
    500: { description: "AI generation failed" },
  },
});

reflection.openapi(nextRoute, async (c) => {
  const body = c.req.valid("json");

  // Load session from KV
  const sessionRaw = await c.env.CACHE.get(`reflection:${body.sessionId}`);
  if (!sessionRaw) {
    return c.json({ success: false, error: "SessionExpired", message: "Session expired or not found" }, 400);
  }

  const session: SessionData = JSON.parse(sessionRaw);

  if (session.currentRound >= 3) {
    return c.json({ success: false, error: "AlreadyCompleted", message: "Reflection already completed" }, 400);
  }

  // Record selection
  const selectionText =
    typeof body.selection === "string" ? body.selection : body.selection.custom;
  session.selections.push(selectionText);
  session.currentRound += 1;

  const langfuse = createLangfuse(c.env);
  const startTime = Date.now();
  const ip = c.req.header("CF-Connecting-IP") ?? "unknown";

  try {
    const result = await generateRound(c.env, {
      round: session.currentRound,
      summaryData: session.summaryData,
      selections: session.selections,
    });

    // Update session in KV
    await c.env.CACHE.put(`reflection:${body.sessionId}`, JSON.stringify(session), {
      expirationTtl: SESSION_TTL_SECONDS,
    });

    const latencyMs = Date.now() - startTime;
    const ipHash = await hashIp(ip);
    traceAICall(
      langfuse,
      {
        name: "reflection.next",
        input: { sessionId: body.sessionId, selection: selectionText, round: session.currentRound },
        output: result,
        metadata: { ipHash, model: AI_MODEL, success: true, round: session.currentRound },
        latencyMs,
      },
      c.executionCtx.waitUntil.bind(c.executionCtx)
    );

    return c.json(
      {
        success: true as const,
        data: {
          sessionId: body.sessionId,
          round: session.currentRound as 1 | 2 | 3,
          message: result.message,
          options: result.options,
          allowCustom: true as const,
        },
      },
      200
    );
  } catch (err) {
    const latencyMs = Date.now() - startTime;
    const ipHash = await hashIp(ip);
    traceAICall(
      langfuse,
      {
        name: "reflection.next",
        input: { sessionId: body.sessionId, round: session.currentRound },
        output: { error: String(err) },
        metadata: { ipHash, model: AI_MODEL, success: false },
        latencyMs,
      },
      c.executionCtx.waitUntil.bind(c.executionCtx)
    );
    return c.json({ success: false, error: "AIError", message: "Failed to generate next round" }, 500);
  }
});

export { reflection };
```

- [ ] **Step 2: Register route in index.ts**

In `src/index.ts`, add:

```typescript
import { reflection } from "./routes/reflection";

// After existing route registrations:
app.route("/reflection", reflection);
```

- [ ] **Step 3: Verify typecheck**

```bash
cd /Users/xiaoxu/Projects/daodao/daodao-worker
npm run typecheck
```

- [ ] **Step 4: Verify dev server starts**

```bash
npm run dev
```

Expected: Server starts on port 8787, `/reflection/start` and `/reflection/next` visible in Swagger

- [ ] **Step 5: Commit**

```bash
git add src/routes/reflection.ts src/index.ts
git commit -m "feat(worker): add reflection start/next endpoints with KV session management"
```

---

## Task 9: Frontend — API Types + Hook (daodao-f2e)

**Files:**
- Modify: `packages/api/src/services/practice.ts`
- Modify: `packages/api/src/services/practice-hooks.ts`

- [ ] **Step 1: Update PracticeSummary type**

In `packages/api/src/services/practice.ts`, add to the `PracticeSummary` interface:

```typescript
/** User's reflection quote from AI dialog (null if not completed) */
reflectionQuote?: string | null;
```

Also update the `getPracticeSummary()` function to map `practice.reflectionQuote` (or `practice.reflection_quote`) into the returned `PracticeSummary` object. Find where the summary object is constructed and add `reflectionQuote: practice.reflectionQuote ?? null`.

- [ ] **Step 2: Add useUpdateReflectionQuote hook**

In `packages/api/src/services/practice-hooks.ts`, add (follow the existing SWR + `useMutate` pattern, reference `useArchivePractice`):

```typescript
export function useUpdateReflectionQuote(practiceId: string) {
  const mutate = useMutate();

  const saveReflectionQuote = async (reflectionQuote: string) => {
    const response = await updatePractice(practiceId, {
      reflectionQuote,
    } as UpdatePracticeRequestType);
    // Revalidate practice data
    await mutate((key) => typeof key === "string" && key.includes(`/practices`));
    return response;
  };

  return { saveReflectionQuote };
}
```

- [ ] **Step 3: Verify types compile**

```bash
cd /Users/xiaoxu/Projects/daodao/daodao-f2e
npx turbo build --filter=@daodao/api
```

- [ ] **Step 4: Commit**

```bash
git add packages/api/src/services/practice.ts packages/api/src/services/practice-hooks.ts
git commit -m "feat(api): add reflectionQuote to PracticeSummary type and update hook"
```

---

## Task 10: Frontend — use-reflection Hook (daodao-f2e)

**Files:**
- Create: `apps/product/src/components/practice/summary/reflection-dialog/use-reflection.ts`

- [ ] **Step 1: Create the hook**

```typescript
// use-reflection.ts
"use client";

import { useCallback, useRef, useState } from "react";
import type { PracticeSummary } from "@daodao/api";
import { useUpdateReflectionQuote } from "@daodao/api/services/practice-hooks";

const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL ?? "https://worker.daodao.so";

export type ReflectionState =
  | "idle"
  | "loading"
  | "round"
  | "error"
  | "result"
  | "saving"
  | "saved";

interface RoundData {
  round: number;
  message: string;
  options: string[];
}

interface UseReflectionReturn {
  state: ReflectionState;
  currentRound: RoundData | null;
  quote: string | null;
  isLoading: boolean;
  error: string | null;
  start: () => Promise<void>;
  select: (selection: string | { custom: string }) => Promise<void>;
  save: () => Promise<void>;
  retry: () => Promise<void>;
}

export function useReflection(
  practiceId: string,
  summary: PracticeSummary
): UseReflectionReturn {
  const [state, setState] = useState<ReflectionState>("idle");
  const [currentRound, setCurrentRound] = useState<RoundData | null>(null);
  const [quote, setQuote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sessionIdRef = useRef<string | null>(null);
  const lastActionRef = useRef<(() => Promise<void>) | null>(null);
  const roundsHistoryRef = useRef<Array<{
    round: number;
    message: string;
    options: string[];
    selection: string;
  }>>([]);

  const { saveReflectionQuote } = useUpdateReflectionQuote(practiceId);
  const prefetchedRef = useRef(false);

  const start = useCallback(async () => {
    if (prefetchedRef.current) return; // Prevent double-prefetch in StrictMode
    prefetchedRef.current = true;
    setState("loading");
    setError(null);
    lastActionRef.current = start;

    try {
      const response = await fetch(`${WORKER_URL}/reflection/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          practiceId,
          summaryData: {
            userName: summary.userName,
            practiceName: summary.practiceName,
            checkInCount: summary.checkInCount,
            topMoods: summary.topMoods.map((m) => ({
              mood: m.mood,
              count: m.count,
            })),
            topNotes: summary.topNotes,
            startDate: summary.startDate,
            endDate: summary.endDate,
          },
        }),
      });

      if (!response.ok) throw new Error(`Worker returned ${response.status}`);

      const json = await response.json() as {
        success: boolean;
        data: { sessionId: string; round: number; message: string; options: string[] };
      };

      if (!json.success || !json.data) throw new Error("Invalid response");

      sessionIdRef.current = json.data.sessionId;
      setCurrentRound({
        round: json.data.round,
        message: json.data.message,
        options: json.data.options,
      });
      setState("round");
    } catch (err) {
      setError(err instanceof Error ? err.message : "發生錯誤");
      setState("error");
    }
  }, [practiceId, summary]);

  const select = useCallback(
    async (selection: string | { custom: string }) => {
      if (!sessionIdRef.current || !currentRound) return;

      const selectionText =
        typeof selection === "string" ? selection : selection.custom;

      // Record this round in history
      roundsHistoryRef.current.push({
        round: currentRound.round,
        message: currentRound.message,
        options: currentRound.options,
        selection: selectionText,
      });

      const isLastRound = currentRound.round === 3;

      if (isLastRound) {
        // Round 3 selection IS the quote
        setQuote(selectionText);
        setState("result");
        return;
      }

      setState("loading");
      setError(null);

      const doSelect = async () => {
        try {
          const response = await fetch(`${WORKER_URL}/reflection/next`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionId: sessionIdRef.current,
              selection,
            }),
          });

          if (!response.ok) throw new Error(`Worker returned ${response.status}`);

          const json = await response.json() as {
            success: boolean;
            data: { sessionId: string; round: number; message: string; options: string[] };
            error?: string;
          };

          if (!json.success) {
            if (json.error === "SessionExpired") {
              // Session expired, restart
              await start();
              return;
            }
            throw new Error(json.error ?? "Invalid response");
          }

          setCurrentRound({
            round: json.data.round,
            message: json.data.message,
            options: json.data.options,
          });
          setState("round");
        } catch (err) {
          setError(err instanceof Error ? err.message : "發生錯誤");
          setState("error");
        }
      };

      lastActionRef.current = doSelect;
      await doSelect();
    },
    [currentRound, start]
  );

  const save = useCallback(async () => {
    if (!quote) return;

    setState("saving");
    setError(null);
    lastActionRef.current = save;

    try {
      // Save quote to practice + save full dialog history
      await Promise.all([
        saveReflectionQuote(quote),
        fetch("/api/v1/reflection-sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            practiceId,
            rounds: roundsHistoryRef.current,
            quote,
          }),
        }),
      ]);
      setState("saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "儲存失敗");
      setState("error");
    }
  }, [quote, practiceId, saveReflectionQuote]);

  const retry = useCallback(async () => {
    if (lastActionRef.current) {
      await lastActionRef.current();
    }
  }, []);

  return {
    state,
    currentRound,
    quote,
    isLoading: state === "loading",
    error,
    start,
    select,
    save,
    retry,
  };
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/xiaoxu/Projects/daodao/daodao-f2e
git add apps/product/src/components/practice/summary/reflection-dialog/use-reflection.ts
git commit -m "feat(product): add useReflection hook for AI reflection dialog"
```

---

## Task 11: Frontend — Dialog UI Components (daodao-f2e)

**Files:**
- Create: `apps/product/src/components/practice/summary/reflection-dialog/reflection-loading.tsx`
- Create: `apps/product/src/components/practice/summary/reflection-dialog/reflection-round.tsx`
- Create: `apps/product/src/components/practice/summary/reflection-dialog/reflection-result.tsx`

- [ ] **Step 1: Create reflection-loading.tsx**

```tsx
// reflection-loading.tsx
"use client";

export function ReflectionLoading() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12">
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-2.5 w-2.5 rounded-full bg-logo-cyan animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
      <p className="text-sm text-text-gray">AI 正在思考...</p>
    </div>
  );
}
```

- [ ] **Step 2: Create reflection-round.tsx**

```tsx
// reflection-round.tsx
"use client";

import { useState } from "react";
import { cn } from "@daodao/ui/lib/utils";

interface ReflectionRoundProps {
  round: number;
  message: string;
  options: string[];
  onSelect: (selection: string | { custom: string }) => void;
}

export function ReflectionRound({ round, message, options, onSelect }: ReflectionRoundProps) {
  const [customText, setCustomText] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const maxLength = round === 3 ? 100 : 200;

  return (
    <div className="flex flex-col gap-4">
      {/* Progress dots */}
      <div className="flex justify-center gap-2">
        {[1, 2, 3].map((r) => (
          <div
            key={r}
            className={cn(
              "h-2 w-2 rounded-full transition-colors",
              r === round ? "bg-logo-cyan" : "bg-gray-200"
            )}
          />
        ))}
      </div>

      {/* AI message */}
      <p className="text-sm text-text-dark leading-relaxed whitespace-pre-line">{message}</p>

      {/* Options */}
      <div className="flex flex-col gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            className="w-full rounded-lg border border-gray-200 px-4 py-3 text-left text-sm text-text-dark transition-colors hover:border-logo-cyan hover:bg-cyan-50 active:bg-cyan-100"
            onClick={() => onSelect(option)}
          >
            {option}
          </button>
        ))}

        {/* Custom input toggle */}
        {!showCustomInput ? (
          <button
            type="button"
            className="w-full rounded-lg border border-dashed border-gray-300 px-4 py-3 text-left text-sm text-text-gray transition-colors hover:border-gray-400"
            onClick={() => setShowCustomInput(true)}
          >
            自己寫...
          </button>
        ) : (
          <div className="flex flex-col gap-2">
            <textarea
              className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm text-text-dark placeholder:text-text-gray focus:border-logo-cyan focus:outline-none resize-none"
              placeholder="寫下你的想法..."
              maxLength={maxLength}
              rows={2}
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              autoFocus
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-gray">
                {customText.length}/{maxLength}
              </span>
              <button
                type="button"
                className="rounded-lg bg-logo-cyan px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                disabled={customText.trim().length === 0}
                onClick={() => onSelect({ custom: customText.trim() })}
              >
                確認
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create reflection-result.tsx**

```tsx
// reflection-result.tsx
"use client";

interface ReflectionResultProps {
  quote: string;
  isSaving: boolean;
  isSaved: boolean;
  onSave: () => void;
  onClose: () => void;
}

export function ReflectionResult({ quote, isSaving, isSaved, onSave, onClose }: ReflectionResultProps) {
  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <p className="text-sm text-text-gray">你的實踐金句</p>

      <div className="w-full rounded-xl bg-cyan-50 px-6 py-8">
        <p className="text-center text-lg font-semibold text-text-dark leading-relaxed">
          「{quote}」
        </p>
      </div>

      <div className="flex w-full gap-3">
        <button
          type="button"
          className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-text-dark"
          onClick={onClose}
        >
          關閉
        </button>
        <button
          type="button"
          className="flex-1 rounded-lg bg-logo-cyan px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          disabled={isSaving || isSaved}
          onClick={onSave}
        >
          {isSaved ? "已儲存" : isSaving ? "儲存中..." : "儲存金句"}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/product/src/components/practice/summary/reflection-dialog/reflection-loading.tsx
git add apps/product/src/components/practice/summary/reflection-dialog/reflection-round.tsx
git add apps/product/src/components/practice/summary/reflection-dialog/reflection-result.tsx
git commit -m "feat(product): add reflection dialog UI components (loading, round, result)"
```

---

## Task 12: Frontend — Main Dialog + Index (daodao-f2e)

**Files:**
- Create: `apps/product/src/components/practice/summary/reflection-dialog/reflection-dialog.tsx`
- Create: `apps/product/src/components/practice/summary/reflection-dialog/index.ts`

- [ ] **Step 1: Create reflection-dialog.tsx**

Reference `apps/product/src/components/check-in/form/check-in-sheet.tsx` for the pattern. Use `useIsMobile()` to switch between Sheet and Dialog.

```tsx
// reflection-dialog.tsx
"use client";

import type { PracticeSummary } from "@daodao/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@daodao/ui/components/animate-ui/components/radix/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@daodao/ui/components/animate-ui/components/radix/sheet";
import { useIsMobile } from "@daodao/shared/hooks/use-media-query";
import { useReflection } from "./use-reflection";
import { ReflectionLoading } from "./reflection-loading";
import { ReflectionRound } from "./reflection-round";
import { ReflectionResult } from "./reflection-result";

interface ReflectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  practiceId: string;
  summary: PracticeSummary;
}

function ReflectionContent({
  practiceId,
  summary,
  onClose,
}: {
  practiceId: string;
  summary: PracticeSummary;
  onClose: () => void;
}) {
  const { state, currentRound, quote, error, select, save, retry } =
    useReflection(practiceId, summary);

  if (state === "loading") {
    return <ReflectionLoading />;
  }

  if (state === "error") {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <p className="text-sm text-text-gray">{error ?? "發生錯誤"}</p>
        <button
          type="button"
          className="rounded-lg bg-logo-cyan px-6 py-2 text-sm font-medium text-white"
          onClick={retry}
        >
          再試一次
        </button>
      </div>
    );
  }

  if ((state === "result" || state === "saving" || state === "saved") && quote) {
    return (
      <ReflectionResult
        quote={quote}
        isSaving={state === "saving"}
        isSaved={state === "saved"}
        onSave={save}
        onClose={onClose}
      />
    );
  }

  if (state === "round" && currentRound) {
    return (
      <ReflectionRound
        round={currentRound.round}
        message={currentRound.message}
        options={currentRound.options}
        onSelect={select}
      />
    );
  }

  return null;
}

export function ReflectionDialog({
  open,
  onOpenChange,
  practiceId,
  summary,
}: ReflectionDialogProps) {
  const isMobile = useIsMobile();

  const handleClose = () => onOpenChange(false);

  const title = "AI 想跟你聊聊";
  const description = `回顧「${summary.practiceName}」的實踐旅程`;

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription>{description}</SheetDescription>
          </SheetHeader>
          <div className="px-1 pb-6">
            <ReflectionContent
              practiceId={practiceId}
              summary={summary}
              onClose={handleClose}
            />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <ReflectionContent
          practiceId={practiceId}
          summary={summary}
          onClose={handleClose}
        />
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Create index.ts**

```typescript
// index.ts
export { ReflectionDialog } from "./reflection-dialog";
export { useReflection } from "./use-reflection";
```

- [ ] **Step 3: Commit**

```bash
git add apps/product/src/components/practice/summary/reflection-dialog/
git commit -m "feat(product): add ReflectionDialog main component with responsive Sheet/Dialog"
```

---

## Task 13: Frontend — Integrate into Summary Page (daodao-f2e)

**Files:**
- Modify: `apps/product/src/components/practice/summary/practice-summary-page.tsx`

- [ ] **Step 1: Add reflection button and dialog to summary page**

In `practice-summary-page.tsx`:

1. Import the dialog and hook:
```tsx
import { ReflectionDialog, useReflection } from "./reflection-dialog";
```

2. Add state for dialog open:
```tsx
const [reflectionOpen, setReflectionOpen] = useState(false);
```

3. Prefetch on mount (only if no existing quote):
```tsx
const reflection = useReflection(summary.practiceId, summary);

useEffect(() => {
  if (!summary.reflectionQuote) {
    reflection.start(); // prefetch round 1
  }
}, []); // eslint-disable-line react-hooks/exhaustive-deps
```

4. Add button/quote display (after the summary card, before share buttons):
```tsx
{summary.reflectionQuote ? (
  <div className="w-full rounded-xl bg-cyan-50 px-6 py-4 text-center">
    <p className="text-xs text-text-gray mb-1">我的實踐金句</p>
    <p className="text-base font-semibold text-text-dark">「{summary.reflectionQuote}」</p>
  </div>
) : (
  <button
    type="button"
    className="w-full rounded-xl border border-logo-cyan bg-white px-6 py-4 text-center text-sm font-medium text-logo-cyan transition-colors hover:bg-cyan-50"
    onClick={() => setReflectionOpen(true)}
  >
    AI 想跟你聊聊這段旅程 ✨
  </button>
)}

<ReflectionDialog
  open={reflectionOpen}
  onOpenChange={setReflectionOpen}
  practiceId={summary.practiceId}
  summary={summary}
/>
```

- [ ] **Step 2: Verify dev server renders correctly**

```bash
cd /Users/xiaoxu/Projects/daodao/daodao-f2e
npx turbo dev --filter=product
```

Navigate to a completed practice's summary page. Verify:
- Button appears if no reflectionQuote
- Quote block appears if reflectionQuote exists
- Clicking button opens dialog
- Dialog is Sheet on mobile, Dialog on desktop

- [ ] **Step 3: Commit**

```bash
git add apps/product/src/components/practice/summary/practice-summary-page.tsx
git commit -m "feat(product): integrate reflection dialog into practice summary page"
```

---

## Task 14: End-to-End Verification

- [ ] **Step 1: Run full build**

```bash
cd /Users/xiaoxu/Projects/daodao/daodao-f2e
npx turbo build
```

Expected: No build errors

- [ ] **Step 2: Run lint**

```bash
npx turbo lint
```

Expected: No lint errors in modified/created files

- [ ] **Step 3: Manual E2E test**

1. Open a completed practice's summary page
2. Verify "AI 想跟你聊聊" button appears
3. Click button → dialog opens with round 1 (should be instant due to prefetch)
4. Select an option → loading → round 2 appears
5. Select an option → loading → round 3 appears
6. Select a quote → result page shows
7. Click "儲存金句" → saves and dialog closes
8. Refresh page → button replaced by quote display
9. Test on mobile viewport → Sheet instead of Dialog
10. Test "自己寫" flow on each round
11. Test error flow: disconnect network → verify error state + retry

- [ ] **Step 4: Final commit if any fixes needed**
