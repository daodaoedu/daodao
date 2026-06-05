## ADDED Requirements

### Requirement: Buddy 陪伴相關通知類型
通知系統 SHALL 支援以下 Buddy 陪伴流程的通知事件類型：`BuddyDailyCheckinSummary`、`BuddyWatchOver`、`BuddyMilestone`、`BuddyCard`。每種類型均為 in-app 通知，不強制觸發 email。

#### Scenario: BuddyDailyCheckinSummary 通知
- **WHEN** 每日聚合 job 判定用戶有 Buddy 當日打卡
- **THEN** 用戶 SHALL 收到 `BuddyDailyCheckinSummary` 通知，內容包含當日打卡的 Buddy 清單（頭像、名稱、實踐名稱）

#### Scenario: BuddyWatchOver 通知
- **WHEN** 守望偵測 job 判定 Buddy A 已達守望觸發門檻
- **THEN** B SHALL 收到 `BuddyWatchOver` 通知，文案為「[A 名字] 最近沒有出現在島上，去捎個消息？」

#### Scenario: BuddyMilestone 通知
- **WHEN** Buddy A 達成里程碑（Day 7 / 30 / 100 / 完成實踐）
- **THEN** A 的所有 Buddy SHALL 各收到 `BuddyMilestone` 通知，包含里程碑類型與 A 的實踐名稱

#### Scenario: BuddyCard 通知
- **WHEN** B 成功傳送一張卡片給 A
- **THEN** A SHALL 收到 `BuddyCard` 通知，包含 B 的名字與卡片內容
