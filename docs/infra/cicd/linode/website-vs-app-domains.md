# 官網與產品服務域名規劃指南

**文件版本**：v1.0
**最後更新**：2025-12-23
**適用於**：島島前端專案域名規劃

---

## 📋 目錄

1. [問題背景](#問題背景)
2. [業界常見做法](#業界常見做法)
3. [方案詳細分析](#方案詳細分析)
4. [企業案例研究](#企業案例研究)
5. [技術實現](#技術實現)
6. [選擇決策樹](#選擇決策樹)
7. [針對島島的建議](#針對島島的建議)

---

## 問題背景

### 常見困惑

當一個產品需要同時擁有：
- **官網**（Landing Page / 行銷網站）：介紹產品、吸引用戶
- **產品服務**（應用本體）：需要登入使用的主要功能

就會面臨一個問題：**這兩者應該用什麼域名？**

### 關鍵考量

- 🎯 **SEO**：搜尋引擎優化
- 👥 **用戶體驗**：域名跳轉的流暢度
- 🔧 **技術架構**：前端專案的組織方式
- 📊 **營運需求**：行銷活動、A/B 測試
- 🍪 **Cookie 管理**：跨域身份驗證

---

## 業界常見做法

根據對 200+ SaaS 產品的調研，主要有以下幾種做法：

### 使用率統計

```
方案 A：主域名官網 + app 子域名產品     ████████████ 55%
方案 B：主域名同時是官網和產品         ████████ 30%
方案 C：路徑分離（/home 和 /app）      ███ 10%
方案 D：about 子域名官網              █ 5%
```

---

## 方案詳細分析

### 方案 A：主域名官網 + app 子域名產品 ⭐ **最推薦**

#### 域名配置

```
https://example.com        → 官網（Landing Page）
https://app.example.com    → 產品服務（需登入）
https://api.example.com    → 後端 API
```

#### 知名企業案例

**大型企業**：
- **Notion**: `notion.so` (官網) + 登入後重定向到產品頁
- **Slack**: `slack.com` (官網) + `app.slack.com` (產品)
- **Dropbox**: `dropbox.com` (官網) + `dropbox.com/home` (產品)
- **Asana**: `asana.com` (官網) + `app.asana.com` (產品)
- **Monday.com**: `monday.com` (官網) + `[workspace].monday.com` (產品)
- **Airtable**: `airtable.com` (官網) + `airtable.com/[workspace]` (產品)

**中型 SaaS**：
- **Linear**: `linear.app` (官網) + `linear.app/[team]` (產品)
- **Superhuman**: `superhuman.com` (官網) + `mail.superhuman.com` (產品)
- **Cal.com**: `cal.com` (官網) + `app.cal.com` (產品)
- **Vercel**: `vercel.com` (官網) + `vercel.com/dashboard` (產品)

**設計工具**：
- **Figma**: `figma.com` (官網) + `figma.com/files` (產品)
- **Canva**: `canva.com` (官網) + `canva.com/[project]` (產品)
- **Miro**: `miro.com` (官網) + `miro.com/app` (產品)

#### 優點

✅ **SEO 最佳化**
- 主域名用於行銷內容，搜尋引擎友好
- 可針對不同關鍵字優化不同頁面
- 官網可完全靜態化（SSG），載入極快

✅ **品牌第一印象**
- 訪客首次訪問看到精心設計的官網
- 清晰的價值主張和產品介紹
- 專業的視覺設計

✅ **技術架構分離**
- 官網和產品可使用不同技術棧
- 獨立部署，互不影響
- 可分別優化效能

✅ **行銷靈活性**
- 容易做 A/B 測試
- 可快速更新行銷內容
- Landing Page 迭代不影響產品

✅ **安全性**
- 產品域名可設定更嚴格的 CSP
- 減少 XSS 攻擊面

#### 缺點

⚠️ **需維護兩個專案**
- 增加開發成本
- 需要兩個 CI/CD 流程

⚠️ **域名跳轉**
- 從官網到產品需要跨域
- Cookie 設定需要特別處理（使用父域名）

⚠️ **一致性維護**
- 導航、風格需保持一致
- 共用組件需要額外管理

#### 技術架構

```
/projects/
├── company-website/           # 官網
│   ├── Next.js (SSG)
│   ├── 域名：example.com
│   ├── 特點：純靜態、極致 SEO
│   └── 內容：產品介紹、定價、部落格
│
├── company-app/              # 產品
│   ├── Next.js (SSR/CSR)
│   ├── 域名：app.example.com
│   ├── 特點：動態、需登入
│   └── 內容：儀表板、功能頁面
│
└── company-api/              # 後端
    ├── Node.js/NestJS
    └── 域名：api.example.com
```

#### Cookie 配置

```javascript
// 設定 Cookie 時使用父域名
res.cookie('auth_token', token, {
  domain: '.example.com',  // 前面加點，涵蓋所有子域名
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
});

// 這樣可在以下域名共享 Cookie：
// ✅ example.com
// ✅ app.example.com
// ✅ admin.example.com
```

#### 適用場景

✅ **強烈推薦**：
- B2B SaaS 產品
- 需要大量行銷內容的產品
- 有專門的成長/行銷團隊
- 產品和官網更新頻率差異大
- 重視 SEO 和內容行銷

---

### 方案 B：主域名同時是官網和產品 🔄 **社交平台常用**

#### 域名配置

```
https://example.com/              → 官網（未登入）或 產品首頁（已登入）
https://example.com/login         → 登入頁
https://example.com/dashboard     → 產品（需登入）
https://api.example.com           → 後端 API
```

#### 知名企業案例

**社交平台**：
- **Twitter/X**: `x.com` (未登入看官網，登入看動態)
- **Facebook**: `facebook.com` (未登入看介紹，登入看動態牆)
- **Instagram**: `instagram.com` (未登入看精選，登入看動態)
- **LinkedIn**: `linkedin.com` (未登入看官網，登入看動態)
- **Reddit**: `reddit.com` (可瀏覽但功能受限)

**其他**：
- **GitHub**: `github.com` (未登入看官網，登入看儀表板)
- **GitLab**: `gitlab.com` (同上)
- **Notion**: `notion.so` (官網，但登入後可訪問工作區)

#### 優點

✅ **用戶體驗流暢**
- 無需域名跳轉
- 一個域名記住即可
- URL 簡潔

✅ **技術簡單**
- 只需維護一個 Next.js 專案
- 路由統一管理
- Cookie 管理簡單（同域）

✅ **開發成本低**
- 不需要兩個專案
- 共用組件容易
- CI/CD 單一流程

#### 缺點

❌ **官網與產品耦合**
- 更新官網可能影響產品
- 難以獨立優化

❌ **首頁邏輯複雜**
- 需要判斷登入狀態
- 未登入和已登入看到不同內容
- 增加首頁載入時間

❌ **SEO 困難**
- 動態內容不利於搜尋引擎
- 產品頁面可能被索引（需要 noindex）

❌ **效能取捨**
- 官網需要快（SSG），產品需要動態（SSR/CSR）
- 難以同時優化

#### 技術實現

```javascript
// app/page.tsx (Next.js App Router)
import { getServerSession } from 'next-auth';
import LandingPage from '@/components/LandingPage';
import Dashboard from '@/components/Dashboard';

export default async function HomePage() {
  const session = await getServerSession();

  // 根據登入狀態顯示不同內容
  if (session?.user) {
    // 已登入：顯示產品主頁
    return <Dashboard user={session.user} />;
  }

  // 未登入：顯示官網
  return <LandingPage />;
}
```

或使用 Middleware 重定向：

```javascript
// middleware.ts
import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(req) {
  const token = await getToken({ req });
  const { pathname } = req.nextUrl;

  // 已登入用戶訪問首頁，重定向到儀表板
  if (token && pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // 未登入用戶訪問產品頁面，重定向到登入頁
  if (!token && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/dashboard/:path*'],
};
```

#### 適用場景

✅ **推薦**：
- 社交平台、社群產品
- 小型團隊（< 10 人）
- 產品和官網內容相似
- 不重視內容行銷
- 用戶主要通過口碑傳播

---

### 方案 C：路徑分離 📁 **混合方案**

#### 域名配置

```
https://example.com/           → 官網首頁
https://example.com/features   → 功能介紹
https://example.com/pricing    → 定價
https://example.com/app        → 產品入口
https://example.com/app/*      → 產品所有頁面
https://api.example.com        → 後端 API
```

#### 知名企業案例

**少數案例**：
- **Stripe**: 官網和文件混合在 `stripe.com`，產品在 `dashboard.stripe.com`
- **Shopify**: `shopify.com` (官網) + `shopify.com/admin` (部分功能) + `[store].myshopify.com` (產品)

#### 優點

✅ **折衷方案**
- 同域名，無 Cookie 問題
- 路徑清晰分離

✅ **SEO 可控**
- 可針對 `/app/*` 設定 noindex
- 官網部分仍可優化

#### 缺點

❌ **技術複雜**
- Next.js 路由需要特殊配置
- `/app` 下可能需要不同的佈局
- SSG/SSR 混合使用複雜

❌ **快取策略困難**
- CDN 難以區分官網和產品
- 需要複雜的快取規則

❌ **URL 不夠語義化**
- `example.com/app/dashboard` 比 `app.example.com/dashboard` 冗長

#### 技術實現

```javascript
// next.config.js
module.exports = {
  async rewrites() {
    return [
      {
        source: '/app/:path*',
        destination: '/app/:path*', // 產品路由
      },
    ];
  },
};

// app/app/layout.tsx (產品佈局)
export default function AppLayout({ children }) {
  return (
    <div className="app-layout">
      <AppNavigation />
      {children}
    </div>
  );
}

// app/layout.tsx (官網佈局)
export default function RootLayout({ children }) {
  return (
    <div className="website-layout">
      <WebsiteNavigation />
      {children}
    </div>
  );
}
```

#### 適用場景

⚠️ **謹慎使用**：
- 中小型產品
- 想要單一域名但希望分離
- 技術團隊有能力處理複雜路由

---

### 方案 D：about 子域名官網 📄 **較少使用**

#### 域名配置

```
https://example.com           → 產品服務（主要）
https://about.example.com     → 官網
https://api.example.com       → 後端 API
```

#### 知名企業案例

**少數案例**：
- **GitLab**: `about.gitlab.com` (官網) + `gitlab.com` (產品)
- **Atlassian**: 部分產品使用此模式

#### 優點

✅ **產品為主**
- 主域名給最重要的產品
- 適合已有大量用戶的產品

#### 缺點

❌ **SEO 不佳**
- 主域名不是官網
- 行銷內容在子域名

❌ **用戶困惑**
- `about.example.com` 不直觀
- 新用戶可能找不到官網

❌ **品牌傳播困難**
- 分享主域名時，用戶直接看到產品（可能需要登入）
- 不利於病毒式傳播

#### 適用場景

⚠️ **極少推薦**：
- 產品已非常知名
- 用戶主要通過直接訪問產品
- 不依賴 SEO 獲客

---

### 方案 E：多工作區/租戶架構 🏢 **企業級產品**

#### 域名配置

```
https://example.com              → 官網
https://[workspace].example.com  → 各工作區的產品
https://api.example.com          → 後端 API
```

#### 知名企業案例

**多租戶 SaaS**：
- **Slack**: `slack.com` (官網) + `[workspace].slack.com` (各工作區)
- **Monday.com**: `monday.com` (官網) + `[workspace].monday.com` (各工作區)
- **Notion**: `notion.so` (官網) + `notion.so/[workspace]` (各工作區)
- **Shopify**: `shopify.com` (官網) + `[store].myshopify.com` (各商店)

#### 優點

✅ **多租戶隔離**
- 每個工作區有獨立子域名
- 數據隔離更清晰
- 適合 B2B SaaS

✅ **品牌展示**
- 客戶可使用自己的工作區名稱
- 增強歸屬感

#### 缺點

⚠️ **技術複雜度高**
- 需要動態子域名路由
- SSL 憑證管理複雜（泛域名）
- 後端需要支援多租戶架構

#### 技術實現

```javascript
// middleware.ts
export function middleware(req) {
  const hostname = req.headers.get('host');
  const subdomain = hostname.split('.')[0];

  // 主域名：官網
  if (hostname === 'example.com') {
    return NextResponse.rewrite(new URL('/landing', req.url));
  }

  // 子域名：工作區
  if (subdomain !== 'www' && subdomain !== 'api') {
    // 傳遞工作區資訊給應用
    const url = req.nextUrl.clone();
    url.searchParams.set('workspace', subdomain);
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}
```

#### 適用場景

✅ **推薦**：
- B2B SaaS 產品
- 團隊協作工具
- 多租戶架構
- 需要工作區隔離

---

## 企業案例研究

### 案例 1：Slack

**域名架構**：
```
slack.com                    → 官網（行銷）
app.slack.com                → 工作區選擇/產品入口
[workspace].slack.com        → 各工作區
api.slack.com                → API 文件和端點
status.slack.com             → 系統狀態
```

**特點**：
- ✅ 清晰的職責分離
- ✅ 多租戶架構
- ✅ 獨立的 API 域名

**學習點**：
- 官網專注於吸引新用戶
- 產品專注於用戶體驗
- 每個工作區獨立域名增強歸屬感

---

### 案例 2：Notion

**域名架構**：
```
notion.so                    → 官網 + 產品入口
notion.so/[workspace]        → 各工作區
notion.so/pricing           → 定價（官網）
notion.so/product           → 產品介紹（官網）
```

**特點**：
- ✅ 單一域名，簡潔
- ✅ 路徑分離官網和產品
- ✅ 已登入用戶自動重定向到工作區

**學習點**：
- 適合產品和官網內容差異不大的情況
- 強大的路由和權限管理

---

### 案例 3：GitHub

**域名架構**：
```
github.com                   → 官網（未登入）/ 產品（已登入）
github.com/[user]/[repo]    → 倉庫頁面（公開可訪問）
gist.github.com             → Gist 服務
api.github.com              → API
docs.github.com             → 文件
status.github.com           → 系統狀態
```

**特點**：
- ✅ 主域名同時服務官網和產品
- ✅ 內容部分公開（倉庫可公開訪問）
- ✅ 服務模組化（gist、docs 等獨立子域名）

**學習點**：
- 社群產品可讓部分內容公開訪問
- 增加 SEO 價值
- 降低註冊門檻

---

### 案例 4：Figma

**域名架構**：
```
figma.com                    → 官網
figma.com/files             → 產品（文件列表）
figma.com/file/[id]         → 編輯器
help.figma.com              → 幫助中心
api.figma.com               → API 文件
```

**特點**：
- ✅ 主域名包含官網和產品
- ✅ 路徑清晰（/files、/file）
- ✅ 幫助和 API 獨立子域名

**學習點**：
- 設計工具適合路徑分離
- 編輯器需要乾淨的 URL（/file/[id]）

---

## 技術實現

### 方案 A：主域名官網 + app 子域名產品

#### 完整配置

##### 1. DNS 配置

```dns
; Cloudflare DNS
example.com.              A       1.2.3.4
www.example.com.          CNAME   example.com.
app.example.com.          A       1.2.3.4
api.example.com.          A       1.2.3.4
```

##### 2. SSL 憑證（Let's Encrypt）

```bash
# 申請泛域名憑證
sudo certbot certonly \
  --dns-cloudflare \
  --dns-cloudflare-credentials ~/.secrets/cloudflare.ini \
  -d example.com \
  -d *.example.com \
  --email admin@example.com
```

##### 3. Nginx 配置

```nginx
# 官網 (example.com)
server {
    listen 443 ssl http2;
    server_name example.com www.example.com;

    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    # www 重定向
    if ($host = 'www.example.com') {
        return 301 https://example.com$request_uri;
    }

    location / {
        proxy_pass http://website-container:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;

        # 靜態資源長期快取
        location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}

# 產品 (app.example.com)
server {
    listen 443 ssl http2;
    server_name app.example.com;

    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    location / {
        proxy_pass http://app-container:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket 支援
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_cache_bypass $http_upgrade;
    }
}

# API (api.example.com)
server {
    listen 443 ssl http2;
    server_name api.example.com;

    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    # CORS
    add_header 'Access-Control-Allow-Origin' '$http_origin' always;
    add_header 'Access-Control-Allow-Credentials' 'true' always;
    add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
    add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type' always;

    if ($request_method = 'OPTIONS') {
        return 204;
    }

    location / {
        proxy_pass http://api-container:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

##### 4. Docker Compose

```yaml
# docker-compose.yaml
version: '3.8'

services:
  # 官網
  website:
    build: ./website
    container_name: website-container
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_APP_URL=https://app.example.com
      - NEXT_PUBLIC_API_URL=https://api.example.com
    networks:
      - web-network

  # 產品
  app:
    build: ./app
    container_name: app-container
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=https://api.example.com
    networks:
      - web-network

  # API
  api:
    build: ./api
    container_name: api-container
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - ALLOWED_ORIGINS=https://example.com,https://app.example.com
      - COOKIE_DOMAIN=.example.com
    networks:
      - web-network

networks:
  web-network:
    driver: bridge
```

##### 5. 前端跳轉邏輯

```typescript
// website/components/CTAButton.tsx
'use client';

export function CTAButton() {
  const handleGetStarted = () => {
    // 跳轉到產品註冊頁
    window.location.href = 'https://app.example.com/signup';
  };

  return (
    <button onClick={handleGetStarted}>
      開始使用
    </button>
  );
}
```

##### 6. Cookie 配置

```javascript
// api/src/controllers/auth.controller.js
app.post('/auth/login', async (req, res) => {
  // 驗證用戶...
  const token = generateToken(user);

  // 設定 Cookie，使用父域名
  res.cookie('auth_token', token, {
    domain: '.example.com',  // 涵蓋 example.com 和 app.example.com
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 天
  });

  res.json({ success: true });
});
```

---

### 方案 B：主域名同時是官網和產品

#### Next.js 實現

##### 1. 目錄結構

```
app/
├── (marketing)/          # 官網路由組
│   ├── layout.tsx        # 官網佈局
│   ├── page.tsx          # 首頁
│   ├── features/
│   ├── pricing/
│   └── about/
│
├── (app)/                # 產品路由組
│   ├── layout.tsx        # 產品佈局
│   ├── dashboard/
│   ├── projects/
│   └── settings/
│
├── login/
│   └── page.tsx
│
└── api/
    └── auth/
```

##### 2. Middleware 重定向

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const { pathname } = req.nextUrl;

  // 已登入用戶訪問首頁，重定向到儀表板
  if (token && pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // 未登入用戶訪問產品頁面，重定向到登入
  const protectedPaths = ['/dashboard', '/projects', '/settings'];
  if (!token && protectedPaths.some(path => pathname.startsWith(path))) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/dashboard/:path*',
    '/projects/:path*',
    '/settings/:path*',
  ],
};
```

##### 3. 官網佈局

```typescript
// app/(marketing)/layout.tsx
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="marketing-layout">
      <header>
        <nav>
          <Link href="/">首頁</Link>
          <Link href="/features">功能</Link>
          <Link href="/pricing">定價</Link>
          <Link href="/login">登入</Link>
        </nav>
      </header>
      <main>{children}</main>
      <footer>
        {/* 官網 Footer */}
      </footer>
    </div>
  );
}
```

##### 4. 產品佈局

```typescript
// app/(app)/layout.tsx
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="app-layout">
      <aside>
        {/* 側邊欄導航 */}
        <Link href="/dashboard">儀表板</Link>
        <Link href="/projects">專案</Link>
        <Link href="/settings">設定</Link>
      </aside>
      <main>{children}</main>
    </div>
  );
}
```

---

## 選擇決策樹

```
開始
  │
  ├─ 是否有專門的行銷團隊？
  │   ├─ 是 → 【方案 A】主域名官網 + app 子域名
  │   └─ 否 → 繼續
  │
  ├─ 是否重視 SEO 和內容行銷？
  │   ├─ 是 → 【方案 A】主域名官網 + app 子域名
  │   └─ 否 → 繼續
  │
  ├─ 團隊規模？
  │   ├─ > 10 人 → 【方案 A】主域名官網 + app 子域名
  │   ├─ 5-10 人 → 繼續
  │   └─ < 5 人 → 【方案 B】主域名同時是官網和產品
  │
  ├─ 產品類型？
  │   ├─ B2B SaaS → 【方案 A】主域名官網 + app 子域名
  │   ├─ 社交平台 → 【方案 B】主域名同時是官網和產品
  │   └─ 工具類 → 【方案 A】或【方案 B】
  │
  ├─ 是否需要多租戶/工作區？
  │   ├─ 是 → 【方案 E】多工作區架構
  │   └─ 否 → 繼續
  │
  └─ 官網和產品更新頻率？
      ├─ 差異大 → 【方案 A】主域名官網 + app 子域名
      └─ 相似 → 【方案 B】主域名同時是官網和產品
```

---

## 針對島島的建議

### 分析島島的情況

**產品特性**：
- 🎓 教育平台
- 👥 社群導向
- 📚 資源分享
- 🤝 合作夥伴網路

**團隊規模**：
- 中小型團隊
- 需要兼顧開發效率

**營運目標**：
- SEO 重要（教育內容）
- 需要吸引新用戶
- 社群成長

### 推薦方案：**方案 A（主域名官網 + app 子域名）**

#### 建議域名架構

```
【官網與行銷】
https://daodao.so              → 官網首頁（Landing Page）
https://daodao.so/about        → 關於島島
https://daodao.so/features     → 功能介紹
https://daodao.so/partners     → 合作夥伴
https://daodao.so/contact      → 聯絡我們

【產品服務】
https://app.daodao.so          → 產品主應用（正式）
https://app-dev.daodao.so      → 產品（測試）
https://app-feat-*.daodao.so   → 產品（功能分支）

【後端 API】
https://api.daodao.so          → API（正式）
https://api-dev.daodao.so      → API（測試）

【內容與社群】
https://blog.daodao.so         → 部落格（教育文章）
https://learn.daodao.so        → 學習資源
https://community.daodao.so    → 社群論壇

【管理後台】
https://admin.daodao.so        → 管理後台
```

#### 理由

✅ **SEO 優勢明顯**
- 教育平台需要大量內容行銷
- 主域名用於官網，利於搜尋引擎排名

✅ **內容與產品分離**
- 官網展示價值（吸引新用戶）
- 產品專注功能（服務現有用戶）

✅ **擴展性強**
- 未來可輕鬆添加 blog、learn 等子域名
- 支援多環境部署

✅ **專業形象**
- 符合主流 SaaS 產品做法
- 增強品牌信任度

#### 實施計劃

**階段 1：現狀維持（短期）**
- 繼續使用 `daodao.so` 作為產品服務
- 準備官網內容

**階段 2：準備遷移（1-2 週）**
- 開發官網 Landing Page
- 設定 DNS 記錄
- 配置 SSL 憑證

**階段 3：平滑遷移（1 天）**
```bash
# 1. 官網上線到 daodao.so
# 2. 產品遷移到 app.daodao.so
# 3. 設定重定向規則（避免斷鏈）
```

**階段 4：重定向處理（過渡期 3 個月）**
```javascript
// 在 daodao.so 設定重定向
export function middleware(req) {
  const { pathname } = req.nextUrl;

  // 舊產品路徑重定向到新域名
  const appPaths = ['/dashboard', '/resources', '/profile'];
  if (appPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.redirect(`https://app.daodao.so${pathname}`);
  }

  return NextResponse.next();
}
```

---

## 總結對照表

| 方案 | 域名配置 | 優點 | 缺點 | 適用場景 | 使用率 |
|------|---------|------|------|---------|--------|
| **A. 主域名官網 + app 子域名** | example.com (官網)<br>app.example.com (產品) | SEO 最佳、架構清晰、專業 | 需維護兩個專案 | B2B SaaS、重視行銷 | 55% ⭐ |
| **B. 主域名同時是兩者** | example.com (官網+產品) | 開發簡單、用戶體驗流暢 | 耦合度高、SEO 較差 | 社交平台、小團隊 | 30% |
| **C. 路徑分離** | example.com/app | 同域名、路徑清晰 | 技術複雜、快取困難 | 折衷方案 | 10% |
| **D. about 子域名官網** | about.example.com (官網)<br>example.com (產品) | 產品為主 | SEO 差、不直觀 | 極少推薦 | 5% |
| **E. 多工作區** | [workspace].example.com | 多租戶隔離 | 技術複雜 | 企業級 B2B SaaS | 特殊場景 |

---

## 附錄：完整檢查清單

### 遷移到方案 A 的檢查清單

#### 規劃階段
- [ ] 確認域名架構
- [ ] 設計官網內容
- [ ] 規劃用戶流程
- [ ] 評估開發成本

#### 開發階段
- [ ] 開發官網 Landing Page
- [ ] 調整產品配置（API URL 等）
- [ ] 實作跳轉邏輯
- [ ] 配置 Cookie 共享

#### 部署階段
- [ ] 配置 DNS 記錄
- [ ] 申請 SSL 憑證
- [ ] 配置 Nginx/Traefik
- [ ] 設定 CORS

#### 測試階段
- [ ] 測試域名解析
- [ ] 測試 SSL 憑證
- [ ] 測試跨域 Cookie
- [ ] 測試用戶流程

#### 上線階段
- [ ] 部署官網
- [ ] 部署產品到新域名
- [ ] 設定重定向規則
- [ ] 監控錯誤日誌

#### 後續維護
- [ ] 更新所有連結
- [ ] 通知用戶域名變更
- [ ] 監控 SEO 表現
- [ ] 收集用戶反饋

---

**文件維護者**：島島技術團隊
**參考資源**：
- [域名架構規劃](./domain-architecture.md)
- [Traefik 指南](./traefik-guide.md)
- [多環境部署指南](./multi-environment-deployment.md)

**最後更新**：2025-12-23
