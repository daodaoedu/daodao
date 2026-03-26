# 登入權限模組設計規格 (Authentication & Authorization Module Specification)

## 1. 概述 (Overview)

### 1.1 專案背景

- **公開網站**: `daodao.so` (website app)
- **應用網站**: `app.daodao.so` (product app)
- **開發環境**: `dev.daodao.so:3000` (website), `app.dev.daodao.so:3001` (product)
- **認證方式**: Google OAuth 2.0 (後端實作)
- **環境變數策略**: 使用 `.env.local` 和 `.env.production`，最少化環境變數

### 1.2 核心需求

1. 跨域登入支援（兩個不同域名）
2. 多種登入情境處理
3. 路由保護機制
4. Token 管理與自動刷新
5. 登入狀態同步

---

## 2. 架構設計 (Architecture)

### 2.1 模組結構

```
packages/
├── auth/                          # 新增：認證模組套件
│   ├── src/
│   │   ├── lib/
│   │   │   ├── auth-client.ts    # 認證客戶端（OAuth 流程）
│   │   │   ├── auth-storage.ts   # Token 存儲管理
│   │   │   ├── auth-provider.tsx # React Context Provider
│   │   │   └── auth-middleware.ts# Next.js Middleware
│   │   ├── hooks/
│   │   │   ├── use-auth.ts       # 認證狀態 Hook
│   │   │   ├── use-require-auth.ts# 需要登入的 Hook
│   │   │   └── use-redirect-after-login.ts # 登入後跳轉 Hook
│   │   ├── components/
│   │   │   ├── auth-guard.tsx    # 路由保護組件
│   │   │   └── login-button.tsx  # 登入按鈕組件
│   │   ├── utils/
│   │   │   ├── redirect.ts       # 跳轉工具
│   │   │   └── token-validator.ts# Token 驗證工具
│   │   └── index.ts              # 導出
│   └── package.json
```

### 2.2 資料流

```
使用者操作
    ↓
Auth Provider (React Context)
    ↓
Auth Client (OAuth 流程)
    ↓
API Client (Token 注入)
    ↓
後端 API (Google OAuth)
```

---

## 3. 核心功能規格 (Core Features)

### 3.1 Token 管理

#### 3.1.1 Token 存儲

- **位置**: **HTTP-only Cookie** (由後端設定)
- **Cookie 名稱**: `auth_token` (或由後端定義)
- **Cookie 設定** (後端需配合):

  ```typescript
  {
    httpOnly: true,        // 防止 JavaScript 存取，提升安全性
    secure: true,          // 僅在 HTTPS 傳輸
    sameSite: 'lax',       // CSRF 防護，允許跨站 GET 請求
    domain: '.daodao.so',  // 支援跨子域名共享
    path: '/',             // 全站可用
    maxAge: 7 * 24 * 60 * 60, // 7 天過期（或根據 Token 過期時間）
  }
  ```

- **前端無法直接讀取**: 由於 `httpOnly: true`，前端無法透過 JavaScript 讀取 Token
- **使用者資訊存儲**: 使用者基本資訊可存於 `localStorage` 或 `sessionStorage`（非敏感資料）

  ```typescript
  interface UserInfo {
    id: number;
    email: string;
    name: string;
    photoUrl?: string;
  }
  ```

#### 3.1.2 Token 刷新機制

- **自動刷新**: 後端在 Token 過期前自動刷新（透過 Refresh Token）
- **刷新端點**: `POST /api/v1/auth/refresh` (後端自動處理)
- **前端處理**:
  - API 請求返回 401 時，前端呼叫刷新端點
  - 後端刷新成功後會更新 Cookie
  - 刷新失敗時清除 Cookie 並跳轉登入頁

### 3.2 OAuth 流程

