## ADDED Requirements

### Requirement: 對留言按 reaction 觸發站內通知給留言作者

當使用者對某則留言按 reaction（且為新增而非更換類型）時，系統 SHALL 建立一筆 `notification_events` 記錄，通知該留言作者。

- `type`: `reaction`（複用現有 type）
- `recipientId`: 該留言的 `user_id`
- `entityType`: `comment`
- `entityId`: 該留言的 comment id
- `payload` MUST 包含：`reactionType`
- `priority`: `P2`

#### Scenario: 使用者對他人留言按 reaction
- **WHEN** 使用者 A 對使用者 B 的留言按下 reaction（首次）
- **THEN** 系統建立 notification_event，type 為 `reaction`，entityType 為 `comment`，recipientId 為使用者 B

#### Scenario: 使用者對自己的留言按 reaction
- **WHEN** 使用者 A 對自己的留言按 reaction
- **THEN** 系統不建立 notification_event

#### Scenario: 使用者更換已存在的 reaction 類型
- **WHEN** 使用者 A 已對使用者 B 的留言按過 reaction，現在更換為不同 emoji
- **THEN** 系統不建立新的 notification_event（僅新增時觸發，更換不觸發）

### Requirement: 對留言按 reaction 觸發 Email 通知給留言作者

系統 SHALL 透過現有的 batch digest email worker（每 4 小時執行）自動將 comment reaction 事件包含在 digest email 中發送給留言作者。

- comment reaction 事件以 P2 priority、type `reaction`、entityType `comment` 寫入 `notification_events`
- digest worker 自動撈取並依 `notification_preferences`（N01 channel）檢查偏好
- `Reaction` type 已註冊在 `ALL_NOTIFICATION_TYPES` 中，不需額外註冊

#### Scenario: 留言作者未關閉 reaction 通知
- **WHEN** 使用者 B 的留言被使用者 A 按 reaction，且使用者 B 未停用 `Reaction` 的 N01 channel
- **THEN** 下一次 digest email 包含此 reaction 事件

#### Scenario: 留言作者關閉 reaction Email 通知
- **WHEN** 使用者 B 在 notification_preferences 中停用 `Reaction` 的 N01 channel
- **THEN** digest email 不包含此事件（但站內通知仍正常）

### Requirement: Comment reaction 通知支援所有 target type 的留言

comment reaction 通知 SHALL 適用於所有 target type 下的留言，不論留言是第一層還是第二層。

#### Scenario: 對 practice 下的留言按 reaction
- **WHEN** 使用者對 practice 下某則留言按 reaction
- **THEN** 觸發 reaction 通知給留言作者

#### Scenario: 對第二層回覆按 reaction
- **WHEN** 使用者對某則第二層回覆按 reaction
- **THEN** 觸發 reaction 通知給該回覆的作者（與第一層留言行為一致）
