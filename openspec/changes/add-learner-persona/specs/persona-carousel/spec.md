## ADDED Requirements

### Requirement: 輪播出現條件（一般用戶）
系統 SHALL 僅在以下條件同時滿足時，向一般用戶（非新手期）顯示靈感牆輪播：
1. `session_count_since_last_prompt >= 2`（距上次提示後累積至少 2 次登入）
2. `now() - last_prompt_timestamp > 48 hours`（距上次提示超過 48 小時）
3. 當天（日曆天）使用者尚未 dismiss 輪播

#### Scenario: 一般用戶符合出現條件
- **WHEN** 一般用戶進入靈感分頁，且 `session_count >= 2`、距上次提示 > 48h、今日未 dismiss
- **THEN** `GET /persona/carousel-state` SHALL 回傳 `shouldShow: true`

#### Scenario: 一般用戶登入次數不足
- **WHEN** `session_count_since_last_prompt < 2`
- **THEN** `GET /persona/carousel-state` SHALL 回傳 `shouldShow: false`

#### Scenario: 48 小時內再次觸發
- **WHEN** `now() - last_prompt_timestamp <= 48 hours`
- **THEN** `GET /persona/carousel-state` SHALL 回傳 `shouldShow: false`

### Requirement: 輪播出現條件（新手期）
新手期（`created_at + 5 days > now()`）使用者 SHALL 不受 session 間隔與 48 小時限制約束。只要當天尚未回答過問題且尚未 dismiss，每天第一次進入靈感分頁即顯示輪播。

#### Scenario: 新手期每日首次進入顯示輪播
- **WHEN** 新手期使用者當天尚未答題且尚未 dismiss，第一次呼叫 `GET /persona/carousel-state`
- **THEN** 系統 SHALL 回傳 `shouldShow: true`

#### Scenario: 新手期當天已答題後不強制顯示
- **WHEN** 新手期使用者當天已回答至少 1 題
- **THEN** 系統 SHALL 依一般用戶規則判斷（session count / 48h）

### Requirement: Dismiss 機制
使用者 SHALL 可點擊「本日不再顯示」來 dismiss 輪播。Dismiss 後，當天（同一日曆天）輪播 SHALL NOT 再出現，且 `session_count_since_last_prompt` 計數器 SHALL 歸零。

#### Scenario: Dismiss 後當天不再顯示
- **WHEN** 使用者呼叫 `POST /persona/carousel-dismiss`
- **THEN** 系統 SHALL 記錄 `last_dismissed_at = today`，同一日曆天內 `GET /persona/carousel-state` SHALL 回傳 `shouldShow: false`

#### Scenario: Dismiss 後跨日恢復判斷
- **WHEN** `last_dismissed_at` 為昨天或更早
- **THEN** 系統 SHALL 重新依出現條件（session count / 48h / 新手期）判斷是否顯示

#### Scenario: Dismiss 後計數器歸零
- **WHEN** 使用者呼叫 `POST /persona/carousel-dismiss`
- **THEN** 系統 SHALL 將 `session_count_since_last_prompt` 重設為 0

### Requirement: 輪播卡片內容
每次顯示的輪播 SHALL 包含最多 5 張卡片，每張卡片對應一道問題。卡片 SHALL 同時呈現「已有他人回應的問題」與「提示使用者回答的未答問題」。

#### Scenario: 輪播最多 5 張卡片
- **WHEN** `GET /persona/carousel-state` 回傳 `shouldShow: true`
- **THEN** `questions` 陣列 SHALL 包含 1 到 5 筆問題資料

#### Scenario: 已有回應的問題隨機出現
- **WHEN** 系統選取輪播問題中「已有他人回應」的部分
- **THEN** 新手期優先選 `is_new_user_priority = true` 的問題，一般用戶隨機選取，且需確保同一輪播週期內不重複同一問題（輪完一輪後才可重複）

#### Scenario: 換一題
- **WHEN** 使用者在輪播卡片上點擊「換一題」
- **THEN** 前端 SHALL 呼叫 `GET /persona/carousel-state?replace=<questionId>`，系統 SHALL 排除該題並補入另一道未答未壓制問題

### Requirement: 登入 Session 計數
每次使用者完成登入（token 核發）時，系統 SHALL 將 `session_count_since_last_prompt` 遞增 1。

#### Scenario: 登入後計數遞增
- **WHEN** 使用者成功登入（auth token 核發）
- **THEN** 系統 SHALL 將該使用者的 `session_count_since_last_prompt` 加 1

#### Scenario: 輪播顯示後計數重設
- **WHEN** `GET /persona/carousel-state` 回傳 `shouldShow: true`
- **THEN** 系統 SHALL 更新 `last_prompt_timestamp = now()` 並將 `session_count_since_last_prompt` 重設為 0
