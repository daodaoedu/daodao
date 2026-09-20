## ADDED Requirements

### Requirement: Recommendation feedback SHALL support like, unlike, dislike, and hide semantics
系統 MUST 支援使用者對首頁推薦卡片執行喜歡、取消喜歡、不喜歡與隱藏行為，並維持每張卡片在單一使用者下的最新互動狀態。

#### Scenario: Like a recommendation card
- **WHEN** 使用者點擊推薦卡片的 👍 按鈕
- **THEN** 系統 MUST 將該卡片狀態標記為 liked 並記錄正向回饋

#### Scenario: Undo a like on a recommendation card
- **WHEN** 使用者再次點擊已為 liked 狀態的 👍 按鈕
- **THEN** 系統 MUST 取消該正向回饋並將卡片狀態恢復為 neutral

#### Scenario: Dislike and hide a recommendation card
- **WHEN** 使用者確認對推薦卡片執行 👎 操作
- **THEN** 系統 MUST 記錄負向回饋並將該卡片標記為 hidden

### Requirement: Hidden recommendations SHALL persist across sessions and devices
系統 MUST 將使用者對首頁推薦內容的隱藏狀態與帳號綁定持久化，且同一帳號在不同裝置或重新登入後，不得立即再次看到已隱藏的相同推薦目標。

#### Scenario: Hidden recommendation remains hidden after refresh
- **WHEN** 使用者隱藏一張推薦卡片後重新整理首頁
- **THEN** 系統 MUST 不再把同一推薦目標回傳到該使用者的首頁推薦列表

#### Scenario: Hidden recommendation remains hidden across devices
- **WHEN** 使用者在另一台已登入相同帳號的裝置開啟產品首頁
- **THEN** 系統 MUST 依據持久化的隱藏紀錄排除相同推薦目標

### Requirement: Recommendation retrieval SHALL exclude user-hidden targets before ranking output
系統在產生首頁推薦結果前 MUST 先排除該使用者已明確隱藏或標記為不喜歡的推薦目標，避免同一批次或後續重新載入時重複出現。

#### Scenario: Exclude hidden targets from recommendation result
- **WHEN** 系統為使用者查詢首頁推薦結果
- **THEN** 系統 MUST 在排序輸出前排除所有屬於該使用者 hidden 狀態的推薦目標

#### Scenario: Exclude currently displayed targets during refill
- **WHEN** 系統因使用者隱藏卡片而請求補卡
- **THEN** 系統 MUST 同時排除目前已顯示的卡片與新隱藏的目標，避免補卡結果重複

### Requirement: Feedback signals SHALL influence future ranking
系統 MUST 將使用者的首頁推薦互動作為後續排序訊號的一部分，使正向互動能提高相似內容的出現機率，負向互動能降低相似內容的出現機率。

#### Scenario: Positive feedback increases similar recommendation weight
- **WHEN** 使用者對某類推薦內容留下正向回饋
- **THEN** 系統 MUST 在後續排序中提高與該內容相似之候選的權重

#### Scenario: Negative feedback decreases similar recommendation weight
- **WHEN** 使用者對某類推薦內容留下負向回饋
- **THEN** 系統 MUST 在後續排序中降低與該內容相似之候選的權重

### Requirement: Feedback write API SHALL validate and persist source-specific events
系統 MUST 提供可驗證的 feedback 寫入介面，確保只有支援的首頁推薦互動事件能被接受，並以可追蹤來源寫入持久化資料。

#### Scenario: Accept valid dashboard recommendation feedback
- **WHEN** 前端以合法的推薦識別資訊與支援的 feedback 類型送出寫入請求
- **THEN** 系統 MUST 接受請求、完成資料寫入，並回傳更新後的回饋狀態

#### Scenario: Reject unsupported feedback payload
- **WHEN** 前端送出的 feedback 類型、推薦識別資訊或來源欄位不符合定義
- **THEN** 系統 MUST 拒絕該請求並回傳驗證錯誤，而不是寫入不合法資料
