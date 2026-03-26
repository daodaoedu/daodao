# Nginx 集中管理任務規劃文檔

## 一、需求背景

### 1.1 當前問題分析

目前專案中有多個服務都需要使用 Nginx，配置分散在不同專案中：

**現況：**
- `daodao-server/nginx.conf` - 主要 Nginx 配置（223 行）
- `daodao-ai-backend/nginx.conf` - AI 後端 Nginx 配置（223 行）
- `daodao-server/docker-compose.yaml` - Nginx 容器配置（110-125 行）

**存在問題：**
1. **配置重複**：兩個 nginx.conf 檔案內容 95% 相同，僅有細微差異
2. **耦合問題**：修改 Nginx 配置需要變動 Node.js 後端專案
3. **管理困難**：修改配置需要在多處同步，容易出錯
4. **部署影響**：更新 Nginx 可能觸發後端服務重啟
5. **版本混亂**：難以追蹤哪個版本的配置正在使用

### 1.2 當前服務架構

**完整的流量路徑：**
```
用戶請求
    ↓
Cloudflare CDN（CDN 層、DDoS 防護、SSL/TLS 終止）
    ↓
Nginx Gateway（反向代理、負載均衡、內部路由）
    ↓
後端服務（Node.js、AI 後端、N8N 等）
```

**代理的服務：**
- `dao-server.daoedu.tw` → Cloudflare → Nginx → `prod_app:3000`（生產環境 Node.js 後端）
- `server.daoedu.tw` → Cloudflare → Nginx → `dev_app:3000`（開發環境 Node.js 後端）
- `server-ai.daoedu.tw` → Cloudflare → Nginx → `backend-dev:8000`（開發環境 AI 後端）
- `dao-server-ai.daoedu.tw` → Cloudflare → Nginx → `backend-prod:8000`（生產環境 AI 後端）
- `n8n.daoedu.tw` → Cloudflare → Nginx → `n8n:5678`（N8N 工作流服務）

**網路配置：**
- `prod-daodao-network` - 生產環境網路
- `dev-daodao-network` - 開發環境網路
- `prod_network` - 生產外部網路
- `dev_network` - 開發外部網路

**Cloudflare 功能：**
- ✅ CDN 快取靜態資源
- ✅ DDoS 攻擊防護
- ✅ SSL/TLS 證書管理
- ✅ 自動壓縮（Brotli/GZIP）
- ✅ 真實 IP 傳遞（CF-Connecting-IP）

因此需要將 Nginx 配置抽取出來進行集中管理，實現配置與業務邏輯解耦。

**解決方案：創建獨立的 nginx-gateway 專案**
- 完全獨立的 Git Repository
- 獨立的 docker-compose.yaml，只管理 Nginx 容器
- 通過 Docker 外部網路連接到其他專案的服務
- 修改 Nginx 配置不影響前後端專案的運行和部署

## 二、目標

### 2.1 主要目標
- **配置解耦**：將 Nginx 配置從後端專案中完全獨立出來
- **模塊化管理**：建立統一的配置管理結構，提供可重用模板
- **自動化部署**：實現 CI/CD 自動驗證和部署流程
- **零停機遷移**：確保遷移過程不影響現有服務
- **可維護性**：簡化配置變更流程，提升可追溯性

### 2.2 預期效益

**效率提升：**
- 減少配置重複代碼 **70% 以上**
- 配置變更時間從 **30 分鐘降至 5 分鐘**
- 自動化驗證降低人為錯誤 **90%**

**風險降低：**
- **完全解耦**：修改 Nginx 不再影響後端專案部署
- **獨立重啟**：重啟 nginx-gateway 不會中斷後端服務
- **自動回滾**：故障恢復時間 < 5 分鐘
- **審計記錄**：每次變更都有完整的 Git 歷史追蹤

**開發體驗：**
- 配置變更自動驗證，提交前即可發現問題
- Pull Request 自動評論驗證結果
- Slack 即時通知部署狀態

**運維改善：**
- 定期自動健康檢查（每 6 小時）
- 統一的配置標準和最佳實踐
- 清晰的配置變更流程

## 三、技術方案

### 3.1 目錄結構設計

創建獨立的 `nginx-gateway` 專案：

```
nginx-gateway/
├── docker-compose.yaml         # Nginx 容器編排
├── nginx.conf                  # 主配置文件
├── conf.d/                    # 配置模塊目錄
│   ├── common/               # 通用配置模塊
│   │   ├── cloudflare.conf  # Cloudflare IP 設定
│   │   ├── proxy-headers.conf    # 代理標頭配置
│   │   ├── proxy-timeouts.conf   # 超時設定
│   │   ├── security.conf         # 安全標頭
│   │   └── error-pages.conf      # 錯誤頁面模板
│   ├── upstreams/            # 上游服務定義
│   │   ├── daodao-backend.conf   # Node.js 後端上游
│   │   ├── daodao-ai.conf        # AI 後端上游
│   │   └── n8n.conf              # N8N 上游
│   └── servers/              # 虛擬主機配置
│       ├── dao-server.conf       # dao-server.daoedu.tw
│       ├── server.conf           # server.daoedu.tw
│       ├── dao-server-ai.conf    # dao-server-ai.daoedu.tw
│       ├── server-ai.conf        # server-ai.daoedu.tw
│       └── n8n.conf              # n8n.daoedu.tw
├── .github/                   # GitHub Actions CI/CD
│   └── workflows/
│       ├── validate.yml      # 自動驗證配置
│       ├── deploy.yml        # 自動部署
│       └── scheduled-check.yml   # 定期健康檢查
├── .githooks/                # Git Hooks
│   └── pre-commit           # 提交前驗證
├── ssl/                       # SSL 證書（未來使用）
│   ├── certs/
│   └── private/
├── logs/                      # Nginx 日誌掛載點
│   ├── access.log
│   └── error.log
├── backups/                   # 配置備份目錄
│   └── YYYYMMDD_HHMMSS/
├── scripts/                   # 管理腳本
│   ├── deploy.sh             # 部署腳本
│   ├── validate.sh           # 配置驗證
│   ├── reload.sh             # 安全重載
│   ├── health-check.sh       # 健康檢查
│   └── update-cloudflare-ips.sh  # 更新 Cloudflare IP 範圍
├── .env.example              # 環境變數範例
├── .gitignore               # Git 忽略規則
├── CONTRIBUTING.md          # 貢獻指南
├── CHANGELOG.md             # 變更日誌
└── README.md                # 使用說明
```

