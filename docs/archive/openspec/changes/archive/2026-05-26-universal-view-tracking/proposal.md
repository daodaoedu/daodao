## Why

平台上多種內容（主題實踐、資源）需要顯示瀏覽次數，但目前後端缺乏資料庫層支撐，所有 viewCount 固定回傳 0。此外，使用者的瀏覽行為是推薦系統與後台數據分析的基礎資料。為避免日後各 entity 各自實作造成碎片化，及早建立通用且職責分離的架構。

## What Changes

三個關注點分拆，各自獨立：

**計數顯示**
- 新增 `entity_stats` 表，儲存各 entity 的 view_count 供 UI 顯示
- Redis 處理去重（TTL 24h）與即時計數，定期 sync 至 DB

**推薦系統原始資料**
- 新增 `interaction_events` 表，記錄使用者行為序列（view、reaction、share、favorite、comment 等），reaction 類型存於 metadata
- 設計預留擴充，未來可遷移至 Kafka

**後台分析**
- 採用 PostHog 記錄完整 event（referrer、platform、duration）
- 不從 operational DB 直接查詢分析數據

**串接現有功能**
- 啟用 practice 與 resource 的 `POST /:id/view` 後端邏輯（目前為 TODO/註解）
- 前端進入詳情頁時 fire-and-forget 呼叫 view API

## Capabilities

### New Capabilities

- `universal-view-tracking`：通用瀏覽事件記錄架構，含計數顯示、推薦原始資料收集、後台分析三層分離設計，適用所有 entity 類型（practice、resource 及未來擴充）

### Modified Capabilities

（無現有 spec 需要修改）

## Impact

**資料庫（daodao-storage）**
- 新增 `entity_stats` 表（view、unique_view、reaction、comment、share、favorite、practice_count）；reaction 為四種類型總數，per-type 明細由現有 `reactions` 表提供
- 新增 `interaction_events` 表（user_id、entity_type、entity_id、event_type、metadata、created_at）
- Prisma schema 新增對應 model

**快取（Redis）**
- 去重 key：`dedup:view:{entity_type}:{entity_id}:{user_id}`，TTL 24h
- 即時計數器：`counter:{entity_type}:{entity_id}:views`（可選，之後加）

**後端（daodao-server）**
- 新增 `src/services/view-tracking.service.ts`（通用 service，串接 Redis + DB）
- 修改 `src/services/practice-event.service.ts`、`practice-interaction.service.ts`（移除 TODO，接入通用 service）
- 修改 `src/controllers/resource.controller.ts`（啟用被註解的 view 邏輯）

**前端（daodao-f2e）**
- practice 與 resource 詳情頁進頁面時 fire-and-forget 呼叫 view API
- 新增對應 API hook

**分析（PostHog）**
- 前端進詳情頁時同步送出 PostHog event（含 referrer、platform、duration）
- 後台 dashboard 從 PostHog 查詢，不影響 operational DB

**下游**
- `interaction_events` 為未來推薦系統提供使用者行為序列
- 架構預留 Kafka 遷移路徑
