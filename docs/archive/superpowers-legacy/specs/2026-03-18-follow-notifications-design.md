# Follow Notifications — Design Spec

**Date:** 2026-03-18
**Status:** Approved

## Context

打卡通知（`update-practice-checkin`、`update-practice-finish`）已在 `practice-checkin.service.ts` 實作 fan-out 邏輯，但有一個共用的 dedup bug 尚未修復。

## Scope

本次需完成三件事：

| # | 工作 | 影響範圍 |
|---|------|----------|
| 1 | 修 deduplication bug | `notification-event.service.ts` |
| 2 | 建立新實踐時通知使用者關注者 | `practice.service.ts` |
| 3 | 加入 `PracticeCreated` 通知類型偏好設定 | `notification-preference.service.ts` |

Out of scope: email/push delivery、feed/activity stream、修改已實作的打卡 fan-out 邏輯。

---

## 1. Deduplication Bug Fix

### 問題

`notificationEventService.createEvent()` 的重複防護查詢：

```typescript
where: {
  type,
  actor_id:  actorId,
  entity_id: entityId,
  created_at: { gte: oneMinuteAgo },
}
```

缺少 `recipient_id`，導致 fan-out 迴圈中第一個 follower 寫入後，後續所有 follower 都被誤判為重複而跳過。

### 修法

在 `findFirst` 的 WHERE 加入 `recipient_id: recipientId`：

```typescript
where: {
  type,
  actor_id:     actorId,
  recipient_id: recipientId,   // ← 加這行
  entity_id:    entityId,
  created_at:   { gte: oneMinuteAgo },
}
```

修改後語意：「同一個 actor 對同一個 entity，在 1 分鐘內不對同一個 recipient 重複發送同類型通知」。這樣每個 follower 獨立判斷，fan-out 不再被擋掉。

---

## 2. 建立新實踐通知

### 觸發條件

`practice.service.ts` 的 `create()` 在實踐寫入 DB 成功後，且 `isDraft !== true` 時觸發。

### 資料流

```
create()
  → [after DB write, only if !isDraft]
  → SELECT follower_id FROM follows
      WHERE target_type = 'user' AND target_id = authorUserId
  → notificationEventService.createEvent() for each follower
      type:         'PracticeCreated'
      actorId:      authorUserId
      recipientId:  followerId
      entityType:   'practice'
      entityId:     newPracticeId
      priority:     P2
  → fire-and-forget (.catch(() => {}))
```

### 下游投遞

無需改動。現有 `notification-inapp.worker` 每小時掃 `notification_events`，P2 事件依 `(type, entity_type, entity_id)` 聚合後寫入 `notifications` 表。

---

## 3. 通知類型偏好設定

`notification-preference.service.ts` 的 `ALL_NOTIFICATION_TYPES` 加入 `'PracticeCreated'`。

預設行為：所有頻道（N01/N02/N03）皆啟用，與其他類型一致。

---

## Files to Modify

1. **`daodao-server/src/services/notification-event.service.ts`**
   - `createEvent()` 的 dedup `findFirst` WHERE 加入 `recipient_id: recipientId`

2. **`daodao-server/src/services/practice.service.ts`**
   - `create()` 結尾加 fan-out 邏輯（`!isDraft` 才觸發）

3. **`daodao-server/src/services/notification-preference.service.ts`**
   - `ALL_NOTIFICATION_TYPES` 加入 `'PracticeCreated'`
