## Why

通知中顯示 practice reaction 的 emoji 永遠是 🙌，與使用者實際給的 reaction（如 🥰、🔥、👍🏻 等）不一致。原因是 `reactionType` 雖然正確存入 notification payload，但 API 回傳時未從 payload 提取該欄位，導致前端無法取得，永遠 fallback 到寫死的 🙌。

## What Changes

- **Backend（notification controller）**：從 notification payload 提取 `reactionType` 並回傳給前端
- **Backend（email notification）**：email worker 傳遞 `reactionType` 給 template，template 顯示對應 emoji 取代寫死的 🎉
- **Frontend（type 定義）**：`NotificationApiItem` 新增 `reactionType` 欄位
- **Frontend（顯示邏輯）**：根據 `reactionType` 對應正確的 emoji，移除寫死的 🙌 fallback

## Capabilities

### New Capabilities

（無）

### Modified Capabilities

（無已存在的 spec 需修改，此為 bug fix — 行為應符合原始設計意圖）

## Impact

- **daodao-server**：`src/controllers/notification.controller.ts` — API response 新增 `reactionType` 欄位
- **daodao-f2e**：
  - `apps/product/src/hooks/use-notifications.ts` — type 定義
  - `apps/product/src/components/notifications/notification-list.tsx` — 轉換函式
  - `apps/product/src/components/notifications/notification-item.tsx` — 顯示邏輯
- **daodao-server**：
  - `src/services/email/reaction-notification-template.ts` — template interface 與 email 內容
  - `src/queues/reaction-notification.worker.ts` — worker 傳遞 reactionType 給 template
- **Non-goals**：不改動 reaction 儲存邏輯、不改動 push notification
