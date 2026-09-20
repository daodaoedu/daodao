## ADDED Requirements

### Requirement: Early User Badge 於全部任務完成時發放
系統 SHALL 在用戶完成所有 Onboarding 任務的瞬間，自動發放 Early User Badge，並觸發一次性通知。Badge 為限量早期用戶專屬，發放後不可撤銷。

#### Scenario: 完成最後一個任務時觸發 Badge
- **WHEN** 用戶完成最後一個 Onboarding 任務，使 task_states 全部標記為完成
- **THEN** 系統將 `badge_granted` 設為 true，記錄 `badge_granted_at` 時間戳，並觸發 Badge 通知

#### Scenario: Badge 通知僅出現一次
- **WHEN** Badge 已發放（badge_granted 為 true）
- **THEN** 用戶下次進入 app 時不再顯示 Badge 通知

---

### Requirement: Widget 轉化為 Badge 展示
當 Badge 發放後，浮動 Widget SHALL 轉化為 Badge 獲得展示，替代原本的任務清單。

#### Scenario: Widget 在 Badge 發放後顯示獲得畫面
- **WHEN** 用戶剛完成最後一個任務
- **THEN** Widget 立即切換為「恭喜獲得 Early User Badge」展示，不再顯示任務清單

#### Scenario: Badge 後不再顯示進度 Widget
- **WHEN** 用戶已獲得 Badge 並再次進入 app
- **THEN** 浮動 Widget 不再出現（Onboarding 流程結束）

---

### Requirement: 後端紀錄 Onboarding 完成資料
系統 SHALL 紀錄以下資料供後續分析使用：
- 用戶來源（`user_source`：S1 / S2 / S3）
- 實踐建立方式（自建 / 複製 / 行動產生器）
- Badge 獲得狀態與時間
- 用戶從 Onboarding 開始到全部完成所花費的天數

#### Scenario: Badge 發放時自動計算完成天數
- **WHEN** 系統發放 Badge
- **THEN** 以 `badge_granted_at - user_onboarding.created_at` 計算並儲存 `days_to_complete`

#### Scenario: 實踐建立方式被正確紀錄
- **WHEN** 用戶透過「行動產生器（AI）」建立實踐完成任務 C
- **THEN** 系統將建立方式標記為 `action_generator`，而非 `self_created`
