# 前端整合至現有 Docker 架構指南

## 當前架構分析

### 現有 Docker Compose 架構
```
/Users/xiaoxu/Projects/daodao/daodao-server/
├── docker-compose.yaml
│   ├── nginx (已存在) - Port 80, 443
│   ├── prod_app (後端生產) - Port 3000
│   ├── dev_app (後端開發) - Port 3000
│   ├── mongo_prod + mongo_dev
│   └── redis_prod + redis_dev
└── nginx.conf (已存在)
```

### 現有網路配置
- `prod-daodao-network` (external) - 生產環境網路
- `dev-daodao-network` (external) - 開發環境網路
- `prod_network` - 生產內部網路
- `dev_network` - 開發內部網路

### 現有 Nginx 反向代理
```nginx
Port 80:
  - dao-server.daoedu.tw → prod_app:3000 (生產後端)
  - server.daoedu.tw → dev_app:3000 (開發後端)
  - n8n.daoedu.tw → n8n:5678
```

---

## 整合策略

### 方案：在現有 docker-compose.yaml 中新增前端服務

**優勢**：
- ✅ 使用現有 nginx 容器（無需新建）
- ✅ 共用現有網路配置
- ✅ 統一管理所有服務
- ✅ 簡化部署流程

**架構圖**：
```
┌────────────────────────────────────────────────────────┐
│              Linode VPS                                │
│                                                        │
│  ┌──────────────────────────────────────────────────┐ │
│  │  Nginx Container (已存在)                        │ │
│  │  Port 80, 443                                    │ │
│  └────┬─────────────┬─────────────┬─────────────────┘ │
│       │             │             │                    │
│  ┌────▼────┐   ┌────▼────┐   ┌───▼──────┐           │
│  │Frontend │   │prod_app │   │dev_app   │           │
│  │(新增)   │   │(已存在) │   │(已存在)  │           │
│  │Port 3000│   │Port 3000│   │Port 3000 │           │
│  └─────────┘   └────┬────┘   └────┬─────┘           │
│                     │              │                  │
│       ┌─────────────┴──────────────┴─────────┐       │
│       │  MongoDB + Redis (已存在)            │       │
│       └───────────────────────────────────────┘       │
│                                                        │
│  Networks: prod-daodao-network, dev-daodao-network   │
└────────────────────────────────────────────────────────┘
```

---

## 整合步驟

### 步驟一：建立前端 Dockerfile

在 `/Users/xiaoxu/Projects/daodao/daodao-f2e/` 建立：

```dockerfile
# Dockerfile
# ==================== 依賴安裝階段 ====================
FROM node:20.19.4-alpine AS deps

RUN apk add --no-cache libc6-compat
WORKDIR /app

# 安裝 pnpm
RUN npm install -g pnpm@10.15.0

# 複製依賴相關檔案
COPY package.json pnpm-lock.yaml ./
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

# 複製必要檔案
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

### 步驟二：修改 next.config.js

啟用 standalone 模式：

```javascript
// next.config.js
const config = {
  // ... 其他配置保持不變

  // ✅ 新增：啟用 standalone 輸出模式
  output: 'standalone',

  // ✅ 移除 Cloudflare 特定設定（可選）
  // images: {
  //   unoptimized: true,
  // },
};

