## ADDED Requirements

### Requirement: 第二層回覆觸發站內通知給被回覆者

當使用者對第一層留言發起第二層回覆時，系統 SHALL 建立一筆 `notification_events` 記錄，通知被回覆的留言作者。

- `type`: `comment_reply`
- `recipientId`: parent comment 的 `user_id`
- `entityType`: `comment`
- `entityId`: 新建立的回覆 comment id
- `payload` MUST 包含：`content`（回覆內容）、`parent_comment_id`
- `priority`: `P2`

#### Scenario: 使用者回覆他人的留言
- **WHEN** 使用者 A 對使用者 B 的第一層留言建立第二層回覆
- **THEN** 系統建立 notification_event，type 為 `comment_reply`，recipientId 為使用者 B

#### Scenario: 使用者回覆自己的留言
- **WHEN** 使用者 A 對自己的第一層留言建立第二層回覆
- **THEN** 系統不建立 `comment_reply` notification_event（`notificationEventService` 自動過濾 actorId === recipientId）

#### Scenario: 被回覆者同時是內容擁有者
- **WHEN** 使用者 A 回覆使用者 B 的留言，而使用者 B 同時是該內容的擁有者
- **THEN** 使用者 B 收到兩筆通知：一筆 `comment` type（作為內容擁有者）、一筆 `comment_reply` type（作為被回覆者）

### Requirement: 第二層回覆觸發 Email 通知給被回覆者

系統 SHALL 透過現有的 batch digest email worker（每 4 小時執行）自動將 `comment_reply` 事件包含在 digest email 中發送給被回覆者。

- `comment_reply` 事件以 P2 priority 寫入 `notification_events`，digest worker 自動撈取
- digest worker 依 `notification_preferences`（N01 channel）檢查使用者偏好
- 無記錄時預設啟用

#### Scenario: 被回覆者未關閉通知偏好
- **WHEN** 使用者 B 的留言被使用者 A 回覆，且使用者 B 未停用 `comment_reply` 的 N01 channel
- **THEN** 下一次 digest email 包含此 `comment_reply` 事件

#### Scenario: 被回覆者關閉 comment_reply Email 通知
- **WHEN** 使用者 B 在 notification_preferences 中停用 `comment_reply` 的 N01 channel
- **THEN** digest email 不包含 `comment_reply` 事件（但站內通知仍正常）

### Requirement: 回覆通知適用於所有 target type

comment reply 通知 SHALL 適用於所有支援留言的 target type（practice, post, resource, note, outcome, review, circle, idea, portfolio, checkin）。

#### Scenario: 在 practice 上的回覆
- **WHEN** 使用者回覆 practice 上的第一層留言
- **THEN** 觸發 comment_reply 通知，payload 包含 practice 相關資訊

#### Scenario: 在 post 上的回覆
- **WHEN** 使用者回覆 post 上的第一層留言
- **THEN** 觸發 comment_reply 通知，行為與 practice 一致

### Requirement: comment_reply 註冊為可控制的通知類型

系統 SHALL 將 `comment_reply` 加入 `ALL_NOTIFICATION_TYPES`，使前端通知設定頁面可顯示此類型的開關。

#### Scenario: 使用者查看通知偏好設定
- **WHEN** 使用者開啟通知設定頁面
- **THEN** 顯示 `comment_reply` 類型的 N01 開關，預設為啟用
