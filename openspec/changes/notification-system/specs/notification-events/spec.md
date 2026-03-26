## ADDED Requirements

### Requirement: 事件類型定義
系統 SHALL 定義以下通知事件類型及其優先級：
- P1（高價值）：留言（Comment）、被 @ 提及、連結請求（Connect）、連結確認、關注的人開始主題實踐、關注的人請求 Buddy（追蹤者視角）、收到 Buddy 請求（被請求方視角）、Buddy 請求被接受
- P2（鼓勵性）：反應（Reaction）、用戶被關注、主題實踐被關注、關注的主題實踐更新（打卡、結束）

> **`entity_type` 補充說明**：「主題實踐被關注」的 entity_type 為 `practice`，recipient 為實踐擁有者；「用戶被關注」的 entity_type 為 `user`，recipient 為被關注的用戶。兩者為獨立事件路徑。

#### Scenario: 用戶留言觸發 P1 事件
- **WHEN** 用戶 A 在用戶 B 的內容下留言
- **THEN** 系統 SHALL 建立一筆 P1 類型的 `notification_events` 記錄，recipient 為用戶 B，actor 為用戶 A

#### Scenario: 用戶按讚觸發 P2 事件
- **WHEN** 用戶 A 對用戶 B 的內容按讚（Reaction）
- **THEN** 系統 SHALL 建立一筆 P2 類型的 `notification_events` 記錄，recipient 為用戶 B，actor 為用戶 A

#### Scenario: 收到連結請求觸發 P1 事件
- **WHEN** 用戶 A 向用戶 B 發送連結請求（Connect）
- **THEN** 系統 SHALL 建立一筆 P1 類型的 `notification_events` 記錄，並於 payload 中包含「連結初衷」文字摘要

#### Scenario: 連結請求被接受觸發 P1 事件
- **WHEN** 用戶 B 接受用戶 A 的連結請求
- **THEN** 系統 SHALL 建立一筆 P1 類型的 `notification_events` 記錄，通知用戶 A

#### Scenario: 用戶被關注觸發 P2 事件
- **WHEN** 用戶 A 關注用戶 B
- **THEN** 系統 SHALL 建立一筆 P2 類型的 `notification_events` 記錄，recipient 為用戶 B，`entity_type` 為 `user`

#### Scenario: 主題實踐被關注觸發 P2 事件
- **WHEN** 用戶 A 關注某一主題實踐（Practice P）
- **THEN** 系統 SHALL 建立一筆 P2 類型的 `notification_events` 記錄，recipient 為該主題實踐的擁有者，`entity_type` 為 `practice`，payload 中包含 `practice_id` 與 `practice_title`

#### Scenario: 被 @ 提及觸發 P1 事件
- **WHEN** 用戶 A 建立留言時，`mentions` 欄位（TEXT[]）包含用戶 B 的 `external_id`
- **THEN** 系統 SHALL 為 `mentions` 陣列中的每位用戶各建立一筆 P1 類型的 `notification_events` 記錄，`entity_type` 為 `comment`

#### Scenario: 編輯留言新增 @ 提及
- **WHEN** 用戶 A 編輯留言，`mentions` 陣列新增了用戶 C（原本未被 @）
- **THEN** 系統 SHALL 僅對新增的用戶 C 建立 P1 事件，已存在的 @ 不重複通知

#### Scenario: 留言者本人不收到 @ 通知
- **WHEN** 用戶 A 建立留言並在 `mentions` 中包含自己的 `external_id`
- **THEN** 系統 SHALL 不為用戶 A 建立任何 notification_events 記錄

#### Scenario: 關注的人開始主題實踐觸發 P1 事件
- **WHEN** 用戶 A 開始一個新的主題實踐，且用戶 B 正在關注用戶 A
- **THEN** 系統 SHALL 為每一位關注用戶 A 的用戶建立一筆 P1 類型的 `notification_events` 記錄

#### Scenario: 關注的主題實踐打卡觸發 P2 事件
- **WHEN** 主題實踐完成一次打卡或結束，且用戶 B 正在關注該主題實踐
- **THEN** 系統 SHALL 為每一位關注該主題實踐的用戶建立一筆 P2 類型的 `notification_events` 記錄

#### Scenario: 收到 Buddy 請求觸發 P1 事件
- **WHEN** 用戶 A 向用戶 B 發送針對特定主題實踐的 Buddy 請求
- **THEN** 系統 SHALL 建立一筆 P1 類型的 `notification_events` 記錄，`entity_type` 為 `buddy_request`，payload 中包含 `practice_id` 與 `practice_title`

#### Scenario: Buddy 請求被接受觸發 P1 事件
- **WHEN** 用戶 B 接受用戶 A 的 Buddy 請求
- **THEN** 系統 SHALL 建立一筆 P1 類型的 `notification_events` 記錄，通知用戶 A，`entity_type` 為 `buddy_accepted`

#### Scenario: 追蹤者收到 Buddy 請求 fan-out 通知（P1）
- **WHEN** 用戶 A 向任意用戶發送 Buddy 請求，且用戶 C 正在關注用戶 A
- **THEN** 系統 SHALL 為每一位關注用戶 A 的用戶（C、D、...）各建立一筆 P1 類型的 `notification_events` 記錄，`entity_type` 為 `buddy_request`，payload 中包含 `practice_id` 與 `practice_title`
- **注意**：此 fan-out 邏輯與「收到 Buddy 請求觸發 P1 事件」（被請求方視角）為獨立事件，兩者同時產生不衝突

### Requirement: 事件不重複觸發
系統 MUST 確保同一事件不會重複建立 `notification_events` 記錄。

#### Scenario: 防止重複事件
- **WHEN** 相同的 (type, actor_id, entity_id) 組合在 1 分鐘內被觸發兩次
- **THEN** 系統 SHALL 忽略第二筆，僅保留第一筆記錄

### Requirement: 不通知自己
系統 MUST 不對觸發事件的用戶本人發送通知。

#### Scenario: 自己對自己的內容互動
- **WHEN** 用戶 A 對自己的內容按讚或留言
- **THEN** 系統 SHALL 不建立任何 `notification_events` 記錄
