# 島島前端遷移至 Linode 部署文件

本目錄包含島島前端專案從 Cloudflare Workers 遷移至 Linode VPS 的完整規劃與文件。

---

## 📚 文件結構

### 1. [多環境部署指南 (multi-environment-deployment.md)](./multi-environment-deployment.md) ⭐ **最新推薦**
**適合對象**：開發人員、系統管理員、DevOps 工程師

**內容概要**：
- **支援三個環境**：正式環境（daodao.so）、測試環境（dev.daodao.so）、功能分支（feat-*.daodao.so）
- **完整的 Docker 配置**：Dockerfile、docker-compose.yaml、環境變數管理
- **自動化部署**：CI/CD workflow、部署腳本、回滾腳本
- **獨立管理架構**：前後端各自維護 docker-compose.yaml，透過 external network 連接
- **詳細的故障排除指南**

**閱讀時間**：45-60 分鐘

**特色**：
- ✅ 三環境獨立部署（正式/測試/功能分支）
- ✅ 基於現有後端 Docker 架構整合
- ✅ 完整的部署腳本與 CI/CD 配置
- ✅ 包含環境變數管理最佳實踐
- ✅ 詳細的監控與故障排除指南

---

### 2. [需求文件 (demand.md)](./demand.md)
**適合對象**：專案經理、決策者、所有團隊成員

**內容概要**：
- 遷移背景與目標
- 專案技術棧與現況
- 部署架構對比
- 執行計畫概要
- 風險評估摘要

**閱讀時間**：5 分鐘

---

### 3. [整合指南 (integration-guide.md)](./integration-guide.md)
**適合對象**：開發人員、系統管理員、實際執行者

**內容概要**：
- **基於現有 Docker 架構的整合方案**
- 無需新建 nginx 容器，直接使用現有配置
- 在現有 docker-compose.yaml 中新增前端服務
- 修改現有 nginx.conf 添加前端配置
- 簡化的部署流程與腳本
- 完整的測試與驗證步驟

**閱讀時間**：20-30 分鐘

**特色**：
- ✅ 針對現有架構量身定制
- ✅ 使用現有 nginx 容器（已在 daodao-server）
- ✅ 共用現有網路（prod-daodao-network, dev-daodao-network）
- ✅ 統一管理前後端服務
- ✅ 包含完整的部署與回滾腳本

---

### 4. [詳細遷移規劃 (migration-plan.md)](./migration-plan.md)
**適合對象**：需要完整技術細節的開發人員、架構師

**內容概要**：
- **專案概述**：技術棧、當前與目標架構
- **現況分析**：Cloudflare Workers 部署方式詳解
- **遷移策略**：三種方案比較與推薦
- **遷移步驟**：六大階段詳細執行步驟
  - 階段一：環境準備與評估
  - 階段二：專案配置調整
  - 階段三：Nginx 配置
  - 階段四：CI/CD 流程調整
  - 階段五：DNS 切換與測試
  - 階段六：監控與優化
- **風險評估**：五大風險與應對措施
- **檢查清單**：遷移前中後完整檢查項目
- **後續優化**：六個優化方向
- **附錄**：命令速查、疑難排解

**閱讀時間**：30-45 分鐘

**特色**：
- ✅ 包含完整的配置檔案範例
- ✅ 提供可執行的命令腳本
- ✅ 詳細的故障排除指南
- ✅ 基於實際專案 (daodao-f2e) 的配置

---

## 🚀 快速開始

### ⚡ 推薦路徑（多環境部署）⭐ **2025-12-23 更新**

**如果你需要支援多個環境（正式、測試、功能分支），請使用多環境部署指南：**

1. **閱讀多環境部署指南** → [multi-environment-deployment.md](./multi-environment-deployment.md) ⭐
   - 支援三個環境：正式（daodao.so）、測試（dev.daodao.so）、功能分支（feat-*.daodao.so）
   - 前後端獨立管理 docker-compose.yaml
   - 透過 external network 連接
   - 完整的 CI/CD 配置

2. **準備配置文件** → 按照指南創建必要文件
   - 在 `daodao-f2e/` 創建 Dockerfile
   - 創建 docker-compose.yaml（三環境）
   - 創建環境變數文件（.env.prod, .env.dev）
   - 修改 next.config.js（加入 `output: 'standalone'`）

3. **配置後端 nginx** → 更新現有配置
   - 在 `daodao-server/nginx.conf` 添加前端代理配置
   - 配置三個域名的 SSL 證書
   - 重啟 nginx 容器

4. **部署測試** → 按環境順序部署
   - 先部署測試環境驗證配置
   - 確認無誤後部署正式環境
   - 按需部署功能分支

5. **設置 CI/CD** → 自動化部署流程
   - 配置 GitHub Actions workflows
   - 設置 GitHub Secrets
   - 測試自動部署流程

### 📖 單環境快速部署路徑

**如果你只需要單一環境部署，可以使用整合指南：**

