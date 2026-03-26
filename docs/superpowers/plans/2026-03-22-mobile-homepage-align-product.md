# Mobile Homepage Align Product Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite the mobile app homepage to match the product app homepage — dual tabs (靈感/我的), showcase feed, search/filter, dashboard stats, status filter pills, and all card types.

**Architecture:** Replace the current single-view homepage with a tab-based layout. Build mobile-native hooks for AI backend (showcase feed) using Bearer token auth. Reuse existing `usePractices` hook for "mine" tab with data mapping. All new UI components use Tamagui + React Native, following existing mobile patterns.

**Tech Stack:** React Native, Expo Router, Tamagui, SWR, `apps/mobile/services/api-client.ts` (Bearer token auth)

**Spec:** `docs/superpowers/specs/2026-03-22-mobile-homepage-align-product-design.md`

---

## File Structure

### New Files

```
apps/mobile/
├── components/home/
│   ├── index.ts                    # barrel export
│   ├── tab-switcher.tsx            # 靈感/我的 tab 切換
│   ├── showcase-search-bar.tsx     # 搜尋欄 + 建議下拉
│   ├── showcase-filter-bar.tsx     # 進階篩選（狀態 + 時長）
│   ├── showcase-card.tsx           # 靈感卡片（對齊 PracticeShowcaseCard）
│   ├── brewing-card.tsx            # 醞釀中卡片（對齊 BrewingCard）
│   ├── dashboard-header.tsx        # 日期 + 統計卡片
│   ├── filter-pills.tsx            # 狀態篩選 pills
│   ├── in-progress-card.tsx        # 進行中卡片（對齊 InProgressTaskCard）
│   └── completed-card.tsx          # 已完成卡片（對齊 CompletedTaskCard）
├── hooks/
│   ├── useShowcaseFeed.ts          # AI backend showcase feed (Bearer auth)
│   └── useShowcaseSuggestions.ts   # AI backend search suggestions
```

### Modified Files

```
apps/mobile/
├── app/(tabs)/index.tsx            # 完整重寫首頁
├── constants/task-status.ts        # 加入 completed 到 FilterStatus
├── hooks/usePractices.ts           # 擴充 data mapping
├── components/home/index.ts        # barrel export（新建）
```

### Existing Files Referenced (read-only)

```
apps/mobile/services/api-client.ts          # apiClient + api helper
apps/mobile/constants/practice-status.ts    # PracticeStatus
apps/mobile/constants/practice-theme.ts     # theme colors + SVG map
apps/mobile/hooks/usePractices.ts           # existing usePractices()
apps/mobile/components/practice/shared/random-practices-section.tsx  # 已存在 mobile 版
apps/mobile/app/(tabs)/_layout.tsx          # FAB 已在此，不需修改

apps/product/src/app/[locale]/(with-layout)/page.tsx                # product 首頁（參考）
apps/product/src/components/showcase/PracticeShowcaseCard.tsx       # 參考 UI
apps/product/src/components/showcase/BrewingCard.tsx                # 參考 UI
apps/product/src/components/showcase/ShowcaseSearchBar.tsx          # 參考 UI
apps/product/src/components/showcase/ShowcaseFilterBar.tsx          # 參考 UI
apps/product/src/components/dashboard/dashboard-header.tsx          # 參考 UI
apps/product/src/components/dashboard/in-progress-task-card.tsx     # 參考 UI
apps/product/src/components/dashboard/completed-task-card.tsx       # 參考 UI
apps/product/src/components/dashboard/in-progress-section.tsx       # 參考 UI
apps/product/src/components/dashboard/completed-section.tsx         # 參考 UI

packages/api/src/services/showcase-hooks.ts  # API 端點參考
```

---

## Task 0: Prerequisites — Install Dependencies and Configure Environment

**Files:**
- Modify: `apps/mobile/package.json`
- Create: `apps/mobile/.env.development` (if not exists)

- [ ] **Step 1: Install `date-fns`**

Run: `cd apps/mobile && pnpm add date-fns`

- [ ] **Step 2: Verify `swr/infinite` resolves in Metro**

Run: `cd apps/mobile && node -e "require.resolve('swr/infinite')"`
Expected: Prints the resolved path. If it fails, run `pnpm add swr@latest`.

- [ ] **Step 3: Add `EXPO_PUBLIC_AI_API_URL` environment variable**

Add to `apps/mobile/.env.development` (create if not exists):

```
EXPO_PUBLIC_AI_API_URL=https://ai-dev.daodao.so
```

Note: Expo requires a full rebuild (not just restart) when new `EXPO_PUBLIC_` env vars are added.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/package.json apps/mobile/.env.development pnpm-lock.yaml
git commit -m "chore(mobile): add date-fns and configure AI API URL"
```

---

## Task 1: Update Constants — Add `completed` to FilterStatus

**Files:**
- Modify: `apps/mobile/constants/task-status.ts`

This is a prerequisite for the filter pills in the "mine" tab.

- [ ] **Step 1: Read current file and add `completed` to FilterStatus**

In `apps/mobile/constants/task-status.ts`, add `completed` to `FilterStatus`:

```typescript
export const FilterStatus = {
  all: "all",
  draft: "draft",
  notStarted: "not-started",
  inProgress: "in-progress",
  completed: "completed",   // ← ADD THIS
} as const;
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd apps/mobile && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No new errors

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/constants/task-status.ts
git commit -m "feat(mobile): add completed status to FilterStatus"
```

---

## Task 2: Create Showcase Feed Hook (AI Backend, Bearer Auth)

**Files:**
- Create: `apps/mobile/hooks/useShowcaseFeed.ts`

This hook replicates `packages/api/src/services/showcase-hooks.ts` `useShowcaseFeed()` but uses mobile's Bearer token auth instead of cookie auth.

- [ ] **Step 1: Create the hook file**

Create `apps/mobile/hooks/useShowcaseFeed.ts`:

```typescript
import useSWRInfinite from "swr/infinite";
import { apiClient } from "@/services/api-client";

const AI_API_URL = process.env.EXPO_PUBLIC_AI_API_URL ?? "https://ai-dev.daodao.so";
const PAGE_SIZE = 20;

// Types — matching packages/api/src/services/showcase-hooks.ts
export interface IShowcasePractice {
  id: string;
  title: string;
  status: "active" | "completed";
  privacy_status: "public" | "delayed";
  is_brewing?: boolean;
  start_date?: string | null;
  end_date?: string | null;
  practice_action?: string | null;
  user?: {
    id: string;
    name: string;
    photo_url?: string | null;
  };
  frequency_min_days?: number | null;
  frequency_max_days?: number | null;
  session_duration_minutes?: number | null;
  reactions?: { type: string; count: number; latestActorName?: string }[];
  comment_count?: number;
  last_checkin_summary?: string | null;
}

