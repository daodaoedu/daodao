# report-center
- 涉及 repo: server / admin-ui
- 對應 archived change: add-report-center（推測）
- 總計: 16 條 requirement / ~24 個 scenario | ✅9 ⚠️4 ❌3 ❓0

## Requirement: 排程報告建立 → ✅
證據: daodao-server:src/routes/admin.routes.ts:1300-1304（reports/scheduled CRUD+history）；service admin-reports.service.ts:40；admin-ui ScheduledReportsPage.tsx。
- Scenario: 建立每週排程報告 → ✅ — createScheduledReport 含 frequency/recipients/sections。
- Scenario: 設定多位收件人 → ⚠️ — recipients 存在，但實際排程寄送機制（cron/queue）未見程式碼佐證。

## Requirement: 排程報告 KPI 區段 → ✅
證據: daodao-server:src/services/admin-reports.service.ts:101-104 metric keys；validator admin-reports.validator.ts:19。
- Scenario: 勾選多個 KPI 區段 → ✅ — sections 陣列。
- Scenario: 未勾選任何區段時阻擋 → ✅ — validator:19 z.array(...).min(1) 強制。

## Requirement: 排程報告預覽 → ❌
證據: 無 — grep preview 於 routes/controller/service 皆無命中。
- Scenario: 預覽報告內容 → ❌ — 無 preview API/UI。

## Requirement: 排程報告執行歷史 → ✅
證據: daodao-server:admin.routes.ts:1304 getReportHistory；admin-ui ScheduledReportsPage.tsx:19,119-142。
- Scenario: 檢視執行歷史 → ✅ — 顯示寄送日期/收件人/狀態。

## Requirement: 自訂報表欄位選擇 → ✅
證據: daodao-server:admin.routes.ts:1305-1306 getAvailableFields/queryCustomReport；admin-ui CustomReportsPage.tsx。
- Scenario: 選取指標與維度 → ✅。

## Requirement: 自訂報表拖拉排序 → ❌
證據: 無 — grep drag|dnd|reorder|拖 於 CustomReportsPage/components 無命中。
- Scenario: 拖拉調整欄位順序 → ❌ — 未實作。

## Requirement: 自訂報表資料生成 → ✅
證據: daodao-admin-ui:CustomReportsPage.tsx:54-55 + queryCustomReport。
- Scenario: 生成表格與圖表 → ⚠️ — 表格已生成；可選圖表視覺化未見明確 chart 元件。

## Requirement: 自訂報表收藏 → ✅
證據: daodao-server:admin.routes.ts:1307-1309；admin-ui CustomReportsPage.tsx:14 useSavedReports/saveReport。
- Scenario: 儲存報表為收藏 → ✅。

## Requirement: 收藏報表重新執行 → ✅
證據: daodao-admin-ui:CustomReportsPage.tsx:192-195 + queryCustomReport 最新資料重跑。
- Scenario: 重新執行收藏報表 → ✅。

## Requirement: 自訂報表匯出 → ✅
證據: daodao-admin-ui:CustomReportsPage.tsx:4,69 ExportButton。
- Scenario: 匯出報表 → ✅。

## Requirement: 異常警報規則建立 → ✅
證據: daodao-server:admin.routes.ts:1310-1313 alerts/rules CRUD；admin-ui AnomalyAlertsPage.tsx。
- Scenario: 建立 DAU 下降警報 → ✅。
- Scenario: 建立 AI 費用上限警報 → ✅。

## Requirement: 異常警報可用指標 → ⚠️
證據: daodao-server:admin-reports.service.ts:101-104 metric 清單。
- Scenario: 選擇不同指標 → ⚠️ — 有清單但是否完整含 DAU/WAU/MAU/每日AI費用/Email退信率/錯誤率六項未完全對應。

## Requirement: 異常警報通知管道 → ✅
證據: daodao-server:admin-reports.service.ts:180,202 notifyChannel ?? 'email'。
- Scenario: 設定 Email 通知 → ✅。
- Scenario: 設定站內通知 → ⚠️ — notifyChannel 欄位支援，但 in_app 實際發送路徑未佐證。

## Requirement: 異常警報歷史紀錄 → ✅
證據: daodao-server:admin.routes.ts:1314 getAlertHistory；admin-ui AnomalyAlertsPage.tsx:85。
- Scenario: 檢視警報歷史 → ✅。

## Requirement: 異常警報啟用與停用 → ⚠️
證據: daodao-server:admin.routes.ts:1312 updateAlertRule(enabled)；admin-ui AnomalyAlertsPage.tsx:65-70 僅顯示 rule.enabled。
- Scenario: 停用警報規則 → ⚠️ — 後端支援，前端無 onClick/toggle/mutate 接線（僅顯示狀態）。
- Scenario: 重新啟用 → ⚠️ — 同上。