1. **閱讀整合指南** → [integration-guide.md](./integration-guide.md)
   - 基於現有 nginx 容器整合
   - 無需新建服務，直接擴展現有配置
   - 包含完整的部署腳本

2. **執行整合** → 按照整合指南的六個步驟
   - 建立 Dockerfile
   - 修改 next.config.js
   - 更新 docker-compose.yaml
   - 修改 nginx.conf
   - 配置 SSL
   - 部署測試

3. **持續監控** → 使用提供的監控命令
   - 查看容器狀態
   - 監控資源使用
   - 檢查日誌

### 📖 進階學習路徑

如果需要了解完整的技術細節和原理：

1. **了解需求** → 閱讀 [demand.md](./demand.md)
   - 理解為什麼要遷移
   - 了解整體目標與挑戰

2. **學習細節** → 閱讀 [migration-plan.md](./migration-plan.md)
   - 深入了解 Docker 容器化原理
   - 了解完整的遷移策略
   - 學習 Docker Compose 最佳實踐

3. **實際執行** → 使用 [integration-guide.md](./integration-guide.md)
   - 應用學到的知識
   - 執行實際整合

---

## 📋 遷移階段總覽

```
階段一：環境準備 (預估 1-2 天)
  └── 安裝軟體、配置 VPS、取得 SSL 憑證

階段二：專案配置 (預估 4-6 小時)
  └── 修改程式碼、建立部署腳本、設定 PM2

階段三：Nginx 配置 (預估 2-3 小時)
  └── 設定反向代理、SSL、快取、安全性

階段四：CI/CD 調整 (預估 2-4 小時)
  └── 修改 GitHub Actions、設定 SSH、測試自動部署

階段五：DNS 切換 (預估 1-2 小時)
  └── hosts 測試、正式切換、驗證功能

階段六：監控優化 (持續進行)
  └── 設定監控、效能優化、備份策略
```

---

## 🎯 核心技術棧

### 前端專案 (daodao-f2e)
- Next.js 15 + React 19
- TypeScript 5.7
- Tailwind CSS + shadcn/ui
- pnpm 10.15.0
- Node.js 20.19.4

### 部署工具
- **進程管理**：PM2
- **Web 伺服器**：Nginx
- **SSL 憑證**：Let's Encrypt (Certbot)
- **CI/CD**：GitHub Actions
- **版本控制**：Git

---

## ⚠️ 重要注意事項

### 遷移前必讀
1. ✅ **充分測試**：務必在本地和 VPS 上完整測試
2. ✅ **備份配置**：保留現有 Cloudflare 配置至少 7 天
3. ✅ **選擇時段**：在低流量時段進行 DNS 切換
4. ✅ **準備回滾**：確保可快速切回 Cloudflare

### 關鍵配置要點
1. **next.config.js**：啟用 `output: 'standalone'`
2. **環境變數**：正確設定 API 端點
3. **PM2**：使用 cluster 模式提高可用性
4. **Nginx**：配置快取和安全標頭
5. **SSL**：確認憑證自動更新機制

---

## 🔗 相關資源

### 專案文件
- [daodao-f2e README](../../daodao-f2e/README.md)
- [開發指南 (CLAUDE.md)](../../daodao-f2e/CLAUDE.md)

### 技術文件
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt](https://letsencrypt.org/)

### 工具
- [GitHub Actions](https://docs.github.com/en/actions)
- [SSH Action](https://github.com/appleboy/ssh-action)
- [Nginx Config Generator](https://www.digitalocean.com/community/tools/nginx)

---

## 💡 推薦架構

遷移完成後，建議採用 **混合架構**，兼具效能與成本優勢：

```
使用者請求
    ↓
Cloudflare CDN (免費)
  - 全球加速
  - DDoS 防護
  - 智能快取
    ↓
Linode VPS (Origin Server)
  ├── Nginx (反向代理 + SSL)
  ├── Next.js Server (PM2)
  ├── Backend API
  └── Database
```

**優勢**：
- ✅ 保留 Cloudflare 的全球 CDN 優勢
- ✅ 前後端統一管理於 Linode
- ✅ 成本可控 (Cloudflare 免費 + Linode VPS)
- ✅ 效能與穩定性兼具

---

## 📞 支援與回饋

如有任何問題、建議或遇到困難：
1. 查看 [migration-plan.md](./migration-plan.md) 的疑難排解章節
2. 檢查 PM2 和 Nginx 日誌
3. 聯絡技術團隊

---

## 📝 版本歷史

| 版本 | 日期 | 更新內容 | 作者 |
|------|------|---------|------|
| v1.0 | 2025-12-23 | 初版發布，包含完整遷移規劃 | 技術團隊 |

---

## ✅ 檢查清單快速連結

- [遷移前檢查清單](./migration-plan.md#遷移前檢查-)
- [遷移中檢查清單](./migration-plan.md#遷移中檢查-)
- [遷移後檢查清單](./migration-plan.md#遷移後驗證-)

---

**最後更新**：2025-12-23
**維護者**：島島技術團隊
