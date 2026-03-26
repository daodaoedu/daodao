# 島島前端遷移至 Linode 部署規劃 (Docker 版)

## 專案概述

### 目標
將 **daodao-f2e** 前端專案從 Cloudflare Workers 遷移至 Linode VPS，採用 Docker 容器化部署，與後端統一管理。

### 專案技術棧
- **框架**：Next.js 15 + React 19
- **語言**：TypeScript 5.7
- **樣式**：Tailwind CSS + shadcn/ui
- **狀態管理**：SWR (資料獲取) + React Context
- **表單處理**：React Hook Form + Zod
- **國際化**：next-intl
- **PWA**：next-pwa
- **包管理器**：pnpm 10.15.0
- **Node 版本**：20.19.4

### 當前部署架構
```
┌─────────────────────────────────────────┐
│     Cloudflare Workers/Pages            │
│  ┌───────────────────────────────────┐  │
│  │   daodao-f2e (Next.js SSG)        │  │
│  │   - @opennextjs/cloudflare        │  │
│  │   - Static + Edge Functions       │  │
│  └───────────────┬───────────────────┘  │
│                  │                       │
└──────────────────┼───────────────────────┘
                   │ API 呼叫
                   ▼
         ┌─────────────────────┐
         │   Linode VPS        │
         │  ┌───────────────┐  │
         │  │ 後端 (Docker) │  │
         │  └───────┬───────┘  │
         │          │           │
         │  ┌───────▼───────┐  │
         │  │ DB (Docker)   │  │
         │  └───────────────┘  │
         └─────────────────────┘
```

### 目標部署架構 (Docker Compose 統一管理)
```
┌────────────────────────────────────────────────────┐
│                 Linode VPS                         │
│                                                    │
│  ┌──────────────────────────────────────────────┐ │
│  │  Nginx Container (反向代理 + SSL)            │ │
│  │  - Port 80/443                               │ │
│  └────────┬──────────────────┬──────────────────┘ │
│           │                  │                     │
│  ┌────────▼────────┐  ┌──────▼──────────────┐    │
│  │ Frontend        │  │ Backend             │    │
│  │ (Docker)        │  │ (Docker - 已存在)   │    │
│  │ Next.js 15      │  │ Port 8080           │    │
│  │ Port 3000       │  └──────┬──────────────┘    │
│  └─────────────────┘         │                    │
│                        ┌──────▼──────────────┐    │
│                        │ Database            │    │
│                        │ (Docker - 已存在)   │    │
│                        └─────────────────────┘    │
│                                                    │
│  Docker Network: daodao-network                   │
└────────────────────────────────────────────────────┘
```

**重要**：後端與資料庫已使用 Docker 部署，前端將採用相同方式，實現全棧 Docker 化管理。

---

## 現況分析

### Cloudflare Workers 部署方式
**構建工具**：
- `@opennextjs/cloudflare` - 將 Next.js 打包為 Cloudflare Worker 格式
- 構建命令：`pnpm cf:build`
- 部署命令：透過 GitHub Actions 使用 wrangler

**GitHub Actions 工作流**：
1. **CI** (continuous-integration.yml)：
   - TypeScript 型別檢查
   - ESLint 程式碼檢查

2. **CD** (continuous-delivery.yml)：
   - 自動建置與部署
   - 支援三個環境：
     - `prod` → 正式環境
     - `dev` → 開發環境 (staging)
     - PR → 預覽環境
   - Discord 通知整合

**環境變數**：
- `NEXT_PUBLIC_API_URL` - 後端 API 端點
- `NEXT_PUBLIC_ENVIRONMENT` - 環境標識

### Linode VPS 現況
**已部署服務**：
- ✅ 後端 API (Docker 容器)
- ✅ 資料庫 (Docker 容器)
- ✅ Docker Engine 已安裝
- ✅ Docker Compose 已安裝
- ✅ 團隊熟悉 Docker 操作

**優勢**：
- 無需額外學習 Docker
- 可統一使用 Docker Compose 管理
- 容器間內網通訊更快速
- 部署方式一致，降低維護成本

---

## 遷移策略：Docker 容器化部署

### 為什麼選擇 Docker？

#### ✅ 技術優勢
1. **統一管理**：與現有後端、資料庫使用相同技術
2. **零學習成本**：團隊已有 Docker 經驗
3. **環境一致性**：開發、測試、生產完全相同
4. **內網通訊**：容器間通過 Docker 網路通訊，無需 localhost
5. **易於擴展**：需要多實例時，直接複製容器
6. **版本控制**：映像檔可標記版本 (v1.0.0, v1.1.0)
7. **快速回滾**：切換到舊版映像檔即可

#### ✅ 運維優勢
1. **統一監控**：`docker stats` 查看所有容器
2. **統一日誌**：`docker-compose logs` 查看所有服務
3. **統一部署**：一個 `docker-compose.yml` 管理全部
4. **隔離性好**：容器互不影響，更新前端不影響後端

### Docker 架構設計

```
docker-compose.yml
├── nginx (反向代理)
│   └── 監聽 80/443 → 轉發到 frontend/backend
├── frontend (Next.js)
│   └── Port 3000 (僅內網)
├── backend (已存在)
│   └── Port 8080 (僅內網)
└── database (已存在)
    └── Port 5432 (僅內網)

所有服務透過 daodao-network 通訊
```

---

## 遷移步驟規劃

### 階段一：Docker 環境檢查

#### 1.1 VPS 連線與檢查

- [ ] 連線到 Linode VPS
  ```bash
  ssh user@your-linode-ip
  ```

- [ ] 檢查 Docker 版本
  ```bash
  docker --version
  # 應顯示: Docker version 24.x.x 或更新

  docker-compose --version
  # 應顯示: Docker Compose version v2.x.x 或更新
  ```

- [ ] 檢查現有容器
  ```bash
  docker ps
  # 查看後端和資料庫容器是否運行

  docker network ls
  # 查看現有網路
  ```

- [ ] 檢查系統資源
  ```bash
  # 查看 CPU 和記憶體
  docker stats --no-stream

  # 檢查磁碟空間
  df -h
  docker system df
  ```

#### 1.2 確認後端配置

- [ ] 查看後端容器配置
  ```bash
  # 查看後端容器詳情
  docker inspect <backend-container-name>

  # 確認後端暴露的端口
  docker port <backend-container-name>

  # 確認後端使用的網路
  docker network inspect <network-name>
  ```

- [ ] 測試後端 API
  ```bash
  # 從 VPS 內部測試
  curl http://localhost:8080/api/health
  # 或
  curl http://<backend-container-name>:8080/api/health
  ```

#### 1.3 安裝 Nginx (如尚未安裝)

- [ ] 檢查是否已安裝 Nginx
  ```bash
  which nginx
  nginx -v
  ```

- [ ] 如未安裝，則安裝 Nginx
  ```bash
  sudo apt update
  sudo apt install nginx -y
  sudo systemctl enable nginx
  sudo systemctl start nginx
  ```

- [ ] 安裝 Certbot (SSL 憑證)
  ```bash
  sudo apt install certbot python3-certbot-nginx -y
  ```

