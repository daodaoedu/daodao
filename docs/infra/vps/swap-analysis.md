# Swap 空間配置分析與建議

**建立日期**：2026-01-07
**VPS 規格**：2GB RAM

---

## 📊 當前 Swap 配置狀況

```
實體記憶體 (RAM):  1,963.8 MB  (約 2GB)
Swap 總空間:       4,608.0 MB  (約 4.5GB)
Swap 已使用:         650.6 MB  (14.1%)
Swap 空閒:         3,957.4 MB  (85.9%)

Swap 與 RAM 比例:  2.25:1
```

---

## ❓ 4.5GB Swap 是否過大？

### 業界建議標準

| RAM 大小 | 建議 Swap 大小 | 說明 |
|----------|--------------|------|
| < 2GB | RAM × 2 | 需要大量虛擬記憶體 |
| 2-8GB | RAM × 1 | 與 RAM 相等 |
| 8-64GB | RAM × 0.5 | 較少依賴 Swap |
| > 64GB | 4GB 或更少 | Swap 主要用於休眠 |

### 你的配置評估

```
當前: 4.5GB (2GB × 2.25)
建議: 2GB   (2GB × 1)
評估: ⚠️ 偏大，但在合理範圍內
```

---

## 🔍 深入分析

### ✅ 保留 4.5GB Swap 的優點

1. **避免系統崩潰**
   - 記憶體暴增時不會立即觸發 OOM Killer
   - 給系統更多緩衝空間
   - 適合記憶體不足的 VPS

2. **支援更多服務**
   - 可同時運行多個 Docker 容器
   - 短期內不需升級 VPS

3. **已經配置完成**
   - 修改 Swap 需要重新分割磁碟
   - 如果不影響效能，不必強制修改

### ❌ 4.5GB Swap 的缺點

1. **效能嚴重下降**
   - Swap 在磁碟上，速度比 RAM 慢 1000 倍
   - 當前已使用 650MB，會導致明顯卡頓
   - 頻繁 swap 會加速 SSD 耗損

2. **掩蓋真實問題**
   - 應該解決記憶體不足，而非依賴 Swap
   - 大 Swap 讓你誤以為系統還能撐住

3. **磁碟空間浪費**
   - 4.5GB 空間可用於資料儲存
   - 如果很少用到，就是浪費

---

## 📈 當前 Swap 使用分析

### Swap 使用率時間軸推測

```
已使用 650MB / 4608MB = 14.1%

可能場景：
1. 系統啟動時載入大量服務 → 部分被 swap out
2. Docker 建置時記憶體峰值 → 暫時使用 swap
3. 長期未使用的進程 → 被系統移到 swap
```

### ⚠️ 警訊：已在使用 Swap

即使只用了 14%，這已經是**效能下降的徵兆**：

```bash
# Swap 使用意味著：
實際可用 RAM < 所需 RAM

# 效能影響：
應用回應時間 +50% ~ 300%
磁碟 I/O 負載增加
CPU 等待時間增加
```

---

## 🎯 建議方案

### 方案 A：保持現狀（✅ 短期推薦）

**適用情況**：
- 修改 backend workers=1 後記憶體足夠
- Swap 使用率降至 < 5%
- 系統效能可接受

**操作**：
```bash
# 什麼都不做，但要監控
watch -n 5 'free -h'
```

---

### 方案 B：調整 Swappiness（🌟 推薦優化）

**什麼是 Swappiness？**
- 控制系統何時開始使用 Swap
- 範圍 0-100，預設通常是 60
- 值越低，越傾向使用 RAM

**檢查當前設定**：
```bash
cat /proc/sys/vm/swappiness
# 預設可能是 60
```

**建議調整為 10**：
```bash
# 臨時調整（立即生效）
sudo sysctl vm.swappiness=10

# 永久調整（寫入設定檔）
echo "vm.swappiness=10" | sudo tee -a /etc/sysctl.conf

# 驗證
cat /proc/sys/vm/swappiness
```

**效果**：
- 系統會盡量使用 RAM
- 只在真的需要時才用 Swap
- 提升整體回應速度

---

### 方案 C：縮減 Swap 大小（⚠️ 進階操作）

**建議從 4.5GB → 2GB**

**⚠️ 風險警告**：
- 需要停機操作
- 如果目前 Swap 使用 > 2GB，會導致系統崩潰
- 建議先確保 Swap 使用 < 500MB

**操作步驟**（需 root 權限）：

