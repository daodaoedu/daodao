# Two-Phase Check-In Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the check-in flow from a single-phase form (mood + tags + description + photos) into a two-phase design: Phase 1 (mood only, quick check-in) → success dialog → Phase 2 (optional: tags, description, photos).

**Architecture:** Phase 1 strips the "想法分享" and media upload sections from `CheckInSheetContent`. A new `CheckInPhase2SheetContent` component is added for the optional second phase. A new hook `useCheckInPhase2Sheet` orchestrates opening the Phase 2 sheet and calling `updatePracticeCheckInWithFormData` to patch the existing check-in record. The success dialog gets a "繼續分享心得" button that triggers Phase 2.

**Tech Stack:** React, react-hook-form, zod, SWR, @daodao/ui SheetManager, @daodao/api

---

### Task 1: Add `beforeTextarea` prop to DescriptionField

**Files:**
- Modify: `apps/product/src/components/check-in/form/components/description-field.tsx`

- [ ] **Step 1: Add `ReactNode` import and `beforeTextarea` prop**

```tsx
// Add import
import type { ReactNode } from "react";

// Update interface
interface IDescriptionFieldProps {
  form: UseFormReturn<CheckInFormValuesType>;
  /** 插入在 label 和 textarea 之間的額外內容 */
  beforeTextarea?: ReactNode;
}

// Update component signature
export const DescriptionField = ({ form, beforeTextarea }: IDescriptionFieldProps) => {
```

- [ ] **Step 2: Update FormItem/FormLabel styles and insert `beforeTextarea`**

Change `<FormItem>` to `<FormItem className="mt-4">`.
Change `<FormLabel className="text-sm text-text-dark font-normal">` to `<FormLabel className="text-base font-medium text-text-dark">`.
Insert `{beforeTextarea}` between the closing `</div>` (after FormDescription) and `<FormControl>`.

- [ ] **Step 3: Verify no type errors**

Run: `cd apps/product && npx tsc --noEmit --pretty 2>&1 | head -30`

---

### Task 2: Add `fallbackTags` prop to TagSelector + text changes

**Files:**
- Modify: `apps/product/src/components/check-in/form/components/tag-selector.tsx`

- [ ] **Step 1: Add `fallbackTags` prop to interface and component**

```tsx
interface ITagSelectorProps {
  form: UseFormReturn<CheckInFormValuesType>;
  /** API 無資料時的備用標籤列表（例如 mock 環境） */
  fallbackTags?: string[];
}

export const TagSelector = ({ form, fallbackTags }: ITagSelectorProps) => {
```

- [ ] **Step 2: Add `baseTagList` logic and update `availableTags` merge**

After `availableTagsFromApi` memo, add:

```tsx
// API 無資料時使用 fallbackTags
const baseTagList = availableTagsFromApi.length > 0 ? availableTagsFromApi : (fallbackTags ?? []);
```

Update `availableTags` memo:

```tsx
const availableTags = useMemo(
  () => Array.from(new Set([...baseTagList, ...(tags || [])])),
  [baseTagList, tags]
);
```

- [ ] **Step 3: Change "引導句" text to "自動填入文字"**

Line with `<span className="text-sm text-gray-500">引導句</span>` → `<span className="text-sm text-gray-500">自動填入文字</span>`

---

### Task 3: Add `CheckInPhase2SheetContent` to check-in-sheet.tsx

**Files:**
- Modify: `apps/product/src/components/check-in/form/check-in-sheet.tsx`
- Modify: `apps/product/src/components/check-in/form/index.ts`

- [ ] **Step 1: Add `React` import at top of check-in-sheet.tsx**

```tsx
import React from "react";
```

- [ ] **Step 2: Remove "想法分享" and "Media Upload" sections from `CheckInSheetContent`**

Remove lines 88-97 (the `{/* Thought Sharing */}` div and `{/* Media Upload */}` section) from `CheckInSheetContent`.

- [ ] **Step 3: Add `CheckInPhase2SheetContent` component at end of file**

Append after `CheckInButton` component:

