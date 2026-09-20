## Context

目前 practice 與 resource 的 `viewCount` 在 API 回應中固定為 0，原因是後端 service 中有多處 `// TODO: 實作 view 表格後再啟用` 的佔位邏輯。

現有基礎設施：
- Redis 已整合於 `daodao-server`（`src/services/database.ts`）
- `POST /:id/view` route 在 practice 已存在，resource 尚未建立
- `packages/analytics` 已封裝 PostHog（`posthogCapture` 等），`NEXT_PUBLIC_POSTHOG_KEY` 已設定
- `interaction_events`、`entity_stats` 資料表尚未建立

## Goals / Non-Goals

**Goals:**
- UI 上的瀏覽次數顯示正確數字（非 0）
- 同一使用者 24h 內重複瀏覽同一內容不重複計數
- 收集使用者行為序列，為推薦系統預備原始資料
- 後台可分析瀏覽趨勢（透過 PostHog）
- 架構通用，新 entity 類型只需少量設定即可接入

**Non-Goals:**
- 推薦演算法本身（僅收集資料）
- 後台 dashboard UI（PostHog 內建）
- 即時計數器（Redis counter）— 第一版先用 DB，流量大時再加
- 匿名使用者追蹤（第一版只記錄已登入使用者）
- `entity_stats` 的非 view 計數（reaction、comment、share 等）— Phase 2 再填，本次只實作 `view_count` 與 `unique_view_count`

## Decisions

### D1：去重用 Redis，計數寫 DB

**選擇**：Redis key `dedup:view:{entity_type}:{entity_id}:{user_id}`，TTL 24h；確認不重複後再 upsert `entity_stats`。

**理由**：每次瀏覽若先 SELECT DB 確認去重，高並發時會產生 race condition 且效能差。Redis SETNX 是原子操作，天然解決此問題。

**替代方案**：DB 唯一索引 + ON CONFLICT — 可行但無法控制時間窗口（無法做「24h 內算一次」）。

---

### D2：interaction_events 用 PostgreSQL，預留 Kafka 路徑

**選擇**：先用 PostgreSQL 的 `interaction_events` 表儲存行為事件，schema 設計與 Kafka message format 一致（flat JSON-able 結構）。

**理由**：目前流量規模不需要 Kafka。但 schema 設計成 append-only、無外鍵（僅存 entity_type + entity_id），未來可直接 mirror 至 Kafka topic 而不需改資料結構。

**替代方案**：直接用 Kafka — 增加基礎設施複雜度，現階段不必要。

---

### D3：分析用 PostHog，web 複用 packages/analytics

**選擇**：`packages/analytics` 已封裝 `posthogCapture`，直接使用。進詳情頁時在前端送出 PostHog event，不存入 operational DB。

**理由**：分析資料不應存在 operational DB，否則 `interaction_events` 會混入分析欄位，模糊職責。PostHog 提供現成 dashboard，無需自建。

**替代方案**：在 `interaction_events` 加 referrer/platform/duration 欄位 — 導致同一張表同時服務推薦與分析，難以個別優化或清理。

---

### D4：entity_stats 用 upsert，不預建資料列

**選擇**：第一次有人瀏覽時才 INSERT，之後 UPDATE increment。使用 `ON CONFLICT DO UPDATE`。

**理由**：不需要在建立 practice/resource 時同步建立 stats 列，減少耦合。

---

### D5：view_count vs unique_view_count 語意

- `view_count`：通過 Redis 去重後的累計次數（24h 內同人重複不計）
- `unique_view_count`：曾瀏覽過的不重複使用者人數（lifetime，每人只算一次）

實作上 `unique_view_count` 需要另一個 Redis set 或 DB 查詢：`SET unique:view:{entity_type}:{entity_id}` 加入 user_id，若為新成員才同時 increment。**Phase 2 實作，本次先只做 `view_count`。**

## 資料流

```
使用者進詳情頁
     ↓
前端 fire-and-forget POST /:id/view
前端同步送出 PostHog event（$screen_name、referrer、duration）
     ↓
後端 view-tracking.service.ts
     ↓
Redis SETNX dedup:view:{entity_type}:{entity_id}:{user_id} (TTL 24h)
  ├─ key 已存在 → 直接返回（不計數）
  └─ key 不存在 → 繼續
          ↓
  ┌───────────────────────────────────────┐
  │  PostgreSQL (parallel, non-blocking)   │
  │  1. upsert entity_stats                │  ← view_count += 1（顯示用）
  │  2. insert interaction_events          │  ← 行為序列（推薦用）
  └───────────────────────────────────────┘

取詳情時：
GET /practices/:id → findById() JOIN entity_stats → response.stats.viewCount
```

## 資料表設計

