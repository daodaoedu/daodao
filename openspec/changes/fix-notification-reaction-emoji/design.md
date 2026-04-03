## Context

使用者對 practice 按 reaction 時，`reactionType`（如 `encourage`、`fire`、`useful` 等）正確存入 notification 的 JSONB payload。但 notification API 回傳時未提取此欄位，導致前端無法取得 reactionType，永遠 fallback 到寫死的 🙌 emoji。

資料流現狀：
1. `reaction.service.ts` — 建立 notification event，payload 包含 `reactionType` ✅
2. `notification-inapp.worker.ts` — 將 payload 寫入 notifications 表 ✅
3. `notification.controller.ts` — 從 payload 組裝 API response ❌（漏掉 `reactionType`）
4. `use-notifications.ts` — `NotificationApiItem` type 缺少 `reactionType` ❌
5. `notification-item.tsx` — `{reaction ?? "🙌"}` 永遠 fallback ❌

## Goals / Non-Goals

**Goals:**
- 通知正確顯示使用者實際給的 reaction emoji
- 修改範圍最小化：僅修正資料流中斷的三個節點

**Non-Goals:**
- 不改動 reaction 儲存邏輯或 DB schema
- 不改動 push notification
- 不改動 reaction emoji 的對應表（已有 `reaction-type.ts` 常數）

## Decisions

### 1. Backend：在 notification controller 提取 `reactionType`

在 `notification.controller.ts` 的 payload 解構處新增 `reactionType` 欄位提取，與現有的 `practice_title`、`content` 等欄位一致。

**理由**：這是最小改動，不需要改 DB、不需要改 worker，因為 payload 裡已經有正確的資料。

### 2. Frontend：用現有的 reactionType → emoji mapping

前端已有 `reaction-type.ts` 定義了 reactionType 到 emoji 的對應。直接在 `apiItemToDisplay` 中利用此 mapping 轉換即可。

**理由**：不需要新增 mapping 邏輯，複用既有常數。

### 3. 保留 fallback emoji 但改為合理預設

將 `{reaction ?? "🙌"}` 改為使用 mapping 函式，若 `reactionType` 不存在才 fallback。

**理由**：防禦性程式設計，避免舊通知（payload 無 reactionType）顯示空白。

### 4. Email notification：在 worker 傳遞 `reactionType`，template 顯示對應 emoji

`reaction-notification.worker.ts` 呼叫 `generateReactionNotificationEmail` 時補傳 `reactionType`。`reaction-notification-template.ts` 的 `ReactionNotificationData` interface 新增 `reactionType`，template 輸出使用對應 emoji 取代寫死的 🎉。

**理由**：與 in-app 通知同樣的資料流斷裂問題。queue job 已經帶有 `reactionType`，只是 worker → template 這段沒接上。

## Risks / Trade-offs

- **舊通知資料** → 已存在的通知若 payload 缺少 `reactionType`，仍會顯示 fallback emoji。可接受，因為這些通知已被閱讀。
- **改動範圍小** → 無顯著風險，不涉及 migration 或 API 版本變更。
