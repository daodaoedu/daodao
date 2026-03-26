# Android Chrome OAuth Callback Fix Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修復 Android Chrome 使用 OAuth 登入時 callback 被 Passport 攔截、無法完成登入的問題。

**Architecture:** 三層修復：(1) 移除重複 Passport 初始化、(2) 修正 session cookie 屬性、(3) 將 `authenticateGoogleCallback` 的 `failureRedirect` 改為 custom callback 加入完整診斷 log；另加一層根本解法 (4) 實作 Redis-based State Store，移除 OAuth state 對 session 的依賴。

**Tech Stack:** Express.js, Passport.js (passport-google-oauth20, passport-oauth2), Redis (ioredis), TypeScript

---

## 問題根因摘要

| # | 問題 | 影響 |
|---|------|------|
| 1 | `app.ts` 重複呼叫 `passport.initialize()` + `passport.session()` | 可能干擾 session 序列化順序 |
| 2 | Session cookie 缺少 `sameSite` 與 `httpOnly` | Android CCT cross-site 場景 cookie 傳送不穩定 |
| 3 | `failureRedirect` 指向前端，後端無 error log | 無法診斷 Passport 內部失敗原因 |
| 4 | passport-oauth2 預設 `SessionStateStore` 依賴 session | Android CCT session 不連續時 state 驗證失敗 |

---

## Chunk 1: 診斷層與基礎修復

### Task 1: 移除 `app.ts` 的重複 Passport 初始化

**Files:**
- Modify: `src/app.ts:86-89`

- [ ] **Step 1: 確認重複初始化位置**

  `server.ts:157-159` 已正確初始化 Passport；`app.ts:87-88` 的 `initializePassport()` / `initializePassportSession()` 為多餘呼叫。

- [ ] **Step 2: 移除 `app.ts` 裡的重複初始化**

  將 `src/app.ts` 中的以下三行移除：
  ```typescript
  // 刪除以下兩行（以及對應 import）
  app.use(initializePassport());
  app.use(initializePassportSession());
  ```
  同時移除 `import { initializePassport, initializePassportSession }` 這行 import。

- [ ] **Step 3: 驗證服務仍可啟動**

  ```bash
  cd /Users/xiaoxu/Projects/daodao/daodao-server
  pnpm run typecheck
  ```
  Expected: 無 TypeScript 錯誤

- [ ] **Step 4: Commit**

  ```bash
  git add src/app.ts
  git commit -m "fix: remove duplicate passport initialization in app.ts"
  ```

---

### Task 2: 修正 Session Cookie 設定

**Files:**
- Modify: `src/server.ts:150-155`

- [ ] **Step 1: 更新 session cookie 設定**

  將 `src/server.ts` 的 session 設定修改如下：
  ```typescript
  // 修改前
  app.use(session({
    secret: process.env.SESSION_SECRET || 'default-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }, // 開發環境設為 false
  }));

  // 修改後
  const isProduction = process.env.NODE_ENV === 'production';
  app.use(session({
    secret: process.env.SESSION_SECRET || 'default-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: isProduction,           // HTTPS 環境才標記 secure
      httpOnly: true,                  // 防止 XSS 讀取 cookie
      sameSite: isProduction ? 'none' : 'lax',  // production 跨站需要 none
      maxAge: 10 * 60 * 1000           // 10 分鐘，與 nonce/state 有效期一致
    }
  }));
  ```

  > **注意：** `sameSite: 'none'` 必須搭配 `secure: true`（HTTPS）才有效。若 production 環境確認使用 HTTPS，此設定可讓 Android CCT 跨站場景正確傳送 cookie。

- [ ] **Step 2: 型別檢查**

  ```bash
  pnpm run typecheck
  ```
  Expected: 無錯誤

- [ ] **Step 3: Commit**

  ```bash
  git add src/server.ts
  git commit -m "fix: add sameSite, httpOnly, maxAge to session cookie for Android CCT compatibility"
  ```

---

### Task 3: 將 `authenticateGoogleCallback` 改為 Custom Callback 加 Diagnostic Log

**Files:**
- Modify: `src/services/auth/oauth.service.ts:292-298`

**目的：** 讓 Passport 失敗時在後端留下可查的 log，而非靜默 redirect 到前端，方便未來診斷。