---

### 階段二：前端 Docker 化配置

#### 2.1 建立 Dockerfile

- [ ] 在前端專案根目錄建立 `Dockerfile`
  ```dockerfile
  # /var/www/daodao/daodao-f2e/Dockerfile

  # ==================== 依賴安裝階段 ====================
  FROM node:20.19.4-alpine AS deps

  # 安裝 libc6-compat (Next.js 需要)
  RUN apk add --no-cache libc6-compat

  WORKDIR /app

  # 安裝 pnpm
  RUN npm install -g pnpm@10.15.0

  # 複製依賴相關檔案
  COPY package.json pnpm-lock.yaml ./

  # 安裝依賴 (包含 dev dependencies，因為需要建置)
  RUN pnpm install --frozen-lockfile

  # ==================== 建置階段 ====================
  FROM node:20.19.4-alpine AS builder

  RUN apk add --no-cache libc6-compat
  WORKDIR /app

  # 安裝 pnpm
  RUN npm install -g pnpm@10.15.0

  # 從 deps 複製 node_modules
  COPY --from=deps /app/node_modules ./node_modules

  # 複製所有原始碼
  COPY . .

  # 設定環境變數 (建置時)
  ENV NEXT_TELEMETRY_DISABLED=1
  ENV NODE_ENV=production

  # 建置 Next.js (standalone 模式)
  RUN pnpm build

  # ==================== 運行階段 ====================
  FROM node:20.19.4-alpine AS runner

  RUN apk add --no-cache libc6-compat
  WORKDIR /app

  ENV NODE_ENV=production
  ENV NEXT_TELEMETRY_DISABLED=1

  # 建立 nextjs 使用者 (安全性考量)
  RUN addgroup --system --gid 1001 nodejs
  RUN adduser --system --uid 1001 nextjs

  # 複製 public 資料夾
  COPY --from=builder /app/public ./public

  # 複製 standalone 建置結果
  COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
  COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

  USER nextjs

  EXPOSE 3000

  ENV PORT=3000
  ENV HOSTNAME="0.0.0.0"

  CMD ["node", "server.js"]
  ```

#### 2.2 建立 .dockerignore

- [ ] 建立 `.dockerignore` 檔案
  ```
  # /var/www/daodao/daodao-f2e/.dockerignore

  # 依賴
  node_modules
  .pnpm-store

  # Next.js
  .next
  out
  build
  dist

  # 測試
  coverage
  .nyc_output

  # Git
  .git
  .github
  .gitignore

  # 環境變數
  .env*.local
  .env.production

  # IDE
  .vscode
  .idea
  *.swp
  *.swo

  # 日誌
  *.log
  npm-debug.log*
  yarn-debug.log*
  yarn-error.log*
  pnpm-debug.log*

  # 其他
  .husky
  .DS_Store
  *.md
  LICENSE
  README.md
  CLAUDE.md
  ```

#### 2.3 修改 next.config.js

- [ ] 啟用 standalone 輸出模式
  ```javascript
  // next.config.js

  const withNextIntl = require('next-intl/plugin')({
    requestConfig: './shared/i18n/request.ts',
  });

  const withPWA = require("next-pwa")({
    dest: "public",
    buildExcludes: [
      /build-manifest\.json$/,
      /react-loadable-manifest\.json$/,
      /dynamic-css-manifest\.json$/,
      /font-manifest\.json$/,
    ],
  });

  const withBundleAnalyzer = require("@next/bundle-analyzer")({
    enabled: process.env.ANALYZE === "true",
  });

  /** @type {import('next').NextConfig} */
  const config = {
    reactStrictMode: false,
    staticPageGenerationTimeout: 600,
    typedRoutes: true,

    // ✅ 重要：啟用 standalone 輸出模式
    output: 'standalone',

    // 移除 Cloudflare 特定設定
    // images: {
    //   unoptimized: true,  // Docker 部署可以使用 Next.js Image Optimization
    // },

    serverExternalPackages: [
      'html-to-image',
      'lottie-web',
      'gsap',
      'react-speech-recognition',
      'regenerator-runtime',
    ],

    experimental: {
      globalNotFound: true,
      scrollRestoration: true,
      optimizePackageImports: [
        'react-day-picker',
        '@radix-ui/react-icons',
        '@radix-ui/react-dialog',
        // ... 其他套件
      ],
    },

    webpack: (config) => {
      const experiments = { ...config.experiments, topLevelAwait: true };
      config.module.rules.push({
        test: /\.svg$/,
        use: ["@svgr/webpack"],
      });
      return Object.assign(config, { experiments });
    },

    env: {
      PROD_URL: "https://v2.daoedu.tw",
      STAGING_URL: "https://staging.daoedu.tw",
    },
  };

  module.exports = withNextIntl(withPWA(withBundleAnalyzer(config)));
  ```

#### 2.4 修改 package.json (可選)

- [ ] 新增 Docker 相關腳本
  ```json
  {
    "scripts": {
      // 保留原有腳本
      "dev": "next dev -p 5438",
      "build": "next build",
      "start": "next start",
      "lint": "eslint . --ext .ts,.tsx --fix --quiet",

      // 新增 Docker 相關腳本
      "docker:build": "docker build -t daodao-frontend:latest .",
      "docker:run": "docker run -p 3000:3000 daodao-frontend:latest",
      "docker:dev": "docker-compose up",
      "docker:prod": "docker-compose -f docker-compose.prod.yml up -d"
    }
  }
  ```

---

### 階段三：Docker Compose 配置

#### 3.1 建立統一的 docker-compose.yml

