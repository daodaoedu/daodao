# notification-preferences
- 涉及 repo: server + storage
- 對應 archived change: 通知偏好設定相關 change
- 總計: 4 條 requirement / 7 個 scenario | ✅3 ⚠️3 ❌0 ❓1

表結構: daodao-storage:migrate/sql/014_create_notification_tables.sql:83-103（notification_preferences：user_id/notification_type/channel(N01|N02|N03)/is_enabled/updated_at + UNIQUE(user,type,channel)）。
服務: daodao-server:src/services/notification-preference.service.ts；route PUT/GET `/api/v1/notifications/preferences`（notification.routes.ts:139-147）。

## Requirement: 全局通知開關 → ⚠️
證據: daodao-server:src/services/notification-preference.service.ts:150-197 setGlobalEnabled 對所有 type × **N01+N03** upsert is_enabled。controller notification.controller.ts:49-52 收 globalEnabled boolean。
差異：spec 寫「資料庫中該用戶所有 `notification_preferences.is_enabled` 設為 false」，但實作刻意**只動 N01、N03，不動 N02**（讓 In-App 中心繼續累積）。行為符合 spec 描述的「N02 仍繼續累積」，但與「所有 is_enabled 設為 false」字面不符。
- Scenario: 關閉全局通知 → ⚠️ — 停發 N01/N03 符合；但 N02 記錄不被設 false（符合「In-App 仍累積」意圖，與字面「所有」有出入）
- Scenario: 重新開啟全局通知 → ⚠️ — setGlobalEnabled(true) 將 N01/N03 全設回 true，**未依「先前分項設定」還原**（spec 要求恢復為用戶先前的分項設定，但實作是一律 true）

## Requirement: 分項通知控制 → ⚠️
證據: daodao-server:src/services/notification-preference.service.ts:124-147 updatePreference 對單一 type+channel upsert；預設值 getDefaultEnabled:63-69（WeeklyDigest 的 N02/N03 預設 false）。ALL_NOTIFICATION_TYPES 涵蓋 reaction/comment/Follow/Connect/ConnectAccepted/PracticeFollowed/UserFollowActivity/BuddyRequest/WeeklyDigest 等。
差異：spec 表中標 **V（系統強制開啟，用戶無法關閉）的 N02 頻道**，實作 updatePreference **未做強制鎖定**，任何 type 的 N02 都可被 upsert 成 false（無 forced-on enforcement）。
- Scenario: 關閉特定類型 Email → ✅ — updatePreference(type,'N01',false) 寫入；email worker (notification-email.worker.ts:164-179) 依 prefMap 過濾該 type
- Scenario: 設定即時生效 → ⚠️ — upsert 立即寫 DB，但 `update:{ is_enabled }` **未更新 updated_at**（見下）；發送端即時讀 DB 故行為即時，updated_at 不刷新
- Scenario: 週報設定 → ✅ — WeeklyDigest N01 可關；weekly worker notification-weekly.worker.ts:134-144 依 prefMap 過濾

## Requirement: 偏好設定持久化 → ⚠️
證據: 表 daodao-storage:migrate/sql/014_create_notification_tables.sql:91-92 has is_enabled + updated_at DEFAULT CURRENT_TIMESTAMP。
差異：spec 要求變更後 `updated_at` 更新為當前時間，但 Prisma upsert 的 `update: { is_enabled: isEnabled }`（service:135-138, 173-176）與 setGlobalEnabled **皆未顯式設定 updated_at**，DB 預設只在 create 時填入，update 時不會自動刷新（無 @updatedAt / trigger 證據）。
- Scenario: 設定寫入資料庫 → ⚠️ — is_enabled 有寫入，但 updated_at 不會在更新時刷新
- Scenario: 查詢當前設定 → ✅ — getPreferences service:91-122 合併 DB 與預設值，無記錄回傳 getDefaultEnabled 預設

備註(❓)：「設定即時生效」是否真正在批次週期前生效需執行時驗證；發送 worker 確實每次查 prefMap，邏輯上即時。
