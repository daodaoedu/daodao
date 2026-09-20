## Why

學習平台目前缺乏公開的使用者個人檔案頁面，導致學習者無法展示成長歷程、建立社會認同，也難以吸引志同道合的問責夥伴。「我的小島」作為平台的「身份核心」，是促進社群連結與激發學習動機的關鍵介面。

## What Changes

- 新增個人檔案頁面（`/profile/:userId`），展示使用者的完整學習身份
- 支援使用者頭像上傳與管理
- 顯示 Identity Header：姓名、唯一 User ID（@handle）、地理位置、個人標語（150 字上限）
- 顯示 About Me 區塊：支援 Markdown，350 字上限
- 顯示社群連結（Social Media links）
- 顯示互動數據：連結數（Connections）、關注者數（Followers）
- 顯示連結（Connect）與關注（Follow）互動按鈕（依賴 `social-follow-connect` 功能）
- 顯示近期活躍度：最近 7 天的實踐次數（Practice count）
- 顯示共同參與資訊：「與你有 N 個共同 Circle」
- 允許使用者在設定中隱藏連結數（降低人脈焦慮）

## Capabilities

### New Capabilities
- `user-profile-page`: 公開個人檔案頁面，包含 Identity Header、About Me、社群連結、互動數據、近期活躍度等完整展示介面
- `user-avatar-upload`: 使用者頭像上傳與儲存功能
- `profile-activity-metrics`: 個人檔案中的成長指標展示，包含近期實踐次數與共同 Circle 數量

### Modified Capabilities
<!-- 目前 openspec/specs/ 為空，無現有 spec 需要修改 -->

## Impact

- **前端 (daodao-f2e)**: 新增 `/profile/:userId` 頁面元件、頭像上傳 UI、Markdown 渲染
- **後端 (daodao-server)**: 新增使用者個人檔案 API endpoints（GET/PUT）、頭像上傳 API
- **儲存 (daodao-storage)**: 頭像圖片儲存桶配置
- **依賴**: 與 `social-follow-connect` change 共享連結/關注按鈕邏輯，需協調實作順序