- [ ] 在專案根目錄建立 `docker-compose.yml`
  ```yaml
  # /var/www/daodao/docker-compose.yml

  version: '3.8'

  services:
    # ==================== Nginx 反向代理 ====================
    nginx:
      image: nginx:alpine
      container_name: daodao-nginx
      restart: unless-stopped
      ports:
        - "80:80"
        - "443:443"
      volumes:
        - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
        - ./nginx/conf.d:/etc/nginx/conf.d:ro
        - /etc/letsencrypt:/etc/letsencrypt:ro
        - nginx_cache:/var/cache/nginx
      networks:
        - daodao-network
      depends_on:
        - frontend
        - backend
      labels:
        - "com.daodao.service=nginx"
        - "com.daodao.description=Reverse proxy and SSL termination"

    # ==================== 前端 Next.js ====================
    frontend:
      build:
        context: ./daodao-f2e
        dockerfile: Dockerfile
      image: daodao-frontend:latest
      container_name: daodao-frontend
      restart: unless-stopped
      environment:
        - NODE_ENV=production
        - NEXT_PUBLIC_API_URL=http://backend:8080
        - NEXT_PUBLIC_ENVIRONMENT=production
        - PORT=3000
      networks:
        - daodao-network
      depends_on:
        - backend
      labels:
        - "com.daodao.service=frontend"
        - "com.daodao.description=Next.js frontend application"
      # 不暴露端口到外部，只通過 Nginx 訪問
      # ports:
      #   - "3000:3000"

    # ==================== 後端 API (已存在，調整配置) ====================
    backend:
      # 使用現有的後端配置
      # 確保使用相同的網路
      image: daodao-backend:latest  # 替換為實際映像檔名稱
      container_name: daodao-backend
      restart: unless-stopped
      environment:
        - NODE_ENV=production
        - DATABASE_URL=postgresql://user:password@database:5432/daodao
        # 其他後端環境變數
      networks:
        - daodao-network
      depends_on:
        - database
      labels:
        - "com.daodao.service=backend"
        - "com.daodao.description=Backend API"
      # 不暴露端口到外部
      # ports:
      #   - "8080:8080"

    # ==================== 資料庫 (已存在，調整配置) ====================
    database:
      # 使用現有的資料庫配置
      image: postgres:15-alpine  # 替換為實際使用的版本
      container_name: daodao-db
      restart: unless-stopped
      environment:
        - POSTGRES_USER=daodao
        - POSTGRES_PASSWORD=${DB_PASSWORD}
        - POSTGRES_DB=daodao
      volumes:
        - postgres_data:/var/lib/postgresql/data
      networks:
        - daodao-network
      labels:
        - "com.daodao.service=database"
        - "com.daodao.description=PostgreSQL database"
      # 不暴露端口到外部
      # ports:
      #   - "5432:5432"

  # ==================== 網路配置 ====================
  networks:
    daodao-network:
      driver: bridge
      name: daodao-network

  # ==================== 持久化儲存 ====================
  volumes:
    postgres_data:
      name: daodao_postgres_data
    nginx_cache:
      name: daodao_nginx_cache
  ```

**重要說明**：
- 上述 `backend` 和 `database` 配置需要根據現有配置調整
- 如果後端已有獨立的 docker-compose.yml，可以合併或使用外部網路連接

#### 3.2 整合現有後端容器 (方案一：合併)

如果要將前端整合到現有的 docker-compose.yml：

- [ ] 在現有的 `docker-compose.yml` 中新增 frontend 服務
  ```yaml
  services:
    # ... 現有的 backend, database 服務 ...

    # 新增前端服務
    frontend:
      build:
        context: ./daodao-f2e
        dockerfile: Dockerfile
      image: daodao-frontend:latest
      container_name: daodao-frontend
      restart: unless-stopped
      environment:
        - NODE_ENV=production
        - NEXT_PUBLIC_API_URL=http://backend:8080
        - NEXT_PUBLIC_ENVIRONMENT=production
      networks:
        - daodao-network  # 使用現有網路
      depends_on:
        - backend

    # 新增或更新 nginx 服務
    nginx:
      image: nginx:alpine
      container_name: daodao-nginx
      restart: unless-stopped
      ports:
        - "80:80"
        - "443:443"
      volumes:
        - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
        - ./nginx/conf.d:/etc/nginx/conf.d:ro
        - /etc/letsencrypt:/etc/letsencrypt:ro
      networks:
        - daodao-network
      depends_on:
        - frontend
        - backend
  ```

#### 3.3 整合現有後端容器 (方案二：外部網路)

如果後端有獨立的 docker-compose.yml，使用外部網路連接：

- [ ] 建立前端專用的 `docker-compose.yml`
  ```yaml
  # /var/www/daodao/daodao-f2e/docker-compose.yml

  version: '3.8'

  services:
    frontend:
      build:
        context: .
        dockerfile: Dockerfile
      image: daodao-frontend:latest
      container_name: daodao-frontend
      restart: unless-stopped
      environment:
        - NODE_ENV=production
        - NEXT_PUBLIC_API_URL=http://backend:8080
        - NEXT_PUBLIC_ENVIRONMENT=production
      networks:
        - daodao-network

  networks:
    daodao-network:
      external: true  # 使用現有網路
      name: daodao_daodao-network  # 後端網路名稱
  ```

---

### 階段四：Nginx 配置 (Docker 版)

#### 4.1 建立 Nginx 目錄結構

- [ ] 建立 Nginx 配置目錄
  ```bash
  sudo mkdir -p /var/www/daodao/nginx/conf.d
  sudo mkdir -p /var/cache/nginx/daodao
  sudo chown -R $USER:$USER /var/www/daodao/nginx
  ```

#### 4.2 建立 Nginx 主配置

- [ ] 建立 `nginx/nginx.conf`
  ```nginx
  # /var/www/daodao/nginx/nginx.conf

  user nginx;
  worker_processes auto;
  error_log /var/log/nginx/error.log warn;
  pid /var/run/nginx.pid;

  events {
      worker_connections 1024;
      use epoll;
  }

  http {
      include /etc/nginx/mime.types;
      default_type application/octet-stream;

      log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                      '$status $body_bytes_sent "$http_referer" '
                      '"$http_user_agent" "$http_x_forwarded_for"';

      access_log /var/log/nginx/access.log main;

      sendfile on;
      tcp_nopush on;
      tcp_nodelay on;
      keepalive_timeout 65;
      types_hash_max_size 2048;
      client_max_body_size 10M;

      # Gzip 壓縮
      gzip on;
      gzip_vary on;
      gzip_proxied any;
      gzip_comp_level 6;
      gzip_types text/plain text/css text/xml text/javascript
                 application/json application/javascript application/xml+rss
                 application/rss+xml font/truetype font/opentype
                 application/vnd.ms-fontobject image/svg+xml;

      # 載入站點配置
      include /etc/nginx/conf.d/*.conf;
  }
  ```

#### 4.3 建立站點配置

