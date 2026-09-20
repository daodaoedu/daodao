## Why

使用者在 Dao Dao 累積了大量實踐打卡與學習足跡，但缺乏一個整體視角來「看見自己的成長輪廓」。目前平台的學習記錄是線性的（時間軸打卡），無法呈現跨實踐的能力分布與演進。Growth Map（個人成長地圖）基於 WEF 全球技能分類的 8 大支柱，以 D3.js 力導向圖將使用者的技能節點視覺化，讓抽象的「我學了什麼」變成具象的空間佈局。核心理念是「誠實反思」而非「硬性檢定」——每一次打卡、每一則筆記都可能成為地圖上的一個足跡（footprint），逐步長出屬於自己的技能星圖。

## What Changes

- 新增 `skills_nodes` 表：記錄使用者的技能節點，包含主要支柱歸屬、次要支柱、Level 4 微觀技能標籤、節點狀態（seed/solid/cooling）
- 新增 `footprints` 表：記錄每個技能節點的成長足跡（文字 + 可選媒體連結）
- 新增後端 CRUD API：技能節點與足跡的建立、讀取、更新、刪除、合併
- 新增三層分類引擎：前端 Regex 初判（$0）→ 繼承挑戰標籤（$0）→ 輕量 LLM 精確分類（<$0.0001/次）
- 新增前端 D3.js 力導向圖頁面：八角引力錨點佈局、Hybrid Halo 漸層外圈、節點拖曳合併、Tooltip 顯示 Level 4 微觀技能
- 新增 Practice Check-in → Footprint 橋接：打卡時非同步建立對應的 footprint，Growth Map 自動獲得實踐數據
- 新增 AI 分類端點：GPT-4o-mini / DeepSeek-Chat 做 8 選 1 支柱分類 + Level 4 提煉

## Capabilities

### New Capabilities

- `growth-map-visualization`：D3.js 力導向圖視覺化，8 大 WEF 支柱為虛擬引力錨點，技能節點依歸屬支柱群聚，支援拖曳互動與節點合併
- `skill-node-management`：技能節點 CRUD——手動建立、AI 輔助分類、手動覆寫分類（`is_manual_override`）、節點狀態生命週期（seed → solid → cooling）
- `footprint-tracking`：技能成長足跡記錄——獨立新增或由 Practice Check-in 自動橋接產生
- `skill-classification-engine`：三層分類引擎——前端 Regex 初判、繼承挑戰標籤、輕量 LLM 精確分類

### Modified Capabilities

- `practice-checkin`：打卡完成後觸發非同步橋接，自動在對應技能節點建立 footprint

## Impact

**前端（daodao-f2e / product app）**
- 新增頁面：`/growth-map`（D3.js 力導向圖主頁面）
- 新增元件：技能節點卡片、足跡列表、節點合併 Modal、手動分類選擇器
- 安裝依賴：`d3`（force simulation + SVG rendering）
- 前端 Regex 分類字典（`WEF_8_REGEX_DICTIONARY`）

**後端（daodao-server）**
- 新增 API endpoints：技能節點 CRUD、足跡 CRUD、節點合併、Practice → Footprint 橋接
- 新增 service：分類引擎邏輯、節點狀態計算、橋接 service

**AI 服務（daodao-ai-backend）**
- 新增端點：`POST /api/v1/classify-skill`（8 選 1 支柱分類 + Level 4 微觀技能提煉）

**DB（daodao-storage）**
- 新增 migration：`skills_nodes` 表、`footprints` 表、相關 index

## Non-goals

- ESCO 系統對接（中長期規劃，不在本次範圍）
- 多媒體 AI 分析（Vision API 解析圖片/影片內容）
- 社群公開 Growth Map（MVP 僅個人可見，不支援分享或公開瀏覽）
- 節點的精確數值公式微調（先用合理預設值，後續以數據驅動調整）
- 與外部平台（LinkedIn Skills、104 技能標籤）整合
- Level 3 中間層 UI 呈現（Tooltip 直接跳到 Level 4 微觀技能）
- 批量匯入歷史打卡（MVP 僅橋接新打卡，不回填既有資料）
