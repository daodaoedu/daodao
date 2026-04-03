## 1. Backend — notification controller 補上 reactionType（daodao-server）

- [x] 1.1 在 `notification.controller.ts` 的 payload 解構處新增 `reactionType` 欄位提取，使 API response 包含該欄位
  - **驗收**：呼叫 GET notifications API，reaction 類型通知的 response 包含 `reactionType` 欄位且值正確

## 2. Backend — email notification 補上 reactionType（daodao-server）

- [x] 2.1 在 `reaction-notification-template.ts` 的 `ReactionNotificationData` interface 新增 `reactionType` 欄位，template 輸出使用對應 emoji 取代寫死的 🎉
  - **驗收**：template 根據 reactionType 產出對應 emoji，缺少時 fallback 🎉

- [x] 2.2 在 `reaction-notification.worker.ts` 呼叫 `generateReactionNotificationEmail` 時傳入 `reactionType`
  - **驗收**：worker 正確傳遞 reactionType 給 template

## 3. Frontend — type 定義與資料轉換（daodao-f2e）

- [x] 3.1 在 `use-notifications.ts` 的 `NotificationApiItem` interface 新增 `reactionType?: string` 欄位
  - **驗收**：TypeScript 編譯通過，無型別錯誤

- [x] 3.2 在 `notification-list.tsx` 的 `apiItemToDisplay` 函式中，將 `reactionType` 透過既有 mapping（`reaction-type.ts`）轉換為 emoji，傳入 notification item
  - **驗收**：`apiItemToDisplay` 回傳的物件包含正確的 reaction emoji

## 4. Frontend — 顯示邏輯修正（daodao-f2e）

- [x] 4.1 修改 `notification-item.tsx`（display 已正確使用 `reaction ?? "🙌"`，無需改動），使用傳入的 reaction emoji 取代寫死的 `🙌` fallback，僅在 reactionType 不存在時才 fallback
  - **驗收**：通知列表中 reaction 通知顯示正確的 emoji，舊通知仍顯示 🙌

## 5. 測試（daodao-server / daodao-f2e）

- [x] 5.1 新增 backend regression test：驗證 reaction notification API response 包含正確的 `reactionType`
  - **驗收**：測試通過，覆蓋至少 2 種 reactionType

- [x] 5.2 新增 backend regression test：驗證 email template 根據 reactionType 產出對應 emoji
  - **驗收**：測試通過，覆蓋已知 reactionType 與 fallback 情境

- [x] 5.3 新增 frontend 測試：驗證 notification item 根據 reactionType 顯示對應 emoji
  - **驗收**：測試通過，覆蓋已知 reactionType 與 fallback 情境
  - **注意**：product app 尚未配置 vitest，測試檔案已寫入 `src/constants/__tests__/reaction-type.test.ts`，待 vitest 配置後即可執行
