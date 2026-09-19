## ADDED Requirements

### Requirement: 組織私有模板

系統 SHALL 在 `practice_templates` 新增 `organization_id` 欄位以區分模板歸屬。`organization_id` 為 NULL 時 MUST 視為官方模板；`organization_id` 有值時 MUST 視為該組織的私有模板。組織私有模板 MUST 僅供該組織成員使用與經營。

#### Scenario: 建立組織私有模板

- **WHEN** 一位組織成員建立模板並帶入其所屬 `organization_id`
- **THEN** 系統 SHALL 在 `practice_templates` 建立一列，`organization_id` 記為該組織 id，該模板 SHALL 被視為組織私有模板

#### Scenario: 官方模板 organization_id 為 NULL

- **WHEN** 系統建立一個非任何組織所屬的官方模板
- **THEN** 系統 SHALL 將 `organization_id` 設為 NULL，該模板 SHALL 被視為官方模板

### Requirement: 組織內模板全可見全可編

系統 SHALL 讓組織內所有成員對該組織的私有模板具備完整可見與可編輯權限，MUST NOT 以建立者身分再做細分。判定 MUST 基於 `organization_id` 是否與成員所屬組織相符。

#### Scenario: 組織成員檢視組織模板

- **WHEN** 一位組織成員列出模板
- **THEN** 系統 SHALL 回傳該組織所有 `organization_id` 相符的私有模板，不論該模板由哪位成員建立

#### Scenario: 組織成員編輯他人建立的組織模板

- **WHEN** 一位組織成員編輯同組織中由另一位成員建立的私有模板
- **THEN** 系統 SHALL 允許編輯並更新該模板

#### Scenario: 非成員嘗試存取組織私有模板

- **WHEN** 一位不屬於該組織的使用者嘗試檢視或編輯其私有模板
- **THEN** 系統 SHALL 拒絕請求並回傳 403 Forbidden

### Requirement: 模板與期的綁定關係

系統 SHALL 以 `cohort_templates` 表維護模板與期的多對多綁定關係，欄位包含 `cohort_id`、`template_id`、`bound_at`、`unbound_at`。同一期同一模板 MUST 對 `(cohort_id, template_id)` 維持 UNIQUE 約束。解除綁定 MUST 以填入 `unbound_at` 表示，MUST NOT 刪除該列。

#### Scenario: 綁定模板到期

- **WHEN** 一位組織成員將一個模板綁定到某一期
- **THEN** 系統 SHALL 在 `cohort_templates` 建立一列，記錄 `cohort_id`、`template_id` 與 `bound_at`，`unbound_at` 為 NULL

#### Scenario: 同一期重複綁定同一模板

- **WHEN** 嘗試將已綁定於某期且 `unbound_at` 為 NULL 的模板再次綁定該期
- **THEN** 系統 SHALL 因 `(cohort_id, template_id)` UNIQUE 約束而拒絕，不建立重複列

#### Scenario: 解除模板與期的綁定

- **WHEN** 一位組織成員解除某模板與某期的綁定
- **THEN** 系統 SHALL 將該列的 `unbound_at` 填入當前時間，MUST NOT 刪除該列

### Requirement: 學員加入期時產生模板草稿

系統 SHALL 在學員加入某期時，為該期每個綁定中（`unbound_at` 為 NULL）的模板建立一則 practice 草稿。草稿 MUST 具備 `status='draft'`、`cohort_id` 為該期、`creation_source='cohort_template'`。

#### Scenario: 加入期時為每個綁定模板建草稿

- **WHEN** 一位學員加入一個綁定了 N 個模板的期
- **THEN** 系統 SHALL 為每個綁定中的模板各建立一則 practice，`status` 為 `draft`、`cohort_id` 為該期、`creation_source` 為 `cohort_template`

#### Scenario: 未綁定任何模板的期

- **WHEN** 一位學員加入一個沒有任何綁定中模板的期
- **THEN** 系統 SHALL NOT 建立任何草稿

#### Scenario: 已解綁模板不產生草稿

- **WHEN** 一位學員加入一個期，該期某模板的 `unbound_at` 已有值
- **THEN** 系統 SHALL NOT 為該已解綁模板建立草稿

### Requirement: 草稿產生的冪等性

系統 SHALL 對 `creation_source='cohort_template'` 的 practice 以 UNIQUE INDEX `(user_id, cohort_id, template_id) WHERE creation_source='cohort_template'` 保證冪等。重複觸發草稿產生 MUST NOT 為同一 `(user_id, cohort_id, template_id)` 建立第二則草稿。

#### Scenario: 重複觸發不建立重複草稿

- **WHEN** 對同一 `(user_id, cohort_id, template_id)` 再次觸發草稿產生
- **THEN** 系統 SHALL 因該部分唯一索引而不建立第二則草稿，維持單一草稿

#### Scenario: 不同期的同一模板各自建草稿

- **WHEN** 同一學員先後加入兩個都綁定同一模板的期
- **THEN** 系統 SHALL 為兩個不同 `cohort_id` 各建立一則草稿，因唯一索引以 `cohort_id` 區分

### Requirement: 草稿啟用

系統 SHALL 允許學員啟用（開始）由模板產生的 practice 草稿。啟用時 MUST 將 `status` 由 `draft` 轉為進行中狀態，並保留 `cohort_id` 與 `creation_source` 不變。

#### Scenario: 學員啟用草稿

- **WHEN** 一位學員啟用一則 `status='draft'` 且 `creation_source='cohort_template'` 的 practice
- **THEN** 系統 SHALL 將該 practice 的 `status` 轉為進行中，並維持其 `cohort_id` 與 `creation_source` 不變

### Requirement: 模板頁組織資訊展示

系統 SHALL 在有 `organization_id` 的模板頁展示所屬組織的資訊，包含組織名稱與簡介，並在組織 `external_link` 有值時顯示「了解更多」按鈕，導向該連結。

#### Scenario: 有組織的模板頁顯示組織名稱與簡介

- **WHEN** 使用者瀏覽一個 `organization_id` 不為 NULL 的模板頁
- **THEN** 系統 SHALL 顯示該組織的名稱與簡介（bio）

#### Scenario: 組織有 external_link 時顯示了解更多按鈕

- **WHEN** 模板頁所屬組織的 `external_link` 不為 NULL
- **THEN** 系統 SHALL 顯示「了解更多」按鈕，點擊導向 `organization.external_link`

#### Scenario: 官方模板頁不顯示組織資訊

- **WHEN** 使用者瀏覽一個 `organization_id` 為 NULL 的官方模板頁
- **THEN** 系統 SHALL NOT 顯示組織資訊區塊
