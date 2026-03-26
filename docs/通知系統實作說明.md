# 通知系統實作說明

> 本文件說明後端通知系統的架構、各通知類型的觸發邏輯，以及實作細節。

---

## 一、系統架構概覽

通知系統分為兩個平行管道：

```
業務事件發生
    │
    ├─── 路線 A：直接通知（Direct Notification）
    │       └── notificationEventService.createEvent()
    │               └── 寫入 notification_events 表
    │                       ├── notification-email.worker（每 4 小時）→ Email
    │                       └── notification-inapp.worker（每分鐘）→ In-App 通知
    │
    └─── 路線 B：社交擴散通知（Social Fan-out）
            └── enqueueSocialNotification()
                    └── BullMQ: social-notification queue
                            └── social-notification.worker
                                    └── 對每一位 recipient 呼叫 notificationEventService.createEvent()
```

**路線 A**：用於直接通知特定對象（如：收到連結請求的人、被 @ 的人）
**路線 B**：用於粉絲擴散（如：追蹤者看到「某人做了某件事」的動態）

---

## 二、通知優先等級

| 等級 | 說明 | Email 頻率 | 範例 |
|---|---|---|---|
| **P1** | 立即重要，需要回應 | 每 4 小時批次寄出 | 收到連結請求、Buddy 請求、被 @ |
| **P2** | 普通動態，可聚合 | 每週摘要 | 有人追蹤了你、追蹤的人有更新 |

---

## 三、所有通知事件類型

### 3.1 路線 A（直接通知）

| 事件類型 | 觸發點 | 收件人 | 優先級 |
|---|---|---|---|
| `Connect` | 送出連結請求 | **receiver**（被請求者） | P1 |
| `ConnectAccepted` | 接受連結請求 | **requester**（發起人） | P1 |
| `BuddyRequest` | 送出 Buddy 請求 | **receiver**（被請求者） | P1 |
| `BuddyRequestFollower` | 送出 Buddy 請求 | **requester 的追蹤者們** | P1 |
| `BuddyAccepted` | 接受 Buddy 請求 | **requester**（發起人） | P1 |
| `UserFollowed` | 追蹤一位用戶 | **被追蹤者** | P2 |
| `PracticeFollowed` | 追蹤一個主題實踐 | **主題實踐擁有者** | P2 |
| `PracticeCreated` | 新增主題實踐 | **用戶的追蹤者們** | P2 |
| `reaction` | 對內容按讚 | **內容擁有者** | P2 |
| `comment` | 留言 | **內容擁有者** | P2 |
| `mention` | 留言中 @ 某人 | **被 @ 的用戶** | P1 |

### 3.2 路線 B（社交擴散，經 social-notification.worker）

| 事件類型 | 觸發點 | 收件人 | 優先級 | Worker Handler |
|---|---|---|---|---|
| `ConnectRequestActivity` | 送出連結請求 | **requester 的追蹤者們** | P2 | `handleConnectRequest` |
| `UserFollowActivity` | 追蹤一位用戶 | **actor 的追蹤者們** | P2 | `handleFollowUser` |
| `PracticeCheckinActivity` | 主題實踐打卡 | **practice 的追蹤者們** | P2 | `handleFollowPracticeCheckin` |
| `PracticeUpdateActivity` | 主題實踐有更新 | **practice 的追蹤者們** | P2 | `handleFollowPracticeUpdate` |
| `PartnerCheckinActivity` | 主題實踐打卡 | **雙向連結夥伴** | P1 | `handleConnectPartnerCheckin` |
| `PartnerUpdateActivity` | 主題實踐有更新 | **雙向連結夥伴** | P2 | `handleConnectPartnerUpdate` |

> **備註**：`handleConnectAccepted` 為 intentional no-op — 接受連結請求的通知已由路線 A 的 P1 `ConnectAccepted` 事件直接處理，不需要再經由 social fan-out 重複通知。

---

## 四、Social Notification 實作細節

### 4.1 `handleConnectRequest`