#### 3.2.1 OAuth 轉導流程（完整流程圖）

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. 使用者點擊登入（前端）                                        │
│    - 來源: daodao.so 或 app.daodao.so                           │
│    - 目標頁面: /dashboard 或 /quiz/advanced-analysis          │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. 前端生成 State 參數                                           │
│    - 編碼 OAuthState: {                                         │
│        redirectUrl: '/dashboard',                               │
│        source: 'website' | 'app',                              │
│        timestamp: 1234567890,                                   │
│        nonce: 'random-string'                                   │
│      }                                                           │
│    - Base64 編碼: btoa(JSON.stringify(oauthState))             │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. 前端跳轉到後端 OAuth 端點                                    │
│    GET /api/v1/auth/oauth/google?state={encodedState}           │
│    - 前端: window.location.href =                              │
│            '/api/v1/auth/oauth/google?state=...'                │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. 後端接收請求並驗證 State                                     │
│    - 解碼並驗證 state 參數（時效性、格式）                       │
│    - 儲存 state 到 session 或 Redis（用於後續驗證）             │
│    - 準備 Google OAuth 參數                                     │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. 後端跳轉到 Google OAuth                                      │
│    GET https://accounts.google.com/o/oauth2/v2/auth             │
│    ?client_id={GOOGLE_CLIENT_ID}                                │
│    &redirect_uri={BACKEND_CALLBACK_URL}                         │
│    &response_type=code                                           │
│    &scope=openid email profile                                   │
│    &state={encodedState}  ← 傳遞原始 state                      │
│    &access_type=offline                                         │
│    &prompt=consent                                               │
│    - 後端: res.redirect(googleOAuthUrl)                          │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. Google OAuth 頁面                                            │
│    - 使用者選擇 Google 帳號並授權                                │
│    - Google 驗證使用者身份                                      │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 7. Google 回調後端                                              │
│    GET {BACKEND_CALLBACK_URL}                                    │
│    ?code={authorization_code}                                    │
│    &state={encodedState}  ← Google 回傳原始 state              │
│    - 後端接收: /api/v1/auth/oauth/google/callback               │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 8. 後端驗證 State 並交換 Token                                   │
│    - 驗證 state 是否與步驟 4 儲存的一致                          │
│    - 使用 code 向 Google 交換 access_token                      │
│    POST https://oauth2.googleapis.com/token                      │
│    {                                                             │
│      code: {authorization_code},                                 │
│      client_id: {GOOGLE_CLIENT_ID},                             │
│      client_secret: {GOOGLE_CLIENT_SECRET},                     │
│      redirect_uri: {BACKEND_CALLBACK_URL},                      │
│      grant_type: 'authorization_code'                            │
│    }                                                             │
│    - Google 返回: { access_token, id_token, ... }               │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 9. 後端驗證 Google ID Token 並建立使用者                        │
│    - 驗證 Google ID Token 簽名                                  │
│    - 解析使用者資訊（email, name, photo）                        │
│    - 查詢或建立使用者帳號                                        │
│    - 生成 JWT Token（或使用 session）                            │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 10. 後端設定 Cookie 並解碼 State                                │
│     - 設定 HTTP-only Cookie（包含 Token）                        │
│     - 解碼 state 取得 redirectUrl                                │
│     - 準備跳轉到前端                                             │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 11. 後端跳轉到前端 Callback                                     │
│     GET /auth/callback?state={encodedState}                     │
│     - 後端: res.redirect(`${FRONTEND_URL}/auth/callback?state=...`)│
│     - 前端接收: app.daodao.so/auth/callback?state=...           │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 12. 前端 Callback 頁面處理                                      │
│     - 解碼 state 參數                                            │
│     - 驗證 state（timestamp, nonce）                            │
│     - 呼叫 /api/v1/auth/me 確認登入狀態（Cookie 自動發送）      │
│     - 取得使用者資訊                                             │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 13. 前端跳轉到目標頁面                                          │
│     - 從 state.redirectUrl 取得目標頁面                         │
│     - window.location.href = redirectUrl                        │
│     - 例如: /dashboard 或 /quiz/advanced-analysis              │
└─────────────────────────────────────────────────────────────────┘
```

**關鍵參數傳遞**:

- **State 參數**: 貫穿整個流程，用於防 CSRF 和傳遞 redirectUrl
- **Cookie**: 在步驟 10 設定，後續請求自動攜帶
- **Code**: 僅在 Google 和後端之間傳遞，前端不接觸

#### 3.2.2 State 參數結構

```typescript
interface OAuthState {
  redirectUrl: string;      // 登入後要跳轉的 URL
  source: 'website' | 'app'; // 來源網站
  timestamp: number;         // 防重放攻擊
  nonce: string;            // 隨機字串
}
```

### 3.3 跨域登入處理

#### 3.3.1 Cookie 跨域優勢

- **Cookie 設定 `domain=.daodao.so`**: 可在 `daodao.so` 和 `app.daodao.so` 之間共享
- **自動發送**: Cookie 會自動在請求中發送，無需手動處理
- **統一認證**: 兩個域名使用同一個 Cookie，登入狀態自動同步

#### 3.3.2 登入流程（使用 Cookie）

- **登入入口**: 統一使用 `app.daodao.so/auth/login`
- **流程**:
  1. `daodao.so` 點擊登入 → 跳轉到 `app.daodao.so/auth/login?redirect={encodedUrl}`
  2. 後端處理 OAuth，登入成功後設定 Cookie（`domain=.daodao.so`）
  3. 根據 `redirect` 參數決定跳轉位置
  4. 如果 `redirect` 是 `daodao.so` 的 URL，直接跳轉即可（Cookie 已共享）

#### 3.3.3 跨域 API 請求

- **CORS 設定**: 後端需設定允許 `daodao.so` 和 `app.daodao.so` 的跨域請求
- **Credentials**: 前端需設定 `credentials: 'include'` 讓 Cookie 自動發送
- **SameSite Cookie**: 設定 `sameSite: 'lax'` 允許跨站 GET 請求攜帶 Cookie
- **認證方式**: **僅使用 Cookie**，不設定 `Authorization` header，後端從 Cookie 讀取 Token

### 3.4 路由保護

#### 3.4.1 Middleware 層級保護

- **位置**: `apps/product/src/middleware.ts`
- **功能**:
  - 檢查 Cookie 是否存在（透過 `cookies()` API）
  - 可選：呼叫後端 API 驗證 Token 有效性
  - 無效或不存在時跳轉到登入頁
  - 保留原始 URL 作為 `redirect` 參數
- **實作**:

  ```typescript
  import { cookies } from 'next/headers';
  
  export default async function middleware(request: NextRequest) {
    const cookieStore = cookies();
    const authToken = cookieStore.get('auth_token');
    
    if (!authToken) {
      // 跳轉到登入頁，保留原始 URL
      return NextResponse.redirect(new URL(`/auth/login?redirect=${encodeURIComponent(request.url)}`, request.url));
    }
    
    // 可選：驗證 Token 有效性
    // const isValid = await verifyToken(authToken.value);
    
    return NextResponse.next();
  }
  ```

#### 3.4.2 組件層級保護

- **組件**: `<AuthGuard>`
- **功能**:
  - 檢查登入狀態
  - 未登入時顯示登入提示或跳轉
  - 支援自訂未登入時的 UI

#### 3.4.3 頁面層級保護

- **Hook**: `useRequireAuth()`
- **功能**:
  - 在頁面組件中使用
  - 自動處理未登入狀態
  - 支援 Server Component 和 Client Component

---

## 4. 登入情境處理 (Login Scenarios)

### 4.1 情境 1: 首頁點擊進入 App

**流程**:

```
daodao.so 首頁
  ↓ 點擊「進入 App」
