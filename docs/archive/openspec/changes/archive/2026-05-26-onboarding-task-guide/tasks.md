## 1. Storage — 資料庫 Migration（daodao-storage）

- [x] 1.1 [daodao-storage] 新增 `migrate/sql/040_create_user_onboarding.sql`：建立 `user_onboarding` 表，欄位含 `id SERIAL PK`、`user_id INT REFERENCES users(id)`、`user_source VARCHAR(10)`、`task_states JSONB`、`email_states JSONB`、`creation_method VARCHAR(20)`、`badge_granted BOOLEAN`、`badge_granted_at TIMESTAMPTZ`、`completed_at TIMESTAMPTZ`、`days_to_complete INT`、`created_at`、`updated_at`；UNIQUE index on `user_id`。同時新增本 change 所需的 onboarding email type 常數至 `email_logs` 相關約束。驗收：`make migrate-sql-dev` 成功執行，無 SQL 錯誤。

- [x] 1.2 [daodao-server] Migration 後執行 `pnpm run prisma:introspect` + `pnpm run prisma:generate`，確認 `user_onboarding` model 寫入 `schema.prisma`，commit 產生的 schema 差異。驗收：`prisma generate` 無錯誤，TypeScript 可正確 import `UserOnboarding` type。

## 2. 後端 — Onboarding 核心服務（daodao-server）

- [x] 2.1 [daodao-server] 定義 `OnboardingTask` const enum（`A | B | C | D | E`）、`UserSource` const enum（`S1 | S2 | S3`）、各 source 的任務路由表，集中於 `src/types/onboarding.types.ts`。驗收：TypeScript 型別無 any，可正確匯出。

- [x] 2.2 [daodao-server] 新增 `src/utils/onboarding-source.ts`：實作 `deriveUserSource(referralSource: string, hasQuizResult: boolean): UserSource`，依 `referral_source` 值與測驗狀態推導 S1/S2/S3，fallback 為 S1。驗收：單元測試覆蓋三種 source 的推導邏輯。

- [x] 2.3 [daodao-server] 實作 `onboardingService`（factory pattern，參考 `user.service.ts` 風格）：`createOnboarding(userId, userSource)`、`getStatus(userId)`、`checkAndAdvance(userId, taskKey)`、`grantBadge(userId)`。`checkAndAdvance` 需於所有任務完成後自動呼叫 `grantBadge` 並寫入 `days_to_complete`。驗收：單元測試覆蓋各函式主路徑、idempotency（重複呼叫不改變已完成狀態）、badge 觸發條件。

- [x] 2.4 [daodao-server] 實作 S2 用戶任務 A 預完成：`createOnboarding` 收到 `userSource === S2` 時，預設 `task_states.A = 'done'`。驗收：S2 用戶建立 onboarding 後 `task_states.A` 為 `done`。

- [x] 2.5 [daodao-server] 在 `user.service.ts` 的 `createUser`（及 OAuth 路徑 `auth.service.ts` 的 Google/Apple 用戶建立）完成後，呼叫 `onboardingService.createOnboarding(userId, deriveUserSource(...))`。驗收：新用戶完成 Email 驗證後 DB 有對應 `user_onboarding` 記錄。

- [x] 2.6 [daodao-server] 新增 `GET /api/v1/onboarding/status`（需 auth），回傳 `taskList`（依 user_source 排序）、`completedTasks`、`badgeGranted`。使用 `@asteasolutions/zod-to-openapi` 定義 response schema，加入 OpenAPI registry。驗收：Zod schema 驗證回應格式，curl 測試可正確回應。

- [x] 2.7 [daodao-server] 實作 `withOnboardingHook(taskKey, handler)` wrapper，在 handler 成功後呼叫 `checkAndAdvance`，並將 `meta.onboardingUpdate` 附帶於 `ApiSuccessResponse`（擴展現有 `meta` 欄位）。驗收：wrapper 可泛用於任意 Express handler，`meta.onboardingUpdate` 含 `{ taskKey, allCompleted }` 欄位。

- [x] 2.8 [daodao-server] 在各業務 handler 套用 `withOnboardingHook`，對齊以下實際路由：
  - 任務 A：`POST /api/v1/quiz`（`quiz.controller.ts`）
  - 任務 B：`PUT /api/v1/users/me`（必填欄位完整性檢查後，`user.controller.ts`）
  - 任務 C：`POST /api/v1/practices`（`practice.service.ts` 建立流程）
  - 任務 D：`POST /api/v1/practices/:id/checkins`（第一次打卡判斷）
  - 任務 E：`POST /api/v1/comments`（需過濾 `target_type`，僅限「靈感」類型——待產品確認白名單值）

  驗收：各 handler 整合測試通過，任務狀態正確更新；重複觸發不改變已完成狀態。

