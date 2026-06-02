## ADDED Requirements

### Requirement: 使用者 KPI 卡片

Dashboard SHALL 顯示使用者 KPI 卡片，包含總用戶數、本月新增用戶數、活躍用戶數、以及成長率。每張卡片 SHALL 以數值搭配標籤呈現，成長率 SHALL 以百分比格式顯示並標示正負趨勢。

#### Scenario: 正常載入 KPI 卡片

- **WHEN** 管理員進入統一 Dashboard 頁面
- **THEN** 頁面 SHALL 顯示四張 KPI 卡片：總用戶數、本月新增用戶數、活躍用戶數、成長率

#### Scenario: 成長率為負值

- **WHEN** 本月新增用戶數低於上月
- **THEN** 成長率卡片 SHALL 以紅色負值標示下降趨勢

### Requirement: DAU/WAU/MAU 指標與趨勢

Dashboard SHALL 顯示 DAU（每日活躍用戶）、WAU（每週活躍用戶）、MAU（每月活躍用戶）指標，每個指標 SHALL 包含趨勢指示器，顯示與前一週期相比的變化方向與幅度。

#### Scenario: 顯示 DAU/WAU/MAU

- **WHEN** Dashboard 資料載入完成
- **THEN** 頁面 SHALL 顯示 DAU、WAU、MAU 三個指標區塊，每個區塊包含當前數值與趨勢箭頭

#### Scenario: 趨勢上升

- **WHEN** DAU 較前一天增加
- **THEN** DAU 指標 SHALL 顯示向上箭頭與綠色正值百分比

### Requirement: AI 成本摘要

Dashboard SHALL 顯示 AI 成本摘要區塊，包含總花費金額、總查詢次數、總 Token 使用量。金額 SHALL 以美元格式呈現，Token 數 SHALL 以千或百萬為單位簡化顯示。

#### Scenario: 顯示 AI 成本摘要

- **WHEN** Dashboard 資料載入完成
- **THEN** 頁面 SHALL 顯示 AI 成本摘要區塊，包含 Total Cost、Total Queries、Total Tokens 三個指標

#### Scenario: Token 數量超過百萬

- **WHEN** 總 Token 使用量超過 1,000,000
- **THEN** Token 數值 SHALL 以「X.XXM」格式簡化顯示

### Requirement: 系統健康狀態

Dashboard SHALL 顯示系統健康狀態區塊，包含 SMTP 連線狀態、資料庫連線狀態、Redis 連線狀態。每個服務 SHALL 以綠色（正常）或紅色（異常）圖示標示。

#### Scenario: 所有服務正常

- **WHEN** SMTP、資料庫、Redis 連線皆正常
- **THEN** 系統健康狀態區塊 SHALL 顯示三個綠色圖示，狀態文字為「正常」

#### Scenario: 單一服務異常

- **WHEN** SMTP 連線失敗
- **THEN** SMTP 狀態 SHALL 顯示紅色圖示與「異常」文字，其餘服務維持綠色

### Requirement: 近期異常警報

Dashboard SHALL 顯示近期異常警報區塊。若有未處理的異常事件，SHALL 以列表形式顯示警報內容、發生時間與嚴重程度。若無異常，SHALL 顯示「目前無異常警報」訊息。

#### Scenario: 存在未處理警報

- **WHEN** 系統偵測到異常事件
- **THEN** Dashboard SHALL 在異常警報區塊顯示警報列表，每筆包含警報描述、時間戳記與嚴重等級標籤

#### Scenario: 無異常警報

- **WHEN** 系統無任何未處理的異常事件
- **THEN** 異常警報區塊 SHALL 顯示「目前無異常警報」提示訊息

### Requirement: 載入骨架畫面

Dashboard 在資料載入期間 SHALL 顯示骨架畫面（loading skeletons），每個區塊 SHALL 以灰色佔位元素呈現，直到對應資料載入完成後替換為實際內容。

#### Scenario: 資料載入中

- **WHEN** 管理員進入 Dashboard 且 API 尚未回應
- **THEN** 所有 KPI 卡片、指標區塊、圖表區域 SHALL 顯示骨架動畫佔位元素

#### Scenario: 部分資料先行載入

- **WHEN** 使用者 KPI 資料已回應但 AI 成本資料仍在載入
- **THEN** 使用者 KPI 區塊 SHALL 顯示實際數據，AI 成本區塊 SHALL 仍顯示骨架畫面

### Requirement: 自動定期刷新

Dashboard 所有資料 SHALL 每 60 秒自動刷新一次。刷新期間 SHALL NOT 顯示全頁骨架畫面，而是靜默更新數據。若刷新失敗，SHALL 保留上次成功取得的資料並顯示刷新失敗提示。

#### Scenario: 自動刷新成功

- **WHEN** 距離上次資料載入已滿 60 秒
- **THEN** Dashboard SHALL 自動重新取得所有資料並更新顯示，不中斷使用者操作

#### Scenario: 自動刷新失敗

- **WHEN** 自動刷新時 API 回應失敗
- **THEN** Dashboard SHALL 保留目前顯示的資料，並在頁面頂部顯示「資料刷新失敗」警示訊息
