# codex advisor artifact

- Provider: codex
- Exit code: 0
- Created at: 2026-05-02T04:14:35.756Z

## Original task

workspace: /Users/xiaoxu/Projects/daodao

請驗證 Wave 1 實作是否符合規劃。

規格來源：openspec/changes/inspiration-feed-display-enhancement/tasks.md（只看 1.x、2.x、3.x、4.x、5.x 的 AC 條件）

驗證項目：
1. daodao-ai-backend/src/schemas/feed.py — FeedReasonType 4 個值、SlotType 3 個值
2. daodao-ai-backend/src/services/feed/feed_service.py — feed_reason 注入邏輯、Slot A/C 組裝循環、打卡則數判斷
3. daodao-ai-backend/tests/routers/test_feed.py — 是否驗證 feed_reason 欄位
4. daodao-f2e/packages/api/src/services/feed-hooks.ts — FeedItem 有 feed_reason 欄位
5. daodao-f2e/packages/api/src/ai-types.ts — feed_reason 型別定義
6. daodao-f2e/apps/product/src/app/[locale]/(with-layout)/page.tsx — 用 useFeed、無 mock、CheckInShowcaseCard/PracticeShowcaseCard 根據 type 渲染、FeedLabel feed_reason routing、new_release 群組邏輯

對每個項目回報：✅ 符合 / ❌ 不符合 / ⚠️ 部分符合，並說明原因。

## Final prompt

workspace: /Users/xiaoxu/Projects/daodao

請驗證 Wave 1 實作是否符合規劃。

規格來源：openspec/changes/inspiration-feed-display-enhancement/tasks.md（只看 1.x、2.x、3.x、4.x、5.x 的 AC 條件）

驗證項目：
1. daodao-ai-backend/src/schemas/feed.py — FeedReasonType 4 個值、SlotType 3 個值
2. daodao-ai-backend/src/services/feed/feed_service.py — feed_reason 注入邏輯、Slot A/C 組裝循環、打卡則數判斷
3. daodao-ai-backend/tests/routers/test_feed.py — 是否驗證 feed_reason 欄位
4. daodao-f2e/packages/api/src/services/feed-hooks.ts — FeedItem 有 feed_reason 欄位
5. daodao-f2e/packages/api/src/ai-types.ts — feed_reason 型別定義
6. daodao-f2e/apps/product/src/app/[locale]/(with-layout)/page.tsx — 用 useFeed、無 mock、CheckInShowcaseCard/PracticeShowcaseCard 根據 type 渲染、FeedLabel feed_reason routing、new_release 群組邏輯

對每個項目回報：✅ 符合 / ❌ 不符合 / ⚠️ 部分符合，並說明原因。

## Raw output

