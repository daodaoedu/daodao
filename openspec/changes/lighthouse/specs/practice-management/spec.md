## ADDED Requirements

### Requirement: Practice 期歸屬

系統 SHALL 在 `practices` 表新增 `cohort_id` nullable 欄位，作為指向 `cohorts` 的外鍵（FOREIGN KEY REFERENCES cohorts ON DELETE SET NULL）。一個 practice 至多 MUST 屬於一個 cohort。`cohort_id` 為 NULL 時，該 practice MUST 視為純個人實踐，不屬於任何期。

#### Scenario: practice 綁定至一個期

- **WHEN** 系統將一個 practice 的 `cohort_id` 設為某一期的 id
- **THEN** 該 practice SHALL 被視為歸屬於該期，且 `cohort_id` MUST 僅指向單一 cohort

#### Scenario: 期被刪除時斷開歸屬

- **WHEN** 一個 practice 所屬的 cohort 被刪除
- **THEN** 系統 SHALL 依 ON DELETE SET NULL 將該 practice 的 `cohort_id` 設為 NULL，practice 本身 MUST NOT 被刪除

#### Scenario: 純個人實踐無期歸屬

- **WHEN** 使用者自行建立一個未綁定任何期的 practice
- **THEN** 系統 SHALL 將 `cohort_id` 設為 NULL，該 practice MUST 被視為純個人實踐

### Requirement: 期草稿建立

系統 SHALL 在學員加入期時，為該期每一個綁定的模板（`cohort_templates` 中 `unbound_at` 為 NULL 者）自動建立一個 practice。所建立的 practice MUST 帶有 `status='draft'`、`cohort_id` 為該期 id、`creation_source='cohort_template'`。

#### Scenario: 加入期時為每個綁定模板建立草稿

- **WHEN** 一位學員加入一個綁定了 3 個有效模板的期
- **THEN** 系統 SHALL 為該學員建立 3 個 practice，每一個的 `status` 為 `draft`、`cohort_id` 為該期 id、`creation_source` 為 `cohort_template`

#### Scenario: 期無綁定模板時不建立草稿

- **WHEN** 一位學員加入一個尚未綁定任何有效模板的期
- **THEN** 系統 SHALL NOT 為該學員建立任何 cohort_template 來源的 practice

### Requirement: 草稿冪等約束

系統 SHALL 在 `practices` 上建立 UNIQUE INDEX，涵蓋 `(user_id, cohort_id, template_id)` 且條件為 `WHERE creation_source='cohort_template'`，以確保同一學員在同一期的同一模板至多只有一個系統建立的草稿。重跑加入流程 MUST NOT 產生重複草稿。

#### Scenario: 重跑加入流程不產生重複草稿

- **WHEN** 系統對同一學員、同一期、同一模板再次執行草稿建立
- **THEN** 系統 SHALL 因 `(user_id, cohort_id, template_id) WHERE creation_source='cohort_template'` UNIQUE 約束而不建立第二筆草稿

#### Scenario: 不同模板各自建立草稿

- **WHEN** 同一學員在同一期下有兩個不同模板需建立草稿
- **THEN** 系統 SHALL 各建立一筆草稿，兩筆的 `template_id` 不同，皆不違反唯一約束

### Requirement: 自助退出/轉個人實踐

系統 SHALL 允許學員將一個期歸屬的 practice 轉回個人實踐，作法為將該 practice 的 `cohort_id` 設為 NULL。轉回後，該 practice 對該期的可見性 MUST 立即中斷，教練與同期成員 MUST NOT 再透過期看見該 practice。

#### Scenario: 學員將期實踐轉回個人

- **WHEN** 一位學員對其一個 `cohort_id` 有值的 practice 執行「轉為個人實踐」
- **THEN** 系統 SHALL 將該 practice 的 `cohort_id` 設為 NULL，該 practice 對原期的可見性 MUST 立即中斷

#### Scenario: 轉回後教練不再看見

- **WHEN** 學員已將某 practice 轉回個人
- **THEN** 該期的教練透過期檢視實踐時 MUST NOT 再看見該 practice

### Requirement: 期歸屬與社群可見性正交

系統 SHALL 使 practice 的期歸屬（`cohort_id`）與其社群可見性（既有的 `privacy_status`/`visibility`）互為正交、互不覆寫。`privacy_status`/`visibility` MUST 僅管控「對社群」的可見性；`cohort_id` MUST 僅管控「對期」的可見性。期綁定 MUST NOT 使任何 practice 資料外漏至公共靈感牆。

#### Scenario: 期實踐不因綁定而流入公共靈感牆

- **WHEN** 一個 practice 綁定至某期（`cohort_id` 有值）但其 `privacy_status`/`visibility` 為非公開
- **THEN** 系統 SHALL NOT 因期綁定而將該 practice 顯示於公共靈感牆，社群可見性 MUST 完全由 `privacy_status`/`visibility` 決定

#### Scenario: 社群公開的期實踐仍受期可見性各自管轄

- **WHEN** 一個 practice 同時綁定某期且 `privacy_status`/`visibility` 為公開
- **THEN** 系統 SHALL 讓其對社群的可見性由 `privacy_status`/`visibility` 決定、對期的可見性由 `cohort_id` 決定，兩者互不覆寫

#### Scenario: 調整社群可見性不影響期歸屬

- **WHEN** 學員變更一個期實踐的 `privacy_status`/`visibility`
- **THEN** 系統 SHALL 僅改變其社群可見性，`cohort_id` 與期歸屬 MUST 維持不變
