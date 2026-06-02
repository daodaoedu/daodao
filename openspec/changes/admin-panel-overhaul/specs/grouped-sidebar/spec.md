## ADDED Requirements

### Requirement: 分組導航結構

Sidebar SHALL 將所有導航項目組織為具名群組，每個群組 SHALL 包含群組標題與其下屬的導航連結。群組順序 SHALL 為：總覽、用戶、AI 服務、內容、溝通、報表、支援、系統、信任與審核、學習、遊戲化、社群、活動。

#### Scenario: 顯示分組導航

- **WHEN** 管理員進入後台頁面
- **THEN** Sidebar SHALL 顯示所有群組標題，每個群組下方列出對應的導航項目

#### Scenario: 群組內項目排列

- **WHEN** 展開任一群組
- **THEN** 該群組下的導航項目 SHALL 按預定義順序由上而下排列

### Requirement: 群組可收合與展開

每個導航群組 SHALL 支援收合與展開操作。點擊群組標題 SHALL 切換該群組的收合/展開狀態。收合時 SHALL 隱藏群組內的導航項目，僅顯示群組標題。

#### Scenario: 收合群組

- **WHEN** 管理員點擊已展開群組的標題
- **THEN** 該群組 SHALL 收合，隱藏所有子項目，群組標題旁的箭頭 SHALL 指向收合方向

#### Scenario: 展開群組

- **WHEN** 管理員點擊已收合群組的標題
- **THEN** 該群組 SHALL 展開，顯示所有子項目，群組標題旁的箭頭 SHALL 指向展開方向

### Requirement: 收合狀態持久化

Sidebar SHALL 將每個群組的收合/展開狀態儲存至 localStorage。當管理員重新載入頁面或重新進入後台時，SHALL 還原上次的收合/展開狀態。

#### Scenario: 重新載入頁面

- **WHEN** 管理員收合「用戶」與「報表」群組後重新載入頁面
- **THEN** Sidebar SHALL 從 localStorage 讀取狀態，「用戶」與「報表」群組 SHALL 維持收合，其餘群組維持展開

#### Scenario: 首次進入（無儲存狀態）

- **WHEN** localStorage 中無 Sidebar 狀態記錄
- **THEN** 所有群組 SHALL 預設為展開狀態

### Requirement: 當前路由高亮

Sidebar SHALL 高亮標示目前所在路由對應的導航項目。當前項目 SHALL 以視覺區別（背景色、粗體或左側標記）與其他項目區分。若當前路由所屬群組為收合狀態，SHALL 自動展開該群組。

#### Scenario: 導航至特定頁面

- **WHEN** 管理員點擊「用戶列表」導航項目
- **THEN** 「用戶列表」項目 SHALL 顯示高亮樣式，前一個高亮項目 SHALL 移除高亮

#### Scenario: 當前路由群組已收合

- **WHEN** 管理員透過 URL 直接進入「AI 成本分析」頁面，且「AI 服務」群組為收合狀態
- **THEN** Sidebar SHALL 自動展開「AI 服務」群組，並高亮「AI 成本分析」項目

### Requirement: 響應式設計

Sidebar SHALL 支援響應式佈局。在桌面裝置（寬度 >= 1024px）SHALL 始終顯示於左側。在行動裝置（寬度 < 1024px）SHALL 預設隱藏。

#### Scenario: 桌面裝置

- **WHEN** 瀏覽器寬度 >= 1024px
- **THEN** Sidebar SHALL 固定顯示於頁面左側，主內容區域位於右側

#### Scenario: 行動裝置

- **WHEN** 瀏覽器寬度 < 1024px
- **THEN** Sidebar SHALL 隱藏，主內容區域佔滿全寬

### Requirement: 行動裝置漢堡選單

在行動裝置上，頁面頂部 SHALL 顯示漢堡選單按鈕。點擊按鈕 SHALL 以 overlay 形式顯示 Sidebar，再次點擊按鈕或點擊 overlay 背景 SHALL 關閉 Sidebar。

#### Scenario: 開啟行動端 Sidebar

- **WHEN** 管理員在行動裝置上點擊漢堡選單按鈕
- **THEN** Sidebar SHALL 以 overlay 形式從左側滑入，背景 SHALL 顯示半透明遮罩

#### Scenario: 關閉行動端 Sidebar

- **WHEN** 管理員在 Sidebar overlay 開啟時點擊遮罩區域
- **THEN** Sidebar SHALL 滑出畫面並隱藏，遮罩 SHALL 消失

#### Scenario: 導航後自動關閉

- **WHEN** 管理員在行動端 Sidebar 中點擊任一導航項目
- **THEN** 頁面 SHALL 導航至目標路由，Sidebar overlay SHALL 自動關閉

### Requirement: 登出按鈕

Sidebar 底部 SHALL 固定顯示登出按鈕。點擊登出按鈕 SHALL 執行登出操作並導航至登入頁面。登出按鈕 SHALL 不隨 Sidebar 內容捲動，始終固定於底部。

#### Scenario: 點擊登出

- **WHEN** 管理員點擊 Sidebar 底部的登出按鈕
- **THEN** 系統 SHALL 清除登入 session，並將頁面導航至登入頁面

#### Scenario: 長列表捲動時登出按鈕位置

- **WHEN** Sidebar 導航項目過多需要捲動
- **THEN** 登出按鈕 SHALL 固定於 Sidebar 底部，不隨導航列表捲動
