# App 登入／登出

使用者用 Google 或 Apple 帳號登入島島 App，之後才能使用所有分頁；在設定頁登出。

- 介面：App（apps/mobile）
- dev 網址／取得方式：沒有網頁版。安裝 dev App「Dao Dao (Dev)」（bundle id `com.daodao.so.dev`，app.config.ts:16-17）；EAS preview build（Android APK／iOS ad hoc）或 iOS 模擬器 development build，連 server-dev。安裝步驟見 docs/plans/issue-drafts/pm-app-dev-testing-guide.md
- 主要程式位置：projects/daodao-f2e/apps/mobile/app/(auth)/login.tsx、providers/AuthProvider.tsx、services/oauth.ts、services/auth-storage.ts
- 依據版本：daodao-f2e 6034e986（2026-10-23）

## 子功能
- Google 帳號註冊／登入、Apple 帳號註冊／登入
- 服務條款／隱私權政策連結
- 啟動導向：已登入 → 分頁首頁；未登入 → /login（app/index.tsx:17）
- 路由保護：未登入且不在 `(auth)`／`auth` 群組 → 導到登入頁；已登入卻在 auth 群組 → 導回 `/(tabs)`（providers/AuthProvider.tsx:44-50）
- 登出：設定分頁最下方「登出」→ 系統對話框確認

## 怎麼到這頁（使用者視角）
1. 打開 App；未登入會直接看到「歡迎回來島島阿學!」登入頁。
2. 按「Google 帳號註冊 / 登入」（或 iOS 上「Apple 帳號註冊 / 登入」）→ 完成系統 OAuth 流程。
3. 登出：底部分頁「設定」→ 捲到底「登出」→ 對話框「確定要登出嗎？」→「登出」。

## 測試帳號與前置條件
- 角色：未登入 → 一般使用者。
- 需要真實 Google／Apple 帳號（dev 學員帳號，與 app-dev.daodao.so 驗收用同一份資料）。
- App 沒有 dev-login 或貼 token 的入口；token 存在 SecureStore（`daodao_access_token`／`daodao_refresh_token`／`daodao_user`，services/auth-storage.ts:6-9），agent 無法像網頁一樣注入。

## 穩定的選擇器
| 元素 | 選擇器 | 依據 |
|------|--------|------|
| 登入頁標題 | 文字「歡迎回來島島阿學!」（`mobile.auth.title`） | app/(auth)/login.tsx:93 |
| Apple 登入 | accessibilityLabel「使用 Apple 登入」（`mobile.auth.apple_accessibility`），role=button | app/(auth)/login.tsx:111-112 |
| Google 登入 | accessibilityLabel「使用 Google 帳號登入」（`mobile.auth.google_accessibility`），role=button | app/(auth)/login.tsx:137-138 |
| 條款連結 | 文字「服務條款」「隱私權政策」（`mobile.auth.terms`／`privacy`） | app/(auth)/login.tsx:165、176 |
| 登入失敗 | 系統 Alert 標題「登入失敗」（`mobile.auth.login_failed`） | app/(auth)/login.tsx:59、77 |
| 登出 | 文字「登出」（`mobile.settings.logout.title`）；確認對話框鈕「登出」／「取消」 | app/(tabs)/settings.tsx:258-281 |
| testID | 整個 App 沒有 testID，建議在登入鈕補 testID | — |

## 怎樣算成功（可觀察的結果與證據）
- 登入後畫面離開登入頁，出現底部分頁「主頁」「最新通知」「我的小島」「設定」。
- 完全關掉 App 再開，仍是登入狀態（token 存在 SecureStore）。
- 登出後回到登入頁；重開 App 仍在登入頁。
- 證據：手機／模擬器截圖或螢幕錄影。

## 陷阱
- Expo Go 打不開（用了 Firebase 等原生模組與 dev-client）；必須裝 dev build。
- 取消 OAuth（`oauth.cancelled`）不會跳錯誤（login.tsx:30）。
- 推測：`app/auth/onboarding.tsx`、`auth/verify-email` 存在，但程式中找不到導向它們的地方，且已登入者在 `auth` 群組會被導回 `/(tabs)`；新用戶 onboarding 在 App 上可能走不到，需實機確認。
- Apple 登入只在 iOS 有意義。
