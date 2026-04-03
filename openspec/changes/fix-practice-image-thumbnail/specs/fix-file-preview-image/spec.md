## ADDED Requirements

### Requirement: FilePreviewImage 在 blob URL 被 revoke 前先清除顯示
`FilePreviewImage` 元件 SHALL 在 revoke blob URL 之前，先將 `previewUrl` state 清除為 `null`，確保 `<img>` 元素從 DOM 移除後 URL 才被撤銷。

#### Scenario: React Strict Mode 下上傳圖片後縮圖正常顯示
- **WHEN** 使用者在 React 19 Strict Mode 環境中選取圖片上傳
- **THEN** 縮圖區域 SHALL 顯示圖片預覽（不顯示破圖或 alt text）

#### Scenario: 切換不同檔案時舊縮圖不殘留破圖狀態
- **WHEN** `file` prop 變更（使用者選取不同圖片）
- **THEN** 舊 URL 被 revoke 前，img 元素 SHALL 先被移除（previewUrl 設為 null）
- **THEN** 新 URL 建立後，新圖片縮圖 SHALL 正確顯示

#### Scenario: 元件 unmount 時 blob URL 被正確釋放
- **WHEN** `FilePreviewImage` 元件從 DOM 移除（例如使用者刪除已選取的圖片）
- **THEN** 對應的 blob URL SHALL 被 revoke（無記憶體洩漏）
