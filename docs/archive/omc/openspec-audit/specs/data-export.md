# data-export
- 涉及 repo: admin-ui (src/components/ExportButton.tsx)
- 對應 archived change: 無明確對照（ExportButton 元件實作）
- 總計: 8 條 requirement / 13 個 scenario | ✅4 ⚠️4 ❌0 ❓0

實作位於 daodao-admin-ui:src/components/ExportButton.tsx，使用 `xlsx`(SheetJS) 套件動態 import，CSV/Excel 共用同一 worksheet 寫出。

## Requirement: 匯出格式選擇下拉選單 → ✅
證據: daodao-admin-ui:src/components/ExportButton.tsx:72-110 — 按鈕 onClick 切換 open，展開選單含 CSV 與 Excel(.xlsx) 兩個 Button，各自呼叫 handleExport('csv'/'xlsx')。
- Scenario: 展開格式選單 → ✅ — line 81-110 下拉含兩選項
- Scenario: 選擇匯出格式 → ✅ — line 93/103 onClick handleExport 立即觸發

## Requirement: 從當前篩選資料匯出 → ✅
證據: daodao-admin-ui:src/components/ExportButton.tsx:17,49 — 元件以 props `data` 接收呼叫端傳入的當前（已篩選）資料陣列直接匯出，不另外抓全量。
- Scenario: 套用篩選後匯出 → ✅ — 由父頁面傳入已篩選 data（元件本身不過濾）
- Scenario: 無篩選條件時匯出 → ✅ — 直接匯出傳入的 data

## Requirement: CSV UTF-8 BOM 編碼 → ⚠️
證據: daodao-admin-ui:src/components/ExportButton.tsx:59 — `writeFile(wb, name.csv, { bookType: 'csv' })`。使用 SheetJS writeFile 寫 CSV，**未顯式加入 UTF-8 BOM（﻿）**。SheetJS 預設 CSV 輸出不含 BOM，spec 明確要求 BOM 以避免 Excel 中文亂碼。無對應 BOM 程式碼。
- Scenario: Excel 開啟 CSV 檔案 → ⚠️ — 未見 BOM 寫入，無法保證繁中不亂碼

## Requirement: Excel 單一工作表與欄位標題 → ✅
證據: daodao-admin-ui:src/components/ExportButton.tsx:54-57 — aoa_to_sheet([headers, ...rows]) 第一列為標題，book_append_sheet 只加單一 'Data' worksheet。
- Scenario: 匯出 Excel 檔案結構 → ✅ — 單工作表、首列標題、其後資料列

## Requirement: 檔案命名規則 → ✅
證據: daodao-admin-ui:src/components/ExportButton.tsx:47-48,59,61 — `name = ${fileName}_${date}`，date 為 `new Date().toISOString().slice(0,10)`(yyyy-MM-dd)，輸出 `${name}.csv` / `${name}.xlsx`。符合 `{pageName}_{yyyy-MM-dd}.{ext}`。
- Scenario: 匯出檔案命名 → ✅ — fileName 由父頁面傳入（如 user-list），組成 user-list_2026-05-26.csv
- Scenario: Excel 檔案命名 → ✅ — 同規則 .xlsx

## Requirement: 匯出載入狀態 → ⚠️
證據: daodao-admin-ui:src/components/ExportButton.tsx:41,63,75-79 — setLoading(true)，按鈕 disabled={disabled||loading} 且文字改「匯出中...」、加 pointer-events-none，完成後 finally setLoading(false)。
差異：有 disabled 與「匯出中...」文字，但**未顯示 spinner / 載入動畫**（spec 要求 spinner 或載入動畫）。
- Scenario: 大量資料匯出 → ⚠️ — 有 disabled 防重複點擊，但無 spinner 動畫
- Scenario: 匯出完成 → ✅ — finally 區塊恢復可點擊

## Requirement: 空資料處理 → ⚠️
證據: daodao-admin-ui:src/components/ExportButton.tsx:37-40 — `if (data.length === 0) { alert('沒有資料可匯出'); return }`，不產生檔案。
差異：spec 要求顯示 **toast** 訊息「目前無資料可匯出」，實作用 `window.alert()`（瀏覽器原生彈窗）且文案為「沒有資料可匯出」。行為等價但非 toast。
- Scenario: 篩選結果為空時匯出 → ⚠️ — 用 alert 而非 toast，不產生檔案（test 驗證 alert 文案）

## Requirement: 欄位配置支援 → ⚠️
證據: daodao-admin-ui:src/components/ExportButton.tsx:11-15,50-51 — props `columns: ColumnConfig[]`，匯出時 headers=columns.map(c=>c.header)、rows 取 row[c.key]，僅匯出指定欄位且用 header 作標題。
差異：spec 要求「未指定欄位配置時匯出所有 key 並用原始 key 作標題」，但 `columns` 為**必填 prop 無 fallback**，缺少「未配置時匯出全欄位」分支。
- Scenario: 自訂匯出欄位 → ✅ — line 50-51 依 columns 過濾欄位並用 header 顯示名稱
- Scenario: 未指定欄位配置 → ❌(計入 ⚠️) — columns 必填，無自動匯出全部 key 的退路
