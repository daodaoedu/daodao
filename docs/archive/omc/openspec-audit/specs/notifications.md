# notifications
- 涉及 repo: server (services/queues)
- 對應 archived change: 社交通知（follow/connect/buddy）相關 change
- 總計: 2 條 requirement / 8 個 scenario | ✅8 ⚠️0 ❌0 ❓0

通知統一經 `notificationEventService.createEvent({ type, actorId, recipientId, entityType, entityId, payload, priority })` 產生，type 集中於 src/services/notification-preference.service.ts:15-37 的 ALL_NOTIFICATION_TYPES。

## Requirement: 關注相關通知類型 → ✅
- Scenario: 被關注通知 → ✅ — daodao-server:src/services/follow.service.ts:93-104 `type:'UserFollowed'`，payload 含 actorName（頭像由 actorId 解析）
- Scenario: 關注者的實踐更新通知（B 開始新主題實踐）→ ✅ — daodao-server:src/services/practice.service.ts:96-105 對 actor 的 followers/connections 發 `type:'PracticeCreated'`（只限 public，practiceTitle 入 payload）
- Scenario: 關注者發送 Buddy 請求通知 → ✅ — daodao-server:src/services/buddy-request.service.ts:104 `type:'BuddyRequest'`、:124 `type:'BuddyRequestFollower'`（fan-out 給請求者追蹤者）
- Scenario: 關注實踐打卡通知 → ✅ — daodao-server:src/services/practice-checkin.service.ts:280+ public practice fan-out 打卡通知；亦見 social-notification.worker.ts:48 FOLLOW_PRACTICE_CHECKIN
- Scenario: 關注實踐結束通知 → ✅ — daodao-server:src/services/practice-checkin.service.ts:260-277 newStatus==='completed' 對 practice followers 發 `type:'update-practice-finish'`

## Requirement: 連結請求相關通知類型 → ✅
- Scenario: 收到連結請求通知（含原因）→ ✅ — daodao-server:src/services/connection.service.ts:192-202 `type:'Connect'`，payload 含 `actorName` 與 `intent`（連結原因/reason）
- Scenario: 連結請求被接受通知 → ✅ — daodao-server:src/services/connection.service.ts:236-249 acceptRequest 對 requester 發 `type:'ConnectAccepted'`
- Scenario: 被拒絕不發通知 → ✅ — daodao-server:src/services/connection.service.ts:261-285 rejectRequest 只更新接收者自己的通知狀態為 'connect-rejected'，**未對 requester 發任何 createEvent**（程式碼註解明示「對方不會收到拒絕通知」）