- [ ] 建立 `nginx/conf.d/daodao.conf`
  ```nginx
  # /var/www/daodao/nginx/conf.d/daodao.conf

  # 快取配置
  proxy_cache_path /var/cache/nginx/daodao
                   levels=1:2
                   keys_zone=daodao_cache:10m
                   max_size=1g
                   inactive=60m
                   use_temp_path=off;

  # Rate limiting
  limit_req_zone $binary_remote_addr zone=daodao_limit:10m rate=10r/s;

  # Upstream 配置 (使用 Docker 容器名稱)
  upstream frontend {
      server frontend:3000;  # Docker 容器名稱
      keepalive 32;
  }

  upstream backend {
      server backend:8080;   # Docker 容器名稱
      keepalive 32;
  }

  # HTTP -> HTTPS 重定向
  server {
      listen 80;
      listen [::]:80;
      server_name v2.daoedu.tw www.v2.daoedu.tw;

      # Let's Encrypt ACME challenge
      location /.well-known/acme-challenge/ {
          root /var/www/certbot;
      }

      location / {
          return 301 https://$server_name$request_uri;
      }
  }

  # HTTPS 主站配置
  server {
      listen 443 ssl http2;
      listen [::]:443 ssl http2;
      server_name v2.daoedu.tw www.v2.daoedu.tw;

      # SSL 憑證
      ssl_certificate /etc/letsencrypt/live/v2.daoedu.tw/fullchain.pem;
      ssl_certificate_key /etc/letsencrypt/live/v2.daoedu.tw/privkey.pem;

      # SSL 安全設定
      ssl_protocols TLSv1.2 TLSv1.3;
      ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
      ssl_prefer_server_ciphers off;
      ssl_session_cache shared:SSL:10m;
      ssl_session_timeout 10m;
      ssl_stapling on;
      ssl_stapling_verify on;

      # 安全標頭
      add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
      add_header X-Frame-Options "SAMEORIGIN" always;
      add_header X-Content-Type-Options "nosniff" always;
      add_header X-XSS-Protection "1; mode=block" always;
      add_header Referrer-Policy "strict-origin-when-cross-origin" always;

      # Next.js 靜態資源 (/_next/static) - 長期快取
      location /_next/static {
          proxy_pass http://frontend;
          proxy_http_version 1.1;
          proxy_set_header Upgrade $http_upgrade;
          proxy_set_header Connection 'upgrade';
          proxy_set_header Host $host;
          proxy_cache_bypass $http_upgrade;

          # 長期快取
          expires 365d;
          add_header Cache-Control "public, immutable";
          access_log off;
      }

      # 公共靜態資源
      location ~* \.(jpg|jpeg|png|gif|ico|svg|webp|woff|woff2|ttf|eot|css|js)$ {
          proxy_pass http://frontend;
          proxy_http_version 1.1;
          proxy_set_header Host $host;

          expires 7d;
          add_header Cache-Control "public";
          access_log off;
      }

      # API 代理到後端
      location /api {
          # Rate limiting
          limit_req zone=daodao_limit burst=20 nodelay;

          proxy_pass http://backend;
          proxy_http_version 1.1;
          proxy_set_header Upgrade $http_upgrade;
          proxy_set_header Connection 'upgrade';
          proxy_set_header Host $host;
          proxy_set_header X-Real-IP $remote_addr;
          proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
          proxy_set_header X-Forwarded-Proto $scheme;
          proxy_cache_bypass $http_upgrade;

          # 超時設定
          proxy_connect_timeout 60s;
          proxy_send_timeout 60s;
          proxy_read_timeout 60s;
      }

      # Next.js 應用主體
      location / {
          # Rate limiting
          limit_req zone=daodao_limit burst=20 nodelay;

          proxy_pass http://frontend;
          proxy_http_version 1.1;
          proxy_set_header Upgrade $http_upgrade;
          proxy_set_header Connection 'upgrade';
          proxy_set_header Host $host;
          proxy_set_header X-Real-IP $remote_addr;
          proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
          proxy_set_header X-Forwarded-Proto $scheme;
          proxy_cache_bypass $http_upgrade;

          # 超時設定
          proxy_connect_timeout 60s;
          proxy_send_timeout 60s;
          proxy_read_timeout 60s;

          # 緩衝設定
          proxy_buffering on;
          proxy_buffer_size 4k;
          proxy_buffers 8 4k;
          proxy_busy_buffers_size 8k;
      }

      # 健康檢查端點
      location /health {
          access_log off;
          return 200 "healthy\n";
          add_header Content-Type text/plain;
      }
  }
  ```

#### 4.4 取得 SSL 憑證

- [ ] 暫時停止 Nginx 容器 (如果正在運行)
  ```bash
  docker-compose stop nginx
  ```

- [ ] 使用 Certbot 取得憑證
  ```bash
  sudo certbot certonly --standalone -d v2.daoedu.tw -d www.v2.daoedu.tw
  ```

- [ ] 設定自動更新
  ```bash
  # 測試自動更新
  sudo certbot renew --dry-run

  # 設定 cron job
  sudo crontab -e

  # 加入以下行 (每週日凌晨 2 點檢查並更新)
  0 2 * * 0 certbot renew --quiet --post-hook "docker-compose -f /var/www/daodao/docker-compose.yml restart nginx"
  ```

---

### 階段五：本地測試與建置

#### 5.1 本地建置測試

- [ ] 在本地測試 Docker 建置
  ```bash
  cd /path/to/daodao-f2e

  # 建置映像檔
  docker build -t daodao-frontend:test .

  # 查看映像檔大小
  docker images | grep daodao-frontend

  # 測試運行
  docker run --rm -p 3000:3000 \
    -e NEXT_PUBLIC_API_URL=http://localhost:8080 \
    daodao-frontend:test

  # 瀏覽器開啟 http://localhost:3000 測試
  ```

- [ ] 測試 standalone 模式輸出
  ```bash
  # 確認 .next/standalone 目錄存在
  ls -la .next/standalone

  # 確認必要檔案都已複製
  ls -la .next/standalone/.next/static
  ```

#### 5.2 VPS 上準備目錄

- [ ] SSH 到 VPS 並建立目錄
  ```bash
  ssh user@your-linode-ip

  # 建立專案根目錄
  sudo mkdir -p /var/www/daodao
  sudo chown -R $USER:$USER /var/www/daodao
  cd /var/www/daodao

  # Clone 前端專案
  git clone https://github.com/your-org/daodao-f2e.git
  cd daodao-f2e
  git checkout prod
  ```

#### 5.3 VPS 上首次建置

- [ ] 建置前端映像檔
  ```bash
  cd /var/www/daodao/daodao-f2e

  # 建置
  docker build -t daodao-frontend:latest .

  # 查看建置結果
  docker images | grep daodao-frontend
  ```

- [ ] 測試單獨運行
  ```bash
  # 測試運行容器
  docker run --rm -p 3000:3000 \
    --name daodao-frontend-test \
    -e NEXT_PUBLIC_API_URL=http://backend:8080 \
    daodao-frontend:latest

  # 在另一個 terminal 測試
  curl http://localhost:3000

  # 測試完畢後停止
  docker stop daodao-frontend-test
  ```

---

### 階段六：Docker Compose 啟動

#### 6.1 配置環境變數

- [ ] 建立 `.env` 檔案 (如需要)
  ```bash
  cd /var/www/daodao

  cat > .env << 'EOF'
  # 資料庫
  DB_PASSWORD=your_secure_password

  # 前端
  NEXT_PUBLIC_API_URL=http://backend:8080
  NEXT_PUBLIC_ENVIRONMENT=production

  # 後端
  DATABASE_URL=postgresql://daodao:${DB_PASSWORD}@database:5432/daodao
  EOF

  # 設定權限
  chmod 600 .env
  ```

#### 6.2 啟動所有服務

- [ ] 使用 Docker Compose 啟動
  ```bash
  cd /var/www/daodao

  # 啟動所有服務 (後台模式)
  docker-compose up -d

  # 查看啟動日誌
  docker-compose logs -f

  # 查看服務狀態
  docker-compose ps
  ```

- [ ] 驗證容器運行
  ```bash
  # 查看所有容器
  docker ps

  # 應該看到：
  # - daodao-nginx
  # - daodao-frontend
  # - daodao-backend
  # - daodao-db

  # 查看網路
  docker network inspect daodao-network
  ```

#### 6.3 測試內網通訊

- [ ] 測試容器間連線
  ```bash
  # 進入前端容器
  docker exec -it daodao-frontend sh

  # 測試連到後端 (在容器內執行)
  wget -O- http://backend:8080/api/health
  # 或
  curl http://backend:8080/api/health

  # 離開容器
  exit

  # 從 Nginx 容器測試
  docker exec -it daodao-nginx sh
  wget -O- http://frontend:3000
  wget -O- http://backend:8080/api/health
  exit
  ```

