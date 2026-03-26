# Mobile 靈感卡片 Reaction + 公開實踐詳細頁 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 讓 mobile 靈感 tab 的 ShowcaseCard 和實踐詳細頁完全對齊 product web 版本 — 加入 reaction 功能、留言預覽、公開實踐詳細頁。

**Architecture:** Mobile 自建 API hooks 使用 `apiClient`（Bearer token auth），從 `@daodao/api` 只 import types。UI 元件用 RN 原生（Tamagui + React Native）重寫。公開詳細頁在現有 route `/practices/[id]` 中判斷 owner/public。

**Tech Stack:** React Native, Expo Router, Tamagui, SWR, apiClient (Bearer auth)

**Spec:** `docs/superpowers/specs/2026-03-22-mobile-showcase-reaction-and-public-detail-design.md`

---

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `apps/mobile/constants/reaction-type.ts` | Reaction emoji config (static emoji, label, 4 picker types) |
| `apps/mobile/hooks/useReactions.ts` | Reaction query + mutation hooks via `apiClient` |
| `apps/mobile/hooks/useComments.ts` | Comment query + CRUD hooks via `apiClient` |
| `apps/mobile/hooks/useFollow.ts` | Follow/unfollow hooks via `apiClient` |
| `apps/mobile/components/reactions/ReactionPickerButton.tsx` | Summary display + long-press picker (summary & card variants) |
| `apps/mobile/components/practice/detail/PublicPracticeView.tsx` | Public practice detail page main view |
| `apps/mobile/components/practice/detail/CommentSection.tsx` | Comment list + CRUD + input box |
| `apps/mobile/components/practice/detail/BrowseActivitySheet.tsx` | Browse activity Tamagui Sheet |
| `apps/mobile/components/practice/detail/PracticeTabBar.tsx` | 3-tab switcher (comments, check-ins, resources) |

### Modified Files

| File | Changes |
|------|---------|
| `apps/mobile/components/home/showcase-card.tsx` | Bottom bar: add ReactionPickerButton (left) + comment preview (below) |
| `apps/mobile/app/practices/[id]/index.tsx` | Add owner/public detection, render PublicPracticeView for non-owner |

---

## Important Notes

1. **Task ordering**: API hooks (Tasks 1-4) must be completed before UI components that depend on them.
2. **N+1 avoidance on ShowcaseCard**: The card summary uses `practice.reactions` inline data from the feed. Only call `useReactions` mutations when the user interacts with the picker. Do NOT call `useReactions`/`useReactionsList`/`useComments` per card in the feed.
3. **Public practice data**: `usePractice(id)` does NOT have a `user` field and only returns owner practices. Use navigation params to pass `IShowcasePractice` data from the showcase feed. If `showcaseData` param exists → public view, otherwise → owner view.
4. **KeyboardAvoidingView**: PublicPracticeView must wrap with `KeyboardAvoidingView` for comment input on iOS.
5. **Deep link limitation (acceptable for MVP)**: Public practice detail only works when navigated from 靈感 tab (which passes `showcaseData`). Deep link / notification without params falls back to owner view or shows error.
6. **Check-ins tab graceful fallback**: `useCheckIns(id)` may fail for non-owner practices. The check-ins tab must catch errors and show "無法載入打卡紀錄" instead of crashing.

---

## Task 1: Reaction Type Constants

**Files:**
- Create: `apps/mobile/constants/reaction-type.ts`

- [ ] **Step 1: Create reaction-type.ts**

```typescript
// apps/mobile/constants/reaction-type.ts

export const ReactionType = {
  encourage: "encourage",
  touched: "touched",
  fire: "fire",
  useful: "useful",
  sameHere: "sameHere",
  curious: "curious",
} as const;

export type ReactionTypeType = (typeof ReactionType)[keyof typeof ReactionType];

export interface IReactionConfig {
  emoji: string;
  label: string;
}

export const REACTION_CONFIG: Record<ReactionTypeType, IReactionConfig> = {
  encourage: { emoji: "🥰", label: "一起加油" },
  touched: { emoji: "💓", label: "共鳴" },
  fire: { emoji: "🔥", label: "啟發" },
  useful: { emoji: "👍🏻", label: "加油" },
  sameHere: { emoji: "😳", label: "我也是" },
  curious: { emoji: "🧐", label: "好奇" },
};

/** The 4 reactions shown in the picker popup */
export const PICKER_REACTIONS: ReactionTypeType[] = ["useful", "fire", "touched", "curious"];
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/constants/reaction-type.ts
git commit -m "feat(mobile): add reaction type constants"
```

---

## Task 2: Reaction API Hooks

**Files:**
- Create: `apps/mobile/hooks/useReactions.ts`

- [ ] **Step 1: Create useReactions.ts**

