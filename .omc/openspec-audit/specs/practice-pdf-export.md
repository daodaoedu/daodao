# practice-pdf-export
- 涉及 repo: 預期 daodao-f2e (前端生成) + daodao-server (export API)
- 對應 archived change: 無
- 總計: 8 條 requirement / 15 個 scenario | ✅0 ⚠️0 ❌8 ❓0

## 整體結論
practice-pdf-export 功能**完全未實作**。f2e 與 server 皆無實踐 PDF 導出。
- f2e grep 無 jspdf / html2canvas / @react-pdf / qrcode / 「導出 PDF」/「DaoDao_主題實踐」。唯一 ExportButton（apps/product/src/features/survey/components/survey-dashboard/ExportButton.tsx）為**問卷 CSV 匯出**（generateCSV :13、`匯出 CSV` :65、blob text/csv :48），與實踐 PDF 無關。
- daodao-server 無 practice export 端點（routes 只有 admin user-stats/export 統計匯出，與實踐 PDF 無關）；practice.controller 無 export/pdf handler。

## Requirement: 導出入口僅於完成狀態開放 → ❌
證據: 無導出按鈕實作；無 completed/archived 狀態判斷的導出 UI。
- Scenario: 完成狀態顯示導出按鈕 → ❌
- Scenario: 封存狀態隱藏導出按鈕 → ❌
- Scenario: 後端驗證封存限制（403）→ ❌ — 無 export API。

## Requirement: 僅實踐擁有者可導出 PDF（401/403）→ ❌
證據: 無 export API，無擁有者授權檢查。
- Scenario: 非擁有者呼叫被拒（403）→ ❌
- Scenario: 未認證呼叫被拒（401）→ ❌

## Requirement: PDF 包含完整實踐內容（6 區塊）→ ❌
證據: 無 PDF 生成程式碼。
- Scenario: Check-in 時序排列 → ❌
- Scenario: 圖片完整嵌入 → ❌
- Scenario: 無覆盤時省略區塊 → ❌
- Scenario: 0 筆 Check-in 仍可導出 → ❌

## Requirement: PDF 自適應分頁 → ❌
- Scenario: 圖片不跨頁 → ❌
- Scenario: 長文字自動換頁 → ❌

## Requirement: PDF 末頁附 QR Code → ❌
證據: 無 qrcode 依賴或實作。
- Scenario: QR Code 可掃描連結正確 → ❌
- Scenario: 網址永久有效 → ❌

## Requirement: PDF 預設檔名規範（[DaoDao_主題實踐]_...）→ ❌
證據: grep 無此檔名格式字串。
- Scenario: 預設檔名格式正確 → ❌
- Scenario: 特殊字元自動 sanitize → ❌

## Requirement: PDF 導出效能（30 則 3 秒內）→ ❌
- Scenario: 標準 30 筆資料效能 → ❌

## Requirement: PDF 跨裝置可讀性 → ❌
- Scenario: 行動裝置閱讀 → ❌
