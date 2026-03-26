# 使用現有 docker-compose.yml 測試部署

**分支**：feat/v3
**日期**：2026-01-08
**目的**：在當前分支使用現有的 docker-compose.yml 快速測試 Monorepo 雙應用部署

---

## 📋 前置確認

你的專案已經具備：
- ✅ `docker-compose.yml` - 已配置 website 和 product 兩個服務
- ✅ `Dockerfile` - 支援多應用構建（透過 APP_NAME 參數）
- ✅ 環境變數範例文件（.env.dev.example, .env.prod.example）

---

## 🚀 快速測試步驟（10分鐘）

### 步驟 1：創建測試環境變數（2分鐘）

```bash
cd /Users/xiaoxu/Projects/daodao/daodao-f2e

# 創建測試環境變數文件
cat > .env << 'EOF'
# 基本配置
NODE_ENV=production

# API 端點（使用測試環境）
NEXT_PUBLIC_API_BASE_URL=https://server.daoedu.tw/api/v1
NEXT_PUBLIC_BACKEND_URL=https://server.daoedu.tw

# 網站信息
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SITE_NAME=島島阿學 (本地測試)

# 功能開關
NEXT_PUBLIC_ENABLE_ANALYTICS=false
NEXT_PUBLIC_ENABLE_PWA=false
NEXT_PUBLIC_DEBUG_MODE=true

# 其他
NEXT_TELEMETRY_DISABLED=1
EOF

echo "✅ 環境變數文件已創建"
```

### 步驟 2：修改 docker-compose.yml 使用環境變數（1分鐘）

暫時啟用 env_file 配置（手動編輯或使用以下命令）：

```bash
# 備份原文件
cp docker-compose.yml docker-compose.yml.backup

# 取消註解 env_file（兩處）
sed -i '' 's/# env_file:/env_file:/' docker-compose.yml
sed -i '' 's/#   - \.env\.production/  - .env/' docker-compose.yml

echo "✅ docker-compose.yml 已更新"
```

或手動編輯 `docker-compose.yml`，將：
```yaml
# env_file:
#   - .env.production
```

改為：
```yaml
env_file:
  - .env
```

### 步驟 3：構建測試（5-8分鐘）

```bash
# 並行構建兩個應用
docker-compose build --parallel

# 查看構建結果
docker images | grep daodao
```

**預期輸出**：
```
daodao-f2e-website    latest    xxxxx    X minutes ago    XXX MB
daodao-f2e-product    latest    xxxxx    X minutes ago    XXX MB
```

### 步驟 4：啟動容器（1分鐘）

```bash
# 啟動所有服務
docker-compose up -d

# 查看容器狀態
docker-compose ps

# 查看日誌
docker-compose logs -f
```

**提示**：按 `Ctrl+C` 退出日誌查看

### 步驟 5：驗證部署（2分鐘）

```bash
# 等待容器啟動（約 30-60 秒）
sleep 60

# 測試 Website
echo "測試 Website..."
curl -I http://localhost:3000

# 測試 Product
echo "測試 Product..."
curl -I http://localhost:3001

# 查看容器健康狀態
docker ps | grep daodao
```

### 步驟 6：瀏覽器測試

在瀏覽器中訪問：
- **Website**: http://localhost:3000
- **Product**: http://localhost:3001

檢查：
- ✅ 頁面是否正常載入
- ✅ 樣式是否正確
- ✅ API 連接是否正常
- ✅ Console 是否有錯誤

---

## 📊 監控命令

### 查看容器狀態
```bash
docker-compose ps
```

### 查看資源使用
```bash
docker stats daodao-website daodao-product --no-stream
```

### 查看實時日誌
```bash
# Website 日誌
docker logs -f daodao-website

# Product 日誌
docker logs -f daodao-product

# 所有服務日誌
docker-compose logs -f
```

### 進入容器檢查
```bash
# 進入 Website 容器
docker exec -it daodao-website sh

# 進入 Product 容器
docker exec -it daodao-product sh

# 檢查應用文件
ls -la /app
```

---

## 🛠 常見問題排除

### 問題 1：構建失敗

```bash
# 查看詳細錯誤
docker-compose build website --no-cache

# 檢查 Dockerfile
cat Dockerfile

# 檢查磁碟空間
df -h
```

