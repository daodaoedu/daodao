## 1. 資料庫 Schema（daodao-storage）

- [x] 1.1 新增 `daodao-storage/schema/530_create_table_reactions.sql`（target_type, target_id, user_id, reaction_type, created_at；UNIQUE constraint on target_type+target_id+user_id）
- [x] 1.2 新增 `daodao-storage/schema/565_create_table_follows.sql`（follower_id, followee_type, followee_id, created_at；UNIQUE constraint）
- [x] 1.3 ~~新增 `575_create_table_connects.sql`~~ → 以既有 `connection_requests` 表替代。現有實作以互動次數門檻（< 3 次須填 intent）取代 `source` 欄位判斷，語義更精確；`context_practice_id` 已隱含「從實踐頁發起」語義，無需另建 connects 表。
- [x] 1.4 更新 `290_create_table_comments.sql`：`target_type` CHECK constraint 新增 `'practice'`；新增 `reaction_type VARCHAR(20)` 欄位（可為 NULL）
- [x] 1.5 確認 `comments.mentions TEXT[]` 與 `comments.visibility DEFAULT 'public'` 已正確存在於 SQL

## 2. Prisma Schema 同步（daodao-server）

- [x] 2.1 在 `prisma/schema.prisma` 新增 `reactions` model（對應 1.1）
- [x] 2.2 在 `prisma/schema.prisma` 新增 `follows` model（對應 1.2）
- [x] 2.3 ~~新增 `connects` Prisma model~~ → 對應 1.3，以既有 `connection_requests` model 替代，已有 UNIQUE + index。
- [x] 2.4 更新 `prisma/schema.prisma` `comments` model：新增 `reaction_type String?`；補 `mentions String[]`；修正 `visibility` default 為 `"public"`
- [x] 2.5 執行 `pnpm run prisma:generate` 確認型別編譯無誤

## 3. 後端型別與基礎設施（daodao-server）

- [x] 3.1 更新 `src/types/comment.types.ts`：`CommentTargetType` 新增 `'practice'`
- [x] 3.2 更新 `src/services/id-converter.service.ts`：新增 `'practice'` 的 `EntityType` 解析邏輯（對應 `practices` 表）
- [x] 3.3 新增 `src/types/reaction.types.ts`（ReactionType const、ReactionTargetType、API 回應型別）
- [x] 3.4 新增 `src/types/social.types.ts`（FollowType、ConnectStatus、ConnectSource 等）
- [x] 3.5 建立 `src/queues/social-notification.worker.ts`，定義事件類型：`follow.user`、`follow.practice_checkin`、`follow.practice_update`、`connect.request`、`connect.accepted`、`connect.partner_checkin`、`connect.partner_update`、`mention`

## 4. Quick Reactions API（daodao-server）

- [x] 4.1 新增 `src/services/reaction.service.ts`：實作 `upsertReaction`（UPSERT）、`removeReaction`、`getReactionsByTarget`（含聚合計數與當前用戶狀態）
- [x] 4.2 新增 `src/validators/reaction.validators.ts`（Zod schema for target_type('practice'), target_id, reaction_type）
- [x] 4.3 新增 `src/controllers/reaction.controller.ts`
- [x] 4.4 新增 `src/routes/reaction.routes.ts`，endpoints：`POST /api/v1/reactions`（upsert）、`DELETE /api/v1/reactions`（remove）、`GET /api/v1/reactions?target_type=&target_id=`
- [x] 4.5 ~~新增 `src/swagger/schemas/reaction.schemas.ts`~~ → 專案慣例是直接在 route 檔中以 `registry.registerPath()` 定義 OpenAPI schema，無獨立 schemas 目錄；已整合於 `src/routes/reaction.routes.ts`
- [x] 4.6 在 `src/app.ts` 掛載 reaction routes
- [x] 4.7 補充 `practice-interaction.service.ts` 的 `toggleLike` TODO：呼叫 reaction service

## 5. Comments 擴充（daodao-server）

- [x] 5.1 更新 `src/validators/comment.validators.ts`：`targetType` enum 新增 `practice`
- [x] 5.2 更新 `src/services/comment.service.ts`：新增 @mention 解析（`@custom_id` → `user_id`，存入 `mentions[]`）；觸發 mention 通知
- [x] 5.3 更新二層限制：在 `createComment` 中驗證 parent comment 不可再有 parent（防止第三層）
- [x] 5.4 新增 `GET /api/v1/comments?target_type=practice&target_id=` 查詢支援

## 6. Follow API（daodao-server）

- [x] 6.1 新增 `src/services/follow.service.ts`：`followTarget`（含私人實踐 403 檢查）、`unfollowTarget`、`getFollowees`、`getFollowers`
- [x] 6.2 新增 `src/validators/follow.validators.ts`
- [x] 6.3 新增 `src/controllers/follow.controller.ts`
- [x] 6.4 新增 `src/routes/follow.routes.ts`，endpoints：`POST /api/v1/follows`、`DELETE /api/v1/follows/:id`、`GET /api/v1/me/follows`、`GET /api/v1/users/:id/followers`
- [x] 6.5 ~~新增 `src/swagger/schemas/follow.schemas.ts`~~ → 同 4.5，已整合於 `src/routes/follow.routes.ts`
- [x] 6.6 在新打卡建立時（`practice-checkin` service）enqueue `follow.practice_checkin` 通知給所有關注此實踐的 followers
- [x] 6.7 在實踐內容更新時 enqueue `follow.practice_update` 通知給所有關注此實踐的 followers
- [x] 6.8 在用戶發送 Connect 請求時，enqueue `follow.user` 通知給所有關注該用戶的 followers（PRD：「找 buddy 時通知」）

