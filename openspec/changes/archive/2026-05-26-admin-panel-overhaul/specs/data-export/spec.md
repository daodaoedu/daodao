## ADDED Requirements

### Requirement: 匯出格式選擇下拉選單

ExportButton SHALL 提供下拉選單，包含 CSV 與 Excel（.xlsx）兩種匯出格式選項。點擊按鈕 SHALL 展開選單，選擇格式後 SHALL 立即開始匯出流程。

#### Scenario: 展開格式選單

- **WHEN** 管理員點擊 ExportButton
- **THEN** SHALL 顯示下拉選單，包含「匯出為 CSV」與「匯出為 Excel」兩個選項

#### Scenario: 選擇匯出格式

- **WHEN** 管理員從下拉選單選擇「匯出為 Excel」
- **THEN** 系統 SHALL 開始產生 Excel 格式檔案並觸發下載

### Requirement: 從當前篩選資料匯出

Export SHALL 從當前頁面已篩選/顯示的資料產生檔案，而非從完整資料集匯出。匯出的資料 MUST 反映目前套用的所有篩選條件與排序。

#### Scenario: 套用篩選後匯出

- **WHEN** 管理員在用戶列表篩選「活躍用戶」後點擊匯出
- **THEN** 匯出檔案 SHALL 僅包含符合「活躍用戶」篩選條件的資料

#### Scenario: 無篩選條件時匯出

- **WHEN** 管理員未套用任何篩選條件即點擊匯出
- **THEN** 匯出檔案 SHALL 包含當前頁面顯示的所有資料

### Requirement: CSV UTF-8 BOM 編碼

CSV 匯出 SHALL 使用 UTF-8 編碼並在檔案開頭加入 BOM（Byte Order Mark），以確保在 Microsoft Excel 開啟時正確顯示繁體中文等非 ASCII 字元。

#### Scenario: Excel 開啟 CSV 檔案

- **WHEN** 管理員匯出 CSV 檔案並以 Microsoft Excel 開啟
- **THEN** 檔案中的繁體中文內容 SHALL 正確顯示，不出現亂碼

### Requirement: Excel 單一工作表與欄位標題

Excel 匯出 SHALL 產生包含單一工作表（worksheet）的 .xlsx 檔案。工作表第一列 SHALL 為欄位標題列，後續各列為資料列。

#### Scenario: 匯出 Excel 檔案結構

- **WHEN** 管理員匯出包含 50 筆資料的 Excel 檔案
- **THEN** 產生的 .xlsx 檔案 SHALL 包含一個工作表，第一列為欄位標題，第 2 至 51 列為資料內容

### Requirement: 檔案命名規則

產生的匯出檔案名稱 SHALL 遵循 `{pageName}_{yyyy-MM-dd}.{ext}` 格式。pageName 為當前頁面的英文識別名稱，日期為匯出當日，ext 為對應的副檔名（csv 或 xlsx）。

#### Scenario: 匯出檔案命名

- **WHEN** 管理員在「用戶列表」頁面於 2026-05-26 匯出 CSV
- **THEN** 產生的檔案名稱 SHALL 為 `user-list_2026-05-26.csv`

#### Scenario: Excel 檔案命名

- **WHEN** 管理員在「AI 成本」頁面於 2026-05-26 匯出 Excel
- **THEN** 產生的檔案名稱 SHALL 為 `ai-cost_2026-05-26.xlsx`

### Requirement: 匯出載入狀態

ExportButton 在檔案產生期間 SHALL 顯示載入狀態。按鈕 SHALL 顯示 spinner 或載入動畫，且 SHALL 禁用重複點擊，直到檔案產生完成。

#### Scenario: 大量資料匯出

- **WHEN** 管理員匯出包含大量資料的檔案，產生過程耗時超過 1 秒
- **THEN** ExportButton SHALL 顯示載入動畫，按鈕狀態為 disabled，防止重複觸發

#### Scenario: 匯出完成

- **WHEN** 檔案產生完成並觸發下載
- **THEN** ExportButton SHALL 恢復為正常可點擊狀態

### Requirement: 空資料處理

當前顯示資料為空時，ExportButton SHALL 優雅處理。點擊匯出 SHALL NOT 產生空檔案，而是顯示 toast 訊息告知管理員目前無資料可匯出。

#### Scenario: 篩選結果為空時匯出

- **WHEN** 管理員套用篩選條件後結果為零筆，點擊匯出
- **THEN** 系統 SHALL 顯示 toast 訊息「目前無資料可匯出」，SHALL NOT 產生或下載任何檔案

### Requirement: 欄位配置支援

Export SHALL 支援欄位配置，允許呼叫端指定要匯出的欄位（columns）以及各欄位的顯示名稱（display names）。匯出檔案 SHALL 僅包含指定的欄位，標題列 SHALL 使用配置的顯示名稱。

#### Scenario: 自訂匯出欄位

- **WHEN** 頁面配置 ExportButton 僅匯出 name、email、createdAt 三個欄位，並設定顯示名稱為「姓名」、「信箱」、「建立日期」
- **THEN** 匯出檔案 SHALL 僅包含這三個欄位，標題列 SHALL 顯示「姓名」、「信箱」、「建立日期」

#### Scenario: 未指定欄位配置

- **WHEN** 頁面未提供欄位配置
- **THEN** Export SHALL 匯出資料物件的所有欄位，標題列 SHALL 使用欄位原始 key 作為標題
