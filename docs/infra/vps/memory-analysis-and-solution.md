# VPS 記憶體分析與部署失敗解決方案

**文件建立日期**：2026-01-07
**分析對象**：daodao-ai-backend 生產環境部署
**VPS 規格**：2GB RAM

---

## 📊 一、當前記憶體使用狀況

### 1.1 整體記憶體概況

根據 `demand.md` 中的 `top` 輸出資料：

```
總記憶體:   1963.8 MiB (約 2GB)
已使用:     1150.1 MiB (58.5%)
空閒記憶體:   79.8 MiB (僅 4% - ⚠️ 極度危險！)
緩衝/快取:   733.9 MiB
實際可用:    605.8 MiB

Swap 使用情況:
總 Swap:    4608.0 MiB
已使用:      650.6 MiB (14.1%)
空閒:       3957.4 MiB
```

### 1.2 主要記憶體占用進程

| 進程 | 記憶體使用 | 占比 | 說明 |
|------|-----------|------|------|
| dockerd | 289.3 MB | 14.4% | Docker 守護進程 |
| node /app/index | 276.4 MB | 13.7% | Node.js 應用 1 |
| node /app/dist/ | 120.3 MB | 6.0% | Node.js 應用 2 |
| containerd | 22.9 MB | 1.1% | 容器運行時 |

**總計前四大進程**：約 709 MB (36% 記憶體)

### 1.3 嚴重性評估

🔴 **極高風險**
- 空閒記憶體僅剩 79.8 MiB (4%)
- 已開始使用 Swap（650 MB），導致效能下降
- 任何新服務啟動都可能觸發 OOM (Out of Memory) Killer

---

## 🔍 二、部署失敗根本原因分析

### 2.1 問題定位

**關鍵問題**：`Dockerfile` 第 62 行配置了 **4 個 workers**

```dockerfile
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
```

### 2.2 記憶體需求估算

#### 單一 Worker 記憶體需求
- **AI 模型載入** (sentence-transformers)：200-400 MB
- **Python 運行時**：50-80 MB
- **FastAPI 框架**：30-50 MB
- **依賴函式庫**：20-30 MB

**單一 Worker 總計**：約 300-560 MB

#### 4 Workers 總需求
```
4 workers × 400 MB (平均) = 1,600 MB
```

### 2.3 服務堆疊記憶體需求

根據 `docker-compose.prod.yml` 和 `.env.prod`，生產環境包含：

| 服務 | 預估記憶體 |
|------|-----------|
| daodao-ai-backend (4 workers) | 1,600 MB |
| redis-prod | 50-100 MB |
| ollama-prod (phi3:mini) | 400-800 MB |
| pg-prod (PostgreSQL) | 100-200 MB |
| qdrant-prod | 200-400 MB |
| clickhouse-prod | 200-500 MB |
| **總計** | **2,550-3,600 MB** |

**結論**：所需記憶體遠超 VPS 的 2GB 容量！

### 2.4 失敗場景推測

1. Docker build 時可能成功（因為只載入一次）
2. `docker-compose up` 啟動時，嘗試啟動 4 個 workers
3. 第 2-3 個 worker 啟動時記憶體不足
4. Linux OOM Killer 強制終止進程
5. 容器健康檢查失敗，服務無法啟動

---

## 💡 三、解決方案

### 方案 A：調整 Workers 數量（✅ 推薦）

#### 優點
- 立即見效，記憶體占用降至 ~400-500 MB
- 實施簡單，只需修改一行
- 適合中低流量應用

#### 缺點
- 並發處理能力下降
- 單一請求阻塞會影響其他請求
- CPU 多核心利用率降低

#### 實施步驟

**修改 `Dockerfile` 第 62 行**：

```dockerfile
# 修改前
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]

# 修改後
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
```

**重新構建並部署**：

```bash
cd /path/to/daodao-ai-backend
make rebuild-prod
```

---

### 方案 B：環境變數動態配置（🌟 最佳彈性）

#### 優點
- 不同環境可使用不同 worker 數量
- 生產環境可快速調整而無需重建映像檔
- 便於測試不同配置

#### 實施步驟

**1. 修改 `Dockerfile` 第 62 行**：

```dockerfile
# 使用環境變數，預設為 1
CMD sh -c "uvicorn src.main:app --host 0.0.0.0 --port 8000 --workers ${WORKERS:-1}"
```

**2. 在 `.env.prod` 中添加配置**：

```env
# 在檔案末尾添加
WORKERS=1
```

**3. 修改 `docker-compose.prod.yml`（如需要）**：

```yaml
services:
  backend-prod:
    # ... 其他配置
    environment:
      - WORKERS=${WORKERS:-1}
```

---

### 方案 C：關閉非必要服務

#### 可考慮關閉的服務

1. **Ollama** (如果可用外部 API)
   - 記憶體節省：400-800 MB
   - 修改：註解掉相關容器或使用雲端服務

2. **ClickHouse** (如果暫不使用分析功能)
   - 記憶體節省：200-500 MB
   - 修改：`docker-compose.prod.yml` 中註解

3. **Qdrant** (如果可用 Qdrant Cloud)
   - 記憶體節省：200-400 MB
   - 修改：使用 SaaS 方案

#### 最小化配置建議

