## Why

使用者回覆第二層留言（回覆某人的留言）時，被回覆者完全收不到通知（站內通知與 Email 都沒有）。同樣地，對留言按 reaction 時，留言作者也收不到通知。這導致使用者之間的對話互動容易斷裂，嚴重影響社群活躍度。

**影響子專案**：daodao-server

## What Changes

- **新增 comment reply 通知**：當使用者回覆第二層留言時，發送站內通知（notification_events）給被回覆的留言作者（`parentComment.user_id`），排除自己回覆自己的情境
- **新增 comment reply Email 通知**：透過 BullMQ 排程發送 Email 給被回覆者
- **新增 comment reaction 通知**：對留言按 reaction 時，發送站內通知給該留言作者（`comment.user_id`），排除自己的留言
- **新增 comment reaction Email 通知**：透過 BullMQ 排程發送 Email 給留言作者
- 新增對應的 `notification_preferences` 類型，讓使用者可控制這兩種通知的開關

## Non-goals

- 不處理三層以上留言（系統已禁止）
- 不修改留言的資料模型或 API 結構
- 不處理 push notification（N03 channel），僅處理站內（N01）與 Email（N02）
- 不重構現有的 practice/checkin reaction 通知邏輯

## Capabilities

### New Capabilities

- `comment-reply-notification`：第二層留言回覆時，通知被回覆者（站內 + Email）
- `comment-reaction-notification`：對留言按 reaction 時，通知留言作者（站內 + Email）

### Modified Capabilities

（無既有 spec 需修改）

## Impact

### 程式碼變更

- `daodao-server/src/services/comment.service.ts`：在 `createComment` 中新增 reply 通知邏輯（`parentId` 存在時通知 `parentComment.user_id`）
- `daodao-server/src/services/reaction.service.ts`：在 `upsertReaction` 中新增 `targetType === 'comment'` 的通知分支（目前只處理 practice 和 checkin）
- 新增 comment reply / comment reaction 的 Email template
- 可能新增對應的 BullMQ queue 與 worker，或擴充現有的 reaction-notification worker

### 通知系統

- `notification_events.type` 新增：`comment_reply`、`comment_reaction`（或複用 `reaction`）
- `notification_preferences` 新增對應 type 的預設設定

### 測試

- `comment.service.test.ts`：補充 reply 通知的 regression test
- 新增 comment reaction 通知的單元測試
