## ADDED Requirements

### Requirement: 公開個人檔案頁面可瀏覽
系統 SHALL 提供公開個人檔案頁面（`/users/[identifier]`），任何人（含未登入訪客）皆可瀏覽。

#### Scenario: 未登入訪客瀏覽個人檔案
- **WHEN** 未登入使用者造訪 `/users/[identifier]`
- **THEN** 系統顯示完整個人檔案頁面，包含 Identity Header、About Me、社群連結

#### Scenario: 個人檔案不存在
- **WHEN** 使用者造訪不存在的 userId 對應的個人檔案
- **THEN** 系統顯示 404 頁面

---

### Requirement: Identity Header 資料展示
個人檔案頁 SHALL 展示以下 Identity Header 欄位：使用者頭像、姓名、User ID（@handle）、地理位置、個人標語（Headline）。

#### Scenario: 展示完整 Identity Header
- **WHEN** 個人檔案頁面載入成功
- **THEN** 系統顯示頭像、姓名、@handle、城市/國家地理位置、個人標語

#### Scenario: 個人標語未填寫
- **WHEN** 使用者尚未設定個人標語
- **THEN** 系統不顯示標語區塊（不留空白佔位）

#### Scenario: 地理位置未填寫
- **WHEN** 使用者尚未設定地理位置
- **THEN** 系統不顯示地理位置欄位

---

### Requirement: 個人標語長度限制
個人標語（Headline）MUST 不超過 150 個字元。

#### Scenario: 儲存超長個人標語
- **WHEN** 使用者嘗試儲存超過 150 字元的個人標語
- **THEN** 系統拒絕儲存並回傳驗證錯誤訊息

#### Scenario: 儲存合法個人標語
- **WHEN** 使用者儲存不超過 150 字元的個人標語
- **THEN** 系統成功儲存並更新顯示

---

### Requirement: About Me 區塊展示
個人檔案頁 SHALL 展示 About Me 區塊，支援 Markdown 渲染，並限制最多 350 字元。

#### Scenario: 展示有 Markdown 格式的 About Me
- **WHEN** 使用者的 `bio` 欄位包含 Markdown 語法（如 `**粗體**`、`- 列表`）
- **THEN** 系統渲染後的 HTML 正確呈現格式

#### Scenario: 儲存超長 About Me
- **WHEN** 使用者嘗試儲存超過 350 字元的 About Me
- **THEN** 系統拒絕儲存並回傳驗證錯誤訊息

#### Scenario: About Me 未填寫
- **WHEN** 使用者尚未填寫 About Me
- **THEN** 系統不顯示 About Me 區塊

---

### Requirement: 社群連結展示
個人檔案頁 SHALL 顯示使用者已設定的社群媒體連結（ig、discord、line、fb、threads、linkedin、github、website）。

#### Scenario: 展示已設定的社群連結
- **WHEN** 使用者設定了至少一個社群連結
- **THEN** 系統以圖示連結形式顯示對應的社群平台

#### Scenario: 所有社群連結皆未設定
- **WHEN** 使用者未設定任何社群連結
- **THEN** 系統不顯示社群連結區塊

---

### Requirement: 互動數據顯示
個人檔案頁 SHALL 顯示連結數（Connections）與追蹤者數（Followers）。

#### Scenario: 顯示連結數與追蹤者數
- **WHEN** 個人檔案頁面載入成功
- **THEN** 系統顯示該使用者的連結總數與追蹤者總數

#### Scenario: 使用者設定隱藏連結數
- **WHEN** 使用者開啟「隱藏連結數」設定，且訪客瀏覽其個人檔案
- **THEN** 系統不顯示連結數，改顯示「—」或隱藏該欄位

---

### Requirement: Connect 與 Follow 按鈕狀態
個人檔案頁 SHALL 在登入狀態下展示 Connect 與 Follow 互動按鈕。

#### Scenario: 登入使用者瀏覽他人檔案
- **WHEN** 已登入使用者瀏覽非自己的個人檔案
- **THEN** 系統顯示「建立連結」與「關注」按鈕

#### Scenario: 使用者瀏覽自己的個人檔案
- **WHEN** 已登入使用者瀏覽自己的個人檔案
- **THEN** 系統顯示「編輯個人檔案」按鈕，不顯示 Connect/Follow 按鈕

#### Scenario: 未登入使用者瀏覽個人檔案
- **WHEN** 未登入訪客瀏覽個人檔案
- **THEN** 系統不顯示 Connect/Follow 按鈕（或顯示引導登入提示）

---

### Requirement: 個人檔案公開 API
系統 SHALL 提供 `GET /api/users/profile/:identifier` endpoint，無需認證即可取得個人檔案資料。

#### Scenario: 以 userId 查詢個人檔案
- **WHEN** 請求 `GET /api/users/profile/123`（數字 id）
- **THEN** 系統回傳該使用者的公開個人檔案資料（200 OK）

#### Scenario: 以 custom_id 查詢個人檔案
- **WHEN** 請求 `GET /api/users/profile/xiaoxu`（非數字字串）
- **THEN** 系統以 `custom_id` 比對並回傳對應使用者的公開資料（200 OK）

#### Scenario: 查詢不存在的識別碼
- **WHEN** 請求的 identifier 無對應使用者
- **THEN** 系統回傳 404 Not Found
