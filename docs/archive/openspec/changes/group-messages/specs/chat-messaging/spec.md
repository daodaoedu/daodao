# chat-messaging

## Purpose

定義群組聊天室內訊息的傳送、歷史載入與增量更新、引用回覆、編輯、刪除、按讚、系統訊息、輸入區行為與角色權限矩陣。

## ADDED Requirements

### Requirement: 傳送訊息
成員 SHALL 能於 `writable` 聊天室送出純文字訊息（去除首尾空白後 1–2000 字）；僅空白 SHALL 被拒絕（400）且前端送出鈕 disabled。送出成功後訊息 SHALL 立即出現在對話區底部並帶回本人作者資訊，列表預覽 SHALL 同步更新。（FR-MSG-029、TP-MSG-042、TP-MSG-047、TP-MSG-048）

#### Scenario: 正常送出
- **WHEN** 成員輸入「今天也完成了」並按 Enter
- **THEN** 回 201，訊息出現在底部，輸入框清空，列表該室預覽為「你：今天也完成了」

#### Scenario: 僅空白
- **WHEN** 輸入框內容為「   」
- **THEN** 送出鈕為 disabled，按 Enter 不送出；若直接呼叫 API 則回 400

#### Scenario: Shift+Enter 換行
- **WHEN** 成員按 Shift+Enter
- **THEN** 輸入框換行而不送出

### Requirement: 歷史訊息分頁與增量更新
`GET /api/v1/chat-rooms/{roomId}/messages` 不帶游標時 SHALL 回最新 50 則（可指定 1–100），帶 `before=<id>` SHALL 回更舊的一頁並提供 `nextCursor` 與 `hasMore`；帶 `after=<id>`（可搭配 `since`）SHALL 回該 id 之後的新訊息、`since` 之後有變動的既有訊息（編輯、置頂、按讚計數）與被刪除的 id，以及 `serverTime`。前端 SHALL 對開啟中的聊天室至少每 5 秒以 `after` 模式拉取一次，並在向上捲動時以 `before` 載入更早訊息。已刪除的訊息 SHALL 不出現在任何分頁。（FR-MSG-005、TP-MSG-009）

#### Scenario: 首次進入
- **WHEN** 成員切換到某聊天室
- **THEN** 載入最新 50 則並捲動至底部

#### Scenario: 他人新訊息
- **WHEN** 甲送出一則訊息
- **THEN** 乙的畫面在 5 秒內於底部出現該訊息，不需重新整理

#### Scenario: 他人刪除
- **WHEN** 甲刪除一則乙已載入的訊息
- **THEN** 乙下次增量拉取的 `deletedIds` 含該 id，訊息從乙的畫面移除

### Requirement: 訊息呈現規則
每則一般訊息 SHALL 帶作者（名稱、頭像、`isHost`）、內容、時間、按讚數與本人是否已按讚、是否已編輯、是否置頂。前端 SHALL：本人訊息靠右、他人靠左（FR-MSG-009）；同作者連續訊息群組化，僅第一則顯示頭像與名稱，日期分隔線或系統訊息 SHALL 打斷群組（FR-MSG-010）；日期分隔線由訊息時間以 Asia/Taipei 日曆日推導（FR-MSG-008）；發起人訊息名稱旁顯示盾牌標記（FR-MSG-011）；已編輯訊息時間後顯示「・已編輯」（FR-MSG-013）。（TP-MSG-010～013、TP-MSG-016）

#### Scenario: 同作者連續三則
- **WHEN** 甲連續送出三則且中間無他人訊息、無跨日
- **THEN** 只有第一則顯示甲的頭像與名稱，後兩則緊接其下

#### Scenario: 跨日
- **WHEN** 甲昨天與今天各有一則連續訊息
- **THEN** 兩則之間出現日期分隔線（如「8 月 6 日 週三」），今天那則重新顯示頭像與名稱

#### Scenario: 系統訊息打斷
- **WHEN** 甲兩則訊息之間有一則「乙加入了聊天室」系統訊息
- **THEN** 系統訊息以置中樣式顯示，第二則訊息重新顯示甲的頭像與名稱

### Requirement: 引用回覆
成員 SHALL 能以 `replyToMessageId` 引用同一聊天室的一般訊息；引用系統訊息或他室訊息 SHALL 回 400。訊息回應 SHALL 含 `replyTo`（被引用者名稱、內容預覽、是否已刪除）。前端引用區塊 SHALL 顯示被引用者名稱與最多 2 行內容，點擊 SHALL 平滑捲動至原始訊息並高亮 1.6 秒；被引用訊息已刪除時 SHALL 顯示「此訊息已刪除」且點擊不動作、不報錯。（FR-MSG-012、FR-MSG-016、TP-MSG-014、TP-MSG-015、TP-MSG-019、TP-MSG-049）

#### Scenario: 回覆流程
- **WHEN** 成員對某訊息點「回覆」，輸入區上方出現引用列，輸入內容送出
- **THEN** 新訊息含引用區塊，引用列清除

#### Scenario: 引用目標已刪除
- **WHEN** 被引用的訊息之後被刪除
- **THEN** 引用區塊改顯示「此訊息已刪除」，點擊無反應

#### Scenario: 取消引用
- **WHEN** 成員在引用列按取消
- **THEN** 引用狀態清除，下一則送出不含引用

