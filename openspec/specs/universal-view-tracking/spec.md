## ADDED Requirements

### Requirement: 記錄瀏覽事件
已登入使用者進入 practice 或 resource 詳情頁時，系統 SHALL 記錄一次瀏覽事件。同一使用者對同一內容，24 小時內重複進入 SHALL 只計算一次。

#### Scenario: 首次瀏覽
- **WHEN** 已登入使用者呼叫 `POST /api/v1/practices/:id/view` 或 `POST /api/v1/resources/:id/view`
- **THEN** 系統 SHALL 在 Redis 設置去重 key `dedup:view:{entity_type}:{entity_id}:{user_id}`（TTL 24h）
- **THEN** 系統 SHALL 將 `entity_stats.view_count` 加 1（upsert）
- **THEN** 系統 SHALL 在 `interaction_events` 新增一筆 `event_type = 'view'` 的記錄
- **THEN** 系統 SHALL 回傳 `{ success: true, data: { viewCount: number } }`

#### Scenario: 24 小時內重複瀏覽
- **WHEN** 同一使用者對同一內容在 24 小時內再次呼叫 view endpoint
- **THEN** Redis 去重 key 已存在，系統 SHALL 直接回傳現有 viewCount，不更新任何計數

#### Scenario: 內容不存在
- **WHEN** 使用者呼叫 view endpoint 但 id 對應的內容不存在
- **THEN** 系統 SHALL 回傳 404

#### Scenario: 未登入使用者
- **WHEN** 未帶 Bearer token 的請求呼叫 view endpoint
- **THEN** 系統 SHALL 回傳 401

---

### Requirement: 瀏覽次數顯示於詳情頁
`GET /api/v1/practices/:id` 與 `GET /api/v1/resources/:id` 的回應 SHALL 包含正確的 `viewCount`，來自 `entity_stats` 表。

#### Scenario: 有瀏覽紀錄的內容
- **WHEN** 取得已有人瀏覽過的 practice 或 resource 詳情
- **THEN** 回應的 `stats.viewCount` SHALL 等於 `entity_stats.view_count` 的值

#### Scenario: 尚無瀏覽紀錄的內容
- **WHEN** 取得從未被瀏覽過的 practice 或 resource 詳情
- **THEN** 回應的 `stats.viewCount` SHALL 為 `0`

---

### Requirement: 記錄使用者行為序列
每次成功計數的瀏覽事件，系統 SHALL 在 `interaction_events` 寫入一筆記錄，供推薦系統使用。

#### Scenario: 寫入行為事件
- **WHEN** 瀏覽事件通過去重檢查
- **THEN** `interaction_events` SHALL 新增一筆記錄，包含 `entity_type`、`entity_id`、`user_id`、`event_type = 'view'`、`created_at`

#### Scenario: 重複瀏覽不寫入
- **WHEN** 瀏覽事件被 Redis 判定為 24h 內重複
- **THEN** `interaction_events` SHALL 不新增任何記錄

---

### Requirement: 前端發送 PostHog 分析事件
使用者進入 practice 或 resource 詳情頁時，前端 SHALL 透過 `packages/analytics` 的 `posthogCapture` 發送分析事件。

#### Scenario: 進入詳情頁
- **WHEN** 使用者進入 practice 或 resource 詳情頁
- **THEN** 前端 SHALL 呼叫 `posthogCapture('content_viewed', { entity_type, entity_id, referrer, platform: 'web' })`

#### Scenario: PostHog 事件不阻塞頁面
- **WHEN** PostHog 事件發送失敗或超時
- **THEN** 頁面 SHALL 正常顯示，不受影響

---

### Requirement: 瀏覽記錄不阻塞主流程
view endpoint 的 DB 寫入 SHALL 為非阻塞操作，錯誤 SHALL 不影響詳情頁的正常載入。

#### Scenario: view-tracking service 發生錯誤
- **WHEN** `view-tracking.service` 在寫入 DB 時拋出例外
- **THEN** 錯誤 SHALL 被 catch 並記錄至 log
- **THEN** endpoint 仍 SHALL 回傳 200，不向前端傳遞錯誤
