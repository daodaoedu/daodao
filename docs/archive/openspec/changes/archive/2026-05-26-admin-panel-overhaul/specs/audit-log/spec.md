# Audit Log 規格

## ADDED Requirements

### Requirement: 自動記錄管理操作

系統 SHALL 自動記錄所有 Admin 在管理面板中執行的操作為稽核日誌項目。

#### Scenario: Admin 執行操作後自動產生日誌

- **WHEN** Admin 在管理面板中執行任何操作（例如變更使用者角色）
- **THEN** 系統 MUST 自動建立一筆稽核日誌項目，無須 Admin 手動觸發

### Requirement: 稽核日誌項目欄位

每筆稽核日誌項目 SHALL 包含：時間戳記、操作 Admin、操作類型、目標資源、舊值、新值、IP 位址、User Agent。

#### Scenario: 檢視日誌項目完整資訊

- **WHEN** Admin 在稽核日誌頁面展開一筆日誌項目
- **THEN** 該項目 MUST 顯示時間戳記、操作者名稱、操作類型、目標資源、變更前舊值、變更後新值、來源 IP 位址、及瀏覽器 User Agent

### Requirement: 操作類型涵蓋範圍

操作類型 SHALL 包含：登入、登出、使用者角色變更、使用者狀態變更、標籤指派、內容審核、設定變更、資料匯出、通知發送。

#### Scenario: 角色變更操作被記錄

- **WHEN** Admin 將一位使用者的角色從「一般使用者」變更為「管理員」
- **THEN** 系統建立一筆操作類型為「使用者角色變更」的日誌，舊值為「一般使用者」，新值為「管理員」

#### Scenario: 登入操作被記錄

- **WHEN** Admin 成功登入管理面板
- **THEN** 系統建立一筆操作類型為「登入」的日誌，記錄登入時間與 IP 位址

#### Scenario: 資料匯出操作被記錄

- **WHEN** Admin 匯出使用者資料
- **THEN** 系統建立一筆操作類型為「資料匯出」的日誌，記錄匯出的資源與範圍

### Requirement: 稽核日誌頁面顯示與分頁

稽核日誌頁面 SHALL 以反向時間順序顯示日誌項目，並支援分頁。

#### Scenario: 檢視稽核日誌列表

- **WHEN** Admin 進入稽核日誌頁面
- **THEN** 頁面 MUST 以最新優先的順序顯示日誌項目，並以分頁方式呈現

#### Scenario: 翻頁檢視更早的日誌

- **WHEN** Admin 點擊下一頁
- **THEN** 頁面顯示時間更早的日誌項目

### Requirement: 稽核日誌篩選

稽核日誌頁面 SHALL 支援依操作 Admin、操作類型、目標資源、日期範圍進行篩選。

#### Scenario: 依操作者篩選

- **WHEN** Admin 選擇篩選條件為特定操作者
- **THEN** 頁面 MUST 僅顯示該操作者所產生的日誌項目

#### Scenario: 依操作類型與日期範圍篩選

- **WHEN** Admin 選擇操作類型為「使用者角色變更」，並設定日期範圍為過去 7 天
- **THEN** 頁面 MUST 僅顯示該期間內類型為「使用者角色變更」的日誌

#### Scenario: 依目標資源篩選

- **WHEN** Admin 輸入目標資源關鍵字進行篩選
- **THEN** 頁面 MUST 僅顯示目標資源符合關鍵字的日誌項目

### Requirement: 稽核日誌全文搜尋

稽核日誌頁面 SHALL 支援在操作詳情中進行全文搜尋。

#### Scenario: 以關鍵字搜尋日誌

- **WHEN** Admin 在搜尋欄輸入關鍵字（例如使用者名稱）
- **THEN** 頁面 MUST 顯示操作詳情中包含該關鍵字的所有日誌項目

### Requirement: 稽核日誌保留期限

稽核日誌項目 SHALL 預設保留 365 天。

#### Scenario: 超過保留期限的日誌自動清除

- **WHEN** 一筆日誌項目的時間戳記超過 365 天
- **THEN** 系統 MUST 自動刪除該日誌項目（除非受合規保留鎖定保護）

#### Scenario: 未超過保留期限的日誌持續保留

- **WHEN** 一筆日誌項目的時間戳記在 365 天以內
- **THEN** 系統 MUST 持續保留該日誌項目

### Requirement: 稽核日誌匯出

Admin SHALL 能夠透過 ExportButton 匯出稽核日誌（依據目前篩選結果）。

#### Scenario: 匯出篩選後的日誌

- **WHEN** Admin 設定篩選條件後點擊 ExportButton
- **THEN** 系統 MUST 將目前篩選結果匯出為檔案供下載

#### Scenario: 匯出全部日誌

- **WHEN** Admin 未設定任何篩選條件即點擊 ExportButton
- **THEN** 系統 MUST 匯出所有日誌項目

### Requirement: 合規保留鎖定

Admin SHALL 能夠對特定日期範圍設定合規保留鎖定，防止該範圍內的日誌被自動刪除。

#### Scenario: 設定合規保留鎖定

- **WHEN** Admin 選擇日期範圍 2026-01-01 至 2026-03-31 並啟用合規保留鎖定
- **THEN** 系統 MUST 保護該範圍內的所有日誌項目，即使超過 365 天保留期限也不得自動刪除

#### Scenario: 解除合規保留鎖定

- **WHEN** Admin 解除某個日期範圍的合規保留鎖定
- **THEN** 該範圍內超過保留期限的日誌恢復適用自動刪除規則

### Requirement: 資料保留政策設定

Admin SHALL 能夠設定資料保留政策，包含帳號刪除後自動刪除使用者資料的天數、內容保留期限等。

#### Scenario: 設定帳號刪除後資料保留天數

- **WHEN** Admin 設定「帳號刪除後 30 天自動刪除使用者資料」
- **THEN** 系統 MUST 於使用者帳號刪除滿 30 天後自動清除其相關資料

#### Scenario: 設定內容保留期限

- **WHEN** Admin 設定內容保留期限為 180 天
- **THEN** 系統 MUST 於內容超過 180 天後依政策處理

### Requirement: 稽核日誌不可變性

稽核日誌項目 SHALL 為不可變更，除保留政策外不得被編輯或刪除。

#### Scenario: 嘗試編輯日誌項目

- **WHEN** 任何使用者嘗試修改稽核日誌項目的內容
- **THEN** 系統 MUST 拒絕修改操作

#### Scenario: 嘗試手動刪除日誌項目

- **WHEN** 任何使用者嘗試手動刪除稽核日誌項目
- **THEN** 系統 MUST 拒絕刪除操作，僅允許透過保留政策自動刪除
