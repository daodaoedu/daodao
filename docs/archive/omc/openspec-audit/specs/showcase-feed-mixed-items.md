# showcase-feed-mixed-items
- 涉及 repo: ai-backend / f2e
- 對應 archived change: 無
- 總計: 8 條 requirement / 16 個 scenario | ✅8 ⚠️0 ❌0 ❓0

## Requirement: Feed API 回傳 feed_reason 欄位 → ✅
證據: daodao-ai-backend:src/services/feed/feed_service.py:170-180 — practice item 依 is_brewing/cheered 設 new_release/cheered/new_practice；:195 checkin 設 checked_in。
- Scenario: 新發布實踐 new_practice → ✅ — feed_service.py:175 else 分支 `FeedReasonType.new_practice`
- Scenario: 醞釀中 new_release → ✅ — feed_service.py:171 `if is_brewing: new_release`
- Scenario: 打卡 checked_in → ✅ — feed_service.py:195 `FeedReasonType.checked_in`
- Scenario: reaction cheered → ✅ — feed_service.py:172-173 `elif item_id in cheered_practice_ids: cheered`；cheered 由 `_batch_fetch_cheered_practice_ids` 依 reactions 計算

## Requirement: 靈感頁面使用統一 Feed endpoint → ✅
證據: daodao-f2e:apps/product/src/app/[locale]/(with-layout)/page.tsx:3 import `useFeed`；:150 `useFeed(feedParams)`。
- Scenario: 同時顯示實踐與打卡 → ✅ — page.tsx 渲染 type=practice 與 type=checkin（:330/:371）
- Scenario: 移除 hardcoded mock → ✅ — page.tsx 無 mock import，資料全來自 useFeed

## Requirement: FeedLabel 根據 feed_reason 動態渲染 → ✅
證據: daodao-f2e:apps/product/src/components/showcase/FeedLabel.tsx:20-66 — 四種 feed_reason 對應 ThumbsUp/Rss/CalendarCheck icon 與 i18n 文案。
- Scenario: new_practice FeedLabel → ✅ — FeedLabel.tsx:20 ThumbsUp + `showcase_feed_new_practice`
- Scenario: new_release FeedLabel → ✅ — :31 Rss + `showcase_latest_published`
- Scenario: checked_in FeedLabel → ✅ — :40 CalendarCheck + `showcase_feed_checked_in`(userName,practiceTitle)
- Scenario: cheered FeedLabel → ✅ — :54 ThumbsUp + `showcase_feed_cheered`(actorName=latestActorName)
- Scenario: feed_reason 缺失 fallback → ✅ — FeedLabel.tsx 結尾 `return null`（graceful）；page.tsx:334 額外條件 `feedItem.feed_reason &&` 才渲染

## Requirement: FeedItem TypeScript 型別包含 feed_reason → ✅
證據: daodao-f2e:packages/api/src/services/feed-hooks.ts:56/70-71 — `FeedReasonType` 與 discriminated union 含 `feed_reason: FeedReasonType`。
- Scenario: 型別安全存取 → ✅ — union type 無 any，feed-hooks.ts:70-71

## Requirement: cheered item 包含 latestActorName 欄位 → ✅
證據: daodao-ai-backend:src/services/feed/feed_service.py:1219/1237 — reactions JOIN 取 `latest_actor_name`，輸出 `latestActorName`；daodao-f2e:apps/product/.../page.tsx:322-327 讀取 latestActorName。
- Scenario: cheered item 帶 actor 名稱 → ✅ — feed_service.py:1237 `"latestActorName": r.latest_actor_name`
- Scenario: actor 名稱為空 fallback → ✅ — FeedLabel.tsx:60 `latestActorName ?? t("showcase_someone")`（「有人」）

## Requirement: showcase-feed 使用統一 endpoint (MODIFIED) → ✅
證據: daodao-f2e:apps/product/src/app/[locale]/(with-layout)/page.tsx:3 import useFeed，無 useShowcaseFeed。
- Scenario: 舊 hook 不再被靈感頁使用 → ✅ — page.tsx 未 import useShowcaseFeed（僅 apps/mobile 仍有舊 hook）
- Scenario: 無限滾動正常 → ✅ — page.tsx:148/150/218 `loadMore`；feed-hooks.ts:111-112 用 `pagination.cursors.end` 帶 cursor

## Requirement: new_release 群組 FeedLabel (MODIFIED) → ✅
證據: daodao-f2e:apps/product/src/app/[locale]/(with-layout)/page.tsx:314-318 — `isNewRelease` 且 `prevFeedReason !== "new_release"` 才顯示 FeedLabel。
- Scenario: 多個 new_release 連續 → ✅ — page.tsx:318 `showFeedLabel = !isNewRelease || prevFeedReason !== "new_release"`，僅第一個顯示