```tsx
// ============================================================================
// Phase 2 Sheet Content（想法分享 + 上傳照片）
// ============================================================================

interface ICheckInPhase2SheetContentProps {
  taskTitle: string;
  onComplete: (data: Omit<ICheckInFormData, "mood">) => Promise<void> | void;
  /** API 無資料時的備用標籤列表（例如 mock 環境） */
  suggestedTags?: string[];
}

/**
 * 打卡第二階段表單
 * 讓使用者在快速打卡（心情）完成後，進一步填寫標籤、心得描述與照片
 */
export const CheckInPhase2SheetContent = ({
  taskTitle,
  onComplete,
  suggestedTags,
}: ICheckInPhase2SheetContentProps) => {
  const form = useForm<CheckInFormValuesType>({
    resolver: zodResolver(checkInFormSchema),
    defaultValues: {
      mood: null,
      tags: [],
      description: "",
      media: [],
    },
  });

  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const onSubmit = async (values: CheckInFormValuesType) => {
    setIsSubmitting(true);
    try {
      await onComplete({
        tags: values.tags,
        description: values.description,
        media: values.media,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="px-6">
        {/* Activity Title */}
        <h2 className="text-md leading-8 font-medium text-bg-dark wrap-break-word mb-6">
          {taskTitle}
        </h2>

        {/* Thought Sharing */}
        <div className="mb-8">
          <h3 className="text-base font-medium mb-3 text-text-dark">想法分享</h3>
          <TagSelector form={form} fallbackTags={suggestedTags} />
          <DescriptionField form={form} beforeTextarea={<ReflectionQuestion />} />
        </div>

        {/* Media Upload */}
        <MediaUploadField form={form} />

        {/* Submit Button */}
        <div className="sticky bottom-0 left-0 right-0 border-t border-light-gray bg-white p-6 -mx-6 -mb-6">
          <Button type="submit" variant="orange" className="w-full" disabled={isSubmitting}>
            <Check className="size-4.5" />
            {isSubmitting ? "儲存中..." : "儲存心得"}
          </Button>
        </div>
      </form>
    </Form>
  );
};
```

- [ ] **Step 4: Export `CheckInPhase2SheetContent` from index.ts**

Update `apps/product/src/components/check-in/form/index.ts`:

```ts
export { CheckInButton, CheckInSheetContent, CheckInPhase2SheetContent } from "./check-in-sheet";
```

---

### Task 4: Create `useCheckInPhase2Sheet` hook

**Files:**
- Create: `apps/product/src/hooks/use-check-in-phase2-sheet.tsx`

- [ ] **Step 1: Create the hook file**

```tsx
"use client";

import { updatePracticeCheckInWithFormData, useMutate } from "@daodao/api";
import { useSheetManager } from "@daodao/ui/components/animate-ui/components/radix/sheet";
import { toast } from "@daodao/ui/components/sonner";
import { useCallback, useRef } from "react";
import { CheckInPhase2SheetContent } from "@/components/check-in/form/check-in-sheet";

interface IUseCheckInPhase2SheetOptions {
  practiceId: string;
  taskTitle: string;
  onComplete?: () => void;
}

/**
 * 打卡第二階段 Sheet
 * 在快速打卡（心情）完成後，引導使用者補充標籤、心得與照片
 */
export function useCheckInPhase2Sheet({
  practiceId,
  taskTitle,
  onComplete,
}: IUseCheckInPhase2SheetOptions) {
  const { open } = useSheetManager();
  const mutate = useMutate();
  const closeRef = useRef<(() => void) | null>(null);

  const openPhase2Sheet = useCallback(
    (checkInId: string) => {
      const { close } = open({
        title: "分享心得",
        description: "補充你的標籤、心得與照片",
        content: (
          <CheckInPhase2SheetContent
            taskTitle={taskTitle}
            onComplete={async (data) => {
              closeRef.current?.();
              const loadingToast = toast.loading("儲存中...");
              try {
                await updatePracticeCheckInWithFormData(practiceId, checkInId, {
                  mood: undefined,
                  tags: data.tags,
                  description: data.description,
                  media: data.media,
                });
                // 刷新打卡列表 cache
                await mutate([
                  "/api/v1/practices/{id}/checkins",
                  { params: { path: { id: practiceId }, query: {} } },
                ] as const);
                toast.dismiss(loadingToast);
                toast.success("心得已儲存！");
                onComplete?.();
              } catch (error) {
                toast.dismiss(loadingToast);
                const message = error instanceof Error ? error.message : "儲存失敗，請稍後再試";
                toast.error(message);
              }
            }}
          />
        ),
        dismissible: true,
        closeOnEscape: true,
        showCloseButton: true,
      });
      closeRef.current = close;
    },
    [practiceId, taskTitle, onComplete, open, mutate]
  );

  return { openPhase2Sheet };
}
```

---

### Task 5: Wire Phase 2 into `CheckInButton`

