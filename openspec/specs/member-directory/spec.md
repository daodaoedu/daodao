# Member Directory 規格

## ADDED Requirements

### Requirement: 建立自訂個人檔案欄位

管理員 SHALL 能夠建立自訂個人檔案欄位，支援的類型包含：文字（text）、下拉選單（dropdown）、多選（multi-select）、網址（URL）。

#### Scenario: 新增文字類型欄位

- **WHEN** 管理員點擊「新增欄位」並選擇「文字」類型
- **THEN** 系統 SHALL 建立一個文字輸入欄位，允許管理員設定欄位名稱與說明

#### Scenario: 新增下拉選單欄位

- **WHEN** 管理員選擇「下拉選單」類型
- **THEN** 系統 SHALL 允許管理員設定欄位名稱並新增、編輯、排序選項列表

#### Scenario: 新增多選欄位

- **WHEN** 管理員選擇「多選」類型
- **THEN** 系統 SHALL 允許管理員設定欄位名稱並新增多個可選選項

#### Scenario: 新增網址欄位

- **WHEN** 管理員選擇「URL」類型
- **THEN** 系統 SHALL 建立一個網址輸入欄位，前台顯示時 SHALL 以可點擊連結呈現

### Requirement: 設定欄位為必填或選填

管理員 SHALL 能夠將欄位標記為必填（required）或選填（optional），在用戶 Onboarding 時套用。

#### Scenario: 設定欄位為必填

- **WHEN** 管理員將某欄位標記為「必填」
- **THEN** 用戶在 Onboarding 流程中 MUST 填寫該欄位才能完成註冊

#### Scenario: 設定欄位為選填

- **WHEN** 管理員將某欄位標記為「選填」
- **THEN** 用戶在 Onboarding 流程中可以跳過該欄位

### Requirement: 設定欄位可見性

管理員 SHALL 能夠設定欄位可見性：公開於名錄中（public in directory）、僅會員可見（members only）、僅管理員可見（admin only）。

#### Scenario: 設定欄位為公開

- **WHEN** 管理員將欄位可見性設為「公開」
- **THEN** 該欄位 SHALL 在會員名錄中對所有人（含訪客）可見

#### Scenario: 設定欄位為僅會員可見

- **WHEN** 管理員將欄位可見性設為「僅會員」
- **THEN** 該欄位 SHALL 僅在已登入會員瀏覽名錄時顯示

#### Scenario: 設定欄位為僅管理員可見

- **WHEN** 管理員將欄位可見性設為「僅管理員」
- **THEN** 該欄位 SHALL 僅在管理後台中顯示，前台名錄不會呈現

### Requirement: 欄位排序

管理員 SHALL 能夠重新排序個人檔案欄位。

#### Scenario: 拖曳排序欄位

- **WHEN** 管理員透過拖曳方式重新排序欄位
- **THEN** 系統 SHALL 更新欄位顯示順序，前台名錄與個人檔案頁面依新順序呈現

### Requirement: 欄位使用統計

頁面 SHALL 顯示所有自訂個人檔案欄位及其使用統計（多少用戶已填寫各欄位）。

#### Scenario: 查看欄位使用統計

- **WHEN** 管理員進入會員名錄管理頁面
- **THEN** 頁面 SHALL 顯示每個自訂欄位的名稱、類型、必填/選填狀態，以及已填寫用戶數量與百分比

### Requirement: 前台名錄搜尋與篩選

前台會員名錄 SHALL 支援依姓名搜尋，以及依標籤、角色、自訂欄位篩選。

#### Scenario: 依姓名搜尋會員

- **WHEN** 會員在名錄搜尋框輸入姓名關鍵字
- **THEN** 系統 SHALL 即時篩選並顯示姓名匹配的會員列表

#### Scenario: 依標籤篩選

- **WHEN** 會員選擇一個或多個標籤作為篩選條件
- **THEN** 系統 SHALL 僅顯示擁有所選標籤的會員

#### Scenario: 依自訂欄位篩選

- **WHEN** 會員使用自訂欄位的篩選器（例如依技能等級篩選）
- **THEN** 系統 SHALL 僅顯示符合所選欄位值的會員

### Requirement: 會員連結請求

會員 SHALL 能夠對其他會員發送連結請求。

#### Scenario: 發送連結請求

- **WHEN** 會員在名錄中對另一位會員點擊「建立連結」
- **THEN** 系統 SHALL 發送連結請求通知給對方

#### Scenario: 接受或拒絕連結請求

- **WHEN** 會員收到連結請求
- **THEN** 系統 SHALL 允許該會員接受或拒絕請求；接受後雙方成為連結關係

### Requirement: 會員私訊功能

會員 SHALL 能夠對已連結的會員發送私訊。

#### Scenario: 發送私訊

- **WHEN** 會員對已連結的會員點擊「發送訊息」
- **THEN** 系統 SHALL 開啟私訊介面，允許會員發送文字訊息

#### Scenario: 未連結會員無法私訊

- **WHEN** 會員嘗試對未連結的會員發送私訊
- **THEN** 系統 SHALL 提示需先發送連結請求並獲得對方同意

### Requirement: 啟用與停用會員名錄

管理員 SHALL 能夠啟用或停用會員名錄功能。

#### Scenario: 停用會員名錄

- **WHEN** 管理員將會員名錄功能切換為「停用」
- **THEN** 前台 SHALL 不再顯示會員名錄入口與頁面

#### Scenario: 啟用會員名錄

- **WHEN** 管理員將會員名錄功能切換為「啟用」
- **THEN** 前台 SHALL 顯示會員名錄入口與頁面

### Requirement: 管理員審核會員檔案

管理員 SHALL 能夠審核會員個人檔案（隱藏不適當內容）。

#### Scenario: 隱藏不適當欄位內容

- **WHEN** 管理員發現某會員的個人檔案欄位包含不適當內容
- **THEN** 管理員 SHALL 能夠隱藏該欄位內容，前台不再顯示

#### Scenario: 恢復被隱藏的內容

- **WHEN** 管理員確認先前隱藏的內容已修正
- **THEN** 管理員 SHALL 能夠恢復該欄位的顯示

### Requirement: 名錄使用分析

頁面 SHALL 顯示名錄使用分析數據（搜尋次數、個人檔案瀏覽次數、連結率）。

#### Scenario: 查看名錄分析

- **WHEN** 管理員進入名錄分析頁面
- **THEN** 頁面 SHALL 顯示以下數據：
  - 名錄搜尋總次數與熱門搜尋關鍵字
  - 個人檔案頁面瀏覽次數（總計與平均）
  - 連結請求發送數、接受率

#### Scenario: 篩選分析時間範圍

- **WHEN** 管理員調整日期範圍篩選器
- **THEN** 頁面 SHALL 更新所有分析數據以反映所選時間範圍
