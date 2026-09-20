# 計畫：將 Dev 環境登入流程還原成與 Prod 一致

> 建立時間：2026-05-06  
> 來源文件：`docs/troubleshooting/login-flow-prod-vs-dev.md`

---

## 問題摘要

Dev 環境登入成功但頁面仍顯示未登入。根本原因：

```
後端（server-dev.daodao.so）設定 Set-Cookie
→ 沒有設 COOKIE_DOMAIN
→ Cookie 綁定到 server-dev.daodao.so
→ 前端（dev.daodao.so）是不同 subdomain，收不到 Cookie
→ useRequireAuth / AuthGuard 判定未登入
```

Prod 有設 `COOKIE_DOMAIN=.daodao.so`，所以 `server.daodao.so` 設的 Cookie 能被 `daodao.so` 讀到。

---

## 驗收標準

- [ ] Dev 環境完成 Google OAuth → `/auth/callback` → 跳轉到目標頁，全程不出現「未登入」狀態
- [ ] `/api/auth/me` 在登入後回傳正確用戶資料（HTTP 200）
- [ ] `.env.dev_temp` 含 `COOKIE_DOMAIN` 欄位，避免未來重現同樣問題
- [ ] Google OAuth callback 無 `redirect_uri_mismatch` 錯誤

---

## 實作步驟

### Step 1：更新 Dev Server 環境變數

**檔案：** `daodao-server/.env`（實際部署用的 dev env，非 temp 範本）  
或透過 CI/CD 部署設定（視實際部署方式而定）

加入或確認以下三個變數：

```bash
COOKIE_DOMAIN=.daodao.so
FRONTEND_URL=https://dev.daodao.so
GOOGLE_CALLBACK_URL=https://server-dev.daodao.so/api/auth/google/callback
```

**為什麼：**
- `COOKIE_DOMAIN=.daodao.so`：讓 Cookie domain 設為 `.daodao.so`，所有子域名（`dev.daodao.so`、`server-dev.daodao.so`）都能讀寫此 Cookie
- `FRONTEND_URL`：後端 OAuth callback 後重定向用，必須指向正確的前端
- `GOOGLE_CALLBACK_URL`：必須與 Google Console 白名單一致

### Step 2：更新 `.env.dev_temp` 範本

**檔案：** `daodao-server/.env.dev_temp`

在 `FRONTEND_URL=` 下方加入：

```diff
 FRONTEND_URL=
+COOKIE_DOMAIN=
```

這樣未來設定 dev 環境的人不會遺漏這個變數。

### Step 3：確認 Google Console 白名單

前往 [Google Cloud Console](https://console.cloud.google.com/) → OAuth 2.0 用戶端 → 授權重新導向 URI，確認包含：

```
https://server-dev.daodao.so/api/auth/google/callback
```

（若尚未加入需要手動新增，變更約需 5 分鐘生效）

### Step 4：重新部署 Dev Backend

重啟 `daodao-server` dev 容器，讓環境變數生效：

```bash
# 視部署方式而定，例如：
docker compose restart server
# 或透過 CI/CD 重新 deploy
```

### Step 5：驗證登入流程

1. 清除瀏覽器 Cookie（針對 `.daodao.so` domain）
2. 前往 `https://dev.daodao.so`
3. 點擊登入 → Google OAuth → 完成授權
4. 確認跳轉到 `/auth/callback` 後正確導向目標頁
5. 確認 DevTools → Application → Cookies 下看到 `auth_token`，domain 為 `.daodao.so`
6. 呼叫 `https://server-dev.daodao.so/api/auth/me` 確認回傳 HTTP 200 + 用戶資料

---

## 風險與注意事項

| 風險 | 說明 | 緩解方式 |
|------|------|---------|
| Google Console 白名單未更新 | callback URL 不在白名單 → `redirect_uri_mismatch` | Step 3 先確認再重啟 |
| 實際 env 檔位置不明 | dev server 可能用 Docker secret、CI/CD env、或直接 `.env` | 確認部署腳本或 `docker-compose.yml` 中的 env 注入方式 |
| `secure: true` + HTTP 問題 | 若 dev 任何段是 HTTP，Cookie 會被瀏覽器拒絕 | `dev.daodao.so` 和 `server-dev.daodao.so` 應都走 HTTPS |

---

## 相關檔案

- `daodao-server/src/utils/cookie-config.ts` — `getCookieOptions()` 讀取 `COOKIE_DOMAIN`
- `daodao-server/.env.dev_temp` — Dev 環境變數範本
- `daodao-f2e/.env.dev` — 前端 dev 設定（`NEXT_PUBLIC_API_BASE_URL` 已正確指向 `server-dev.daodao.so`）
- `docs/troubleshooting/login-flow-prod-vs-dev.md` — 完整差異分析