module.exports = withNextIntl(withPWA(withBundleAnalyzer(config)));
```

### 步驟三：在現有 docker-compose.yaml 中新增前端服務

編輯 `/Users/xiaoxu/Projects/daodao/daodao-server/docker-compose.yaml`：

```yaml
services:
  # ... 現有的 prod_app, dev_app, mongo, redis 服務保持不變 ...

  # ==================== 新增：前端服務 ====================
  prod_frontend:
    build:
      context: ../daodao-f2e
      dockerfile: Dockerfile
    image: ${DOCKER_HUB_USERNAME}/frontend:${IMAGE_TAG:-prod}${COMMIT_SHA:+-}${COMMIT_SHA}
    container_name: prod_frontend
    restart: unless-stopped
    env_file:
      - ../daodao-f2e/.env.production
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=http://prod_app:3000
      - NEXT_PUBLIC_ENVIRONMENT=production
    networks:
      - prod-daodao-network
    depends_on:
      - prod_app
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  # 可選：開發環境前端（如果需要）
  dev_frontend:
    build:
      context: ../daodao-f2e
      dockerfile: Dockerfile
    image: ${DOCKER_HUB_USERNAME}/frontend:${IMAGE_TAG:-dev}${COMMIT_SHA:+-}${COMMIT_SHA}
    container_name: dev_frontend
    restart: unless-stopped
    env_file:
      - ../daodao-f2e/.env.development
    environment:
      - NODE_ENV=development
      - NEXT_PUBLIC_API_URL=http://dev_app:3000
      - NEXT_PUBLIC_ENVIRONMENT=development
    networks:
      - dev-daodao-network
    depends_on:
      - dev_app
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  # ==================== 現有 Nginx 服務保持不變 ====================
  nginx:
    image: nginx:latest
    container_name: nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      # ✅ 新增：掛載 SSL 憑證（如果使用 Let's Encrypt）
      - /etc/letsencrypt:/etc/letsencrypt:ro
    environment:
      - APP_ENV=${APP_ENV}
    depends_on:
      - prod_app
      - dev_app
      - prod_frontend  # ✅ 新增依賴
      # - dev_frontend  # 如果使用開發前端
    networks:
      - prod-daodao-network
      - dev-daodao-network

