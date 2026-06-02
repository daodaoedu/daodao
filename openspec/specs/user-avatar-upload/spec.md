## ADDED Requirements

### Requirement: 頭像圖片上傳
使用者 SHALL 能透過個人檔案頁上傳頭像圖片，並儲存至 Cloudflare R2。

#### Scenario: 成功上傳頭像
- **WHEN** 已登入使用者上傳符合格式與大小要求的圖片
- **THEN** 系統將圖片上傳至 R2，並將圖片 URL 更新至 `contacts.photo_url`，個人檔案頁立即顯示新頭像

#### Scenario: 上傳不支援的圖片格式
- **WHEN** 使用者嘗試上傳非 JPEG/PNG/WebP 格式的檔案
- **THEN** 系統拒絕上傳並回傳錯誤訊息：「不支援的檔案類型。僅支援 JPEG、PNG 和 WebP 格式。」

#### Scenario: 上傳超過大小限制的圖片
- **WHEN** 使用者嘗試上傳超過 500KB 的圖片
- **THEN** 系統拒絕上傳並回傳錯誤訊息：「檔案大小超過 500KB 限制」

#### Scenario: 未登入使用者嘗試上傳頭像
- **WHEN** 未認證請求嘗試上傳圖片
- **THEN** 系統回傳 401 Unauthorized

---

### Requirement: 頭像顯示 Fallback
當使用者尚未設定頭像時，系統 SHALL 顯示預設頭像（以姓名首字母或系統預設圖示呈現）。

#### Scenario: 使用者未上傳頭像
- **WHEN** `contacts.photo_url` 為 null 或空值
- **THEN** 系統顯示使用者姓名首字母作為頭像佔位符

#### Scenario: 使用者已上傳頭像
- **WHEN** `contacts.photo_url` 存在有效 URL
- **THEN** 系統顯示對應的圖片