### 3.2 配置管理策略

**模塊化設計：**
- 將 Cloudflare IP、代理標頭、超時設定等通用配置抽取為獨立模塊
- 每個服務（dao-server、server、ai、n8n）使用獨立的配置檔案
- 使用 `include` 指令組合配置，提高可維護性

**Cloudflare 整合：**
- **真實 IP 獲取**：配置 `set_real_ip_from` 和 `real_ip_header CF-Connecting-IP`
- **重要性**：確保日誌和應用程序獲取真實客戶端 IP，而非 Cloudflare 代理 IP
- **動態更新**：Cloudflare IP 範圍可能變更，需定期更新配置
- **SSL 終止**：SSL/TLS 在 Cloudflare 層處理，Nginx 使用 HTTP（端口 80）

**網路架構：**
- Nginx 容器加入所有必要的 Docker 網路
- 連接 `prod-daodao-network` 訪問 prod_app
- 連接 `dev-daodao-network` 訪問 dev_app
- 連接 AI 後端和 N8N 服務的網路
- 外部流量通過 Cloudflare 進入，Nginx 監聽 80 端口

**版本控制：**
- 獨立的 Git Repository 管理 Nginx 配置
- 配置變更需要 Code Review
- 使用 Git Tags 標記穩定版本

### 3.3 Docker Compose 配置

**nginx-gateway 是完全獨立的專案**

nginx-gateway 有自己獨立的 `docker-compose.yaml`，與前後端專案完全分離：

```yaml
# nginx-gateway/docker-compose.yaml
services:
  nginx:
    image: nginx:latest
    container_name: nginx-gateway
    ports:
      - "80:80"      # HTTP 入口
      - "443:443"    # HTTPS 入口（未來使用）
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./conf.d:/etc/nginx/conf.d:ro
      - ./logs:/var/log/nginx
    networks:
      # 連接到各個獨立專案的外部網路
      - prod-daodao-network    # 連接 daodao-server 的生產環境
      - dev-daodao-network     # 連接 daodao-server 的開發環境
      - prod_network           # 其他生產服務
      - dev_network            # 其他開發服務
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "nginx", "-t"]
      interval: 30s
      timeout: 10s
      retries: 3

networks:
  # 所有網路都是 external: true，表示由其他專案創建和管理
  prod-daodao-network:
    external: true
  dev-daodao-network:
    external: true
  prod_network:
    external: true
  dev_network:
    external: true
```

**專案獨立性說明：**

```
專案結構：
/Users/xiaoxu/Projects/daodao/
├── daodao-server/              # Node.js 後端（獨立專案）
│   └── docker-compose.yaml     # 管理 prod_app, dev_app, mongo, redis
├── daodao-ai-backend/          # AI 後端（獨立專案）
│   └── docker-compose.yaml     # 管理 backend-prod, backend-dev
├── nginx-gateway/              # Nginx 網關（獨立專案）★ 新建
│   └── docker-compose.yaml     # 只管理 nginx 容器
└── (其他前端專案...)

運作方式：
1. 各專案獨立啟動：docker-compose up -d
2. nginx-gateway 通過外部網路連接到其他服務
3. 修改 nginx 配置只需重啟 nginx-gateway
4. 不影響任何其他專案的運行

啟動順序：
1. 先啟動後端服務（daodao-server, daodao-ai-backend）
   → 創建 Docker 網路和服務容器
2. 再啟動 nginx-gateway
   → 加入已存在的外部網路，代理到後端服務
3. 各專案可獨立重啟，互不影響

依賴關係：
- nginx-gateway 依賴：外部 Docker 網路（由其他專案創建）
- 其他專案：不依賴 nginx-gateway，可獨立運行
```

### 3.4 遷移策略

**階段性遷移：**
1. **準備階段**：創建 nginx-gateway 專案並測試配置
2. **共存階段**：新舊 Nginx 同時運行，驗證新配置
3. **切換階段**：更改端口映射，切換到新 Nginx
4. **清理階段**：移除舊專案中的 Nginx 配置

**零停機切換：**
- 使用不同端口測試新 Nginx 配置
- 驗證所有服務正常後再切換主端口
- 保留舊配置備份以便快速回滾

### 3.5 CI/CD 自動化部署流程

**完整的 CI/CD 工作流程：**

