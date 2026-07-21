# challenge-completion
- 涉及 repo: server / storage / worker
- 對應 archived change: add-challenge-completion（推測，未實作）
- 總計: 5 條 requirement / 13 個 scenario | ✅0 ⚠️0 ❌13 ❓0

## 整體判定：規格完全未實作
challenges 表無 completion_threshold 欄位，無 challenge.complete BullMQ delayed job，無 challenge_participants 表（僅 challenge_progress），無 Growth Map 內部 badges API，無結營 Email。

## Requirement: 可設定的達標門檻 → ❌
證據: daodao-storage:migrate/sql/046_create_gamification_community_events_tables.sql:84-92 — challenges 表欄位為 id/name/description/start_date/end_date/required_action/reward/created_at，無 completion_threshold。
- Scenario: 達標門檻由資料表決定 → ❌。

## Requirement: 結營自動化 BullMQ Delayed Job → ❌
證據: 無 — git grep challenge.complete / challenge.completion origin/dev 於 server 無命中（僅 admin-reports.service.ts:104 字串 'challenge_completion_rate' 為報表 metric，無關）。worker repo grep challenge 無命中。
- Scenario: 挑戰啟動排入結營 Job → ❌。
- Scenario: 挑戰取消移除 Job → ❌。

## Requirement: 結營 Job 掃描並判斷達標 → ❌
證據: 無 — 無 challenge_participants 表（storage 046 僅 challenge_progress），無結營掃描 job。
- Scenario: 達標者處理 → ❌。
- Scenario: 未達標者處理 → ❌。
- Scenario: 冪等性 → ❌。

## Requirement: Growth Map 勳章發放 API → ❌
證據: 無 — grep growth-map / internal/growth-map/badges origin/dev 無命中。
- Scenario: 成功發放勳章（201）→ ❌。
- Scenario: 重複發放回 409 → ❌。

## Requirement: 結營完成 Email 通知 → ❌
證據: 無 — 無達標賀信/未達標重啟邀請信相關實作。
- Scenario: 達標者收到賀信 → ❌。
- Scenario: 未達標者收到重啟邀請 → ❌。