- [ ] **Step 1: 修改 `authenticateGoogleCallback` 的型別與實作**

  將 `src/services/auth/oauth.service.ts` 的 `authenticateGoogleCallback` 從：
  ```typescript
  export const authenticateGoogleCallback = isOAuthConfigured()
    ? passport.authenticate('google', {
      failureRedirect: (process.env.FRONTEND_URL || 'http://localhost:3000') + '/auth/failure'
    })
    : (req: any, res: any, next: any) => {
      res.status(500).json({ error: 'OAuth not configured' });
    };
  ```

  改為（在檔案頂部加入 `import { loggerService } from '../logging/logger.service';`，若尚未引入）：
  ```typescript
  export const authenticateGoogleCallback = isOAuthConfigured()
    ? (req: Request, res: Response, next: NextFunction): void => {
        passport.authenticate('google', (err: Error | null, user: Express.User | false, info: unknown) => {
          const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

          if (err) {
            console.error('OAuth callback - passport error', {
              error: err.message,
              stack: err.stack,
              userAgent: req.get('User-Agent'),
              ip: req.ip,
              stateParam: req.query.state ? String(req.query.state).substring(0, 20) + '...' : 'missing'
            });
            res.redirect(`${frontendUrl}/auth/error?reason=passport_error`);
            return;
          }

          if (!user) {
            console.warn('OAuth callback - authentication failed (no user)', {
              info: JSON.stringify(info),
              userAgent: req.get('User-Agent'),
              ip: req.ip,
              hasState: !!req.query.state,
              hasCode: !!req.query.code,
              sessionExists: !!(req as any).session,
              sessionID: (req as any).sessionID || 'none'
            });
            res.redirect(`${frontendUrl}/auth/error?reason=auth_failed`);
            return;
          }

          req.user = user;
          next();
        })(req, res, next);
      }
    : (req: Request, res: Response, _next: NextFunction): void => {
        res.status(500).json({ error: 'OAuth not configured' });
      };
  ```

- [ ] **Step 2: 確認 loggerService 引入（若要統一用 loggerService 替換 console）**

  目前 `oauth.service.ts` 使用 `console.log` / `console.error`，維持一致性即可；若專案規範要求 loggerService，可替換，但不影響功能。

- [ ] **Step 3: 型別檢查**

  ```bash
  pnpm run typecheck
  ```
  Expected: 無錯誤

- [ ] **Step 4: Commit**

  ```bash
  git add src/services/auth/oauth.service.ts
  git commit -m "fix: replace failureRedirect with custom callback in googleCallback for better error logging"
  ```

---

### Task 4: 在 `authenticateGoogle` 加入 Android 診斷 Log

**Files:**
- Modify: `src/services/auth/oauth.service.ts:190-199`

**目的：** 記錄發起 OAuth 請求的 User-Agent，用於確認是否為 Android Chrome CCT。

- [ ] **Step 1: 在 `authenticateGoogle` 開頭加入 log**

  在 `src/services/auth/oauth.service.ts` 的 `authenticateGoogle` 函數內，speculative loading 檢查之後（約 line 200），加入：
  ```typescript
  // 診斷 log：記錄 OAuth 請求來源
  console.log('OAuth google - request initiated', {
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    hasState: !!req.query.state,
    hasRedirectUri: !!req.query.redirect_uri,
    sessionID: (req as any).sessionID || 'none'
  });
  ```

- [ ] **Step 2: 型別檢查**

  ```bash
  pnpm run typecheck
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add src/services/auth/oauth.service.ts
  git commit -m "fix: add diagnostic logging to authenticateGoogle for Android CCT debugging"
  ```

---

## Chunk 2: 根本解法 — Redis State Store

### Task 5: 實作 Redis-based OAuth State Store

**Files:**
- Create: `src/services/auth/oauth-redis-state-store.service.ts`
- Modify: `src/services/auth/oauth.service.ts`

**目的：** 將 passport-oauth2 的 state 儲存從 session 改為 Redis，徹底移除對 session 的依賴，讓 Android CCT 環境中 state 驗證不再受 session 孤立影響。

- [ ] **Step 1: 建立 `oauth-redis-state-store.service.ts`**

  建立 `src/services/auth/oauth-redis-state-store.service.ts`：
  ```typescript
  /**
   * Redis-based OAuth State Store
   * 替換 passport-oauth2 預設的 SessionStateStore
   * 使 OAuth state 驗證不依賴 session cookie，解決 Android CCT 跨進程 session 不連續問題
   */
  import crypto from 'crypto';
  import redis from '../database/redis.service';

  const STATE_HANDLE_PREFIX = 'passport_oauth_state:';
  const STATE_EXPIRY_SECONDS = 600; // 10 分鐘，與 OAuth nonce 有效期一致

  /**
   * passport-oauth2 StateStore 介面的 Redis 實作
   * 參考 passport-oauth2 源碼：StateStore.store / StateStore.verify
   */
  export class RedisOAuthStateStore {
    /**
     * 儲存 OAuth state（在 /auth/google 時由 passport-oauth2 呼叫）
     * @param req - Express request
     * @param state - 要儲存的 state 值（我們傳入的 base64url 字串）
     * @param callback - (err, handle) 回呼
     */
    store(
      req: unknown,
      state: string,
      callback: (err: Error | null, handle?: string) => void
    ): void {
      const handle = crypto.randomBytes(16).toString('hex');
      const key = `${STATE_HANDLE_PREFIX}${handle}`;

      redis.setex(key, STATE_EXPIRY_SECONDS, state)
        .then(() => {
          console.log('RedisStateStore.store - state stored', {
            handlePrefix: handle.substring(0, 8) + '...',
            statePrefix: state.substring(0, 20) + '...'
          });
          callback(null, handle);
        })
        .catch((err: Error) => {
          console.error('RedisStateStore.store - failed to store state', { error: err.message });
          callback(err);
        });
    }

    /**
     * 驗證 OAuth state（在 /auth/google/callback 時由 passport-oauth2 呼叫）
     * @param req - Express request
     * @param providedState - Google 回傳的 state（即 handle）
     * @param state - passport-oauth2 期望的 state（此處為 handle 自身）
     * @param callback - (err, ok, stateValue) 回呼
     */
    verify(
      req: unknown,
      providedState: string,
      state: string,
      callback: (err: Error | null, ok: boolean, stateValue?: string) => void
    ): void {
      const key = `${STATE_HANDLE_PREFIX}${providedState}`;

      redis.get(key)
        .then(async (storedState) => {
          if (!storedState) {
            console.warn('RedisStateStore.verify - state not found in Redis', {
              handlePrefix: providedState.substring(0, 8) + '...'
            });
            callback(null, false);
            return;
          }

          // 一次性消耗（防重放）
          await redis.del(key);

          console.log('RedisStateStore.verify - state verified', {
            handlePrefix: providedState.substring(0, 8) + '...'
          });
          callback(null, true, storedState);
        })
        .catch((err: Error) => {
          console.error('RedisStateStore.verify - Redis error', { error: err.message });
          callback(err, false);
        });
    }
  }

  export const redisOAuthStateStore = new RedisOAuthStateStore();
  export default redisOAuthStateStore;
  ```