```yaml
# docker-compose.prod.yml - 最小化版本
services:
  backend-prod:
    # ... (workers=1)

  redis-prod:
    # ... (必需，但占用小)

  # 其他服務視需求啟用
```

---

### 方案 D：升級 VPS 規格（🚀 長期方案）

#### 建議規格

| 配置 | RAM | 適用場景 |
|------|-----|---------|
| 最小可用 | 4GB | workers=2，基本服務 |
| 推薦配置 | 8GB | workers=4，完整服務堆疊 |
| 理想配置 | 16GB | workers=4-8，高並發 + 所有服務 |

#### 成本效益分析

```
2GB VPS → 4GB VPS
- 成本增加：約 $5-10/月
- 效能提升：2-3 倍並發處理能力
- 穩定性：大幅提升，避免 OOM
```

---

## 🛠️ 四、立即實施建議

### 階段一：緊急修復（今天完成）

```bash
# 1. 備份當前配置
cd /path/to/daodao-ai-backend
git add -A
git commit -m "backup: before memory optimization"

# 2. 修改 Dockerfile (採用方案 B)
# 編輯 Dockerfile 第 62 行

# 3. 添加環境變數到 .env.prod
echo "WORKERS=1" >> .env.prod

# 4. 重新部署
make down-prod
make rebuild-prod

# 5. 驗證服務狀態
make health-prod
docker stats --no-stream
```

### 階段二：監控觀察（1-2 週）

```bash
# 定期檢查記憶體使用
ssh your-vps "free -h && docker stats --no-stream"

# 檢查應用日誌
docker logs daodao-ai-backend-prod --tail 100

# 記錄峰值流量時的表現
```

### 階段三：長期優化（1 個月內）

1. **評估服務必要性**
   - 哪些服務使用率低？
   - 是否可用 SaaS 替代？

2. **考慮升級 VPS**
   - 如果 1 worker 無法滿足需求
   - 預算允許的情況下升級至 4GB

3. **程式碼層級優化**
   - 減少模型載入次數
   - 使用更小的模型（如果可行）
   - 實施請求快取機制

---

## 📈 五、效能對比預測

### 修改前（4 workers）

```
理論記憶體需求: 1,600 MB (僅 backend)
實際狀況: OOM Killer 觸發，服務無法啟動
```

### 修改後（1 worker）

```
理論記憶體需求: 400 MB (僅 backend)
可用記憶體餘裕: ~1,200 MB
服務狀況: ✅ 可正常啟動並運行
```

### 效能影響評估

| 指標 | 4 Workers | 1 Worker | 影響 |
|------|----------|----------|------|
| 記憶體使用 | 1,600 MB | 400 MB | ⬇️ 75% |
| 並發請求 | 理論 400+ | 實際 50-100 | ⬇️ 70-80% |
| 平均回應時間 | - | +20-50ms | ⬆️ 輕微增加 |
| 服務可用性 | ❌ 無法啟動 | ✅ 穩定運行 | ⬆️ 100% |

---

## 🔧 六、部署檢查清單

### 部署前

- [ ] 備份當前程式碼到 Git
- [ ] 確認 `.env.prod` 包含 `WORKERS=1`
- [ ] 檢查 Dockerfile 已修改為動態 workers
- [ ] 停止現有生產容器

### 部署中

- [ ] 執行 `make rebuild-prod`
- [ ] 觀察 Docker build 過程無錯誤
- [ ] 等待容器啟動完成（約 40s start_period）

### 部署後

- [ ] 執行 `make health-prod` 確認健康
- [ ] 檢查 `docker stats` 記憶體使用正常
- [ ] 測試 API 端點回應正常
- [ ] 檢查應用日誌無錯誤

```bash
# 健康檢查指令
curl http://your-vps-ip:8000/api/v1/health

# 預期回應
{"status": "ok"}
```

---

## 📚 七、相關文件

- `demand.md` - VPS 記憶體狀況原始數據
- `Dockerfile` - 容器建構配置
- `docker-compose.prod.yml` - 生產環境編排
- `.env.prod` - 生產環境變數

---

## ⚠️ 八、注意事項

1. **不要在本地 Mac 上運行 production 配置**
   - 本文分析基於 Linux VPS 環境
   - Mac 的記憶體統計方式不同

2. **Swap 使用是警訊**
   - 當前已使用 650 MB Swap
   - 表示實體記憶體經常不足
   - 會導致效能顯著下降

3. **OOM Killer 機制**
   - Linux 在記憶體不足時會強制終止進程
   - 通常先終止記憶體占用最大的進程
   - 可能導致服務突然中斷

4. **健康檢查逾時**
   - 記憶體不足時啟動會變慢
   - 注意 `docker-compose.prod.yml` 中的 `start_period: 40s`
   - 必要時可調整至 60s

---

## 🎯 九、預期結果

實施方案 A 或 B 後：

✅ **部署成功率**：從 0% → 100%
✅ **記憶體使用**：降至安全範圍（~60-70%）
✅ **服務穩定性**：不再觸發 OOM Killer
✅ **啟動時間**：穩定在 30-40 秒內

⚠️ **可能的代價**：
- 並發處理能力下降（但對中小流量足夠）
- 單一請求處理時間可能略微增加

---

**建議執行順序**：方案 B（環境變數） → 監控 1-2 週 → 評估是否需要方案 D（升級 VPS）
