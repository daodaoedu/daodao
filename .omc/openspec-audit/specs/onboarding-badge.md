# onboarding-badge
- 涉及 repo: server (onboarding.service) + f2e (task-guide-widget) + storage (058 onboarding flow tables)
- 對應 archived change: 2026-05-26-onboarding-flow / 2026-05-26-onboarding-task-guide
- 總計: 3 條 requirement / 6 個 scenario | ✅4 ⚠️2 ❌0 ❓0
- 整體：實作完整度高。grantBadge 邏輯、widget 慶祝畫面、creation_method 記錄齊全。

## Requirement: Early User Badge 於全部任務完成時發放 → ✅
證據: daodao-server:src/services/onboarding.service.ts:236 checkAndAdvance 中 `if (allCompleted && !updatedRow.badge_granted) await grantBadge(...)`；grantBadge(:259) 設 badge_granted=TRUE、badge_granted_at=NOW()。冪等（:193 badge_granted 已發放則不重複）。
- Scenario: 完成最後一個任務時觸發 Badge → ✅ — order.every(done) → grantBadge 設 badge_granted=true、記 badge_granted_at、觸發慶祝/email queue
- Scenario: Badge 通知僅出現一次 → ⚠️ — f2e task-guide-widget.tsx:103 `if (badgeGranted && (!allCompleted || celebrationDismissed)) return null` 確保再次進入不再顯示；但「通知」以 widget 一次性慶祝畫面呈現，無獨立 push/notification center 紀錄（celebrationDismissed 為前端 state）

## Requirement: Widget 轉化為 Badge 展示 → ✅
證據: daodao-f2e:apps/product/src/components/task-guide/task-guide-widget.tsx:106 allCompleted && !celebrationDismissed 時 render「恭喜獲得」慶祝畫面（BadgeCheck icon + celebration.badgeTitle/badgeDescription），取代任務清單。
- Scenario: Widget 在 Badge 發放後顯示獲得畫面 → ✅ — :106-135 慶祝面板取代 task list
- Scenario: Badge 後不再顯示進度 Widget → ✅ — :103 badgeGranted 且 celebrationDismissed/非 allCompleted 時 return null（再次進入不出現）

## Requirement: 後端紀錄 Onboarding 完成資料 → ✅
證據: daodao-server:src/services/onboarding.service.ts row 含 user_source(:26)、creation_method(:29)、badge_granted/badge_granted_at(:30-31)、days_to_complete(:33)；CreationMethod 枚舉 src/types/onboarding.types.ts:35 = 'self_created' | 'copied' | 'action_generator'。
- Scenario: Badge 發放時自動計算完成天數 → ✅ — grantBadge(:259) daysToComplete = floor((now - createdAt)/天)，符合 badge_granted_at - created_at 語意（以 grant 當下 now 計算）
- Scenario: 實踐建立方式被正確紀錄 → ✅ — checkAndAdvance(:205-209) 任務 C + extra.creationMethod 寫入 creation_method；action_generator 為合法枚舉值，與 self_created 區分

## 備註
- user_source（S1/S2/S3）：deriveUserSource(onboarding.service.ts:150) 由 referral_source 推導，UserSource enum 存在 ✅。
- 唯一輕微落差：spec 的「Badge 通知」在實作中是 widget 內一次性慶祝畫面（前端 celebrationDismissed 控制），非後端通知系統事件；功能上滿足「僅出現一次」但通知載體與字面「通知」略有出入，故該 scenario 標 ⚠️。
