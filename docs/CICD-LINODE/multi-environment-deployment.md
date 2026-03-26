# 島島前端多環境部署指南

## 📋 目錄

- [環境概述](#環境概述)
- [架構設計](#架構設計)
- [前端配置](#前端配置)
- [後端配置](#後端配置)
- [部署流程](#部署流程)
- [CI/CD 配置](#cicd-配置)
- [環境變數管理](#環境變數管理)
- [測試驗證](#測試驗證)
- [故障排除](#故障排除)

---

## 環境概述

### 三個部署環境

| 環境 | 域名 | 用途 | Git 分支 | 後端 API | 網路 |
|------|------|------|----------|----------|------|
| **正式環境** | daodao.so | 生產環境 | `prod` | dao-server.daoedu.tw | prod-daodao-network |
| **測試環境** | dev.daodao.so | 測試環境 | `dev` | server.daoedu.tw | dev-daodao-network |
| **功能分支** | feat-{branch}.daodao.so | 功能開發 | `feat/*` | server.daoedu.tw | dev-daodao-network |

### 架構特點

✅ **獨立管理**：前端與後端各自維護獨立的 docker-compose.yaml
✅ **網路連接**：透過 external network 連接到後端
✅ **統一代理**：後端 nginx 作為統一入口，代理到前端容器
✅ **動態部署**：功能分支可獨立部署測試

---

## 架構設計

### 網路拓撲

```
使用者請求
    ↓
Cloudflare CDN (可選)
    ↓
Nginx (在 daodao-server)
    ├── daodao.so → prod_frontend:3000
    ├── dev.daodao.so → dev_frontend:3000
    └── feat-update.daodao.so → feat_update_frontend:3000
    ↓
Docker Networks
    ├── prod-daodao-network (external)
    │   ├── prod_app (後端)
    │   ├── mongo_prod
    │   ├── redis_prod
    │   └── prod_frontend (前端)
    │
    └── dev-daodao-network (external)
        ├── dev_app (後端)
        ├── mongo_dev
        ├── redis_dev
        ├── dev_frontend (前端)
        └── feat_update_frontend (前端)
```

### 容器命名規範

| 環境 | 容器名稱 | 端口 | 網路 |
|------|----------|------|------|
| 正式 | `prod_frontend` | 3000 | prod-daodao-network |
| 測試 | `dev_frontend` | 3000 | dev-daodao-network |
| 功能分支 | `feat_{branch}_frontend` | 3000 | dev-daodao-network |

---

## 前端配置

### 1. 目錄結構

```bash
daodao-f2e/
├── Dockerfile                    # Docker 構建文件
├── docker-compose.yaml           # 容器編排（三環境）
├── .env.prod                     # 正式環境變數
├── .env.dev                      # 測試環境變數
├── .env.feature.template         # 功能分支環境變數模板
├── deploy.sh                     # 部署腳本
├── rollback.sh                   # 回滾腳本
├── next.config.js               # Next.js 配置（需修改）
└── .github/
    └── workflows/
        ├── deploy-prod.yml      # 正式環境部署
        ├── deploy-dev.yml       # 測試環境部署
        └── deploy-feature.yml   # 功能分支部署
```

### 2. Dockerfile

創建 `/Users/xiaoxu/Projects/daodao/daodao-f2e/Dockerfile`:

```dockerfile
# ============================================
# 階段 1: 依賴安裝
# ============================================
FROM node:20.19.4-alpine AS deps

# 安裝 pnpm
RUN corepack enable && corepack prepare pnpm@10.15.0 --activate

WORKDIR /app

# 複製依賴配置文件
COPY package.json pnpm-lock.yaml ./

# 安裝依賴（使用凍結的 lockfile）
RUN pnpm install --frozen-lockfile

# ============================================
# 階段 2: 構建應用
# ============================================
FROM node:20.19.4-alpine AS builder

# 安裝 pnpm
RUN corepack enable && corepack prepare pnpm@10.15.0 --activate

WORKDIR /app

# 複製依賴
COPY --from=deps /app/node_modules ./node_modules

# 複製源代碼
COPY . .

# 構建參數：環境類型（prod/dev/feature）
ARG BUILD_ENV=prod
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# 根據環境選擇 .env 文件
RUN if [ "$BUILD_ENV" = "prod" ]; then \
      cp .env.prod .env.production; \
    elif [ "$BUILD_ENV" = "dev" ]; then \
      cp .env.dev .env.production; \
    else \
      cp .env.feature .env.production; \
    fi

# 構建應用
RUN pnpm build

# ============================================
# 階段 3: 生產運行
# ============================================
FROM node:20.19.4-alpine AS runner

WORKDIR /app

# 創建非 root 用戶
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# 設置環境變量
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# 複製必要文件
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 切換到非 root 用戶
USER nextjs

# 暴露端口
EXPOSE 3000

# 健康檢查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 啟動應用
CMD ["node", "server.js"]
```

### 3. docker-compose.yaml

創建 `/Users/xiaoxu/Projects/daodao/daodao-f2e/docker-compose.yaml`:

```yaml
services:
  # ============================================
  # 正式環境前端
  # ============================================
  prod_frontend:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        BUILD_ENV: prod
    image: ${DOCKER_HUB_USERNAME}/frontend:prod-${COMMIT_SHA:-latest}
    container_name: prod_frontend
    restart: unless-stopped
    env_file:
      - .env.prod
    environment:
      - NODE_ENV=production
      - PORT=3000
      - HOSTNAME=0.0.0.0
    # 禁用 Docker 日誌捕獲（日誌由應用管理）
    logging:
      driver: "none"
    networks:
      - prod-daodao-network
      - frontend-prod-network
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    # 資源限制
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '1.0'
        reservations:
          memory: 512M
          cpus: '0.5'

  # ============================================
  # 測試環境前端
  # ============================================
  dev_frontend:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        BUILD_ENV: dev
    image: ${DOCKER_HUB_USERNAME}/frontend:dev-${COMMIT_SHA:-latest}
    container_name: dev_frontend
    restart: unless-stopped
    env_file:
      - .env.dev
    environment:
      - NODE_ENV=production
      - PORT=3000
      - HOSTNAME=0.0.0.0
    # 開發環境保留日誌用於調試
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
    networks:
      - dev-daodao-network
      - frontend-dev-network
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '1.0'

  # ============================================
  # 功能分支前端（動態創建）
  # 注意：此服務需要手動啟動，使用 docker-compose up feat_frontend
  # ============================================
  feat_frontend:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        BUILD_ENV: feature
    image: ${DOCKER_HUB_USERNAME}/frontend:${FEATURE_BRANCH:-feature}-${COMMIT_SHA:-latest}
    container_name: feat_${FEATURE_BRANCH:-update}_frontend
    restart: unless-stopped
    env_file:
      - .env.feature
    environment:
      - NODE_ENV=production
      - PORT=3000
      - HOSTNAME=0.0.0.0
      - FEATURE_BRANCH=${FEATURE_BRANCH:-update}
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "2"
    networks:
      - dev-daodao-network  # 功能分支使用測試環境網路
      - frontend-feature-network
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '1.0'

# ============================================
# 網路配置
# ============================================
networks:
  # 外部網路：連接到後端（必須先由 daodao-server 創建）
  prod-daodao-network:
    external: true
    name: prod-daodao-network

  dev-daodao-network:
    external: true
    name: dev-daodao-network

  # 內部網路：前端專用
  frontend-prod-network:
    driver: bridge

  frontend-dev-network:
    driver: bridge

  frontend-feature-network:
    driver: bridge
```

### 4. next.config.js 修改

修改 `/Users/xiaoxu/Projects/daodao/daodao-f2e/next.config.js`:

```javascript
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

  // ⭐ 新增：Docker 部署必須啟用 standalone 模式
  output: 'standalone',

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
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-popover',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      '@radix-ui/react-accordion',
      '@radix-ui/react-alert-dialog',
      '@radix-ui/react-avatar',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-collapsible',
      '@radix-ui/react-label',
      '@radix-ui/react-progress',
      '@radix-ui/react-radio-group',
      '@radix-ui/react-scroll-area',
      '@radix-ui/react-separator',
      '@radix-ui/react-slider',
      '@radix-ui/react-switch',
      '@radix-ui/react-tooltip',
      'react-markdown',
      'react-share',
      'recharts',
      'embla-carousel-react',
      'cmdk',
      'vaul',
      'sonner',
    ],
  },

  images: {
    unoptimized: true,
  },

  webpack: (config) => {
    const experiments = { ...config.experiments, topLevelAwait: true };

    config.module.rules.push({
      test: /\.svg$/,
      use: ["@svgr/webpack"],
    });

    return Object.assign(config, { experiments });
  },

  // 環境變數（根據部署環境自動選擇）
  env: {
    PROD_URL: process.env.NEXT_PUBLIC_SITE_URL || "https://daodao.so",
    STAGING_URL: process.env.NEXT_PUBLIC_DEV_URL || "https://dev.daodao.so",
  },
};

module.exports = withNextIntl(withPWA(withBundleAnalyzer(config)));
```

### 5. 環境變數文件

#### .env.prod (正式環境)

創建 `/Users/xiaoxu/Projects/daodao/daodao-f2e/.env.prod`:

```bash
# 正式環境配置
NODE_ENV=production

# 網站信息
NEXT_PUBLIC_SITE_URL=https://daodao.so
NEXT_PUBLIC_SITE_NAME=島島阿學

# API 端點
NEXT_PUBLIC_API_BASE_URL=https://dao-server.daoedu.tw/api/v1
NEXT_PUBLIC_BACKEND_URL=https://dao-server.daoedu.tw

# 功能開關
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_PWA=true

# 第三方服務
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
NEXT_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/xxx

# 其他配置
NEXT_TELEMETRY_DISABLED=1
```

#### .env.dev (測試環境)

創建 `/Users/xiaoxu/Projects/daodao/daodao-f2e/.env.dev`:

```bash
# 測試環境配置
NODE_ENV=production

# 網站信息
NEXT_PUBLIC_SITE_URL=https://dev.daodao.so
NEXT_PUBLIC_SITE_NAME=島島阿學 (測試)

# API 端點
NEXT_PUBLIC_API_BASE_URL=https://server.daoedu.tw/api/v1
NEXT_PUBLIC_BACKEND_URL=https://server.daoedu.tw

# 功能開關
NEXT_PUBLIC_ENABLE_ANALYTICS=false
NEXT_PUBLIC_ENABLE_PWA=false

# 調試模式
NEXT_PUBLIC_DEBUG_MODE=true

# 其他配置
NEXT_TELEMETRY_DISABLED=1
```

#### .env.feature.template (功能分支模板)

創建 `/Users/xiaoxu/Projects/daodao/daodao-f2e/.env.feature.template`:

```bash
# 功能分支環境配置模板
# 使用前請複製為 .env.feature 並填入實際值
NODE_ENV=production

# 網站信息（替換 {branch} 為實際分支名）
NEXT_PUBLIC_SITE_URL=https://feat-{branch}.daodao.so
NEXT_PUBLIC_SITE_NAME=島島阿學 (功能測試)

# API 端點（使用測試環境後端）
NEXT_PUBLIC_API_BASE_URL=https://server.daoedu.tw/api/v1
NEXT_PUBLIC_BACKEND_URL=https://server.daoedu.tw

# 功能開關
NEXT_PUBLIC_ENABLE_ANALYTICS=false
NEXT_PUBLIC_ENABLE_PWA=false

# 調試模式
NEXT_PUBLIC_DEBUG_MODE=true
NEXT_PUBLIC_FEATURE_BRANCH={branch}

# 其他配置
NEXT_TELEMETRY_DISABLED=1
```

---

## 後端配置

### 修改 nginx.conf

在 `/Users/xiaoxu/Projects/daodao/daodao-server/nginx.conf` 中添加前端代理配置：

```nginx
http {
    # ... 現有配置 ...

    # ============================================
    # 前端正式環境 - daodao.so
    # ============================================
    server {
        listen 80;
        server_name daodao.so www.daodao.so;

        # HTTP 重定向到 HTTPS
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name daodao.so www.daodao.so;

        # SSL 配置
        ssl_certificate /etc/letsencrypt/live/daodao.so/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/daodao.so/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers on;

        # 安全標頭
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;

        # Gzip 壓縮
        gzip on;
        gzip_vary on;
        gzip_proxied any;
        gzip_comp_level 6;
        gzip_types text/plain text/css text/xml text/javascript
                   application/json application/javascript application/xml+rss
                   application/rss+xml font/truetype font/opentype
                   application/vnd.ms-fontobject image/svg+xml;

        # Next.js 應用
        location / {
            proxy_pass http://prod_frontend:3000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;

            # 超時設置
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }

        # 靜態資源緩存
        location /_next/static/ {
            proxy_pass http://prod_frontend:3000;
            proxy_cache_valid 200 365d;
            add_header Cache-Control "public, max-age=31536000, immutable";
        }

        location /static/ {
            proxy_pass http://prod_frontend:3000;
            proxy_cache_valid 200 365d;
            add_header Cache-Control "public, max-age=31536000, immutable";
        }
    }

    # ============================================
    # 前端測試環境 - dev.daodao.so
    # ============================================
    server {
        listen 80;
        server_name dev.daodao.so;

        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name dev.daodao.so;

        ssl_certificate /etc/letsencrypt/live/dev.daodao.so/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/dev.daodao.so/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;

        location / {
            proxy_pass http://dev_frontend:3000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        location /_next/static/ {
            proxy_pass http://dev_frontend:3000;
            add_header Cache-Control "public, max-age=3600";
        }
    }

    # ============================================
    # 功能分支環境 - feat-*.daodao.so
    # ============================================
    server {
        listen 80;
        server_name ~^feat-(?<branch>.+)\.daodao\.so$;

        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name ~^feat-(?<branch>.+)\.daodao\.so$;

        # 使用通配符證書或為每個分支申請證書
        ssl_certificate /etc/letsencrypt/live/daodao.so/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/daodao.so/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;

        location / {
            # 動態解析容器名稱（feat_分支名_frontend）
            # 注意：nginx 無法動態解析，需要使用變數或手動配置
            # 建議方案：使用固定的 feat_frontend 容器，通過環境變數區分分支
            proxy_pass http://feat_${branch}_frontend:3000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }

    # ... 現有的後端配置 ...
}
```

**重要提示**：功能分支的 nginx 配置需要特殊處理，因為容器名稱是動態的。推薦方案：

**方案 A**：為每個功能分支手動添加 server 配置
```nginx
server {
    listen 443 ssl http2;
    server_name feat-update.daodao.so;
    location / {
        proxy_pass http://feat_update_frontend:3000;
        # ... 其他配置 ...
    }
}
```

**方案 B**（推薦）：使用統一的功能分支容器名稱，通過環境變數區分
- 容器名稱固定為 `feat_frontend`
- 通過 `FEATURE_BRANCH` 環境變數識別分支
- 同一時間只部署一個功能分支

### 更新 docker-compose.yaml

在 `/Users/xiaoxu/Projects/daodao/daodao-server/docker-compose.yaml` 的 nginx 服務中添加 SSL 證書掛載：

```yaml
nginx:
  image: nginx:latest
  container_name: nginx
  ports:
    - "80:80"
    - "443:443"
  volumes:
    - ./nginx.conf:/etc/nginx/nginx.conf
    - /etc/letsencrypt:/etc/letsencrypt:ro  # ⭐ 新增：掛載 SSL 證書
  environment:
    - APP_ENV=${APP_ENV}
  depends_on:
    - prod_app
    - dev_app
  networks:
    - prod-daodao-network
    - dev-daodao-network
```

---

## 部署流程

### 啟動順序

**重要**：必須先啟動後端（創建網路），再啟動前端（加入網路）

#### 1. 後端啟動（創建 external networks）

```bash
cd /path/to/daodao-server

# 啟動後端服務（會創建 prod-daodao-network 和 dev-daodao-network）
docker-compose up -d
```

#### 2. 前端啟動（加入 external networks）

```bash
cd /path/to/daodao-f2e

# 啟動正式環境
docker-compose up -d prod_frontend

# 啟動測試環境
docker-compose up -d dev_frontend

# 啟動功能分支環境
FEATURE_BRANCH=update docker-compose up -d feat_frontend
```

### 部署腳本

創建 `/Users/xiaoxu/Projects/daodao/daodao-f2e/deploy.sh`:

```bash
#!/bin/bash

# ============================================
# 島島前端多環境部署腳本
# ============================================

set -e  # 遇到錯誤立即退出

# 顏色輸出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日誌函數
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# ============================================
# 參數解析
# ============================================

ENVIRONMENT=${1:-dev}  # 默認為 dev 環境
BRANCH=${2:-}          # 功能分支名稱（僅 feature 環境需要）

if [[ ! "$ENVIRONMENT" =~ ^(prod|dev|feature)$ ]]; then
    log_error "無效的環境參數: $ENVIRONMENT"
    echo "用法: $0 <prod|dev|feature> [branch-name]"
    echo "範例:"
    echo "  $0 prod              # 部署正式環境"
    echo "  $0 dev               # 部署測試環境"
    echo "  $0 feature update    # 部署 feat/update 分支"
    exit 1
fi

if [[ "$ENVIRONMENT" == "feature" && -z "$BRANCH" ]]; then
    log_error "功能分支環境需要指定分支名稱"
    echo "用法: $0 feature <branch-name>"
    exit 1
fi

# ============================================
# 環境變數設置
# ============================================

export DOCKER_HUB_USERNAME=${DOCKER_HUB_USERNAME:-"your-dockerhub-username"}
export COMMIT_SHA=$(git rev-parse --short HEAD)

if [[ "$ENVIRONMENT" == "feature" ]]; then
    export FEATURE_BRANCH=$BRANCH
    SERVICE_NAME="feat_frontend"
    CONTAINER_NAME="feat_${BRANCH}_frontend"
    ENV_FILE=".env.feature"
else
    SERVICE_NAME="${ENVIRONMENT}_frontend"
    CONTAINER_NAME="${ENVIRONMENT}_frontend"
    ENV_FILE=".env.${ENVIRONMENT}"
fi

log_info "=========================================="
log_info "島島前端部署"
log_info "=========================================="
log_info "環境: $ENVIRONMENT"
log_info "服務名稱: $SERVICE_NAME"
log_info "容器名稱: $CONTAINER_NAME"
log_info "Commit SHA: $COMMIT_SHA"
log_info "環境變數文件: $ENV_FILE"
[[ "$ENVIRONMENT" == "feature" ]] && log_info "分支: $BRANCH"
log_info "=========================================="

# ============================================
# 檢查環境變數文件
# ============================================

if [[ ! -f "$ENV_FILE" ]]; then
    log_error "環境變數文件不存在: $ENV_FILE"

    if [[ "$ENVIRONMENT" == "feature" ]]; then
        log_info "正在從模板創建 .env.feature..."
        cp .env.feature.template .env.feature
        sed -i "s/{branch}/$BRANCH/g" .env.feature
        log_warning "請檢查並修改 .env.feature 中的配置"
    fi

    exit 1
fi

# ============================================
# 檢查後端網路是否存在
# ============================================

if [[ "$ENVIRONMENT" == "prod" ]]; then
    REQUIRED_NETWORK="prod-daodao-network"
else
    REQUIRED_NETWORK="dev-daodao-network"
fi

if ! docker network inspect "$REQUIRED_NETWORK" &>/dev/null; then
    log_error "後端網路不存在: $REQUIRED_NETWORK"
    log_warning "請先啟動後端服務創建網路:"
    log_warning "  cd /path/to/daodao-server && docker-compose up -d"
    exit 1
fi

log_success "後端網路檢查通過: $REQUIRED_NETWORK"

# ============================================
# 拉取最新代碼
# ============================================

log_info "拉取最新代碼..."

if [[ "$ENVIRONMENT" == "prod" ]]; then
    git fetch origin prod
    git checkout prod
    git pull origin prod
elif [[ "$ENVIRONMENT" == "dev" ]]; then
    git fetch origin dev
    git checkout dev
    git pull origin dev
else
    git fetch origin "feat/$BRANCH"
    git checkout "feat/$BRANCH"
    git pull origin "feat/$BRANCH"
fi

log_success "代碼更新完成"

# ============================================
# 構建並部署
# ============================================

log_info "開始構建 Docker 映像..."

docker-compose build \
    --build-arg BUILD_ENV=$ENVIRONMENT \
    $SERVICE_NAME

log_success "Docker 映像構建完成"

# 停止舊容器
log_info "停止舊容器..."
docker-compose stop $SERVICE_NAME || true
docker-compose rm -f $SERVICE_NAME || true

# 啟動新容器
log_info "啟動新容器..."
if [[ "$ENVIRONMENT" == "feature" ]]; then
    FEATURE_BRANCH=$BRANCH docker-compose up -d $SERVICE_NAME
else
    docker-compose up -d $SERVICE_NAME
fi

# ============================================
# 等待健康檢查
# ============================================

log_info "等待容器健康檢查..."

MAX_WAIT=60
WAIT_COUNT=0

while [ $WAIT_COUNT -lt $MAX_WAIT ]; do
    HEALTH=$(docker inspect --format='{{.State.Health.Status}}' $CONTAINER_NAME 2>/dev/null || echo "unknown")

    if [ "$HEALTH" = "healthy" ]; then
        log_success "容器健康檢查通過"
        break
    fi

    echo -n "."
    sleep 2
    WAIT_COUNT=$((WAIT_COUNT + 2))
done

echo ""

if [ $WAIT_COUNT -ge $MAX_WAIT ]; then
    log_warning "健康檢查超時，但容器可能仍在啟動中"
    log_info "請手動檢查容器狀態: docker logs $CONTAINER_NAME"
fi

# ============================================
# 清理舊映像
# ============================================

log_info "清理未使用的 Docker 映像..."
docker image prune -f

# ============================================
# 部署完成
# ============================================

log_success "=========================================="
log_success "部署完成！"
log_success "=========================================="

# 顯示容器信息
log_info "容器狀態:"
docker ps --filter "name=$CONTAINER_NAME" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

log_info ""
log_info "查看日誌:"
log_info "  docker logs -f $CONTAINER_NAME"

log_info ""
log_info "訪問地址:"
if [[ "$ENVIRONMENT" == "prod" ]]; then
    log_info "  https://daodao.so"
elif [[ "$ENVIRONMENT" == "dev" ]]; then
    log_info "  https://dev.daodao.so"
else
    log_info "  https://feat-$BRANCH.daodao.so"
fi

log_success "=========================================="
```

### 回滾腳本

創建 `/Users/xiaoxu/Projects/daodao/daodao-f2e/rollback.sh`:

```bash
#!/bin/bash

# ============================================
# 島島前端回滾腳本
# ============================================

set -e

# 顏色輸出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }

# 參數
ENVIRONMENT=${1:-dev}
IMAGE_TAG=${2:-}

if [[ ! "$ENVIRONMENT" =~ ^(prod|dev)$ ]]; then
    log_error "無效的環境: $ENVIRONMENT"
    echo "用法: $0 <prod|dev> [image-tag]"
    exit 1
fi

SERVICE_NAME="${ENVIRONMENT}_frontend"

# 如果沒有指定 tag，列出可用的映像
if [[ -z "$IMAGE_TAG" ]]; then
    log_info "可用的映像版本:"
    docker images --filter "reference=*/frontend:${ENVIRONMENT}-*" --format "{{.Tag}}" | head -10
    echo ""
    echo "用法: $0 $ENVIRONMENT <image-tag>"
    exit 1
fi

# 執行回滾
log_warning "準備回滾 $ENVIRONMENT 環境到版本: $IMAGE_TAG"
read -p "確認繼續? (y/N) " -n 1 -r
echo

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    log_info "回滾取消"
    exit 0
fi

log_info "停止當前容器..."
docker-compose stop $SERVICE_NAME

log_info "切換到指定版本..."
export COMMIT_SHA=$IMAGE_TAG
docker-compose up -d $SERVICE_NAME

log_info "等待容器啟動..."
sleep 10

# 檢查狀態
docker ps --filter "name=${ENVIRONMENT}_frontend"

log_info "回滾完成！"
log_info "如果出現問題，請使用以下命令查看日誌:"
log_info "  docker logs ${ENVIRONMENT}_frontend"
```

### 使腳本可執行

```bash
chmod +x deploy.sh rollback.sh
```

---

## CI/CD 配置

### 1. GitHub Actions - 正式環境部署

創建 `/Users/xiaoxu/Projects/daodao/daodao-f2e/.github/workflows/deploy-prod.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches:
      - prod
  workflow_dispatch:  # 允許手動觸發

env:
  DOCKER_HUB_USERNAME: ${{ secrets.DOCKER_HUB_USERNAME }}
  DOCKER_HUB_TOKEN: ${{ secrets.DOCKER_HUB_TOKEN }}

jobs:
  deploy:
    name: Deploy to Production Environment
    runs-on: ubuntu-latest
    environment: production

    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          ref: prod

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKER_HUB_USERNAME }}
          password: ${{ secrets.DOCKER_HUB_TOKEN }}

      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./Dockerfile
          push: true
          build-args: |
            BUILD_ENV=prod
          tags: |
            ${{ secrets.DOCKER_HUB_USERNAME }}/frontend:prod-latest
            ${{ secrets.DOCKER_HUB_USERNAME }}/frontend:prod-${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Deploy to Linode VPS
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.LINODE_HOST }}
          username: ${{ secrets.LINODE_USER }}
          key: ${{ secrets.LINODE_SSH_KEY }}
          script: |
            cd /path/to/daodao-f2e
            export DOCKER_HUB_USERNAME=${{ secrets.DOCKER_HUB_USERNAME }}
            export COMMIT_SHA=${{ github.sha }}
            ./deploy.sh prod

      - name: Notify Discord on Success
        if: success()
        uses: sarisia/actions-status-discord@v1
        with:
          webhook: ${{ secrets.DISCORD_WEBHOOK }}
          title: "✅ Production Deployment Successful"
          description: |
            **Environment:** Production
            **Commit:** ${{ github.sha }}
            **Branch:** prod
            **URL:** https://daodao.so
          color: 0x00ff00

      - name: Notify Discord on Failure
        if: failure()
        uses: sarisia/actions-status-discord@v1
        with:
          webhook: ${{ secrets.DISCORD_WEBHOOK }}
          title: "❌ Production Deployment Failed"
          description: |
            **Environment:** Production
            **Commit:** ${{ github.sha }}
            **Branch:** prod
          color: 0xff0000
```

### 2. GitHub Actions - 測試環境部署

創建 `/Users/xiaoxu/Projects/daodao/daodao-f2e/.github/workflows/deploy-dev.yml`:

```yaml
name: Deploy to Development

on:
  push:
    branches:
      - dev
  workflow_dispatch:

env:
  DOCKER_HUB_USERNAME: ${{ secrets.DOCKER_HUB_USERNAME }}
  DOCKER_HUB_TOKEN: ${{ secrets.DOCKER_HUB_TOKEN }}

jobs:
  deploy:
    name: Deploy to Development Environment
    runs-on: ubuntu-latest
    environment: development

    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          ref: dev

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKER_HUB_USERNAME }}
          password: ${{ secrets.DOCKER_HUB_TOKEN }}

      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./Dockerfile
          push: true
          build-args: |
            BUILD_ENV=dev
          tags: |
            ${{ secrets.DOCKER_HUB_USERNAME }}/frontend:dev-latest
            ${{ secrets.DOCKER_HUB_USERNAME }}/frontend:dev-${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Deploy to Linode VPS
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.LINODE_HOST }}
          username: ${{ secrets.LINODE_USER }}
          key: ${{ secrets.LINODE_SSH_KEY }}
          script: |
            cd /path/to/daodao-f2e
            export DOCKER_HUB_USERNAME=${{ secrets.DOCKER_HUB_USERNAME }}
            export COMMIT_SHA=${{ github.sha }}
            ./deploy.sh dev

      - name: Notify Discord
        if: always()
        uses: sarisia/actions-status-discord@v1
        with:
          webhook: ${{ secrets.DISCORD_WEBHOOK }}
          title: "${{ job.status == 'success' && '✅' || '❌' }} Development Deployment"
          description: |
            **Environment:** Development
            **Commit:** ${{ github.sha }}
            **Branch:** dev
            **URL:** https://dev.daodao.so
          color: ${{ job.status == 'success' && '0x00ff00' || '0xff0000' }}
```

### 3. GitHub Actions - 功能分支部署

創建 `/Users/xiaoxu/Projects/daodao/daodao-f2e/.github/workflows/deploy-feature.yml`:

```yaml
name: Deploy Feature Branch

on:
  workflow_dispatch:
    inputs:
      branch:
        description: 'Feature branch name (without feat/ prefix)'
        required: true
        type: string

env:
  DOCKER_HUB_USERNAME: ${{ secrets.DOCKER_HUB_USERNAME }}
  DOCKER_HUB_TOKEN: ${{ secrets.DOCKER_HUB_TOKEN }}

jobs:
  deploy:
    name: Deploy Feature Branch
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          ref: feat/${{ github.event.inputs.branch }}

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKER_HUB_USERNAME }}
          password: ${{ secrets.DOCKER_HUB_TOKEN }}

      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./Dockerfile
          push: true
          build-args: |
            BUILD_ENV=feature
          tags: |
            ${{ secrets.DOCKER_HUB_USERNAME }}/frontend:${{ github.event.inputs.branch }}-latest
            ${{ secrets.DOCKER_HUB_USERNAME }}/frontend:${{ github.event.inputs.branch }}-${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Deploy to Linode VPS
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.LINODE_HOST }}
          username: ${{ secrets.LINODE_USER }}
          key: ${{ secrets.LINODE_SSH_KEY }}
          script: |
            cd /path/to/daodao-f2e
            export DOCKER_HUB_USERNAME=${{ secrets.DOCKER_HUB_USERNAME }}
            export COMMIT_SHA=${{ github.sha }}
            ./deploy.sh feature ${{ github.event.inputs.branch }}

      - name: Notify Discord
        if: always()
        uses: sarisia/actions-status-discord@v1
        with:
          webhook: ${{ secrets.DISCORD_WEBHOOK }}
          title: "${{ job.status == 'success' && '✅' || '❌' }} Feature Branch Deployment"
          description: |
            **Environment:** Feature
            **Branch:** feat/${{ github.event.inputs.branch }}
            **Commit:** ${{ github.sha }}
            **URL:** https://feat-${{ github.event.inputs.branch }}.daodao.so
          color: ${{ job.status == 'success' && '0x00ff00' || '0xff0000' }}
```

### 4. GitHub Secrets 設置

在 GitHub 專案設置中添加以下 Secrets：

| Secret 名稱 | 說明 | 範例 |
|------------|------|------|
| `DOCKER_HUB_USERNAME` | Docker Hub 用戶名 | `your-username` |
| `DOCKER_HUB_TOKEN` | Docker Hub Access Token | `dckr_pat_xxx` |
| `LINODE_HOST` | Linode VPS IP | `123.45.67.89` |
| `LINODE_USER` | SSH 用戶名 | `deploy` |
| `LINODE_SSH_KEY` | SSH 私鑰 | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `DISCORD_WEBHOOK` | Discord Webhook URL | `https://discord.com/api/webhooks/...` |

---

## 環境變數管理

### 敏感信息處理

**禁止將敏感信息提交到 Git！**

在 `.gitignore` 中添加：

```gitignore
# 環境變數文件
.env.prod
.env.dev
.env.feature
.env.local
.env*.local
```

### 環境變數注入方式

**方法 1：使用 .env 文件（推薦）**
- 在服務器上手動創建 `.env.prod` 和 `.env.dev`
- 通過 `env_file` 在 docker-compose.yaml 中引用

**方法 2：使用 Secret 管理工具**
- 使用 Docker Secrets
- 使用 Vault 等密鑰管理工具

**方法 3：CI/CD 環境變數**
- 在 GitHub Actions 中設置為 Secrets
- 在部署時動態生成 .env 文件

---

## 測試驗證

### 本地測試

```bash
# 測試構建
docker-compose build prod_frontend

# 測試運行
docker-compose up prod_frontend

# 測試健康檢查
curl http://localhost:3000/api/health
```

### 部署後驗證

#### 正式環境檢查清單

- [ ] 網站可訪問：https://daodao.so
- [ ] SSL 證書有效
- [ ] API 連接正常（檢查後端請求）
- [ ] 靜態資源加載正常
- [ ] 頁面路由工作正常
- [ ] Google Analytics 數據收集正常
- [ ] PWA 功能正常
- [ ] 性能指標符合預期（Lighthouse 分數 > 90）

#### 測試環境檢查清單

- [ ] 網站可訪問：https://dev.daodao.so
- [ ] 連接到測試後端 API
- [ ] 調試模式啟用
- [ ] 可以看到調試信息

#### 功能分支檢查清單

- [ ] 網站可訪問：https://feat-{branch}.daodao.so
- [ ] 功能正常運作
- [ ] 沒有影響其他環境

### 監控命令

```bash
# 查看容器狀態
docker ps --filter "name=frontend"

# 查看容器日誌
docker logs -f prod_frontend
docker logs -f dev_frontend

# 查看資源使用
docker stats prod_frontend dev_frontend

# 查看健康狀態
docker inspect --format='{{.State.Health.Status}}' prod_frontend

# 進入容器調試
docker exec -it prod_frontend sh
```

---

## 故障排除

### 問題 1：容器無法啟動

**症狀**：`docker-compose up` 失敗

**可能原因**：
1. 後端網路不存在
2. 端口被占用
3. 環境變數文件錯誤

**解決方法**：

```bash
# 檢查網路
docker network ls | grep daodao

# 如果網路不存在，先啟動後端
cd /path/to/daodao-server
docker-compose up -d

# 檢查端口
netstat -tuln | grep 3000

# 檢查日誌
docker-compose logs prod_frontend
```

### 問題 2：nginx 502 Bad Gateway

**症狀**：訪問域名顯示 502 錯誤

**可能原因**：
1. 前端容器未啟動
2. 容器名稱不匹配
3. 網路配置錯誤

**解決方法**：

```bash
# 檢查前端容器狀態
docker ps | grep frontend

# 檢查 nginx 配置
docker exec nginx nginx -t

# 重啟 nginx
docker restart nginx

# 檢查容器網路
docker inspect prod_frontend | grep NetworkMode
```

### 問題 3：SSL 證書錯誤

**症狀**：HTTPS 無法訪問或證書無效

**解決方法**：

```bash
# 申請 SSL 證書
sudo certbot certonly --standalone -d daodao.so -d www.daodao.so
sudo certbot certonly --standalone -d dev.daodao.so

# 更新證書（自動續期）
sudo certbot renew --dry-run

# 檢查證書
sudo certbot certificates
```

### 問題 4：環境變數未生效

**症狀**：應用無法連接到正確的 API

**解決方法**：

```bash
# 檢查容器環境變數
docker exec prod_frontend env | grep NEXT_PUBLIC

# 重新構建（不使用緩存）
docker-compose build --no-cache prod_frontend

# 重啟容器
docker-compose restart prod_frontend
```

### 問題 5：功能分支部署衝突

**症狀**：多個功能分支同時部署導致衝突

**解決方法**：

**方案 A**：使用統一容器名稱（同一時間只部署一個功能分支）
```bash
# 先停止現有功能分支
docker-compose stop feat_frontend
docker-compose rm -f feat_frontend

# 部署新的功能分支
FEATURE_BRANCH=new-feature ./deploy.sh feature new-feature
```

**方案 B**：為每個功能分支創建獨立配置
- 在 docker-compose.yaml 中為每個分支創建獨立的 service
- 在 nginx.conf 中為每個分支創建獨立的 server 配置
- 為每個分支申請獨立的 SSL 證書

### 問題 6：Docker 映像過大

**症狀**：構建時間長，磁盤空間不足

**解決方法**：

```bash
# 清理未使用的映像
docker image prune -a -f

# 查看映像大小
docker images | grep frontend

# 優化 Dockerfile（已在上面的 Dockerfile 中實現）
# - 使用多階段構建
# - 只複製必要文件
# - 使用 .dockerignore
```

創建 `.dockerignore`:

```
node_modules
.next
.git
.github
*.md
.env*
!.env.production
logs
dist
```

---

## 下一步優化

部署完成後，可以考慮以下優化：

### 1. 監控與告警

- 使用 Prometheus + Grafana 監控容器資源
- 設置 Sentry 錯誤追蹤
- 配置 Uptime Robot 服務可用性監控

### 2. 性能優化

- 啟用 Cloudflare CDN
- 配置 Redis 頁面緩存
- 優化 Docker 映像大小

### 3. 安全加固

- 配置 WAF 規則
- 定期更新依賴
- 實施安全掃描

### 4. 備份策略

- 定期備份 Docker volumes
- 備份環境變數文件
- 創建災難恢復計劃

### 5. 自動化測試

- E2E 測試自動化
- 性能測試自動化
- 部署前自動測試

---

## 附錄

### A. 常用命令速查

```bash
# ===== 部署相關 =====
# 正式環境部署
./deploy.sh prod

# 測試環境部署
./deploy.sh dev

# 功能分支部署
./deploy.sh feature update

# 回滾到指定版本
./rollback.sh prod prod-abc123

# ===== 容器管理 =====
# 查看所有前端容器
docker ps -a | grep frontend

# 啟動容器
docker-compose up -d prod_frontend

# 停止容器
docker-compose stop prod_frontend

# 重啟容器
docker-compose restart prod_frontend

# 刪除容器
docker-compose rm -f prod_frontend

# ===== 日誌查看 =====
# 實時查看日誌
docker logs -f prod_frontend

# 查看最近 100 行日誌
docker logs --tail 100 prod_frontend

# 查看特定時間的日誌
docker logs --since 30m prod_frontend

# ===== 調試 =====
# 進入容器
docker exec -it prod_frontend sh

# 檢查健康狀態
docker inspect --format='{{.State.Health.Status}}' prod_frontend

# 查看容器配置
docker inspect prod_frontend

# ===== 網路調試 =====
# 查看網路
docker network ls

# 檢查網路詳情
docker network inspect prod-daodao-network

# 測試容器間連接
docker exec prod_frontend ping prod_app

# ===== 清理 =====
# 清理未使用的映像
docker image prune -a -f

# 清理未使用的容器
docker container prune -f

# 清理未使用的網路
docker network prune -f

# 完整清理（謹慎使用）
docker system prune -a -f
```

### B. 環境變數完整列表

| 變數名稱 | 說明 | 必填 | 預設值 | 範例 |
|---------|------|------|--------|------|
| `NODE_ENV` | Node.js 環境 | ✅ | - | `production` |
| `NEXT_PUBLIC_SITE_URL` | 網站 URL | ✅ | - | `https://daodao.so` |
| `NEXT_PUBLIC_API_BASE_URL` | API 基礎 URL | ✅ | - | `https://dao-server.daoedu.tw/api/v1` |
| `NEXT_PUBLIC_BACKEND_URL` | 後端 URL | ✅ | - | `https://dao-server.daoedu.tw` |
| `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID` | GA ID | ❌ | - | `G-XXXXXXXXXX` |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry DSN | ❌ | - | `https://xxx@sentry.io/xxx` |
| `NEXT_PUBLIC_ENABLE_ANALYTICS` | 啟用分析 | ❌ | `false` | `true` |
| `NEXT_PUBLIC_ENABLE_PWA` | 啟用 PWA | ❌ | `false` | `true` |
| `NEXT_TELEMETRY_DISABLED` | 禁用遙測 | ❌ | `1` | `1` |

### C. 端口使用規劃

| 服務 | 環境 | 內部端口 | 外部訪問 |
|------|------|----------|---------|
| prod_frontend | 正式 | 3000 | nginx → daodao.so |
| dev_frontend | 測試 | 3000 | nginx → dev.daodao.so |
| feat_frontend | 功能 | 3000 | nginx → feat-*.daodao.so |
| prod_app | 正式 | 3000 | nginx → dao-server.daoedu.tw |
| dev_app | 測試 | 3000 | nginx → server.daoedu.tw |
| nginx | 全部 | 80, 443 | 0.0.0.0:80, 0.0.0.0:443 |

---

**文件版本**：v1.0
**最後更新**：2025-12-23
**維護者**：島島技術團隊
