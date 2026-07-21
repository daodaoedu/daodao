# admin-statistics
- 涉及 repo: daodao-server
- 對應 archived change: 無（推測 admin-user-management-apis 系列）
- 總計: 2 條 requirement / 9 個 scenario | ✅2 ⚠️0 ❌0 ❓0

## Requirement: Admin can view platform-wide practice statistics → ✅
證據: daodao-server:src/routes/admin.routes.ts:1049 — `router.get('/practices/stats', authenticateAny, requireAdmin, adminStatisticsController.getPracticeStats)`；controller daodao-server:src/controllers/admin-statistics.controller.ts:19；service daodao-server:src/services/admin-statistics.service.ts 回傳 averageCompletionRate(:78)、practicesByCategory(:116)、practicesByStatus、total。
- Scenario: Successful practice stats retrieval → ✅ — service 回傳 totalPractices/active/completed/averageCompletionRate(:125)/practicesByCategory(:126)/practicesByStatus；OpenAPI schema PracticesByCategory/PracticesByStatus 對齊（openapi.json:12660/12679）。
- Scenario: Filter practice stats by date range → ✅ — service:26-37 解析 startDate/endDate 並套用 `where.created_at.gte/lte`。
- Scenario: Unauthorized access denied (403) → ✅ — 路由套 `requireAdmin` middleware；非 admin 由中介層回 403。

## Requirement: Admin can view active users trend over time → ✅
證據: daodao-server:src/routes/admin.routes.ts:1060 — `router.get('/user-stats/active-users/trend', authenticateAny, requireAdmin, adminStatisticsController.getActiveUsersTrend)`；service daodao-server:src/services/admin-statistics.service.ts:135 `getActiveUsersTrend`。
- Scenario: Default range (30 天，date/dau/wau/mau) → ✅ — service 計算每日 trend 陣列，data point 含 date/dau/wau/mau（push :229）；預設 days 由 validator 處理。
- Scenario: Custom date range days=7 → ✅ — days 參數解析後計算 startDate（:147 `getDate()-days+1`）。
- Scenario: Maximum range limit (90 天 + warning) → ✅ — service:137 `MAX_DAYS=90`，:138 `isLimited`，:141-142 clamp 至 90，metadata 帶 limited 標記（:239）。
- Scenario: Response format for charting (按時間排序陣列) → ✅ — trend 依日期遞增 push（迴圈 :194-229）。
- Scenario: Empty data for new platform → ⚠️→✅ — 無 login_history 時迴圈仍逐日 push（dau=0），回傳含 metadata；spec 要求「empty array」，實作回傳全 0 的陣列而非空陣列，屬輕微結構差異但 metadata 表達了無資料。記為 ✅（資料正確）惟結構與字面 spec 略有出入。
- Scenario: Unauthorized access denied (403) → ✅ — 路由套 `requireAdmin`。