- [x] 2.9 [daodao-server] 在 `POST /api/v1/practices` 接受 `creationMethod`（`self_created | copied | action_generator`），任務 C 完成時寫入 `user_onboarding.creation_method`。驗收：三種建立方式均可正確紀錄。

## 3. 後端 — Email 序列（daodao-server）

> Email 佇列與 Worker 全部在 daodao-server，對齊現有 `src/queues/practice-email.queue.ts` + `practice-email.worker.ts` 模式。daodao-worker 不涉及。

- [x] 3.1 [daodao-server] 在 `src/types/email/onboarding.types.ts` 定義 `OnboardingEmailJobData` Zod schema：`{ userId: number, emailType: 'L0' | 'A' | 'B' | 'C' | 'D' | 'E', userSource: UserSource }`。驗收：schema 可正確解析與拒絕無效 payload。

- [x] 3.2 [daodao-server] 新增 `src/services/email/onboarding-email.service.ts`：實作 L0 歡迎信（重用 `welcome-template.ts` 的 `generateWelcomeEmail()` 結構，依 `userSource` 切換 CTA），及 A–E 各任務對應的 email handler（可先使用 placeholder copy）。驗收：單元測試覆蓋 L0 三種 source 的 CTA 正確。

- [x] 3.3 [daodao-server] 新增 `src/queues/onboarding-email.queue.ts` + `onboarding-email.worker.ts`：queue 使用 `jobId = ${emailType}-${userId}` 達成冪等；worker handler 進入後讀取 `user_onboarding.email_states` 做二次防護，發送後更新 `email_states`；在 `server.ts` 的 `initializeBullMQ()` 中註冊新 queue。驗收：整合測試確認重複推送同一 jobId 只發送一次。

- [x] 3.4 [daodao-server] 在 `onboardingService.checkAndAdvance` 完成任務後，呼叫 `enqueueOnboardingEmail()` 推送對應 email job（依 user_source 決定觸發哪封，L0 於 `createOnboarding` 時觸發）。驗收：整合測試確認任務完成 → email job 被正確推入佇列，`email_states` 正確更新。

## 4. 前端 — Task Guide Widget（daodao-f2e / product app）

- [x] 4.1 [daodao-f2e] 建立 `OnboardingProgressContext`（命名避免與現有 `auth/onboarding/` 衝突）：以 `useSWR("/api/v1/onboarding/status")` 管理資料，提供 `taskList`、`completedTasks`、`badgeGranted` 與 SWR `mutate`；掛載至 `global-provider.tsx`。Widget 在 `isTemporary === true` 或 `badge_granted === true` 時不顯示。驗收：未登入時不發請求；登入後正確初始化；isTemporary 時 Context 不 render Widget。

- [x] 4.2 [daodao-f2e] 實作 `TaskGuideWidget` 浮動組件：Collapsed（懸浮圖示）與 Expanded（任務清單）兩種狀態，固定於右下角，z-index 不遮擋新增實踐按鈕。可參考現有 `packages/ui/src/components/animate-ui/components/radix/sheet.tsx` Sheet primitive。驗收：在首頁、實踐列表頁、靈感頁目視確認新增實踐按鈕未被遮擋。

- [x] 4.3 [daodao-f2e] 實作任務清單渲染：依 `user_source` 順序排列任務，已完成任務自動勾選，每個任務項目含對應頁面的 CTA 連結。驗收：S1/S2/S3 三種 source 各顯示正確順序與任務數量（S2 為 4 項，其餘 5 項）。

- [x] 4.4 [daodao-f2e] 實作 Widget 展開/收合邏輯：Onboarding 未完成時首次進入自動展開；用戶手動收合後本次 session 內不再自動展開（sessionStorage 記錄收合狀態）。驗收：收合後切換頁面不再自動展開；重新整理後重新展開。

- [x] 4.5 [daodao-f2e] 在 API mutation 回應中讀取 `meta.onboardingUpdate`，呼叫 `mutate("/api/v1/onboarding/status", optimisticData, { revalidate: false })` 做樂觀更新（對齊 `account-form.tsx` 的 SWR mutate 模式）。驗收：完成建立實踐後 Widget 即時勾選任務 C，無需刷新頁面。

## 5. 前端 — Badge UI（daodao-f2e / product app）

- [x] 5.1 [daodao-f2e] 實作 Badge 獲得畫面（需設計稿）：`checkAndAdvance` 後端回應 `allCompleted: true` 時，Widget 切換為「恭喜獲得 Early User Badge」展示，含 badge icon 與說明文字，動畫/轉場正確觸發，不顯示原任務清單。驗收：設計稿 ready 後實作；Badge icon asset 由設計師提供。

- [x] 5.2 [daodao-f2e] Badge 通知僅顯示一次：以 `badgeGranted` 判斷，已獲得 Badge 的用戶進入時 Widget 不顯示（已在 4.1 gating 邏輯涵蓋）。驗收：重新整理或重新登入後 Widget 不再出現。