```typescript
// apps/mobile/hooks/useReactions.ts

import useSWR from "swr";
import { api } from "@/services/api-client";
import type { ReactionTypeType } from "@/constants/reaction-type";

// ── Types ──

interface ReactionCount {
  type: string;
  count: number;
}

interface ReactionsResponse {
  success: boolean;
  data?: {
    reactions: ReactionCount[];
    currentUserReaction: string | null;
  };
}

interface ReactionListItem {
  userId: string;
  name: string;
  photoURL?: string | null;
  reactionType: string;
  reactedAt: string;
}

interface ReactionsListResponse {
  success: boolean;
  data?: {
    items: ReactionListItem[];
  };
}

// ── Hooks ──

export function useReactions(targetType: string, targetId: string) {
  const { data, error, isLoading, mutate } = useSWR<ReactionsResponse>(
    targetId ? `/reactions?targetType=${targetType}&targetId=${targetId}` : null,
    (url: string) => api.get<ReactionsResponse>(url),
    { revalidateOnFocus: false }
  );

  const reactions = data?.data?.reactions ?? [];
  const currentUserReaction = (data?.data?.currentUserReaction ?? null) as ReactionTypeType | null;
  const totalCount = reactions.reduce((sum, r) => sum + r.count, 0);
  const displayReactions = reactions
    .filter((r) => r.count > 0)
    .map((r) => r.type as ReactionTypeType);

  return { reactions, currentUserReaction, totalCount, displayReactions, error, isLoading, mutate };
}

export function useReactionsList(targetType: string, targetId: string) {
  const { data, error, isLoading } = useSWR<ReactionsListResponse>(
    targetId ? `/reactions/list?targetType=${targetType}&targetId=${targetId}` : null,
    (url: string) => api.get<ReactionsListResponse>(url),
    { revalidateOnFocus: false }
  );

  const items = data?.data?.items ?? [];
  const firstReactorName = items[0]?.name ?? undefined;

  return { items, firstReactorName, error, isLoading };
}

// ── Mutations ──

export async function upsertReaction(targetType: string, targetId: string, reactionType: string) {
  return api.post("/reactions", { targetType, targetId, reactionType });
}

export async function removeReaction(targetType: string, targetId: string) {
  return api.delete(`/reactions?targetType=${targetType}&targetId=${targetId}`);
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/hooks/useReactions.ts
git commit -m "feat(mobile): add reaction API hooks"
```

---

## Task 3: ReactionPickerButton Component

**Files:**
- Create: `apps/mobile/components/reactions/ReactionPickerButton.tsx`

- [ ] **Step 1: Create ReactionPickerButton.tsx**

This component has two variants:

- **`summary`** (used in ShowcaseCard bottom bar): overlapping emoji circles + "X 與其他 N 人" text, long-press to open picker
- **`card`** (used in detail page): full-width, shows emoji + count, long-press to open picker

```typescript
// apps/mobile/components/reactions/ReactionPickerButton.tsx

import { useCallback, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet } from "react-native";
import { Text, View, XStack } from "tamagui";
import { ThumbsUp } from "@tamagui/lucide-icons";
import {
  PICKER_REACTIONS,
  REACTION_CONFIG,
  type ReactionTypeType,
} from "@/constants/reaction-type";

const LONG_PRESS_DELAY = 400;

interface ReactionPickerButtonProps {
  selectedReaction: ReactionTypeType | null;
  onToggle: (type: ReactionTypeType) => void;
  variant?: "summary" | "card";
  /** Total reaction count (all users) */
  totalCount?: number;
  /** Reaction types to display as overlapping circles (max 2) */
  displayReactions?: ReactionTypeType[];
  /** First reactor name for summary text */
  firstReactorName?: string;
}

export function ReactionPickerButton({
  selectedReaction,
  onToggle,
  variant = "summary",
  totalCount = 0,
  displayReactions = [],
  firstReactorName,
}: ReactionPickerButtonProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const openPicker = useCallback(() => {
    setPickerOpen(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 150,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const closePicker = useCallback(() => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 100,
      useNativeDriver: true,
    }).start(() => setPickerOpen(false));
  }, [fadeAnim]);

  const handleSelect = useCallback(
    (type: ReactionTypeType) => {
      onToggle(type);
      closePicker();
    },
    [onToggle, closePicker]
  );

  const isSummary = variant === "summary";
  const hasReactions = displayReactions.length > 0 || selectedReaction != null;

  // Build summary text: "X 與其他 N 人"
  const summaryText = (() => {
    if (totalCount <= 0) return null;
    if (firstReactorName) {
      return totalCount > 1
        ? `${firstReactorName} 與其他 ${totalCount - 1} 人`
        : firstReactorName;
    }
    return `${totalCount} 人`;
  })();

  return (
    <View style={isSummary ? styles.summaryContainer : styles.cardContainer}>
      {/* Dismiss overlay (behind picker, above trigger) */}
      {pickerOpen && (
        <Pressable style={[StyleSheet.absoluteFill, { zIndex: 5 }]} onPress={closePicker} />
      )}

      {/* Picker popup (above overlay) */}
      {pickerOpen && (
        <Animated.View style={[styles.picker, { opacity: fadeAnim }]}>
          {PICKER_REACTIONS.map((type) => {
            const config = REACTION_CONFIG[type];
            const isSelected = selectedReaction === type;
            return (
              <Pressable
                key={type}
                onPress={() => handleSelect(type)}
                style={[styles.pickerItem, isSelected && styles.pickerItemSelected]}
              >
                <Text fontSize={24}>{config.emoji}</Text>
              </Pressable>
            );
          })}
        </Animated.View>
      )}

      {/* Main trigger */}
      <Pressable
        onLongPress={openPicker}
        onPress={() => {
          if (pickerOpen) {
            closePicker();
          }
        }}
        delayLongPress={LONG_PRESS_DELAY}
        style={styles.trigger}
      >
        {isSummary ? (
          <XStack alignItems="center" gap="$2">
            {hasReactions ? (
              <XStack alignItems="center">
                {(displayReactions.length > 0
                  ? displayReactions.slice(0, 2)
                  : selectedReaction
                    ? [selectedReaction]
                    : []
                ).map((type, i) => (
                  <View
                    key={type}
                    style={[
                      styles.emojiCircle,
                      selectedReaction === type && styles.emojiCircleSelected,
                      i > 0 && { marginLeft: -6 },
                    ]}
                  >
                    <Text fontSize={14}>{REACTION_CONFIG[type]?.emoji ?? "👍"}</Text>
                  </View>
                ))}
              </XStack>
            ) : (
              <ThumbsUp size={20} color="#9FB5B8" />
            )}
            {summaryText && (
              <Text fontSize={13} color="#295E5C">{summaryText}</Text>
            )}
          </XStack>
        ) : (
          /* card variant */
          <XStack alignItems="center" justifyContent="center" gap="$2" width="100%">
            {displayReactions.length > 0 ? (
              <XStack alignItems="center">
                {displayReactions.slice(0, 2).map((type, i) => (
                  <View key={type} style={[{ marginLeft: i > 0 ? -4 : 0 }]}>
                    <Text fontSize={18}>{REACTION_CONFIG[type]?.emoji ?? "👍"}</Text>
                  </View>
                ))}
              </XStack>
            ) : selectedReaction ? (
              <Text fontSize={18}>{REACTION_CONFIG[selectedReaction]?.emoji ?? "👍"}</Text>
            ) : (
              <ThumbsUp size={20} color="#9FB5B8" />
            )}
            {totalCount > 0 && (
              <Text fontSize={14} fontWeight="500" color="#295E5C">{totalCount}</Text>
            )}
          </XStack>
        )}
      </Pressable>

    </View>
  );
}

const styles = StyleSheet.create({
  summaryContainer: {
    position: "relative",
  },
  cardContainer: {
    position: "relative",
    width: "100%",
    alignItems: "center",
  },
  trigger: {
    zIndex: 1,
  },
  picker: {
    position: "absolute",
    bottom: "100%",
    left: 0,
    marginBottom: 8,
    flexDirection: "row",
    gap: 4,
    backgroundColor: "white",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: "#E4EAE9",
    zIndex: 10,
  },
  pickerItem: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  pickerItemSelected: {
    backgroundColor: "#E8FAF9",
  },
  emojiCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#EAF7FF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "white",
  },
  emojiCircleSelected: {
    backgroundColor: "#E8FAF9",
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/components/reactions/ReactionPickerButton.tsx
git commit -m "feat(mobile): add ReactionPickerButton component"
```

