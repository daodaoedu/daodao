## Why

使用者在 Dao Dao 平台完成一段實踐歷程後，缺乏一個可攜帶、具公信力的方式向外部展示成果，導致平台內累積的學習資產無法轉化為職涯或知識管理的實際價值。此功能將實踐歷程（Check-ins + 覆盤）聚合為可導出的 PDF 作品集與 Markdown 原始檔，完成「閉環學習體驗」的最後一哩路。

## What Changes

- 新增「導出」入口：實踐狀態為「完成」時，開放 PDF 與 Markdown 導出功能
- 新增 PDF 導出：包含實踐主題內容、所有 Check-ins、使用者覆盤、專業見證指標，以及末頁 QR Code
- 新增 Markdown 導出：含 YAML front matter 的結構化文字，圖片另存 JPG
- 新增專業見證指標：在導出文件中顯示 Insightful / Referenced / Witnessed 三項質化指標（不顯示按讚數與一般留言）
- 新增數位驗證章：符合高品質門檻（持續 ≥ 14 天 + ≥ 3 個 Insightful 標記）的實踐，PDF 蓋上官方驗證章
- 使用限制：封存狀態的實踐不可導出 PDF

## Capabilities

### New Capabilities

- `practice-pdf-export`: 將實踐歷程（主題、Check-ins、覆盤、見證指標）渲染為帶 Dao Dao 品牌視覺的 PDF，含自適應分頁與末頁 QR Code
- `practice-markdown-export`: 將實踐歷程導出為含 YAML front matter 的 Markdown，圖片另存為 JPG
- `professional-social-proof`: 收集並顯示 Insightful / Referenced / Witnessed 三項專業見證指標，作為導出文件的信用依據
- `verification-badge`: 根據持續天數與 Insightful 數量判定是否符合高品質門檻，符合者在 PDF 蓋上數位驗證章

### Modified Capabilities

<!-- 目前 openspec/specs/ 無現有 spec，無需修改 -->

## Impact

- **前端：** 新增導出 UI 流程（「結業式」氛圍），實踐詳情頁新增導出按鈕與狀態限制邏輯
- **PDF 渲染：** 前端處理（目標 ≤ 3 秒），需選型 PDF 渲染函式庫（如 react-pdf / html2canvas + jsPDF）
- **Markdown 生成：** 前端字串組裝，圖片下載與打包
- **資料查詢：** 需能取得指定實踐的完整 Check-ins（含圖片）、覆盤內容、見證指標聚合數
- **驗證邏輯：** 判定實踐持續天數與 Insightful 計數，決定是否附加驗證章
- **QR Code 生成：** 根據實踐頁面永久連結動態生成 QR Code 圖像
- **檔名規範：** `[DaoDao_主題實踐]_[主題名]_[使用者名]_[完成日期]`
