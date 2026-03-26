# ✅ Feature 分支自動部署已啟用！

**日期**：2026-01-09
**狀態**：完成配置

---

## 🎉 現在可以自動部署 Feature 分支了！

### 如何使用

**只需要推送任何 `feat/*` 分支，就會自動部署：**

```bash
# 1. 在 feature 分支開發
git checkout feat/v3
# ... 修改代碼 ...

# 2. 推送（自動觸發部署）
git push origin feat/v3

# 3. 等待 10-15 分鐘，收到 Discord 通知
# 4. 訪問測試環境查看
```

---

## 📊 配置說明

### 部署環境

| 項目 | 說明 |
|-----|------|
| **容器名稱** | `feat_website`, `feat_product` |
| **使用配置** | `.env.dev`（測試環境配置） |
| **網路** | `dev-daodao-network` |
| **資源限制** | 384MB RAM（與 dev 環境相同） |
| **映像標籤** | `feat-{commit-sha}` |

### 觸發條件

```yaml
on:
  push:
    branches:
      - 'feat/**'
```

**任何 `feat/*` 分支都會觸發自動部署！**

---

## ⚠️ 重要注意事項

### 1. 只有一個 Feature 環境

**同一時間只有一個 feature 環境在運行！**

- 容器名稱固定為 `feat_website` 和 `feat_product`
- 每次推送新的 feature 分支會**替換**原有的容器

**範例**：
```bash
# 推送 feat/feature-a → 部署到 feat_website
# 推送 feat/feature-b → 替換 feat_website（feature-a 被覆蓋）
```

### 2. 跳過 CI 檢查

Feature 分支**不會執行 CI 檢查**（加快部署速度）：
- ❌ TypeScript 檢查
- ❌ Lint 檢查  
- ❌ 測試

如需 CI 檢查，請創建 PR 到 dev 分支。

### 3. 使用測試環境配置

Feature 分支使用 `.env.dev` 配置：
- 後端 API：測試環境
- Debug 模式：啟用
- Analytics：禁用

---

## 📝 已修改的文件

### 1. `.github/workflows/linode-cd.yml`

**修改內容**：
- 添加 `feat/**` 到觸發分支
- 環境變數邏輯支援 feat 分支
- 部署腳本使用 `.env.dev` 配置

### 2. `docker-compose.yaml`

**新增服務**：
```yaml
feat_website:
  image: ${DOCKER_HUB_USERNAME}/daodao-website:feat-${COMMIT_SHA}
  container_name: feat_website
  env_file: .env.dev
  networks:
    - dev-daodao-network
  deploy:
    resources:
      limits:
        memory: 384M

feat_product:
  image: ${DOCKER_HUB_USERNAME}/daodao-product:feat-${COMMIT_SHA}
  container_name: feat_product
  env_file: .env.dev
  networks:
    - dev-daodao-network
  deploy:
    resources:
      limits:
        memory: 384M
```

---

## 🚀 完整流程

```
Push feat/v3
    ↓
[跳過 CI] 
    ↓
[Build] Website & Product Docker Images
    ↓
[Push] to Docker Hub (feat-{sha})
    ↓
[Deploy] SSH to Linode
    ├─ Pull feat-{sha} images
    ├─ Stop old feat_website, feat_product
    ├─ Start new feat_website, feat_product
    └─ Health Check
    ↓
[Notify] Discord
```

---

## 💡 最佳實踐

### 1. 推送前確認

檢查 Discord 是否有人正在使用 feature 環境

### 2. 用完清理

```bash
# SSH 到 Linode
ssh root@<LINODE_IP>
cd /root/daodao-f2e

# 停止 feature 容器（節省資源）
docker compose -f docker-compose.yaml stop feat_website feat_product
```

### 3. 合併到 dev

測試完成後合併到 dev 分支：
```bash
git checkout dev
git merge feat/v3
git push origin dev
```

---

## 🔧 Nginx 配置（需要添加）

在 daodao-server 的 nginx.conf 中添加：

```nginx
# Feature - Website
server {
    listen 443 ssl http2;
    server_name feat.daodao.so;

    location / {
        proxy_pass http://feat_website:3000;
        # ... 標準代理配置 ...
    }
}

# Feature - Product
server {
    listen 443 ssl http2;
    server_name app-feat.daodao.so;

    location / {
        proxy_pass http://feat_product:3001;
        # ... 標準代理配置 ...
    }
}
```

---

## 📚 相關文檔

- **主要部署指南**：`daodao-f2e-linode-deployment.md`
- **Docker Compose**：`docker-compose.yaml`
- **CD Workflow**：`.github/workflows/linode-cd.yml`

---

**維護者**：島島技術團隊
**創建日期**：2026-01-09
