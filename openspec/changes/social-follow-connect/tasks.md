## 1. 資料庫：修改現有表格

- [x] 1.1 修改 `290_create_table_comments.sql`：在 `target_type` CHECK 約束中加入 `'practice'`
  > ✅ 已完成（`daodao-storage/schema/290_create_table_comments.sql` 的 CHECK 約束已包含 `'practice'`，`mentions TEXT[]` 欄位也已存在）
- [x] 1.2 建立對應的 Prisma schema migration，更新 `comments` model 的 `target_type` enum
  > ✅ 已完成（`prisma/schema.prisma` 的 `comments` model 已正確對應）

## 2. 資料庫：建立新資料表

> ⚠️ **跨 change 衝突說明**：`notification-system` change 的 tasks 1.4/1.5 定義了較簡單的 `follows` 與 `connections` 單表設計，與本 change 的雙表設計不相容。本 change 的設計**取代**這兩項任務，notification-system 應依賴本 change 建立的資料表。同樣地，`social-interactions` change 的 tasks 1.2/1.3（follows/connects 表）也由本 change 取代，不需實作。

- [x] 2.1 建立 `daodao-storage/schema/565_create_table_follows.sql`（欄位：`id`, `follower_id`, `followee_id`, `target_type`[user/practice], `target_id`, `created_at`；唯一索引：follower_id + target_type + target_id；FK 均設 `ON DELETE CASCADE`）
- [x] 2.2 建立 `daodao-storage/schema/566_create_table_connection_requests.sql`（欄位：`id`, `requester_id`, `receiver_id`, `intent`[TEXT, max 50], `status`[pending/accepted/rejected], `context_practice_id`[nullable], `created_at`, `updated_at`；唯一索引：requester_id + receiver_id；FK 均設 `ON DELETE CASCADE`）
- [x] 2.3 建立 `daodao-storage/schema/567_create_table_connections.sql`（欄位：`id`, `user_a_id`, `user_b_id`, `connected_at`；唯一索引：user_a_id + user_b_id，並確保 a < b 防止重複；FK 均設 `ON DELETE CASCADE`）
- [x] 2.4 建立 `daodao-storage/schema/568_create_table_interaction_counts.sql`（欄位：`id`, `user_a_id`[較小 ID], `user_b_id`[較大 ID], `count`[DEFAULT 0], `updated_at`；唯一索引：`user_a_id + user_b_id`，確保 `user_a_id < user_b_id`；FK 均設 `ON DELETE CASCADE`）
- [x] 2.5 更新 Prisma schema：加入 `follows`、`connection_requests`、`connections`、`interaction_counts` 四個 model
- [x] 2.6 執行 `pnpm run prisma:generate` 更新 Prisma client types

## 3. 後端：關注系統 API

> ℹ️ 本節取代 `social-interactions` change 的 tasks 6.1–6.8，不需再執行那些任務。
> `id-converter.service.ts` 已支援 `'practice'` EntityType，無需修改。

- [x] 3.1 建立 `src/services/follow.service.ts`：實作 `followUser`、`unfollowUser`、`followPractice`、`unfollowPractice`、`getFollowers`、`getFollowing`；在 `followUser`/`followPractice` 中加入自我關注防護（`followerId === targetId` 時拋出 BadRequestError）
- [x] 3.2 建立 `src/controllers/follow.controller.ts`：實作對應的 request handler
- [x] 3.3 建立 `src/validators/follow.validators.ts`：Zod schema（followTarget、followQuery）
- [x] 3.4 建立 `src/routes/follow.routes.ts`：`POST /api/v1/follows`、`DELETE /api/v1/follows/:targetType/:targetId`、`GET /api/v1/users/:userId/followers`（支援 `page`/`limit`）、`GET /api/v1/users/:userId/following`（支援 `page`/`limit`），含 OpenAPI registry 定義
- [x] 3.5 在 `src/app.ts` 中註冊 follow routes

## 4. 後端：連結系統 API

> ℹ️ 本節取代 `social-interactions` change 的 tasks 7.1–7.7，不需再執行那些任務。

