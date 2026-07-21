# notification-email
- 涉及 repo: server
- 對應 archived change: 無
- 總計: 6 條 requirement / 13 個 scenario | ✅12 ⚠️1 ❌0 ❓0

## Requirement: Email 發送時效（高價值事件，4 小時批次） → ✅
證據: daodao-server:src/queues/notification.queue.ts:140-145 — emailQueue repeatable cron `0 0,4,8,12 * * *`（UTC = UTC+8 08/12/16/20），即每 4 小時一批次。
- Scenario: 連結請求 Email 延遲不超過 4 小時 → ✅ — 4 小時 cron 批次（notification.queue.ts:142）+ notification-email.worker.ts:42 註解確認 window 4 小時

## Requirement: 連結請求 Email 內容（連結初衷） → ✅
證據: daodao-server:src/services/email/notification-digest-template.ts:28/116 — `connectMessage` 欄位 escapeHtml 後渲染；notification-email.worker.ts:222 由 `payload.intent` 填入。
- Scenario: Email 包含連結初衷 → ✅ — digest template 直接顯示 connectMessage 全文，不需點擊進站

## Requirement: Email 退訂機制 → ✅
證據: daodao-server:src/services/email/base-template.ts:231 footer 取消訂閱連結；src/controllers/notification.controller.ts:343 `unsubscribeEmail` GET /unsubscribe；src/services/notification-unsubscribe.service.ts:21/48 token 90 天。
- Scenario: Email 頁尾退訂連結 → ✅ — base-template.ts:231「取消訂閱」+ digest-template.ts:367「調整通知設定」settingsUrl
- Scenario: 點擊退訂立即生效 → ✅ — notification.controller.ts:343-378 驗 token 後更新 preferences（digest 類型關閉 email 通知）
- Scenario: 退訂無需登入 → ✅ — `/api/v1/notifications/unsubscribe?token=<jwt>` 公開路由，verifyUnsubscribeToken 後處理，不要求登入
- Scenario: 退訂 token 過期 → ✅ — notification.controller.ts:346/355-369 token 無效顯示「退訂連結已過期」HTML + 前往設定頁備用連結

## Requirement: 週報（P3 學習足跡摘要） → ✅
證據: daodao-server:src/queues/notification-weekly.worker.ts + notification.queue.ts:152-157 cron `0 12 * * 0`（週日 20:00 UTC+8）。
- Scenario: 週報發送時間 → ✅ — notification.queue.ts:154 `0 12 * * 0`（週日 12:00 UTC = 20:00 UTC+8）
- Scenario: 資料統計邊界 UTC+8 週一~週日 → ✅ — notification-weekly.worker.ts:62-76 計算 UTC+8 週一 00:00 ~ 週日 23:59 轉 UTC
- Scenario: 週報內容（讚/留言/新關注/連結請求 + 進度） → ✅ — weekly.worker.ts:185-188 reactions/comments/newFollowers/connectRequests + :222 practiceProgress
- Scenario: 無活動時不發送 → ✅ — weekly.worker.ts:112 `No events this week, skipping`

## Requirement: Email 情感化文案 → ✅
證據: daodao-server:src/services/email/notification-digest-template.ts:283/324/335 — 「你的島嶼熱鬧起來了」「島嶼有新動態」等島嶼語境文案。
- Scenario: 留言通知文案 → ✅ — digest-template.ts:63 comment「在你的內容留言」+ 整體島嶼語境，非冰冷系統通知

## 註記
- 唯一 ⚠️：規格開頭已自述與 PRD「1 分鐘」延遲的差異（design.md 決策 #1 採 4 小時批次），實作與規格本身一致，無落差。