```
開發者修改配置
    ↓
提交到 Git (Commit)
    ↓
Pre-commit Hook 驗證語法 ✓
    ↓
推送到 GitHub (Push)
    ↓
GitHub Actions: 自動驗證
    ↓
創建 Pull Request
    ↓
GitHub Actions: 驗證 + 評論 PR
    ↓
Code Review 通過
    ↓
合併到 main 分支
    ↓
GitHub Actions: 自動部署
    ├─ 驗證配置語法
    ├─ SSH 到服務器
    ├─ 拉取最新代碼
    ├─ 備份當前配置
    ├─ 重載 Nginx
    └─ 健康檢查
    ↓
部署成功 → Slack 通知 ✓
部署失敗 → 自動回滾 + 告警 ✗
```

**CI/CD 優勢：**
1. **自動驗證** - 每次提交都自動檢查配置語法
2. **安全部署** - 驗證通過才部署，降低人為錯誤
3. **快速回滾** - 部署失敗自動回滾到上一個穩定版本
4. **透明度高** - 所有變更都有記錄和審計跟蹤
5. **定期檢查** - 每 6 小時自動健康檢查
6. **即時通知** - Slack 實時通知部署狀態

## 四、實施任務

### 階段一：基礎架構搭建（優先級：高）

#### 任務 1.1：創建 nginx-gateway 專案
- [ ] 在 `/Users/xiaoxu/Projects/daodao/` 下創建 `nginx-gateway` 目錄
- [ ] 初始化 Git Repository
- [ ] 創建完整的目錄結構（參考 3.1）
- [ ] 創建 `.gitignore`（忽略 logs/、ssl/private/ 等）
- [ ] 創建 README.md 使用說明

#### 任務 1.2：提取並重構通用配置

- [ ] **創建 `conf.d/common/cloudflare.conf`** - Cloudflare IP 設定（關鍵配置）
  ```nginx
  # Cloudflare IP ranges - 獲取真實客戶端 IP
  # 來源：https://www.cloudflare.com/ips/

  # IPv4
  set_real_ip_from 103.21.244.0/22;
  set_real_ip_from 103.22.200.0/22;
  set_real_ip_from 103.31.4.0/22;
  set_real_ip_from 104.16.0.0/13;
  set_real_ip_from 104.24.0.0/14;
  set_real_ip_from 108.162.192.0/18;
  set_real_ip_from 131.0.72.0/22;
  set_real_ip_from 141.101.64.0/18;
  set_real_ip_from 162.158.0.0/15;
  set_real_ip_from 172.64.0.0/13;
  set_real_ip_from 173.245.48.0/20;
  set_real_ip_from 188.114.96.0/20;
  set_real_ip_from 190.93.240.0/20;
  set_real_ip_from 197.234.240.0/22;
  set_real_ip_from 198.41.128.0/17;

  # 使用 Cloudflare 提供的真實 IP 標頭
  real_ip_header CF-Connecting-IP;

  # 備註：定期檢查並更新 Cloudflare IP 範圍（每季度）
  ```

- [ ] **創建 `conf.d/common/proxy-headers.conf`** - 代理標頭配置
  ```nginx
  # 標準代理標頭
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;

  # WebSocket 支援
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection 'upgrade';
  proxy_cache_bypass $http_upgrade;
  ```

- [ ] **創建 `conf.d/common/proxy-timeouts.conf`** - 超時設定
  ```nginx
  proxy_connect_timeout 300s;
  proxy_send_timeout 300s;
  proxy_read_timeout 300s;
  ```

- [ ] **創建 `conf.d/common/error-pages.conf`** - 錯誤頁面模板
  ```nginx
  # 502 錯誤處理
  proxy_intercept_errors on;
  error_page 502 = @502_error;

  location @502_error {
      default_type text/html;
      return 502 '<!DOCTYPE html>
  <html>
  <head><title>502 Bad Gateway</title></head>
  <body>
  <h1>502 Bad Gateway</h1>
  <p>服務暫時無法使用，請稍後再試。</p>
  </body>
  </html>';
  }
  ```

- [ ] **創建 `conf.d/common/security.conf`** - 安全標頭
  ```nginx
  # 安全標頭
  add_header X-Frame-Options SAMEORIGIN;
  add_header X-Content-Type-Options nosniff;
  add_header X-XSS-Protection "1; mode=block";

  # 注意：HSTS 在 Cloudflare 層處理，這裡不需要設置
  ```

#### 任務 1.3：創建服務配置文件
**主配置：**
- [ ] 創建 `nginx.conf` - 僅包含基本設定和 include 指令

**虛擬主機配置：**
- [ ] `conf.d/servers/dao-server.conf` - dao-server.daoedu.tw (生產)
- [ ] `conf.d/servers/server.conf` - server.daoedu.tw (開發)
- [ ] `conf.d/servers/dao-server-ai.conf` - dao-server-ai.daoedu.tw (AI 生產)
- [ ] `conf.d/servers/server-ai.conf` - server-ai.daoedu.tw (AI 開發)
- [ ] `conf.d/servers/n8n.conf` - n8n.daoedu.tw

### 階段二：配置遷移與測試（優先級：高）

#### 任務 2.1：創建 Docker Compose 配置
- [ ] 創建 `docker-compose.yaml`（參考 3.3 的配置）
- [ ] 配置所有必要的 Docker 網路連接
- [ ] 設定健康檢查
- [ ] 配置日誌卷掛載

#### 任務 2.2：配置驗證
- [ ] 創建 `scripts/validate.sh` - 驗證 Nginx 配置語法
- [ ] 本地測試配置語法：`nginx -t`
- [ ] 確認所有 include 路徑正確
- [ ] 檢查服務名稱與 Docker 容器名稱一致

