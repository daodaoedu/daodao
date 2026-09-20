# Report Center 規格

## ADDED Requirements

### Requirement: 排程報告建立

Admin SHALL 能夠建立排程報告，設定頻率（每日／每週／每月）、收件人（Email 清單）、及包含的 KPI 區段。

#### Scenario: 建立每週排程報告

- **WHEN** Admin 選擇頻率為「每週」，輸入收件人 Email，並勾選要包含的 KPI 區段後儲存
- **THEN** 系統建立排程報告，並於每週自動發送給指定收件人

#### Scenario: 設定多位收件人

- **WHEN** Admin 輸入多個 Email 作為收件人
- **THEN** 系統 MUST 於每次排程執行時將報告同時寄送給所有收件人

### Requirement: 排程報告 KPI 區段

可選的 KPI 區段 SHALL 包含：使用者成長、DAU／WAU／MAU、AI 費用摘要、Email 統計、系統健康度。

#### Scenario: 勾選多個 KPI 區段

- **WHEN** Admin 建立排程報告時勾選「使用者成長」與「AI 費用摘要」兩個區段
- **THEN** 產出的報告 MUST 僅包含這兩個區段的資料

#### Scenario: 未勾選任何區段時阻擋

- **WHEN** Admin 未勾選任何 KPI 區段即嘗試儲存
- **THEN** 系統 MUST 顯示驗證錯誤，不得建立排程報告

### Requirement: 排程報告預覽

Admin SHALL 能夠在啟用排程前預覽報告內容。

#### Scenario: 預覽報告內容

- **WHEN** Admin 點擊「預覽」按鈕
- **THEN** 系統以當前資料生成報告預覽，呈現與實際寄送相同的格式

### Requirement: 排程報告執行歷史

頁面 SHALL 顯示排程報告的執行歷史，包含寄送日期、收件人、狀態。

#### Scenario: 檢視執行歷史

- **WHEN** Admin 進入排程報告的執行歷史頁面
- **THEN** 頁面顯示所有執行紀錄，每筆 MUST 包含寄送日期、收件人清單、寄送狀態（成功／失敗）

### Requirement: 自訂報表欄位選擇

Admin SHALL 能夠透過欄位選擇器選取指標與維度來建立報表。

#### Scenario: 選取指標與維度

- **WHEN** Admin 從欄位選擇器中選取「DAU」作為指標、「日期」作為維度
- **THEN** 系統根據所選欄位生成資料表格

### Requirement: 自訂報表拖拉排序

欄位選擇器 SHALL 支援拖拉操作來排列欄位順序。

#### Scenario: 拖拉調整欄位順序

- **WHEN** Admin 將「MAU」欄位拖拉至「DAU」欄位前方
- **THEN** 生成的報表 MUST 以調整後的順序顯示欄位

### Requirement: 自訂報表資料生成

系統 SHALL 根據所選欄位生成資料表格及可選的圖表。

#### Scenario: 生成表格與圖表

- **WHEN** Admin 選取欄位後點擊「生成報表」
- **THEN** 系統顯示資料表格，並提供可選的圖表視覺化呈現

### Requirement: 自訂報表收藏

Admin SHALL 能夠將報表設定儲存為收藏，並為其命名。

#### Scenario: 儲存報表為收藏

- **WHEN** Admin 點擊「儲存為收藏」並輸入名稱
- **THEN** 系統儲存該報表設定，日後可從收藏列表中選取

### Requirement: 收藏報表重新執行

已儲存的收藏報表 SHALL 能夠以最新資料重新執行。

#### Scenario: 重新執行收藏報表

- **WHEN** Admin 從收藏列表中選取一份已儲存的報表並點擊「執行」
- **THEN** 系統以最新資料重新生成報表，欄位設定與儲存時相同

### Requirement: 自訂報表匯出

報表 SHALL 支援透過 ExportButton 匯出。

#### Scenario: 匯出報表

- **WHEN** Admin 點擊 ExportButton 匯出報表
- **THEN** 系統將目前顯示的報表資料匯出為檔案供下載

### Requirement: 異常警報規則建立

Admin SHALL 能夠建立警報規則，包含監控指標、條件（高於／低於／變動百分比）、及門檻值。

#### Scenario: 建立 DAU 下降警報

- **WHEN** Admin 選擇指標為「DAU」，條件為「變動百分比低於」，門檻值為 -20%
- **THEN** 系統建立警報規則，當 DAU 下降超過 20% 時觸發

#### Scenario: 建立 AI 費用上限警報

- **WHEN** Admin 選擇指標為「每日 AI 費用」，條件為「高於」，門檻值為 $100
- **THEN** 系統建立警報規則，當每日 AI 費用超過 $100 時觸發

### Requirement: 異常警報可用指標

可用監控指標 SHALL 包含：DAU、WAU、MAU、每日 AI 費用、Email 退信率、錯誤率。

#### Scenario: 選擇不同指標建立警報

- **WHEN** Admin 在建立警報時開啟指標選擇器
- **THEN** 選擇器 MUST 列出 DAU、WAU、MAU、每日 AI 費用、Email 退信率、錯誤率等選項

### Requirement: 異常警報通知管道

Admin SHALL 能夠為每條警報規則設定通知管道（Email 或站內通知）。

#### Scenario: 設定 Email 通知

- **WHEN** Admin 建立警報規則時選擇通知管道為「Email」
- **THEN** 警報觸發時系統 MUST 透過 Email 發送通知

#### Scenario: 設定站內通知

- **WHEN** Admin 建立警報規則時選擇通知管道為「站內通知」
- **THEN** 警報觸發時系統 MUST 透過站內通知發送

### Requirement: 異常警報歷史紀錄

頁面 SHALL 顯示警報歷史紀錄，包含觸發時間、指標值、門檻值、狀態。

#### Scenario: 檢視警報歷史

- **WHEN** Admin 進入警報歷史頁面
- **THEN** 頁面顯示所有已觸發的警報，每筆 MUST 包含觸發時間、當時指標值、設定門檻值、處理狀態

### Requirement: 異常警報啟用與停用

每條警報規則 SHALL 具備啟用／停用切換功能。

#### Scenario: 停用一條警報規則

- **WHEN** Admin 將一條啟用中的警報規則切換為停用
- **THEN** 系統停止監控該指標，不再觸發警報

#### Scenario: 重新啟用一條已停用的警報規則

- **WHEN** Admin 將一條已停用的警報規則切換為啟用
- **THEN** 系統恢復該指標的監控