app.daodao.so/auth/login?redirect=/dashboard
  ↓ 登入成功
app.daodao.so/dashboard
```

**實作要點**:

- `redirect` 參數預設為 `/dashboard`（App 首頁）
- 登入成功後清除 `redirect` 參數並跳轉

### 4.2 情境 2: Quiz 測驗後進階分析

**流程**:

```
daodao.so/quiz/result
  ↓ 點擊「進階分析」
app.daodao.so/auth/login?redirect=/quiz/advanced-analysis&quizId={id}
  ↓ 登入成功
app.daodao.so/quiz/advanced-analysis?quizId={id}
```

**實作要點**:

- 需要保留額外的查詢參數（如 `quizId`）
- `redirect` 參數需要完整編碼包含查詢字串
- 登入成功後恢復所有參數

### 4.3 情境 3: 直接輸入網址到特定頁面

**流程**:

```
使用者直接訪問: app.daodao.so/dashboard/settings
  ↓ Middleware 檢測未登入
app.daodao.so/auth/login?redirect=/dashboard/settings
  ↓ 登入成功
app.daodao.so/dashboard/settings
```

**實作要點**:

- Middleware 自動捕獲當前完整路徑（包含查詢參數）
- 登入成功後精確還原原始路徑
- 支援深層嵌套路由

### 4.4 情境 4: 登入後跳轉到指定頁面

**流程**:

```
已登入狀態
  ↓ 程式碼呼叫: redirectTo('/target-page')
