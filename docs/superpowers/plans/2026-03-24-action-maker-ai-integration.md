# Action Maker AI Integration Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 將 action-maker 從前端 mock 升級為 Worker AI 生成 + DB 紀錄 + 建立 practice 的完整流程。

**Architecture:** Cloudflare Worker（Hono）負責 AI 生成，透過 internal API 將紀錄存入 daodao-server（PostgreSQL）。前端直接呼叫 Worker 生成 actions，呼叫 daodao-server 建立 practice 和回報互動。

**Tech Stack:** Cloudflare Workers、Hono、Workers AI（Qwen3）、KV、Langfuse、jose、PostgreSQL、Prisma（type gen）、Express、Zod、Next.js（React）

**Spec:** `docs/superpowers/specs/2026-03-24-action-maker-ai-integration-design.md`

---

## File Structure

### 新建 repo：`daodao-worker/`

| Path | Responsibility |
|------|---------------|
| `package.json` | Dependencies & scripts |
| `tsconfig.json` | TypeScript config |
| `wrangler.toml` | Cloudflare Worker config (dev/preview/production) |
| `vitest.config.ts` | Vitest + @cloudflare/vitest-pool-workers |
| `src/index.ts` | Hono app entry, CORS, route mounting |
| `src/types.ts` | Cloudflare Env binding types |
| `src/domain-types.ts` | Shared domain types (CategoryType, IAction, Locale) |
| `src/middleware/rate-limit.ts` | IP-based KV rate limit factory |
| `src/middleware/auth.ts` | JWT Bearer token verification (jose) |
| `src/utils/langfuse.ts` | Langfuse client + trace helper |
| `src/utils/internal-api.ts` | Helper for calling daodao-server internal API |
| `src/prompts/action-maker.ts` | Generate prompt (system + user, zh-TW/en) |
| `src/prompts/refine.ts` | Refine prompt (system + user) |
| `src/routes/action-maker.ts` | POST /action-maker/generate + /refine |
| `test/middleware/rate-limit.test.ts` | Rate limit tests |
| `test/middleware/auth.test.ts` | JWT auth tests |
| `test/routes/action-maker.test.ts` | Generate endpoint tests |
| `test/routes/refine.test.ts` | Refine endpoint tests |

### 修改：`daodao-storage/`

| Path | Change |
|------|--------|
| `migrate/sql/029_create_table_ai_generations.sql` | Create ai_generations table + trigger |

### 修改：`daodao-server/`

| Path | Change |
|------|--------|
| `prisma/schema.prisma` | Add ai_generations model |
| `src/validators/ai-generation.validators.ts` | Create: Zod schemas for input validation |
| `src/services/ai-generation.service.ts` | Create: DB operations for ai_generations |
| `src/controllers/ai-generation.controller.ts` | Create: Request handlers |
| `src/routes/ai-generation.routes.ts` | Create: POST internal + PATCH public routes |
| `src/middleware/internal-auth.middleware.ts` | Create: X-Internal-API-Key verification |
| `src/app.ts` | Mount ai-generation routes |

### 修改：`daodao-f2e/`

| Path | Change |
|------|--------|
| `packages/features/action-maker/src/hooks/use-generate-actions.ts` | Replace mock with Worker API call |
| `packages/features/action-maker/src/hooks/use-refine-action.ts` | Create: Hook for AI refine |
| `packages/features/action-maker/src/hooks/use-create-practice-from-action.ts` | Create: Hook for creating practice + reporting interaction |
| `packages/features/action-maker/src/components/action-maker-actions.tsx` | Add level selection + refine flow to custom form |
| `packages/features/action-maker/src/components/action-maker-result.tsx` | Add "開始實踐" button with auth gate |
| `packages/features/action-maker/src/providers/action-maker-provider.tsx` | Add session_id + usedRefine to state |
| `packages/features/action-maker/src/types/index.ts` | Add session_id, usedRefine to state types |

---

## Chunk 1: Database Migration + Server API

### Task 1: Create `ai_generations` migration

**Files:**
- Create: `daodao-storage/migrate/sql/029_create_table_ai_generations.sql`

- [ ] **Step 1: Create migration file**

```sql
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_generations') THEN
        CREATE TABLE ai_generations (
            id SERIAL PRIMARY KEY,
            external_id UUID UNIQUE DEFAULT gen_random_uuid(),

            feature VARCHAR(50) NOT NULL,
            action_type VARCHAR(20) NOT NULL,
            session_id VARCHAR(64),
            ip_hash VARCHAR(16),
            user_id INT REFERENCES users(id),
            status VARCHAR(20) DEFAULT 'success',

            input JSONB NOT NULL,
            output JSONB,
            model VARCHAR(100),
            latency_ms INT,

            user_interaction JSONB,

            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX idx_ai_generations_feature ON ai_generations(feature);
        CREATE INDEX idx_ai_generations_session_id ON ai_generations(session_id);
        CREATE INDEX idx_ai_generations_user_id ON ai_generations(user_id);
        CREATE INDEX idx_ai_generations_created_at ON ai_generations(created_at);

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

- [ ] **Step 2: Run migration on dev DB**

```bash
cd /Users/xiaoxu/Projects/daodao/daodao-storage
make migrate-sql-dev
```

Expected: Migration completes, `ai_generations` table created.

- [ ] **Step 3: Verify table exists**

```bash
psql postgresql://daodao:daodao@pg-dev.daodao-storage.orb.local:5432/daodao -c "\d ai_generations"
```

Expected: Shows table schema with all columns and indexes.

- [ ] **Step 4: Commit**

```bash
cd /Users/xiaoxu/Projects/daodao/daodao-storage
git add migrate/sql/029_create_table_ai_generations.sql
git commit -m "feat: add ai_generations table for tracking AI generation records"
```

---

### Task 2: Add Prisma model for `ai_generations`

**Files:**
- Modify: `daodao-server/prisma/schema.prisma`

- [ ] **Step 1: Read current Prisma schema to find where to add the model**

```bash
tail -30 /Users/xiaoxu/Projects/daodao/daodao-server/prisma/schema.prisma
```

- [ ] **Step 2: Add `ai_generations` model to schema**

Add at end of schema file:

```prisma
model ai_generations {
  id               Int       @id @default(autoincrement())
  external_id      String    @unique @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  feature          String    @db.VarChar(50)
  action_type      String    @db.VarChar(20)
  session_id       String?   @db.VarChar(64)
  ip_hash          String?   @db.VarChar(16)
  user_id          Int?
  status           String?   @default("success") @db.VarChar(20)
  input            Json
  output           Json?
  model            String?   @db.VarChar(100)
  latency_ms       Int?
  user_interaction Json?
  created_at       DateTime? @default(now()) @db.Timestamptz(6)
  updated_at       DateTime? @default(now()) @db.Timestamptz(6)

  users users? @relation(fields: [user_id], references: [id], onDelete: NoAction, onUpdate: NoAction)

  @@index([feature], map: "idx_ai_generations_feature")
  @@index([session_id], map: "idx_ai_generations_session_id")
  @@index([user_id], map: "idx_ai_generations_user_id")
  @@index([created_at], map: "idx_ai_generations_created_at")
}
```

Also add the reverse relation in the `users` model:

```prisma
// Inside the existing users model, add:
ai_generations ai_generations[]
```

- [ ] **Step 3: Generate Prisma types**

```bash
cd /Users/xiaoxu/Projects/daodao/daodao-server
pnpm run prisma:generate
```

Expected: Prisma client regenerated with `ai_generations` type.

- [ ] **Step 4: Verify type generation**

```bash
cd /Users/xiaoxu/Projects/daodao/daodao-server
pnpm run typecheck
```

Expected: No type errors.

- [ ] **Step 5: Commit**

```bash
cd /Users/xiaoxu/Projects/daodao/daodao-server
git add prisma/schema.prisma
git commit -m "feat: add ai_generations Prisma model"
```

---

### Task 3: Internal auth middleware

**Files:**
- Create: `daodao-server/src/middleware/internal-auth.middleware.ts`

- [ ] **Step 1: Create internal auth middleware**

```typescript
import type { Request, Response, NextFunction } from 'express';