#### 任務 2.3：測試部署（使用不同端口）
- [ ] 修改測試端口為 `8888:80` 和 `8443:443`
- [ ] 啟動 nginx-gateway：`docker-compose up -d`
- [ ] 測試各服務端點：
  - [ ] `http://dao-server.daoedu.tw:8888`
  - [ ] `http://server.daoedu.tw:8888`
  - [ ] `http://server-ai.daoedu.tw:8888`
  - [ ] `http://n8n.daoedu.tw:8888`
- [ ] 驗證日誌正常輸出到 `logs/` 目錄

### 階段三：正式切換（優先級：高）

#### 任務 3.1：修改 daodao-server 的 docker-compose.yaml

**重要說明：只移除 nginx 服務，保留所有其他服務**

**變更內容：**
```yaml
# daodao-server/docker-compose.yaml
# 移除以下 nginx 服務配置（110-125 行）

# 刪除這段 ↓
#  nginx:
#    image: nginx:latest
#    container_name: nginx
#    ports:
#      - "80:80"
#      - "443:443"
#    volumes:
#      - ./nginx.conf:/etc/nginx/nginx.conf
#    environment:
#      - APP_ENV=${APP_ENV}
#    depends_on:
#      - prod_app
#      - dev_app
#    networks:
#      - prod-daodao-network
#      - dev-daodao-network

# 保留所有其他服務（prod_app, dev_app, mongo, redis）不變
```

**執行步驟：**
- [ ] 備份原 `daodao-server/docker-compose.yaml`
- [ ] 移除 nginx 服務定義（第 110-125 行）
- [ ] **確認**：prod_app、dev_app、mongo、redis 服務配置完全不變
- [ ] **確認**：網路配置（prod-daodao-network, dev-daodao-network）保留
- [ ] 提交變更到 Git，註明「將 Nginx 遷移至獨立專案 nginx-gateway」

#### 任務 3.2：切換到生產端口（零停機切換）

**切換流程：**
```bash
# 1. 停止 daodao-server 中的舊 Nginx（釋放 80/443 端口）
cd /Users/xiaoxu/Projects/daodao/daodao-server
docker-compose stop nginx
# 或者直接刪除容器
docker rm -f nginx

# 2. 修改 nginx-gateway 端口設定
cd /Users/xiaoxu/Projects/daodao/nginx-gateway
# 編輯 docker-compose.yaml，將測試端口改回生產端口
# ports:
#   - "80:80"      # 從 "8888:80" 改回
#   - "443:443"    # 從 "8443:443" 改回

# 3. 啟動新的 nginx-gateway（使用生產端口）
docker-compose up -d

# 4. 驗證所有服務
./scripts/health-check.sh
```

**檢查清單：**
- [ ] 停止舊的 Nginx 容器（daodao-server 中的）
- [ ] 確認 80/443 端口已釋放：`netstat -tuln | grep ':80\|:443'`
- [ ] 修改 nginx-gateway/docker-compose.yaml 端口設定
- [ ] 啟動 nginx-gateway：`docker-compose up -d`
- [ ] 驗證所有服務端點正常（health-check.sh）
- [ ] 檢查 Nginx 日誌無錯誤：`docker-compose logs nginx`
- [ ] **重要**：確認 daodao-server 的其他服務（prod_app, dev_app）仍正常運行

#### 任務 3.3：清理舊配置並更新文檔

**清理舊 Nginx 配置：**
```bash
# daodao-server 專案
cd /Users/xiaoxu/Projects/daodao/daodao-server
mv nginx.conf nginx.conf.backup  # 保留備份 30 天後刪除
git add docker-compose.yaml nginx.conf.backup
git commit -m "refactor: 將 Nginx 遷移至獨立專案 nginx-gateway"

# daodao-ai-backend 專案
cd /Users/xiaoxu/Projects/daodao/daodao-ai-backend
mv nginx.conf nginx.conf.backup  # 保留備份 30 天後刪除
git add nginx.conf.backup
git commit -m "refactor: 移除 nginx.conf，已遷移至 nginx-gateway"
```

**更新專案 README：**
- [ ] 在 `daodao-server/README.md` 中添加：
  ```markdown
  ## Nginx 配置

  ⚠️ **注意**：Nginx 配置已遷移至獨立專案 `nginx-gateway`

  - Nginx 配置位置：`/Users/xiaoxu/Projects/daodao/nginx-gateway`
  - 本專案不再包含 Nginx 服務
  - 修改反向代理配置請前往 nginx-gateway 專案

  相關文檔：[nginx-gateway README](../nginx-gateway/README.md)
  ```

- [ ] 在 `daodao-ai-backend/README.md` 中添加同樣的說明

- [ ] 創建 `nginx-gateway/README.md`（詳細使用說明）

**提交與標記：**
- [ ] 各專案提交變更
- [ ] nginx-gateway 打上 Git Tag：`v1.0.0-migration-complete`
- [ ] 更新 `nginx-gateway/CHANGELOG.md` 記錄遷移完成

### 階段四：自動化工具與 CI/CD（優先級：中）

#### 任務 4.1：開發管理腳本
- [ ] **scripts/validate.sh** - Nginx 配置語法驗證
  ```bash
  #!/bin/bash
  set -e

  echo "🔍 驗證 Nginx 配置語法..."
  docker run --rm \
    -v $(pwd)/nginx.conf:/etc/nginx/nginx.conf:ro \
    -v $(pwd)/conf.d:/etc/nginx/conf.d:ro \
    nginx:latest nginx -t

  echo "✅ 配置語法正確"
  ```

