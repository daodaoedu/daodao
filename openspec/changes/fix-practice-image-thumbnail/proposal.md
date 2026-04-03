## Why

主題實踐（Practice）打卡「分享心得」表單中，上傳照片時縮圖無法正確顯示，僅顯示破圖圖示與 alt text「Preview」。這包含兩個場景：

1. **上傳時即時預覽**：在 `分享心得` 彈窗中選取圖片後，縮圖區塊無法顯示圖片預覽（顯示 「Preview 1」 破圖）
2. **打卡完成後縮圖**：打卡記錄中上傳的圖片縮圖無法顯示

這會影響使用者體驗，讓使用者無法確認已選取或已上傳的圖片內容。

## What Changes

- 修復 `FilePreviewImage` 元件中 blob URL 的生命週期管理，確保圖片載入完成前 URL 不會被提前 revoke
- 確保在 React 19 strict mode 下 blob URL 預覽仍能正常運作

## Capabilities

### New Capabilities

_無_

### Modified Capabilities

_無現有 spec 需修改。此為 UI 元件層級的 bug fix，不涉及 spec 層級的行為變更。_

## Impact

- **影響子專案**: daodao-f2e
- **影響檔案**: `packages/ui/src/components/file-upload.tsx` — `FilePreviewImage` 元件
- **影響範圍**: 所有使用 `FileUpload` 元件的功能（主題實踐打卡、及其他使用此元件的表單）
- **API / DB**: 無影響

## Non-goals

- 不改變圖片上傳至後端的邏輯
- 不重構 `FileUpload` 元件的整體架構
- 不處理其他元件（如 `avatar-upload-section`）的類似問題（若有需要另開 change）