- [x] 4.1 建立 `src/services/interaction-count.service.ts`：實作 `increment(userA, userB)`（以 `min/max` 正規化後更新對稱 pair）、`getCount(userA, userB)`（查詢兩人之間的累計互動次數）
- [x] 4.2 在 `src/services/comment.service.ts` 的 `createComment` 方法中，呼叫 `interaction-count.service` 更新互動計數（僅當留言者與目標內容擁有者不同時；@ 標記對方也觸發計數）
- [x] 4.3 建立 `src/services/connection.service.ts`：實作 `sendRequest`（含自我連結防護、門檻判斷、信任豁免、並發請求自動合併邏輯）、`acceptRequest`、`rejectRequest`、`withdrawRequest`、`disconnect`、`getConnections`、`getPendingIncoming`、`getPendingOutgoing`、`isConnected`；所有涉及 `connections` 表的讀寫均以 `(min(a,b), max(a,b))` 正規化 ID
- [x] 4.4 建立 `src/controllers/connection.controller.ts`
- [x] 4.5 建立 `src/validators/connection.validators.ts`：Zod schema（sendRequestBody、connectionQuery）
- [x] 4.6 建立 `src/routes/connection.routes.ts`：`POST /api/v1/connections/request`、`PATCH /api/v1/connections/request/:requestId`、`DELETE /api/v1/connections/request/:requestId`、`DELETE /api/v1/connections/:userId`、`GET /api/v1/connections`（支援 `page`/`limit`）、`GET /api/v1/connections/requests/incoming`、`GET /api/v1/connections/requests/outgoing`，含 OpenAPI 定義
- [x] 4.7 在 `src/app.ts` 中註冊 connection routes

## 5. 後端：隱私橋接 API

- [x] 5.1 建立 `src/services/privacy.service.ts`：實作 `canAccessContent(requesterId, ownerId, visibility)` 函式，當 `visibility === 'connections_only'` 時查詢 `connections` 表
- [x] 5.2 在 `practices`、`posts` 等需要隱私控制的 service 中引用 `privacy.service`（先從 `practice.service.ts` 開始）

## 6. 後端：社交足跡 API

- [x] 6.1 在 `src/services/me.service.ts` 中新增 `getMyLearningFootprints`：查詢 `comments` 表（where `user_id = userId`，含已軟刪除實踐的標示），關聯 `practices` 取得實踐標題，支援 `page`/`limit` 分頁回傳
- [x] 6.2 在 `src/controllers/me.controller.ts` 新增對應 handler
- [x] 6.3 在 `src/routes/me.routes.ts` 新增 `GET /api/v1/me/footprints`，含 OpenAPI 定義

## 6.5 後端：用戶刪除時的關係清理

- [x] 6.5.1 確認 `daodao-storage/schema/565–568` 四張表的 FK 均設為 `ON DELETE CASCADE`（已於 2.1–2.4 中要求，此為驗收確認步驟）

## 7. 後端：通知整合

> ⚠️ **依賴說明**：通知系統（`notification-event.service.ts`、`notification_events` 表）由獨立的 `notification-system` change 負責實作（其 task 3.1）。本節任務**依賴 notification-system change 完成後**才能實作。
>
> **若 notification-system 尚未完成**：在 `follow.service.ts` 與 `connection.service.ts` 的對應位置留下 `// TODO: emit notification event` 標記，待 notification-system 完成後再補實。通知事件格式應遵循 notification-system design.md 的 `notification_events` 表結構。

- [x] 7.1 確認 `notification-system` change 的 task 3.1（`notification-event.service.ts`）已完成
  > ✅ `daodao-server/src/services/notification-event.service.ts` 已存在
- [x] 7.2 在 `follow.service.ts` 中，於關注成功後呼叫 `notification-event.service.createEvent` 觸發「被關注通知」（type: `follow.user`，priority: P2）
  > ✅ 已完成（`follow.service.ts:79,152` 已呼叫 `notificationEventService.createEvent`）
- [x] 7.3 在 `connection.service.ts` 中，於請求送出後觸發「收到連結請求通知」（type: `connect.request`，priority: P1），接受後觸發「連結已建立通知」（type: `connect.accepted`，priority: P1）
  > ✅ 已完成（`connection.service.ts:180,237` 已呼叫 `notificationEventService.createEvent`）

## 8. 前端：API Client 層

> ℹ️ 命名慣例對齊現有 `packages/api/src/services/` 目錄：`reaction.ts` + `reaction-hooks.ts` 的模式。

