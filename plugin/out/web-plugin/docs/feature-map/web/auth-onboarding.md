# 登入與註冊引導（Auth / Onboarding）

使用者用 Google 帳號登入島島阿學；第一次登入的新用戶（temp）會被帶去填個人資料完成註冊，email 未驗證者會被帶去驗證頁。

- 介面：Web（apps/product）
- dev 網址：https://app-dev.daodao.so/auth/login （host 依據 `daodao-infra/README.md:39`、`daodao-infra/nginx/conf.d/product.conf:26`；API 為 https://server-dev.daodao.so，依據 `.github/workflows/mobile-deploy.yml:53`）
- 主要程式位置：`apps/product/src/app/[locale]/auth/`、`packages/auth/src/lib/auth-provider.tsx`、`packages/auth/src/components/login-dialog.tsx`、`apps/product/src/components/onboarding/`
- 依據版本：daodao-f2e 70155dce（2026-10-29）

## 子功能
- `/auth/login`：自動開啟不可關閉的登入 Dialog，讀 `?redirect=`，登入成功後整頁導向 redirect（預設 `/`）（`apps/product/src/app/[locale]/auth/login/page.tsx:18-38`）
- Google OAuth 登入（登入 Dialog 唯一的登入方式）（`packages/auth/src/components/login-dialog.tsx:77、136-145`）
- `/auth/callback`：OAuth 回來後顯示「正在處理登入...」並呼叫 `useRedirectAfterLogin()` 跳轉（`apps/product/src/app/[locale]/auth/callback/page.tsx`）
- `/auth/error?reason=state_expired|invalid_state|invalid_redirect_uri|server_error`：OAuth 失敗頁，可「重新登入」或「返回首頁」（`apps/product/src/app/[locale]/auth/error/page.tsx:20、74-80`）
- `/auth/onboarding`：temp 用戶多步驟註冊表單（個人資料 → 後端動態步驟 → 專業與興趣 → 得知管道 → 成功頁）（`apps/product/src/components/onboarding/onboarding-form.tsx:330-370`）
- `/auth/verify-email?status=&message=&email=`：點信中連結後的驗證結果頁（`apps/product/src/app/[locale]/auth/verify-email/page.tsx:39-41`）
- `/auth/verify-email/pending`：email 未驗證時的等待頁，每 5 秒 refreshAuth、可重寄驗證信（60 秒冷卻）、可「使用其他帳號登入」（`apps/product/src/app/[locale]/auth/verify-email/pending/page.tsx`）

## 怎麼到這頁（使用者視角）
1. 未登入時打開任一受保護頁（例如 `/settings`、`/notifications`）→ 被導到 `/auth/login?redirect=<原路徑>`（`apps/product/src/app/global-provider.tsx:83-85`）。也可直接開 `/auth/login`。
2. 在 Dialog 點「Google 帳號註冊 / 登入」→ Google OAuth → `/auth/callback` → 回到 redirect。
3. 若帳號是新用戶（`isTemporary=true`），任何頁面都會被推到 `/auth/onboarding`（`apps/product/src/app/global-provider.tsx:87-89`、`packages/auth/src/lib/auth-provider.tsx:452-476`）。
4. 完成註冊後若 email 未驗證，非 onboarding／驗證頁都會被推到 `/auth/verify-email/pending`（`apps/product/src/app/global-provider.tsx:91-93`、`packages/auth/src/lib/auth-provider.tsx:478-529`）。

## 測試帳號與前置條件
- 角色：`/auth/login`、`/auth/error`、`/auth/verify-email*` 未登入可開（publicPattern `^/auth/`，`apps/product/src/app/global-provider.tsx:64`）。`/auth/onboarding` 需要「已登入的 temp 用戶」，否則立刻 `router.replace("/")`（`apps/product/src/app/[locale]/auth/onboarding/page.tsx` 初始化 effect）。
- 冒煙不走 Google OAuth：用 dev-login 取 token（後端在 daodao-server `src/controllers/dev-login.controller.ts`，只在 dev 環境掛載）：`POST https://server-dev.daodao.so/api/v1/auth/dev-login`，header `x-dev-login-secret`，body `{"email","mode":"temp"|"user","name"}`；回應 `data.token` 即 `auth_token` cookie 值。`mode=temp` 產生未註冊新用戶（測 onboarding），`mode=user` 取既有使用者。
- token 怎麼被吃：web 端 API client 對 server 用 `credentials: "include"` 帶 cookie（`packages/api/src/client.ts:241、293`），AuthProvider 打 `/api/v1/auth/me` 判定登入與 `isTemporary`、`email_verified`（`packages/auth/src/lib/auth-provider.tsx:250-263`）。因此 cookie 要種在 server-dev 網域：先開 `https://server-dev.daodao.so/api/v1/health`，`document.cookie='auth_token=<token>; path=/; secure; samesite=none'`，再開 app-dev。
- 不可用不存在的信箱註冊（server-dev 會真的寄信）；改用既有帳號。

