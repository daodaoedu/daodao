# practice-feed
- 涉及 repo: ai-backend / server / f2e / storage
- 對應 archived change: 無（規格描述舊版 `/api/v1/users/practices` feed 來源，實作已演進至統一 `/api/v1/feed`）
- 總計: 5 條 requirement / 14 個 scenario | ✅3 ⚠️2 ❌0 ❓0

## Requirement: Practice privacy status → ✅
證據: daodao-ai-backend:src/models/Practice.py:80 — `privacy_status` 欄位 default `PRIVATE`；daodao-storage:migrate/sql/021_add_practices_privacy_status.sql 建立欄位。
- Scenario: 新練習預設為私人 → ✅ — model 預設 `PracticePrivacyStatus.PRIVATE.value`
- Scenario: 變更為即時公開 → ⚠️ — privacy_status 可設 public，feed 以 `p.privacy_status = 'public'` 過濾（feed_service.py:383/452/807），但「立即納入」由查詢即時反映，無顯式事件
- Scenario: 設定延遲分享 → ✅ — feed_service.py:1121 `is_brewing = privacy_status=='delayed' and status=='active'`，brewing 卡片隱藏打卡內容

## Requirement: Showcase feed API → ⚠️
證據: daodao-ai-backend:src/routers/users.py:27/102 仍存在 `/users/practices`；但靈感頁實際改用 daodao-ai-backend:src/routers/feed.py + src/services/feed/feed_service.py。
- 差異：規格指定 feed 來源為 `GET /api/v1/users/practices`，實作已改為統一 `/api/v1/feed`（見 showcase-feed-mixed-items 規格）。過濾條件（排除 draft/not_started/archived/private、只顯示 public+active/completed 與 delayed+active）在 feed_service.py:383/452/807 的 `privacy_status='public'` WHERE 可見，但 sort_by/keyword/tags/duration 過濾與規格欄位命名（newest_updated）需逐一驗證
- Scenario: 預設排序 → ⚠️ — feed 有 cursor 排序（sort_time），但 `sort_by=newest_updated` 參數未在 feed endpoint 確認
- Scenario: 不含草稿/未開始/已封存 → ✅ — WHERE `privacy_status='public'` 且 status 過濾（feed_service.py:383+）
- Scenario: 不含私人練習 → ✅ — WHERE `privacy_status='public'`/`delayed`，排除 private

## Requirement: Full Access Card data → ⚠️
證據: daodao-ai-backend:src/services/feed/feed_service.py:1099-1130 練習卡片組裝。
- 差異：實作回傳 snake_case `frequency_min_days`/`frequency_max_days`/`session_duration_minutes`（feed_service.py:1100-1105），而非規格的 camelCase `frequencyMinDays` 等。`cheer_display`/`cheer_count`/`is_cheered`/`last_checkin_summary` 欄位 grep 不到——改用 `reactions`（IReactionCount[]）陣列 + `comment_count`。狀態徽章/日期/標題/user/practice_action 有。
- Scenario: 含最新打卡摘要 → ❌→⚠️ — `last_checkin_summary` 欄位不存在於 feed 卡片組裝
- Scenario: 含頻率資訊 → ⚠️ — 有 frequency_min/max_days、session_duration_minutes，但命名為 snake_case
- Scenario: 含加油展示 cheer_display → ⚠️ — 無 `cheer_display`；以 reactions 陣列 + latestActorName（feed_service.py:1237）取代
- Scenario: 含留言數 → ✅ — `comment_count`（feed_service.py:169/189）
- Scenario: 不含打卡 CTA → ✅ — 卡片組裝無 checkin_action 欄位

## Requirement: Brewing Card data → ✅
證據: daodao-ai-backend:src/services/feed/feed_service.py:1121-1127 — `is_brewing=true`，brewing 卡片不含 checkin 內容。
- Scenario: 不暴露打卡內容 → ✅ — brewing practice 走 practice 卡片組裝，無 checkins 陣列
- Scenario: 含 is_brewing 旗標 → ✅ — `"is_brewing": is_brewing`（feed_service.py:1127）；提示文字「內容醞釀中」前端 FeedLabel `new_release` 對應

## Requirement: Harvest completion toast → ⚠️
證據: daodao-f2e:apps/product/src/app/[locale]/practices/[id]/summary/page.tsx:67-90 — task 10.1 完成後顯示 toast，privacyStatus public/delayed 觸發。
- 差異：規格要求 preference 記錄於後端 `user_preferences`；實作用 `localStorage.getItem(TOAST_DISMISSED_KEY)`（summary/page.tsx:76），非後端持久化
- Scenario: 完成公開練習後顯示提示 → ✅ — `toast(t("summary_public_toast"))`，條件 privacyStatus public/delayed
- Scenario: 已關閉後不再顯示 → ⚠️ — 用 localStorage `TOAST_DISMISSED_KEY=1` 而非後端 user_preferences，跨裝置不生效