## 7. Connect API（daodao-server）

- [x] 7.1 新增 `src/services/connect.service.ts`（以 `connection.service.ts` 實作：`sendRequest`、`respondToRequest`、`withdrawRequest`、`disconnectUser`、`getConnections`）
- [x] 7.2 新增 `src/validators/connect.validators.ts`（以 `connection.validators.ts` 實作）
- [x] 7.3 新增 `src/controllers/connect.controller.ts`（以 `connection.controller.ts` 實作）
- [x] 7.4 新增 `src/routes/connect.routes.ts`（以 `connection.routes.ts` 實作）
- [x] 7.5 新增 `src/swagger/schemas/connect.schemas.ts`（OpenAPI 定義整合於 connection.routes.ts）
- [x] 7.6 Connected 雙方更新通知：在新打卡或實踐更新時，enqueue `connect.partner_checkin` / `connect.partner_update` 通知給所有 accepted connect 的對方
- [x] 7.7 Privacy Bridge（Phase 2 預留）：新增 `canViewPrivatePractice(viewerUserId, ownerId)` 於 practice.service.ts；Phase 1 僅允許本人，Phase 2 擴充為 accepted connect 雙方

## 8. 前端：Reaction Bar（daodao-f2e）

- [x] 8.1 在 `packages/api/src/services/` 新增 `reaction.ts`（`useReactions` hook + `upsertReaction` + `removeReaction` mutation）
- [x] 8.2 在 `apps/product/src/constants/` 新增 `reaction-type.ts`（ReactionType const object + type）
- [x] 8.3 新增 `apps/product/src/components/practice/shared/reaction-bar.tsx`（四個反應按鈕，使用 `@daodao/ui` Button，顯示計數與選取狀態；支援桌面端點擊與行動端長按展開選單兩種互動模式）
- [x] 8.4 新增 `apps/product/src/components/practice/shared/reaction-aggregate-label.tsx`（「User A 與其他 N 人...」聚合顯示文字）
- [x] 8.5 將 `reaction-bar.tsx` 整合至 `apps/product/src/components/practice/shared/practice-overview-card.tsx` 底部

## 9. 前端：留言框聯動（daodao-f2e）

- [x] 9.1 新增 `apps/product/src/components/practice/shared/comment-input.tsx`（留言輸入框，支援 @mention dropdown）
- [x] 9.2 `CommentInput` 新增 `forwardRef` + `CommentInputHandle`，父層可呼叫 `.focus()` 聚焦留言框
- [x] 9.3 在 `packages/api/src/services/` 新增 `comment.ts` + `comment-hooks.ts`（`useComments` + `createComment` + `deleteComment`，target_type 支援 practice）
- [x] 9.4 新增 `apps/product/src/components/practice/shared/comment-list.tsx`（二層顯示：top-level + replies 展開）
- [x] 9.5 在 `packages/api/src/services/comment.ts` 新增 `useCommentParticipants` hook（`GET /api/v1/comments/participants?target_type=&target_id=`），前端 `@` 觸發時呼叫
- [x] 9.6 後端對應：在 `src/routes/comment.routes.ts` 新增 `GET /api/v1/comments/participants` endpoint，回傳該目標留言區所有參與用戶的 `custom_id` + `nickname`
- [x] 9.7 實作 `@custom_id` mention 觸發：輸入 `@` 時以 `useCommentParticipants` 資料顯示 dropdown

## 10. 前端：Follow / Connect（daodao-f2e）

- [x] 10.1 在 `packages/api/src/services/` 新增 `follow.ts`、`follow-hooks.ts`、`connection.ts`、`connection-hooks.ts`（對應 API hooks）
- [x] 10.2 新增 `apps/product/src/components/social/follow-button.tsx`（關注/取消關注按鈕）
- [x] 10.3 新增 `apps/product/src/components/social/connect-button.tsx`（含 Modal：從 user_page 填寫 reason；從 practice_page 直接送出）
- [x] 10.4 在用戶個人頁（`app/[locale]/users/[identifier]/`）加入 `UserSocialActions`（含 follow-button 與 connect-button）
- [x] 10.5 新增 `apps/product/src/components/practice/shared/follow-practice-button.tsx`，整合至實踐詳細頁
- [x] 10.6 新增管理頁：`settings/connections/page.tsx`（連結的夥伴）與 `settings/following/page.tsx`（關注設定）

## 11. 品質驗證

- [x] 11.1 後端執行 `pnpm run typecheck` 無錯誤（view-tracking.service.ts 4 個既有錯誤與本次無關）
- [x] 11.2 後端執行 `pnpm run lint` 無錯誤（剩餘 2 個既有 unused-vars 非本次引入）
- [x] 11.3 前端執行 `pnpm typecheck` 無錯誤（2 個既有錯誤非本次引入）
- [x] 11.4 前端執行 `pnpm check:fix` 通過
- [ ] 11.5 驗證 Swagger UI（`/api-docs`）reactions、follows、connects 新 endpoints 正確顯示
