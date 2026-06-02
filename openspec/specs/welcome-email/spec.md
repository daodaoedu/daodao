## ADDED Requirements

### Requirement: 依來源管道寄送歡迎信
Email 驗證成功後，系統 SHALL 依據用戶的 `referral_source` 欄位，將來源分為三個群組並寄送對應版本的歡迎信。系統 SHALL 透過查詢 `email_logs` 表確保每位用戶只收到一封歡迎信（冪等保護）。

**來源群組分類：**

| 群組 | `referral_source` 值 | 信件重點 |
|------|---------------------|---------|
| `social-media` | `instagram`, `facebook`, `linkedin` | 強調社群互動與找志同道合的夥伴 |
| `community` | `discord`, `friend_referral` | 強調學習夥伴與一起學習的概念 |
| `default` | `others`、空值或未知值 | 通用歡迎信 |

> **實作背景**：觸發機制已存在於 `verifyEmail` / `verifyEmailGet` controller（`sendWelcomeEmailWithLog`）。此需求修改現有分版邏輯（從 `hasCompletedQuiz` 改為 `referralGroup`），並新增 `social-media` / `community` 兩個模板版本。需在 `email_logs.email_type` check constraint 新增 `welcome_letter` 類型。

#### Scenario: 用戶驗證 Email，來源為社群媒體
- **WHEN** 用戶成功驗證 Email，且 `referral_source` 為 `instagram`、`facebook` 或 `linkedin`
- **THEN** 系統寄送 `social-media` 版本歡迎信，並在 `email_logs` 記錄 `email_type = 'welcome_letter'`

#### Scenario: 用戶驗證 Email，來源為社群或口碑
- **WHEN** 用戶成功驗證 Email，且 `referral_source` 為 `discord` 或 `friend_referral`
- **THEN** 系統寄送 `community` 版本歡迎信，並在 `email_logs` 記錄 `email_type = 'welcome_letter'`

#### Scenario: 用戶驗證 Email，來源為其他或未知
- **WHEN** 用戶成功驗證 Email，且 `referral_source` 為 `others`、空值或無對應群組
- **THEN** 系統寄送 `default` 版本歡迎信，並在 `email_logs` 記錄 `email_type = 'welcome_letter'`

#### Scenario: 歡迎信不重複發送（冪等保護）
- **WHEN** Email 驗證相關 API 被重複呼叫（同一用戶）
- **THEN** 系統查詢 `email_logs` 確認已存在該用戶的 `welcome_letter` 記錄，跳過發送，不重複寄信

#### Scenario: 歡迎信發送失敗不阻斷驗證流程
- **WHEN** 歡迎信發送過程發生錯誤
- **THEN** 系統記錄錯誤 log，但不影響 Email 驗證成功的回應（驗證流程不因寄信失敗而中斷）
