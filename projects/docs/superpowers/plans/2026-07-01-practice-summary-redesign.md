# Practice Summary Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the practice summary page into a 3-Surface mobile-first architecture with 4 stage states, matching PRD/FRD/Design Handoff specifications.

**Architecture:** Three repos modified in dependency order: daodao-storage (DB migration) → daodao-server (API endpoints) → daodao-f2e (frontend). Each repo branches from `dev` and opens a PR back to `dev`. Frontend uses same-page surface switching via React state, not routes.

**Tech Stack:** PostgreSQL (raw SQL migrations), NestJS-style Node.js (Zod + Prisma + asyncHandler), Next.js + React + Tailwind CSS v4 + motion/react + SWR + @daodao/ui (Sheet/DialogManager)

## Global Constraints

- Each repo: `git checkout dev && git pull && git checkout -b feat/practice-summary-redesign`
- Migration file naming: `{NNN}_{description}.sql` (next is `065`)
- Server endpoint pattern: Zod validator → route (authenticate + validate) → controller (asyncHandler) → service (Prisma + createSuccessResponse)
- Frontend: `motion/react` (not framer-motion), Tailwind CSS v4 oklch tokens, SWR for data fetching, `useSheetManager()` for bottom sheets
- AI insight unlock threshold: `progressPercentage >= 70 AND avgWords >= 30` (use FRD value, not design handoff's 50)
- All oklch color tokens already exist in globals.css — use Tailwind classes (`text-logo-cyan`, `bg-primary-palest`, etc.), not hardcoded hex

---

### Task 1: DB Migration — Add practice summary columns (daodao-storage)

**Files:**
- Create: `daodao-storage/migrate/sql/065_add_practice_summary_fields.sql`

**Interfaces:**
- Produces: 4 new columns on `practices` table — `next_intent TEXT`, `next_intent_draft_id INTEGER`, `selected_checkin_ids JSONB`, `insight_feedback JSONB`

- [ ] **Step 1: Branch from dev**

```bash
cd /Users/xiaoxu/Projects/daodao/projects/daodao-storage
git checkout dev && git pull origin dev
git checkout -b feat/practice-summary-redesign
```

- [ ] **Step 2: Create migration file**

Create `migrate/sql/065_add_practice_summary_fields.sql`:

```sql
-- Migration: 065_add_practice_summary_fields
-- Description: 新增實踐總結頁所需欄位：
--   next_intent — 「接下來我想」文字
--   next_intent_draft_id — 存成草稿時的新實踐 ID
--   selected_checkin_ids — 精選打卡 ID 陣列
--   insight_feedback — AI 洞察回饋（JSON: {type, reasons}）
--   注意：reflection 欄位已存在，無需新增

-- Up
ALTER TABLE practices
ADD COLUMN IF NOT EXISTS next_intent TEXT;

ALTER TABLE practices
ADD COLUMN IF NOT EXISTS next_intent_draft_id INTEGER REFERENCES practices(id);

ALTER TABLE practices
ADD COLUMN IF NOT EXISTS selected_checkin_ids JSONB DEFAULT '[]';

ALTER TABLE practices
ADD COLUMN IF NOT EXISTS insight_feedback JSONB;

-- Down (rollback)
-- ALTER TABLE practices DROP COLUMN IF EXISTS next_intent;
-- ALTER TABLE practices DROP COLUMN IF EXISTS next_intent_draft_id;
-- ALTER TABLE practices DROP COLUMN IF EXISTS selected_checkin_ids;
-- ALTER TABLE practices DROP COLUMN IF EXISTS insight_feedback;
```

- [ ] **Step 3: Run migration against dev DB**

```bash
make migrate-sql-dev
```

Expected: Migration `065_add_practice_summary_fields.sql` executed successfully.

- [ ] **Step 4: Verify columns exist**

```bash
make migrate-sql-status-dev
```

Expected: `065_add_practice_summary_fields.sql` shows status `SUCCESS`.

- [ ] **Step 5: Commit**

Use `format-commit` skill (scoped to daodao-storage).

---

### Task 2: Expose reflection + avgWords in practice API response (daodao-server)

**Files:**
- Modify: `daodao-server/src/types/practice.types.ts` — add `reflection`, `avgWords`, `nextIntent`, `selectedCheckInIds`, `insightFeedback` to PracticeEntity
- Modify: `daodao-server/src/services/practice.service.ts` — update `findById` to include new fields + compute avgWords
- Modify: `daodao-server/src/services/practice.service.ts` — update `toPracticeEntity` mapper if one exists

**Interfaces:**
- Consumes: DB columns from Task 1
- Produces: Extended `PracticeEntity` with new fields available in GET /practices/:id response

- [ ] **Step 1: Branch from dev**

```bash
cd /Users/xiaoxu/Projects/daodao/projects/daodao-server
git checkout dev && git pull origin dev
git checkout -b feat/practice-summary-redesign
```

- [ ] **Step 2: Add fields to PracticeEntity type**

In `src/types/practice.types.ts`, add to the `PracticeEntity` interface:

```typescript
reflection?: string;
nextIntent?: string;
selectedCheckInIds?: string[];
insightFeedback?: { type: 'positive' | 'negative'; reasons?: string[] } | null;
avgWords?: number;
```

- [ ] **Step 3: Update findById to include new fields + compute avgWords**

In `src/services/practice.service.ts`, update the `findById` method:

1. Add `reflection`, `next_intent`, `selected_checkin_ids`, `insight_feedback` to the Prisma `select` clause
2. Add a query to compute avgWords from check-ins:

```typescript
const avgWordsResult = await prismaClient.practice_checkins.aggregate({
  where: { practice_id: practiceId, deleted_at: null },
  _avg: { note: undefined },
});
// Since Prisma can't avg string length, use raw query:
const avgWordsQuery = await prismaClient.$queryRaw<[{ avg_words: number }]>`
  SELECT COALESCE(AVG(array_length(regexp_split_to_array(COALESCE(note, ''), '\\s+'), 1)), 0)::numeric AS avg_words
  FROM practice_checkins
  WHERE practice_id = ${practiceId} AND deleted_at IS NULL AND note IS NOT NULL AND note != ''
`;
const avgWords = Math.round(Number(avgWordsQuery[0]?.avg_words ?? 0));
```

3. Map the new fields in the response:

```typescript
reflection: practice.reflection ?? undefined,
nextIntent: practice.next_intent ?? undefined,
selectedCheckInIds: (practice.selected_checkin_ids as string[]) ?? [],
insightFeedback: practice.insight_feedback as PracticeEntity['insightFeedback'] ?? null,
avgWords,
```

- [ ] **Step 4: Verify by calling GET /practices/:id**

Start server, call the endpoint with an existing practice ID. Confirm the new fields appear in the response.

- [ ] **Step 5: Commit**

Use `format-commit` skill (scoped to daodao-server).

---

### Task 3: PATCH /reflection endpoint (daodao-server)

**Files:**
- Modify: `daodao-server/src/validators/practice.validators.ts` — add reflection schemas
- Modify: `daodao-server/src/services/practice.service.ts` — add `updateReflection` method
- Modify: `daodao-server/src/controllers/practice.controller.ts` — add `patchReflection` method
- Modify: `daodao-server/src/routes/practice.routes.ts` — register route

**Interfaces:**
- Consumes: `reflection` column (already exists in DB)
- Produces: `PATCH /api/v1/practices/:id/reflection` → `{ reflection: string }`

- [ ] **Step 1: Add Zod validator**

In `src/validators/practice.validators.ts`:

```typescript
export const updateReflectionSchema = z.object({
  reflection: z.string().min(1, '反思內容不可為空').max(2000, '反思內容不可超過 2000 字')
    .openapi({
      description: '使用者的實踐反思',
      example: '這段實踐讓我學會了...',
    }),
}).openapi('UpdateReflectionRequest', {
  description: '更新實踐反思的請求資料',
});
```

- [ ] **Step 2: Add service method**

In `src/services/practice.service.ts`:

```typescript
export async function updateReflection(
  practiceId: number,
  userId: number,
  reflection: string
): Promise<ApiSuccessResponse<{ reflection: string }>> {
  const practice = await prismaClient.practices.findUnique({
    where: { id: practiceId },
    select: { user_id: true },
  });
  if (!practice) throw new NotFoundError('Practice not found');
  if (practice.user_id !== userId) throw new ForbiddenError('Only the practice owner can edit reflection');

  const updated = await prismaClient.practices.update({
    where: { id: practiceId },
    data: { reflection },
    select: { reflection: true },
  });
  return createSuccessResponse({ reflection: updated.reflection || '' });
}
```

- [ ] **Step 3: Add controller method**

In `src/controllers/practice.controller.ts`:

```typescript
patchReflection = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (!req.user || typeof req.user.id !== 'number') {
    throw new UnauthorizedError('未授權存取');
  }
  const practiceId = await validateAndConvertPracticeId(req.params.id);
  const result = await practiceService.updateReflection(practiceId, req.user.id, req.body.reflection);
  res.json(result);
});
```

- [ ] **Step 4: Register route**

In `src/routes/practice.routes.ts`:

```typescript
router.patch('/:id/reflection',
  authenticate,
  validate(practiceParamsSchema, 'params'),
  validate(updateReflectionSchema, 'body'),
  practiceController.patchReflection as RequestHandler);
```

- [ ] **Step 5: Test endpoint**

```bash
curl -X PATCH http://localhost:3001/api/v1/practices/{id}/reflection \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"reflection":"這段實踐讓我學到很多"}'
```

Expected: `{"success":true,"data":{"reflection":"這段實踐讓我學到很多"}}`

- [ ] **Step 6: Commit**

Use `format-commit` skill (scoped to daodao-server).

---

### Task 4: PATCH /next-intent + PATCH /selected-checkins + POST /insight-feedback endpoints (daodao-server)

**Files:**
- Modify: `daodao-server/src/validators/practice.validators.ts` — add 3 new schemas
- Modify: `daodao-server/src/services/practice.service.ts` — add 3 methods
- Modify: `daodao-server/src/controllers/practice.controller.ts` — add 3 methods
- Modify: `daodao-server/src/routes/practice.routes.ts` — register 3 routes

**Interfaces:**
- Consumes: DB columns from Task 1
- Produces: 3 endpoints: `PATCH /:id/next-intent`, `PATCH /:id/selected-checkins`, `POST /:id/insight-feedback`

- [ ] **Step 1: Add Zod validators**

In `src/validators/practice.validators.ts`:

```typescript
export const updateNextIntentSchema = z.object({
  nextIntent: z.string().min(1).max(2000)
    .openapi({ description: '接下來我想做什麼', example: '想嘗試每天冥想10分鐘' }),
  saveDraft: z.boolean().optional()
    .openapi({ description: '是否存成草稿實踐' }),
}).openapi('UpdateNextIntentRequest');

export const updateSelectedCheckinsSchema = z.object({
  checkinIds: z.array(z.string().uuid()).min(1).max(3)
    .openapi({ description: '精選打卡的 external_id 陣列（最多3個）' }),
}).openapi('UpdateSelectedCheckinsRequest');

export const createInsightFeedbackSchema = z.object({
  type: z.enum(['positive', 'negative'])
    .openapi({ description: '回饋類型' }),
  reasons: z.array(z.string()).optional()
    .openapi({ description: '負面回饋原因', example: ['不是我的感受', '太籠統'] }),
}).openapi('CreateInsightFeedbackRequest');
```

- [ ] **Step 2: Add service methods**

In `src/services/practice.service.ts`, add three methods following the same pattern as `updateReflection` from Task 3:

**updateNextIntent**: Updates `next_intent` column. If `saveDraft` is true, calls `copyPractice` to create a draft and stores the new practice ID in `next_intent_draft_id`. Returns `{ nextIntent, draftId? }`.

**updateSelectedCheckins**: Converts external UUIDs to internal IDs via `externalToInternalId`, validates they belong to this practice's check-ins, then updates `selected_checkin_ids` JSONB column. Returns `{ selectedCheckinIds }`.

**createInsightFeedback**: Updates `insight_feedback` JSONB column with `{ type, reasons }`. Returns `{ success: true }`.

Each method: fetch practice → check existence → check ownership → Prisma update → `createSuccessResponse()`.

- [ ] **Step 3: Add controller methods**

In `src/controllers/practice.controller.ts`, add three methods following the `patchInsight` pattern:

```typescript
patchNextIntent = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (!req.user || typeof req.user.id !== 'number') throw new UnauthorizedError('未授權存取');
  const practiceId = await validateAndConvertPracticeId(req.params.id);
  const result = await practiceService.updateNextIntent(practiceId, req.user.id, req.body.nextIntent, req.body.saveDraft);
  res.json(result);
});

patchSelectedCheckins = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (!req.user || typeof req.user.id !== 'number') throw new UnauthorizedError('未授權存取');
  const practiceId = await validateAndConvertPracticeId(req.params.id);
  const result = await practiceService.updateSelectedCheckins(practiceId, req.user.id, req.body.checkinIds);
  res.json(result);
});

postInsightFeedback = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (!req.user || typeof req.user.id !== 'number') throw new UnauthorizedError('未授權存取');
  const practiceId = await validateAndConvertPracticeId(req.params.id);
  const result = await practiceService.createInsightFeedback(practiceId, req.user.id, req.body);
  res.json(result);
});
```

- [ ] **Step 4: Register routes**

In `src/routes/practice.routes.ts`:

```typescript
router.patch('/:id/next-intent',
  authenticate,
  validate(practiceParamsSchema, 'params'),
  validate(updateNextIntentSchema, 'body'),
  practiceController.patchNextIntent as RequestHandler);

router.patch('/:id/selected-checkins',
  authenticate,
  validate(practiceParamsSchema, 'params'),
  validate(updateSelectedCheckinsSchema, 'body'),
  practiceController.patchSelectedCheckins as RequestHandler);

router.post('/:id/insight-feedback',
  authenticate,
  validate(practiceParamsSchema, 'params'),
  validate(createInsightFeedbackSchema, 'body'),
  practiceController.postInsightFeedback as RequestHandler);
```

- [ ] **Step 5: Test all 3 endpoints with curl**

Verify each returns correct response and persists to DB.

- [ ] **Step 6: Commit**

Use `format-commit` skill (scoped to daodao-server).

---

### Task 5: Update PracticeSummary type + hooks + stage computation (daodao-f2e)

**Files:**
- Modify: `daodao-f2e/packages/api/src/services/practice.ts` — extend PracticeSummary interface + getPracticeSummary
- Modify: `daodao-f2e/packages/api/src/services/practice-hooks.ts` — add new mutation hooks
- Create: `daodao-f2e/apps/product/src/components/practice/summary/hooks/use-practice-stage.ts`
- Create: `daodao-f2e/apps/product/src/components/practice/summary/hooks/use-reflection.ts`
- Create: `daodao-f2e/apps/product/src/components/practice/summary/hooks/use-next-intent.ts`
- Create: `daodao-f2e/apps/product/src/components/practice/summary/hooks/use-insight-feedback.ts`
- Create: `daodao-f2e/apps/product/src/components/practice/summary/hooks/use-selected-checkins.ts`
- Modify: `daodao-f2e/apps/product/src/components/practice/summary/hooks/index.ts` — re-export new hooks

**Interfaces:**
- Consumes: New API fields from Tasks 2-4
- Produces: `PracticeStage` type (`'active' | 'ending' | 'ended-deep' | 'ended-low'`), `usePracticeStage(summary)`, `useReflection(practiceId)`, `useNextIntent(practiceId)`, `useInsightFeedback(practiceId)`, `useSelectedCheckins(practiceId)`

- [ ] **Step 1: Branch from dev**

```bash
cd /Users/xiaoxu/Projects/daodao/projects/daodao-f2e
git checkout dev && git pull origin dev
git checkout -b feat/practice-summary-redesign
```

- [ ] **Step 2: Extend PracticeSummary interface**

In `packages/api/src/services/practice.ts`, add to `PracticeSummary`:

```typescript
reflection?: string;
nextIntent?: string;
nextIntentDraftId?: string;
selectedCheckInIds?: string[];
insightFeedback?: { type: 'positive' | 'negative'; reasons?: string[] } | null;
avgWords: number;
progressPercentage: number;
status: string;
```

Update `getPracticeSummary` to include these from the practice detail response.

- [ ] **Step 3: Add API mutation functions**

In `packages/api/src/services/practice.ts`, add typed client calls:

```typescript
export const updateReflection = async (id: string, reflection: string) => { /* PATCH /practices/{id}/reflection */ };
export const updateNextIntent = async (id: string, nextIntent: string, saveDraft?: boolean) => { /* PATCH /practices/{id}/next-intent */ };
export const updateSelectedCheckins = async (id: string, checkinIds: string[]) => { /* PATCH /practices/{id}/selected-checkins */ };
export const createInsightFeedback = async (id: string, type: 'positive' | 'negative', reasons?: string[]) => { /* POST /practices/{id}/insight-feedback */ };
```

Follow the existing `updatePracticeInsight` pattern with typed client casts.

- [ ] **Step 4: Create use-practice-stage.ts**

```typescript
export type PracticeStage = 'active' | 'ending' | 'ended-deep' | 'ended-low';

export function usePracticeStage(summary: PracticeSummary): PracticeStage {
  if (summary.status === 'active' || summary.status === 'not_started') {
    const endDate = new Date(summary.endDate);
    const today = new Date();
    const daysLeft = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysLeft <= 5 ? 'ending' : 'active';
  }
  return summary.progressPercentage >= 70 ? 'ended-deep' : 'ended-low';
}

export function isEnded(stage: PracticeStage): boolean {
  return stage === 'ended-deep' || stage === 'ended-low';
}

export function isInsightUnlocked(summary: PracticeSummary): boolean {
  return summary.progressPercentage >= 70
    && summary.avgWords >= 30
    && (summary.status === 'completed' || summary.status === 'archived');
}
```

- [ ] **Step 5: Create mutation hooks**

Create `use-reflection.ts`, `use-next-intent.ts`, `use-insight-feedback.ts`, `use-selected-checkins.ts`. Each follows this pattern:

```typescript
export function useReflection(practiceId: string) {
  const [isSaving, setIsSaving] = useState(false);
  const save = useCallback(async (text: string) => {
    setIsSaving(true);
    try {
      await updateReflection(practiceId, text);
      // mutate SWR cache
    } catch { toast.error('儲存反思失敗'); }
    finally { setIsSaving(false); }
  }, [practiceId]);
  return { save, isSaving };
}
```

- [ ] **Step 6: Update hooks/index.ts barrel export**

```typescript
export * from "./use-practice-summary-image";
export * from "./use-practice-stage";
export * from "./use-reflection";
export * from "./use-next-intent";
export * from "./use-insight-feedback";
export * from "./use-selected-checkins";
```

- [ ] **Step 7: Verify typecheck passes**

```bash
cd /Users/xiaoxu/Projects/daodao/projects/daodao-f2e && pnpm run typecheck
```

- [ ] **Step 8: Commit**

Use `format-commit` skill (scoped to daodao-f2e).

---

### Task 6: Surface architecture + chip navigation (daodao-f2e)

**Files:**
- Create: `daodao-f2e/apps/product/src/components/practice/summary/surface-nav-chip.tsx`
- Rewrite: `daodao-f2e/apps/product/src/components/practice/summary/practice-summary-page.tsx`
- Create: `daodao-f2e/apps/product/src/components/practice/summary/surface-1-summary.tsx` (placeholder)
- Create: `daodao-f2e/apps/product/src/components/practice/summary/surface-2-next-intent.tsx` (placeholder)
- Create: `daodao-f2e/apps/product/src/components/practice/summary/surface-3-share-card.tsx` (placeholder)

**Interfaces:**
- Consumes: `PracticeStage`, `isEnded()` from Task 5
- Produces: `SurfaceNavChip` component, rewritten `PracticeSummaryPage` with surface switching + shared state

- [ ] **Step 1: Create surface-nav-chip.tsx**

Chip dropdown navigation per FRD FR-3.2. Features:
- Pill-shaped chip showing current surface icon + name + dropdown arrow
- Click expands dropdown with 3 options (icon + name + description + checkmark for current)
- Surface 2/3 grayed out + disabled when `!isEnded(stage)`
- Click outside or re-click chip closes menu
- Chip background color changes per surface

```typescript
interface SurfaceNavChipProps {
  currentSurface: 1 | 2 | 3;
  stage: PracticeStage;
  onSurfaceChange: (surface: 1 | 2 | 3) => void;
}
```

Use Radix `DropdownMenu` from `@daodao/ui/components/dropdown-menu` for the popup behavior.

- [ ] **Step 2: Rewrite practice-summary-page.tsx**

Replace the current two-column layout with the surface container:

```typescript
export function PracticeSummaryPage({ summary }: PracticeSummaryPageProps) {
  const stage = usePracticeStage(summary);
  const ended = isEnded(stage);

  // Surface state
  const [currentSurface, setCurrentSurface] = useState<1 | 2 | 3>(1);

  // Shared state (single source of truth)
  const [reflectionText, setReflectionText] = useState(summary.reflection ?? '');
  const [selectedCheckInIds, setSelectedCheckInIds] = useState<string[]>(summary.selectedCheckInIds ?? []);
  const [themeIndex, setThemeIndex] = useState(0);

  const handleSurfaceChange = (surface: 1 | 2 | 3) => {
    if (!ended && surface !== 1) {
      toast.error('實踐結束後才能使用此功能');
      return;
    }
    setCurrentSurface(surface);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="relative w-screen min-h-screen bg-white">
      <SurfaceNavChip currentSurface={currentSurface} stage={stage} onSurfaceChange={handleSurfaceChange} />

      {currentSurface === 1 && (
        <Surface1Summary summary={summary} stage={stage}
          reflectionText={reflectionText} onReflectionChange={setReflectionText} />
      )}
      {currentSurface === 2 && (
        <Surface2NextIntent summary={summary} />
      )}
      {currentSurface === 3 && (
        <Surface3ShareCard summary={summary}
          reflectionText={reflectionText} onReflectionChange={setReflectionText}
          selectedCheckInIds={selectedCheckInIds} onSelectedChange={setSelectedCheckInIds}
          themeIndex={themeIndex} onThemeChange={setThemeIndex} />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create placeholder surface components**

Create `surface-1-summary.tsx`, `surface-2-next-intent.tsx`, `surface-3-share-card.tsx` as placeholder components that render a simple div with the surface name. These will be fleshed out in subsequent tasks.

```typescript
// surface-1-summary.tsx
export function Surface1Summary({ summary, stage, reflectionText, onReflectionChange }: Surface1Props) {
  return <div className="max-w-[448px] mx-auto px-5 pb-24"><p>Surface 1: 實踐總結 (placeholder)</p></div>;
}
```

- [ ] **Step 4: Update index.ts barrel export**

Update `index.ts` to export the new surface components and remove old `PracticeSummaryCard` export (it will be replaced later).

- [ ] **Step 5: Verify the page renders with surface switching**

Start dev server, navigate to a practice summary page. Confirm:
- Chip shows at top, clicking opens dropdown with 3 options
- Switching surfaces changes the visible content
- Surface 2/3 blocked when practice is not ended

- [ ] **Step 6: Commit**

Use `format-commit` skill (scoped to daodao-f2e).

---

### Task 7: Surface 1 — Hero section + stats area (daodao-f2e)

**Files:**
- Create: `daodao-f2e/apps/product/src/components/practice/summary/sections/hero-section.tsx`
- Modify: `daodao-f2e/apps/product/src/components/practice/summary/surface-1-summary.tsx` — integrate hero

**Interfaces:**
- Consumes: `PracticeSummary`, `PracticeStage`
- Produces: `HeroSection` component with badge pill, radial background, mascot avatar, floating dots, stats area (check-in count + keyword bubbles + mood icons)

- [ ] **Step 1: Create hero-section.tsx**

Build the hero per design handoff Section "Surface 1 — 實踐總結":

```typescript
interface HeroSectionProps {
  summary: PracticeSummary;
  stage: PracticeStage;
}
```

Contains:
1. **Radial SVG background** — inline SVG with `--logo-cyan` at 10% opacity
2. **Mascot avatar** — 48×48 circle, `bg-primary-lightest`, "島" text, positioned top-right
3. **Floating dots** — 3 decorative circles with CSS `float-dots` animation (3s infinite `translateY(0 → -8px → 0)`)
4. **Badge pill** — stage-dependent text/color from the stage config table
5. **Title h1** — 24px/700 weight, stage-dependent text
6. **Subtitle p** — 14px, `text-logo-gray`
7. **成長足跡統計區** — `bg-primary-palest` rounded-2xl card containing:
   - Left: check-in count (28px bold number + "次")
   - Center: 3 keyword bubble circles (different sizes, `bg-light-blue`/`bg-basic-100`/white)
   - Bottom row: "過程心情" label + mood SVG icons from `@daodao/assets`
   - Background decorations: yellow half-arc + aqua half-arc (CSS positioned divs)

Use `motion/react` for `fadeInUp` animation with stagger.

Stage config mapping:

```typescript
const STAGE_CONFIG = {
  active: { badge: '進行中', badgeBg: 'bg-yellow-100', badgeText: 'text-yellow-800', heroTitle: summary.practiceName },
  ending: { badge: '進行中', badgeBg: 'bg-yellow-100', badgeText: 'text-yellow-800', heroTitle: summary.practiceName },
  'ended-deep': { badge: '實踐完成', badgeBg: 'bg-primary-lightest', badgeText: 'text-text-dark', heroTitle: '恭喜完成這段實踐' },
  'ended-low': { badge: '走完這段旅程', badgeBg: 'bg-primary-lightest', badgeText: 'text-text-dark', heroTitle: '你走完了這段旅程' },
} as const;
```

- [ ] **Step 2: Add CSS keyframes for float-dots**

Add to the component or to a shared CSS file:

```css
@keyframes float-dots {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}
```

Or use Tailwind arbitrary animation: `animate-[float-dots_3s_ease-in-out_infinite]`.

- [ ] **Step 3: Integrate into surface-1-summary.tsx**

Replace the placeholder content with `<HeroSection summary={summary} stage={stage} />` at the top.

- [ ] **Step 4: Verify visually**

Check the hero renders correctly with proper badge, stats, mood icons, and floating dot animation.

- [ ] **Step 5: Commit**

Use `format-commit` skill (scoped to daodao-f2e).

---

### Task 8: Surface 1 — AI insight card (daodao-f2e)

**Files:**
- Create: `daodao-f2e/apps/product/src/components/practice/summary/sections/ai-insight-card.tsx`
- Modify: `daodao-f2e/apps/product/src/components/practice/summary/surface-1-summary.tsx`

**Interfaces:**
- Consumes: `PracticeSummary`, `isInsightUnlocked()`, `useInsightFeedback()`
- Produces: `AiInsightCard` component with locked/unlocked states + feedback mechanism

- [ ] **Step 1: Create ai-insight-card.tsx**

Two visual states based on `isInsightUnlocked(summary)`:

**Unlocked state:**
- White card, 1px border `border-basic-200`, rounded-2xl
- 3 sections separated by `border-b border-basic-100`:
  - 核心突破 (with lightbulb icon)
  - 你的節奏 (with sprout icon)
  - 值得深挖的洞見 (with star icon)
- Each section shows portion of `summary.insight` (split into 3 paragraphs if possible)
- Bottom: feedback row with 👍 "貼近" / 👎 "不太好" buttons
- After clicking "不太好": expand chip row (不是我的感受 / 語氣不對 / 太籠統 / 建議不好), multi-select, auto-save
- After any feedback: show "謝謝你的回饋 ✓" and hide buttons

```typescript
interface AiInsightCardProps {
  summary: PracticeSummary;
  stage: PracticeStage;
}
```

**Locked state:**
- Same card dimensions but with blurred preview (`filter: blur(5px)`, `opacity: 0.45`, `pointer-events: none`)
- Floating lock card overlay (white, rounded-2xl, shadow) with:
  - Lock icon (for active/ending: sprout icon; for ended-low: heart icon)
  - Title: stage-dependent ("洞察累積中" or "給你的鼓勵")
  - Description: stage-dependent encouragement text
- No feedback UI

- [ ] **Step 2: Integrate into surface-1-summary.tsx**

Add `<AiInsightCard summary={summary} stage={stage} />` after the hero section.

- [ ] **Step 3: Verify both states**

Test with a practice that has insight (unlocked) and one without (locked). Verify blur effect, feedback interaction.

- [ ] **Step 4: Commit**

Use `format-commit` skill (scoped to daodao-f2e).

---

### Task 9: Surface 1 — Check-in highlights + reflection + CTA + nudge + footer (daodao-f2e)

**Files:**
- Create: `daodao-f2e/apps/product/src/components/practice/summary/sections/checkin-highlights.tsx`
- Create: `daodao-f2e/apps/product/src/components/practice/summary/sections/reflection-section.tsx`
- Create: `daodao-f2e/apps/product/src/components/practice/summary/sections/next-step-cta.tsx`
- Modify: `daodao-f2e/apps/product/src/components/practice/summary/surface-1-summary.tsx`
- Delete: `daodao-f2e/apps/product/src/components/practice/summary/practice-insight-section.tsx` (replaced by ai-insight-card)

**Interfaces:**
- Consumes: `PracticeSummary`, `PracticeStage`, `isEnded()`, `useReflection()`
- Produces: Complete Surface 1 layout

- [ ] **Step 1: Create checkin-highlights.tsx**

Read-only display of 3 featured check-ins per design handoff:
- Section title "打卡精選"
- 3 cards: each shows Day N / date / note text (line-clamp-3)
- White card with 1px border, rounded-xl

```typescript
interface CheckinHighlightsProps {
  topNotes: string[];
  topCheckInDays?: Array<{ day: number; date: string; text: string }>;
}
```

- [ ] **Step 2: Create reflection-section.tsx**

4-state component per FRD FR-3.3.6:

```typescript
interface ReflectionSectionProps {
  stage: PracticeStage;
  reflectionText: string;
  onReflectionChange: (text: string) => void;
  practiceId: string;
}
```

States:
1. **Locked** (`!isEnded(stage)`): Lock icon + "實踐結束後，你可以在這裡為這段旅程留下一句話。"
2. **Preview** (ended + no text): Guide text + "寫下我的反思" button
3. **Edit** (editing): textarea (auto-focus) + 儲存/取消 buttons, calls `useReflection().save()`
4. **Saved** (has text): italic blockquote with left `border-l-2 border-primary-lighter` + 編輯 button

Internal state machine: `mode: 'locked' | 'preview' | 'edit' | 'saved'`, derived from props on mount.

- [ ] **Step 3: Create next-step-cta.tsx**

Per FRD FR-3.3.7:
- Separator line with label ("下一步" or "實踐結束後解鎖")
- Primary CTA: "接下來想做什麼？" — yellow gradient card, sprout icon 44×44, arrow icon. Disabled when `!isEnded(stage)` (opacity .4, pointer-events none). Clicks `onSurfaceChange(2)`.
- Secondary CTA: "也想分享這段實踐嗎？" — transparent border card. Clicks `onSurfaceChange(3)`.
- Nudge (only for `stage === 'ending'`): `bg-primary-palest` + `border-primary-lighter` card with heart icon + encouragement text
- Footer: closing text + export link (low-key text style per FRD FR-3.3.9)

```typescript
interface NextStepCtaProps {
  stage: PracticeStage;
  onSurfaceChange: (surface: 2 | 3) => void;
  summary: PracticeSummary;
}
```

- [ ] **Step 4: Assemble surface-1-summary.tsx**

Replace placeholder with full layout:

```typescript
export function Surface1Summary({ summary, stage, reflectionText, onReflectionChange, onSurfaceChange }: Surface1Props) {
  return (
    <main className="max-w-[448px] mx-auto px-5 pb-24">
      <HeroSection summary={summary} stage={stage} />
      <AiInsightCard summary={summary} stage={stage} />
      <CheckinHighlights topNotes={summary.topNotes} />
      <ReflectionSection stage={stage} reflectionText={reflectionText}
        onReflectionChange={onReflectionChange} practiceId={summary.practiceId} />
      <NextStepCta stage={stage} onSurfaceChange={onSurfaceChange} summary={summary} />
    </main>
  );
}
```

- [ ] **Step 5: Delete old practice-insight-section.tsx**

Remove the file and its export from `index.ts`.

- [ ] **Step 6: Verify complete Surface 1**

Navigate to summary page. Check all sections render correctly for both ended and active practices. Test reflection flow (preview → edit → save → saved → re-edit).

- [ ] **Step 7: Commit**

Use `format-commit` skill (scoped to daodao-f2e).

---

### Task 10: Surface 2 — 接下來我想 (daodao-f2e)

**Files:**
- Rewrite: `daodao-f2e/apps/product/src/components/practice/summary/surface-2-next-intent.tsx`

**Interfaces:**
- Consumes: `PracticeSummary`, `isInsightUnlocked()`, `useNextIntent()`, check-in data
- Produces: Complete Surface 2

- [ ] **Step 1: Implement surface-2-next-intent.tsx**

Per FRD FR-3.4:

Layout (top to bottom):
1. **Hero**: warm-toned background, sprout icon 52×52, title "為下一段實踐留下方向", subtitle explaining purpose
2. **AI insight reference** (collapsible accordion):
   - If insight unlocked: show same insight text in a collapsed card, click to expand
   - If not unlocked: dashed-border card saying "這次沒有 AI 洞察可參考 / 直接寫下你想做什麼也很好"
3. **Main card** (yellow gradient `bg-gradient-to-br from-[oklch(0.96_0.05_90)] to-[oklch(0.92_0.1_85)]`):
   - Preview state: guide text + "寫下接下來我想做的" button
   - Edit state: textarea + check-in review accordion (collapsible) + 儲存/取消 buttons
   - Saved state: italic blockquote + "已記下" confirmation + "編輯" button
   - "存成草稿" checkbox opt-in → shows draft creation confirmation after save
4. **Bottom navigation**: two buttons side by side — "回到總結頁" (calls `onSurfaceChange(1)`) and "製作分享卡" (calls `onSurfaceChange(3)`)

```typescript
interface Surface2Props {
  summary: PracticeSummary;
  onSurfaceChange: (surface: 1 | 3) => void;
}
```

- [ ] **Step 2: Verify**

Test the full flow: write intent → save → see saved state → edit again. Test accordion expand/collapse. Test draft checkbox.

- [ ] **Step 3: Commit**

Use `format-commit` skill (scoped to daodao-f2e).

---

### Task 11: Surface 3 — 製作分享卡 (daodao-f2e)

**Files:**
- Rewrite: `daodao-f2e/apps/product/src/components/practice/summary/surface-3-share-card.tsx`
- Create: `daodao-f2e/apps/product/src/components/practice/summary/sections/share-card-preview.tsx`
- Create: `daodao-f2e/apps/product/src/components/practice/summary/sections/checkin-picker-sheet.tsx`
- Modify or delete: `daodao-f2e/apps/product/src/components/practice/summary/practice-summary-share-card.tsx` (replaced)
- Modify or delete: `daodao-f2e/apps/product/src/components/practice/summary/practice-summary-card.tsx` (replaced)

**Interfaces:**
- Consumes: `PracticeSummary`, shared reflection/selectedCheckins/themeIndex state, `useSheetManager()`, `useSelectedCheckins()`, `usePracticeSummaryImage()`
- Produces: Complete Surface 3

- [ ] **Step 1: Create share-card-preview.tsx**

The visual share card per design handoff Surface 3. Four themes:

```typescript
const THEMES = [
  { name: 'dark', bg: '#0f3036', text: '#fff', accent: 'rgba(255,255,255,.55)', boxBg: 'rgba(22,185,179,.18)' },
  { name: 'light', bg: '#f4f6f6', text: 'var(--text-dark)', accent: 'var(--basic-400)', boxBg: 'var(--primary-lightest)' },
  { name: 'cyan', bg: '#16b9b3', text: '#fff', accent: 'rgba(255,255,255,.7)', boxBg: 'rgba(255,255,255,.18)' },
  { name: 'yellow', bg: '#f9e41c', text: 'var(--text-dark)', accent: 'var(--basic-400)', boxBg: 'rgba(0,0,0,.08)' },
] as const;
```

Card content:
- Brand logo + user name
- Practice title + date range + duration pill
- Practice action description
- Reflection (italic, synced from shared state)
- User profile link
- Decorative elements sized per theme

```typescript
interface ShareCardPreviewProps {
  summary: PracticeSummary;
  reflectionText: string;
  themeIndex: number;
}
```

Use `forwardRef` for image capture.

- [ ] **Step 2: Create checkin-picker-sheet.tsx**

Bottom sheet for selecting featured check-ins, opened via `useSheetManager()`:

```typescript
interface CheckinPickerSheetProps {
  checkIns: Array<{ id: string; day: number; date: string; note: string }>;
  selectedIds: string[];
  onConfirm: (ids: string[]) => void;
}
```

Features:
- Lists all check-ins with checkboxes
- Max 3 selections — exceeding shakes the counter (CSS `animate-[shake_0.3s]`)
- "恢復預設" button resets to longest-note 3
- "確認" button calls `onConfirm` and closes sheet

- [ ] **Step 3: Implement surface-3-share-card.tsx**

Per FRD FR-3.5:

Layout:
1. **Hero**: mint-green background, title "製作分享卡"
2. **"預覽訪客視角" pill button** → opens visitor preview modal (Task 12)
3. **打卡精選** (with edit button → opens checkin-picker-sheet)
4. **背景色選擇器**: 4 circles (32×32), selected has ring
5. **Share card preview**: `<ShareCardPreview />` with ref for image capture
6. **Reflection inline edit**: edit button on the reflection in the card → textarea in-place
7. **下載圖片 button**: orange CTA, calls `usePracticeSummaryImage().downloadImage()`
8. **公開此成就頁面**: integrated container per FRD FR-3.5.10-14
   - Toggle row: lock icon + "公開此成就頁面" + toggle switch
   - On public: border changes to accent, lock → unlock icon
   - Link area: 700ms "正在生成連結..." → URL display + "複製" button (1.5s "✓ 已複製" feedback)
   - Disclosure text: "公開時，訪客會看到你的學習軌跡、打卡精選、和我的反思。"
   - Uses existing `updatePractice(id, { privacy_status: 'public' | 'private' })` API — no new endpoint needed
9. **Bottom**: "前往主題實踐列表" text link

- [ ] **Step 4: Delete old practice-summary-card.tsx and practice-summary-share-card.tsx**

Remove both files and their exports from `index.ts`.

- [ ] **Step 5: Update practice-export-section.tsx**

Downgrade to a simple text link in the Surface 1 footer (already handled in Task 9's `NextStepCta`). If the component is no longer needed as a standalone section, remove it and inline the export utility calls.

- [ ] **Step 6: Verify Surface 3**

Test: theme switching updates card instantly, check-in picker opens as bottom sheet, max 3 selection, reflection edit syncs to Surface 1, download generates image, public toggle with link generation animation, copy link feedback.

- [ ] **Step 7: Commit**

Use `format-commit` skill (scoped to daodao-f2e).

---

### Task 12: Visitor preview modal + farewell screen (daodao-f2e)

**Files:**
- Create: `daodao-f2e/apps/product/src/components/practice/summary/visitor-preview-modal.tsx`
- Create: `daodao-f2e/apps/product/src/components/practice/summary/farewell-screen.tsx`
- Modify: `daodao-f2e/apps/product/src/components/practice/summary/surface-3-share-card.tsx` — wire up preview button
- Modify: `daodao-f2e/apps/product/src/components/practice/summary/practice-summary-page.tsx` — add farewell flow

**Interfaces:**
- Consumes: `PracticeSummary`, shared state, `useDialogManager()`
- Produces: `VisitorPreviewModal`, `FarewellScreen`

- [ ] **Step 1: Create visitor-preview-modal.tsx**

Per FRD FR-3.6. Full-screen overlay opened via `useDialogManager()`:

```typescript
interface VisitorPreviewModalProps {
  summary: PracticeSummary;
  reflectionText: string;
  selectedCheckInIds: string[];
  themeIndex: number;
}
```

Content:
- Sticky header: close button + "訪客視角預覽" title + helper text
- Mock URL bar showing the public link
- Author profile header (avatar + name + link)
- Practice title + date
- Share card (rendered with current theme)
- Featured check-in list
- "受到啟發了嗎？" + "複製此實踐" button
- Disclosure: "只會複製實踐的結構，不會帶走作者的打卡與反思"

All content syncs live with Surface 3 edit state (FRD FR-3.6.4).

- [ ] **Step 2: Create farewell-screen.tsx**

Per FRD FR-3.10. Shows after user clicks X:

```typescript
interface FarewellScreenProps {
  variant: 'completed' | 'draft-saved' | 'direction-saved' | 'draft-waiting';
  onNavigateToList: () => void;
}
```

Each variant has different message:
- completed: "這段實踐已經完成"
- draft-saved: "已幫你存好了"
- direction-saved: "你的方向已經記下"
- draft-waiting: "你的草稿正在島上等你"

Plus "前往主題實踐列表" button.

- [ ] **Step 3: Wire up in practice-summary-page.tsx**

Add farewell state management:
- X button in SurfaceNavChip or page header triggers farewell check
- If unsaved edits exist → confirmation dialog (via `useDialogManager()`) with auto-save option
- Then show farewell screen based on what was saved

- [ ] **Step 4: Wire up preview button in Surface 3**

Connect the "預覽訪客視角" pill button to open `VisitorPreviewModal` via `useDialogManager()`.

- [ ] **Step 5: Verify**

Test: visitor preview opens showing all synced content, close button works, farewell flow triggers on X, correct variant messages display, navigation to practice list works.

- [ ] **Step 6: Commit**

Use `format-commit` skill (scoped to daodao-f2e).

---

### Task 13: Final integration + cleanup + PRs

**Files:**
- Modify: `daodao-f2e/apps/product/src/components/practice/summary/index.ts` — clean up exports
- Modify: `daodao-f2e/apps/product/src/app/[locale]/practices/[id]/summary/page.tsx` — update page route if needed

- [ ] **Step 1: Clean up index.ts exports**

Ensure barrel export only includes the components that are still used:

```typescript
export * from "./hooks";
export * from "./practice-summary-page";
export * from "./utils/practice-export";
```

Remove exports for deleted files (`practice-summary-card`, `practice-insight-section`, `practice-summary-share-card`, `practice-export-section`).

- [ ] **Step 2: Update page route if needed**

The page route at `apps/product/src/app/[locale]/practices/[id]/summary/page.tsx` currently checks `practice.status === 'completed'` for access. Update to allow access for active practices too (since the design shows active/ending states):

Remove the completed-only gate, or change to allow any authenticated owner to view. The locking mechanism in the UI handles what's accessible.

- [ ] **Step 3: Run lint + typecheck**

```bash
cd /Users/xiaoxu/Projects/daodao/projects/daodao-f2e
pnpm run check:fix
pnpm run typecheck
```

Fix any issues.

- [ ] **Step 4: Visual regression check**

Navigate through all 3 surfaces on a completed practice. Verify:
- Surface switching works via chip and contextual buttons
- All sections match design handoff visuals
- Animations play correctly (fadeInUp, float-dots, confetti on ended-deep)
- Mobile responsive at 375px-414px
- Reflection syncs across Surface 1 ↔ Surface 3

Also test with an active practice:
- Only Surface 1 visible
- AI insight locked
- Reflection locked
- CTAs disabled
- Surface 2/3 grayed in chip menu

- [ ] **Step 5: Commit final cleanup**

Use `format-commit` skill (scoped to daodao-f2e).

- [ ] **Step 6: Open PRs for all 3 repos**

```bash
# daodao-storage
cd /Users/xiaoxu/Projects/daodao/projects/daodao-storage
git push -u origin feat/practice-summary-redesign
gh pr create --base dev --title "feat: add practice summary columns" --body "Add next_intent, next_intent_draft_id, selected_checkin_ids, insight_feedback columns to practices table for the summary page redesign."

# daodao-server
cd /Users/xiaoxu/Projects/daodao/projects/daodao-server
git push -u origin feat/practice-summary-redesign
gh pr create --base dev --title "feat: practice summary API endpoints" --body "Expose reflection + avgWords in practice response. Add PATCH endpoints for reflection, next-intent, selected-checkins, and POST for insight-feedback."

# daodao-f2e
cd /Users/xiaoxu/Projects/daodao/projects/daodao-f2e
git push -u origin feat/practice-summary-redesign
gh pr create --base dev --title "feat: redesign practice summary page" --body "3-Surface architecture, 4-stage state system, chip navigation, AI insight lock/unlock, reflection, next-intent, share card maker, visitor preview, farewell flow."
```