app.daodao.so/target-page
```

**實作要點**:

- 提供 `redirectTo()` 工具函數
- 支援相對路徑和絕對路徑
- 支援跨域跳轉（如跳回 `daodao.so`）

---

## 5. API 整合 (API Integration)

### 5.1 API Client 整合

- **位置**: `packages/api/src/client.ts`
- **修改**: Cookie 會自動發送，需設定 `credentials: 'include'`
- **重要**: **不使用 Authorization Bearer Token**，完全依賴 Cookie 認證
- **實作**:

  ```typescript
  export const client = createClient<paths>({
    baseUrl: process.env.NEXT_PUBLIC_API_URL,
    credentials: 'include', // 重要：讓 Cookie 自動發送
  });
  
  // 處理 401 錯誤
  client.use({
    async onResponse({ response }) {
      if (response.status === 401) {
        // Token 過期或無效
        // 嘗試刷新 Token（後端會自動處理 Cookie）
        const refreshResult = await client.POST('/api/v1/auth/refresh');
        
        if (refreshResult.error) {
          // 刷新失敗，清除 Cookie 並跳轉登入頁
          await handleUnauthorized();
        }
        // 刷新成功，Cookie 已更新，可重試原請求
      }
    },
  });
  ```

- **注意**:
  - **僅使用 Cookie 認證**，不設定 `Authorization` header
  - Cookie 會自動在請求中發送，後端從 Cookie 讀取 Token
  - 所有 API 請求都依賴 Cookie，後端需支援 Cookie-based 認證

### 5.2 API 端點使用

- **登入**: `POST /api/v1/auth/login` - 後端設定 Cookie，**不使用 Authorization header**
- **登出**: `POST /api/v1/auth/logout` - 後端清除 Cookie
- **刷新 Token**: `POST /api/v1/auth/refresh` - 後端更新 Cookie
- **OAuth 初始化**: `GET /api/v1/auth/oauth/google` - 跳轉到 Google OAuth
- **取得使用者資訊**: `GET /api/v1/auth/me` - 從 Cookie 讀取 Token 驗證
- **所有 API 請求**: Cookie 自動發送，**不使用 Authorization Bearer Token**

---

## 6. React Context 設計 (Context Design)

### 6.1 AuthContext 結構

```typescript
interface AuthContextValue {
  // 狀態
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // 方法
  login: (redirectUrl?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  redirectTo: (url: string) => void;
}
```

### 6.2 Provider 實作

- **位置**: `packages/auth/src/lib/auth-provider.tsx`
- **功能**:
  - 初始化時呼叫 `/api/v1/auth/me` 檢查登入狀態（Cookie 自動發送）
  - 提供全域認證狀態（使用者資訊）
  - 處理 Token 自動刷新（透過 API 呼叫，後端更新 Cookie）
  - 跨 Tab 同步：透過 `storage` 事件監聽使用者資訊變化（非 Cookie）
- **實作**:

  ```typescript
  // 初始化時檢查登入狀態
  useEffect(() => {
    const checkAuth = async () => {
      const response = await apiClient.GET('/api/v1/auth/me');
      if (response.data) {
        setUser(response.data.user);
        setIsAuthenticated(true);
        // 將使用者資訊存到 localStorage（非敏感資料）
        userInfoStorage.set(response.data.user);
      }
    };
    checkAuth();
  }, []);
  
  // 跨 Tab 同步使用者資訊（非 Cookie）
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === '_userinfo') {
        const newUserInfo = JSON.parse(e.newValue || 'null');
        setUser(newUserInfo);
        setIsAuthenticated(!!newUserInfo);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);
  ```

---

## 7. 安全性考量 (Security Considerations)

### 7.1 State 參數驗證

- **時效性**: State 參數 10 分鐘內有效
- **唯一性**: 使用 nonce 防止重放攻擊
- **簽名**: 可選，使用 HMAC 簽名 State（如果後端支援）

### 7.2 Token 安全

- **存儲**: 使用 **HTTP-only Cookie**（後端設定）
- **優勢**:
  - `httpOnly: true`: JavaScript 無法讀取，防止 XSS 攻擊竊取 Token
  - `secure: true`: 僅在 HTTPS 傳輸，防止中間人攻擊
  - `sameSite: 'lax'`: 防止 CSRF 攻擊，同時允許跨站 GET 請求
- **傳輸**: 僅透過 HTTPS（`secure: true`）
- **過期處理**: 後端自動刷新或清除 Cookie
- **XSS 防護**: HTTP-only Cookie 無法被 JavaScript 存取，大幅提升安全性
- **使用者資訊**: 非敏感的使用者資訊可存於 `localStorage`，但需注意 XSS 風險

### 7.3 CSRF 防護

- **SameSite Cookie**: 設定 `sameSite: 'lax'`（平衡安全性和可用性）
  - `Strict`: 最安全，但會阻止跨站連結跳轉時的 Cookie 發送
  - `Lax`: 允許跨站 GET 請求攜帶 Cookie，阻止 POST 請求（推薦）
  - `None`: 允許所有跨站請求，需配合 `secure: true`
- **Origin 檢查**: 後端驗證請求來源（`Origin` 或 `Referer` header）
- **State 參數驗證**: OAuth State 參數驗證
- **CSRF Token**: 可選，對於敏感操作（如修改資料）可額外使用 CSRF Token

---

## 8. 錯誤處理 (Error Handling)

### 8.1 登入失敗

- **網路錯誤**: 顯示錯誤訊息，允許重試
- **OAuth 錯誤**: 顯示錯誤描述，提供重新登入連結
- **Token 無效**: 清除 Token，跳轉登入頁

### 8.2 Token 刷新失敗

- **網路錯誤**: 重試最多 3 次
- **Refresh Token 過期**: 清除所有 Token，跳轉登入頁
- **其他錯誤**: 記錄錯誤，跳轉登入頁

---

## 9. 開發環境支援 (Development Support)

### 9.1 環境變數

```env
# OAuth 相關
NEXT_PUBLIC_OAUTH_GOOGLE_CLIENT_ID=
NEXT_PUBLIC_OAUTH_REDIRECT_URI=
NEXT_PUBLIC_AUTH_CALLBACK_URL=/auth/callback

# API 相關
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_API_BASE_URL=