```sql
-- 計數顯示
CREATE TABLE entity_stats (
  entity_type       VARCHAR(50) NOT NULL,
  entity_id         INT         NOT NULL,  -- 假設所有 entity 使用 INT PK（UUID entity 需另評估）
  view_count        INT DEFAULT 0,         -- Phase 1：24h 去重累計
  unique_view_count INT DEFAULT 0,         -- Phase 2：lifetime 不重複人數
  reaction_count    INT DEFAULT 0,         -- Phase 2：reactions 表總數同步
  comment_count     INT DEFAULT 0,         -- Phase 2
  share_count       INT DEFAULT 0,         -- Phase 2
  favorite_count    INT DEFAULT 0,         -- Phase 2
  practice_count    INT DEFAULT 0,         -- Phase 2：resource 專用
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (entity_type, entity_id)
);

-- 推薦原始資料（append-only）
CREATE TABLE interaction_events (
  id           SERIAL PRIMARY KEY,
  entity_type  VARCHAR(50) NOT NULL,
  entity_id    INT         NOT NULL,
  user_id      INT         NOT NULL,
  event_type   VARCHAR(20) NOT NULL,  -- 'view' | 'reaction' | 'share' | 'favorite' | 'comment'
  metadata     JSONB,                 -- 選填，如 reaction 的 {"reaction_type": "fire"}
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON interaction_events (user_id, created_at);
CREATE INDEX ON interaction_events (entity_type, entity_id, event_type);
```

## API 規格

### POST /api/v1/practices/:id/view（已存在，補實作）
### POST /api/v1/resources/:id/view（新增）

兩者 contract 一致：

```
Auth: Bearer token（必須登入）
Params: id (string)
Body: {} （空，或選填 referrer: string）
Response 200: { success: true, data: { viewCount: number } }
Response 404: practice/resource 不存在
```

### GET /api/v1/practices/:id 與 GET /api/v1/resources/:id（修改回應）

`stats` 欄位補上 `viewCount`，從 `entity_stats` JOIN 取得：

```typescript
stats: {
  viewCount: number,   // 從 entity_stats 取，預設 0
  // ... 其他既有欄位不變
}
```

## PostHog Event Schema

進入詳情頁時送出：

| Event Name | Properties |
|---|---|
| `content_viewed` | `entity_type`: `'practice'` \| `'resource'` |
| | `entity_id`: string |
| | `referrer`: `document.referrer` \| `null` |
| | `platform`: `'web'` \| `'mobile'` |

離開頁面時（選填，Phase 2）送出 `content_view_duration`，補上 `duration_ms`。

## 計數器生命週期

| 欄位 | 由誰 increment | 由誰 decrement | 實作階段 |
|---|---|---|---|
| `view_count` | `view-tracking.service` | 不減（累計） | Phase 1 |
| `unique_view_count` | `view-tracking.service` | 不減 | Phase 2 |
| `reaction_count` | `reaction.service` upsert 時 | `reaction.service` remove 時 | Phase 2 |
| `comment_count` | `comment.service` 新增時 | `comment.service` 刪除時 | Phase 2 |
| `share_count` | `share.service` 時 | 不減 | Phase 2 |
| `favorite_count` | `favorite.service` 時 | 取消收藏時 | Phase 2 |
| `practice_count` | 資源加入實踐時 | 移除時 | Phase 2 |

## Risks / Trade-offs

**Redis 當機導致去重失效** → 短暫內可能重複計數，`entity_stats` 數字略偏高，可接受。Redis 重啟後恢復正常。

**interaction_events 資料量增長** → `created_at` 已有索引，定期封存 > 1 年的資料。推薦系統通常只需近期行為。

**entity_stats 無外鍵約束** → 刪除 entity 時需手動清理對應 stats。可用 soft delete 或排程清理。

**Phase 2 欄位在 Phase 1 先建好但不更新** → 欄位值為 0，不影響 Phase 1 功能；Phase 2 實作時直接開始寫入，無需 migration。

## Migration Plan

1. 建立 `entity_stats`、`interaction_events` 資料表（daodao-storage migration SQL）
2. Prisma generate 更新 client
3. 實作 `src/services/view-tracking.service.ts`
4. 修改 `src/services/practice-event.service.ts`、`practice-interaction.service.ts`（移除 TODO，接入 view-tracking service）
5. 修改 `src/controllers/practice.controller.ts`，`GET /practices/:id` 回應補上 `entity_stats.view_count`
6. 新增 `POST /resources/:id/view` route 與 controller，接入 view-tracking service
7. 修改 `src/controllers/resource.controller.ts`，`GET /resources/:id` 回應補上 `entity_stats.view_count`
8. 前端補上 `useRecordView` hook，practice 與 resource 詳情頁各自呼叫
9. 前端在詳情頁補上 `posthogCapture('content_viewed', {...})` 事件

Rollback：view-tracking service 出錯時 catch error 不影響主流程（非阻塞），UI 頂多顯示舊數字。

## Open Questions

（已解決）
- ~~Redis key 格式~~：統一為 `dedup:view:{entity_type}:{entity_id}:{user_id}`
- ~~entity_stats 欄位~~：Phase 1 只實作 `view_count`，其他欄位建好但 Phase 2 才填
- ~~PostHog key~~：`NEXT_PUBLIC_POSTHOG_KEY` 已有，`packages/analytics` 已封裝
- ~~unique_view_count 語意~~：lifetime 不重複人數，Phase 2 實作