#### 6.4 查看日誌

- [ ] 監控各服務日誌
  ```bash
  # 查看所有服務日誌
  docker-compose logs -f

  # 只查看前端日誌
  docker-compose logs -f frontend

  # 只查看 Nginx 日誌
  docker-compose logs -f nginx

  # 查看最近 100 行
  docker-compose logs --tail=100 frontend
  ```

---

### 階段七：Nginx 配置驗證

#### 7.1 測試 Nginx 配置

- [ ] 在容器內測試配置
  ```bash
  docker exec daodao-nginx nginx -t
  ```

- [ ] 重新載入 Nginx
  ```bash
  docker-compose restart nginx
  ```

#### 7.2 使用 hosts 檔案測試

- [ ] 修改本地 hosts 檔案
  ```bash
  # Linux/Mac: /etc/hosts
  # Windows: C:\Windows\System32\drivers\etc\hosts

  your-linode-ip  v2.daoedu.tw
  your-linode-ip  www.v2.daoedu.tw
  ```

- [ ] 瀏覽器測試
  ```
  開啟: https://v2.daoedu.tw

  測試項目：
  ✓ SSL 憑證是否有效
  ✓ 首頁是否正常載入
  ✓ 靜態資源是否正常
  ✓ API 呼叫是否正常
  ✓ 頁面切換是否正常
  ```

- [ ] 使用 curl 測試
  ```bash
  # 測試 HTTP -> HTTPS 重定向
  curl -I http://v2.daoedu.tw

  # 測試 HTTPS
  curl -I https://v2.daoedu.tw

  # 測試 API 代理
  curl https://v2.daoedu.tw/api/health

  # 測試靜態資源快取
  curl -I https://v2.daoedu.tw/_next/static/xxx
  ```

---

### 階段八：CI/CD 流程調整

#### 8.1 建立部署腳本

- [ ] 建立 Docker 部署腳本
  ```bash
  cat > /var/www/daodao/deploy-frontend.sh << 'EOF'
  #!/bin/bash
  set -e

  echo "🚀 Starting frontend deployment..."

  # 專案目錄
  COMPOSE_DIR="/var/www/daodao"
  FRONTEND_DIR="$COMPOSE_DIR/daodao-f2e"

  # 顏色輸出
  GREEN='\033[0;32m'
  YELLOW='\033[1;33m'
  NC='\033[0m' # No Color

  # 1. 拉取最新程式碼
  echo -e "${YELLOW}📥 Pulling latest code...${NC}"
  cd $FRONTEND_DIR
  git fetch origin
  git reset --hard origin/prod

  # 2. 建置新映像檔
  echo -e "${YELLOW}🔨 Building Docker image...${NC}"
  docker build -t daodao-frontend:latest .

  # 3. 標記舊版本 (用於回滾)
  TIMESTAMP=$(date +%Y%m%d_%H%M%S)
  if docker images | grep -q "daodao-frontend.*latest"; then
      echo -e "${YELLOW}📦 Tagging old version as backup...${NC}"
      docker tag daodao-frontend:latest daodao-frontend:backup_$TIMESTAMP
  fi

  # 4. 重新啟動前端容器
  echo -e "${YELLOW}🔄 Restarting frontend container...${NC}"
  cd $COMPOSE_DIR
  docker-compose up -d --no-deps --build frontend

  # 5. 等待容器啟動
  echo -e "${YELLOW}⏳ Waiting for container to be healthy...${NC}"
  sleep 5

  # 6. 檢查容器狀態
  if docker ps | grep -q "daodao-frontend"; then
      echo -e "${GREEN}✅ Frontend container is running${NC}"
  else
      echo -e "${RED}❌ Frontend container failed to start${NC}"
      exit 1
  fi

  # 7. 清理舊映像檔 (保留最近 3 個)
  echo -e "${YELLOW}🧹 Cleaning up old images...${NC}"
  docker images | grep "daodao-frontend" | grep -v "latest" | grep -v "backup" | awk '{print $3}' | tail -n +4 | xargs -r docker rmi

  # 8. 顯示狀態
  echo -e "${GREEN}✅ Deployment completed!${NC}"
  echo ""
  docker-compose ps frontend
  echo ""
  echo "Recent logs:"
  docker-compose logs --tail=20 frontend

  EOF

  chmod +x /var/www/daodao/deploy-frontend.sh
  ```

- [ ] 建立回滾腳本
  ```bash
  cat > /var/www/daodao/rollback-frontend.sh << 'EOF'
  #!/bin/bash
  set -e

  echo "🔄 Rolling back frontend..."

  COMPOSE_DIR="/var/www/daodao"
  cd $COMPOSE_DIR

  # 列出可用的備份版本
  echo "Available backup versions:"
  docker images | grep "daodao-frontend" | grep "backup"

  # 提示輸入版本
  read -p "Enter backup version tag (e.g., backup_20231223_120000): " BACKUP_TAG

  if [ -z "$BACKUP_TAG" ]; then
      echo "❌ No version specified"
      exit 1
  fi

  # 標記為 latest
  docker tag daodao-frontend:$BACKUP_TAG daodao-frontend:latest

  # 重啟容器
  docker-compose up -d --no-deps frontend

  echo "✅ Rollback completed to $BACKUP_TAG"
  docker-compose ps frontend

  EOF

  chmod +x /var/www/daodao/rollback-frontend.sh
  ```

#### 8.2 設定 SSH 金鑰

- [ ] 在本地或 GitHub Actions 環境生成 SSH 金鑰
  ```bash
  ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/daodao-deploy
  ```

- [ ] 將公鑰加入 VPS
  ```bash
  # 在 VPS 上
  mkdir -p ~/.ssh
  chmod 700 ~/.ssh

  # 將公鑰內容加入 authorized_keys
  nano ~/.ssh/authorized_keys
  # 貼上公鑰內容

  chmod 600 ~/.ssh/authorized_keys
  ```

- [ ] 測試 SSH 連線
  ```bash
  ssh -i ~/.ssh/daodao-deploy user@your-linode-ip
  ```

#### 8.3 建立 GitHub Actions Workflow

