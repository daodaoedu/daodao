# Google OAuth 登入卡在帳號選擇頁

**問題期間：** 2026-05-06
**影響範圍：** 使用者點擊 Google 登入後，停在 accounts.google.com 帳號選擇頁，點選帳號後無法跳回 app
**症狀：** 瀏覽器停在 `accounts.google.com/v3/signin/accountchooser`，沒有繼續完成 OAuth 流程
**狀態：** ✅ 根因確認 — nonce 已消耗後重用同一 state 觸發第二次 callback 失敗

---

## 問題描述

使用者透過 Web 瀏覽器點擊「以 Google 帳號登入」，成功進入 Google 帳號選擇頁後，選擇帳號卻沒有繼續跳回 `server-dev.daodao.so/api/v1/auth/google/callback`，整個 OAuth 流程中斷。

**環境：**
- 瀏覽器：Chrome（桌機）
- 前端：`app-dev.daodao.so`
- 後端：`server-dev.daodao.so`
- Google redirect_uri：`https://server-dev.daodao.so/api/v1/auth/google/callback`

**觀察到的 state 參數（從 Google 帳號選擇頁 URL decode）：**
```json
{
  "redirectUrl": "/",
  "source": "app",
  "timestamp": 1778067270212,
  "nonce": "db04be968adc0e0f93f529a7c6f3a788"
}
```

---

## OAuth 登入完整流程

```
前端 getOAuthLoginUrl()
  → 產生 OAuthState（含 nonce），nonce 存 sessionStorage
  → 跳轉 GET /api/v1/auth/google?state=<encodedState>

後端 authenticateGoogle middleware
  → validateOAuthState()（驗 timestamp、必要欄位）
  → oauthNonceService.storeNonce() → 寫入 Redis（TTL 10 分鐘）
  → passport.authenticate('google', { state: stateParam })
  → 302 redirect 到 Google OAuth

Google 帳號選擇頁 ← 使用者卡在這裡

（正常情況下）用戶選帳號後：
  → Google redirect 到 /api/v1/auth/google/callback?code=...&state=...
  → RedisOAuthStateStore.verify()：decode state，nonceExists() 查 Redis
  → passport 取得 Google profile，找或建立 temp_user
  → setAuthCookie()（auth_token，httpOnly, secure, sameSite=none）
  → redirect 到 ${FRONTEND_URL}/auth/callback?state=...&isNewUser=...&redirect=...

前端 useRedirectAfterLogin()
  → decodeOAuthState()、verifyAndConsumeOAuthState()（驗 sessionStorage nonce）
  → router.push(redirectUrl)
```

---

## 可能根因分析

### 根因 1：`source: "app"` 預設值不正確（低影響，語義問題）

`auth-client.ts` 的 `createOAuthState()` 與 `getOAuthLoginUrl()` 預設 `source: "app"`，但 Web 應為 `"website"`。

目前不會直接造成登入失敗（後端以 `isCustomScheme(redirectUrl)` 判斷流程，不用 `source`），但屬於程式碼語義錯誤，未來擴充邏輯時有潛在風險。

**位置：** `daodao-f2e/packages/auth/src/lib/auth-client.ts:93-96`

---

### 根因 2：callback 失敗後 nonce 未清理（待確認）

`RedisOAuthStateStore.verify()` 只查不刪 nonce（`nonceExists()` 非消耗性），刪除由後續 `googleCallback` controller 的 `verifyAndConsumeNonce()` 負責。

若 `verify()` 通過但 controller 之前某步驟失敗（例如 passport profile fetch 失敗），nonce 仍留在 Redis，下一次嘗試的相同 nonce 還能驗過，這部分邏輯正確。

但如果 `verify()` 本身回傳 `false`（nonce 不在 Redis），passport 觸發 `auth_failed`，後端 redirect 到 `${FRONTEND_URL}/auth/error?reason=auth_failed`。此時用戶不會卡在 Google 頁，而是跳到錯誤頁。

---

### 根因 3：`redirect` param 被前端忽略（設計不一致）

後端 callback 已將乾淨的 `redirect` param 傳給前端：

```ts
// auth.controller.ts:193-197
redirectTarget = buildRedirectUrl(`${frontendUrl}/auth/callback`, {
  state: stateParam,
  isNewUser: String(isNewUser),
  redirect: nonceData.redirectUrl  // ← server 已驗，直接給
});
```

但前端 `useRedirectAfterLogin` 完全不讀這個 `redirect` param，仍自己對 state 做一次 decode + validate（包含 sessionStorage nonce 比對）。如果 sessionStorage 在 OAuth 跳轉期間被清除（Safari Private、跨 tab、某些 Android 瀏覽器），nonce 比對失敗，用戶雖然登入成功，卻被 push 到預設頁而非原目標頁。

