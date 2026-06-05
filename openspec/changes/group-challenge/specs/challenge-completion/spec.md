## ADDED Requirements

### Requirement: 可設定的達標門檻
`challenges` 資料表 SHALL 包含 `completion_threshold` 欄位（整數），代表達標所需的最低打卡次數。此欄位 SHALL 可由管理員設定，不寫死於程式碼中。

#### Scenario: 達標門檻由資料表決定
- **WHEN** 管理員建立挑戰，設定 `completion_threshold = 15`
- **THEN** 結營判斷時以 15 次為達標基準，無需修改程式碼即可調整

### Requirement: 結營自動化 BullMQ Delayed Job
挑戰狀態切換為 `active` 時，系統 SHALL 在 BullMQ 中排入一個 `challenge.complete` delayed job，執行時間為 `end_date + 1 天 00:00 UTC`。

#### Scenario: 挑戰啟動時排入結營 Job
- **WHEN** 挑戰狀態切換為 `active`
- **THEN** BullMQ 中新增 `challenge.complete` job，delay 時間計算為 `end_date + 1 day`

#### Scenario: 挑戰取消時移除結營 Job
- **WHEN** 管理員將挑戰狀態改為 `cancelled`
- **THEN** 對應的 BullMQ delayed job 被取消，不執行結營邏輯

### Requirement: 結營 Job 掃描並判斷參與者達標狀態
結營 Job 執行時，系統 SHALL 掃描所有 `challenge_participants` 記錄，比對每位參與者在挑戰期間內的打卡次數與 `completion_threshold`，並分批處理（避免大量同步操作）。

#### Scenario: 達標者處理
- **WHEN** 結營 Job 執行，某參與者打卡次數 ≥ `completion_threshold`
- **THEN** 呼叫 Growth Map API 為該使用者新增挑戰專屬勳章，並解鎖「結營精華區」，同時更新 `challenge_participants.status = 'completed'`

#### Scenario: 未達標者處理
- **WHEN** 結營 Job 執行，某參與者打卡次數 < `completion_threshold`
- **THEN** 發送「溫和重啟」通知（站內通知 + Email），邀請預約下一期挑戰，更新 `challenge_participants.status = 'incomplete'`

#### Scenario: 結營 Job 冪等性
- **WHEN** 結營 Job 因 worker 重啟而重複執行
- **THEN** 系統檢查 `challenge_participants.status` 已非 `active` 者不重複發放勳章或通知

### Requirement: Growth Map 勳章發放 API
系統 SHALL 提供內部 API endpoint `POST /api/internal/growth-map/badges`，供結營 Job 呼叫，為指定使用者新增挑戰勳章。此 API 為新建功能（現有 Growth Map 尚無此介面）。

#### Scenario: 成功發放勳章
- **WHEN** 結營 Job 呼叫 `POST /api/internal/growth-map/badges`，傳入 `{ user_id, badge_type: 'challenge_completion', challenge_id }`
- **THEN** Growth Map 為該使用者新增勳章記錄，回傳 201

#### Scenario: 重複發放時回傳 409
- **WHEN** 同一 `user_id` + `challenge_id` 組合已有勳章記錄
- **THEN** API 回傳 409 Conflict，不重複新增

### Requirement: 結營完成 Email 通知
達標者 SHALL 在結營後收到「挑戰完成賀信」Email，未達標者 SHALL 收到「溫和重啟」邀請信。

#### Scenario: 達標者收到賀信
- **WHEN** 結營 Job 確認使用者達標
- **THEN** 系統在 5 分鐘內發送賀信 Email，內含挑戰名稱、完成打卡次數、勳章說明

#### Scenario: 未達標者收到重啟邀請
- **WHEN** 結營 Job 確認使用者未達標
- **THEN** 系統在 5 分鐘內發送邀請信，鼓勵預約下一期挑戰
