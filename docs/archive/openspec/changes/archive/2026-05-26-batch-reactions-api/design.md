## Context

靈感頁面（showcase feed）使用 SWR Infinite 分頁載入 practice 卡片，每張卡片 mount 時獨立呼叫兩個 reactions API。SWR deduplication 只合併相同 key 的請求，不同 targetId 各自獨立，因此 N 張卡片 = 2N 個請求。

現有架構：
- 後端 `GET /api/v1/reactions` 和 `GET /api/v1/reactions/list` 各接受單一 `targetId`
- 前端 `useReactions` / `useReactionsList` hooks 各發一個請求
- DB 有 `idx_reactions_target` index 在 `(target_type, target_id)` 上

## Goals / Non-Goals

**Goals:**
- 提供批次查詢端點，一次取回多個目標的反應計數 + 用戶反應列表
- 前端列表頁從 2N 請求降為 1 個請求
- 保持既有單筆端點不變，detail page 等場景繼續使用

**Non-Goals:**
- 不修改既有 `GET /reactions` 和 `GET /reactions/list` 端點
- 不做 reactions 的 server-side caching（Redis）
- 不重構卡片元件的非 reactions 部分

## Decisions

### 1. 單一合併 batch endpoint，而非兩個分開的 batch endpoints

合併 reactions 計數 + list 到同一個回傳。兩個端點的資料來源都是同一張 `reactions` table，batch 場景下分成兩個 endpoint 沒有意義，只是多一個請求。

### 2. 用 `GET` + 逗號分隔 targetIds，而非 `POST` with body

雖然 POST body 更適合大量 ID，但：
- 這是一個讀取操作，GET 語義正確
- SWR 的 key 天然支援 URL string，GET 更容易整合
- 限制 50 個 ID，URL 長度不會超過限制（50 個 UUID ≈ 1800 字元）

### 3. 後端用 `WHERE target_id IN (...)` 單次查詢，ID 轉換也做批次

現有的 `getReactionsByTarget` 和 `getReactionsListByTarget` 各自查一次 DB。batch 版本改為一次查出所有 target 的 reactions，在記憶體中 group by targetId，避免 N 次 DB round-trip。

注意：現有的 `batchExternalToInternalIds` 是 for loop 逐一呼叫 `externalToInternalId`（N+1 查詢），不適合 batch 場景。batch handler 應直接用 Prisma `findMany({ where: { external_id: { in: [...] } } })` 一次查出所有 internal ID。

### 3.1 Batch response 欄位命名對齊現有 API

現有 `getReactionsListByTarget` 回傳 `{ items: ReactionListItem[] }`。batch response 中每個 target 的反應列表也使用 `items` 欄位名稱，保持一致性。

### 4. 前端用 optional props 做 fallback，而非 Context Provider

卡片元件新增 optional reactions props，有傳就用、沒傳就 fallback 到獨立 hook。比 Context 簡單，不需要改元件樹結構，且 detail page 等場景自然 fallback。

### 5. SWR key 使用排序後的 targetIds

`useReactionsBatch` 的 SWR key 將 targetIds 排序後組成 URL，確保相同集合的 ID 不因順序不同而產生重複快取。

## Risks / Trade-offs

**[回傳體積]** 50 個目標的合併回傳可能較大 → 實際上每個 target 的反應數通常 < 10 筆，50 個 target 的 payload 仍在合理範圍（< 50KB）

**[SWR 快取粒度]** batch 快取是整組 ID 為一個 key，新增/移除單筆反應後需 mutate 整個 batch → 可接受，因為 SWR revalidation 成本低（一個 GET 請求）

**[分頁載入的 ID 集合變動]** 使用者滾動載入更多卡片時 targetIds 會變化，產生新的 SWR key → 前一頁的快取仍在，新頁面發一個新 batch 請求，不會重複請求已快取的頁面
