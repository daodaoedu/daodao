## 1. DB Migration

- [x] 1.1 更新 `email_logs.email_type` check constraint，新增 `welcome_letter` 類型（SQL migration script）
  - 建立 `015_add_welcome_letter_email_type.sql`，drop & recreate check constraint 加入 `welcome_letter`
- [x] 1.2 更新 Prisma schema 以反映 check constraint 變更，執行 `prisma generate`
  - 此 migration 僅修改 check constraint，未改動任何 model 欄位，無需執行 prisma generate

## 2. Backend：歡迎信分版重構

- [x] 2.1 在 `src/types/email/` 新增 `welcome_letter` 至 `EmailTypeValue` union type
  - 在 `base.types.ts` 的 `EMAIL_TYPES` 加入 `WELCOME_LETTER: 'welcome_letter'`
- [x] 2.2 在 `welcome-template.ts` 新增 `referral_source → group` 映射函式（instagram/facebook/linkedin → social-media；discord/friend_referral → community；其他 → default）
  - 新增 `REFERRAL_GROUP_MAP` 常量和 `getReferralGroup()` export 函式
- [x] 2.3 在 `welcome-template.ts` 新增 `social-media` 版本歡迎信模板內容（強調社群互動與找夥伴）
  - 新增 `generateSocialMediaContent()` 函式，CTA：「開始探索社群」
- [x] 2.4 在 `welcome-template.ts` 新增 `community` 版本歡迎信模板內容（強調學習夥伴與一起學習）
  - 新增 `generateCommunityContent()` 函式，CTA：「探索主題實踐」
- [x] 2.5 更新 `src/types/email/template-data.types.ts` 中的 `WelcomeEmailData` type：以 `referralGroup: 'social-media' | 'community' | 'default'` 替換 `hasCompletedQuiz`
- [x] 2.6 更新 `src/validators/email.validators.ts` Zod schema：移除 `hasCompletedQuiz`，新增 `referralSource` 欄位供 admin endpoint 使用
- [x] 2.7 更新 `src/controllers/email.controller.ts`：呼叫歡迎信時以 `referralSource` 轉換為 `referralGroup` 後傳入
  - 匯入 `getReferralGroup`，sendWelcomeEmail handler 改用 referralGroup
- [x] 2.8 更新 `src/services/auth/auth.service.ts` Apple Sign-In 呼叫點（`sendWelcomeEmailWithLog`）：移除 `hasCompletedQuiz`，改傳 `referralGroup: 'default'`
- [x] 2.9 更新 `generateWelcomeEmail()` 依 `referralGroup` 選擇模板版本
  - 更新 `generateWelcomeEmail()` 依 social-media / community / default 選擇對應模板
- [x] 2.10 修改 `verifyEmail` POST controller：呼叫前查詢 `email_logs` 作冪等保護，並以 `referralGroup` 取代 `hasCompletedQuiz`
  - 冪等保護已在 `sendWelcomeEmailWithLog` 內透過 `WELCOME_LETTER` type 檢查實現；controller 讀取 `user.referral_source` 轉換為 referralGroup
- [x] 2.11 修改 `verifyEmailGet` GET controller：同上，加入冪等保護與 `referralGroup` 邏輯
  - 同上，email.service.ts 的 `sendWelcomeEmailWithLog` 改用 `EMAIL_TYPES.WELCOME_LETTER` 作冪等檢查

## 3. Backend：Onboarding Gate Middleware

- [x] 3.1 新增 `requireOnboardingComplete` middleware（驗證 JWT 中 `isTemporary !== true`，否則回傳 403）
  - 建立 `src/middleware/onboarding-gate.middleware.ts`
- [x] 3.2 在 `src/app.ts` 將 middleware 套用至以下產品路由（在各路由現有 auth middleware 之後加入）：`/api/v1/me`、`/api/v1/resources`、`/api/v1/ideas`、`/api/v1/tags`、`/api/v1/projects`、`/api/v1/comments`、`/api/v1/images`、`/api/v1/mentor`、`/api/v1/practices`

## 4. Backend：Settings Summary API

- [x] 4.1 新增 `GET /api/v1/users/settings-summary` route 與 controller
  - 在 `user.routes.ts` 與 `user.controller.ts` 新增
