# DaoDao 登入流程技術文件：Production vs Development 環境差異

> 最後更新：2026-05-06

---

## 1. 概覽

DaoDao 的登入系統採用 **Google OAuth 2.0** 作為唯一認證方式（密碼登入功能已停用）。整體架構為前後端分離：

- **前端**（daodao-f2e）：Next.js App Router，負責 UI 互動與頁面跳轉
- **後端**（daodao-server）：Node.js + Express + Passport.js，負責 OAuth 流程、JWT 發放、Cookie 設定

登入完成後，後端以 **HTTP-only Cookie**（`auth_token`）儲存 JWT Token，前端透過此 Cookie 維持登入狀態。

**用戶類型：**
- **temp_users**（臨時用戶）：Google OAuth 成功後尚未完成 Onboarding 的用戶
- **users**（正式用戶）：完成 Onboarding 的用戶，有 `external_id`（UUID）

---

## 2. 登入流程步驟（Google OAuth 完整流程）

### 步驟一：使用者點擊登入

1. 前端 `/auth/login` 頁面呼叫 `openLoginDialog({ redirectUrl, source: "app", dismissible: false })`
2. Auth Dialog 向後端發起 Google OAuth 請求，帶上 `state` 或 `redirectUrl` 參數

### 步驟二：後端建立 OAuth State（CSRF 保護）

3. 後端 `GET /api/auth/google` 收到請求
4. 若前端已帶 `state`：驗證 state 格式與 nonce 有效性，確認 `redirectUrl` 在白名單內
5. 若無 `state`：從 `redirect_uri` / `redirectUrl` 建立新的 OAuth State（含隨機 nonce）
6. 將 nonce 儲存至 **Redis**（用於後續 CSRF 驗證）
7. 呼叫 `passport.authenticate('google', { scope: ['profile', 'email'], state })`，重定向到 Google

### 步驟三：Google 驗證

8. 使用者在 Google 帳號選擇頁面完成授權
9. Google 重定向回後端 callback URL：`GET /api/auth/google/callback?code=...&state=...`

### 步驟四：後端處理 OAuth Callback

10. Passport.js 取得 Google profile（email、name、photo）
11. 查詢資料庫：
    - 若有 `users` 紀錄 → 標記為既有用戶（`_isNewUser = false`）
    - 若無 → 查詢或建立 `temp_users`（`_isNewUser` 依是否新建決定）
12. 進入 `googleCallback` controller：
    - 驗證 `state` 格式
    - 從 Redis 驗證並消耗 nonce（防止重放攻擊）
    - 查詢用戶的 roles 與 permissions
    - 呼叫 `jwtService.generateToken(payload)` 產生 JWT（7 天有效期）

### 步驟五：設定 Cookie 並重定向

13. 呼叫 `setAuthCookie(res, token)`，設定 HTTP-only Cookie `auth_token`
14. 根據來源決定重定向目標：
    - **Web 登入**：重定向到 `{FRONTEND_URL}/auth/callback?state=...&isNewUser=...&redirect=...`
    - **App 登入**（custom scheme）：產生一次性 auth code，重定向到 `daodao://...?code=...&state=...`

### 步驟六：前端 Callback 處理

15. 前端 `/auth/callback` 頁面執行 `useRedirectAfterLogin()` hook
16. 依 `isNewUser` 與用戶狀態決定：
    - 新用戶 → 跳轉到 `/auth/onboarding`
    - 既有用戶 → 跳轉到原始 `redirect` 目標頁面（或首頁）

### 流程圖（文字版）

```
[前端] 點擊登入
    ↓
[後端] GET /api/auth/google
    → 建立 OAuth State（含 nonce）→ 存入 Redis
    → Passport redirect → Google OAuth 頁面
    ↓
[Google] 使用者授權
    ↓
[後端] GET /api/auth/google/callback
    → Passport 取得 profile
    → 查詢/建立用戶（temp 或 user）
    → 驗證並消耗 Redis nonce
    → 產生 JWT Token
    → 設定 auth_token Cookie
    ↓（Web 登入）
[前端] /auth/callback
    → useRedirectAfterLogin()
    → 新用戶：/auth/onboarding
    → 既有用戶：redirect 目標頁
```