- [ ] **scripts/reload.sh** - 安全重載配置
  ```bash
  #!/bin/bash
  set -e

  echo "🔄 開始重載 Nginx 配置..."

  # 先驗證配置
  ./scripts/validate.sh

  # 重載 Nginx
  docker-compose exec nginx nginx -s reload

  echo "✅ Nginx 配置已重載"
  ```

- [ ] **scripts/deploy.sh** - 自動化部署腳本（獨立專案）
  ```bash
  #!/bin/bash
  set -e

  echo "🚀 開始部署 Nginx 配置..."

  # 1. 拉取最新配置（獨立 Git Repository）
  git pull origin main

  # 2. 驗證配置語法
  ./scripts/validate.sh

  # 3. 備份當前配置
  BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
  mkdir -p $BACKUP_DIR
  docker-compose exec nginx cp -r /etc/nginx/conf.d /tmp/backup
  docker cp nginx-gateway:/tmp/backup $BACKUP_DIR/

  # 4. 重載 Nginx（只影響 nginx-gateway，不影響其他專案）
  docker-compose exec nginx nginx -s reload

  # 5. 健康檢查（驗證能否訪問所有後端服務）
  ./scripts/health-check.sh

  echo "✅ 部署完成（其他專案不受影響）"
  ```

- [ ] **scripts/health-check.sh** - 健康檢查腳本
  ```bash
  #!/bin/bash

  ENDPOINTS=(
    "http://dao-server.daoedu.tw/api/v1/health"
    "http://server.daoedu.tw/api/v1/health"
    "http://server-ai.daoedu.tw/health"
    "http://n8n.daoedu.tw/healthz"
  )

  echo "🏥 檢查服務健康狀態..."

  for endpoint in "${ENDPOINTS[@]}"; do
    if curl -f -s -o /dev/null -w "%{http_code}" "$endpoint" | grep -q "200"; then
      echo "✅ $endpoint - OK"
    else
      echo "❌ $endpoint - FAILED"
      exit 1
    fi
  done

  echo "✅ 所有服務健康"
  ```

- [ ] **scripts/update-cloudflare-ips.sh** - 更新 Cloudflare IP 範圍（重要）
  ```bash
  #!/bin/bash
  set -e

  echo "🔄 檢查 Cloudflare IP 範圍更新..."

  CLOUDFLARE_CONF="conf.d/common/cloudflare.conf"
  TEMP_FILE="/tmp/cloudflare-ips-new.conf"

  # 生成新的配置
  cat > $TEMP_FILE <<'EOF'
  # Cloudflare IP ranges - 獲取真實客戶端 IP
  # 來源：https://www.cloudflare.com/ips/
  # 最後更新：$(date +%Y-%m-%d)

  # IPv4
  EOF

  # 獲取最新的 IPv4 範圍
  curl -s https://www.cloudflare.com/ips-v4 | while read ip; do
    echo "set_real_ip_from $ip;" >> $TEMP_FILE
  done

  # 添加 IPv6（可選）
  echo "" >> $TEMP_FILE
  echo "# IPv6" >> $TEMP_FILE
  curl -s https://www.cloudflare.com/ips-v6 | while read ip; do
    echo "set_real_ip_from $ip;" >> $TEMP_FILE
  done

  # 添加標頭配置
  cat >> $TEMP_FILE <<'EOF'

  # 使用 Cloudflare 提供的真實 IP 標頭
  real_ip_header CF-Connecting-IP;

  # 備註：定期檢查並更新 Cloudflare IP 範圍（每月）
  EOF

  # 比對差異
  if diff -q $CLOUDFLARE_CONF $TEMP_FILE > /dev/null 2>&1; then
    echo "✅ Cloudflare IP 範圍無變更"
    rm $TEMP_FILE
  else
    echo "⚠️  發現 Cloudflare IP 範圍變更！"
    echo "差異："
    diff $CLOUDFLARE_CONF $TEMP_FILE || true

    # 備份舊配置
    cp $CLOUDFLARE_CONF "${CLOUDFLARE_CONF}.backup-$(date +%Y%m%d)"

    # 更新配置
    mv $TEMP_FILE $CLOUDFLARE_CONF

    echo "✅ 已更新 Cloudflare IP 配置"
    echo "⚠️  請執行以下步驟完成部署："
    echo "   1. 驗證配置：./scripts/validate.sh"
    echo "   2. 提交變更：git add $CLOUDFLARE_CONF && git commit -m 'chore: 更新 Cloudflare IP 範圍'"
    echo "   3. 部署更新：./scripts/deploy.sh"
  fi
  ```

#### 任務 4.2：建立 GitHub Actions CI/CD

- [ ] **創建 `.github/workflows/validate.yml`** - 自動驗證配置
  ```yaml
  name: Validate Nginx Config

  on:
    pull_request:
      branches: [ main, dev ]
    push:
      branches: [ main, dev ]

  jobs:
    validate:
      runs-on: ubuntu-latest

      steps:
        - name: Checkout code
          uses: actions/checkout@v3

        - name: Validate Nginx configuration
          run: |
            docker run --rm \
              -v ${{ github.workspace }}/nginx.conf:/etc/nginx/nginx.conf:ro \
              -v ${{ github.workspace }}/conf.d:/etc/nginx/conf.d:ro \
              nginx:latest nginx -t

        - name: Comment PR
          if: github.event_name == 'pull_request'
          uses: actions/github-script@v6
          with:
            script: |
              github.rest.issues.createComment({
                issue_number: context.issue.number,
                owner: context.repo.owner,
                repo: context.repo.repo,
                body: '✅ Nginx 配置驗證通過！'
              })
  ```

