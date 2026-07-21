# challenge-enrollment
- 涉及 repo: server (enroll API/email/checkin guard) + f2e (報名表單/成功儀式/分享圖卡)
- 對應 archived change: 2026-05-26-group-challenge（specs/challenge-enrollment）
- 總計: 5 條 requirement / 8 個 scenario | ✅0 ⚠️0 ❌5 ❓0
- 結論：**挑戰報名流程未實作**。無 challenge_participants 表、無報名 API、無承諾宣言欄位、無報名確認 Email、無分享圖卡、無開始日前打卡阻擋。grep `commitment`/`承諾宣言`/`立即加入`(挑戰情境)/`分享圖卡`/`挑戰尚未開始` 全部 0 真實結果（僅 marathon/landing-page 無關匹配）。f2e use-challenges.ts 為 mock。

## Requirement: 承諾宣言報名流程 → ❌
證據: 無 enrollChallenge/joinChallenge API（grep 0），無 commitment_statement 欄位，無 challenge_participants 寫入。
- Scenario: 正常完成報名 → ❌ — 無建立 challenge_participants + 成功儀式畫面
- Scenario: 承諾宣言為空不可送出 → ❌ — 無表單驗證實作
- Scenario: 挑戰未開放報名時無法加入（status≠enrolling 回 400） → ❌ — 無 enrolling 狀態與 400 邏輯（challenges 表狀態為 computed upcoming/active/completed，無 enrolling）

## Requirement: 報名期間限制（名稱/期間不可編輯） → ❌
證據: 無使用者端挑戰詳情編輯介面；challenges 表由 admin-gamification 建立（admin.routes.ts:1385），但無 spec 描述的使用者報名情境。
- Scenario: 已報名使用者無法更改挑戰名稱或期間 → ❌ — 無報名/使用者挑戰詳情頁可驗證

## Requirement: 報名確認 Email 通知 → ❌
證據: email 服務中有 marathon-template.ts，但無「報名確認」挑戰 email（grep 報名確認 0 結果）。
- Scenario: 報名後收到確認信 → ❌ — 無 30 秒內報名確認 Email 實作

## Requirement: 分享圖卡生成 → ❌
證據: 無 share card / 分享圖卡 PNG 生成（grep 0）。
- Scenario: 報名成功頁面提供分享圖卡 → ❌ — 無實作
- Scenario: 圖卡內容正確渲染 → ❌ — 無實作

## Requirement: 打卡在開始日前不可提交 → ❌
證據: 無 checkin 對 challenge start_date 的 403 阻擋（grep `挑戰尚未開始`/checkin start_date 0 結果）。
- Scenario: 開始日前無法打卡 → ❌ — 無 upcoming 狀態打卡阻擋
