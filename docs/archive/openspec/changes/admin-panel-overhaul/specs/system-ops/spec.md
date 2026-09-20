## ADDED Requirements

### Requirement: 系統資源監控儀表

系統監控頁面 SHALL 以儀表/圖表形式顯示 CPU 使用率、記憶體使用率、磁碟使用率。每個指標 SHALL 以百分比呈現，並以視覺化儀表（gauge）或環形圖顯示當前使用比例。

#### Scenario: 顯示系統資源使用率

- **WHEN** 管理員進入系統監控頁面
- **THEN** 頁面 SHALL 顯示 CPU、記憶體、磁碟三個儀表，各自標示當前使用百分比

#### Scenario: 高使用率視覺提示

- **WHEN** CPU 使用率超過 80%
- **THEN** CPU 儀表 SHALL 以紅色區域標示，提供視覺警示

### Requirement: PostgreSQL 連線池狀態

系統監控頁面 SHALL 顯示 PostgreSQL 連線池狀態，包含目前使用中連線數、可用連線數、最大連線數，以及查詢統計資訊（如每秒查詢數）。

#### Scenario: 顯示 PostgreSQL 狀態

- **WHEN** 系統監控頁面載入完成
- **THEN** 頁面 SHALL 顯示 PostgreSQL 區塊，包含連線池使用率（使用中/最大值）與每秒查詢數

#### Scenario: 連線池接近滿載

- **WHEN** PostgreSQL 使用中連線數達最大連線數的 90%
- **THEN** 連線池狀態 SHALL 以警示顏色標示，並顯示「連線池接近滿載」提示

### Requirement: Redis 狀態監控

系統監控頁面 SHALL 顯示 Redis 記憶體使用量與連線數。記憶體使用量 SHALL 以 MB/GB 為單位顯示當前值與最大配置值。

#### Scenario: 顯示 Redis 狀態

- **WHEN** 系統監控頁面載入完成
- **THEN** 頁面 SHALL 顯示 Redis 區塊，包含記憶體使用量（如 128MB / 512MB）與當前連線數

### Requirement: 監控資料自動刷新

系統監控頁面的所有指標 SHALL 每 30 秒自動刷新。刷新 SHALL 靜默進行，不中斷管理員的操作或造成畫面閃爍。

#### Scenario: 自動刷新

- **WHEN** 距離上次載入已滿 30 秒
- **THEN** 所有監控指標 SHALL 自動更新為最新數值，頁面 SHALL NOT 重新載入或閃爍

#### Scenario: 刷新失敗

- **WHEN** 自動刷新時 API 回應逾時
- **THEN** 頁面 SHALL 保留上次的指標數據，並顯示「監控資料刷新失敗」提示

### Requirement: 門檻值警示指標

系統監控 SHALL 在指標超過預定門檻值時顯示警示指標。門檻值包含：CPU > 80%、記憶體 > 85%、磁碟 > 90%、PostgreSQL 連線池 > 90%、Redis 記憶體 > 80%。

#### Scenario: 單一指標超過門檻

- **WHEN** 記憶體使用率達到 88%（超過 85% 門檻）
- **THEN** 記憶體儀表 SHALL 顯示紅色警示標記，並在指標旁顯示警示圖示

#### Scenario: 多項指標正常

- **WHEN** 所有指標皆低於各自的門檻值
- **THEN** 所有儀表 SHALL 以綠色或正常顏色顯示，不出現警示標記

### Requirement: 信件發送統計

信件管理頁面 SHALL 顯示發送統計資訊，包含：總發送數、成功率、退信率（bounce rate）。統計 SHALL 以數值與百分比呈現。

#### Scenario: 顯示發送統計

- **WHEN** 管理員進入信件管理頁面
- **THEN** 頁面 SHALL 顯示統計區塊：總發送數（如 12,450）、成功率（如 98.2%）、退信率（如 1.8%）

### Requirement: SMTP 服務健康狀態

