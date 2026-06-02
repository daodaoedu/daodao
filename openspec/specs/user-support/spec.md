# User Support 規格

## ADDED Requirements

### Requirement: 意見回饋列表顯示

頁面 SHALL 以最新優先的排序顯示所有使用者提交的意見回饋。

#### Scenario: 進入意見回饋頁面

- **WHEN** Admin 進入意見回饋收件匣頁面
- **THEN** 頁面 MUST 顯示所有回饋項目，依提交時間由新到舊排序

### Requirement: 意見回饋項目資訊

每筆回饋項目 SHALL 顯示使用者資訊、提交日期、內容、分類、狀態。

#### Scenario: 檢視回饋項目詳情

- **WHEN** Admin 在列表中檢視一筆回饋項目
- **THEN** 該項目 MUST 顯示提交者資訊（名稱、Email）、提交日期、回饋內容、分類標籤、目前狀態

### Requirement: 意見回饋狀態變更

Admin SHALL 能夠變更回饋狀態為：待處理、已回覆、已關閉。

#### Scenario: 將回饋標記為已關閉

- **WHEN** Admin 將一筆狀態為「待處理」的回饋變更為「已關閉」
- **THEN** 系統更新該回饋狀態為「已關閉」，並在列表中反映新狀態

#### Scenario: 將回饋標記為已回覆

- **WHEN** Admin 回覆一筆回饋後
- **THEN** 系統自動將該回饋狀態更新為「已回覆」

### Requirement: 意見回饋回覆

Admin SHALL 能夠回覆意見回饋，回覆內容將以 Email 或站內通知方式送達使用者。

#### Scenario: 回覆回饋並通知使用者

- **WHEN** Admin 撰寫回覆內容並送出
- **THEN** 系統將回覆內容以 Email 或站內通知方式送達該使用者，並將回饋狀態更新為「已回覆」

### Requirement: 意見回饋分類標籤

Admin SHALL 能夠為回饋指定分類標籤：Bug、功能請求、問題詢問、其他。

#### Scenario: 為回饋指定分類

- **WHEN** Admin 選擇一筆回饋並指定分類為「Bug」
- **THEN** 系統將該分類標籤套用至該回饋，並在列表中顯示

#### Scenario: 變更已指定的分類

- **WHEN** Admin 將一筆已分類為「Bug」的回饋改為「功能請求」
- **THEN** 系統更新分類標籤為「功能請求」

### Requirement: 意見回饋篩選

頁面 SHALL 支援依狀態與分類進行篩選。

#### Scenario: 依狀態篩選回饋

- **WHEN** Admin 選擇篩選條件為狀態「待處理」
- **THEN** 頁面 MUST 僅顯示狀態為「待處理」的回饋

#### Scenario: 依分類篩選回饋

- **WHEN** Admin 選擇篩選條件為分類「Bug」
- **THEN** 頁面 MUST 僅顯示分類為「Bug」的回饋

#### Scenario: 同時依狀態與分類篩選

- **WHEN** Admin 選擇狀態「待處理」且分類「功能請求」
- **THEN** 頁面 MUST 僅顯示同時符合兩個條件的回饋

### Requirement: 未處理回饋計數徽章

頁面 SHALL 顯示未讀／待處理數量的計數徽章。

#### Scenario: 顯示待處理計數

- **WHEN** 目前有 5 筆狀態為「待處理」的回饋
- **THEN** 頁面 MUST 在意見回饋入口處顯示數字徽章「5」

#### Scenario: 處理回饋後計數更新

- **WHEN** Admin 將一筆「待處理」回饋變更為「已回覆」
- **THEN** 計數徽章 MUST 即時減少 1

### Requirement: FAQ 項目建立

Admin SHALL 能夠建立 FAQ 項目，包含問題、答案（富文本）、及分類。

#### Scenario: 建立新 FAQ 項目

- **WHEN** Admin 填寫問題、以富文本編輯器撰寫答案、並選擇分類後儲存
- **THEN** 系統建立該 FAQ 項目並顯示於管理列表中

### Requirement: FAQ 分類管理

Admin SHALL 能夠依分類組織 FAQ 項目。

#### Scenario: 將 FAQ 項目歸入分類

- **WHEN** Admin 建立或編輯 FAQ 項目時選擇分類「帳號相關」
- **THEN** 該 FAQ 項目 MUST 歸入「帳號相關」分類下

#### Scenario: 檢視特定分類的 FAQ

- **WHEN** Admin 在管理頁面選擇分類「帳號相關」
- **THEN** 頁面 MUST 僅顯示該分類下的 FAQ 項目

### Requirement: FAQ 項目拖拉排序

Admin SHALL 能夠在同一分類內透過拖拉操作重新排序 FAQ 項目。

#### Scenario: 拖拉調整 FAQ 順序

- **WHEN** Admin 在「帳號相關」分類中將第三個 FAQ 項目拖拉至第一個位置
- **THEN** 系統 MUST 更新排序，該項目移至第一位，前端 FAQ 頁面同步反映新順序

### Requirement: FAQ 項目發布與取消發布

每個 FAQ 項目 SHALL 具備發布／取消發布切換功能。

#### Scenario: 取消發布一個已發布的 FAQ

- **WHEN** Admin 將一個已發布的 FAQ 項目切換為「取消發布」
- **THEN** 該項目不再顯示於前端 FAQ 頁面，但仍保留於管理列表中

#### Scenario: 發布一個未發布的 FAQ

- **WHEN** Admin 將一個未發布的 FAQ 項目切換為「發布」
- **THEN** 該項目 MUST 顯示於前端 FAQ 頁面

### Requirement: FAQ 變更即時同步前端

FAQ 的變更 SHALL 即時反映於前端 FAQ 頁面。

#### Scenario: 新增 FAQ 後前端顯示

- **WHEN** Admin 建立並發布一個新的 FAQ 項目
- **THEN** 前端 FAQ 頁面 MUST 顯示該新項目

#### Scenario: 修改 FAQ 內容後前端更新

- **WHEN** Admin 編輯已發布 FAQ 的答案內容並儲存
- **THEN** 前端 FAQ 頁面 MUST 顯示更新後的內容

### Requirement: FAQ 批次發布與取消發布

Admin SHALL 能夠批次發布或取消發布多個 FAQ 項目。

#### Scenario: 批次發布多個 FAQ

- **WHEN** Admin 勾選多個未發布的 FAQ 項目，並點擊「批次發布」
- **THEN** 系統 MUST 將所有被勾選的項目狀態更新為已發布

#### Scenario: 批次取消發布多個 FAQ

- **WHEN** Admin 勾選多個已發布的 FAQ 項目，並點擊「批次取消發布」
- **THEN** 系統 MUST 將所有被勾選的項目狀態更新為未發布，前端不再顯示這些項目
