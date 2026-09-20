## Context

目前 `comment.service.ts` 的 `createComment` 在有 `parentId` 時會驗證 parent comment，但只通知內容擁有者（`targetEntity.user_id`），不通知被回覆者（`parentComment.user_id`）。

`reaction.service.ts` 的 `upsertReaction` 只處理 `targetType === 'practice'` 和 `'checkin'` 的通知，`targetType === 'comment'` 時完全沒有通知邏輯。

站內通知透過 `notificationEventService.createEvent()` 寫入 `notification_events` 表。Email 通知已有兩套機制：
1. **Batch digest**（`notification-email.worker.ts`）：每 4 小時彙整 P1/P2 事件，按 recipient 發送 digest email，自動檢查 `notification_preferences`
2. **即時通知**（如 `reaction-notification` queue）：獨立 BullMQ queue，1 小時延遲發送

## Goals / Non-Goals

**Goals:**

- 第二層留言回覆時，通知被回覆的留言作者（站內 + Email）
- 對留言按 reaction 時，通知該留言作者（站內 + Email）
- 自我互動不觸發通知（自己回覆/react 自己的留言）
- 使用者可透過 `notification_preferences` 控制這兩種通知的開關

**Non-Goals:**

- 不處理 push notification（N03）
- 不重構現有 practice/checkin reaction 通知
- 不修改留言資料模型或 API
- 不處理三層以上留言
- 不新增獨立 BullMQ queue 做即時 Email — 複用現有 batch digest 即可

## Decisions

### D1: Comment Reply 通知 — 直接在 createComment 中加入

在 `comment.service.ts` 的 `createComment` 方法中，當 `parentId` 存在時，額外呼叫 `notificationEventService.createEvent()` 通知 `parentComment.user_id`。

**type**: `comment_reply`（與現有 `comment` 區分，讓使用者可獨立控制通知偏好）

**為什麼不複用 `comment` type**：內容擁有者收到的「有人留言」和被回覆者收到的「有人回覆你」是不同的通知語境，分開 type 讓使用者可以分別開關。

**去重考量**：`notificationEventService` 已有 1 分鐘內 (type, actorId, recipientId, entityId) 去重機制，不需額外處理。

**實作注意**：`parentComment` 目前宣告在 `if (parentId)` block 內（第 71 行），作用域在第 88 行結束。需要將變數提升到外層，讓通知邏輯（第 122+ 行）可以存取。

### D2: Comment Reaction 站內通知 — 在 upsertReaction 中新增 comment 分支

在 `reaction.service.ts` 的 `upsertReaction` 中，新增 `targetType === 'comment'` 的分支：

```
if (targetType === 'comment') {
  查詢 comment → 取得 comment.user_id, comment.target_type, comment.target_id
  notificationEventService.createEvent({ type: 'reaction', entityType: 'comment', recipientId: comment.user_id, ... })
}
```

**type**: 複用現有 `reaction` type。因為對使用者來說「有人對你的內容按 reaction」是同一種通知，不論被 react 的是 practice 還是 comment。

### D3: Email 通知 — 複用現有 batch digest，不新增 BullMQ queue

現有的 `notification-email.worker.ts` 每 4 小時彙整所有 P1/P2 的 `notification_events`，按 recipient 發送 digest email。只要 notification_events 正確寫入，digest worker 會自動處理：

- 自動按 recipient 分組
- 自動檢查 `notification_preferences`（N01 channel）
- 自動組裝 digest email（P1 事件含連結，P2 事件含計數）

**為什麼不新增獨立 queue**：
1. 現有 digest 機制已完整支援，不需要重複建設
2. 減少 6 個新檔案（2 queue + 2 worker + 2 template）
3. `comment_reply` 設為 P2，與 `comment` 和 `reaction` 一致，在 digest 中一起呈現
4. 未來如需即時通知，可再加獨立 queue，不影響此次實作

### D4: notification_preferences 類型註冊

`notification-preference.service.ts` 的 `ALL_NOTIFICATION_TYPES` 需要加入 `comment_reply`。`reaction` type 已存在（以 `Reaction` 形式），comment reaction 複用它，不需額外註冊。

### D5: notification_preferences 預設值

新的通知類型 `comment_reply` 預設為啟用（N01 站內 + N02 Email 都開）。不需要 migration — 系統邏輯是「沒有 preference 記錄 = 啟用」（`notification-email.worker.ts` 第 139 行：`enabled !== false` 即為啟用）。

## Risks / Trade-offs

**[Email 延遲最多 4 小時] → 使用者不會立即收到 Email**
Mitigation：站內通知是即時的，Email 走 digest 是設計選擇。如使用者反映需要更即時的 Email，可後續再加獨立 queue。

**[comment 被刪除] → 通知中的連結失效**
Mitigation：digest email 的 CTA 連結指向 parent entity（practice/post），不指向個別 comment。

**[被回覆者 = 內容擁有者] → 收到兩筆通知**
Mitigation：目前接受此行為。兩筆通知的語境不同（「有人留言」vs「有人回覆你」），分開呈現合理。未來可視使用者回饋再合併。

**[notification_events 寫入增加] → DB 負載**
Mitigation：留言回覆和 comment reaction 的頻率遠低於 practice reaction，預期影響極小。且 `notificationEventService` 已有去重機制。
