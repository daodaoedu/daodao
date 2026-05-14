# daodao-f2e 登入與認證流程

本文從瀏覽器操作角度整理 `daodao-f2e/apps/product` 的登入、OAuth、Onboarding 流程。

## 登入流程總覽

```mermaid
flowchart TD
    U["使用者觸發登入"] --> T{"觸發方式"}

    T -->|"點擊登入按鈕"| B["AuthButton 點擊"]
    T -->|"訪問需認證頁面"| G["AuthGuard 攔截"]

    B --> D["開啟 LoginDialog"]
    G --> D

    D --> P{"選擇登入方式"}
    P -->|"Google"| G_O["Redirect 到 Google OAuth"]
    P -->|"其他 provider"| O_O["Redirect 到對應 OAuth"]

    G_O --> C["/auth/callback?state=...&isNewUser=..."]
    O_O --> C

    C --> R["useRedirectAfterLogin()"]
    R --> N{"isNewUser?"}

    N -->|"是"| ON["Redirect /auth/onboarding"]
    N -->|"否"| H{"驗證 state 成功?"}

    H -->|"是"| TARGET["Redirect 到目標頁面"]
    H -->|"否"| DEFAULT["Redirect / (首頁)"]

    ON --> FORM["填寫 OnboardingForm"]
    FORM --> COMPLETE["完成後 Redirect /"]
```

## OAuth State 驗證流程

```mermaid
flowchart TD
    C["/auth/callback 頁面載入"] --> S["取得 URL state 參數"]

    S --> E{"state 存在?"}
    E -->|"否"| N1["isNewUser?"]
    E -->|"是"| D["decodeOAuthState()"]

    N1 -->|"是"| ON1["Redirect /auth/onboarding"]
    N1 -->|"否"| HOME1["Redirect /"]

    D --> V{"state 格式正確?"}
    V -->|"否"| N2["isNewUser?"]
    V -->|"是"| VERIFY["verifyAndConsumeOAuthState()"]

    N2 -->|"是"| ON2["Redirect /auth/onboarding"]
    N2 -->|"否"| HOME2["Redirect /"]

    VERIFY --> C1{"nonce 匹配且未過期?"}
    C1 -->|"否"| N3["isNewUser?"]
    C1 -->|"是"| N4["isNewUser?"]

    N3 -->|"是"| ON3["Redirect /auth/onboarding"]
    N3 -->|"否"| HOME3["Redirect /"]

    N4 -->|"是"| ON4["Redirect /auth/onboarding"]
    N4 -->|"否"| SAFE["檢查 redirectUrl 是否安全"]

    SAFE --> R1{"包含 /auth/error?"}
    R1 -->|"是"| HOME4["Redirect /"]
    R1 -->|"否"| TARGET["Redirect 到目標頁面"]
```

## Onboarding 流程

```mermaid
flowchart TD
    P["/auth/onboarding 頁面載入"] --> C["useAuth() 取得狀態"]

    C --> L{"isLoading?"}
    L -->|"是"| WAIT["顯示 Loading..."]
    L -->|"否"| A{"isAuthenticated?"}

    A -->|"否"| R1["Redirect /"]
    A -->|"是"| T{"isTemporary?"}

    T -->|"否 (已完成)"| R2["Redirect /"]
    T -->|"是 (新用戶)"| I["setHasInitialized(true)"]

    I --> FORM["顯示 OnboardingForm"]
    FORM --> SUBMIT["填寫並提交表單"]

    SUBMIT --> API["呼叫 API 更新用戶資料"]
    API --> SUCCESS["isTemporary = false"]
    SUCCESS --> R3["Redirect /"]
```

## 各頁面職責

```mermaid
flowchart LR
    subgraph Pages["認證相關頁面"]
        L["/auth/login"] --> |"開啟 LoginDialog"| D["Dialog"]
        CB["/auth/callback"] --> |"處理跳轉"| R["useRedirectAfterLogin"]
        ON["/auth/onboarding"] --> |"新用戶引導"| F["OnboardingForm"]
        E["/auth/error"] --> |"顯示錯誤"| ERR["錯誤訊息"]
        V["/auth/verify-email"] --> |"信箱驗證"| VEF["驗證流程"]
    end

    subgraph Hooks["認證 Hooks"]
        A["useAuth()"] --> |"狀態管理"| CTX["AuthContext"]
        RA["useRequireAuth()"] --> |"路由保護"| GUARD["AuthGuard"]
        RL["useRedirectAfterLogin()"] --> |"登入後跳轉"| NAV["Navigation"]
    end

    subgraph Components["UI 元件"]
        AB["AuthButton"] --> |"觸發登入"| D
        AG["AuthGuard"] --> |"攔截未認證"| L
    end
```

## 登入 Dialog 流程

```mermaid
flowchart TD
    O["openLoginDialog()"] --> D["LoginDialog 開啟"]

    D --> S1["Step 1: 選擇登入方式"]
    S1 --> P{"選擇 provider"}

    P -->|"Google"| G["準備 Google OAuth URL"]
    P -->|"其他"| O_P["準備其他 provider URL"]

    G --> ST["生成 state (含 nonce + redirectUrl)"]
    O_P --> ST

    ST --> STORE["localStorage 存 state"]
    STORE --> REDIRECT["Redirect 到 OAuth provider"]

    REDIRECT --> AUTH["使用者在外部頁面授權"]
    AUTH --> CB["Redirect 回 /auth/callback"]
```

## Android Chrome Custom Tab 場景

```mermaid
sequenceDiagram
    participant U as 使用者
    participant M as 主 Tab
    participant C as Chrome Custom Tab
    participant G as Google OAuth

    U->>M: 點擊登入
    M->>C: 開啟 CCT 到 Google OAuth
    C->>G: OAuth 請求
    G->>C: 授權成功，redirect
    C->>M: 關閉 CCT，觸發 storage event
    M->>M: checkAuth() 重新驗證
    M->>M: isAuthenticated = true
    M->>M: Redirect 到目標頁面

    Note over C,M: AuthSignal storage event 通知主 tab
```

## 相關程式位置

- `daodao-f2e/apps/product/src/app/[locale]/auth/login/page.tsx`
- `daodao-f2e/apps/product/src/app/[locale]/auth/callback/page.tsx`
- `daodao-f2e/apps/product/src/app/[locale]/auth/onboarding/page.tsx`
- `daodao-f2e/packages/auth/src/hooks/use-auth.ts`
- `daodao-f2e/packages/auth/src/hooks/use-redirect-after-login.ts`
- `daodao-f2e/packages/auth/src/lib/auth-provider.tsx`
- `daodao-f2e/packages/auth/src/lib/auth-client.ts`
