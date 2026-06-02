## ADDED Requirements

### Requirement: 擴充留言目標類型
現有 `CommentTargetType` SHALL 擴充以支援 `practice`（主題實踐）作為留言目標。

#### Scenario: 對實踐留言
- **WHEN** 用戶在主題實踐頁對實踐本身留言
- **THEN** 系統 SHALL 以 `target_type: 'practice'` 建立留言記錄

---

### Requirement: 二層留言結構
留言系統 SHALL 限制為二層結構：頂層留言（top-level）及其直接回覆（replies）。回覆不可再被回覆。

#### Scenario: 建立頂層留言
- **WHEN** 用戶在留言框輸入內容並送出，未指定 parent_id
- **THEN** 系統 SHALL 建立一筆無 parent_id 的頂層留言

#### Scenario: 建立回覆
- **WHEN** 用戶點擊頂層留言的「回覆」按鈕並送出
- **THEN** 系統 SHALL 建立一筆 parent_id 指向該頂層留言的回覆

#### Scenario: 阻止第三層留言
- **WHEN** 用戶嘗試以 parent_id 指向一筆已有 parent_id 的留言（即回覆的回覆）
- **THEN** 系統 SHALL 回傳 400 錯誤，拒絕建立

---

### Requirement: @mention 功能
留言內容 SHALL 支援 `@custom_id`（用戶自訂 ID，如 `@jane_doe`）語法標記其他用戶，系統需解析並通知被標記用戶。`custom_id` 對應 `users.custom_id` 欄位。

#### Scenario: 輸入 @ 觸發用戶選單
- **WHEN** 用戶在留言框輸入 `@` 字元
- **THEN** 前端 SHALL 顯示該留言區內已參與的用戶清單（含 `custom_id` 和 nickname）供選擇

#### Scenario: 提交含 mention 的留言
- **WHEN** 留言內容含有 `@custom_id` 格式的標記並送出
- **THEN** 系統 SHALL 解析 mention、將被標記用戶的內部 `user_id` 存入 `comments.mentions TEXT[]`，並觸發通知給被標記用戶

---

### Requirement: 留言數計數
系統 SHALL 在卡片上顯示該目標的留言總數（含回覆）。

#### Scenario: 計數更新
- **WHEN** 任何用戶新增或刪除留言/回覆
- **THEN** 對應卡片上的留言計數 SHALL 即時更新
