## ADDED Requirements

### Requirement: In-App 通知批次更新（每小時）
系統 SHALL 每小時整點（00:00, 01:00, ... 23:00）執行一次 In-App 批次處理，將 `notification_events` 中未處理的 P1 與 P2 事件寫入 `notifications` 表。

#### Scenario: 整點批次執行
- **WHEN** 系統時間到達整點（例如 10:00）
- **THEN** 系統 SHALL 查詢所有 `processed_at IS NULL` 的 P1、P2 事件，建立對應的 `notifications` 記錄，並更新 `processed_at`

#### Scenario: 用戶查詢通知中心
- **WHEN** 用戶開啟通知中心
- **THEN** 系統 SHALL 回傳該用戶的 `notifications` 列表，P1 事件置頂於 P2 事件之上，並以 `created_at` 降序排列
- **THEN** 預設回傳最新 20 筆，支援 cursor-based 無限捲動載入更多

#### Scenario: 無限捲動載入
- **WHEN** 用戶捲動至通知列表底部
- **THEN** 前端 SHALL 以 cursor（最後一筆通知的 `id`）請求下一頁 20 筆，直至無更多資料

#### Scenario: 批次冪等性
- **WHEN** 排程服務重啟後重新執行批次
- **THEN** 系統 SHALL 僅處理 `processed_at IS NULL` 的事件，已處理事件不得重複寫入

### Requirement: Email 聚合發送（每 4 小時）
系統 SHALL 於每日 08:00、12:00、16:00、20:00 執行 Email 聚合批次，將週期內的 P1 與 P2 事件彙整為一封「互動摘要」Email 發送給用戶。

#### Scenario: 4 小時 Email 批次執行
- **WHEN** 系統時間到達 08:00（或 12:00、16:00、20:00）
- **THEN** 系統 SHALL 查詢上一個 4 小時週期內的所有 P1、P2 事件，依 recipient 分組，對每位有事件的用戶發送一封摘要 Email

#### Scenario: Email 內容結構
- **WHEN** 系統產生聚合 Email
- **THEN** Email 內容 SHALL 明確區分「重要連結與討論（P1）」與「共鳴回饋（P2）」兩個區塊，P1 區塊在前

#### Scenario: 無事件時不發送 Email
- **WHEN** 某用戶在當前 4 小時週期內沒有任何事件
- **THEN** 系統 SHALL 不對該用戶發送 Email

#### Scenario: MVP 不過濾已讀狀態
- **WHEN** 用戶在 11:50 於 Web 端已讀某通知
- **THEN** 12:00 的 Email 批次 SHALL 仍包含該通知（不做已讀狀態過濾）

### Requirement: 安靜時間處理
系統 SHALL 將 00:00–07:59 產生的所有事件，於 08:00 的首封 Email 批次中一次性彙整發送。

#### Scenario: 凌晨事件併入晨間 Email
- **WHEN** 凌晨 02:30 有用戶 A 對用戶 B 留言
- **THEN** 該事件 SHALL 出現在 08:00 的 Email 摘要中，而非在 04:00 發送

### Requirement: 深層跳轉（Deep Link）解析
每則 In-App 通知 SHALL 包含可解析的跳轉目標，點擊後導航至對應內容頁面。

跳轉規則（`entity_type → 前端路由`）：

| entity_type | 路由 |
|-------------|------|
| `comment`（target: practice）| `/practices/{external_id}#comment-{comment_id}` |
| `comment`（target: resource）| `/resource/{external_id}#comment-{comment_id}` |
| `comment`（target: post）| `/users/{identifier}#comment-{comment_id}` |
| `practice` | `/practices/{external_id}` |
| `user`（follow/connect）| `/users/{custom_id \|\| external_id}` |
| `connection` | `/users/{requester_external_id}` |
| `buddy_request` | `/practices/{practice_external_id}` |
| `practice`（follow）| `/practices/{external_id}` |

#### Scenario: 點擊留言通知跳轉並高亮
- **WHEN** 用戶點擊 entity_type 為 `comment` 的通知
- **THEN** 瀏覽器 SHALL 導航至對應頁面，URL 含 `#comment-{id}`，頁面載入後自動捲動至該留言並高亮顯示 2 秒

#### Scenario: 留言已被刪除的跳轉處理
- **WHEN** 用戶點擊通知跳轉至留言位置，但該留言已被刪除
- **THEN** 前端 SHALL 顯示「此留言已被刪除」的提示，不中斷頁面渲染

#### Scenario: 點擊連結請求通知
- **WHEN** 用戶點擊 entity_type 為 `connection` 的通知
- **THEN** 瀏覽器 SHALL 導航至 `/users/{requester_external_id}`，讓接收方查看對方個人頁

### Requirement: 連結請求通知快速操作
In-App 通知中心的連結請求通知 SHALL 提供「接受」與「忽略」快速操作按鈕，無需進入對方個人頁即可完成操作。

#### Scenario: 快速接受連結請求
- **WHEN** 用戶點擊連結請求通知中的「接受」按鈕
- **THEN** 前端 SHALL 呼叫 `PATCH /api/v1/connections/:id`（status: accepted），操作完成後通知項目更新為「已接受」狀態

#### Scenario: 快速忽略連結請求
- **WHEN** 用戶點擊連結請求通知中的「忽略」按鈕
- **THEN** 前端 SHALL 呼叫 `PATCH /api/v1/connections/:id`（status: ignored），操作完成後通知項目從列表中移除或標記為「已忽略」

#### Scenario: Buddy 請求快速操作
- **WHEN** 收到 Buddy 請求的 In-App 通知顯示時
- **THEN** 通知項目 SHALL 同樣提供「接受」與「忽略」快速操作按鈕，呼叫 `PATCH /api/v1/buddy-requests/:id`

### Requirement: 通知聚合顯示
系統 SHALL 將同一 entity 在 1 小時內的相同類型 P2 事件聚合為一則通知顯示。

#### Scenario: 多人按讚聚合
- **WHEN** 用戶 A、B、C、D 在 1 小時內對同一篇文章按讚
- **THEN** In-App 通知 SHALL 顯示為「A 與其他 3 人按了讚」，而非 4 則獨立通知

#### Scenario: 不同類型事件不聚合
- **WHEN** 用戶 A 按讚且用戶 B 留言，均針對同一篇文章
- **THEN** 系統 SHALL 將按讚與留言分別顯示為獨立通知