- [ ] **創建 `.github/workflows/deploy.yml`** - 自動部署到服務器（獨立專案）
  ```yaml
  name: Deploy Nginx Config

  on:
    push:
      branches: [ main ]
    workflow_dispatch:  # 允許手動觸發

  jobs:
    deploy:
      runs-on: ubuntu-latest

      steps:
        - name: Checkout code
          uses: actions/checkout@v3

        - name: Validate configuration
          run: |
            docker run --rm \
              -v ${{ github.workspace }}/nginx.conf:/etc/nginx/nginx.conf:ro \
              -v ${{ github.workspace }}/conf.d:/etc/nginx/conf.d:ro \
              nginx:latest nginx -t

        - name: Deploy to server (nginx-gateway only)
          uses: appleboy/ssh-action@master
          with:
            host: ${{ secrets.SERVER_HOST }}
            username: ${{ secrets.SERVER_USER }}
            key: ${{ secrets.SSH_PRIVATE_KEY }}
            script: |
              # 進入 nginx-gateway 獨立專案目錄
              cd ~/Projects/daodao/nginx-gateway

              # 拉取最新配置
              git pull origin main

              # 驗證配置語法
              ./scripts/validate.sh

              # 重載 Nginx（不影響其他專案）
              ./scripts/reload.sh

              # 健康檢查所有服務端點
              ./scripts/health-check.sh

        - name: Notify deployment status
          if: always()
          uses: 8398a7/action-slack@v3
          with:
            status: ${{ job.status }}
            text: |
              🔄 Nginx Gateway 部署 ${{ job.status }}

              專案: nginx-gateway (獨立)
              分支: main
              提交: ${{ github.sha }}

              ℹ️ 其他專案（daodao-server, daodao-ai-backend）不受影響
            webhook_url: ${{ secrets.SLACK_WEBHOOK }}
  ```

- [ ] **創建 `.github/workflows/scheduled-check.yml`** - 定期健康檢查
  ```yaml
  name: Scheduled Health Check

  on:
    schedule:
      - cron: '0 */6 * * *'  # 每 6 小時執行一次
    workflow_dispatch:

  jobs:
    health-check:
      runs-on: ubuntu-latest

      steps:
        - name: Checkout code
          uses: actions/checkout@v3

        - name: Run health check
          uses: appleboy/ssh-action@master
          with:
            host: ${{ secrets.SERVER_HOST }}
            username: ${{ secrets.SERVER_USER }}
            key: ${{ secrets.SSH_PRIVATE_KEY }}
            script: |
              cd /path/to/nginx-gateway
              ./scripts/health-check.sh

        - name: Notify on failure
          if: failure()
          uses: 8398a7/action-slack@v3
          with:
            status: 'failure'
            text: '⚠️ Nginx 健康檢查失敗！'
            webhook_url: ${{ secrets.SLACK_WEBHOOK }}
  ```

#### 任務 4.3：設置 GitHub Secrets

在 GitHub Repository Settings → Secrets and variables → Actions 中添加：
- [ ] `SERVER_HOST` - 服務器 IP 地址
- [ ] `SERVER_USER` - SSH 用戶名
- [ ] `SSH_PRIVATE_KEY` - SSH 私鑰
- [ ] `SLACK_WEBHOOK` - Slack 通知 Webhook（可選）

#### 任務 4.4：建立 Git Hooks（本地開發）
- [ ] **創建 `.githooks/pre-commit`**
  ```bash
  #!/bin/bash
  echo "🔍 Pre-commit: 驗證 Nginx 配置..."
  ./scripts/validate.sh
  ```

- [ ] **設置 Git Hooks 路徑**
  ```bash
  git config core.hooksPath .githooks
  chmod +x .githooks/pre-commit
  ```

### 階段五：文檔與規範（優先級：中）

#### 任務 5.1：編寫使用文檔
- [ ] **README.md** - 包含以下內容：
  - 專案說明與架構圖
  - 快速開始指南
  - 添加新服務的步驟
  - 常見問題排查
  - 腳本使用說明

- [ ] **CONTRIBUTING.md** - 貢獻指南
  - 配置變更流程
  - Code Review 規範
  - 命名規範

- [ ] **CHANGELOG.md** - 變更日誌
  - 記錄重要配置變更
  - 遷移歷史記錄

#### 任務 5.2：建立配置規範
- [ ] 定義虛擬主機命名規範
- [ ] 定義日誌格式標準
- [ ] 定義安全標頭最佳實踐
- [ ] 定義錯誤處理標準

### 階段六：監控與優化（優先級：低，未來改進）

#### 任務 6.1：建立監控機制
- [ ] 集成 Prometheus Nginx Exporter
- [ ] 配置 Grafana 儀表板
- [ ] 設置告警規則（4xx/5xx 錯誤率、響應時間等）

#### 任務 6.2：日誌管理
- [ ] 配置日誌輪替（logrotate）
- [ ] 考慮集成 ELK Stack 或 Loki 進行日誌聚合
- [ ] 設置日誌保留策略

#### 任務 6.3：性能優化
- [ ] 根據監控數據調整 worker_processes 和 worker_connections
- [ ] 優化緩衝區大小配置
- [ ] 考慮添加快取層（proxy_cache）
- [ ] SSL/TLS 性能優化（未來啟用 HTTPS 時）

## 五、風險與應對

### 5.1 潛在風險