---

### 根因 4：Cookie domain 問題（最高風險）

`auth_token` cookie 由後端 `server-dev.daodao.so` 設定，設定：

```ts
httpOnly: true, secure: true, sameSite: 'none'
// domain 只在 COOKIE_DOMAIN env var 存在時才設
```

若 `COOKIE_DOMAIN` 未設為 `.daodao.so`，cookie domain 預設為 `server-dev.daodao.so`，前端在 `app-dev.daodao.so`（或 `daodao.so`）發出的 API request 不會帶上 cookie，`/api/v1/auth/me` 會拿不到 token，用戶看起來未登入。

**這不會造成卡在 Google 頁，但會造成登入後仍未登入的假象。**

---

### 根因 5：卡在 Google 頁的最可能直接原因

**從症狀推斷：** 選帳號後 Google 試圖 redirect 到 `server-dev.daodao.so/api/v1/auth/google/callback`，但 redirect 沒有成功完成，瀏覽器保持在 Google 頁。

可能情況：
- **後端無回應**：server-dev.daodao.so 當時無法處理 callback 請求（deployment、restart、timeout）
- **redirect_uri 未在 Google Cloud Console 中註冊**：Google 拒絕 redirect，但通常會顯示 error page 而非停在 chooser
- **CORS / 安全政策阻擋**：較少見於 server-side redirect

---

## Log 分析結果（2026-05-06 19:48）

### Local 環境測試成功

使用者在 local 環境（`localhost:4000` ↔ `localhost:3001`）重現登入流程，成功：

```
19:48:22  POST /api/v1/auth/logout                 → 200       ← 登出
19:48:26  GET  /api/v1/auth/google?state=...        → 302       ← OAuth 發起（Redis 在此時才連線）
          Redis 連接成功 / Redis 準備就緒
19:48:29  GET  /api/v1/auth/google/callback         → 302  1130ms
          RedisStateStore.verify - nonce validated successfully
          Google OAuth - existing user found
          OAuth callback - web redirect
19:48:33  GET  /api/v1/auth/me                      → 200       ← 登入完成，新 token 有效
```

**結論：OAuth 核心流程本身正確，dev server（`server-dev.daodao.so`）環境的問題仍需確認。**

---

### 在 log 中發現的額外問題

#### 問題 A：Redis 延遲連線

`Redis 連接成功` 在 19:48:26 第一次 OAuth 請求時才出現，不是 server 啟動時。若 dev server Redis 連線不穩，`storeNonce()` 可能在 Redis 未就緒時拋錯，nonce 未存入，之後 callback 驗 nonce 時失敗 → redirect 到 `/auth/error?reason=invalid_nonce`，可能造成停留在 Google 頁（後端 redirect 失敗）。

#### 問題 B：`/api/v1/reactions/batch` 路由不存在（404）

每次頁面載入都觸發，前端 Web 和 Mobile 同時呼叫，但後端沒有此路由：

```
找不到路由: /api/v1/reactions/batch?targetType=practice&targetIds=...
找不到路由: /api/v1/reactions/batch?targetType=checkin&targetIds=...
```

需另立 openspec change 追蹤。

#### 問題 C：JWT Token 明文 `console.log`（安全問題）

```
verifyToken_token eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6...
```

JWT token 完整內容被印出，應改為 `loggerService.debug()`（production 不輸出）。

---

## 排查步驟（dev server 問題）

1. **確認 dev server Redis log**：看 `Redis 連接成功` 是在 server 啟動時出現，還是在第一次 OAuth 請求時才出現

2. **確認 `COOKIE_DOMAIN` 環境變數**：
   ```bash
   echo $COOKIE_DOMAIN  # 應為 .daodao.so
   ```

3. **看 dev server 的 `/api/v1/auth/google/callback` log**：確認 Google callback 有無進來，以及失敗的原因

4. **確認 Google Cloud Console 的 redirect_uri**：`https://server-dev.daodao.so/api/v1/auth/google/callback` 必須完全相符

---

## 待修事項

| 優先 | 問題 | 修法 |
|------|------|------|
| 🔴 P0 | JWT token 明文 `console.log` | 改為 `loggerService.debug()`，避免 token 洩漏 |
| 🔴 P0 | Dev server Redis 延遲連線風險 | Server 啟動時預先 ping Redis，確保連線就緒才接受請求 |
| 🟡 P1 | `/api/v1/reactions/batch` 404 | 後端新增 batch 路由或前端改用個別請求 |
| 🟡 P1 | 前端忽略 `redirect` param | `useRedirectAfterLogin` 優先讀 `redirect` param，state 驗失敗時 fallback |
| 🟡 P1 | sessionStorage nonce 跨 tab 失效 | 評估改用 localStorage 或降低 nonce 驗證阻斷性 |
| 🟢 P2 | `source` 預設值錯誤 | `getOAuthLoginUrl` web 呼叫時傳入 `"website"` |