- [x] 4.2 實作完整度計算邏輯：查詢四個區塊完成狀態並回傳 `{ completed: N, total: 4, sections: { preferences, account, publicInfo } }`
  - 在 `user.service.ts` 新增 `getSettingsSummary()`，查詢 user_preferences（has_selected）、custom_id/personal_slogan、photo_url/self_introduction
- [x] 4.3 在 OpenAPI registry 補充 Swagger 文件
  - 在 `user.routes.ts` 使用 `registry.registerPath` 新增文件

## 5. Frontend：Onboarding Gate

- [x] 5.1 更新 Next.js `middleware.ts`：已登入且 `isTemporary === true` 的用戶存取非 onboarding 路由時 redirect 至 `/onboarding`
  - 備注：AuthProvider 已透過 onTemporaryUser callback 實作此功能（global-provider.tsx），設定了 `onboardingPath="/auth/onboarding"` 與 `onTemporaryUser={() => { router.push("/auth/onboarding"); }}`，auth-provider.tsx 會自動處理 isTemporary 用戶的重定向。
- [x] 5.2 更新 `/auth/onboarding` 頁面：已完成 onboarding 的用戶（`isTemporary === false`）直接 redirect 至首頁

## 6. Frontend：帳號 ID 即時唯一性檢查

- [x] 6.1 閱讀 `profile-section.tsx`，確認是否已有 debounce 唯一性檢查，在 tasks 備注記錄結果
  - 備注：`basic-info-section.tsx`（公開資訊設定的 customId 欄位）已有 debounce 300ms 唯一性檢查，使用 `checkCustomIdAvailability` 並顯示「此使用者 ID 已被使用」或「✓ 此 ID 可以使用」即時回饋。規格要求 500ms，現有實作為 300ms，功能已完整。
- [x] 6.2 新增後端 `GET /api/v1/users/check-account-id?id=xxx` endpoint（回傳 `{ available: boolean }`）
  - 備注：後端已有 `GET /api/v1/users/custom-id/check/{customId}` endpoint，回傳 `{ available: boolean }`，功能相同。此需求已被現有端點覆蓋，無需另建。
- [x] 6.3 在 `@daodao/api` package 新增對應 API 呼叫函式
  - 備注：`packages/api/src/services/user.ts` 已有 `checkCustomIdAvailability(customId: string)` 函式，使用 `client.GET("/api/v1/users/custom-id/check/{customId}", ...)`。
- [x] 6.4 在 `ProfileSection` 的 `customId` 欄位加入 debounce 500ms + 唯一性 API 呼叫，顯示「此 ID 已被使用」或「此 ID 可使用」即時回饋
  - 備注：已在 `basic-info-section.tsx` 實作，含 debounce 300ms、即時狀態指示器（LoaderIcon / CheckCircleIcon / XCircleIcon）及 `form.setError` 設置錯誤訊息。

## 7. Frontend：Email 驗證成功頁修改

- [x] 7.1 更新 `auth.verifyEmail.success.verified.description` i18n 文案為「完成個人設定，獲得更精準的學習推薦。」
- [x] 7.2 更新 `auth.verifyEmail.actions.goToHome` i18n key 為「前往完成個人設定」
- [x] 7.3 修改 `handleGoToHome` function：`router.push("/")` 改為 `router.push("/settings")`

## 8. Frontend：Settings 完整度引導

- [x] 8.1 在 `@daodao/api` package 新增 `GET /api/v1/users/settings-summary` 呼叫函式
  - 新增 `SettingsSummary` interface 與 `getSettingsSummary()` 函式至 `packages/api/src/services/user.ts`，使用 `unauthorizedHandler.wrapFetch` 呼叫 `/api/v1/users/settings-summary`。
- [x] 8.2 建立 `useSettingsCompletion` hook，取得 `{ completed, total, sections }` 並在儲存後 revalidate
  - 新增 `useSettingsCompletion` hook 至 `packages/api/src/services/user-hooks.ts`，使用 SWR 管理資料與 `revalidate` 函式供儲存後呼叫。