```bash
# 1. 檢查當前 Swap
sudo swapon --show

# 2. 關閉所有 Swap（⚠️ 確保 RAM 足夠！）
sudo swapoff -a

# 3. 刪除舊 Swap 檔案（假設是 /swapfile）
sudo rm /swapfile

# 4. 建立新的 2GB Swap
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 5. 驗證
free -h

# 6. 確保開機自動掛載（檢查 /etc/fstab）
grep swap /etc/fstab
# 應該有類似這行：
# /swapfile none swap sw 0 0
```

---

### 方案 D：完全關閉 Swap（❌ 不建議）

**為什麼不建議？**
- 2GB RAM 對你的服務來說太少
- 沒有 Swap 會更容易觸發 OOM Killer
- 可能導致服務突然中斷

**唯一適合的情況**：
- 已升級到 8GB+ RAM
- 服務已優化到不需要 Swap

---

## 📊 不同方案對比

| 方案 | Swap 大小 | Swappiness | 效能影響 | 實施難度 | 風險 |
|------|----------|------------|---------|---------|------|
| A. 保持現狀 | 4.5GB | 預設(60?) | 0 | ⭐ | 低 |
| B. 調整 Swappiness | 4.5GB | 10 | +20% | ⭐⭐ | 極低 |
| C. 縮減 Swap | 2GB | 10 | +30% | ⭐⭐⭐⭐ | 中 |
| D. 關閉 Swap | 0GB | - | +50% | ⭐⭐⭐ | 高 |

---

## 🛠️ 推薦執行順序

### 第一步：修正 Backend Workers（必做）

```bash
# 參考 memory-analysis-and-solution.md
# 將 workers 從 4 降到 1
```

### 第二步：觀察 1 週

```bash
# 每天檢查 Swap 使用情況
ssh your-vps "free -h"

# 記錄峰值使用量
```

### 第三步：調整 Swappiness（建議）

```bash
# 如果 Swap 使用 > 100MB，執行此步驟
sudo sysctl vm.swappiness=10
echo "vm.swappiness=10" | sudo tee -a /etc/sysctl.conf
```

### 第四步：決定是否縮減（選擇性）

**如果滿足以下條件，可考慮縮減至 2GB**：
- ✅ Swap 使用穩定在 < 200MB
- ✅ 已觀察 2 週以上
- ✅ 有完整備份
- ✅ 可接受短暫停機

**否則保持 4.5GB，沒有強制修改的必要**

---

## 🔍 監控指令

### 即時監控

```bash
# 方法 1: 使用 watch（每 5 秒更新）
watch -n 5 'free -h && echo "---" && swapon --show'

# 方法 2: 使用 vmstat（詳細統計）
vmstat 5

# 方法 3: 檢查 Swap in/out 活動
vmstat 1 | awk '{print $7, $8}'
# si (swap in) 和 so (swap out) 應該接近 0
```

### 歷史趨勢

```bash
# 安裝 sysstat（如果沒有）
sudo apt install sysstat

# 啟用數據收集
sudo systemctl enable sysstat
sudo systemctl start sysstat

# 查看歷史數據（需等待收集）
sar -r  # RAM 使用
sar -S  # Swap 使用
```

---

## 📝 總結與答案

### ❓ Swap 有需要這麼多嗎？

**簡短答案**：不太需要，但也不是大問題

**詳細答案**：
1. **理論上**：2GB RAM 應該配 2GB Swap 就夠
2. **實務上**：4.5GB 提供更多緩衝，短期可保留
3. **真正問題**：不是 Swap 太大，而是**正在使用 Swap**

### 🎯 重點優先順序

```
優先級 1: 修正 workers=1（解決記憶體不足）
優先級 2: 調整 swappiness=10（減少 Swap 依賴）
優先級 3: 觀察 2 週（評估實際需求）
優先級 4: 考慮縮減 Swap（可選）
```

### ⚡ 快速建議

**如果你只想做一件事**：
```bash
# 設定 swappiness=10，讓系統少用 Swap
sudo sysctl vm.swappiness=10
echo "vm.swappiness=10" | sudo tee -a /etc/sysctl.conf
```

**如果你有時間**：
1. 先修正 backend workers
2. 觀察一週 Swap 使用量
3. 再決定是否調整 Swap 大小

---

**結論**：Swap 4.5GB 雖然偏大，但當前更重要的是**減少 Swap 的使用**，而不是縮減 Swap 大小。優先解決記憶體不足問題，再考慮 Swap 調整。