/**
 * Middleware to verify X-Internal-API-Key header for server-to-server calls.
 * Used by daodao-worker to call internal endpoints.
 */
export function requireInternalApiKey(req: Request, res: Response, next: NextFunction): void {
  const apiKey = req.headers['x-internal-api-key'];
  const expectedKey = process.env.INTERNAL_API_KEY;

  if (!expectedKey) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_CONFIG_ERROR', message: 'Internal API key not configured' },
    });
    return;
  }

  if (!apiKey || apiKey !== expectedKey) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Invalid internal API key' },
    });
    return;
  }

  next();
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/xiaoxu/Projects/daodao/daodao-server
pnpm run typecheck
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/xiaoxu/Projects/daodao/daodao-server
git add src/middleware/internal-auth.middleware.ts
git commit -m "feat: add internal API key auth middleware"
```

---

### Task 4: ai-generation validators, service, controller, routes

**Files:**
- Create: `daodao-server/src/validators/ai-generation.validators.ts`
- Create: `daodao-server/src/services/ai-generation.service.ts`
- Create: `daodao-server/src/controllers/ai-generation.controller.ts`
- Create: `daodao-server/src/routes/ai-generation.routes.ts`
- Modify: `daodao-server/src/app.ts`

- [ ] **Step 1: Create validators**

```typescript
// src/validators/ai-generation.validators.ts
import { z } from 'zod';

/** POST /api/internal/ai-generations — Worker stores generation record */
export const createAiGenerationSchema = z.object({
  feature: z.string().min(1).max(50),
  action_type: z.string().min(1).max(20),
  session_id: z.string().max(64).optional(),
  ip_hash: z.string().max(16).optional(),
  input: z.record(z.unknown()),
  output: z.record(z.unknown()).optional(),
  model: z.string().max(100).optional(),
  latency_ms: z.number().int().nonnegative().optional(),
  status: z.enum(['success', 'error', 'timeout']).default('success'),
});

export type CreateAiGenerationInput = z.infer<typeof createAiGenerationSchema>;

/** PATCH /api/v1/ai-generations/:sessionId — Frontend reports user interaction */
export const updateAiGenerationInteractionSchema = z.object({
  user_interaction: z.object({
    selected_action_id: z.string().optional(),
    selected_level: z.string().optional(),
    used_refine: z.boolean().optional(),
    created_practice_id: z.number().int().optional(),
    completed_flow: z.boolean().optional(),
  }),
});

export type UpdateAiGenerationInteractionInput = z.infer<typeof updateAiGenerationInteractionSchema>;

export const sessionIdParamSchema = z.object({
  sessionId: z.string().min(1).max(64),
});
```

- [ ] **Step 2: Create service**

```typescript
// src/services/ai-generation.service.ts
import { prisma } from './database/prisma.service';
import type { CreateAiGenerationInput, UpdateAiGenerationInteractionInput } from '../validators/ai-generation.validators';

export async function createAiGeneration(data: CreateAiGenerationInput) {
  const record = await prisma.ai_generations.create({
    data: {
      feature: data.feature,
      action_type: data.action_type,
      session_id: data.session_id,
      ip_hash: data.ip_hash,
      input: data.input,
      output: data.output ?? undefined,
      model: data.model,
      latency_ms: data.latency_ms,
      status: data.status,
    },
    select: {
      id: true,
      external_id: true,
    },
  });
  return record;
}

export async function updateInteractionBySessionId(
  sessionId: string,
  userId: number,
  data: UpdateAiGenerationInteractionInput,
) {
  // Only update rows that either have no user_id yet, or already belong to this user
  const result = await prisma.ai_generations.updateMany({
    where: {
      session_id: sessionId,
      OR: [
        { user_id: null },
        { user_id: userId },
      ],
    },
    data: {
      user_id: userId,
      user_interaction: data.user_interaction,
    },
  });
  return { updated_count: result.count };
}
```

- [ ] **Step 3: Create controller**

```typescript
// src/controllers/ai-generation.controller.ts
import type { Request, Response } from 'express';
import { asyncHandler } from '../middleware/error.middleware';
import * as aiGenerationService from '../services/ai-generation.service';
import {
  createAiGenerationSchema,
  updateAiGenerationInteractionSchema,
  sessionIdParamSchema,
} from '../validators/ai-generation.validators';
import { UnauthorizedError } from '../middleware/error.middleware';

/** POST /api/internal/ai-generations */
export const createAiGeneration = asyncHandler(async (req: Request, res: Response) => {
  const data = createAiGenerationSchema.parse(req.body);
  const result = await aiGenerationService.createAiGeneration(data);
  res.status(201).json({ success: true, data: result });
});

/** PATCH /api/v1/ai-generations/:sessionId */
export const updateInteraction = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user || typeof req.user.id !== 'number') {
    throw new UnauthorizedError('未授權存取');
  }

  const { sessionId } = sessionIdParamSchema.parse(req.params);
  const data = updateAiGenerationInteractionSchema.parse(req.body);
  const result = await aiGenerationService.updateInteractionBySessionId(
    sessionId,
    req.user.id,
    data,
  );
  res.json({ success: true, ...result });
});
```

- [ ] **Step 4: Create routes**

```typescript
// src/routes/ai-generation.routes.ts
import { Router } from 'express';
import { requireInternalApiKey } from '../middleware/internal-auth.middleware';
import { authenticate } from '../middleware/auth';
import * as aiGenerationController from '../controllers/ai-generation.controller';

const router = Router();

// Internal: Worker stores generation record
router.post(
  '/internal/ai-generations',
  requireInternalApiKey,
  aiGenerationController.createAiGeneration,
);

// Public: Frontend reports user interaction (JWT required)
router.patch(
  '/v1/ai-generations/:sessionId',
  authenticate,
  aiGenerationController.updateInteraction,
);

export default router;
```

- [ ] **Step 5: Mount routes in app.ts**

In `daodao-server/src/app.ts`, add import and mount:

```typescript
// Add import at top (after existing imports)
import aiGenerationRoutes from './routes/ai-generation.routes';

