# challenge-discovery
- 涉及 repo: f2e (首頁挑戰卡片/彈挑視窗) / server (challenge API)
- 對應 archived change: challenge-cta-and-template-style（相關但未實作 discovery）
- 總計: 4 條 requirement / 11 個 scenario | ✅0 ⚠️1 ❌9 ❓1

## Requirement: 首頁挑戰卡片顯示 → ❌
證據: f2e use-challenges.ts:useChallenges() 回傳**硬編碼 mock 資料**（單一 draft 挑戰、mock 參與者），無 API 呼叫；唯一使用處 explore-topics-section.tsx 只 import 型別，未渲染挑戰卡片
- Scenario: 已登入使用者看到挑戰卡片 → ❌ — 首頁無實際挑戰卡片組件（grep ChallengeCard 為空）
- Scenario: 無進行中挑戰時不顯示 → ❌ — 無「自動顯示最新非已結束挑戰」邏輯；mock 永遠回傳 1 筆 draft

## Requirement: 挑戰卡片狀態標籤 → ❌
證據: use-challenges.ts IChallenge.status 型別僅 `"draft"|"active"|"completed"`，**缺 enrolling/upcoming/ended**；server admin-gamification.service 也只計算 active/upcoming/completed（無 enrolling/ended/draft 報名語意）
- Scenario: 報名中狀態卡片 → ❌ — 無 `enrolling` 狀態，無「立即加入」按鈕
- Scenario: 已參加者看到不同按鈕 → ❌ — 無參加狀態判斷與按鈕切換
- Scenario: 挑戰結束後移入過往紀錄 → ❌ — 無 ended 狀態與過往挑戰區塊

## Requirement: 彈挑視窗（Pop-up）→ ❌
證據: 無（grep ChallengePopup / sessionStorage.*challenge 皆空）
- Scenario: 登入後出現彈挑視窗 → ❌ — 無彈出視窗組件
- Scenario: 無符合條件挑戰時不顯示 → ❌ — 無實作
- Scenario: 同 session 只出現一次 → ❌ — 無 sessionStorage 記錄邏輯

## Requirement: 即時數據顯示於彈挑視窗與卡片 → ⚠️
證據: server admin GET /gamification/challenges 回傳 participantCount（admin-gamification.service.ts:142）；但為 admin 端點，無使用者端即時 API；f2e mock participantCount=142 為寫死
- Scenario: 顯示剩餘報名時間 → ❌ — 無報名截止倒數實作
- Scenario: 顯示當前參與人數 → ❓ — 後端 admin 有 participant_count 聚合，但無使用者端即時取得路徑；前端為 mock，未串接
