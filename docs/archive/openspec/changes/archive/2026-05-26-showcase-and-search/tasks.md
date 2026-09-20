## 1. 資料庫遷移

- [x] 1.1 在 `prisma/schema.prisma` 的 `practices` model 新增 `privacy_status String @default("private") @db.VarChar(20)` 欄位，並加上 `@@index([privacy_status])`
- ~~1.2 新增 `practice_reactions` model~~ → **不需要**，直接沿用現有 `reactions` model（`target_type = 'practice'`，唯一鍵已為 `(target_type, target_id, user_id)`）
- [ ] 1.3 在 `prisma/schema.prisma` 的 `users` model 新增 `expo_push_token String? @db.VarChar(500)` 欄位（預留推播）
- [x] 1.4 在 `daodao-storage/migrate/sql/` 新增遷移腳本（`020_add_practices_privacy_status.sql`）；在 `daodao-storage/schema/410_create_table_practices.sql` 補入 `privacy_status` 欄位（完整 schema）
- [x] 1.5 執行 `pnpm run prisma:generate` 更新 Prisma client 型別

## 2. AI Backend — 擴充 `/api/v1/users/practices` 回傳欄位

靈感 Tab 使用 AI backend 現有路由，需擴充回傳資料：

- [x] 2.1 在 AI backend 的 `/api/v1/users/practices` 回傳的每筆練習加入 `privacy_status` 欄位（`private | public | delayed`）
- [x] 2.2 在 AI backend 的 `/api/v1/users/practices` 回傳加入 `reactions` 欄位（`IReactionCount[]`，結構：`{ type, count, latestActorName }`），聚合自 `reactions` 表（`target_type = 'practice'`，GROUP BY `reaction_type`，`latestActorName` 取最新一筆的 user display_name）
- [x] 2.3 在 AI backend 過濾邏輯加入隱私條件：排除 `privacy_status = 'private'` 的練習；排除 `status IN ('draft', 'not_started', 'archived')` 的練習（`status` 過濾已部分實作，需補 `privacy_status` 條件）
- [x] 2.4 在 AI backend 實作 Brewing Card 分流：`privacy_status = 'delayed' AND status = 'active'` 時回傳 `is_brewing: true` 且排除 check-in 心得內容；其餘情況回傳完整打卡摘要（截斷至 200 字）
- [x] 2.5 確認 AI backend 搜尋索引不包含 `privacy_status = 'delayed'` 練習的 check-in 內容
- [x] 2.6 更新 `packages/api/src/ai-types.ts` 以反映新回傳欄位（`privacy_status`、`reactions`、`is_brewing`）

## 3. Node.js Backend — 隱私狀態設定 API

（原搜尋 / 篩選任務已由 AI backend 承接，此節改為隱私狀態 API）

- [x] 3.1 在現有 practice update validator（`src/validators/practice.validators.ts`）加入 `privacy_status` 可選欄位，允許值為 `'private' | 'public' | 'delayed'`
- [x] 3.2 在現有 practice service 的更新邏輯（`src/services/practice.service.ts`）加入 `privacy_status` 更新支援；確認只有練習擁有者可修改
- [x] 3.3 確認現有 `PATCH /api/v1/practices/:id` 路由已涵蓋此欄位更新

## 4. 後端 — 反應互動 API（`/like` 改名為 `/react`）

> `toggleLike` 邏輯已實作完整（接受 `reactionType`，使用 `reactions` table toggle），只需改路由名稱與補 Zod 驗證。