---

## 3. Cookie 設定差異（prod vs dev）

### 3.1 程式碼定義（`cookie-config.ts`）

```typescript
const cookieOptions: CookieOptions = {
  httpOnly: true,      // 防止 JavaScript 存取
  secure: true,        // 必須 HTTPS（sameSite: 'none' 的強制要求）
  sameSite: 'none',    // 允許跨站請求（前後端分離部署必要）
  path: '/',
  maxAge: COOKIE_MAX_AGE_MS  // 7 天（毫秒）
};

// 若有設定 COOKIE_DOMAIN 環境變數則套用
if (process.env.COOKIE_DOMAIN) {
  cookieOptions.domain = process.env.COOKIE_DOMAIN; // e.g. '.daodao.so'
}
```

**Cookie 名稱**：`auth_token`（主要），清除時也會一併清除 `access_token`、`refresh_token`、`session`（向下相容）

### 3.2 設定比較表

| 屬性 | Dev 環境 | Prod 環境 | 說明 |
|------|----------|-----------|------|
| `httpOnly` | `true` | `true` | 防 XSS，兩環境相同 |
| `secure` | `true` | `true` | 強制 HTTPS，dev 需要 HTTPS 本機測試或使用 dev server |
| `sameSite` | `'none'` | `'none'` | 跨站需要，兩環境相同 |
| `path` | `'/'` | `'/'` | 全站，兩環境相同 |
| `maxAge` | 7 天 | 7 天 | 兩環境相同 |
| `domain` | 由 `COOKIE_DOMAIN` 決定（可能未設定） | 由 `COOKIE_DOMAIN` 決定（e.g. `.daodao.so`） | **關鍵差異** |

### 3.3 關鍵差異：Cookie Domain

- **Prod**：設定 `COOKIE_DOMAIN=.daodao.so`，使 Cookie 跨子域名共享（`daodao.so`、`dev.daodao.so`、`server.daodao.so` 等）
- **Dev**：若 `COOKIE_DOMAIN` 未設定，Cookie 綁定發出 Set-Cookie 的 hostname（即後端的 hostname）；若前後端不同 hostname，Cookie 無法跨域傳送

> 注意：`sameSite: 'none'` 必須搭配 `secure: true`（HTTPS）才能生效。在 HTTP 本機開發時，瀏覽器會拒絕此 Cookie。

---

## 4. 環境變數差異

### 4.1 後端（daodao-server）

| 變數 | Dev | Prod | 說明 |
|------|-----|------|------|
| `NODE_ENV` | `development` | `prod` | 影響框架行為（錯誤訊息詳細程度等） |
| `LOG_LEVEL` | `debug` | `info` | Dev 輸出詳細 debug log |
| `WINSTON_CONSOLE` | `true` | `false` | Dev 在 console 輸出 log，Prod 僅寫檔 |
| `DATABASE_URL` | `postgresql://...@pg-dev:5432/daodao` | `postgresql://...@pg-prod:5432/daodao` | 指向不同 PostgreSQL 主機 |
| `GOOGLE_CALLBACK_URL` | （需填，指向 dev server） | （需填，指向 prod server） | Google OAuth redirect URL，需在 Google Console 白名單 |
| `FRONTEND_URL` | （需填，e.g. `https://dev.daodao.so`） | （需填，e.g. `https://daodao.so`） | OAuth callback 後重定向到前端的基礎 URL |
| `COOKIE_DOMAIN` | （未在範本中列出，通常不設或設 dev 子域） | （e.g. `.daodao.so`） | Cookie 跨子域共享設定 |
| `JWT_SECRET` / `JWT_SECURITY` | （需填） | （需填，應更長更複雜） | JWT 簽署金鑰 |
| `REDIS_HOST` | （需填，dev Redis） | （需填，prod Redis） | 儲存 OAuth nonce 的 Redis |
| `SESSION_SECRET` | （需填） | （需填） | Express Session 金鑰 |

