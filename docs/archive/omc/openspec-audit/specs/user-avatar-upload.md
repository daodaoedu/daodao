# user-avatar-upload
- 涉及 repo: server / f2e
- 對應 archived change: add-user-avatar-upload（推測）
- 總計: 2 條 requirement / 6 個 scenario | ✅5 ⚠️1 ❌0 ❓0

## Requirement: 頭像圖片上傳 → ✅
證據: daodao-server:src/controllers/image.controller.ts:11-14 uploadToR2Api、:29-34 mimetype/size refine、:70 uploadToR2Api；route image.routes.ts:302-306 POST /api/v1/images（authenticate + upload.single('file')）；f2e apps/product/.../settings/public-info/avatar-upload-section.tsx（accept="image/*"）、public-info-form.tsx:178 setAvatarFile；contacts.photo_url（auth.controller.ts:386,691 讀取）。
- Scenario: 成功上傳頭像 → ⚠️ — 上傳至 R2 確認；photo_url 更新由 public-info-form 表單送出（avatarFile→上傳→寫 photo_url），但「寫入 contacts.photo_url 的 server 端 update」未直接定位到單一行（透過 me/contact 更新流程），故標 ⚠️。
- Scenario: 上傳不支援格式 → ✅ — image.controller.ts:29-31 refine + 訊息「不支援的檔案類型。僅支援 JPEG、PNG 和 WebP 格式。」（與 spec 一字不差）。
- Scenario: 超過大小限制 → ✅ — image.controller.ts:33-34 size <= MAX_FILE_SIZE + 訊息「檔案大小超過 500KB 限制」（與 spec 一致）。
- Scenario: 未登入上傳 → ✅ — route image.routes.ts:303 authenticate middleware → 401。

## Requirement: 頭像顯示 Fallback → ✅
證據: daodao-f2e:packages/ui/src/components/avatar.tsx:56-72 AvatarFallback；使用處 apps/product/.../comment-section.tsx:240-244 顯示 `{name.slice(0,1)}` 首字母 + getAvatarColor。
- Scenario: 未上傳頭像 → ✅ — photo_url 缺時渲染 AvatarFallback 首字母（comment-section.tsx:243 name.slice(0,1)）。
- Scenario: 已上傳頭像 → ✅ — AvatarImage src={photo_url}（CheckInShowcaseCard.tsx:218,328）。
