# Tasks: inspiration-feed-display-enhancement

## 1. AI Backend — 新增 feed_reason 欄位

- [x] 1.1 `[daodao-ai-backend]` 在 `src/schemas/feed.py` 新增 `FeedReasonType` enum（`new_practice` / `new_release` / `checked_in` / `cheered`）
  - AC: enum 值與 proposal 定義一致，可被 feed_service import

- [x] 1.2 `[daodao-ai-backend]` 修改 `src/services/feed/feed_service.py`，在組裝 feed item 時注入 `feed_reason`
  - practice item：`is_brewing=True` → `new_release`，否則 → `new_practice`
  - checkin item：固定 `checked_in`
  - reaction 觸發的 item：固定 `cheered`
  - AC: `/api/v1/feed` 回傳的每個 item 都有 `feed_reason` 欄位

- [x] 1.3 `[daodao-ai-backend]` 更新 `tests/routers/test_feed.py`，驗證回傳的 item 包含正確的 `feed_reason`
  - AC: 新增 practice（is_brewing=False）、practice（is_brewing=True）、checkin 各一個測試 case

- [x] 1.4 （依賴 1.2）`[daodao-ai-backend]` 在 `src/services/feed/feed_service.py` 的 UNION SQL 新增 cheered subquery：從 `reactions` 表 JOIN `practices`/`practice_checkins`，以 `MAX(r.created_at)` 為 `sort_time`，分別處理 practice 和 checkin 兩種 target_type；去重確保同一 item 不因多人 reaction 重複出現
  - AC: 對有 reaction 的 practice/checkin，API 回傳含 `feed_reason: "cheered"` 的 item，且同一 item 只出現一次；cheered item 的 response 中包含 `latest_actor_name` 欄位（最新 reaction 的操作者 nickname）

## 2. 前端型別 — 更新 FeedItem 型別

- [x] 2.1 `[daodao-f2e]` 在 `packages/api/src/services/feed-hooks.ts` 的 `FeedItem` union type 加入 `feed_reason: FeedReasonType` 欄位
  - AC: `FeedItem` 包含 `feed_reason`，TypeScript 不用 `any`，`pnpm typecheck` 通過

- [x] 2.2 `[daodao-f2e]` 在 `packages/api/src/ai-types.ts` 或相關型別定義中同步更新 `/api/v1/feed` 的 response schema，加入 `feed_reason`
  - AC: `pnpm typecheck` 通過

## 3. 前端頁面 — 靈感頁面切換 hook

- [x] 3.1 `[daodao-f2e]` 在 `apps/product/src/app/[locale]/(with-layout)/page.tsx` 將 `useShowcaseFeed` 替換為 `useFeed`（`packages/api/src/services/feed-hooks.ts`）
  - AC: 不再 import `useShowcaseFeed`，改用 `useFeed`，頁面正常載入

- [x] 3.2 （依賴 3.1）`[daodao-f2e]` 移除靈感頁面中 hardcoded 的 mock 打卡卡片（含 `mockCheckinReactions` mock 資料）
  - AC: 頁面不再包含任何 hardcoded mock 卡片，所有資料來自 `useFeed`

## 4. 前端頁面 — 混合卡片渲染與 FeedLabel 動態化

- [x] 4.1 `[daodao-f2e]` 確認 `CheckInShowcaseCard` 元件已在 `apps/product` 可正常 import，若缺少需從 showcase-preview 移入 `components/showcase/`
  - AC: `CheckInShowcaseCard` 可被靈感頁面 import，`pnpm typecheck` 通過

- [x] 4.1.1 `[daodao-f2e]` 確認或實作 CheckInShowcaseCard 視覺結構符合 FRD-2.1：封面區 240px（有圖片 object-fit:cover；無圖片渲染 CheckInCard 筆記本預覽 pointer-events:none）、封面底部 transparent→logo-cyan 漸層遮罩、頭像 64x64 + 心情 emoji badge 疊右下角、打卡日期 text-light-gray、內容摘要最多 2 行截斷、留言預覽最多 2 則（頭像 24x24、名稱加粗、內容單行截斷）
  - AC: 視覺呈現符合 FRD-2.1 規格；`pnpm typecheck` 通過

- [x] 4.2 `[daodao-f2e]` 更新靈感頁面渲染邏輯，根據 `FeedItem.type` 決定渲染 `PracticeShowcaseCard`（含 `BrewingCard`）或 `CheckInShowcaseCard`
  - AC: feed 中出現 `type=checkin` 的 item 時，正確渲染 `CheckInShowcaseCard`

