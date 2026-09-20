## ADDED Requirements

### Requirement: 邀請連結／QR 加入

系統 SHALL 支援使用者透過期的邀請連結或 QR code 加入。加入入口 MUST 走 `cohorts.join_token`，並 MUST 通過加入截止日（`join_deadline`）與人數上限（`capacity`）檢查。

#### Scenario: 透過有效連結加入

- **WHEN** 使用者以符合當前 `join_token` 的連結，且在截止日前、未達人數上限時發起加入
- **THEN** 系統 SHALL 在 `cohort_enrollments` 建立或推進一列，`status` 進入 `joined`，並記錄 `joined_at`

#### Scenario: 透過 QR code 加入

- **WHEN** 使用者掃描期的 QR code（內含 join_token）並發起加入
- **THEN** 系統 SHALL 以與連結相同的規則處理加入

#### Scenario: 連結已被 rotate

- **WHEN** 使用者以已被重設而失效的舊 `join_token` 連結嘗試加入
- **THEN** 系統 SHALL 拒絕加入

### Requirement: Email 名單上傳邀請

系統 SHALL 支援教練以 email 名單邀請成員，包含單筆新增與 CSV 批次上傳。批次上傳 MUST 提供預覽與逐筆錯誤原因。系統 SHALL 在上傳介面明文標示名單來源的合法性責任歸屬教練，並記錄審計事件。`cohort_enrollments` MUST 對 `(cohort_id, email)` 維持唯一約束。

#### Scenario: 單筆 email 邀請

- **WHEN** 教練輸入單一 email 送出邀請
- **THEN** 系統 SHALL 在 `cohort_enrollments` 建立一列，`status` 為 `invited`，產生 `invite_token`，記錄 `invited_at`，並寄出邀請信

#### Scenario: CSV 批次上傳預覽

- **WHEN** 教練上傳 CSV 名單
- **THEN** 系統 SHALL 顯示解析後的預覽，逐筆標示可邀請或錯誤（如格式錯誤、重複），教練確認後才實際建立邀請

#### Scenario: 批次中含已存在的 email

- **WHEN** CSV 中某 email 於該期已存在 enrollment
- **THEN** 系統 SHALL 於預覽標示該筆為重複並跳過，不因 `(cohort_id, email)` 唯一約束違反而中斷整批

#### Scenario: 名單來源責任標示

- **WHEN** 教練進入名單上傳介面
- **THEN** 系統 SHALL 明文顯示名單來源合法性由教練負責，並在上傳時記錄審計事件

### Requirement: 加入同意畫面

系統 SHALL 在使用者加入期的流程中呈現同意畫面。文案 MUST 明確說明其打卡內容「對教練與同期學員可見」。使用者 MUST 明確同意後才能完成加入。

#### Scenario: 呈現同意畫面並取得同意

- **WHEN** 使用者進入加入流程
- **THEN** 系統 SHALL 顯示含「對教練與同期學員可見」說明的同意畫面，使用者同意後 SHALL 完成加入

#### Scenario: 未同意則不加入

- **WHEN** 使用者在同意畫面拒絕或離開
- **THEN** 系統 SHALL NOT 將其 enrollment 推進至 `joined`

### Requirement: Enrollment 狀態機

系統 SHALL 以 `cohort_enrollments.status` 維護狀態機，狀態值為 `invited`、`joined`、`exited`、`removed`。合法轉移 MUST 為 `invited → joined`、`joined → exited`、`joined → removed`。狀態轉移 MUST 記錄對應時間戳（`invited_at`、`joined_at`、`exited_at`）。

#### Scenario: 受邀後加入

- **WHEN** 一筆 `invited` 的 enrollment 完成加入流程
- **THEN** 系統 SHALL 將 `status` 轉為 `joined` 並記錄 `joined_at`

#### Scenario: 已加入者退出

- **WHEN** 一筆 `joined` 的 enrollment 執行退出
- **THEN** 系統 SHALL 將 `status` 轉為 `exited` 並記錄 `exited_at`

#### Scenario: 非法狀態轉移