export interface IShowcaseFeedParams {
  keyword?: string;
  tags?: string[];
  duration_min?: number;
  duration_max?: number;
  status?: "active" | "completed";
  sort_by?: string;
  limit?: number;
}

interface AIResponse<T> {
  success: boolean;
  data?: T;
  pagination?: {
    cursors?: { start?: string | null; end?: string | null } | null;
    hasNext: boolean | null;
    hasPrev: boolean | null;
    count: number | null;
  } | null;
}

const buildShowcaseQuery = (params: IShowcaseFeedParams, afterId?: string | null): string => {
  const query = new URLSearchParams();
  query.set("limit", String(params.limit ?? PAGE_SIZE));
  query.set("sort_by", params.sort_by ?? "newest_updated");
  if (afterId) query.set("after_id", afterId);
  if (params.keyword) query.set("keyword", params.keyword);
  if (params.status) query.set("status", params.status);
  if (params.duration_min != null) query.set("duration_min", String(params.duration_min));
  if (params.duration_max != null) query.set("duration_max", String(params.duration_max));
  if (params.tags && params.tags.length > 0) {
    params.tags.forEach((tag) => query.append("tags[]", tag));
  }
  return query.toString();
};

async function fetchAiBackend<T>(path: string): Promise<T> {
  return apiClient<T>(`${AI_API_URL}${path}`);
}

