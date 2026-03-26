## 1. 資料庫層

- [x] 1.1 在 `prisma/schema.prisma` 的 `users` model 新增欄位：`hide_connections_count Boolean @default(false)`
- [ ] 1.2 執行 `pnpm run prisma:migrate dev --name add_hide_connections_count` 產生 migration（需資料庫連線，請手動執行）
- [x] 1.3 執行 `pnpm run prisma:generate` 更新 Prisma client 型別

## 2. 後端 — 修正現有邏輯

- [x] 2.1 修正 `src/validators/user.validators.ts` 中 `personalSloganSchema`：將 `max(200)` 改為 `max(150)`，與前端和 PRD 對齊
- [x] 2.1b 在 `src/validators/user.validators.ts` 的 `updateUserSchema` 新增 `selfIntroduction: z.string().max(350).optional()`，確保後端也驗證 About Me 長度上限
- [x] 2.2 在 `user.service.ts` 的 `getOneUser` Prisma select 中加入 `user_profiles { bio }` 關聯（`user_profiles` 透過 `users.id` 一對一關聯），確認 API response 包含 `selfIntroduction` 欄位
- [x] 2.3 在 `src/types/user.types.ts` 的 `UpdateUserRequest` 新增 `hideConnectionsCount?: boolean`
- [x] 2.4 在 `src/validators/user.validators.ts` 的 `updateUserSchema` 新增 `hideConnectionsCount: z.boolean().optional()`
- [x] 2.5 確認 `updateMe` controller 正確將 `hideConnectionsCount` 寫入 `users.hide_connections_count`

## 3. 後端 — 新增 Profile 聚合查詢

- [x] 3.0 在 `src/routes/user.routes.ts` 新增路由 `GET /api/v1/users/profile/:identifier`（無需 auth，但若帶 JWT 則解析 viewerId），指向新的 `getUserProfile` controller handler
- [x] 3.1 在 `src/services/practice.service.ts` 新增函數 `getRecentPracticeCount(userId: number, days: number = 7): Promise<number>`，查詢 `practices` 表中 `user_id` 符合且 `created_at >= NOW() - INTERVAL` 的記錄數
- [x] 3.2 新增函數（可放在 `src/services/user.service.ts`）`getCommonCirclesCount(userId: number, viewerId: number): Promise<number>`，查詢 `user_join_group` 表中兩位使用者共同加入的 group 數量
- [x] 3.3 在新的 `getUserProfile` handler 中呼叫 `getRecentPracticeCount`，將結果加入 profile response（不修改現有 `getOneUser` / `getUserByCustomId`）
- [x] 3.4 在新的 `getUserProfile` handler 中，從 JWT 解析可選的 `viewerId`（已登入則計算，未登入則 `null`），呼叫 `getCommonCirclesCount` 並加入 response
- [x] 3.5 建立新的 profile response Zod schema，包含：`headline`（由 `personal_slogan` transform 映射）、`recentPracticeCount: z.number()`、`commonCirclesCount: z.number().nullable()`、`hideConnectionsCount: z.boolean()`、`connectionsCount: z.number().nullable()`
- [x] 3.6 在 profile endpoint 中，若 `users.hide_connections_count === true`，則回應中不回傳 `connectionsCount`（設為 `null`）

## 4. 前端 — API Client 更新

- [x] 4.1 更新 `packages/api` 中的 user response 型別，加入 `recentPracticeCount: number`、`commonCirclesCount: number | null`、`hideConnectionsCount: boolean`
- [x] 4.2 確認 `getUserByIdentifier` 函數會帶入目前登入使用者的 token（讓後端能計算 `commonCirclesCount`）

## 5. 前端 — 個人檔案頁增強

（頁面位於 `apps/product/src/app/[locale]/(with-layout)/users/[identifier]/page.tsx`）

- [x] 5.0 確認後端 `GET /api/v1/users/profile/:identifier` response 包含社群連結（`ig`、`discord`、`line`、`fb`、`threads`、`linkedin`、`github`、`website`），並在 profile 頁將其傳入 `UserInfoCard.socialLinks`
- [x] 5.1 在 `IslandHeader` 或對應元件中新增 **Headline（個人標語）** 欄位顯示，對應 `personal_slogan`；未填寫時不顯示
- [x] 5.2 將 About Me 區塊從純文字改為使用 `MarkdownRenderer` 元件（`packages/ui`）渲染 `selfIntroduction`；未填寫時不顯示整個區塊
- [x] 5.3 新增 **Connections 與 Followers 數量**顯示；若 `hideConnectionsCount === true` 則隱藏 connections count，顯示「—」
- [x] 5.4 新增**近期實踐次數**顯示元件（例如「近 7 天 N 次實踐」），資料來自 `recentPracticeCount`
- [x] 5.5 新增**共同 Circle**顯示（僅在已登入且非自己的頁面顯示，`commonCirclesCount > 0` 時才渲染）
- [x] 5.6 新增 **Connect / Follow 按鈕**佔位元件（已登入且非自己的頁面）：目前渲染靜態按鈕，待 `social-follow-connect` 完成後接入互動邏輯
- [x] 5.7 自己的個人檔案顯示「**編輯個人檔案**」按鈕，連結至 `/settings/public-info`；隱藏 Connect/Follow 按鈕

## 6. 前端 — 設定頁擴充

（頁面位於 `apps/product/src/app/[locale]/settings/public-info/page.tsx`）

- [x] 6.1 在 `settings/public-info/schema.ts` 的 `publicInfoFormSchema` 新增 `hideConnectionsCount: z.boolean().optional()`
- [x] 6.2 在 `PublicInfoForm` 或新的 `PrivacySection` 子元件中加入「**隱藏連結數**」Toggle Switch UI，含說明文字：「開啟後，其他人瀏覽你的個人檔案時將看不到你的連結數量」
- [x] 6.3 確認表單提交時 `hideConnectionsCount` 值透過 `PUT /api/v1/users/me` 正確送出並儲存

## 7. 頭像功能驗收

- [x] 7.1 端對端確認頭像上傳流程：`AvatarUploadSection` 呼叫 `POST /api/v1/images` 上傳後，將回傳 URL 透過 `PUT /api/v1/users/me` 寫回 `contacts.photo_url`，個人檔案頁即時顯示新頭像
- [x] 7.2 在頭像顯示元件加入 Fallback 邏輯：`contacts.photo_url` 為 null 或空字串時，顯示使用者姓名首字母作為佔位符（對應 `user-avatar-upload` spec 的「頭像顯示 Fallback」需求）
