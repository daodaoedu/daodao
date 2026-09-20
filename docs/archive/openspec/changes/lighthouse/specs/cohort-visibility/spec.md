## ADDED Requirements

### Requirement: 可見性三重 gating

系統 SHALL 以「owner/assistant 身分」×「期綁定」×「關係存續」三者同時成立作為教練存取學員資料的必要條件。三者中任一不成立時，系統 MUST 拒絕存取。可見性 MUST NOT 依賴任何全域 RBAC 角色，MUST 完全基於 cohort 關係。

#### Scenario: 三條件同時成立時可見

- **WHEN** 一位使用者對某期具 owner 或 assistant 身分、目標資料綁定於該期、且相關關係仍存續
- **THEN** 系統 SHALL 允許其存取該期範圍內的學員資料

#### Scenario: 缺少期身分時不可見

- **WHEN** 一位使用者對某期不具 owner 或 assistant 身分
- **THEN** 系統 SHALL 拒絕其存取該期資料並回傳 403 Forbidden

#### Scenario: 資料未綁定本期時不可見

- **WHEN** 一位教練嘗試存取一則未綁定其所轄期的資料
- **THEN** 系統 SHALL 拒絕存取

### Requirement: 教練可見資料範圍

系統 SHALL 讓教練在其所轄期範圍內看見：學員名單（暱稱、頭像、加入時間）、綁定本期的 practice 及其打卡、本期動態牆互動、本期聚合統計。系統 MUST NOT 讓教練看見：學員 email、學員真實姓名、學員其他 practice、學員在其他期的打卡、學員個人足跡或追蹤關係。

#### Scenario: 教練檢視本期學員名單

- **WHEN** 一位教練檢視其所轄期的學員名單
- **THEN** 系統 SHALL 僅回傳每位學員的暱稱、頭像與加入時間

#### Scenario: 教練檢視綁定本期的打卡

- **WHEN** 一位教練檢視某學員綁定於本期的 practice 打卡
- **THEN** 系統 SHALL 回傳該打卡內容

#### Scenario: 教練無法看見學員其他期的打卡

- **WHEN** 一位教練嘗試存取某學員在另一期的打卡
- **THEN** 系統 SHALL 拒絕存取，因該打卡未綁定其所轄期

#### Scenario: 教練無法看見學員個人足跡與追蹤關係

- **WHEN** 一位教練嘗試存取某學員的個人足跡或追蹤關係
- **THEN** 系統 SHALL 拒絕存取

### Requirement: API 第一道防線——路由範圍化

系統 SHALL 將組織端 endpoint 掛在 `/api/v1/lighthouse/cohorts/:cohortId/*` 路由前綴下，並套用 `requireCohortRole('owner')` middleware。無法通過該 middleware 的請求 MUST 在進入業務邏輯前被拒絕。

#### Scenario: 具 owner 身分通過路由 middleware

- **WHEN** 一位對 `:cohortId` 具 owner 身分的使用者呼叫 `/api/v1/lighthouse/cohorts/:cohortId/*` 端點
- **THEN** 系統 SHALL 通過 `requireCohortRole('owner')` 並進入後續處理

#### Scenario: 不具 owner 身分被 middleware 擋下

- **WHEN** 一位對 `:cohortId` 不具 owner 身分的使用者呼叫該路由群組
- **THEN** 系統 SHALL 在 middleware 階段拒絕請求並回傳 403 Forbidden，MUST NOT 進入業務邏輯

### Requirement: API 第二道防線——物件級歸屬檢查

系統 SHALL 在通過角色檢查後，對每個被存取的物件額外驗證其確實綁定於當前 `:cohortId`，以防 IDOR。存取某打卡時，系統 MUST 驗證「該打卡所屬 practice 確實綁定本期」。歸屬檢查失敗時 MUST 拒絕存取。

#### Scenario: 打卡所屬 practice 綁定本期時通過

- **WHEN** 一位教練存取某打卡，其所屬 practice 的 `cohort_id` 等於當前 `:cohortId`
- **THEN** 系統 SHALL 允許存取

#### Scenario: 跨期 IDOR 嘗試被擋

- **WHEN** 一位教練帶入一個不屬於本期的打卡 id 進行存取
- **THEN** 系統 SHALL 因物件級歸屬檢查失敗而拒絕，回傳 403 或 404

### Requirement: API 第三道防線——回傳欄位白名單

系統 SHALL 以 Zod response validator 對回傳資料做欄位白名單控制。學員物件 MUST 僅回傳 `id`、`nickname`、`avatar`、`joined_at`。學員 email MUST 永不回傳給教練。

#### Scenario: 學員物件僅回傳白名單欄位