- [x] 4.3 `[daodao-f2e]` 更新靈感頁面 `FeedLabel` 渲染邏輯，根據 `feed_reason` 動態顯示 icon 與文案
  - `new_practice` → ThumbsUp + `{user.name} 發布了新實踐`
  - `new_release` → Rss + `最新發布`
  - `checked_in` → CalendarCheckIcon + `{user.name} 在 {practice.title} 打卡`
  - `cheered` → ThumbsUp + `{latestActorName} 表達了加油`
  - 無 `feed_reason` 時不顯示 FeedLabel（不 crash）
  - AC: 四種 FeedLabel 在頁面上均正確顯示

- [x] 4.4 `[daodao-f2e]` 實作 new_release 群組 FeedLabel：渲染靈感頁面 feed list 時，偵測連續 `feed_reason: "new_release"` items，只在第一個上方顯示 FeedLabel，其餘省略
  - AC: 連續兩個以上 new_release items 只顯示一個「最新發布」FeedLabel

## 5. AI Backend — Feed 組成演算法（Slot Pattern）

- [x] 5.1 `[daodao-ai-backend]` 在 `src/schemas/feed.py` 新增 `SlotType` enum（`A` / `B` / `C`）並在 `FeedItem` schema 加入 `slot_type` 欄位
  - AC: 每個 feed item 含 `slot_type` 欄位，值為 `A`、`B` 或 `C`

- [x] 5.2 `[daodao-ai-backend]` 在 `src/services/feed/feed_service.py` 實作 Slot Pattern 組裝邏輯（A→B→C→C→C 循環），每次分頁回傳一個完整循環單位（5～6 格）
  - AC: API 回傳的 items 順序符合 A→B→C→C→C；每頁為完整循環單位，不截斷

- [x] 5.3 `[daodao-ai-backend]` 實作 Slot A 打卡則數判斷邏輯：查詢打卡候選池時帶入 `reactions_count` 與 `comments_count`；依條件決定放 1 則或 2 則，且 2 則時確保 userId 不重複
  - 熱門打卡（reactions ≥ 1 或 comments ≥ 1）→ 1 則
  - 冷啟動（兩則均無 reaction/comment）且 userId 不同 → 2 則
  - 候選池 < 2 → 1 則（降級）；候選池為空 → 跳過
  - AC: 各條件分支均有對應 test case，行為符合 FRD-1.2

- [x] 5.4 `[daodao-ai-backend]` 更新 `tests/routers/test_feed.py`，新增 Slot Pattern 與打卡則數判斷的 test cases
  - AC: 測試涵蓋熱門打卡/冷啟動/候選池不足/空候選池四種情境，以及循環排列順序驗證

## 6. AI Backend — ActivityCard 資料

- [x] 6.1 `[daodao-ai-backend]` 在 `src/schemas/feed.py` 新增 `ActivityCardItem` schema（含 `item_type: "activity"`、`activity_type: "community_event" | "follow_summary"`、`event_text`、`label`）
  - AC: schema 可被 feed_service import

- [x] 6.2 `[daodao-ai-backend]` 實作 Slot B ActivityCard 資料邏輯：MVP 階段以社群熱門事件（`community_event`）補位，查詢最近 reactions/new_practices 等社群事件，組裝成 `ActivityCardItem`
  - AC: Slot B 位置回傳 `item_type: "activity"` 的 item，含 `event_text` 與 `label: "學習動態"`

- [x] 6.3 `[daodao-ai-backend]` 更新 `tests/routers/test_feed.py`，驗證 Slot B 包含正確 ActivityCard 資料
  - AC: test case 驗證 Slot B item 的 `item_type`、`event_text`、`label` 欄位

## 7. 前端 — ActivityCard 元件與渲染

- [x] 7.1 `[daodao-f2e]` 在 `packages/api/src/ai-types.ts` 新增 `ActivityCardItem` 型別（對應 backend schema）
  - AC: `pnpm typecheck` 通過

- [x] 7.2 `[daodao-f2e]` 實作 `ActivityCard` 元件（`components/showcase/ActivityCard.tsx`），顯示類型標籤（「學習動態」）與事件文字
  - AC: `ActivityCard` 可被靈感頁面 import，視覺上有類型標籤

- [x] 7.3 `[daodao-f2e]` 更新靈感頁面渲染邏輯，對 `item_type === "activity"` 的 item 渲染 `ActivityCard`
  - AC: Feed 中 Slot B 位置正確顯示 ActivityCard

## 8. 前端 — CheckInShowcaseCard 批次 Reaction

- [x] 8.1 `[daodao-f2e]` 確認或實作 `useReactionsBatch` hook（`packages/api/src/services/`），接受 `targetIds` 陣列，回傳 map by `targetId` 的 reaction summary
  - AC: hook 存在且可被靈感頁面使用，`pnpm typecheck` 通過