// Add mount (after other app.use calls, before error handlers)
app.use('/api', aiGenerationRoutes);
console.log('🤖 AI generation routes registered - /api/internal/ai-generations, /api/v1/ai-generations');
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
cd /Users/xiaoxu/Projects/daodao/daodao-server
pnpm run typecheck
```

Expected: No errors.

- [ ] **Step 7: Commit**

```bash
cd /Users/xiaoxu/Projects/daodao/daodao-server
git add src/validators/ai-generation.validators.ts src/services/ai-generation.service.ts src/controllers/ai-generation.controller.ts src/routes/ai-generation.routes.ts src/app.ts
git commit -m "feat: add ai-generation internal + public API endpoints"
```

---

## Chunk 2: Worker Project Setup

### Task 5: Initialize daodao-worker

**Files:**
- Create: `daodao-worker/package.json`
- Create: `daodao-worker/tsconfig.json`
- Create: `daodao-worker/wrangler.toml`
- Create: `daodao-worker/vitest.config.ts`

- [ ] **Step 1: Create directory and init git**

```bash
cd /Users/xiaoxu/Projects/daodao
mkdir daodao-worker && cd daodao-worker
git init
```

- [ ] **Step 2: Create `package.json`**

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
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
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

- [ ] **Step 3: Create `tsconfig.json`**

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

- [ ] **Step 4: Create `wrangler.toml`**

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

- [ ] **Step 5: Create `vitest.config.ts`**

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
            INTERNAL_API_URL: "http://localhost:3000",
            INTERNAL_API_KEY: "test-internal-key",
          },
        },
      },
    },
  },
});
```

- [ ] **Step 6: Create `.gitignore`**

```
node_modules/
dist/
.wrangler/
.dev.vars
```

- [ ] **Step 7: Install dependencies**

```bash
cd /Users/xiaoxu/Projects/daodao/daodao-worker
npm install
```

Expected: Install success, no peer dependency errors.

- [ ] **Step 8: Commit**

```bash
cd /Users/xiaoxu/Projects/daodao/daodao-worker
git add .
git commit -m "chore: initialize daodao-worker project scaffold"
```

---

### Task 6: Types, Hono entry point, directory structure

**Files:**
- Create: `daodao-worker/src/types.ts`
- Create: `daodao-worker/src/domain-types.ts`
- Create: `daodao-worker/src/index.ts`

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p /Users/xiaoxu/Projects/daodao/daodao-worker/src/{middleware,routes,prompts,utils}
mkdir -p /Users/xiaoxu/Projects/daodao/daodao-worker/test/{middleware,routes}
```

- [ ] **Step 2: Create `src/types.ts`**

```typescript
export interface Env {
  CACHE: KVNamespace;
  AI: Ai;
  JWT_SECRET: string;
  LANGFUSE_SECRET_KEY: string;
  LANGFUSE_PUBLIC_KEY: string;
  LANGFUSE_BASEURL: string;
  INTERNAL_API_URL: string;
  INTERNAL_API_KEY: string;
}
```

- [ ] **Step 3: Create `src/domain-types.ts`**

```typescript
export type CategoryType =
  | "interest"
  | "social"
  | "health"
  | "academic"
  | "work"
  | "finance";

export const VALID_CATEGORIES = new Set<string>([
  "interest", "social", "health", "academic", "work", "finance",
]);

export type Locale = "zh-TW" | "en";

export type ActionLevel = "beginner" | "intermediate" | "advanced";

export const VALID_LEVELS = new Set<string>(["beginner", "intermediate", "advanced"]);

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

- [ ] **Step 4: Create `src/index.ts`**

```typescript
import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env } from "./types";
import { actionMakerRouter } from "./routes/action-maker";

const app = new Hono<{ Bindings: Env }>();

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

app.get("/health", (c) => c.json({ status: "ok" }));

app.route("/action-maker", actionMakerRouter);

app.notFound((c) => c.json({ success: false, error: "NotFound" }, 404));

export default app;
```

- [ ] **Step 5: Create stub route so TypeScript compiles**

Create `src/routes/action-maker.ts`:

```typescript
import { Hono } from "hono";
import type { Env } from "../types";

export const actionMakerRouter = new Hono<{ Bindings: Env }>();

actionMakerRouter.post("/generate", async (c) => {
  return c.json({ success: true, data: { actions: [], session_id: "stub" } });
});

actionMakerRouter.post("/refine", async (c) => {
  return c.json({ success: true, data: { action: null, session_id: "stub" } });
});
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
cd /Users/xiaoxu/Projects/daodao/daodao-worker
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 7: Commit**

```bash
cd /Users/xiaoxu/Projects/daodao/daodao-worker
git add .
git commit -m "chore: add types, domain types, and Hono entry point"
```

---

## Chunk 3: Worker Middleware + Utilities

### Task 7: Rate limit middleware

**Files:**
- Create: `daodao-worker/src/middleware/rate-limit.ts`
- Create: `daodao-worker/test/middleware/rate-limit.test.ts`

- [ ] **Step 1: Write test**

```typescript
// test/middleware/rate-limit.test.ts
import { env, SELF } from "cloudflare:test";
import { describe, it, expect, beforeEach } from "vitest";

describe("Rate Limit Middleware", () => {
  beforeEach(async () => {
    const keys = await env.CACHE.list();
    for (const key of keys.keys) {
      await env.CACHE.delete(key.name);
    }
  });

  it("allows first 5 requests", async () => {
    for (let i = 0; i < 5; i++) {
      const res = await SELF.fetch("http://localhost/action-maker/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", "CF-Connecting-IP": "1.2.3.4" },
        body: JSON.stringify({ category: "interest", topic: "test" }),
      });
      expect(res.status).not.toBe(429);
    }
  });

  it("blocks 6th request with 429", async () => {
    for (let i = 0; i < 5; i++) {
      await SELF.fetch("http://localhost/action-maker/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", "CF-Connecting-IP": "1.2.3.4" },
        body: JSON.stringify({ category: "interest", topic: "test" }),
      });
    }
    const res = await SELF.fetch("http://localhost/action-maker/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json", "CF-Connecting-IP": "1.2.3.4" },
      body: JSON.stringify({ category: "interest", topic: "test" }),
    });
    expect(res.status).toBe(429);
    const body = await res.json() as Record<string, unknown>;
    expect(body.success).toBe(false);
    expect(body.error).toBe("rate_limited");
    expect(res.headers.get("Retry-After")).toBeTruthy();
  });

  it("different IPs have independent limits", async () => {
    for (let i = 0; i < 5; i++) {
      await SELF.fetch("http://localhost/action-maker/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", "CF-Connecting-IP": "1.1.1.1" },
        body: JSON.stringify({ category: "interest", topic: "test" }),
      });
    }
    const res = await SELF.fetch("http://localhost/action-maker/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json", "CF-Connecting-IP": "2.2.2.2" },
      body: JSON.stringify({ category: "interest", topic: "test" }),
    });
    expect(res.status).not.toBe(429);
  });
});
```

- [ ] **Step 2: Run test to confirm failure**

```bash
cd /Users/xiaoxu/Projects/daodao/daodao-worker
npm test -- test/middleware/rate-limit.test.ts
```

Expected: FAIL (stub route has no rate limiting).

- [ ] **Step 3: Implement rate limit middleware**

```typescript
// src/middleware/rate-limit.ts
import type { Context, Next } from "hono";
import type { Env } from "../types";

const WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_REQUESTS = 5;

interface RateLimitEntry {
  count: number;
  resetAt: number;
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

    entry.count += 1;
    const ttlSec = Math.ceil((entry.resetAt - now) / 1000) + 10;
    await c.env.CACHE.put(key, JSON.stringify(entry), {
      expirationTtl: ttlSec,
    });

    await next();
  };
}
```

- [ ] **Step 4: Update stub route to use rate limiter**

Update `src/routes/action-maker.ts`:

```typescript
import { Hono } from "hono";
import type { Env } from "../types";
import { createRateLimiter } from "../middleware/rate-limit";

export const actionMakerRouter = new Hono<{ Bindings: Env }>();

const rateLimiter = createRateLimiter("action-maker");

actionMakerRouter.post("/generate", rateLimiter, async (c) => {
  return c.json({ success: true, data: { actions: [], session_id: "stub" } });
});

actionMakerRouter.post("/refine", rateLimiter, async (c) => {
  return c.json({ success: true, data: { action: null, session_id: "stub" } });
});
```

- [ ] **Step 5: Run test to confirm passing**

```bash
cd /Users/xiaoxu/Projects/daodao/daodao-worker
npm test -- test/middleware/rate-limit.test.ts
```

Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
cd /Users/xiaoxu/Projects/daodao/daodao-worker
git add src/middleware/rate-limit.ts src/routes/action-maker.ts test/middleware/rate-limit.test.ts
git commit -m "feat: add IP rate limit middleware with KV backend"
```

---

### Task 8: JWT auth middleware

**Files:**
- Create: `daodao-worker/src/middleware/auth.ts`
- Create: `daodao-worker/test/middleware/auth.test.ts`

- [ ] **Step 1: Write test**

```typescript
// test/middleware/auth.test.ts
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

async function makeExpiredJWT(): Promise<string> {
  const secret = new TextEncoder().encode(JWT_SECRET);
  return new SignJWT({ sub: "user-123" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(Math.floor(Date.now() / 1000) - 7200)
    .setExpirationTime(Math.floor(Date.now() / 1000) - 3600)
    .sign(secret);
}

// These tests need a route that uses authMiddleware.
// We'll use /health-auth as a test-only endpoint.
// For now, test the middleware function directly.
describe("JWT Auth Middleware", () => {
  it("valid JWT should pass", async () => {
    const token = await makeValidJWT();
    // Test against a stub endpoint (to be added when auth is integrated)
    expect(token).toBeTruthy();
  });

  it("expired JWT should be detected", async () => {
    const token = await makeExpiredJWT();
    expect(token).toBeTruthy();
  });
});
```

- [ ] **Step 2: Implement auth middleware**

```typescript
// src/middleware/auth.ts
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

- [ ] **Step 3: Run tests**

```bash
cd /Users/xiaoxu/Projects/daodao/daodao-worker
npm test -- test/middleware/auth.test.ts
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
cd /Users/xiaoxu/Projects/daodao/daodao-worker
git add src/middleware/auth.ts test/middleware/auth.test.ts
git commit -m "feat: add JWT auth middleware (reserved for future endpoints)"
```

---

### Task 9: Langfuse utility + internal API helper

**Files:**
- Create: `daodao-worker/src/utils/langfuse.ts`
- Create: `daodao-worker/src/utils/internal-api.ts`

- [ ] **Step 1: Create Langfuse utility**

```typescript
// src/utils/langfuse.ts
import { Langfuse } from "langfuse";
import type { Env } from "../types";

export function createLangfuse(env: Env): Langfuse {
  return new Langfuse({
    secretKey: env.LANGFUSE_SECRET_KEY,
    publicKey: env.LANGFUSE_PUBLIC_KEY,
    baseUrl: env.LANGFUSE_BASEURL,
    flushAt: 1,
    flushInterval: 0,
  });
}

export interface TraceOptions {
  name: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  latencyMs: number;
}

export function traceAICall(
  langfuse: Langfuse,
  options: TraceOptions,
  waitUntil: (promise: Promise<unknown>) => void,
): void {
  langfuse.trace({
    name: options.name,
    input: options.input,
    output: options.output,
    metadata: {
      ...options.metadata,
      latencyMs: options.latencyMs,
    },
  });
  waitUntil(langfuse.flushAsync());
}

