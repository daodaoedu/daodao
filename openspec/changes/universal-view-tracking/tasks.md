## 1. 資料庫 Migration

- [x] 1.1 在 `daodao-storage/schema/` 新增 `710_create_table_entity_stats.sql`，建立 `entity_stats` 資料表（含所有欄位，PRIMARY KEY (entity_type, entity_id)）
- [x] 1.2 在 `daodao-storage/schema/` 新增 `720_create_table_interaction_events.sql`，建立 `interaction_events` 資料表（含兩個 index）

## 2. Prisma Schema 更新

- [x] 2.1 在 `daodao-server/prisma/schema.prisma` 新增 `EntityStats` model
- [x] 2.2 在 `daodao-server/prisma/schema.prisma` 新增 `InteractionEvents` model

## 3. 後端：view-tracking service

- [x] 3.1 新增 `daodao-server/src/services/view-tracking.service.ts`，實作 `recordView(entityType, entityId, userId)`：Redis SETNX 去重（TTL 24h）→ parallel upsert entity_stats + insert interaction_events

## 4. 後端：Practice view 邏輯

- [x] 4.1 修改 `daodao-server/src/services/practice-event.service.ts`，移除 `case 'view'` 的 TODO 註解，改為呼叫 `viewTrackingService.recordView('practice', entityId, userId)`
- [x] 4.2 確認 `practice-interaction.service.ts` 中 view 相關 TODO 是否需要同步更新，若有則接入 view-tracking service

## 5. 後端：Practice GET 回傳 viewCount

- [x] 5.1 修改 `daodao-server/src/controllers/practice.controller.ts`（或對應 service），`GET /practices/:id` 查詢時 JOIN `entity_stats`，將 `view_count` 填入回應 `stats.viewCount`

## 6. 後端：Resource view endpoint 與 GET 回傳 viewCount

- [x] 6.1 在 `daodao-server/src/controllers/resource.controller.ts` 新增 `POST /resources/:id/view` handler，呼叫 `viewTrackingService.recordView('resource', id, userId)`，回傳 `{ success: true, data: { viewCount } }`
- [x] 6.2 在 router 中註冊 `POST /resources/:id/view` 路由（需登入 middleware）
- [x] 6.3 修改 `GET /resources/:id` handler，JOIN `entity_stats` 補上 `stats.viewCount`

## 7. 前端：useRecordView hook

- [x] 7.1 在 `daodao-f2e/packages/api/` 新增 `useRecordView` hook（或對應 API 呼叫函式），支援 `entityType: 'practice' | 'resource'` 與 `entityId`，fire-and-forget 呼叫對應 view endpoint

## 8. 前端：詳情頁接入 view tracking

- [x] 8.1 在 practice 詳情頁進頁面時呼叫 `useRecordView('practice', id)`（fire-and-forget，不等結果）
- [x] 8.2 在 resource 詳情頁進頁面時呼叫 `useRecordView('resource', id)`（fire-and-forget，不等結果）

## 9. 前端：PostHog 分析事件

- [x] 9.1 在 practice 詳情頁進頁面時呼叫 `posthogCapture('content_viewed', { entity_type: 'practice', entity_id, referrer: document.referrer || null, platform: 'web' })`
- [x] 9.2 在 resource 詳情頁進頁面時呼叫 `posthogCapture('content_viewed', { entity_type: 'resource', entity_id, referrer: document.referrer || null, platform: 'web' })`