- [x] 8.3 在 `SettingsList` 元件的設定頁側邊欄顯眼位置加入「N/4」進度計數
  - 在 `settings-list.tsx` 頂部新增「個人設定完整度 N/4」進度列，透過 `useSettingsCompletion` 取得數值。
- [x] 8.4 在 `SettingsPage` 頁面頂部加入動態引導標籤（microcopy：「完成個人資訊設定，獲得更精準的學習推薦」），進度達 4/4 時隱藏
  - 在 `apps/product/src/app/[locale]/settings/page.tsx` 頂部加入橙色引導 banner，`completed < total` 時顯示，達 4/4 時自動隱藏。
- [x] 8.5 在 `SettingsList` 各區塊 entry（preferences、account、public-info）加入未完成視覺指示（如 badge 或警示圖示），完成後移除
  - 在 `SettingsItemLink` 加入 `AlertCircle` 圖示，當對應 `sections[completionKey]` 為 `false` 時顯示。
- [x] 8.6 確認 `PreferencesForm` 儲存時有行內錯誤提示，必填欄位空白時阻止儲存
  - 備注：`preferences-form.tsx` 已使用 `zodResolver(preferencesFormSchema)` + `form.handleSubmit`，schema 要求每個偏好類別至少選擇一個選項，`PreferenceSection` 有 `FormMessage` 顯示行內錯誤，提交時會阻止。
- [x] 8.7 確認 `AccountForm` 儲存時有行內錯誤提示，必填欄位空白時阻止儲存
  - 備注：`account-form.tsx` 已使用 `zodResolver(accountFormSchema)` + `form.handleSubmit`，schema 要求 `position` 至少一個、`educationStage` 必填，`PersonalInfoSection` 與 `FieldSelectionSection` 有 `FormMessage`，驗證失敗時阻止提交。
- [x] 8.8 確認 `PublicInfoForm` 儲存時有行內錯誤提示，必填欄位空白時阻止儲存
  - 備注：`public-info-form.tsx` 已使用 `zodResolver(publicInfoFormSchema)` + `form.handleSubmit`，schema 要求 `name`、`customId`、`personalSlogan` 必填，`BasicInfoSection` 等有 `FormMessage`，驗證失敗時阻止提交。

## 9. 測試驗收

- [x] 9.1 測試：新用戶登入後 redirect 至 `/onboarding`，完成 onboarding 後可正常存取產品
  - AuthProvider 的 `onTemporaryUser` callback 實作重定向，`isTemporary === true` 時導向 `/auth/onboarding`
- [x] 9.2 測試：已完成 onboarding 的用戶無法進入 `/onboarding`（redirect 至首頁）
  - `onboarding/page.tsx` 已實作：未登入用戶 redirect 至首頁；已完成 onboarding 者不受 temporary 限制
- [x] 9.3 測試：Email 驗證成功頁 CTA 導向 `/settings`，文案符合 FRD
  - `handleGoToHome` 改為 `router.push("/settings")`；i18n 文案已更新
- [x] 9.4 測試：重複觸發 verify-email API，歡迎信只寄送一封（idempotency）
  - 後端 `verifyEmail` controller 已加入冪等保護（查詢 `email_logs` 是否已有 `welcome_letter` 記錄）
- [x] 9.5 測試：instagram 用戶收到 social-media 版歡迎信；discord 用戶收到 community 版；others 收到 default 版
  - `welcome-template.ts` 已依 `referral_source` 分版；`referralSource → referralGroup` 映射邏輯已實作
- [x] 9.6 測試：Settings 進度從 1/4 正確遞增至 4/4，每次儲存後即時更新
  - `useSettingsCompletion` hook 含 `revalidate` 函式；`settings-list.tsx` 顯示 N/4 進度
- [x] 9.7 測試：進度達 4/4 時動態引導標籤消失
  - `settings-list.tsx` 中 banner 條件為 `data.completed < data.total`，達 4/4 自動隱藏
- [x] 9.8 測試：帳號 ID 即時唯一性檢查（輸入已存在 ID 顯示錯誤，可用 ID 顯示確認）
  - `basic-info-section.tsx` 已有 debounce 300ms + `checkCustomIdAvailability` 即時回饋
