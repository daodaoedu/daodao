# 島島前端 Monorepo 多環境部署指南

**文件版本**：v2.0
**最後更新**：2026-01-08
**適用專案**：daodao-f2e (Monorepo with website + product apps)

---

## 📋 目錄

- [環境概述](#環境概述)
- [Monorepo 架構說明](#monorepo-架構說明)
- [域名映射策略](#域名映射策略)
- [Docker 配置](#docker-配置)
- [環境變數管理](#環境變數管理)
- [部署腳本](#部署腳本)
- [CI/CD 配置](#cicd-配置)
- [後端 Nginx 配置](#後端-nginx-配置)
- [部署流程](#部署流程)
- [監控與故障排除](#監控與故障排除)

---

## 環境概述

### 三個部署環境 × 兩個應用

| 環境 | Website 應用 | Product 應用 | Git 分支 | 後端 API |
|------|-------------|-------------|----------|----------|
| **正式環境** | daodao.so | app.daodao.so | `prod` | dao-server.daoedu.tw |
| **測試環境** | dev.daodao.so | app-dev.daodao.so | `dev` | server.daoedu.tw |
| **功能分支** | feat-{branch}.daodao.so | app-feat-{branch}.daodao.so | `feat/*` | server.daoedu.tw |

### 架構特點

✅ **Monorepo 支援**：同時管理 website 和 product 兩個 Next.js 應用
✅ **獨立部署**：兩個應用可獨立構建和部署
✅ **統一管理**：使用單一 docker-compose.yaml 管理所有環境
✅ **網路連接**：透過 external network 連接到後端
✅ **動態部署**：功能分支可獨立部署測試

---

## Monorepo 架構說明

### 專案結構

```
daodao-f2e/
├── apps/
│   ├── website/          # 主站應用 (daodao.so)
│   │   ├── src/
│   │   ├── next.config.ts
│   │   └── package.json  # dev: port 3000
│   └── product/          # 產品應用 (app.daodao.so)
│       ├── src/
│       ├── next.config.ts
│       └── package.json  # dev: port 3001
├── packages/
│   ├── api/
│   ├── assets/
│   ├── features/
│   ├── i18n/
│   ├── shared/
│   └── ui/
├── Dockerfile            # 多階段構建，支援多應用
├── docker-compose.yaml   # 統一管理所有服務
├── .env.prod             # 正式環境變數
├── .env.dev              # 測試環境變數
├── .env.feature.template # 功能分支模板
├── deploy.sh             # 部署腳本
└── package.json          # pnpm workspace
```

### 兩個應用的定位

| 應用 | 用途 | 域名 | 端口 |
|------|------|------|------|
| **website** | 官方網站、資源列表、教學內容 | daodao.so | 3000 |
| **product** | 產品功能、使用者互動、工具 | app.daodao.so | 3001 |

---

## 域名映射策略

### 完整域名清單

#### 正式環境

```
Website 主站:
  - https://daodao.so
  - https://www.daodao.so (重定向到 daodao.so)

Product 應用:
  - https://app.daodao.so

後端 API:
  - https://dao-server.daoedu.tw/api/v1
```

#### 測試環境

```
Website 測試:
  - https://dev.daodao.so

Product 測試:
  - https://app-dev.daodao.so

後端 API:
  - https://server.daoedu.tw/api/v1
```

#### 功能分支環境

```
Website 功能分支:
  - https://feat-{branch}.daodao.so

Product 功能分支:
  - https://app-feat-{branch}.daodao.so

後端 API:
  - https://server.daoedu.tw/api/v1
```

### 網路拓撲

```
使用者請求
    ↓
Cloudflare CDN (可選)
    ↓
Nginx (在 daodao-server)
    ├── daodao.so → website_prod:3000
    ├── app.daodao.so → product_prod:3001
    ├── dev.daodao.so → website_dev:3000
    ├── app-dev.daodao.so → product_dev:3001
    ├── feat-*.daodao.so → website_feat_{branch}:3000
    └── app-feat-*.daodao.so → product_feat_{branch}:3001
```

---

## Docker 配置

### 1. 確認 Dockerfile

現有的 Dockerfile 已經支援多應用構建，透過 `APP_NAME` build argument 指定要構建的應用：

```dockerfile
# 已存在於 /Users/xiaoxu/Projects/daodao/daodao-f2e/Dockerfile
ARG APP_NAME=website  # 或 product
```

### 2. docker-compose.yaml

創建 `/Users/xiaoxu/Projects/daodao/daodao-f2e/docker-compose.yaml`:

```yaml
services:
  # ============================================
  # 正式環境 - Website
  # ============================================
  website_prod:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        APP_NAME: website
        APP_PORT: 3000
    image: ${DOCKER_HUB_USERNAME}/daodao-website:prod-${COMMIT_SHA:-latest}
    container_name: website_prod
    restart: unless-stopped
    env_file:
      - .env.prod
    environment:
      - NODE_ENV=production
      - PORT=3000
      - APP_NAME=website
    logging:
      driver: "none"
    networks:
      - prod-daodao-network
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '1.0'
        reservations:
          memory: 512M
          cpus: '0.5'

  # ============================================
  # 正式環境 - Product
  # ============================================
  product_prod:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        APP_NAME: product
        APP_PORT: 3001
    image: ${DOCKER_HUB_USERNAME}/daodao-product:prod-${COMMIT_SHA:-latest}
    container_name: product_prod
    restart: unless-stopped
    env_file:
      - .env.prod
    environment:
      - NODE_ENV=production
      - PORT=3001
      - APP_NAME=product
    logging:
      driver: "none"
    networks:
      - prod-daodao-network
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3001/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '1.0'
        reservations:
          memory: 512M
          cpus: '0.5'

  # ============================================
  # 測試環境 - Website
  # ============================================
  website_dev:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        APP_NAME: website
        APP_PORT: 3000
    image: ${DOCKER_HUB_USERNAME}/daodao-website:dev-${COMMIT_SHA:-latest}
    container_name: website_dev
    restart: unless-stopped
    env_file:
      - .env.dev
    environment:
      - NODE_ENV=production
      - PORT=3000
      - APP_NAME=website
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
    networks:
      - dev-daodao-network
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000/api/health"]
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
  # 測試環境 - Product
  # ============================================
  product_dev:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        APP_NAME: product
        APP_PORT: 3001
    image: ${DOCKER_HUB_USERNAME}/daodao-product:dev-${COMMIT_SHA:-latest}
    container_name: product_dev
    restart: unless-stopped
    env_file:
      - .env.dev
    environment:
      - NODE_ENV=production
      - PORT=3001
      - APP_NAME=product
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
    networks:
      - dev-daodao-network
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3001/api/health"]
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
  # 功能分支 - Website
  # ============================================
  website_feat:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        APP_NAME: website
        APP_PORT: 3000
    image: ${DOCKER_HUB_USERNAME}/daodao-website:${FEATURE_BRANCH:-feature}-${COMMIT_SHA:-latest}
    container_name: website_feat_${FEATURE_BRANCH:-update}
    restart: unless-stopped
    env_file:
      - .env.feature
    environment:
      - NODE_ENV=production
      - PORT=3000
      - APP_NAME=website
      - FEATURE_BRANCH=${FEATURE_BRANCH:-update}
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "2"
    networks:
      - dev-daodao-network
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000/api/health"]
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
  # 功能分支 - Product
  # ============================================
  product_feat:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        APP_NAME: product
        APP_PORT: 3001
    image: ${DOCKER_HUB_USERNAME}/daodao-product:${FEATURE_BRANCH:-feature}-${COMMIT_SHA:-latest}
    container_name: product_feat_${FEATURE_BRANCH:-update}
    restart: unless-stopped
    env_file:
      - .env.feature
    environment:
      - NODE_ENV=production
      - PORT=3001
      - APP_NAME=product
      - FEATURE_BRANCH=${FEATURE_BRANCH:-update}
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "2"
    networks:
      - dev-daodao-network
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3001/api/health"]
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
```

---

## 環境變數管理

### .env.prod（正式環境）

創建 `/Users/xiaoxu/Projects/daodao/daodao-f2e/.env.prod`:

```bash
# 正式環境配置
NODE_ENV=production

# ============================================
# Website 應用配置
# ============================================
NEXT_PUBLIC_SITE_URL_WEBSITE=https://daodao.so
NEXT_PUBLIC_SITE_NAME_WEBSITE=島島阿學

# ============================================
# Product 應用配置
# ============================================
NEXT_PUBLIC_SITE_URL_PRODUCT=https://app.daodao.so
NEXT_PUBLIC_SITE_NAME_PRODUCT=島島阿學 - 產品

# ============================================
# 共用 API 配置
# ============================================
NEXT_PUBLIC_API_URL=https://dao-server.daoedu.tw/api/v1
NEXT_PUBLIC_BACKEND_URL=https://dao-server.daoedu.tw

# ============================================
# 功能開關
# ============================================
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_PWA=true

# ============================================
# 第三方服務
# ============================================
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
NEXT_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/xxx

# ============================================
# 其他配置
# ============================================
NEXT_TELEMETRY_DISABLED=1
```

### .env.dev（測試環境）

創建 `/Users/xiaoxu/Projects/daodao/daodao-f2e/.env.dev`:

```bash
# 測試環境配置
NODE_ENV=production

# Website
NEXT_PUBLIC_SITE_URL_WEBSITE=https://dev.daodao.so
NEXT_PUBLIC_SITE_NAME_WEBSITE=島島阿學 (測試)

# Product
NEXT_PUBLIC_SITE_URL_PRODUCT=https://app-dev.daodao.so
NEXT_PUBLIC_SITE_NAME_PRODUCT=島島阿學 - 產品 (測試)

# API
NEXT_PUBLIC_API_URL=https://server.daoedu.tw/api/v1
NEXT_PUBLIC_BACKEND_URL=https://server.daoedu.tw

# 功能開關
NEXT_PUBLIC_ENABLE_ANALYTICS=false
NEXT_PUBLIC_ENABLE_PWA=false
NEXT_PUBLIC_DEBUG_MODE=true

# 其他配置
NEXT_TELEMETRY_DISABLED=1
```

### .env.feature.template（功能分支模板）

創建 `/Users/xiaoxu/Projects/daodao/daodao-f2e/.env.feature.template`:

```bash
# 功能分支環境配置模板
# 使用前請複製為 .env.feature 並替換 {branch}
NODE_ENV=production

# Website
NEXT_PUBLIC_SITE_URL_WEBSITE=https://feat-{branch}.daodao.so
NEXT_PUBLIC_SITE_NAME_WEBSITE=島島阿學 (功能測試)

# Product
NEXT_PUBLIC_SITE_URL_PRODUCT=https://app-feat-{branch}.daodao.so
NEXT_PUBLIC_SITE_NAME_PRODUCT=島島阿學 - 產品 (功能測試)

# API（使用測試環境後端）
NEXT_PUBLIC_API_URL=https://server.daoedu.tw/api/v1
NEXT_PUBLIC_BACKEND_URL=https://server.daoedu.tw

# 功能開關
NEXT_PUBLIC_ENABLE_ANALYTICS=false
NEXT_PUBLIC_ENABLE_PWA=false
NEXT_PUBLIC_DEBUG_MODE=true
NEXT_PUBLIC_FEATURE_BRANCH={branch}

# 其他配置
NEXT_TELEMETRY_DISABLED=1
```

---

## 部署腳本

### deploy.sh

創建 `/Users/xiaoxu/Projects/daodao/daodao-f2e/deploy.sh`:

```bash
#!/bin/bash

# ============================================
# 島島前端 Monorepo 多環境部署腳本
# ============================================

set -e

# 顏色輸出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ============================================
# 參數解析
# ============================================

ENVIRONMENT=${1:-dev}
APP_NAME=${2:-all}  # all, website, product
BRANCH=${3:-}

if [[ ! "$ENVIRONMENT" =~ ^(prod|dev|feature)$ ]]; then
    log_error "無效的環境參數: $ENVIRONMENT"
    echo "用法: $0 <prod|dev|feature> [all|website|product] [branch-name]"
    echo "範例:"
    echo "  $0 prod all                    # 部署正式環境所有應用"
    echo "  $0 prod website                # 只部署正式環境的 website"
    echo "  $0 dev product                 # 只部署測試環境的 product"
    echo "  $0 feature all update          # 部署功能分支所有應用"
    exit 1
fi

if [[ "$ENVIRONMENT" == "feature" && -z "$BRANCH" ]]; then
    log_error "功能分支環境需要指定分支名稱"
    echo "用法: $0 feature <all|website|product> <branch-name>"
    exit 1
fi

if [[ ! "$APP_NAME" =~ ^(all|website|product)$ ]]; then
    log_error "無效的應用名稱: $APP_NAME"
    echo "應用名稱必須是: all, website, product"
    exit 1
fi

# ============================================
# 環境變數設置
# ============================================

export DOCKER_HUB_USERNAME=${DOCKER_HUB_USERNAME:-"your-dockerhub-username"}
export COMMIT_SHA=$(git rev-parse --short HEAD)

if [[ "$ENVIRONMENT" == "feature" ]]; then
    export FEATURE_BRANCH=$BRANCH
    ENV_FILE=".env.feature"
    NETWORK="dev-daodao-network"
else
    ENV_FILE=".env.${ENVIRONMENT}"
    if [[ "$ENVIRONMENT" == "prod" ]]; then
        NETWORK="prod-daodao-network"
    else
        NETWORK="dev-daodao-network"
    fi
fi

# 決定要部署的服務
if [[ "$APP_NAME" == "all" ]]; then
    if [[ "$ENVIRONMENT" == "feature" ]]; then
        SERVICES="website_feat product_feat"
    else
        SERVICES="website_${ENVIRONMENT} product_${ENVIRONMENT}"
    fi
else
    if [[ "$ENVIRONMENT" == "feature" ]]; then
        SERVICES="${APP_NAME}_feat"
    else
        SERVICES="${APP_NAME}_${ENVIRONMENT}"
    fi
fi

log_info "=========================================="
log_info "島島前端 Monorepo 部署"
log_info "=========================================="
log_info "環境: $ENVIRONMENT"
log_info "應用: $APP_NAME"
log_info "服務: $SERVICES"
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
        sed -i.bak "s/{branch}/$BRANCH/g" .env.feature
        rm -f .env.feature.bak
        log_warning "請檢查並修改 .env.feature 中的配置"
    fi

    exit 1
fi

# ============================================
# 檢查後端網路是否存在
# ============================================

if ! docker network inspect "$NETWORK" &>/dev/null; then
    log_error "後端網路不存在: $NETWORK"
    log_warning "請先啟動後端服務創建網路:"
    log_warning "  cd /path/to/daodao-server && docker-compose up -d"
    exit 1
fi

log_success "後端網路檢查通過: $NETWORK"

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

for SERVICE in $SERVICES; do
    log_info "開始構建服務: $SERVICE"

    docker-compose build $SERVICE

    log_success "Docker 映像構建完成: $SERVICE"

    # 停止舊容器
    log_info "停止舊容器: $SERVICE"
    docker-compose stop $SERVICE || true
    docker-compose rm -f $SERVICE || true

    # 啟動新容器
    log_info "啟動新容器: $SERVICE"
    if [[ "$ENVIRONMENT" == "feature" ]]; then
        FEATURE_BRANCH=$BRANCH docker-compose up -d $SERVICE
    else
        docker-compose up -d $SERVICE
    fi

    log_success "服務啟動完成: $SERVICE"
done

# ============================================
# 等待健康檢查
# ============================================

log_info "等待容器健康檢查..."

MAX_WAIT=60
WAIT_COUNT=0

for SERVICE in $SERVICES; do
    CONTAINER_NAME=$(docker-compose ps -q $SERVICE | xargs docker inspect --format='{{.Name}}' | sed 's/\///')

    while [ $WAIT_COUNT -lt $MAX_WAIT ]; do
        HEALTH=$(docker inspect --format='{{.State.Health.Status}}' $CONTAINER_NAME 2>/dev/null || echo "unknown")

        if [ "$HEALTH" = "healthy" ]; then
            log_success "容器健康檢查通過: $CONTAINER_NAME"
            break
        fi

        echo -n "."
        sleep 2
        WAIT_COUNT=$((WAIT_COUNT + 2))
    done

    echo ""

    if [ $WAIT_COUNT -ge $MAX_WAIT ]; then
        log_warning "健康檢查超時: $CONTAINER_NAME"
        log_info "請手動檢查容器狀態: docker logs $CONTAINER_NAME"
    fi

    WAIT_COUNT=0
done

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
for SERVICE in $SERVICES; do
    docker-compose ps $SERVICE
done

log_info ""
log_info "訪問地址:"
if [[ "$ENVIRONMENT" == "prod" ]]; then
    if [[ "$APP_NAME" == "all" || "$APP_NAME" == "website" ]]; then
        log_info "  Website: https://daodao.so"
    fi
    if [[ "$APP_NAME" == "all" || "$APP_NAME" == "product" ]]; then
        log_info "  Product: https://app.daodao.so"
    fi
elif [[ "$ENVIRONMENT" == "dev" ]]; then
    if [[ "$APP_NAME" == "all" || "$APP_NAME" == "website" ]]; then
        log_info "  Website: https://dev.daodao.so"
    fi
    if [[ "$APP_NAME" == "all" || "$APP_NAME" == "product" ]]; then
        log_info "  Product: https://app-dev.daodao.so"
    fi
else
    if [[ "$APP_NAME" == "all" || "$APP_NAME" == "website" ]]; then
        log_info "  Website: https://feat-$BRANCH.daodao.so"
    fi
    if [[ "$APP_NAME" == "all" || "$APP_NAME" == "product" ]]; then
        log_info "  Product: https://app-feat-$BRANCH.daodao.so"
    fi
fi

log_success "=========================================="
```

使腳本可執行:

```bash
chmod +x /Users/xiaoxu/Projects/daodao/daodao-f2e/deploy.sh
```

---

## 後端 Nginx 配置

在 `/Users/xiaoxu/Projects/daodao/daodao-server/nginx.conf` 中添加前端代理配置：

```nginx
http {
    # ============================================
    # 正式環境 - Website (daodao.so)
    # ============================================
    server {
        listen 80;
        server_name daodao.so www.daodao.so;
        return 301 https://daodao.so$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name daodao.so www.daodao.so;

        ssl_certificate /etc/letsencrypt/live/daodao.so/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/daodao.so/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;

        # www 重定向
        if ($host = www.daodao.so) {
            return 301 https://daodao.so$request_uri;
        }

        location / {
            proxy_pass http://website_prod:3000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }
    }

    # ============================================
    # 正式環境 - Product (app.daodao.so)
    # ============================================
    server {
        listen 80;
        server_name app.daodao.so;
        return 301 https://app.daodao.so$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name app.daodao.so;

        ssl_certificate /etc/letsencrypt/live/daodao.so/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/daodao.so/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;

        location / {
            proxy_pass http://product_prod:3001;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }

    # ============================================
    # 測試環境 - Website (dev.daodao.so)
    # ============================================
    server {
        listen 443 ssl http2;
        server_name dev.daodao.so;

        ssl_certificate /etc/letsencrypt/live/daodao.so/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/daodao.so/privkey.pem;

        location / {
            proxy_pass http://website_dev:3000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
    }

    # ============================================
    # 測試環境 - Product (app-dev.daodao.so)
    # ============================================
    server {
        listen 443 ssl http2;
        server_name app-dev.daodao.so;

        ssl_certificate /etc/letsencrypt/live/daodao.so/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/daodao.so/privkey.pem;

        location / {
            proxy_pass http://product_dev:3001;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
    }

    # ============================================
    # 功能分支 - Website (feat-*.daodao.so)
    # ============================================
    server {
        listen 443 ssl http2;
        server_name ~^feat-(?<branch>.+)\.daodao\.so$;

        ssl_certificate /etc/letsencrypt/live/daodao.so/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/daodao.so/privkey.pem;

        location / {
            # 注意：需要為每個功能分支手動配置容器名稱
            # 或使用統一的容器名稱通過環境變數區分
            proxy_pass http://website_feat_${branch}:3000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
    }

    # ============================================
    # 功能分支 - Product (app-feat-*.daodao.so)
    # ============================================
    server {
        listen 443 ssl http2;
        server_name ~^app-feat-(?<branch>.+)\.daodao\.so$;

        ssl_certificate /etc/letsencrypt/live/daodao.so/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/daodao.so/privkey.pem;

        location / {
            proxy_pass http://product_feat_${branch}:3001;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
    }
}
```

---

## 部署流程

### 1. 準備工作

```bash
# 確保後端服務已啟動（創建網路）
cd /path/to/daodao-server
docker-compose up -d

# 確認網路存在
docker network ls | grep daodao-network
```

### 2. 部署正式環境

```bash
cd /Users/xiaoxu/Projects/daodao/daodao-f2e

# 部署所有應用
./deploy.sh prod all

# 或單獨部署
./deploy.sh prod website
./deploy.sh prod product
```

### 3. 部署測試環境

```bash
# 部署所有應用
./deploy.sh dev all

# 或單獨部署
./deploy.sh dev website
./deploy.sh dev product
```

### 4. 部署功能分支

```bash
# 部署功能分支所有應用
./deploy.sh feature all update

# 或單獨部署
./deploy.sh feature website update
./deploy.sh feature product update
```

---

## 監控與故障排除

### 查看容器狀態

```bash
# 查看所有前端容器
docker ps | grep -E "website|product"

# 查看特定環境
docker ps | grep -E "website_prod|product_prod"
docker ps | grep -E "website_dev|product_dev"
```

### 查看日誌

```bash
# Website 日誌
docker logs -f website_prod
docker logs -f website_dev

# Product 日誌
docker logs -f product_prod
docker logs -f product_dev
```

### 健康檢查

```bash
# 測試 Website
curl https://daodao.so/api/health
curl https://dev.daodao.so/api/health

# 測試 Product
curl https://app.daodao.so/api/health
curl https://app-dev.daodao.so/api/health
```

---

**文件維護者**：島島技術團隊
**最後更新**：2026-01-08