# 應用相關
NEXT_PUBLIC_APP_URL=app.daodao.so
NEXT_PUBLIC_WEBSITE_URL=daodao.so

# Cookie 相關（後端設定，前端僅需了解）
# Cookie Domain: .daodao.so (生產環境) / 不設定 (開發環境)
# Cookie Name: auth_token (後端定義)
# Cookie HttpOnly: true (後端設定)
# Cookie Secure: true (生產環境) / false (開發環境)
# Cookie SameSite: lax (後端設定)
```

### 9.2 開發環境串接 (Development Environment)

#### 9.2.1 開發環境架構

**端口選擇建議**:

| 服務 | 端口 | 理由 |
|------|------|------|
| **Website** | `3000` | 避免與 Next.js 預設 3000 衝突，易於記憶 |
| **Product** | `3001` | 與 Website 連續，易於識別 |
| **API** | `8000` | 常見的 API 端口，保持不變 |

**為什麼選擇 3000/3001**:

- ✅ **避免衝突**: 3000 是 Next.js 預設端口，可能與其他專案衝突
- ✅ **易於記憶**: 3000/3001 連續且易記
- ✅ **符合慣例**: 3000-4999 範圍常用於開發環境
- ✅ **避免常見端口**: 不會與 8080（代理）、5000（Flask）等衝突

**開發環境架構**:

- **Website**: `dev.daodao.so:3000` (daodao.so)
- **Product**: `app.dev.daodao.so:3001` (app.daodao.so)
- **API**: `localhost:8000` (後端 API 端口)

#### 9.2.2 Cookie 設定（使用環境變數）

**環境變數設定（最少化）**:

**後端 `.env.local` (開發環境)**:

```env
COOKIE_DOMAIN=.dev.daodao.so
```

**後端 `.env.production` (生產環境)**:

```env
COOKIE_DOMAIN=.daodao.so
```

**統一的 Cookie 設定邏輯**:

```typescript
// 後端統一設定（使用環境變數，避免判斷 NODE_ENV）
const cookieOptions = {
  httpOnly: true,
  secure: true,  // 開發和生產都使用 HTTPS
  sameSite: 'lax' as const,
  path: '/',
  domain: process.env.COOKIE_DOMAIN || '.dev.daodao.so', // 從環境變數讀取
};
```

**優勢**:

- ✅ **環境變數最少化**: 僅需設定 `COOKIE_DOMAIN` 一個變數
- ✅ **統一邏輯**: 開發和生產使用相同的代碼，僅環境變數不同
- ✅ **嚴格安全**: 開發和生產都使用 `secure: true`（HTTPS）

#### 9.2.3 開發環境跨域處理

**目標**: 開發環境與生產環境保持一致，避免維護兩套邏輯

**生產環境架構**:

- `daodao.so` (website)
- `app.daodao.so` (product)
- Cookie domain: `.daodao.so`（跨子域名共享）

**開發環境架構（與生產環境一致）**:

- `dev.daodao.so` (website)
- `app.dev.daodao.so` (product)
- Cookie domain: `.dev.daodao.so`（跨子域名共享）

**設置步驟**:

1. **設定 hosts 檔案**:

   ```bash
   # macOS/Linux: /etc/hosts
   # Windows: C:\Windows\System32\drivers\etc\hosts
   
   127.0.0.1 dev.daodao.so
   127.0.0.1 app.dev.daodao.so
   ```

2. **後端環境變數設定**:

   ```env
   # 後端 .env.local (開發環境)
   COOKIE_DOMAIN=.dev.daodao.so
   
   # 後端 .env.production (生產環境)
   COOKIE_DOMAIN=.daodao.so
   ```

3. **前端環境變數設定**:

   ```env
   # apps/website/.env.local
   NEXT_PUBLIC_API_URL=https://localhost:8000
   NEXT_PUBLIC_WEBSITE_URL=https://dev.daodao.so:3000
   NEXT_PUBLIC_APP_URL=https://app.dev.daodao.so:3001
   
   # apps/product/.env.local
   NEXT_PUBLIC_API_URL=https://localhost:8000
   NEXT_PUBLIC_WEBSITE_URL=https://dev.daodao.so:3000
   NEXT_PUBLIC_APP_URL=https://app.dev.daodao.so:3001
   NEXT_PUBLIC_OAUTH_REDIRECT_URI=https://app.dev.daodao.so:3001/auth/callback
   ```

4. **訪問方式**:
   - Website: `https://dev.daodao.so:3000`
   - Product: `https://app.dev.daodao.so:3001`
   - Cookie 統一存在 `.dev.daodao.so`，兩個域名共享

**優勢**:

- ✅ **與生產環境一致**: 使用相同的域名結構和 Cookie domain 邏輯
- ✅ **無需維護兩套邏輯**: 開發和生產使用相同的代碼路徑
- ✅ **Cookie 自動共享**: 透過 `domain: '.dev.daodao.so'` 實現跨子域名共享
- ✅ **CORS 設定一致**: 後端可以使用相同的 CORS 邏輯（僅域名不同）
- ✅ **路由邏輯一致**: 不需要處理路徑前綴或端口差異

