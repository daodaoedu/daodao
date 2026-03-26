# Mobile Profile 對齊 Product 首頁 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 重寫 mobile profile 頁面，移除 mobile 獨有元素（用戶資料卡、學習類型卡片、Lottie、社群連結），改為完全對齊 Product 首頁「我的」tab — 複用 `index.tsx` 已有的 home 元件。

**Architecture:** Profile 頁直接 import `FilterPills`, `InProgressCard`, `CompletedCard`, `DashboardHeader` from `@/components/home`，複用 `usePractices` hook 的 `inProgressTasks` / `completedTasks` / `stats`。保留 banner + scroll fade 動畫。

**Tech Stack:** React Native, Tamagui, expo-router, SWR (existing hooks)

**Reference files:**
- 首頁（已對齊 Product）: `apps/mobile/app/(tabs)/index.tsx` — 「我的」tab 邏輯（lines 65-200）
- 現有元件: `apps/mobile/components/home/filter-pills.tsx`, `in-progress-card.tsx`, `completed-card.tsx`, `dashboard-header.tsx`
- 現有 hook: `apps/mobile/hooks/usePractices.ts` — 提供 `inProgressTasks`, `completedTasks`, `stats`
- 現有常數: `apps/mobile/constants/task-status.ts` — `FilterStatus`
- 目標檔案: `apps/mobile/app/(tabs)/profile.tsx`

---

### Task 1: Rewrite profile.tsx to reuse existing home components

**Files:**
- Modify: `apps/mobile/app/(tabs)/profile.tsx`

**Remove:**
- All social icon components (LineIcon, FacebookIcon, InstagramIcon, ThreadsIcon, LinkedInIcon)
- `useCurrentUser` hook import and usage
- `LottieView`, `Linking`, `Avatar`, `Svg`, `Circle`, `Path`, `Rect` imports
- `SocialLink` type import
- Learning type card + Lottie animation layers
- User info card (avatar, name, location, bio, social links)
- Old practice list with checkbox filter
- Scroll-triggered top nav with icon tabs (主題實踐/學習計劃/想法)
- `TabType`, `tabs` array, `showTopNav`, `activeTab` state
- `includeCompleted` state and checkbox
- `getStatusBadge`, `handleRetakeQuiz`, `handleViewDetails`, `handleSocialPress`, `getSocialIcon` functions
- Unused styles (checkbox, topNav, lottie, fixedLottie, fixedLearningCard, etc.)

**Add (copy pattern from `index.tsx` lines 65-200):**
- Import `FilterPills`, `InProgressCard`, `CompletedCard`, `DashboardHeader` from `@/components/home`
- Import `FilterStatus` from `@/constants/task-status`
- Import `FlatList` from `react-native`
- `filterStatus` state
- `usePractices()` → `{ stats, inProgressTasks, completedTasks, isLoading, mutate }`
- `filteredInProgressTasks` useMemo (same logic as index.tsx:75-79)
- `hasPractices`, `showInProgress`, `showCompleted` derived values
- `dashboardStats` useMemo (same as index.tsx:85-101)
- Loading state
- FilterPills → horizontal FlatList of InProgressCard → "已完成" header + CompletedCard list
- Empty state: show text "尚無主題實踐"

**Keep:**
- Banner with scroll fade animation
- Fixed header with logo + title
- ScrollView with scroll event tracking
- Banner opacity interpolation
- `BANNER_HEIGHT`, `SCROLL_THRESHOLD` constants
- Background layer structure

- [ ] **Step 1: Rewrite profile.tsx**

The new structure should be:
```
[Fixed background layer - light blue]
[Fixed banner with fade on scroll]
[Fixed header: logo + "我的小島"]
[ScrollView]
  [Header spacer (banner height)]
  [Content area:]
    [DashboardHeader - hidden same as product]
    [FilterPills: 全部|草稿|未開始|進行中|已完成]
    [Horizontal FlatList: InProgressCard]
    ["已完成" header + vertical CompletedCard list]
    [Empty state if no practices]
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --project apps/mobile/tsconfig.json 2>&1 | grep "profile.tsx"`
Expected: no errors

- [ ] **Step 3: Verify in simulator**

Run the app and confirm profile tab shows filter pills + practice cards.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/app/(tabs)/profile.tsx
git commit -m "feat(mobile): rewrite profile page to align with product homepage"
```

---

### Task 2: Clean up unused references

**Files:**
- Check: any remaining imports of removed components

- [ ] **Step 1: Verify useCurrentUser is still used elsewhere**

Run: `grep -r "useCurrentUser" apps/mobile/ --include="*.tsx" --include="*.ts" -l`

It should still be used in settings pages — do not delete the hook.

- [ ] **Step 2: Final TypeScript check**

Run: `npx tsc --noEmit --project apps/mobile/tsconfig.json`
Expected: no new errors from profile.tsx

- [ ] **Step 3: Commit if any cleanup was needed**

```bash
git add apps/mobile/
git commit -m "chore(mobile): clean up after profile page rewrite"
```
