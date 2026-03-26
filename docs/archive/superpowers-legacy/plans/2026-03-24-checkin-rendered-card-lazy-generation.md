# Check-in Rendered Card Lazy Generation - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move rendered check-in card image generation from submission time to share time, fixing 413/400 upload errors.

**Architecture:** Remove the `useCheckInImageRender` hook that generates and injects a screenshot into the media array at submit time. Instead, generate the card screenshot on-demand in the share modal. Both `CheckInSheetContent` and `CheckInPhase2SheetContent` are simplified to call `onComplete` directly. The `CheckInCard` component loses its auto-capture `useEffect` and `showAllImages` prop.

**Tech Stack:** React, html2canvas (via `captureElementAsImage` from `@daodao/shared`), TypeScript

**Spec:** `docs/superpowers/specs/2026-03-24-checkin-rendered-card-lazy-generation-design.md`

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `apps/product/src/components/check-in/form/check-in-sheet.tsx` | Remove `useCheckInImageRender`, call `onComplete` directly |
| Delete | `apps/product/src/components/check-in/form/hooks/use-check-in-image-render.tsx` | No longer needed |
| Delete | `apps/product/src/components/check-in/form/utils.ts` | `dataURLtoFile` and `convertMediaToUrls` only used by deleted hook |
| Modify | `apps/product/src/components/check-in/display/check-in-card.tsx` | Remove auto-capture `useEffect`, `showAllImages` prop, `applyGradientMask`. Show all images directly. |
| Modify | `apps/product/src/components/check-in/share/share-check-in-content.tsx` | Generate card screenshot on-demand, download from data URL |
| None | `apps/product/src/hooks/use-share-check-in-sheet.tsx` | Already passes `taskTitle` — no changes needed |

---

### Task 1: Simplify CheckInSheetContent — remove render hook

**Files:**
- Modify: `apps/product/src/components/check-in/form/check-in-sheet.tsx`

- [ ] **Step 1: Update `CheckInSheetContent` (lines 42-100)**

Remove `useCheckInImageRender` usage. Call `onComplete` directly in `onSubmit`.

```tsx
// BEFORE (lines 58-64, 66-74, 87-88, 92-94):
const { isRendering, startRender, renderCheckInCard } = useCheckInImageRender({
  taskTitle,
  onComplete,
  onReset: () => { form.reset(); },
});
const onSubmit = async (values: CheckInFormValuesType) => {
  const formData: ICheckInFormData = { ... };
  await startRender(formData);
};
// JSX: {renderCheckInCard()}
// Button: disabled={isRendering}, text: isRendering ? "儲存中..." : submitButtonText

// AFTER:
const [isSubmitting, setIsSubmitting] = useState(false);
const onSubmit = async (values: CheckInFormValuesType) => {
  setIsSubmitting(true);
  try {
    await onComplete({
      mood: values.mood,
      tags: values.tags,
      description: values.description,
      media: values.media,
    });
    form.reset();
  } finally {
    setIsSubmitting(false);
  }
};
// JSX: remove {renderCheckInCard()}
// Button: disabled={isSubmitting}, text: isSubmitting ? "儲存中..." : submitButtonText
```

- [ ] **Step 2: Update `CheckInPhase2SheetContent` (lines 252-316)**

Same change — remove `useCheckInImageRender`, call `onComplete` directly.

```tsx
// BEFORE (lines 268-274, 276-283, 304, 308-310):
const { isRendering, startRender, renderCheckInCard } = useCheckInImageRender({ ... });
const onSubmit = async (values: CheckInFormValuesType) => {
  await startRender({ ... });
};
// JSX: {renderCheckInCard()}
// Button: disabled={isRendering}

// AFTER:
const [isSubmitting, setIsSubmitting] = useState(false);
const onSubmit = async (values: CheckInFormValuesType) => {
  setIsSubmitting(true);
  try {
    await onComplete({
      mood: values.mood,
      tags: values.tags,
      description: values.description,
      media: values.media,
    });
    form.reset();
  } finally {
    setIsSubmitting(false);
  }
};
// JSX: remove {renderCheckInCard()}
// Button: disabled={isSubmitting}
```

- [ ] **Step 3: Clean up imports**

Remove from the file:
```tsx
// DELETE this import:
import { useCheckInImageRender } from "./hooks/use-check-in-image-render";
// ADD:
import { useState } from "react";
```

- [ ] **Step 4: Verify the app compiles**

