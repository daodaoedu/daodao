# practice-markdown-export
- 涉及 repo: f2e (apps/product 前端 + packages/api) + server (export 端點)
- 對應 archived change: 2026-05-26-practice-journey-export（tasks.md 中 Markdown/PDF/export 任務 3.x/6.x/7.x/8.x/9.x/10.x 多為未勾選 `[ ]`）
- 總計: 7 條 requirement / 13 個 scenario | ✅0 ⚠️0 ❌7 ❓0
- 結論：**整個 Markdown 導出功能未實作**。grep `generatePracticeMarkdown`、`usePracticeExportMarkdown`、`PracticeExportData`、`getPracticeExportData`、`practice-export-sheet` 於 f2e origin/dev 全部 0 結果；server origin/dev 無 `GET /api/v1/practices/:id/export` 端點（僅 admin user-stats export 無關）。archived tasks.md 對應實作項目皆未勾選。

## Requirement: Markdown 導出狀態限制 → ❌
證據: 無導出入口/狀態判斷實作（tasks 10.1/10.2 未勾選，無 practice-export-sheet 元件）。
- Scenario: 完成狀態顯示 Markdown 導出選項 → ❌ — 無「導出 Markdown」UI
- Scenario: 封存狀態仍可導出 Markdown → ❌ — 無實作
- Scenario: 進行中狀態不可導出 → ❌ — 無實作

## Requirement: Markdown 檔案含 YAML front matter → ❌
證據: 無 generatePracticeMarkdown utility（tasks 9.1/9.2 未勾選）。
- Scenario: Front matter 格式正確 → ❌ — 無產生器
- Scenario: source_url 為永久有效連結 → ❌ — 無實作
- Scenario: verified 欄位反映驗證狀態 → ❌ — 無 isVerified 判定（server getExportData 未實作，tasks 3.1/3.2 未勾選）

## Requirement: Markdown 包含完整實踐內容 → ❌
證據: 無 export data 來源端點與 Markdown 組裝（tasks 3.x/9.x 未勾選）。
- Scenario: Check-in 時序排列 → ❌ — 無實作
- Scenario: 圖片以相對路徑引用 → ❌ — 無實作
- Scenario: 0 筆 Check-in 時仍可導出 → ❌ — 無實作
- Scenario: 無覆盤時省略覆盤區塊 → ❌ — 無實作

## Requirement: 圖片另存為 JPG 並以 ZIP 打包 → ❌
證據: 無 JSZip 打包流程（tasks 9.3/9.4 未勾選，f2e grep jszip 僅 pnpm-lock）。
- Scenario: ZIP 結構正確 → ❌ — 無實作
- Scenario: 無圖片時直接下載 .md → ❌ — 無實作

## Requirement: 圖片檔名規範 → ❌
證據: 無 `images/YYYY-MM-DD(N).jpg` 命名邏輯（tasks 9.3 未勾選）。
- Scenario: 同日多張圖片編號正確 → ❌ — 無實作

## Requirement: Markdown 導出預設檔名規範 → ❌
證據: 無 `[DaoDao_主題實踐]_...` 檔名組裝（grep 0）。
- Scenario: 預設檔名格式正確 → ❌ — 無實作
- Scenario: 主題名含特殊字元時自動 sanitize → ❌ — 無 sanitize 邏輯

## 備註
- 部分後端基礎設施有做：tasks 4.1/4.2（`/api/v1/proxy/image` R2 圖片代理+SSRF 防護）、2.2（practice_social_proofs 表）標為已勾選，但這些屬「見證指標/圖片代理」基礎，非 Markdown 導出本身。Markdown 導出核心（端點 + 前端 utility + hook + UI）全缺。
