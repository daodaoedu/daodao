## ADDED Requirements

### Requirement: 每日聚合打卡通知
系統 SHALL 每日固定時間（UTC+8 22:00）執行聚合 job，彙整當日有打卡的 Buddy，依接收方分組，對每位用戶最多推送 1 則 `BuddyDailyCheckinSummary` in-app 通知。若當日無任何 Buddy 打卡，SHALL NOT 推送通知。

#### Scenario: 當日有多個 Buddy 打卡
- **WHEN** 用戶的 2 個 Buddy 在當日各自完成打卡，聚合 job 執行
- **THEN** 用戶 SHALL 收到 1 則通知，內容包含 2 位 Buddy 的頭像與實踐名稱

#### Scenario: 當日無 Buddy 打卡
- **WHEN** 用戶的所有 Buddy 當日皆未打卡
- **THEN** 用戶 SHALL NOT 收到聚合打卡通知

#### Scenario: 同一 Buddy 當日多次打卡只算一次
- **WHEN** 同一個 Buddy 在當日打卡 3 次
- **THEN** 聚合通知中該 Buddy SHALL 只出現一次

---

### Requirement: 通知卡片 reaction
每日聚合打卡通知 SHALL 支援在通知頁面對每位 Buddy 的打卡直接給予 👋 reaction，無需進入打卡詳情頁。

#### Scenario: 在通知上給 reaction
- **WHEN** 用戶在聚合通知卡片點擊某 Buddy 旁的 👋
- **THEN** 系統 SHALL 記錄 reaction，👋 SHALL 呈現已選取狀態

#### Scenario: 點擊 Buddy 打卡內容進入詳情
- **WHEN** 用戶點擊通知卡片中某 Buddy 的打卡內容（非 reaction 按鈕）
- **THEN** 系統 SHALL 導向該 Buddy 的打卡詳情頁，可留言

---

### Requirement: 守望相助偵測與通知
系統 SHALL 每日執行守望偵測 job，找出距上次打卡 ≥ 5 天（火苗狀態 `dying` 或 `dormant`）且尚未在本輪中斷週期通知過的 Buddy 配對，向另一方推送 `BuddyWatchOver` in-app 通知。A 重新打卡後，`watch_over_notified_at` SHALL 清除，確保下次觸發為全新週期。

#### Scenario: 觸發守望相助通知
- **WHEN** Buddy A 已 5 天未打卡，且本輪未曾推送守望通知
- **THEN** B SHALL 收到「A 最近沒有出現在島上，去捎個消息？」通知

#### Scenario: 不重複推送
- **WHEN** 本輪守望通知已送出，A 仍未打卡
- **THEN** 系統 SHALL NOT 再次推送相同通知，直到 A 打卡後清除 notified_at

#### Scenario: A 打卡後清除通知記錄
- **WHEN** A 在收到守望通知後重新打卡
- **THEN** `watch_over_notified_at` SHALL 清除為 null，下次再滿 5 天可再次觸發

---

### Requirement: 傳信畫面（守望相助回應）
系統 SHALL 提供傳信畫面，供 B 回應守望相助通知。畫面 SHALL 顯示預設卡片選項（至少：「嘿，還在嗎？」/ 「沒關係，慢慢來」/ 「我在這裡」）以及自由輸入欄位。B 選擇後 SHALL 呼叫 `POST /buddies/:id/cards` 傳送；傳送成功後 A 收到 `BuddyCard` in-app 通知。

#### Scenario: 選擇預設卡片傳送
- **WHEN** B 在傳信畫面選擇「沒關係，慢慢來」並點擊傳送
- **THEN** 系統 SHALL 建立 card_type=preset 的 buddy_card 記錄，A 收到 BuddyCard 通知

#### Scenario: 自由輸入傳送
- **WHEN** B 在自由輸入欄填入「加油！」並點擊傳送
- **THEN** 系統 SHALL 建立 card_type=custom 的 buddy_card 記錄，content 為「加油！」

#### Scenario: 傳送卡片累積 B 的陪伴值
- **WHEN** B 成功傳送一張卡片
- **THEN** B 的 `companion_score` SHALL +1（見 buddy-ember spec）

---

### Requirement: 里程碑偵測
系統 SHALL 在打卡建立時同步計算該用戶在此實踐的連續天數，若達到里程碑（7 / 30 / 100 天或完成整個實踐），SHALL 觸發 `BuddyMilestone` 通知給所有該用戶的 Buddy。

#### Scenario: Day 30 里程碑觸發通知
- **WHEN** 用戶 A 完成第 30 次連續打卡
- **THEN** A 的所有 Buddy SHALL 各收到「A 完成了 30 天的實踐 🎉」通知

#### Scenario: 完成整個實踐觸發通知
- **WHEN** 用戶 A 完成實踐的最後一次打卡（實踐標記為 completed）
- **THEN** A 的所有 Buddy SHALL 收到里程碑通知，標示「完成整個實踐」

#### Scenario: 非里程碑天數不觸發
- **WHEN** 用戶 A 完成第 15 天打卡（非里程碑）
- **THEN** SHALL NOT 觸發 BuddyMilestone 通知

---

### Requirement: 里程碑慶祝通知卡片
Buddy 收到 `BuddyMilestone` 通知後，系統 SHALL 在通知頁面提供進入對方打卡詳情頁的入口，支援選擇 reaction 及填寫一句話祝賀留言；祝賀後 A 收到慶祝通知回饋。

#### Scenario: 從通知進入里程碑打卡頁
- **WHEN** B 點擊里程碑通知
- **THEN** 系統 SHALL 導向 A 的里程碑打卡詳情頁

#### Scenario: 留下祝賀
- **WHEN** B 在里程碑打卡頁選擇 reaction 並填入一句話後提交
- **THEN** A SHALL 收到「B 為你的里程碑留下了腳印」慶祝通知