- [x] 8.1 在 `packages/api/src/services/` 新增 `follow.ts`：封裝關注相關 fetch 函式（followUser、unfollowUser、followPractice、unfollowPractice、getFollowers、getFollowing）
- [x] 8.2 在 `packages/api/src/services/` 新增 `follow-hooks.ts`：封裝對應的 SWR/React Query hooks
- [x] 8.3 在 `packages/api/src/services/` 新增 `connection.ts`：封裝連結請求相關 fetch 函式
- [x] 8.4 在 `packages/api/src/services/` 新增 `connection-hooks.ts`：封裝對應 hooks
- [x] 8.5 新增對應 TypeScript types（FollowTarget、ConnectionRequest、Connection），放至 `packages/api/src/types/` 或對應 types 目錄
- [x] 8.6 更新 `packages/api/src/services/index.ts` 匯出新增模組

## 9. 前端：社交互動元件

> ℹ️ 元件命名慣例對齊現有 `apps/product/src/components/social/` 目錄（如 `comment-input.tsx`），使用 **kebab-case**。

- [x] 9.1 建立 `apps/product/src/components/social/connect-modal.tsx`：顯示連結原因輸入框（max 50字）、帶入情境實踐名稱、送出/取消按鈕
- [x] 9.2 建立 `apps/product/src/components/social/follow-button.tsx`：關注/取消關注按鈕，支援 user 與 practice 兩種 target type
- [x] 9.3 建立 `apps/product/src/components/social/connect-button.tsx`：連結/等待回應/已連結 狀態切換，點擊時依門檻決定是否顯示 `connect-modal`
- [x] 9.4 更新 `apps/product/src/components/social/index.ts` 匯出新元件

## 10. 前端：用戶個人頁整合

- [x] 10.1 在用戶個人頁（`app/[locale]/(with-layout)/users/[identifier]/`）加入 `follow-button` 與 `connect-button`
- [x] 10.2 在個人頁新增「關注者」標籤頁，顯示 followers 列表

## 11. 前端：社交關係中心頁面

- [x] 11.1 建立頁面路由 `app/[locale]/(with-layout)/social/page.tsx`（目錄尚未存在，需新建）
- [x] 11.2 建立「連結」分頁：夥伴清單（含解除連結）、收到的請求（顯示頭像/原因/互動次數/接受或忽略）、發出的請求（含撤回）
- [x] 11.3 建立「關注」分頁：我關注的（人+實踐，含取消關注）、關注我的
- [x] 11.4 連結請求 pending 狀態置頂顯示，接受後平滑移動至夥伴清單（樂觀更新）

## 12. 前端：學習足跡頁面

- [x] 12.1 建立頁面路由 `app/[locale]/(with-layout)/me/footprints/page.tsx`（若 `me/` 目錄不存在則新建）
- [x] 12.2 實作足跡列表：顯示留言片段、實踐標題、對象頭像，按時間倒序
- [x] 12.3 點擊足跡跳轉至對應實踐頁面，若實踐已刪除顯示「內容已刪除」

## 13. 測試

- [x] 13.1 後端單元測試：`interaction-count.service` 的跨實踐累計計數邏輯
- [x] 13.2 後端單元測試：`connection.service` 的信任豁免門檻判斷（< 3 需填原因，≥ 3 跳過）
- [x] 13.3 後端整合測試：撤回連結請求後，雙方列表同步移除
- [x] 13.4 後端整合測試：解除連結後，`privacy.service` 的 `canAccessContent` 回傳 false
- [x] 13.5 後端整合測試：非連結用戶存取 `connections_only` 內容回傳 403
- [x] 13.6 後端整合測試：對話環（A留言→B回覆→A回覆）累計計數正確為 3
- [x] 13.7 後端單元測試：自我關注（follow self）與自我連結（connect self）均回傳錯誤
- [x] 13.8 後端整合測試：並發連結請求（A→B 與 B→A 同時）自動合併為連結，不產生雙 pending
- [x] 13.9 後端整合測試：B 在 A 的實踐留言 1 次 + A 在 B 的實踐留言 2 次，互動計數正確為 3（雙向累計）
- [x] 13.10 後端執行 `pnpm run typecheck` 無錯誤
- [x] 13.11 後端執行 `pnpm run lint` 無錯誤
- [x] 13.12 前端執行 `pnpm typecheck` 無錯誤
- [x] 13.13 前端執行 `pnpm check:fix` 通過
