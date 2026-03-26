## ADDED Requirements

> **實作背景**：`/auth/onboarding` 頁面與 `OnboardingForm` 元件（Steps 1–3 + Success）已存在。Steps 1–3 的欄位驗證、Schema、API 呼叫皆已實作。以下 Requirements 標注「**已存在**」者需確認是否完整符合 spec，標注「**待新增**」者為本次需新增功能。

### Requirement: Onboarding Gate（待新增）
新用戶（`onboarding_completed = false`）在完成 Onboarding 流程前，系統 SHALL 阻止其存取主產品功能，並自動導向 Onboarding 起始頁。已完成的用戶試圖重新進入 Onboarding 時，系統 SHALL 自動導向首頁。

#### Scenario: 未完成 Onboarding 的用戶存取產品頁
- **WHEN** 已登入用戶（`onboarding_completed = false`）存取任何受保護的產品路由
- **THEN** 系統將用戶導向 Onboarding 流程起始頁 `/onboarding`

#### Scenario: 已完成 Onboarding 的用戶嘗試存取 Onboarding 頁
- **WHEN** 已登入用戶（`onboarding_completed = true`）存取 `/onboarding`
- **THEN** 系統將用戶導向首頁

#### Scenario: 未登入用戶存取受保護頁面
- **WHEN** 未登入用戶存取任何受保護路由
- **THEN** 系統將用戶導向登入頁

---

### Requirement: Step 1 — 個人資訊（已存在，需確認）
系統 SHALL 在第一步驟收集用戶的顯示名稱、生日及帳號 ID，並在用戶提交時驗證資料正確性後儲存。

| 欄位 | 規則 |
|------|------|
| Email | 從 OAuth 帶入，唯讀，不可修改 |
| 名字 | 必填，最多 50 字元 |
| 生日 | 必填，用戶需滿 16 歲 |
| 帳號 ID | 必填，3–15 字元，僅英數字，全域唯一 |

#### Scenario: 提交有效的個人資訊
- **WHEN** 用戶填寫所有有效欄位並提交 Step 1
- **THEN** 系統儲存資料，將 `onboarding_step` 更新為 2，並前進至 Step 2

#### Scenario: 名字超過 50 字元
- **WHEN** 用戶輸入超過 50 字元的名字
- **THEN** 系統顯示驗證錯誤，阻止提交

#### Scenario: 用戶未滿 16 歲
- **WHEN** 用戶輸入的生日顯示年齡小於 16 歲
- **THEN** 系統顯示年齡限制錯誤，阻止提交

#### Scenario: 帳號 ID 格式無效
- **WHEN** 用戶輸入包含非英數字元或長度不在 3–15 字元範圍的帳號 ID
- **THEN** 系統即時顯示格式驗證錯誤，不需等待提交

#### Scenario: 帳號 ID 已被使用
- **WHEN** 用戶輸入已存在於系統中的帳號 ID（debounce 500ms 後）
- **THEN** 系統即時顯示「此 ID 已被使用」，不需等待提交

#### Scenario: 帳號 ID 可使用
- **WHEN** 用戶輸入的帳號 ID 格式有效且尚未被使用（debounce 500ms 後）
- **THEN** 系統即時顯示「此 ID 可使用」的確認指示

---

### Requirement: Step 2 — 興趣領域（已存在，需確認）
系統 SHALL 收集用戶的專業領域與興趣領域，各至少選 1 個、最多選 5 個。

#### Scenario: 提交有效的興趣選擇
- **WHEN** 用戶在專業領域與興趣領域各選擇 1–5 個選項並提交
- **THEN** 系統儲存資料，將 `onboarding_step` 更新為 3，並前進至 Step 3

#### Scenario: 未選擇任何專業領域
- **WHEN** 用戶提交 Step 2 時未選擇任何專業領域
- **THEN** 系統顯示驗證錯誤，阻止提交

#### Scenario: 嘗試選擇超過 5 個選項
- **WHEN** 用戶嘗試在任一欄位選擇第 6 個選項
- **THEN** 系統阻止新增選取，已選 5 個的欄位選項呈現不可選擇狀態

---

### Requirement: Step 3 — 來源調查（已存在，需確認）
系統 SHALL 收集用戶得知平台的來源管道，若選擇「其他」則需提供文字說明。

#### Scenario: 選擇標準來源提交
- **WHEN** 用戶選擇非「其他」的來源管道並提交
- **THEN** 系統儲存來源資料，將 `onboarding_step` 更新為 4，並前進至 Step 4

#### Scenario: 選擇「其他」但未填說明
- **WHEN** 用戶選擇「其他」並提交，但「其他說明」欄位為空
- **THEN** 系統顯示驗證錯誤，要求填寫說明欄位

#### Scenario: 選擇「其他」並填寫說明
- **WHEN** 用戶選擇「其他」並填寫說明後提交
- **THEN** 系統儲存來源與說明，前進至 Step 4

---

### Requirement: Step 4 — 完成註冊頁面（已存在，需修改）
系統 SHALL 顯示註冊完成確認頁面，並引導用戶進行 Email 驗證。

> **現有實作**：`SuccessSection` 元件已存在，顯示歡迎訊息並有兩個按鈕：「前往偏好設定」→ `/settings/preferences`、「略過」→ `/`。需確認 Email 驗證提示文案是否符合 FRD，目前已有 `emailReminder` i18n key。

#### Scenario: 用戶到達 Step 4
- **WHEN** 用戶成功完成 Step 3 並提交表單
- **THEN** 系統顯示完成確認頁面，包含「已寄送驗證信至您的 Email」提示

#### Scenario: 用戶請求重新寄送驗證信
- **WHEN** 用戶在 Step 4 點擊「重新寄送驗證信」
- **THEN** 系統發送新的驗證信並顯示「驗證信已重新寄出」確認訊息（Rate limit：1 次/分鐘）

---

### Requirement: Step 5 — Email 驗證完成（後端已存在，前端導向需修改）
系統 SHALL 在用戶點擊有效驗證連結後，標記 Email 已驗證，顯示成功頁面，並引導至設定頁面。

> **現有實作**：`GET /api/v1/auth/verify-email?token=xxx` 成功後 redirect 至 `${FRONTEND_URL}/auth/verify-email?status=success`，前端 `/auth/verify-email` 頁面已存在。FRD 要求成功後導向 `/settings`，需確認或修改現有重定向目的地。

#### Scenario: 用戶點擊有效驗證連結
- **WHEN** 用戶點擊有效且未過期的 Email 驗證連結
- **THEN** 系統標記 Email 為已驗證，顯示成功頁面，頁面包含文案「太棒了！完成個人設定，獲得更精準的學習推薦。」及前往設定頁的按鈕

#### Scenario: 用戶點擊已過期的驗證連結
- **WHEN** 用戶點擊已過期的 Email 驗證連結
- **THEN** 系統顯示錯誤頁面，提供「重新申請驗證信」選項

#### Scenario: 用戶從驗證頁前往設定頁
- **WHEN** 用戶在驗證成功頁面點擊「前往完成個人設定」按鈕
- **THEN** 系統呼叫 `refreshAuth()` 更新認證狀態，並將用戶導向 `/settings`

> **現有實作修改**：`/auth/verify-email` 成功頁目前 CTA 按鈕導向 `/`，需修改為導向 `/settings`，並更新 description 文案為 FRD 微文案「完成個人設定，獲得更精準的學習推薦。」。後端 redirect URL 不變（仍 redirect 至 `/auth/verify-email?status=success`）。
