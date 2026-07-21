# challenge-feed
- 涉及 repo: 預期 daodao-server (API) + daodao-f2e
- 對應 archived change: 無
- 總計: 3 條 requirement / 7 個 scenario | ✅0 ⚠️0 ❌3 ❓0

## Requirement: 挑戰專屬動態流公開可讀 (`/challenge/:id/feed`) → ❌
證據: 無。daodao-server `git grep` 找不到任何 `/challenges/:id/feed` 或 challenge feed 路由；全 repo 無 challenge route/controller/service（僅 admin-gamification 引用 challenge_progress 表做後台統計，src/services/admin-gamification.service.ts:122）。f2e `apps/product/src/hooks/use-challenges.ts` 為純 mock 資料（id:"challenge-1" 等），無 API 呼叫。
- Scenario: 未登入瀏覽挑戰 Feed → ❌ — 無對應頁面/API。
- Scenario: 僅顯示屬於此挑戰的打卡 → ❌ — 無 challenge_id 過濾的 feed 查詢。

## Requirement: 私密打卡在 Feed 中僅對挑戰成員可見 → ❌
證據: 無。無 `challenge_participants` 成員可見性過濾邏輯；雖有泛用 visibility='private'（comment/note/me service），但無 challenge 範圍的成員權限判定，亦無直接訪問私密打卡回 403 的 challenge 路徑。
- Scenario: 外部觀察者無法看到私密打卡 → ❌
- Scenario: 挑戰成員可看到私密打卡 → ❌
- Scenario: 擁有者永遠可見自己私密打卡 → ❌

## Requirement: 挑戰 Feed API 支援游標分頁與過濾 (`GET /api/challenges/:id/feed`) → ❌
證據: 無此 API。系統存在泛用游標分頁（f2e feed-hooks.ts:88 用 `/api/v1/feed` + cursor），但非 challenge 範圍端點，且不支援 challenge_id 過濾。
- Scenario: 正常分頁取得 Feed (limit=20, nextCursor) → ❌
- Scenario: 無更多資料回傳 null 游標 → ❌

## 備註
challenge-feed 整體未實作。後台有 challenge_progress 統計，但面向使用者的公開挑戰動態流（含成員可見性 403）完全缺失。
