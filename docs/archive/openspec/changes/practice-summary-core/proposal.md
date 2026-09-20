## Why

使用者完成主題實踐後，AI 洞察已由 `daodao-ai-backend` 每日 cron 自動生成並寫入 `practices.insight` 欄位，但前端完全無法顯示——`PracticeSummary` type 沒有 `insight` 欄位、`getPracticeSummary()` 也未讀取它。這代表平台已經投入算力產生的高價值內容，使用者卻看不到。

同時，使用者完成實踐後缺乏三個關鍵出口：
1. **公開分享頁**——目前總結頁是 Owner-only，即使設定 `privacy_status: "public"` 也沒有訪客可見的頁面，社群分享的連結實際上無法被他人瀏覽。
2. **結構化匯出**——使用者無法將打卡歷程帶走，不符合「資料攜帶權」承諾。
3. **總結卡片視覺**——現有卡片以泡泡圖為主，缺少 POC 設計稿中的總結風格（驗證碼、QR Code、dark/light 主題切換）。

本 change 為實踐總結頁三期規劃中的 **Phase 1（讓已有的東西完整可用）**，以最高 ROI 的方式將既有資料轉化為使用者可見、可分享、可攜帶的價值。

## Phase Context

詳見 `docs/product/practice/實踐總結頁綜合規劃.md`。

- **Phase 1（本 change）**：AI 洞察上總結頁 + Public View + .txt 匯出 + 卡片重設計
- **Phase 2**：覆盤 UI + AI 品質門檻 + 解析度% + 見證指標
- **Phase 3**：PDF/Markdown 作品集 + 驗證章（見 `openspec/changes/practice-journey-export/`）

本 change 無前置依賴，可立即開工。

## What Changes

### 1a. AI 洞察搬上總結頁
- `PracticeSummary` type 新增 `insight?: string` 欄位
- `getPracticeSummary()` 從 practice detail API 帶出 insight
- 後端 `PracticeEntity` 新增 `insight?: string`，`findById()` 從 DB select `insight` 欄位
- 總結頁 Owner View 新增「AI 核心洞察」區塊（可編輯提示文案）
- 有 insight → 顯示完整內容；無 insight → 顯示鼓勵語

### 1b. Public View（公開分享頁）
- 新增 `/practices/[id]/showcase` 頁面（訪客可見，無需登入）
- 顯示：總結卡片 + AI 洞察 + 精選打卡亮點
- 不顯示：匯出、覆盤、編輯功能
- Owner View 增加「預覽公開頁」連結 + 一鍵複製連結
- 權限：`privacy_status === "public"` 時任何人可見；否則 404
- 後端新增公開實踐詳情 API（不需 auth，但只回傳 public 實踐）

### 1c. .txt 匯出 + AI Prompt 複製
- 按匯出 FRD scope 實作
- 雙入口：總結頁底部按鈕 + kebab menu（實踐卡片 / 詳情頁）
- Owner-only
- 零後端依賴，純前端字串組裝 + Blob 下載
- .txt 包含：來源、主題實踐名稱、實踐行動、開始日期、預期持續時間、每週頻率、使用資源、標籤、所有打卡紀錄（日期 + 心情 + 文字）
- AI Prompt 複製：動態編譯提示詞，一鍵複製到剪貼簿 + Toast 回饋

### 1d. 總結卡片重設計
- 以 POC 設計稿為視覺方向，重新設計 `practice-summary-card.tsx`
- 新增元素：島島 Logo、驗證碼 placeholder、個人小島連結、卡片產生日期
- 支援 dark/light 雙主題切換
- 保留現有 `use-practice-summary-image.tsx` 的 html-to-image → PNG 下載機制

## Capabilities

### New Capabilities
- `practice-insight-display`：在總結頁 Owner View 顯示 AI 洞察，含「無洞察」的 fallback 鼓勵語
- `practice-public-showcase`：訪客可見的公開分享頁，完整展示實踐成果
- `practice-txt-export`：純前端 .txt 歷程檔案下載
- `practice-ai-prompt-copy`：動態編譯 AI Mentor 提示詞並複製到剪貼簿
- `practice-summary-card`：總結風格視覺卡片，支援 dark/light 主題

### Modified Capabilities
- `PracticeSummary` type（`@daodao/api`）：新增 `insight` 欄位
- `PracticeEntity`（`daodao-server`）：新增 `insight` 欄位，API 回應帶出
- `practice-summary-page.tsx`：從現有慶祝頁改為兩欄式 Owner View layout

## Impact

- **前端 (daodao-f2e)**：主要改動，涉及 `@daodao/api` package（type + service）、`apps/product` summary page + 新增 showcase page + 卡片重設計 + 匯出模組
- **後端 (daodao-server)**：小幅改動，`PracticeEntity` 加 `insight` 欄位、`findById()` select insight、新增公開實踐 API endpoint
- **AI (daodao-ai-backend)**：無改動（insight 生成已完成）
- **DB (daodao-storage)**：無 migration（`practices.insight` 欄位已存在）
- **Worker (daodao-worker)**：無改動

## Non-goals

- **覆盤 UI**（Phase 2）——`practices.reflection` 欄位已存在但無 UI/API，不在此 change 處理
- **AI 觸發品質門檻**（Phase 2）——Phase 1 先讓所有 completed 的 insight 可見，不加 80% 進度 / 50 字平均門檻
- **解析度%**（Phase 2）——遊戲化指標，不在此 change
- **見證指標 UI/API**（Phase 2）——`practice_social_proofs` 表已存在但無 API endpoints
- **PDF/Markdown 匯出**（Phase 3）——需覆盤 + 見證數據，依賴 Phase 2
- **驗證章判定邏輯**（Phase 3）——卡片上的 verification ID 作為 placeholder，但不做真正的驗證判定
- **Clone 模版功能**——POC 有設計，但不在 Phase 1 scope（複製實踐功能已獨立存在）
- **學伴互惠**——屬 `buddy-ember` change
- **Growth Map**——獨立 change
