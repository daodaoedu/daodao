## Context

`FilePreviewImage` 元件使用 `URL.createObjectURL(file)` 建立 blob URL，並透過 `useEffect` 管理其生命週期。在 React 19 Strict Mode（開發環境）下，effect 會執行兩次（mount → cleanup → remount），清理函式會在第一次 effect 結束時 revoke blob URL，但此時 `<img>` 元件的 `src` 仍指向已被 revoke 的 URL，導致瀏覽器顯示破圖。

**問題根源**：目前的 cleanup 函式直接呼叫 `URL.revokeObjectURL(url)`，但沒有先從 state 移除 URL，導致 `<img>` 仍嘗試載入已失效的 URL。

**影響場景**：
1. 打卡「分享心得」表單上傳照片後的即時預覽縮圖
2. 所有使用 `FileUpload` 元件的表單

**受影響檔案**：`packages/ui/src/components/file-upload.tsx`（`FilePreviewImage` 元件）

## Goals / Non-Goals

**Goals:**
- 確保 `FilePreviewImage` 在 React 19 Strict Mode 下正確顯示圖片預覽
- 確保 blob URL 在 `<img>` 不再使用後才被 revoke（無記憶體洩漏）
- 上傳圖片後縮圖立即可見，無破圖狀態

**Non-Goals:**
- 不改變 `FileUpload` 元件的對外 API
- 不處理 `avatar-upload-section` 等其他元件的類似問題
- 不更改圖片上傳至後端的邏輯

## Decisions

### 決策：在 cleanup 中先清除 state，再 revoke URL

**做法**：在 cleanup 函式中，先呼叫 `setPreviewUrl(null)` 將 img 從 DOM 移除，再呼叫 `URL.revokeObjectURL(url)`。

```tsx
React.useEffect(() => {
  const url = URL.createObjectURL(file);
  setPreviewUrl(url);

  return () => {
    setPreviewUrl(null);       // ← 新增：先清除 state
    URL.revokeObjectURL(url);  // 再 revoke URL
  };
}, [file]);
```

**為何選此方案**：
- Strict Mode double-invocation 時：cleanup 先讓 img 回到 null（顯示 loading 佔位），再 revoke URL；下一次 effect 執行後會建立新的有效 URL 並顯示圖片
- Production 單次 unmount 時：img 被移除 → URL 被 revoke，不影響使用者體驗
- 程式碼變更最小，維持原有元件架構

**考慮過的替代方案**：
- `useMemo` 管理 URL：在 React 19 開發環境 memoized value 可能被丟棄，導致 URL 建立兩次且第一個永不被 revoke（記憶體洩漏）
- `useRef` + 自訂 tracking：在 cleanup 中透過 ref 判斷是否應 revoke，但在 Strict Mode 中 ref 值在兩次 effect 之間仍相同，無法區分 strict mode cleanup 和真實 unmount

## Risks / Trade-offs

- **短暫 Loading 狀態**：Strict Mode 下 cleanup 觸發後，img 會短暫回到 loading 佔位（ImageIcon），再顯示新 URL 的圖片。在 production 不會發生；在開發環境是可接受的行為 → 不影響用戶體驗

## Migration Plan

1. 更新 `FilePreviewImage` cleanup 函式（一行改動）
2. 在 dev 環境驗證打卡頁面上傳縮圖正常顯示
3. 無 DB migration，無 API 變更