### 問題 2：容器無法啟動

```bash
# 查看容器日誌
docker logs daodao-website
docker logs daodao-product

# 檢查端口是否被占用
lsof -i :3000
lsof -i :3001

# 如果端口被占用，停止占用的進程或修改端口映射
```

### 問題 3：API 連接失敗

```bash
# 檢查環境變數
docker exec daodao-website env | grep NEXT_PUBLIC

# 測試後端連接
curl https://server.daoedu.tw/api/v1/health
```

### 問題 4：頁面載入很慢

```bash
# 檢查容器資源使用
docker stats daodao-website daodao-product

# 如果內存不足，可以增加 Docker 資源限制
# 在 docker-compose.yml 中調整或移除 deploy.resources
```

### 問題 5：Product 應用構建失敗

Product 應用的 `next.config.ts` 目前缺少 `output: "standalone"` 配置。

**臨時解決方案**：
```bash
# 在測試前添加配置
echo "正在更新 product/next.config.ts..."
# 手動編輯 apps/product/next.config.ts
# 添加 output: "standalone"
```

或先只測試 Website：
```bash
# 只啟動 website
docker-compose up -d website
```

---

## 🧹 測試完成後清理

### 方式 1：停止容器（保留資料）
```bash
# 停止容器
docker-compose stop

# 稍後重新啟動
docker-compose start
```

### 方式 2：刪除容器（保留映像）
```bash
# 停止並刪除容器
docker-compose down

# 稍後重新創建
docker-compose up -d
```

### 方式 3：完全清理（包含映像）
```bash
# 停止並刪除容器、網路
docker-compose down

# 刪除映像
docker rmi daodao-f2e-website daodao-f2e-product

# 恢復 docker-compose.yml
mv docker-compose.yml.backup docker-compose.yml

# 刪除測試環境變數
rm .env

echo "✅ 清理完成"
```

---

## 📝 測試檢查清單

部署成功的標誌：

- [ ] 構建完成無錯誤
- [ ] Website 容器啟動成功
- [ ] Product 容器啟動成功
- [ ] Website 可通過 http://localhost:3000 訪問
- [ ] Product 可通過 http://localhost:3001 訪問
- [ ] 頁面正常渲染
- [ ] API 連接正常
- [ ] Console 無關鍵錯誤
- [ ] 記憶體使用合理（每個容器 < 500MB）

---

## 🎯 測試成功後的下一步

如果測試成功，表示：
- ✅ Monorepo 架構配置正確
- ✅ Dockerfile 支援多應用構建
- ✅ Docker Compose 配置可用

接下來可以：

### 選項 1：繼續本地測試
- 測試更多功能
- 驗證 API 整合
- 檢查性能表現

### 選項 2：準備正式部署
1. 完善 Product 配置（添加 `output: "standalone"`）
2. 創建正式環境變數（.env.prod, .env.dev）
3. 配置資源限制（適配 2GB RAM）
4. 設置 CI/CD（GitHub Actions）
5. 配置後端 Nginx

詳細步驟請參考：
- `deployment-config-confirmed.md` - 完整部署配置
- `deployment-plan-2gb-ram.md` - 2GB RAM 優化方案
- `monorepo-deployment-guide.md` - 完整部署指南

---

## 💡 效能優化建議

### 如果構建太慢
```bash
# 使用 BuildKit 加速
DOCKER_BUILDKIT=1 docker-compose build --parallel
```

### 如果內存不足
```bash
# 在 docker-compose.yml 中添加資源限制
deploy:
  resources:
    limits:
      memory: 512M
      cpus: '0.5'
```

### 如果需要更快的迭代
```bash
# 開發模式（不使用 Docker）
pnpm dev:website  # 啟動 website 開發服務器
pnpm dev:product  # 啟動 product 開發服務器
```

---

## 📞 需要幫助？

如果遇到問題：

1. **查看日誌**：`docker-compose logs -f`
2. **檢查文檔**：參考 `/Users/xiaoxu/Projects/daodao/doc/CICD-LINODE/` 中的其他文件
3. **清理重試**：`docker-compose down && docker-compose up -d --build`

---

**文件維護者**：島島技術團隊
**最後更新**：2026-01-08
**用途**：使用現有 docker-compose.yml 快速測試部署