## 穩定的選擇器
| 元素 | 選擇器（Playwright） | 依據 |
|---|---|---|
| 登入頁載入中文字 | `getByText('正在開啟登入...')` | `auth.login.opening` packages/i18n/src/locales/zh-TW/auth.json:11；`apps/product/src/app/[locale]/auth/login/page.tsx:41` |
| 登入 Dialog 標題 | `getByText('歡迎回來島島阿學!')` | `auth.login_dialog_title` packages/i18n/src/locales/zh-TW/auth.json:2；`packages/auth/src/components/login-dialog.tsx:128、200` |
| Google 登入按鈕 | `getByRole('button', { name: '使用 Google 帳號登入' })` | aria-label `auth.login_dialog_google_button_label` packages/i18n/src/locales/zh-TW/auth.json:5；`packages/auth/src/components/login-dialog.tsx:141、212`（可見文字「Google 帳號註冊 / 登入」packages/i18n/src/locales/zh-TW/auth.json:4） |
| callback 處理中 | `getByText('正在處理登入...')` | `app_product.auth_callback_loading` packages/i18n/src/locales/zh-TW/app-product.json:64 |
| OAuth 錯誤頁標題（state_expired） | `getByText('登入連結已過期')` | `auth.oauthError.stateExpired.title` packages/i18n/src/locales/zh-TW/auth.json:77 |
| 錯誤頁「重新登入」 | `getByRole('button', { name: '重新登入' })` | `auth.oauthError.actions.retry` packages/i18n/src/locales/zh-TW/auth.json:97；`apps/product/src/app/[locale]/auth/error/page.tsx:74-75` |
| 錯誤頁「返回首頁」 | `getByRole('link', { name: '返回首頁' })` | `auth.oauthError.actions.backToHome` packages/i18n/src/locales/zh-TW/auth.json:98；`apps/product/src/app/[locale]/auth/error/page.tsx:79-80` |
| Onboarding 第一步標題 | `getByRole('heading', { name: '個人資料' })` | `onboarding.steps.profile.title` packages/i18n/src/locales/zh-TW/onboarding.json:4；`apps/product/src/components/onboarding/profile-section.tsx:112` |
| 名字輸入框 | `getByPlaceholder('希望大家怎麼稱呼你')` | `onboarding.steps.profile.namePlaceholder` packages/i18n/src/locales/zh-TW/onboarding.json:12；`apps/product/src/components/onboarding/profile-section.tsx:194` |
| 使用者帳號輸入框 | `getByPlaceholder('設定你的專屬帳號')` | `onboarding.steps.profile.usernamePlaceholder` packages/i18n/src/locales/zh-TW/onboarding.json:14；`apps/product/src/components/onboarding/profile-section.tsx:220` |
| 生日欄位 | 無穩定選擇器，建議補 data-testid（DatePicker，只有 placeholder `steps.profile.birthDatePlaceholder`） | `apps/product/src/components/onboarding/profile-section.tsx:142-156` |
| 下一步 / 上一步 | `getByRole('button', { name: '下一步' })` / `{ name: '上一步' }` | `onboarding.navigation.next` packages/i18n/src/locales/zh-TW/onboarding.json:45；`apps/product/src/components/onboarding/onboarding-form.tsx:354、365` |
| 完成註冊（submit） | `getByRole('button', { name: '完成註冊' })` | `onboarding.navigation.complete` packages/i18n/src/locales/zh-TW/onboarding.json:46；`apps/product/src/components/onboarding/onboarding-form.tsx:368-369` |
| 成功頁按鈕 | `getByRole('button', { name: '前往島島阿學' })`（若渲染為 link 改 `getByRole('link', …)`） | `onboarding.steps.success.primaryButton` packages/i18n/src/locales/zh-TW/onboarding.json:39；`apps/product/src/components/onboarding/success-section.tsx:81` |
| 待驗證頁標題 | `getByRole('heading', { name: '請驗證您的電子郵件' })` | `auth.verifyEmail.pending.title` packages/i18n/src/locales/zh-TW/auth.json:63；`apps/product/src/app/[locale]/auth/verify-email/pending/page.tsx:103` |
| 重寄驗證信 | `getByRole('button', { name: '重新發送驗證郵件' })` | `auth.verifyEmail.pending.resendButton` packages/i18n/src/locales/zh-TW/auth.json:67；`apps/product/src/app/[locale]/auth/verify-email/pending/page.tsx:113-129` |
| 使用其他帳號登入 | `getByRole('button', { name: '使用其他帳號登入' })` | `auth.verifyEmail.pending.logout` packages/i18n/src/locales/zh-TW/auth.json:72；`apps/product/src/app/[locale]/auth/verify-email/pending/page.tsx:134-135` |
| 驗證結果頁前往首頁 | `getByRole('button', { name: '前往島島阿學' })` | `auth.verifyEmail.actions.goToHome` packages/i18n/src/locales/zh-TW/auth.json:52；`apps/product/src/app/[locale]/auth/verify-email/page.tsx:173-179` |

