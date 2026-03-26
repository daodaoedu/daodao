# OAuth 登入失敗 - 根本原因分析

> 日期：2026-03-17
> 症狀：用戶點擊 Google 登入後，無法完成登入，最終停在 `/auth/login?redirect=%2Fauth%2Ferror%3Freason%3Dinvalid_state`

---

## 症狀描述

**用戶操作路徑**：

1. 進入 `https://app.daodao.so/en/auth/login?redirect=%2F`
2. 點擊 Google 登入
3. 最終停在 `https://app.daodao.so/en/auth/login?redirect=%2Fauth%2Ferror%3Freason%3Dinvalid_state`

**觀察到的網路請求**：

```
Request URL:  https://app.daodao.so/auth/login?redirect=%2Fauth%2Ferror%3Freason%3Dinvalid_state
Request Method: GET
Status Code: 307 Temporary Redirect
```

307 是 i18n middleware 加上 locale 前綴的 redirect，不是 auth 錯誤本身。

---

## 完整錯誤鏈

```
OAuth 失敗
  └─ 後端 redirect → /auth/error?reason=invalid_state
        └─ AuthProvider 路由保護觸發（/auth/error 未列為 public）
              └─ onAuthRequired → /auth/login?redirect=%2Fauth%2Ferror%3Freason%3Dinvalid_state
                    └─ 登入頁以 redirectUrl='/auth/error?reason=invalid_state' 開啟 dialog
                          └─ 用戶成功登入後 → 被導向錯誤頁面（非原始目標）
                                └─ 陷入無法正常使用的狀態
```

---

## Bug 1：`/auth/error` 未加入 publicPattern（主因 - 造成 loop）

### 位置

`daodao-f2e/apps/product/src/app/global-provider.tsx`

### 問題

`AuthProvider` 設定 `defaultProtected = true`，所有未列入 `publicPattern` 的路由都需要認證。
但 `/auth/error` 沒有被列入：

```tsx
<AuthProvider
  defaultProtected
  publicPattern={[
    "^/auth/login",
    "^/auth/callback",
    "^/auth/onboarding",
    "^/auth/verify-email(/.*)?$",
    "^/users/",
    "^/practices/[^/]+$",
    // ❌ 沒有 "^/auth/error"
  ]}
  onAuthRequired={(currentPath) => {
    router.push(`/auth/login?redirect=${encodeURIComponent(currentPath)}`);
  }}
>
```

### 影響

當後端 OAuth 失敗並將用戶 redirect 到 `/auth/error?reason=invalid_state`：

1. 用戶尚未認證
2. `AuthProvider` 偵測到受保護路由
3. `onAuthRequired('/en/auth/error?reason=invalid_state')` 被呼叫
4. 用戶被 redirect 到 `/auth/login?redirect=%2Fen%2Fauth%2Ferror%3Freason%3Dinvalid_state`
5. 登入頁以 `redirectUrl: '/en/auth/error?reason=invalid_state'` 開啟 dialog
6. 用戶即使成功完成 OAuth → 後端 callback redirect 到 `${frontendUrl}/auth/callback?state=...`
7. 前端 callback 驗證後，執行 `router.push(state.redirectUrl)` → 導向錯誤頁面
8. `/auth/error` 是無意義的目標頁面，且頁面本身也會再觸發同樣的路由保護

### 修復

在 `global-provider.tsx` 的 `publicPattern` 加入 `/auth/error`：

```tsx
publicPattern={[
  "^/auth/login",
  "^/auth/callback",
  "^/auth/error",     // ← 加這行
  "^/auth/onboarding",
  "^/auth/verify-email(/.*)?$",
  "^/users/",
  "^/practices/[^/]+$",
]}
```

---

## Bug 2：Clock Skew Tolerance 過小，導致 `invalid_state`（觸發根源）

### 位置

`daodao-server/src/utils/oauth-state.ts`

### 問題

```typescript
// 允許最多 5 秒的 clock skew（Android 裝置時鐘常比 server 快）
const CLOCK_SKEW_TOLERANCE_MS = 5000;
if (age < -CLOCK_SKEW_TOLERANCE_MS) {
  return { valid: false, error: 'Invalid timestamp' };
}
```

`age = serverTime - browserTime`

若用戶瀏覽器時鐘比伺服器**快超過 5 秒**（`browserTime > serverTime + 5000`），state 立即被拒絕，錯誤映射為 `invalid_state`。

**5 秒的容差非常小**。許多裝置（桌機、手機）時鐘偏差超過 5 秒是常見情況，這是 Bug 1 的間歇性觸發原因。

### 觸發時間點

