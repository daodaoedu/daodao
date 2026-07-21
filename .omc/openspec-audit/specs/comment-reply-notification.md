# comment-reply-notification
- 涉及 repo: daodao-server
- 對應 archived change: 2026-05-26-fix-nested-reply-notification
- 總計: 4 條 requirement / 8 個 scenario | ✅5 ⚠️2 ❓1

> 主要落差：spec 明定 comment_reply 的 priority 為 **P2**，但實作為 **P1**（comment.service.ts:197 priority:'P1'）。其餘欄位(type/recipientId/entityType/entityId/payload)皆符合。

## Requirement: 第二層回覆觸發站內通知給被回覆者 → ⚠️
證據: daodao-server:src/services/comment.service.ts:189-200 createEvent type 'comment_reply' recipientId=parentComment.user_id entityType 'comment' entityId=createdComment.id payload{content,parent_comment_id}
- 落差: spec 要求 priority P2，實作為 P1
- Scenario: 回覆他人留言 → ✅ — parentId && parentComment 時建立 comment_reply，recipient=parentComment.user_id
- Scenario: 回覆自己留言不建立 → ✅ — notificationEventService actorId===recipientId 過濾(notification-event.service.ts:50)
- Scenario: 被回覆者同時是內容擁有者收兩筆 → ✅ — comment.service.ts:178 'comment'(owner) 與 :191 'comment_reply' 為兩個獨立 createEvent，皆會建立

## Requirement: 第二層回覆觸發 Email 通知給被回覆者 → ✅
證據: daodao-server:src/queues/notification-email.worker.ts:47 EMAIL_CHANNEL='N01'；:60 comment_reply 在 INTERACTION_EVENT_TYPES；:164-180 依 notification_preferences N01 過濾，無記錄預設 true
- Scenario: 未關閉偏好→下次 digest 含此事件 → ✅ — digest 撈 P1+P2 事件(comment_reply 雖被標 P1 仍會撈)，prefMap 預設 true 則包含
- Scenario: 關閉 comment_reply N01→digest 不含 → ✅ — worker:174-180 prefMap.get(type) 為 false 時 filter 掉，站內通知不受影響

## Requirement: 回覆通知適用於所有 target type → ⚠️
證據: daodao-server:src/services/comment.service.ts comment_reply 不依 targetType 分支(在通用建立留言流程內)
- Scenario: 在 practice 上回覆 → ✅ — 通用流程，payload 含 practice_title/entity_external_id(notificationPayload)
- Scenario: 在 post 上回覆行為一致 → ❓ — 邏輯通用故應一致，但 pathSegmentMap 僅供 mention url 使用；comment_reply payload 不含 target-specific url，spec「payload 含 practice 相關資訊」對 practice 成立、對其他 type 內容視 notificationPayload 而定，未逐一驗證

## Requirement: comment_reply 註冊為可控制的通知類型 → ✅
證據: daodao-server:src/services/notification-preference.service.ts:18 'comment_reply' 在 ALL_NOTIFICATION_TYPES；getDefaultEnabled 預設 true
- Scenario: 通知設定頁顯示 comment_reply N01 開關預設啟用 → ✅ — ALL_NOTIFICATION_TYPES 含 comment_reply，預設 enabled(後端供應；前端開關依賴此清單)
