## 1. 抽取共用 mention hook（daodao-f2e）

- [x] 1.1 從 `comment-section.tsx` 抽取 `useMentionInput()` hook 到 `@daodao/features` package
  - 包含：mentionedIds Map 管理、@mention regex 偵測、使用者搜尋 API、提交時過濾有效 mention
  - 驗收：hook 可獨立 import，原 `comment-section.tsx` 改用此 hook 後行為不變

- [x] 1.2 抽取 MentionInput 下拉選單 UI 元件到 `@daodao/features` package
  - 包含：@mention 觸發的使用者搜尋下拉、選取後插入 @handle 到輸入框
  - 驗收：元件可獨立 import，接受 `useMentionInput()` 回傳的 props

## 2. 修復 social/comment-input.tsx（daodao-f2e）

- [x] 2.1 調查 `social/comment-input.tsx` 的所有使用場景，確認哪些 target type 適合加入 @mention UI
  - 驗收：列出所有使用處及其 target type，確認都適合 @mention（排除匿名或不適用的場景）

- [x] 2.2 在 `social/comment-input.tsx` 整合 `useMentionInput()` hook 與 MentionInput UI
  - 驗收：在 social comment 輸入框中輸入 @ 可觸發使用者搜尋下拉，選取後 @handle 插入內容

- [x] 2.3 確保 `social/comment-input.tsx` 提交時傳送 `mentionedUserIds` 到 API
  - 驗收：送出包含 @mention 的留言時，API request body 包含正確的 `mentionedUserIds` 數字陣列；刪除 @handle 後不傳送該 ID

## 3. 後端驗證與修復（daodao-server）

- [x] 3.1 驗證並修復 `comment.service.ts` 的 mention 通知流程 end-to-end
  - 確認收到 `mentionedUserIds` 後正確呼叫 `notificationEventService.createEvent()`
  - 確認 type='mention'、priority='P1'、payload 包含留言內容與連結
  - 驗收：建立包含 mentionedUserIds 的留言後，`notification_events` 表出現對應 P1 記錄；如發現問題則修復

- [x] 3.2 驗證並修復編輯留言的 mention 差異比對邏輯
  - 確認編輯留言時，後端比對新舊 `mentionedUserIds`，僅對新增的用戶建立 P1 事件
  - 驗收：編輯留言新增 @mention 時只通知新增用戶，已存在的 @ 不重複通知

- [x] 3.3 驗證 notification worker 處理 mention 事件
  - 確認 `notification-inapp.worker.ts` 正確將 mention P1 event 轉為 notification
  - 驗收：notification_events 中的 mention 記錄被處理後，`notifications` 表出現對應記錄

## 4. 測試（daodao-f2e / daodao-server）

- [x] 4.1 為 `useMentionInput()` hook 撰寫單元測試
  - 測試：mention 新增/刪除、提交時過濾、空 mention 不傳送
  - 驗收：所有測試通過

- [x] 4.2 為 `comment.service.ts` 的 mention 通知邏輯撰寫 regression test
  - 測試：有 mentionedUserIds 時建立事件、無 mentionedUserIds 時不建立、自己 @ 自己不通知、mentionedUserIds 數量超過 @ 數量時記警告
  - 驗收：所有測試通過，覆蓋 specs 中所有 mention 相關 scenario
