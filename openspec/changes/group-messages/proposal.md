# Proposal: 活動課程群組訊息

> 2026-09-03 依 FRD（issue daodaoedu/daodao#154，Google Doc 1KHImv3q…）與 daodao-server / daodao-f2e 實地盤點產出。上游：活動課程 = lighthouse cohort（已歸檔的 `2026-09-02-challenge-activity-space-wiring`）。

## Why

活動課程（`programs.kind='lighthouse'` 的 cohort）目前只有「帶領人 → 單一參與者」的今日焦點訊息（`cohort_messages`），參與者之間沒有任何共同對話空間；產品站的 `/messages` 頁是「即將推出」placeholder，sidebar 的「訊息」入口也已預留 `badge: "unread-count"` 但沒東西可顯示。FRD 要求每個活動課程自動附帶一個群組聊天室，讓帶領人用置頂與系統訊息引導節奏、參與者看見彼此的存在（見證而非比較），並把對話痕跡留在課程容器內。

## 已確認的產品／技術決策

| 問題 | 決策（細節見 design.md 對應 D 編號） |
|---|---|
| 聊天室與活動課程的關係 | 一對一：`chat_rooms.cohort_id UNIQUE`；只對 `programs.kind='lighthouse'` 建立，`challenge` 一律不建（D2） |
| 與既有今日焦點訊息（`cohort_messages`）的關係 | **不共用表**。`cohort_messages` 是帶領人→單一參與者、綁實踐與範本、發通知寫審計的私訊；群組訊息另開 `chat_*` 表（D1） |
| 成員判定 | 不另建成員表：成員 = 該 cohort `status='joined'` 的 enrollment ∪ 該 cohort 所屬組織的 `organization_members`；host = enrollment role ∈ {owner, assistant} ∪ 組織成員（與既有 `requireCohortRole` 同源，D5） |
| 即時性 | 本輪用 SWR 增量輪詢（開啟中的聊天室 5 秒、列表／未讀 30 秒），API 形狀保留升級到 SSE 的路徑（D3） |
| 在線狀態 | 以 Redis TTL key 記錄「90 秒內有輪詢本聊天室」，成員面板據此顯示綠點（D3） |
| 未讀數 | 每人每室一個已讀游標（`chat_room_reads.last_read_message_id`），列表端點同時回 `totalUnread` 給 sidebar badge；無推播（D4） |
| 已結束／封存 cohort | **PM 2026-09-03 拍板：結束後仍可聊。** 結束日不影響聊天室，只有 `status='archived'` 才唯讀；不套用 cohort 內容的 90 天 `gone` 規則，訊息永久保留（D5） |
| 成員離開 | **PM 拍板：使用者無法自行離開聊天室。** 不提供「離開聊天室」操作，成員身分只隨活動課程的參與狀態變動（退出活動或被移除）（D5） |
| 室內搜尋 | server ILIKE（body + 作者暱稱），回傳符合的訊息 id 清單，前端負責跳轉與 highlight；歷史訊息用 `before` cursor 分頁（D6） |
| 編輯／刪除 | 軟刪除；被刪訊息不出現在時間軸，但被引用時引用區塊顯示「此訊息已刪除」；置頂訊息被刪同時取消置頂（D7） |
| 日期分隔線／訊息群組 | 純前端由 `createdAt` 推導（Asia/Taipei 日曆日、同作者連續），不存資料（D1） |
| 聊天室 icon 與 cover 色 | cohorts / programs 沒有 icon／cover 欄位，前端以 roomId 決定色盤 + 名稱首字，不加 DB 欄位（D8） |
| 置頂 banner 收起狀態 | 前端 per-viewer 狀態（記最後看過的置頂 id），不進 DB（D1） |

## What Changes