**Files:**
- Modify: `apps/product/src/components/check-in/form/check-in-sheet.tsx`

- [ ] **Step 1: Import `useCheckInPhase2Sheet` in check-in-sheet.tsx**

Add after the `CheckInStatus` import:

```tsx
import { useCheckInPhase2Sheet } from "@/hooks/use-check-in-phase2-sheet";
```

- [ ] **Step 2: Use the hook in `CheckInButton` and pass `onOpenPhase2` to `useCheckInSubmit`**

Inside `CheckInButton`, before the `useCheckInSubmit` call, add:

```tsx
const { openPhase2Sheet } = useCheckInPhase2Sheet({ practiceId, taskTitle });
```

Then update the `useCheckInSubmit` call to include `onOpenPhase2: openPhase2Sheet`.

---

### Task 6: Update `useCheckInSubmit` to support Phase 2

**Files:**
- Modify: `apps/product/src/components/check-in/form/hooks/use-check-in-submit.ts`

- [ ] **Step 1: Add `onOpenPhase2` to options interface**

```tsx
interface UseCheckInSubmitOptions {
  practiceId: string;
  taskTitle: string;
  progressPercentage?: number;
  onComplete?: (data: ICheckInFormData) => void;
  /** Phase 2 回調：打卡成功後使用者選擇「繼續分享心得」時呼叫，帶入打卡記錄 ID */
  onOpenPhase2?: (checkInId: string) => void;
}
```

- [ ] **Step 2: Destructure `onOpenPhase2` in the hook**

- [ ] **Step 3: Extract `checkInId` from API response**

Update the `responseData` type assertion to include `id`:

```tsx
const responseData = response.data as
  | { id?: number; practiceProgressPercentage?: number; encouragement?: string }
  | undefined;
const checkInId =
  responseData && "id" in responseData && typeof responseData.id === "number"
    ? String(responseData.id)
    : undefined;
```

- [ ] **Step 4: Add Phase 2 branch in success dialog result handling**

Before the existing `if (result.value === "complete")`:

```tsx
if (result.value === "share" && checkInId && onOpenPhase2) {
  // 使用者選擇繼續分享心得，開啟 Phase 2 Sheet
  onOpenPhase2(checkInId);
} else if (result.value === "complete") {
```

---

### Task 7: Enable "繼續分享心得" button in success dialog

**Files:**
- Modify: `apps/product/src/hooks/use-check-in-success-dialog.tsx`

- [ ] **Step 1: Uncomment and update the share button**

Change:

```tsx
// { label: "分享心得", value: "share", variant: "outline" },
```

To:

```tsx
{ label: "繼續分享心得", value: "share", variant: "outline" },
```

- [ ] **Step 2: Update encouragement text**

Change:

```tsx
<p>歡迎分享你的心得，和你有相同實踐的人會很想知道喔！</p>
```

To:

```tsx
<p className="text-sm text-text-dark/60">想留下更多紀錄嗎？繼續填寫標籤、心得與照片吧！</p>
```

---

### Task 8: Comment section UI fixes

**Files:**
- Modify: `apps/product/src/components/check-in/reactions/comment-section.tsx`

- [ ] **Step 1: Remove avatar fallback text in the input area**

Change:

```tsx
<AvatarFallback
  className={cn("text-sm font-medium text-text-dark", getAvatarColor("Me"))}
>
  {(currentUserName || "我").slice(0, 1)}
</AvatarFallback>
```

To:

```tsx
<AvatarFallback
  className={cn(getAvatarColor("Me"))}
/>
```

- [ ] **Step 2: Add empty state for comments**

Change:

```tsx
{comments.length > 0 && (
  <div className="flex flex-col gap-5 px-4 pt-4 pb-2">
    {previewComments.map(renderCommentBlock)}
  </div>
)}
```

To:

```tsx
{comments.length > 0 ? (
  <div className="flex flex-col gap-5 px-4 pt-4 pb-2">
    {previewComments.map(renderCommentBlock)}
  </div>
) : (
  <div className="flex items-center justify-center px-4 py-8 text-sm text-[#9FB5B8]">
    尚未有留言
  </div>
)}
```

---

### Task 9: Verify build

- [ ] **Step 1: Run TypeScript check**

Run: `cd apps/product && npx tsc --noEmit --pretty 2>&1 | tail -20`

- [ ] **Step 2: Fix any type errors if present**

- [ ] **Step 3: Commit all changes**

```bash
git add -A
git commit -m "feat(check-in): refactor to two-phase check-in flow"
```