Run: `cd apps/product && pnpm run typecheck`
Expected: no errors related to check-in-sheet.tsx (there may be unused import warnings for the deleted hook file — that's fine, we'll delete it next)

- [ ] **Step 5: Commit**

```bash
git add apps/product/src/components/check-in/form/check-in-sheet.tsx
git commit -m "refactor(check-in): remove render hook from submit flow"
```

---

### Task 2: Delete unused hook and utils

**Files:**
- Delete: `apps/product/src/components/check-in/form/hooks/use-check-in-image-render.tsx`
- Delete: `apps/product/src/components/check-in/form/utils.ts`

- [ ] **Step 1: Verify no other imports**

Search for any remaining imports of these files:

```bash
grep -rE "use-check-in-image-render|from.*form/utils" apps/product/src/ --include="*.ts" --include="*.tsx"
```

Expected: only the spec doc and the files themselves (no other consumers after Task 1).

- [ ] **Step 2: Delete the files**

```bash
rm apps/product/src/components/check-in/form/hooks/use-check-in-image-render.tsx
rm apps/product/src/components/check-in/form/utils.ts
```

- [ ] **Step 3: Verify the app compiles**

Run: `cd apps/product && pnpm run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add -u
git commit -m "refactor(check-in): delete unused render hook and utils"
```

---

### Task 3: Simplify CheckInCard — remove auto-capture and showAllImages

**Files:**
- Modify: `apps/product/src/components/check-in/display/check-in-card.tsx`

- [ ] **Step 1: Remove auto-capture useEffect (lines 121-139)**

Delete the entire `useEffect` block that calls `captureElementAsImage` after 500ms timeout. This was only used by the submit-time screenshot flow.

- [ ] **Step 2: Remove `applyGradientMask` function (lines 33-84)**

This function was only called inside the deleted `useEffect`. Remove it entirely.

- [ ] **Step 3: Remove props and related logic**

Remove from the interface and component:
- `onMaskedImageReady` prop
- `showAllImages` prop
- `captureRef` prop
- `checkInImageRef` ref

Update the images display logic (line 203-206):

```tsx
// BEFORE:
{images && images.length > (showAllImages ? 0 : 1) && (
  <div className="relative -mt-14">
    {(showAllImages ? images.slice(0, 3) : images.slice(1, 4)).map((imageUrl: string, displayIndex: number) => {
      const actualIndex = showAllImages ? displayIndex : displayIndex + 1;

// AFTER:
{images && images.length > 0 && (
  <div className="relative -mt-14">
    {images.slice(0, 3).map((imageUrl: string, displayIndex: number) => {
      const actualIndex = displayIndex;
```

- [ ] **Step 4: Clean up unused imports**

```tsx
// Remove from imports:
import { type CapturedImageData, captureElementAsImage } from "@daodao/shared";
// Remove useEffect, useRef if no longer used (useRef for mainRef may still be used for other purposes — check):
// mainRef is used in JSX at line 157, but only as a fallback for captureRef — if captureRef is removed, check if mainRef is still needed
// After removing captureRef logic, mainRef is only referenced in JSX <main ref={mainRef}> — it's not used for anything else, so remove it too
```

- [ ] **Step 5: Verify the app compiles**

Run: `cd apps/product && pnpm run typecheck`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/product/src/components/check-in/display/check-in-card.tsx
git commit -m "refactor(check-in): simplify CheckInCard, remove auto-capture"
```

---

### Task 4: Add on-demand card generation to share flow

**Files:**
- Modify: `apps/product/src/components/check-in/share/share-check-in-content.tsx`

- [ ] **Step 1: Add card rendering and capture logic**

Add a hidden `CheckInCard`, capture it on mount, and store the result:

```tsx
import { captureElementAsImage } from "@daodao/shared";
import { useEffect, useRef, useState } from "react";
import { CheckInCard } from "../display/check-in-card";

// Inside ShareCheckInSheetContent:
const captureRef = useRef<HTMLDivElement>(null);
const [cardImageUrl, setCardImageUrl] = useState<string | null>(null);
const [isCapturing, setIsCapturing] = useState(true);

