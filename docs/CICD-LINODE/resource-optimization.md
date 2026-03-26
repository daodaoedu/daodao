# 容器資源配置優化建議

**文件日期**：2026-01-08
**目的**：優化容器資源配置，降低 VPS 需求

---

## 📊 當前配置分析

### 原始配置（過於保守）

| 環境 | 容器數量 | 每容器限制 | 每容器預留 | 總限制 | 總預留 |
|------|---------|-----------|-----------|--------|--------|
| 正式 | 2 | 1GB | 512MB | 2GB | 1GB |
| 測試 | 2 | 1GB | 512MB | 2GB | 1GB |
| 功能分支 | 2 | 1GB | 512MB | 2GB | 1GB |
| **總計** | **6** | - | - | **6GB** | **3GB** |

**問題**：
- ❌ 資源分配過於保守
- ❌ 功能分支通常不會同時運行多個
- ❌ 實際 Next.js 應用很少需要 1GB RAM

---

## 🔍 實際 Next.js 內存使用分析

### 典型 Next.js 應用內存使用

| 應用規模 | 初始內存 | 穩定運行 | 高負載 |
|---------|---------|---------|--------|
| 小型（5-10頁） | 150MB | 200-300MB | 400MB |
| 中型（20-50頁） | 200MB | 300-400MB | 600MB |
| 大型（100+頁） | 250MB | 400-600MB | 800MB |

### daodao-f2e 預估

基於 Monorepo 結構和功能複雜度：

**Website 應用**：
- 預估頁面數：~30-50頁
- 預估內存：300-500MB（穩定運行）
- **建議限制：512MB**

**Product 應用**：
- 預估頁面數：~20-40頁
- 預估內存：300-500MB（穩定運行）
- **建議限制：512MB**

---

## ✅ 優化後的資源配置

### 方案 1：平衡配置（推薦）⭐

```yaml
services:
  # 正式環境 - 需要較多資源保證穩定性
  website_prod:
    deploy:
      resources:
        limits:
          memory: 768M      # 降低到 768MB
          cpus: '0.75'      # 降低到 0.75 CPU
        reservations:
          memory: 384M      # 降低到 384MB
          cpus: '0.5'

  product_prod:
    deploy:
      resources:
        limits:
          memory: 768M
          cpus: '0.75'
        reservations:
          memory: 384M
          cpus: '0.5'

  # 測試環境 - 可以更少資源
  website_dev:
    deploy:
      resources:
        limits:
          memory: 512M      # 降低到 512MB
          cpus: '0.5'       # 降低到 0.5 CPU
        reservations:
          memory: 256M      # 降低到 256MB
          cpus: '0.25'

  product_dev:
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
        reservations:
          memory: 256M
          cpus: '0.25'

  # 功能分支 - 最少資源
  website_feat:
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
        reservations:
          memory: 256M
          cpus: '0.25'

  product_feat:
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
        reservations:
          memory: 256M
          cpus: '0.25'
```

**資源需求總結**：

| 環境 | 容器數量 | 限制 RAM | 預留 RAM |
|------|---------|---------|---------|
| 正式 | 2 | 1.5GB | 768MB |
| 測試 | 2 | 1GB | 512MB |
| 功能分支 | 2 | 1GB | 512MB |
| **總計** | **6** | **3.5GB** | **1.8GB** |

**實際情況**：
- ✅ 正式環境通常一直運行：1.5GB
- ✅ 測試環境通常一直運行：1GB
- ✅ 功能分支**按需運行**（通常只有 0-1 個）：0-1GB
- **實際最大需求**：約 **2.5-3.5GB RAM**

---

### 方案 2：激進優化（節省資源）

如果 VPS 資源有限，可以進一步優化：

```yaml
services:
  # 正式環境
  website_prod:
    deploy:
      resources:
        limits:
          memory: 640M      # 進一步降低
          cpus: '0.5'
        reservations:
          memory: 320M
          cpus: '0.25'

  product_prod:
    deploy:
      resources:
        limits:
          memory: 640M
          cpus: '0.5'
        reservations:
          memory: 320M
          cpus: '0.25'

  # 測試環境
  website_dev:
    deploy:
      resources:
        limits:
          memory: 384M      # 更少資源
          cpus: '0.5'
        reservations:
          memory: 192M
          cpus: '0.25'

  product_dev:
    deploy:
      resources:
        limits:
          memory: 384M
          cpus: '0.5'
        reservations:
          memory: 192M
          cpus: '0.25'

  # 功能分支 - 同測試環境
  website_feat:
    deploy:
      resources:
        limits:
          memory: 384M
          cpus: '0.5'
        reservations:
          memory: 192M
          cpus: '0.25'

  product_feat:
    deploy:
      resources:
        limits:
          memory: 384M
          cpus: '0.5'
        reservations:
          memory: 192M
          cpus: '0.25'
```

**資源需求總結**：

