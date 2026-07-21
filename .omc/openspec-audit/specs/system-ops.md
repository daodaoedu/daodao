# system-ops
- 涉及 repo: admin-ui (頁面/hook/api) / server (admin system + email endpoints)
- 對應 archived change: 無（admin-panel-overhaul 範疇）
- 總計: 11 條 requirement / 19 個 scenario | ✅4 ⚠️6 ❌1 ❓0

## Requirement: 系統資源監控儀表 → ⚠️
證據: daodao-admin-ui:src/pages/SystemMonitorPage.tsx:91-150 顯示 CPU/記憶體/磁碟三卡片 + 百分比；getSystemMonitor API（admin-system.ts）打 /admin/system/monitor（route daodao-server:src/routes/admin.routes.ts:1243）
- Scenario: 顯示系統資源使用率 → ✅ — 三個指標各以百分比 + ProgressBar 呈現
- Scenario: 高使用率視覺提示（>80% 紅色）→ ⚠️ — getBarColor `>=80 → bg-destructive`（SystemMonitorPage.tsx:31）以紅色 bar 呈現；但 spec 描述為「儀表 gauge / 環形圖」，實作為水平 ProgressBar 非 gauge

## Requirement: PostgreSQL 連線池狀態 → ⚠️
證據: SystemMonitorPage.tsx:147-185 顯示活躍/閒置/maxConnections/總查詢/平均延遲；getDbInfo /admin/system/db-info（admin.routes.ts:1244）
- Scenario: 顯示 PostgreSQL 狀態 → ⚠️ — 顯示連線池使用值與總查詢數，但無「每秒查詢數(QPS)」，僅 totalQueries 累計值
- Scenario: 連線池接近滿載（90% 警示）→ ❌ — 無 90% 門檻判定或「連線池接近滿載」提示，僅顯示原始數值

## Requirement: Redis 狀態監控 → ✅
證據: SystemMonitorPage.tsx:188-225 顯示記憶體 MB/GB（memoryUsedMb / memoryMaxMb）與連線數；getRedisInfo /admin/system/redis-info（admin.routes.ts:1245）
- Scenario: 顯示 Redis 狀態 → ✅ — 記憶體以 MB/GB 格式（admin-system.ts mapRedisInfo + MetricRow），含連線數 connections

## Requirement: 監控資料自動刷新 → ⚠️
證據: useSystemMonitor/useDbInfo/useRedisInfo 皆 `refetchInterval: 30_000`（daodao-admin-ui:src/hooks/useSystemMonitor.ts:7,16,25）
- Scenario: 自動刷新 → ✅ — react-query 30 秒背景 refetch，不重載頁面；FALLBACK 保留 placeholder 避免閃爍
- Scenario: 刷新失敗 → ⚠️ — 失敗時 data 保留上次（react-query 預設），但無「監控資料刷新失敗」提示 UI

## Requirement: 門檻值警示指標 → ❌
證據: 僅 ProgressBar getBarColor 通用門檻 60/80（SystemMonitorPage.tsx:28-32），套用於 CPU/記憶體/磁碟三者相同
- Scenario: 單一指標超過門檻（記憶體 85%）→ ❌ — 記憶體門檻硬編為 80%（與 CPU 同），非 spec 的 85%；無警示圖示，僅 bar 變色
- Scenario: 多項指標正常 → ⚠️ — 低於 60% 顯示 bg-success（綠），符合「正常顏色」，但各指標差異化門檻（CPU80/記憶體85/磁碟90/PG90/Redis80）未實作

## Requirement: 信件發送統計 → ✅
證據: daodao-admin-ui:src/pages/EmailManagementPage.tsx:138-186 StatCard 顯示總發送/成功率/退信率/佇列待發；useEmailStats hook
- Scenario: 顯示發送統計 → ✅ — totalSent、successRate%、bounceRate% 三項 StatCard 呈現

## Requirement: SMTP 服務健康狀態 → ✅
證據: EmailManagementPage.tsx:120-135 綠/紅指標 + 「SMTP 已連線/已斷線」+ health.lastChecked；useEmailHealth → /admin/email/health（admin.routes.ts:1249）
- Scenario: SMTP 連線正常 → ✅ — isConnected 顯示綠點 + 「SMTP 已連線」+ lastChecked
- Scenario: SMTP 連線異常 → ⚠️ — 斷線顯示紅點 + 「SMTP 已斷線」，但無附帶錯誤描述文字

## Requirement: 信件佇列資訊 → ⚠️
證據: EmailManagementPage.tsx:180-185 StatCard「佇列待發」= stats.queuePending；retry tab 顯示待發佇列
- Scenario: 顯示佇列狀態（total + pending）→ ⚠️ — 僅顯示 queuePending，無佇列總大小(total)與「處理中」數量區分
- Scenario: 佇列為空 → ⚠️ — queuePending 可為 0，但無 total:0 顯示與「佇列已清空」標示

## Requirement: 手動發送自訂信件 → ✅
證據: EmailManagementPage.tsx:225-320 compose tab 含收件人(type=email,required)/主旨/內容表單，sendCustomEmail mutation + 成功/失敗 ResultNotice
- Scenario: 發送自訂信件 → ⚠️ — 呼叫 sendCustomEmail，成功顯示「郵件發送成功」ResultNotice（非 toast），訊息文字與 spec「信件已成功發送」略異
- Scenario: 信箱格式驗證失敗 → ⚠️ — input type="email" + required 提供瀏覽器原生驗證，但無自訂「請輸入有效的電子信箱」訊息；handleSubmit 僅檢查非空（EmailManagementPage.tsx 的 if(!formData...)）
- Scenario: 發送失敗 → ✅ — onError 顯示錯誤 ResultNotice，formData 未清空（保留已填內容）

## Requirement: 批次發送信件至使用者區段 → ❌
證據: 無。grep `segment|batch.*send|broadcast` 於 admin-ui 僅命中 UserDetailPage 無關的使用者分群；EmailManagementPage 無區段批次發送 UI 或確認對話框
- Scenario: 批次發送至活躍用戶 → ❌ — 無實作
- Scenario: 確認批次發送 → ❌ — 無實作
- Scenario: 取消批次發送 → ❌ — 無實作

## Requirement: 發送統計匯出 → ❌
證據: EmailManagementPage 未 import ExportButton（grep ExportButton 於該檔無結果）；ExportButton 元件存在於 src/components/ExportButton.tsx 但未用於信件頁
- Scenario: 匯出發送統計 → ❌ — 無 email-stats_{yyyy-MM-dd}.xlsx 匯出功能

## 關鍵落差
1. 門檻值警示未差異化：spec 要求 CPU80/記憶體85/磁碟90/PG連線池90/Redis80 各自門檻與警示圖示，實作只有共用 60/80 變色 ProgressBar，且 DB/Redis 完全無門檻警示。
2. 兩個 email 進階需求缺失：批次發送至使用者區段、發送統計匯出(ExportButton) 皆無任何 UI/API 實作。
3. 監控以水平 ProgressBar 代替 spec 要求的 gauge/環形圖；佇列只顯示 pending 無 total/processing；DB 無 QPS、無連線池滿載警示。
