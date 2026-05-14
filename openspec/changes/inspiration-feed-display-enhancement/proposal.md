## Why

靈感頁面的 Feed 目前只顯示主題實踐卡片，且每張卡片的 FeedLabel 僅固定顯示「XXX 發布了新實踐」，無法反映打卡內容，也無法傳達該項目出現在 Feed 的真實原因（例如：有人按了加油、有人打卡、新發布等）。這讓 Feed 缺乏社群互動感，且與 PRD/FRD v1.1 設計稿差異明顯。

本次迭代涵蓋三個相互關聯的子功能：靈感 Feed 出現打卡紀錄、互動動態卡片、打卡紀錄可互動。

## What Changes

- **Feed API 回傳混合類型**：除了目前的 `IShowcasePractice`，新增 `IShowcaseCheckIn` 與 `IActivityCard` 類型，Feed 同時包含「實踐卡片」、「打卡卡片」、「互動動態卡片」
- **Feed item 增加 `feed_reason` 欄位**：每個 Feed item 帶有觸發原因（`cheered` / `checked_in` / `new_release` / `new_practice`），前端根據此欄位決定顯示哪種 FeedLabel
- **FeedLabel 對應四種 feed_reason**：
  - `ThumbsUp` + "XXX 表達了加油"（原因：`cheered`，由 reactions 表的 created_at 觸發）
  - `CalendarCheckIcon` + "XXX 在 YYY 打卡"（原因：`checked_in`）
  - `Rss` + "最新發布"（原因：`new_release`，醞釀中實踐新發布）
  - `Rss` + "XXX 發布了新實踐"（原因：`new_practice`，一般新發布）
- **Feed 組成演算法（Slot Pattern）**：採用固定節奏 A → B → C → C → C 循環，每次載入一個完整循環單位（5～6 格）
  - Slot A（打卡）：1～2 則，依 reactions/comments 數量決定（熱門打卡 1 則；冷啟動不同 userId 各 1 則）
  - Slot B（互動）：ActivityCard 1 則（社群活動事件或追蹤動態彙整）
  - Slot C（實踐）：3 則 PracticeShowcaseCard / BrewingCard
- **ActivityCard**：顯示社群活動訊號，如「Anna 對 Bob 的打卡說加油了」，來源優先序：已連結 > 關注 > 社群熱門事件
- **CheckInShowcaseCard 互動功能**：打卡展示卡片支援快速回應（Reactions）與留言（Comments），透過 `useReactionsBatch` 批次取得 Reaction 資料避免 N+1
- **打卡詳情頁互動**：打卡詳情頁支援 4 種快速回應（加油/啟發/共嗚/好奇）與二層留言系統（留言 + 回覆），支援 @ 標記
- **瀏覽活動（Browse Activity）**：三點選單開啟 BrowseActivityContent Bottom Sheet，查看誰對打卡有所反應
- **移除正式頁面中的 hardcoded mock 打卡卡片**，改由真實 API 資料驅動
- **「最新發布」群組顯示**：連續 `feed_reason: "new_release"` items 共用一個 FeedLabel

## Capabilities

### New Capabilities

- `showcase-feed-mixed-items`：Feed API 支援回傳混合類型（practice + check-in + activity），包含 `feed_reason` 欄位（`cheered` / `checked_in` / `new_release` / `new_practice`），其中 `cheered` 由 reactions 表的 created_at 觸發；前端根據類型與原因渲染對應卡片和 FeedLabel
- `feed-composition-algorithm`：Feed 以固定 Slot Pattern（A→B→C→C→C）組裝，依據打卡的 reactions/comments 動態決定 Slot A 顯示 1 或 2 則；每次分頁載入完整循環單位
- `activity-card`：ActivityCard 顯示社群活動事件（類型 A）與追蹤動態彙整（類型 B），來源優先序為 Connection > Follow > 熱門事件
- `checkin-reactions-comments`：打卡支援 4 種快速回應（加油/啟發/共嗚/好奇）與二層留言系統；展示卡片批次取得 Reaction 資料（useReactionsBatch）避免 N+1
- `browse-activity`：打卡三點選單開啟 BrowseActivityContent Bottom Sheet，查看誰對打卡有所反應，依 reactedAt 倒序排列

### Modified Capabilities

- `showcase-feed`：現有 Feed API（`GET /api/v1/feed`）回傳格式擴充 `feed_reason` 欄位，並依 Slot Pattern 組裝回傳

## Impact

- **daodao-f2e**：
  - `apps/product/src/app/[locale]/(with-layout)/page.tsx` — 移除 mock 卡片、新增 Slot Pattern 渲染邏輯（A/B/C 三種 slot）
  - `packages/api/` — 更新 `FeedItem` union type（practice | check-in | activity + feed_reason）
  - `components/showcase/` — CheckInShowcaseCard、ActivityCard 元件
  - 打卡詳情頁 — Reactions + Comments 互動功能
  - 瀏覽活動 — BrowseActivityContent Bottom Sheet
- **daodao-ai-backend**：
  - `GET /api/v1/feed` — 回傳 `feed_items` 陣列，依 Slot Pattern 組裝，每個 item 含 `item_type`、`feed_reason`、`slot_type`（A/B/C）
  - 打卡則數判斷邏輯（reactions/comments 計數）
  - ActivityCard 資料聚合（社群事件 + 追蹤動態）