---

## Task 4: Update ShowcaseCard Bottom Bar with Reactions

**Files:**
- Modify: `apps/mobile/components/home/showcase-card.tsx`

**IMPORTANT: Avoid N+1 API calls.** The card summary uses `practice.reactions` inline data from the feed. Do NOT call `useReactions`/`useReactionsList`/`useComments` per card. Only fire mutation APIs when the user interacts with the picker, then mutate the showcase feed.

- [ ] **Step 1: Update ShowcaseCard**

Changes:

1. Import `ReactionPickerButton` and mutation functions (not query hooks)
2. Derive `displayReactions`, `totalCount`, `firstReactorName` from `practice.reactions` (inline feed data)
3. Replace bottom bar: left = ReactionPickerButton (summary), right = comment icon + count
4. Track `currentUserReaction` in local state (initialized from inline data if available)

```typescript
// Add these imports at top:
import { useCallback, useState } from "react";
import { ReactionPickerButton } from "@/components/reactions/ReactionPickerButton";
import { upsertReaction, removeReaction } from "@/hooks/useReactions";
import type { ReactionTypeType } from "@/constants/reaction-type";

// Inside ShowcaseCard, derive from practice.reactions (inline feed data):
const { reactions = [] } = practice;
const inlineTotalCount = reactions.reduce((sum, r) => sum + r.count, 0);
const inlineDisplayReactions = reactions
  .filter((r) => r.count > 0)
  .map((r) => r.type as ReactionTypeType);
const inlineFirstReactorName = reactions.find((r) => r.count > 0)?.latestActorName;

// Local state for current user reaction (optimistic)
const [currentUserReaction, setCurrentUserReaction] = useState<ReactionTypeType | null>(null);

const handleReactionToggle = useCallback(
  async (type: ReactionTypeType) => {
    const isSelected = currentUserReaction === type;
    // Optimistic update
    setCurrentUserReaction(isSelected ? null : type);
    try {
      if (isSelected) {
        await removeReaction("practice", id);
      } else {
        await upsertReaction("practice", id, type);
      }
    } catch {
      // Rollback on failure
      setCurrentUserReaction(isSelected ? type : null);
    }
  },
  [currentUserReaction, id]
);

// Replace the bottom bar View (lines 103-111) with:
{/* Bottom bar */}
<View style={styles.bottomBar}>
  <ReactionPickerButton
    selectedReaction={currentUserReaction}
    onToggle={handleReactionToggle}
    variant="summary"
    totalCount={inlineTotalCount}
    displayReactions={inlineDisplayReactions}
    firstReactorName={inlineFirstReactorName}
  />
  <XStack alignItems="center" gap="$1.5">
    <MessageCircle size={20} color="#9FB5B8" />
    {comment_count > 0 && (
      <Text fontSize={14} fontWeight="500" color="#9FB5B8">{comment_count}</Text>
    )}
  </XStack>
</View>
```

Also update `bottomBar` style:

```typescript
bottomBar: {
  borderTopWidth: 1,
  borderTopColor: "#E4EAE9",
  paddingTop: 12,
  marginTop: 12,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",  // changed from "flex-end"
},
```

- [ ] **Step 2: Verify card renders correctly**

Run the mobile app and check the 靈感 tab cards display reaction summary on left and comment icon on right.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/components/home/showcase-card.tsx
git commit -m "feat(mobile): add reaction summary to showcase card"
```

---

## Task 5: Comment API Hooks

**Files:**
- Create: `apps/mobile/hooks/useComments.ts`

- [ ] **Step 1: Create useComments.ts**

```typescript
// apps/mobile/hooks/useComments.ts

import useSWR from "swr";
import { api } from "@/services/api-client";

// ── Types ──

export interface Comment {
  id: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  user?: {
    id: string;
    name: string;
    photoURL?: string | null;
  };
}

