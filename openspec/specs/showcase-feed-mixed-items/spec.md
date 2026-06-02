## ADDED Requirements

### Requirement: Feed API 回傳 feed_reason 欄位
`/api/v1/feed` 回傳的每個 item SHALL 包含 `feed_reason` 欄位，說明該 item 出現在 Feed 的原因。

`feed_reason` 的合法值為：
- `new_practice`：非 brewing 狀態的新發布實踐
- `new_release`：`is_brewing=true` 的醞釀中實踐
- `checked_in`：打卡記錄
- `cheered`：practice 或 checkin 收到 reaction（`reactions` table），使用最新 reaction 的 `created_at` 作為 Feed 排序時間

#### Scenario: 新發布實踐出現在 Feed
- **WHEN** feed 包含一個 `is_brewing=false` 的 practice item
- **THEN** 該 item 的 `feed_reason` SHALL 為 `new_practice`

#### Scenario: 醞釀中實踐出現在 Feed
- **WHEN** feed 包含一個 `is_brewing=true` 的 practice item
- **THEN** 該 item 的 `feed_reason` SHALL 為 `new_release`

#### Scenario: 打卡記錄出現在 Feed
- **WHEN** feed 包含一個 `type=checkin` 的 item
- **THEN** 該 item 的 `feed_reason` SHALL 為 `checked_in`

#### Scenario: 有人對實踐按 reaction
- **WHEN** practice 或 checkin 收到 reaction（`reactions.target_type IN ('practice','checkin')`）
- **THEN** 該 item 以 `feed_reason: "cheered"` 出現在 Feed，排序時間為 `MAX(reactions.created_at)`

---

### Requirement: 靈感頁面使用統一 Feed endpoint
靈感頁面 SHALL 使用 `/api/v1/feed` 統一 endpoint，不再使用 `/api/v1/users/practices`。

#### Scenario: Feed 同時顯示實踐與打卡
- **WHEN** 用戶開啟靈感頁面
- **THEN** Feed MUST 顯示 `type=practice` 和 `type=checkin` 混合的卡片列表

#### Scenario: 移除 hardcoded mock 打卡卡片
- **WHEN** 用戶開啟靈感頁面
- **THEN** 不 SHALL 出現任何 hardcoded mock 資料，所有卡片來自真實 API

---

### Requirement: FeedLabel 根據 feed_reason 動態渲染
靈感頁面每張卡片上方 SHALL 根據 `feed_reason` 顯示對應的 FeedLabel。

| feed_reason | icon | 文案範例 |
|---|---|---|
| `new_practice` | ThumbsUp | `{userName} 發布了新實踐` |
| `new_release` | Rss | `最新發布` |
| `checked_in` | CalendarCheckIcon | `{userName} 在 {practiceTitle} 打卡` |
| `cheered` | ThumbsUp | `{userName} 表達了加油` |

#### Scenario: 新實踐的 FeedLabel
- **WHEN** feed item 的 `feed_reason` 為 `new_practice`
- **THEN** FeedLabel MUST 顯示 ThumbsUp icon 且文案為 `{user.name} 發布了新實踐`

#### Scenario: 醞釀中實踐的 FeedLabel
- **WHEN** feed item 的 `feed_reason` 為 `new_release`
- **THEN** FeedLabel MUST 顯示 Rss icon 且文案為「最新發布」

#### Scenario: 打卡的 FeedLabel
- **WHEN** feed item 的 `feed_reason` 為 `checked_in`
- **THEN** FeedLabel MUST 顯示 CalendarCheckIcon 且文案為 `{user.name} 在 {practice.title} 打卡`

#### Scenario: reaction 觸發的 FeedLabel
- **WHEN** feed item 的 `feed_reason` 為 `cheered`
- **THEN** FeedLabel MUST 顯示 ThumbsUp icon 且文案為 `{latestActorName} 表達了加油`（使用最新 reaction 的 actor name）

#### Scenario: feed_reason 缺失時的 fallback
- **WHEN** feed item 沒有 `feed_reason` 欄位
- **THEN** 系統 SHALL 不顯示 FeedLabel（graceful degradation，不 crash）

---

### Requirement: FeedItem TypeScript 型別包含 feed_reason
前端 `FeedItem` type（`packages/api/src/services/feed-hooks.ts`）SHALL 包含 `feed_reason` 欄位。

#### Scenario: TypeScript 型別對齊 API
- **WHEN** `useFeed` hook 收到 API 回應
- **THEN** 每個 `FeedItem` 的 `feed_reason` SHALL 可型別安全地存取，不使用 `any`

---

### Requirement: cheered item 包含 latestActorName 欄位
當 feed item 的 `feed_reason` 為 `cheered` 時，API response 中 SHALL 包含 `latestActorName` 欄位，值為最近一筆 reaction 的操作者名稱（來自 `reactions` 表 JOIN `users.nickname`）。

前端 `FeedItem` 的 `cheered` 相關型別 SHALL 包含 `latestActorName?: string | null`。

#### Scenario: cheered item 帶有 actor 名稱
- **WHEN** feed item 的 `feed_reason` 為 `cheered`
- **THEN** response 中 SHALL 包含 `latestActorName`，值為最新 reaction 的操作者 nickname
- **AND** FeedLabel 文案為 `{latestActorName} 表達了加油`

#### Scenario: actor 名稱為空時的 fallback
- **WHEN** `latestActorName` 為 `null` 或缺失
- **THEN** FeedLabel 文案 SHALL fallback 為「有人表達了加油」

## MODIFIED Requirements

### Requirement: showcase-feed 使用統一 endpoint
**（修改既有 showcase feed 行為）**

原先 showcase feed 呼叫 `/api/v1/users/practices`，只回傳 `IShowcasePractice[]`。

修改後：`useShowcaseFeed` 的呼叫點 SHALL 被替換為 `useFeed`，呼叫 `/api/v1/feed`，回傳 `FeedItem[]`（混合 practice + checkin）。

#### Scenario: 舊 hook 不再被靈感頁面使用
- **WHEN** 靈感頁面（`(with-layout)/page.tsx`）完成遷移
- **THEN** 該頁面 SHALL 不 import `useShowcaseFeed`

#### Scenario: 無限滾動仍正常運作
- **WHEN** 用戶滾動到底部觸發 load more
- **THEN** 系統 MUST 呼叫 `/api/v1/feed` 帶正確的 cursor 參數取得下一頁

---

### Requirement: new_release 群組 FeedLabel
同一頁中，連續出現的 `feed_reason: "new_release"` items SHALL 共用一個 FeedLabel，只在第一個 item 上方顯示「最新發布」，其餘相鄰的 new_release items 省略 FeedLabel。

#### Scenario: 多個醞釀中實踐連續出現
- **WHEN** 連續兩個以上 feed items 的 `feed_reason` 均為 `new_release`
- **THEN** 只有第一個 item 上方顯示 FeedLabel，其餘不顯示