# volumes 和 networks 保持不變
```

### 步驟四：修改 nginx.conf

編輯 `/Users/xiaoxu/Projects/daodao/daodao-server/nginx.conf`，添加前端配置：

```nginx
http {
    # ... 現有配置保持不變 ...

    # ==================== 新增：前端配置 ====================

    # v2.daoedu.tw (前端生產環境)
    server {
        listen 80;
        server_name v2.daoedu.tw www.v2.daoedu.tw;

        # Let's Encrypt ACME challenge
        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        # HTTP -> HTTPS 重定向
        location / {
            return 301 https://$server_name$request_uri;
        }
    }

    server {
        listen 443 ssl http2;
        listen [::]:443 ssl http2;
        server_name v2.daoedu.tw www.v2.daoedu.tw;

        # SSL 憑證（需要先取得）
        ssl_certificate /etc/letsencrypt/live/v2.daoedu.tw/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/v2.daoedu.tw/privkey.pem;

        # SSL 安全設定
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256';
        ssl_prefer_server_ciphers off;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;

        # 安全標頭
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;

        # Next.js 靜態資源 - 長期快取
        location /_next/static {
            proxy_pass http://prod_frontend:3000;
            proxy_http_version 1.1;
            expires 365d;
            add_header Cache-Control "public, immutable";
            access_log off;
        }

        # 靜態資源
        location ~* \.(jpg|jpeg|png|gif|ico|svg|webp|woff|woff2|ttf|eot)$ {
            proxy_pass http://prod_frontend:3000;
            proxy_http_version 1.1;
            expires 7d;
            add_header Cache-Control "public";
            access_log off;
        }

        # API 代理到後端
        location /api {
            proxy_pass http://prod_app:3000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            proxy_connect_timeout 300s;
            proxy_send_timeout 300s;
            proxy_read_timeout 300s;
        }

        # Next.js 應用主體
        location / {
            proxy_pass http://prod_frontend:3000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }
    }

    # 可選：開發環境前端
    # server {
    #     listen 80;
    #     server_name dev.v2.daoedu.tw;
    #
    #     location / {
    #         proxy_pass http://dev_frontend:3000;
    #         proxy_http_version 1.1;
    #         proxy_set_header Host $host;
    #         proxy_set_header X-Real-IP $remote_addr;
    #         proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    #     }
    # }

    # ... 現有的後端配置保持不變 ...
}
```

### 步驟五：SSL 憑證設定

在 VPS 上取得 SSL 憑證：

```bash
# 1. 暫時停止 nginx 容器
cd /Users/xiaoxu/Projects/daodao/daodao-server
docker-compose stop nginx

# 2. 安裝 Certbot (如果尚未安裝)
sudo apt install certbot -y

# 3. 取得憑證
sudo certbot certonly --standalone -d v2.daoedu.tw -d www.v2.daoedu.tw

# 4. 重啟 nginx 容器
docker-compose up -d nginx

# 5. 設定自動更新
sudo crontab -e
# 加入：
# 0 2 * * 0 certbot renew --quiet --post-hook "docker-compose -f /Users/xiaoxu/Projects/daodao/daodao-server/docker-compose.yaml restart nginx"
```

### 步驟六：建置與部署

```bash
# 1. 進入專案目錄
cd /Users/xiaoxu/Projects/daodao/daodao-server

# 2. 建置前端映像檔
docker-compose build prod_frontend

# 3. 啟動所有服務
docker-compose up -d

# 4. 查看狀態
docker-compose ps

# 5. 查看前端日誌
docker-compose logs -f prod_frontend

# 6. 測試連線
curl http://localhost:3000  # 測試前端容器
```

---

## 部署腳本

### 自動部署腳本

```bash
#!/bin/bash
# /Users/xiaoxu/Projects/daodao/daodao-server/deploy-frontend.sh

set -e

echo "🚀 Deploying frontend..."

cd /Users/xiaoxu/Projects/daodao/daodao-server

# 1. 拉取最新前端程式碼
echo "📥 Pulling latest frontend code..."
cd ../daodao-f2e
git fetch origin
git reset --hard origin/prod

# 2. 返回 server 目錄
cd ../daodao-server

# 3. 建置並重啟前端容器
echo "🔨 Building and restarting frontend..."
docker-compose up -d --no-deps --build prod_frontend

# 4. 等待啟動
echo "⏳ Waiting for frontend to start..."
sleep 10

# 5. 檢查狀態
if docker ps | grep -q "prod_frontend"; then
    echo "✅ Frontend deployed successfully!"
    docker-compose ps prod_frontend
    docker-compose logs --tail=20 prod_frontend
else
    echo "❌ Frontend deployment failed!"
    docker-compose logs prod_frontend
    exit 1
fi
```

```bash
chmod +x /Users/xiaoxu/Projects/daodao/daodao-server/deploy-frontend.sh
```

### 回滾腳本

```bash
#!/bin/bash
# /Users/xiaoxu/Projects/daodao/daodao-server/rollback-frontend.sh

set -e

echo "🔄 Rolling back frontend..."

cd /Users/xiaoxu/Projects/daodao/daodao-f2e

# 列出最近的 commits
echo "Recent commits:"
git log --oneline -5

# 輸入要回滾的 commit
read -p "Enter commit hash to rollback to: " COMMIT_HASH

if [ -z "$COMMIT_HASH" ]; then
    echo "❌ No commit hash provided"
    exit 1
fi

# 回滾
git reset --hard $COMMIT_HASH

# 重新建置部署
cd ../daodao-server
docker-compose up -d --no-deps --build prod_frontend

echo "✅ Rollback completed to $COMMIT_HASH"
docker-compose ps prod_frontend
```

```bash
chmod +x /Users/xiaoxu/Projects/daodao/daodao-server/rollback-frontend.sh
```

---

## GitHub Actions 整合

### 修改前端專案的 CI/CD

在 `daodao-f2e/.github/workflows/deploy-linode.yml`：

```yaml
name: Deploy Frontend to Linode

on:
  push:
    branches:
      - prod
  workflow_dispatch:

env:
  HUSKY: 0

jobs:
  continuous_integration:
    uses: ./.github/workflows/continuous-integration.yml
    secrets: inherit

  deploy:
    name: Deploy to Linode VPS
    runs-on: ubuntu-latest
    needs: continuous_integration
    if: needs.continuous_integration.result == 'success'

    steps:
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1.2.0
        with:
          host: ${{ secrets.LINODE_HOST }}
          username: ${{ secrets.LINODE_USER }}
          key: ${{ secrets.LINODE_SSH_KEY }}
          script: |
            cd /Users/xiaoxu/Projects/daodao/daodao-server
            ./deploy-frontend.sh

      - name: Health Check
        uses: appleboy/ssh-action@v1.2.0
        with:
          host: ${{ secrets.LINODE_HOST }}
          username: ${{ secrets.LINODE_USER }}
          key: ${{ secrets.LINODE_SSH_KEY }}
          script: |
            # 檢查容器狀態
            docker ps | grep prod_frontend

            # 檢查服務健康
            curl -f http://localhost:3000 || exit 1

      - name: Send notification
        if: always()
        uses: ./.github/actions/notification
        with:
          TYPE: ${{ job.status }}
          TITLE: 前端部署 ${{ job.status }}
          DESCRIPTION: |
            Branch: ${{ github.ref_name }}
            Commit: ${{ github.sha }}
          DISCORD_WEBHOOK_URL: ${{ secrets.DISCORD_WEBHOOK_URL }}
```

---

## 測試與驗證

### 本地測試清單

```bash
# 1. 檢查容器狀態
docker-compose ps

# 2. 測試前端容器
docker exec -it prod_frontend sh
wget -O- http://localhost:3000
exit

# 3. 測試容器間通訊
docker exec -it prod_frontend sh
wget -O- http://prod_app:3000/api/v1/health
exit

# 4. 測試 Nginx 配置
docker exec -it nginx nginx -t

# 5. 測試 Nginx 日誌
docker-compose logs nginx | grep "v2.daoedu.tw"
```

### 使用 hosts 測試

```bash
# 編輯本地 hosts 檔案
# Linux/Mac: /etc/hosts
# Windows: C:\Windows\System32\drivers\etc\hosts

your-linode-ip  v2.daoedu.tw
your-linode-ip  www.v2.daoedu.tw

# 瀏覽器測試
# https://v2.daoedu.tw

# curl 測試
curl -I https://v2.daoedu.tw
curl https://v2.daoedu.tw/api/v1/health
```

---

## 監控命令

```bash
# 查看所有容器
docker-compose ps

# 查看前端日誌
docker-compose logs -f prod_frontend

# 查看 Nginx 日誌
docker-compose logs -f nginx

# 查看資源使用
docker stats prod_frontend prod_app nginx

# 檢查網路
docker network inspect prod-daodao-network
```

---

## 常見問題排解

### 問題 1：前端容器無法啟動

```bash
# 查看詳細日誌
docker-compose logs prod_frontend

# 檢查建置錯誤
docker-compose build prod_frontend --no-cache

# 手動測試
docker run --rm -it daodao-frontend:latest sh
```

### 問題 2：Nginx 502 Bad Gateway

```bash
# 檢查前端容器是否運行
docker ps | grep prod_frontend

# 測試容器間連線
docker exec -it nginx ping prod_frontend

# 檢查 Nginx 配置
docker exec -it nginx nginx -t

# 重啟 Nginx
docker-compose restart nginx
```

### 問題 3：SSL 憑證問題

```bash
# 檢查憑證
sudo certbot certificates

# 手動更新
sudo certbot renew --force-renewal

# 檢查 Nginx 掛載
docker inspect nginx | grep -A 10 Mounts
```

---

## 與現有後端整合的優勢

### ✅ 統一管理
- 一個 `docker-compose.yaml` 管理前後端
- 統一的部署流程
- 共用網路和資源

### ✅ 網路優化
- 前後端在同一 Docker 網路
- 容器間直接通訊，無需經過外部網路
- API 呼叫延遲更低

### ✅ 運維簡化
```bash
# 一次啟動所有服務
docker-compose up -d

# 一次查看所有日誌
docker-compose logs -f

# 一次重啟所有服務
docker-compose restart
```

### ✅ 資源共享
- 共用 Nginx 容器
- 共用網路配置
- 共用 SSL 憑證

---

## 下一步

### 完成整合後
1. ✅ 更新 DNS 記錄指向 Linode VPS
2. ✅ 監控服務穩定性 24-48 小時
3. ✅ 設定 Cloudflare 為 CDN (可選)
4. ✅ 配置監控告警

### 可選優化
1. **Cloudflare CDN**：保留 Cloudflare 作為 CDN 層
2. **多環境支援**：添加 staging 環境
3. **自動化測試**：整合 E2E 測試
4. **監控升級**：Prometheus + Grafana

---

**文件版本**：v1.0
**建立日期**：2025-12-23
**適用專案**：daodao-f2e + daodao-server (現有 Docker 架構)
