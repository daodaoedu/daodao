# 島島前端 Monorepo 部署規劃調整總結

**文件日期**：2026-01-08
**規劃狀態**：待確認

---

## 📊 調整概要

根據 daodao-f2e 專案的實際 **Monorepo 架構**（包含 website 和 product 兩個應用），已完成針對 Linode 部署的規劃調整。

---

## 🎯 關鍵發現

### 1. Monorepo 結構

daodao-f2e 是一個 **pnpm workspace monorepo**，包含：

```
daodao-f2e/
├── apps/
│   ├── website/          # 主站應用 (port 3000)
│   └── product/          # 產品應用 (port 3001)
└── packages/             # 共用套件
    ├── api/
    ├── assets/
    ├── i18n/
    └── ui/
```

### 2. 域名映射策略（已確認）

| 應用 | 正式環境 | 測試環境 | 功能分支 |
|------|----------|----------|----------|
| Website | daodao.so | dev.daodao.so | feat-{branch}.daodao.so |
| Product | app.daodao.so | app-dev.daodao.so | app-feat-{branch}.daodao.so |

### 3. 現有配置狀況

| 項目 | Website | Product | 狀態 |
|------|---------|---------|------|
| next.config.ts | ✅ 有 `output: "standalone"` | ⚠️ 缺少 `output: "standalone"` | 需要添加 |
| Dockerfile | ✅ 已支援多應用構建 (透過 APP_NAME) | ✅ 同左 | 完善 |

---

## 📄 已創建的規劃文件

### 1. 主要部署指南

**位置**：`/Users/xiaoxu/Projects/daodao/doc/CICD-LINODE/monorepo-deployment-guide.md`

**內容**：
- ✅ Monorepo 架構說明
- ✅ 雙應用域名映射策略
- ✅ 完整的 docker-compose.yaml 配置（6 個服務）
  - website_prod, product_prod
  - website_dev, product_dev
  - website_feat, product_feat
- ✅ 環境變數管理（.env.prod, .env.dev, .env.feature.template）
- ✅ 統一部署腳本（deploy.sh）支援：
  - 按環境部署：`./deploy.sh prod all`
  - 按應用部署：`./deploy.sh prod website`
  - 功能分支：`./deploy.sh feature all update`
- ✅ 後端 Nginx 配置範例
- ✅ 監控與故障排除

### 2. GitHub Actions Workflows

**位置**：`/Users/xiaoxu/Projects/daodao/daodao-f2e/.github/workflows/`

已創建三個 workflow 文件：

#### a. `deploy-prod.yml`
- 觸發：push 到 prod 分支 或 手動觸發
- 支援選擇部署應用：all / website / product
- 兩個 job：deploy-website, deploy-product
- 包含 Discord 通知

#### b. `deploy-dev.yml`
- 觸發：push 到 dev 分支 或 手動觸發
- 支援選擇部署應用：all / website / product
- 兩個 job：deploy-website, deploy-product
- 包含 Discord 通知

#### c. `deploy-feature.yml`
- 觸發：手動觸發，需要指定分支名稱和應用
- 支援選擇部署應用：all / website / product
- 兩個 job：deploy-website, deploy-product
- 包含 Discord 通知

---

## 🔧 待實施的更改

### 必要更改

1. **Product 應用配置**
   ```typescript
   // apps/product/next.config.ts
   const nextConfig: NextConfig = {
     output: "standalone",  // ← 需要添加這行
     // ... 其他配置
   };
   ```

2. **創建環境變數文件**
   - `.env.prod` - 正式環境
   - `.env.dev` - 測試環境
   - `.env.feature.template` - 功能分支模板

3. **創建 docker-compose.yaml**
   - 定義 6 個服務（2 應用 × 3 環境）
   - 配置網路連接到後端

4. **創建部署腳本**
   - `deploy.sh` - 支援多應用、多環境部署
   - `rollback.sh` - 回滾腳本（可選）

5. **更新後端 Nginx 配置**
   - 添加 6 個域名的代理配置
   - 配置 SSL 證書