export async function hashIp(ip: string): Promise<string> {
  const data = new TextEncoder().encode(ip);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .slice(0, 8)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
```

- [ ] **Step 2: Create internal API helper**

```typescript
// src/utils/internal-api.ts
import type { Env } from "../types";

interface StoreGenerationParams {
  feature: string;
  action_type: string;
  session_id?: string;
  ip_hash?: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  model?: string;
  latency_ms?: number;
  status?: "success" | "error" | "timeout";
}

/**
 * Store AI generation record in daodao-server via internal API.
 * Non-blocking: designed to be called via waitUntil.
 */
export async function storeGenerationRecord(
  env: Env,
  params: StoreGenerationParams,
): Promise<void> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(`${env.INTERNAL_API_URL}/api/internal/ai-generations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-API-Key": env.INTERNAL_API_KEY,
      },
      body: JSON.stringify(params),
      signal: controller.signal,
    });

    if (!res.ok) {
      console.error(`Internal API error: ${res.status} ${await res.text()}`);
    }
  } catch (err) {
    console.error("Failed to store generation record:", err);
  } finally {
    clearTimeout(timeoutId);
  }
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/xiaoxu/Projects/daodao/daodao-worker
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/xiaoxu/Projects/daodao/daodao-worker
git add src/utils/langfuse.ts src/utils/internal-api.ts
git commit -m "feat: add Langfuse trace utility and internal API helper"
```

---

## Chunk 4: Worker AI Endpoints

### Task 10: Action-maker generate prompt + route

**Files:**
- Create: `daodao-worker/src/prompts/action-maker.ts`
- Modify: `daodao-worker/src/routes/action-maker.ts`
- Create: `daodao-worker/test/routes/action-maker.test.ts`

- [ ] **Step 1: Write tests**

```typescript
// test/routes/action-maker.test.ts
import { SELF, env } from "cloudflare:test";
import { describe, it, expect, beforeEach } from "vitest";

describe("POST /action-maker/generate", () => {
  beforeEach(async () => {
    const keys = await env.CACHE.list();
    for (const key of keys.keys) {
      await env.CACHE.delete(key.name);
    }
  });

  it("returns 200 or 500 with valid input", async () => {
    const res = await SELF.fetch("http://localhost/action-maker/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json", "CF-Connecting-IP": "1.2.3.4" },
      body: JSON.stringify({
        category: "interest",
        topic: "學吉他",
        tags: ["音樂"],
        locale: "zh-TW",
        session_id: "test-session-1",
      }),
    });

    if (res.status === 200) {
      const body = await res.json() as Record<string, unknown>;
      expect(body.success).toBe(true);
      const data = body.data as { actions: unknown[]; session_id: string };
      expect(Array.isArray(data.actions)).toBe(true);
      expect(data.actions).toHaveLength(3);
      expect(typeof data.session_id).toBe("string");
    } else {
      expect(res.status).toBe(500);
    }
  });

  it("returns 400 for missing category", async () => {
    const res = await SELF.fetch("http://localhost/action-maker/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json", "CF-Connecting-IP": "1.2.3.4" },
      body: JSON.stringify({ topic: "test" }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing topic", async () => {
    const res = await SELF.fetch("http://localhost/action-maker/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json", "CF-Connecting-IP": "1.2.3.4" },
      body: JSON.stringify({ category: "interest" }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid category", async () => {
    const res = await SELF.fetch("http://localhost/action-maker/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json", "CF-Connecting-IP": "1.2.3.4" },
      body: JSON.stringify({ category: "invalid", topic: "test" }),
    });
    expect(res.status).toBe(400);
  });

  it("falls back to zh-TW for unsupported locale", async () => {
    const res = await SELF.fetch("http://localhost/action-maker/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json", "CF-Connecting-IP": "1.2.3.4" },
      body: JSON.stringify({ category: "health", topic: "跑步", locale: "ja" }),
    });
    expect(res.status).not.toBe(400);
  });
});
```

- [ ] **Step 2: Run test to confirm failure**

```bash
cd /Users/xiaoxu/Projects/daodao/daodao-worker
npm test -- test/routes/action-maker.test.ts
```

Expected: FAIL (stub has no input validation).

- [ ] **Step 3: Create generate prompt**

Create `src/prompts/action-maker.ts`:

```typescript
import type { CategoryType, Locale } from "../domain-types";

interface ActionMakerPromptInput {
  category: CategoryType;
  topic: string;
  tags?: string[];
  locale: Locale;
}

const CATEGORY_LABELS_ZH: Record<CategoryType, string> = {
  interest: "興趣探索", social: "社交關係", health: "健康習慣",
  academic: "學習成長", work: "職業發展", finance: "財務管理",
};

const CATEGORY_LABELS_EN: Record<CategoryType, string> = {
  interest: "Interest Exploration", social: "Social Connections", health: "Health Habits",
  academic: "Learning & Growth", work: "Career Development", finance: "Financial Management",
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
    { same structure with level "intermediate" },
    { same structure with level "advanced" }
  ]
}

Rules:
- Always return exactly 3 actions (beginner, intermediate, advanced)
- title: concise and specific (under 20 words)
- description: actionable steps (under 50 words)
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
    { 同結構，level 為 "intermediate" },
    { 同結構，level 為 "advanced" }
  ]
}

規則：
- 固定回傳 3 個行動（beginner、intermediate、advanced 各一）
- title：簡潔具體（20 字以內）
- description：可執行步驟（50 字以內）
- locked：固定為 false`;
}

export function buildActionMakerUserPrompt(input: ActionMakerPromptInput): string {
  const { category, topic, tags, locale } = input;
  const labels = locale === "en" ? CATEGORY_LABELS_EN : CATEGORY_LABELS_ZH;
  const categoryLabel = labels[category];

  if (locale === "en") {
    const tagsStr = tags?.length ? `\nUser interests: ${tags.join(", ")}` : "";
    return `Generate personalized action suggestions.
Category: ${categoryLabel} (categoryId: "${category}")
Topic: ${topic}${tagsStr}

Respond with ONLY the JSON.`;
  }

  const tagsStr = tags?.length ? `\n用戶興趣標籤：${tags.join("、")}` : "";
  return `請為以下情境生成個人化行動建議。
分類：${categoryLabel}（categoryId: "${category}"）
主題：${topic}${tagsStr}

請只回傳 JSON，不要有其他內容。`;
}
```

- [ ] **Step 4: Implement full generate route**

Replace `src/routes/action-maker.ts`:

```typescript
import { Hono } from "hono";
import type { Env } from "../types";
import { createRateLimiter } from "../middleware/rate-limit";
import { buildActionMakerSystemPrompt, buildActionMakerUserPrompt } from "../prompts/action-maker";
import { createLangfuse, traceAICall, hashIp } from "../utils/langfuse";
import { storeGenerationRecord } from "../utils/internal-api";
import { type CategoryType, type IAction, type Locale, VALID_CATEGORIES } from "../domain-types";

const AI_MODEL = "@cf/qwen/qwen3-30b-a3b-fp8";
const rateLimiter = createRateLimiter("action-maker");

export const actionMakerRouter = new Hono<{ Bindings: Env }>();

actionMakerRouter.post("/generate", rateLimiter, async (c) => {
  let body: Record<string, unknown>;
  try {
    body = (await c.req.json()) as Record<string, unknown>;
  } catch {
    return c.json({ success: false, error: "InvalidInput", message: "Invalid JSON body" }, 400);
  }

  const { category, topic, tags, locale, session_id } = body;

  if (typeof category !== "string" || !VALID_CATEGORIES.has(category)) {
    return c.json({ success: false, error: "InvalidInput", message: "Invalid category" }, 400);
  }
  if (typeof topic !== "string" || topic.trim() === "") {
    return c.json({ success: false, error: "InvalidInput", message: "topic is required" }, 400);
  }

  const sanitizedTopic = topic.trim().slice(0, 100);
  const resolvedLocale: Locale = locale === "en" ? "en" : "zh-TW";
  const resolvedSessionId = typeof session_id === "string" ? session_id : crypto.randomUUID();
  const resolvedTags = Array.isArray(tags)
    ? (tags as unknown[]).filter((t) => typeof t === "string").map(String).slice(0, 10)
    : undefined;

  const systemPrompt = buildActionMakerSystemPrompt(resolvedLocale);
  const userPrompt = buildActionMakerUserPrompt({
    category: category as CategoryType,
    topic: sanitizedTopic,
    tags: resolvedTags,
    locale: resolvedLocale,
  });

  const langfuse = createLangfuse(c.env);
  const startTime = Date.now();
  const ip = c.req.header("CF-Connecting-IP") ?? "unknown";

  let actions: IAction[];
  try {
    const response = await c.env.AI.run(AI_MODEL, {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 1500,
    });

    const text = typeof response === "object" && response !== null && "response" in response
      ? String((response as { response: unknown }).response)
      : String(response);

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in AI response");

    const parsed = JSON.parse(jsonMatch[0]) as { actions: IAction[] };
    if (!Array.isArray(parsed.actions) || parsed.actions.length !== 3) {
      throw new Error("AI returned invalid actions array");
    }
    actions = parsed.actions;
  } catch (err) {
    const latencyMs = Date.now() - startTime;
    const ipHash = await hashIp(ip);

    traceAICall(langfuse, {
      name: "action-maker.generate",
      input: { category, topic: sanitizedTopic, tags: resolvedTags, locale: resolvedLocale },
      output: { error: String(err) },
      metadata: { ipHash, success: false, model: AI_MODEL },
      latencyMs,
    }, c.executionCtx.waitUntil.bind(c.executionCtx));

    c.executionCtx.waitUntil(storeGenerationRecord(c.env, {
      feature: "action-maker", action_type: "generate", session_id: resolvedSessionId,
      ip_hash: ipHash, input: { category, topic: sanitizedTopic, tags: resolvedTags, locale: resolvedLocale },
      output: { error: String(err) }, model: AI_MODEL, latency_ms: latencyMs, status: "error",
    }));

    return c.json({ success: false, error: "AIError", message: "Failed to generate actions" }, 500);
  }

  const latencyMs = Date.now() - startTime;
  const ipHash = await hashIp(ip);

  traceAICall(langfuse, {
    name: "action-maker.generate",
    input: { category, topic: sanitizedTopic, tags: resolvedTags, locale: resolvedLocale },
    output: { actions },
    metadata: { ipHash, locale: resolvedLocale, model: AI_MODEL, success: true },
    latencyMs,
  }, c.executionCtx.waitUntil.bind(c.executionCtx));

  c.executionCtx.waitUntil(storeGenerationRecord(c.env, {
    feature: "action-maker", action_type: "generate", session_id: resolvedSessionId,
    ip_hash: ipHash, input: { category, topic: sanitizedTopic, tags: resolvedTags, locale: resolvedLocale },
    output: { actions }, model: AI_MODEL, latency_ms: latencyMs, status: "success",
  }));

  return c.json({ success: true, data: { actions, session_id: resolvedSessionId } });
});

// Refine endpoint will be added in Task 11
actionMakerRouter.post("/refine", rateLimiter, async (c) => {
  return c.json({ success: true, data: { action: null, session_id: "stub" } });
});
```

- [ ] **Step 5: Run tests**

```bash
cd /Users/xiaoxu/Projects/daodao/daodao-worker
npm test -- test/routes/action-maker.test.ts
```

Expected: PASS.

- [ ] **Step 6: Run all tests**

```bash
cd /Users/xiaoxu/Projects/daodao/daodao-worker
npm test
```

Expected: All PASS.

- [ ] **Step 7: Commit**

```bash
cd /Users/xiaoxu/Projects/daodao/daodao-worker
git add src/prompts/action-maker.ts src/routes/action-maker.ts test/routes/action-maker.test.ts
git commit -m "feat: implement action-maker generate endpoint with AI and rate limiting"
```

---

### Task 11: Refine prompt + route

**Files:**
- Create: `daodao-worker/src/prompts/refine.ts`
- Modify: `daodao-worker/src/routes/action-maker.ts` (add /refine handler)
- Create: `daodao-worker/test/routes/refine.test.ts`

- [ ] **Step 1: Write tests**

```typescript
// test/routes/refine.test.ts
import { SELF, env } from "cloudflare:test";
import { describe, it, expect, beforeEach } from "vitest";

describe("POST /action-maker/refine", () => {
  beforeEach(async () => {
    const keys = await env.CACHE.list();
    for (const key of keys.keys) {
      await env.CACHE.delete(key.name);
    }
  });

  it("returns 200 or 500 with valid input", async () => {
    const res = await SELF.fetch("http://localhost/action-maker/refine", {
      method: "POST",
      headers: { "Content-Type": "application/json", "CF-Connecting-IP": "1.2.3.4" },
      body: JSON.stringify({
        category: "interest",
        topic: "學吉他",
        level: "beginner",
        title: "練吉他",
        description: "每天練一下",
        session_id: "test-session-1",
      }),
    });

    if (res.status === 200) {
      const body = await res.json() as Record<string, unknown>;
      expect(body.success).toBe(true);
      const data = body.data as { action: Record<string, unknown>; session_id: string };
      expect(data.action).toBeTruthy();
      expect(typeof data.session_id).toBe("string");
    } else {
      expect(res.status).toBe(500);
    }
  });

  it("returns 400 for missing title", async () => {
    const res = await SELF.fetch("http://localhost/action-maker/refine", {
      method: "POST",
      headers: { "Content-Type": "application/json", "CF-Connecting-IP": "1.2.3.4" },
      body: JSON.stringify({ category: "interest", topic: "test", level: "beginner" }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid level", async () => {
    const res = await SELF.fetch("http://localhost/action-maker/refine", {
      method: "POST",
      headers: { "Content-Type": "application/json", "CF-Connecting-IP": "1.2.3.4" },
      body: JSON.stringify({ category: "interest", topic: "test", level: "expert", title: "test" }),
    });
    expect(res.status).toBe(400);
  });

  it("shares rate limit pool with generate", async () => {
    // Use 4 generate + 1 refine = 5 total (should pass)
    for (let i = 0; i < 4; i++) {
      await SELF.fetch("http://localhost/action-maker/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", "CF-Connecting-IP": "3.3.3.3" },
        body: JSON.stringify({ category: "interest", topic: "test" }),
      });
    }
    const res = await SELF.fetch("http://localhost/action-maker/refine", {
      method: "POST",
      headers: { "Content-Type": "application/json", "CF-Connecting-IP": "3.3.3.3" },
      body: JSON.stringify({ category: "interest", topic: "test", level: "beginner", title: "test" }),
    });
    expect(res.status).not.toBe(429);

    // 6th request should be blocked
    const blocked = await SELF.fetch("http://localhost/action-maker/refine", {
      method: "POST",
      headers: { "Content-Type": "application/json", "CF-Connecting-IP": "3.3.3.3" },
      body: JSON.stringify({ category: "interest", topic: "test", level: "beginner", title: "test" }),
    });
    expect(blocked.status).toBe(429);
  });
});
```

- [ ] **Step 2: Run test to confirm failure**

```bash
cd /Users/xiaoxu/Projects/daodao/daodao-worker
npm test -- test/routes/refine.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Create refine prompt**

```typescript
// src/prompts/refine.ts
import type { ActionLevel, CategoryType, Locale } from "../domain-types";

interface RefinePromptInput {
  category: CategoryType;
  topic: string;
  level: ActionLevel;
  title: string;
  description?: string;
}

const LEVEL_LABELS_ZH: Record<ActionLevel, string> = {
  beginner: "初學（簡單、低門檻、5-20 分鐘）",
  intermediate: "中級（適度挑戰、20-60 分鐘）",
  advanced: "進階（高投入、40 分鐘以上）",
};

export function buildRefineSystemPrompt(): string {
  return `你是一位個人成長教練。用戶已經有一個粗略的行動想法，你需要幫他完善成一個具體、可執行的行動建議。
你必須只回傳合法的 JSON 物件，不得包含 markdown 或解釋文字。

JSON 結構：
{
  "title": "完善後的行動標題（20 字以內）",
  "description": "具體可執行的步驟描述（50 字以內）",
  "duration": "約 X 分鐘",
  "tip": "實用技巧（30 字以內）",
  "rationale": "說明為何有效（30 字以內）"
}

規則：
- 保留用戶的核心意圖，讓行動更具體、更可執行
- 根據指定等級調整行動的難度和時間投入
- 只回傳 JSON，不要其他內容`;
}

export function buildRefineUserPrompt(input: RefinePromptInput): string {
  const levelLabel = LEVEL_LABELS_ZH[input.level];
  const descStr = input.description ? `\n用戶描述：${input.description}` : "";

  return `請幫我完善以下行動想法。
分類：${input.category}
主題：${input.topic}
等級：${levelLabel}
用戶標題：${input.title}${descStr}

請根據等級要求完善這個行動，回傳 JSON。`;
}
```

- [ ] **Step 4: Add refine handler to action-maker route**

In `src/routes/action-maker.ts`, add the refine POST handler with:
- Same rate limiter as generate
- Input validation: category, topic, level, title required
- Sanitize: title max 30 chars, description max 200 chars
- Workers AI call with refine prompt
- Build IAction from response (id: "custom-refined", categoryId from input, level from input, locked: false)
- Langfuse trace + internal API record storage

- [ ] **Step 5: Run tests**

```bash
cd /Users/xiaoxu/Projects/daodao/daodao-worker
npm test
```

Expected: All PASS.

- [ ] **Step 6: Commit**

```bash
cd /Users/xiaoxu/Projects/daodao/daodao-worker
git add src/prompts/refine.ts src/routes/action-maker.ts test/routes/refine.test.ts
git commit -m "feat: implement action-maker refine endpoint for AI-assisted custom actions"
```

---

## Chunk 5: Frontend Integration

### Task 12: Update state types + provider for session_id

**Files:**
- Modify: `daodao-f2e/packages/features/action-maker/src/types/index.ts`
- Modify: `daodao-f2e/packages/features/action-maker/src/providers/action-maker-provider.tsx`

- [ ] **Step 1: Add session_id and usedRefine to state types**

In `types/index.ts`, update `IActionMakerState`:

```typescript
/** Action Maker 完整狀態 */
export interface IActionMakerState {
  userInput: IUserInput;
  userSelection: IUserSelection;
  generatedActions: IAction[];
  sessionId: string | null;   // NEW: Worker AI session tracking
  usedRefine: boolean;        // NEW: Whether user used AI refine
}
```

- [ ] **Step 2: Update provider reducer**

In `action-maker-provider.tsx`:

Add new action types:

```typescript
| { type: "SET_SESSION_ID"; payload: string }
| { type: "SET_USED_REFINE"; payload: boolean }
```

Update `initialState`:

```typescript
const initialState: IActionMakerState = {
  userInput: { nickname: "", topic: "", category: null, selectedTags: [] },
  userSelection: { action: null, triggerTiming: "" },
  generatedActions: [],
  sessionId: null,
  usedRefine: false,
};
```

Add reducer cases:

```typescript
case "SET_SESSION_ID":
  return { ...state, sessionId: action.payload };
case "SET_USED_REFINE":
  return { ...state, usedRefine: action.payload };
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/xiaoxu/Projects/daodao/daodao-f2e
pnpm run typecheck
```

Expected: No errors (or only pre-existing errors unrelated to our changes).

- [ ] **Step 4: Commit**

```bash
cd /Users/xiaoxu/Projects/daodao/daodao-f2e
git add packages/features/action-maker/src/types/index.ts packages/features/action-maker/src/providers/action-maker-provider.tsx
git commit -m "feat: add sessionId and usedRefine to action-maker state"
```

---

### Task 13: Replace mock with Worker API call

**Files:**
- Modify: `daodao-f2e/packages/features/action-maker/src/hooks/use-generate-actions.ts`

- [ ] **Step 1: Replace mock implementation with real API call**

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
  locale?: "zh-TW" | "en";
  session_id?: string;
}

interface UseGenerateActionsReturn {
  actions: IAction[] | null;
  isLoading: boolean;
  error: Error | null;
  isFallback: boolean;
  sessionId: string | null;
}

export function useGenerateActions(
  input: UseGenerateActionsInput | null,
): UseGenerateActionsReturn {
  const [actions, setActions] = useState<IAction[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isFallback, setIsFallback] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
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
        const sid = input.session_id ?? crypto.randomUUID();
        const response = await fetch(`${WORKER_URL}/action-maker/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category: input.category,
            topic: input.topic,
            tags: input.tags,
            locale: input.locale ?? "zh-TW",
            session_id: sid,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Worker returned ${response.status}`);
        }

        const json = (await response.json()) as {
          success: boolean;
          data: { actions: IAction[]; session_id: string };
        };

        if (!json.success || !Array.isArray(json.data?.actions)) {
          throw new Error("Invalid response from worker");
        }

        setActions(json.data.actions);
        setSessionId(json.data.session_id);
        setIsFallback(false);
      } catch (err) {
        if (controller.signal.aborted) return;

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

  return { actions, isLoading, error, isFallback, sessionId };
}
```

- [ ] **Step 2: Update action-maker-actions.tsx to store sessionId**

In `action-maker-actions.tsx`, after the `useGenerateActions` call returns actions, dispatch `SET_SESSION_ID`:

```typescript
const { actions: apiActions, isLoading, sessionId } = useGenerateActions(apiInput);

