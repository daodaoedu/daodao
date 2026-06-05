## ADDED Requirements

### Requirement: 承諾宣言報名流程
使用者 SHALL 透過填寫承諾宣言（commitment statement）完成挑戰報名。承諾宣言欄位為空值時 SHALL 無法送出報名表單。

#### Scenario: 正常完成報名
- **WHEN** 使用者填寫承諾宣言並點擊「立即加入」
- **THEN** 系統建立 `challenge_participants` 記錄，使用者進入已報名狀態，顯示報名成功儀式畫面

#### Scenario: 承諾宣言為空不可送出
- **WHEN** 使用者未填寫承諾宣言直接點擊送出按鈕
- **THEN** 表單顯示錯誤提示，阻擋送出

#### Scenario: 挑戰未開放報名時無法加入
- **WHEN** 挑戰狀態不為 `enrolling`，使用者嘗試報名
- **THEN** API 回傳 400，前端顯示「報名已截止」提示

### Requirement: 報名期間限制（名稱/期間不可編輯）
挑戰的名稱與起迄日期 SHALL 由官方設定且對所有人不可編輯（包含已報名使用者）。前端 SHALL 不提供修改這兩個欄位的介面。

#### Scenario: 已報名使用者無法更改挑戰名稱或期間
- **WHEN** 使用者已報名，查看挑戰詳情頁
- **THEN** 名稱與期間顯示為純文字，無可編輯介面

### Requirement: 報名確認 Email 通知
報名成功後，系統 SHALL 自動傳送報名確認 Email 至使用者信箱。

#### Scenario: 報名後收到確認信
- **WHEN** 使用者完成報名
- **THEN** 系統在 30 秒內發送報名確認 Email，內含挑戰名稱、開始日期、使用者的承諾宣言內容

### Requirement: 分享圖卡生成
報名成功後，系統 SHALL 提供可下載的分享圖卡（PNG），圖卡包含使用者名稱、頭像、挑戰名稱與承諾宣言摘要。

#### Scenario: 報名成功頁面提供分享圖卡
- **WHEN** 使用者完成報名，進入成功儀式畫面
- **THEN** 頁面顯示分享圖卡預覽，提供「下載圖卡」與「分享」按鈕

#### Scenario: 圖卡內容正確渲染
- **WHEN** 系統生成分享圖卡
- **THEN** 圖卡上顯示正確的使用者名稱、頭像圖片（若無頭像則顯示預設圖）、挑戰名稱

### Requirement: 打卡在開始日前不可提交
挑戰參與者 SHALL 無法在挑戰 `start_date` 之前提交打卡。

#### Scenario: 開始日前無法打卡
- **WHEN** 挑戰狀態為 `upcoming`，參與者嘗試建立 check-in
- **THEN** API 回傳 403，前端顯示「挑戰尚未開始，{start_date} 才能開始打卡」