> 注意：`COOKIE_DOMAIN` 未出現在 `.env.dev_temp` 或 `.env.prod_temp` 範本中，代表需要在部署時手動設定。

### 4.2 前端（daodao-f2e）

| 變數 | Dev（`.env.dev`） | Prod（`.env.example` 推測） | 說明 |
|------|------------------|---------------------------|------|
| `NODE_ENV` | `dev` | （production） | Next.js 環境模式 |
| `NEXT_PUBLIC_SITE_URL` | `https://dev.daodao.so` | `https://daodao.so`（推測） | 網站主 URL |
| `NEXT_PUBLIC_API_BASE_URL` | `https://server-dev.daodao.so` | `https://server.daodao.so`（推測） | 後端 API 基礎 URL |
| `NEXT_PUBLIC_API_URL` | `https://server-dev.daodao.so` | `https://server.daodao.so`（推測） | 同上 |
| `NEXT_PUBLIC_BACKEND_URL` | `https://server-dev.daodao.so` | `https://server.daodao.so`（推測） | 後端 URL |
| `NEXT_PUBLIC_AI_API_URL` | `https://ai-dev.daodao.so` | `https://ai.daodao.so`（推測） | AI 服務 URL |
| `NEXT_PUBLIC_APP_URL` | `https://app-dev.daodao.so` | `https://app.daodao.so`（推測） | App URL |
| `NEXT_PUBLIC_DEBUG_MODE` | `true` | `false`（推測） | 啟用除錯模式 |
| `NEXT_PUBLIC_ENABLE_ANALYTICS` | `true` | `true` | 分析工具開關 |
| `NEXT_PUBLIC_ENABLE_PWA` | `false` | （可能啟用） | PWA 功能開關 |
| `NEXT_OUTPUT` | `export`（靜態匯出） | （可能不同） | Next.js 輸出模式 |

---

## 5. 前端路由與行為

Next.js 使用 App Router，auth 相關頁面位於 `apps/product/src/app/[locale]/auth/`。

### 5.1 `/auth/login`

- **Client Component**，掛載後立即呼叫 `openLoginDialog()`
- 從 URL 參數讀取 `redirect` 參數，傳入 Dialog 作為登入後跳轉目標
- 設定 `dismissible: false`（不可關閉），強制登入
- **Android CCT 場景**：OAuth 完成後主 tab 偵測到 `isAuthenticated` 變為 true，自動執行跳轉

### 5.2 `/auth/callback`

- **Client Component**，後端 OAuth 成功後重定向到此頁面
- 執行 `useRedirectAfterLogin()` hook，解析 URL 中的 `state`、`isNewUser`、`redirect` 參數
- 顯示「正在處理登入...」載入畫面
- 依邏輯跳轉到最終目的地

### 5.3 `/auth/error`

- 顯示 OAuth 錯誤訊息，根據後端傳入的 `reason` 參數顯示對應內容

| `reason` | 顯示內容 |
|----------|---------|
| `state_expired` | State 已過期 |
| `invalid_state` | State 格式無效 |
| `invalid_redirect_uri` | 非法重定向 URI（不提供重試按鈕） |
| `server_error` | 伺服器錯誤 |
| `missing_state` | 缺少 state 參數 |
| `invalid_nonce` | Nonce 驗證失敗（CSRF 保護觸發） |
| `auth_failed` | Passport 驗證失敗 |
| `passport_error` | Passport 內部錯誤 |
| 其他 | 未知錯誤 |

### 5.4 `/auth/onboarding`