**注意事項**:

- ⚠️ 需要修改 hosts 檔案（僅需設定一次）
- ⚠️ 後端需要設定環境變數 `COOKIE_DOMAIN` 和 `CORS_ORIGINS`
- ⚠️ Next.js 開發環境需設定 HTTPS（見下方說明）

#### 9.2.4 開發環境 CORS 設定（使用環境變數）

**環境變數設定（最少化）**:

**後端 `.env.local` (開發環境)**:

```env
COOKIE_DOMAIN=.dev.daodao.so
CORS_ORIGINS=https://dev.daodao.so:3000,https://app.dev.daodao.so:3001
```

**後端 `.env.production` (生產環境)**:

```env
COOKIE_DOMAIN=.daodao.so
CORS_ORIGINS=https://daodao.so,https://app.daodao.so
```

**統一的 CORS 設定邏輯**:

```typescript
// 從環境變數讀取允許的來源（使用逗號分隔）
const allowedOrigins = (process.env.CORS_ORIGINS || '').split(',').filter(Boolean);

// CORS 設定（開發和生產使用相同邏輯）
{
  origin: (origin, callback) => {
    // 允許的來源或無來源（如 Postman）
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,  // 重要：允許 Cookie
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type'],
}
```

**優勢**:

- ✅ **環境變數最少化**: 僅需設定 `CORS_ORIGINS` 一個變數（逗號分隔）
- ✅ **統一邏輯**: 開發和生產使用相同的代碼，僅環境變數不同

#### 9.2.5 Next.js 開發環境 HTTPS 設定

**Next.js 內建支援開發環境 HTTPS**，可以使用與生產環境相同的嚴格設定。

**設定方式**:

**方法 1: 使用命令行標誌（推薦）**

修改 `package.json` 的 dev 腳本:

**apps/website/package.json**:

```json
{
  "scripts": {
    "dev": "next dev -p 3000 --experimental-https"
  }
}
```

**apps/product/package.json**:

```json
{
  "scripts": {
    "dev": "next dev -p 3001 --experimental-https"
  }
}
```

**方法 2: 使用 next.config.ts**

在 `next.config.ts` 中啟用 HTTPS:

```typescript
const nextConfig: NextConfig = {
  // ... 其他設定
  server: process.env.NODE_ENV === 'development' ? {
    https: true,  // Next.js 會自動生成自簽名憑證
  } : undefined,
};
```

**啟動開發服務器**:

```bash
pnpm dev
# Website: https://dev.daodao.so:3000
# Product: https://app.dev.daodao.so:3001
```

**注意事項**:

- ⚠️ Next.js 會自動生成自簽名憑證，瀏覽器會顯示安全警告
- ⚠️ 首次訪問時需要點擊「進階」→「繼續前往」接受憑證
- ⚠️ 憑證會自動信任本地開發域名

**優勢**:

- ✅ **無需額外設定**: Next.js 內建支援，不需要安裝 mkcert 或手動建立憑證
- ✅ **與生產環境一致**: 開發和生產都使用 HTTPS
- ✅ **Cookie secure flag**: 可以使用 `secure: true`
- ✅ **更安全的開發環境**: 模擬真實的生產環境

#### 9.2.6 開發環境 API 設定

**環境變數範例（與生產環境結構一致）**:

**apps/website/.env.local**:

```env
# 開發環境（對應生產環境的 daodao.so）
NEXT_PUBLIC_API_URL=https://localhost:8000
NEXT_PUBLIC_WEBSITE_URL=https://dev.daodao.so:3000
NEXT_PUBLIC_APP_URL=https://app.dev.daodao.so:3001
```

**apps/product/.env.local**:

```env
# 開發環境（對應生產環境的 app.daodao.so）
NEXT_PUBLIC_API_URL=https://localhost:8000
NEXT_PUBLIC_WEBSITE_URL=https://dev.daodao.so:3000
NEXT_PUBLIC_APP_URL=https://app.dev.daodao.so:3001
NEXT_PUBLIC_OAUTH_REDIRECT_URI=https://app.dev.daodao.so:3001/auth/callback
```

**生產環境對應**:

```env
# 生產環境（僅域名不同，結構完全一致）
NEXT_PUBLIC_API_URL=https://api.daodao.so
NEXT_PUBLIC_WEBSITE_URL=https://daodao.so
NEXT_PUBLIC_APP_URL=https://app.daodao.so
NEXT_PUBLIC_OAUTH_REDIRECT_URI=https://app.daodao.so/auth/callback
```

**優勢**: 開發和生產環境使用相同的環境變數結構，僅域名不同

#### 9.2.7 開發環境測試流程（推薦方案）