- [ ] 建立 `.github/workflows/deploy-linode-docker.yml`
  ```yaml
  name: Deploy to Linode (Docker)

  on:
    push:
      branches:
        - 'prod'
        - 'dev'
    workflow_dispatch:

  env:
    HUSKY: 0

  jobs:
    continuous_integration:
      uses: ./.github/workflows/continuous-integration.yml
      secrets: inherit

    deploy_to_linode:
      name: Deploy to Linode VPS
      runs-on: ubuntu-latest
      environment: production
      needs: continuous_integration
      if: needs.continuous_integration.result == 'success'

      steps:
        - name: Checkout code
          uses: actions/checkout@v4

        - name: Deploy Frontend via SSH
          uses: appleboy/ssh-action@v1.2.0
          with:
            host: ${{ secrets.LINODE_HOST }}
            username: ${{ secrets.LINODE_USER }}
            key: ${{ secrets.LINODE_SSH_KEY }}
            port: 22
            script: |
              cd /var/www/daodao
              ./deploy-frontend.sh

        - name: Health Check
          uses: appleboy/ssh-action@v1.2.0
          with:
            host: ${{ secrets.LINODE_HOST }}
            username: ${{ secrets.LINODE_USER }}
            key: ${{ secrets.LINODE_SSH_KEY }}
            script: |
              # 等待服務啟動
              sleep 10

              # 檢查容器狀態
              docker ps | grep daodao-frontend

              # 檢查服務健康
              curl -f http://localhost:3000 || exit 1

        - name: Send success notification
          if: success()
          uses: ./.github/actions/notification
          with:
            TYPE: success
            TITLE: '✅ Linode 部署成功 (${{ github.ref_name }})'
            DESCRIPTION: |
              Branch: ${{ github.ref_name }}
              Commit: ${{ github.sha }}
              Environment: Docker
            DISCORD_WEBHOOK_URL: ${{ secrets.DISCORD_WEBHOOK_URL }}

        - name: Send failure notification
          if: failure()
          uses: ./.github/actions/notification
          with:
            TYPE: failure
            TITLE: '❌ Linode 部署失敗'
            DESCRIPTION: |
              Branch: ${{ github.ref_name }}
              Commit: ${{ github.sha }}
              請檢查部署日誌
            DISCORD_WEBHOOK_URL: ${{ secrets.DISCORD_WEBHOOK_URL }}
  ```

#### 8.4 設定 GitHub Secrets

在 GitHub Repository Settings → Secrets and variables → Actions 中新增：

- [ ] `LINODE_HOST` - Linode VPS IP 位址
- [ ] `LINODE_USER` - SSH 使用者名稱
- [ ] `LINODE_SSH_KEY` - SSH 私鑰內容 (完整的私鑰檔案內容)

---

### 階段九：DNS 切換與驗證

#### 9.1 準備階段

- [ ] 記錄當前 DNS 設定
  ```bash
  # 在本地執行
  dig v2.daoedu.tw
  dig www.v2.daoedu.tw

  # 記錄當前 IP 位址
  ```

- [ ] 降低 DNS TTL (提前 24-48 小時)
  - 登入 DNS 管理面板
  - 將 TTL 設定為 300 秒 (5 分鐘)
  - 等待舊 TTL 過期

#### 9.2 功能測試清單

使用 hosts 檔案測試，確認以下功能：

- [ ] 首頁載入
- [ ] 使用者登入/登出
- [ ] API 呼叫正常
- [ ] 圖片載入
- [ ] 靜態資源載入
- [ ] PWA 功能
- [ ] 國際化切換
- [ ] 表單提交
- [ ] 頁面路由切換
- [ ] SEO meta tags
- [ ] SSL 憑證有效

#### 9.3 效能測試

- [ ] 使用 curl 測試回應時間
  ```bash
  # 建立測試腳本
  cat > curl-format.txt << 'EOF'
  time_namelookup:  %{time_namelookup}s\n
  time_connect:  %{time_connect}s\n
  time_appconnect:  %{time_appconnect}s\n
  time_pretransfer:  %{time_pretransfer}s\n
  time_redirect:  %{time_redirect}s\n
  time_starttransfer:  %{time_starttransfer}s\n
  ----------\n
  time_total:  %{time_total}s\n
  EOF

  # 測試
  curl -w "@curl-format.txt" -o /dev/null -s https://v2.daoedu.tw
  ```

- [ ] 使用 Lighthouse 測試
  ```bash
  # 安裝 Lighthouse CLI
  npm install -g lighthouse

  # 執行測試
  lighthouse https://v2.daoedu.tw --output html --output-path ./lighthouse-report.html
  ```

#### 9.4 正式切換 DNS

- [ ] 更新 DNS A 記錄
  ```
  類型: A
  名稱: v2.daoedu.tw
  值: your-linode-ip
  TTL: 300

  類型: A
  名稱: www.v2.daoedu.tw
  值: your-linode-ip
  TTL: 300
  ```

- [ ] 監控 DNS 傳播
  ```bash
  # 每 30 秒檢查一次
  watch -n 30 'dig v2.daoedu.tw +short'

  # 或使用線上工具
  # https://www.whatsmydns.net/
  ```

#### 9.5 切換後驗證

- [ ] 清除本地 DNS 快取
  ```bash
  # Mac
  sudo dscacheutil -flushcache
  sudo killall -HUP mDNSResponder

  # Linux (Ubuntu/Debian)
  sudo systemd-resolve --flush-caches

  # Windows
  ipconfig /flushdns
  ```

- [ ] 驗證 DNS 解析
  ```bash
  nslookup v2.daoedu.tw
  dig v2.daoedu.tw
  ```

- [ ] 從不同地點測試
  - 使用手機 (4G/5G 網路)
  - 使用不同電腦
  - 請團隊成員協助測試

#### 9.6 監控階段

- [ ] 持續監控 24-48 小時
  ```bash
  # 監控 Docker 容器狀態
  watch -n 5 'docker ps'

  # 監控資源使用
  watch -n 5 'docker stats --no-stream'

  # 監控 Nginx 日誌
  docker-compose logs -f nginx

  # 監控前端日誌
  docker-compose logs -f frontend
  ```

---

### 階段十：監控與優化

#### 10.1 Docker 監控

- [ ] 設定 Docker 資源監控
  ```bash
  # 即時監控
  docker stats

  # 查看特定容器
  docker stats daodao-frontend

  # 匯出監控資料
  docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}" > docker-stats.log
  ```

- [ ] 設定容器資源限制
  ```yaml
  # 在 docker-compose.yml 中加入
  services:
    frontend:
      # ... 其他配置 ...
      deploy:
        resources:
          limits:
            cpus: '1.0'
            memory: 1G
          reservations:
            cpus: '0.5'
            memory: 512M
  ```

#### 10.2 日誌管理

- [ ] 設定日誌輪替
  ```yaml
  # 在 docker-compose.yml 中加入
  services:
    frontend:
      # ... 其他配置 ...
      logging:
        driver: "json-file"
        options:
          max-size: "10m"
          max-file: "3"
  ```

- [ ] 查看日誌
  ```bash
  # 查看最近日誌
  docker-compose logs --tail=100 frontend

  # 即時跟蹤日誌
  docker-compose logs -f frontend

  # 查看特定時間範圍
  docker-compose logs --since 30m frontend

  # 匯出日誌
  docker-compose logs --no-color frontend > frontend.log
  ```

#### 10.3 效能優化

- [ ] 啟用 Docker BuildKit (更快建置)
  ```bash
  # 在 .bashrc 或 .zshrc 中加入
  export DOCKER_BUILDKIT=1
  export COMPOSE_DOCKER_CLI_BUILD=1
  ```

- [ ] 使用多階段建置快取
  ```bash
  # 建置時使用快取
  docker build --cache-from daodao-frontend:latest -t daodao-frontend:latest .
  ```

