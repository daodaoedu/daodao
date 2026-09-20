# user-profile-page Delta Spec

## ADDED Requirements

### Requirement: 個人頁提供上島入口
個人檔案頁 SHALL 於 IslandHeader 區域提供「上島」入口按鈕，導向該使用者的 3D 島嶼頁 `/island/[identifier]`。當瀏覽器不支援 WebGL 時，入口 SHALL 仍可點擊並由島嶼頁處理降級。

#### Scenario: 從個人頁上島
- **WHEN** 使用者在任一個人檔案頁點擊「上島」按鈕
- **THEN** 導航至該使用者的 `/island/[identifier]` 頁面
