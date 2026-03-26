# Android 手機 OAuth 登入失敗修復紀錄

**問題期間：** 2026-03-03 ~ 2026-03-11
**影響範圍：** Android 手機使用 Google 帳號登入時失敗
**症狀：** 登入後跳轉至 `https://app-dev.daodao.so/en/auth/login?redirect=%2Fauth%2Ferror%3Freason%3Dinvalid_state`
**狀態：** ✅ 已修復，實機驗證 Android 登入成功（`8ca46aa` 提交後）

---

## 問題描述

Android 使用者點擊 Google 登入後，流程無法完成，最終被導向前端錯誤頁面，顯示 `invalid_state` 錯誤。iOS 與桌面瀏覽器不受影響，問題專屬於 Android 環境。

---

## 根本原因分析

| # | 問題 | 說明 |
|---|------|------|
| 1 | **OAuth 錯誤回傳 JSON 而非 redirect** | 後端遇到 `INVALID_STATE` 等錯誤時直接回傳 400/500 JSON，但前端（Android WebView / CCT）預期的是 redirect，導致錯誤無法被前端正確處理 |
| 2 | **Chrome 預載偵測失效** | `Sec-Purpose` header 可能為複合值（如 `prefetch;prerender`），原本用嚴格比對（`===`）無法過濾，導致預載請求誤觸 OAuth 流程 |
| 3 | **Session cookie 設定不完整** | 缺少 `sameSite`、`httpOnly`、`maxAge`，在 Android Custom Chrome Tab（CCT）跨進程場景下 cookie 傳送不穩定 |
| 4 | **OAuth state 依賴 session 儲存** | passport-oauth2 預設使用 `SessionStateStore`，Android CCT 在不同進程間 session 不連續，導致 callback 時找不到原本的 state，觸發 `invalid_state` |
| 5 | **Android 裝置時鐘超前 server** | Android 裝置時鐘若比 server 快（NTP 同步差異），前端傳入的 state timestamp 會比 server 現在時間還要新，`age < 0` 的嚴格檢查會直接拒絕合法的 state |

---

## 修復內容

### Commit 1：`f742e14` — OAuth 錯誤改為 redirect（2026-03-03）

**問題：** 後端遇到 `INVALID_STATE`、`INVALID_REDIRECT_URI`、`NONCE_STORAGE_FAILED` 等錯誤時，直接回傳 JSON 錯誤，Android 前端無法正確處理。

**修改：**
- 所有 OAuth 發起階段（`authenticateGoogle`）的錯誤回應，從 `res.status(400).json(...)` / `res.status(500).json(...)` 改為 `res.redirect(frontendUrl + '/auth/error?reason=...')`
- Chrome 預載偵測從嚴格比對（`=== 'prefetch'`）改為 `includes('prefetch')`，修正複合 header 值無法過濾的問題

**檔案：** `src/services/auth/oauth.service.ts`

---

### Commit 2：`6e2e46c` — Redis State Store + Session Cookie 強化（2026-03-10）

**問題：** Android CCT 跨進程時 session 不連續，passport-oauth2 的 SessionStateStore 找不到原始 state，導致 callback 失敗。

**修改：**

**① 新建 Redis-based OAuth State Store**

新增 `src/services/auth/oauth-redis-state-store.service.ts`，實作 `RedisOAuthStateStore` 類別：
- `store()` — OAuth 發起時，將 state 存入 Redis（key: `passport_oauth_state:<handle>`，TTL 10 分鐘）
- `verify()` — Callback 時從 Redis 取出 state 並驗證，驗證後立即刪除（防重放攻擊）
- 不依賴 session，完全以 Redis 作為 state 儲存媒介

**② 在 GoogleStrategy 啟用 Redis State Store**

在 `src/services/auth/oauth.service.ts` 的 `GoogleStrategy` 初始化時加入 `store: redisOAuthStateStore`，取代預設的 `SessionStateStore`。

**③ 強化 Session Cookie 設定**

在 `src/server.ts` 更新 session cookie：

```typescript
// 修改前
cookie: { secure: false }

// 修改後
cookie: {
  secure: isProduction,                        // HTTPS 環境才標記 secure
  httpOnly: true,                              // 防 XSS
  sameSite: isProduction ? 'none' : 'lax',    // 跨站場景需要 none（須搭配 HTTPS）
  maxAge: 10 * 60 * 1000                       // 10 分鐘，與 nonce/state 有效期一致
}
```

**④ 加強 logging**

全面將 `console.log/warn/error` 改為 `loggerService`，並在 `authenticateGoogleCallback` 加入詳細的 callback 診斷 log（user、info、sessionID、User-Agent 等）。

**檔案：**
- `src/services/auth/oauth-redis-state-store.service.ts`（新建）
- `src/services/auth/oauth.service.ts`
- `src/server.ts`

---

### Commit 3：`8ca46aa` — 允許 Android 裝置 5 秒時鐘誤差（2026-03-11）

**問題：** Android 裝置時鐘可能比 server NTP 時間快幾秒，導致前端產生的 state timestamp 比 server 現在時間更新，`age < 0` 的判斷會靜默拒絕合法 state，使 Android 使用者在還沒進入 Google 登入頁面前就被導向 `/auth/error?reason=invalid_state`。

**修改：**

