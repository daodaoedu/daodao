## ADDED Requirements

### Requirement: 近期實踐次數顯示
個人檔案頁 SHALL 顯示該使用者最近 7 天的實踐次數（Practice count）。

#### Scenario: 顯示有實踐紀錄的使用者活躍度
- **WHEN** 個人檔案頁面載入，且該使用者在最近 7 天內有實踐紀錄
- **THEN** 系統在個人檔案頁顯示「近 7 天 N 次實踐」

#### Scenario: 使用者近 7 天無實踐紀錄
- **WHEN** 個人檔案頁面載入，且該使用者在最近 7 天內無任何實踐
- **THEN** 系統顯示「近 7 天 0 次實踐」

#### Scenario: 近期實踐次數包含在 profile API 回應中
- **WHEN** 呼叫 `GET /api/users/profile/:identifier`
- **THEN** 回應資料包含 `recentPracticeCount`（整數，代表過去 7 天的實踐次數）

---

### Requirement: 共同 Circle 數量顯示
個人檔案頁 SHALL 在登入狀態下顯示瀏覽者與該使用者共同參與的 Circle 數量。

#### Scenario: 登入使用者查看有共同 Circle 的他人檔案
- **WHEN** 已登入使用者瀏覽他人個人檔案，且雙方有共同 Circle
- **THEN** 系統顯示「與你有 N 個共同參與的 Circle」

#### Scenario: 登入使用者查看無共同 Circle 的他人檔案
- **WHEN** 已登入使用者瀏覽他人個人檔案，且雙方無共同 Circle
- **THEN** 系統不顯示共同 Circle 模組（不留空白佔位）

#### Scenario: 未登入訪客查看個人檔案
- **WHEN** 未登入使用者瀏覽個人檔案
- **THEN** 系統不顯示共同 Circle 模組

#### Scenario: 使用者查看自己的個人檔案
- **WHEN** 已登入使用者瀏覽自己的個人檔案
- **THEN** 系統不顯示共同 Circle 模組

---

### Requirement: 隱藏連結數設定
使用者 SHALL 能在個人設定中切換「隱藏連結數」選項，以避免人脈焦慮。

#### Scenario: 開啟隱藏連結數
- **WHEN** 使用者在設定頁將「隱藏連結數」切換為開啟
- **THEN** 系統儲存偏好設定，任何人瀏覽該使用者個人檔案時不顯示連結數

#### Scenario: 關閉隱藏連結數（預設）
- **WHEN** 使用者的「隱藏連結數」設定為關閉（或未設定）
- **THEN** 個人檔案頁正常顯示連結數

#### Scenario: 儲存隱藏連結數設定
- **WHEN** 使用者更新「隱藏連結數」設定並儲存
- **THEN** 系統回傳 200 OK，設定立即生效
