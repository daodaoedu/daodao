# onboarding-email-sequence
- 涉及 repo: daodao-server / daodao-storage (058 onboarding flow tables)
- 對應 archived change: 2026-05-26-onboarding-task-guide / onboarding-flow
- 總計: 3 條 requirement / 8 個 scenario | ✅5 ⚠️3 ❌0

> 落差：spec 要求 L0「完成 Email 驗證後立即觸發」，但實作 L0 是在 `createOnboarding`（OAuth 用戶建立 / onboarding 記錄初始化）時 enqueue（onboarding.service.ts:127-128），**非**在 email 驗證成功後。verify-email handler 只發送另一支泛用 welcome email（sendWelcomeEmailWithLog），非 L0 onboarding 序列信。

## Requirement: L0 歡迎信於註冊後立即發送 → ⚠️
證據: daodao-server:src/services/email/onboarding-email.service.ts:38 sendOnboardingL0Email + resolveL0Cta；onboarding.service.ts:127-128 createOnboarding 內 enqueueOnboardingL0Email
- 落差: 觸發時機為 createOnboarding（auth.service.ts:291 / user.service.ts:987），非「Email 驗證後」
- Scenario: S1 用戶→CTA 導向帳號必填設定 → ✅ — resolveL0Cta:31 S1→`/settings/profile` 完成帳號設定（觸發時機有落差但 CTA 正確）
- Scenario: S3 用戶→CTA 導向建立實踐 → ✅ — resolveL0Cta:35 非 S1(含 S3)→`/practices/new` 建立第一個實踐

## Requirement: 階梯式 Email 觸發——完成任務才發送下一封 → ✅
證據: daodao-server:src/middleware/onboarding-hook.middleware.ts withOnboardingHook→checkAndAdvance；onboarding.service.ts:240-247 任務完成後 enqueueOnboardingEmail(taskKey)；worker email_states 冪等
- Scenario: 完成任務後觸發下一封信 → ✅ — checkAndAdvance 更新 task_states[taskKey]='done' 後 enqueueOnboardingEmail(taskKey, userId, source)，依 source 任務順序(TASK_ORDER_BY_SOURCE)
- Scenario: 同一封信不重複發送(冪等) → ✅ — onboarding-email.worker.ts:26-33 UPDATE email_states ... WHERE email_states->>type IS DISTINCT FROM 'sent'，已送則 skip；checkAndAdvance:201 states[taskKey]==='done' 亦冪等
- Scenario: 提早完成後續任務不補發跳過的信 → ⚠️ — 每次只對「實際完成的 taskKey」發信(非掃描補發)，故不補發跳過任務；但實作是「發完成任務對應信」而非 spec 字面「觸發下一封」，語意略有差異，結果(不補發)相符

## Requirement: Email 觸發與 in-app 進度保持一致 → ✅
證據: daodao-server:src/services/onboarding.service.ts task_states 為唯一來源(user_onboarding.task_states jsonb)，widget 與 email 同讀同寫
- Scenario: Email 點擊回訪後 in-app 進度正確反映 → ✅ — checkAndAdvance 原子更新 task_states(JSONB || 合併)，widget 與 email 共用同一 user_onboarding.task_states；getEffectiveTaskStates 統一計算完成狀態