**觸發點**：`connection.service.ts` → `sendRequest()`
**Enqueue 位置**：`connection.service.ts`，fan-out 到 requester 的所有追蹤者
**Handler 邏輯**：
```
輸入：actorId = requester, recipientId = 某位追蹤者, payload = { receiverId }
輸出：呼叫 notificationEventService.createEvent({
  type: 'ConnectRequestActivity',
  actorId,
  recipientId,
  entityType: 'connection',
  entityId: receiverId,
  payload,
  priority: 'P2'
})
```
**結果**：追蹤 A 的用戶，In-App 看到「A 送出了連結請求」

---

### 4.2 `handleFollowUser`

**觸發點**：`follow.service.ts` → `followUser()`
**Enqueue 位置**：`follow.service.ts`，fan-out 到 actor 的所有追蹤者（排除被追蹤的目標本人）
**Handler 邏輯**：
```
輸入：actorId = follower, recipientId = actor 的追蹤者, payload = { targetId }
輸出：呼叫 notificationEventService.createEvent({
  type: 'UserFollowActivity',
  actorId,
  recipientId,
  entityType: 'user',
  entityId: targetId,
  payload,
  priority: 'P2'
})
```
**結果**：追蹤 A 的用戶，In-App 看到「A 開始追蹤了 B」

---

### 4.3 `handleFollowPracticeCheckin`

**觸發點**：`practice-checkin.service.ts` → 打卡成功後
**Enqueue 位置**：`practice-checkin.service.ts`，透過 `social-notification-fanout.service.ts` 的 `fanoutToPracticeFollowers()` helper
**Handler 邏輯**：
```
輸入：actorId = 打卡者, recipientId = practice 追蹤者, payload = { practiceId, checkinId }
輸出：呼叫 notificationEventService.createEvent({
  type: 'PracticeCheckinActivity',
  actorId,
  recipientId,
  entityType: 'practice',
  entityId: practiceId,
  payload,
  priority: 'P2'
})
```
**結果**：追蹤某主題實踐的用戶，In-App 看到「X 在《某實踐》打卡了」

---

### 4.4 `handleFollowPracticeUpdate`

**觸發點**：`practice.service.ts` → 更新主題實踐後
**Enqueue 位置**：`practice.service.ts`，透過 `fanoutToPracticeFollowers()` helper
**Handler 邏輯**：
```
輸入：actorId = 更新者, recipientId = practice 追蹤者, payload = { practiceId }
輸出：呼叫 notificationEventService.createEvent({
  type: 'PracticeUpdateActivity',
  actorId,
  recipientId,
  entityType: 'practice',
  entityId: practiceId,
  payload,
  priority: 'P2'
})
```
**結果**：追蹤某主題實踐的用戶，In-App 看到「X 更新了《某實踐》」

---

### 4.5 `handleConnectPartnerCheckin`

**觸發點**：`practice-checkin.service.ts` → 打卡成功後
**Enqueue 位置**：`practice-checkin.service.ts`，透過 `fanoutToConnectedPartners()` helper
**Handler 邏輯**：
```
輸入：actorId = 打卡者, recipientId = 連結夥伴, payload = { practiceId, checkinId }
輸出：呼叫 notificationEventService.createEvent({
  type: 'PartnerCheckinActivity',
  actorId,
  recipientId,
  entityType: 'practice',
  entityId: practiceId,
  payload,
  priority: 'P1'   ← P1，連結夥伴的動態較重要
})
```
**結果**：連結夥伴的打卡動態以 P1 即時通知對方

---

### 4.6 `handleConnectPartnerUpdate`

**觸發點**：`practice.service.ts` → 更新主題實踐後
**Enqueue 位置**：`practice.service.ts`，透過 `fanoutToConnectedPartners()` helper
**Handler 邏輯**：
```
輸入：actorId = 更新者, recipientId = 連結夥伴, payload = { practiceId }
輸出：呼叫 notificationEventService.createEvent({
  type: 'PartnerUpdateActivity',
  actorId,
  recipientId,
  entityType: 'practice',
  entityId: practiceId,
  payload,
  priority: 'P2'
})
```
**結果**：連結夥伴更新實踐時，對方收到 P2 通知

