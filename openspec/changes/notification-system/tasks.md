## 1. 資料庫 Schema

- [x] 1.1 新增 SQL migration：建立 `notification_events` 表（id, type, actor_id, recipient_id, entity_type, entity_id, payload jsonb, priority P1/P2/P3, processed_at, created_at）→ `014_create_notification_tables.sql`
- [x] 1.2 新增 SQL migration：建立 `notifications` 表（id, recipient_id, actor_id, type, entity_type, entity_id, priority, is_read, aggregation_key, aggregation_count, payload jsonb, created_at, batch_sent_at）→ `014_create_notification_tables.sql` + `019_add_payload_to_notifications.sql`
- [x] 1.3 新增 SQL migration：建立 `notification_preferences` 表（id, user_id, notification_type, channel N01/N02/N03, is_enabled, updated_at）→ `014_create_notification_tables.sql`
- [x] 1.4 `follows` 表已存在（target_type: 'user'/'practice'，target_id）
- [x] 1.5 `connection_requests` + `connections` 表已存在
- [x] 1.7 新建 `practice_buddy_requests` 表（id, requester_id, receiver_id, practice_id, status pending/accepted/ignored, created_at, updated_at）→ `018_create_table_practice_buddy_requests.sql`
- [x] 1.6 執行 `npx prisma generate` 更新 Prisma Client 型別 ✅

## 2. 事件觸發埋點（後端服務整合）

- [x] 2.1 在 `comment.service.ts` 的建立留言邏輯中，呼叫 `notification-event.service` 寫入 P1 Comment 事件（含 @ 提及解析）
- [x] 2.2 在 `practice-interaction.service.ts` 的 toggleLike 中，呼叫 `notification-event.service` 寫入 P2 Reaction 事件（待 reaction 功能完整實作後自動生效）
- [x] 2.3 `follow.service.ts` 已存在：followUser → P2 UserFollowed；followPractice → P2 PracticeFollowed（recipient 為實踐擁有者）
- [x] 2.4 `follow.routes.ts` + `follow.controller.ts` 已存在
- [x] 2.5 `connection.service.ts` 已存在：sendRequest → P1 Connect（payload 含 intent、connection_request_id）；acceptRequest → P1 ConnectAccepted
- [x] 2.6 `connection.routes.ts` + `connection.controller.ts` 已存在
- [x] 2.9 建立 `buddy-request.service.ts`：發送時 (a) P1 BuddyRequest 給被請求方；(b) P1 BuddyRequestFollower fan-out 給請求者的追蹤者；接受時 P1 BuddyAccepted
- [x] 2.10 建立 `buddy-request.routes.ts` + `buddy-request.controller.ts`：`POST /api/v1/practices/:id/buddy-requests`、`PATCH /api/v1/buddy-requests/:id`、`GET /api/v1/buddy-requests`
- [x] 2.7 在 `practice.service.ts` 的開始實踐邏輯中，查詢 follows 並批次寫入 P1 PracticeStarted 事件
- [x] 2.8 在 `practice-checkin.service.ts` 的打卡邏輯中，查詢 follows 並寫入 P2 PracticeCheckin 事件

## 3. 通知事件核心服務

- [x] 3.1 建立 `notification-event.service.ts`：提供 `createEvent()` 方法，寫入 `notification_events` 表，重複事件防護（1 分鐘內相同 type+actor+entity 不重複寫入）
- [x] 3.2 在 `notification-event.service.ts` 中加入自我互動過濾（actor === recipient 時不寫入）

## 4. BullMQ 排程批次工作

- [x] 4.1 建立 `notification.queue.ts`：定義 In-App 批次 queue（repeatable，每小時整點）與 Email 批次 queue（repeatable，08:00/12:00/16:00/20:00）與週報 queue（repeatable，週日 20:00 UTC+8）
- [x] 4.2 建立 `notification-inapp.worker.ts`：每小時整點查詢 `notification_events`（`processed_at IS NULL`，P1+P2，上限 5000 筆），寫入 `notifications` 表，更新 `processed_at`
- [x] 4.3 在 `notification-inapp.worker.ts` 中實作 P2 聚合邏輯：同一 entity 在同批次相同類型事件合併為一則，計算 `aggregation_count`
- [x] 4.4 建立 `notification-email.worker.ts`：每 4 小時查詢週期內的 P1+P2 事件，依 recipient 分組，過濾 `notification_preferences`，呼叫 email template（MVP：console.log subject）
- [x] 4.5 建立 `notification-weekly.worker.ts`：週報批次，UTC+8 週一~週日統計，無活動則跳過，呼叫 weekly template
- [x] 4.6 在 `queues/index.ts` 中匯出以上 queue 與 worker；`server.ts` 中初始化並啟動

## 5. 通知偏好設定 API

- [x] 5.1 建立 `notification-preference.service.ts`：`getPreferences(userId)` 回傳用戶所有偏好設定（含預設值），`updatePreference()` 更新單項設定，`setGlobalEnabled()` 全局開關（僅更新 N01/N03，不動 N02）
- [x] 5.2 建立 `notification.routes.ts` + `notification.controller.ts`：
  - `GET /api/v1/notifications/preferences`
  - `PUT /api/v1/notifications/preferences`（批次更新 + globalEnabled 全局開關）
  - `GET /api/v1/notifications`（列出 In-App 通知，P1 置頂，`?cursor=<id>&limit=20` cursor-based 分頁，含 unreadCount）
  - `PATCH /api/v1/notifications/:id/read`（標記已讀）
  - `PATCH /api/v1/notifications/read-all`（全部已讀）
