# Practice Summary Page Redesign

## Overview

Redesign the practice summary page from a single-page two-column layout into a 3-Surface mobile-first architecture with 4 stage states, per PRD/FRD/Design Handoff specifications.

**Source documents:**
- PRD: 實踐總結頁 PRD
- FRD: 實踐總結頁 FRD
- Design Handoff: `design_handoff_practice_summary/`

## Architecture

### 3 Surface System

Same-page surface switching (React state, not routes). One surface visible at a time.

| Surface | Name | Purpose |
|---|---|---|
| 1 | 實踐總結 | Review: stats, AI insight, check-in highlights, reflection, next-step CTA |
| 2 | 接下來我想 | Forward-looking: write next intent, optionally save as draft |
| 3 | 製作分享卡 | Edit: customize share card, pick featured check-ins, publish |

Navigation: chip dropdown menu at top (FRD FR-3.2) + contextual buttons within surfaces.

### 4 Stage States

Frontend-computed from existing API fields:

```
if (practice.status === 'active') {
  daysLeft = daysDiff(today, endDate)
  stage = daysLeft <= 5 ? 'ending' : 'active'
}
if (practice.status === 'completed') {
  stage = progressPercentage >= 70 ? 'ended-deep' : 'ended-low'
}
```

| Stage | Badge | Hero Title | AI Insight | Reflection | CTA | Nudge |
|---|---|---|---|---|---|---|
| active | 進行中 (yellow) | {practice name} | Locked | Locked | Disabled | No |
| ending | 進行中 (yellow) | {practice name} | Locked | Locked | Disabled | Yes |
| ended-deep | 實踐完成 (cyan) | 恭喜完成這段實踐 | Unlocked (3 sections) | Editable | Enabled | No |
| ended-low | 走完這段旅程 (cyan) | 你走完了這段旅程 | Locked (encouragement) | Editable | Enabled | No |

### AI Insight Unlock

Independent of stage (FRD FR-3.7.1):
- `progressPercentage >= 70 AND avgWords >= 30 AND practice.status === 'completed'`
- Threshold hidden from users (FRD FR-3.7.2)
- 1.4s "generating" transition on unlock (FRD FR-3.7.1)

### Locking Mechanism (FRD FR-3.8)

When practice not yet ended (stage = active/ending):
- Reflection: locked with lock icon + message
- Next-step CTAs: disabled (opacity .4, pointer-events none)
- Surface 2/3: disabled in chip menu, blocked navigation with alert
- Separator label: "實踐結束後解鎖" instead of "下一步"

## Backend Changes

### daodao-storage (new migration)

New columns on `practices` table:
```sql
ALTER TABLE practices ADD COLUMN next_intent TEXT;
ALTER TABLE practices ADD COLUMN next_intent_draft_id INTEGER REFERENCES practices(id);
ALTER TABLE practices ADD COLUMN selected_checkin_ids JSONB DEFAULT '[]';
ALTER TABLE practices ADD COLUMN insight_feedback JSONB;
```

Note: `reflection` column already exists (unused). No migration needed for it.

### daodao-server (API changes)

**Expose existing field:**
- Add `reflection` to PracticeEntity type and findById/findAll responses

**Compute on response:**
- `avgWords`: calculated from all check-in notes for the practice (no new column)

**New endpoints:**

| Method | Path | Body | Returns |
|---|---|---|---|
| PATCH | `/practices/:id/reflection` | `{ reflection: string }` | `{ reflection }` |
| PATCH | `/practices/:id/next-intent` | `{ nextIntent: string, saveDraft?: boolean }` | `{ nextIntent, draftId? }` |
| PATCH | `/practices/:id/selected-checkins` | `{ checkinIds: string[] }` | `{ selectedCheckinIds }` |
| POST | `/practices/:id/insight-feedback` | `{ type: 'positive'\|'negative', reasons?: string[] }` | `{ success }` |

**Existing endpoints (no changes needed):**
- `PATCH /practices/:id/insight` — AI insight editing
- `PATCH /practices/:id` — privacy_status update (public/private/delayed)
- `GET /practices/:id/public` — visitor public page

### daodao-f2e (frontend)

**File structure:**
```
apps/product/src/components/practice/summary/
├── practice-summary-page.tsx      ← Main container (surface switching + shared state)
├── surface-nav-chip.tsx           ← Chip dropdown navigation
├── surface-1-summary.tsx          ← Surface 1
├── surface-2-next-intent.tsx      ← Surface 2
├── surface-3-share-card.tsx       ← Surface 3
├── visitor-preview-modal.tsx      ← Visitor preview modal
├── farewell-screen.tsx            ← Exit transition
├── sections/
│   ├── hero-section.tsx           ← Hero + badge + stats area
│   ├── ai-insight-card.tsx        ← AI insight (locked/unlocked)
│   ├── checkin-highlights.tsx     ← Featured check-ins (read-only)
│   ├── reflection-section.tsx     ← Reflection (4 states: locked/preview/edit/saved)
│   ├── next-step-cta.tsx          ← Next-step CTA block
│   ├── checkin-picker-sheet.tsx   ← Bottom sheet for check-in selection
│   └── share-card-preview.tsx     ← Share card with theme switching
├── hooks/
│   ├── use-practice-stage.ts      ← Stage computation
│   ├── use-reflection.ts          ← Reflection CRUD
│   ├── use-next-intent.ts         ← Next intent CRUD
│   ├── use-insight-feedback.ts    ← AI feedback
│   ├── use-selected-checkins.ts   ← Featured check-in management
│   └── use-practice-summary-image.tsx ← Existing (keep)
└── utils/
    └── practice-export.ts         ← Existing (keep)
```

**Removed/replaced components:**
- `PracticeSummaryCard` (bubble card) → replaced by `share-card-preview.tsx`
- `PracticeInsightSection` (textarea) → replaced by `ai-insight-card.tsx`
- `PracticeExportSection` (3 buttons) → downgraded to low-key text link in footer

**Shared state in practice-summary-page.tsx:**
- `currentSurface: 1 | 2 | 3`
- `reflectionText` — single source of truth, synced across surfaces
- `selectedCheckInIds` — featured check-ins
- `themeIndex` — share card theme color
- `isPublic` / `linkReady` — public toggle state

**PracticeSummary type additions:**
```typescript
interface PracticeSummary {
  // ... existing fields ...
  reflection?: string;
  nextIntent?: string;
  nextIntentDraftId?: string;
  selectedCheckInIds?: string[];
  insightFeedback?: { type: 'positive' | 'negative'; reasons?: string[] };
  avgWords: number;
  progressPercentage: number;
}
```

## Design Decisions

1. **AI unlock threshold**: Use FRD's 30 words (not design handoff's 50). Lower threshold is more user-friendly; threshold is hidden anyway.
2. **Progress ring**: FRD FR-3.3.2 mentions it but design handoff doesn't include one. Skip for now, use badge + stats instead.
3. **Visitor preview modal + farewell flow**: FRD has detailed specs but no design mockup. Implement based on FRD behavior specs with simple, clean UI.
4. **Share card colors**: Use FRD's 4 colors (#0f3036, #f4f6f6, #16b9b3, #f9e41c) which match design handoff themes.

## Branch Strategy

Each repo branches from `dev` and opens PR back to `dev`:
- daodao-storage: `feat/practice-summary-redesign`
- daodao-server: `feat/practice-summary-redesign`
- daodao-f2e: `feat/practice-summary-redesign`
