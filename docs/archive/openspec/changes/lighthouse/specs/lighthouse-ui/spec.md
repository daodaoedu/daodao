## ADDED Requirements

### Requirement: 燈塔 route group 與 layout

系統 SHALL 在 product app（daodao-f2e `apps/product`）內以獨立 route group 提供燈塔（`/lighthouse`）。此 route group MUST 使用自有 layout，MUST NOT 沿用 product app 預設 layout。頁面結構 MUST 包含總覽（首頁）、系列 Programs（其下展開期 Cohorts，每期含儀表板／名單／本期動態／成果）、模板庫與組織設定。

#### Scenario: 燈塔使用自有 layout

- **WHEN** 使用者進入 `/lighthouse` 下任一頁面
- **THEN** 系統 SHALL 以燈塔自有 layout 呈現，MUST NOT 套用 product app 預設 layout

#### Scenario: 頁面結構完整

- **WHEN** 使用者在燈塔內導覽
- **THEN** 系統 SHALL 提供總覽、系列 Programs（含期 Cohorts 的儀表板／名單／本期動態／成果）、模板庫與組織設定各區

### Requirement: 燈塔登入門檻 middleware

系統 SHALL 以 middleware 對 `/lighthouse` route group 做登入門檻 gating。判定 MUST 依 `organization_members` 開通紀錄，即 `EXISTS organization_members WHERE user_id = ?`，MUST NOT 依賴任何全域 RBAC 角色。未開通使用者存取 `/lighthouse` 時，系統 MUST 顯示引導頁面而非直接進入燈塔。

#### Scenario: 已開通使用者進入燈塔

- **WHEN** 一位在 `organization_members` 中至少有一列的使用者存取 `/lighthouse`
- **THEN** middleware SHALL 放行，使用者進入燈塔

#### Scenario: 未開通使用者見引導頁

- **WHEN** 一位在 `organization_members` 中沒有任何列的使用者存取 `/lighthouse`
- **THEN** middleware SHALL 攔截並顯示引導頁面，MUST NOT 進入燈塔內容

#### Scenario: gating 不依賴全域角色

- **WHEN** middleware 判定燈塔存取權
- **THEN** 判定 SHALL 僅基於 `EXISTS organization_members`，MUST NOT 讀取任何全域 RBAC 角色

### Requirement: 燈塔總覽頁

系統 SHALL 提供燈塔總覽頁，呈現各期狀態卡與本週待辦（如 N 則打卡待回應、M 位需要鼓勵）。總覽頁 MUST 讓教練登入後於短時間內掌握今天該做什麼。

#### Scenario: 呈現各期狀態卡

- **WHEN** 教練開啟燈塔總覽頁
- **THEN** 系統 SHALL 顯示該教練所屬各期的狀態卡

#### Scenario: 呈現本週待辦

- **WHEN** 教練開啟燈塔總覽頁
- **THEN** 系統 SHALL 顯示本週待辦，包含待回應打卡則數與需要鼓勵的學員數

#### Scenario: 無進行中期別

- **WHEN** 教練所屬組織目前無進行中的期
- **THEN** 系統 SHALL 顯示空狀態，MAY 引導教練建立系列或期

### Requirement: 教練週報 digest

系統 SHALL 每週自動寄送教練摘要信（digest），內容 MUST 包含打卡數、待回應、需關心名單，並附直達燈塔對應頁面的連結。digest MUST 以 BullMQ 排程觸發，並複用既有 email template 系統。此機制 MUST 作為把教練被動拉回燈塔的觸達手段。

#### Scenario: 每週自動寄送摘要信

- **WHEN** 週報排程時點到達
- **THEN** 系統 SHALL 為每位教練產出並寄送摘要信，內容含打卡數、待回應數與需關心名單

#### Scenario: 摘要信含直達連結

- **WHEN** 系統產出教練摘要信
- **THEN** 信件 SHALL 包含直達燈塔對應頁面的連結

#### Scenario: 以 BullMQ 排程並複用 email template

- **WHEN** 系統排程與寄送週報 digest
- **THEN** 系統 SHALL 以 BullMQ 排程觸發，並使用既有 email template 系統，MUST NOT 另建平行寄信機制

### Requirement: 組織設定（薄版）

系統 SHALL 在燈塔內提供薄版組織設定頁，供編輯組織名稱、bio 與 external_link，並顯示成員列表。此設定 MUST 複用既有組織資料 CRUD 與成員管理能力。

#### Scenario: 編輯組織基本資料

- **WHEN** 教練在組織設定頁更新組織名稱、bio 或 external_link
- **THEN** 系統 SHALL 更新對應 `organization` 列並回傳最新資料

#### Scenario: 顯示成員列表

- **WHEN** 教練開啟組織設定頁
- **THEN** 系統 SHALL 顯示該組織 `organization_members` 的成員列表

#### Scenario: 非成員無法存取組織設定

- **WHEN** 一位不屬於該組織的使用者嘗試存取其組織設定
- **THEN** 系統 SHALL 拒絕存取