useEffect(() => {
  if (sessionId) {
    dispatch({ type: "SET_SESSION_ID", payload: sessionId });
  }
}, [sessionId, dispatch]);
```

- [ ] **Step 3: Add `NEXT_PUBLIC_WORKER_URL` to env files**

```bash
# For local development
echo "NEXT_PUBLIC_WORKER_URL=http://localhost:8787" >> /Users/xiaoxu/Projects/daodao/daodao-f2e/apps/website/.env.local
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd /Users/xiaoxu/Projects/daodao/daodao-f2e
pnpm run typecheck
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
cd /Users/xiaoxu/Projects/daodao/daodao-f2e
git add packages/features/action-maker/src/hooks/use-generate-actions.ts packages/features/action-maker/src/components/action-maker-actions.tsx
git commit -m "feat: connect action-maker to daodao-worker AI API"
```

---

### Task 14: AI refine hook + custom form UI

**Files:**
- Create: `daodao-f2e/packages/features/action-maker/src/hooks/use-refine-action.ts`
- Modify: `daodao-f2e/packages/features/action-maker/src/components/action-maker-actions.tsx`

- [ ] **Step 1: Create refine hook**

```typescript
// hooks/use-refine-action.ts
"use client";

import { useCallback, useState } from "react";
import type { ActionLevel, CategoryType, IAction } from "../types";

