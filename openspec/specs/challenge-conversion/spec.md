## ADDED Requirements

### Requirement: Lurker Banner 對非參與者顯示
挑戰 Feed 頂部 SHALL 對身分為 `observer` 或 `anonymous` 的使用者顯示 Lurker Banner，內含即時參與人數與報名入口。

#### Scenario: 非參與者看到 Lurker Banner
- **WHEN** `observer` 或 `anonymous` 使用者訪問挑戰 Feed
- **THEN** 頁面頂部顯示 Banner，文案格式為「目前有 {currently_participating_count} 位戰友正在衝刺中，預約下一期挑戰 →」

#### Scenario: 參與者不顯示 Lurker Banner
- **WHEN** `participant` 使用者訪問挑戰 Feed
- **THEN** 頁面頂部不顯示 Lurker Banner，改顯示個人進度組件

#### Scenario: 報名成功後 Banner 立即消失
- **WHEN** 使用者從 Lurker Banner 點擊報名並完成報名流程
- **THEN** Banner 立即從頁面移除，改顯示進度組件，無需重新整理頁面

### Requirement: Lurker Banner 顯示即時參與人數
Banner 內的參與人數（`currently_participating_count`）SHALL 反映當前 `challenge_participants` 的實際數量，數據 SHALL 透過 API 每 60 秒輪詢一次更新。

#### Scenario: Banner 顯示正確人數
- **WHEN** 系統有 N 位已報名使用者
- **THEN** Banner 顯示「目前有 N 位戰友正在衝刺中」

### Requirement: Challenge Pulse 熱度統計組件
挑戰大廳（或首頁卡片區）SHALL 顯示 Challenge Pulse 組件，包含當前挑戰的總打卡次數、外部送花總數，以及 3–5 位活躍成員的頭像堆疊。

#### Scenario: Challenge Pulse 顯示統計數據
- **WHEN** 任何使用者查看挑戰大廳
- **THEN** 顯示總打卡次數、外部觀察者送花總數、隨機抽取的 3–5 位成員頭像堆疊

#### Scenario: 無活躍成員時不顯示頭像堆疊
- **WHEN** 挑戰剛開始，尚無任何打卡記錄
- **THEN** Challenge Pulse 顯示 0 筆打卡，頭像堆疊區不顯示（或顯示佔位符）

### Requirement: Challenge Pulse 數據每 60 秒自動更新
Challenge Pulse 的所有數據 SHALL 透過前端輪詢每 60 秒自動刷新，無需使用者手動操作。

#### Scenario: 數據自動刷新
- **WHEN** 使用者停留在包含 Challenge Pulse 的頁面超過 60 秒
- **THEN** 前端自動重新呼叫 stats API，數字更新為最新值
