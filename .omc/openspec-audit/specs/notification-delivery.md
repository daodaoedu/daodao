# notification-delivery
- 涉及 repo: server (queues + notification service), f2e (notification center)
- 對應 archived change: 無（以程式碼為準）
- 總計: 6 條 requirement / 16 個 scenario | ✅3 ⚠️3 ❌0 ❓0

## Requirement: In-App 通知批次更新（每小時） → ✅
證據: daodao-server:src/queues/notification-inapp.worker.ts:24-90 每小時 cron（daodao-server:src/queues/notification.queue.ts:134 `repeat: { pattern: '0 * * * *' }`），查 `processed_at: null` + `priority in ['P1','P2']`，依 recipient 寫 notifications 後標 processed_at。
- Scenario: 整點批次執行 → ✅ — inapp worker 查未處理 P1/P2 並建 notifications。
- Scenario: 用戶查詢通知中心 → ⚠️ — daodao-f2e:packages/api/src/services/notification-hooks.ts:15 `useNotifications({cursor,limit})` 打 `/api/v1/notifications`，預設 cursor 分頁；但「P1 置頂於 P2」排序未在 worker/此查得明確證據（worker 不分 P1/P2 排序，僅 created_at）。
- Scenario: 無限捲動載入 → ✅ — useNotifications 支援 cursor 參數，cursor-based 分頁。
- Scenario: 批次冪等性 → ✅ — 僅處理 `processed_at IS NULL`（worker line 28-34），重啟不重複。

## Requirement: Email 聚合發送（每 4 小時） → ✅
證據: daodao-server:src/queues/notification-email.worker.ts:4 註解「每日 08:00/12:00/16:00/20:00」、`BATCH_WINDOW_MS = 4h`（line 37）；cron daodao-server:src/queues/notification.queue.ts:145 `'0 0,4,8,12 * * *'`（UTC，對應 UTC+8 08/12/16/20）。
- Scenario: 4 小時 Email 批次執行 → ✅ — worker 依 window 查事件、依 recipient 分組發信。
- Scenario: Email 內容結構（P1/P2 區塊，P1 在前） → ❓→⚠️ — worker 存在但未驗證模板實際分 P1/P2 區塊（未讀模板細節）。
- Scenario: 無事件時不發送 Email → ⚠️ — 分組後對有事件 recipient 發信屬合理推斷，未逐行確認 skip 條件。
- Scenario: MVP 不過濾已讀狀態 → ⚠️ — 未見已讀過濾邏輯（推斷未過濾），但無明確「不過濾」程式碼證據。

## Requirement: 安靜時間處理（00:00–07:59 併入 08:00 首封） → ✅
證據: daodao-server:src/queues/notification-email.worker.ts:40-44 `MORNING_BATCH_WINDOW_MS = 12h`，早班（UTC 00:00 = UTC+8 08:00）回看 12 小時補抓夜間 8 小時 gap。
- Scenario: 凌晨事件併入晨間 Email → ✅ — 12h morning window 涵蓋凌晨事件。

## Requirement: 深層跳轉（Deep Link）解析 → ⚠️
證據: daodao-f2e:apps/product/src/components/notifications/notification-list.tsx:72-89 依 entityType 組 href（checkin/practice→`/practices/{extId}`、`/practices/{extId}/check-ins/{checkinId}`、follow/connect→`/users/{actor.id}`）。
- Scenario: 點擊留言通知跳轉並高亮 → ⚠️ — 實作未產生 spec 要求的 `#comment-{id}` anchor，亦無自動捲動+高亮 2 秒；routing scheme 與 spec 表格不符。
- Scenario: 留言已被刪除的跳轉處理 → ❓ — 無「此留言已被刪除」提示之明確證據。
- Scenario: 點擊連結請求通知 → ⚠️ — connection 導向 `/users/{actor.id}`，spec 要求 `/users/{requester_external_id}`，欄位來源不同。

## Requirement: 連結請求通知快速操作（接受/忽略） → ✅
證據: daodao-f2e:apps/product/src/components/notifications/notification-list.tsx:180 `acceptConnectionRequest(connectionRequestId)`；notification-item.tsx:238 ignore 選項；use-notifications.ts:44 `acceptConnectionRequest`、line 9 `acceptBuddyRequest`。
- Scenario: 快速接受連結請求 → ✅ — acceptConnectionRequest 呼叫 respondConnectionRequest(...,'accept')。
- Scenario: 快速忽略連結請求 → ✅ — onConnectReject / ignore 處理（item line 238）。
- Scenario: Buddy 請求快速操作 → ✅ — use-notifications.ts:9 acceptBuddyRequest 匯入並用於 buddyRequestId 快速操作。
  注意：底層連結 API endpoint 為 `/request/:requestId`（daodao-server:src/routes/connection.routes.ts:193），與 spec 寫的 `/api/v1/connections/:id` 命名不符。

## Requirement: 通知聚合顯示（同 entity 1 小時內同類 P2 聚合） → ⚠️
證據: daodao-server:src/queues/notification-inapp.worker.ts:122-123 P2 依 aggregation_key 聚合，`aggregation_count: groupEvents.length`，P1 不聚合（line 79-80 aggregation_key null）。
- Scenario: 多人按讚聚合 → ⚠️ — 有 aggregation_key/count 機制，但「1 小時內」時間窗條件未在 worker 查得明確證據（聚合 key 以 type+entity，未見 1h 限制）。
- Scenario: 不同類型事件不聚合 → ✅ — 聚合 key 含 type，不同 type 不會合併。