### Requirement: 編輯自己的訊息
成員 SHALL 僅能編輯自己的一般訊息（1–2000 字），編輯他人訊息 SHALL 回 403，編輯系統訊息 SHALL 回 400。編輯成功後內容被替換並標記已編輯。前端進入編輯模式 SHALL 在輸入區填入原文並顯示「編輯訊息」提示列；編輯與回覆模式 SHALL 互斥。（FR-MSG-017、FR-MSG-031、TP-MSG-020、TP-MSG-045、TP-MSG-046）

#### Scenario: 編輯流程
- **WHEN** 成員對自己的訊息點「編輯」，修改後送出
- **THEN** 原訊息內容更新、時間後顯示「・已編輯」，未新增訊息

#### Scenario: 編輯他人
- **WHEN** 發起人對他人訊息呼叫 `PATCH`
- **THEN** 回 403（發起人亦不可編輯他人訊息）

#### Scenario: 模式互斥
- **WHEN** 回覆模式中點擊「編輯」
- **THEN** 引用列消失、顯示編輯提示列並填入原文

### Requirement: 刪除訊息
成員 SHALL 能刪除自己的訊息；發起人 SHALL 能刪除任何人的訊息（含系統訊息）；一般成員刪除他人訊息 SHALL 回 403。刪除為軟刪除：訊息不再出現在時間軸與搜尋，被引用處顯示已刪除，若該訊息為置頂 SHALL 同時取消置頂。（FR-MSG-018、TP-MSG-021）

#### Scenario: 發起人刪除他人訊息
- **WHEN** 發起人對某成員的訊息選「刪除」
- **THEN** 回 204，所有成員的畫面於下次增量拉取後移除該訊息

#### Scenario: 一般成員刪除他人
- **WHEN** 一般成員對他人訊息呼叫 `DELETE`
- **THEN** 回 403，且前端不顯示該選項

#### Scenario: 刪除置頂訊息
- **WHEN** 被刪除的訊息原為置頂
- **THEN** 置頂列表不再包含它，置頂數減 1

### Requirement: 按讚
成員 SHALL 能對一般訊息 toggle 按讚（`PUT`／`DELETE .../like`），重複操作冪等。訊息 SHALL 帶 `likeCount` 與 `likedByMe`；前端有按讚數的訊息在氣泡下方顯示反應 pill，已按讚與未按讚樣式區分，pill 可再次點擊 toggle。（FR-MSG-015、TP-MSG-018）

#### Scenario: 按讚與取消
- **WHEN** 成員點擊按讚，再點一次
- **THEN** 第一次 `likeCount` +1 且 `likedByMe=true`，第二次還原

#### Scenario: 重複 PUT
- **WHEN** 已按讚的成員再次呼叫 `PUT like`
- **THEN** 回 200，`likeCount` 不變

### Requirement: 系統訊息
成員加入期、退出期或被移除時系統 SHALL 在該室新增一則 `kind='system'` 訊息（事件、當事人），無作者；系統訊息 SHALL 不可被回覆、按讚、編輯、置頂，發起人可刪除。系統訊息寫入失敗 SHALL 不影響加入／退出本身。（FR-MSG-008、TP-MSG-012）

#### Scenario: 成員加入
- **WHEN** 乙完成加入某期
- **THEN** 該室出現「乙 加入了聊天室」系統訊息，計入其他成員未讀

#### Scenario: 對系統訊息按讚
- **WHEN** 成員對系統訊息呼叫 `PUT like`
- **THEN** 回 400

### Requirement: 訊息操作工具列與選單
前端 SHALL 於滑鼠移入訊息時顯示操作列：按讚、回覆；本人訊息另有編輯；本人或發起人另有「更多」。「更多」選單 SHALL 依角色顯示：發起人可見置頂／已置頂 toggle 與刪除；一般成員僅在自己的訊息可見刪除。（FR-MSG-014、FR-MSG-018、TP-MSG-017）

#### Scenario: 一般成員看他人訊息
- **WHEN** 一般成員 hover 他人訊息
- **THEN** 只出現按讚與回覆

#### Scenario: 發起人看他人訊息
- **WHEN** 發起人 hover 他人訊息並開啟更多選單
- **THEN** 選單含「置頂」與「刪除」，不含「編輯」

### Requirement: 切換聊天室時重置狀態
切換聊天室時前端 SHALL 清除輸入草稿、引用狀態、編輯狀態、訊息選單、成員面板、置頂面板與搜尋列，並捲動至新聊天室底部。（FR-MSG-005、FR-MSG-028、TP-MSG-008、TP-MSG-009）

#### Scenario: 帶著草稿切換
- **WHEN** 使用者在 A 室輸入未送出的文字並處於回覆模式，點擊 B 室
- **THEN** B 室輸入框為空、無引用列，畫面在底部

### Requirement: 角色權限矩陣
系統 SHALL 依下表限制操作；伺服器為最終守門，前端只是隱藏不可用的操作。（FR-MSG-033）

| 操作 | 發起人 | 一般成員 |
|---|---|---|
| 傳送、按讚、回覆、編輯自己的、刪除自己的、搜尋、查看成員 | 允許 | 允許 |
| 刪除他人的訊息 | 允許 | 403 |
| 置頂／取消置頂 | 允許 | 403 |
| 管理成員 | 不適用（系統自動） | 不適用 |

#### Scenario: 一般成員嘗試置頂
- **WHEN** 一般成員直接呼叫 `PUT .../pin`
- **THEN** 回 403
