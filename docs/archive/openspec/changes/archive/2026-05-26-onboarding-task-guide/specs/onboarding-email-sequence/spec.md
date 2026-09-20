## ADDED Requirements

### Requirement: L0 歡迎信於註冊後立即發送
系統 SHALL 在用戶完成 Email 驗證後立即觸發 L0 歡迎信，信件 CTA 根據 `user_source` 導向對應頁面。

#### Scenario: S1 用戶收到導向帳號設定的歡迎信
- **WHEN** user_source 為 S1 的用戶完成 Email 驗證
- **THEN** 系統發送 L0 歡迎信，CTA 導向「帳號必填設定」頁面

#### Scenario: S3 用戶收到導向建立實踐的歡迎信
- **WHEN** user_source 為 S3 的用戶完成 Email 驗證
- **THEN** 系統發送 L0 歡迎信，CTA 導向「建立主題實踐」頁面

---

### Requirement: 階梯式 Email 觸發——完成任務才發送下一封
系統 SHALL 在用戶完成任務 N 後，才觸發對應的下一封 Email。每封 Email MUST 只發送一次（冪等）。觸發順序依 `user_source` 決定，與 Widget 任務順序一致。

#### Scenario: 完成任務後觸發下一封信
- **WHEN** 用戶完成當前 Onboarding 任務
- **THEN** 系統於任務完成後將對應的下一封 Email 加入發送佇列

#### Scenario: 同一封信不重複發送
- **WHEN** 對應 Email 已發送過（email_states 中已標記）
- **THEN** 系統不重複發送，即使任務完成事件被重複觸發

#### Scenario: 用戶提早完成後續任務不補發已跳過的信
- **WHEN** 用戶跳過中間步驟直接完成後面的任務
- **THEN** 系統只發送對應已完成任務的 Email，不補發跳過任務的 Email

---

### Requirement: Email 觸發與 in-app 進度保持一致
Email 序列的任務完成狀態 SHALL 與 in-app Widget 進度同步，以同一份 `user_onboarding.task_states` 為唯一來源。

#### Scenario: Email 點擊回訪後 in-app 進度正確反映
- **WHEN** 用戶點擊 Email 中的 CTA 完成任務後回到 app
- **THEN** Widget 顯示該任務為已完成，進度與 Email 觸發邏輯一致