interface CommentsResponse {
  success: boolean;
  data?: Comment[];
}

// ── Query Hook ──

export function useComments(targetType: string, targetId: string) {
  const { data, error, isLoading, mutate } = useSWR<CommentsResponse>(
    targetId ? `/comments?targetType=${targetType}&targetId=${targetId}` : null,
    (url: string) => api.get<CommentsResponse>(url),
    { revalidateOnFocus: false }
  );

  const comments = data?.data ?? [];

  return { comments, error, isLoading, mutate };
}

// ── Mutations ──

export async function createComment(targetType: string, targetId: string, content: string) {
  return api.post<{ success: boolean; data?: Comment }>("/comments", {
    targetType,
    targetId,
    content,
  });
}

export async function updateComment(commentId: string, content: string) {
  return api.put<{ success: boolean }>(`/comments/${commentId}`, { content });
}

export async function deleteComment(commentId: string) {
  return api.delete<{ success: boolean }>(`/comments/${commentId}`);
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/hooks/useComments.ts
git commit -m "feat(mobile): add comment API hooks"
```

---

## Task 6: Follow API Hooks

**Files:**
- Create: `apps/mobile/hooks/useFollow.ts`

- [ ] **Step 1: Create useFollow.ts**

```typescript
// apps/mobile/hooks/useFollow.ts

import useSWR from "swr";
import { api } from "@/services/api-client";

// ── Types ──

interface FollowStatusResponse {
  success: boolean;
  data?: {
    isFollowing: boolean;
  };
}

// ── Query Hook ──

export function useFollowStatus(targetType: string, targetId: string) {
  const { data, error, isLoading, mutate } = useSWR<FollowStatusResponse>(
    targetId ? `/follows/check/${targetType}/${targetId}` : null,
    (url: string) => api.get<FollowStatusResponse>(url),
    { revalidateOnFocus: false }
  );

  const isFollowing = data?.data?.isFollowing ?? false;

  return { isFollowing, error, isLoading, mutate };
}

// ── Mutations ──

export async function followTarget(targetType: string, targetId: string) {
  return api.post("/follows", { targetType, targetId });
}

export async function unfollowTarget(targetType: string, targetId: string) {
  return api.delete(`/follows/${targetType}/${targetId}`);
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/hooks/useFollow.ts
git commit -m "feat(mobile): add follow API hooks"
```

---

## Task 7: PracticeTabBar Component

**Files:**
- Create: `apps/mobile/components/practice/detail/PracticeTabBar.tsx`

- [ ] **Step 1: Create PracticeTabBar.tsx**

Simple button-group tab switcher (3 tabs: 留言, 打卡紀錄, 資源).

```typescript
// apps/mobile/components/practice/detail/PracticeTabBar.tsx

import { Pressable, StyleSheet } from "react-native";
import { Text, XStack } from "tamagui";
import { colors } from "@/generated/design-tokens";

export type PracticeTab = "comments" | "checkins" | "resources";

interface PracticeTabBarProps {
  activeTab: PracticeTab;
  onTabChange: (tab: PracticeTab) => void;
  commentCount?: number;
}

const TABS: { key: PracticeTab; label: string }[] = [
  { key: "comments", label: "留言" },
  { key: "checkins", label: "打卡紀錄" },
  { key: "resources", label: "資源" },
];

export function PracticeTabBar({ activeTab, onTabChange, commentCount }: PracticeTabBarProps) {
  return (
    <XStack borderBottomWidth={1} borderBottomColor="#E5E7EB">
      {TABS.map((tab) => {
        const isActive = activeTab === tab.key;
        const label = tab.key === "comments" && commentCount != null && commentCount > 0
          ? `${tab.label} (${commentCount})`
          : tab.label;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onTabChange(tab.key)}
            style={[styles.tab, isActive && styles.tabActive]}
          >
            <Text
              fontSize={14}
              fontWeight="500"
              color={isActive ? colors.text.dark : "rgba(0,0,0,0.4)"}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </XStack>
  );
}

const styles = StyleSheet.create({
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: "#16B9B3",
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/components/practice/detail/PracticeTabBar.tsx
git commit -m "feat(mobile): add PracticeTabBar component"
```

---

## Task 8: CommentSection Component

**Files:**
- Create: `apps/mobile/components/practice/detail/CommentSection.tsx`

- [ ] **Step 1: Create CommentSection.tsx**

Comment list with CRUD + fixed bottom input. Uses `KeyboardAvoidingView` for keyboard handling.

```typescript
// apps/mobile/components/practice/detail/CommentSection.tsx

import { useCallback, useState } from "react";
import { Alert, Image, Pressable, StyleSheet, TextInput } from "react-native";
import { Send, Pencil, Trash2 } from "@tamagui/lucide-icons";
import { Text, View, XStack, YStack } from "tamagui";
import { colors } from "@/generated/design-tokens";
import {
  type Comment,
  useComments,
  createComment,
  updateComment,
  deleteComment,
} from "@/hooks/useComments";
import { useAuth } from "@/providers/AuthProvider";
import { formatRelativeTime } from "@/utils/format-time";

interface CommentSectionProps {
  targetType: string;
  targetId: string;
}

export function CommentSection({ targetType, targetId }: CommentSectionProps) {
  const { user } = useAuth();
  const { comments, mutate } = useComments(targetType, targetId);
  const [inputValue, setInputValue] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = useCallback(async () => {
    const content = inputValue.trim();
    if (!content || isSending) return;

    setIsSending(true);
    try {
      if (editingId) {
        await updateComment(editingId, content);
        setEditingId(null);
      } else {
        await createComment(targetType, targetId, content);
      }
      setInputValue("");
      await mutate();
    } catch {
      Alert.alert("錯誤", editingId ? "編輯留言失敗" : "留言失敗，請稍後再試");
    } finally {
      setIsSending(false);
    }
  }, [inputValue, isSending, editingId, targetType, targetId, mutate]);

  const handleEdit = useCallback((comment: Comment) => {
    setEditingId(comment.id);
    setInputValue(comment.content);
  }, []);

  const handleDelete = useCallback(
    (commentId: string) => {
      Alert.alert("刪除留言", "確定要刪除此留言嗎？", [
        { text: "取消", style: "cancel" },
        {
          text: "刪除",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteComment(commentId);
              await mutate();
            } catch {
              Alert.alert("錯誤", "刪除留言失敗");
            }
          },
        },
      ]);
    },
    [mutate]
  );

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setInputValue("");
  }, []);

  return (
    <YStack flex={1}>
      {/* Comment list */}
      <YStack gap="$3" paddingVertical="$3">
        {comments.length === 0 ? (
          <YStack alignItems="center" paddingVertical="$8">
            <Text color="rgba(0,0,0,0.4)" fontSize={14}>還沒有留言</Text>
          </YStack>
        ) : (
          comments.map((comment) => {
            const isOwner = user?.id === comment.user?.id;
            return (
              <XStack key={comment.id} gap="$2" alignItems="flex-start">
                <View style={styles.avatar}>
                  {comment.user?.photoURL ? (
                    <Image source={{ uri: comment.user.photoURL }} style={styles.avatarImage} />
                  ) : (
                    <Text fontSize={12} fontWeight="500" color="#295E5C">
                      {(comment.user?.name ?? "?").slice(0, 1)}
                    </Text>
                  )}
                </View>
                <YStack flex={1}>
                  <XStack alignItems="center" gap="$1.5">
                    <Text fontSize={13} fontWeight="600" color="#295E5C">
                      {comment.user?.name ?? "匿名"}
                    </Text>
                    <Text fontSize={11} color="#9FB5B8">
                      {formatRelativeTime(comment.createdAt)}
                    </Text>
                  </XStack>
                  <Text fontSize={14} color={colors.text.dark} marginTop={2}>
                    {comment.content}
                  </Text>
                </YStack>
                {isOwner && (
                  <XStack gap="$2">
                    <Pressable onPress={() => handleEdit(comment)} hitSlop={8}>
                      <Pencil size={14} color="#9FB5B8" />
                    </Pressable>
                    <Pressable onPress={() => handleDelete(comment.id)} hitSlop={8}>
                      <Trash2 size={14} color="#9FB5B8" />
                    </Pressable>
                  </XStack>
                )}
              </XStack>
            );
          })
        )}
      </YStack>

      {/* Input bar */}
      <XStack
        borderTopWidth={1}
        borderTopColor="#E4EAE9"
        paddingVertical="$2"
        gap="$2"
        alignItems="center"
      >
        {editingId && (
          <Pressable onPress={cancelEdit}>
            <Text fontSize={12} color={colors.primary.base}>取消</Text>
          </Pressable>
        )}
        <TextInput
          style={styles.input}
          placeholder={editingId ? "編輯留言..." : "寫留言..."}
          placeholderTextColor="#9CA3AF"
          value={inputValue}
          onChangeText={setInputValue}
          multiline
          maxLength={500}
        />
        <Pressable
          onPress={handleSubmit}
          disabled={!inputValue.trim() || isSending}
          style={{ opacity: inputValue.trim() ? 1 : 0.4 }}
        >
          <Send size={20} color={colors.primary.base} />
        </Pressable>
      </XStack>
    </YStack>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E8FAF9",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginTop: 2,
  },
  avatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: "#1a1a1a",
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#F7F7F7",
    borderRadius: 20,
    maxHeight: 80,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/components/practice/detail/CommentSection.tsx
git commit -m "feat(mobile): add CommentSection component"
```

---

## Task 9: BrowseActivitySheet Component

**Files:**
- Create: `apps/mobile/components/practice/detail/BrowseActivitySheet.tsx`

- [ ] **Step 1: Create BrowseActivitySheet.tsx**

```typescript
// apps/mobile/components/practice/detail/BrowseActivitySheet.tsx

import { Image, StyleSheet } from "react-native";
import { Sheet, Text, View, XStack, YStack } from "tamagui";
import { REACTION_CONFIG } from "@/constants/reaction-type";
import { formatRelativeTime } from "@/utils/format-time";

interface Reactor {
  userId: string;
  name: string;
  photoURL?: string | null;
  reactionType: string;
  reactedAt: string;
}

interface BrowseActivitySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commentCount: number;
  reactors: Reactor[];
}

export function BrowseActivitySheet({
  open,
  onOpenChange,
  commentCount,
  reactors,
}: BrowseActivitySheetProps) {
  return (
    <Sheet
      modal
      open={open}
      onOpenChange={onOpenChange}
      snapPoints={[60]}
      dismissOnSnapToBottom
      zIndex={100001}
    >
      <Sheet.Overlay enterStyle={{ opacity: 0 }} exitStyle={{ opacity: 0 }} />
      <Sheet.Frame
        padding="$4"
        backgroundColor="$background"
        borderTopLeftRadius={20}
        borderTopRightRadius={20}
      >
        <Sheet.Handle backgroundColor="$borderColor" />

        <Text fontSize={18} fontWeight="600" marginBottom="$4">瀏覽活動</Text>

        {/* Stats */}
        <XStack gap="$6" marginBottom="$4">
          <YStack>
            <Text fontSize={12} color="rgba(0,0,0,0.5)">留言數</Text>
            <Text fontSize={20} fontWeight="600">{commentCount}</Text>
          </YStack>
          <YStack>
            <Text fontSize={12} color="rgba(0,0,0,0.5)">反應數</Text>
            <Text fontSize={20} fontWeight="600">{reactors.length}</Text>
          </YStack>
        </XStack>

        {/* Reactor list */}
        <YStack gap="$3">
          {reactors.map((reactor) => {
            const config = REACTION_CONFIG[reactor.reactionType as keyof typeof REACTION_CONFIG];
            return (
              <XStack key={`${reactor.userId}-${reactor.reactionType}`} alignItems="center" gap="$3">
                <View style={styles.avatar}>
                  {reactor.photoURL ? (
                    <Image source={{ uri: reactor.photoURL }} style={styles.avatarImage} />
                  ) : (
                    <Text fontSize={12} fontWeight="500" color="#295E5C">
                      {reactor.name.slice(0, 1)}
                    </Text>
                  )}
                </View>
                <Text fontSize={14} color="#1a1a1a" flex={1}>{reactor.name}</Text>
                <Text fontSize={16}>{config?.emoji ?? "👍"}</Text>
                <Text fontSize={12} color="#9FB5B8">{formatRelativeTime(reactor.reactedAt)}</Text>
              </XStack>
            );
          })}
          {reactors.length === 0 && (
            <Text textAlign="center" color="rgba(0,0,0,0.4)" fontSize={14} paddingVertical="$4">
              尚無活動紀錄
            </Text>
          )}
        </YStack>
      </Sheet.Frame>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E8FAF9",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/components/practice/detail/BrowseActivitySheet.tsx
git commit -m "feat(mobile): add BrowseActivitySheet component"
```

---

## Task 10: PublicPracticeView Component

**Files:**
- Create: `apps/mobile/components/practice/detail/PublicPracticeView.tsx`

- [ ] **Step 1: Create PublicPracticeView.tsx**

Main public view assembling all sub-components. This is the largest component.

```typescript
// apps/mobile/components/practice/detail/PublicPracticeView.tsx

import { useCallback, useState } from "react";
import { Alert, Image, KeyboardAvoidingView, Linking, Platform, RefreshControl, StyleSheet } from "react-native";
import {
  ChevronLeft,
  Flag,
  MoreHorizontal,
  Telescope,
  BarChart3,
  Tag,
} from "@tamagui/lucide-icons";
import { Button, Card, ScrollView, Text, View, XStack, YStack } from "tamagui";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@/generated/design-tokens";
import { getStatusConfig } from "@/constants/task-status";
import { useReactions, useReactionsList, upsertReaction, removeReaction } from "@/hooks/useReactions";
import { useComments } from "@/hooks/useComments";
import { useFollowStatus, followTarget, unfollowTarget } from "@/hooks/useFollow";
import { useCheckIns } from "@/hooks/usePractices";
import { ReactionPickerButton } from "@/components/reactions/ReactionPickerButton";
import { CommentSection } from "./CommentSection";
import { BrowseActivitySheet } from "./BrowseActivitySheet";
import { PracticeTabBar, type PracticeTab } from "./PracticeTabBar";
import { CheckInList } from "@/components";
import type { ReactionTypeType } from "@/constants/reaction-type";

interface PublicPracticeViewProps {
  practice: {
    id: string;
    title: string;
    status: string;
    description?: string;
    practiceAction?: string;
    startDate?: string | null;
    endDate?: string | null;
    tags?: string[];
    frequencyMinDays?: number | null;
    frequencyMaxDays?: number | null;
    sessionDurationMinutes?: number | null;
    user?: {
      id: string;
      name: string;
      photoUrl?: string | null;
    };
  };
  onRefresh: () => Promise<void>;
}

const TALLY_REPORT_URL = "https://tally.so/r/BzGQy4";

export function PublicPracticeView({ practice, onRefresh }: PublicPracticeViewProps) {
  const router = useRouter();
  const {
    id, title, status, description, practiceAction,
    startDate, endDate, tags,
    frequencyMinDays, frequencyMaxDays, sessionDurationMinutes,
    user,
  } = practice;

  // ── State ──
  const [activeTab, setActiveTab] = useState<PracticeTab>("comments");
  const [menuOpen, setMenuOpen] = useState(false);
  const [browseActivityOpen, setBrowseActivityOpen] = useState(false);

  // ── Data ──
  const { currentUserReaction, totalCount, displayReactions, mutate: mutateReactions } =
    useReactions("practice", id);
  const { items: reactors, firstReactorName } = useReactionsList("practice", id);
  const { comments } = useComments("practice", id);
  const { isFollowing, mutate: mutateFollow } = useFollowStatus("practice", id);
  const { checkIns, error: checkInsError } = useCheckIns(id);

  // ── Handlers ──
  const handleReactionToggle = useCallback(
    async (type: ReactionTypeType) => {
      const isSelected = currentUserReaction === type;
      if (isSelected) {
        await removeReaction("practice", id);
      } else {
        await upsertReaction("practice", id, type);
      }
      await mutateReactions();
    },
    [currentUserReaction, id, mutateReactions]
  );

  const handleToggleFollow = useCallback(async () => {
    try {
      if (isFollowing) {
        await unfollowTarget("practice", id);
      } else {
        await followTarget("practice", id);
      }
      await mutateFollow();
    } catch {
      Alert.alert("錯誤", "操作失敗，請稍後再試");
    }
    setMenuOpen(false);
  }, [isFollowing, id, mutateFollow]);

  const handleReport = useCallback(() => {
    setMenuOpen(false);
    Linking.openURL(TALLY_REPORT_URL);
  }, []);

  const handleBrowseActivity = useCallback(() => {
    setMenuOpen(false);
    setBrowseActivityOpen(true);
  }, []);

  // ── Derived ──
  const taskStatus = status === "active" ? "in-progress" : "completed";
  const statusInfo = getStatusConfig(taskStatus);
  const formatDate = (d?: string | null) => {
    if (!d) return null;
    const date = new Date(d);
    return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;
  };
  const startFmt = formatDate(startDate);
  const endFmt = formatDate(endDate);

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        flex={1}
        backgroundColor="$background"
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={onRefresh}
            tintColor={colors.primary.base}
          />
        }
        contentContainerStyle={{ paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <XStack padding="$4" justifyContent="space-between" alignItems="center">
          <Button size="$4" circular chromeless onPress={() => router.back()}>
            <ChevronLeft size={24} color="$color" />
          </Button>
          <Text fontSize={16} fontWeight="500" color="$color">主題實踐</Text>
          <Button size="$4" circular chromeless onPress={() => setMenuOpen(!menuOpen)}>
            <MoreHorizontal size={20} color="$color" />
          </Button>
        </XStack>

        {/* Menu dropdown */}
        {menuOpen && (
          <YStack
            position="absolute"
            right={16}
            top={60}
            zIndex={20}
            backgroundColor="white"
            borderRadius={16}
            paddingVertical="$2"
            shadowColor="#000"
            shadowOffset={{ width: 0, height: 2 }}
            shadowOpacity={0.15}
            shadowRadius={8}
            elevation={5}
            minWidth={140}
          >
            <Button chromeless onPress={handleReport} justifyContent="flex-start" paddingHorizontal="$4" paddingVertical="$3">
              <XStack gap="$3" alignItems="center">
                <Flag size={18} color="#295E5C" />
                <Text fontSize={14} color="#295E5C">檢舉</Text>
              </XStack>
            </Button>
            <Button chromeless onPress={handleToggleFollow} justifyContent="flex-start" paddingHorizontal="$4" paddingVertical="$3">
              <XStack gap="$3" alignItems="center">
                <Telescope size={18} color={isFollowing ? colors.primary.base : "#295E5C"} />
                <Text fontSize={14} color={isFollowing ? colors.primary.base : "#295E5C"}>
                  {isFollowing ? "取消關注" : "關注"}
                </Text>
              </XStack>
            </Button>
            <Button chromeless onPress={handleBrowseActivity} justifyContent="flex-start" paddingHorizontal="$4" paddingVertical="$3">
              <XStack gap="$3" alignItems="center">
                <BarChart3 size={18} color="#295E5C" />
                <Text fontSize={14} color="#295E5C">瀏覽活動</Text>
              </XStack>
            </Button>
          </YStack>
        )}

        <YStack paddingHorizontal="$5" gap="$4">
          {/* Status + Title */}
          <YStack alignItems="center" gap="$2">
            <XStack
              backgroundColor={taskStatus === "completed" ? "#6B7280" : colors.primary.base}
              paddingHorizontal="$2"
              paddingVertical="$1"
              borderRadius="$sm"
            >
              <Text fontSize={12} color="white" fontWeight="500">{statusInfo?.label}</Text>
            </XStack>
            <Text fontSize={18} fontWeight="600" color="$color" textAlign="center" numberOfLines={2}>
              {title}
            </Text>
          </YStack>

          {/* Overview Card */}
          <Card backgroundColor="white" borderRadius={12} padding="$4" bordered>
            {/* Date range */}
            {startFmt && endFmt && (
              <Text fontSize={12} color="rgba(0,0,0,0.5)" marginBottom="$2">
                {startFmt} ▶ {endFmt}
              </Text>
            )}

            {/* User + action */}
            <XStack gap="$3" alignItems="flex-start" marginBottom="$3">
              {user && (
                <View style={styles.avatar}>
                  {user.photoUrl ? (
                    <Image source={{ uri: user.photoUrl }} style={styles.avatarImage} />
                  ) : (
                    <Text fontSize={20} color="#9CA3AF">{(user.name ?? "?")[0]}</Text>
                  )}
                </View>
              )}
              <YStack flex={1}>
                {user && (
                  <Text fontSize={14} fontWeight="600" color="#295E5C" marginBottom="$1">
                    {user.name}
                  </Text>
                )}
                {(practiceAction || description) && (
                  <Text fontSize={14} color="rgba(0,0,0,0.8)" numberOfLines={3}>
                    {practiceAction || description}
                  </Text>
                )}
              </YStack>
            </XStack>

            {/* Frequency + duration */}
            {(frequencyMinDays || frequencyMaxDays || sessionDurationMinutes) && (
              <XStack gap="$4" marginBottom="$3">
                {(frequencyMinDays || frequencyMaxDays) && (
                  <XStack alignItems="center">
                    <Text fontSize={14} fontWeight="600" color="#16B9B3">
                      {frequencyMinDays === frequencyMaxDays
                        ? frequencyMinDays
                        : `${frequencyMinDays}-${frequencyMaxDays}`}
                    </Text>
                    <Text fontSize={14} color="rgba(0,0,0,0.6)" marginLeft={2}>天/週</Text>
                  </XStack>
                )}
                {sessionDurationMinutes && (
                  <XStack alignItems="center">
                    <Text fontSize={14} fontWeight="600" color="#16B9B3">{sessionDurationMinutes}</Text>
                    <Text fontSize={14} color="rgba(0,0,0,0.6)" marginLeft={2}>分鐘/次</Text>
                  </XStack>
                )}
              </XStack>
            )}

            {/* Tags */}
            {tags && tags.length > 0 && (
              <XStack flexWrap="wrap" gap="$2">
                {tags.map((tag) => (
                  <XStack
                    key={tag}
                    backgroundColor="#E0F4FF"
                    paddingHorizontal="$2"
                    paddingVertical={4}
                    borderRadius="$sm"
                    alignItems="center"
                    gap="$1"
                  >
                    <Tag size={14} color={colors.primary.lighter} />
                    <Text fontSize={12} color="$color">{tag}</Text>
                  </XStack>
                ))}
              </XStack>
            )}
          </Card>

          {/* Reaction bar */}
          <Card backgroundColor="white" borderRadius={12} padding="$3" bordered>
            <ReactionPickerButton
              selectedReaction={currentUserReaction}
              onToggle={handleReactionToggle}
              variant="card"
              totalCount={totalCount}
              displayReactions={displayReactions}
              firstReactorName={firstReactorName}
            />
          </Card>

          {/* Tabs */}
          <PracticeTabBar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            commentCount={comments.length}
          />

          {/* Tab content */}
          {activeTab === "comments" && (
            <CommentSection targetType="practice" targetId={id} />
          )}

          {activeTab === "checkins" && (
            checkInsError ? (
              <YStack alignItems="center" paddingVertical="$8">
                <Text color="rgba(0,0,0,0.4)" fontSize={14}>無法載入打卡紀錄</Text>
              </YStack>
            ) : (
              <CheckInList checkIns={checkIns || []} emptyText="尚無打卡紀錄" />
            )
          )}

          {activeTab === "resources" && (
            <YStack alignItems="center" paddingVertical="$8">
              <Text color="rgba(0,0,0,0.4)" fontSize={14}>尚無資源</Text>
            </YStack>
          )}
        </YStack>
      </ScrollView>

      </KeyboardAvoidingView>

      {/* Browse Activity Sheet */}
      <BrowseActivitySheet
        open={browseActivityOpen}
        onOpenChange={setBrowseActivityOpen}
        commentCount={comments.length}
        reactors={reactors}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/components/practice/detail/PublicPracticeView.tsx
git commit -m "feat(mobile): add PublicPracticeView component"
```

---

## Task 11: Update Practice Detail Route with Owner/Public Detection

**Files:**
- Modify: `apps/mobile/app/practices/[id]/index.tsx`

- [ ] **Step 1: Add owner/public detection and PublicPracticeView rendering**

Changes to `apps/mobile/app/practices/[id]/index.tsx`:

1. Import `useAuth` and `PublicPracticeView`
2. After loading practice data, compare `practice.user?.id` with `user?.id` from `useAuth()`
3. If not owner, render `PublicPracticeView` instead of owner view

Add at top of file:
```typescript
import { useAuth } from "@/providers/AuthProvider";
import { PublicPracticeView } from "@/components/practice/detail/PublicPracticeView";
```

Inside `PracticeDetailScreen`, after the existing `usePractice(id)` hook:
```typescript
const { user: currentUser } = useAuth();
```

After the loading/error early returns (after line 111), add owner detection:
```typescript
// Determine if current user is the practice owner
const isOwner = currentUser?.id === practice.userId || currentUser?.id === practice.user?.id;

if (!isOwner) {
  return (
    <PublicPracticeView
      practice={{
        id: practice.id,
        title: practice.title,
        status: practice.status,
        description: practice.description,
        practiceAction: practice.practiceAction,
        startDate: practice.startDate,
        endDate: practice.endDate,
        tags: practice.tags,
        frequencyMinDays: practice.frequencyMinDays,
        frequencyMaxDays: practice.frequencyMaxDays,
        sessionDurationMinutes: practice.sessionDurationMinutes,
        user: practice.user,
      }}
      onRefresh={async () => { await mutate(); }}
    />
  );
}
```

Note: The exact property names depend on what `usePractice(id)` returns. Check the `ApiPractice` type in `apps/mobile/hooks/usePractices.ts` and adapt the field mapping.

**Fallback for public practices:** If `usePractice(id)` does not support fetching non-owner practices (returns 403/404), use Expo Router navigation params to pass the `IShowcasePractice` data from the showcase feed. Update `showcase-card.tsx` to pass practice data:

```typescript
// In showcase-card.tsx, update navigation:
router.push({
  pathname: `/practices/${id}`,
  params: { showcaseData: JSON.stringify(practice) },
} as any);
```

Then in `[id]/index.tsx`, read from params:
```typescript
const { id, showcaseData } = useLocalSearchParams<{ id: string; showcaseData?: string }>();
const showcasePractice = showcaseData ? JSON.parse(showcaseData) as IShowcasePractice : null;
```

If `showcasePractice` exists and `showcasePractice.user?.id !== currentUser?.id`, render `PublicPracticeView` using the showcase data directly.

- [ ] **Step 2: Verify owner detection works**

Test by navigating to a practice from the 靈感 tab (should show public view) and from 我的 tab (should show owner view).

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/practices/[id]/index.tsx
git commit -m "feat(mobile): add owner/public detection to practice detail"
```

---

## Task 12: Integration Testing & Polish

- [ ] **Step 1: Test showcase card reactions**

1. Open 靈感 tab
2. Verify each card shows reaction summary (left) + comment icon (right)
3. Long-press reaction area → picker appears with 4 emoji
4. Select an emoji → picker closes, reaction updates
5. Long-press again → can toggle/change reaction
6. Verify comment preview shows below bottom bar (if comments exist)

- [ ] **Step 2: Test public practice detail**

1. Tap a card from 靈感 tab
2. Verify public view renders (not owner view)
3. Test reaction picker on detail page
4. Test comment CRUD (add, edit, delete)
5. Test follow/unfollow via menu
6. Test 檢舉 opens Tally URL
7. Test 瀏覽活動 opens sheet with correct data
8. Test tab switching (留言 / 打卡紀錄 / 資源)

- [ ] **Step 3: Test owner practice detail still works**

1. Navigate to own practice from 我的 tab
2. Verify owner view renders (with check-in, archive, delete buttons)

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix(mobile): polish showcase card and public practice detail"
```
