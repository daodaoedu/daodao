# follow-connect
- 涉及 repo: server (follow/connection service+routes), f2e (settings 頁), storage (follows/connections/connection_requests 表)
- 對應 archived change: community-connection-funnel（f2e docs/superpowers/specs 有提及）
- 總計: 9 條 requirement / 22 個 scenario | ✅8 ⚠️11 ❌2 ❓1

## Requirement: 關注用戶（Follow User） → ✅
證據: daodao-server:src/services/follow.service.ts:67 `followUser` upsert follows，並 fan-out follow.user 通知關注者
- Scenario: 關注用戶 → ✅ — upsert(create) 建立 follower→target user follow，無需同意 (follow.service.ts:73)
- Scenario: 取消關注 → ⚠️ — 有 `unfollowUser` deleteMany (follow.service.ts:129)，但實作是獨立 DELETE 端點，spec 描述「再次點擊關注按鈕（切換）」的 toggle 行為由前端負責；後端非單一 toggle endpoint
- Scenario: 重複關注防護 → ⚠️ — 用 upsert update:{} 冪等忽略，不回 409（spec 允許「409 或冪等忽略」其一，符合冪等選項）

## Requirement: 關注實踐（Follow Practice） → ⚠️
證據: daodao-server:src/services/follow.service.ts:145 `followPractice` 建 target_type:'practice' follow；practice-checkin.service.ts:288 打卡時 fanout follow.practice_checkin
- Scenario: 關注公開實踐 → ✅ — 建立 target_type:'practice' follow 記錄 (follow.service.ts:163)
- Scenario: 阻止關注非公開用戶的實踐（403） → ❌ — follow.service.ts 僅檔自我關注 (BadRequestError)，**無 is_public/visibility 檢查、不回 403**。grep is_public/visibility/403 於 follow.service.ts 無結果
- Scenario: 實踐有新打卡時通知 → ✅ — practice-checkin.service.ts:262 查 follows(target_type practice)，289 fanoutToPracticeFollowers('follow.practice_checkin')
- Scenario: 實踐內容更新時通知 → ❓ — 未在 practice.service 找到 practice 內容更新時對 practice followers 的 fanout（僅打卡有）；需進一步確認

## Requirement: Connect 請求發送 → ⚠️
證據: daodao-server:src/services/connection.service.ts:78 `sendRequest`；validators intent optional max50
- 重大落差：spec 要求「用戶頁=reason 必填，實踐頁=reason 選填」；實作改為**動態門檻**：互動<3 次須填 intent，>=3 次可豁免（connection.service.ts:118 hasFamiliarityBypass）。與 spec 規則不同
- Scenario: 從用戶頁發送（附理由） → ⚠️ — 建 status:'pending' connect_request 並通知 (connection.service.ts:156,188)，但「必填理由」條件是互動門檻而非來源頁
- Scenario: 從用戶頁未填理由 → ⚠️ — 未達門檻時拋 BadRequestError(400) (connection.service.ts:119)，但達門檻則允許空 intent，與「用戶頁一律必填」不符
- Scenario: 從實踐頁發送（reason 可空） → ✅ — contextPracticeExternalId 選填、intent 選填 (connection.service.ts:84, validators)
- Scenario: 防止重複發送（雙向 409） → ⚠️ — 已連結拋 BadRequestError(400 非 409) (connection.service.ts:106)；反向 pending 會自動合併成 accepted (connection.service.ts:146) 而非拒絕。與 spec「回 409 拒絕」不同

## Requirement: Connect 請求回應 → ⚠️
證據: daodao-server:src/services/connection.service.ts:206 acceptRequest / 252 rejectRequest
- Scenario: 同意 Connect → ✅ — status→'accepted' 並建 connections 記錄 (connection.service.ts:222)
- Scenario: 拒絕 Connect → ✅ — status→'rejected'，無額外通知 (connection.service.ts:266)
- Scenario: 被拒絕後可重新發送 → ✅ — sendRequest 用 upsert update status→'pending' (connection.service.ts:160)，rejected 記錄可重設

## Requirement: 取消 Connect → ⚠️
證據: daodao-server:src/services/connection.service.ts:308 disconnect
- Scenario: 取消連結 → ⚠️ — **disconnect 直接 delete connections 記錄 (connection.service.ts:318)，非 spec 要求的「status 標記 cancelled 保留記錄」**。資料模型無 cancelled 狀態
- Scenario: 取消後重新發送 → ✅ — connection 刪除後 connections.findUnique 為空，可重新 sendRequest（行為上達成，但機制不同）

## Requirement: Connected 雙方更新通知 → ⚠️
證據: daodao-server:src/services/practice-checkin.service.ts:290 fanoutToConnectedPartners('connect.partner_checkin')
- Scenario: Connected 用戶有新打卡 → ✅ — 打卡時 fanoutToConnectedPartners 通知夥伴 (practice-checkin.service.ts:290)
- Scenario: Connected 用戶更新實踐內容 → ❓ — 未找到實踐內容更新時對 connected partner 的 fanout（僅打卡）

## Requirement: 非公開內容互看權限（Privacy Bridge）— Phase 2 → ❌
- spec 自述為 Phase 2，Phase 1 僅預留 API 權限檢查介面
- Scenario: Connected 查看非公開內容 → ❌ — 未找到 user-level 隱私設定或 isConnected gate 在 practice 讀取路徑的整合（connection.service.ts:430 有 isConnected helper，但無證據用於非公開內容存取控制）
- Scenario: 未 Connect 被阻擋(403) → ❓ — 無證據
- Scenario: 隱私設定用戶層級 → ❓ — 無 user-level visibility 欄位證據

## Requirement: 關注與連結管理頁 → ⚠️
證據: daodao-f2e:apps/product/src/components/settings/following/following-settings.tsx, connections/connections-settings.tsx
- Scenario: 查看關注清單（三清單） → ⚠️ — following-settings.tsx:14 只有 users/practices **兩個 tab，缺「關注我的人」(followers)** 第三清單
- Scenario: 查看連結清單（公開 accepted） → ✅ — connections-settings.tsx:207 顯示已連結夥伴（useConnections 回 accepted），但此為 settings 頁；spec 說「個人公開頁」展示 accepted 清單，公開頁面整合未驗證