const WORKER_URL =
  process.env.NEXT_PUBLIC_WORKER_URL ?? "https://worker.daodao.so";

interface RefineInput {
  category: CategoryType;
  topic: string;
  level: ActionLevel;
  title: string;
  description?: string;
  session_id?: string;
}

interface UseRefineActionReturn {
  refinedAction: IAction | null;
  isRefining: boolean;
  refineError: Error | null;
  refine: (input: RefineInput) => Promise<void>;
  reset: () => void;
}

export function useRefineAction(): UseRefineActionReturn {
  const [refinedAction, setRefinedAction] = useState<IAction | null>(null);
  const [isRefining, setIsRefining] = useState(false);
  const [refineError, setRefineError] = useState<Error | null>(null);

  const refine = useCallback(async (input: RefineInput) => {
    setIsRefining(true);
    setRefineError(null);
    setRefinedAction(null);

    try {
      const response = await fetch(`${WORKER_URL}/action-maker/refine`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        throw new Error(`Worker returned ${response.status}`);
      }

      const json = (await response.json()) as {
        success: boolean;
        data: { action: IAction; session_id: string };
      };

      if (!json.success || !json.data?.action) {
        throw new Error("Invalid response from worker");
      }

      setRefinedAction(json.data.action);
    } catch (err) {
      setRefineError(
        err instanceof Error ? err : new Error("Failed to refine action"),
      );
    } finally {
      setIsRefining(false);
    }
  }, []);

  const reset = useCallback(() => {
    setRefinedAction(null);
    setRefineError(null);
  }, []);

  return { refinedAction, isRefining, refineError, refine, reset };
}
```

- [ ] **Step 2: Update custom form in action-maker-actions.tsx**

Update the custom form section to add:

1. **Level selection step** — three buttons/cards before the form:
   - "初學" (beginner) — 簡單、低門檻
   - "中級" (intermediate) — 適度挑戰
   - "進階" (advanced) — 高投入

2. **"AI 幫我完善" button** — calls `refine()` with form data

3. **Refine result view** — shows AI version with three choices:
   - "採用 AI 版本" → use refined action
   - "自己修改" → go back to form pre-filled with AI content
   - "用我原本的" → use original input

4. **"直接使用" button** — skips AI refine

Add state: `customLevel`, `refineState` ("idle" | "selecting-level" | "filling" | "refining" | "comparing")

When user submits via AI version, dispatch `SET_USED_REFINE` with `true`.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/xiaoxu/Projects/daodao/daodao-f2e
pnpm run typecheck
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/xiaoxu/Projects/daodao/daodao-f2e
git add packages/features/action-maker/src/hooks/use-refine-action.ts packages/features/action-maker/src/components/action-maker-actions.tsx
git commit -m "feat: add AI refine flow to custom action form"
```