| 風險項 | 影響程度 | 可能性 | 應對措施 |
|--------|----------|--------|----------|
| 切換時服務中斷 | **高** | 中 | 使用不同端口測試 → 驗證通過 → 快速切換 → 備份可回滾 |
| Docker 網路連接問題 | **高** | 中 | 提前驗證網路連通性，確保 nginx 容器能訪問所有後端服務 |
| Cloudflare IP 範圍過期 | **高** | 低 | 定期檢查更新（每月），訂閱 Cloudflare 公告，設置監控告警 |
| 配置語法錯誤 | 中 | 低 | 每次變更前執行 `nginx -t` 驗證，設置 pre-commit hook |
| upstream 名稱不一致 | 中 | 中 | 仔細對照 docker-compose.yaml 中的服務名稱 |
| 真實 IP 獲取失敗 | 中 | 低 | 驗證 `$remote_addr` 變數，檢查日誌中的 IP 地址 |
| 日誌丟失 | 中 | 低 | 使用 volume 掛載日誌目錄，確保持久化 |
| 舊配置誤用 | 低 | 低 | 將舊配置改名為 .backup，避免誤操作 |

### 5.2 回滾策略

**快速回滾步驟（5 分鐘內完成）：**
1. 停止新 nginx-gateway：`docker-compose -f nginx-gateway/docker-compose.yaml down`
2. 恢復舊配置：`cp daodao-server/nginx.conf.backup daodao-server/nginx.conf`
3. 啟動舊 Nginx：`docker-compose -f daodao-server/docker-compose.yaml up -d nginx`
4. 驗證服務：`curl http://dao-server.daoedu.tw/api/v1/health`

**預防措施：**
- 保留舊配置備份至少 30 天
- 使用 Git Tags 標記穩定版本
- 記錄詳細的變更日誌

### 5.3 應急聯絡

**問題升級流程：**
1. **輕微問題**（單一服務異常）→ 查看日誌、調整配置、重載
2. **中度問題**（多服務異常）→ 執行回滾腳本
3. **嚴重問題**（全站不可用）→ 立即回滾 + 通知團隊

## 六、實施時間規劃

### 核心階段（必須完成）
- **階段一**：基礎架構搭建 - 1 天
  - 創建專案結構（2 小時）
  - 提取並重構配置（4 小時）
  - 創建服務配置文件（2 小時）

- **階段二**：配置遷移與測試 - 1 天
  - Docker Compose 配置（2 小時）
  - 配置驗證（2 小時）
  - 測試部署（4 小時）

- **階段三**：正式切換 - 0.5 天
  - 修改 docker-compose.yaml（0.5 小時）
  - 切換到生產端口（1 小時）
  - 清理舊配置（0.5 小時）
  - 驗證與監控（2 小時）

**核心階段總計：2.5 天**

### 優化階段（逐步完善）
- **階段四**：自動化工具開發 - 1-2 天
- **階段五**：文檔與規範 - 1 天
- **階段六**：監控與優化 - 持續進行

**完整實施總計：4.5-5.5 天**

## 七、成功標準

### 7.1 功能性標準
- [ ] 所有服務（5 個域名）正常運作，響應時間無明顯變化
- [ ] Nginx 容器獨立運行，不依賴於任何後端專案的 docker-compose.yaml
- [ ] 配置文件模塊化，Cloudflare、代理標頭等配置可重用
- [ ] 所有虛擬主機配置使用獨立的配置文件

### 7.2 可維護性標準
- [ ] 配置重複率降低 70% 以上（通過提取通用模塊）
- [ ] 修改 Nginx 配置不需要觸碰後端專案代碼
- [ ] 提供配置驗證腳本，可在提交前自動檢查
- [ ] 提供安全重載腳本，避免服務中斷

### 7.3 CI/CD 自動化標準
- [ ] **自動驗證**：每次 Push 和 PR 自動驗證配置語法
- [ ] **自動部署**：合併到 main 分支自動部署到服務器
- [ ] **Pre-commit Hook**：本地提交前自動驗證配置
- [ ] **健康檢查**：部署後自動執行健康檢查
- [ ] **自動通知**：Slack 實時通知部署狀態
- [ ] **定期監控**：每 6 小時自動檢查服務健康狀態
- [ ] **PR 評論**：自動在 Pull Request 中評論驗證結果

### 7.4 遷移標準
- [ ] 零服務中斷完成遷移（使用端口測試策略）
- [ ] 舊配置文件已備份或移除
- [ ] daodao-server/docker-compose.yaml 中 nginx 服務已移除
- [ ] daodao-ai-backend/nginx.conf 已移除或備份

### 7.5 文檔標準
- [ ] README.md 提供完整的使用說明
- [ ] 包含 CI/CD 工作流程說明
- [ ] 包含添加新服務的步驟文檔
- [ ] 包含故障排查指南
- [ ] Git 提交歷史清晰記錄遷移過程
- [ ] CONTRIBUTING.md 說明配置變更流程

## 八、後續維護

### 8.1 日常維護任務

**每週檢查：**
- 查看 Nginx 錯誤日誌，關注異常錯誤
- 檢查磁碟空間，確保日誌目錄不會填滿
- 驗證所有服務端點健康狀態

**每月審查：**
- 審查配置合理性，移除不再使用的配置
- **檢查 Cloudflare IP 範圍更新**（關鍵任務）：
  ```bash
  # 獲取最新的 Cloudflare IP 範圍
  curl https://www.cloudflare.com/ips-v4
  curl https://www.cloudflare.com/ips-v6

  # 比對 conf.d/common/cloudflare.conf
  # 如有變更，更新配置並部署
  ```
- 檢查 Nginx 版本，評估是否需要升級

**季度優化：**
- 分析訪問日誌，識別性能瓶頸
- 根據流量模式調整配置參數
- 審查安全標頭配置，更新最佳實踐

