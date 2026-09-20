## ADDED Requirements

### Requirement: Practice privacy status
每個練習 SHALL 具有 `privacy_status` 欄位，值為 `private`、`public`（即時公開）或 `delayed`（延遲分享）。預設值為 `private`。

#### Scenario: 新練習預設為私人
- **WHEN** 使用者建立新練習且未指定隱私狀態
- **THEN** 系統 SHALL 將 `privacy_status` 設為 `private`

#### Scenario: 使用者變更隱私狀態為即時公開
- **WHEN** 使用者將練習的 `privacy_status` 更新為 `public`
- **THEN** 系統 SHALL 立即將該練習納入廣場 Feed

#### Scenario: 使用者設定延遲分享
- **WHEN** 使用者將練習的 `privacy_status` 設為 `delayed`
- **THEN** 系統 SHALL 在廣場顯示該練習的外層資訊（標題、標籤），但隱藏所有打卡心得內容

---

### Requirement: Showcase feed API
靈感 Tab SHALL 使用 AI backend 的 `GET /api/v1/users/practices`（`ai-types.ts`）作為 Feed 資料來源，支援 `keyword`、`tags`、`duration_min/max`、`status`、`sort_by` 過濾及 cursor-based 分頁。

展示對象：`privacy_status` 為 `public` 且 `status` 為 `active` 或 `completed` 的練習；以及 `privacy_status` 為 `delayed` 且 `status` 為 `active` 的練習。

排除對象：`status` 為 `draft`、`not_started` 或 `archived` 的練習；`privacy_status` 為 `private` 的練習。

AI backend SHALL 擴充 `/api/v1/users/practices` 回傳欄位，加入 `privacy_status` 與 `reactions`（`IReactionCount[]`）。

#### Scenario: 取得靈感列表（預設排序）
- **WHEN** 呼叫 `GET /api/v1/users/practices?sort_by=newest_updated`
- **THEN** 系統 SHALL 回傳符合展示條件的練習，依「最後打卡時間」或「建立時間」降序排列

#### Scenario: 不含草稿、未開始、已封存練習
- **WHEN** 呼叫 `GET /api/v1/users/practices`
- **THEN** 系統 SHALL NOT 回傳任何 `status = 'draft'`、`not_started` 或 `archived` 的練習

#### Scenario: 不含私人練習
- **WHEN** 呼叫 `GET /api/v1/users/practices`
- **THEN** 系統 SHALL NOT 回傳任何 `privacy_status = 'private'` 的練習

---

### Requirement: Full Access Card data
對於 `privacy_status = 'public'` 或 `status = 'completed'` 的練習，API 回應 SHALL 包含完整卡片資料：
- 狀態徽章（`status`：`active` 顯示「進行中」、`completed` 顯示「已完成」）
- 日期區間（`start_date` ▶ `end_date`，格式 YYYY/MM/DD）
- 練習標題
- 使用者資訊（暱稱、頭像 URL）
- 行動描述（`practice_action`，截斷至 50 字）
- 頻率資訊（`frequencyMinDays`、`frequencyMaxDays`、`sessionDurationMinutes`）
- 加油資訊（`cheer_count`、`is_cheered`、`cheer_display`：最新加油者名稱 + 「與其他 N 人」）
- 留言數（`comment_count`）
- 最後打卡內容摘要（`last_checkin_summary`，截斷至 200 字）

卡片 SHALL NOT 包含「打卡」按鈕資料（打卡功能僅限本人私人頁面）。

#### Scenario: 完整卡片包含最新打卡摘要
- **WHEN** API 回傳 `privacy_status = 'public'` 的練習卡片
- **THEN** 回應 SHALL 包含最新一筆打卡的 `content` 文字（截斷至 200 字）

#### Scenario: 完整卡片包含頻率資訊
- **WHEN** API 回傳任何 Full Access Card
- **THEN** 回應 SHALL 包含 `frequencyMinDays`、`frequencyMaxDays`、`sessionDurationMinutes` 欄位

#### Scenario: 完整卡片包含加油展示資訊
- **WHEN** 練習已有加油且 API 回傳 Full Access Card
- **THEN** 回應 SHALL 包含 `cheer_display`，格式為最新加油者 `display_name`（若有多人則附「與其他 N 人」）

#### Scenario: 完整卡片包含留言數
- **WHEN** API 回傳廣場卡片
- **THEN** 回應 SHALL 包含 `comment_count: number`

#### Scenario: 完整卡片不包含打卡 CTA
- **WHEN** API 回傳靈感頁卡片資料
- **THEN** 回應 SHALL NOT 包含 `checkin_action` 或類似的打卡操作欄位

---

### Requirement: Brewing Card data
對於 `privacy_status = 'delayed'` 且 `status = 'active'` 的練習，API 回應 SHALL 包含受限卡片資料：狀態徽章、日期區間、練習標題、使用者資訊、頻率資訊、加油資訊（`cheer_count`、`is_cheered`、`cheer_display`）、留言數。打卡心得 SHALL NOT 出現在回應中。

回應 SHALL 包含 `is_brewing: true` 旗標，以及提示文字「內容醞釀中，完成後解鎖！」。

#### Scenario: 醞釀中卡片不暴露打卡內容
- **WHEN** API 回傳 `privacy_status = 'delayed'` 的練習卡片
- **THEN** 回應 SHALL NOT 包含任何 `checkins` 陣列資料或打卡心得文字

#### Scenario: 醞釀中卡片包含 is_brewing 旗標
- **WHEN** API 回傳 `privacy_status = 'delayed'` 的練習卡片
- **THEN** 回應 SHALL 包含 `is_brewing: true`

---

### Requirement: Harvest completion toast
當使用者完成一個 `privacy_status = 'public'` 或 `privacy_status = 'delayed'` 的練習（status 變更為 `completed`）後，系統 SHALL 顯示一次性提示：「你的實踐打卡內容已公開」。

使用者可永久關閉此提示（preference 記錄於後端 `user_preferences`）。

#### Scenario: 完成公開練習後顯示提示
- **WHEN** 使用者將 `privacy_status = 'public'` 的練習標記為完成
- **THEN** 前端 SHALL 顯示「你的實踐打卡內容已公開」toast

#### Scenario: 已關閉提示後不再顯示
- **WHEN** 使用者曾選擇永久關閉此提示
- **THEN** 系統 SHALL NOT 再次顯示此 toast
