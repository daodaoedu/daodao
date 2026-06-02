## ADDED Requirements

### Requirement: 可搜尋的實踐列表

頁面 SHALL 顯示所有主題實踐（practices）的列表，並提供搜尋功能。搜尋 SHALL 支援依實踐標題進行即時篩選，輸入關鍵字後 SHALL 即時更新列表顯示結果。

#### Scenario: 搜尋實踐

- **WHEN** 管理員在搜尋欄輸入「冥想」
- **THEN** 列表 SHALL 僅顯示標題包含「冥想」的實踐項目

#### Scenario: 搜尋無結果

- **WHEN** 管理員輸入的關鍵字無符合的實踐
- **THEN** 列表 SHALL 顯示「查無符合的主題實踐」空狀態訊息

#### Scenario: 清除搜尋

- **WHEN** 管理員清除搜尋欄位的文字
- **THEN** 列表 SHALL 恢復顯示所有實踐項目（依當前篩選與排序條件）

### Requirement: 依狀態篩選

頁面 SHALL 支援依狀態篩選實踐，可選狀態包含：啟用中（active）、已停用（inactive）、草稿（draft）。SHALL 支援選擇單一狀態或顯示全部。

#### Scenario: 篩選啟用中的實踐

- **WHEN** 管理員選擇狀態篩選為「啟用中」
- **THEN** 列表 SHALL 僅顯示狀態為啟用中的實踐項目

#### Scenario: 顯示全部狀態

- **WHEN** 管理員選擇狀態篩選為「全部」
- **THEN** 列表 SHALL 顯示所有狀態的實踐項目

### Requirement: 排序功能

頁面 SHALL 支援依建立日期、按讚數、參與人數進行排序。預設排序 SHALL 為建立日期由新到舊。管理員 SHALL 可切換升冪與降冪排序。

#### Scenario: 依按讚數排序

- **WHEN** 管理員選擇依「按讚數」降冪排序
- **THEN** 列表 SHALL 依按讚數由多到少重新排列

#### Scenario: 切換排序方向

- **WHEN** 管理員點擊當前排序欄位的排序方向切換按鈕
- **THEN** 排序方向 SHALL 在升冪與降冪之間切換，列表 SHALL 立即更新

### Requirement: 實踐列表欄位顯示

每筆實踐列表項目 SHALL 顯示以下資訊：標題、狀態標籤、建立者名稱、建立日期、參與人數、按讚數。狀態 SHALL 以不同顏色標籤區分（啟用中為綠色、已停用為灰色、草稿為黃色）。

#### Scenario: 顯示實踐列表項目

- **WHEN** 列表載入完成
- **THEN** 每筆實踐 SHALL 在同一列中顯示標題、狀態色標籤、建立者、建立日期、參與人數、按讚數

#### Scenario: 狀態標籤顏色

- **WHEN** 實踐狀態為「草稿」
- **THEN** 狀態標籤 SHALL 顯示為黃色背景，文字為「草稿」

### Requirement: 摘要統計資訊

頁面頂部 SHALL 顯示摘要統計區塊，包含：實踐總數、啟用中數量、總參與人數。統計數據 SHALL 隨篩選條件變更而更新。

#### Scenario: 顯示全域統計

- **WHEN** 管理員進入實踐管理頁面且未套用篩選
- **THEN** 摘要區塊 SHALL 顯示所有實踐的總數、啟用中數量、以及所有實踐的總參與人數

#### Scenario: 篩選後統計更新

- **WHEN** 管理員篩選狀態為「啟用中」
- **THEN** 摘要統計 SHALL 更新為僅反映啟用中實踐的數據

### Requirement: 分頁功能

頁面 SHALL 支援分頁瀏覽。每頁 SHALL 顯示固定筆數（預設 20 筆）的實踐項目。分頁控制 SHALL 顯示當前頁碼、總頁數，並提供上一頁與下一頁按鈕。

#### Scenario: 瀏覽第二頁

- **WHEN** 管理員點擊分頁控制的「下一頁」按鈕
- **THEN** 列表 SHALL 顯示第二頁的實踐項目，頁碼指示器 SHALL 更新為第 2 頁

#### Scenario: 首頁時上一頁按鈕

- **WHEN** 管理員位於第一頁
- **THEN** 「上一頁」按鈕 SHALL 為 disabled 狀態，不可點擊

### Requirement: 匯出功能

頁面 SHALL 整合 ExportButton 元件，支援將當前篩選後的實踐資料匯出為 CSV 或 Excel 格式。匯出 SHALL 遵循 ExportButton 的共用規範。

#### Scenario: 匯出篩選後的實踐資料

- **WHEN** 管理員篩選「啟用中」實踐後點擊匯出為 CSV
- **THEN** 系統 SHALL 產生僅包含啟用中實踐的 CSV 檔案並觸發下載

### Requirement: 變更實踐狀態

管理員 SHALL 可變更實踐的狀態（啟用/停用）。狀態變更操作 SHALL 提供確認對話框，確認後 SHALL 呼叫 API 更新狀態並即時反映於列表中。

#### Scenario: 停用實踐

- **WHEN** 管理員對一個啟用中的實踐點擊「停用」操作
- **THEN** 系統 SHALL 顯示確認對話框：「確定要停用此主題實踐嗎？」

#### Scenario: 確認停用

- **WHEN** 管理員在確認對話框點擊「確定」
- **THEN** 系統 SHALL 呼叫 API 將該實踐狀態更新為 inactive，列表中該實踐的狀態標籤 SHALL 立即更新為灰色「已停用」

#### Scenario: 取消狀態變更

- **WHEN** 管理員在確認對話框點擊「取消」
- **THEN** 系統 SHALL 關閉對話框，實踐狀態 SHALL 維持不變
