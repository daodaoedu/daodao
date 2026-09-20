# notification-events
- 涉及 repo: daodao-server
- 對應 archived change: 2026-05-26-notification-system
- 總計: 3 條 requirement / 16 個 scenario | ✅13 ⚠️3 ❌0 ❓0

> 核心：notification-event.service.ts createEvent(自我過濾 + 1分鐘去重 + payload + priority)；各業務 service 與 social-notification.worker 觸發各事件。命名與 spec 文字不同(如 UserFollowed / PracticeCreated / BuddyRequest)，但事件路徑齊全。

## Requirement: 事件類型定義 → ✅
證據: daodao-server:src/services/notification-event.service.ts:46-104 createEvent；各 service 觸發
- Scenario: 留言觸發 P1 → ✅ — comment.service.ts:178 type 'comment' P1 recipient=owner actor=user
- Scenario: 按讚觸發 P2 → ✅ — reaction.service.ts:111/138/161/181 type 'reaction' P2，practice/checkin/comment/persona
- Scenario: 收到連結請求 P1(含初衷摘要) → ✅ — connection.service.ts:193 type 'Connect' P1 payload.intent
- Scenario: 連結請求被接受 P1 → ✅ — connection.service.ts:238 type 'ConnectAccepted' P1 通知 requester
- Scenario: 用戶被關注 P2 entity_type user → ✅ — follow.service.ts:95 type 'UserFollowed' P2 entityType 'user'
- Scenario: 主題實踐被關注 P2 entity_type practice(含 practice_id/title) → ✅ — follow.service.ts:188 type 'PracticeFollowed' P2 entityType 'practice' payload practice_id+practice_title，recipient=owner
- Scenario: 被 @ 提及 P1 entity_type comment(每位各一筆) → ✅ — comment.service.ts:252 迴圈 type 'mention' P1 entityType 'comment'
- Scenario: 編輯留言新增 @ 提及(只通知新增者) → ✅ — comment.service.ts:540-575 查既有 mention recipient，僅對 newlyMentionedIds 建立
- Scenario: 留言者本人不收 @ 通知 → ✅ — comment.service.ts uniqueIds filter id!==userId；加上 service 自我過濾
- Scenario: 關注的人開始主題實踐 P1(fan-out) → ✅ — practice.service.ts:96 type 'PracticeCreated' P1 對 followers+connections
- Scenario: 關注的主題實踐打卡/結束 P2 → ✅ — practice-checkin.service.ts:267 'update-practice-finish' P2；fanoutToPracticeFollowers→social-notification.worker:137 'PracticeCheckinActivity' P2
- Scenario: 收到 Buddy 請求 P1 entity_type buddy_request(含 practice_id/title) → ✅ — buddy-request.service.ts:103 type 'BuddyRequest' P1 entityType 'buddy_request' payload practice_id+title
- Scenario: Buddy 請求被接受 P1 → ⚠️ — buddy-request.service.ts:164 type 'BuddyAccepted' P1，但 entityType 為 'buddy_request' 而非 spec 的 'buddy_accepted'
- Scenario: 追蹤者收到 Buddy 請求 fan-out P1(獨立) → ✅ — buddy-request.service.ts:123 迴圈 type 'BuddyRequestFollower' P1 對 requester 的 followers

## Requirement: 事件不重複觸發 → ⚠️
證據: daodao-server:src/services/notification-event.service.ts:60-83 findFirst 1 分鐘去重
- Scenario: 防止重複事件(同 type,actor,entity 1分鐘內) → ⚠️ — 去重鍵為 (type, actor_id, recipient_id, entity_id)，比 spec 的 (type,actor,entity) 多含 recipient_id；多數情況等效但若同一 actor/entity 對不同 recipient 則各自獨立(通常正確)

## Requirement: 不通知自己 → ✅
證據: daodao-server:src/services/notification-event.service.ts:50-52 actorId===recipientId 直接 return
- Scenario: 自己對自己內容互動 → ✅ — reaction/comment 各 service 亦有 user_id!==userId guard，加 service 層過濾雙重保險