---

### 4.7 Mention（@提及）

**觸發點**：`comment.service.ts` → 留言成功後
**實作方式**：直接呼叫 `notificationEventService.createEvent()`（路線 A），不經過 social-notification queue
**Mention 格式**：留言 `content` 欄位中出現 `@{custom_id}`（如 `@john_doe`）
**邏輯**：
```
留言成功後：
  從 mentionedUserIds 取得被 @ 的用戶 ID 列表
  排除留言者自己
  for 每位被 @ 的用戶：
    notificationEventService.createEvent({
      type: 'mention',
      actorId: commenterId,
      recipientId: 用戶.id,
      entityType: 'comment',
      entityId: commentId,
      priority: 'P1',
      payload: { content, actorName, url }
    })
```
**結果**：在留言中被 @ 的用戶，收到 P1 即時通知「X 在留言中提到了你」

---

## 五、Fan-out Helper Service

`social-notification-fanout.service.ts` 提供兩個 helper 函數，簡化 practice 相關的 fan-out 邏輯：

| Helper | 用途 | 查詢邏輯 |
|---|---|---|
| `fanoutToPracticeFollowers()` | 通知追蹤某 practice 的用戶 | `follows WHERE target_type='practice' AND target_id=practiceId`，排除 actor 自己 |
| `fanoutToConnectedPartners()` | 通知與 actor 互相連結的夥伴 | `connections WHERE user_a_id=userId OR user_b_id=userId` |

所有 fan-out 皆為 fire-and-forget，不阻塞主要 response。

---

## 六、資料庫查詢參考

### 查詢追蹤某用戶的所有人
```sql
SELECT follower_id FROM follows
WHERE target_type = 'user' AND target_id = :userId
```

### 查詢追蹤某主題實踐的所有人
```sql
SELECT follower_id FROM follows
WHERE target_type = 'practice' AND target_id = :practiceId
```

### 查詢與某用戶互相連結的所有夥伴
```sql
SELECT
  CASE WHEN user_a_id = :userId THEN user_b_id ELSE user_a_id END AS partner_id
FROM connections
WHERE user_a_id = :userId OR user_b_id = :userId
```

---

## 七、相關檔案清單

| 檔案 | 職責 |
|---|---|
| `src/queues/social-notification.worker.ts` | 所有 social fan-out handler 實作（8 個 handler） |
| `src/queues/social-notification.queue.ts` | `enqueueSocialNotification()` 定義 |
| `src/queues/reaction-notification.queue.ts` | Reaction 通知佇列（含 dedup：先移除舊 job 再加入新 job） |
| `src/services/social-notification-fanout.service.ts` | Fan-out helper（`fanoutToPracticeFollowers`、`fanoutToConnectedPartners`） |
| `src/services/connection.service.ts` | 連結請求的 `connect.request` fan-out enqueue |
| `src/services/follow.service.ts` | 追蹤用戶的 `follow.user` fan-out enqueue |
| `src/services/practice-checkin.service.ts` | 打卡後的 `follow.practice_checkin` + `connect.partner_checkin` enqueue |
| `src/services/practice.service.ts` | 更新實踐後的 `follow.practice_update` + `connect.partner_update` enqueue |
| `src/services/comment.service.ts` | @mention 解析與直接通知 |
| `src/services/buddy-request.service.ts` | Buddy 請求（含 `status === 'pending'` guard） |
| `src/services/notification-unsubscribe.service.ts` | Email 退訂連結（使用 `BACKEND_URL`） |
| `src/controllers/notification.controller.ts` | 通知列表（composite cursor pagination：priority + created_at + id） |
| `src/controllers/user.controller.ts` | 用戶 Profile（`hideConnectionsCount` 讀取 `user.hide_connections_count`） |