- ~~4.1 實作 `toggleReaction` 取代 `toggleLike`~~ → **不需要**，`toggleLike` 已接受 `reactionType` 參數並正確 toggle
- ~~4.2 移除 `toggleLike` stub~~ → **不需要**，已有完整實作
- [x] 4.3 在 `src/types/reaction.types.ts` 補充 `encourage`、`sameHere` 至 `REACTION_TYPE_VALUES`（目前只有 `useful | fire | touched | curious`，缺少前端使用的 6 種中的 2 種）
- ~~4.4 新增 `POST /:id/react` 路由~~ → **不需要**，前端改用現有通用路由 `POST /api/v1/reactions`（body：`{ targetType: 'practice', targetId: UUID, reactionType }`）；`showcase-hooks.ts` 已更新
- [x] 4.5 建立 `src/queues/reaction-notification.queue.ts`，實作反應通知的 BullMQ job（delay 1 小時、以 `practice_id` 為 job ID 確保同一練習在佇列中只有一筆，達到合併效果）
- [x] 4.6 建立 `src/queues/reaction-notification.worker.ts`，消費 job 後：(1) 確認練習 `privacy_status = 'delayed'`；(2) 確認通知對象不是反應者本人（`practice.user_id !== actorUserId`）；(3) 觸發反應通知 email 給練習擁有者
- [x] 4.7 在 `src/services/email/` 新增反應通知 email 模板（`reaction-notification-template.ts`），沿用現有 base template，顯示「有 N 人對你的練習加油了」

## 5. 後端 — 安全性修正（審查發現）

## 6. 後端 — 安全性修正（審查發現）

- [x] 6.1 修正 `src/routes/practice.routes.ts` 中 `/stats` 路由，將 `optionalAuth` 改為 `authenticate`，並在 controller 驗證 `userId` 只能查詢自身
- [x] 6.2 在 `src/routes/practice.routes.ts` 中 `GET /user/:userId` 路由的 service 層加入 `privacy_status = 'private'` 過濾，確保公開請求不回傳私人練習（依賴 1.1）

## 7. 前端 — 靈感頁（Web）

- [x] 7.1 在 `apps/product/src/app/[locale]/(with-layout)/` 新增 `showcase/page.tsx`，作為靈感頁 Feed 進入點；頁面含「靈感」與「我的」兩個子 Tab
- [x] 7.2 在 Sidebar 元件新增「靈感」導覽項目（icon 待定），指向 `/showcase`
- [x] 7.3 在 `packages/api/src/services/` 新增 `showcase-hooks.ts`：以 `useInfiniteQuery` 封裝 AI backend 的 `GET /api/v1/users/practices`（`ai-types.ts`，無限捲動）；以 `useMutation` 封裝 Node.js backend 的 `POST /api/v1/practices/{id}/react`（取代原 `/like`，`types.ts`）
- [x] 7.4 建立 `apps/product/src/components/showcase/PracticeShowcaseCard.tsx`：Full Access Card，顯示狀態徽章、日期區間（`YYYY/MM/DD ▶ YYYY/MM/DD`）、標題、頭像、行動描述、頻率資訊（以品牌色呈現 `X-Y 天/週 Z 分鐘/次`）、反應聚合列（前兩名 emoji + `latestActorName`「與其他 N 人」，複用 `IReactionCount` 型別）、留言數（💬 N）、三點選單（...），移除打卡按鈕
- [x] 7.5 建立 `apps/product/src/components/showcase/BrewingCard.tsx`：打卡區域套用毛玻璃樣式，顯示「內容醞釀中，完成後解鎖！」提示文字；同樣顯示頻率資訊與反應聚合列
- [x] 7.6 實作無限捲動 Feed 列表（`IntersectionObserver` 或 `react-intersection-observer`）
- [x] 7.7 實作反應按鈕點擊交互（樂觀更新 optimistic update），點擊後即時更新 `reactions` 陣列；複用 `social/reaction-bar.tsx` 的 `ReactionBar` 元件與 `ReactionType` enum（`apps/product/src/constants/reaction-type.ts`）

## 8. 前端 — 搜尋與篩選 UI（Web）

- [x] 8.1 建立 `apps/product/src/components/showcase/ShowcaseSearchBar.tsx`：單一搜尋框，聚焦時呼叫 AI backend `GET /api/v1/users/practices/suggestions` 顯示搜尋建議（trending keywords + interest tags）
- [x] 8.2 建立 `apps/product/src/components/showcase/ShowcaseFilterBar.tsx`：點擊搜尋後展開，支援標籤多選、實踐週期（7/14/21/30 天，對應 `duration_min/max`）、狀態（進行中/已完成）篩選
- [x] 8.3 將搜尋/篩選狀態以 URL query params 管理，對應 AI backend 參數名：`keyword`、`tags[]`、`duration_min`/`duration_max`、`status`
- [x] 8.4 實作空狀態 UI，顯示「目前還沒有人實踐這個主題，你想成為第一個領航者嗎？」引導文案