- [ ] Docker Compose 效能調整
  ```yaml
  # docker-compose.yml
  services:
    frontend:
      # ... 其他配置 ...
      # 使用 tmpfs 加速臨時檔案
      tmpfs:
        - /tmp
        - /app/.next/cache
  ```

#### 10.4 備份策略

- [ ] 建立映像檔備份腳本
  ```bash
  cat > /var/www/daodao/backup-images.sh << 'EOF'
  #!/bin/bash

  BACKUP_DIR="/home/deploy/docker-backups"
  DATE=$(date +%Y%m%d_%H%M%S)

  mkdir -p $BACKUP_DIR

  # 儲存前端映像檔
  echo "Backing up frontend image..."
  docker save daodao-frontend:latest | gzip > $BACKUP_DIR/daodao-frontend_$DATE.tar.gz

  # 只保留最近 7 天的備份
  find $BACKUP_DIR -name "daodao-frontend_*.tar.gz" -mtime +7 -delete

  echo "Backup completed: daodao-frontend_$DATE.tar.gz"
  ls -lh $BACKUP_DIR/

  EOF

  chmod +x /var/www/daodao/backup-images.sh
  ```

- [ ] 設定定期備份
  ```bash
  crontab -e

  # 每天凌晨 3 點備份
  0 3 * * * /var/www/daodao/backup-images.sh >> /var/log/docker-backup.log 2>&1
  ```

#### 10.5 健康檢查

- [ ] 在 docker-compose.yml 中加入健康檢查
  ```yaml
  services:
    frontend:
      # ... 其他配置 ...
      healthcheck:
        test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000"]
        interval: 30s
        timeout: 10s
        retries: 3
        start_period: 40s
  ```

- [ ] 查看健康狀態
  ```bash
  docker ps
  # 查看 STATUS 欄位中的健康狀態

  docker inspect --format='{{json .State.Health}}' daodao-frontend | jq
  ```

#### 10.6 外部監控服務

