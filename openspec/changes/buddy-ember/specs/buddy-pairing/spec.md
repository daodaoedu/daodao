## ADDED Requirements

### Requirement: 相似度推薦 API
系統 SHALL 提供 `GET /practices/:id/suggested-buddies` endpoint，回傳與指定實踐相似、且尚未建立 Buddy 關係的用戶列表。排序邏輯：先以 `template_id` 完全匹配優先，再以 `title` 全文搜尋相似度（`ts_rank`）降序；系統 SHALL 排除已是 Buddy 或有待處理請求的用戶。回傳筆數 SHALL 預設最多 5 筆。

#### Scenario: 有相同 template 的推薦
- **WHEN** 用戶對自己剛建立的實踐（template_id = T1）呼叫 suggested-buddies
- **THEN** 回傳列表中 SHALL 優先包含其他使用相同 template_id = T1 的用戶

#### Scenario: 按標題相似度推薦
- **WHEN** 沒有相同 template_id 的其他用戶，但有標題含相似關鍵字的實踐
- **THEN** 回傳列表 SHALL 按 ts_rank 降序排列這些用戶

#### Scenario: 排除已有關係的用戶
- **WHEN** 某用戶已是 Buddy 或有待處理的 buddy_request
- **THEN** 該用戶 SHALL NOT 出現在推薦列表

#### Scenario: 無推薦結果
- **WHEN** 找不到符合條件的用戶
- **THEN** API SHALL 回傳空陣列（非錯誤）

---

### Requirement: Buddy 列表 API
系統 SHALL 提供 `GET /users/me/buddies` endpoint，回傳當前用戶的所有 Buddy 關係及其狀態摘要。每筆資料 SHALL 包含：對方的頭像、名稱、實踐名稱、ember 狀態（active / fading / dying / dormant）、最近打卡時間。結果 SHALL 依狀態優先級排序：里程碑 > 今天已打卡 > N 天未出現。

#### Scenario: 列表含多筆 Buddy
- **WHEN** 用戶有 3 個 Buddy，各自處於不同 ember 狀態
- **THEN** 回傳 3 筆，排序依狀態優先級（里程碑最前）

#### Scenario: 無 Buddy 時回傳空列表
- **WHEN** 用戶尚未與任何人建立 Buddy 關係
- **THEN** API SHALL 回傳空陣列

---

### Requirement: 實踐建立後的推薦卡片
實踐建立成功畫面 SHALL 在畫面下方顯示推薦 Buddy 卡片，呼叫 suggested-buddies API 取得最多 3 筆推薦。每筆推薦 SHALL 顯示頭像、名稱、實踐名稱，以及「邀請」按鈕。卡片 SHALL 提供「暫時跳過」選項以關閉整個推薦區塊。

#### Scenario: 顯示推薦卡片
- **WHEN** 用戶成功建立一個實踐
- **THEN** 成功畫面 SHALL 在主要內容下方顯示推薦 Buddy 卡片（最多 3 筆）

#### Scenario: 點擊邀請送出請求
- **WHEN** 用戶在推薦卡片點擊某人的「邀請」按鈕
- **THEN** 系統 SHALL 呼叫 `POST /practices/:id/buddy-requests` 送出邀請，按鈕 SHALL 變為「已送出」disabled 狀態

#### Scenario: 跳過推薦
- **WHEN** 用戶點擊「暫時跳過」
- **THEN** 推薦卡片區塊 SHALL 收起，不影響其他畫面內容

#### Scenario: 無推薦結果時不顯示卡片
- **WHEN** suggested-buddies 回傳空陣列
- **THEN** 成功畫面 SHALL NOT 顯示推薦卡片區塊

---

### Requirement: 打卡後的推薦卡片（未配對用戶）
打卡成功後，若當前用戶在此實踐尚無任何 Buddy，系統 SHALL 在打卡成功畫面顯示推薦 Buddy 卡片。已有至少一個 Buddy 的用戶 SHALL NOT 看到此卡片。

#### Scenario: 未配對用戶打卡後看到推薦
- **WHEN** 用戶完成打卡，且此實踐尚未有任何 Buddy
- **THEN** 打卡成功畫面 SHALL 顯示推薦卡片（最多 3 筆）

#### Scenario: 已有 Buddy 的用戶不顯示推薦
- **WHEN** 用戶完成打卡，且此實踐已有至少一個 Buddy
- **THEN** 打卡成功畫面 SHALL NOT 顯示推薦卡片

---

### Requirement: 主動邀請 UI
在他人的實踐頁面及 Profile 頁面，系統 SHALL 顯示「邀請成為 Buddy」按鈕（對象為實踐擁有者 / Profile 主人）。若已是 Buddy 或有待處理請求，按鈕 SHALL 顯示對應狀態（「已是 Buddy」/ 「邀請已送出」）而非可點擊狀態。

#### Scenario: 送出主動邀請
- **WHEN** 用戶在他人實踐頁面點擊「邀請成為 Buddy」
- **THEN** 系統 SHALL 呼叫 buddy-requests API，按鈕 SHALL 更新為「邀請已送出」

#### Scenario: 已是 Buddy 時按鈕狀態
- **WHEN** 用戶瀏覽已是 Buddy 的對方實踐頁
- **THEN** 按鈕 SHALL 顯示「已是 Buddy」並為 disabled

#### Scenario: 不顯示給自己
- **WHEN** 用戶瀏覽自己的實踐頁或 Profile 頁
- **THEN** 邀請按鈕 SHALL NOT 出現

---

### Requirement: Buddy 列表頁
系統 SHALL 提供 `/buddies` 頁面，顯示當前用戶的所有 Buddy。每張卡片 SHALL 顯示：頭像、名稱、實踐名稱、ember 狀態（視覺化），以及最近狀態文字（今天在島上 / N 天未出現 / Day 30 🎉）。點擊卡片 SHALL 進入對方的實踐頁。

#### Scenario: 狀態文字依 ember 狀態顯示
- **WHEN** 某 Buddy 當天已打卡
- **THEN** 卡片 SHALL 顯示「今天在島上 ✓」

#### Scenario: N 天未出現
- **WHEN** 某 Buddy 已 3 天未打卡
- **THEN** 卡片 SHALL 顯示「3 天未出現 🌧」

#### Scenario: 里程碑優先顯示
- **WHEN** 某 Buddy 當天達成 Day 30 里程碑
- **THEN** 卡片 SHALL 顯示「Day 30 🎉」，排序置頂
