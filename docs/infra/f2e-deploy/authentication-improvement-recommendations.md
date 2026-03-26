# 登入權限模組改進建議文件
## 認證授權模組 - 改進建議

**專案**: daodao (前端 + 後端)
**文件版本**: 1.0
**更新日期**: 2026-01-07
**作者**: Claude Code Review

---

## 目錄

1. [概述 (Overview)](#1-概述-overview)
2. [現況分析 (Current State Analysis)](#2-現況分析-current-state-analysis)
3. [安全性改進 (Security Improvements)](#3-安全性改進-security-improvements)
4. [使用者體驗優化 (UX Optimization)](#4-使用者體驗優化-ux-optimization)
5. [開發環境配置優化 (Development Environment)](#5-開發環境配置優化-development-environment)
6. [錯誤處理增強 (Error Handling)](#6-錯誤處理增強-error-handling)
7. [效能優化 (Performance Optimization)](#7-效能優化-performance-optimization)
8. [實施優先順序 (Implementation Priority)](#8-實施優先順序-implementation-priority)
9. [詳細實施指南 (Implementation Guide)](#9-詳細實施指南-implementation-guide)

---

## 1. 概述 (Overview)

### 1.1 文件目的

本文件基於對 `daodao-f2e` 和 `daodao-server` 專案的深度程式碼審查，提供具體的、可操作的改進建議，以提升認證授權系統的安全性、可靠性和使用者體驗。

### 1.2 當前架構摘要

**前端 (daodao-f2e)**:
- **技術棧**: Next.js 15.5.2, React 19.1.1, TypeScript 5.7.2
- **認證方式**: Bearer Token (JWT) 儲存在 localStorage
- **API 客戶端**: openapi-fetch + SWR
- **OAuth 流程**: Google OAuth 2.0 (後端實作)
- **使用者狀態**: 臨時使用者 (temp) + 正式使用者 (permanent)

**後端 (daodao-server)**:
- **技術棧**: Express.js 4.21.2, Node.js 16+, TypeScript
- **認證方式**: JWT Token + Passport Session (混合)
- **資料庫**: PostgreSQL (Prisma), MongoDB, Redis
- **OAuth**: passport-google-oauth20
- **Token 有效期**: 7 天 (可設定為 6 小時)

### 1.3 關鍵發現

| 類別 | 現況 | 潛在風險 | 改進緊急度 |
|------|------|---------|-----------|
| **Token 儲存** | localStorage | XSS 攻擊可竊取 Token | 🔴 高 |
| **Cookie 安全** | 缺少 httpOnly, sameSite | CSRF 和 XSS 風險 | 🔴 高 |
| **Token 刷新** | 被動刷新 (401 後) | 使用者感知延遲 | 🟡 中 |
| **State 驗證** | 未實作簽名 | CSRF 和參數竄改 | 🔴 高 |
| **錯誤處理** | 簡單重定向 | 使用者體驗差 | 🟡 中 |
| **開發環境** | 配置複雜 | 團隊協作困難 | 🟢 低 |

---

## 2. 現況分析 (Current State Analysis)

### 2.1 前端認證流程

```
使用者點擊登入
  ↓
開啟登入模態框
  ↓
跳轉 /api/auth/google?origin={origin}&rt={redirectTo}
  ↓
前端設定臨時 cookie (origin, rt) → 重定向到後端 OAuth
  ↓
後端 Google OAuth → 使用者授權
  ↓
回呼 /api/auth/callback?token={jwt}
  ↓
前端讀取臨時 cookie → 清除 → 重定向 /auth/success?token={jwt}&rt={rt}
  ↓
AuthSuccess 元件:
  - 解析 JWT (檢查 isTemp)
  - 儲存到 localStorage
  - 跳轉 onboarding 或目標頁面
  ↓
AuthProvider 初始化:
  - GET /api/v1/users/me (Header: Authorization: Bearer {token})
  - 更新 Context 狀態
```

**現有優點**:
- ✅ 流程清晰，支援跨域重定向
- ✅ 臨時使用者和正式使用者分離明確
- ✅ 使用 TypeScript 型別安全

**存在問題**:
- ❌ Token 儲存在 localStorage，易受 XSS 攻擊
- ❌ 臨時 cookie 缺少安全標誌 (httpOnly, sameSite)
- ❌ OAuth State 參數未簽名，可被竄改
- ❌ 401 錯誤處理簡單，缺少自動重試和友善提示

### 2.2 後端認證實作

**OAuth 回呼程式碼分析** (src/controllers/auth.controller.ts:51-104):

```typescript
export const googleCallback = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user;  // Passport 已驗證的使用者

  // 判斷臨時使用者 vs 正式使用者
  const isTemp = !user.external_id;

  // 產生 JWT Token
  const payload = {
    id: user.id,
    _id: user.external_id,  // UUID for formal users
    username: user.name,
    isTemp,
    roles: userRoles.map(role => role.name),
    permissions: userPermissions.map(permission => permission.name)
  };
  const token = jwtService.generateToken(payload);

  // 重定向到前端，Token 透過 URL 參數傳遞
  const url = `${process.env.FRONTEND_URL}/api/auth/callback?token=${token}`;
  res.redirect(url);
});
```

**現有優點**:
- ✅ 使用 Passport.js 成熟的 OAuth 實作
- ✅ JWT Payload 包含角色和權限資訊
- ✅ 支援臨時使用者機制

**存在問題**:
- ❌ Token 透過 URL 參數傳遞（可被日誌記錄、瀏覽器歷史保存）
- ❌ Session Cookie 設定簡單：`{ secure: false }` (開發) / `{ secure: true }` (生產)
- ❌ 缺少 httpOnly, sameSite, domain 設定
- ❌ JWT Secret 應該更長且定期輪替
- ❌ 無 Token 黑名單機制（登出後 Token 仍有效直到過期）

### 2.3 與需求文件的差異

| 項目 | 需求文件規劃 | 當前實作 | 差異說明 |
|------|------------|---------|---------|
| **Token 儲存** | HTTP-only Cookie | localStorage + Bearer Token | 需求建議更安全的方案 |
| **跨域共享** | Cookie domain=.daodao.so | 無跨域機制 | 需求支援跨子網域 |
| **認證方式** | 純 Cookie 方案 | JWT + Session 混合 | 後端混用兩種機制 |
| **State 參數** | Base64 + HMAC 簽名 | Base64 編碼（無簽名） | 缺少防竄改機制 |
| **Cookie 設定** | httpOnly, secure, sameSite | 僅 secure | 缺少關鍵安全標誌 |

---

## 3. 安全性改進 (Security Improvements)

### 3.1 OAuth State 參數簽名 (高優先度 🔴)

**問題**: 當前使用 Base64 編碼 State 參數，可被任意解碼和竄改。

**檔案位置**:
- 前端: `app/api/auth/google/route.ts`
- 後端: `src/controllers/auth.controller.ts`

**改進方案**:

#### 前端實作

建立新檔案: `shared/lib/oauth-state.ts`

```typescript
import crypto from 'crypto';

// State 結構
export interface OAuthState {
  redirectUrl: string;
  source: 'website' | 'app';
  timestamp: number;
  nonce: string;
}

// 密鑰（應從環境變數讀取）
const STATE_SECRET = process.env.OAUTH_STATE_SECRET || 'default-oauth-state-secret';

/**
 * 建立帶簽名的 OAuth State
 */
export function createSignedState(state: OAuthState): string {
  const payload = JSON.stringify({
    redirectUrl: state.redirectUrl,
    source: state.source,
    timestamp: state.timestamp,
    nonce: state.nonce,
  });

  // 產生 HMAC 簽名
  const signature = crypto
    .createHmac('sha256', STATE_SECRET)
    .update(payload)
    .digest('hex');

  // 組合 payload.signature
  const signedState = `${Buffer.from(payload).toString('base64')}.${signature}`;

  return signedState;
}

/**
 * 驗證並解析 OAuth State
 */
export function verifySignedState(signedState: string): OAuthState | null {
  try {
    const [encodedPayload, receivedSignature] = signedState.split('.');

    if (!encodedPayload || !receivedSignature) {
      return null;
    }

    const payload = Buffer.from(encodedPayload, 'base64').toString('utf-8');

    // 驗證簽名
    const expectedSignature = crypto
      .createHmac('sha256', STATE_SECRET)
      .update(payload)
      .digest('hex');

    if (receivedSignature !== expectedSignature) {
      console.error('Invalid state signature');
      return null;
    }

    const state = JSON.parse(payload) as OAuthState;

    // 驗證時效性（10 分鐘）
    const TEN_MINUTES = 10 * 60 * 1000;
    if (Date.now() - state.timestamp > TEN_MINUTES) {
      console.error('State expired');
      return null;
    }

    return state;
  } catch (error) {
    console.error('State verification failed:', error);
    return null;
  }
}

/**
 * 產生隨機 nonce
 */
export function generateNonce(): string {
  return crypto.randomBytes(16).toString('hex');
}
```

#### 更新前端 OAuth 路由

`app/api/auth/google/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createSignedState, generateNonce, type OAuthState } from '@/shared/lib/oauth-state';
import getEnv from '@/shared/config/env';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const origin = searchParams.get('origin');
  const rt = searchParams.get('rt') || '/';
  const { apiUrl } = getEnv();

  // 建立 State
  const state: OAuthState = {
    redirectUrl: rt,
    source: origin === 'website' ? 'website' : 'app',
    timestamp: Date.now(),
    nonce: generateNonce(),
  };

  // 簽名 State
  const signedState = createSignedState(state);

  // 重定向到後端 OAuth，攜帶簽名的 state
  const oauthUrl = new URL(`${apiUrl}/api/v1/auth/google`);
  oauthUrl.searchParams.set('state', signedState);

  return NextResponse.redirect(oauthUrl.toString());
}
```

#### 後端驗證 State

建立新檔案: `src/utils/oauth-state.ts`

```typescript
import crypto from 'crypto';

export interface OAuthState {
  redirectUrl: string;
  source: 'website' | 'app';
  timestamp: number;
  nonce: string;
}

const STATE_SECRET = process.env.OAUTH_STATE_SECRET || 'default-oauth-state-secret';

export function verifySignedState(signedState: string): OAuthState | null {
  try {
    const [encodedPayload, receivedSignature] = signedState.split('.');

    if (!encodedPayload || !receivedSignature) {
      return null;
    }

    const payload = Buffer.from(encodedPayload, 'base64').toString('utf-8');

    // 驗證簽名
    const expectedSignature = crypto
      .createHmac('sha256', STATE_SECRET)
      .update(payload)
      .digest('hex');

    if (receivedSignature !== expectedSignature) {
      throw new Error('Invalid state signature');
    }

    const state = JSON.parse(payload) as OAuthState;

    // 驗證時效性（10 分鐘）
    const TEN_MINUTES = 10 * 60 * 1000;
    if (Date.now() - state.timestamp > TEN_MINUTES) {
      throw new Error('State expired');
    }

    return state;
  } catch (error) {
    console.error('State verification failed:', error);
    return null;
  }
}
```

更新 `src/controllers/auth.controller.ts`:

```typescript
import { verifySignedState } from '../utils/oauth-state';

export const googleCallback = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user;
  const stateParam = req.query.state as string;

  // 驗證 State
  const state = verifySignedState(stateParam);
  if (!state) {
    throw new UnauthorizedError('Invalid or expired OAuth state');
  }

  // ... 產生 JWT Token

  // 使用 State 中的 redirectUrl
  const url = `${process.env.FRONTEND_URL}/api/auth/callback?token=${token}&rt=${encodeURIComponent(state.redirectUrl)}`;
  res.redirect(url);
});
```

---

### 3.2 Session Cookie 安全增強 (高優先度 🔴)

**問題**: 當前 Session Cookie 缺少關鍵安全標誌。

**檔案位置**:
- `src/server.ts` (TypeScript 伺服器)
- `index.js` (JavaScript 伺服器)

**改進方案**:

#### 更新 Session 設定

`src/server.ts`:

```typescript
import session from 'express-session';

// Session 設定
app.use(session({
  secret: process.env.SESSION_SECRET || 'default-secret-change-me',
  resave: false,
  saveUninitialized: false,
  name: 'daodao_session',  // 自訂 cookie 名稱
  cookie: {
    httpOnly: true,        // ✅ 防止 JavaScript 讀取
    secure: process.env.NODE_ENV === 'production',  // ✅ 生產環境強制 HTTPS
    sameSite: 'lax',       // ✅ CSRF 防護
    maxAge: 7 * 24 * 60 * 60 * 1000,  // 7 天
    domain: process.env.NODE_ENV === 'production' ? '.daodao.so' : undefined,  // ✅ 跨子網域共享
    path: '/',
  },
}));
```

同樣更新 `index.js`:

```javascript
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    name: 'daodao_session',
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        domain: process.env.NODE_ENV === 'production' ? '.daodao.so' : undefined,
        path: '/'
    },
}))
```

#### 環境變數設定

`.env`:
```env
# Session 密鑰（至少 32 字元，定期輪替）
SESSION_SECRET=your-very-long-and-random-session-secret-key

# 生產環境設定
NODE_ENV=production
COOKIE_DOMAIN=.daodao.so
```

---

### 3.3 JWT Token 透過 Cookie 傳遞 (高優先度 🔴)

**問題**: 當前 JWT Token 透過 URL 參數傳遞，可被日誌記錄和瀏覽器歷史保存。

**改進方案**: 後端設定 HTTP-only Cookie，前端自動讀取。

#### 後端設定 JWT Cookie

更新 `src/controllers/auth.controller.ts`:

```typescript
export const googleCallback = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user;

  // ... 產生 JWT Token
  const token = jwtService.generateToken(payload);

  // 設定 HTTP-only Cookie
  res.cookie('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,  // 7 天
    domain: process.env.NODE_ENV === 'production' ? '.daodao.so' : undefined,
    path: '/',
  });

  // 重定向到前端，不攜帶 token 參數
  const stateParam = req.query.state as string;
  const state = verifySignedState(stateParam);

  const url = `${process.env.FRONTEND_URL}/auth/callback?state=${encodeURIComponent(stateParam)}`;
  res.redirect(url);
});
```

#### 前端讀取 Cookie

由於 `httpOnly: true`，前端無法直接讀取 Cookie，需要透過 API 呼叫驗證。

更新 `widgets/auth/ui/success.tsx`:

```typescript
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthActions } from '@/entities/user';
import { verifySignedState } from '@/shared/lib/oauth-state';

export const AuthSuccess = () => {
  const { login } = useAuthActions();
  const router = useRouter();

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const stateParam = searchParams.get('state');

    if (!stateParam) {
      router.replace('/auth/failure?error=missing_state');
      return;
    }

    // 驗證 State
    const state = verifySignedState(stateParam);
    if (!state) {
      router.replace('/auth/failure?error=invalid_state');
      return;
    }

    // Cookie 已自動發送，呼叫 API 取得使用者資訊
    checkAuthStatus(state.redirectUrl);
  }, [router, login]);

  const checkAuthStatus = async (redirectUrl: string) => {
    try {
      // GET /api/v1/users/me - Cookie 會自動發送
      const response = await fetch('/api/v1/users/me', {
        credentials: 'include',  // 重要：發送 Cookie
      });

      if (!response.ok) {
        throw new Error('Authentication failed');
      }

      const { data } = await response.json();
      const { user, isTemporary } = data;

      // 更新 Auth Context
      login(user);

      // 根據使用者類型跳轉
      if (isTemporary) {
        router.replace('/onboarding');
      } else {
        router.replace(redirectUrl || '/');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      router.replace('/auth/failure?error=auth_check_failed');
    }
  };

  return <IslandPlaceholder title="正在驗證登入狀態..." />;
};
```

#### 更新 API Client

由於使用 Cookie 認證，API Client 不再需要注入 Bearer Token：

更新 `shared/api/client.ts`:

```typescript
export const client = createClient<paths>({
  baseUrl: process.env.NEXT_PUBLIC_API_URL,
  credentials: 'include',  // ✅ 重要：自動發送 Cookie
});

// 移除 Authorization header 注入中介軟體
// Token 現在透過 Cookie 自動發送
```

#### 後端讀取 Cookie Token

更新 `src/middleware/auth.ts`:

```typescript
export const authenticateJWT: RequestHandler = (req, res, next) => {
  // 優先從 Cookie 讀取 Token
  let token = req.cookies?.auth_token;

  // 相容舊的 Authorization Header 方式
  if (!token) {
    const authHeader = req.headers.authorization;
    token = authHeader && authHeader.split(' ')[1];
  }

  if (!token) {
    next(new UnauthorizedError('缺少認證令牌'));
    return;
  }

  try {
    const secret = process.env.JWT_SECRET || process.env.JWT_SECURITY;
    const decoded = jwt.verify(token, secret);
    req.user = decoded as UserJwtPayload;
    req.isTemporary = decoded.isTemp || false;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      next(new UnauthorizedError('認證令牌已過期'));
    } else {
      next(new UnauthorizedError('無效的認證令牌'));
    }
  }
};
```

**遷移策略**: 保留 Authorization Header 支援一段時間，逐步遷移到 Cookie 方案。

---

### 3.4 Token 黑名單機制 (中優先度 🟡)

**問題**: 當前 JWT 是無狀態的，登出後 Token 仍然有效直到過期。

**改進方案**: 使用 Redis 儲存已登出的 Token 黑名單。

#### 實作 Token 黑名單服務

建立新檔案: `src/services/auth/token-blacklist.service.ts`

```typescript
import { getRedisClient } from '../database/redis.service';

const TOKEN_BLACKLIST_PREFIX = 'token:blacklist:';

/**
 * 將 Token 加入黑名單
 * @param token JWT Token
 * @param expiresIn Token 剩餘有效時間（秒）
 */
export async function addToBlacklist(token: string, expiresIn: number): Promise<void> {
  const redis = getRedisClient();
  const key = `${TOKEN_BLACKLIST_PREFIX}${token}`;

  // 設定過期時間與 Token 一致
  await redis.setex(key, expiresIn, '1');
}

/**
 * 檢查 Token 是否在黑名單
 */
export async function isBlacklisted(token: string): Promise<boolean> {
  const redis = getRedisClient();
  const key = `${TOKEN_BLACKLIST_PREFIX}${token}`;

  const result = await redis.get(key);
  return result !== null;
}

/**
 * 清除過期的黑名單記錄（Redis 自動過期，無需手動清理）
 */
export async function cleanupExpiredTokens(): Promise<void> {
  // Redis TTL 會自動清理過期的鍵
  console.log('Token blacklist cleanup - handled by Redis TTL');
}
```

#### 更新認證中介軟體

更新 `src/middleware/auth.ts`:

```typescript
import { isBlacklisted } from '../services/auth/token-blacklist.service';

export const authenticateJWT: RequestHandler = async (req, res, next) => {
  let token = req.cookies?.auth_token;

  if (!token) {
    const authHeader = req.headers.authorization;
    token = authHeader && authHeader.split(' ')[1];
  }

  if (!token) {
    next(new UnauthorizedError('缺少認證令牌'));
    return;
  }

  // ✅ 檢查黑名單
  if (await isBlacklisted(token)) {
    next(new UnauthorizedError('令牌已失效'));
    return;
  }

  try {
    const secret = process.env.JWT_SECRET || process.env.JWT_SECURITY;
    const decoded = jwt.verify(token, secret);
    req.user = decoded as UserJwtPayload;
    req.isTemporary = decoded.isTemp || false;
    req.token = token;  // 儲存 token 供後續使用
    next();
  } catch (error) {
    // ... 錯誤處理
  }
};
```

#### 更新登出邏輯

更新 `src/controllers/auth.controller.ts`:

```typescript
import { addToBlacklist } from '../services/auth/token-blacklist.service';
import jwt from 'jsonwebtoken';

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const token = req.token;  // 從中介軟體取得

  if (token) {
    try {
      // 解析 Token 取得過期時間
      const decoded = jwt.decode(token) as { exp?: number };

      if (decoded?.exp) {
        const now = Math.floor(Date.now() / 1000);
        const expiresIn = decoded.exp - now;

        if (expiresIn > 0) {
          // 加入黑名單
          await addToBlacklist(token, expiresIn);
        }
      }
    } catch (error) {
      console.error('Failed to blacklist token:', error);
      // 繼續執行登出流程
    }
  }

  // 清除 Cookie
  res.clearCookie('auth_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    domain: process.env.NODE_ENV === 'production' ? '.daodao.so' : undefined,
    path: '/',
  });

  // 清除 Session
  req.logout((err) => {
    if (err) {
      console.error('Session logout error:', err);
    }
  });

  const response = createSuccessResponse({ message: '登出成功' });
  res.json(response);
});
```

---

### 3.5 JWT Secret 增強 (中優先度 🟡)

**問題**: 當前 JWT Secret 較短，且未定期輪替。

**改進建議**:

1. **產生強密鑰**:
   ```bash
   # 產生 64 位元組隨機密鑰
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

2. **環境變數設定**:
   ```env
   # 當前密鑰（每 3-6 個月輪替）
   JWT_SECRET=your-new-very-long-secret-key-64-bytes-or-more

   # 之前的密鑰（保留一段時間以支援舊 Token）
   JWT_SECRET_PREVIOUS=your-old-secret-key
   ```

---

## 4. 使用者體驗優化 (UX Optimization)

### 4.1 主動 Token 刷新 (中優先度 🟡)

**問題**: 當前僅在 401 錯誤後刷新 Token，使用者會感知到延遲。

**改進方案**: 在 Token 即將過期前主動刷新。

#### 前端實作主動刷新

建立新檔案: `entities/user/lib/token-refresh-scheduler.ts`

```typescript
const REFRESH_BEFORE_EXPIRY = 10 * 60 * 1000;  // 提前 10 分鐘刷新

/**
 * 從 JWT Token 取得過期時間
 */
function getTokenExpiry(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

/**
 * 排程 Token 刷新
 */
export class TokenRefreshScheduler {
  private timeoutId: NodeJS.Timeout | null = null;

  /**
   * 開始排程
   */
  start(token: string, onRefresh: () => Promise<void>) {
    this.cancel();

    const expiry = getTokenExpiry(token);
    if (!expiry) return;

    const timeUntilRefresh = expiry - Date.now() - REFRESH_BEFORE_EXPIRY;

    if (timeUntilRefresh > 0) {
      this.timeoutId = setTimeout(async () => {
        try {
          await onRefresh();
        } catch (error) {
          console.error('Token refresh failed:', error);
        }
      }, timeUntilRefresh);
    }
  }

  /**
   * 取消排程
   */
  cancel() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
}
```

---

### 4.2 API 401 錯誤自動重試 (中優先度 🟡)

**問題**: 當前 API Client 無自動重試機制，多個並發請求可能觸發多次刷新。

**改進方案**: 實作請求佇列和自動重試。

建立新檔案: `shared/api/token-refresh-interceptor.ts`

```typescript
let isRefreshing = false;
let refreshSubscribers: Array<(token?: string) => void> = [];

/**
 * 訂閱 Token 刷新完成事件
 */
function subscribeTokenRefresh(callback: (token?: string) => void) {
  refreshSubscribers.push(callback);
}

/**
 * 通知所有訂閱者 Token 已刷新
 */
function onTokenRefreshed(token?: string) {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
}

/**
 * 刷新 Token
 */
async function refreshAuthToken(): Promise<string | null> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    const data = await response.json();
    return data.data?.token || null;
  } catch (error) {
    console.error('Token refresh error:', error);
    return null;
  }
}

/**
 * 建立支援自動重試的 Fetch 中介軟體
 */
export function createRetryMiddleware() {
  return {
    async onResponse({ response, request }: any) {
      // 僅處理 401 錯誤
      if (response.status !== 401) {
        return response;
      }

      // 如果正在刷新，等待刷新完成後重試
      if (isRefreshing) {
        return new Promise((resolve) => {
          subscribeTokenRefresh(async (token) => {
            if (token) {
              // Token 刷新成功，重試原始請求
              const retryResponse = await fetch(request);
              resolve(retryResponse);
            } else {
              // Token 刷新失敗，返回原始 401 回應
              resolve(response);
            }
          });
        });
      }

      // 開始刷新流程
      isRefreshing = true;

      try {
        const newToken = await refreshAuthToken();

        if (newToken) {
          // 刷新成功，通知所有等待的請求
          onTokenRefreshed(newToken);

          // 重試原始請求
          const retryResponse = await fetch(request);
          return retryResponse;
        } else {
          // 刷新失敗，通知所有等待的請求
          onTokenRefreshed(undefined);

          // 可選：跳轉到登入頁
          if (typeof window !== 'undefined') {
            window.location.href = '/auth/login';
          }

          return response;
        }
      } finally {
        isRefreshing = false;
      }
    },
  };
}
```

#### 整合到 API Client

更新 `shared/api/client.ts`:

```typescript
import createClient from 'openapi-fetch';
import type { paths } from './openapi-types';
import { createRetryMiddleware } from './token-refresh-interceptor';

export const client = createClient<paths>({
  baseUrl: process.env.NEXT_PUBLIC_API_URL,
  credentials: 'include',
});

// 加入自動重試中介軟體
client.use(createRetryMiddleware());
```

---

## 5. 開發環境配置優化 (Development Environment)

### 5.1 簡化開發環境方案 (中優先度 🟡)

**問題**: 原需求文件要求修改 hosts 檔案 + HTTPS，對新團隊成員不友善。

**改進方案**: 提供多種開發環境配置選項。

#### 方案 A: 簡化開發環境（推薦初學者）

**特點**:
- 不需要修改 hosts 檔案
- 不需要 HTTPS
- Cookie 不跨域（僅用於測試單一應用）

**前端 `.env.local`**:
```env
# Website (port 3000)
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Product (port 3001)
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_SITE_URL=http://localhost:3001
```

**後端 `.env.local`**:
```env
PORT=4000
NODE_ENV=development

# CORS 允許 localhost 所有連接埠
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:5438

# Cookie 設定（不設定 domain）
SESSION_SECRET=dev-secret
COOKIE_SECURE=false
COOKIE_SAMESITE=none  # 允許跨連接埠
```

#### 方案 B: 完整開發環境（推薦團隊協作）

**特點**:
- 使用網域（需修改 hosts）
- 使用 HTTPS
- Cookie 跨子網域共享
- 與生產環境完全一致

**配置步驟**:

1. **修改 hosts 檔案**:
   ```bash
   # macOS/Linux: /etc/hosts
   # Windows: C:\Windows\System32\drivers\etc\hosts

   127.0.0.1 dev.daodao.so
   127.0.0.1 app.dev.daodao.so
   ```

2. **啟用 Next.js HTTPS**:

   `package.json`:
   ```json
   {
     "scripts": {
       "dev": "next dev -p 3000 --experimental-https"
     }
   }
   ```

3. **環境變數設定**:

   前端 `.env.local`:
   ```env
   NEXT_PUBLIC_API_URL=https://localhost:4000
   NEXT_PUBLIC_SITE_URL=https://dev.daodao.so:3000
   NEXT_PUBLIC_APP_URL=https://app.dev.daodao.so:3001
   ```

   後端 `.env.local`:
   ```env
   PORT=4000
   NODE_ENV=development

   CORS_ALLOWED_ORIGINS=https://dev.daodao.so:3000,https://app.dev.daodao.so:3001

   COOKIE_DOMAIN=.dev.daodao.so
   COOKIE_SECURE=true
   COOKIE_SAMESITE=lax
   ```

---

## 6. 錯誤處理增強 (Error Handling)

### 6.1 友善的錯誤提示 (中優先度 🟡)

**問題**: 當前錯誤處理簡單，使用者體驗不佳。

**改進方案**: 提供詳細的錯誤碼和友善提示。

#### 定義錯誤碼和訊息

建立新檔案: `shared/lib/auth-errors.ts`

```typescript
export enum AuthErrorCode {
  // 網路錯誤
  NETWORK_ERROR = 'NETWORK_ERROR',

  // OAuth 錯誤
  OAUTH_DENIED = 'OAUTH_DENIED',
  OAUTH_ERROR = 'OAUTH_ERROR',
  OAUTH_STATE_INVALID = 'OAUTH_STATE_INVALID',
  OAUTH_STATE_EXPIRED = 'OAUTH_STATE_EXPIRED',

  // Token 錯誤
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  TOKEN_MISSING = 'TOKEN_MISSING',
  TOKEN_REFRESH_FAILED = 'TOKEN_REFRESH_FAILED',

  // 認證錯誤
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',

  // 其他錯誤
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export const AUTH_ERROR_MESSAGES: Record<AuthErrorCode, string> = {
  [AuthErrorCode.NETWORK_ERROR]: '網路連線失敗，請檢查您的網路設定',
  [AuthErrorCode.OAUTH_DENIED]: '您拒絕了授權，無法完成登入',
  [AuthErrorCode.OAUTH_ERROR]: 'Google 登入失敗，請稍後重試',
  [AuthErrorCode.OAUTH_STATE_INVALID]: '登入請求無效，請重新開始',
  [AuthErrorCode.OAUTH_STATE_EXPIRED]: '登入請求已過期，請重新開始',
  [AuthErrorCode.TOKEN_EXPIRED]: '登入已過期，請重新登入',
  [AuthErrorCode.TOKEN_INVALID]: '登入資訊無效，請重新登入',
  [AuthErrorCode.TOKEN_MISSING]: '缺少登入資訊，請先登入',
  [AuthErrorCode.TOKEN_REFRESH_FAILED]: '登入狀態刷新失敗，請重新登入',
  [AuthErrorCode.UNAUTHORIZED]: '您沒有權限存取此頁面',
  [AuthErrorCode.FORBIDDEN]: '禁止存取',
  [AuthErrorCode.UNKNOWN_ERROR]: '登入失敗，請稍後重試',
};

/**
 * 取得使用者友善的錯誤訊息
 */
export function getAuthErrorMessage(code: AuthErrorCode): string {
  return AUTH_ERROR_MESSAGES[code] || AUTH_ERROR_MESSAGES[AuthErrorCode.UNKNOWN_ERROR];
}

/**
 * 判斷錯誤是否可重試
 */
export function isRetryableError(code: AuthErrorCode): boolean {
  return [
    AuthErrorCode.NETWORK_ERROR,
    AuthErrorCode.OAUTH_ERROR,
    AuthErrorCode.TOKEN_REFRESH_FAILED,
  ].includes(code);
}
```

---

## 7. 效能優化 (Performance Optimization)

### 7.1 Middleware 效能優化 (低優先度 🟢)

**問題**: Middleware 對所有請求執行認證檢查，包括靜態資源。

**改進方案**: 使用 matcher 跳過靜態資源。

建立新檔案: `middleware.ts` (專案根目錄)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 定義需要認證的路徑
  const protectedPaths = [
    '/dashboard',
    '/profile',
    '/settings',
    '/quiz/advanced-analysis',
  ];

  // 檢查是否是受保護的路徑
  const isProtected = protectedPaths.some(path => pathname.startsWith(path));

  if (!isProtected) {
    return NextResponse.next();
  }

  // 檢查認證 Cookie
  const cookieStore = cookies();
  const authToken = cookieStore.get('auth_token');

  if (!authToken) {
    // 未登入，重定向到登入頁
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);

    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// 設定 matcher，跳過靜態資源
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     * - api routes (handled separately)
     */
    '/((?!_next/static|_next/image|favicon.ico|public|api).*)',
  ],
};
```

---

## 8. 實施優先順序 (Implementation Priority)

### 階段 1: 安全性修復（1-2 週）🔴

| 任務 | 優先度 | 預計工時 | 依賴 |
|------|--------|---------|------|
| OAuth State 簽名 | 🔴 高 | 4 小時 | - |
| Session Cookie 安全增強 | 🔴 高 | 2 小時 | - |
| JWT Token 透過 Cookie 傳遞 | 🔴 高 | 6 小時 | Session Cookie |
| Token 黑名單機制 | 🟡 中 | 4 小時 | Redis |
| JWT Secret 增強 | 🟡 中 | 2 小時 | - |

**總計**: 約 18 小時（2-3 個工作日）

### 階段 2: 使用者體驗優化（1 週）🟡

| 任務 | 優先度 | 預計工時 | 依賴 |
|------|--------|---------|------|
| 主動 Token 刷新 | 🟡 中 | 4 小時 | - |
| API 401 自動重試 | 🟡 中 | 3 小時 | - |
| 錯誤處理增強 | 🟡 中 | 6 小時 | - |
| 跨 Tab 同步優化 | 🟢 低 | 2 小時 | - |

**總計**: 約 15 小時（2 個工作日）

### 階段 3: 開發環境和效能優化（3-5 天）🟢

| 任務 | 優先度 | 預計工時 | 依賴 |
|------|--------|---------|------|
| 簡化開發環境配置 | 🟡 中 | 4 小時 | - |
| 環境變數管理 | 🟢 低 | 2 小時 | - |
| Middleware 效能優化 | 🟢 低 | 2 小時 | - |
| SWR 快取優化 | 🟢 低 | 2 小時 | - |

**總計**: 約 10 小時（1.5 個工作日）

---

## 9. 詳細實施指南 (Implementation Guide)

### 9.1 前期準備

#### 產生必要的密鑰

```bash
# 產生 JWT Secret (64 bytes)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# 產生 Session Secret (32 bytes)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 產生 OAuth State Secret (32 bytes)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

更新 `.env`:

```env
# JWT 配置
JWT_SECRET=<64-byte-hex-string>
JWT_EXPIRATION=7d

# Session 配置
SESSION_SECRET=<32-byte-hex-string>

# OAuth State 配置
OAUTH_STATE_SECRET=<32-byte-hex-string>

# Cookie 配置
COOKIE_DOMAIN=.daodao.so
COOKIE_SECURE=true
COOKIE_SAMESITE=lax

# CORS 配置
CORS_ALLOWED_ORIGINS=https://daodao.so,https://app.daodao.so
```

---

### 9.2 測試清單

#### 功能測試

- [ ] OAuth State 簽名驗證通過
- [ ] OAuth State 竄改被拒絕
- [ ] OAuth State 過期被拒絕
- [ ] Session Cookie 包含正確的安全標誌
- [ ] JWT Token 透過 Cookie 傳遞
- [ ] Token 黑名單在登出後生效
- [ ] 主動 Token 刷新在過期前觸發
- [ ] API 401 錯誤自動重試成功
- [ ] 並發 401 只觸發一次刷新
- [ ] 錯誤頁面顯示友善提示

#### 安全測試

- [ ] XSS 攻擊無法竊取 Token (httpOnly)
- [ ] CSRF 攻擊被 SameSite 阻止
- [ ] Token 洩露後可透過登出失效
- [ ] JWT Secret 足夠長且隨機
- [ ] HTTPS 強制啟用（生產環境）

#### 效能測試

- [ ] Middleware 不處理靜態資源
- [ ] SWR 快取避免重複請求
- [ ] Token 刷新不影響使用者體驗
- [ ] Redis 黑名單效能可接受

---

### 9.3 回滾計畫

如果實施過程中出現問題，可以逐步回滾。

**建議**: 每完成一個步驟後建立 Git Tag，方便回滾:

```bash
git tag -a v1.0-oauth-state -m "Implemented OAuth State signing"
git tag -a v1.1-session-cookie -m "Enhanced Session Cookie security"
git tag -a v1.2-jwt-cookie -m "JWT Token via Cookie"

# 回滾到特定版本
git checkout v1.1-session-cookie
```

---

## 10. 總結 (Summary)

本文件提供了基於實際程式碼的詳細改進建議，涵蓋安全性、使用者體驗、開發環境和效能優化四個方面。

### 關鍵改進

1. **安全性**: OAuth State 簽名、HTTP-only Cookie、Token 黑名單
2. **使用者體驗**: 主動刷新、自動重試、友善錯誤提示
3. **開發環境**: 多種配置方案，降低上手難度
4. **效能**: Middleware 優化、SWR 快取策略

### 實施建議

- **優先順序**: 先完成安全性修復（階段 1），再優化使用者體驗（階段 2）
- **測試**: 每個階段完成後進行充分測試
- **監控**: 上線後持續監控認證相關指標
- **文件**: 即時更新開發文件和 API 文件

### 後續工作

- 實施雙因素認證 (2FA)
- 支援更多 OAuth 提供者（Facebook, GitHub 等）
- 實施帳號合併功能
- 新增帳號安全日誌（登入歷史、裝置管理）

---

**文件維護**: 本文件應隨著實施進度更新，記錄實際遇到的問題和解決方案。

**意見回饋**: 如有疑問或建議，請在專案 Issue 中討論或聯絡技術負責人。