## 9. 前端 — 隱私設定 UI（Web）（C1 新增）

- [x] 9.1 在練習建立流程（`practices/create/`）加入隱私狀態選擇步驟，選項：私人（預設）、即時公開、完成後分享（延遲）
- [x] 9.2 在練習編輯頁（`practices/[id]/edit/`）加入隱私狀態切換器，呼叫 `PATCH /api/practices/:id` 更新 `privacy_status`
- [x] 9.3 在收成完成頁（`practices/[id]/summary/`）加入「公開至廣場」快速開關（即設定 `privacy_status = 'public'`）

## 10. 前端 — 收成完成 Toast

- [x] 10.1 在 `practices/[id]/` 練習完成流程中，偵測練習 `privacy_status` 為 `public` 或 `delayed` 時，顯示「你的實踐打卡內容已公開」toast
- [x] 10.2 實作「永久關閉」功能：呼叫後端儲存 `user_preferences`，之後不再顯示（`GET /api/me/preferences` 及 `PATCH` 更新）

## 11. 前端 — 靈感頁（Mobile）

- [ ] 11.1 在 `apps/mobile/app/(tabs)/` 新增 `showcase.tsx` Tab 頁面，含「靈感」與「我的」子 Tab 切換
- [ ] 11.2 建立 `apps/mobile/components/showcase/PracticeShowcaseCard.tsx`（Mobile 版卡片）：顯示狀態徽章、日期區間、標題、頭像、行動描述（截斷）、頻率資訊（以品牌色呈現）、emoji 反應列（🔥/❤️ + `cheer_display`）、留言數（💬 N）、三點選單（...），移除打卡按鈕
- [ ] 11.3 實作 Mobile 版搜尋框（使用 Expo 的 `TextInput` + `FlatList`）；搜尋建議呼叫 AI backend `GET /api/v1/users/practices/suggestions`；Feed 與篩選使用 AI backend `GET /api/v1/users/practices`
- [ ] 11.4 實作 Mobile 版反應互動（haptic feedback）；呼叫 Node.js backend `POST /api/v1/practices/{id}/react`；點擊後即時更新卡片的反應聚合列顯示；共用 `ReactionType` enum 與 `IReactionCount` 型別
- [ ] 11.5 在 Mobile 練習建立/編輯流程加入隱私狀態選擇（`private` / `public` / `delayed`）

## 12. 測試

- [ ] 12.1 後端單元測試：AI backend `get_practices()` — 驗證 `delayed + active` 不回傳打卡內容（Brewing Card）
- [ ] 12.2 後端單元測試：AI backend `get_practices()` — 驗證 `delayed + completed` 回傳完整打卡內容（Full Access Card，非 Brewing）
- [ ] 12.3 後端單元測試：`toggleLike` — 驗證同一 `(target_type, target_id, user_id)` 重複呼叫為 toggle（不重複計數）
- [ ] 12.4 後端單元測試：reaction notification worker — 驗證練習擁有者對自己的練習反應時，worker 不發送通知
- [ ] 12.5 後端整合測試：搜尋隱私安全 — 使用延遲分享打卡心得關鍵字搜尋，確認無結果
- [ ] 12.6 後端整合測試：組合篩選 — `tags=ai&status=active&duration=7` 精確性驗證（使用 slug 查詢）
- [ ] 12.7 後端整合測試：`/api/v1/users/practices` 不含 `private` 或 `draft` 練習
- [ ] 12.8 後端整合測試：`privacy_status` 從 `private` 更新為 `public` 後，練習立即出現在廣場 Feed
- [ ] 12.9 前端元件測試：`BrewingCard` 不渲染打卡內容
- [ ] 12.10 前端 E2E：使用者 A 對延遲分享練習反應 → 使用者 B（練習擁有者）收到通知 email
