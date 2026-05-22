## ADDED Requirements

### Requirement: 改動後工作區可建置成互動式預覽
系統 SHALL 將建置成功的版本部署成一個暫時性、可互動的 preview 環境，並在後台以沙箱方式內嵌顯示。

#### Scenario: 啟動互動預覽
- **WHEN** 某版本建置成功
- **THEN** 系統 SHALL 啟動一個暫時性 preview 環境並回傳 `preview_url`
- **AND** UI 以 iframe 內嵌該預覽，使用者可實際點擊、輸入、瀏覽頁面進行互動操作

#### Scenario: 裝置尺寸切換
- **WHEN** 使用者在預覽中切換桌機 / 平板 / 手機尺寸
- **THEN** 預覽容器以對應視窗寬度呈現原型

#### Scenario: 預覽使用 mock 資料且不接觸生產
- **WHEN** preview 環境啟動
- **THEN** preview app SHALL 以 mock / 唯讀資料運行
- **AND** SHALL NOT 連線生產 API、讀取後台 session 或 cookie

#### Scenario: 預覽沙箱隔離
- **WHEN** UI 內嵌 preview iframe
- **THEN** iframe SHALL 套用 `sandbox` 屬性與嚴格 CSP
- **AND** preview 內執行的 agent 生成程式碼不得存取後台或其他來源的資料

#### Scenario: 暫時性環境到期回收
- **WHEN** preview 環境閒置超過設定 TTL
- **THEN** 系統 SHALL 回收該 preview 環境
- **AND** 若該版本已被分享連結釘選，存取時可依需要重新建置

---

### Requirement: 使用者可將某版預覽 publish 成唯讀分享網址
系統 SHALL 允許使用者為任一建置成功的版本產生唯讀分享連結，連結釘選該特定版本。

#### Scenario: 產生公開唯讀分享連結
- **WHEN** 使用者對某成功版本點擊「產生分享連結」並選擇可見性 `public`
- **THEN** 系統以不可猜測 token 產生穩定 URL
- **AND** 任何人取得該 URL 即可互動試用該版本預覽，且為唯讀、不需登入

#### Scenario: 連結釘選版本
- **WHEN** 分享連結建立後，使用者在同專案繼續迭代產生新版本
- **THEN** 既有分享連結仍指向當初釘選的版本，內容不被後續迭代改變

#### Scenario: 建置失敗版本不可分享
- **WHEN** 使用者嘗試為建置失敗的版本產生分享連結
- **THEN** 系統拒絕，並提示僅能分享建置成功的版本

#### Scenario: 公開連結不暴露後台
- **WHEN** 訪客開啟 `public` 分享連結
- **THEN** 系統經 `/api/share/:token` 轉發到對應版本預覽
- **AND** 不暴露後台路徑、內部 ID，也不附帶任何後台或使用者 session

---

### Requirement: 分享連結支援存取控制
系統 SHALL 支援分享連結的可見性設定，至少包含公開唯讀（`public`）與團隊限定（`team`）。

#### Scenario: 團隊限定連結需驗證身分
- **WHEN** 分享連結可見性為 `team`，且開啟者未登入或非 daodao 團隊成員
- **THEN** 系統拒絕存取並要求登入 / 顯示無權限

#### Scenario: 切換可見性
- **WHEN** 使用者將既有連結的可見性從 `public` 改為 `team`
- **THEN** 後續存取依新的可見性規則驗證

---

### Requirement: 分享連結可治理
系統 SHALL 允許設定分享連結到期時間、隨時撤銷，並記錄瀏覽。

#### Scenario: 設定到期時間
- **WHEN** 使用者為連結設定 `expires_at`
- **THEN** 到期後存取該連結回傳已過期，不再顯示預覽

#### Scenario: 撤銷連結
- **WHEN** 使用者撤銷某分享連結
- **THEN** 系統記錄 `revoked_at`，後續存取一律拒絕
- **AND** 同專案其他未撤銷連結不受影響

#### Scenario: 記錄瀏覽
- **WHEN** 有人開啟有效的分享連結
- **THEN** 系統寫入一筆 `feature_idea_share_link_views`（含 `viewed_at`）
- **AND** 專案擁有者可在後台看到該連結的瀏覽次數
