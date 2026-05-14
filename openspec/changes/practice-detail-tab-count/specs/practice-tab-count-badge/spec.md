## ADDED Requirements

### Requirement: Web 版 tab 標籤顯示數量

Web 版主題實踐詳細頁面的三個 tab（留言、打卡紀錄、使用資源）標籤 SHALL 顯示對應的項目數量，格式為「標籤名(數量)」。

#### Scenario: 留言 tab 顯示留言數量
- **WHEN** 使用者進入主題實踐詳細頁面
- **THEN** 留言 tab 標籤顯示為「留言(N)」，N 為 commentCount 值

#### Scenario: 打卡紀錄 tab 顯示打卡數量
- **WHEN** 使用者進入主題實踐詳細頁面
- **THEN** 打卡紀錄 tab 標籤顯示為「打卡紀錄(N)」，N 為 checkInsData 的筆數

#### Scenario: 使用資源 tab 顯示資源數量
- **WHEN** 使用者進入主題實踐詳細頁面
- **THEN** 使用資源 tab 標籤顯示為「使用資源(N)」，N 為 resources 的筆數

#### Scenario: 數量為零時不顯示數字
- **WHEN** 某個 tab 對應的資料筆數為 0
- **THEN** 該 tab 標籤只顯示文字，不顯示括號和數字

### Requirement: Mobile 版 tab 標籤顯示數量

Mobile 版主題實踐詳細頁面的三個 tab SHALL 全部顯示對應的項目數量，擴展現有僅留言 tab 顯示 commentCount 的行為。

#### Scenario: 三個 tab 都顯示數量
- **WHEN** 使用者在 mobile app 進入主題實踐詳細頁面
- **THEN** 留言顯示「留言(N)」、打卡紀錄顯示「打卡紀錄(N)」、使用資源顯示「使用資源(N)」

#### Scenario: 數量未傳入時不顯示括號
- **WHEN** checkinCount 或 resourceCount prop 未傳入（undefined）
- **THEN** 該 tab 標籤只顯示文字，不顯示括號和數字
