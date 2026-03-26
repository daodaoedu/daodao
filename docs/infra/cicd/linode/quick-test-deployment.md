# 快速測試部署指南

**目的**：在當前分支快速測試 Monorepo 雙應用部署
**預計時間**：15-20 分鐘

---

## 📋 前置檢查

```bash
# 1. 確認當前位置
cd /Users/xiaoxu/Projects/daodao/daodao-f2e
pwd

# 2. 確認當前分支
git branch --show-current

# 3. 確認 Docker 運行
docker ps

# 4. 確認後端網路存在
docker network ls | grep daodao-network
# 如果沒有，需要先啟動後端服務
```

---

## 🚀 快速部署步驟

### 步驟 1：創建測試環境變數（2分鐘）

```bash
# 創建測試用的 .env 文件
cat > .env.test << 'EOF'
NODE_ENV=production

# API 配置（使用測試環境後端）
NEXT_PUBLIC_API_URL=https://server.daoedu.tw/api/v1
NEXT_PUBLIC_BACKEND_URL=https://server.daoedu.tw

# Website 配置
NEXT_PUBLIC_SITE_URL_WEBSITE=http://localhost:3000
NEXT_PUBLIC_SITE_NAME_WEBSITE=島島阿學 (本地測試)

# Product 配置
NEXT_PUBLIC_SITE_URL_PRODUCT=http://localhost:3001
NEXT_PUBLIC_SITE_NAME_PRODUCT=島島阿學 - 產品 (本地測試)

# 功能開關
NEXT_PUBLIC_ENABLE_ANALYTICS=false
NEXT_PUBLIC_ENABLE_PWA=false
NEXT_PUBLIC_DEBUG_MODE=true

# 第三方服務（測試用，可以留空）
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID_WEBSITE=
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID_PRODUCT=
NEXT_PUBLIC_SENTRY_DSN_WEBSITE=
NEXT_PUBLIC_SENTRY_DSN_PRODUCT=

NEXT_TELEMETRY_DISABLED=1
EOF

echo "✅ 環境變數文件已創建：.env.test"
```

### 步驟 2：創建簡化的 docker-compose.test.yaml（3分鐘）

```bash
cat > docker-compose.test.yaml << 'EOF'
services:
  # Website 測試
  website_test:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        APP_NAME: website
        APP_PORT: 3000
    container_name: website_test
    restart: unless-stopped
    env_file:
      - .env.test
    environment:
      - NODE_ENV=production
      - PORT=3000
      - APP_NAME=website
    ports:
      - "3000:3000"
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'

  # Product 測試
  product_test:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        APP_NAME: product
        APP_PORT: 3001
    container_name: product_test
    restart: unless-stopped
    env_file:
      - .env.test
    environment:
      - NODE_ENV=production
      - PORT=3001
      - APP_NAME=product
    ports:
      - "3001:3001"
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3001"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
EOF

echo "✅ Docker Compose 配置已創建：docker-compose.test.yaml"
```

### 步驟 3：確認 Product 應用配置（1分鐘）

```bash
# 檢查 product 的 next.config.ts 是否有 output: "standalone"
grep -A 2 "output:" apps/product/next.config.ts

# 如果沒有，需要添加（暫時跳過也可以）
```

### 步驟 4：構建測試（5-10分鐘）

```bash
# 構建 website
echo "構建 website..."
docker-compose -f docker-compose.test.yaml build website_test

# 構建 product
echo "構建 product..."
docker-compose -f docker-compose.test.yaml build product_test

echo "✅ 構建完成"
```

### 步驟 5：啟動測試（2分鐘）

```bash
# 啟動所有測試容器
docker-compose -f docker-compose.test.yaml up -d

# 查看狀態
docker-compose -f docker-compose.test.yaml ps

# 查看日誌
docker-compose -f docker-compose.test.yaml logs -f
# 按 Ctrl+C 退出日誌查看
```

### 步驟 6：驗證部署（2分鐘）

```bash
# 等待容器啟動（約 30-60 秒）
sleep 60

# 檢查容器健康狀態
docker inspect --format='{{.State.Health.Status}}' website_test
docker inspect --format='{{.State.Health.Status}}' product_test

# 測試訪問
echo "測試 Website..."
curl -I http://localhost:3000

echo "測試 Product..."
curl -I http://localhost:3001
```

### 步驟 7：瀏覽器測試

在瀏覽器中訪問：
- Website: http://localhost:3000
- Product: http://localhost:3001

---

## 🔍 監控命令

```bash
# 查看資源使用
docker stats website_test product_test --no-stream

# 查看實時日誌
docker logs -f website_test   # Website 日誌
docker logs -f product_test   # Product 日誌

# 查看容器狀態
docker ps | grep test
```

---

## 🛠 常見問題

### 構建失敗

```bash
# 查看詳細錯誤
docker-compose -f docker-compose.test.yaml build --no-cache website_test

# 檢查 Dockerfile 是否存在
ls -la Dockerfile

# 檢查是否有足夠的磁碟空間
df -h
```

### 容器無法啟動

```bash
# 查看容器日誌
docker logs website_test
docker logs product_test

# 檢查端口是否被占用
lsof -i :3000
lsof -i :3001

# 如果端口被占用，可以修改 docker-compose.test.yaml 中的端口映射
```

### 內存不足

```bash
# 檢查系統內存
free -h

# 停止其他容器
docker ps
docker stop <其他容器名稱>

# 降低資源限制
# 編輯 docker-compose.test.yaml，將 512M 改為 384M
```

---

## 🧹 清理測試環境

```bash
# 停止並刪除測試容器
docker-compose -f docker-compose.test.yaml down

# 刪除測試映像（可選）
docker rmi daodao-f2e-website_test
docker rmi daodao-f2e-product_test

# 刪除測試文件
rm .env.test
rm docker-compose.test.yaml

echo "✅ 測試環境已清理"
```

---

## ✅ 測試成功後的下一步

如果測試成功，可以進行正式部署：

1. **創建正式的環境變數文件**
   - `.env.prod`
   - `.env.dev`
   - `.env.feature.template`

2. **創建正式的 docker-compose.yaml**
   - 包含所有 6 個服務
   - 使用優化的資源配置

3. **配置後端 Nginx**
   - 添加域名代理配置

4. **設置 CI/CD**
   - GitHub Actions workflows

詳細步驟請參考：
- `deployment-config-confirmed.md`
- `deployment-plan-2gb-ram.md`（針對 2GB RAM）

---

## 📊 預期結果

測試成功的標誌：

✅ 構建完成無錯誤
✅ 容器啟動成功
✅ 健康檢查通過
✅ 可以通過瀏覽器訪問
✅ 頁面正常渲染
✅ 內存使用在合理範圍（<1GB 總計）

---

## 💡 小技巧

### 並行構建（更快）

```bash
# 使用 --parallel 加速構建
docker-compose -f docker-compose.test.yaml build --parallel
```

### 只構建一個應用

```bash
# 只測試 website
docker-compose -f docker-compose.test.yaml up -d website_test

# 只測試 product
docker-compose -f docker-compose.test.yaml up -d product_test
```

### 重新構建並啟動

```bash
# 一次性重新構建並啟動
docker-compose -f docker-compose.test.yaml up -d --build
```

---

**文件維護者**：島島技術團隊
**最後更新**：2026-01-08
**用途**：快速測試部署
