# universal-view-tracking
- 涉及 repo: server / f2e / storage
- 對應 archived change: add-universal-view-tracking（推測）
- 總計: 5 條 requirement / 13 個 scenario | ✅12 ⚠️1 ❌0 ❓0

## Requirement: 記錄瀏覽事件 → ✅
證據: daodao-server:src/services/view-tracking.service.ts:27 dedupKey `dedup:view:{type}:{id}:{user}`、:33 redis.set EX 86400 NX、:52 entity_stats.upsert、:58 interaction_events.create；route practice.routes.ts:1320 POST /:id/view（authenticate）、resource.routes.ts:479。
- Scenario: 首次瀏覽 → ✅ — Redis NX 設 24h key（service.ts:33, DEDUP_TTL_SECONDS=86400 line 14）、view_count+1 upsert、interaction_events insert、回傳 viewCount。
- Scenario: 24h 內重複瀏覽 → ✅ — NX 失敗時回傳現有 view_count，不更新（service.ts:41-46）。
- Scenario: 內容不存在 → ⚠️ — 404 由 controller 處理（resource.controller.ts:288 先查 resource），practice 路徑經 controller 查找；未逐行確認 practice 404 分支但結構支持。
- Scenario: 未登入 → ✅ — route 用 authenticate middleware（practice.routes.ts:1321），回 401。

## Requirement: 瀏覽次數顯示於詳情頁 → ✅
證據: daodao-server:src/services/admin-content.service.ts:99,291 LEFT JOIN entity_stats es；practice/resource 詳情回傳 viewCount。
- Scenario: 有瀏覽紀錄 → ✅ — viewCount 來自 entity_stats.view_count。
- Scenario: 尚無瀏覽紀錄 → ✅ — getViewCount 無記錄回 0（view-tracking.service.ts:71 區段）。

## Requirement: 記錄使用者行為序列 → ✅
證據: daodao-server:src/services/view-tracking.service.ts:58 prisma.interaction_events.create（含 entity_type/entity_id/user_id/event_type='view'）；storage migrate/sql/017_create_view_tracking_tables.sql。
- Scenario: 寫入行為事件 → ✅ — 去重通過後 create。
- Scenario: 重複瀏覽不寫入 → ✅ — 重複時提前 return（service.ts:41-46），不執行 create。

## Requirement: 前端發送 PostHog 分析事件 → ✅
證據: daodao-f2e:apps/product/src/app/[locale]/practices/[id]/page.tsx:3,181 posthogCapture("content_viewed", ...)；resource-detail-client.tsx:3,39 同樣 content_viewed。
- Scenario: 進入詳情頁 → ✅ — posthogCapture('content_viewed', {...})。
- Scenario: PostHog 失敗不阻塞 → ✅ — posthogCapture（posthog.tsx:48）內含防護，非同步不阻塞渲染（payload 含 referrer/platform 需執行時確認但呼叫存在）。

## Requirement: 瀏覽記錄不阻塞主流程 → ✅
證據: daodao-server:src/services/view-tracking.service.ts:50-66 try/catch 包住 DB 寫入，:35 Redis 錯誤亦 catch warn。
- Scenario: service 發生錯誤 → ✅ — catch 並 logger.warn（service.ts:36,63），不向上拋。
