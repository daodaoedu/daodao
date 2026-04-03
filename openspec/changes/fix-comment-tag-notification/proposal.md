## Why

留言中使用 @某人 提及其他使用者時，被提及者沒有收到通知。後端已有 mention 通知事件的建立邏輯（`comment.service.ts` 會建立 type='mention' 的 P1 notification event），但 `social/comment-input.tsx` 完全沒有 @mention 解析，不會傳送 `mentionedUserIds` 到 API，導致通知流程未被觸發。目前僅 practice detail 的 `CommentSection` 有完整的 mention 支援。

影響子專案：**f2e / server**

## What Changes

- 確認所有留言入口（不只 check-in reactions，還包括其他 comment UI）都有正確解析 @mention 並傳送 `mentionedUserIds`
- 確認後端 `POST /api/v1/comments` 正確接收並處理 `mentionedUserIds`
- 確認 notification event 正確建立且 worker 有處理 mention 類型事件
- 修復前端未傳送或後端未接收 `mentionedUserIds` 的斷點

## Non-goals

- 不改動通知系統的批次處理邏輯（hourly worker）
- 不新增 push notification 或 email 通知管道
- 不重構 comment 資料模型（DB `mentions` TEXT[] 欄位與 API `mentionedUserIds` 的不一致留待後續處理）

## Capabilities

### New Capabilities

（無新增 capability）

### Modified Capabilities

- `notification-events`：修正 @mention 通知事件的觸發流程，確保前後端正確串接

## Impact

- **daodao-f2e**: 所有使用留言功能的 comment UI 元件需確認 mention 解析與傳送邏輯
- **daodao-server**: `comment.service.ts` 的 mention 通知建立邏輯需驗證
- **API**: `POST /api/v1/comments` 的 `mentionedUserIds` 欄位處理
- **資料庫**: `notification_events` 表的 mention 事件寫入（無 schema 變更）