- [ ] **Step 2: 在 `oauth.service.ts` 引入並使用 RedisOAuthStateStore**

  在 `src/services/auth/oauth.service.ts` 的 import 區加入：
  ```typescript
  import { redisOAuthStateStore } from './oauth-redis-state-store.service';
  ```

  將 GoogleStrategy 的建立（`passport.use('google', new GoogleStrategy(...))`）加入 `store` 選項：
  ```typescript
  // 修改前
  passport.use('google', new GoogleStrategy(
    authOptions,
    async (accessToken, refreshToken, profile, done) => { ... }
  ));

  // 修改後
  passport.use('google', new GoogleStrategy(
    {
      ...authOptions,
      store: redisOAuthStateStore,   // 使用 Redis state store，取代預設 SessionStateStore
    } as unknown as Parameters<typeof GoogleStrategy>[0],  // 型別覆蓋（passport-oauth2 types 未完整定義 store）
    async (accessToken, refreshToken, profile, done) => { ... }
  ));
  ```

  > **關於 `as unknown as`：** passport-oauth2 的 TypeScript types 未在 options 中定義 `store`，但執行期有效。此處型別覆蓋是必要的。

- [ ] **Step 3: 型別檢查**

  ```bash
  pnpm run typecheck
  ```
  Expected: 無錯誤（若有型別問題，調整 cast 方式）

- [ ] **Step 4: 驗證 Redis 連線可用**

  ```bash
  # 確認 Redis 環境變數設定正確
  grep -i redis .env 2>/dev/null || grep -i redis .env.dev_temp 2>/dev/null
  ```

- [ ] **Step 5: Commit**

  ```bash
  git add src/services/auth/oauth-redis-state-store.service.ts src/services/auth/oauth.service.ts
  git commit -m "feat: implement Redis-based OAuth state store to fix Android CCT session isolation"
  ```

---

## Chunk 3: 整合驗證

### Task 6: 手動驗證 OAuth 流程 + Log 確認

- [ ] **Step 1: 啟動 server**

  ```bash
  pnpm run dev
  ```

- [ ] **Step 2: 觸發 OAuth 流程，觀察 log**

  用瀏覽器或 Android Chrome 訪問 `/api/v1/auth/google`，在 server log 確認：

  1. **`OAuth google - request initiated`** → 記錄 User-Agent、sessionID
  2. **`RedisStateStore.store - state stored`** → 確認 Redis 儲存成功
  3. Google 重定向回 `/api/v1/auth/google/callback` 後：
  4. **`RedisStateStore.verify - state verified`** → state 驗證成功
  5. **`OAuth callback - web redirect`** 或 **`OAuth callback - app redirect with auth code`** → callback controller 執行

- [ ] **Step 3: 確認 callback 中不再出現 `auth_failed` 的 redirect**

  若 log 出現 `OAuth callback - authentication failed (no user)`，記錄 `info` 欄位內容，可進一步診斷。

- [ ] **Step 4: 確認 Android Chrome 環境**

  若可測試 Android，確認 User-Agent 含 `Android` 且流程正常完成。

---

## 修復總覽

| Task | 修改檔案 | 解決問題 |
|------|---------|---------|
| 1 | `src/app.ts` | 移除重複 Passport 初始化 |
| 2 | `src/server.ts` | Session cookie 加入 sameSite、httpOnly、maxAge |
| 3 | `src/services/auth/oauth.service.ts` | 加入詳細 error log，不再靜默失敗 |
| 4 | `src/services/auth/oauth.service.ts` | 記錄 OAuth 請求發起的 User-Agent |
| 5 | `src/services/auth/oauth-redis-state-store.service.ts`（新建）+ `oauth.service.ts` | 使用 Redis state store，移除對 session 的依賴 |