### 8.2 配置變更流程

**標準變更流程：**
1. **提出變更** - 在 Git issue 中描述需求
2. **本地開發** - 創建功能分支，修改配置
3. **驗證語法** - 執行 `./scripts/validate.sh`
4. **測試驗證** - 使用測試端口驗證變更
5. **Code Review** - 提交 Pull Request，團隊審查
6. **部署上線** - 合併後執行 `./scripts/deploy.sh`
7. **監控驗證** - 觀察日誌和服務狀態

**緊急變更流程（安全漏洞等）：**
- 可跳過 Code Review，直接部署
- 事後補充文檔和通知

### 8.3 添加新服務指南

**步驟：**
1. 在 `conf.d/servers/` 創建新的虛擬主機配置
2. 引用通用配置模塊（`include conf.d/common/*.conf`）
3. 配置 upstream 和 proxy_pass
4. 更新 docker-compose.yaml 網路配置（如需要）
5. 驗證語法並測試
6. 提交 Pull Request

**範例：添加新的 API 服務**
```nginx
# conf.d/servers/api.conf
server {
    listen 80;
    server_name api.daoedu.tw;

    include conf.d/common/cloudflare.conf;
    include conf.d/common/security.conf;

    location / {
        include conf.d/common/proxy-headers.conf;
        include conf.d/common/proxy-timeouts.conf;
        proxy_pass http://api-service:4000;
    }
}
```

### 8.4 持續改進計劃

**短期改進（1-3 個月）：**
- [ ] 集成配置測試自動化（CI/CD）
- [ ] 添加 SSL/TLS 支援（Let's Encrypt）
- [ ] 實現日誌輪替機制

**中期改進（3-6 個月）：**
- [ ] 集成監控系統（Prometheus + Grafana）
- [ ] 實現配置模板生成工具
- [ ] 添加訪問日誌分析工具

**長期改進（6-12 個月）：**
- [ ] 考慮引入 Nginx Plus 或其他高級功能
- [ ] 實現多區域部署支援
- [ ] 建立配置管理平台（Web UI）

## 九、附錄

### 9.1 參考資料

**官方文檔：**
- Nginx 官方文檔：https://nginx.org/en/docs/
- Nginx 配置參考：https://nginx.org/en/docs/dirindex.html
- Docker Compose 文檔：https://docs.docker.com/compose/

**最佳實踐：**
- Nginx 配置最佳實踐：https://www.nginx.com/blog/best-practices-nginx-configuration/
- 安全加固指南：https://github.com/trimstray/nginx-admins-handbook
- Cloudflare IP 範圍：https://www.cloudflare.com/ips/

**Cloudflare 資源：**
- Cloudflare IP 範圍（IPv4）：https://www.cloudflare.com/ips-v4
- Cloudflare IP 範圍（IPv6）：https://www.cloudflare.com/ips-v6
- Cloudflare 完整 IP 列表：https://www.cloudflare.com/ips/
- 還原訪客真實 IP：https://developers.cloudflare.com/support/troubleshooting/restoring-visitor-ips/
- Cloudflare 與 Nginx：https://developers.cloudflare.com/fundamentals/reference/http-request-headers/

**工具與資源：**
- Nginx 配置生成器：https://www.digitalocean.com/community/tools/nginx
- SSL 配置生成器：https://ssl-config.mozilla.org/
- Cloudflare IP 更新檢查器：可使用 `diff` 比對本地配置與最新 IP 範圍

### 9.2 專案相關文件位置

**當前配置位置：**
- `daodao-server/nginx.conf` - 主要 Nginx 配置（待遷移）
- `daodao-server/docker-compose.yaml` - Nginx 容器配置（110-125 行）
- `daodao-ai-backend/nginx.conf` - AI 後端配置（待移除）

**新專案位置：**
- `nginx-gateway/` - 獨立的 Nginx 配置管理專案
- `doc/nginx-setting/demand.md` - 本規劃文檔

### 9.3 關鍵決策記錄

**決策 1：為什麼要獨立管理 Nginx？**
- **原因**：避免修改 Nginx 配置時影響後端專案部署
- **收益**：配置與業務邏輯解耦，降低維護成本
- **代價**：需要管理額外的 Docker Compose 服務

**決策 2：為什麼使用模塊化配置？**
- **原因**：兩個 nginx.conf 有 95% 重複代碼
- **收益**：減少重複，提高可維護性
- **代價**：配置文件數量增加，需要理解 include 機制

**決策 3：為什麼保留測試階段？**
- **原因**：降低切換風險，確保零停機遷移
- **收益**：可以充分驗證新配置，快速發現問題
- **代價**：增加 0.5 天的測試時間

**決策 4：為什麼保留 Cloudflare 作為 CDN 層？**
- **原因**：Cloudflare 提供 CDN、DDoS 防護、SSL/TLS 管理等服務
- **架構**：用戶 → Cloudflare → Nginx → 後端服務
- **收益**：
  - 全球 CDN 加速，降低延遲
  - 自動 DDoS 防護，無需額外配置
  - Cloudflare 管理 SSL 證書，簡化維護
  - 自動壓縮（Brotli/GZIP），節省頻寬
- **注意事項**：
  - 必須正確配置 `real_ip_header` 獲取真實 IP
  - 定期更新 Cloudflare IP 範圍（每月檢查）
  - SSL 終止在 Cloudflare，Nginx 使用 HTTP（80 端口）

---

**文檔版本**：v1.0
**最後更新**：2024-01-15
**維護者**：DaoDao 開發團隊