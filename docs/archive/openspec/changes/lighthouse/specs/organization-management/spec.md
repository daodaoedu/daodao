## ADDED Requirements

### Requirement: Admin 人工建立組織

系統 SHALL 提供 admin 建立組織（organization）的能力。建立時 MUST 記錄審核者（`approved_by`）與審核時間（`approved_at`），組織初始 `status` MUST 為 `active`。組織是開期（Program/Cohort）的唯一主體。

#### Scenario: Admin 建立並開通組織

- **WHEN** admin 透過審核流程建立一個新組織，提供 name 與 bio
- **THEN** 系統 SHALL 建立 `organization` 列，`status` 設為 `active`，並將 `approved_by` 記為當前 admin 的 user_id、`approved_at` 記為當前時間

#### Scenario: 建立組織時同時指定首位擁有者

- **WHEN** admin 建立組織並指定一位 user 作為首位成員
- **THEN** 系統 SHALL 在 `organization_members` 建立一列，`role` 為 `owner`，並綁定該 `organization_id` 與 `user_id`

#### Scenario: 非 admin 嘗試建立組織

- **WHEN** 非 admin 身分呼叫組織建立端點
- **THEN** 系統 SHALL 拒絕請求並回傳 403 Forbidden

### Requirement: 組織基本資料 CRUD

系統 SHALL 允許組織成員維護組織的基本資料，欄位包含 `name`、`bio`、`external_link`。

#### Scenario: 組織成員編輯基本資料

- **WHEN** 一位 `organization_members` 中的成員更新所屬組織的 name、bio 或 external_link
- **THEN** 系統 SHALL 更新對應的 `organization` 列並回傳最新資料

#### Scenario: 非成員嘗試編輯組織資料

- **WHEN** 一位不屬於該組織的使用者嘗試編輯其基本資料
- **THEN** 系統 SHALL 拒絕請求並回傳 403 Forbidden

#### Scenario: external_link 為選填

- **WHEN** 成員更新組織資料但未提供 `external_link`
- **THEN** 系統 SHALL 允許 `external_link` 為 NULL，其餘欄位正常更新

### Requirement: 組織成員管理

系統 SHALL 允許組織成員新增與移除其他成員。`organization_members` MUST 對 `(organization_id, user_id)` 維持唯一約束，同一使用者在同一組織 MUST NOT 重複。成員 `role` 預設為 `owner`。

#### Scenario: 新增組織成員

- **WHEN** 一位現有組織成員新增另一位 user 為成員
- **THEN** 系統 SHALL 在 `organization_members` 建立一列，`role` 預設為 `owner`，並綁定 `organization_id` 與 `user_id`

#### Scenario: 重複新增同一成員

- **WHEN** 嘗試將已是該組織成員的 user 再次新增
- **THEN** 系統 SHALL 因 `(organization_id, user_id)` 唯一約束而拒絕，不建立重複列

#### Scenario: 移除組織成員

- **WHEN** 一位組織成員移除另一位成員
- **THEN** 系統 SHALL 刪除對應的 `organization_members` 列，該使用者將失去此組織的成員資格

### Requirement: 燈塔登入門檻

系統 SHALL 以「使用者是否為任一組織的成員」作為進入燈塔（Lighthouse）的門檻。判定 MUST 基於 `EXISTS organization_members WHERE user_id = ?`，MUST NOT 依賴任何全域 RBAC 角色。

#### Scenario: 具組織成員身分者進入燈塔

- **WHEN** 一位在 `organization_members` 中至少有一列的使用者存取 `/lighthouse`
- **THEN** 系統 SHALL 允許進入燈塔

#### Scenario: 非任何組織成員者被擋

- **WHEN** 一位在 `organization_members` 中沒有任何列的使用者存取 `/lighthouse`
- **THEN** 系統 SHALL 拒絕進入並導向非授權處理

#### Scenario: 成員資格被移除後失去存取

- **WHEN** 一位使用者的最後一筆 `organization_members` 列被移除後再次存取燈塔
- **THEN** 系統 SHALL 拒絕進入，因 `EXISTS organization_members` 判定為 false

### Requirement: 組織狀態管理

系統 SHALL 支援組織 `status` 在 `active` 與 `suspended` 間切換。當組織為 `suspended` 時，其成員 MUST NOT 透過該組織進行開期與經營相關操作。

#### Scenario: 停權組織

- **WHEN** admin 將一個組織的 `status` 設為 `suspended`
- **THEN** 系統 SHALL 更新 `organization.status`，該組織成員後續的經營操作 SHALL 被拒絕

#### Scenario: 恢復停權組織

- **WHEN** admin 將一個 `suspended` 組織的 `status` 設回 `active`
- **THEN** 系統 SHALL 更新狀態，該組織成員的經營操作 SHALL 恢復可用

#### Scenario: 停權組織成員嘗試開期

- **WHEN** 一個 `suspended` 組織的成員嘗試建立系列或期
- **THEN** 系統 SHALL 拒絕請求

### Requirement: 模板頁組織資訊展示

系統 SHALL 在有 `organization_id` 的模板頁展示該組織的資訊，包含組織名稱、簡介（bio），以及在有 `external_link` 時顯示「了解更多」外連按鈕。

#### Scenario: 有組織的模板頁顯示組織資訊

- **WHEN** 使用者瀏覽一個 `organization_id` 不為 NULL 的模板頁
- **THEN** 系統 SHALL 顯示該組織的名稱與 bio

#### Scenario: 組織有 external_link 時顯示外連按鈕

- **WHEN** 模板頁所屬組織的 `external_link` 不為 NULL
- **THEN** 系統 SHALL 顯示「了解更多」按鈕，點擊導向該 `external_link`

#### Scenario: 官方模板頁不顯示組織資訊

- **WHEN** 使用者瀏覽一個 `organization_id` 為 NULL 的官方模板頁
- **THEN** 系統 SHALL NOT 顯示組織資訊區塊

### Requirement: Admin UI 組織設定

系統 SHALL 在 daodao-admin-ui 提供獨立的組織設定入口。管理員 MUST 能在此入口查看組織列表、建立與開通組織、編輯組織基本資料，以及停權或恢復組織；管理員亦 MUST 能進入單一組織的成員設定，查看、新增與移除成員。

#### Scenario: 從管理後台進入組織設定

- **WHEN** admin 開啟 daodao-admin-ui 側欄
- **THEN** 系統 SHALL 顯示組織設定入口，點擊後進入組織列表

#### Scenario: 管理組織狀態與資料

- **WHEN** admin 在組織設定中建立、開通、編輯、停權或恢復組織
- **THEN** 系統 SHALL 執行對應操作並顯示最新組織狀態；開通 MUST 記錄 `approved_by` 與 `approved_at`

#### Scenario: 管理單一組織成員

- **WHEN** admin 從組織列表進入某組織的成員設定
- **THEN** 系統 SHALL 顯示成員與角色，並允許新增或移除成員