| 環境 | 限制 RAM | 預留 RAM |
|------|---------|---------|
| 正式 | 1.28GB | 640MB |
| 測試 | 768MB | 384MB |
| 功能分支 | 768MB | 384MB |
| **實際最大需求** | **約 2-2.5GB** | **約 1GB** |

---

## 🎯 推薦配置

### 根據 VPS 規格選擇

#### VPS 有 4GB+ RAM → 使用方案 1（平衡配置）⭐
```
正式：768MB × 2 = 1.5GB
測試：512MB × 2 = 1GB
功能分支（按需）：512MB × 2 = 1GB
總計：約 2.5-3.5GB
```

**優點**：
- ✅ 有足夠的緩衝空間
- ✅ 可以應對流量突增
- ✅ 容器不容易被 OOM Kill

#### VPS 只有 2-4GB RAM → 使用方案 2（激進優化）
```
正式：640MB × 2 = 1.28GB
測試：384MB × 2 = 768MB
功能分支（按需）：384MB × 2 = 768MB
總計：約 2-2.5GB
```

**注意事項**：
- ⚠️ 需要密切監控內存使用
- ⚠️ 流量大時可能需要擴容
- ⚠️ 建議設置 swap 作為緩衝

---

## 📈 監控與調整

### 部署後監控

```bash
# 查看容器實際內存使用
docker stats --format "table {{.Name}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.CPUPerc}}"

# 持續監控
watch -n 5 'docker stats --no-stream --format "table {{.Name}}\t{{.MemUsage}}"'
```

### 判斷是否需要調整

**增加資源的信號**：
- 容器頻繁被 OOM Kill
- 內存使用長期超過 80%
- 響應時間明顯變慢
- 日誌中出現內存相關錯誤

**可以降低資源的信號**：
- 內存使用長期低於 50%
- CPU 使用長期低於 30%
- 沒有性能問題

### 動態調整

```bash
# 如果發現某個容器需要更多資源
# 1. 更新 docker-compose.yaml 中的限制
# 2. 重新創建容器
docker-compose up -d --force-recreate website_prod

# 查看效果
docker inspect website_prod --format='{{.HostConfig.Memory}}'
```

---

## 💡 其他優化建議

### 1. 啟用 Swap（推薦）

如果 VPS 資源緊張，啟用 swap 作為緩衝：

```bash
# 創建 2GB swap
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 永久啟用
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# 調整 swappiness（降低 swap 使用頻率）
sudo sysctl vm.swappiness=10
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
```

### 2. 功能分支策略

**建議**：同一時間只部署一個功能分支

```bash
# 在部署新功能分支前，清理舊的
./deploy.sh feature all new-branch

# 這會自動替換舊的功能分支容器
```

### 3. 使用按需部署

如果測試環境不常用，可以手動啟停：

```bash
# 工作時啟動測試環境
docker-compose up -d website_dev product_dev

# 下班後停止測試環境
docker-compose stop website_dev product_dev

# 節省：1GB RAM
```

### 4. 定期清理

```bash
# 清理未使用的映像（釋放磁盤空間）
docker image prune -a -f

# 清理未使用的容器
docker container prune -f

# 清理未使用的網路
docker network prune -f

# 完整清理（小心使用）
docker system prune -a --volumes -f
```

---

## 📋 VPS 規格建議

### 最低配置
- **RAM**: 2GB
- **CPU**: 1 Core
- **磁盤**: 20GB SSD
- **適用**：只運行正式環境 + 偶爾測試

### 推薦配置⭐
- **RAM**: 4GB
- **CPU**: 2 Cores
- **磁盤**: 40GB SSD
- **適用**：正式 + 測試環境，偶爾功能分支

### 舒適配置
- **RAM**: 8GB
- **CPU**: 4 Cores
- **磁盤**: 80GB SSD
- **適用**：所有環境同時運行，多個功能分支

---

## 🎯 決策建議

### 請回答以下問題：

1. **你的 VPS 有多少 RAM？**
   - [ ] 2GB
   - [ ] 4GB
   - [ ] 8GB+

2. **通常會同時運行哪些環境？**
   - [ ] 只有正式環境
   - [ ] 正式 + 測試
   - [ ] 正式 + 測試 + 功能分支

3. **預期流量規模？**
   - [ ] 小（<1000 日活）
   - [ ] 中（1000-10000 日活）
   - [ ] 大（>10000 日活）

根據你的回答，我會推薦最適合的資源配置方案。

---

## 📝 配置更新步驟

如果決定採用優化配置：

1. **更新 docker-compose.yaml**
   ```bash
   # 使用優化後的資源配置
   # 參考上面的方案 1 或方案 2
   ```

2. **重新部署容器**
   ```bash
   # 使用新配置重新創建容器
   docker-compose up -d --force-recreate
   ```

3. **監控一週**
   ```bash
   # 每天檢查內存使用
   docker stats --no-stream
   ```

4. **根據監控結果調整**
   - 如果內存不足，增加限制
   - 如果內存充裕，可以進一步降低

---

**文件維護者**：島島技術團隊
**最後更新**：2026-01-08