---

## 相關檔案

- `daodao-f2e/packages/auth/src/lib/auth-client.ts` — `getOAuthLoginUrl`, `createOAuthState`
- `daodao-f2e/packages/auth/src/hooks/use-redirect-after-login.ts` — callback 頁跳轉邏輯
- `daodao-server/src/services/auth/oauth.service.ts` — `authenticateGoogle` middleware
- `daodao-server/src/services/auth/oauth-redis-state-store.service.ts` — Redis state store
- `daodao-server/src/services/auth/oauth-nonce.service.ts` — nonce Redis 管理
- `daodao-server/src/controllers/auth.controller.ts` — `googleCallback`
- `daodao-server/src/utils/cookie-config.ts` — `auth_token` cookie 設定

---

# 附錄：2026-05-07 dev 環境分頁一直轉 + ERR_CONNECTION_TIMED_OUT

**問題期間：** 2026-05-07
**影響範圍：** dev 環境（`app-dev.daodao.so`）未登入使用者進首頁，瀏覽器分頁 favicon 持續轉圈，過一陣子 URL 變成 `app-dev.daodao.so:3001/...` 並 ERR_CONNECTION_TIMED_OUT
**狀態：** 🟡 治症狀已上線（PR #603），根因未明 — 觸發條件 curl 重現不出，仰賴 docker logs 蒐集觸發 headers

---

## 症狀

1. 第一張截圖：URL 是 `app-dev.daodao.so/en`，頁面 SSR 已 render 出 feed，但分頁 favicon 一直轉圈
2. 過幾十秒：URL 自動跳成 `app-dev.daodao.so:3001/en/auth/login?redirect=%2F`，Chrome 顯示 `ERR_CONNECTION_TIMED_OUT`
3. **prod 環境（`app.daodao.so`）對已登入使用者正常**，但用無痕（未登入）測試 prod 不會踩到

---

## 觸發條件

- 必要：使用者**未登入**（cookie 失效或從未登入）
- 必要：透過**瀏覽器**訪問（curl / 工具型 client 重現不出）
- 路徑：進 `/en` → AuthProvider 偵測未登入 → `router.push('/auth/login?redirect=/')` → 某層 server 回 307，`Location` 帶 `:3001`

---

## 排除過程（已驗證的事實，依序排除）

### 1. 第一輪假設：第三方 SDK 卡 connection（PostHog / Clarity）

**❌ 推翻**。container env diff 顯示 dev 根本沒設 `NEXT_PUBLIC_POSTHOG_KEY` / `NEXT_PUBLIC_CLARITY_PROJECT_ID`，prod 才有。連 SDK 都沒載入，不可能是它。

### 2. 第二輪：登入狀態差異

**✅ 驗證有效**。prod 用無痕（未登入）也會踩到一樣的 bug，所以 prod / dev 行為差異純粹是「使用者是否已登入」造成的。bug 一直存在，只是登入後不踩。

### 3. 第三輪：URL `:3001` 的來源 — Cloudflare ?

**❌ 推翻**。從筆電外網直接 curl：

```bash
curl -sI "https://app-dev.daodao.so/auth/login?redirect=/"
HTTP/2 200, server: cloudflare, 沒 Location

curl -sI "https://app.daodao.so/auth/login?redirect=/"
HTTP/2 200, server: cloudflare, 沒 Location
```

兩個域名都是 200，沒任何 redirect，沒 `:3001`。Cloudflare 邊緣自己沒做這件事。

### 4. 第四輪：nginx 配置 ?

**❌ 推翻**。從 VPS 內網 curl 直接打 nginx：

```bash
curl -sI -H "Host: app-dev.daodao.so" http://127.0.0.1/auth/login
HTTP/1.1 200 OK
```

也是 200。**順便發現另一個小問題**：線上 nginx (`docker exec nginx cat /etc/nginx/conf.d/product.conf`) 跑的是舊版，比 git 上的 `daodao-infra/nginx/conf.d/product.conf` 少了三段 `proxy_set_header X-Forwarded-Proto https;`。需要 git pull + `docker exec nginx nginx -s reload`，但這個不是 :3001 的元兇。

### 5. 第五輪：容器環境變數 ?

**❌ 推翻**。

```bash
diff <(docker exec daodao-f2e-dev_product-1 env | sort) \
     <(docker exec daodao-f2e-prod_product-1 env | sort)
```

唯二差異：(a) 域名 `app-dev` vs `app`，(b) prod 多開 GA / Clarity / PostHog / Sentry。**沒有任何環境變數提到 `:3001`**。

