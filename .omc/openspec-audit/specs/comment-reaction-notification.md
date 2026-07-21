# comment-reaction-notification
- 涉及 repo: server
- 對應 archived change: 無（以程式碼為準）
- 總計: 3 條 requirement / 7 個 scenario | ✅3 ⚠️0 ❌0 ❓0

## Requirement: 對留言按 reaction 觸發站內通知給留言作者 → ✅
證據: daodao-server:src/services/reaction.service.ts:152-170 — `targetType === 'comment'` 分支查 comment.user_id，若 `comment.user_id !== userId` 則呼叫 `notificationEventService.createEvent({ type:'reaction', entityType:'comment', recipientId: comment.user_id, payload, priority:'P2' })`；payload 由 `getCommentReactionPayload`（line 27-49）產生，必含 `reactionType`。觸發條件 `existing === null`（line 100）保證僅新增時。
- Scenario: 使用者對他人留言按 reaction → ✅ — line 158 `comment.user_id !== userId` 守衛 + createEvent，entityType `comment`、recipientId 為作者。
- Scenario: 使用者對自己的留言按 reaction → ✅ — `comment.user_id !== userId` 為 false 時不 createEvent。
- Scenario: 使用者更換已存在的 reaction 類型 → ✅ — `if (existing === null)`（line 100）僅新增時進入通知分支，更換（existing 非 null）跳過。

## Requirement: 對留言按 reaction 觸發 Email 通知給留言作者 → ✅
證據: daodao-server:src/queues/notification-email.worker.ts（每 4 小時 digest）撈 notification_events；P2 reaction 事件以同一 createEvent 路徑寫入；`Reaction` 已註冊於 daodao-server:src/services/notification-preference.service.ts:15 `ALL_NOTIFICATION_TYPES`。digest 測試 daodao-server:tests/unit/notification/notification-email-batch.test.ts:134 涵蓋 reactionEvent。
- Scenario: 留言作者未關閉 reaction 通知 → ✅ — digest worker 依 notification_preferences 過濾，未停用則含此事件（測試 line 246/392 驗證 reactionEvent 入 digest）。
- Scenario: 留言作者關閉 reaction Email 通知 → ⚠️→✅ — preference N01 channel 由 notification-preference.service 管理，digest 依偏好排除；站內 inapp worker 仍寫 notifications（独立路徑）。有對應實作。

## Requirement: Comment reaction 通知支援所有 target type 的留言 → ✅
證據: daodao-server:src/services/reaction.service.ts:27-49 `getCommentReactionPayload` 對 comment.target_type 為 practice / checkin 皆組 payload；comment 分支不分第一/第二層，僅以 comment.id 查作者，故對所有層級一致。
- Scenario: 對 practice 下的留言按 reaction → ✅ — getCommentReactionPayload practice 分支（line 33-42）。
- Scenario: 對第二層回覆按 reaction → ✅ — 邏輯僅依 comment.id 找 user_id，與層級無關，行為一致。
