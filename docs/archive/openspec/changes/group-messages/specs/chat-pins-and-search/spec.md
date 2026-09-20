# chat-pins-and-search

## Purpose

定義發起人的置頂訊息機制（置頂 banner、置頂面板、標頭按鈕）以及聊天室列表篩選與室內訊息搜尋、結果導航與高亮。

## ADDED Requirements

### Requirement: 置頂與取消置頂
發起人 SHALL 能對一般訊息置頂（`PUT .../pin`）與取消置頂（`DELETE .../pin`），操作冪等；一般成員 SHALL 回 403；已刪除或系統訊息 SHALL 回 400。`GET /api/v1/chat-rooms/{roomId}/pins` SHALL 依置頂時間由新到舊回傳全部置頂訊息，聊天室詳情與增量拉取 SHALL 帶 `pinnedCount`。（FR-MSG-018、FR-MSG-020、TP-MSG-022）

#### Scenario: 發起人置頂
- **WHEN** 發起人對某訊息選「置頂」
- **THEN** 該訊息 `isPinned=true`，置頂列表第一筆為它，選單文字改為「已置頂」

#### Scenario: 再次點擊取消
- **WHEN** 發起人對已置頂訊息選「已置頂」
- **THEN** 該訊息 `isPinned=false`，置頂列表移除它

### Requirement: 置頂 Banner
有置頂訊息且使用者尚未收起時，對話區標頭下方 SHALL 顯示 banner：最新一則置頂的作者名與單行內容預覽、收起按鈕；點擊文字區域開啟置頂面板。收起後 SHALL 不再顯示，直到有新的置頂訊息加入（以最新置頂訊息 id 是否改變判定），收起狀態為每位使用者各自的本機狀態。（FR-MSG-019、TP-MSG-023、TP-MSG-024）

#### Scenario: 收起後新增置頂
- **WHEN** 使用者收起 banner，之後發起人置頂另一則訊息
- **THEN** banner 重新出現並顯示新的那一則

#### Scenario: 收起後重新整理
- **WHEN** 使用者收起 banner 後重新整理頁面，置頂未變
- **THEN** banner 維持收起

### Requirement: 置頂面板與標頭按鈕
標頭的置頂按鈕 SHALL 僅在至少一則置頂時顯示，banner 顯示中與已收起時樣式不同；點擊開啟右側置頂面板（標題「置頂訊息 · N」），逆序列出置頂訊息（作者、時間、全文），發起人每則可見「取消置頂」；無置頂時面板顯示空狀態文案。置頂面板開啟時成員面板 SHALL 關閉。（FR-MSG-020、FR-MSG-021、TP-MSG-025、TP-MSG-026、TP-MSG-029）

#### Scenario: 無置頂
- **WHEN** 聊天室沒有任何置頂訊息
- **THEN** 標頭不顯示置頂按鈕；若面板因取消最後一則置頂而仍開著，顯示「還沒有置頂訊息。發起人可以在訊息下方按「置頂」，把重要的事留在最上面。」

#### Scenario: 發起人在面板取消置頂
- **WHEN** 發起人於面板點某則「取消置頂」
- **THEN** 該則自面板移除，標題數字減 1

### Requirement: 聊天室列表篩選
聊天室列表頂部 SHALL 提供搜尋框（placeholder「搜尋聊天室」），以聊天室名稱即時篩選（大小寫不敏感），清空恢復完整列表，無結果顯示「沒有符合的聊天室」；篩選不呼叫伺服器。（FR-MSG-023、TP-MSG-030～032）

#### Scenario: 輸入部分名稱
- **WHEN** 使用者輸入「覺察」
- **THEN** 只顯示名稱含「覺察」的聊天室

#### Scenario: 無符合
- **WHEN** 輸入的關鍵字沒有任何聊天室符合
- **THEN** 顯示「沒有符合的聊天室」

### Requirement: 室內訊息搜尋
`GET /api/v1/chat-rooms/{roomId}/messages/search?q=` SHALL 以 1–100 字的關鍵字對該室未刪除的一般訊息內容與作者名稱做不分大小寫的子字串比對，回傳符合訊息的 id 與時間（新到舊、最多 200 筆）與 `total`；系統訊息與已刪除訊息 SHALL 不納入。前端 SHALL 由標頭搜尋按鈕展開搜尋列（placeholder「在這個聊天室搜尋」，位於置頂 banner 上方），Enter 或停止輸入 300ms 後查詢，顯示「N 則結果」或「沒有符合的訊息」。（FR-MSG-024、FR-MSG-025、TP-MSG-033～035）

#### Scenario: 比對內容
- **WHEN** 成員搜尋「打卡」
- **THEN** 回傳所有內容含「打卡」的一般訊息 id，畫面顯示「N 則結果」

#### Scenario: 比對作者
- **WHEN** 成員搜尋某成員暱稱
- **THEN** 該成員發的一般訊息全部命中

#### Scenario: 無結果
- **WHEN** 關鍵字無任何命中
- **THEN** 顯示「沒有符合的訊息」，上下箭頭 disabled

### Requirement: 搜尋結果導航與高亮
前端 SHALL 提供上／下箭頭依序跳至上一則／下一則命中訊息，顯示「第 M / N 則」，首尾時對應箭頭 disabled；跳轉 SHALL 平滑捲動並高亮 1.6 秒，目標尚未載入時 SHALL 自動向前載入更早的分頁直到目標出現。已載入訊息中符合關鍵字的文字 SHALL 以黃底標示、目前焦點以較深黃色區分；關閉搜尋列 SHALL 清除關鍵字、結果與高亮並回到底部；切換聊天室 SHALL 自動關閉搜尋列；搜尋中仍可正常傳送與操作訊息。（FR-MSG-026、FR-MSG-027、FR-MSG-028、TP-MSG-036～041）

#### Scenario: 跳到尚未載入的舊訊息
- **WHEN** 目前只載入最新 50 則，使用者按「上一則」跳到第 300 則前的命中
- **THEN** 前端連續載入更早分頁直到該訊息出現，再捲動並高亮

#### Scenario: 關閉搜尋
- **WHEN** 使用者關閉搜尋列
- **THEN** 高亮清除、計數消失、對話區回到底部

#### Scenario: 搜尋中傳送
- **WHEN** 搜尋列開啟時使用者送出一則訊息
- **THEN** 訊息正常送出並出現在底部，搜尋狀態不變