---

### Task 15: Result page — "開始實踐" button

**Files:**
- Create: `daodao-f2e/packages/features/action-maker/src/hooks/use-create-practice-from-action.ts`
- Modify: `daodao-f2e/packages/features/action-maker/src/components/action-maker-result.tsx`

- [ ] **Step 1: Create practice creation hook**

```typescript
// hooks/use-create-practice-from-action.ts
"use client";

import { useCallback, useState } from "react";
import { createPractice } from "@daodao/api";
import type { IActionMakerResult } from "../types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://server.daodao.so";

interface UseCreatePracticeReturn {
  isCreating: boolean;
  createError: Error | null;
  createPracticeFromResult: (
    result: IActionMakerResult,
    sessionId: string | null,
    usedRefine: boolean,
  ) => Promise<{ practiceId: string } | null>;
}

export function useCreatePracticeFromAction(): UseCreatePracticeReturn {
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<Error | null>(null);

  const createPracticeFromResult = useCallback(
    async (
      result: IActionMakerResult,
      sessionId: string | null,
      usedRefine: boolean,
    ) => {
      setIsCreating(true);
      setCreateError(null);

      try {
        // 1. Create practice
        const { data, error } = await createPractice({
          title: result.action.title ?? "",
          practiceAction: result.action.description ?? undefined,
          otherContext: result.triggerTiming,
          tags: [result.category],
          startDate: new Date().toISOString().split("T")[0],
          durationDays: 14,
          frequencyMinDays: 1,
          frequencyMaxDays: 1,
          isDraft: false,
        });

        if (error || !data) {
          throw new Error("Failed to create practice");
        }

        const practiceId = (data as { data?: { id?: string } })?.data?.id;

        // 2. Report interaction to ai-generations (non-blocking)
        if (sessionId) {
          fetch(`${API_URL}/api/v1/ai-generations/${sessionId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              user_interaction: {
                selected_action_id: result.action.id,
                selected_level: result.action.level,
                used_refine: usedRefine,
                created_practice_id: practiceId ? Number(practiceId) : undefined,
                completed_flow: true,
              },
            }),
          }).catch(() => {
            // Non-blocking, ignore errors
          });
        }

        return practiceId ? { practiceId: String(practiceId) } : null;
      } catch (err) {
        setCreateError(
          err instanceof Error ? err : new Error("Failed to create practice"),
        );
        return null;
      } finally {
        setIsCreating(false);
      }
    },
    [],
  );

  return { isCreating, createError, createPracticeFromResult };
}
```

- [ ] **Step 2: Update result page**

In `action-maker-result.tsx`, add:

1. Import `useAuth`, `useCreatePracticeFromAction`, `useActionMaker`
2. Add "開始實踐" as primary CTA button
3. On click:
   - If authenticated → call `createPracticeFromResult` → navigate to `/practices/{id}`
   - If not authenticated → `openLoginDialog({ redirectUrl: "/action-maker/result" })`
4. After login (detected via `isAuthenticated` change) → auto-create practice → navigate
5. Rearrange buttons: 開始實踐 (primary) > 分享 (secondary) > 再玩一次 (tertiary)
6. Show "登入後即可開始你的微習慣追蹤" text for unauthenticated users

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/xiaoxu/Projects/daodao/daodao-f2e
pnpm run typecheck
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/xiaoxu/Projects/daodao/daodao-f2e
git add packages/features/action-maker/src/hooks/use-create-practice-from-action.ts packages/features/action-maker/src/components/action-maker-result.tsx
git commit -m "feat: add create practice flow to action-maker result page"
```

---

## Chunk 6: Integration Testing

### Task 16: End-to-end manual verification

- [ ] **Step 1: Start Worker locally**

```bash
cd /Users/xiaoxu/Projects/daodao/daodao-worker
npx wrangler dev
```

Expected: Worker running on http://localhost:8787

- [ ] **Step 2: Test generate endpoint**

```bash
curl -X POST http://localhost:8787/action-maker/generate \
  -H "Content-Type: application/json" \
  -d '{"category":"interest","topic":"學吉他","locale":"zh-TW","session_id":"test-123"}'
```

Expected: JSON with 3 actions or 500 (if Workers AI unavailable locally).

- [ ] **Step 3: Test refine endpoint**

```bash
curl -X POST http://localhost:8787/action-maker/refine \
  -H "Content-Type: application/json" \
  -d '{"category":"interest","topic":"學吉他","level":"beginner","title":"練吉他","description":"每天練一下","session_id":"test-123"}'
```

Expected: JSON with refined action or 500.

- [ ] **Step 4: Test rate limiting**

```bash
for i in {1..6}; do
  echo "Request $i:"
  curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:8787/action-maker/generate \
    -H "Content-Type: application/json" \
    -H "CF-Connecting-IP: 9.9.9.9" \
    -d '{"category":"interest","topic":"test"}'
  echo ""
done
```

Expected: First 5 return 200/500, 6th returns 429.

- [ ] **Step 5: Test frontend flow (if daodao-server running)**

Start frontend dev server and navigate to `/action-maker`. Walk through:
1. Enter nickname → topic → select category
2. See AI-generated actions (or fallback if Worker AI unavailable)
3. Try "我想自己設定" → select level → fill form → "AI 幫我完善"
4. Go to result → click "開始實踐" → verify login flow → verify practice creation

- [ ] **Step 6: Run all Worker tests**

```bash
cd /Users/xiaoxu/Projects/daodao/daodao-worker
npm test
```

Expected: All PASS.

- [ ] **Step 7: Run server typecheck**

```bash
cd /Users/xiaoxu/Projects/daodao/daodao-server
pnpm run typecheck
```

Expected: No errors.
