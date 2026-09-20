## ADDED Requirements

### Requirement: 系列（Program）CRUD

系統 SHALL 提供系列的建立、編輯與封存能力。系列（`programs`）隸屬於一個組織（`organization_id`），為無時間屬性的容器。系列採軟刪除（`deleted_at`）。當系列底下仍有任何期（cohort）時，API MUST 擋下刪除操作。

#### Scenario: 建立系列

- **WHEN** 一位組織成員在其組織下建立系列，提供 name 與 description
- **THEN** 系統 SHALL 建立 `programs` 列，綁定該 `organization_id`，並回傳建立結果

#### Scenario: 編輯系列基本資料

- **WHEN** 組織成員更新系列的 name 或 description
- **THEN** 系統 SHALL 更新對應 `programs` 列並更新 `updated_at`

#### Scenario: 封存無期的系列

- **WHEN** 組織成員封存一個底下沒有任何 cohort 的系列
- **THEN** 系統 SHALL 設定 `deleted_at` 為當前時間，系列進入軟刪除狀態

#### Scenario: 嘗試刪除仍有期的系列

- **WHEN** 組織成員嘗試刪除一個底下仍存在至少一個 cohort 的系列
- **THEN** 系統 SHALL 拒絕請求並回傳錯誤，`programs` 列不被刪除

### Requirement: 期（Cohort）CRUD

系統 SHALL 提供期的建立、編輯與封存能力。期（`cohorts`）隸屬於一個系列（`program_id`），MUST 對 `(program_id, slug)` 維持唯一約束。期含 `display_name`、`start_date`、`end_date`、`invite_message` 等欄位。

#### Scenario: 建立期

- **WHEN** 組織成員在一個系列下建立期，提供 slug、display_name、start_date、end_date
- **THEN** 系統 SHALL 建立 `cohorts` 列，`status` 預設為 `draft`，並綁定該 `program_id`

#### Scenario: 同一系列下 slug 重複

- **WHEN** 組織成員在同一系列下建立與既有期相同 slug 的期
- **THEN** 系統 SHALL 因 `(program_id, slug)` 唯一約束而拒絕

#### Scenario: 編輯期基本資料

- **WHEN** 組織成員更新期的 display_name、日期或 invite_message
- **THEN** 系統 SHALL 更新對應 `cohorts` 列

#### Scenario: 封存期

- **WHEN** 組織成員將期的 `status` 設為 `archived`
- **THEN** 系統 SHALL 更新 `cohorts.status`，該期進入封存狀態

### Requirement: 期狀態只存編輯狀態

系統 SHALL 讓 `cohorts.status` 僅表達編輯狀態，值為 `draft`、`published`、`archived` 之一。進行中／已結束的運行狀態 MUST 由 `start_date` 與 `end_date` 相對於當前時間推導，MUST NOT 以排程 cron 翻寫 `status`。

#### Scenario: 已發布且日期進行中

- **WHEN** 一個 `status` 為 `published` 的期，其 start_date 已過而 end_date 未到
- **THEN** 系統 SHALL 由日期推導其為「進行中」，`status` 欄位維持 `published` 不變

#### Scenario: 已發布且已過結束日

- **WHEN** 一個 `status` 為 `published` 的期，其 end_date 已過
- **THEN** 系統 SHALL 由日期推導其為「已結束」，`status` 欄位仍維持 `published`，不由 cron 改寫

#### Scenario: 草稿期不對外開放加入

- **WHEN** 一個 `status` 為 `draft` 的期收到加入請求
- **THEN** 系統 SHALL 拒絕加入，因該期尚未發布

### Requirement: 連結時效跟隨期

系統 SHALL 以 `join_deadline` 控制加入連結的時效。當 `join_deadline` 為 NULL 時，系統 MUST 以該期的 `end_date` 作為預設加入截止日。

#### Scenario: 未設定 join_deadline 時以 end_date 為準

- **WHEN** 一個期的 `join_deadline` 為 NULL，使用者在 end_date 之前嘗試加入
- **THEN** 系統 SHALL 允許加入，因預設截止日為 end_date

#### Scenario: 已過 end_date 且未設 join_deadline

- **WHEN** 一個期的 `join_deadline` 為 NULL，使用者在 end_date 之後嘗試加入
- **THEN** 系統 SHALL 拒絕加入

#### Scenario: 明確設定 join_deadline 早於 end_date

- **WHEN** 一個期的 `join_deadline` 設為早於 end_date 的日期，使用者在該截止日之後、end_date 之前嘗試加入
- **THEN** 系統 SHALL 拒絕加入，以 `join_deadline` 為準

### Requirement: 人數上限

系統 SHALL 支援以 `capacity` 設定期的人數上限。當 `capacity` 為 NULL 時，MUST 視為不限人數。

#### Scenario: 未設定上限

- **WHEN** 一個期的 `capacity` 為 NULL，有新成員加入
- **THEN** 系統 SHALL 允許加入，不做人數上限檢查

#### Scenario: 已達人數上限

- **WHEN** 一個期已加入（status=joined）人數等於 `capacity`，有新成員嘗試加入
- **THEN** 系統 SHALL 拒絕加入並提示已額滿

### Requirement: join_token 管理

系統 SHALL 以 `cohorts.join_token`（UUID）控制邀請連結／QR 的加入入口。系統 MUST 支援重設（rotate）`join_token`，以及將其設為 NULL 以暫停加入。

#### Scenario: 重設 join_token

- **WHEN** 組織成員對一個期執行 join_token 重設
- **THEN** 系統 SHALL 產生新的 UUID 覆寫 `join_token`，舊連結／QR SHALL 立即失效

#### Scenario: 暫停加入

- **WHEN** 組織成員將期的 `join_token` 設為 NULL
- **THEN** 系統 SHALL 使任何透過連結／QR 的加入請求都被拒絕

#### Scenario: 以失效的 join_token 加入

- **WHEN** 使用者以一個不符合當前 `join_token` 的連結嘗試加入
- **THEN** 系統 SHALL 拒絕加入

### Requirement: 90 天唯讀後內容消失

系統 SHALL 在期 `end_date` 之後的 90 天內對內容層維持唯讀，`end_date + 90 天` 之後內容層 MUST 消失。此界線 MUST 由 middleware 以 `end_date + 90` 推導，MUST NOT 依賴 cron 翻寫。名冊層（enrollment）與聚合快照 MUST 予以保留。

#### Scenario: 結束後 90 天內唯讀

- **WHEN** 當前時間介於期的 end_date 與 `end_date + 90 天` 之間，教練存取本期內容
- **THEN** 系統 SHALL 以唯讀方式提供內容，不允許新增或修改

#### Scenario: 結束後超過 90 天內容消失

- **WHEN** 當前時間晚於 `end_date + 90 天`，使用者存取本期內容層
- **THEN** 系統 SHALL 不再提供內容層資料，但名冊層與聚合快照仍保留

### Requirement: 過期連結落地頁

系統 SHALL 為已過期或已暫停加入的期提供落地頁，內容包含所屬組織的簡介、`external_link`，以及「看看下一期」的引導。

#### Scenario: 以過期連結進入落地頁

- **WHEN** 使用者以一個已超過加入截止日的連結進入
- **THEN** 系統 SHALL 顯示組織簡介與 external_link，並提供「看看下一期」引導

#### Scenario: 加入已暫停時進入落地頁

- **WHEN** 使用者以連結進入一個 `join_token` 為 NULL 的期
- **THEN** 系統 SHALL 顯示過期連結落地頁而非加入流程
