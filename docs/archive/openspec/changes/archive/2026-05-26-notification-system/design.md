## Context

平台目前缺乏任何通知機制，用戶無從得知發生在其內容或關係上的社交互動。本次設計針對 Web-only 的 MVP 階段，建立一套「批次優先」的通知架構，在開發成本與用戶體驗之間取得平衡。

現有系統為 Express.js 後端（Prisma + PostgreSQL）+ Next.js 前端，Email 服務已有 Nodemailer + BullMQ 基礎架構（參考 `practice-email.queue.ts`），尚未引入任何即時推送（WebSocket/SSE）。

## Goals / Non-Goals

**Goals:**
- 建立可擴充的事件→通知管道（Event → Notification Pipeline）
- 實作 In-App 通知中心（每小時批次更新）
- 實作 Email 聚合發送（每 4 小時 P1+P2、週報 P3）
- 支援用戶細粒度通知偏好設定
- 實作 Email 退訂機制（符合 CAN-SPAM / GDPR）

**Non-Goals:**
- 即時推送（WebSocket / SSE / Mobile Push）—— MVP 後考慮
- 已讀狀態過濾 Email（MVP 簡化：不做已讀偵測，所有事件均進入下一批次 Email）
- 第三方通知整合（Slack、LINE 等）

## Decisions

### 1. 批次架構而非即時推送

**決策**：採用排程批次（Cron Job）而非 WebSocket 即時推送。

**理由**：
- Web-only 用戶僅在進入/刷新頁面時感知更新，即時推送在 MVP 階段噪音低但成本高
- 批次架構降低後端複雜度，無需管理連線狀態
- 每小時更新對用戶而言感知差異不大，但實作成本差距顯著

**替代方案**：SSE（Server-Sent Events）—— 可在 Post-MVP 引入以支援即時鈴鐺更新

---

### 2. 通知事件以資料庫佇列為核心

**決策**：事件觸發時寫入 `notification_events` 表，排程任務從表中讀取並處理，而非使用訊息佇列（Redis / RabbitMQ）。

**理由**：
- MVP 規模不需要分散式訊息佇列的複雜度
- 資料庫佇列提供天然的持久化與稽核軌跡
- 專案已有 BullMQ 基礎設施，可使用 BullMQ repeatable jobs 實作排程（`practice-email.queue.ts` 為參考範本）

**替代方案**：`node-cron` —— 輕量但無持久化；BullMQ repeatable jobs 更適合，因已有 Redis 連線

---

### 3. Email 服務選用 Resend

**決策**：整合 Resend 作為 Email 發送服務。

**理由**：
- 開發者友善 API、支援 React Email 模板
- 免費方案足夠 MVP 使用量（每月 3,000 封）
- 支援退訂 webhook 回調

**替代方案**：SendGrid（功能更完整但設定更複雜）、SES（成本最低但整合工作量大）

---

### 4. 退訂 Token 設計

**決策**：每封 Email 的退訂連結包含 JWT 格式的 signed token（含 userId + notificationType + exp）。

**理由**：
- 無需用戶登入即可完成退訂（降低摩擦力）
- Signed token 防止惡意批量退訂
- token 包含類型，支援「退訂此類通知」而非強制全部退訂

---

### 5. 資料模型

**`notifications` 表**（In-App 通知中心）：
```
id, recipient_id, actor_id, type (enum), entity_type, entity_id,
priority (P1/P2), is_read, created_at, batch_sent_at
```

**`notification_preferences` 表**（用戶偏好）：
```
id, user_id, notification_type (enum), channel (N01/N02/N03),
is_enabled, updated_at
```

**`notification_events` 表**（待處理事件佇列）：
```
id, type, actor_id, recipient_id, entity_type, entity_id,
payload (jsonb), priority, processed_at, created_at
```

## Risks / Trade-offs

- **MVP Email 不做已讀過濾** → 用戶可能在 Web 讀完後仍收到 Email 摘要。緩解：文案說明「以下是你的互動摘要」而非「你有未讀通知」
- **批次延遲最長 1 小時（In-App）或 4 小時（Email）** → P1 事件最長 4 小時延遲，已確認可接受。Post-MVP 可升級為即時推送
- **Cron Job 單點失敗** → 若排程服務重啟，批次可能漏發。緩解：`processed_at` 欄位確保冪等性，重啟後可補發未處理事件
- **Email 退訂 token 過期** → 若用戶長時間未使用退訂連結，token 可能失效。緩解：token 有效期設為 90 天，同時提供「前往設定頁」的備用連結

## Migration Plan

1. 新增資料庫 migration（notifications、notification_preferences、notification_events 三張表）
2. 部署後端事件監聽 hooks（在現有 reaction/comment/follow/connect 服務中埋點）
3. 設定 Cron Job（每小時 In-App 批次、每 4 小時 Email 批次、週日週報）
4. 部署前端通知中心元件
5. 部署通知設定頁面

**Rollback**：若需回滾，關閉 Cron Job 排程即可停止所有通知發送，資料保留不影響現有功能。

### 6. Deep Link 路由映射

通知點擊後的跳轉規則（`entity_type + entity_id → 前端路由`）：

| entity_type | 前端路由 | 備註 |
|-------------|----------|------|
| `comment` | 依 `target_type` + `target_id` 決定，見下方 | 需附 `#comment-{id}` hash |
| `practice` | `/practices/{external_id}` | |
| `practice_checkin` | `/practices/{practice_external_id}/check-ins/{external_id}` | |
| `user` | `/users/{custom_id \|\| external_id}` | Follow/Connect 觸發 |
| `connection` | `/users/{requester_external_id}` | 連結請求跳轉至對方個人頁 |
| `buddy_request` | `/practices/{practice_external_id}` | Buddy 請求跳轉至該實踐頁 |

**留言的 target_type 對應：**

| comment.target_type | 前端路由 |
|---------------------|----------|
| `practice` | `/practices/{external_id}#comment-{comment_id}` |
| `resource` | `/resource/{external_id}#comment-{comment_id}` |
| `post` | `/users/{identifier}#comment-{comment_id}` |

**深層跳轉行為：**
- 頁面載入後，若 URL 含 `#comment-{id}`，前端 SHALL 滾動至該留言並高亮 2 秒
- 若留言已被刪除，顯示「此留言已被刪除」提示

### 7. Connect vs Buddy 定義

| 功能 | Connect（連結請求） | Buddy（實踐夥伴） |
|------|---------------------|------------------|
| 範疇 | 用戶之間的一般夥伴關係 | 針對特定主題實踐的學習夥伴 |
| 存放 | 新建 `connections` 表 | 擴展 `mentor_participants` 或新建 `practice_buddy_requests` 表 |
| payload | `intent`（連結初衷文字） | `practice_id`（對應的實踐） |
| 通知優先級 | P1 | P1 |

## Open Questions（已解決）

- **通知中心最多顯示幾筆？** → **已決定**：預設顯示 20 筆，支援 cursor-based 無限捲動載入更多（已納入 notification-delivery/spec.md）
- **週報「本週」的時間邊界？** → **已決定**：UTC+8 週一 00:00:00 ~ 週日 23:59:59（已納入 notification-email/spec.md）
