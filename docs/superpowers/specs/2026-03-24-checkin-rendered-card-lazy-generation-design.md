# Check-in Rendered Card: Lazy Generation

## Problem

When submitting a check-in, the frontend generates a rendered card image (`check-in-rendered.jpg`) via `html2canvas` and uploads it alongside user photos. This image:

- Is uncompressed and often exceeds the backend's 500KB multer limit on high-DPI devices, causing 400/413 errors
- Gets re-generated and re-uploaded on every edit, making the previous version garbage in R2 storage
- Adds ~500ms delay to the submit flow for the screenshot capture
- Is only used when the user actively shares — most users never share after check-in

## Solution

Move rendered card generation from check-in submission time to share time. The card is generated on-demand when the user taps share/download.

## Changes

### 1. Remove rendered card from submit flow

Both `CheckInSheetContent` and `CheckInPhase2SheetContent` use `useCheckInImageRender` and need to be updated.

**File**: `apps/product/src/components/check-in/form/hooks/use-check-in-image-render.tsx`

- Remove `handleMaskedImageReady` logic that inserts `check-in-rendered.jpg` at `media[0]`
- Remove offscreen `CheckInCard` rendering (`renderCheckInCard`)
- Remove `convertMediaToUrls` and `dataURLtoFile` usage
- The hook can be removed entirely — submit calls `onComplete` directly

**File**: `apps/product/src/components/check-in/form/check-in-sheet.tsx`

- In `CheckInSheetContent`: `onSubmit` calls `onComplete(formData)` directly instead of `startRender(formData)`
- In `CheckInPhase2SheetContent`: same change — call `onComplete(formData)` directly
- Remove `useCheckInImageRender` import and `renderCheckInCard()` from JSX in both components

### 2. Update CheckInCard display to show all images

**File**: `apps/product/src/components/check-in/display/check-in-card.tsx`

- Remove `images.slice(1, 4)` logic that skips index 0
- Display all images directly — they are all user photos now
- Remove `showAllImages` prop since it's no longer needed
- Remove or guard the auto-capture `useEffect` (lines 121-139) that calls `captureElementAsImage` after 500ms on mount. This was only needed for the submit-time screenshot. If left in, it would trigger unnecessary captures every time a CheckInCard renders in the UI.

### 3. Add on-demand card generation to share flow

**File**: `apps/product/src/components/check-in/share/share-check-in-content.tsx`

Current behavior:
- Download button fetches `images[0]` (the pre-uploaded rendered card) from R2 via `fetch` + blob
- Social share buttons use `getShareAPI` which shares a URL/text — no image is sent to social platforms

New behavior:
- When share modal opens, render a hidden `CheckInCard` and capture via `captureElementAsImage`
- Store the captured data URL in a `useRef` for the duration of the modal session
- **Download button**: convert data URL to blob and trigger download (replaces the current fetch-from-R2 approach)
- **Social share buttons**: unchanged — they share URL/text, not images
- **Share modal preview**: show the captured data URL instead of `images[0]`
- Show a loading spinner while the card is being captured (~500ms)

### 4. Clean up related code

**File**: `apps/product/src/components/check-in/form/hooks/use-check-in-image-render.tsx`

- Delete this file entirely (all its responsibilities are removed)

**File**: `apps/product/src/components/check-in/form/utils/` (if exists)

- `dataURLtoFile` — keep if used elsewhere; remove if only used by the deleted hook
- `convertMediaToUrls` — keep if used elsewhere; remove if only used by the deleted hook

## Data Flow

### Before (current)

```
Submit → html2canvas screenshot → insert rendered card at media[0] → upload all → R2
Share  → fetch images[0] URL from R2 → download / show preview
Display → show images[1..3] (skip rendered card at index 0)
```

### After (proposed)

```
Submit  → upload user photos only → R2
Share   → html2canvas screenshot on demand → cache in useRef → download / show preview
Display → show images[0..2] (all user photos)
```

## Edge Cases

- **No photos uploaded**: Share still works — CheckInCard renders with mood/tags/description only, no photo section
- **Share modal opened multiple times**: First open generates and caches in `useRef`; subsequent opens within the same modal session reuse the cached image
- **Existing check-ins with rendered card at images[0]**: Old data in the database still has the rendered card as the first image. The rendered card will display as a regular image in the card UI. This is acceptable — it's still a valid image of the check-in content. No migration needed.
- **Old check-ins shared after this change**: Share modal will generate a fresh card on-demand from the current check-in data. The old pre-uploaded rendered card in R2 becomes unused but harmless.

## Not In Scope

- Backend changes (multer limits, R2 cleanup of old rendered cards)
- Mobile app changes (Expo app has a separate flow)
- `og_image_url` field — unused by check-in features, no changes needed