- **新增** DB 表 `chat_rooms`、`chat_messages`、`chat_message_likes`、`chat_room_reads`（daodao-storage migration `087_create_chat_tables.sql`，含既有 lighthouse cohort 的 room 回填）
- **新增** server 端 `chat-room` 與 `chat-message` 功能域：`GET /api/v1/me/chat-rooms`（列表 + 未讀）、`/api/v1/chat-rooms/{roomId}/*`（詳情、成員、訊息 CRUD、按讚、置頂、搜尋、已讀游標）
- **修改** `cohort.service.create` / `duplicate`：lighthouse cohort 建立時同交易建立聊天室；`cohort-join.service.join`、`cohort-membership.service.exit` / `remove`：寫入系統訊息（成員加入／離開）
- **新增** f2e `/messages` 頁：左欄聊天室列表（含篩選、未讀 badge）＋右欄對話區（訊息群組、引用回覆、按讚、編輯、刪除、置頂 banner／面板、成員面板、室內搜尋、composer）
- **修改** f2e sidebar：「訊息」項渲染既已定義但未實作的 `unread-count` badge
- **新增** f2e `packages/api/src/services/chat-room.ts` + `chat-room-hooks.ts`
- **不動** `cohort_messages` / `cohort_message_templates` 與 `components/lighthouse/cohort-message-dialogs.tsx`（今日焦點維持原樣）

## Capabilities

### New Capabilities

- `chat-room-membership`：聊天室自動建立、成員與 host 判定、列表與未讀數、已讀游標、成員面板與在線狀態、cohort 生命週期對聊天室的唯讀／下線規則
- `chat-messaging`：訊息傳送、歷史分頁與增量拉取、引用回覆、編輯、刪除、按讚、系統訊息、composer 行為、角色權限矩陣
- `chat-pins-and-search`：置頂／取消置頂、置頂 banner 與面板、聊天室列表篩選、室內訊息搜尋與結果導航

### Modified Capabilities

（無 — `activity-discovery`、`space-aggregation`、`notifications` 的既有 requirement 不變；今日焦點訊息行為不變）

## Non-goals

- 共同挑戰（`kind='challenge'`）與個人學習情境的聊天室（FRD 2.2）
- 通知推播與 email：新訊息**不**寫 `notification_events` / `notifications`，未讀只靠本 change 的已讀游標（FRD 2.2）
- 檔案上傳、圖片傳送、貼圖、富文本（FRD 2.2）
- 一對一私訊（FRD 2.2）；今日焦點的 `cohort_messages` 不併入本聊天室
- AI 摘要或自動回覆（FRD 2.2）
- WebSocket／SSE 真即時、輸入中指示、逐則已讀回條
- 訊息檢舉／自動審核；admin-ui 的聊天室管理頁
- 成員手動新增／移除（FRD 3.10：系統自動）
- mobile app（Expo）；本輪僅 product web，手機寬度只做「列表／對話區擇一顯示」的最低限度 responsive

## Impact

- **daodao-storage**：`migrate/sql/087_create_chat_tables.sql`（四張表 + index + 回填）＋新增 `schema/` 對應建表檔
- **daodao-server**：Prisma db pull + generate；新 `src/constants/chat.ts`；新 `chat-acl.service.ts`、`chat-room.service.ts`、`chat-message.service.ts`、`chat-presence.service.ts`；新 `chat-room.validators.ts` / `chat-room.controller.ts` / `chat-room.routes.ts`；`app.ts` 掛 `/api/v1/me/chat-rooms` 與 `/api/v1/chat-rooms`；`cohort.service.ts`、`cohort-join.service.ts`、`cohort-membership.service.ts` 加 hook；openapi 重生；Redis 新增 `chat:presence:*` key
- **daodao-f2e**：`packages/api` 新 service/hooks + `types.ts` 同步；`apps/product` 的 `/messages` 頁與 `components/chat/*`；`components/layout/sidebar/{desktop,mobile}.tsx` badge；`packages/shared` `StorageEnum` 新增 `ChatPinBannerDismissed`；i18n 新 `chat` namespace
- **daodao-ai-backend**：無（不讀 `chat_*` 表；若日後要做 AI 摘要再同步 ORM）
- **daodao-admin-ui**：無
- **daodao-worker**：無
