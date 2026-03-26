# Traefik 完整介紹與實踐指南

**文件版本**：v1.0
**最後更新**：2025-12-23
**適用於**：島島前端 Linode 部署專案

---

## 📋 目錄

1. [什麼是 Traefik？](#什麼是-traefik)
2. [為什麼選擇 Traefik？](#為什麼選擇-traefik)
3. [核心概念](#核心概念)
4. [在島島專案中的應用場景](#在島島專案中的應用場景)
5. [完整配置示例](#完整配置示例)
6. [進階功能](#進階功能)
7. [監控與除錯](#監控與除錯)
8. [常見問題與故障排除](#常見問題與故障排除)
9. [最佳實踐](#最佳實踐)
10. [參考資源](#參考資源)

---

## 什麼是 Traefik？

### 簡介

**Traefik**（讀音：traffic）是一個現代化的 HTTP 反向代理和負載均衡器，專為微服務和容器化環境設計。它是雲原生應用的邊緣路由器（Edge Router），能夠自動發現服務並動態配置路由規則。

### 主要特性

- ⚡ **自動服務發現**：支援 Docker、Kubernetes、Consul 等
- 🔄 **動態配置**：無需重啟即可更新路由規則
- 🔒 **自動 SSL/TLS**：整合 Let's Encrypt，自動申請和更新憑證
- 📊 **內建儀表板**：實時監控路由和服務狀態
- 🎯 **負載均衡**：多種負載均衡策略
- 🔌 **中間件支援**：壓縮、重定向、認證、限流等
- 📝 **配置方式多樣**：支援 YAML、TOML、CLI 參數、Docker labels

### 與傳統 Nginx 的比較

| 特性 | Traefik | Nginx |
|------|---------|-------|
| 配置方式 | 動態，基於 labels/標籤 | 靜態，需手動編輯配置文件 |
| 服務發現 | 自動 | 需手動配置 |
| SSL 管理 | 自動（Let's Encrypt） | 需手動配置 Certbot |
| 重新載入 | 不需要重啟 | 需要 reload/restart |
| 學習曲線 | 中等 | 較陡 |
| 容器原生 | 是 | 否（需額外配置） |
| 效能 | 優秀 | 卓越 |
| 成熟度 | 較新（2015-） | 非常成熟（2004-） |

**結論**：
- **Nginx**：適合靜態、固定的環境，效能極致
- **Traefik**：適合動態、容器化環境，配置簡單

---

## 為什麼選擇 Traefik？

### 在島島專案中的優勢

#### 1. 動態功能分支部署

**問題**：需要頻繁部署/銷毀功能分支環境（feat-*.daodao.so）

**Traefik 解決方案**：
- 自動識別新容器
- 自動配置路由規則
- 自動申請 SSL 憑證
- 銷毀容器時自動清理路由

**對比 Nginx 方案**：
```bash
# 使用 Nginx 需要：
1. 手動編輯 nginx.conf
2. 手動申請 SSL 憑證
3. 重新載入 Nginx
4. 手動清理過期配置

# 使用 Traefik 只需：
docker-compose up -d  # 一行命令搞定！
```

#### 2. 簡化維護成本

```yaml
# Traefik：在 docker-compose.yaml 中直接定義
services:
  daodao-frontend-feat-update:
    labels:
      - "traefik.http.routers.feat-update.rule=Host(`feat-update.daodao.so`)"
      - "traefik.http.routers.feat-update.tls.certresolver=letsencrypt"
```

vs

```nginx
# Nginx：需要單獨的配置文件
server {
    listen 443 ssl;
    server_name feat-update.daodao.so;
    ssl_certificate /etc/letsencrypt/live/feat-update.daodao.so/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/feat-update.daodao.so/privkey.pem;
    # ... 更多配置
}
```

#### 3. 零停機更新

Traefik 會自動檢測容器狀態變化，無需手動 reload，避免短暫的服務中斷。

#### 4. 內建監控

提供 Web UI 儀表板（預設在 8080 端口），可實時查看：
- 所有路由規則
- 服務健康狀態
- 請求統計
- SSL 憑證狀態

---

## 核心概念

理解 Traefik 的幾個核心概念，能幫助你更好地配置和使用它。

### 1. EntryPoints（入口點）

**定義**：Traefik 監聽的網路端口

```yaml
entryPoints:
  web:
    address: ":80"      # HTTP 入口
  websecure:
    address: ":443"     # HTTPS 入口
  dashboard:
    address: ":8080"    # 儀表板入口
```

**功能**：
- 接收外部請求
- 可設定不同協議（HTTP、HTTPS、TCP、UDP）
- 可配置全域中間件

### 2. Routers（路由器）

**定義**：定義請求如何被路由到後端服務

```yaml
# 靜態配置（traefik.yaml）
http:
  routers:
    my-router:
      rule: "Host(`example.com`)"
      service: my-service
      entryPoints:
        - websecure
```

```yaml
# 動態配置（Docker labels）
labels:
  - "traefik.http.routers.my-router.rule=Host(`example.com`)"
  - "traefik.http.routers.my-router.entrypoints=websecure"
```

**路由規則**：
- `Host()`：基於域名
- `Path()`：基於路徑
- `PathPrefix()`：基於路徑前綴
- `Method()`：基於 HTTP 方法
- 可組合：`Host(`example.com`) && Path(`/api`)`

### 3. Services（服務）

**定義**：定義後端服務的實際位置

```yaml
labels:
  - "traefik.http.services.my-service.loadbalancer.server.port=3000"
```

**功能**：
- 定義後端伺服器位置和端口
- 支援負載均衡
- 健康檢查
- Sticky Sessions

### 4. Middlewares（中間件）

**定義**：處理請求的中間層，可以修改請求或響應

```yaml
labels:
  # 壓縮
  - "traefik.http.middlewares.compress.compress=true"

  # 重定向 HTTP 到 HTTPS
  - "traefik.http.middlewares.redirect-to-https.redirectscheme.scheme=https"

  # 添加標頭
  - "traefik.http.middlewares.security-headers.headers.customResponseHeaders.X-Frame-Options=DENY"

  # 基本認證
  - "traefik.http.middlewares.auth.basicauth.users=user:password"

  # 限流
  - "traefik.http.middlewares.ratelimit.ratelimit.average=100"
```

### 5. Providers（提供者）

**定義**：Traefik 從哪裡獲取配置

支援的提供者：
- **Docker**：從 Docker 容器的 labels 讀取配置
- **File**：從文件系統讀取配置
- **Kubernetes**：從 K8s Ingress 讀取配置
- **Consul**、**Etcd**：從服務發現系統讀取配置

### 6. 配置架構圖

```
                        Traefik
                           |
        +------------------+------------------+
        |                  |                  |
   EntryPoints         Routers          Middlewares
   (監聽端口)           (路由規則)         (處理邏輯)
        |                  |                  |
        +------------------+------------------+
                           |
                       Services
                    (後端服務定義)
                           |
                    實際容器/服務
```

---

## 在島島專案中的應用場景

### 場景 1：功能分支動態部署

**需求**：開發人員推送 `feat/update` 分支，自動部署到 `feat-update.daodao.so`

#### 解決方案

**1. Traefik 主配置**

創建 `/path/to/traefik/docker-compose.yaml`：

```yaml
version: '3.8'

services:
  traefik:
    image: traefik:v2.10
    container_name: traefik
    restart: unless-stopped
    security_opt:
      - no-new-privileges:true
    ports:
      - "80:80"
      - "443:443"
      - "8080:8080"  # 儀表板（可選）
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./traefik.yaml:/traefik.yaml:ro
      - ./acme.json:/acme.json
    networks:
      - traefik-network
    labels:
      # 啟用 Traefik 儀表板
      - "traefik.enable=true"
      - "traefik.http.routers.dashboard.rule=Host(`traefik.daodao.so`)"
      - "traefik.http.routers.dashboard.service=api@internal"
      - "traefik.http.routers.dashboard.entrypoints=websecure"
      - "traefik.http.routers.dashboard.tls.certresolver=letsencrypt"
      # 基本認證（可選）
      - "traefik.http.routers.dashboard.middlewares=auth"
      - "traefik.http.middlewares.auth.basicauth.users=admin:$$apr1$$..."

networks:
  traefik-network:
    external: true
```

**2. Traefik 靜態配置**

創建 `traefik.yaml`：

```yaml
# 入口點配置
entryPoints:
  web:
    address: ":80"
    http:
      redirections:
        entryPoint:
          to: websecure
          scheme: https
  websecure:
    address: ":443"

# Providers 配置
providers:
  docker:
    endpoint: "unix:///var/run/docker.sock"
    exposedByDefault: false  # 只處理有 traefik.enable=true 的容器
    network: traefik-network

# Let's Encrypt 配置
certificatesResolvers:
  letsencrypt:
    acme:
      email: admin@daodao.so
      storage: /acme.json
      httpChallenge:
        entryPoint: web

# API 和儀表板
api:
  dashboard: true
  insecure: false  # 透過 HTTPS 訪問儀表板

# 日誌
log:
  level: INFO

accessLog: {}
```

**3. 前端功能分支配置**

在 `daodao-f2e/docker-compose.yaml` 中：

```yaml
version: '3.8'

services:
  daodao-frontend-feat-${FEATURE_BRANCH:-default}:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: daodao-frontend-feat-${FEATURE_BRANCH:-default}
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=https://api.daodao.so
    networks:
      - traefik-network
    labels:
      # 啟用 Traefik
      - "traefik.enable=true"

      # 路由規則
      - "traefik.http.routers.feat-${FEATURE_BRANCH:-default}.rule=Host(`feat-${FEATURE_BRANCH:-default}.daodao.so`)"
      - "traefik.http.routers.feat-${FEATURE_BRANCH:-default}.entrypoints=websecure"
      - "traefik.http.routers.feat-${FEATURE_BRANCH:-default}.tls.certresolver=letsencrypt"

      # 服務定義
      - "traefik.http.services.feat-${FEATURE_BRANCH:-default}.loadbalancer.server.port=3000"

      # 中間件：壓縮
      - "traefik.http.routers.feat-${FEATURE_BRANCH:-default}.middlewares=compress"
      - "traefik.http.middlewares.compress.compress=true"

networks:
  traefik-network:
    external: true
```

**4. 部署腳本**

創建 `deploy-feature.sh`：

```bash
#!/bin/bash

BRANCH=$1

if [ -z "$BRANCH" ]; then
  echo "Usage: ./deploy-feature.sh <branch-name>"
  echo "Example: ./deploy-feature.sh update"
  exit 1
fi

# 導出環境變數
export FEATURE_BRANCH=$BRANCH

# 構建並啟動容器
echo "🚀 部署功能分支: feat-$BRANCH"
docker-compose up -d --build

# 檢查狀態
echo "✅ 部署完成！訪問 https://feat-$BRANCH.daodao.so"
docker-compose ps
```

**使用方式**：

```bash
# 部署功能分支
./deploy-feature.sh update
# → 自動可在 https://feat-update.daodao.so 訪問

# 銷毀功能分支
docker-compose down
# → 路由和 SSL 自動清理
```

### 場景 2：多環境部署（正式 + 測試）

**需求**：同時運行正式環境（daodao.so）和測試環境（dev.daodao.so）

#### docker-compose.yaml

```yaml
version: '3.8'

services:
  # 正式環境
  daodao-frontend-prod:
    build: .
    container_name: daodao-frontend-prod
    restart: unless-stopped
    env_file:
      - .env.prod
    networks:
      - traefik-network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.prod.rule=Host(`daodao.so`) || Host(`www.daodao.so`)"
      - "traefik.http.routers.prod.entrypoints=websecure"
      - "traefik.http.routers.prod.tls.certresolver=letsencrypt"
      - "traefik.http.services.prod.loadbalancer.server.port=3000"

  # 測試環境
  daodao-frontend-dev:
    build: .
    container_name: daodao-frontend-dev
    restart: unless-stopped
    env_file:
      - .env.dev
    networks:
      - traefik-network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.dev.rule=Host(`dev.daodao.so`)"
      - "traefik.http.routers.dev.entrypoints=websecure"
      - "traefik.http.routers.dev.tls.certresolver=letsencrypt"
      - "traefik.http.services.dev.loadbalancer.server.port=3000"

networks:
  traefik-network:
    external: true
```

---

## 完整配置示例

### 初始設置步驟

#### 1. 創建必要目錄和文件

```bash
# 創建 Traefik 配置目錄
mkdir -p ~/traefik
cd ~/traefik

# 創建 acme.json（存儲 SSL 憑證）
touch acme.json
chmod 600 acme.json

# 創建網路
docker network create traefik-network
```

#### 2. 創建 traefik.yaml

```yaml
# ~/traefik/traefik.yaml
entryPoints:
  web:
    address: ":80"
    http:
      redirections:
        entryPoint:
          to: websecure
          scheme: https
          permanent: true

  websecure:
    address: ":443"
    http:
      tls:
        certResolver: letsencrypt

providers:
  docker:
    endpoint: "unix:///var/run/docker.sock"
    exposedByDefault: false
    network: traefik-network
    watch: true

certificatesResolvers:
  letsencrypt:
    acme:
      email: your-email@example.com  # 改成你的 email
      storage: /acme.json
      httpChallenge:
        entryPoint: web

api:
  dashboard: true
  insecure: false

log:
  level: INFO
  filePath: /var/log/traefik/traefik.log

accessLog:
  filePath: /var/log/traefik/access.log
```

#### 3. 創建 docker-compose.yaml

```yaml
# ~/traefik/docker-compose.yaml
version: '3.8'

services:
  traefik:
    image: traefik:v2.10
    container_name: traefik
    restart: unless-stopped
    security_opt:
      - no-new-privileges:true
    ports:
      - "80:80"
      - "443:443"
      - "8080:8080"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./traefik.yaml:/traefik.yaml:ro
      - ./acme.json:/acme.json
      - ./logs:/var/log/traefik
    networks:
      - traefik-network
    labels:
      - "traefik.enable=true"
      # 儀表板路由
      - "traefik.http.routers.dashboard.rule=Host(`traefik.your-domain.com`)"
      - "traefik.http.routers.dashboard.service=api@internal"
      - "traefik.http.routers.dashboard.entrypoints=websecure"
      - "traefik.http.routers.dashboard.tls.certresolver=letsencrypt"
      # 基本認證
      - "traefik.http.routers.dashboard.middlewares=dashboard-auth"
      - "traefik.http.middlewares.dashboard-auth.basicauth.users=admin:$$apr1$$8evjzRBW$$Xn7j5EQx6wQXiSHQ3K8lT/"
      # 生成密碼：echo $(htpasswd -nb admin password) | sed -e s/\\$/\\$\\$/g

networks:
  traefik-network:
    external: true
```

#### 4. 啟動 Traefik

```bash
cd ~/traefik
docker-compose up -d

# 檢查狀態
docker-compose ps
docker-compose logs -f
```

#### 5. 驗證安裝

訪問 `https://traefik.your-domain.com`，使用設定的帳號密碼登入儀表板。

---

## 進階功能

### 1. 中間件：安全標頭

```yaml
labels:
  - "traefik.http.middlewares.secure-headers.headers.sslredirect=true"
  - "traefik.http.middlewares.secure-headers.headers.stsSeconds=31536000"
  - "traefik.http.middlewares.secure-headers.headers.stsIncludeSubdomains=true"
  - "traefik.http.middlewares.secure-headers.headers.stsPreload=true"
  - "traefik.http.middlewares.secure-headers.headers.forceSTSHeader=true"
  - "traefik.http.middlewares.secure-headers.headers.customResponseHeaders.X-Robots-Tag=none,noarchive,nosnippet,notranslate,noimageindex"
  - "traefik.http.middlewares.secure-headers.headers.customFrameOptionsValue=SAMEORIGIN"
```

### 2. 限流

```yaml
labels:
  - "traefik.http.middlewares.ratelimit.ratelimit.average=100"
  - "traefik.http.middlewares.ratelimit.ratelimit.burst=50"
  - "traefik.http.routers.my-router.middlewares=ratelimit"
```

### 3. IP 白名單

```yaml
labels:
  - "traefik.http.middlewares.ipwhitelist.ipwhitelist.sourcerange=127.0.0.1/32,192.168.1.0/24"
  - "traefik.http.routers.my-router.middlewares=ipwhitelist"
```

### 4. 壓縮

```yaml
labels:
  - "traefik.http.middlewares.compress.compress=true"
  - "traefik.http.routers.my-router.middlewares=compress"
```

### 5. 重定向

```yaml
# HTTP 到 HTTPS
labels:
  - "traefik.http.middlewares.redirect-to-https.redirectscheme.scheme=https"
  - "traefik.http.middlewares.redirect-to-https.redirectscheme.permanent=true"

# www 到非 www
labels:
  - "traefik.http.middlewares.redirect-to-non-www.redirectregex.regex=^https://www\\.(.+)"
  - "traefik.http.middlewares.redirect-to-non-www.redirectregex.replacement=https://$${1}"
  - "traefik.http.middlewares.redirect-to-non-www.redirectregex.permanent=true"
```

### 6. 健康檢查

```yaml
labels:
  - "traefik.http.services.my-service.loadbalancer.healthcheck.path=/health"
  - "traefik.http.services.my-service.loadbalancer.healthcheck.interval=10s"
  - "traefik.http.services.my-service.loadbalancer.healthcheck.timeout=3s"
```

---

## 監控與除錯

### 1. 訪問儀表板

訪問 `https://traefik.your-domain.com`，可查看：
- 所有路由
- 後端服務狀態
- 中間件配置
- SSL 憑證資訊

### 2. 查看日誌

```bash
# Traefik 主日誌
docker-compose logs -f traefik

# 訪問日誌
tail -f ~/traefik/logs/access.log

# 錯誤日誌
tail -f ~/traefik/logs/traefik.log
```

### 3. 檢查路由配置

```bash
# 進入容器
docker exec -it traefik sh

# 查看當前配置
cat /traefik.yaml
```

### 4. 測試路由

```bash
# 檢查 DNS 解析
dig feat-update.daodao.so

# 測試 HTTP
curl -I http://feat-update.daodao.so

# 測試 HTTPS
curl -I https://feat-update.daodao.so

# 檢查 SSL 憑證
openssl s_client -connect feat-update.daodao.so:443 -servername feat-update.daodao.so
```

### 5. 監控容器

```bash
# 查看所有 Traefik 管理的容器
docker ps --filter "network=traefik-network"

# 查看網路連接
docker network inspect traefik-network
```

---

## 常見問題與故障排除

### Q1: 部署後無法訪問，顯示 404

**可能原因**：
1. 容器沒有加入 `traefik-network`
2. 沒有設定 `traefik.enable=true`
3. 路由規則配置錯誤

**解決方式**：

```bash
# 1. 檢查容器網路
docker inspect <container-name> | grep -A 10 Networks

# 2. 檢查容器 labels
docker inspect <container-name> | grep -A 20 Labels

# 3. 查看 Traefik 日誌
docker-compose logs traefik | grep ERROR

# 4. 訪問儀表板檢查路由是否註冊
```

### Q2: SSL 憑證申請失敗

**可能原因**：
1. DNS 沒有正確指向伺服器
2. 80 端口被佔用
3. acme.json 權限不正確
4. Email 配置錯誤

**解決方式**：

```bash
# 1. 檢查 DNS
dig +short your-domain.com

# 2. 檢查 80 端口
netstat -tlnp | grep :80

# 3. 檢查 acme.json 權限
ls -l ~/traefik/acme.json
# 應該是 -rw------- (600)

# 4. 查看 Let's Encrypt 錯誤
docker-compose logs traefik | grep acme

# 5. 重置 acme.json（小心！會刪除所有憑證）
rm ~/traefik/acme.json
touch ~/traefik/acme.json
chmod 600 ~/traefik/acme.json
docker-compose restart traefik
```

### Q3: 容器更新後路由沒有更新

**解決方式**：

```bash
# Traefik 應該自動檢測，如果沒有：

# 1. 重啟 Traefik
docker-compose restart traefik

# 2. 檢查 Docker socket 掛載
docker inspect traefik | grep docker.sock

# 3. 確認容器在正確的網路
docker network ls
docker network inspect traefik-network
```

### Q4: 多個中間件如何組合？

**答案**：使用逗號分隔

```yaml
labels:
  - "traefik.http.routers.my-router.middlewares=compress,secure-headers,ratelimit"
```

### Q5: 如何處理多個域名指向同一服務？

```yaml
labels:
  - "traefik.http.routers.my-router.rule=Host(`example.com`) || Host(`www.example.com`) || Host(`alt.example.com`)"
```

### Q6: 如何除錯路由規則？

**方法**：

1. 在 `traefik.yaml` 中設定 `log.level: DEBUG`
2. 重啟 Traefik
3. 查看詳細日誌

```bash
docker-compose restart traefik
docker-compose logs -f traefik | grep -i "router\|rule"
```

---

## 最佳實踐

### 1. 安全性

```yaml
# ✅ 推薦配置
security_opt:
  - no-new-privileges:true  # 防止權限提升

# ✅ 只讀掛載 Docker socket（如果可能）
volumes:
  - /var/run/docker.sock:/var/run/docker.sock:ro

# ✅ 儀表板使用基本認證
labels:
  - "traefik.http.routers.dashboard.middlewares=dashboard-auth"
  - "traefik.http.middlewares.dashboard-auth.basicauth.users=..."

# ✅ 限制儀表板訪問 IP
labels:
  - "traefik.http.middlewares.dashboard-ipwhitelist.ipwhitelist.sourcerange=1.2.3.4/32"
```

### 2. 效能優化

```yaml
# ✅ 啟用壓縮
labels:
  - "traefik.http.middlewares.compress.compress=true"

# ✅ 配置健康檢查
labels:
  - "traefik.http.services.my-service.loadbalancer.healthcheck.path=/health"
  - "traefik.http.services.my-service.loadbalancer.healthcheck.interval=10s"

# ✅ 使用 HTTP/2
# Traefik 預設啟用，無需額外配置
```

### 3. 容錯性

```yaml
# ✅ 設定重啟策略
restart: unless-stopped

# ✅ 資源限制
deploy:
  resources:
    limits:
      cpus: '0.5'
      memory: 512M
```

### 4. 監控

```yaml
# ✅ 啟用訪問日誌
accessLog:
  filePath: /var/log/traefik/access.log
  format: json  # 方便解析

# ✅ 配置 Metrics（Prometheus）
metrics:
  prometheus:
    entryPoint: metrics
```

### 5. 備份

```bash
# ✅ 定期備份 acme.json
cp ~/traefik/acme.json ~/backups/acme.json.$(date +%Y%m%d)

# ✅ 版本控制配置文件
cd ~/traefik
git init
git add traefik.yaml docker-compose.yaml
git commit -m "Initial Traefik config"
```

---

## 參考資源

### 官方文件
- [Traefik 官方網站](https://traefik.io/)
- [Traefik 文件](https://doc.traefik.io/traefik/)
- [Docker Provider](https://doc.traefik.io/traefik/providers/docker/)
- [Let's Encrypt](https://doc.traefik.io/traefik/https/acme/)

### 社群資源
- [Traefik GitHub](https://github.com/traefik/traefik)
- [Traefik Community Forum](https://community.traefik.io/)
- [Awesome Traefik](https://github.com/htpcBeginner/awesome-traefik)

### 相關專案文件
- [功能分支部署指南](./feature-branch-deployment.md)
- [多環境部署指南](./multi-environment-deployment.md)
- [整合指南](./integration-guide.md)

### 工具
- [Traefik Pilot](https://pilot.traefik.io/)（官方監控平台）
- [htpasswd Generator](https://hostingcanada.org/htpasswd-generator/)（生成基本認證密碼）

---

## 總結

### Traefik 的適用場景

✅ **適合使用 Traefik 的情況**：
- 動態部署環境（功能分支、測試環境）
- 容器化應用
- 需要自動 SSL 管理
- 微服務架構
- 需要簡化運維

❌ **不適合使用 Traefik 的情況**：
- 靜態、固定的環境
- 需要極致效能（考慮 Nginx）
- 非容器化應用
- 複雜的自定義配置需求

### 島島專案推薦

對於島島專案，我們推薦：

1. **正式環境（daodao.so）**：可考慮使用 Nginx
   - 配置固定，不常變動
   - 效能優先

2. **測試環境（dev.daodao.so）**：使用 Traefik
   - 配置可能變動
   - 方便管理

3. **功能分支（feat-*.daodao.so）**：強烈推薦使用 Traefik
   - 需要頻繁部署/銷毀
   - 自動化程度高

### 下一步

- 閱讀 [功能分支部署指南](./feature-branch-deployment.md) 了解完整實作
- 參考 [多環境部署指南](./multi-environment-deployment.md) 配置多環境
- 實作一個測試環境驗證配置

---

**文件維護者**：島島技術團隊
**問題回報**：請在專案 issue 中提出
**最後更新**：2025-12-23