`src/utils/oauth-state.ts` — `validateOAuthState()` 函數：
```typescript
// 修改前
if (age < 0) {
  return { valid: false, error: 'Invalid timestamp' };
}

// 修改後
const CLOCK_SKEW_TOLERANCE_MS = 5000; // 允許最多 5 秒 clock skew
if (age < -CLOCK_SKEW_TOLERANCE_MS) {
  return { valid: false, error: 'Invalid timestamp' };
}
```

`src/services/auth/oauth.service.ts` — `authenticateGoogle()`：
- 加入 warning log，記錄拒絕 invalid state 時的 error、reason、IP、User-Agent（原本是靜默失敗）

**檔案：**
- `src/utils/oauth-state.ts`
- `src/services/auth/oauth.service.ts`

---

## Log 實際證據

### 失敗現場（2026-03-10 dev log，修復前）

**Android 裝置 `Linux; Android 10; K` / Chrome 145 / IP `2001:b400:e299:2219:...`**

```
11:26:21  GET /api/v1/auth/google?state=<A>   → 302  duration:1  contentLength:86  ← 異常！
11:26:24  GET /api/v1/auth/google?state=<B>   → 302  duration:1  contentLength:86  ← 再次失敗
11:26:44  GET /api/v1/auth/google?state=<C>   → 302  duration:1  contentLength:86  ← loop
11:26:47  GET /api/v1/auth/google?state=<D>   → 302  duration:1  contentLength:86
11:26:50  GET /api/v1/auth/google?state=<E>   → 302  duration:1  contentLength:86
...（持續 loop）
```

**對比：正常 iOS 登入（同一天 09:55）**

```
09:55:13  GET /api/v1/auth/google?state=<F>   → 302  duration:3  contentLength:0   ← 正確 redirect 到 Google
09:55:25  GET /api/v1/auth/google/callback    → 302  duration:341 userId:2          ← 登入成功
```

**關鍵差異：** Android 的 302 `contentLength=86`（redirect 到 `/auth/error?reason=invalid_state`），iOS 的 302 `contentLength=0`（正確 redirect 到 Google）。

### State 解碼：Android 的 clock skew 精確數據

第一次請求的 state `<A>` 解碼：

```json
{
  "redirectUrl": "/",
  "source": "app",
  "timestamp": 1773141981480,
  "nonce": "8b9597492f910bdd..."
}
```

| 時間 | 說明 |
|------|------|
| `1773141981480` ms → `2026-03-10T11:26:21.480Z` | Android 裝置產生 state 的 timestamp |
| `2026-03-10 11:26:21` | Server log 顯示 request 抵達時間（UTC） |
| `age = serverNow - stateTimestamp ≈ -480ms` | Android 時鐘比 server 快約 **480 毫秒** |

```
age = -480ms
舊判斷：age < 0  → true  → INVALID_STATE → redirect 到 /auth/error
新判斷：age < -5000ms → false → 接受，繼續 OAuth 流程
```

**結論：** Android 裝置時鐘僅超前 server **0.48 秒**，就被舊版嚴格的 `age < 0` 檢查靜默拒絕。

### 失敗 Loop 的 State 內容

第二次請求的 state `<B>` 解碼：

```json
{
  "redirectUrl": "/auth/error?reason=invalid_state",
  "source": "app",
  "timestamp": 1773141984807,
  "nonce": "..."
}
```

前端在收到第一次 `invalid_state` 後，將錯誤 URL 包入下一個 state 的 `redirectUrl`，造成每次重試都帶著錯誤目的地 —— 即使之後成功通過 Google OAuth，也會被 redirect 到 `/auth/error`。

### 修復後驗證：`OAuth google - request initiated` log 出現

Commit `6e2e46c` 加入的 diagnostic log 在 14:47 出現，確認新版代碼已生效：

```
14:47:23  OAuth google - request initiated  userAgent: Android Chrome  sessionID: Nb0Ld...
```

但此時 clock skew fix（`8ca46aa`）尚未提交（00:13 on March 11），故 Android 仍失敗。

---

## 修復總覽

| Commit | 日期 | 解決的問題 |
|--------|------|-----------|
| `f742e14` | 2026-03-03 | OAuth 錯誤改為 redirect；Chrome 預載偵測修正 |
| `6e2e46c` | 2026-03-10 | Redis State Store 解除 session 依賴；Session Cookie 強化 |
| `8ca46aa` | 2026-03-11 | Android 裝置時鐘誤差容忍（5 秒 clock skew）✅ 實機驗證成功 |

---

## 架構說明

修復後的 OAuth 流程（Android CCT 場景）：

```
Android App
  └─▶ 前端產生 state（含 nonce、redirectUrl、timestamp）
  └─▶ GET /api/v1/auth/google?state=<encoded>
        ├─ validateOAuthState()（允許 5s clock skew）
        ├─ oauthNonceService.storeNonce() → Redis
        ├─ RedisOAuthStateStore.store() → Redis（TTL 10m）
        └─▶ redirect 到 Google OAuth

Google 驗證完成
  └─▶ GET /api/v1/auth/google/callback?code=...&state=<handle>
        ├─ RedisOAuthStateStore.verify() → 從 Redis 取出並刪除 state
        ├─ passport.authenticate('google', customCallback)
        └─▶ redirect 到前端 app（深層連結 or web URL）
```

Session 不再是 OAuth state 驗證的必要條件，Android CCT 跨進程問題徹底排除。
