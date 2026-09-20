# profile-activity-metrics
- 涉及 repo: server / f2e
- 對應 archived change: 無
- 總計: 3 條 requirement / 10 個 scenario | ✅10 ⚠️0 ❌0 ❓0

## Requirement: 近期實踐次數顯示（近 7 天）→ ✅
證據: daodao-server:src/services/practice.service.ts:1727 `getRecentPracticeCount(userId, days=7)` count practices where created_at >= now-7d；controller user.controller.ts:536 呼叫並回傳 `recentPracticeCount`；UI daodao-f2e:apps/product/src/components/user/user-info-card.tsx:449 `{recentPracticeCount !== undefined && t("recent_practice_count", {count})}`。
- Scenario: 有實踐紀錄顯示活躍度 → ✅ — 顯示 t("recent_practice_count")
- Scenario: 近 7 天無實踐 → ✅ — count 回傳 0，仍顯示（0 次）
- Scenario: recentPracticeCount 在 profile API 回應 → ✅ — user.controller.ts:559；routes/user.routes.ts:716 zod `recentPracticeCount: z.number()`

## Requirement: 共同 Circle 數量顯示 → ✅
證據: daodao-server:src/services/user.service.ts:2119 `getCommonCirclesCount(userId, viewerId)` join user_join_group；controller user.controller.ts:545-547 僅在 `viewerId !== null && viewerId !== user.id` 時計算；UI user-info-card.tsx:455-459 `clientIsAuthenticated && !clientIsOwnProfile && commonCirclesCount > 0` 才顯示。
- Scenario: 登入查看有共同 Circle 他人檔案 → ✅ — 顯示共同 Circle 模組
- Scenario: 登入查看無共同 Circle → ✅ — `commonCirclesCount > 0` 條件，0 時不顯示
- Scenario: 未登入訪客查看 → ✅ — viewerId null → commonCirclesCount null；UI clientIsAuthenticated false 不顯示
- Scenario: 查看自己的檔案 → ✅ — controller `viewerId !== user.id` 排除；UI `!clientIsOwnProfile`

## Requirement: 隱藏連結數設定 → ✅
證據: daodao-server:src/services/user.service.ts:1168 update `hide_connections_count: hideConnectionsCount`；controller user.controller.ts:541/562 套用於 profile 回應（`hideConnectionsCount ? null : connectionsCount`）；設定 UI daodao-f2e:apps/product/src/components/settings/public-info/privacy-section.tsx（hideConnectionsCount toggle）。
- Scenario: 開啟隱藏連結數 → ✅ — 儲存後 profile API 回 connectionsCount=null，UI user-info-card.tsx:133 顯示「—」
- Scenario: 關閉隱藏連結數（預設）→ ✅ — user.controller.ts:541 `?? false` 預設不隱藏
- Scenario: 儲存隱藏連結數設定 → ✅ — public-info-form 經 updateProfile 寫入；boolean 欄位於 user.controller.ts:193 booleanFields 含 hideConnectionsCount