- 供 **臨時用戶**（`isTemporary = true`）完成個人資料設定
- 已完成 Onboarding 的正式用戶訪問此頁面時，自動跳轉到首頁 `/`
- 未登入的用戶同樣跳轉到首頁

### 5.5 Middleware（`src/middleware.ts`）

- 僅負責 **i18n 路由處理**（locale 前綴插入）
- **不做認證保護**：由於跨域限制，middleware 無法讀取 Cookie，因此路由保護完全依賴 Client-side（`useRequireAuth` hook 或 `AuthGuard` 元件）

---

## 6. 後端 API 端點

以下為登入相關的後端 API 路由（基礎路徑：`/api/auth`）：

| 方法 | 路徑 | 說明 |
|------|------|------|
| `GET` | `/api/auth/google` | 啟動 Google OAuth 流程，帶 `state`/`redirectUrl` 參數 |
| `GET` | `/api/auth/google/callback` | Google 回調，Passport 處理後進入 `googleCallback` controller |
| `POST` | `/api/auth/login` | 密碼登入（**目前停用**，僅回傳錯誤） |
| `POST` | `/api/auth/register` | 用戶註冊（**目前停用**，僅回傳錯誤） |
| `POST` | `/api/auth/logout` | 登出，清除 `auth_token` Cookie |
| `GET` | `/api/auth/me` | 取得當前用戶資訊（需驗證） |
| `POST` | `/api/auth/refresh` | 重新整理 JWT Token |
| `POST` | `/api/auth/verify-email` | 驗證電子郵件 |

### `GET /api/auth/google` 支援的查詢參數

| 參數 | 說明 |
|------|------|
| `state` | 前端預先建立的 OAuth State（base64 編碼） |
| `redirectUrl` | 登入後的跳轉目標路徑（Web） |
| `redirect_uri` | 登入後的跳轉目標（App，支援 custom scheme） |
| `source` | `website` 或 `app`（若未提供則自動偵測） |

---

## 7. 已知的 dev/prod 差異與潛在問題

### 7.1 Cookie 無法跨域（最常見的 dev 問題）

**症狀**：Dev 環境登入成功但頁面仍顯示未登入  
**原因**：前端（`dev.daodao.so`）與後端（`server-dev.daodao.so`）屬於不同 origin；若後端未設定 `COOKIE_DOMAIN=.daodao.so`，Cookie 只會綁定到後端的 hostname，前端無法讀取  
**解法**：確認 dev 後端也設定了 `COOKIE_DOMAIN=.daodao.so`

> 詳細說明：[ai-backend-auth-cookie-domain.md](./ai-backend-auth-cookie-domain.md)

### 7.2 `secure: true` 在 HTTP 本機開發失效

**症狀**：本機 `http://localhost` 測試時，Cookie 完全無法設定  
**原因**：`sameSite: 'none'` 強制要求 `secure: true`，而 `secure: true` 要求 HTTPS，瀏覽器對非 HTTPS 的 `Set-Cookie` 直接忽略  
**解法**：本機開發時使用 HTTPS（mkcert 等工具），或使用遠端 dev server

### 7.3 Google OAuth Callback URL 不符

**症狀**：Google 回傳 `redirect_uri_mismatch` 錯誤  
**原因**：`GOOGLE_CALLBACK_URL` 未加入 Google Cloud Console 的 OAuth 授權重定向 URI 白名單  
**解法**：確保 dev 和 prod 各自的 callback URL 都已在 Google Console 中登記

### 7.4 Nonce 驗證失敗（Redis 問題）

**症狀**：OAuth callback 返回 `/auth/error?reason=invalid_nonce`  
**可能原因**：
- Redis 連線失敗，nonce 未成功儲存
- Nonce 已過期（TTL 設計）
- Browser back-forward cache 重觸發同一個 callback URL