```text
1. `daodao-ai-backend/src/schemas/feed.py`：✅ 符合。`FeedReasonType` 有 `new_practice` / `new_release` / `checked_in` / `cheered` 4 個值，[feed.py](/Users/xiaoxu/Projects/daodao/daodao-ai-backend/src/schemas/feed.py:9)。`SlotType` 有 `A` / `B` / `C` 3 個值，[feed.py](/Users/xiaoxu/Projects/daodao/daodao-ai-backend/src/schemas/feed.py:16)。

2. `daodao-ai-backend/src/services/feed/feed_service.py`：⚠️ 部分符合。`feed_reason` 已對 practice/checkin 注入，`is_brewing=True -> new_release`、否則 `new_practice`，checkin 固定 `checked_in`，[feed_service.py](/Users/xiaoxu/Projects/daodao/daodao-ai-backend/src/services/feed/feed_service.py:115)；Slot A 打卡則數判斷也有做，熱門打卡回 1 則、冷啟動且不同 user 可回 2 則，[feed_service.py](/Users/xiaoxu/Projects/daodao/daodao-ai-backend/src/services/feed/feed_service.py:407)。但 `cheered` 完全沒實作，沒有 reaction-based subquery，也沒有任何地方產生 `feed_reason="cheered"`。另外 Slot Pattern 實作明寫 `Slot B skipped for MVP`，[feed_service.py](/Users/xiaoxu/Projects/daodao/daodao-ai-backend/src/services/feed/feed_service.py:71)、[feed_service.py](/Users/xiaoxu/Projects/daodao/daodao-ai-backend/src/services/feed/feed_service.py:438)，所以實際是 A + C + C + C，不符合規劃的 A→B→C→C→C，也無法達到每頁完整 5～6 格循環。

3. `daodao-ai-backend/tests/routers/test_feed.py`：✅ 符合。已有 3 個 feed_reason 驗證 case，分別驗證 `new_practice`、`new_release`、`checked_in`，[test_feed.py](/Users/xiaoxu/Projects/daodao/daodao-ai-backend/tests/routers/test_feed.py:180)。但如果看 Wave 1 全部 AC，這份檔案仍缺 `cheered` 與 Slot Pattern/打卡則數判斷的測試。

4. `daodao-f2e/packages/api/src/services/feed-hooks.ts`：⚠️ 部分符合。`FeedItem` union 確實有 `feed_reason` 欄位，[feed-hooks.ts](/Users/xiaoxu/Projects/daodao/daodao-f2e/packages/api/src/services/feed-hooks.ts:52)。但它被定義成可選 `feed_reason?`，規劃 AC 2.1 要的是必填 `feed_reason: FeedReasonType`。

5. `daodao-f2e/packages/api/src/ai-types.ts`：⚠️ 部分符合。檔案內有 `FeedReasonType` enum 型別，[ai-types.ts](/Users/xiaoxu/Projects/daodao/daodao-f2e/packages/api/src/ai-types.ts:195)。但 `/api/v1/feed` 的 response 仍然只是 `components["schemas"]["APIResponse"]`，其中 `data` 是 `unknown`，[ai-types.ts](/Users/xiaoxu/Projects/daodao/daodao-f2e/packages/api/src/ai-types.ts:199)、[ai-types.ts](/Users/xiaoxu/Projects/daodao/daodao-f2e/packages/api/src/ai-types.ts:353)，沒有把 `feed_reason` 真正掛進 feed response schema，未完全符合 2.2。

6. `daodao-f2e/apps/product/src/app/[locale]/(with-layout)/page.tsx`：⚠️ 部分符合。已改用 `useFeed`、沒有 `useShowcaseFeed`，[page.tsx](/Users/xiaoxu/Projects/daodao/daodao-f2e/apps/product/src/app/[locale]/(with-layout)/page.tsx:91)；頁面也看不到 hardcoded mock checkin card；並且依 `feedItem.type` 分流渲染 `CheckInShowcaseCard` / `BrewingCard` / `PracticeShowcaseCard`，[page.tsx](/Users/xiaoxu/Projects/daodao/daodao-f2e/apps/product/src/app/[locale]/(with-layout)/page.tsx:245)；`new_release` 連續群組只顯示第一個 label 的邏輯也有，[page.tsx](/Users/xiaoxu/Projects/daodao/daodao-f2e/apps/product/src/app/[locale]/(with-layout)/page.tsx:246)。但 `FeedLabel` 的 `cheered` routing 不完整：checkin 分支傳給 `FeedLabel` 的只有 `userName` 和 `practiceTitle`，[page.tsx](/Users/xiaoxu/Projects/daodao/daodao-f2e/apps/product/src/app/[locale]/(with-layout)/page.tsx:255)，沒有 `latestActorName`；practice 分支則是從 `practice.reactions` 內硬找 actor name，[page.tsx](/Users/xiaoxu/Projects/daodao/daodao-f2e/apps/product/src/app/[locale]/(with-layout)/page.tsx:281)，這跟規劃中 cheered item 應由 feed response 明確提供 actor 資訊不一致。

補充：我有嘗試跑 `pytest daodao-ai-backend/tests/routers/test_feed.py`，但本機環境缺 `fastapi`，測試在 collect 階段就失敗，這次結論主要基於程式碼比對。


OpenAI Codex v0.121.0 (research preview)
--------
workdir: /Users/xiaoxu/Projects/daodao
model: gpt-5.4
provider: openai
approval: never
sandbox: danger-full-access
reasoning effort: medium
reasoning summaries: none
session id: 019de6e3-457a-7f61-af2a-a768797868ed
--------
user
workspace: /Users/xiaoxu/Projects/daodao

請驗證 Wave 1 實作是否符合規劃。

規格來源：openspec/changes/inspiration-feed-display-enhancement/tasks.md（只看 1.x、2.x、3.x、4.x、5.x 的 AC 條件）

驗證項目：
1. daodao-ai-backend/src/schemas/feed.py — FeedReasonType 4 個值、SlotType 3 個值
2. daodao-ai-backend/src/services/feed/feed_service.py — feed_reason 注入邏輯、Slot A/C 組裝循環、打卡則數判斷
3. daodao-ai-backend/tests/routers/test_feed.py — 是否驗證 feed_reason 欄位
4. daodao-f2e/packages/api/src/services/feed-hooks.ts — FeedItem 有 feed_reason 欄位
5. daodao-f2e/packages/api/src/ai-types.ts — feed_reason 型別定義
6. daodao-f2e/apps/product/src/app/[locale]/(with-layout)/page.tsx — 用 useFeed、無 mock、CheckInShowcaseCard/PracticeShowcaseCard 根據 type 渲染、FeedLabel feed_reason routing、new_release 群組邏輯

對每個項目回報：✅ 符合 / ❌ 不符合 / ⚠️ 部分符合，並說明原因。
codex
我會先用 `openspec-verify-change` 的流程讀規格與相關檔案，對照你列的 6 個驗證點，只針對 `tasks.md` 的 `1.x` 到 `5.x` AC 做核對。
exec
/bin/zsh -lc "sed -n '1,220p' /Users/xiaoxu/.codex/skills/openspec-verify-change/SKILL.md" in /Users/xiaoxu/Projects/daodao
exec
/bin/zsh -lc "sed -n '1,260p' openspec/changes/inspiration-feed-display-enhancement/tasks.md" in /Users/xiaoxu/Projects/daodao
 exited 1 in 0ms:
sed: /Users/xiaoxu/.codex/skills/openspec-verify-change/SKILL.md: No such file or directory

 succeeded in 0ms:
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

- [ ] 1.4 （依賴 1.2）`[daodao-ai-backend]` 在 `src/services/feed/feed_service.py` 的 UNION SQL 新增 cheered subquery：從 `reactions` 表 JOIN `practices`/`practice_checkins`，以 `MAX(r.created_at)` 為 `sort_time`，分別處理 practice 和 checkin 兩種 target_type；去重確保同一 item 不因多人 reaction 重複出現
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

- [ ] 5.4 `[daodao-ai-backend]` 更新 `tests/routers/test_feed.py`，新增 Slot Pattern 與打卡則數判斷的 test cases
  - AC: 測試涵蓋熱門打卡/冷啟動/候選池不足/空候選池四種情境，以及循環排列順序驗證

## 6. AI Backend — ActivityCard 資料

- [ ] 6.1 `[daodao-ai-backend]` 在 `src/schemas/feed.py` 新增 `ActivityCardItem` schema（含 `item_type: "activity"`、`activity_type: "community_event" | "follow_summary"`、`event_text`、`label`）
  - AC: schema 可被 feed_service import

- [ ] 6.2 `[daodao-ai-backend]` 實作 Slot B ActivityCard 資料邏輯：MVP 階段以社群熱門事件（`community_event`）補位，查詢最近 reactions/new_practices 等社群事件，組裝成 `ActivityCardItem`
  - AC: Slot B 位置回傳 `item_type: "activity"` 的 item，含 `event_text` 與 `label: "學習動態"`

- [ ] 6.3 `[daodao-ai-backend]` 更新 `tests/routers/test_feed.py`，驗證 Slot B 包含正確 ActivityCard 資料
  - AC: test case 驗證 Slot B item 的 `item_type`、`event_text`、`label` 欄位

## 7. 前端 — ActivityCard 元件與渲染

- [ ] 7.1 `[daodao-f2e]` 在 `packages/api/src/ai-types.ts` 新增 `ActivityCardItem` 型別（對應 backend schema）
  - AC: `pnpm typecheck` 通過

- [ ] 7.2 `[daodao-f2e]` 實作 `ActivityCard` 元件（`components/showcase/ActivityCard.tsx`），顯示類型標籤（「學習動態」）與事件文字
  - AC: `ActivityCard` 可被靈感頁面 import，視覺上有類型標籤

- [ ] 7.3 `[daodao-f2e]` 更新靈感頁面渲染邏輯，對 `item_type === "activity"` 的 item 渲染 `ActivityCard`
  - AC: Feed 中 Slot B 位置正確顯示 ActivityCard

## 8. 前端 — CheckInShowcaseCard 批次 Reaction

- [ ] 8.1 `[daodao-f2e]` 確認或實作 `useReactionsBatch` hook（`packages/api/src/services/`），接受 `targetIds` 陣列，回傳 map by `targetId` 的 reaction summary
  - AC: hook 存在且可被靈感頁面使用，`pnpm typecheck` 通過

- [ ] 8.2 `[daodao-f2e]` 在靈感頁面 Feed 載入後，收集所有 `type=checkin` 的 item IDs，呼叫 `useReactionsBatch` 一次取得所有 Reaction 資料
  - AC: 整頁 Feed 只發出 1 次 batch 請求（不因打卡數量增加而增加請求數）

- [ ] 8.3 `[daodao-f2e]` 將 `batchReactionData` prop 傳入每張 `CheckInShowcaseCard`，卡片使用 prop 資料而非自行發請求
  - AC: CheckInShowcaseCard 不包含獨立的 Reaction 查詢邏輯

## 9. 前端 — 打卡詳情頁 Reactions + Comments

- [ ] 9.1 `[daodao-f2e]` 在打卡詳情頁（`/practices/{practiceId}/check-ins/{checkInId}`）加入 4 種快速回應按鈕（加油/啟發/共嗚/好奇），使用 `upsertReaction` / `removeReaction`（`targetType: 'checkin'`）
  - AC: 點擊反應後計數即時更新；每用戶只能選一種；再次點擊取消

- [ ] 9.2 `[daodao-f2e]` 實作點擊反應後的 UX 流程：計數更新 → 留言框自動聚焦 → Placeholder 動態替換為對應引導文字
  - AC: 四種反應各有對應 Placeholder，切換時無殘留

- [ ] 9.3 `[daodao-f2e]` 在打卡詳情頁加入二層留言系統（`targetType: 'checkin'`），支援 @ 標記自動帶出用戶清單
  - AC: 留言最多二層；@ 輸入後帶出清單；本人留言可編輯/刪除；他人留言可回覆

- [ ] 9.4 `[daodao-f2e]` 透過 `bottomActions` prop 模式將互動列注入 CheckInCard，確保卡片本體不含硬編碼互動邏輯
  - AC: CheckInCard 在詳情頁與展示卡片場景均透過 `bottomActions` prop 接收互動列

## 10. 前端 — 瀏覽活動（Browse Activity）

- [ ] 10.1 `[daodao-f2e]` 實作三點選單（展示卡片 vs 詳情頁行為不同）：
  - CheckInShowcaseCard 展示卡片：本人打卡**不顯示三點選單**；他人打卡只顯示「檢舉」
  - 打卡詳情頁：本人打卡顯示「編輯打卡」/「分享打卡」/「瀏覽活動」；他人打卡顯示「檢舉」/「瀏覽活動」
  - AC: 展示卡片本人無三點選單；展示卡片他人只有「檢舉」；詳情頁選單依身份正確顯示

- [ ] 10.2 `[daodao-f2e]` 實作 `BrowseActivityContent` Bottom Sheet，使用 `useReactionsList(targetType: 'checkin', targetId)` 顯示反應列表（頭像 32x32、名稱、反應 emoji、相對時間，依 reactedAt 倒序）
  - AC: Bottom Sheet 開啟正常；列表依時間倒序；空狀態顯示正確文案

- [ ] 10.3 `[daodao-f2e]` 套用隱私規則：BrowseActivityContent 僅顯示公開用戶與已連結者（Connection）的反應
  - AC: 非公開且非 Connection 的用戶反應不出現在列表中

## 11. 整合驗收

- [ ] 11.1 `[daodao-f2e]` 執行 `pnpm lint` 和 `pnpm typecheck` 確認無 error
  - AC: 兩個指令均通過

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

codex
規格已讀到。接著我會讀實作與測試，逐項比對 `1.x` 到 `5.x` 的 AC，特別看是否只是部分落地而不是完整符合。
exec
/bin/zsh -lc "sed -n '1,260p' daodao-ai-backend/src/schemas/feed.py" in /Users/xiaoxu/Projects/daodao
exec
/bin/zsh -lc "sed -n '1,220p' /Users/xiaoxu/Projects/daodao/.codex/skills/openspec-verify-change/SKILL.md" in /Users/xiaoxu/Projects/daodao
 succeeded in 0ms:
from enum import Enum


class FeedItemType(str, Enum):
    PRACTICE = "practice"
    CHECKIN = "checkin"


class FeedReasonType(str, Enum):
    new_practice = "new_practice"
    new_release = "new_release"
    checked_in = "checked_in"
    cheered = "cheered"


class SlotType(str, Enum):
    A = "A"
    B = "B"
    C = "C"


class FeedTypeFilter(str, Enum):
    ALL = "all"
    PRACTICE = "practice"
    CHECKIN = "checkin"


class FeedSortBy(str, Enum):
    NEWEST = "newest"
    RECOMMENDED = "recommended"

 succeeded in 0ms:
---
name: openspec-verify-change
description: Verify implementation matches change artifacts. Use when the user wants to validate that implementation is complete, correct, and coherent before archiving.
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: openspec
  version: "1.0"
  generatedBy: "1.3.0"
---

Verify that an implementation matches the change artifacts (specs, tasks, design).

**Input**: Optionally specify a change name. If omitted, check if it can be inferred from conversation context. If vague or ambiguous you MUST prompt for available changes.

**Steps**

1. **If no change name provided, prompt for selection**

   Run `openspec list --json` to get available changes. Use the **AskUserQuestion tool** to let the user select.

   Show changes that have implementation tasks (tasks artifact exists).
   Include the schema used for each change if available.
   Mark changes with incomplete tasks as "(In Progress)".

   **IMPORTANT**: Do NOT guess or auto-select a change. Always let the user choose.

2. **Check status to understand the schema**
   ```bash
   openspec status --change "<name>" --json
   ```
   Parse the JSON to understand:
   - `schemaName`: The workflow being used (e.g., "spec-driven")
   - Which artifacts exist for this change

3. **Get the change directory and load artifacts**

   ```bash
   openspec instructions apply --change "<name>" --json
   ```

   This returns the change directory and context files. Read all available artifacts from `contextFiles`.

4. **Initialize verification report structure**

   Create a report structure with three dimensions:
   - **Completeness**: Track tasks and spec coverage
   - **Correctness**: Track requirement implementation and scenario coverage
   - **Coherence**: Track design adherence and pattern consistency

   Each dimension can have CRITICAL, WARNING, or SUGGESTION issues.

5. **Verify Completeness**

   **Task Completion**:
   - If tasks.md exists in contextFiles, read it
   - Parse checkboxes: `- [ ]` (incomplete) vs `- [x]` (complete)
   - Count complete vs total tasks
   - If incomplete tasks exist:
     - Add CRITICAL issue for each incomplete task
     - Recommendation: "Complete task: <description>" or "Mark as done if already implemented"

   **Spec Coverage**:
   - If delta specs exist in `openspec/changes/<name>/specs/`:
     - Extract all requirements (marked with "### Requirement:")
     - For each requirement:
       - Search codebase for keywords related to the requirement
       - Assess if implementation likely exists
     - If requirements appear unimplemented:
       - Add CRITICAL issue: "Requirement not found: <requirement name>"
       - Recommendation: "Implement requirement X: <description>"

6. **Verify Correctness**

   **Requirement Implementation Mapping**:
   - For each requirement from delta specs:
     - Search codebase for implementation evidence
     - If found, note file paths and line ranges
     - Assess if implementation matches requirement intent
     - If divergence detected:
       - Add WARNING: "Implementation may diverge from spec: <details>"
       - Recommendation: "Review <file>:<lines> against requirement X"

   **Scenario Coverage**:
   - For each scenario in delta specs (marked with "#### Scenario:"):
     - Check if conditions are handled in code
     - Check if tests exist covering the scenario
     - If scenario appears uncovered:
       - Add WARNING: "Scenario not covered: <scenario name>"
       - Recommendation: "Add test or implementation for scenario: <description>"

7. **Verify Coherence**

   **Design Adherence**:
   - If design.md exists in contextFiles:
     - Extract key decisions (look for sections like "Decision:", "Approach:", "Architecture:")
     - Verify implementation follows those decisions
     - If contradiction detected:
       - Add WARNING: "Design decision not followed: <decision>"
       - Recommendation: "Update implementation or revise design.md to match reality"
   - If no design.md: Skip design adherence check, note "No design.md to verify against"

   **Code Pattern Consistency**:
   - Review new code for consistency with project patterns
   - Check file naming, directory structure, coding style
   - If significant deviations found:
     - Add SUGGESTION: "Code pattern deviation: <details>"
     - Recommendation: "Consider following project pattern: <example>"

8. **Generate Verification Report**

   **Summary Scorecard**:
   ```
   ## Verification Report: <change-name>

   ### Summary
   | Dimension    | Status           |
   |--------------|------------------|
   | Completeness | X/Y tasks, N reqs|
   | Correctness  | M/N reqs covered |
   | Coherence    | Followed/Issues  |
   ```

   **Issues by Priority**:

   1. **CRITICAL** (Must fix before archive):
      - Incomplete tasks
      - Missing requirement implementations
      - Each with specific, actionable recommendation

   2. **WARNING** (Should fix):
      - Spec/design divergences
      - Missing scenario coverage
      - Each with specific recommendation

   3. **SUGGESTION** (Nice to fix):
      - Pattern inconsistencies
      - Minor improvements
      - Each with specific recommendation

   **Final Assessment**:
   - If CRITICAL issues: "X critical issue(s) found. Fix before archiving."
   - If only warnings: "No critical issues. Y warning(s) to consider. Ready for archive (with noted improvements)."
   - If all clear: "All checks passed. Ready for archive."

**Verification Heuristics**

- **Completeness**: Focus on objective checklist items (checkboxes, requirements list)
- **Correctness**: Use keyword search, file path analysis, reasonable inference - don't require perfect certainty
- **Coherence**: Look for glaring inconsistencies, don't nitpick style
- **False Positives**: When uncertain, prefer SUGGESTION over WARNING, WARNING over CRITICAL
- **Actionability**: Every issue must have a specific recommendation with file/line references where applicable

**Graceful Degradation**

- If only tasks.md exists: verify task completion only, skip spec/design checks
- If tasks + specs exist: verify completeness and correctness, skip design
- If full artifacts: verify all three dimensions
- Always note which checks were skipped and why

**Output Format**

Use clear markdown with:
- Table for summary scorecard
- Grouped lists for issues (CRITICAL/WARNING/SUGGESTION)
- Code references in format: `file.ts:123`
- Specific, actionable recommendations
- No vague suggestions like "consider reviewing"

exec
/bin/zsh -lc "sed -n '1,360p' daodao-ai-backend/src/services/feed/feed_service.py" in /Users/xiaoxu/Projects/daodao
 succeeded in 0ms:
"""
Feed Service

統一 Feed 查詢：混合 practice + checkin，按時間排序。
沿用 routers/users.py 的 practice 查詢與 enrichment 模式。
"""

from typing import Optional

from sqlalchemy import bindparam, text
from sqlalchemy.orm import Session

from src.logger import AppLogger
from src.models.User import User
from src.schemas.feed import FeedReasonType, FeedSortBy, FeedTypeFilter, SlotType

logger = AppLogger(__name__).get_logger()


class FeedService:
    @staticmethod
    def get_feed(
        db: Session,
        current_user_external_id: Optional[str] = None,
        cursor: Optional[str] = None,
        limit: int = 20,
        keyword: Optional[str] = None,
        tags: Optional[list[str]] = None,
        type_filter: FeedTypeFilter = FeedTypeFilter.ALL,
        sort_by: FeedSortBy = FeedSortBy.NEWEST,
    ) -> dict:
        """
        統一 feed 查詢：混合 practice + checkin。

        type_filter=ALL → Slot Pattern (A→B→C→C→C 循環)
        type_filter=PRACTICE|CHECKIN → 單類型時序回傳

        current_user_external_id 用於 Router 層 per-user cache key。
        """
        user_id: int | None = None
        if current_user_external_id:
            _user = (
                db.query(User)
                .filter(User.external_id == current_user_external_id)
                .first()
            )
            user_id = _user.id if _user else None

        if type_filter == FeedTypeFilter.ALL:
            return FeedService._get_feed_slot_pattern(
                db, user_id, cursor, limit, keyword, tags
            )
        else:
            return FeedService._get_feed_single_type(
                db, user_id, cursor, limit, keyword, tags, type_filter
            )

    # =========================================================================
    # Slot Pattern Feed (type_filter=ALL)
    # =========================================================================

    @staticmethod
    def _get_feed_slot_pattern(
        db: Session,
        user_id: Optional[int],
        cursor: Optional[str],
        limit: int,
        keyword: Optional[str],
        tags: Optional[list[str]],
    ) -> dict:
        """Assemble feed in A→B→C→C→C slot cycles (Slot B skipped for MVP)."""
        p_cursor_time, p_cursor_id, c_cursor_time, c_cursor_id = (
            FeedService._parse_dual_cursor(cursor)
        )

        num_cycles = max(1, limit // 4)

        # Fetch +1 extra in each pool to detect has_next
        practice_rows = FeedService._fetch_practice_pool(
            db, p_cursor_time, p_cursor_id, num_cycles * 3 + 1, keyword, tags
        )
        checkin_rows = FeedService._fetch_checkin_pool_with_counts(
            db, c_cursor_time, c_cursor_id, num_cycles * 2 + 1, keyword, tags
        )

        slot_assignments, p_idx, c_idx = FeedService._assemble_slot_cycles(
            practice_rows, checkin_rows, num_cycles
        )

        if not slot_assignments:
            return {"data": [], "next_cursor": None}

        practice_ids = [
            s["item_id"] for s in slot_assignments if s["item_type"] == "practice"
        ]
        checkin_ids = [
            s["item_id"] for s in slot_assignments if s["item_type"] == "checkin"
        ]

        practices_map = FeedService._batch_fetch_practices(db, practice_ids)
        checkins_map = FeedService._batch_fetch_checkins(db, checkin_ids)
        reactions_map = FeedService._batch_fetch_reactions(
            db, {"practice": practice_ids, "checkin": checkin_ids}
        )
        comments_map = FeedService._batch_fetch_comments(
            db, {"practice": practice_ids, "checkin": checkin_ids}
        )

        items = []
        for slot in slot_assignments:
            item_type = slot["item_type"]
            item_id = slot["item_id"]
            slot_type = slot["slot_type"]

            if item_type == "practice" and item_id in practices_map:
                item = practices_map[item_id]
                item["reactions"] = reactions_map.get(("practice", item_id), [])
                comment_data = comments_map.get(("practice", item_id), {})
                item["comment_count"] = comment_data.get("count", 0)
                feed_reason = (
                    FeedReasonType.new_release
                    if item.get("is_brewing")
                    else FeedReasonType.new_practice
                )
                items.append(
                    {
                        "type": "practice",
                        "data": item,
                        "feed_reason": feed_reason,
                        "slot_type": slot_type,
                    }
                )

            elif item_type == "checkin" and item_id in checkins_map:
                item = checkins_map[item_id]
                item["reactions"] = reactions_map.get(("checkin", item_id), [])
                comment_data = comments_map.get(("checkin", item_id), {})
                item["comment_count"] = comment_data.get("count", 0)
                item["comment_preview"] = comment_data.get("preview", [])
                items.append(
                    {
                        "type": "checkin",
                        "data": item,
                        "feed_reason": FeedReasonType.checked_in,
                        "slot_type": slot_type,
                    }
                )

        has_next = len(practice_rows) > p_idx or len(checkin_rows) > c_idx
        next_cursor = None
        if has_next:
            p_last = ""
            if p_idx > 0:
                last_p = practice_rows[min(p_idx, len(practice_rows)) - 1]
                p_ts = last_p.sort_time.isoformat() if last_p.sort_time else ""
                p_last = f"{p_ts}_{last_p.item_id}"
            c_last = ""
            if c_idx > 0:
                last_c = checkin_rows[min(c_idx, len(checkin_rows)) - 1]
                c_ts = last_c.sort_time.isoformat() if last_c.sort_time else ""
                c_last = f"{c_ts}_{last_c.item_id}"
            next_cursor = f"{p_last}|{c_last}"

        logger.info(f"feed (slot): {len(items)} items, has_next={has_next}")
        return {"data": items, "next_cursor": next_cursor}

    # =========================================================================
    # Single-type Feed (type_filter=PRACTICE or CHECKIN)
    # =========================================================================

    @staticmethod
    def _get_feed_single_type(
        db: Session,
        user_id: Optional[int],
        cursor: Optional[str],
        limit: int,
        keyword: Optional[str],
        tags: Optional[list[str]],
        type_filter: FeedTypeFilter,
    ) -> dict:
        cursor_time, cursor_id = FeedService._parse_cursor_part(cursor or "")

        if type_filter == FeedTypeFilter.PRACTICE:
            rows = FeedService._fetch_practice_pool(
                db, cursor_time, cursor_id, limit + 1, keyword, tags
            )
            has_next = len(rows) > limit
            rows = rows[:limit]

            practice_ids = [r.item_id for r in rows]
            practices_map = FeedService._batch_fetch_practices(db, practice_ids)
            reactions_map = FeedService._batch_fetch_reactions(
                db, {"practice": practice_ids, "checkin": []}
            )
            comments_map = FeedService._batch_fetch_comments(
                db, {"practice": practice_ids, "checkin": []}
            )

            items = []
            for row in rows:
                if row.item_id in practices_map:
                    item = practices_map[row.item_id]
                    item["reactions"] = reactions_map.get(("practice", row.item_id), [])
                    comment_data = comments_map.get(("practice", row.item_id), {})
                    item["comment_count"] = comment_data.get("count", 0)
                    feed_reason = (
                        FeedReasonType.new_release
                        if item.get("is_brewing")
                        else FeedReasonType.new_practice
                    )
                    items.append(
                        {
                            "type": "practice",
                            "data": item,
                            "feed_reason": feed_reason,
                            "slot_type": SlotType.C,
                        }
                    )

        else:  # CHECKIN
            rows = FeedService._fetch_checkin_pool_with_counts(
                db, cursor_time, cursor_id, limit + 1, keyword, tags
            )
            has_next = len(rows) > limit
            rows = rows[:limit]

            checkin_ids = [r.item_id for r in rows]
            checkins_map = FeedService._batch_fetch_checkins(db, checkin_ids)
            reactions_map = FeedService._batch_fetch_reactions(
                db, {"practice": [], "checkin": checkin_ids}
            )
            comments_map = FeedService._batch_fetch_comments(
                db, {"practice": [], "checkin": checkin_ids}
            )

            items = []
            for row in rows:
                if row.item_id in checkins_map:
                    item = checkins_map[row.item_id]
                    item["reactions"] = reactions_map.get(("checkin", row.item_id), [])
                    comment_data = comments_map.get(("checkin", row.item_id), {})
                    item["comment_count"] = comment_data.get("count", 0)
                    item["comment_preview"] = comment_data.get("preview", [])
                    items.append(
                        {
                            "type": "checkin",
                            "data": item,
                            "feed_reason": FeedReasonType.checked_in,
                            "slot_type": SlotType.A,
                        }
                    )

        next_cursor = None
        if has_next and rows:
            last = rows[-1]
            ts = last.sort_time.isoformat() if last.sort_time else ""
            next_cursor = f"{ts}_{last.item_id}"

        logger.info(
            f"feed (single-type={type_filter.value}): {len(items)} items, has_next={has_next}"
        )
        return {"data": items, "next_cursor": next_cursor}

    # =========================================================================
    # Slot Pattern Helpers
    # =========================================================================

    @staticmethod
    def _parse_cursor_part(part: str) -> tuple[Optional[str], Optional[int]]:
        if not part:
            return None, None
        parts = part.rsplit("_", 1)
        if len(parts) == 2:
            try:
                return parts[0], int(parts[1])
            except ValueError:
                pass
        return None, None

    @staticmethod
    def _parse_dual_cursor(
        cursor: Optional[str],
    ) -> tuple[Optional[str], Optional[int], Optional[str], Optional[int]]:
        """Parse dual cursor format: '{practice_part}|{checkin_part}'."""
        if not cursor:
            return None, None, None, None
        if "|" in cursor:
            p_part, c_part = cursor.split("|", 1)
        else:
            p_part, c_part = cursor, ""
        p_time, p_id = FeedService._parse_cursor_part(p_part)
        c_time, c_id = FeedService._parse_cursor_part(c_part)
        return p_time, p_id, c_time, c_id

    @staticmethod
    def _fetch_practice_pool(
        db: Session,
        cursor_time: Optional[str],
        cursor_id: Optional[int],
        limit: int,
        keyword: Optional[str] = None,
        tags: Optional[list[str]] = None,
    ) -> list:
        where_clauses = [
            "p.privacy_status = 'public'",
            "p.status IN ('active', 'completed')",
            "p.deleted_at IS NULL",
        ]
        bind_params: dict = {"limit": limit}

        if cursor_time and cursor_id is not None:
            where_clauses.append(
                "(p.created_at < CAST(:p_cursor_time AS timestamptz)"
                " OR (p.created_at = CAST(:p_cursor_time AS timestamptz) AND p.id < :p_cursor_id))"
            )
            bind_params["p_cursor_time"] = cursor_time
            bind_params["p_cursor_id"] = cursor_id

        if keyword:
            escaped = (
                keyword.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
            )
            where_clauses.append(
                "(p.title ILIKE :keyword OR p.practice_action ILIKE :keyword)"
            )
            bind_params["keyword"] = f"%{escaped}%"

        if tags:
            where_clauses.append(
                "EXISTS (SELECT 1 FROM entity_tags et JOIN tags t ON t.id = et.tag_id"
                " WHERE et.entity_type = 'practice' AND et.entity_id = p.id AND t.name = ANY(:tags))"
            )
            bind_params["tags"] = tags

        where_sql = " AND ".join(where_clauses)
        sql = f"""
            SELECT p.id AS item_id, p.created_at AS sort_time
            FROM practices p
            WHERE {where_sql}
            ORDER BY p.created_at DESC, p.id DESC
            LIMIT :limit
        """
        return db.execute(text(sql), bind_params).fetchall()

    @staticmethod
    def _fetch_checkin_pool_with_counts(
        db: Session,
        cursor_time: Optional[str],
        cursor_id: Optional[int],
        limit: int,
        keyword: Optional[str] = None,
        tags: Optional[list[str]] = None,
    ) -> list:
        """Fetch checkins with reactions_count + comments_count for Slot A count logic."""
        where_clauses = [
            "p.privacy_status = 'public'",
            "p.status IN ('active', 'completed')",
            "p.deleted_at IS NULL",
        ]
        bind_params: dict = {"limit": limit}

exec
/bin/zsh -lc "sed -n '1,320p' daodao-ai-backend/tests/routers/test_feed.py" in /Users/xiaoxu/Projects/daodao
 succeeded in 0ms:
"""
Router-level tests for GET /api/v1/feed
"""

from unittest.mock import patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from unittest.mock import MagicMock

from src.dependencies import get_cache_client, get_current_user, get_db_session
from src.routers.feed import router

# ── minimal app wiring ────────────────────────────────────────


def _make_cache():
    cache = MagicMock()
    cache.client.get.return_value = None
    return cache


def _make_db():
    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = None
    return db


app = FastAPI()
app.include_router(router, prefix="/api")
app.dependency_overrides[get_db_session] = lambda: _make_db()
app.dependency_overrides[get_current_user] = lambda: "test-user-ext-id"
app.dependency_overrides[get_cache_client] = lambda: _make_cache()


@pytest.fixture
def client():
    yield TestClient(app)


# ── helpers ───────────────────────────────────────────────────

PRACTICE_ITEM = {
    "type": "practice",
    "feed_reason": "new_practice",
    "data": {
        "id": "ext-p-1",
        "title": "Morning Yoga",
        "status": "active",
        "privacy_status": "public",
        "is_brewing": False,
        "practice_action": "yoga",
        "start_date": "2025-01-01",
        "end_date": None,
        "frequency_min_days": 1,
        "frequency_max_days": 1,
        "session_duration_minutes": 30,
        "created_at": "2025-06-01T08:00:00",
        "user": {"id": "u1", "name": "Alice", "photo_url": None},
        "reactions": [],
        "comment_count": 0,
    },
}

BREWING_PRACTICE_ITEM = {
    "type": "practice",
    "feed_reason": "new_release",
    "data": {
        "id": "ext-p-2",
        "title": "Brewing Practice",
        "status": "active",
        "privacy_status": "delayed",
        "is_brewing": True,
        "practice_action": "brew",
        "start_date": "2025-01-01",
        "end_date": None,
        "frequency_min_days": 1,
        "frequency_max_days": 1,
        "session_duration_minutes": 30,
        "created_at": "2025-06-01T08:00:00",
        "user": {"id": "u1", "name": "Alice", "photo_url": None},
        "reactions": [],
        "comment_count": 0,
    },
}

CHECKIN_ITEM = {
    "type": "checkin",
    "feed_reason": "checked_in",
    "data": {
        "id": "101",
        "checkin_date": "2025-06-01",
        "mood": "happy",
        "note": "Felt great!",
        "tags": [],
        "image_urls": [],
        "created_at": "2025-06-01T09:00:00",
        "practice": {"id": "ext-p-1", "title": "Morning Yoga"},
        "user": {"id": "u1", "name": "Alice", "photo_url": None},
        "reactions": [],
        "comment_count": 0,
        "comment_preview": [],
    },
}

SERVICE_PATH = "src.routers.feed.FeedService.get_feed"


# ─────────────────────────────────────────────────────────────
# Tests
# ─────────────────────────────────────────────────────────────


class TestGetFeed:

    def test_returns_200_with_mixed_feed(self, client):
        """Mixed practice + checkin items are returned correctly."""
        mock_return = {
            "data": [PRACTICE_ITEM, CHECKIN_ITEM],
            "next_cursor": "2025-06-01T08:00:00_1",
        }
        with patch(SERVICE_PATH, return_value=mock_return):
            resp = client.get("/api/v1/feed")

        assert resp.status_code == 200
        body = resp.json()
        assert body["success"] is True
        assert len(body["data"]) == 2
        assert body["data"][0]["type"] == "practice"
        assert body["data"][1]["type"] == "checkin"
        assert body["pagination"]["hasNext"] is True
        assert body["pagination"]["count"] == 2

    def test_type_filter_checkin_only(self, client):
        """type=checkin query param is forwarded to FeedService."""
        mock_return = {"data": [CHECKIN_ITEM], "next_cursor": None}
        with patch(SERVICE_PATH, return_value=mock_return) as mock_svc:
            resp = client.get("/api/v1/feed?type=checkin")

        assert resp.status_code == 200
        _, kwargs = mock_svc.call_args
        assert kwargs["type_filter"].value == "checkin"

    def test_type_filter_practice_only(self, client):
        """type=practice query param is forwarded to FeedService."""
        mock_return = {"data": [PRACTICE_ITEM], "next_cursor": None}
        with patch(SERVICE_PATH, return_value=mock_return) as mock_svc:
            resp = client.get("/api/v1/feed?type=practice")

        assert resp.status_code == 200
        _, kwargs = mock_svc.call_args
        assert kwargs["type_filter"].value == "practice"

    def test_cursor_pagination(self, client):
        """cursor query param is forwarded to FeedService."""
        mock_return = {"data": [], "next_cursor": None}
        with patch(SERVICE_PATH, return_value=mock_return) as mock_svc:
            resp = client.get("/api/v1/feed?cursor=2025-06-01T08:00:00_1")

        assert resp.status_code == 200
        _, kwargs = mock_svc.call_args
        assert kwargs["cursor"] == "2025-06-01T08:00:00_1"
        body = resp.json()
        assert body["pagination"]["hasPrev"] is True

    def test_empty_feed(self, client):
        """Empty feed returns success with empty data list."""
        mock_return = {"data": [], "next_cursor": None}
        with patch(SERVICE_PATH, return_value=mock_return):
            resp = client.get("/api/v1/feed")

        assert resp.status_code == 200
        body = resp.json()
        assert body["success"] is True
        assert body["data"] == []
        assert body["pagination"]["hasNext"] is False
        assert body["pagination"]["count"] == 0

    def test_feed_reason_new_practice(self, client):
        """practice with is_brewing=False has feed_reason=new_practice."""
        mock_return = {"data": [PRACTICE_ITEM], "next_cursor": None}
        with patch(SERVICE_PATH, return_value=mock_return):
            resp = client.get("/api/v1/feed")

        assert resp.status_code == 200
        item = resp.json()["data"][0]
        assert item["type"] == "practice"
        assert item["data"]["is_brewing"] is False
        assert item["feed_reason"] == "new_practice"

    def test_feed_reason_new_release(self, client):
        """practice with is_brewing=True has feed_reason=new_release."""
        mock_return = {"data": [BREWING_PRACTICE_ITEM], "next_cursor": None}
        with patch(SERVICE_PATH, return_value=mock_return):
            resp = client.get("/api/v1/feed")

        assert resp.status_code == 200
        item = resp.json()["data"][0]
        assert item["type"] == "practice"
        assert item["data"]["is_brewing"] is True
        assert item["feed_reason"] == "new_release"

    def test_feed_reason_checked_in(self, client):
        """checkin item has feed_reason=checked_in."""
        mock_return = {"data": [CHECKIN_ITEM], "next_cursor": None}
        with patch(SERVICE_PATH, return_value=mock_return):
            resp = client.get("/api/v1/feed")

        assert resp.status_code == 200
        item = resp.json()["data"][0]
        assert item["type"] == "checkin"
        assert item["feed_reason"] == "checked_in"

codex
後端 schema、service、router test 已讀到一部分。現在補讀 `feed_service` 的 Slot Pattern 實作細節與前端檔案，確認是否真的符合 AC，而不是只有型別存在。
exec
/bin/zsh -lc "sed -n '1,260p' daodao-f2e/packages/api/src/services/feed-hooks.ts" in /Users/xiaoxu/Projects/daodao
exec
/bin/zsh -lc "sed -n '360,760p' daodao-ai-backend/src/services/feed/feed_service.py" in /Users/xiaoxu/Projects/daodao
 succeeded in 0ms:
"use client";

/**
 * Feed API Hooks
 * - 統一 Feed: AI backend GET /api/v1/feed (infinite scroll)
 * - 混合 practice + checkin 卡片
 */

import useSWRInfinite from "swr/infinite";
import type { IReactionCountItem, IShowcasePractice } from "./showcase-hooks";
import { fetchAiBackend } from "./showcase-hooks";

// ============================================================================
// Types
// ============================================================================

export type ApiMoodType = "give_up" | "frustrated" | "bored" | "neutral" | "good" | "happy";

export interface IShowcaseCheckIn {
  id: string;
  checkin_date: string;
  mood: ApiMoodType;
  note: string;
  tags: string[];
  image_urls: string[];
  created_at: string;
  practice: {
    id: string;
    title: string;
  };
  user?: {
    id: string;
    name: string;
    photo_url?: string | null;
  };
  reactions?: IReactionCountItem[];
  comment_count?: number;
  comment_preview?: {
    id: string;
    content: string;
    created_at: string;
    user?: {
      id: string;
      name: string;
      photo_url?: string | null;
    };
  }[];
}

export type FeedReasonType = "new_practice" | "new_release" | "checked_in" | "cheered";

export type FeedItem =
  | { type: "practice"; data: IShowcasePractice; feed_reason?: FeedReasonType }
  | { type: "checkin"; data: IShowcaseCheckIn; feed_reason?: FeedReasonType };

export interface IFeedParams {
  keyword?: string;
  tags?: string[];
  type?: "all" | "practice" | "checkin";
}

// ============================================================================
// AI backend response shape
// ============================================================================

interface AIFeedResponse {
  success: boolean;
  data?: FeedItem[];
  pagination?: {
    cursors?: { start?: string | null; end?: string | null } | null;
    hasNext: boolean | null;
    hasPrev: boolean | null;
    count: number | null;
  } | null;
}

// ============================================================================
// Hook
// ============================================================================

export function useFeed(params: IFeedParams) {
  const getKey = (pageIndex: number, previousPageData: AIFeedResponse | null) => {
    if (previousPageData && !previousPageData.pagination?.hasNext) return null;

    const searchParams = new URLSearchParams();
    if (params.keyword) searchParams.set("keyword", params.keyword);
    if (params.tags?.length) {
      for (const tag of params.tags) searchParams.append("tags", tag);
    }
    if (params.type && params.type !== "all") {
      searchParams.set("type", params.type);
    }
    if (pageIndex > 0 && previousPageData?.pagination?.cursors?.end) {
      searchParams.set("cursor", previousPageData.pagination.cursors.end);
    }

    const qs = searchParams.toString();
    return `/api/v1/feed${qs ? `?${qs}` : ""}`;
  };

  const { data, error, size, setSize, isLoading, isValidating } = useSWRInfinite<AIFeedResponse>(
    getKey,
    (path: string) => fetchAiBackend<AIFeedResponse>(path),
    { revalidateFirstPage: false }
  );

  const feedItems: FeedItem[] = data
    ? data.flatMap((page) =>
        (page.data ?? []).filter((item) => {
          const isValid = !!(item?.type && item?.data);
          if (!isValid && process.env.NODE_ENV !== "production") {
            console.warn("[useFeed] Malformed feed item (missing type/data):", item);
          }
          return isValid;
        })
      )
    : [];

  const hasMore = data ? (data[data.length - 1]?.pagination?.hasNext ?? false) : false;

  const loadMore = () => setSize(size + 1);

  return {
    feedItems,
    error,
    isLoading,
    isValidating,
    hasMore,
    loadMore,
    size,
  };
}

 succeeded in 0ms:
        bind_params: dict = {"limit": limit}

        if cursor_time and cursor_id is not None:
            where_clauses.append(
                "(c.created_at < CAST(:c_cursor_time AS timestamptz)"
                " OR (c.created_at = CAST(:c_cursor_time AS timestamptz) AND c.id < :c_cursor_id))"
            )
            bind_params["c_cursor_time"] = cursor_time
            bind_params["c_cursor_id"] = cursor_id

        if keyword:
            escaped = (
                keyword.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
            )
            where_clauses.append("c.note ILIKE :keyword")
            bind_params["keyword"] = f"%{escaped}%"

        if tags:
            where_clauses.append(
                "EXISTS (SELECT 1 FROM entity_tags et JOIN tags t ON t.id = et.tag_id"
                " WHERE et.entity_type = 'practice' AND et.entity_id = c.practice_id"
                " AND t.name = ANY(:tags))"
            )
            bind_params["tags"] = tags

        where_sql = " AND ".join(where_clauses)
        sql = f"""
            SELECT
                c.id AS item_id,
                c.created_at AS sort_time,
                c.user_id,
                COUNT(DISTINCT r.id) AS reactions_count,
                COUNT(DISTINCT cm.id) AS comments_count
            FROM practice_checkins c
            JOIN practices p ON p.id = c.practice_id
            LEFT JOIN reactions r ON r.target_type = 'checkin' AND r.target_id = c.id
            LEFT JOIN comments cm
                ON cm.target_type = 'checkin' AND cm.target_id = c.id
                AND cm.visibility = 'public'
            WHERE {where_sql}
            GROUP BY c.id, c.created_at, c.user_id
            ORDER BY c.created_at DESC, c.id DESC
            LIMIT :limit
        """
        return db.execute(text(sql), bind_params).fetchall()

    @staticmethod
    def _select_slot_a(available: list) -> tuple[list, int]:
        """
        Select 1 or 2 checkins for Slot A from the front of the available pool.

        Priority:
          1. Hot (reactions >= 1 or comments >= 1) → 1 item
          2. Cold start, pool >= 2, different user_ids → 2 items
          3. Fallback → 1 item; empty pool → 0 items (skip slot)
        """
        if not available:
            return [], 0

        first = available[0]
        is_hot = first.reactions_count >= 1 or first.comments_count >= 1

        if is_hot:
            return [first], 1

        # Cold start: two items with different owners
        if len(available) >= 2 and available[1].user_id != first.user_id:
            return [first, available[1]], 2

        return [first], 1

    @staticmethod
    def _assemble_slot_cycles(
        practice_rows: list,
        checkin_rows: list,
        num_cycles: int,
    ) -> tuple[list[dict], int, int]:
        """
        Assemble A→B→C→C→C cycles (Slot B skipped for MVP).

        Returns (slot_assignments, p_idx_consumed, c_idx_consumed).
        Stops if fewer than 3 practices remain for Slot C.
        Skips Slot A if checkin pool is exhausted.
        """
        slots: list[dict] = []
        p_idx = 0
        c_idx = 0

        for _ in range(num_cycles):
            # Slot C requires 3 practices; stop if not enough
            if p_idx + 3 > len(practice_rows):
                break

            # Slot A: checkins (skip if pool empty)
            if c_idx < len(checkin_rows):
                a_rows, consumed = FeedService._select_slot_a(checkin_rows[c_idx:])
                c_idx += consumed
                for row in a_rows:
                    slots.append(
                        {
                            "slot_type": SlotType.A,
                            "item_type": "checkin",
                            "item_id": row.item_id,
                        }
                    )

            # Slot B: skipped for MVP

            # Slot C: 3 practices
            for i in range(3):
                slots.append(
                    {
                        "slot_type": SlotType.C,
                        "item_type": "practice",
                        "item_id": practice_rows[p_idx + i].item_id,
                    }
                )
            p_idx += 3

        return slots, p_idx, c_idx

    # =========================================================================
    # Batch fetch helpers
    # =========================================================================

    @staticmethod
    def _batch_fetch_practices(db: Session, ids: list[int]) -> dict:
        """Batch fetch practices with user info (沿用 routers/users.py pattern)"""
        if not ids:
            return {}

        rows = db.execute(
            text(
                """
                SELECT
                    p.id,
                    p.external_id,
                    p.title,
                    p.status,
                    p.privacy_status,
                    p.practice_action,
                    p.start_date::text AS start_date,
                    p.end_date::text AS end_date,
                    p.frequency_min_days,
                    p.frequency_max_days,
                    p.session_duration_minutes,
                    p.created_at,
                    u.external_id AS user_external_id,
                    u.nickname AS user_name,
                    ct.photo_url AS user_photo_url
                FROM practices p
                JOIN users u ON u.id = p.user_id
                LEFT JOIN contacts ct ON ct.id = u.contact_id
                WHERE p.id IN :ids
            """
            ).bindparams(bindparam("ids", expanding=True)),
            {"ids": ids},
        ).fetchall()

        result = {}
        for r in rows:
            is_brewing = r.privacy_status == "delayed" and r.status == "active"
            result[r.id] = {
                "id": str(r.external_id),
                "title": r.title,
                "status": r.status,
                "privacy_status": r.privacy_status,
                "is_brewing": is_brewing,
                "practice_action": r.practice_action,
                "start_date": r.start_date,
                "end_date": r.end_date,
                "frequency_min_days": r.frequency_min_days,
                "frequency_max_days": r.frequency_max_days,
                "session_duration_minutes": r.session_duration_minutes,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "user": {
                    "id": str(r.user_external_id) if r.user_external_id else None,
                    "name": r.user_name or "",
                    "photo_url": r.user_photo_url,
                },
            }
        return result

    @staticmethod
    def _batch_fetch_checkins(db: Session, ids: list[int]) -> dict:
        """Batch fetch checkins with practice title + user info"""
        if not ids:
            return {}

        rows = db.execute(
            text(
                """
                SELECT
                    c.id,
                    c.checkin_date::text AS checkin_date,
                    c.mood,
                    c.note,
                    c.image_urls,
                    c.created_at,
                    p.external_id AS practice_external_id,
                    p.title AS practice_title,
                    u.external_id AS user_external_id,
                    u.nickname AS user_name,
                    ct.photo_url AS user_photo_url
                FROM practice_checkins c
                JOIN practices p ON p.id = c.practice_id
                JOIN users u ON u.id = c.user_id
                LEFT JOIN contacts ct ON ct.id = u.contact_id
                WHERE c.id IN :ids
            """
            ).bindparams(bindparam("ids", expanding=True)),
            {"ids": ids},
        ).fetchall()

        result = {}
        for r in rows:
            result[r.id] = {
                "id": str(r.id),
                "checkin_date": r.checkin_date,
                "mood": r.mood,
                "note": r.note or "",
                "tags": [],  # checkin 自身無 tags，可透過 practice tags 衍生
                "image_urls": r.image_urls or [],
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "practice": {
                    "id": str(r.practice_external_id),
                    "title": r.practice_title,
                },
                "user": {
                    "id": str(r.user_external_id) if r.user_external_id else None,
                    "name": r.user_name or "",
                    "photo_url": r.user_photo_url,
                },
            }
        return result

    @staticmethod
    def _batch_fetch_reactions(db: Session, target_ids: dict) -> dict:
        """Batch fetch reactions (沿用 routers/users.py lines 188-211 pattern)"""
        result: dict = {}
        for target_type, ids in target_ids.items():
            if not ids:
                continue
            rows = db.execute(
                text(
                    """
                    SELECT
                        r.target_id,
                        r.reaction_type,
                        COUNT(*) AS cnt,
                        (
                            SELECT u2.nickname
                            FROM reactions r2
                            LEFT JOIN users u2 ON u2.id = r2.user_id
                            WHERE r2.target_type = :target_type
                              AND r2.target_id = r.target_id
                              AND r2.reaction_type = r.reaction_type
                            ORDER BY r2.created_at DESC
                            LIMIT 1
                        ) AS latest_actor_name
                    FROM reactions r
                    WHERE r.target_type = :target_type
                      AND r.target_id IN :ids
                    GROUP BY r.target_id, r.reaction_type
                """
                ).bindparams(bindparam("ids", expanding=True)),
                {"target_type": target_type, "ids": ids},
            ).fetchall()

            for r in rows:
                key = (target_type, r.target_id)
                if key not in result:
                    result[key] = []
                result[key].append(
                    {
                        "type": r.reaction_type,
                        "count": r.cnt,
                        "latestActorName": r.latest_actor_name,
                    }
                )
        return result

    @staticmethod
    def _batch_fetch_comments(db: Session, target_ids: dict) -> dict:
        """Batch fetch comment counts + 2 preview comments per item"""
        result: dict = {}
        for target_type, ids in target_ids.items():
            if not ids:
                continue

            # 1. Counts
            count_rows = db.execute(
                text(
                    """
                    SELECT target_id, COUNT(*) AS cnt
                    FROM comments
                    WHERE target_type = :target_type
                      AND target_id IN :ids
                      AND visibility = 'public'
                    GROUP BY target_id
                """
                ).bindparams(bindparam("ids", expanding=True)),
                {"target_type": target_type, "ids": ids},
            ).fetchall()

            for r in count_rows:
                result[(target_type, r.target_id)] = {"count": r.cnt, "preview": []}

            # 2. Preview (latest 2 per target) using LATERAL join
            preview_rows = db.execute(
                text(
                    """
                    SELECT sub.target_id, sub.id, sub.content, sub.created_at,
                           u.external_id AS user_external_id,
                           u.nickname AS user_name,
                           ct.photo_url AS user_photo_url
                    FROM (
                        SELECT DISTINCT target_id AS target_id
                        FROM comments
                        WHERE target_type = :target_type
                          AND target_id IN :ids
                          AND visibility = 'public'
                    ) targets
                    CROSS JOIN LATERAL (
                        SELECT id, content, created_at, user_id, target_id
                        FROM comments
                        WHERE target_type = :target_type
                          AND target_id = targets.target_id
                          AND visibility = 'public'
                        ORDER BY created_at DESC
                        LIMIT 2
                    ) sub
                    JOIN users u ON u.id = sub.user_id
                    LEFT JOIN contacts ct ON ct.id = u.contact_id
                """
                ).bindparams(bindparam("ids", expanding=True)),
                {"target_type": target_type, "ids": ids},
            ).fetchall()

            for r in preview_rows:
                key = (target_type, r.target_id)
                if key not in result:
                    result[key] = {"count": 0, "preview": []}
                result[key]["preview"].append(
                    {
                        "id": str(r.id),
                        "content": r.content,
                        "created_at": (
                            r.created_at.isoformat() if r.created_at else None
                        ),
                        "user": {
                            "id": (
                                str(r.user_external_id) if r.user_external_id else None
                            ),
                            "name": r.user_name or "",
                            "photo_url": r.user_photo_url,
                        },
                    }
                )
        return result

exec
/bin/zsh -lc "sed -n '1,360p' 'daodao-f2e/apps/product/src/app/[locale]/(with-layout)/page.tsx'" in /Users/xiaoxu/Projects/daodao
exec
/bin/zsh -lc "sed -n '1,260p' daodao-f2e/packages/api/src/ai-types.ts" in /Users/xiaoxu/Projects/daodao
 succeeded in 0ms:
/**
 * This file was auto-generated by openapi-typescript.
 * Do not make direct changes to the file.
 */

export interface paths {
  "/metrics": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * Metrics
     * @description Endpoint that serves Prometheus metrics.
     */
    get: operations["metrics_metrics_get"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/feed": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * Get Feed
     * @description 混合 practice + checkin 的 feed 列表（infinite scroll）
     */
    get: operations["get_feed_api_v1_feed_get"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/recommendation/rank_feed": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * Recommendation Feed
     * @description 推薦 feed API
     *     - JWT 驗證透過 get_current_user 自動處理
     *     example:
     *     curl -X POST "http://localhost:8002/api/recommendation/rank_feed?limit=10"     -H "accept: application/json"     -H "Authorization: Bearer <YOUR_TOKEN_ID>"
     */
    get: operations["recommendation_feed_api_v1_recommendation_rank_feed_get"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/users/practices/suggestions": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * Get Practice Suggestions
     * @description 取得搜尋建議關鍵字（近期熱門標籤 + 我的技能興趣相關標籤）
     */
    get: operations["get_practice_suggestions_api_v1_users_practices_suggestions_get"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/users/practices/completions": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * Get Practice Completions
     * @description 關鍵字文字補全與預測下一個詞（輸入框即時補全用）
     */
    get: operations["get_practice_completions_api_v1_users_practices_completions_get"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/users/practices": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * Get My Practices
     * @description 取得使用者的實踐貼文列表
     */
    get: operations["get_my_practices_api_v1_users_practices_get"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/ping": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * Ping
     * @description Simple ping endpoint for basic connectivity tests.
     */
    get: operations["ping_api_v1_ping_get"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/health": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * Health Check
     * @description Comprehensive health check endpoint for monitoring and load balancer probes.
     *
     *     :returns: Service health status with version and connectivity checks
     *     :rtype: HealthResponse
     */
    get: operations["health_check_api_v1_health_get"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Root */
    get: operations["root__get"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
}
export type webhooks = Record<string, never>;
export interface components {
  schemas: {
    /**
     * FeedReasonType
     * @enum {string}
     */
    FeedReasonType: "new_practice" | "new_release" | "checked_in" | "cheered";
    /** APIResponse */
    APIResponse: {
      /** Success */
      success: boolean;
      /** Data */
      data?: unknown | null;
      error?: components["schemas"]["ErrorInfo"] | null;
      pagination?: components["schemas"]["CursorPaginationInfo"] | null;
      /** Timestamp */
      timestamp: string;
      /** Requestid */
      requestId: string;
      /**
       * Cachehit
       * @default false
       */
      cacheHit: boolean;
      /**
       * Processingtime
       * @default 0
       */
      processingTime: number;
    };
    /** CursorInfo */
    CursorInfo: {
      /** Start */
      start?: string | null;
      /** End */
      end?: string | null;
    };
    /** CursorPaginationInfo */
    CursorPaginationInfo: {
      cursors?: components["schemas"]["CursorInfo"] | null;
      /**
       * Hasprev
       * @default false
       */
      hasPrev: boolean | null;
      /**
       * Hasnext
       * @default false
       */
      hasNext: boolean | null;
      /**
       * Count
       * @default 0
       */
      count: number | null;
    };
    /** ErrorInfo */
    ErrorInfo: {
      /** Code */
      code: string;
      /** Message */
      message: string;
      /** Details */
      details?: {
        [key: string]: unknown;
      } | null;
    };
    /** HTTPValidationError */
    HTTPValidationError: {

 succeeded in 0ms:
"use client";

import {
  type FeedItem,
  useFeed,
  useMyPracticeStats,
  useMyPractices,
  useReactionsBatch,
} from "@daodao/api";
import { MessagesSvg } from "@daodao/assets";
import { useRouter, useSearchParams } from "@daodao/i18n/navigation";
import { cn } from "@daodao/ui/lib/utils";
import { CheckCircle2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AddTaskFAB,
  DashboardHeader,
  InProgressSection,
  type InProgressTask,
  RecommendationSection,
} from "@/components/dashboard";
import { BackgroundAnimation, Banner } from "@/components/layout";
import { RandomPracticesSection } from "@/components/practice/shared/random-practices-section";
import {
  BrewingCard,
  CheckInShowcaseCard,
  FeedLabel,
  PracticeShowcaseCard,
  type ShowcaseFilterState,
  ShowcaseSearchBar,
} from "@/components/showcase";
import {
  FilterStatus,
  type FilterStatus as FilterStatusType,
  mapPracticeStatusToTaskStatus,
} from "@/constants/task-status";

type TabType = "inspire" | "mine";

const filterOptions = [
  { value: FilterStatus.all, label: "全部" },
  { value: FilterStatus.draft, label: "草稿" },
  { value: FilterStatus.notStarted, label: "未開始" },
  { value: FilterStatus.inProgress, label: "進行中" },
  { value: FilterStatus.completed, label: "已完成" },
];

export default function HomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<TabType>("inspire");
  const [searchValue, setSearchValue] = useState(searchParams.get("keyword") ?? "");
  const [filters, _setFilters] = useState<ShowcaseFilterState>({
    tags: searchParams.getAll("tags[]"),
  });
  const [keyword, setKeyword] = useState(searchParams.get("keyword") ?? "");
  const [filterStatus, setFilterStatus] = useState<FilterStatusType>(FilterStatus.all);

  // Sync URL params
  const updateUrlParams = useCallback(
    (kw: string, f: ShowcaseFilterState) => {
      const params = new URLSearchParams();
      if (kw) params.set("keyword", kw);
      for (const tag of f.tags) {
        params.append("tags[]", tag);
      }
      const qs = params.toString();
      router.replace(qs ? `?${qs}` : "?", { scroll: false });
    },
    [router]
  );

  const handleSearch = useCallback(
    (value: string) => {
      setKeyword(value);
      updateUrlParams(value, filters);
    },
    [filters, updateUrlParams]
  );

  // Feed (practice + checkin)
  const feedParams = useMemo(
    () => ({
      keyword: keyword || undefined,
      tags: filters.tags.length > 0 ? filters.tags : undefined,
    }),
    [keyword, filters]
  );

  const {
    feedItems,
    isLoading: isShowcaseLoading,
    hasMore,
    loadMore,
    isValidating,
  } = useFeed(feedParams);

  // Batch fetch reactions for all visible practices
  const practiceIds = useMemo(
    () =>
      feedItems
        .filter((item): item is Extract<FeedItem, { type: "practice" }> => item.type === "practice")
        .map((item) => item.data.id),
    [feedItems]
  );
  const { data: batchReactionsData, mutate: mutateBatchReactions } = useReactionsBatch({
    targetType: "practice",
    targetIds: practiceIds,
  });

  // Infinite scroll observer
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !isValidating) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, isValidating, loadMore]);

  // My practices
  const { data: allPracticesData, isLoading: isMyLoading } = useMyPractices({ limit: 16 });
  const { data: statsData } = useMyPracticeStats();

  const { inProgressTasks } = useMemo(() => {
    const practices = allPracticesData?.data || [];
    const inProgressTasksData: InProgressTask[] = [];

    practices.forEach((practice) => {
      const lastCheckInDate = practice.lastCheckinAt ?? null;
      inProgressTasksData.push({
        id: practice.id,
        label: "主題實踐",
        title: practice.title,
        description: practice.practiceAction || "",
        checkInCount: practice.checkInCount,
        progress: practice.progressPercentage ?? 0,
        messagesCount: 0,
        isUnreadMessages: false,
        theme: practice.themeColor || "#FCDD84",
        status: mapPracticeStatusToTaskStatus(practice.status),
        lastCheckInDate,
        startDate: practice.startDate || null,
        endDate: practice.endDate || null,
      });
    });

    return { inProgressTasks: inProgressTasksData };
  }, [allPracticesData]);

  const filteredInProgressTasks = useMemo(() => {
    if (filterStatus === FilterStatus.completed)
      return inProgressTasks.filter((task) => task.status === FilterStatus.completed);
    if (filterStatus === FilterStatus.all)
      return inProgressTasks.filter((task) => task.status !== FilterStatus.completed);
    return inProgressTasks.filter((task) => task.status === filterStatus);
  }, [inProgressTasks, filterStatus]);

  const stats = useMemo(() => {
    const statsDataValue = statsData?.data;
    return [
      {
        label: "連續登入",
        value: String(statsDataValue?.currentStreak || 0),
        unit: "天",
        icon: CheckCircle2,
      },
      {
        label: "獲得迴響",
        value: String(statsDataValue?.totalCheckIns || 0),
        unit: "次",
        icon: MessagesSvg,
      },
    ];
  }, [statsData]);

  const hasPractices = inProgressTasks.length > 0;
  const showInProgress = true;

  return (
    <div className="relative min-h-screen">
      <Banner />
      <BackgroundAnimation />

      <main className="relative z-[25] pb-[72px] bg-very-light-gray">
        <div className="max-w-[640px] px-4 mx-auto pt-4">
          {/* Tab Switcher */}
          <div className="flex border-b border-[#E5E7EB] mb-4">
            <button
              type="button"
              onClick={() => setActiveTab("inspire")}
              className={cn(
                "flex-1 py-2 text-sm font-medium transition-all",
                activeTab === "inspire"
                  ? "text-text-dark border-b-2 border-logo-cyan -mb-px"
                  : "text-text-dark/40"
              )}
            >
              靈感
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("mine")}
              className={cn(
                "flex-1 py-2 text-sm font-medium transition-all",
                activeTab === "mine"
                  ? "text-text-dark border-b-2 border-logo-cyan -mb-px"
                  : "text-text-dark/40"
              )}
            >
              我的
            </button>
          </div>

          {/* 靈感 Tab */}
          {activeTab === "inspire" && (
            <>
              <div className="mb-3">
                <ShowcaseSearchBar
                  value={searchValue}
                  onChange={setSearchValue}
                  onSearch={handleSearch}
                />
              </div>

              {isShowcaseLoading && feedItems.length === 0 ? (
                <div className="flex flex-col gap-3">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="bg-white rounded-2xl p-4 h-48 animate-pulse border border-[#E8F8FF]"
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {feedItems.map((feedItem, index) => {
                    const isNewRelease = feedItem.feed_reason === "new_release";
                    const prevIsNewRelease = index > 0 && feedItems[index - 1]?.feed_reason === "new_release";
                    const showFeedLabel = !isNewRelease || !prevIsNewRelease;

                    if (feedItem.type === "checkin") {
                      const checkin = feedItem.data;
                      return (
                        <div key={checkin.id}>
                          {showFeedLabel && feedItem.feed_reason && (
                            <FeedLabel
                              feedReason={feedItem.feed_reason}
                              userName={checkin.user?.name}
                              practiceTitle={checkin.practice?.title}
                            />
                          )}
                          <CheckInShowcaseCard
                            id={checkin.id}
                            checkin_date={checkin.checkin_date}
                            mood={checkin.mood}
                            note={checkin.note}
                            tags={checkin.tags}
                            image_urls={checkin.image_urls}
                            created_at={checkin.created_at}
                            practice={checkin.practice}
                            user={checkin.user}
                            comment_count={checkin.comment_count}
                            comment_preview={checkin.comment_preview}
                            batchReactionData={batchReactionsData?.data?.[checkin.id]}
                          />
                        </div>
                      );
                    }

                    if (feedItem.type === "practice") {
                      const practice = feedItem.data;
                      const latestActorName = practice.reactions
                        ?.find((r) => r.latestActorName)?.latestActorName;
                      return (
                        <div key={practice.id}>
                          {showFeedLabel && feedItem.feed_reason && (
                            <FeedLabel
                              feedReason={feedItem.feed_reason}
                              userName={practice.user?.name}
                              latestActorName={latestActorName}
                            />
                          )}
                          {practice.is_brewing ? (
                            <BrewingCard
                              id={practice.id}
                              title={practice.title}
                              startDate={practice.start_date}
                              endDate={practice.end_date}
                              user={
                                practice.user
                                  ? {
                                      id: practice.user.id,
                                      name: practice.user.name,
                                      photoUrl: practice.user.photo_url,
                                    }
                                  : undefined
                              }
                              actionDescription={practice.practice_action}
                              frequencyMinDays={practice.frequency_min_days}
                              frequencyMaxDays={practice.frequency_max_days}
                              sessionDurationMinutes={practice.session_duration_minutes}
                              commentCount={practice.comment_count}
                              batchReactionData={batchReactionsData?.data?.[practice.id]}
                              onReactionMutate={() => mutateBatchReactions()}
                            />
                          ) : (
                            <PracticeShowcaseCard
                              id={practice.id}
                              title={practice.title}
                              status={practice.status}
                              startDate={practice.start_date}
                              endDate={practice.end_date}
                              user={
                                practice.user
                                  ? {
                                      id: practice.user.id,
                                      name: practice.user.name,
                                      photoUrl: practice.user.photo_url,
                                    }
                                  : undefined
                              }
                              actionDescription={practice.practice_action}
                              frequencyMinDays={practice.frequency_min_days}
                              frequencyMaxDays={practice.frequency_max_days}
                              sessionDurationMinutes={practice.session_duration_minutes}
                              commentCount={practice.comment_count}
                              batchReactionData={batchReactionsData?.data?.[practice.id]}
                              onReactionMutate={() => mutateBatchReactions()}
                            />
                          )}
                        </div>
                      );
                    }

                    return null;
                  })}

                  <div ref={sentinelRef} className="h-4" />

                  {isValidating && (
                    <div className="text-center py-4 text-text-dark/50 text-sm">載入中...</div>
                  )}
                </div>
              )}
            </>
          )}

          {/* 我的 Tab */}
          {activeTab === "mine" &&
            (isMyLoading ? (
              <div className="text-center text-text-dark">載入中...</div>

codex
前端首頁已看到 `useFeed`、移除 mock、卡片分流與 `new_release` 連續群組邏輯。再補查 `ai-types` 內 `/api/v1/feed` schema 與 `FeedLabel` 實際型別，避免誤判。
exec
/bin/zsh -lc "rg -n \"mockCheckinReactions|useShowcaseFeed|hardcoded|CheckInShowcaseCard|PracticeShowcaseCard|BrewingCard\" 'daodao-f2e/apps/product/src/app/[locale]/(with-layout)/page.tsx'" in /Users/xiaoxu/Projects/daodao
exec
/bin/zsh -lc 'rg -n "feed_reason|FeedReasonType|slot_type|FeedItem" daodao-f2e/packages/api/src/ai-types.ts' in /Users/xiaoxu/Projects/daodao
 succeeded in 0ms:
195:     * FeedReasonType
198:    FeedReasonType: "new_practice" | "new_release" | "checked_in" | "cheered";

 succeeded in 0ms:
25:  BrewingCard,
26:  CheckInShowcaseCard,
28:  PracticeShowcaseCard,
261:                          <CheckInShowcaseCard
293:                            <BrewingCard
316:                            <PracticeShowcaseCard

exec
/bin/zsh -lc "rg -n \"_select_slot_a|_assemble_slot_cycles|SlotType|feed_reason|new_release|checked_in|cheered\" daodao-ai-backend/tests daodao-ai-backend/src -g '*.py'" in /Users/xiaoxu/Projects/daodao
 succeeded in 0ms:
daodao-ai-backend/src/services/feed/feed_service.py:15:from src.schemas.feed import FeedReasonType, FeedSortBy, FeedTypeFilter, SlotType
daodao-ai-backend/src/services/feed/feed_service.py:86:        slot_assignments, p_idx, c_idx = FeedService._assemble_slot_cycles(
daodao-ai-backend/src/services/feed/feed_service.py:120:                feed_reason = (
daodao-ai-backend/src/services/feed/feed_service.py:121:                    FeedReasonType.new_release
daodao-ai-backend/src/services/feed/feed_service.py:129:                        "feed_reason": feed_reason,
daodao-ai-backend/src/services/feed/feed_service.py:144:                        "feed_reason": FeedReasonType.checked_in,
daodao-ai-backend/src/services/feed/feed_service.py:206:                    feed_reason = (
daodao-ai-backend/src/services/feed/feed_service.py:207:                        FeedReasonType.new_release
daodao-ai-backend/src/services/feed/feed_service.py:215:                            "feed_reason": feed_reason,
daodao-ai-backend/src/services/feed/feed_service.py:216:                            "slot_type": SlotType.C,
daodao-ai-backend/src/services/feed/feed_service.py:248:                            "feed_reason": FeedReasonType.checked_in,
daodao-ai-backend/src/services/feed/feed_service.py:249:                            "slot_type": SlotType.A,
daodao-ai-backend/src/services/feed/feed_service.py:407:    def _select_slot_a(available: list) -> tuple[list, int]:
daodao-ai-backend/src/services/feed/feed_service.py:432:    def _assemble_slot_cycles(
daodao-ai-backend/src/services/feed/feed_service.py:455:                a_rows, consumed = FeedService._select_slot_a(checkin_rows[c_idx:])
daodao-ai-backend/src/services/feed/feed_service.py:460:                            "slot_type": SlotType.A,
daodao-ai-backend/src/services/feed/feed_service.py:472:                        "slot_type": SlotType.C,
daodao-ai-backend/tests/routers/test_feed.py:46:    "feed_reason": "new_practice",
daodao-ai-backend/tests/routers/test_feed.py:68:    "feed_reason": "new_release",
daodao-ai-backend/tests/routers/test_feed.py:90:    "feed_reason": "checked_in",
daodao-ai-backend/tests/routers/test_feed.py:180:    def test_feed_reason_new_practice(self, client):
daodao-ai-backend/tests/routers/test_feed.py:181:        """practice with is_brewing=False has feed_reason=new_practice."""
daodao-ai-backend/tests/routers/test_feed.py:190:        assert item["feed_reason"] == "new_practice"
daodao-ai-backend/tests/routers/test_feed.py:192:    def test_feed_reason_new_release(self, client):
daodao-ai-backend/tests/routers/test_feed.py:193:        """practice with is_brewing=True has feed_reason=new_release."""
daodao-ai-backend/tests/routers/test_feed.py:202:        assert item["feed_reason"] == "new_release"
daodao-ai-backend/tests/routers/test_feed.py:204:    def test_feed_reason_checked_in(self, client):
daodao-ai-backend/tests/routers/test_feed.py:205:        """checkin item has feed_reason=checked_in."""
daodao-ai-backend/tests/routers/test_feed.py:213:        assert item["feed_reason"] == "checked_in"
daodao-ai-backend/src/schemas/feed.py:11:    new_release = "new_release"
daodao-ai-backend/src/schemas/feed.py:12:    checked_in = "checked_in"
daodao-ai-backend/src/schemas/feed.py:13:    cheered = "cheered"
daodao-ai-backend/src/schemas/feed.py:16:class SlotType(str, Enum):

exec
/bin/zsh -lc "rg -n \"FeedLabel|feedReason|latestActorName|practiceTitle\" daodao-f2e/apps/product/src/components/showcase -g '*.tsx'" in /Users/xiaoxu/Projects/daodao
 succeeded in 0ms:
daodao-f2e/apps/product/src/components/showcase/FeedLabel.tsx:4:interface FeedLabelProps {
daodao-f2e/apps/product/src/components/showcase/FeedLabel.tsx:5:  feedReason: FeedReasonType;
daodao-f2e/apps/product/src/components/showcase/FeedLabel.tsx:7:  practiceTitle?: string;
daodao-f2e/apps/product/src/components/showcase/FeedLabel.tsx:8:  latestActorName?: string;
daodao-f2e/apps/product/src/components/showcase/FeedLabel.tsx:11:export function FeedLabel({ feedReason, userName, practiceTitle, latestActorName }: FeedLabelProps) {
daodao-f2e/apps/product/src/components/showcase/FeedLabel.tsx:12:  if (feedReason === "new_practice") {
daodao-f2e/apps/product/src/components/showcase/FeedLabel.tsx:21:  if (feedReason === "new_release") {
daodao-f2e/apps/product/src/components/showcase/FeedLabel.tsx:30:  if (feedReason === "checked_in") {
daodao-f2e/apps/product/src/components/showcase/FeedLabel.tsx:35:          {userName ?? "某人"} 在 {practiceTitle ?? "實踐"} 打卡
daodao-f2e/apps/product/src/components/showcase/FeedLabel.tsx:41:  if (feedReason === "cheered") {
daodao-f2e/apps/product/src/components/showcase/FeedLabel.tsx:45:        <span>{latestActorName ?? "某人"} 表達了加油</span>

codex
我已找到 `FeedLabel` 元件本身也有四種 `feedReason` 分支，但首頁對 `cheered` actor 名稱的資料來源看起來有風險，接著補查 API 型別是否真的把 `/api/v1/feed` 的 `feed_reason` 掛進 response schema。
exec
/bin/zsh -lc 'rg -n "get_feed_api_v1_feed_get|feed_reason|slot_type|checkin_date|comment_preview" daodao-f2e/packages/api/src/ai-types.ts' in /Users/xiaoxu/Projects/daodao
exec
/bin/zsh -lc "sed -n '1,140p' daodao-f2e/apps/product/src/components/showcase/FeedLabel.tsx" in /Users/xiaoxu/Projects/daodao
 succeeded in 0ms:
38:    get: operations["get_feed_api_v1_feed_get"];
353:  get_feed_api_v1_feed_get: {

 succeeded in 0ms:
import { CalendarCheck, Rss, ThumbsUp } from "lucide-react";
import type { FeedReasonType } from "@daodao/api";

interface FeedLabelProps {
  feedReason: FeedReasonType;
  userName?: string;
  practiceTitle?: string;
  latestActorName?: string;
}

export function FeedLabel({ feedReason, userName, practiceTitle, latestActorName }: FeedLabelProps) {
  if (feedReason === "new_practice") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-text-dark/60 mb-1.5 px-1">
        <ThumbsUp className="size-3.5 shrink-0" />
        <span>{userName ?? "某人"} 發布了新實踐</span>
      </div>
    );
  }

  if (feedReason === "new_release") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-text-dark/60 mb-1.5 px-1">
        <Rss className="size-3.5 shrink-0" />
        <span>最新發布</span>
      </div>
    );
  }

  if (feedReason === "checked_in") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-text-dark/60 mb-1.5 px-1">
        <CalendarCheck className="size-3.5 shrink-0" />
        <span>
          {userName ?? "某人"} 在 {practiceTitle ?? "實踐"} 打卡
        </span>
      </div>
    );
  }

  if (feedReason === "cheered") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-text-dark/60 mb-1.5 px-1">
        <ThumbsUp className="size-3.5 shrink-0" />
        <span>{latestActorName ?? "某人"} 表達了加油</span>
      </div>
    );
  }

  return null;
}

exec
/bin/zsh -lc "rg -n \"slot_type|FeedResponse|FeedItem|feed_reason\" daodao-ai-backend/src daodao-ai-backend/tests -g '*.py'" in /Users/xiaoxu/Projects/daodao
 succeeded in 0ms:
daodao-ai-backend/src/services/rank_feed.py:306:    from src.schemas.recommendation import FeedItem
daodao-ai-backend/src/services/rank_feed.py:308:    filtered_feed = [FeedItem(id=item.id, type=item.type) for item in top]
daodao-ai-backend/src/services/recommendation_service.py:7:from src.schemas.recommendation import FeedItem
daodao-ai-backend/src/services/recommendation_service.py:38:        [FeedItem(id=item.id, type=item.type) for item in top_feed],
daodao-ai-backend/src/services/feed/feed_service.py:113:            slot_type = slot["slot_type"]
daodao-ai-backend/src/services/feed/feed_service.py:120:                feed_reason = (
daodao-ai-backend/src/services/feed/feed_service.py:129:                        "feed_reason": feed_reason,
daodao-ai-backend/src/services/feed/feed_service.py:130:                        "slot_type": slot_type,
daodao-ai-backend/src/services/feed/feed_service.py:144:                        "feed_reason": FeedReasonType.checked_in,
daodao-ai-backend/src/services/feed/feed_service.py:145:                        "slot_type": slot_type,
daodao-ai-backend/src/services/feed/feed_service.py:206:                    feed_reason = (
daodao-ai-backend/src/services/feed/feed_service.py:215:                            "feed_reason": feed_reason,
daodao-ai-backend/src/services/feed/feed_service.py:216:                            "slot_type": SlotType.C,
daodao-ai-backend/src/services/feed/feed_service.py:248:                            "feed_reason": FeedReasonType.checked_in,
daodao-ai-backend/src/services/feed/feed_service.py:249:                            "slot_type": SlotType.A,
daodao-ai-backend/src/services/feed/feed_service.py:460:                            "slot_type": SlotType.A,
daodao-ai-backend/src/services/feed/feed_service.py:472:                        "slot_type": SlotType.C,
daodao-ai-backend/tests/routers/test_recommendation.py:82:class TestRankFeedResponse:
daodao-ai-backend/tests/routers/test_feed.py:46:    "feed_reason": "new_practice",
daodao-ai-backend/tests/routers/test_feed.py:68:    "feed_reason": "new_release",
daodao-ai-backend/tests/routers/test_feed.py:90:    "feed_reason": "checked_in",
daodao-ai-backend/tests/routers/test_feed.py:180:    def test_feed_reason_new_practice(self, client):
daodao-ai-backend/tests/routers/test_feed.py:181:        """practice with is_brewing=False has feed_reason=new_practice."""
daodao-ai-backend/tests/routers/test_feed.py:190:        assert item["feed_reason"] == "new_practice"
daodao-ai-backend/tests/routers/test_feed.py:192:    def test_feed_reason_new_release(self, client):
daodao-ai-backend/tests/routers/test_feed.py:193:        """practice with is_brewing=True has feed_reason=new_release."""
daodao-ai-backend/tests/routers/test_feed.py:202:        assert item["feed_reason"] == "new_release"
daodao-ai-backend/tests/routers/test_feed.py:204:    def test_feed_reason_checked_in(self, client):
daodao-ai-backend/tests/routers/test_feed.py:205:        """checkin item has feed_reason=checked_in."""
daodao-ai-backend/tests/routers/test_feed.py:213:        assert item["feed_reason"] == "checked_in"
daodao-ai-backend/src/schemas/feed.py:4:class FeedItemType(str, Enum):
daodao-ai-backend/src/schemas/recommendation.py:6:class FeedItem(BaseModel):
daodao-ai-backend/src/schemas/recommendation.py:21:class FeedResponse(BaseModel):
daodao-ai-backend/src/schemas/recommendation.py:22:    items: List[FeedItem]

exec
/bin/zsh -lc "sed -n '340,430p' daodao-f2e/packages/api/src/ai-types.ts" in /Users/xiaoxu/Projects/daodao
 succeeded in 0ms:
      msg: string;
      /** Error Type */
      type: string;
    };
  };
  responses: never;
  parameters: never;
  requestBodies: never;
  headers: never;
  pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
  get_feed_api_v1_feed_get: {
    parameters: {
      query?: {
        /** @description 關鍵字搜尋 */
        keyword?: string | null;
        /** @description 標籤篩選 */
        tags?: string[] | null;
        /** @description feed 類型（all / practice / checkin） */
        type?: string | null;
        /** @description cursor-based 分頁 */
        cursor?: string | null;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["APIResponse"];
        };
      };
      /** @description Validation Error */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["HTTPValidationError"];
        };
      };
    };
  };
  metrics_metrics_get: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": unknown;
        };
      };
    };
  };
  recommendation_feed_api_v1_recommendation_rank_feed_get: {
    parameters: {
      query?: {
        /** @description 上一次最後一筆的 id，作為 cursor */
        after_id?: number | null;
        /** @description 每頁抓幾筆 */
        page_size?: number;
        /** @description 要抓哪些類型的 feed */
        type?: string | null;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful Response */
      200: {
        headers: {
          [name: string]: unknown;

codex
結論已大致成形：後端 enum 與部分判斷邏輯有落地，但 Wave 1 仍有幾個明確缺口，主要是 `cheered` 與 Slot B/完整循環。我要補抓行號，讓每一項回報可以直接定位。
exec
/bin/zsh -lc "nl -ba daodao-ai-backend/src/schemas/feed.py | sed -n '1,80p'" in /Users/xiaoxu/Projects/daodao
 succeeded in 0ms:
     1	from enum import Enum
     2	
     3	
     4	class FeedItemType(str, Enum):
     5	    PRACTICE = "practice"
     6	    CHECKIN = "checkin"
     7	
     8	
     9	class FeedReasonType(str, Enum):
    10	    new_practice = "new_practice"
    11	    new_release = "new_release"
    12	    checked_in = "checked_in"
    13	    cheered = "cheered"
    14	
    15	
    16	class SlotType(str, Enum):
    17	    A = "A"
    18	    B = "B"
    19	    C = "C"
    20	
    21	
    22	class FeedTypeFilter(str, Enum):
    23	    ALL = "all"
    24	    PRACTICE = "practice"
    25	    CHECKIN = "checkin"
    26	
    27	
    28	class FeedSortBy(str, Enum):
    29	    NEWEST = "newest"
    30	    RECOMMENDED = "recommended"

exec
/bin/zsh -lc "nl -ba daodao-ai-backend/src/services/feed/feed_service.py | sed -n '1,280p'" in /Users/xiaoxu/Projects/daodao
exec
/bin/zsh -lc "nl -ba daodao-ai-backend/src/services/feed/feed_service.py | sed -n '280,520p'" in /Users/xiaoxu/Projects/daodao
exec
/bin/zsh -lc "nl -ba daodao-ai-backend/tests/routers/test_feed.py | sed -n '1,260p'" in /Users/xiaoxu/Projects/daodao
 succeeded in 0ms:
     1	"""
     2	Feed Service
     3	
     4	統一 Feed 查詢：混合 practice + checkin，按時間排序。
     5	沿用 routers/users.py 的 practice 查詢與 enrichment 模式。
     6	"""
     7	
     8	from typing import Optional
     9	
    10	from sqlalchemy import bindparam, text
    11	from sqlalchemy.orm import Session
    12	
    13	from src.logger import AppLogger
    14	from src.models.User import User
    15	from src.schemas.feed import FeedReasonType, FeedSortBy, FeedTypeFilter, SlotType
    16	
    17	logger = AppLogger(__name__).get_logger()
    18	
    19	
    20	class FeedService:
    21	    @staticmethod
    22	    def get_feed(
    23	        db: Session,
    24	        current_user_external_id: Optional[str] = None,
    25	        cursor: Optional[str] = None,
    26	        limit: int = 20,
    27	        keyword: Optional[str] = None,
    28	        tags: Optional[list[str]] = None,
    29	        type_filter: FeedTypeFilter = FeedTypeFilter.ALL,
    30	        sort_by: FeedSortBy = FeedSortBy.NEWEST,
    31	    ) -> dict:
    32	        """
    33	        統一 feed 查詢：混合 practice + checkin。
    34	
    35	        type_filter=ALL → Slot Pattern (A→B→C→C→C 循環)
    36	        type_filter=PRACTICE|CHECKIN → 單類型時序回傳
    37	
    38	        current_user_external_id 用於 Router 層 per-user cache key。
    39	        """
    40	        user_id: int | None = None
    41	        if current_user_external_id:
    42	            _user = (
    43	                db.query(User)
    44	                .filter(User.external_id == current_user_external_id)
    45	                .first()
    46	            )
    47	            user_id = _user.id if _user else None
    48	
    49	        if type_filter == FeedTypeFilter.ALL:
    50	            return FeedService._get_feed_slot_pattern(
    51	                db, user_id, cursor, limit, keyword, tags
    52	            )
    53	        else:
    54	            return FeedService._get_feed_single_type(
    55	                db, user_id, cursor, limit, keyword, tags, type_filter
    56	            )
    57	
    58	    # =========================================================================
    59	    # Slot Pattern Feed (type_filter=ALL)
    60	    # =========================================================================
    61	
    62	    @staticmethod
    63	    def _get_feed_slot_pattern(
    64	        db: Session,
    65	        user_id: Optional[int],
    66	        cursor: Optional[str],
    67	        limit: int,
    68	        keyword: Optional[str],
    69	        tags: Optional[list[str]],
    70	    ) -> dict:
    71	        """Assemble feed in A→B→C→C→C slot cycles (Slot B skipped for MVP)."""
    72	        p_cursor_time, p_cursor_id, c_cursor_time, c_cursor_id = (
    73	            FeedService._parse_dual_cursor(cursor)
    74	        )
    75	
    76	        num_cycles = max(1, limit // 4)
    77	
    78	        # Fetch +1 extra in each pool to detect has_next
    79	        practice_rows = FeedService._fetch_practice_pool(
    80	            db, p_cursor_time, p_cursor_id, num_cycles * 3 + 1, keyword, tags
    81	        )
    82	        checkin_rows = FeedService._fetch_checkin_pool_with_counts(
    83	            db, c_cursor_time, c_cursor_id, num_cycles * 2 + 1, keyword, tags
    84	        )
    85	
    86	        slot_assignments, p_idx, c_idx = FeedService._assemble_slot_cycles(
    87	            practice_rows, checkin_rows, num_cycles
    88	        )
    89	
    90	        if not slot_assignments:
    91	            return {"data": [], "next_cursor": None}
    92	
    93	        practice_ids = [
    94	            s["item_id"] for s in slot_assignments if s["item_type"] == "practice"
    95	        ]
    96	        checkin_ids = [
    97	            s["item_id"] for s in slot_assignments if s["item_type"] == "checkin"
    98	        ]
    99	
   100	        practices_map = FeedService._batch_fetch_practices(db, practice_ids)
   101	        checkins_map = FeedService._batch_fetch_checkins(db, checkin_ids)
   102	        reactions_map = FeedService._batch_fetch_reactions(
   103	            db, {"practice": practice_ids, "checkin": checkin_ids}
   104	        )
   105	        comments_map = FeedService._batch_fetch_comments(
   106	            db, {"practice": practice_ids, "checkin": checkin_ids}
   107	        )
   108	
   109	        items = []
   110	        for slot in slot_assignments:
   111	            item_type = slot["item_type"]
   112	            item_id = slot["item_id"]
   113	            slot_type = slot["slot_type"]
   114	
   115	            if item_type == "practice" and item_id in practices_map:
   116	                item = practices_map[item_id]
   117	                item["reactions"] = reactions_map.get(("practice", item_id), [])
   118	                comment_data = comments_map.get(("practice", item_id), {})
   119	                item["comment_count"] = comment_data.get("count", 0)
   120	                feed_reason = (
   121	                    FeedReasonType.new_release
   122	                    if item.get("is_brewing")
   123	                    else FeedReasonType.new_practice
   124	                )
   125	                items.append(
   126	                    {
   127	                        "type": "practice",
   128	                        "data": item,
   129	                        "feed_reason": feed_reason,
   130	                        "slot_type": slot_type,
   131	                    }
   132	                )
   133	
   134	            elif item_type == "checkin" and item_id in checkins_map:
   135	                item = checkins_map[item_id]
   136	                item["reactions"] = reactions_map.get(("checkin", item_id), [])
   137	                comment_data = comments_map.get(("checkin", item_id), {})
   138	                item["comment_count"] = comment_data.get("count", 0)
   139	                item["comment_preview"] = comment_data.get("preview", [])
   140	                items.append(
   141	                    {
   142	                        "type": "checkin",
   143	                        "data": item,
   144	                        "feed_reason": FeedReasonType.checked_in,
   145	                        "slot_type": slot_type,
   146	                    }
   147	                )
   148	
   149	        has_next = len(practice_rows) > p_idx or len(checkin_rows) > c_idx
   150	        next_cursor = None
   151	        if has_next:
   152	            p_last = ""
   153	            if p_idx > 0:
   154	                last_p = practice_rows[min(p_idx, len(practice_rows)) - 1]
   155	                p_ts = last_p.sort_time.isoformat() if last_p.sort_time else ""
   156	                p_last = f"{p_ts}_{last_p.item_id}"
   157	            c_last = ""
   158	            if c_idx > 0:
   159	                last_c = checkin_rows[min(c_idx, len(checkin_rows)) - 1]
   160	                c_ts = last_c.sort_time.isoformat() if last_c.sort_time else ""
   161	                c_last = f"{c_ts}_{last_c.item_id}"
   162	            next_cursor = f"{p_last}|{c_last}"
   163	
   164	        logger.info(f"feed (slot): {len(items)} items, has_next={has_next}")
   165	        return {"data": items, "next_cursor": next_cursor}
   166	
   167	    # =========================================================================
   168	    # Single-type Feed (type_filter=PRACTICE or CHECKIN)
   169	    # =========================================================================
   170	
   171	    @staticmethod
   172	    def _get_feed_single_type(
   173	        db: Session,
   174	        user_id: Optional[int],
   175	        cursor: Optional[str],
   176	        limit: int,
   177	        keyword: Optional[str],
   178	        tags: Optional[list[str]],
   179	        type_filter: FeedTypeFilter,
   180	    ) -> dict:
   181	        cursor_time, cursor_id = FeedService._parse_cursor_part(cursor or "")
   182	
   183	        if type_filter == FeedTypeFilter.PRACTICE:
   184	            rows = FeedService._fetch_practice_pool(
   185	                db, cursor_time, cursor_id, limit + 1, keyword, tags
   186	            )
   187	            has_next = len(rows) > limit
   188	            rows = rows[:limit]
   189	
   190	            practice_ids = [r.item_id for r in rows]
   191	            practices_map = FeedService._batch_fetch_practices(db, practice_ids)
   192	            reactions_map = FeedService._batch_fetch_reactions(
   193	                db, {"practice": practice_ids, "checkin": []}
   194	            )
   195	            comments_map = FeedService._batch_fetch_comments(
   196	                db, {"practice": practice_ids, "checkin": []}
   197	            )
   198	
   199	            items = []
   200	            for row in rows:
   201	                if row.item_id in practices_map:
   202	                    item = practices_map[row.item_id]
   203	                    item["reactions"] = reactions_map.get(("practice", row.item_id), [])
   204	                    comment_data = comments_map.get(("practice", row.item_id), {})
   205	                    item["comment_count"] = comment_data.get("count", 0)
   206	                    feed_reason = (
   207	                        FeedReasonType.new_release
   208	                        if item.get("is_brewing")
   209	                        else FeedReasonType.new_practice
   210	                    )
   211	                    items.append(
   212	                        {
   213	                            "type": "practice",
   214	                            "data": item,
   215	                            "feed_reason": feed_reason,
   216	                            "slot_type": SlotType.C,
   217	                        }
   218	                    )
   219	
   220	        else:  # CHECKIN
   221	            rows = FeedService._fetch_checkin_pool_with_counts(
   222	                db, cursor_time, cursor_id, limit + 1, keyword, tags
   223	            )
   224	            has_next = len(rows) > limit
   225	            rows = rows[:limit]
   226	
   227	            checkin_ids = [r.item_id for r in rows]
   228	            checkins_map = FeedService._batch_fetch_checkins(db, checkin_ids)
   229	            reactions_map = FeedService._batch_fetch_reactions(
   230	                db, {"practice": [], "checkin": checkin_ids}
   231	            )
   232	            comments_map = FeedService._batch_fetch_comments(
   233	                db, {"practice": [], "checkin": checkin_ids}
   234	            )
   235	
   236	            items = []
   237	            for row in rows:
   238	                if row.item_id in checkins_map:
   239	                    item = checkins_map[row.item_id]
   240	                    item["reactions"] = reactions_map.get(("checkin", row.item_id), [])
   241	                    comment_data = comments_map.get(("checkin", row.item_id), {})
   242	                    item["comment_count"] = comment_data.get("count", 0)
   243	                    item["comment_preview"] = comment_data.get("preview", [])
   244	                    items.append(
   245	                        {
   246	                            "type": "checkin",
   247	                            "data": item,
   248	                            "feed_reason": FeedReasonType.checked_in,
   249	                            "slot_type": SlotType.A,
   250	                        }
   251	                    )
   252	
   253	        next_cursor = None
   254	        if has_next and rows:
   255	            last = rows[-1]
   256	            ts = last.sort_time.isoformat() if last.sort_time else ""
   257	            next_cursor = f"{ts}_{last.item_id}"
   258	
   259	        logger.info(
   260	            f"feed (single-type={type_filter.value}): {len(items)} items, has_next={has_next}"
   261	        )
   262	        return {"data": items, "next_cursor": next_cursor}
   263	
   264	    # =========================================================================
   265	    # Slot Pattern Helpers
   266	    # =========================================================================
   267	
   268	    @staticmethod
   269	    def _parse_cursor_part(part: str) -> tuple[Optional[str], Optional[int]]:
   270	        if not part:
   271	            return None, None
   272	        parts = part.rsplit("_", 1)
   273	        if len(parts) == 2:
   274	            try:
   275	                return parts[0], int(parts[1])
   276	            except ValueError:
   277	                pass
   278	        return None, None
   279	
   280	    @staticmethod

 succeeded in 0ms:
     1	"""
     2	Router-level tests for GET /api/v1/feed
     3	"""
     4	
     5	from unittest.mock import patch
     6	
     7	import pytest
     8	from fastapi import FastAPI
     9	from fastapi.testclient import TestClient
    10	from unittest.mock import MagicMock
    11	
    12	from src.dependencies import get_cache_client, get_current_user, get_db_session
    13	from src.routers.feed import router
    14	
    15	# ── minimal app wiring ────────────────────────────────────────
    16	
    17	
    18	def _make_cache():
    19	    cache = MagicMock()
    20	    cache.client.get.return_value = None
    21	    return cache
    22	
    23	
    24	def _make_db():
    25	    db = MagicMock()
    26	    db.query.return_value.filter.return_value.first.return_value = None
    27	    return db
    28	
    29	
    30	app = FastAPI()
    31	app.include_router(router, prefix="/api")
    32	app.dependency_overrides[get_db_session] = lambda: _make_db()
    33	app.dependency_overrides[get_current_user] = lambda: "test-user-ext-id"
    34	app.dependency_overrides[get_cache_client] = lambda: _make_cache()
    35	
    36	
    37	@pytest.fixture
    38	def client():
    39	    yield TestClient(app)
    40	
    41	
    42	# ── helpers ───────────────────────────────────────────────────
    43	
    44	PRACTICE_ITEM = {
    45	    "type": "practice",
    46	    "feed_reason": "new_practice",
    47	    "data": {
    48	        "id": "ext-p-1",
    49	        "title": "Morning Yoga",
    50	        "status": "active",
    51	        "privacy_status": "public",
    52	        "is_brewing": False,
    53	        "practice_action": "yoga",
    54	        "start_date": "2025-01-01",
    55	        "end_date": None,
    56	        "frequency_min_days": 1,
    57	        "frequency_max_days": 1,
    58	        "session_duration_minutes": 30,
    59	        "created_at": "2025-06-01T08:00:00",
    60	        "user": {"id": "u1", "name": "Alice", "photo_url": None},
    61	        "reactions": [],
    62	        "comment_count": 0,
    63	    },
    64	}
    65	
    66	BREWING_PRACTICE_ITEM = {
    67	    "type": "practice",
    68	    "feed_reason": "new_release",
    69	    "data": {
    70	        "id": "ext-p-2",
    71	        "title": "Brewing Practice",
    72	        "status": "active",
    73	        "privacy_status": "delayed",
    74	        "is_brewing": True,
    75	        "practice_action": "brew",
    76	        "start_date": "2025-01-01",
    77	        "end_date": None,
    78	        "frequency_min_days": 1,
    79	        "frequency_max_days": 1,
    80	        "session_duration_minutes": 30,
    81	        "created_at": "2025-06-01T08:00:00",
    82	        "user": {"id": "u1", "name": "Alice", "photo_url": None},
    83	        "reactions": [],
    84	        "comment_count": 0,
    85	    },
    86	}
    87	
    88	CHECKIN_ITEM = {
    89	    "type": "checkin",
    90	    "feed_reason": "checked_in",
    91	    "data": {
    92	        "id": "101",
    93	        "checkin_date": "2025-06-01",
    94	        "mood": "happy",
    95	        "note": "Felt great!",
    96	        "tags": [],
    97	        "image_urls": [],
    98	        "created_at": "2025-06-01T09:00:00",
    99	        "practice": {"id": "ext-p-1", "title": "Morning Yoga"},
   100	        "user": {"id": "u1", "name": "Alice", "photo_url": None},
   101	        "reactions": [],
   102	        "comment_count": 0,
   103	        "comment_preview": [],
   104	    },
   105	}
   106	
   107	SERVICE_PATH = "src.routers.feed.FeedService.get_feed"
   108	
   109	
   110	# ─────────────────────────────────────────────────────────────
   111	# Tests
   112	# ─────────────────────────────────────────────────────────────
   113	
   114	
   115	class TestGetFeed:
   116	
   117	    def test_returns_200_with_mixed_feed(self, client):
   118	        """Mixed practice + checkin items are returned correctly."""
   119	        mock_return = {
   120	            "data": [PRACTICE_ITEM, CHECKIN_ITEM],
   121	            "next_cursor": "2025-06-01T08:00:00_1",
   122	        }
   123	        with patch(SERVICE_PATH, return_value=mock_return):
   124	            resp = client.get("/api/v1/feed")
   125	
   126	        assert resp.status_code == 200
   127	        body = resp.json()
   128	        assert body["success"] is True
   129	        assert len(body["data"]) == 2
   130	        assert body["data"][0]["type"] == "practice"
   131	        assert body["data"][1]["type"] == "checkin"
   132	        assert body["pagination"]["hasNext"] is True
   133	        assert body["pagination"]["count"] == 2
   134	
   135	    def test_type_filter_checkin_only(self, client):
   136	        """type=checkin query param is forwarded to FeedService."""
   137	        mock_return = {"data": [CHECKIN_ITEM], "next_cursor": None}
   138	        with patch(SERVICE_PATH, return_value=mock_return) as mock_svc:
   139	            resp = client.get("/api/v1/feed?type=checkin")
   140	
   141	        assert resp.status_code == 200
   142	        _, kwargs = mock_svc.call_args
   143	        assert kwargs["type_filter"].value == "checkin"
   144	
   145	    def test_type_filter_practice_only(self, client):
   146	        """type=practice query param is forwarded to FeedService."""
   147	        mock_return = {"data": [PRACTICE_ITEM], "next_cursor": None}
   148	        with patch(SERVICE_PATH, return_value=mock_return) as mock_svc:
   149	            resp = client.get("/api/v1/feed?type=practice")
   150	
   151	        assert resp.status_code == 200
   152	        _, kwargs = mock_svc.call_args
   153	        assert kwargs["type_filter"].value == "practice"
   154	
   155	    def test_cursor_pagination(self, client):
   156	        """cursor query param is forwarded to FeedService."""
   157	        mock_return = {"data": [], "next_cursor": None}
   158	        with patch(SERVICE_PATH, return_value=mock_return) as mock_svc:
   159	            resp = client.get("/api/v1/feed?cursor=2025-06-01T08:00:00_1")
   160	
   161	        assert resp.status_code == 200
   162	        _, kwargs = mock_svc.call_args
   163	        assert kwargs["cursor"] == "2025-06-01T08:00:00_1"
   164	        body = resp.json()
   165	        assert body["pagination"]["hasPrev"] is True
   166	
   167	    def test_empty_feed(self, client):
   168	        """Empty feed returns success with empty data list."""
   169	        mock_return = {"data": [], "next_cursor": None}
   170	        with patch(SERVICE_PATH, return_value=mock_return):
   171	            resp = client.get("/api/v1/feed")
   172	
   173	        assert resp.status_code == 200
   174	        body = resp.json()
   175	        assert body["success"] is True
   176	        assert body["data"] == []
   177	        assert body["pagination"]["hasNext"] is False
   178	        assert body["pagination"]["count"] == 0
   179	
   180	    def test_feed_reason_new_practice(self, client):
   181	        """practice with is_brewing=False has feed_reason=new_practice."""
   182	        mock_return = {"data": [PRACTICE_ITEM], "next_cursor": None}
   183	        with patch(SERVICE_PATH, return_value=mock_return):
   184	            resp = client.get("/api/v1/feed")
   185	
   186	        assert resp.status_code == 200
   187	        item = resp.json()["data"][0]
   188	        assert item["type"] == "practice"
   189	        assert item["data"]["is_brewing"] is False
   190	        assert item["feed_reason"] == "new_practice"
   191	
   192	    def test_feed_reason_new_release(self, client):
   193	        """practice with is_brewing=True has feed_reason=new_release."""
   194	        mock_return = {"data": [BREWING_PRACTICE_ITEM], "next_cursor": None}
   195	        with patch(SERVICE_PATH, return_value=mock_return):
   196	            resp = client.get("/api/v1/feed")
   197	
   198	        assert resp.status_code == 200
   199	        item = resp.json()["data"][0]
   200	        assert item["type"] == "practice"
   201	        assert item["data"]["is_brewing"] is True
   202	        assert item["feed_reason"] == "new_release"
   203	
   204	    def test_feed_reason_checked_in(self, client):
   205	        """checkin item has feed_reason=checked_in."""
   206	        mock_return = {"data": [CHECKIN_ITEM], "next_cursor": None}
   207	        with patch(SERVICE_PATH, return_value=mock_return):
   208	            resp = client.get("/api/v1/feed")
   209	
   210	        assert resp.status_code == 200
   211	        item = resp.json()["data"][0]
   212	        assert item["type"] == "checkin"
   213	        assert item["feed_reason"] == "checked_in"

 succeeded in 0ms:
   280	    @staticmethod
   281	    def _parse_dual_cursor(
   282	        cursor: Optional[str],
   283	    ) -> tuple[Optional[str], Optional[int], Optional[str], Optional[int]]:
   284	        """Parse dual cursor format: '{practice_part}|{checkin_part}'."""
   285	        if not cursor:
   286	            return None, None, None, None
   287	        if "|" in cursor:
   288	            p_part, c_part = cursor.split("|", 1)
   289	        else:
   290	            p_part, c_part = cursor, ""
   291	        p_time, p_id = FeedService._parse_cursor_part(p_part)
   292	        c_time, c_id = FeedService._parse_cursor_part(c_part)
   293	        return p_time, p_id, c_time, c_id
   294	
   295	    @staticmethod
   296	    def _fetch_practice_pool(
   297	        db: Session,
   298	        cursor_time: Optional[str],
   299	        cursor_id: Optional[int],
   300	        limit: int,
   301	        keyword: Optional[str] = None,
   302	        tags: Optional[list[str]] = None,
   303	    ) -> list:
   304	        where_clauses = [
   305	            "p.privacy_status = 'public'",
   306	            "p.status IN ('active', 'completed')",
   307	            "p.deleted_at IS NULL",
   308	        ]
   309	        bind_params: dict = {"limit": limit}
   310	
   311	        if cursor_time and cursor_id is not None:
   312	            where_clauses.append(
   313	                "(p.created_at < CAST(:p_cursor_time AS timestamptz)"
   314	                " OR (p.created_at = CAST(:p_cursor_time AS timestamptz) AND p.id < :p_cursor_id))"
   315	            )
   316	            bind_params["p_cursor_time"] = cursor_time
   317	            bind_params["p_cursor_id"] = cursor_id
   318	
   319	        if keyword:
   320	            escaped = (
   321	                keyword.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
   322	            )
   323	            where_clauses.append(
   324	                "(p.title ILIKE :keyword OR p.practice_action ILIKE :keyword)"
   325	            )
   326	            bind_params["keyword"] = f"%{escaped}%"
   327	
   328	        if tags:
   329	            where_clauses.append(
   330	                "EXISTS (SELECT 1 FROM entity_tags et JOIN tags t ON t.id = et.tag_id"
   331	                " WHERE et.entity_type = 'practice' AND et.entity_id = p.id AND t.name = ANY(:tags))"
   332	            )
   333	            bind_params["tags"] = tags
   334	
   335	        where_sql = " AND ".join(where_clauses)
   336	        sql = f"""
   337	            SELECT p.id AS item_id, p.created_at AS sort_time
   338	            FROM practices p
   339	            WHERE {where_sql}
   340	            ORDER BY p.created_at DESC, p.id DESC
   341	            LIMIT :limit
   342	        """
   343	        return db.execute(text(sql), bind_params).fetchall()
   344	
   345	    @staticmethod
   346	    def _fetch_checkin_pool_with_counts(
   347	        db: Session,
   348	        cursor_time: Optional[str],
   349	        cursor_id: Optional[int],
   350	        limit: int,
   351	        keyword: Optional[str] = None,
   352	        tags: Optional[list[str]] = None,
   353	    ) -> list:
   354	        """Fetch checkins with reactions_count + comments_count for Slot A count logic."""
   355	        where_clauses = [
   356	            "p.privacy_status = 'public'",
   357	            "p.status IN ('active', 'completed')",
   358	            "p.deleted_at IS NULL",
   359	        ]
   360	        bind_params: dict = {"limit": limit}
   361	
   362	        if cursor_time and cursor_id is not None:
   363	            where_clauses.append(
   364	                "(c.created_at < CAST(:c_cursor_time AS timestamptz)"
   365	                " OR (c.created_at = CAST(:c_cursor_time AS timestamptz) AND c.id < :c_cursor_id))"
   366	            )
   367	            bind_params["c_cursor_time"] = cursor_time
   368	            bind_params["c_cursor_id"] = cursor_id
   369	
   370	        if keyword:
   371	            escaped = (
   372	                keyword.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
   373	            )
   374	            where_clauses.append("c.note ILIKE :keyword")
   375	            bind_params["keyword"] = f"%{escaped}%"
   376	
   377	        if tags:
   378	            where_clauses.append(
   379	                "EXISTS (SELECT 1 FROM entity_tags et JOIN tags t ON t.id = et.tag_id"
   380	                " WHERE et.entity_type = 'practice' AND et.entity_id = c.practice_id"
   381	                " AND t.name = ANY(:tags))"
   382	            )
   383	            bind_params["tags"] = tags
   384	
   385	        where_sql = " AND ".join(where_clauses)
   386	        sql = f"""
   387	            SELECT
   388	                c.id AS item_id,
   389	                c.created_at AS sort_time,
   390	                c.user_id,
   391	                COUNT(DISTINCT r.id) AS reactions_count,
   392	                COUNT(DISTINCT cm.id) AS comments_count
   393	            FROM practice_checkins c
   394	            JOIN practices p ON p.id = c.practice_id
   395	            LEFT JOIN reactions r ON r.target_type = 'checkin' AND r.target_id = c.id
   396	            LEFT JOIN comments cm
   397	                ON cm.target_type = 'checkin' AND cm.target_id = c.id
   398	                AND cm.visibility = 'public'
   399	            WHERE {where_sql}
   400	            GROUP BY c.id, c.created_at, c.user_id
   401	            ORDER BY c.created_at DESC, c.id DESC
   402	            LIMIT :limit
   403	        """
   404	        return db.execute(text(sql), bind_params).fetchall()
   405	
   406	    @staticmethod
   407	    def _select_slot_a(available: list) -> tuple[list, int]:
   408	        """
   409	        Select 1 or 2 checkins for Slot A from the front of the available pool.
   410	
   411	        Priority:
   412	          1. Hot (reactions >= 1 or comments >= 1) → 1 item
   413	          2. Cold start, pool >= 2, different user_ids → 2 items
   414	          3. Fallback → 1 item; empty pool → 0 items (skip slot)
   415	        """
   416	        if not available:
   417	            return [], 0
   418	
   419	        first = available[0]
   420	        is_hot = first.reactions_count >= 1 or first.comments_count >= 1
   421	
   422	        if is_hot:
   423	            return [first], 1
   424	
   425	        # Cold start: two items with different owners
   426	        if len(available) >= 2 and available[1].user_id != first.user_id:
   427	            return [first, available[1]], 2
   428	
   429	        return [first], 1
   430	
   431	    @staticmethod
   432	    def _assemble_slot_cycles(
   433	        practice_rows: list,
   434	        checkin_rows: list,
   435	        num_cycles: int,
   436	    ) -> tuple[list[dict], int, int]:
   437	        """
   438	        Assemble A→B→C→C→C cycles (Slot B skipped for MVP).
   439	
   440	        Returns (slot_assignments, p_idx_consumed, c_idx_consumed).
   441	        Stops if fewer than 3 practices remain for Slot C.
   442	        Skips Slot A if checkin pool is exhausted.
   443	        """
   444	        slots: list[dict] = []
   445	        p_idx = 0
   446	        c_idx = 0
   447	
   448	        for _ in range(num_cycles):
   449	            # Slot C requires 3 practices; stop if not enough
   450	            if p_idx + 3 > len(practice_rows):
   451	                break
   452	
   453	            # Slot A: checkins (skip if pool empty)
   454	            if c_idx < len(checkin_rows):
   455	                a_rows, consumed = FeedService._select_slot_a(checkin_rows[c_idx:])
   456	                c_idx += consumed
   457	                for row in a_rows:
   458	                    slots.append(
   459	                        {
   460	                            "slot_type": SlotType.A,
   461	                            "item_type": "checkin",
   462	                            "item_id": row.item_id,
   463	                        }
   464	                    )
   465	
   466	            # Slot B: skipped for MVP
   467	
   468	            # Slot C: 3 practices
   469	            for i in range(3):
   470	                slots.append(
   471	                    {
   472	                        "slot_type": SlotType.C,
   473	                        "item_type": "practice",
   474	                        "item_id": practice_rows[p_idx + i].item_id,
   475	                    }
   476	                )
   477	            p_idx += 3
   478	
   479	        return slots, p_idx, c_idx
   480	
   481	    # =========================================================================
   482	    # Batch fetch helpers
   483	    # =========================================================================
   484	
   485	    @staticmethod
   486	    def _batch_fetch_practices(db: Session, ids: list[int]) -> dict:
   487	        """Batch fetch practices with user info (沿用 routers/users.py pattern)"""
   488	        if not ids:
   489	            return {}
   490	
   491	        rows = db.execute(
   492	            text(
   493	                """
   494	                SELECT
   495	                    p.id,
   496	                    p.external_id,
   497	                    p.title,
   498	                    p.status,
   499	                    p.privacy_status,
   500	                    p.practice_action,
   501	                    p.start_date::text AS start_date,
   502	                    p.end_date::text AS end_date,
   503	                    p.frequency_min_days,
   504	                    p.frequency_max_days,
   505	                    p.session_duration_minutes,
   506	                    p.created_at,
   507	                    u.external_id AS user_external_id,
   508	                    u.nickname AS user_name,
   509	                    ct.photo_url AS user_photo_url
   510	                FROM practices p
   511	                JOIN users u ON u.id = p.user_id
   512	                LEFT JOIN contacts ct ON ct.id = u.contact_id
   513	                WHERE p.id IN :ids
   514	            """
   515	            ).bindparams(bindparam("ids", expanding=True)),
   516	            {"ids": ids},
   517	        ).fetchall()
   518	
   519	        result = {}
   520	        for r in rows:

exec
/bin/zsh -lc "nl -ba daodao-f2e/packages/api/src/services/feed-hooks.ts | sed -n '1,180p'" in /Users/xiaoxu/Projects/daodao
 succeeded in 0ms:
     1	"use client";
     2	
     3	/**
     4	 * Feed API Hooks
     5	 * - 統一 Feed: AI backend GET /api/v1/feed (infinite scroll)
     6	 * - 混合 practice + checkin 卡片
     7	 */
     8	
     9	import useSWRInfinite from "swr/infinite";
    10	import type { IReactionCountItem, IShowcasePractice } from "./showcase-hooks";
    11	import { fetchAiBackend } from "./showcase-hooks";
    12	
    13	// ============================================================================
    14	// Types
    15	// ============================================================================
    16	
    17	export type ApiMoodType = "give_up" | "frustrated" | "bored" | "neutral" | "good" | "happy";
    18	
    19	export interface IShowcaseCheckIn {
    20	  id: string;
    21	  checkin_date: string;
    22	  mood: ApiMoodType;
    23	  note: string;
    24	  tags: string[];
    25	  image_urls: string[];
    26	  created_at: string;
    27	  practice: {
    28	    id: string;
    29	    title: string;
    30	  };
    31	  user?: {
    32	    id: string;
    33	    name: string;
    34	    photo_url?: string | null;
    35	  };
    36	  reactions?: IReactionCountItem[];
    37	  comment_count?: number;
    38	  comment_preview?: {
    39	    id: string;
    40	    content: string;
    41	    created_at: string;
    42	    user?: {
    43	      id: string;
    44	      name: string;
    45	      photo_url?: string | null;
    46	    };
    47	  }[];
    48	}
    49	
    50	export type FeedReasonType = "new_practice" | "new_release" | "checked_in" | "cheered";
    51	
    52	export type FeedItem =
    53	  | { type: "practice"; data: IShowcasePractice; feed_reason?: FeedReasonType }
    54	  | { type: "checkin"; data: IShowcaseCheckIn; feed_reason?: FeedReasonType };
    55	
    56	export interface IFeedParams {
    57	  keyword?: string;
    58	  tags?: string[];
    59	  type?: "all" | "practice" | "checkin";
    60	}
    61	
    62	// ============================================================================
    63	// AI backend response shape
    64	// ============================================================================
    65	
    66	interface AIFeedResponse {
    67	  success: boolean;
    68	  data?: FeedItem[];
    69	  pagination?: {
    70	    cursors?: { start?: string | null; end?: string | null } | null;
    71	    hasNext: boolean | null;
    72	    hasPrev: boolean | null;
    73	    count: number | null;
    74	  } | null;
    75	}
    76	
    77	// ============================================================================
    78	// Hook
    79	// ============================================================================
    80	
    81	export function useFeed(params: IFeedParams) {
    82	  const getKey = (pageIndex: number, previousPageData: AIFeedResponse | null) => {
    83	    if (previousPageData && !previousPageData.pagination?.hasNext) return null;
    84	
    85	    const searchParams = new URLSearchParams();
    86	    if (params.keyword) searchParams.set("keyword", params.keyword);
    87	    if (params.tags?.length) {
    88	      for (const tag of params.tags) searchParams.append("tags", tag);
    89	    }
    90	    if (params.type && params.type !== "all") {
    91	      searchParams.set("type", params.type);
    92	    }
    93	    if (pageIndex > 0 && previousPageData?.pagination?.cursors?.end) {
    94	      searchParams.set("cursor", previousPageData.pagination.cursors.end);
    95	    }
    96	
    97	    const qs = searchParams.toString();
    98	    return `/api/v1/feed${qs ? `?${qs}` : ""}`;
    99	  };
   100	
   101	  const { data, error, size, setSize, isLoading, isValidating } = useSWRInfinite<AIFeedResponse>(
   102	    getKey,
   103	    (path: string) => fetchAiBackend<AIFeedResponse>(path),
   104	    { revalidateFirstPage: false }
   105	  );
   106	
   107	  const feedItems: FeedItem[] = data
   108	    ? data.flatMap((page) =>
   109	        (page.data ?? []).filter((item) => {
   110	          const isValid = !!(item?.type && item?.data);
   111	          if (!isValid && process.env.NODE_ENV !== "production") {
   112	            console.warn("[useFeed] Malformed feed item (missing type/data):", item);
   113	          }
   114	          return isValid;
   115	        })
   116	      )
   117	    : [];
   118	
   119	  const hasMore = data ? (data[data.length - 1]?.pagination?.hasNext ?? false) : false;
   120	
   121	  const loadMore = () => setSize(size + 1);
   122	
   123	  return {
   124	    feedItems,
   125	    error,
   126	    isLoading,
   127	    isValidating,
   128	    hasMore,
   129	    loadMore,
   130	    size,
   131	  };
   132	}

exec
/bin/zsh -lc "nl -ba 'daodao-f2e/apps/product/src/app/[locale]/(with-layout)/page.tsx' | sed -n '1,340p'" in /Users/xiaoxu/Projects/daodao
exec
/bin/zsh -lc "nl -ba daodao-f2e/packages/api/src/ai-types.ts | sed -n '188,210p'" in /Users/xiaoxu/Projects/daodao
 succeeded in 0ms:
   188	    trace?: never;
   189	  };
   190	}
   191	export type webhooks = Record<string, never>;
   192	export interface components {
   193	  schemas: {
   194	    /**
   195	     * FeedReasonType
   196	     * @enum {string}
   197	     */
   198	    FeedReasonType: "new_practice" | "new_release" | "checked_in" | "cheered";
   199	    /** APIResponse */
   200	    APIResponse: {
   201	      /** Success */
   202	      success: boolean;
   203	      /** Data */
   204	      data?: unknown | null;
   205	      error?: components["schemas"]["ErrorInfo"] | null;
   206	      pagination?: components["schemas"]["CursorPaginationInfo"] | null;
   207	      /** Timestamp */
   208	      timestamp: string;
   209	      /** Requestid */
   210	      requestId: string;

 succeeded in 0ms:
     1	"use client";
     2	
     3	import {
     4	  type FeedItem,
     5	  useFeed,
     6	  useMyPracticeStats,
     7	  useMyPractices,
     8	  useReactionsBatch,
     9	} from "@daodao/api";
    10	import { MessagesSvg } from "@daodao/assets";
    11	import { useRouter, useSearchParams } from "@daodao/i18n/navigation";
    12	import { cn } from "@daodao/ui/lib/utils";
    13	import { CheckCircle2 } from "lucide-react";
    14	import { useCallback, useEffect, useMemo, useRef, useState } from "react";
    15	import {
    16	  AddTaskFAB,
    17	  DashboardHeader,
    18	  InProgressSection,
    19	  type InProgressTask,
    20	  RecommendationSection,
    21	} from "@/components/dashboard";
    22	import { BackgroundAnimation, Banner } from "@/components/layout";
    23	import { RandomPracticesSection } from "@/components/practice/shared/random-practices-section";
    24	import {
    25	  BrewingCard,
    26	  CheckInShowcaseCard,
    27	  FeedLabel,
    28	  PracticeShowcaseCard,
    29	  type ShowcaseFilterState,
    30	  ShowcaseSearchBar,
    31	} from "@/components/showcase";
    32	import {
    33	  FilterStatus,
    34	  type FilterStatus as FilterStatusType,
    35	  mapPracticeStatusToTaskStatus,
    36	} from "@/constants/task-status";
    37	
    38	type TabType = "inspire" | "mine";
    39	
    40	const filterOptions = [
    41	  { value: FilterStatus.all, label: "全部" },
    42	  { value: FilterStatus.draft, label: "草稿" },
    43	  { value: FilterStatus.notStarted, label: "未開始" },
    44	  { value: FilterStatus.inProgress, label: "進行中" },
    45	  { value: FilterStatus.completed, label: "已完成" },
    46	];
    47	
    48	export default function HomePage() {
    49	  const router = useRouter();
    50	  const searchParams = useSearchParams();
    51	
    52	  const [activeTab, setActiveTab] = useState<TabType>("inspire");
    53	  const [searchValue, setSearchValue] = useState(searchParams.get("keyword") ?? "");
    54	  const [filters, _setFilters] = useState<ShowcaseFilterState>({
    55	    tags: searchParams.getAll("tags[]"),
    56	  });
    57	  const [keyword, setKeyword] = useState(searchParams.get("keyword") ?? "");
    58	  const [filterStatus, setFilterStatus] = useState<FilterStatusType>(FilterStatus.all);
    59	
    60	  // Sync URL params
    61	  const updateUrlParams = useCallback(
    62	    (kw: string, f: ShowcaseFilterState) => {
    63	      const params = new URLSearchParams();
    64	      if (kw) params.set("keyword", kw);
    65	      for (const tag of f.tags) {
    66	        params.append("tags[]", tag);
    67	      }
    68	      const qs = params.toString();
    69	      router.replace(qs ? `?${qs}` : "?", { scroll: false });
    70	    },
    71	    [router]
    72	  );
    73	
    74	  const handleSearch = useCallback(
    75	    (value: string) => {
    76	      setKeyword(value);
    77	      updateUrlParams(value, filters);
    78	    },
    79	    [filters, updateUrlParams]
    80	  );
    81	
    82	  // Feed (practice + checkin)
    83	  const feedParams = useMemo(
    84	    () => ({
    85	      keyword: keyword || undefined,
    86	      tags: filters.tags.length > 0 ? filters.tags : undefined,
    87	    }),
    88	    [keyword, filters]
    89	  );
    90	
    91	  const {
    92	    feedItems,
    93	    isLoading: isShowcaseLoading,
    94	    hasMore,
    95	    loadMore,
    96	    isValidating,
    97	  } = useFeed(feedParams);
    98	
    99	  // Batch fetch reactions for all visible practices
   100	  const practiceIds = useMemo(
   101	    () =>
   102	      feedItems
   103	        .filter((item): item is Extract<FeedItem, { type: "practice" }> => item.type === "practice")
   104	        .map((item) => item.data.id),
   105	    [feedItems]
   106	  );
   107	  const { data: batchReactionsData, mutate: mutateBatchReactions } = useReactionsBatch({
   108	    targetType: "practice",
   109	    targetIds: practiceIds,
   110	  });
   111	
   112	  // Infinite scroll observer
   113	  const sentinelRef = useRef<HTMLDivElement>(null);
   114	  useEffect(() => {
   115	    const el = sentinelRef.current;
   116	    if (!el) return;
   117	    const observer = new IntersectionObserver(
   118	      (entries) => {
   119	        if (entries[0]?.isIntersecting && hasMore && !isValidating) {
   120	          loadMore();
   121	        }
   122	      },
   123	      { threshold: 0.1 }
   124	    );
   125	    observer.observe(el);
   126	    return () => observer.disconnect();
   127	  }, [hasMore, isValidating, loadMore]);
   128	
   129	  // My practices
   130	  const { data: allPracticesData, isLoading: isMyLoading } = useMyPractices({ limit: 16 });
   131	  const { data: statsData } = useMyPracticeStats();
   132	
   133	  const { inProgressTasks } = useMemo(() => {
   134	    const practices = allPracticesData?.data || [];
   135	    const inProgressTasksData: InProgressTask[] = [];
   136	
   137	    practices.forEach((practice) => {
   138	      const lastCheckInDate = practice.lastCheckinAt ?? null;
   139	      inProgressTasksData.push({
   140	        id: practice.id,
   141	        label: "主題實踐",
   142	        title: practice.title,
   143	        description: practice.practiceAction || "",
   144	        checkInCount: practice.checkInCount,
   145	        progress: practice.progressPercentage ?? 0,
   146	        messagesCount: 0,
   147	        isUnreadMessages: false,
   148	        theme: practice.themeColor || "#FCDD84",
   149	        status: mapPracticeStatusToTaskStatus(practice.status),
   150	        lastCheckInDate,
   151	        startDate: practice.startDate || null,
   152	        endDate: practice.endDate || null,
   153	      });
   154	    });
   155	
   156	    return { inProgressTasks: inProgressTasksData };
   157	  }, [allPracticesData]);
   158	
   159	  const filteredInProgressTasks = useMemo(() => {
   160	    if (filterStatus === FilterStatus.completed)
   161	      return inProgressTasks.filter((task) => task.status === FilterStatus.completed);
   162	    if (filterStatus === FilterStatus.all)
   163	      return inProgressTasks.filter((task) => task.status !== FilterStatus.completed);
   164	    return inProgressTasks.filter((task) => task.status === filterStatus);
   165	  }, [inProgressTasks, filterStatus]);
   166	
   167	  const stats = useMemo(() => {
   168	    const statsDataValue = statsData?.data;
   169	    return [
   170	      {
   171	        label: "連續登入",
   172	        value: String(statsDataValue?.currentStreak || 0),
   173	        unit: "天",
   174	        icon: CheckCircle2,
   175	      },
   176	      {
   177	        label: "獲得迴響",
   178	        value: String(statsDataValue?.totalCheckIns || 0),
   179	        unit: "次",
   180	        icon: MessagesSvg,
   181	      },
   182	    ];
   183	  }, [statsData]);
   184	
   185	  const hasPractices = inProgressTasks.length > 0;
   186	  const showInProgress = true;
   187	
   188	  return (
   189	    <div className="relative min-h-screen">
   190	      <Banner />
   191	      <BackgroundAnimation />
   192	
   193	      <main className="relative z-[25] pb-[72px] bg-very-light-gray">
   194	        <div className="max-w-[640px] px-4 mx-auto pt-4">
   195	          {/* Tab Switcher */}
   196	          <div className="flex border-b border-[#E5E7EB] mb-4">
   197	            <button
   198	              type="button"
   199	              onClick={() => setActiveTab("inspire")}
   200	              className={cn(
   201	                "flex-1 py-2 text-sm font-medium transition-all",
   202	                activeTab === "inspire"
   203	                  ? "text-text-dark border-b-2 border-logo-cyan -mb-px"
   204	                  : "text-text-dark/40"
   205	              )}
   206	            >
   207	              靈感
   208	            </button>
   209	            <button
   210	              type="button"
   211	              onClick={() => setActiveTab("mine")}
   212	              className={cn(
   213	                "flex-1 py-2 text-sm font-medium transition-all",
   214	                activeTab === "mine"
   215	                  ? "text-text-dark border-b-2 border-logo-cyan -mb-px"
   216	                  : "text-text-dark/40"
   217	              )}
   218	            >
   219	              我的
   220	            </button>
   221	          </div>
   222	
   223	          {/* 靈感 Tab */}
   224	          {activeTab === "inspire" && (
   225	            <>
   226	              <div className="mb-3">
   227	                <ShowcaseSearchBar
   228	                  value={searchValue}
   229	                  onChange={setSearchValue}
   230	                  onSearch={handleSearch}
   231	                />
   232	              </div>
   233	
   234	              {isShowcaseLoading && feedItems.length === 0 ? (
   235	                <div className="flex flex-col gap-3">
   236	                  {[1, 2, 3].map((i) => (
   237	                    <div
   238	                      key={i}
   239	                      className="bg-white rounded-2xl p-4 h-48 animate-pulse border border-[#E8F8FF]"
   240	                    />
   241	                  ))}
   242	                </div>
   243	              ) : (
   244	                <div className="flex flex-col gap-3">
   245	                  {feedItems.map((feedItem, index) => {
   246	                    const isNewRelease = feedItem.feed_reason === "new_release";
   247	                    const prevIsNewRelease = index > 0 && feedItems[index - 1]?.feed_reason === "new_release";
   248	                    const showFeedLabel = !isNewRelease || !prevIsNewRelease;
   249	
   250	                    if (feedItem.type === "checkin") {
   251	                      const checkin = feedItem.data;
   252	                      return (
   253	                        <div key={checkin.id}>
   254	                          {showFeedLabel && feedItem.feed_reason && (
   255	                            <FeedLabel
   256	                              feedReason={feedItem.feed_reason}
   257	                              userName={checkin.user?.name}
   258	                              practiceTitle={checkin.practice?.title}
   259	                            />
   260	                          )}
   261	                          <CheckInShowcaseCard
   262	                            id={checkin.id}
   263	                            checkin_date={checkin.checkin_date}
   264	                            mood={checkin.mood}
   265	                            note={checkin.note}
   266	                            tags={checkin.tags}
   267	                            image_urls={checkin.image_urls}
   268	                            created_at={checkin.created_at}
   269	                            practice={checkin.practice}
   270	                            user={checkin.user}
   271	                            comment_count={checkin.comment_count}
   272	                            comment_preview={checkin.comment_preview}
   273	                            batchReactionData={batchReactionsData?.data?.[checkin.id]}
   274	                          />
   275	                        </div>
   276	                      );
   277	                    }
   278	
   279	                    if (feedItem.type === "practice") {
   280	                      const practice = feedItem.data;
   281	                      const latestActorName = practice.reactions
   282	                        ?.find((r) => r.latestActorName)?.latestActorName;
   283	                      return (
   284	                        <div key={practice.id}>
   285	                          {showFeedLabel && feedItem.feed_reason && (
   286	                            <FeedLabel
   287	                              feedReason={feedItem.feed_reason}
   288	                              userName={practice.user?.name}
   289	                              latestActorName={latestActorName}
   290	                            />
   291	                          )}
   292	                          {practice.is_brewing ? (
   293	                            <BrewingCard
   294	                              id={practice.id}
   295	                              title={practice.title}
   296	                              startDate={practice.start_date}
   297	                              endDate={practice.end_date}
   298	                              user={
   299	                                practice.user
   300	                                  ? {
   301	                                      id: practice.user.id,
   302	                                      name: practice.user.name,
   303	                                      photoUrl: practice.user.photo_url,
   304	                                    }
   305	                                  : undefined
   306	                              }
   307	                              actionDescription={practice.practice_action}
   308	                              frequencyMinDays={practice.frequency_min_days}
   309	                              frequencyMaxDays={practice.frequency_max_days}
   310	                              sessionDurationMinutes={practice.session_duration_minutes}
   311	                              commentCount={practice.comment_count}
   312	                              batchReactionData={batchReactionsData?.data?.[practice.id]}
   313	                              onReactionMutate={() => mutateBatchReactions()}
   314	                            />
   315	                          ) : (
   316	                            <PracticeShowcaseCard
   317	                              id={practice.id}
   318	                              title={practice.title}
   319	                              status={practice.status}
   320	                              startDate={practice.start_date}
   321	                              endDate={practice.end_date}
   322	                              user={
   323	                                practice.user
   324	                                  ? {
   325	                                      id: practice.user.id,
   326	                                      name: practice.user.name,
   327	                                      photoUrl: practice.user.photo_url,
   328	                                    }
   329	                                  : undefined
   330	                              }
   331	                              actionDescription={practice.practice_action}
   332	                              frequencyMinDays={practice.frequency_min_days}
   333	                              frequencyMaxDays={practice.frequency_max_days}
   334	                              sessionDurationMinutes={practice.session_duration_minutes}
   335	                              commentCount={practice.comment_count}
   336	                              batchReactionData={batchReactionsData?.data?.[practice.id]}
   337	                              onReactionMutate={() => mutateBatchReactions()}
   338	                            />
   339	                          )}
   340	                        </div>

exec
/bin/zsh -lc "nl -ba daodao-f2e/packages/api/src/ai-types.ts | sed -n '350,390p'" in /Users/xiaoxu/Projects/daodao
 succeeded in 0ms:
   350	}
   351	export type $defs = Record<string, never>;
   352	export interface operations {
   353	  get_feed_api_v1_feed_get: {
   354	    parameters: {
   355	      query?: {
   356	        /** @description 關鍵字搜尋 */
   357	        keyword?: string | null;
   358	        /** @description 標籤篩選 */
   359	        tags?: string[] | null;
   360	        /** @description feed 類型（all / practice / checkin） */
   361	        type?: string | null;
   362	        /** @description cursor-based 分頁 */
   363	        cursor?: string | null;
   364	      };
   365	      header?: never;
   366	      path?: never;
   367	      cookie?: never;
   368	    };
   369	    requestBody?: never;
   370	    responses: {
   371	      /** @description Successful Response */
   372	      200: {
   373	        headers: {
   374	          [name: string]: unknown;
   375	        };
   376	        content: {
   377	          "application/json": components["schemas"]["APIResponse"];
   378	        };
   379	      };
   380	      /** @description Validation Error */
   381	      422: {
   382	        headers: {
   383	          [name: string]: unknown;
   384	        };
   385	        content: {
   386	          "application/json": components["schemas"]["HTTPValidationError"];
   387	        };
   388	      };
   389	    };
   390	  };

codex
我已完成靜態比對。最後再跑一次最小驗證指令，確認至少目前的 feed router test 狀態，不只看程式碼。
exec
/bin/zsh -lc 'pytest daodao-ai-backend/tests/routers/test_feed.py' in /Users/xiaoxu/Projects/daodao
exec
/bin/zsh -lc 'cd daodao-f2e && pnpm -s exec tsc --noEmit --pretty false' in /Users/xiaoxu/Projects/daodao
 exited 2 in 356ms:
============================= test session starts ==============================
platform darwin -- Python 3.14.2, pytest-9.0.2, pluggy-1.6.0
rootdir: /Users/xiaoxu/Projects/daodao/daodao-ai-backend
configfile: pyproject.toml
plugins: mock-3.15.1
collected 0 items / 1 error

==================================== ERRORS ====================================
_________________ ERROR collecting tests/routers/test_feed.py __________________
ImportError while importing test module '/Users/xiaoxu/Projects/daodao/daodao-ai-backend/tests/routers/test_feed.py'.
Hint: make sure your test modules/packages have valid Python names.
Traceback:
/opt/homebrew/Cellar/python@3.14/3.14.2/Frameworks/Python.framework/Versions/3.14/lib/python3.14/importlib/__init__.py:88: in import_module
    return _bootstrap._gcd_import(name[level:], package, level)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
daodao-ai-backend/tests/routers/test_feed.py:8: in <module>
    from fastapi import FastAPI
E   ModuleNotFoundError: No module named 'fastapi'
=========================== short test summary info ============================
ERROR daodao-ai-backend/tests/routers/test_feed.py
!!!!!!!!!!!!!!!!!!!! Interrupted: 1 error during collection !!!!!!!!!!!!!!!!!!!!
=============================== 1 error in 0.08s ===============================

 exited 1 in 787ms:
Version 5.9.3
tsc: The TypeScript Compiler - Version 5.9.3

COMMON COMMANDS

  tsc
  Compiles the current project (tsconfig.json in the working directory.)

  tsc app.ts util.ts
  Ignoring tsconfig.json, compiles the specified files with default compiler options.

  tsc -b
  Build a composite project in the working directory.

  tsc --init
  Creates a tsconfig.json with the recommended settings in the working directory.

  tsc -p ./path/to/tsconfig.json
  Compiles the TypeScript project located at the specified path.

  tsc --help --all
  An expanded version of this information, showing all possible compiler options

  tsc --noEmit
  tsc --target esnext
  Compiles the current project, with additional settings.

COMMAND LINE FLAGS

--help, -h
Print this message.

--watch, -w
Watch input files.

--all
Show all compiler options.

--version, -v
Print the compiler's version.

--init
Initializes a TypeScript project and creates a tsconfig.json file.

--project, -p
Compile the project given the path to its configuration file, or to a folder with a 'tsconfig.json'.

--showConfig
Print the final configuration instead of building.

--build, -b
Build one or more projects and their dependencies, if out of date

COMMON COMPILER OPTIONS

--pretty
Enable color and formatting in TypeScript's output to make compiler errors easier to read.
type: boolean
default: true

--declaration, -d
Generate .d.ts files from TypeScript and JavaScript files in your project.
type: boolean
default: `false`, unless `composite` is set

--declarationMap
Create sourcemaps for d.ts files.
type: boolean
default: false

--emitDeclarationOnly
Only output d.ts files and not JavaScript files.
type: boolean
default: false

--sourceMap
Create source map files for emitted JavaScript files.
type: boolean
default: false

--noEmit
Disable emitting files from a compilation.
type: boolean
default: false

--target, -t
Set the JavaScript language version for emitted JavaScript and include compatible library declarations.
one of: es5, es6/es2015, es2016, es2017, es2018, es2019, es2020, es2021, es2022, es2023, es2024, esnext
default: es5

--module, -m
Specify what module code is generated.
one of: none, commonjs, amd, umd, system, es6/es2015, es2020, es2022, esnext, node16, node18, node20, nodenext, preserve
default: undefined

--lib
Specify a set of bundled library declaration files that describe the target runtime environment.
one or more: es5, es6/es2015, es7/es2016, es2017, es2018, es2019, es2020, es2021, es2022, es2023, es2024, esnext, dom, dom.iterable, dom.asynciterable, webworker, webworker.importscripts, webworker.iterable, webworker.asynciterable, scripthost, es2015.core, es2015.collection, es2015.generator, es2015.iterable, es2015.promise, es2015.proxy, es2015.reflect, es2015.symbol, es2015.symbol.wellknown, es2016.array.include, es2016.intl, es2017.arraybuffer, es2017.date, es2017.object, es2017.sharedmemory, es2017.string, es2017.intl, es2017.typedarrays, es2018.asyncgenerator, es2018.asynciterable/esnext.asynciterable, es2018.intl, es2018.promise, es2018.regexp, es2019.array, es2019.object, es2019.string, es2019.symbol/esnext.symbol, es2019.intl, es2020.bigint/esnext.bigint, es2020.date, es2020.promise, es2020.sharedmemory, es2020.string, es2020.symbol.wellknown, es2020.intl, es2020.number, es2021.promise, es2021.string, es2021.weakref/esnext.weakref, es2021.intl, es2022.array, es2022.error, es2022.intl, es2022.object, es2022.string, es2022.regexp, es2023.array, es2023.collection, es2023.intl, es2024.arraybuffer, es2024.collection, es2024.object/esnext.object, es2024.promise, es2024.regexp/esnext.regexp, es2024.sharedmemory, es2024.string/esnext.string, esnext.array, esnext.collection, esnext.intl, esnext.disposable, esnext.promise, esnext.decorators, esnext.iterator, esnext.float16, esnext.error, esnext.sharedmemory, decorators, decorators.legacy
default: undefined

--allowJs
Allow JavaScript files to be a part of your program. Use the 'checkJs' option to get errors from these files.
type: boolean
default: false

--checkJs
Enable error reporting in type-checked JavaScript files.
type: boolean
default: false

--jsx
Specify what JSX code is generated.
one of: preserve, react, react-native, react-jsx, react-jsxdev
default: undefined

--outFile
Specify a file that bundles all outputs into one JavaScript file. If 'declaration' is true, also designates a file that bundles all .d.ts output.

--outDir
Specify an output folder for all emitted files.

--removeComments
Disable emitting comments.
type: boolean
default: false

--strict
Enable all strict type-checking options.
type: boolean
default: false

--types
Specify type package names to be included without being referenced in a source file.

--esModuleInterop
Emit additional JavaScript to ease support for importing CommonJS modules. This enables 'allowSyntheticDefaultImports' for type compatibility.
type: boolean
default: false

You can learn about all of the compiler options at https://aka.ms/tsc


codex
`pytest` 沒有跑起來，因為本機目前缺 `fastapi` 依賴；`tsc` 這邊也沒有直接可用的 root `tsconfig`。我不再擴大環境排查，以下結論以程式碼比對為主，外加這兩個驗證結果。
codex
1. `daodao-ai-backend/src/schemas/feed.py`：✅ 符合。`FeedReasonType` 有 `new_practice` / `new_release` / `checked_in` / `cheered` 4 個值，[feed.py](/Users/xiaoxu/Projects/daodao/daodao-ai-backend/src/schemas/feed.py:9)。`SlotType` 有 `A` / `B` / `C` 3 個值，[feed.py](/Users/xiaoxu/Projects/daodao/daodao-ai-backend/src/schemas/feed.py:16)。

2. `daodao-ai-backend/src/services/feed/feed_service.py`：⚠️ 部分符合。`feed_reason` 已對 practice/checkin 注入，`is_brewing=True -> new_release`、否則 `new_practice`，checkin 固定 `checked_in`，[feed_service.py](/Users/xiaoxu/Projects/daodao/daodao-ai-backend/src/services/feed/feed_service.py:115)；Slot A 打卡則數判斷也有做，熱門打卡回 1 則、冷啟動且不同 user 可回 2 則，[feed_service.py](/Users/xiaoxu/Projects/daodao/daodao-ai-backend/src/services/feed/feed_service.py:407)。但 `cheered` 完全沒實作，沒有 reaction-based subquery，也沒有任何地方產生 `feed_reason="cheered"`。另外 Slot Pattern 實作明寫 `Slot B skipped for MVP`，[feed_service.py](/Users/xiaoxu/Projects/daodao/daodao-ai-backend/src/services/feed/feed_service.py:71)、[feed_service.py](/Users/xiaoxu/Projects/daodao/daodao-ai-backend/src/services/feed/feed_service.py:438)，所以實際是 A + C + C + C，不符合規劃的 A→B→C→C→C，也無法達到每頁完整 5～6 格循環。

3. `daodao-ai-backend/tests/routers/test_feed.py`：✅ 符合。已有 3 個 feed_reason 驗證 case，分別驗證 `new_practice`、`new_release`、`checked_in`，[test_feed.py](/Users/xiaoxu/Projects/daodao/daodao-ai-backend/tests/routers/test_feed.py:180)。但如果看 Wave 1 全部 AC，這份檔案仍缺 `cheered` 與 Slot Pattern/打卡則數判斷的測試。

4. `daodao-f2e/packages/api/src/services/feed-hooks.ts`：⚠️ 部分符合。`FeedItem` union 確實有 `feed_reason` 欄位，[feed-hooks.ts](/Users/xiaoxu/Projects/daodao/daodao-f2e/packages/api/src/services/feed-hooks.ts:52)。但它被定義成可選 `feed_reason?`，規劃 AC 2.1 要的是必填 `feed_reason: FeedReasonType`。

5. `daodao-f2e/packages/api/src/ai-types.ts`：⚠️ 部分符合。檔案內有 `FeedReasonType` enum 型別，[ai-types.ts](/Users/xiaoxu/Projects/daodao/daodao-f2e/packages/api/src/ai-types.ts:195)。但 `/api/v1/feed` 的 response 仍然只是 `components["schemas"]["APIResponse"]`，其中 `data` 是 `unknown`，[ai-types.ts](/Users/xiaoxu/Projects/daodao/daodao-f2e/packages/api/src/ai-types.ts:199)、[ai-types.ts](/Users/xiaoxu/Projects/daodao/daodao-f2e/packages/api/src/ai-types.ts:353)，沒有把 `feed_reason` 真正掛進 feed response schema，未完全符合 2.2。

6. `daodao-f2e/apps/product/src/app/[locale]/(with-layout)/page.tsx`：⚠️ 部分符合。已改用 `useFeed`、沒有 `useShowcaseFeed`，[page.tsx](/Users/xiaoxu/Projects/daodao/daodao-f2e/apps/product/src/app/[locale]/(with-layout)/page.tsx:91)；頁面也看不到 hardcoded mock checkin card；並且依 `feedItem.type` 分流渲染 `CheckInShowcaseCard` / `BrewingCard` / `PracticeShowcaseCard`，[page.tsx](/Users/xiaoxu/Projects/daodao/daodao-f2e/apps/product/src/app/[locale]/(with-layout)/page.tsx:245)；`new_release` 連續群組只顯示第一個 label 的邏輯也有，[page.tsx](/Users/xiaoxu/Projects/daodao/daodao-f2e/apps/product/src/app/[locale]/(with-layout)/page.tsx:246)。但 `FeedLabel` 的 `cheered` routing 不完整：checkin 分支傳給 `FeedLabel` 的只有 `userName` 和 `practiceTitle`，[page.tsx](/Users/xiaoxu/Projects/daodao/daodao-f2e/apps/product/src/app/[locale]/(with-layout)/page.tsx:255)，沒有 `latestActorName`；practice 分支則是從 `practice.reactions` 內硬找 actor name，[page.tsx](/Users/xiaoxu/Projects/daodao/daodao-f2e/apps/product/src/app/[locale]/(with-layout)/page.tsx:281)，這跟規劃中 cheered item 應由 feed response 明確提供 actor 資訊不一致。

補充：我有嘗試跑 `pytest daodao-ai-backend/tests/routers/test_feed.py`，但本機環境缺 `fastapi`，測試在 collect 階段就失敗，這次結論主要基於程式碼比對。
tokens used
62,086

```

## Concise summary

Provider completed successfully. Review the raw output for details.

## Action items

- Review the response and extract decisions you want to apply.
- Capture follow-up implementation tasks if needed.