- [ ] 設定 Uptime 監控
  - [UptimeRobot](https://uptimerobot.com/) (免費)
  - [Pingdom](https://www.pingdom.com/)
  - [StatusCake](https://www.statuscake.com/)

- [ ] 監控項目
  ```
  HTTP(S) 監控: https://v2.daoedu.tw
  檢查頻率: 5 分鐘
  告警方式: Email / Discord / Slack

  關鍵頁面監控:
  - https://v2.daoedu.tw/ (首頁)
  - https://v2.daoedu.tw/api/health (API 健康檢查)
  ```

---

## 風險評估與應對

### 風險一：服務中斷

**風險描述**：
- DNS 切換期間部分使用者無法存取
- 容器啟動失敗
- Nginx 配置錯誤

**應對措施**：
1. **選擇低流量時段**：凌晨 2-4 AM 進行切換
2. **提前降低 TTL**：切換前 24-48 小時將 DNS TTL 降至 300 秒
3. **完整測試**：使用 hosts 檔案模擬切換
4. **快速回滾**：
   ```bash
   # 使用備份映像檔回滾
   docker tag daodao-frontend:backup_YYYYMMDD_HHMMSS daodao-frontend:latest
   docker-compose up -d --no-deps frontend
   ```
5. **保留 Cloudflare 部署**：切換後至少保留 7 天

### 風險二：容器資源不足

**風險描述**：
- Docker 容器記憶體不足
- CPU 使用率過高
- 磁碟空間不足

**應對措施**：
1. **資源監控**：
   ```bash
   docker stats
   df -h
   docker system df
   ```

2. **設定資源限制**：在 docker-compose.yml 中限制資源使用

3. **清理策略**：
   ```bash
   # 清理未使用的映像檔
   docker image prune -a

   # 清理未使用的容器
   docker container prune

   # 清理未使用的 volume
   docker volume prune

   # 一次清理所有
   docker system prune -a
   ```

4. **升級 VPS**：如需要，升級 Linode 方案

### 風險三：建置失敗

**風險描述**：
- Dockerfile 配置錯誤
- 依賴安裝失敗
- 環境變數設定錯誤

**應對措施**：
1. **本地測試**：在本地完整測試建置流程
2. **多階段建置**：使用 multi-stage build 減少問題
3. **建置快取**：使用 BuildKit 快取加速建置
4. **日誌檢查**：
   ```bash
   docker-compose logs frontend
   docker inspect daodao-frontend
   ```

### 風險四：網路通訊問題

**風險描述**：
- 容器間無法通訊
- Nginx 無法連接到 frontend/backend
- DNS 解析失敗

**應對措施**：
1. **網路檢查**：
   ```bash
   docker network inspect daodao-network
   docker exec daodao-frontend ping backend
   docker exec daodao-nginx ping frontend
   ```

2. **使用容器名稱**：確保使用 Docker 容器名稱而非 localhost

3. **檢查 hosts 解析**：
   ```bash
   docker exec daodao-frontend cat /etc/hosts
   ```

### 風險五：SSL 憑證問題

**風險描述**：
- 憑證過期
- 憑證路徑錯誤
- 自動更新失敗

**應對措施**：
1. **測試憑證更新**：
   ```bash
   sudo certbot renew --dry-run
   ```

2. **監控憑證到期**：
   ```bash
   sudo certbot certificates
   ```

3. **自動更新機制**：
   ```bash
   # Cron job
   0 2 * * 0 certbot renew --quiet --post-hook "docker-compose -f /var/www/daodao/docker-compose.yml restart nginx"
   ```

---

## 檢查清單

### 遷移前檢查 ✓

- [ ] VPS 已安裝 Docker 和 Docker Compose
- [ ] 後端容器正常運行
- [ ] VPS 資源充足 (至少 4GB RAM, 2 CPU)
- [ ] 已記錄當前 DNS 設定
- [ ] 已降低 DNS TTL 至 300 秒
- [ ] 本地測試 Dockerfile 建置成功
- [ ] 已準備回滾方案
- [ ] 團隊成員已知悉遷移計畫

### 遷移中檢查 ✓

- [ ] Dockerfile 建置成功
- [ ] Docker Compose 配置正確
- [ ] Nginx 配置檔案無誤
- [ ] SSL 憑證已取得
- [ ] 容器成功啟動
- [ ] 容器間網路通訊正常
- [ ] 使用 hosts 測試所有功能正常
- [ ] GitHub Actions 工作流已更新
- [ ] GitHub Secrets 已設定
- [ ] 部署腳本測試成功

### 遷移後驗證 ✓

- [ ] DNS 已切換並生效
- [ ] HTTPS 正常運作
- [ ] SSL 憑證有效
- [ ] 首頁正常載入
- [ ] 使用者登入/登出正常
- [ ] API 呼叫正常
- [ ] 靜態資源載入正常
- [ ] PWA 功能正常
- [ ] 國際化切換正常
- [ ] 表單提交功能正常
- [ ] 所有容器狀態健康
- [ ] Docker 日誌無異常錯誤
- [ ] 系統資源使用率正常
- [ ] 監控服務已設定
- [ ] 備份排程已啟用

---

## 常用命令速查

### Docker 基本命令
```bash
# 查看所有容器
docker ps
docker ps -a

# 查看映像檔
docker images

# 查看日誌
docker logs daodao-frontend
docker logs -f daodao-frontend --tail=100

# 進入容器
docker exec -it daodao-frontend sh

# 查看容器資源
docker stats
docker stats daodao-frontend

# 查看網路
docker network ls
docker network inspect daodao-network
```

### Docker Compose 命令
```bash
# 啟動服務
docker-compose up -d

# 停止服務
docker-compose down

# 重啟服務
docker-compose restart frontend

# 查看狀態
docker-compose ps

# 查看日誌
docker-compose logs -f
docker-compose logs -f frontend

# 重新建置並啟動
docker-compose up -d --build frontend

# 只重啟特定服務 (不影響其他)
docker-compose up -d --no-deps frontend
```

### 部署與維護
```bash
# 部署前端
cd /var/www/daodao
./deploy-frontend.sh

# 回滾前端
./rollback-frontend.sh

# 備份映像檔
./backup-images.sh

# 清理系統
docker system prune -a
docker volume prune
```

### 監控命令
```bash
# 即時資源監控
docker stats

# 檢查健康狀態
docker ps
docker inspect daodao-frontend

# 查看日誌
docker-compose logs --tail=100 -f

# 檢查磁碟空間
df -h
docker system df
```

---

## 後續優化方向

### 1. Cloudflare 作為 CDN 層 (強烈推薦)

保留 Cloudflare 的優勢，Linode 作為 Origin Server：

```
使用者請求
    ↓
Cloudflare CDN (免費)
  - 全球加速
  - DDoS 防護
  - 智能快取
  - WAF 防護
    ↓
Linode VPS (Origin)
  └── Docker Compose
      ├── Nginx
      ├── Frontend (Next.js)
      ├── Backend
      └── Database
```

**設定步驟**：
1. 在 Cloudflare DNS 中開啟 Proxy (橘色雲朵)
2. 設定 Page Rules 和 Cache Rules
3. 啟用 Rocket Loader、Auto Minify
4. 設定 WAF 規則

### 2. 多環境部署

使用不同的 docker-compose 檔案管理多環境：

```bash
docker-compose.yml              # 開發環境
docker-compose.staging.yml      # 測試環境
docker-compose.prod.yml         # 正式環境
```

### 3. 自動化測試

在 CI/CD 中加入自動化測試：

```yaml
jobs:
  test:
    - name: Run E2E tests
      run: |
        docker-compose -f docker-compose.test.yml up -d
        npm run test:e2e
        docker-compose -f docker-compose.test.yml down
```

### 4. 水平擴展

使用 Docker Swarm 或 Kubernetes 進行水平擴展：

```bash
# Docker Swarm 範例
docker swarm init
docker service create --replicas 3 --name frontend daodao-frontend:latest
```

### 5. 監控升級

整合進階監控工具：

- **Prometheus + Grafana**：指標收集與視覺化
- **Loki**：日誌聚合
- **cAdvisor**：容器監控
- **Sentry**：錯誤追蹤

### 6. 備份與災難恢復

- **資料庫自動備份**：使用 Docker volume 備份
- **映像檔倉庫**：推送到 Docker Hub 或 private registry
- **異地備份**：定期備份到 S3 或其他雲端儲存

---

## 參考資源

### 官方文件
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Next.js Standalone](https://nextjs.org/docs/advanced-features/output-file-tracing)
- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose](https://docs.docker.com/compose/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt](https://letsencrypt.org/)

### Docker 最佳實踐
- [Dockerfile Best Practices](https://docs.docker.com/develop/develop-images/dockerfile_best-practices/)
- [Docker Security](https://docs.docker.com/engine/security/)
- [Multi-stage Builds](https://docs.docker.com/develop/develop-images/multistage-build/)

### 工具
- [GitHub Actions](https://docs.github.com/en/actions)
- [SSH Action](https://github.com/appleboy/ssh-action)
- [Certbot](https://certbot.eff.org/)
- [Docker Hub](https://hub.docker.com/)

---

## 附錄

### A. 疑難排解

**問題：容器無法啟動**
```bash
# 查看詳細日誌
docker-compose logs frontend

# 檢查容器狀態
docker inspect daodao-frontend

# 手動測試運行
docker run --rm -it daodao-frontend:latest sh
```

**問題：Nginx 502 Bad Gateway**
```bash
# 檢查 frontend 容器是否運行
docker ps | grep frontend

# 測試容器間連線
docker exec daodao-nginx ping frontend

# 檢查 Nginx 配置
docker exec daodao-nginx nginx -t
```

**問題：建置速度慢**
```bash
# 啟用 BuildKit
export DOCKER_BUILDKIT=1

# 使用快取建置
docker build --cache-from daodao-frontend:latest -t daodao-frontend:latest .
```

**問題：磁碟空間不足**
```bash
# 查看空間使用
docker system df

# 清理未使用資源
docker system prune -a

# 清理建置快取
docker builder prune
```

### B. Docker Compose 完整範例

參考 階段三 的 docker-compose.yml 配置。

### C. 環境變數管理

```bash
# 使用 .env 檔案
cat > .env << 'EOF'
# 資料庫
POSTGRES_USER=daodao
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=daodao

# 前端
NEXT_PUBLIC_API_URL=http://backend:8080
NEXT_PUBLIC_ENVIRONMENT=production

# 後端
DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@database:5432/${POSTGRES_DB}
JWT_SECRET=your_jwt_secret
EOF

chmod 600 .env
```

---

## 結論

本遷移規劃採用 **Docker 容器化部署方案**，主要理由：

### ✅ 核心優勢
1. **統一管理**：與現有後端使用相同技術，可用 docker-compose 統一管理
2. **零學習成本**：團隊已有 Docker 經驗
3. **環境一致性**：開發、測試、生產完全相同
4. **易於維護**：統一的監控、日誌、部署流程
5. **內網通訊**：容器間透過 Docker 網路通訊，更快更安全
6. **易於擴展**：未來可輕鬆水平擴展

### 📋 建議執行順序
1. ✅ 完成 VPS Docker 環境檢查
2. ✅ 建立 Dockerfile 並本地測試
3. ✅ 配置 docker-compose.yml
4. ✅ 設定 Nginx 反向代理
5. ✅ 使用 hosts 檔案測試
6. ✅ 更新 GitHub Actions
7. ✅ 選擇低流量時段執行 DNS 切換
8. ✅ 持續監控 24-48 小時

### 🚀 長期優化
遷移完成後，建議採用 **Cloudflare CDN + Linode Docker** 混合架構：
- 保留 Cloudflare 全球 CDN 加速
- Linode Docker 作為 Origin Server
- 兼具效能、安全性與可維護性

---

**文件版本**：v2.0 (Docker Edition)
**更新日期**：2025-12-23
**維護者**：島島技術團隊

**重要變更**：
- v2.0: 改為 Docker 容器化部署方案（基於後端已使用 Docker）
- v1.0: PM2 直接部署方案（已棄用）
