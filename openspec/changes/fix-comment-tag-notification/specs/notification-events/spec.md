## MODIFIED Requirements

### Requirement: 事件類型定義

> 僅列出本次變更與新增的 scenario，未列出的 scenario 維持原 spec 不變。

#### Scenario: 被 @ 提及觸發 P1 事件
- **WHEN** 用戶 A 建立留言，且前端傳送的 `mentionedUserIds` 陣列包含用戶 B 的數字 ID
- **THEN** 系統 SHALL 為 `mentionedUserIds` 中的每位用戶各建立一筆 P1 類型的 `notification_events` 記錄，`entity_type` 為 `comment`，payload 中 SHALL 包含留言內容摘要與留言連結

#### Scenario: 編輯留言新增 @ 提及
- **WHEN** 用戶 A 編輯留言，`mentionedUserIds` 陣列新增了用戶 C（原本未被 @）
- **THEN** 系統 SHALL 僅對新增的用戶 C 建立 P1 事件，已存在的 @ 不重複通知

#### Scenario: 留言者本人不收到 @ 通知
- **WHEN** 用戶 A 建立留言並在 `mentionedUserIds` 中包含自己的 ID
- **THEN** 系統 SHALL 不為用戶 A 建立任何 notification_events 記錄

## ADDED Requirements

### Requirement: 所有 web 留言入口支援 @mention

前端所有 web 留言入口 SHALL 解析 @mention 並傳送 `mentionedUserIds` 到後端 API。

#### Scenario: web 留言入口傳送 mentionedUserIds
- **WHEN** 用戶在任何 web 留言入口（包括 practice detail、social comment 等）輸入包含 @handle 的留言並送出
- **THEN** 前端 SHALL 解析留言內容中的 @mention，將對應的數字 userId 陣列作為 `mentionedUserIds` 傳送至 `POST /api/v1/comments`

#### Scenario: 前端 mention 解析驗證
- **WHEN** 用戶在留言中輸入 @handle 但送出前刪除了該 @handle
- **THEN** 前端 SHALL 不將該用戶的 ID 包含在 `mentionedUserIds` 中（僅傳送最終留言內容中仍存在的 @mention）

### Requirement: 後端 mention 防護驗證

後端 SHALL 對前端傳送的 `mentionedUserIds` 進行防護驗證。

#### Scenario: mentionedUserIds 數量超過 @ 數量
- **WHEN** 前端傳送的 `mentionedUserIds` 數量超過留言內容中 `@` 符號的數量
- **THEN** 系統 SHALL 記錄警告日誌，但仍處理有效的 mentionedUserIds（不中斷流程）