- [x] 8.2 `[daodao-f2e]` 在靈感頁面 Feed 載入後，收集所有 `type=checkin` 的 item IDs，呼叫 `useReactionsBatch` 一次取得所有 Reaction 資料
  - AC: 整頁 Feed 只發出 1 次 batch 請求（不因打卡數量增加而增加請求數）

- [x] 8.3 `[daodao-f2e]` 將 `batchReactionData` prop 傳入每張 `CheckInShowcaseCard`，卡片使用 prop 資料而非自行發請求
  - AC: CheckInShowcaseCard 不包含獨立的 Reaction 查詢邏輯

## 9. 前端 — 打卡詳情頁 Reactions + Comments

- [x] 9.1 `[daodao-f2e]` 在打卡詳情頁（`/practices/{practiceId}/check-ins/{checkInId}`）加入 4 種快速回應按鈕（加油/啟發/共嗚/好奇），使用 `upsertReaction` / `removeReaction`（`targetType: 'checkin'`）
  - AC: 點擊反應後計數即時更新；每用戶只能選一種；再次點擊取消

- [x] 9.2 `[daodao-f2e]` 實作點擊反應後的 UX 流程：計數更新 → 留言框自動聚焦 → Placeholder 動態替換為對應引導文字
  - AC: 四種反應各有對應 Placeholder，切換時無殘留

- [x] 9.3 `[daodao-f2e]` 在打卡詳情頁加入二層留言系統（`targetType: 'checkin'`），支援 @ 標記自動帶出用戶清單
  - AC: 留言最多二層；@ 輸入後帶出清單；本人留言可編輯/刪除；他人留言可回覆

- [x] 9.4 `[daodao-f2e]` 透過 `bottomActions` prop 模式將互動列注入 CheckInCard，確保卡片本體不含硬編碼互動邏輯
  - AC: CheckInCard 在詳情頁與展示卡片場景均透過 `bottomActions` prop 接收互動列

## 10. 前端 — 瀏覽活動（Browse Activity）

- [x] 10.1 `[daodao-f2e]` 實作三點選單（展示卡片 vs 詳情頁行為不同）：
  - CheckInShowcaseCard 展示卡片：本人打卡**不顯示三點選單**；他人打卡只顯示「檢舉」
  - 打卡詳情頁：本人打卡顯示「編輯打卡」/「分享打卡」/「瀏覽活動」；他人打卡顯示「檢舉」/「瀏覽活動」
  - AC: 展示卡片本人無三點選單；展示卡片他人只有「檢舉」；詳情頁選單依身份正確顯示

- [x] 10.2 `[daodao-f2e]` 實作 `BrowseActivityContent` Bottom Sheet，使用 `useReactionsList(targetType: 'checkin', targetId)` 顯示反應列表（頭像 32x32、名稱、反應 emoji、相對時間，依 reactedAt 倒序）
  - AC: Bottom Sheet 開啟正常；列表依時間倒序；空狀態顯示正確文案

- [ ] 10.3 `[daodao-f2e]` 套用隱私規則：BrowseActivityContent 僅顯示公開用戶與已連結者（Connection）的反應
  - AC: 非公開且非 Connection 的用戶反應不出現在列表中

## 11. 整合驗收

- [x] 11.1 `[daodao-f2e]` 執行 `pnpm lint` 和 `pnpm typecheck` 確認無 error
  - AC: 兩個指令均通過（product app typecheck 通過；@daodao/shared vitest 錯誤為既有問題）

- [ ] 11.2 `[daodao-ai-backend]` 執行 feed 相關測試確認全數通過
  - AC: `pytest tests/routers/test_feed.py` 全數 pass，包含 cheered item、Slot Pattern、打卡則數判斷、ActivityCard 的 test cases

- [ ] 11.3 手動驗收：開啟靈感頁面確認
  - Feed 節奏符合 A→B→C→C→C（打卡 → 互動動態 → 實踐 × 3）
  - 打卡卡片正常出現（非 mock），熱門打卡 Slot A 只顯示 1 則
  - ActivityCard（Slot B）正確顯示學習動態標籤與事件文字
  - 每張打卡卡片上方有正確的 FeedLabel（加油/打卡/最新發布）
  - 無限滾動正常運作，每頁載入完整循環單位
  - `cheered` 卡片的 FeedLabel 正確顯示 actor 名稱
  - 連續 `new_release` items 只顯示一次「最新發布」FeedLabel
  - 整頁 Feed 只發出 1 次 batch Reaction 請求
  - 打卡詳情頁 4 種反應正常運作，留言框聚焦與 Placeholder 正確
  - 瀏覽活動 Bottom Sheet 正確開啟並顯示反應列表
  - AC: 以上各項均通過
