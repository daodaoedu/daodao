## 1. Comment Reply 站內通知

- [x] 1.1 在 `comment.service.ts` 的 `createComment` 中新增 reply 通知邏輯 [daodao-server]
  - 將 `parentComment` 變數提升到 `if (parentId)` block 外層（目前宣告在第 71 行的 block 內，通知邏輯在第 122+ 行存取不到）
  - 當 `parentId` 存在且 `parentComment` 有值時，呼叫 `notificationEventService.createEvent({ type: 'comment_reply', recipientId: parentComment.user_id, entityType: 'comment', entityId: createdComment.id, priority: 'P2', payload: { content, parent_comment_id: parentId } })`
  - 驗收：建立第二層回覆後，`notification_events` 表出現 type=comment_reply 的記錄，recipientId 為 parent comment 作者

- [x] 1.2 在 `notification-preference.service.ts` 的 `ALL_NOTIFICATION_TYPES` 加入 `comment_reply` [daodao-server]
  - 位置：第 15 行的 `ALL_NOTIFICATION_TYPES` 陣列
  - 驗收：前端通知設定頁面可顯示 comment_reply 類型的開關

- [x] 1.3 補充 `comment.service.test.ts` reply 通知的單元測試 [daodao-server]
  - 測試案例：回覆他人留言 → 觸發 comment_reply 通知
  - 測試案例：回覆自己留言 → 不觸發通知（actorId === recipientId）
  - 測試案例：被回覆者同時是內容擁有者 → 收到兩筆通知（comment + comment_reply）
  - 驗收：`pnpm test -- comment.service.test.ts` 全部通過

## 2. Comment Reaction 站內通知

- [x] 2.1 在 `reaction.service.ts` 的 `upsertReaction` 中新增 `targetType === 'comment'` 分支 [daodao-server]
  - 位置：第 66 行 `if (existing === null)` block 內，接在 `checkin` 分支後
  - 查詢 comment 取得 `user_id`（recipientId）、`target_type`、`target_id`（供 payload 使用）
  - 呼叫 `notificationEventService.createEvent({ type: 'reaction', entityType: 'comment', recipientId: comment.user_id, entityId: targetId, priority: 'P2', payload: { reactionType } })`
  - 驗收：對留言按 reaction 後，`notification_events` 表出現 type=reaction、entityType=comment 的記錄

- [x] 2.2 補充 comment reaction 站內通知的單元測試 [daodao-server]
  - 測試案例：對他人留言按 reaction（首次）→ 觸發通知
  - 測試案例：對自己留言按 reaction → 不觸發通知
  - 測試案例：更換 reaction 類型（existing !== null）→ 不觸發通知
  - 驗收：`pnpm test -- reaction.service.test.ts` 全部通過

## 3. 整合驗證

- [x] 3.1 確認 typecheck 與 lint 通過 [daodao-server]
  - `pnpm run typecheck` 無錯誤
  - `pnpm run lint` 無錯誤
  - 驗收：CI 檢查全部綠燈

- [ ] 3.2 端對端手動驗證 [daodao-server]
  - 驗證 comment reply → notification_events 出現 comment_reply 記錄
  - 驗證 comment reaction → notification_events 出現 reaction + entityType=comment 記錄
  - 驗證自我互動不觸發
  - 驗證 digest email worker 可正確撈取並發送這兩種新事件
  - 驗收：所有場景符合 spec 定義的行為