// Capture card on mount
useEffect(() => {
  const timer = setTimeout(async () => {
    const element = captureRef.current;
    if (!element) {
      setIsCapturing(false);
      return;
    }
    try {
      const imageData = await captureElementAsImage(element);
      if (imageData) {
        setCardImageUrl(imageData.src);
      }
    } catch {
      // Capture failed silently — download button will stay disabled
    } finally {
      setIsCapturing(false);
    }
  }, 500);

  return () => clearTimeout(timer);
}, []);
```

- [ ] **Step 2: Add hidden CheckInCard to JSX**

Add before the main content:

```tsx
{/* Hidden card for screenshot capture */}
<div className="fixed -left-[9999px] -top-[9999px] opacity-0 pointer-events-none">
  <div ref={captureRef} className="max-w-[350px] bg-logo-cyan pt-8 px-4 pb-4 rounded-2xl">
    <CheckInCard
      taskTitle={taskTitle}
      date={checkInData.date}
      mood={checkInData.mood}
      content={checkInData.description}
      tags={checkInData.tags}
      images={checkInData.images}
      showTape
    />
  </div>
</div>
```

- [ ] **Step 3: Update preview image**

Replace the current `images[0]` preview with the captured card:

```tsx
// BEFORE:
<div className="relative overflow-hidden w-[350px] h-[192px]">
  <Image src={images?.[0] ?? ""} alt="打卡圖片" fill className="object-contain bg-white" />
</div>

// AFTER:
<div className="relative overflow-hidden w-[350px] min-h-[192px]">
  {isCapturing ? (
    <div className="flex items-center justify-center h-[192px] text-sm text-light-gray">
      生成分享圖片中...
    </div>
  ) : cardImageUrl ? (
    <img src={cardImageUrl} alt="打卡圖片" className="w-full object-contain bg-white" />
  ) : (
    <div className="flex items-center justify-center h-[192px] text-sm text-light-gray">
      無法生成圖片
    </div>
  )}
</div>
```

Remove the `Image` import from `@daodao/ui/components/image` if no longer used.

- [ ] **Step 4: Update download handler**

Replace fetch-from-R2 with data URL blob download:

```tsx
// BEFORE (lines 42-65):
const handleDownloadImage = async () => {
  const imageUrl = images?.[0];
  if (!imageUrl) return;
  try {
    const urlWithCacheBust = `${imageUrl}...`;
    const response = await fetch(urlWithCacheBust);
    const blob = await response.blob();
    // ...
  }
};

// AFTER:
const handleDownloadImage = () => {
  if (!cardImageUrl) return;
  try {
    // Convert data URL to blob for download
    const byteString = atob(cardImageUrl.split(",")[1] || "");
    const mimeType = cardImageUrl.split(",")[0]?.match(/:(.*?);/)?.[1] || "image/png";
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([ab], { type: mimeType });
    const blobUrl = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = `check-in-${checkInData.date || Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
    toast.success("圖片已下載");
  } catch {
    toast.error("下載失敗");
  }
};
```

- [ ] **Step 5: Disable download button while capturing**

```tsx
<Button type="button" variant="outline" className="w-full" onClick={handleDownloadImage} disabled={isCapturing || !cardImageUrl}>
  <Download className="size-4.5" />
  {isCapturing ? "生成中..." : "下載打卡圖片"}
</Button>
```

- [ ] **Step 6: Verify the app compiles**

Run: `cd apps/product && pnpm run typecheck`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add apps/product/src/components/check-in/share/share-check-in-content.tsx
git commit -m "feat(check-in): generate share card on-demand in share modal"
```

---

### Task 5: Manual QA verification

- [ ] **Step 1: Test check-in submit with image**

1. Open the product app, navigate to a practice
2. Click check-in, select mood, add tags, upload 1 photo
3. Submit — should succeed without 413/400 error
4. Verify the photo appears in the check-in card display

- [ ] **Step 2: Test check-in submit without image**

1. Check in with mood + tags only (no photo)
2. Submit — should succeed
3. Card displays mood, tags, text — no broken image

- [ ] **Step 3: Test Phase 2 submit**

1. Quick check-in (mood only)
2. Phase 2 sheet opens — add tags, description, photo
3. Submit — should succeed

- [ ] **Step 4: Test share flow**

1. View a check-in detail
2. Click "分享這篇打卡"
3. Share modal should show "生成分享圖片中..." briefly, then display the rendered card
4. Click "下載打卡圖片" — should download a JPG
5. Social share buttons should still work (they share URL/text, not images)

- [ ] **Step 5: Test share with old data**

1. View an existing check-in that was created before this change (has rendered card at images[0])
2. Card display should show all images including the old rendered card (cosmetic, acceptable)
3. Share modal should generate a fresh card from the check-in data

- [ ] **Step 6: Remove debug logs**

Remove the `[MediaUpload]` console.log statements added during debugging in `apps/product/src/components/check-in/form/components/media-upload-field.tsx`.

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "chore(check-in): remove debug logs"
```