在 `authenticateGoogle`（oauth.service.ts），即 OAuth 流程最初始的步驟。用戶點擊 Google 登入後，瀏覽器發送 `GET /api/v1/auth/google?state=...`，後端驗證 state 失敗，**用戶根本未被導向 Google 登入頁**。

### 修復

將 clock skew tolerance 提高至 30–60 秒：

```typescript
// oauth-state.ts
const CLOCK_SKEW_TOLERANCE_MS = 30 * 1000; // 30 秒
```

---

## Bug 3：`googleCallback` 不區分 `state_expired` vs `invalid_state`（次要）

### 位置

`daodao-server/src/controllers/auth.controller.ts`

### 問題

```typescript
// ❌ 不論 expired 還是 format error，一律回傳 invalid_state
const validationResult = validateOAuthState(stateParam);
if (!validationResult.valid || !validationResult.state) {
  loggerService.warn('OAuth callback - invalid state', { error: validationResult.error });
  res.redirect(`${frontendUrl}/auth/error?reason=invalid_state`);
  return;
}
```

而 `authenticateGoogle`（oauth.service.ts）有正確區分：

```typescript
// ✅ 正確區分
const reason = validationResult.error === 'State has expired' ? 'state_expired' : 'invalid_state';
res.redirect(`${frontendUrl}/auth/error?reason=${reason}`);
```

### 影響

- 用戶在 Google 登入頁停留超過 10 分鐘 → state 過期 → 顯示 "invalid_state" 而非 "state_expired"
- 前端錯誤頁面無法給出正確的說明（"請重新嘗試登入" vs "您的登入嘗試已超時"）

### 修復

```typescript
// auth.controller.ts - googleCallback
const validationResult = validateOAuthState(stateParam);
if (!validationResult.valid || !validationResult.state) {
  const reason = validationResult.error === 'State has expired' ? 'state_expired' : 'invalid_state';
  loggerService.warn('OAuth callback - invalid state', { error: validationResult.error, reason });
  res.redirect(`${frontendUrl}/auth/error?reason=${reason}`);
  return;
}
```

---

## Bug 4（防禦性）：成功登入後可能被導向 `/auth/error`

### 問題

`isValidRedirectUri` regex 允許 `/auth/error?reason=invalid_state` 作為合法 redirect 目標：

```typescript
// redirect-validation.ts
return /^\/[a-zA-Z0-9\-_./]*(\?[a-zA-Z0-9\-_=&%.]*)?$/.test(trimmed);
// → /auth/error?reason=invalid_state 通過驗證 ✅（但語意上不應允許）
```

由 Bug 1 造成的 loop 使 `redirectUrl` 變成 `/en/auth/error?reason=invalid_state`。用戶成功登入後，`use-redirect-after-login.ts` 會執行：

```typescript
router.push(state.redirectUrl); // → /en/auth/error?reason=invalid_state
```

### 修復建議

在 `use-redirect-after-login.ts` 或 `getOAuthLoginUrl` 過濾掉 `/auth/error` 路徑：

```typescript
// use-redirect-after-login.ts
const isSafeRedirect = (url: string) => !url.startsWith('/auth/error');

if (isNewUser) {
  router.push(ONBOARDING_URL);
} else {
  router.push(isSafeRedirect(state.redirectUrl) ? state.redirectUrl : DEFAULT_REDIRECT_URL);
}
```

---

## 修復優先順序

| 優先 | Bug | 位置 | 影響 |
|------|-----|------|------|
| P0 | `/auth/error` 未列入 publicPattern | `global-provider.tsx` | 所有 OAuth 失敗後無法恢復，loop 無法中斷 |
| P1 | Clock skew tolerance 5 秒過小 | `oauth-state.ts` | 部分用戶（瀏覽器時鐘偏快）無法登入 |
| P2 | `googleCallback` 不區分 expired | `auth.controller.ts` | 錯誤訊息不正確，UX 問題 |
| P3 | 成功登入後可能導向錯誤頁 | `use-redirect-after-login.ts` | 防禦性修復，避免 P0 fix 後仍有殘留問題 |

---

## 相關檔案

| 檔案 | 說明 |
|------|------|
| `daodao-f2e/apps/product/src/app/global-provider.tsx` | AuthProvider 路由保護設定 |
| `daodao-server/src/utils/oauth-state.ts` | State 編解碼與驗證邏輯 |
| `daodao-server/src/services/auth/oauth.service.ts` | `authenticateGoogle`，OAuth 流程發起 |
| `daodao-server/src/controllers/auth.controller.ts` | `googleCallback`，OAuth 回調處理 |
| `daodao-f2e/packages/auth/src/lib/auth-client.ts` | 前端 state 建立與編碼 |
| `daodao-f2e/packages/auth/src/hooks/use-redirect-after-login.ts` | OAuth callback 後的跳轉邏輯 |
