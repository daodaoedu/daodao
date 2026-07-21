# challenge-permissions
- 涉及 repo: server (middleware/ACL/comment/reaction) + f2e (challenge feed UI)
- 對應 archived change: 2026-05-26-group-challenge（specs/challenge-permissions）
- 總計: 5 條 requirement / 9 個 scenario | ✅0 ⚠️1 ❌4 ❓0
- 結論：**ACL/身分識別未實作**。spec 要求的 `challenge_participants` 表不存在（實際 schema 為 `challenges` + `challenge_progress`，migrate/sql/046）。grep `challengeRole`、`challenge_participants`、`requireParticipant`、「僅限挑戰成員」全部 0 結果。f2e use-challenges.ts 為 mock 資料（hard-coded challenge-1）。

## Requirement: 頁面載入時識別使用者挑戰身分 → ❌
證據: server 無 challengeRole middleware（grep `challengeRole` 0 結果），無 challenge_participants 表（migrate/sql/046 只有 challenges/challenge_progress，無 participants 表）。
- Scenario: 參與者身分識別 → ❌ — 無 req.challengeRole = 'participant'
- Scenario: 觀察者身分識別 → ❌ — 無 'observer' 邏輯
- Scenario: 匿名使用者身分識別 → ❌ — 無 'anonymous' 邏輯

## Requirement: 參與者擁有評論與回覆權限 → ❌
證據: 無 challenge feed 評論 ACL（grep comment route 0 結果，無 challenge-scoped 留言限制）。
- Scenario: 參與者可輸入評論 → ❌ — 無 participant gating 的評論框實作
- Scenario: 參與者可回覆他人評論 → ❌ — 無實作

## Requirement: 外部觀察者僅可使用快速回應（送花） → ⚠️
證據: 存在通用 Quick Reactions（daodao-server:src/services/reaction.service.ts，f2e:apps/product/src/constants/reaction-type.ts 6 種反應 encourage/touched/fire...），但**非挑戰情境專屬**，且無「observer 不可評論、僅可送花」的權限分流。無「送花(flower)」此特定反應，亦無「僅限參與者交流」文案（grep 0）。
- Scenario: 觀察者看不到評論輸入框 → ❌ — 無 observer 隱藏評論框 + 提示文案實作
- Scenario: 觀察者可送花（快速回應） → ⚠️ — 有通用 reaction API 任何人可呼叫，但非挑戰 ACL 設計下的 observer-only 行為
- Scenario: 後端阻擋非參與者送出評論（403「僅限挑戰成員留言」） → ❌ — 無此 403 邏輯（grep 0）

## Requirement: 快速回應計數即時更新 → ⚠️
證據: 通用 reaction.service.ts 有計數，但與挑戰打卡綁定的即時更新無證據。
- Scenario: 送花後計數即時更新 → ⚠️ — 通用反應計數存在，但挑戰打卡情境未驗證

## Requirement: 參與者標籤 → ❌
證據: 無 challenge_participants 表，報名時無 participant 記錄寫入（challenge_progress 為進度表，非報名 ACL 標籤；且無報名流程）。
- Scenario: 報名後標籤生效 → ❌ — 無 challenge_participants 記錄、無後續 ACL 識別
