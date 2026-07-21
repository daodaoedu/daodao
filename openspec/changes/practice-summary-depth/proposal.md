## Why

Phase 1（practice-summary-core）讓實踐完成有了基本的總結頁與 AI 洞察，但「完成」仍停留在被動呈現階段——使用者看完就走，缺少主動回顧的動機與深度。本 change 補上三個維度：(1) 使用者自己的覆盤，讓反思成為學習閉環的一環；(2) AI 洞察的品質門檻，確保只有真正有料的實踐才觸發 AI 分析；(3) 社群見證指標，讓他人的認可成為實踐價值的可見證據。這三者共同將「完成」從終點轉化為有深度的回顧時刻。

## Phase Context

本 change 為實踐總結頁三期規劃中的 **Phase 2（深度回顧與社群認可）**。

前置依賴（須在本 change 啟動前完成）：
- **Phase 1（practice-summary-core）**：AI 洞察上總結頁 + Public View + .txt 匯出

本 change 完成後，Phase 3（practice-journey-export）所需的覆盤內容、見證數據、品質門檻判定將全部到位。

詳見 `docs/product/practice/實踐總結頁綜合規劃.md`。

本 change 假設以下 Phase 1 功能已上線運作：
- 總結頁可顯示 AI 洞察（`practices.insight`）
- 公開分享頁（`/practices/[id]/showcase`）已上線
- .txt 匯出與 AI Prompt 複製已完成

## What Changes

### 2a. 覆盤 UI
- 前端在實踐 completion 觸發時提示填寫覆盤（`practices.reflection` 欄位已存在）
- 提供 ORID 與簡單回顧兩種模板
- 後端新增 PATCH endpoint 更新 reflection
- AI backend Practice model 補上 `reflection` column mapping
- 完成後覆盤在總結頁置頂 72 小時
- 覆盤頁面左側提供 Check-in 快捷連結方便回顧

### 2b. AI 觸發品質門檻
- `insight_service.get_pending_practices()` 加入品質過濾條件
- 進度 ≥ 80% 且平均打卡字數 ≥ 50 字才觸發 AI 洞察生成
- 未達標的實踐 insight 留 null（前端已在 Phase 1 處理 null 顯示）

### 2c. 解析度%（Clarity Score）
- 純前端計算：`clarity% = min(avgWordCount / 50, progressPercentage / 80) * 100`
- 實踐進行中在「洞察生成中」入口顯示 clarity%
- 未到結束日上限鎖 99%，到達結束日且指標達標解鎖 100%
- 每次打卡後即時更新

### 2d. 見證指標
- 後端新增 `POST /api/v1/practices/:id/social-proof`（toggle）
- 後端新增 `GET /api/v1/practices/:id/social-proof/status`
- 前端新增 Insightful / Referenced / Witnessed 按鈕
- MVP 以主動點擊觸發（不用滾動偵測）

## Capabilities

### New Capabilities

- `practice-reflection`：覆盤機制——ORID 與簡單回顧模板、PATCH API 寫入、置頂 72 小時顯示、Check-in 快捷連結回顧
- `insight-quality-gate`：AI 洞察品質門檻——進度 ≥ 80% + 平均字數 ≥ 50 的雙條件過濾
- `clarity-score`：解析度百分比——前端即時計算，視覺化實踐深度，每次打卡更新
- `social-proof-api`：見證指標 API endpoints——toggle + status 查詢，搭配前端三種按鈕

### Modified Capabilities

- `insight-generation`：`get_pending_practices()` 新增品質過濾條件（原本只看 status + insight IS NULL）
- `practice-summary-page`：總結頁新增覆盤區塊、見證指標按鈕、clarity score 顯示

### Depends on (Phase 1)

- AI 洞察顯示（practices.insight 欄位與總結頁 UI）
- 公開分享頁 URL
- .txt 匯出 UI

## Impact

- **前端（daodao-f2e）**：新增覆盤 UI（ORID + 簡單回顧模板選擇器、覆盤編輯器、置頂顯示邏輯）、見證按鈕元件、clarity score 計算與顯示、Check-in 快捷連結
- **後端（daodao-server）**：新增 `PATCH /api/v1/practices/:id/reflection`、`POST /api/v1/practices/:id/social-proof`、`GET /api/v1/practices/:id/social-proof/status`（service 已存在，僅需接 API endpoints）
- **AI 後端（daodao-ai-backend）**：`Practice` model 補 `reflection` column、`get_pending_practices()` 加品質門檻
- **DB（daodao-storage）**：無新增 migration（`practices.reflection` 與 `practice_social_proofs` 表已存在）

## Non-goals

- 覆盤 feed AI 洞察（維持並聯模型，覆盤與 AI 洞察各自獨立）
- AI 二次合成（覆盤 + 洞察合併成更高階摘要）
- 複雜的見證觸發機制（如滾動偵測、閱讀時間觸發）
- 見證數據的統計分析（如趨勢圖、排行榜）
- PDF 匯出（Phase 3 範疇）
- Growth Map 整合
- 覆盤的 AI 輔助撰寫（如 AI 根據打卡紀錄預填覆盤）
