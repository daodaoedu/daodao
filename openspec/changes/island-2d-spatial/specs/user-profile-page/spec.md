## ADDED Requirements

### Requirement: 個人頁提供可回滾的空間小島入口
個人檔案頁 SHALL 於 IslandHeader 提供「上島」入口，導向該使用者既有的 `/island/[identifier]`。入口 MUST 不依賴瀏覽器是否支援特定 Canvas renderer；2D rollout 或 3D rollback SHALL 使用相同 URL 與入口。

#### Scenario: 從個人頁進入 2D 空間小島
- **WHEN** 使用者在已分配 2D renderer 的個人檔案頁點擊「上島」
- **THEN** 系統 SHALL 導航至該使用者的 `/island/[identifier]` 並載入 2D 空間小島

#### Scenario: Rollback 後入口維持不變
- **WHEN** 系統將該島 renderer 切回 3D
- **THEN** 使用者 SHALL 由同一個「上島」入口與 URL 進入 3D 島嶼，不需要更新分享連結

#### Scenario: Renderer 初始化失敗
- **WHEN** 使用者由個人頁上島但 renderer 無法初始化
- **THEN** 島嶼頁 SHALL 顯示可重試錯誤與等價 DOM 內容入口，而非停用個人頁的「上島」按鈕