**說明**：當後端偵測到 `invalid_nonce` 但 Cookie 中已有有效 JWT 時，會直接重定向到目標頁（已處理 bfcache 場景）

### 7.5 `FRONTEND_URL` 設定錯誤

**症狀**：登入成功後重定向到錯誤的 URL  
**原因**：後端 `FRONTEND_URL` 若設錯，`/auth/callback` 的重定向目標會指向錯誤的前端  
**解法**：確認 dev server 的 `FRONTEND_URL` 指向 `https://dev.daodao.so`，prod 指向 `https://daodao.so`

### 7.6 Log 詳細程度差異

- Dev（`LOG_LEVEL=debug`）：OAuth 每個步驟都有詳細 log，方便追蹤
- Prod（`LOG_LEVEL=info`）：僅記錄關鍵資訊與錯誤，debug log 不輸出

---

## 8. JWT Token 機制

### 8.1 Token 產生

```typescript
// jwt.service.ts
const JWT_EXPIRATION = '7d';

export const generateToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRATION });
};
```

**Payload 內容：**

| 欄位 | 類型 | 說明 |
|------|------|------|
| `id` | `number` | 用戶在資料庫中的 integer ID |
| `_id` | `string`（UUID） | 正式用戶的 `external_id`（temp 用戶無此欄位） |
| `username` | `string` | 用戶名稱 |
| `isTemp` | `boolean` | `true` 為臨時用戶，`false` 為正式用戶 |
| `roles` | `string[]` | 用戶角色清單（e.g. `['admin']`） |
| `permissions` | `string[]` | 用戶權限清單 |
| `iat` | `number` | Token 發放時間（Unix timestamp） |
| `exp` | `number` | Token 過期時間（7 天後） |

### 8.2 Token 取得順序

後端從 Request 取 Token 的優先順序（`getAuthToken` 函式）：
1. **Cookie**：`auth_token`（主要方式）
2. **Authorization header**：`Bearer <token>`（備援）

### 8.3 Token 驗證

```typescript
export const verifyToken = (token: string): JwtVerifyResult => {
  const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
  // 失敗回傳 { error: "Token has expired" } 或 { error: "Token is invalid" }
};
```

### 8.4 Token 刷新

- API：`POST /api/auth/refresh`
- `refreshToken()` 函式重新簽發 JWT，payload 保留原內容並加上 `refreshedAt` timestamp
- Cookie 的有效期為 7 天（`maxAge`），JWT 本身也是 7 天（`expiresIn: '7d'`）；兩者需同步，否則 Cookie 失效但 JWT 仍有效（或反之）

### 8.5 Token 金鑰設定

JWT 金鑰讀取順序（`getJwtSecret`）：
```typescript
const JWT_SECRET = process.env.JWT_SECRET || process.env.JWT_SECURITY;
```

> 注意：範本中使用 `JWT_SECURITY` 而非 `JWT_SECRET`，兩個名稱都支援以向下相容。

### 8.6 Cookie 有效期

```typescript
export const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 天（毫秒）
```

Cookie `maxAge` 與 JWT `expiresIn` 均設為 7 天，兩者一致。

---

## 參考

- Cookie 設定：`daodao-server/src/utils/cookie-config.ts`
- OAuth 流程：`daodao-server/src/services/auth/oauth.service.ts`
- Auth Controller：`daodao-server/src/controllers/auth.controller.ts`
- Redirect 驗證：`daodao-server/src/utils/redirect-validation.ts`
- JWT 服務：`daodao-server/src/services/jwt.service.ts`
- 前端登入頁：`daodao-f2e/apps/product/src/app/[locale]/auth/login/page.tsx`
- 前端 Callback：`daodao-f2e/apps/product/src/app/[locale]/auth/callback/page.tsx`
- 前端 Middleware：`daodao-f2e/apps/product/src/middleware.ts`
- Cookie Domain 問題：`docs/troubleshooting/ai-backend-auth-cookie-domain.md`
