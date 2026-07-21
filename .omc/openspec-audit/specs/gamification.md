# gamification
- 涉及 repo: server / admin-ui / storage / f2e
- 對應 archived change: add-gamification（推測，046 migration）
- 總計: 14 條 requirement / 28 個 scenario | ✅7 ⚠️5 ❌1 ❓1

## Requirement: 自動觸發徽章 → ⚠️
證據: daodao-server:src/queues/badge-award.worker.ts:4,67,76,113 — 每小時掃描 `badges WHERE trigger_type='auto'`，解析 trigger_condition JSON 自動頒發。
- Scenario: 使用者達成首次打卡 → ⚠️ — worker 僅實作 `checkin_streak` 與 `likes_received` 兩種 condition type（worker.ts:67-97）；spec 列舉的「首次打卡」「累計 100 篇筆記」未見對應 type，且是定時掃描非即時觸發、無「並通知使用者」邏輯。
- Scenario: 使用者達成累計條件（100 篇筆記）→ ❌ — 無 note_count / practice_count condition type。
- Scenario: 重複達成不重複頒發 → ✅ — `INSERT INTO user_badges ... ON CONFLICT DO NOTHING`（worker.ts:153 區段，user_badges 唯一鍵）。

## Requirement: 自訂徽章管理 → ✅
證據: daodao-server:src/services/admin-gamification.service.ts:47 createBadge（INSERT badges name/description/icon_url/trigger_condition）；路由 admin.routes.ts:1381。
- Scenario: 建立自訂徽章 → ✅ — createBadge 儲存設定，auto worker 依 trigger_condition 頒發。
- Scenario: 編輯自訂徽章（改門檻）→ ⚠️ — 未見 updateBadge 端點（routes 僅 list/create/award/revoke）；門檻變更須直接改 trigger_condition，無編輯 API。

## Requirement: 手動頒發與撤銷徽章 → ✅
證據: daodao-server:src/services/admin-gamification.service.ts:81 awardBadge / :95 revokeBadge；routes admin.routes.ts:1382-1383。
- Scenario: 手動頒發徽章 → ✅ — awardBadge INSERT user_badges。
- Scenario: 撤銷徽章 → ⚠️ — revokeBadge DELETE user_badges（service.ts:97）；未見「使用者收到撤銷通知」實作。

## Requirement: 徽章總覽頁面 → ✅
證據: daodao-admin-ui:src/pages/BadgesPage.tsx；hook useBadges.ts；service listBadges 含 awarded count（LEFT JOIN user_badges, service.ts:21-32）。
- Scenario: 檢視徽章清單 → ✅ — listBadges 回傳含已頒發數量。
- Scenario: 搜尋徽章 → ❓ — 需確認 BadgesPage 是否有前端搜尋/篩選 UI（service 無 search param）。

## Requirement: 個人檔案徽章展示 → ❌
證據: 無 — f2e 中 grep `badge` 僅命中 UI badge 元件（packages/ui/badge.tsx）與 mobile card badge，未見「使用者個人檔案顯示其 gamification 徽章」的查詢或元件。
- Scenario: 檢視使用者徽章 → ❌ — 無前端 user-badges 展示。
- Scenario: 點選徽章查看詳情 → ❌ — 無對應實作。

## Requirement: 限時挑戰建立 → ✅
證據: daodao-server:src/services/admin-gamification.service.ts:153 createChallenge（INSERT challenges name/description/start_date/end_date/required_action/reward）；routes admin.routes.ts:1385。
- Scenario: 建立限時挑戰 → ✅ — createChallenge 儲存。
- Scenario: 設定積分獎勵 → ⚠️ — `reward` 為 TEXT 欄位（storage 046:90），無結構化積分發放/user_points 自動發放邏輯佐證。

## Requirement: 挑戰總覽頁面 → ✅
證據: daodao-server:src/services/admin-gamification.service.ts:106 listChallenges(status: active|upcoming|completed) 含 participant_count、completion_rate；admin-ui ChallengesPage.tsx。
- Scenario: 檢視挑戰總覽 → ✅ — 三狀態 + 參與統計。
- Scenario: 檢視已結束挑戰 → ⚠️ — 有 completion_rate/participant_count，但「獎勵發放統計」未見。

## Requirement: 挑戰進度追蹤 → ⚠️
證據: daodao-server:src/services/admin-gamification.service.ts:199 getParticipants（FROM challenge_progress JOIN）；routes admin.routes.ts:1386。
- Scenario: 檢視參與者進度 → ✅ — getParticipants 回傳 progress（service.ts:199-210）。
- Scenario: 使用者完成挑戰自動標記+發獎 → ❌ — 無自動完成判定/發獎邏輯（見 challenge-completion spec，亦缺）。

## Requirement: 連續天數活動紀錄 → ⚠️
證據: daodao-server:src/services/admin-gamification.service.ts:221 getStreakDistribution（COUNT DISTINCT checkin_date）。
- Scenario: 配置 streak 計入活動（登入/打卡/發文）→ ❌ — streak 寫死以 checkin_date 計算，無「管理員設定計入活動」設定。
- Scenario: streak 中斷歸零 → ❓ — distribution 以歷史 checkin 計，無顯式「歸零」邏輯，需執行時驗證。

## Requirement: streak 分佈統計 → ✅
證據: daodao-server:src/services/admin-gamification.service.ts:221-245 分區間（1-7/8-14/15-30/31-60/60+ 天）；routes admin.routes.ts:1387；admin-ui 無獨立 page（混在 ChallengesPage/Leaderboards？需確認）。
- Scenario: 檢視 streak 分佈 → ⚠️ — 區間與 spec（1-3/4-7...）不同：實作為 1-7/8-14/15-30/31-60/60+。
- Scenario: 查看高 streak 使用者 → ❌ — distribution 僅回傳區間計數，無展開個別使用者清單端點。

## Requirement: 積分權重設定 → ✅
證據: daodao-server:src/services/admin-gamification.service.ts:282 updateLeaderboardConfig（UPDATE leaderboard_configs activity_weights jsonb）；routes admin.routes.ts:1389。
- Scenario: 設定積分權重 → ✅ — activity_weights JSON 儲存。
- Scenario: 調整權重即時生效 → ⚠️ — getLeaderboard(service.ts:296) 依 config 計算，但無「立即重算所有使用者」批次佐證（查詢時計算）。

## Requirement: 排行榜期間篩選 → ✅
證據: daodao-server:src/services/admin-gamification.service.ts:296 getLeaderboard(period: weekly|monthly|alltime)；routes admin.routes.ts:1390。
- Scenario: 切換至每週排行 → ✅ — period 參數。
- Scenario: 檢視全時間排行 → ✅ — alltime。

## Requirement: 排行榜顯示 → ✅
證據: daodao-server:src/services/admin-gamification.service.ts:314 回傳 rank/name/avatar/points；admin-ui LeaderboardsPage.tsx、useLeaderboard.ts。
- Scenario: 檢視排行榜 → ✅ — 含排名/名稱/頭像/積分。
- Scenario: 展開積分明細 → ❓ — 需確認回傳是否含各活動類型 breakdown，service 回傳結構未明列明細。

## Requirement: 重置期間排行榜 → ⚠️
證據: daodao-server:src/services/admin-gamification.service.ts:335 resetLeaderboard(period)；routes admin.routes.ts:1391（requireSuperAdmin）。
- Scenario: 重置每週排行榜 → ⚠️ — resetLeaderboard 存在，但「存入歷史紀錄」未見對應 history 表寫入。
- Scenario: 查看歷史排行 → ❌ — 無歷史排行查詢端點。