- [x] 5.3 email worker 發送前查詢 `notification_preferences` 過濾 N01 設定

## 6. Email 模板

- [x] 6.1 建立 `notification-digest-template.ts`：互動摘要 Email 模板，P1 區塊（重要連結與討論）在前，P2 區塊（共鳴回饋）在後，情感化文案（島嶼探索語境）
- [x] 6.2 建立 `notification-weekly-template.ts`：週報 Email 模板，含本週讚數、留言數、新追蹤者數、連結數、主題實踐進度摘要
- [x] 6.3 所有通知 Email 模板的 Footer 包含退訂連結與「前往通知設定」連結
- [x] 6.4 建立 `notification-unsubscribe.service.ts`：產生 signed JWT unsubscribe token（userId + notificationType + purpose + exp 90天），驗證 token 並更新 `notification_preferences`

## 7. Email 退訂 API

- [x] 7.1 新增路由 `GET /api/v1/notifications/unsubscribe?token=<jwt>`（公開路由，附 strictLimiter）：驗證 token，更新偏好設定，回傳退訂成功 HTML 頁面
- [x] 7.2 在 token 過期時回傳友善提示 HTML 並附上「前往設定頁」連結

## 8. 前端：通知中心 UI

- [x] 8.1 `NotificationBell`（鈴鐺圖示）整合在 Sidebar，顯示動態未讀數 badge（useUnreadNotificationCount hook）
- [x] 8.2 `NotificationList`：渲染 `notifications` API 回傳資料，P1 置頂，顯示 aggregation_count，已讀/未讀樣式區分
- [x] 8.3 點擊通知觸發已讀 API（`PATCH /notifications/:id/read`）
- [x] 8.4 `notification-item.tsx` 支援所有 entity_type 的文案顯示（含 buddy_request、buddy_accepted、follow-practice 等）
- [x] 8.4a 留言 hash 跳轉：`#comment-{id}` smooth scroll + 2 秒高亮（待頁面元件整合）
- [x] 8.4b 留言已刪除降級：toast 提示「此留言已被刪除」（待頁面元件整合）
- [x] 8.5 在 Sidebar（desktop + mobile）整合 NotificationBell + 動態 unreadCount badge
- [x] 8.6 SWR polling 每 5 分鐘 + 頁面 focus 時 revalidate

## 9. 前端：通知設定頁面

- [x] 9.1 建立通知設定頁面 `/settings/notifications`：全局開關 + 各類型分項控制（N01 Email / N03 Push，N02 In-App 固定開啟）
- [x] 9.2 對應 API hooks：`useNotificationPreferences`（GET）、`useUpdateNotificationPreferences`（PUT）+ Optimistic UI
- [x] 9.3 設定頁面包含「前往通知設定」連結入口，退訂 Email 跳轉可使用

## 10. 連結請求前端

- [x] 10.1 連結請求 In-App 通知顯示「連結初衷」摘要（從 `payload.connectMessage` 取得）
- [x] 10.2 連結請求通知中加入「接受」與「忽略」快速操作按鈕（呼叫 `PATCH /api/v1/connections/:id`，payload 含 connection_request_id）
- [x] 10.3 Buddy 請求 In-App 通知顯示對應的主題實踐名稱（從 `payload.practice_title` 取得）
- [x] 10.4 Buddy 請求通知中加入「接受」與「忽略」快速操作按鈕（呼叫 `PATCH /api/v1/buddy-requests/:id`）

## 11. OpenAPI Schema 更新

- [x] 11.1 在 Swagger 定義中新增 notifications（含 cursor 分頁、unreadCount）、notification_preferences、follows（含 following_type）、connections、buddy-requests 的相關 schema 與路由文件
- [x] 11.2 執行 `pnpm generate` 更新前端 `packages/api` 的自動生成型別

## 12. 測試

- [ ] 12.1 驗證留言事件：用戶 A 留言給用戶 B → notification_events 寫入 P1 記錄 → 下一批次 notifications 寫入 → In-App 顯示
- [ ] 12.2 驗證 P2 聚合：4 人在 1 小時內對同一文章按讚 → 通知顯示「A 與其他 3 人按了讚」
- [ ] 12.3 驗證 4 小時 Email 批次：09:15 留言 + 11:30 按讚 → 12:00 Email 同時出現
- [ ] 12.4 驗證偏好設定即時生效：關閉 Reaction Email → 後續 Reaction 事件不進入 Email 批次
- [ ] 12.5 驗證退訂連結：點擊 Email 退訂連結 → 不需登入 → preferences 更新 → 下一批次不發送
- [ ] 12.6 驗證冪等性：批次 worker 重啟後不重複寫入已 `processed_at` 的事件
- [ ] 12.7 驗證自我互動過濾：用戶對自己的內容按讚不產生通知
- [ ] 12.8 驗證主題實踐被關注通知：用戶 A 關注主題實踐 P → 實踐擁有者 B 收到 P2 PracticeFollowed In-App 通知
- [ ] 12.9 驗證 Buddy 請求追蹤者 fan-out：用戶 A 發送 Buddy 請求 → 被請求方收到 P1 通知 + A 的所有追蹤者各自收到 P1 fan-out 通知
- [ ] 12.10 驗證通知中心分頁：API 預設回傳 20 筆，cursor 帶入後回傳下一頁
