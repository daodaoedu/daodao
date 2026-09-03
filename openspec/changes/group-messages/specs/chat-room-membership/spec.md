# chat-room-membership

## Purpose

定義活動課程群組聊天室的存在條件、誰是成員與發起人、聊天室列表與未讀數、已讀游標、成員面板與在線狀態，以及活動課程生命週期對聊天室的唯讀與下線規則。

## ADDED Requirements

### Requirement: 活動課程自動附帶一間聊天室
每一個 `programs.kind='lighthouse'` 的期（cohort）SHALL 對應且僅對應一間群組聊天室，於期建立（含複製）時自動建立，發起人無須手動操作；既有的 lighthouse 期 SHALL 於本功能上線時一次補齊。`programs.kind='challenge'` 的期 SHALL 不建立聊天室，且任何聊天室端點對其 SHALL 回 404。（FR-MSG-001、TP-MSG-001、TP-MSG-004）

#### Scenario: 燈塔後台建立期
- **WHEN** 組織成員透過燈塔 API 建立一個 lighthouse 期
- **THEN** 同一交易內建立對應聊天室，`GET /api/v1/me/chat-rooms` 對該組織成員立即列出該聊天室

#### Scenario: 複製期
- **WHEN** 組織成員複製一個 lighthouse 期
- **THEN** 副本擁有自己的新聊天室，原期聊天室的訊息不被複製

#### Scenario: 共同挑戰不建立
- **WHEN** admin 建立 `kind='challenge'` 的期，且有使用者加入
- **THEN** 該期沒有聊天室，`GET /api/v1/me/chat-rooms` 不列出它

#### Scenario: 上線前已存在的期
- **WHEN** 功能上線後成員第一次開啟列表
- **THEN** 所有既有 lighthouse 期各有一間空聊天室（無訊息、無未讀）

### Requirement: 成員與發起人由期的資料推導
聊天室成員 SHALL 為該期 `status='joined'` 的參與者與該期所屬組織的組織成員之聯集；發起人（host）SHALL 為 enrollment role 屬 owner／assistant 者與組織成員之聯集。系統 SHALL 不提供手動新增／移除聊天室成員的介面；參與者退出或被移除後 SHALL 立即失去該聊天室的存取。（FR-MSG-002、TP-MSG-002、TP-MSG-003）

#### Scenario: 加入活動課程後自動成為成員
- **WHEN** 使用者透過加入連結或邀請完成加入某期
- **THEN** 該使用者可存取該期聊天室，成員面板列出該使用者，且時間軸出現一則「加入」系統訊息

#### Scenario: 組織成員自動為發起人
- **WHEN** 某組織成員沒有任何 enrollment 但該期屬於其組織
- **THEN** 該組織成員為聊天室成員且 `viewerRole='host'`，訊息作者旁顯示發起人標記

#### Scenario: 退出後失去存取
- **WHEN** 成員呼叫 `/api/v1/cohorts/{cohortId}/exit` 或被組織移除
- **THEN** 後續對該聊天室任一端點回 403，列表不再列出該聊天室，且時間軸出現一則「離開」系統訊息

#### Scenario: 非成員存取
- **WHEN** 未加入該期、亦非該組織成員的登入使用者存取 `/api/v1/chat-rooms/{roomId}/*`
- **THEN** 回 403

### Requirement: 聊天室列表與未讀數
`GET /api/v1/me/chat-rooms` SHALL 回傳登入者所屬全部 lighthouse 聊天室，每筆含名稱（與期同名）、圖示派生資訊、最新訊息預覽（含是否為本人所發）、最近活動時間、成員數、`unreadCount`、`contentState`；並 SHALL 回傳 `totalUnread`。未讀數 SHALL 定義為該室 id 大於本人已讀游標、未刪除、且非本人所發的訊息數（系統訊息計入）。列表 SHALL 依最近活動時間降冪。（FR-MSG-003、FR-MSG-004、TP-MSG-005、TP-MSG-006）

#### Scenario: 他人發言後
- **WHEN** 甲在某室發 3 則訊息，乙尚未開啟該室
- **THEN** 乙的列表該室 `unreadCount=3`、`totalUnread` 含這 3 則，預覽為甲的最後一則

