# social-follow
- 涉及 repo: daodao-server (API) / daodao-f2e (UI)
- 對應 archived change: 2026-05-26-social-follow-connect
- 總計: 4 條 requirement / 11 個 scenario | ✅9 ⚠️2 ❌0 ❓0

## Requirement: 關注用戶 → ✅
證據: daodao-server:src/services/follow.service.ts:78-103 followUser upsert(follows) + POST /api/v1/follows route；f2e packages/api/src/services/follow.ts + apps/product user-info-card.tsx
- Scenario: 關注成功(按鈕→已關注 + B 收通知) → ✅ — upsert follows + follow.service.ts:95 UserFollowed P2 事件；f2e useFollow hook 切換狀態
- Scenario: 取消關注 → ✅ — follow.service.ts unfollowUser deleteMany + DELETE /follows/:targetType/:targetId
- Scenario: 重複關注防護 → ✅ — upsert with update:{}（已存在不變動，唯一鍵 follower_id+target_type+target_id）
- Scenario: 自我關注防護 → ✅ — follow.service.ts:74 throw BadRequestError('無法關注自己')

## Requirement: 關注主題實踐 → ✅
證據: daodao-server:src/services/follow.service.ts:155-200 followPractice upsert(target_type='practice')
- Scenario: 關注實踐成功 → ✅ — upsert follows practice；防止關注自己實踐(:167)
- Scenario: 實踐打卡觸發通知 → ✅ — practice-checkin.service.ts:289 fanoutToPracticeFollowers('follow.practice_checkin')→worker P2 PracticeCheckinActivity
- Scenario: 實踐結束觸發通知 → ✅ — practice-checkin.service.ts:267 'update-practice-finish' P2 對 practice followers（completed+public）

## Requirement: 關注觸發通知 → ⚠️
證據: 見 notification-events 對應事件
- Scenario: 被關注通知 → ✅ — follow.service.ts:95 UserFollowed P2 recipient=被關注者
- Scenario: 被關注者開始新實踐通知 → ✅ — practice.service.ts:96 PracticeCreated P1 fan-out 給 followers
- Scenario: 被關注者發送 Buddy 請求通知 → ⚠️ — buddy-request.service.ts:123 BuddyRequestFollower P1 對 requester 的 followers 存在（功能符合，但通知文案/獨立性以 Buddy FRD 為準，本 spec 僅標示為獨立功能）

## Requirement: 關注者列表顯示 → ✅
證據: daodao-server:src/services/follow.service.ts:225 getFollowers(分頁) + :261 getFollowing(合併 users+practices)；routes GET /users/:userId/followers、/users/:userId/following；f2e apps/product/.../settings/following
- Scenario: 顯示關注者列表(頭像+名稱) → ✅ — getFollowers 回傳 rows + total + pagination；f2e following-settings.tsx 渲染
- Scenario: 顯示我關注的列表(分頁,含用戶與實踐及總數) → ✅ — getFollowing.ts:268-340 分 user/practice target，回傳合併清單 + total + calculatePagination(page,limit)