1. **設定 hosts 檔案（僅需設定一次）**:

   ```bash
   # macOS/Linux
   sudo nano /etc/hosts
   
   # Windows (以管理員身份執行)
   notepad C:\Windows\System32\drivers\etc\hosts
   
   # 添加以下內容
   127.0.0.1 dev.daodao.so
   127.0.0.1 app.dev.daodao.so
   ```

2. **啟動服務**:

   ```bash
   # Terminal 1: 後端 API
   cd backend && npm run dev  # localhost:8000
   
   # Terminal 2: Website
   cd apps/website && pnpm dev  # 訪問 https://dev.daodao.so:3000
   
   # Terminal 3: Product
   cd apps/product && pnpm dev  # 訪問 https://app.dev.daodao.so:3001
   ```

3. **測試登入流程**:
   - 訪問 `https://dev.daodao.so:3000` (Website)
   - 點擊登入，跳轉到 `https://app.dev.daodao.so:3001/auth/login` (Product)
   - 完成 OAuth 登入
   - 後端設定 Cookie（`domain: '.dev.daodao.so'`）
   - 跳轉回目標頁面
   - **Cookie 共享**: 兩個域名都可以讀取到 Cookie

4. **驗證 Cookie 共享**:
   - 在 `https://dev.daodao.so:3000` 登入
   - 訪問 `https://app.dev.daodao.so:3001/dashboard`
   - 應該可以直接訪問，無需重新登入
   - Cookie 存在 `.dev.daodao.so`，兩個域名共享

5. **與生產環境對比**:
   - 開發: `dev.daodao.so` ↔ 生產: `daodao.so`
   - 開發: `app.dev.daodao.so` ↔ 生產: `app.daodao.so`
   - Cookie domain: `.dev.daodao.so` ↔ `.daodao.so`
   - **邏輯完全一致，僅域名不同**

#### 9.2.7 開發環境注意事項（推薦方案）

**使用不同域名方案（與生產環境一致）**:

✅ **優勢**:

- **與生產環境完全一致**: 使用相同的域名結構和 Cookie domain 邏輯
- **Cookie 可以共享**: 使用 `domain: '.dev.daodao.so'` 實現跨子域名共享
- **無需維護兩套邏輯**: 開發和生產使用相同的代碼路徑
- **HTTPS 支援**: Next.js 開發環境支援 HTTPS，與生產環境一致
- **SameSite 設定**: 使用 `sameSite: 'lax'` 即可（與生產環境一致）

⚠️ **注意事項**:

- **需要修改 hosts 檔案**: 僅需設定一次，之後自動生效
- **需要設定 SSL 憑證**: 使用 mkcert 建立本地憑證（見 9.2.5）
- **後端環境變數**: 後端需設定 `COOKIE_DOMAIN` 和 `CORS_ORIGINS` 環境變數
- **環境變數管理**: 確保開發和生產環境的環境變數結構一致

**後端 Cookie 設定範例（使用環境變數）**:

```typescript
// 統一的 Cookie 設定邏輯（開發和生產共用）
const cookieOptions = {
  httpOnly: true,
  secure: true,  // 開發和生產都使用 HTTPS
  sameSite: 'lax' as const,
  path: '/',
  domain: process.env.COOKIE_DOMAIN || '.dev.daodao.so', // 從環境變數讀取
};
```

**CORS 設定範例（使用環境變數）**:

```typescript
// 統一的 CORS 邏輯（開發和生產共用）
const getAllowedOrigins = () => {
  return (process.env.CORS_ORIGINS || '').split(',').filter(Boolean);
};
```

### 9.3 Mock 模式（可選）

- 開發環境可啟用 Mock 模式
- 跳過實際 OAuth 流程
- 使用假 Cookie 進行開發（需後端配合）

---

## 10. 實作優先順序 (Implementation Priority)

### Phase 1: 核心功能

1. ✅ Cookie 設定（後端配合）
2. ✅ Auth Client（OAuth 流程）
3. ✅ Auth Provider（React Context，透過 API 檢查登入狀態）
4. ✅ API Client 整合（設定 `credentials: 'include'`）

### Phase 2: 路由保護

1. ✅ Middleware 保護
2. ✅ AuthGuard 組件
3. ✅ useRequireAuth Hook

### Phase 3: 登入情境

1. ✅ 情境 1: 首頁進入 App
2. ✅ 情境 2: Quiz 進階分析
3. ✅ 情境 3: 直接輸入網址
4. ✅ 情境 4: 登入後跳轉

### Phase 4: 進階功能

1. ✅ Token 自動刷新（後端處理，前端呼叫 API）
2. ✅ 跨 Tab 同步（使用者資訊透過 localStorage 事件）
3. ✅ 錯誤處理完善
4. ✅ 跨域登入優化（Cookie domain 設定）

---

