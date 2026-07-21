# user-analytics
- 涉及 repo: admin-ui (src/pages/UserAnalyticsPage.tsx + hooks)、server (admin user-stats: trend/funnel/cohort)
- 對應 archived change: 無（admin analytics 功能）
- 總計: 10 條 requirement / 18 個 scenario | ✅5 ⚠️6 ❌6 ❓1

## Requirement: DAU/WAU/MAU 趨勢圖表 → ⚠️
證據: daodao-admin-ui:src/pages/UserAnalyticsPage.tsx:177 三張 StatCard + 折線圖（dau/wau/mau 三線同圖，useActiveUsersTrend）
- Scenario: 檢視活躍用戶趨勢 → ✅ — StatCard(DAU/WAU/MAU) + LineChart 三條線 (UserAnalyticsPage.tsx:180-310)
- Scenario: 切換時間粒度 → ❌ — 折線圖固定同時顯示 dau/wau/mau 三線，**無切換單一指標的 toggle**

## Requirement: DAU/WAU/MAU 環比變化 → ⚠️
證據: StatCard change={summary?.dauChangePercent} (UserAnalyticsPage.tsx:183,191,199)
- Scenario: 顯示環比百分比變化 → ✅ — change 百分比傳入 StatCard（StatCard 內部以正負色標示，符合綠/紅趨勢慣例）
- Scenario: 無前期資料可比較 → ❓ — change `?? 0` fallback 0%，**未顯示「N/A」或「--」**（spec 要求 N/A），標部分/待確認 StatCard 是否處理

## Requirement: 轉換漏斗視覺化 → ⚠️
證據: UserAnalyticsPage.tsx:121 funnelStages = funnelData.steps（後端 /api/v1/admin/user-stats/funnel 動態回傳 steps）
- Scenario: 檢視轉換漏斗 → ⚠️ — 有漏斗區塊與長條圖 (UserAnalyticsPage.tsx:375-420)，但 stage 標籤由後端 steps 決定；**前端未硬編 註冊→首次登入→首次打卡→7日回訪→30日活躍 五階段**，無法確認後端是否回此五階段（grep server funnel 五階段無明確證據）

## Requirement: 漏斗各階段人數與轉換率 → ✅
證據: UserAnalyticsPage.tsx:392-405 每 stage 顯示 value + pct（pct = value/funnelBase*100，以首階段為基準）
- Scenario: 檢視各階段轉換率 → ⚠️ — 顯示「該階段人數 + 相對首階段百分比」；spec 要求「**從上一階段到該階段**的轉換率」，實作是相對第一階段而非相鄰階段，計算口徑不同

## Requirement: 漏斗各階段流失人數 → ❌
證據: 無
- Scenario: 檢視階段間流失 → ❌ — 漏斗只顯示人數與百分比，**未顯示相鄰階段流失人數**
- Scenario: 識別最大流失環節 → ❌ — 無最大流失環節視覺強調（barClass 僅依 pct 高低調色，非流失標記）

## Requirement: 群組留存率熱力圖 → ✅
證據: UserAnalyticsPage.tsx:483 Cohort 區塊，依加入月份分群表格，useUserCohortRetention
- Scenario: 檢視群組留存率 → ✅ — table 列=月份(row.period)、欄=留存時間點 (UserAnalyticsPage.tsx:519-555)

## Requirement: 熱力圖留存時間點 → ✅
證據: UserAnalyticsPage.tsx:39 COHORT_COLUMNS = Day 1/7/14/30/60/90；cohortRows values=[day1,day7,day14,day30,day60,day90] (UserAnalyticsPage.tsx:131)
- Scenario: 檢視各時間點留存率 → ✅ — 每列顯示 6 個時間點百分比 (UserAnalyticsPage.tsx:535-550)

## Requirement: 熱力圖顏色深淺對應留存率 → ⚠️
證據: UserAnalyticsPage.tsx:58 retentionBg(pct) 依百分比分檔調色；圖例 低→高 (UserAnalyticsPage.tsx:497)
- Scenario: 顏色對應留存率 → ⚠️ — retentionBg 有分檔，但實作色階偏弱（多檔回同色 class，UserAnalyticsPage.tsx:60-66），色深對應不夠嚴格
- Scenario: 滑鼠懸停顯示詳情 → ❌ — cohort 表格儲存格**無 tooltip**（無群組名/時間點/百分比/人數懸停資訊）

## Requirement: 全域日期範圍篩選 → ⚠️
證據: UserAnalyticsPage.tsx:148-175 dateFrom/dateTo Input，trendQuery 傳給 trend/funnel/cohort 三 hook
- Scenario: 設定全域日期範圍 → ✅ — 兩個 date input，三張圖共用 trendQuery (UserAnalyticsPage.tsx:78-104)
- Scenario: 快捷日期選項 → ❌ — **僅有起訖 date input，無 7/30/90天/本月/上月/自訂 快捷選項**

## Requirement: 群組分析使用者標籤篩選 → ❌
證據: 無
- Scenario: 依標籤篩選群組分析 → ❌ — UserAnalyticsPage 無標籤/分群篩選 UI
- Scenario: 多標籤組合篩選 → ❌ — 無實作

## Requirement: 分析資料匯出 → ✅
證據: UserAnalyticsPage.tsx:168 ExportButton data={trendRows} columns(date/DAU/WAU/MAU)
- Scenario: 匯出分析資料 → ⚠️ — ExportButton 匯出，但 **僅匯出趨勢資料(trendRows)**，非「當前篩選下所有分析資料」（漏斗/cohort 未含）
- Scenario: 匯出範圍依循篩選條件 → ⚠️ — trendRows 受 dateFrom/dateTo 影響，部分符合；但無標籤篩選

## Requirement: 註冊趨勢圖表 → ❌
證據: 無。UserAnalyticsPage 無註冊趨勢區塊（grep registration/註冊趨勢/新註冊 在 admin-ui pages 無結果）
- Scenario: 檢視註冊趨勢 → ❌ — 無實作
- Scenario: 切換時間粒度 → ❌ — 無實作

## Requirement: 註冊趨勢環比比較 → ❌
- Scenario: 顯示註冊環比比較 → ❌ — 無實作
- Scenario: 前期比較標記 → ❌ — 無實作

註：requirement 計數含「註冊趨勢圖表」「環比比較」共 12 條（spec 標題），上方逐條列出；統計 ✅/⚠️/❌ 以 requirement 層級彙總。