- **WHEN** 嘗試將一筆 `exited` 或 `removed` 的 enrollment 直接轉回 `joined`
- **THEN** 系統 SHALL 拒絕該轉移

### Requirement: 自助退出／轉個人實踐

系統 SHALL 允許已加入成員自助退出期。退出時，系統 MUST 將該成員在此期的 practices 之 `cohort_id` SET NULL（轉為個人實踐），使可見性即刻中斷。

#### Scenario: 成員自助退出

- **WHEN** 一位 `joined` 成員選擇退出本期
- **THEN** 系統 SHALL 將其 enrollment `status` 轉為 `exited`，並將其此期的 practices `cohort_id` 設為 NULL

#### Scenario: 退出後可見性中斷

- **WHEN** 成員退出、practices 的 `cohort_id` 已被設為 NULL
- **THEN** 教練與同期學員 SHALL 不再能透過本期看見該成員的這些 practices，內容轉為個人實踐

### Requirement: 教練移除成員

系統 SHALL 允許教練（期中 role=owner 者）移除成員。移除 MUST 為強制退出，將 enrollment `status` 設為 `removed`，發出中性通知，並在審計日誌記錄操作者。

#### Scenario: 教練移除成員

- **WHEN** 教練對一位 `joined` 成員執行移除
- **THEN** 系統 SHALL 將該 enrollment `status` 設為 `removed`，將其此期 practices `cohort_id` 設為 NULL，並記錄操作者於審計日誌

#### Scenario: 移除發出中性通知

- **WHEN** 成員被移除
- **THEN** 系統 SHALL 向該成員發出中性措辭的通知，不揭露評價性內容

#### Scenario: 非教練嘗試移除成員

- **WHEN** 一位非 owner 的成員嘗試移除他人
- **THEN** 系統 SHALL 拒絕請求並回傳 403 Forbidden

### Requirement: 加入截止日與人數上限檢查

系統 SHALL 在每次加入請求時檢查加入截止日（`join_deadline`，NULL 時以 end_date 為準）與人數上限（`capacity`，NULL 時不限）。任一檢查未通過 MUST 拒絕加入。

#### Scenario: 逾期加入被拒

- **WHEN** 使用者在有效截止日之後嘗試加入
- **THEN** 系統 SHALL 拒絕加入並提示已逾期

#### Scenario: 額滿加入被拒

- **WHEN** 期的 joined 人數已達 `capacity`，使用者嘗試加入
- **THEN** 系統 SHALL 拒絕加入並提示已額滿

### Requirement: 重寄邀請信

系統 SHALL 允許教練對狀態為 `invited` 的成員重寄邀請信。

#### Scenario: 重寄邀請信

- **WHEN** 教練對一筆 `invited` 的 enrollment 執行重寄
- **THEN** 系統 SHALL 以其既有 `invite_token` 再次寄出邀請信

#### Scenario: 對已加入者重寄

- **WHEN** 教練嘗試對一筆 `joined` 的 enrollment 重寄邀請信
- **THEN** 系統 SHALL 拒絕或無操作，因該成員已加入

### Requirement: 身分綁定以 invite_token 為準

系統 SHALL 以 `invite_token` 作為身分綁定的依據，`email` 降為聯絡紀錄。當受邀者尚未註冊時 `user_id` MUST 為 NULL，實際加入時才綁定其島島帳號的 `user_id`，即使該帳號 email 與受邀 email 不同亦可綁定。

#### Scenario: 受邀 email 與帳號 email 不同

- **WHEN** 使用者以一個 email 收到邀請，但以另一個 email 註冊的島島帳號登入後點擊邀請連結加入
- **THEN** 系統 SHALL 依 `invite_token` 綁定該帳號的 `user_id`，不因 email 不一致而拒絕

#### Scenario: 受邀未註冊者

- **WHEN** 一筆邀請建立時受邀者尚無島島帳號
- **THEN** 系統 SHALL 將 `user_id` 設為 NULL，保留 `email` 作為聯絡紀錄，待其註冊並以 `invite_token` 加入時再綁定 `user_id`