## 11. 測試策略 (Testing Strategy)

### 11.1 單元測試

- Cookie 讀取（透過 Next.js `cookies()` API）
- State 參數編碼/解碼
- 使用者資訊存儲/讀取（localStorage）
- 跳轉 URL 處理

### 11.2 整合測試

- OAuth 流程完整測試（Cookie 設定驗證）
- API Client Cookie 發送測試（`credentials: 'include'`，**不使用 Authorization header**）
- Middleware 保護測試（Cookie 檢查）
- 開發環境跨域測試（localhost 不同端口）

### 11.3 E2E 測試

- 完整登入流程
- 各情境登入測試
- 跨域登入測試

---

## 12. 文件與範例 (Documentation & Examples)

### 12.1 使用範例

#### 基本使用（Client Component）

```typescript
'use client';
import { useAuth } from '@daodao/auth';

export default function Dashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return <div>Please login</div>;
  
  return <div>Welcome, {user?.name}</div>;
}
```

#### 路由保護（Server Component）

```typescript
import { AuthGuard } from '@daodao/auth';

export default function ProtectedPage() {
  return (
    <AuthGuard>
      <div>Protected Content</div>
    </AuthGuard>
  );
}
```

#### 登入按鈕

```typescript
import { LoginButton } from '@daodao/auth';

export default function HomePage() {
  return (
    <LoginButton redirectUrl="/dashboard">
      Enter App
    </LoginButton>
  );
}
```

---

## 13. 待確認事項 (Open Questions)

1. **後端 OAuth 端點**: 確認後端 Google OAuth 的完整端點路徑
2. **Cookie 設定**: 確認後端是否支援設定 Cookie（`domain=.daodao.so`, `httpOnly`, `secure`, `sameSite`）
3. **Cookie 名稱**: 確認後端使用的 Cookie 名稱（如 `auth_token`）
4. **認證方式**: 確認後端**僅使用 Cookie 認證**，不使用 Authorization Bearer Token
5. **Refresh Token**: 確認是否有 Refresh Token 機制，以及如何透過 Cookie 刷新
6. **使用者資訊端點**: 確認是否有 `/api/v1/auth/me` 端點取得使用者資訊
7. **登出流程**: 確認登出是否需要呼叫後端 API 清除 Cookie
8. **CORS 設定**:
   - 生產環境：確認後端 CORS 設定是否允許 `daodao.so` 和 `app.daodao.so` 的跨域請求
   - 開發環境：確認後端 CORS 設定是否允許 `dev.daodao.so:3000` 和 `app.dev.daodao.so:3001`
9. **開發環境 Cookie**:
   - 確認開發環境的 Cookie domain 設定（localhost 無法使用 domain）
   - 確認開發環境是否使用 `secure: false`
   - 確認開發環境的 SameSite 設定（可能需要 `none` 才能跨端口）
10. **開發環境跨域方案**: 確認開發環境使用哪種跨域方案（統一端口、hosts 設定、或簡化測試）

---

## 14. Cookie vs localStorage 比較

### 14.1 為什麼選擇 Cookie

| 特性 | Cookie (HTTP-only) | localStorage |
|------|-------------------|--------------|
| **跨域共享** | ✅ 支援（設定 `domain=.daodao.so`） | ❌ 無法跨域 |
| **XSS 防護** | ✅ HTTP-only 無法被 JavaScript 讀取 | ❌ 可被 JavaScript 讀取 |
| **自動發送** | ✅ 自動在請求中發送 | ❌ 需手動注入 header |
| **CSRF 防護** | ✅ SameSite 設定 | ❌ 無內建防護 |
| **儲存大小** | ⚠️ 4KB 限制 | ✅ 5-10MB |
| **前端存取** | ❌ 無法透過 JavaScript 讀取 | ✅ 可直接讀取 |

### 14.2 實作差異

**localStorage + Bearer Token 方案**:

- 前端需手動管理 Token
- 需手動注入 `Authorization: Bearer <token>` header
- 跨域需額外處理（postMessage 或 URL 參數）
- Token 可被 JavaScript 讀取，XSS 風險較高

**Cookie 方案（本專案採用）**:

- 後端自動管理 Token（HTTP-only Cookie）
- Cookie 自動發送，**不使用 Authorization header**
- 跨域自動共享（設定 `domain=.daodao.so`）
- 更安全（HTTP-only，無法被 JavaScript 讀取）
- 前端僅需設定 `credentials: 'include'` 即可

---

## 15. 參考資料 (References)

- [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [Next.js Cookies API](https://nextjs.org/docs/app/api-reference/functions/cookies)
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [HTTP-only Cookie Security](https://owasp.org/www-community/HttpOnly)
- [SameSite Cookie Attribute](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite)
- [OpenAPI Types](packages/api/src/types.ts)
- [Storage Utility](packages/shared/src/lib/storage.ts)