- **WHEN** 系統回傳教練可見的學員物件
- **THEN** 系統 SHALL 僅包含 `id`、`nickname`、`avatar`、`joined_at`，MUST NOT 包含 email 或真實姓名

#### Scenario: 內部帶有 email 的資料經 validator 後不外洩

- **WHEN** 內部查詢結果包含學員 email 欄位並經 response validator 序列化
- **THEN** 系統 SHALL 移除 email 欄位，回傳中 MUST NOT 出現 email

### Requirement: 三層存續生命週期——名冊層

系統 SHALL 將名冊層資料（暱稱、頭像、參加過哪幾期、完成狀態）設為永久保留。名冊層 MUST 在期滿與學員離開後仍可查詢。

#### Scenario: 期滿後名冊層仍可見

- **WHEN** 一個期已期滿
- **THEN** 系統 SHALL 仍允許教練查詢該期名冊層資料（暱稱、頭像、參加過哪幾期、完成狀態）

### Requirement: 三層存續生命週期——內容層

系統 SHALL 將內容層資料（打卡、心得、互動）設為期間可見，並在期滿後唯讀保留 90 天，之後消失。教練 MUST NOT 在期滿 90 天後存取內容層資料。

#### Scenario: 期間內內容層可見可互動

- **WHEN** 期仍在進行中，教練檢視學員打卡與互動
- **THEN** 系統 SHALL 允許檢視並允許互動

#### Scenario: 期滿 90 天內內容層唯讀

- **WHEN** 期已期滿但未超過 90 天，教練檢視內容層資料
- **THEN** 系統 SHALL 以唯讀方式回傳，MUST NOT 允許新增互動

#### Scenario: 期滿超過 90 天內容層消失

- **WHEN** 期滿已超過 90 天，教練嘗試存取內容層資料
- **THEN** 系統 SHALL 不再提供該資料

### Requirement: 三層存續生命週期——現況層

系統 SHALL 將現況層定義為學員離開後的活動，並 MUST 使其對教練永不可見。學員退出後產生的任何活動 MUST NOT 出現在教練視野中。

#### Scenario: 學員離開後的活動不可見

- **WHEN** 一位學員退出某期後於他處產生新活動
- **THEN** 系統 SHALL NOT 讓該期教練看見此活動

### Requirement: 學員退出的資料處理

系統 SHALL 在學員退出某期時，令其內容層資料即時對教練消失，於名冊層保留最小紀錄（參加過、已退出），並保留聚合統計的歷史數字。

#### Scenario: 退出後內容層即時消失

- **WHEN** 一位學員退出某期
- **THEN** 系統 SHALL 令其打卡、心得、互動等內容層資料即時對教練不可見

#### Scenario: 退出後名冊層留最小紀錄

- **WHEN** 一位學員退出某期
- **THEN** 系統 SHALL 於名冊層保留最小紀錄，標示其曾參加且已退出

#### Scenario: 退出不回溯調整聚合統計

- **WHEN** 一位學員退出某期
- **THEN** 系統 SHALL 保留聚合統計中已計入的歷史數字，MUST NOT 回溯扣除

### Requirement: 帳號刪除的資料處理

系統 SHALL 在使用者刪除帳號時，將其名冊列匿名化而 MUST NOT 刪除該列（呈現為「已刪除的使用者・第 N 期・完成狀態」），且快照統計數字 MUST 保持不變。

#### Scenario: 帳號刪除後名冊列匿名化保留

- **WHEN** 一位使用者刪除帳號
- **THEN** 系統 SHALL 將其名冊列匿名化為「已刪除的使用者・第 N 期・完成狀態」，MUST NOT 刪除該列

#### Scenario: 帳號刪除不改變快照統計

- **WHEN** 一位使用者刪除帳號
- **THEN** 系統 SHALL 保持既有 `cohort_stat_snapshots` 的數字不變

### Requirement: 聚合統計查詢方向約束

系統 SHALL 令所有聚合統計查詢一律從 cohort 出發，經 practices join 取得資料，MUST NOT 以 `user_id` 為查詢起點。此約束確保統計永遠限縮在期範圍內，不外洩個人跨期資料。

#### Scenario: 聚合統計由 cohort join practices

- **WHEN** 系統計算某期的聚合統計
- **THEN** 系統 SHALL 由 `cohort_id` 出發 join `practices` 取數，MUST NOT 以 `user_id` 為起點查詢

#### Scenario: 拒絕以 user_id 為起點的聚合查詢

- **WHEN** 一段查詢以 `user_id` 為起點嘗試取得跨期聚合資料
- **THEN** 系統 SHALL NOT 採用該查詢方向，統計 MUST 限縮於單一 cohort 範圍
