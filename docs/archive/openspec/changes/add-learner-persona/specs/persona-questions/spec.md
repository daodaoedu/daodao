## ADDED Requirements

### Requirement: 問題庫定義三種題型
系統 SHALL 支援三種題型：`choice`（選擇題）、`sentence_completion`（完成句子）、`scenario`（具體情境）。每道問題 SHALL 包含 `prompt` 文字、`question_type`、及 `is_new_user_priority` 旗標。選擇題 SHALL 額外包含 `options` 陣列（每個選項含 `value` 與 `label`）。

#### Scenario: 取得問題列表
- **WHEN** 已登入使用者呼叫 `GET /persona/questions`
- **THEN** 系統回傳所有問題，並附帶每題的 `answered`（是否已答）與 `skip_count`（略過次數）狀態

#### Scenario: 選擇題含選項
- **WHEN** 問題 `question_type` 為 `choice`
- **THEN** 回應中 `options` 欄位 SHALL 包含至少 2 個選項，每個選項含 `value` 與 `label`

#### Scenario: 非選擇題無選項
- **WHEN** 問題 `question_type` 為 `sentence_completion` 或 `scenario`
- **THEN** 回應中 `options` 欄位 SHALL 為 `null` 或省略

### Requirement: 新手優先問題標記
系統 SHALL 為部分問題設定 `is_new_user_priority = true`，用於新手期（註冊後前 5 天）的優先推播。

#### Scenario: 新手期問題排序
- **WHEN** 使用者處於新手期（`created_at + 5 days > now()`）且系統決定推播問題
- **THEN** 系統 SHALL 優先從 `is_new_user_priority = true` 的未答問題中選取

#### Scenario: 新手期結束後轉為一般邏輯
- **WHEN** 使用者 `created_at + 5 days <= now()`
- **THEN** 系統 SHALL 改以隨機方式從未答問題中選取，不再限定 `is_new_user_priority`

### Requirement: 略過次數追蹤
系統 SHALL 記錄每位使用者對每道問題的略過次數（`skip_count`）。當 `skip_count >= 3` 時，系統 SHALL 將該問題標記為 `suppressed = true`，不再推播給該使用者。

#### Scenario: 累積略過達門檻
- **WHEN** 使用者對同一問題觸發 `POST /persona/skips` 累積達第 3 次
- **THEN** 系統 SHALL 設定該使用者 × 問題的 `suppressed = true`

#### Scenario: 已壓制問題不出現在推播
- **WHEN** 系統選取下一道要推播的問題
- **THEN** `suppressed = true` 的問題 SHALL NOT 出現在候選清單中

### Requirement: 所有問題均已回答時永久隱藏輪播
系統 SHALL 追蹤使用者是否已回答資料庫中所有未壓制問題。

#### Scenario: 全數回答後不再推播
- **WHEN** 使用者的 `answered` 問題數 >= 所有未壓制問題總數
- **THEN** `GET /persona/carousel-state` SHALL 回傳 `shouldShow: false` 且 `allAnswered: true`