export function useShowcaseFeed(params: IShowcaseFeedParams) {
  const getKey = (
    pageIndex: number,
    previousPageData: AIResponse<IShowcasePractice[]> | null
  ) => {
    if (previousPageData && !previousPageData.pagination?.hasNext) return null;

    const afterId =
      pageIndex === 0
        ? null
        : previousPageData?.pagination?.cursors?.end ?? null;

    const qs = buildShowcaseQuery(params, afterId);
    return `/api/v1/users/practices?${qs}`;
  };

  const { data, error, isLoading, isValidating, size, setSize, mutate } =
    useSWRInfinite<AIResponse<IShowcasePractice[]>>(
      getKey,
      (path: string) => fetchAiBackend<AIResponse<IShowcasePractice[]>>(path),
      {
        revalidateFirstPage: false,
        revalidateOnFocus: false,
      }
    );

  const practices: IShowcasePractice[] =
    data?.flatMap((page) => page.data ?? []) ?? [];

  const hasMore = data ? (data[data.length - 1]?.pagination?.hasNext ?? false) : false;

  const loadMore = () => setSize((s) => s + 1);

  return { practices, error, isLoading, isValidating, hasMore, loadMore, size, mutate };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd apps/mobile && npx tsc --noEmit --pretty 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/hooks/useShowcaseFeed.ts
git commit -m "feat(mobile): add useShowcaseFeed hook with Bearer auth"
```

---

## Task 3: Create Showcase Suggestions Hook

**Files:**
- Create: `apps/mobile/hooks/useShowcaseSuggestions.ts`

- [ ] **Step 1: Create the hook file**

Create `apps/mobile/hooks/useShowcaseSuggestions.ts`:

```typescript
import useSWR from "swr";
import { apiClient } from "@/services/api-client";

const AI_API_URL = process.env.EXPO_PUBLIC_AI_API_URL ?? "https://ai-dev.daodao.so";

interface AIResponse<T> {
  success: boolean;
  data?: T;
}

export interface IShowcaseSuggestions {
  trending_keywords?: string[];
  interest_tags?: string[];
}

async function fetchAiBackend<T>(path: string): Promise<T> {
  return apiClient<T>(`${AI_API_URL}${path}`);
}

export function useShowcaseSuggestions(enabled: boolean) {
  return useSWR<AIResponse<IShowcaseSuggestions>>(
    enabled ? "/api/v1/users/practices/suggestions" : null,
    (path: string) => fetchAiBackend<AIResponse<IShowcaseSuggestions>>(path),
    { revalidateOnFocus: false }
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd apps/mobile && npx tsc --noEmit --pretty 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/hooks/useShowcaseSuggestions.ts
git commit -m "feat(mobile): add useShowcaseSuggestions hook"
```

---

## Task 4: Extend usePractices Hook — Add Data Mapping for "Mine" Tab

**Files:**
- Modify: `apps/mobile/hooks/usePractices.ts`

Add data mapping to convert practices into `InProgressTask` and `CompletedTask` formats, and expose `stats` from the API. This mirrors the product homepage's `useMemo` logic in `page.tsx:135-178`.

Note: The existing `usePractices()` already returns `stats.currentStreak` and `stats.totalCheckIns` from the `/practices` endpoint. Product uses a separate `useMyPracticeStats()` hook, but the data is equivalent. We reuse the existing hook to avoid adding another API call. The stats mapping `totalCheckIns → 獲得迴響` matches product's behavior.

- [ ] **Step 1: Add task type interfaces and mapping logic**

At the top of `apps/mobile/hooks/usePractices.ts`, add the task interfaces (after the existing imports):

```typescript
import { mapPracticeStatusToTaskStatus } from "@/constants/task-status";
import type { TaskStatus } from "@/constants/task-status";

// Task types for homepage display (matching product app)
export interface InProgressTask {
  id: string;
  label: string;
  title: string;
  description: string;
  checkInCount: number;
  progress: number;
  messagesCount: number;
  isUnreadMessages: boolean;
  theme: string;
  status: TaskStatus;
  lastCheckInDate?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

export interface CompletedTask {
  id: string;
  label: string;
  title: string;
  description: string;
  viewCount: number;
  commentCount: number;
  tags: string[];
}
```

Then, inside the existing `usePractices()` function, add a new `useMemo` that maps practices to task card formats:

```typescript
// Add after the existing useMemo block (activePractices, completedPractices, etc.)
// Import PracticeStatus from constants:
// import { PracticeStatus } from "@/constants/practice-status";

const { inProgressTasks, completedTasks } = useMemo(() => {
  const inProgressTasksData: InProgressTask[] = [];
  const completedTasksData: CompletedTask[] = [];

  for (const practice of practices) {
    // Use mapPracticeStatusToTaskStatus for reliable mapping
    const taskStatus = mapPracticeStatusToTaskStatus(practice.status as PracticeStatus);
    const isCompleted = taskStatus === "completed";

    if (!isCompleted) {
      inProgressTasksData.push({
        id: practice.id,
        label: "主題實踐",
        title: practice.title,
        description: practice.description || "",
        checkInCount: practice.completedDays || 0,
        progress: practice.targetDays
          ? Math.round((practice.completedDays / practice.targetDays) * 100)
          : 0,
        messagesCount: 0,
        isUnreadMessages: false,
        theme: practice.theme || "yellow",
        status: taskStatus,
        lastCheckInDate: null,
        startDate: practice.createdAt || null,
        endDate: null,
      });
    } else {
      completedTasksData.push({
        id: practice.id,
        label: "主題實踐",
        title: practice.title,
        description: practice.description || "",
        viewCount: 0,
        commentCount: 0,
        tags: practice.tags || [],
      });
    }
  }

  return { inProgressTasks: inProgressTasksData, completedTasks: completedTasksData };
}, [practices]);
```

Add `inProgressTasks` and `completedTasks` to the return object of `usePractices()`.

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd apps/mobile && npx tsc --noEmit --pretty 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/hooks/usePractices.ts
git commit -m "feat(mobile): add task data mapping to usePractices for homepage"
```

---

## Task 5: Create Tab Switcher Component

**Files:**
- Create: `apps/mobile/components/home/tab-switcher.tsx`

Mirrors the product's tab switcher at `page.tsx:216-241`.

- [ ] **Step 1: Create the component**

Create `apps/mobile/components/home/tab-switcher.tsx`:

```typescript
import { Pressable, StyleSheet } from "react-native";
import { Text, XStack, View } from "tamagui";
import { colors } from "@/generated/design-tokens";

export type TabType = "inspire" | "mine";

interface TabSwitcherProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export function TabSwitcher({ activeTab, onTabChange }: TabSwitcherProps) {
  return (
    <XStack borderBottomWidth={1} borderBottomColor="#E5E7EB" marginBottom="$3">
      <Pressable style={styles.tab} onPress={() => onTabChange("inspire")}>
        <Text
          fontSize={14}
          fontWeight="500"
          color={activeTab === "inspire" ? colors.text.dark : "rgba(0,0,0,0.4)"}
          paddingVertical="$2"
        >
          靈感
        </Text>
        {activeTab === "inspire" && <View style={styles.activeIndicator} />}
      </Pressable>
      <Pressable style={styles.tab} onPress={() => onTabChange("mine")}>
        <Text
          fontSize={14}
          fontWeight="500"
          color={activeTab === "mine" ? colors.text.dark : "rgba(0,0,0,0.4)"}
          paddingVertical="$2"
        >
          我的
        </Text>
        {activeTab === "mine" && <View style={styles.activeIndicator} />}
      </Pressable>
    </XStack>
  );
}

const styles = StyleSheet.create({
  tab: {
    flex: 1,
    alignItems: "center",
    position: "relative",
  },
  activeIndicator: {
    position: "absolute",
    bottom: -1,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: "#16B9B3", // logo-cyan
  },
});
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd apps/mobile && npx tsc --noEmit --pretty 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/components/home/tab-switcher.tsx
git commit -m "feat(mobile): add TabSwitcher component"
```

---

## Task 6: Create Showcase Search Bar Component

**Files:**
- Create: `apps/mobile/components/home/showcase-search-bar.tsx`

Mirrors `apps/product/src/components/showcase/ShowcaseSearchBar.tsx` — search input + suggestions dropdown.

- [ ] **Step 1: Create the component**

Create `apps/mobile/components/home/showcase-search-bar.tsx`:

```typescript
import { Search, X } from "@tamagui/lucide-icons";
import { useCallback, useRef, useState } from "react";
import { Keyboard, Pressable, StyleSheet, TextInput } from "react-native";
import { Text, View, XStack, YStack } from "tamagui";
import { colors } from "@/generated/design-tokens";
import { useShowcaseSuggestions } from "@/hooks/useShowcaseSuggestions";

interface ShowcaseSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: (value: string) => void;
}

export function ShowcaseSearchBar({ value, onChange, onSearch }: ShowcaseSearchBarProps) {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const { data: suggestionsData } = useShowcaseSuggestions(focused && !value);
  const suggestions = suggestionsData?.data;
  const trendingKeywords = suggestions?.trending_keywords ?? [];
  const interestTags = suggestions?.interest_tags ?? [];
  const allSuggestions = [...new Set([...trendingKeywords, ...interestTags])];

  const handleClear = useCallback(() => {
    onChange("");
    onSearch("");
    inputRef.current?.focus();
  }, [onChange, onSearch]);

  const handleSubmit = useCallback(() => {
    onSearch(value);
    Keyboard.dismiss();
  }, [onSearch, value]);

  const handleSuggestionPress = useCallback(
    (keyword: string) => {
      onChange(keyword);
      onSearch(keyword);
      setFocused(false);
      Keyboard.dismiss();
    },
    [onChange, onSearch]
  );

  return (
    <View style={{ position: "relative", zIndex: 10 }}>
      <XStack
        alignItems="center"
        gap="$2"
        backgroundColor="white"
        borderWidth={1}
        borderColor={focused ? "#9CA3AF" : "#D1D5DB"}
        borderRadius={12}
        paddingHorizontal="$3"
        paddingVertical="$2.5"
      >
        <Search size={16} color="rgba(0,0,0,0.4)" />
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
          onSubmitEditing={handleSubmit}
          returnKeyType="search"
          style={styles.input}
          placeholderTextColor="rgba(0,0,0,0.4)"
        />
        {value ? (
          <Pressable onPress={handleClear} hitSlop={8}>
            <X size={16} color="rgba(0,0,0,0.4)" />
          </Pressable>
        ) : null}
      </XStack>

      {/* Suggestions dropdown */}
      {focused && !value && allSuggestions.length > 0 && (
        <View style={styles.dropdown}>
          {trendingKeywords.length > 0 && (
            <>
              <Text fontSize={12} color="rgba(0,0,0,0.5)" fontWeight="500" paddingHorizontal="$3" paddingVertical="$1">
                近期熱門
              </Text>
              {trendingKeywords.map((kw) => (
                <Pressable key={kw} onPress={() => handleSuggestionPress(kw)} style={styles.suggestionItem}>
                  <Text fontSize={14} color={colors.text.dark}>{kw}</Text>
                </Pressable>
              ))}
            </>
          )}
          {interestTags.length > 0 && (
            <>
              <Text fontSize={12} color="rgba(0,0,0,0.5)" fontWeight="500" paddingHorizontal="$3" paddingVertical="$1" marginTop="$1">
                你的興趣
              </Text>
              {interestTags.map((tag) => (
                <Pressable key={tag} onPress={() => handleSuggestionPress(tag)} style={styles.suggestionItem}>
                  <Text fontSize={14} color={colors.text.dark}>#{tag}</Text>
                </Pressable>
              ))}
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    flex: 1,
    fontSize: 14,
    color: "#1a1a1a",
    padding: 0,
  },
  dropdown: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    marginTop: 4,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#C1ECFF",
    borderRadius: 12,
    paddingVertical: 8,
    maxHeight: 240,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 20,
  },
  suggestionItem: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
});
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd apps/mobile && npx tsc --noEmit --pretty 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/components/home/showcase-search-bar.tsx
git commit -m "feat(mobile): add ShowcaseSearchBar component"
```

---

## Task 7: Create Showcase Filter Bar Component

**Files:**
- Create: `apps/mobile/components/home/showcase-filter-bar.tsx`

Mirrors `apps/product/src/components/showcase/ShowcaseFilterBar.tsx` — status + duration toggle filters.

- [ ] **Step 1: Create the component**

Create `apps/mobile/components/home/showcase-filter-bar.tsx`:

```typescript
import { Pressable, StyleSheet } from "react-native";
import { Text, XStack, YStack } from "tamagui";

const DURATION_OPTIONS = [
  { label: "7 天", min: 1, max: 7 },
  { label: "14 天", min: 8, max: 14 },
  { label: "21 天", min: 15, max: 21 },
  { label: "30 天", min: 22, max: 30 },
];

const STATUS_OPTIONS = [
  { label: "進行中", value: "active" as const },
  { label: "已完成", value: "completed" as const },
];

export interface ShowcaseFilterState {
  tags: string[];
  durationMin?: number;
  durationMax?: number;
  status?: "active" | "completed";
}

interface ShowcaseFilterBarProps {
  filters: ShowcaseFilterState;
  onFiltersChange: (filters: ShowcaseFilterState) => void;
}

export function ShowcaseFilterBar({ filters, onFiltersChange }: ShowcaseFilterBarProps) {
  const toggleStatus = (value: "active" | "completed") => {
    onFiltersChange({
      ...filters,
      status: filters.status === value ? undefined : value,
    });
  };

  const toggleDuration = (min: number, max: number) => {
    const isSelected = filters.durationMin === min && filters.durationMax === max;
    onFiltersChange({
      ...filters,
      durationMin: isSelected ? undefined : min,
      durationMax: isSelected ? undefined : max,
    });
  };

  return (
    <YStack gap="$3" paddingTop="$2">
      {/* Status filter */}
      <YStack>
        <Text fontSize={12} color="rgba(0,0,0,0.5)" marginBottom="$1.5">狀態</Text>
        <XStack gap="$2" flexWrap="wrap">
          {STATUS_OPTIONS.map((opt) => {
            const isSelected = filters.status === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => toggleStatus(opt.value)}
                style={[styles.pill, isSelected ? styles.pillActive : styles.pillInactive]}
              >
                <Text fontSize={14} color={isSelected ? "white" : "#1a1a1a"}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </XStack>
      </YStack>

      {/* Duration filter */}
      <YStack>
        <Text fontSize={12} color="rgba(0,0,0,0.5)" marginBottom="$1.5">實踐週期</Text>
        <XStack gap="$2" flexWrap="wrap">
          {DURATION_OPTIONS.map((opt) => {
            const isSelected = filters.durationMin === opt.min && filters.durationMax === opt.max;
            return (
              <Pressable
                key={opt.label}
                onPress={() => toggleDuration(opt.min, opt.max)}
                style={[styles.pill, isSelected ? styles.pillActive : styles.pillInactive]}
              >
                <Text fontSize={14} color={isSelected ? "white" : "#1a1a1a"}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </XStack>
      </YStack>
    </YStack>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  pillActive: {
    backgroundColor: "#16B9B3",
    borderColor: "#16B9B3",
  },
  pillInactive: {
    backgroundColor: "white",
    borderColor: "#C1ECFF",
  },
});
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd apps/mobile && npx tsc --noEmit --pretty 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/components/home/showcase-filter-bar.tsx
git commit -m "feat(mobile): add ShowcaseFilterBar component"
```

---

## Task 8: Create Showcase Card Component

**Files:**
- Create: `apps/mobile/components/home/showcase-card.tsx`

Mirrors `apps/product/src/components/showcase/PracticeShowcaseCard.tsx`. Simplified for MVP — includes status badge, title, avatar + action/frequency, comment count. More menu and reactions deferred.

- [ ] **Step 1: Create the component**

Create `apps/mobile/components/home/showcase-card.tsx`. Reference the product's `PracticeShowcaseCard.tsx` for exact layout:

- White card with rounded corners + border `#E8F8FF`
- Header: status badge + date range + more button (placeholder)
- Title: semibold, 2 lines max
- Avatar + action description + frequency stats
- Bottom bar: comment count icon + count
- Comment preview: latest 2 comments (simplified — show count only for MVP)

```typescript
import { MessageCircle, MoreHorizontal } from "@tamagui/lucide-icons";
import { useRouter } from "expo-router";
import { Image, Pressable, StyleSheet } from "react-native";
import { Text, View, XStack, YStack } from "tamagui";
import { colors } from "@/generated/design-tokens";
import { getStatusConfig } from "@/constants/task-status";
import type { IShowcasePractice } from "@/hooks/useShowcaseFeed";

interface ShowcaseCardProps {
  practice: IShowcasePractice;
}

function formatDate(dateStr?: string | null): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function ShowcaseCard({ practice }: ShowcaseCardProps) {
  const router = useRouter();
  const {
    id, title, status, start_date, end_date, user,
    practice_action, frequency_min_days, frequency_max_days,
    session_duration_minutes, comment_count = 0,
  } = practice;

  const taskStatus = status === "active" ? "in-progress" : "completed";
  const statusInfo = getStatusConfig(taskStatus);
  const startFmt = formatDate(start_date);
  const endFmt = formatDate(end_date);

  return (
    <Pressable
      style={styles.card}
      onPress={() => router.push(`/practices/${id}` as any)}
    >
      {/* Header row */}
      <XStack alignItems="center" gap="$2" marginBottom="$2">
        {statusInfo && (
          <View style={[styles.badge, { backgroundColor: taskStatus === "completed" ? "#6B7280" : colors.primary.base }]}>
            <Text fontSize={12} color="white">{statusInfo.label}</Text>
          </View>
        )}
        {startFmt && endFmt && (
          <Text fontSize={12} color="rgba(0,0,0,0.5)" flex={1}>
            {startFmt} ▶ {endFmt}
          </Text>
        )}
        <Pressable hitSlop={8}>
          <MoreHorizontal size={16} color="#9CA3AF" />
        </Pressable>
      </XStack>

      {/* Title */}
      <Text fontSize={16} fontWeight="600" color={colors.text.dark} marginBottom="$2" numberOfLines={2}>
        {title}
      </Text>

      {/* Avatar + action/frequency */}
      {(user || practice_action || frequency_min_days || session_duration_minutes) && (
        <XStack gap="$3" marginBottom="$3" alignItems="flex-start">
          {user && (
            <View style={styles.avatar}>
              {user.photo_url ? (
                <Image source={{ uri: user.photo_url }} style={styles.avatarImage} />
              ) : (
                <Text fontSize={20} color="#9CA3AF">{(user.name ?? "?")[0]}</Text>
              )}
            </View>
          )}
          <YStack flex={1}>
            {practice_action && (
              <Text fontSize={14} color="rgba(0,0,0,0.8)" marginBottom="$2" numberOfLines={3}>
                {practice_action}
              </Text>
            )}
            <XStack gap="$4">
              {(frequency_min_days || frequency_max_days) && (
                <XStack alignItems="center">
                  <Text fontSize={14} fontWeight="600" color="#16B9B3">
                    {frequency_min_days === frequency_max_days
                      ? frequency_min_days
                      : `${frequency_min_days}-${frequency_max_days}`}
                  </Text>
                  <Text fontSize={14} color="rgba(0,0,0,0.6)" marginLeft={2}>天/週</Text>
                </XStack>
              )}
              {session_duration_minutes && (
                <XStack alignItems="center">
                  <Text fontSize={14} fontWeight="600" color="#16B9B3">{session_duration_minutes}</Text>
                  <Text fontSize={14} color="rgba(0,0,0,0.6)" marginLeft={2}>分鐘/次</Text>
                </XStack>
              )}
            </XStack>
          </YStack>
        </XStack>
      )}

      {/* Bottom bar */}
      <View style={styles.bottomBar}>
        <XStack alignItems="center" gap="$1.5">
          <MessageCircle size={20} color="#9FB5B8" />
          {comment_count > 0 && (
            <Text fontSize={14} fontWeight="500" color="#9FB5B8">{comment_count}</Text>
          )}
        </XStack>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E8F8FF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  bottomBar: {
    borderTopWidth: 1,
    borderTopColor: "#E4EAE9",
    paddingTop: 12,
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
});
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd apps/mobile && npx tsc --noEmit --pretty 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/components/home/showcase-card.tsx
git commit -m "feat(mobile): add ShowcaseCard component"
```

---

## Task 9: Create Brewing Card Component

**Files:**
- Create: `apps/mobile/components/home/brewing-card.tsx`
- Modify: `apps/mobile/components/home/showcase-card.tsx` — add `brewingOverlay` prop

Mirrors `apps/product/src/components/showcase/BrewingCard.tsx` — same as ShowcaseCard but with "🍵 內容醞釀中" overlay. Uses composition (not duplication) by adding an optional `brewingOverlay` slot to ShowcaseCard.

- [ ] **Step 1: Add `brewingOverlay` prop to ShowcaseCard**

In `apps/mobile/components/home/showcase-card.tsx`, add an optional `children` or `extraContent` prop:

```typescript
// Add to ShowcaseCardProps:
interface ShowcaseCardProps {
  practice: IShowcasePractice;
  extraContent?: React.ReactNode;  // ← ADD THIS
}

// In the JSX, render extraContent before the bottom bar:
{extraContent}

{/* Bottom bar */}
```

- [ ] **Step 2: Create the thin BrewingCard wrapper**

Create `apps/mobile/components/home/brewing-card.tsx`:

```typescript
import { Text, XStack } from "tamagui";
import type { IShowcasePractice } from "@/hooks/useShowcaseFeed";
import { ShowcaseCard } from "./showcase-card";

interface BrewingCardProps {
  practice: IShowcasePractice;
}

export function BrewingCard({ practice }: BrewingCardProps) {
  return (
    <ShowcaseCard
      practice={practice}
      extraContent={
        <XStack
          alignItems="center"
          gap="$2"
          paddingHorizontal="$3"
          paddingVertical="$2"
          borderRadius={12}
          backgroundColor="#F8F9FA"
          borderWidth={1}
          borderStyle="dashed"
          borderColor="#C1D0D8"
          marginBottom="$3"
        >
          <Text fontSize={16}>🍵</Text>
          <Text fontSize={12} color="rgba(0,0,0,0.6)">內容醞釀中，完成後解鎖！</Text>
        </XStack>
      }
    />
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd apps/mobile && npx tsc --noEmit --pretty 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/components/home/brewing-card.tsx
git commit -m "feat(mobile): add BrewingCard component"
```

---

## Task 10: Create Dashboard Header Component

**Files:**
- Create: `apps/mobile/components/home/dashboard-header.tsx`

Mirrors `apps/product/src/components/dashboard/dashboard-header.tsx` + `stat-card.tsx`.

- [ ] **Step 1: Create the component**

Create `apps/mobile/components/home/dashboard-header.tsx`:

```typescript
import { format } from "date-fns";
import { StyleSheet } from "react-native";
import { Text, View, XStack, YStack } from "tamagui";
import { colors } from "@/generated/design-tokens";

interface Stat {
  label: string;
  value: string;
  unit: string;
}

interface DashboardHeaderProps {
  stats: Stat[];
}

function StatCard({ label, value, unit }: Stat) {
  return (
    <View style={styles.statCard}>
      <Text fontSize={14} color={colors.text.dark}>{label}</Text>
      <XStack alignItems="flex-end" gap="$1">
        <Text fontSize={28} fontWeight="600" color="#16B9B3" lineHeight={32}>{value}</Text>
        <Text fontSize={14} color={colors.text.dark} marginBottom={2}>{unit}</Text>
      </XStack>
    </View>
  );
}

export function DashboardHeader({ stats }: DashboardHeaderProps) {
  const today = new Date();

  return (
    <YStack paddingTop="$4" marginBottom="$4">
      {/* Date display */}
      <YStack marginBottom="$3">
        <Text fontSize={22} color="#9CA3AF">{format(today, "yyyy")}</Text>
        <XStack gap="$2">
          <XStack alignItems="center" gap="$1">
            <Text fontSize={36} fontWeight="600" color={colors.text.dark}>{format(today, "M")}</Text>
            <Text fontSize={22} fontWeight="500" color={colors.text.dark}>月</Text>
          </XStack>
          <XStack alignItems="center" gap="$1">
            <Text fontSize={36} fontWeight="600" color={colors.text.dark}>{format(today, "d")}</Text>
            <Text fontSize={22} fontWeight="500" color={colors.text.dark}>日</Text>
          </XStack>
        </XStack>
      </YStack>

      {/* Stats */}
      <XStack gap="$3">
        {stats.map((stat) => (
          <View key={stat.label} style={{ flex: 1 }}>
            <StatCard {...stat} />
          </View>
        ))}
      </XStack>
    </YStack>
  );
}

const styles = StyleSheet.create({
  statCard: {
    backgroundColor: "white",
    borderLeftWidth: 6,
    borderLeftColor: "#A5E9E5",
    borderRadius: 6,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
});
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd apps/mobile && npx tsc --noEmit --pretty 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/components/home/dashboard-header.tsx
git commit -m "feat(mobile): add DashboardHeader component"
```

---

## Task 11: Create Filter Pills Component

**Files:**
- Create: `apps/mobile/components/home/filter-pills.tsx`

Mirrors the filter buttons in product's `page.tsx:335-358`.

- [ ] **Step 1: Create the component**

Create `apps/mobile/components/home/filter-pills.tsx`:

```typescript
import { Pressable, StyleSheet } from "react-native";
import { ScrollView, Text } from "tamagui";
import { FilterStatus, type FilterStatus as FilterStatusType } from "@/constants/task-status";

const filterOptions = [
  { value: FilterStatus.all, label: "全部" },
  { value: FilterStatus.draft, label: "草稿" },
  { value: FilterStatus.notStarted, label: "未開始" },
  { value: FilterStatus.inProgress, label: "進行中" },
  { value: FilterStatus.completed, label: "已完成" },
];

interface FilterPillsProps {
  activeFilter: FilterStatusType;
  onFilterChange: (filter: FilterStatusType) => void;
}

export function FilterPills({ activeFilter, onFilterChange }: FilterPillsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
      marginBottom="$4"
    >
      {filterOptions.map((option) => {
        const isActive = activeFilter === option.value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onFilterChange(option.value)}
            style={[styles.pill, isActive ? styles.pillActive : styles.pillInactive]}
          >
            <Text fontSize={14} color={isActive ? "white" : "#16B9B3"}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  pillActive: {
    backgroundColor: "#16B9B3",
    borderColor: "#16B9B3",
  },
  pillInactive: {
    backgroundColor: "white",
    borderColor: "#16B9B3",
  },
});
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd apps/mobile && npx tsc --noEmit --pretty 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/components/home/filter-pills.tsx
git commit -m "feat(mobile): add FilterPills component"
```

---

## Task 12: Create In-Progress Card Component

**Files:**
- Create: `apps/mobile/components/home/in-progress-card.tsx`

Mirrors `apps/product/src/components/dashboard/in-progress-task-card.tsx` — themed background card with progress.

- [ ] **Step 1: Create the component**

Create `apps/mobile/components/home/in-progress-card.tsx`:

```typescript
import { ArrowRight } from "@tamagui/lucide-icons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View as RNView } from "react-native";
import { Text, View, XStack, YStack } from "tamagui";
import { colors } from "@/generated/design-tokens";
import { getStatusConfig } from "@/constants/task-status";
import { practiceThemeColorMap, getThemeNameFromColor, PracticeTheme } from "@/constants/practice-theme";
import type { InProgressTask } from "@/hooks/usePractices";

interface InProgressCardProps {
  task: InProgressTask;
}

export function InProgressCard({ task }: InProgressCardProps) {
  const router = useRouter();
  const { id, label, title, description, checkInCount, progress, theme, status } = task;

  const themeName = getThemeNameFromColor ? getThemeNameFromColor(theme) : PracticeTheme.yellow;
  const themeColor = practiceThemeColorMap[themeName] || practiceThemeColorMap[PracticeTheme.yellow];
  const statusInfo = getStatusConfig(status);

  return (
    <Pressable
      style={[styles.card, { backgroundColor: themeColor }]}
      onPress={() => router.push(`/practices/${id}` as any)}
    >
      <YStack flex={1} padding="$4" paddingBottom="$5" gap="$4">
        <YStack flex={1} gap="$2">
          {/* Badges */}
          <XStack justifyContent="space-between" gap="$2">
            <View style={styles.badge}>
              <Text fontSize={12} color={colors.text.dark}>{label}</Text>
            </View>
            {statusInfo && (
              <View style={[styles.badge, { backgroundColor: status === "in-progress" ? "#16B9B3" : "white" }]}>
                <Text fontSize={12} color={status === "in-progress" ? "white" : colors.text.dark}>
                  {statusInfo.label}
                </Text>
              </View>
            )}
          </XStack>

          {/* Title + description + arrow */}
          <XStack justifyContent="space-between" gap="$2" flex={1}>
            <YStack flex={1} gap="$2">
              <Text fontSize={20} fontWeight="500" color={colors.text.dark} numberOfLines={1}>
                {title}
              </Text>
              <Text fontSize={12} color={colors.text.dark} numberOfLines={2} flex={1}>
                {description}
              </Text>
            </YStack>
            <View style={{ alignSelf: "center" }}>
              <ArrowRight size={24} color="#9CA3AF" />
            </View>
          </XStack>
        </YStack>

        {/* Check-in count */}
        <XStack alignItems="center" gap="$1">
          <Text fontSize={12} color={colors.text.dark}>已打卡</Text>
          <Text fontSize={12} fontWeight="600" color={colors.text.dark}>{checkInCount}</Text>
          <Text fontSize={12} color={colors.text.dark}>次</Text>
        </XStack>
      </YStack>

      {/* Progress bar */}
      <RNView style={styles.progressContainer}>
        <RNView style={[styles.progressBar, { width: `${Math.min(progress, 100)}%` }]} />
      </RNView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 294,
    borderRadius: 12,
    overflow: "hidden",
    minHeight: 220,
  },
  badge: {
    backgroundColor: "white",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  progressContainer: {
    height: 6,
    backgroundColor: "rgba(0,0,0,0.1)",
  },
  progressBar: {
    height: 6,
    backgroundColor: "#16B9B3",
    borderRadius: 3,
  },
});
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd apps/mobile && npx tsc --noEmit --pretty 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/components/home/in-progress-card.tsx
git commit -m "feat(mobile): add InProgressCard component"
```

---

## Task 13: Create Completed Card Component

**Files:**
- Create: `apps/mobile/components/home/completed-card.tsx`

Mirrors `apps/product/src/components/dashboard/completed-task-card.tsx`.

- [ ] **Step 1: Create the component**

Create `apps/mobile/components/home/completed-card.tsx`:

```typescript
import { ArrowRight } from "@tamagui/lucide-icons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet } from "react-native";
import { Text, View, XStack, YStack } from "tamagui";
import { colors } from "@/generated/design-tokens";
import type { CompletedTask } from "@/hooks/usePractices";

interface CompletedCardProps {
  task: CompletedTask;
}

export function CompletedCard({ task }: CompletedCardProps) {
  const router = useRouter();
  const { id, label, title, description, tags } = task;

  return (
    <Pressable
      style={styles.card}
      onPress={() => router.push(`/practices/${id}` as any)}
    >
      {/* Label + tags */}
      <XStack justifyContent="space-between" gap="$1">
        <View style={styles.labelBadge}>
          <Text fontSize={12} color="#16B9B3">{label}</Text>
        </View>
        <XStack gap="$2" flexWrap="wrap">
          {tags.slice(0, 2).map((tag) => (
            <View key={tag} style={styles.tagBadge}>
              <Text fontSize={12} color="#6B7280">{tag}</Text>
            </View>
          ))}
          {tags.length > 2 && (
            <Text fontSize={12} color="#9CA3AF" paddingVertical={2}>+{tags.length - 2}</Text>
          )}
        </XStack>
      </XStack>

      {/* Title + description + arrow */}
      <XStack gap="$2" marginVertical="$1.5">
        <YStack flex={1}>
          <Text fontSize={16} fontWeight="500" color={colors.text.dark} marginBottom="$1">
            {title}
          </Text>
          <Text fontSize={12} color={colors.text.dark}>{description}</Text>
        </YStack>
        <View style={{ alignSelf: "center" }}>
          <ArrowRight size={24} color="#9CA3AF" />
        </View>
      </XStack>

      {/* Progress indicator (completed = full) */}
      <View style={styles.progressFull} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "white",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 4,
  },
  labelBadge: {
    borderWidth: 1,
    borderColor: "#16B9B3",
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  tagBadge: {
    backgroundColor: "#F3F4F6",
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  progressFull: {
    height: 6,
    borderRadius: 999,
    backgroundColor: "#3B82F6",
    width: "100%",
  },
});
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd apps/mobile && npx tsc --noEmit --pretty 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/components/home/completed-card.tsx
git commit -m "feat(mobile): add CompletedCard component"
```

---

## Task 14: Create Barrel Export

**Files:**
- Create: `apps/mobile/components/home/index.ts`

- [ ] **Step 1: Create barrel export**

Create `apps/mobile/components/home/index.ts`:

```typescript
export { TabSwitcher, type TabType } from "./tab-switcher";
export { ShowcaseSearchBar } from "./showcase-search-bar";
export { ShowcaseFilterBar, type ShowcaseFilterState } from "./showcase-filter-bar";
export { ShowcaseCard } from "./showcase-card";
export { BrewingCard } from "./brewing-card";
export { DashboardHeader } from "./dashboard-header";
export { FilterPills } from "./filter-pills";
export { InProgressCard } from "./in-progress-card";
export { CompletedCard } from "./completed-card";
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/components/home/index.ts
git commit -m "feat(mobile): add home components barrel export"
```

---

## Task 15: Rewrite Homepage — Assemble All Components

**Files:**
- Modify: `apps/mobile/app/(tabs)/index.tsx` (complete rewrite)

This is the final assembly task. It wires up all the components and hooks from previous tasks, following the exact structure of `apps/product/src/app/[locale]/(with-layout)/page.tsx`.

- [ ] **Step 1: Rewrite the homepage**

Replace the entire content of `apps/mobile/app/(tabs)/index.tsx` with:

```typescript
import { useCallback, useMemo, useState } from "react";
import { FlatList, RefreshControl, ScrollView as RNScrollView, StyleSheet, View as RNView } from "react-native";
import { Spinner, Text, YStack, ScrollView } from "tamagui";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { colors } from "@/generated/design-tokens";
import { FilterStatus, type FilterStatus as FilterStatusType } from "@/constants/task-status";
import { usePractices } from "@/hooks/usePractices";
import { useShowcaseFeed, type IShowcaseFeedParams, type IShowcasePractice } from "@/hooks/useShowcaseFeed";
import {
  TabSwitcher,
  type TabType,
  ShowcaseSearchBar,
  ShowcaseFilterBar,
  type ShowcaseFilterState,
  ShowcaseCard,
  BrewingCard,
  DashboardHeader,
  FilterPills,
  InProgressCard,
  CompletedCard,
} from "@/components/home";
import { RandomPracticesSection } from "@/components/practice/shared/random-practices-section";

export default function HomeScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("inspire");

  // ── Inspire tab state ──
  const [searchValue, setSearchValue] = useState("");
  const [keyword, setKeyword] = useState("");
  const [filters, setFilters] = useState<ShowcaseFilterState>({
    tags: [],
  });

  const feedParams: IShowcaseFeedParams = useMemo(
    () => ({
      keyword: keyword || undefined,
      tags: filters.tags.length > 0 ? filters.tags : undefined,
      duration_min: filters.durationMin,
      duration_max: filters.durationMax,
      status: filters.status,
      sort_by: "newest_updated",
    }),
    [keyword, filters]
  );

  const {
    practices,
    isLoading: isShowcaseLoading,
    hasMore,
    loadMore,
    isValidating,
    mutate: mutateShowcase,
  } = useShowcaseFeed(feedParams);

  const handleSearch = useCallback((value: string) => {
    setKeyword(value);
  }, []);

  const handleFiltersChange = useCallback((newFilters: ShowcaseFilterState) => {
    setFilters(newFilters);
  }, []);

  // ── Mine tab state ──
  const [filterStatus, setFilterStatus] = useState<FilterStatusType>(FilterStatus.all);
  const {
    stats,
    inProgressTasks,
    completedTasks,
    isLoading: isMyLoading,
    mutate: mutatePractices,
  } = usePractices();

  const filteredInProgressTasks = useMemo(() => {
    if (filterStatus === FilterStatus.completed) return [];
    if (filterStatus === FilterStatus.all) return inProgressTasks;
    return inProgressTasks.filter((task) => task.status === filterStatus);
  }, [inProgressTasks, filterStatus]);

  const hasPractices = inProgressTasks.length > 0 || completedTasks.length > 0;
  const showInProgress = filterStatus !== FilterStatus.completed;
  const showCompleted = filterStatus === FilterStatus.all || filterStatus === FilterStatus.completed;

  const dashboardStats = useMemo(
    () => [
      { label: "連續登入", value: String(stats.currentStreak || 0), unit: "天" },
      { label: "獲得迴響", value: String(stats.totalCheckIns || 0), unit: "次" },
    ],
    [stats]
  );

  // ── Inspire tab render ──
  const renderShowcaseItem = useCallback(
    ({ item }: { item: IShowcasePractice }) =>
      item.is_brewing ? (
        <BrewingCard practice={item} />
      ) : (
        <ShowcaseCard practice={item} />
      ),
    []
  );

  const renderShowcaseHeader = useCallback(
    () => (
      <YStack paddingHorizontal="$4" paddingTop="$4">
        <TabSwitcher activeTab={activeTab} onTabChange={setActiveTab} />
        <YStack marginBottom="$3">
          <ShowcaseSearchBar
            value={searchValue}
            onChange={setSearchValue}
            onSearch={handleSearch}
          />
        </YStack>
        <ShowcaseFilterBar filters={filters} onFiltersChange={handleFiltersChange} />
      </YStack>
    ),
    [activeTab, searchValue, filters, handleSearch, handleFiltersChange]
  );

  const renderShowcaseFooter = useCallback(
    () =>
      isValidating ? (
        <Text textAlign="center" paddingVertical="$4" color="rgba(0,0,0,0.5)" fontSize={14}>
          載入中...
        </Text>
      ) : null,
    [isValidating]
  );

  const renderShowcaseEmpty = useCallback(
    () =>
      !isShowcaseLoading ? (
        <YStack alignItems="center" paddingVertical="$8">
          <Text color="rgba(0,0,0,0.5)" fontSize={14}>沒有找到相關實踐</Text>
        </YStack>
      ) : null,
    [isShowcaseLoading]
  );

  // ── Mine tab render ──
  const renderMineContent = useCallback(() => {
    if (isMyLoading) {
      return (
        <YStack flex={1} alignItems="center" justifyContent="center" paddingVertical="$8">
          <Spinner size="large" color={colors.primary.base} />
        </YStack>
      );
    }

    return (
      <YStack paddingHorizontal="$4">
        <DashboardHeader stats={dashboardStats} />

        {!hasPractices && <RandomPracticesSection compact />}

        {hasPractices && (
          <>
            <FilterPills activeFilter={filterStatus} onFilterChange={setFilterStatus} />

            {/* In-progress cards — horizontal scroll */}
            {showInProgress && filteredInProgressTasks.length > 0 && (
              <FlatList
                horizontal
                data={filteredInProgressTasks}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <InProgressCard task={item} />}
                contentContainerStyle={{ gap: 12, paddingBottom: 16 }}
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 16 }}
              />
            )}

            {/* Completed cards — vertical list */}
            {showCompleted && completedTasks.length > 0 && (
              <YStack gap="$3" marginBottom="$4">
                <Text fontSize={18} fontWeight="500" color={colors.text.dark}>已完成</Text>
                {completedTasks.map((task) => (
                  <CompletedCard key={task.id} task={task} />
                ))}
              </YStack>
            )}
          </>
        )}
      </YStack>
    );
  }, [
    isMyLoading, dashboardStats, hasPractices, filterStatus,
    showInProgress, filteredInProgressTasks, showCompleted, completedTasks,
  ]);

  // ── Main render ──
  if (activeTab === "inspire") {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        {isShowcaseLoading && practices.length === 0 ? (
          <>
            {renderShowcaseHeader()}
            <YStack paddingHorizontal="$4" gap="$3">
              {[1, 2, 3].map((i) => (
                <RNView key={i} style={styles.skeleton} />
              ))}
            </YStack>
          </>
        ) : (
          <FlatList
            data={practices}
            keyExtractor={(item) => item.id}
            renderItem={renderShowcaseItem}
            ListHeaderComponent={renderShowcaseHeader}
            ListFooterComponent={renderShowcaseFooter}
            ListEmptyComponent={renderShowcaseEmpty}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 12, paddingBottom: 100 }}
            onEndReached={() => {
              if (hasMore && !isValidating) loadMore();
            }}
            onEndReachedThreshold={0.3}
            refreshControl={
              <RefreshControl
                refreshing={false}
                onRefresh={() => mutateShowcase()}
                tintColor={colors.primary.base}
              />
            }
          />
        )}
      </SafeAreaView>
    );
  }

  // Mine tab — use ScrollView since content is not a homogeneous list
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={() => mutatePractices()}
            tintColor={colors.primary.base}
          />
        }
      >
        <YStack paddingHorizontal="$4" paddingTop="$4">
          <TabSwitcher activeTab={activeTab} onTabChange={setActiveTab} />
        </YStack>
        {renderMineContent()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F7F7",
  },
  skeleton: {
    backgroundColor: "white",
    borderRadius: 16,
    height: 192,
    borderWidth: 1,
    borderColor: "#E8F8FF",
    opacity: 0.6,
  },
});
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd apps/mobile && npx tsc --noEmit --pretty 2>&1 | head -20`
Fix any type errors.

- [ ] **Step 3: Run the app and verify visually**

Run: `cd apps/mobile && npx expo start`

Verify:
- Tab switcher displays "靈感" and "我的" tabs
- Switching tabs works
- Inspire tab shows search bar, filter bar, and feed cards (or loading skeletons)
- Mine tab shows dashboard header, filter pills, and practice cards
- Pull-to-refresh works on both tabs
- Infinite scroll loads more on inspire tab
- Card taps navigate to practice detail

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/app/\(tabs\)/index.tsx
git commit -m "feat(mobile): rewrite homepage with dual tabs aligned to product"
```

---

## Task 16: Final Cleanup — Remove Unused Imports

**Files:**
- Verify: `apps/mobile/components/index.ts` — ensure `HomeBanner` is still exported (used elsewhere?)
- Verify: No unused imports or dead code

- [ ] **Step 1: Check if HomeBanner is used elsewhere**

Run: `grep -r "HomeBanner" apps/mobile/ --include="*.tsx" --include="*.ts" -l`

If only referenced in `components/index.ts`, remove the export. If used in other pages, keep it.

- [ ] **Step 2: Run TypeScript check across mobile app**

Run: `cd apps/mobile && npx tsc --noEmit --pretty 2>&1 | tail -20`
Expected: No errors

- [ ] **Step 3: Commit cleanup if needed**

```bash
git add -A apps/mobile/
git commit -m "chore(mobile): cleanup unused imports after homepage rewrite"
```