### 可選更改

1. **申請 SSL 證書**
   ```bash
   # 泛域名證書（推薦）
   certbot certonly --dns-cloudflare \
     -d daodao.so -d *.daodao.so
   ```

2. **設置 GitHub Secrets**
   - DOCKER_HUB_USERNAME
   - DOCKER_HUB_TOKEN
   - LINODE_HOST
   - LINODE_USER
   - LINODE_SSH_KEY
   - DISCORD_WEBHOOK

---

## 📊 服務清單

### Docker Compose 服務

| 服務名稱 | 應用 | 環境 | 容器名稱 | 端口 | 網路 |
|---------|------|------|----------|------|------|
| website_prod | Website | 正式 | website_prod | 3000 | prod-daodao-network |
| product_prod | Product | 正式 | product_prod | 3001 | prod-daodao-network |
| website_dev | Website | 測試 | website_dev | 3000 | dev-daodao-network |
| product_dev | Product | 測試 | product_dev | 3001 | dev-daodao-network |
| website_feat | Website | 功能分支 | website_feat_{branch} | 3000 | dev-daodao-network |
| product_feat | Product | 功能分支 | product_feat_{branch} | 3001 | dev-daodao-network |

### Nginx 路由配置

| 域名 | 目標容器 | 說明 |
|------|----------|------|
| daodao.so | website_prod:3000 | Website 正式環境 |
| app.daodao.so | product_prod:3001 | Product 正式環境 |
| dev.daodao.so | website_dev:3000 | Website 測試環境 |
| app-dev.daodao.so | product_dev:3001 | Product 測試環境 |
| feat-{branch}.daodao.so | website_feat_{branch}:3000 | Website 功能分支 |
| app-feat-{branch}.daodao.so | product_feat_{branch}:3001 | Product 功能分支 |

---

## 🚀 部署命令範例

### 正式環境

```bash
# 部署所有應用
./deploy.sh prod all

# 只部署 website
./deploy.sh prod website

# 只部署 product
./deploy.sh prod product
```

### 測試環境

```bash
# 部署所有應用
./deploy.sh dev all

# 只部署 website
./deploy.sh dev website

# 只部署 product
./deploy.sh dev product
```

### 功能分支

```bash
# 部署功能分支所有應用
./deploy.sh feature all update

# 只部署 website
./deploy.sh feature website update

# 只部署 product
./deploy.sh feature product update
```

---

## ⚠️ 與原規劃的差異

### 原始 `multi-environment-deployment.md` 假設

- ✅ 單一前端應用
- ✅ 三環境部署（prod, dev, feature）
- ✅ 使用 external network 連接後端

### 實際 Monorepo 調整

- ✅ **雙應用**：website + product
- ✅ **6 個服務**：2 應用 × 3 環境
- ✅ **6 個域名**：獨立的域名映射
- ✅ **統一部署腳本**：支援選擇應用部署
- ✅ **獨立 CI/CD**：每個應用有獨立的 job

---

## 📋 待確認事項

### 1. 域名策略
- ✅ 已確認：website → daodao.so, product → app.daodao.so
- ⏳ 待確認：DNS 配置權限和時程
- ⏳ 待確認：SSL 證書申請方式

### 2. 部署順序
- ✅ **已確認：同時部署兩個應用**
- 使用 `docker-compose build --parallel` 並行構建
- 使用 `docker-compose up -d` 同時啟動所有容器
- CI/CD 的兩個 job 也會並行執行

### 3. 環境變數
- ✅ **已確認：兩個應用共用同個後端 API**
  - 正式環境：`https://dao-server.daoedu.tw/api/v1`
  - 測試環境：`https://server.daoedu.tw/api/v1`
- ✅ **已確認：Google Analytics 使用不同的 GA ID**
  - Website: `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID_WEBSITE`
  - Product: `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID_PRODUCT`
- ✅ **已確認：Sentry 使用不同的 Project**
  - Website: `NEXT_PUBLIC_SENTRY_DSN_WEBSITE`
  - Product: `NEXT_PUBLIC_SENTRY_DSN_PRODUCT`

