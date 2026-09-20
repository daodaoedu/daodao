## Why

使用者在 Dao Dao 平台完成一段實踐歷程後，缺乏一個可攜帶、具公信力的方式向外部展示成果，導致平台內累積的學習資產無法轉化為職涯或知識管理的實際價值。此功能將實踐歷程（Check-ins + AI 洞察 + 覆盤 + 見證指標）聚合為可導出的 PDF 作品集與 Markdown 原始檔，完成「閉環學習體驗」的最後一哩路。

## Phase Context

本 change 為實踐總結頁三期規劃中的 **Phase 3（信用資產化）**。

前置依賴（須在本 change 啟動前完成）：
- **Phase 1（`practice-summary-core`）**：AI 洞察上總結頁 + Public View + .txt 匯出 + 總結卡片重設計
- **Phase 2（`practice-summary-depth`）**：覆盤 UI + AI 品質門檻 + 解析度% + 見證指標 UI/API

詳見 `docs/product/practice/實踐總結頁綜合規劃.md`。

本 change 假設以下功能已上線運作：
- 總結頁可顯示 AI 洞察（`practices.insight`）——Phase 1 已將 `PracticeSummary` type 加上 `insight` 欄位
- 公開分享頁（`/practices/[id]/showcase`）已上線——Phase 1 建立，QR Code 導向此 URL
- 覆盤功能已上線——Phase 2 建立 PATCH API + ORID/簡單回顧模板 UI，`practices.reflection` 存為 Markdown 格式（含 `<!-- template: orid -->` 或 `<!-- template: simple -->` 標記）
- 見證指標已上線並累積一段時間的真實數據——Phase 2 建立 toggle/status API endpoints
- AI 品質門檻已啟用——Phase 2 加入 80% 進度 + 50 字平均門檻，意味著有 insight 的實踐已通過品質篩選
- .txt 匯出與 AI Prompt 複製已在 Phase 1 完成（本 change 不重做）

## What Changes

- 新增 PDF 導出：包含實踐主題內容、AI 洞察、所有 Check-ins、使用者覆盤、專業見證指標，以及末頁 QR Code
- 新增 Markdown 導出：含 YAML front matter 的結構化文字，圖片另存 JPG
- 新增數位驗證章：符合高品質門檻（持續 ≥ 14 天 + ≥ 3 個 Insightful 標記）的實踐，PDF 蓋上官方驗證章
- 新增 Export 聚合 API：一次回傳 PDF/MD 所需的全部資料
- 使用限制：封存狀態的實踐不可導出 PDF

## Capabilities

### New Capabilities

- `practice-pdf-export`: 將實踐歷程（主題、AI 洞察、Check-ins、覆盤、見證指標）渲染為帶 Dao Dao 品牌視覺的 PDF，含自適應分頁與末頁 QR Code
- `practice-markdown-export`: 將實踐歷程導出為含 YAML front matter 的 Markdown，圖片另存為 JPG
- `verification-badge`: 根據持續天數與 Insightful 數量判定是否符合高品質門檻，符合者在 PDF 蓋上數位驗證章

### Depends on (Phase 1 & 2)

- AI 洞察顯示（`practice-summary-core` 1a）
- 公開分享頁 URL（`practice-summary-core` 1b）— QR Code 目標
- 總結頁兩欄 layout（`practice-summary-core` 1d）— 匯出 UI 延伸此 layout
- 覆盤 UI + API（`practice-summary-depth` 2a）— reflection 存為 Markdown，PDF 需解析結構
- 見證指標 UI + API（`practice-summary-depth` 2d）— `practice_social_proofs` 表與 API endpoints
- AI 品質門檻（`practice-summary-depth` 2b）— 有 insight 的實踐已通過品質篩選

## Impact

- **前端：** 新增導出 UI 入口（延伸 Phase 1 的 .txt 匯出 UI），新增 PDF/MD 生成元件
- **PDF 渲染：** 前端處理（目標 ≤ 3 秒），使用 `@react-pdf/renderer`
- **Markdown 生成：** 前端字串組裝 + JSZip 打包
- **後端：** 新增 Export 聚合 API（查詢 Check-ins + 見證計數 + 驗證資格），新增 Image Proxy API
- **QR Code 生成：** 根據公開分享頁 URL 動態生成 QR Code 圖像
- **檔名規範：** `[DaoDao_主題實踐]_[主題名]_[使用者名]_[完成日期]`
