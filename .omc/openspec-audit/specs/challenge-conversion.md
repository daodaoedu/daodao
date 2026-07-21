# challenge-conversion
- 涉及 repo: f2e (Lurker Banner / Challenge Pulse) / server (challenge stats API)
- 對應 archived change: challenge-cta-and-template-style（相關但未實作 conversion 組件）
- 總計: 4 條 requirement / 8 個 scenario | ✅0 ⚠️0 ❌8 ❓0

## Requirement: Lurker Banner 對非參與者顯示 → ❌
證據: 無（grep LurkerBanner / 戰友 / currently_participating_count 於 apps/** 皆空，僅 i18n 無對應 key）
- Scenario: 非參與者看到 Lurker Banner → ❌ — 無 Banner 組件，無 observer/anonymous 身分判斷
- Scenario: 參與者不顯示 Banner → ❌ — 無 participant 判斷與個人進度組件切換
- Scenario: 報名成功後 Banner 立即消失 → ❌ — 無報名流程與 Banner 移除邏輯

## Requirement: Lurker Banner 顯示即時參與人數 → ❌
證據: 無使用者端 challenge stats / currently_participating_count API（packages/api 無 challenge service；server 僅 admin gamification）
- Scenario: Banner 顯示正確人數 → ❌ — 無 Banner，無 60 秒輪詢

## Requirement: Challenge Pulse 熱度統計組件 → ❌
證據: 無（grep ChallengePulse 為空）
- Scenario: Challenge Pulse 顯示統計數據 → ❌ — 無總打卡次數/送花總數/頭像堆疊組件
- Scenario: 無活躍成員時不顯示頭像堆疊 → ❌ — 無實作

## Requirement: Challenge Pulse 數據每 60 秒自動更新 → ❌
證據: 無
- Scenario: 數據自動刷新 → ❌ — 無 stats API 輪詢實作