## 怎樣算成功（可觀察的結果與證據）
- 登入：`/auth/login?redirect=/settings` 帶有效 cookie 時自動整頁跳到 `/settings`（URL 斷言）；sidebar 出現「帳號選單」按鈕（`getByRole('button', { name: '帳號選單' })`，`apps/product/src/components/layout/sidebar/account-menu.tsx:49`）。
- 網路證據：`GET https://server-dev.daodao.so/api/v1/auth/me` 200，`data.isTemporary` 為 false。
- Onboarding：按「完成註冊」後出現「{name}，歡迎加入島島阿學！」（`onboarding.steps.success.titleWithName`）；之後重新整理任一頁不再被導回 `/auth/onboarding`，`/auth/me` 的 `isTemporary=false`。
- 未登入打受保護頁：URL 變成 `/auth/login?redirect=%2F<path>`。
- 待驗證頁：email 驗證後 5 秒內自動 `router.replace("/")`。

## 陷阱
- 登入 Dialog 在 `/auth/login` 為 `dismissible: false`（`apps/product/src/app/[locale]/auth/login/page.tsx:21`），關不掉；手機（`useIsMobile`）改用另一套 layout（`packages/auth/src/components/login-dialog.tsx:73、116`），同一 aria-label 在該檔有兩份（141、212），用 role+name 時注意只會渲染其一。
- 已登入者開 `/auth/onboarding` 會立刻被導回 `/`；要測 onboarding 必須用 `mode=temp` 的新帳號，且每個 temp 帳號只能走一次。
- 使用者帳號（customId）輸入有即時 availability 檢查（`apps/product/src/components/onboarding/profile-section.tsx:3、87`），重複帳號會顯示 `onboarding.steps.profile.usernameUnavailable` 錯誤、擋下一步；冒煙要用唯一值。
- onboarding 中間的動態步驟來自後端 `getActiveOnboardingFlow`（`apps/product/src/components/onboarding/use-active-flow.ts:3`），步驟數不固定，不要寫死按幾次「下一步」，以「完成註冊」按鈕出現為準。
- locale：預設 zh-TW 無前綴，英文為 `/en/...`（`packages/i18n/src/routing.ts`）；redirect 參數保留原路徑含 locale。
- `/auth/login` 成功後用 `window.location.href` 整頁導向（`apps/product/src/app/[locale]/auth/login/page.tsx:27-34`），Playwright 要等 navigation，不是等 client route 變化。
- `/lighthouse/*` 另有 middleware 在 Next server 端讀「app 網域」的 `auth_token` cookie 再轉發給 API（`apps/product/src/middleware.ts:24、32`）；只把 cookie 種在 server-dev 網域時，一般頁可登入但 `/lighthouse` 可能仍被導回登入頁（推測，需實測 cookie domain）。
