# unified-dashboard
- 涉及 repo: admin-ui (src/pages/DashboardPage.tsx + hooks/useDashboardStats.ts)、server (admin stats/ai-usage/health 端點)
- 對應 archived change: 無
- 總計: 7 條 requirement / 14 個 scenario | ✅6 ⚠️5 ❌3 ❓0

## Requirement: 使用者 KPI 卡片 → ⚠️
證據: daodao-admin-ui:src/pages/DashboardPage.tsx:209 用戶活躍區塊 StatCard(DAU/WAU/MAU/總用戶)
- **落差**：spec 要求四卡為 總用戶/本月新增用戶/活躍用戶/成長率。實作 KPI 為 DAU/WAU/MAU/總用戶，**缺「本月新增用戶」與「成長率」卡片**（grep 本月新增/成長率/growthRate 無結果）
- Scenario: 正常載入 KPI 卡片 → ⚠️ — 有四張卡但組成與 spec 不同（無成長率卡）
- Scenario: 成長率為負值 → ❌ — 無成長率 KPI 卡片，無法以紅色負值標示

## Requirement: DAU/WAU/MAU 指標與趨勢 → ✅
證據: DashboardPage.tsx:211-232 三張 StatCard，change={trend?.dauChangePercent/...}（趨勢箭頭由 StatCard 依 change 正負呈現）
- Scenario: 顯示 DAU/WAU/MAU → ✅ — 三指標卡含當前值與 change (DashboardPage.tsx:211-233)
- Scenario: 趨勢上升 → ✅ — change 正值→StatCard 上箭頭綠色（StatCard 慣例，change 為 dauChangePercent）

## Requirement: AI 成本摘要 → ✅
證據: DashboardPage.tsx:317 AI 使用區塊：總費用 USD(total_cost_usd)、查詢次數(total_queries)、總 Tokens(formatTokens)
- Scenario: 顯示 AI 成本摘要 → ✅ — Total Cost/Total Queries/Total Tokens 三指標皆有 (DashboardPage.tsx:322-345)
- Scenario: Token 超過百萬 → ✅ — formatTokens: `n>=1_000_000 → (n/1e6).toFixed(1)+'M'` (DashboardPage.tsx:74)，格式 X.XM（spec 寫 X.XXM 兩位，實作一位小數，輕微差異）

## Requirement: 系統健康狀態 → ✅
證據: DashboardPage.tsx:149-155 serviceStatus { email(SMTP), db, redis }；STATUS_STYLES 綠(healthy)/異常；getServiceStatus connected→healthy
- Scenario: 所有服務正常 → ✅ — allHealthy → 全部正常，三服務綠色 (DashboardPage.tsx:155,402)
- Scenario: 單一服務異常 → ✅ — 各服務獨立 status 標籤，異常顯示對應色與「異常」文字 (DashboardPage.tsx:407-420, STATUS_LABELS)
- 註：SMTP 以 email(useEmailHealth) 對應，符合 spec SMTP 連線狀態

## Requirement: 近期異常警報 → ❌
證據: 無。DashboardPage.tsx 無警報區塊（grep 警報/alert/異常事件/severity/目前無 皆 0 結果）
- Scenario: 存在未處理警報 → ❌ — 無警報列表實作
- Scenario: 無異常警報 → ❌ — 無「目前無異常警報」訊息

## Requirement: 載入骨架畫面 → ⚠️
證據: DashboardPage.tsx:94 DashboardSkeleton；135 `if (isLoading) return <DashboardSkeleton/>`
- Scenario: 資料載入中 → ✅ — 載入時整頁顯示 DashboardSkeleton 佔位 (DashboardPage.tsx:135)
- Scenario: 部分資料先行載入 → ❌ — **全有或全無的整頁 skeleton（isLoading 單一旗標）**，無「KPI 已載入但 AI 成本仍 skeleton」的分區漸進載入

## Requirement: 自動定期刷新 → ⚠️
證據: daodao-admin-ui:src/hooks/useDashboardStats.ts:8 `refetchInterval: 60_000`
- Scenario: 自動刷新成功 → ✅ — react-query refetchInterval 60s 靜默背景刷新，不觸發整頁 skeleton（isLoading 僅初次）(useDashboardStats.ts:8)
- Scenario: 自動刷新失敗 → ⚠️ — react-query 失敗時預設保留上次資料（cache 行為符合「保留上次資料」），但 **無「資料刷新失敗」頂部警示訊息**；且 DashboardPage.tsx:136 `if (error || !aiData) return 載入失敗` 在初始失敗時整頁替換為錯誤