### 4. 資源限制
- ✅ **已確認：VPS 只有 2GB RAM**
- 📊 **針對 2GB RAM 的優化方案**：
  - **正式環境**：512MB × 2 = 1GB（常駐運行）
  - **測試環境**：384MB × 2 = 768MB（**按需啟動**）
  - **功能分支**：384MB × 2 = 768MB（**按需啟動**）
  - ⚠️ **重要**：無法同時運行所有環境
  - **策略**：正式環境常駐，測試和功能分支按需啟停
  - 詳見：`deployment-plan-2gb-ram.md` ⭐

### 5. 功能分支策略
- ⏳ 功能分支是否真的需要同時部署兩個應用？
- ⏳ 還是通常只測試其中一個？

---

## 📈 下一步行動

### 階段 1：配置準備（預估 2-3 小時）

1. **確認需求**
   - [ ] 確認域名策略無誤
   - [ ] 確認環境變數配置
   - [ ] 確認資源限制是否合理

2. **創建配置文件**
   - [ ] 創建 .env.prod
   - [ ] 創建 .env.dev
   - [ ] 創建 .env.feature.template
   - [ ] 創建 docker-compose.yaml
   - [ ] 創建 deploy.sh

3. **更新應用配置**
   - [ ] 更新 product/next.config.ts 添加 standalone
   - [ ] 檢查 Dockerfile 是否需要調整

### 階段 2：後端配置（預估 1-2 小時）

1. **DNS 配置**
   - [ ] 添加新域名 A 記錄：app.daodao.so
   - [ ] 添加測試域名：app-dev.daodao.so
   - [ ] 配置泛域名：app-feat-*.daodao.so

2. **SSL 證書**
   - [ ] 申請或更新泛域名證書
   - [ ] 驗證證書包含所有子域名

3. **Nginx 配置**
   - [ ] 更新 nginx.conf 添加新域名配置
   - [ ] 測試 nginx 配置：`nginx -t`
   - [ ] 重新載入 nginx：`nginx -s reload`

### 階段 3：測試部署（預估 2-3 小時）

1. **本地測試**
   - [ ] 本地構建測試：`docker-compose build`
   - [ ] 本地運行測試：`docker-compose up`

2. **測試環境部署**
   - [ ] 部署 website_dev
   - [ ] 部署 product_dev
   - [ ] 驗證訪問和功能

3. **功能分支測試**
   - [ ] 測試功能分支部署流程
   - [ ] 驗證動態域名解析

### 階段 4：正式部署（預估 1-2 小時）

1. **生產環境部署**
   - [ ] 部署 website_prod
   - [ ] 部署 product_prod
   - [ ] 健康檢查

2. **CI/CD 配置**
   - [ ] 設置 GitHub Secrets
   - [ ] 測試自動部署流程
   - [ ] 測試 Discord 通知

3. **監控設置**
   - [ ] 配置日誌監控
   - [ ] 配置健康檢查
   - [ ] 設置告警通知

---

## 📚 參考文件

- **主要部署指南**：`monorepo-deployment-guide.md`
- **原始多環境部署**：`multi-environment-deployment.md`
- **域名架構規劃**：`domain-architecture.md`
- **整合指南**：`integration-guide.md`

---

## 💬 問題與討論

如有任何疑問或需要調整，請確認：

1. **域名策略是否符合需求？**
   - website → daodao.so
   - product → app.daodao.so

2. **部署策略是否合理？**
   - 同時部署兩個應用？
   - 還是分階段部署？

3. **環境變數配置是否需要調整？**
   - 是否需要為兩個應用配置不同的 API 端點？
   - 其他配置是否需要差異化？

4. **資源配置是否需要調整？**
   - 當前配置：每個容器 1GB RAM, 1 CPU
   - 是否需要根據實際需求調整？

---

**文件維護者**：島島技術團隊
**規劃日期**：2026-01-08
**狀態**：待確認
