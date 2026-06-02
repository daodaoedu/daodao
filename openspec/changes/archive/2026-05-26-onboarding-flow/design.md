## Context

DaoDao 目前透過 Google OAuth 完成帳號建立。**Onboarding 表單前端主體已存在**（`/auth/onboarding`），包含 3 個填寫步驟（個人資訊、興趣領域、來源調查）+ 成功頁面，以一次性 API 呼叫提交全部資料，`isTemporary` JWT flag 標記用戶是否完成 onboarding。Email 驗證流程已在後端實作（`POST/GET /api/v1/auth/verify-email`），驗證後已觸發歡迎信，但目前版本依 `hasCompletedQuiz`（非 `referral_source`）分版本，且缺乏冪等保護。Settings 三個分頁（preferences, account, public-info）已存在，但缺乏完整度指示。興趣領域選項來自 DB（`categories` + `professional_fields` tables），非 hardcoded。後端為 Express.js + TypeScript + Prisma（PostgreSQL），前端為 Next.js + React Hook Form（pnpm monorepo with Turbopack）。

## Goals / Non-Goals

**Goals:**
- 定義 5 步驟 Onboarding wizard 的前後端架構
- Gate 邏輯：未完成 onboarding 的用戶無法存取主產品
- 帳號 ID 唯一性即時檢查策略
- Email 驗證後觸發歡迎信的機制
- 設定頁面完整度追蹤策略

**Non-Goals:**
- Onboarding 流程的 A/B 測試框架
- 允許用戶跳過步驟或事後修改 onboarding 回答（除非透過設定頁）
- 支援多國語言版本的歡迎信（此版本僅繁體中文）

## Decisions

### 1. 多步驟表單：Client-side state + 最後一次送出（現有實作）

**決策**：沿用現有實作——所有步驟資料暫存於 React state，最後一步完成時一次性呼叫 API。

**原因**：
- 現有 `OnboardingForm` 已以此模式實作並上線，不重構降低風險
- Onboarding 流程設計為連貫體驗，不預期用戶中途離開並回來續填
- `isTemporary` JWT flag 足以識別尚未完成 onboarding 的用戶，不需要 `onboarding_step` 欄位

**已知取捨**：若用戶中途離開則需重填，但 FRD 的 1 分鐘完成目標使此問題影響有限。

---

### 2. 帳號 ID 唯一性檢查：Debounced GET API

**決策**：前端輸入後 debounce 500ms，呼叫 `GET /api/users/check-account-id?id=xxx`。
資料庫層同時建立 unique constraint 作為最後防線。

**原因**：
- 即時回饋不需要 form submit
- Debounce 避免每個 keystroke 都打 API
- DB unique constraint 防止 race condition（兩個用戶同時搶同一 ID）

---

### 3. Onboarding Gate：前後端雙重保護

**決策**：
- 後端：JWT payload 中攜帶 `isTemporary: boolean`，middleware 對受保護路由檢查此欄位（`isTemporary !== true`）
- 前端：Next.js middleware 讀取 session，未完成 onboarding（`isTemporary === true`）則 redirect 至 `/onboarding`
- 完成後設定 `isTemporary = false` 並重新簽發 JWT

**Alternative**：純前端 guard → 容易被繞過；放棄。

---

### 4. 歡迎信觸發：沿用現有機制，修改分版邏輯

**決策**：觸發時機沿用現有實作（Email 驗證 callback 成功後同步觸發，`sendWelcomeEmailWithLog`），但將版本選擇從 `hasCompletedQuiz` 改為 `referral_source`（FRD 要求）。同時加入冪等保護（檢查 `email_logs` 中是否已有該用戶的 `welcome_letter` 記錄）。

**原因**：
- 觸發機制已存在（`POST /api/v1/auth/verify-email` 與 `GET /api/v1/auth/verify-email`），不需要重建
- FRD 明確要求依來源管道寄送不同信件
- `email_logs` 表已有完整記錄機制，冪等保護只需查詢是否有記錄即可，不需新增欄位

**需新增 email_logs type**：`welcome_letter`（現有 check constraint 需更新以包含此類型）。

**Alternative**：Event-driven queue（Redis/BullMQ）→ 過度設計，目前不採用。

---

### 5. 設定頁完整度計算：Server-side computed

**決策**：後端在 `GET /api/users/settings-summary` 中計算並回傳 `{ completed: N, total: 4 }`，前端不自行計算。

**原因**：
- 單一事實來源，避免前後端計算邏輯不同步
- 儲存後 revalidate 即可更新 UI

## Risks / Trade-offs

| 風險 | 緩解策略 |
|------|---------|
| 用戶在步驟中途離開，產生孤兒資料 | `onboarding_step` 欄位追蹤進度；每步驟資料可覆寫，不累積垃圾資料 |
| 帳號 ID race condition | DB unique constraint 作最後防線，API 回傳 409 時前端顯示錯誤 |
| Email 驗證信未收到，用戶卡在 Step 4 | Step 4 提供「重新寄送驗證信」按鈕；Rate limit 1 次/分鐘 |
| 歡迎信重複發送（驗證 callback 被重複呼叫） | 查詢 `email_logs` 表是否已有該用戶的 `welcome_letter` 記錄，若有則跳過發送 |

## Migration Plan

1. **DB**：更新 `email_logs.email_type` check constraint，新增 `welcome_letter` 類型
2. **後端**：修改 `verifyEmail` / `verifyEmailGet` controller 中的歡迎信觸發邏輯（改用 `referral_source` 分版本 + 冪等保護）
3. **後端**：新增 Onboarding gate middleware（檢查 `isTemporary`，保護產品路由）
4. **前端**：新增 Next.js middleware redirect 邏輯（`isTemporary = true` → `/onboarding`）
5. **前端**：修改 Email 驗證成功頁（`/auth/verify-email`）導向 `/settings`
6. **前端**：新增 Settings 完整度進度元件（N/4 + 動態標籤 + 未完成指示）
7. **後端**：新增 `GET /api/v1/users/settings-summary` API

**現有用戶**：`isTemporary = false` 的用戶不受 gate 影響，無需執行任何遷移。

## Open Questions

- **帳號 ID 是否可事後修改**：FRD 未說明，`users.custom_id` 欄位目前無 lock 機制，建議初版不允許修改（避免 URL 失效問題）。
- **歡迎信分版邏輯**：`referral_source` 的值（如 google, facebook, friend）與歡迎信模板的對應表需確認，現有模板只有 `hasCompletedQuiz` true/false 兩版本，是否需要更多版本？
- **Settings 完整度計算**：`settings-completion-guide` 的「偏好設定」必填欄位清單需與設計確認，避免開發時出現歧義。