信件管理頁面 SHALL 顯示 SMTP 服務的健康狀態，以綠色（連線正常）或紅色（連線異常）指標呈現。SHALL 顯示最後一次健康檢查的時間戳記。

#### Scenario: SMTP 連線正常

- **WHEN** SMTP 服務健康檢查回報正常
- **THEN** 頁面 SHALL 顯示綠色狀態指標與「SMTP 服務正常」文字，並標示最後檢查時間

#### Scenario: SMTP 連線異常

- **WHEN** SMTP 服務健康檢查回報失敗
- **THEN** 頁面 SHALL 顯示紅色狀態指標與「SMTP 服務異常」文字，並附帶錯誤描述

### Requirement: 信件佇列資訊

信件管理頁面 SHALL 顯示信件佇列大小與待處理數量。SHALL 清楚區分佇列中等待發送的信件數與目前正在處理中的信件數。

#### Scenario: 顯示佇列狀態

- **WHEN** 信件管理頁面載入完成
- **THEN** 頁面 SHALL 顯示佇列大小（如 total: 150）與待處理數量（如 pending: 23）

#### Scenario: 佇列為空

- **WHEN** 信件佇列中無任何待處理信件
- **THEN** 佇列資訊 SHALL 顯示 total: 0、pending: 0，並標示「佇列已清空」

### Requirement: 手動發送自訂信件

信件管理頁面 SHALL 提供手動發送信件功能。表單 SHALL 包含收件人信箱、主旨、信件內容欄位。發送前 SHALL 驗證收件人信箱格式，發送後 SHALL 顯示成功或失敗訊息。

#### Scenario: 發送自訂信件

- **WHEN** 管理員填寫收件人、主旨、內容後點擊「發送」
- **THEN** 系統 SHALL 呼叫 API 發送信件，成功後 SHALL 顯示「信件已成功發送」toast 訊息

#### Scenario: 信箱格式驗證失敗

- **WHEN** 管理員輸入無效的收件人信箱格式
- **THEN** 表單 SHALL 顯示驗證錯誤訊息「請輸入有效的電子信箱」，SHALL NOT 送出 API 請求

#### Scenario: 發送失敗

- **WHEN** API 回應信件發送失敗
- **THEN** 系統 SHALL 顯示「信件發送失敗」錯誤訊息，並保留表單中已填寫的內容

### Requirement: 批次發送信件至使用者區段

信件管理頁面 SHALL 支援批次發送信件至指定的使用者區段（user segments）。管理員 SHALL 可選擇目標區段（如全部用戶、活躍用戶、新用戶），填寫主旨與內容後批次發送。系統 SHALL 在發送前顯示預計發送人數並要求確認。

#### Scenario: 批次發送至活躍用戶

- **WHEN** 管理員選擇區段「活躍用戶」、填寫主旨與內容後點擊「批次發送」
- **THEN** 系統 SHALL 顯示確認對話框：「即將發送至 X 位活躍用戶，確定要發送嗎？」

#### Scenario: 確認批次發送

- **WHEN** 管理員在確認對話框點擊「確定」
- **THEN** 系統 SHALL 呼叫 API 排入批次發送任務，並顯示「批次發送任務已建立」訊息

#### Scenario: 取消批次發送

- **WHEN** 管理員在確認對話框點擊「取消」
- **THEN** 系統 SHALL 關閉對話框，SHALL NOT 發送任何信件

### Requirement: 發送統計匯出

信件管理頁面 SHALL 整合 ExportButton 元件，支援將發送統計資料匯出為 CSV 或 Excel 格式。匯出 SHALL 遵循 ExportButton 的共用規範。

#### Scenario: 匯出發送統計

- **WHEN** 管理員在信件管理頁面點擊匯出為 Excel
- **THEN** 系統 SHALL 產生包含發送統計資料的 Excel 檔案並觸發下載，檔案命名 SHALL 遵循 `email-stats_{yyyy-MM-dd}.xlsx` 格式