#### Scenario: 本人發言不計未讀
- **WHEN** 乙在該室送出一則訊息
- **THEN** 乙的該室 `unreadCount` 不因自己的訊息增加，預覽顯示為「你：{內容}」（`lastMessage.isMine=true`）

#### Scenario: 從未開啟的房間
- **WHEN** 乙沒有該室的已讀游標
- **THEN** 該室所有非本人未刪除訊息皆計入未讀

### Requirement: 已讀游標
`PUT /api/v1/chat-rooms/{roomId}/read` SHALL 以 `lastReadMessageId` 更新本人在該室的已讀游標，游標只能前進；已結束（唯讀）的聊天室 SHALL 仍允許更新游標。前端 SHALL 於切換至聊天室並顯示最新訊息時標記已讀，使該室與側邊導覽列的未讀數歸零。（FR-MSG-004、TP-MSG-007）

#### Scenario: 切換到有未讀的聊天室
- **WHEN** 使用者點擊列表中 `unreadCount=5` 的聊天室
- **THEN** 前端送出 `PUT read`，該室 badge 消失，側邊導覽列「訊息」未讀總數減少 5

#### Scenario: 游標不倒退
- **WHEN** 客戶端以較舊的 `lastReadMessageId` 呼叫 `PUT read`
- **THEN** 游標維持原值，回應 200

### Requirement: 側邊導覽列未讀總數
產品站側邊導覽列的「訊息」入口 SHALL 顯示所有聊天室未讀總數的 badge（超過 99 顯示「99+」），總數為 0 時 SHALL 不渲染 badge；未讀總數 SHALL 至少每 30 秒與伺服器同步一次。（FR-MSG-004）

#### Scenario: 有未讀
- **WHEN** `GET /api/v1/me/chat-rooms` 回 `totalUnread=7`
- **THEN** 桌機與手機版導覽列「訊息」項顯示「7」的 badge

#### Scenario: 無未讀
- **WHEN** `totalUnread=0`
- **THEN** 「訊息」項不顯示任何 badge

### Requirement: 成員面板與在線狀態
`GET /api/v1/chat-rooms/{roomId}/members` SHALL 回傳全部成員（頭像、名稱、描述、`isHost`、`isOnline`）。`isOnline` SHALL 定義為該成員在最近 90 秒內有開啟此聊天室；在線判定不可用時 SHALL 全部回 false 而非錯誤。對話區標頭的成員按鈕 SHALL 顯示前 3 位成員頭像堆疊與成員總數，點擊 toggle 成員面板；成員面板開啟時置頂面板 SHALL 關閉（互斥）。（FR-MSG-007、FR-MSG-022、TP-MSG-027、TP-MSG-028、TP-MSG-029）

#### Scenario: 成員正在瀏覽
- **WHEN** 甲在 60 秒內持續開啟該聊天室
- **THEN** 乙開啟成員面板時甲的頭像右下角顯示在線圓點

#### Scenario: 成員離開一段時間
- **WHEN** 甲關閉頁面超過 90 秒
- **THEN** 乙重新開啟成員面板時甲不再顯示在線

#### Scenario: 面板互斥
- **WHEN** 置頂面板開啟中，使用者點擊成員按鈕
- **THEN** 置頂面板關閉、成員面板開啟

### Requirement: 期的生命週期決定聊天室可寫性
聊天室 SHALL 依所屬期的狀態回傳 `contentState`：期結束日之前為 `writable`；結束日之後或期 `status='archived'` 為 `read_only`，此時傳送、編輯、刪除、按讚、置頂等寫入操作 SHALL 回 409，讀取與已讀游標照常；結束日後超過 90 天 SHALL 對所有端點回 410 且不再出現在列表。組織停權時其聊天室 SHALL 回 404。（TP-MSG-050：已結束仍可查看歷史訊息；是否可再發言 FRD 未提，本規格取唯讀）

#### Scenario: 已結束的期
- **WHEN** 今天（Asia/Taipei）晚於期的結束日
- **THEN** 列表仍列出該室並標示唯讀，`POST messages` 回 409，`GET messages` 正常

#### Scenario: 結束超過 90 天
- **WHEN** 今天晚於結束日 + 90 天
- **THEN** 該室不出現在列表，直接存取回 410