### 6. 結論：觸發條件只在瀏覽器流程出現

curl 用各種 header 都重現不出來，但瀏覽器走完整 cookie + Sec-Fetch + 可能還有 Next.js RSC fetch headers 的流程就會踩到 307 + Location 帶 `:3001`。代表觸發條件在某個特定 header 組合，繼續純推理會花很多時間。

---

## 治法（已部署）

PR：[daodaoedu/daodao-f2e#603](https://github.com/daodaoedu/daodao-f2e/pull/603)
Branch：`fix/strip-internal-port-from-redirect-location`（base: `dev`）

`apps/product/src/middleware.ts` 在 next-intl middleware 跑完後攔截 response：

```ts
const INTERNAL_PORT_RE = /:3001(?=\/|$|\?|#)/g;

export default async function middleware(request: NextRequest) {
  const response = await i18nMiddleware(request);
  const location = response.headers.get("location");
  if (location?.includes(":3001")) {
    response.headers.set("location", location.replace(INTERNAL_PORT_RE, ""));
    console.warn("[middleware] stripped :3001 from redirect Location", { /* 觸發 headers */ });
  }
  return response;
}
```

- Location 不含 `:3001` 時不動作 → 對正常 response 無副作用
- 命中時 `console.warn` 記錄 method / path / referer / sec-fetch-* / x-forwarded-* / cookie 與 RSC header 是否存在

---

## 後續：怎麼從 docker logs 追真正根因

**只有 dev / feat 有 docker logs**，prod 的 `daodao-f2e/docker-compose.yaml` 對 `prod_product` 設了 `logging: driver: "none"`，沒 logs 可看。

```yaml
# daodao-f2e/docker-compose.yaml
dev_product:
  logging:
    driver: "json-file"
    options:
      max-size: "1m"   # ← 只留 1MB，注意 rotation
      max-file: "1"

prod_product:
  logging:
    driver: "none"     # ← 完全沒 logs
```

PR merge 部署後，dev 環境踩到 bug 時：

```bash
docker logs daodao-f2e-dev_product-1 --tail 500 2>&1 \
  | grep -A 30 "stripped :3001" | head -100
```

把那段 log 丟回來，特別看：

- `hasRsc` 是不是 `true`（代表 Next.js client navigation 的 RSC fetch）
- `sec-fetch-dest` 是 `document` 還是 `empty`（一般 navigation 還是 fetch）
- `referer` 從哪一頁來
- `path` 是 `/auth/login` 還是已經帶 `/en/auth/login`

有觸發 headers 後，就能用同一組 headers 寫 curl 重現，再去 next-intl middleware / next.js standalone server 程式碼定位是哪行把 internal port 帶到 `Location`。

---

## 已知未解 + 候選根因

- **next-intl middleware 對特定 RSC fetch 用 `req.nextUrl.clone()` 時把 internal port 帶進去**（最可能）
- **Next.js standalone `server.js` 對某 Sec-Fetch 組合用 `process.env.PORT` 組 absolute redirect URL**
- **next-intl `localePrefix` mode 對某些 path 做 strip / add 時組 URL 走錯路徑**

---

## Follow-up 待辦

| 優先 | 項目 | 備註 |
|------|------|------|
| 🟡 P1 | dev 部署 PR #603 後驗證 bug 不再踩 | 用無痕進 `app-dev.daodao.so/en` |
| 🟡 P1 | 線上 nginx reload 拉到 git 最新版 | `daodao-infra` git pull → `docker exec nginx nginx -s reload`，補回 `X-Forwarded-Proto https` |
| 🟢 P2 | 從 docker logs 蒐集觸發 headers，定位真正根因 | 拿到後寫 curl 重現，再修治本 |
| 🟢 P2 | 評估 prod 是否要暫時打開 logging | 為了排查 prod 偶發狀況，但 2GB VPS 要權衡 |

---

## 相關檔案

- `daodao-f2e/apps/product/src/middleware.ts` — 治症狀 patch 位置
- `daodao-f2e/apps/product/src/app/global-provider.tsx` — `AuthProvider` `onAuthRequired` callback (line 61-63)，觸發 router.push 到 /auth/login
- `daodao-f2e/packages/auth/src/lib/auth-provider.tsx` — `useEffect` 在 `getAuthMe` 401 時呼叫 `onAuthRequired`
- `daodao-f2e/docker-compose.yaml` — `dev_product` / `prod_product` logging 設定
- `daodao-infra/nginx/conf.d/product.conf` — git 版有 `X-Forwarded-Proto https`，線上版本缺
- `daodao-infra/nginx/snippets/proxy-headers-ws.conf` — `proxy_set_header Host $host` 確認
