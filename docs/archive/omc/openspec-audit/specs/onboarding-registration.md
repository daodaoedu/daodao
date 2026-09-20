# onboarding-registration
- 涉及 repo: daodao-f2e (apps/product) / daodao-server (auth + gate)
- 對應 archived change: 2026-05-26-onboarding-flow / 059_add_registration_flow
- 總計: 6 條 requirement / 18 個 scenario | ✅7 ⚠️7 ❌3 ❓1

> 兩個結構性落差：
> 1. spec 多個 scenario 描述「提交 Step N → onboarding_step 更新為 N+1 → 前進」的**逐步後端 API** 模型；實作是 **單一表單 client-side stepper**（onboarding-form.tsx：各 step schema 只在前端 parse 驗證，最後一次 createCurrentUserWithFormData/updateCurrentUserWithFormData 提交），server 無 onboarding_step 整數逐步更新。
> 2. Onboarding Gate 為 server 端對臨時用戶回 403（onboarding-gate.middleware.ts），非 spec 的「導向 /onboarding」前端重定向。

## Requirement: Onboarding Gate（待新增） → ⚠️
證據: daodao-server:src/middleware/onboarding-gate.middleware.ts requireOnboardingComplete（isTemporary→403 ForbiddenError）；f2e apps/product/.../auth/onboarding/page.tsx
- Scenario: 未完成存取產品頁→導向 /onboarding → ⚠️ — server 對臨時用戶回 403 而非導向；前端是否攔截 403 並 router.push('/onboarding') 未在 gate 證實
- Scenario: 已完成存取 /onboarding→導向首頁 → ❓ — onboarding/page.tsx 存在，但未證實「已完成則導回首頁」的判斷邏輯
- Scenario: 未登入存取受保護頁→導向登入頁 → ⚠️ — middleware 註解明示未登入交由各路由 authenticate 處理，行為存在但非此 gate 負責

## Requirement: Step 1 — 個人資訊 → ✅
證據: daodao-f2e:apps/product/src/components/onboarding/schema.ts profileStepSchema(email/birthDate>=16/name max50/customId 3-15 英數)
- Scenario: 提交有效個人資訊→step 更新為2前進 → ⚠️ — 欄位驗證符合，但無「onboarding_step 更新為 2」後端動作；為 client stepper nextStep()
- Scenario: 名字超過50字元→錯誤 → ✅ — name.max(50)
- Scenario: 未滿16歲→錯誤 → ✅ — birthDate.refine differenceInYears>=16
- Scenario: 帳號ID格式無效→即時錯誤 → ✅ — customId min3/max15/customIdRegex 英數 refine
- Scenario: 帳號ID已被使用(debounce 500ms) → ⚠️ — profile-section.tsx checkCustomId 有 debounce + checkCustomIdAvailability，但 debounce 為 **300ms**(:68)非 spec 500ms
- Scenario: 帳號ID可使用(debounce 500ms) → ⚠️ — 同上，有可用提示但 debounce 300ms

## Requirement: Step 2 — 興趣領域 → ✅
證據: daodao-f2e:schema.ts interestsStepSchema(professionalFields/interests 各 min1 max5)
- Scenario: 提交有效興趣(各1-5)→step3前進 → ⚠️ — min1/max5 驗證符合，但無 onboarding_step 更新為3後端動作
- Scenario: 未選任何專業領域→錯誤 → ✅ — professionalFields.min(1)
- Scenario: 選超過5個→阻止 → ⚠️ — schema max(5) 驗證提交，但 spec「第6個呈現不可選狀態」之 UI 即時阻擋未在 interests-section 證實

## Requirement: Step 3 — 來源調查 → ❌
證據: daodao-f2e:schema.ts referralStepSchema(referralSource min1; otherReferralText optional)；referral-section.tsx isOthersSelected 顯示輸入框
- Scenario: 選標準來源提交→step4前進 → ⚠️ — referralSource.min(1) 驗證，但無 onboarding_step→4 後端
- Scenario: 選「其他」未填說明→錯誤 → ❌ — referralStepSchema 的 otherReferralText 為 .optional().or(literal(""))，**無 superRefine/條件必填**；grep 不到 others 時要求 otherReferralText 的驗證
- Scenario: 選「其他」填說明→前進 → ⚠️ — 可輸入並提交(referral-section.tsx:74 isOthersSelected 顯示)，但無條件必填把關

## Requirement: Step 4 — 完成註冊頁面 → ❌
證據: daodao-f2e:apps/product/src/components/onboarding/success-section.tsx（emailReminder i18n + primaryButton→handleGoToHome router.push('/')）
- Scenario: 到達Step4(含「已寄送驗證信」提示) → ⚠️ — success-section 有 emailReminder 文案，但主按鈕導向 '/' 非 spec 期望
- Scenario: 請求重新寄送驗證信(rate limit 1/分) → ❌ — success-section grep 不到 resend/重新寄送/resendVerification 按鈕或邏輯

## Requirement: Step 5 — Email 驗證完成 → ⚠️
證據: daodao-server:src/controllers/auth.controller.ts:551 GET verify-email 成功 redirect `/auth/verify-email?status=success`；f2e auth/verify-email/page.tsx:51-52 refreshAuth()+router.push('/settings')
- Scenario: 點擊有效驗證連結(含微文案+前往設定按鈕) → ⚠️ — 後端標記驗證 + 前端成功頁存在；CTA 導向 /settings ✅，但 spec 文案「太棒了！完成個人設定…」未在 page grep 證實(用 i18n key)
- Scenario: 點擊已過期連結→錯誤頁+重新申請 → ⚠️ — auth.controller redirect status=error&message=invalid_token；page.tsx:141 showResendButton(invalid_token+email) 有重送，但「過期」與 invalid_token 是否等價未證實
- Scenario: 從驗證頁前往設定(refreshAuth+導向/settings) → ✅ — verify-email/page.tsx:37,51-52 refreshAuth() 後 router.push('/settings')
