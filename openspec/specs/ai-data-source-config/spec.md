## ADDED Requirements

### Requirement: 系統維護全域資料欄位白名單
系統 SHALL 維護一份全域設定，定義 `data-fetch` Node 可存取的 daodao 資料欄位，預設全部關閉。

#### Scenario: 初始狀態白名單為空
- **WHEN** 系統首次部署後 admin 進入資料來源設定頁
- **THEN** 所有可用欄位皆顯示為「未啟用」狀態

#### Scenario: 白名單為空時 data-fetch Node 執行被拒絕
- **WHEN** admin 觸發含 `data-fetch` Node 的 Workflow 但白名單為空
- **THEN** 系統拒絕執行並顯示「請先在資料來源設定中啟用至少一個欄位」

---

### Requirement: Admin 可啟用或停用資料欄位
系統 SHALL 允許 admin 從預定義欄位清單中切換各欄位的啟用狀態。

**可選欄位清單（初始版本）**：
- `user.name`：用戶姓名
- `user.email`：用戶 Email
- `user.bio`：自我介紹
- `user.learning_goals`：學習目標
- `user.joined_at`：加入時間
- `activity.viewed_resources`：瀏覽過的學習資源（最近 30 筆）
- `activity.saved_resources`：收藏的學習資源
- `activity.completed_courses`：已完成的課程

#### Scenario: 啟用欄位
- **WHEN** admin 切換某欄位為啟用並儲存
- **THEN** 系統更新 `workflow_data_source_config.allowed_fields`，該欄位可在 `data-fetch` Node 的欄位選單中被選取

#### Scenario: 停用欄位
- **WHEN** admin 停用某欄位並儲存
- **THEN** 系統更新白名單；已使用該欄位的 `data-fetch` Node config 不自動修改，但下次執行時該欄位不會被傳入

#### Scenario: 儲存後顯示確認
- **WHEN** admin 點擊「儲存設定」
- **THEN** 系統顯示「設定已更新」toast 通知

---

### Requirement: data-fetch Node 只能選取白名單內的欄位
系統 SHALL 在 `data-fetch` Node 的欄位選單中，只列出 `allowed_fields` 內已啟用的欄位。

#### Scenario: 欄位選單只顯示已啟用欄位
- **WHEN** admin 開啟 `data-fetch` Node 的設定表單
- **THEN** 欄位清單只顯示 `workflow_data_source_config.allowed_fields` 中已啟用的欄位

---

### Requirement: Workflow 執行時僅傳入白名單欄位資料
系統 SHALL 在執行 `data-fetch` Node 時，只查詢並傳入 `allowed_fields` 中啟用的欄位，不傳入任何未列入白名單的資料。

#### Scenario: 執行時套用白名單過濾
- **WHEN** `data-fetch` Node 執行
- **THEN** server 讀取最新 `allowed_fields`，組裝資料時只包含白名單欄位

#### Scenario: 白名單變更不影響進行中的 run
- **WHEN** 某個 run 正在執行時 admin 更新白名單
- **THEN** 該 run 繼續使用觸發時的欄位設定，不受影響
