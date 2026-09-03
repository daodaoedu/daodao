# Design: 活動課程群組訊息

## Context

現況（2026-09-03 依程式碼盤點；動機見 proposal.md）：

**活動課程 = lighthouse cohort**
- 鏈：`organization → programs(kind: lighthouse|challenge) → cohorts → cohort_enrollments(status: invited|joined|exited|removed, role: owner|assistant|member)`。`organization_members(role)` 是燈塔後台的操作者，通常**沒有** enrollment。
- 建立入口：`cohort.service.create` / `duplicate`（燈塔後台）、admin-challenge（`kind='challenge'`，不在本 change 範圍）。
- 加入／退出：`cohort-join.service.join`（transaction 內 upsert enrollment + `ensureCohortDrafts`，之後對 coach 發 `COHORT_JOINED` 通知）、`cohort-membership.service.exit` / `remove`（改 status、卸實踐）。
- 學員端已有 `/api/v1/me/cohorts`、`/api/v1/cohorts/:cohortId`（memberHome）、`/cohorts/:cohortId/feed`；路由用 `authenticateAny`，**不**掛 `requireOnboardingComplete`。
- 角色：`requireCohortRole` 先看 enrollment role，查無則退回組織成員（org owner → owner、其他 org member → assistant）。
- 生命週期：`getCohortContentState(end_date)` 回 `writable | read_only | gone`（結束日後唯讀、+90 天 410），`enforceCohortContentLifecycle` 已用在 feed。
- 狀態推導：`cohort-run-state.ts` 的 `today()` 以 Asia/Taipei 日曆日計算。

**既有「今日焦點」訊息不是群組**
- `cohort_messages(cohort_id, sender_user_id, recipient_user_id, practice_id, template_id, category: encourage|celebrate, body, sent_at)`，index `(cohort_id, recipient_user_id, sent_at desc)`；`cohort_message_templates` 為組織共享範本。
- 路由 `/api/v1/lighthouse/programs/:programId/cohorts/:cohortId/participants/:userId/messages`（coach 專用，`requireOrganizationMember` gate），送出時寫 `audit_logs` 並發 `COHORT_MESSAGE` 通知。
- f2e `components/lighthouse/cohort-message-dialogs.tsx` 是它的 UI，只在燈塔後台出現。

**可能重用的機制**
- `reactions(target_type, target_id, user_id, reaction_type)`：`reaction.service` 與 `id-converter`（EntityType）、notification payload（practice/checkin/comment）深度耦合。
- `comments(target_type, target_id, parent_id, visibility)`：`CommentService` 是 class，帶 privacy／mention／challenge ACL／interaction count，且沒有 edited／deleted／pinned 欄位。
- `notification-event.service.createEvent` → BullMQ `notification-inapp.worker` 每小時批次寫 `notifications`（非即時）。
- Redis：`src/services/database/redis.service.ts` 匯出 ioredis 實例；BullMQ queues 在 `src/queues/`。server **沒有** socket.io / ws / SSE 任何用法。
- Response：`createSuccessResponse` / `createCursorPaginatedResponse`；`validate(schema, 'body'|'query'|'params')`。

**f2e**
- `apps/product/src/app/[locale]/(with-layout)/messages/page.tsx`：「即將推出」placeholder；`nav_messages` 在 `app_product` namespace。
- `components/layout/sidebar/constant.tsx` 已定義 `badge: "unread-count"`，但 `desktop.tsx` 只渲染 `breathing-dot`，`mobile.tsx` 不渲染任何 badge；通知鈴鐺的未讀數走 `useNotifications({limit:20})` 的 `unreadCount` 欄位、30 秒 `refreshInterval`。
- `packages/api/src/services/` 沒有 message／chat service；hooks 工廠有 `useQuery` / `useInfinite` / `useMutate`；`cohort-hooks.ts` 的 `useValidatedResponse` 是「types.ts 尚未同步時先用 zod 驗證」的過渡慣例。
- cohorts / programs **沒有** icon、cover 欄位（FRD FR-MSG-003 要的圖示需前端派生）。

**storage**
- 本機沒有 daodao-storage clone；由 `schema.prisma` 推斷現況。最新 migration 為 `086_add_cohort_visibility.sql`，本 change 用 `087`。migration 慣例：`DO $$ ... IF NOT EXISTS` 冪等、`COMMENT ON`、FK 具名 `fk_<table>_<col>`、unique 具名 `uq_`、index 具名 `idx_`。

## Goals / Non-Goals

**Goals**
- 讓 lighthouse cohort 的成員（含帶領人）在產品站 `/messages` 進行群組對話，涵蓋 FRD 3.1–3.10 全部 FR。
- 成員與權限與既有 cohort 機制**同源**，不引入第二套會漂移的成員名單。
- API 形狀可在不改 client 資料模型的前提下升級到 SSE。

**Non-Goals（設計層，proposal 之外）**
- 不做全文檢索索引（pg_trgm / tsvector）；先 ILIKE，量大再加。
- 不做訊息保留／清理 job；跟隨 cohort 90 天 `gone` 規則自然下線。
- 不把今日焦點訊息（`cohort_messages`）投影進群組時間軸。

## Decisions

### D1：資料模型 — 另開 `chat_*` 四張表，不共用 `cohort_messages`

**決策**：

| 表 | 用途 | 關鍵欄位 |
|---|---|---|
| `chat_rooms` | 與 cohort 一對一的聊天室 | `cohort_id UNIQUE`、`last_message_at`（列表排序快取） |
| `chat_messages` | 訊息（含系統訊息） | `room_id`、`sender_user_id NULL`（系統訊息／已刪帳號）、`kind: text\|system`、`body`、`metadata JSONB`、`reply_to_message_id`、`pinned_at`/`pinned_by_user_id`、`edited_at`、`deleted_at`/`deleted_by_user_id`、`created_at` |
| `chat_message_likes` | 按讚（單一 heart） | `(message_id, user_id)` unique |
| `chat_room_reads` | 每人每室已讀游標 + 最近開啟時間 | `(room_id, user_id)` unique、`last_read_message_id`、`last_read_at` |

- **不建成員表**（見 D5：成員由 enrollment ∪ organization_members 推導）。
- **引用回覆**用 `reply_to_message_id` 自參照 FK（`ON DELETE SET NULL` 只在硬刪時觸發；本設計軟刪，FK 保留，讀取時判斷 `deleted_at`）。
- **置頂**用 `pinned_at` / `pinned_by_user_id` 欄位 + partial index，不另開表：一則訊息最多被置頂一次，「逆序列出」= `ORDER BY pinned_at DESC`。
- **系統訊息**：`kind='system'`、`sender_user_id NULL`、`metadata = { event: 'member_joined' | 'member_left', userId, nickname }`，`body` 存 zh-TW 後備文字；前端優先用 `metadata` 做 i18n。
- **日期分隔線與同作者群組**是前端由 `createdAt`（Asia/Taipei 日曆日）推導，不存資料。
- **置頂 banner 收起**是 per-viewer UI 狀態：前端以 `getStorage(StorageEnum.ChatPinBannerDismissed)` 記 `{ [roomId]: lastSeenPinnedMessageId }`，最新置頂 id 變了就重新顯示（FR-MSG-019）。

**理由**：`cohort_messages` 的語意是「帶領人對某位參與者、針對某個實踐、可套範本」的私訊，有 `recipient_user_id`、`practice_id`、`template_id`、`category`，且送出時寫審計並發通知；群組訊息是多對多公開時間軸，需要 edited／deleted／pinned／reply。硬塞會讓既有 index `(cohort_id, recipient_user_id, sent_at)` 失效、`category` 變 nullable、今日焦點的「訊息紀錄 modal」必須過濾掉群組訊息。兩者唯一交集是「同一個 cohort」，用 `cohort_id` 就夠。

**捨棄的替代方案**：
- *擴充 `cohort_messages` 加 `recipient_user_id NULL = 群組`*：見上；且 `sent_at` 命名與軟刪／編輯欄位不搭。
- *重用 `reactions` 表（`target_type='chat_message'`）*：`reaction.service` 會查 `id-converter` 的 EntityType 與 practice/checkin/comment 通知 payload，加新 target 要改 `EntityType`、`getTargetEntity`、f2e `ReactionType` 常數，並且 `target_id` 沒有 FK，刪訊息會留孤兒。FRD 只需要 heart toggle，`chat_message_likes` 一張兩欄表 + FK cascade 更小。
- *重用 `comments` 表*：缺 edited／deleted／pinned，`CommentService` 綁 privacy／mention／interaction_counts／notification，留言會混進 feed 與通知；不重用。
- *成員表 `chat_room_members` + 事件同步*：需要在 join／exit／remove／org member 新增／移除五處同步，漏一處就漂移；改為推導（D5）。
- *`chat_message_pins` 獨立表*：只為 pinned_at 一欄多一張表，捨棄。

### D2：聊天室建立時機 — cohort 建立時同交易建立 + 冪等 `ensure` 後備 + 一次性回填

**決策**：
1. `cohort.service.create` / `duplicate` 在 transaction 內呼叫 `chatRoomService.ensureRoom(tx, cohortId)`；只有 `programs.kind='lighthouse'` 才建（`assertProgram` 已查到 program，順便取 `kind`）。admin-challenge 建 cohort **不**呼叫。
2. `ensureRoom` = `INSERT INTO chat_rooms(cohort_id) ... ON CONFLICT (cohort_id) DO NOTHING RETURNING id`，再 `SELECT`；在 `GET /me/chat-rooms` 列表與 `resolveRoomAccess` 也會對缺 room 的 lighthouse cohort 補建（防止 migration 回填與程式上線之間的縫隙）。
3. migration 087 回填：`INSERT INTO chat_rooms(cohort_id) SELECT c.id FROM cohorts c JOIN programs p ON p.id=c.program_id WHERE p.kind='lighthouse' ON CONFLICT DO NOTHING`。
4. 成員變動不需同步（D5），但在 `cohort-join.service.join`（`newlyJoined=true` 分支）、`cohort-membership.service.exit` / `remove` 後寫一則 `kind='system'` 訊息並更新 `last_message_at`。這是 best-effort 副作用：包在 try/catch、失敗只 log，不能讓加入／退出失敗。
5. `kind='challenge'` 的 cohort 在所有入口都被擋：`ensureRoom` 回 `null`、列表 where `program.kind='lighthouse'`、`resolveRoomAccess` 對 challenge room 拋 `NotFoundError`（TP-MSG-004、TP-MSG-005）。

**理由**：FRD FR-MSG-001 要「建立時自動建立」；同交易建立最符合語意也最好測。但既有 cohort 已存在、且 DB 回填與部署有時間差，所以要 `ensure` 後備。草稿（`status='draft'`）cohort 也會有 room，但列表只對成員顯示，草稿期只有組織成員看得到，可接受。

**捨棄**：*純 lazy（首次有人開啟才建）*——列表需要 room id 與 `last_message_at`，lazy 會讓列表查詢變成「先建再查」，且 TP-MSG-001 難驗證。*DB trigger 建 room*——本專案沒有 trigger 慣例，邏輯散進 DB 不利測試。

### D3：即時性 — 本輪增量輪詢，保留 SSE 升級路徑；在線狀態用 Redis TTL

**比較**：

| 方案 | 成本 | 問題 |
|---|---|---|
| **輪詢**（選用） | 零基礎設施；SWR `refreshInterval` 現成（通知已用 30 秒） | 延遲 ≤ 5 秒；每個開啟中的 client 每 5 秒一個輕量 GET |
| SSE | Express 可寫，但需 Nginx 關 buffering、每連線佔一個 Node 連線、多實例時需 Redis pub/sub fan-out；server 目前零 streaming 程式碼 | 多一種連線生命週期要管；本輪工時不允許 |
| WebSocket（socket.io） | 新依賴、sticky session 或 redis adapter、auth 握手要另寫、Nginx upgrade 設定 | 最重；cohort 規模（每室數十人）用不到雙向 |

**決策**：
- 開啟中的聊天室：`GET /chat-rooms/:roomId/messages?after=<最新已載入 id>&limit=100`，SWR `refreshInterval: 5000`、`revalidateOnFocus`；分頁鍵獨立於歷史 `before` 分頁，回來的訊息 append 到本地快取。同一端點也回 `pinnedCount` 與 `memberCount` 摘要，前端據此決定要不要 revalidate 置頂／成員面板。
- 列表與未讀：`GET /me/chat-rooms` `refreshInterval: 30000`（與通知一致），sidebar badge 與列表 badge 共用同一份 SWR 快取。
- 編輯／刪除／按讚／置頂變更如何反映到其他人：`after` 只能帶新訊息，所以同一請求再帶 `since=<上次 serverTime>`，server 額外回 `changed`（`updated_at > since` 且未刪除的既有訊息）與 `deletedIds`（`deleted_at > since`）。因此 `chat_messages` 需要 `updated_at`，且編輯、刪除、置頂／取消置頂、按讚／取消按讚都會 touch 它（cohort 規模的寫入量可忽略；若不夠見 Risks）。
- **升級路徑**：未來 `GET /chat-rooms/:roomId/events`（SSE）推送的 payload 就是 `{ messages: [...new], changed: [...] }`，與輪詢回應同型；server 端在 `chat-message.service` 每次寫入後 `redis.publish('chat:room:<id>', ...)` 的 hook 位置本輪就預留（先不啟用）。client 只需把 `refreshInterval` 換成 EventSource 訂閱，資料 reducer 不變。
- **在線狀態（FR-MSG-022）**：每次 `GET messages?after=`（即開啟中的聊天室輪詢）在 Redis 寫 `SET chat:presence:<roomId>:<userId> 1 EX 90`；`GET /chat-rooms/:roomId/members` 對成員 id 做 `MGET` 回 `isOnline`。語意明講為「90 秒內有開啟此聊天室」，不是全站在線。Redis 不可用時 `isOnline` 全 false，不拋錯。

**捨棄**：*在 `chat_room_reads.last_read_at` 上做 presence*——每 5 秒一次 DB 寫入不划算，且語意混淆。*完全不做在線*——FRD 有明列且 Redis 方案便宜，先做。

### D4：未讀數 — 已讀游標 + 列表端點聚合，明講邊界

**決策**：
- `chat_room_reads(room_id, user_id, last_read_message_id, last_read_at)`；`PUT /chat-rooms/:roomId/read { lastReadMessageId }` 只允許前進（`GREATEST`），沒有列就 insert。
- 未讀定義：`chat_messages WHERE room_id=? AND id > COALESCE(last_read_message_id, 0) AND deleted_at IS NULL AND (sender_user_id IS NULL OR sender_user_id <> me)`。系統訊息計入（讓「有人加入」也會亮 badge），自己的訊息不計。
- `GET /me/chat-rooms` 一次回 `items[].unreadCount` 與 `totalUnread`（比照通知列表的 `unreadCount`），單一 SQL 用 `LEFT JOIN chat_room_reads` + 相關子查詢計數；每人房間數 < 10，無效能疑慮。
- 前端：進入聊天室且最新訊息在視窗內時呼叫 `PUT read`，並樂觀把該室 `unreadCount` 歸零、`totalUnread` 扣掉（FR-MSG-004、TP-MSG-007）；輪詢到新訊息且頁面在前景也立即標讀。
- 顯示上限 `99+`。

**邊界（對齊 FRD 2.2「後端同步機制不涵蓋」）**：
- 沒有推播、email、瀏覽器通知；未讀只在使用者開著產品站時最多延遲 30 秒更新。
- 不寫 `notification_events` / `notifications`，通知中心不會出現群組訊息。
- 跨裝置只有游標同步（同帳號另一裝置標讀後，這裝置下次輪詢會歸零），沒有逐則已讀回條。
- `chat_room_reads` 沒有列 = 全部未讀；回填後的舊 cohort 沒有歷史訊息所以不會爆量。

### D5：權限 — 成員與 host 由 cohort 現有資料推導；結束後唯讀（待確認）

**決策**（新 `chat-acl.service.ts` 的 `resolveRoomAccess(roomId, userId)`）：

```
cohort = room.cohort（含 program.kind、program.deleted_at、organization.status、end_date、status）
if program.kind !== 'lighthouse' || program.deleted_at || organization.status !== 'active' → NotFound
enrollment = cohort_enrollments(cohort_id, user_id, status='joined')
orgRole    = organization_members(organization_id, user_id).role
isMember   = enrollment != null || orgRole != null
isHost     = enrollment.role ∈ {owner, assistant} || orgRole != null
contentState = cohort.status === 'archived' ? 'read_only' : getCohortContentState(cohort.end_date)
```

- 非成員 → 403（不是 404，避免區分「不存在」與「無權」的資訊洩漏爭議留給 OQ）。
- `contentState='gone'` → 所有端點 410；`read_only` → 寫入端點（送出、編輯、刪除、按讚、置頂、已讀游標除外）409「本期已結束，聊天室目前為唯讀」；讀取照常。列表仍列出唯讀室（顯示「已結束」標籤），`gone` 的不列。
- 權限矩陣（FR-MSG-033）落在 service：編輯僅本人；刪除本人或 host；置頂／取消置頂僅 host；其餘成員皆可。系統訊息不可編輯／按讚／回覆／置頂，host 可刪。
- 訊息的 `author.isHost` 每次列表計算：先取該室 host user id 集合（enrollment owner/assistant ∪ org members），再標記。

**理由**：與 `requireCohortRole` 一致，讓「被移除即刻看不到」自動成立，不需要成員同步；組織成員即使沒 enrollment 也能進聊天室，符合「發起人自動成為 host」（FR-MSG-002、TP-MSG-003）。

**FRD 依據**：TP-MSG-050「已結束的活動課程仍可查看歷史訊息」——FRD 只保證可讀，未提是否可再發言。本設計取唯讀：結束日後唯讀、封存亦唯讀、+90 天下線（後兩項是沿用既有 `getCohortContentState` 的推論，FRD 未寫）。若產品希望結束後仍可聊，把 `contentState` 判斷改成只擋 `archived` 即可，spec 與 task 不變。

**捨棄**：*只認 enrollment*——組織成員多半沒 enrollment，host 會進不去。*只認 organization 成員為 host*——挑戰／未來的個人建活動會用 enrollment role owner；兩者都認才前後相容。

### D6：搜尋與分頁 — 列表篩選在前端，室內搜尋走 server ILIKE，歷史用 id cursor

**決策**：
- 聊天室列表篩選（FR-MSG-023）：列表已全量載入，前端以名稱 `includes`（大小寫不敏感）即時過濾。
- 歷史訊息：`GET messages?before=<id>&limit=50`（預設 50、上限 100），回 `createCursorPaginatedResponse`，`nextCursor` = 本頁最舊 id、`hasMore`。首次載入不帶 `before` 取最新 50 則後捲到底。
- 室內搜尋（FR-MSG-025）：`GET /chat-rooms/:roomId/messages/search?q=<1..100 字>` → `{ total, items: [{ id, createdAt }] }`（最多 200 筆，新到舊），SQL：`kind='text' AND deleted_at IS NULL AND (body ILIKE '%q%' OR sender.nickname ILIKE '%q%')`。前端拿到 id 清單後：目標已在本地 → 平滑捲動 + flash；不在 → 連續 `before` 分頁直到 `id <= 目標`（上限 20 頁，超過顯示「請往上捲動載入更多」），再捲動。關鍵字 highlight 由前端對已載入訊息做（FR-MSG-027）。
- 300ms debounce 與 Enter 觸發、「第 M / N 則」、首尾 disabled 皆前端狀態。

**理由**：cohort 規模的訊息量 ILIKE 綽綽有餘，且不需要 extension；純前端搜尋只能搜已載入的分頁，會漏。id cursor 比 `created_at` cursor 穩（同秒多則、時鐘偏移）。

**捨棄**：*`?around=<id>` 上下文端點*——省一個端點，用 `before` 迴圈；若實測跳轉太慢再加。*pg_trgm / tsvector*——留待量大。

### D7：編輯／刪除 — 軟刪除，引用區塊顯示「已刪除」，置頂連動取消

**決策**：
- 刪除：`deleted_at = now(), deleted_by_user_id = actor, pinned_at = NULL, pinned_by_user_id = NULL, updated_at = now()`，同一 UPDATE。`chat_message_likes` 保留（無害），不回傳。
- 時間軸列表 `WHERE deleted_at IS NULL`；但 `after` 輪詢的 `changed` 會帶 `{ id, deletedAt }` 讓其他人的畫面移除。
- 引用：訊息回應含 `replyTo: { id, authorName, bodyPreview, isDeleted }`；被引用者已刪 → `isDeleted=true, bodyPreview=null`，前端顯示「此訊息已刪除」、點擊不捲動（TP-MSG-049）。
- 編輯：僅本人、僅 `kind='text'`、僅 `contentState='writable'`；`body` 覆寫、`edited_at=now()`；不保留歷史版本。
- 已刪帳號：`sender_user_id` FK `ON DELETE SET NULL`，回應 `author=null`，前端顯示「已離開的島民」。

**理由**：軟刪除保住引用鏈與 host 審核脈絡；不留版本歷史是因為 FRD 沒要求且 cohort 聊天不是稽核場景。

### D8：API contract 與掛載位置

- 列表掛 `/api/v1/me/chat-rooms`（比照 `/api/v1/me/future-letters`、`/api/v1/me/timeline` 獨立 router 掛在 `me` 之下），室內操作掛 `/api/v1/chat-rooms/:roomId/*`；兩者皆 `authenticateAny`、**不**掛 `requireOnboardingComplete`（與 `/api/v1/cohorts/*` 一致，受邀學員可能尚未完成 onboarding）。
- `roomId` 是 `chat_rooms.id`（不是 cohortId）：讓 cohort 與聊天室解耦，之後若要「一 cohort 多頻道」不必改路徑。列表與 `GET /api/v1/cohorts/:cohortId`（memberHome）都回 `chatRoomId` 讓 cohort 頁能放入口——後者列為 optional task。
- 聊天室圖示：回應帶 `iconLabel`（名稱首字）與 `colorSeed`（roomId），前端用固定色盤 `palette[colorSeed % n]`；不加 DB 欄位。
- 所有端點 `registry.registerPath`、Zod `.openapi()`、成功用 `createSuccessResponse` / `createCursorPaginatedResponse`、錯誤拋 `AppError` 子類。送訊息端點加 `createLimiter`（既有 rate limiter）。

## API contract 摘要（供 f2e types 同步）

```ts
// src/constants/chat.ts
CHAT_MESSAGE_KINDS = { TEXT: 'text', SYSTEM: 'system' }
CHAT_SYSTEM_EVENTS = { MEMBER_JOINED: 'member_joined', MEMBER_LEFT: 'member_left' }
CHAT_ROOM_CONTENT_STATES = { WRITABLE: 'writable', READ_ONLY: 'read_only' }   // gone 直接 410
CHAT_MESSAGE_MAX_LENGTH = 2000, CHAT_PAGE_DEFAULT = 50, CHAT_PAGE_MAX = 100, CHAT_SEARCH_MAX = 200, CHAT_PRESENCE_TTL_SEC = 90

// chat-room.validators.ts
chatAuthorSchema = { userId, nickname: string|null, avatar: string|null, isHost: boolean }
chatReplyToSchema = { id, authorName: string|null, bodyPreview: string|null, isDeleted: boolean }
chatMessageSchema = {
  id, roomId, kind: 'text'|'system', body, metadata: { event, userId, nickname } | null,
  author: chatAuthorSchema | null, replyTo: chatReplyToSchema | null,
  likeCount: number, likedByMe: boolean, isPinned: boolean, pinnedAt: string|null,
  editedAt: string|null, createdAt: string, updatedAt: string
}
chatRoomSummarySchema = {
  id, cohortId, name, iconLabel, colorSeed, organizationName,
  contentState: 'writable'|'read_only', memberCount, unreadCount,
  lastMessage: { id, kind, bodyPreview, authorName: string|null, isMine: boolean, createdAt } | null,
  lastActivityAt: string
}
chatRoomListResponseSchema = { totalUnread: number, items: chatRoomSummarySchema[] }
chatRoomDetailSchema = chatRoomSummarySchema & { viewerRole: 'host'|'member', pinnedCount, memberPreview: { nickname, avatar }[] /* 前 3 位 */ }
chatMemberSchema = { userId, nickname, avatar, isHost, isOnline, bio: string|null }
chatMessagePageSchema = CursorPaginated<chatMessageSchema>              // GET messages?before=
chatMessageDeltaSchema = { messages: chatMessageSchema[], changed: chatMessageSchema[], deletedIds: number[], pinnedCount, memberCount, serverTime }  // GET messages?after=&since=
chatSearchResponseSchema = { total, items: { id, createdAt }[] }
createChatMessageSchema = { body: z.string().trim().min(1).max(2000), replyToMessageId: z.number().int().positive().optional() }
updateChatMessageSchema = { body: z.string().trim().min(1).max(2000) }
markChatRoomReadSchema  = { lastReadMessageId: z.number().int().positive() }
chatMessagesQuerySchema = { before?: id, after?: id, since?: ISO string, limit?: 1..100 }   // before 與 after 互斥
chatSearchQuerySchema   = { q: z.string().trim().min(1).max(100) }
```

| Method | Path | Auth／守衛 | 回應 |
|---|---|---|---|
| GET | `/api/v1/me/chat-rooms` | authenticateAny | `chatRoomListResponseSchema` |
| GET | `/api/v1/chat-rooms/{roomId}` | member | `chatRoomDetailSchema` |
| GET | `/api/v1/chat-rooms/{roomId}/members` | member | `chatMemberSchema[]` |
| GET | `/api/v1/chat-rooms/{roomId}/messages` | member（`after` 模式順便寫 presence） | page 或 delta |
| POST | `/api/v1/chat-rooms/{roomId}/messages` | member + writable + createLimiter | `chatMessageSchema`（201） |
| PATCH | `/api/v1/chat-rooms/{roomId}/messages/{messageId}` | 本人 + writable | `chatMessageSchema` |
| DELETE | `/api/v1/chat-rooms/{roomId}/messages/{messageId}` | 本人或 host + writable | 204 |
| PUT / DELETE | `/api/v1/chat-rooms/{roomId}/messages/{messageId}/like` | member + writable | `{ likeCount, likedByMe }` |
| PUT / DELETE | `/api/v1/chat-rooms/{roomId}/messages/{messageId}/pin` | host + writable | `chatMessageSchema` |
| GET | `/api/v1/chat-rooms/{roomId}/pins` | member | `chatMessageSchema[]`（`pinnedAt desc`） |
| GET | `/api/v1/chat-rooms/{roomId}/messages/search?q=` | member | `chatSearchResponseSchema` |
| PUT | `/api/v1/chat-rooms/{roomId}/read` | member（read_only 亦可） | `{ lastReadMessageId, unreadCount: 0 }` |

錯誤碼：非成員 403；room 不存在／challenge／組織停權 404；`gone` 410；唯讀寫入 409；引用不同室訊息或引用系統訊息 400；編輯他人 403；重複置頂／按讚冪等回 200。

## 各子專案實作方式

**daodao-storage**：`migrate/sql/087_create_chat_tables.sql`（下節）＋新增 `schema/4NN_create_table_chat_rooms.sql` 等四檔（序號依 storage 現況遞增）；`check_schema_sync.py` 不新增漂移。

**daodao-server**：
- `src/constants/chat.ts`；`src/services/chat-acl.service.ts`（`resolveRoomAccess`、`listHostUserIds`）、`chat-room.service.ts`（`ensureRoom(tx?)`、`listMyRooms`、`getRoom`、`listMembers`、`markRead`、`appendSystemMessage`）、`chat-message.service.ts`（`listPage`、`listDelta`、`create`、`update`、`remove`、`like`/`unlike`、`pin`/`unpin`、`listPins`、`search`）、`chat-presence.service.ts`（`touch`、`getOnlineSet`，Redis 失敗吞掉並 log）。
- `src/validators/chat-room.validators.ts`、`src/controllers/chat-room.controller.ts`、`src/routes/chat-room.routes.ts`（兩個 router：`meChatRoomRoutes`、`chatRoomRoutes`），`app.ts` 掛載並加進 `routes[]`。
- hooks：`cohort.service.create`/`duplicate` 呼叫 `ensureRoom(tx, id, kind)`；`cohort-join.service.join` 在 `newlyJoined` 分支、`cohort-membership.service.exit`/`remove` 在 transaction 後呼叫 `appendSystemMessage`（try/catch）。
- 測試：`tests/unit/services/chat-*.test.ts`、`tests/integration/chat/chat-room.routes.test.ts`（supertest）。

**daodao-f2e**：
- `packages/api/src/services/chat-room.ts`（純函式 + zod schema，過渡期沿用 `useValidatedResponse` 慣例）與 `chat-room-hooks.ts`（`useMyChatRooms`（30s）、`useChatRoom`、`useChatMembers`、`useChatMessageHistory`（`useInfinite`, `before`）、`useChatMessageDelta`（5s, `after`+`since`）、`useChatPins`、`useChatSearch`；mutations `sendChatMessage`…），`services/index.ts` barrel。
- `apps/product/src/components/chat/`：`chat-layout.tsx`（288px aside + 對話區）、`room-list.tsx`、`room-header.tsx`、`message-list.tsx`（群組化、日期分隔、flash 高亮、捲動控制）、`message-item.tsx`（氣泡、引用、hover action bar、更多選單、反應 pill）、`composer.tsx`（回覆／編輯模式、Enter/Shift+Enter、120px autosize）、`pin-banner.tsx`、`pin-panel.tsx`、`member-panel.tsx`、`search-bar.tsx`；`hooks/use-chat-timeline.ts`（把 history + delta reducer 成單一時間軸）、`constants/chat.ts`（色盤、常數）。
- `/messages/page.tsx` 改為 client 元件，`useQueryState('room')` 記目前聊天室；切換時重置 composer／面板／搜尋（FR-MSG-005、TP-MSG-008）。
- sidebar：`desktop.tsx` / `mobile.tsx` 對 `badge === "unread-count"` 渲染 `useMyChatRooms().data.totalUnread` 的 pill（99+）。
- `packages/shared` `StorageEnum.ChatPinBannerDismissed`（local）；i18n 新 `chat` namespace（zh-TW / en）。
- 測試：vitest 對 `use-chat-timeline` reducer（群組化、分隔線、changed/deleted 合併）、`room-list` 篩選、`composer` 鍵盤行為。

**daodao-ai-backend / admin-ui / worker**：無。

## Migration SQL（daodao-storage `migrate/sql/087_create_chat_tables.sql`）

```sql
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_rooms') THEN
        CREATE TABLE "chat_rooms" (
            "id"              SERIAL PRIMARY KEY,
            "cohort_id"       INTEGER NOT NULL,
            "last_message_at" TIMESTAMPTZ,
            "created_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
            "updated_at"      TIMESTAMPTZ,
            CONSTRAINT "fk_chat_rooms_cohort" FOREIGN KEY ("cohort_id") REFERENCES "cohorts"("id") ON DELETE CASCADE,
            CONSTRAINT "uq_chat_rooms_cohort" UNIQUE ("cohort_id")
        );
        COMMENT ON TABLE "chat_rooms" IS '活動課程群組聊天室；與 cohort 一對一，僅 programs.kind=lighthouse 建立';
        CREATE INDEX "idx_chat_rooms_last_message_at" ON "chat_rooms" ("last_message_at" DESC);
        RAISE NOTICE '已建立 chat_rooms';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_messages') THEN
        CREATE TABLE "chat_messages" (
            "id"                  SERIAL PRIMARY KEY,
            "room_id"             INTEGER NOT NULL,
            "sender_user_id"      INTEGER,
            "kind"                VARCHAR(20) NOT NULL DEFAULT 'text',
            "body"                TEXT NOT NULL,
            "metadata"            JSONB,
            "reply_to_message_id" INTEGER,
            "pinned_at"           TIMESTAMPTZ,
            "pinned_by_user_id"   INTEGER,
            "edited_at"           TIMESTAMPTZ,
            "deleted_at"          TIMESTAMPTZ,
            "deleted_by_user_id"  INTEGER,
            "created_at"          TIMESTAMPTZ NOT NULL DEFAULT now(),
            "updated_at"          TIMESTAMPTZ NOT NULL DEFAULT now(),
            CONSTRAINT "fk_chat_messages_room"       FOREIGN KEY ("room_id") REFERENCES "chat_rooms"("id") ON DELETE CASCADE,
            CONSTRAINT "fk_chat_messages_sender"     FOREIGN KEY ("sender_user_id") REFERENCES "users"("id") ON DELETE SET NULL,
            CONSTRAINT "fk_chat_messages_reply_to"   FOREIGN KEY ("reply_to_message_id") REFERENCES "chat_messages"("id") ON DELETE SET NULL,
            CONSTRAINT "fk_chat_messages_pinned_by"  FOREIGN KEY ("pinned_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL,
            CONSTRAINT "fk_chat_messages_deleted_by" FOREIGN KEY ("deleted_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL
        );
        COMMENT ON COLUMN "chat_messages"."kind" IS 'text | system；值域由 daodao-server 常量管控';
        COMMENT ON COLUMN "chat_messages"."metadata" IS '系統訊息事件：{ event: member_joined|member_left, userId, nickname }';
        COMMENT ON COLUMN "chat_messages"."updated_at" IS '任何可見變動（編輯、刪除、置頂、按讚計數）都會更新，供增量輪詢 since 使用';
        CREATE INDEX "idx_chat_messages_room_id_id"    ON "chat_messages" ("room_id", "id");
        CREATE INDEX "idx_chat_messages_room_updated"  ON "chat_messages" ("room_id", "updated_at");
        CREATE INDEX "idx_chat_messages_room_pinned"   ON "chat_messages" ("room_id", "pinned_at" DESC) WHERE "pinned_at" IS NOT NULL AND "deleted_at" IS NULL;
        CREATE INDEX "idx_chat_messages_reply_to"      ON "chat_messages" ("reply_to_message_id") WHERE "reply_to_message_id" IS NOT NULL;
        RAISE NOTICE '已建立 chat_messages';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_message_likes') THEN
        CREATE TABLE "chat_message_likes" (
            "id"         SERIAL PRIMARY KEY,
            "message_id" INTEGER NOT NULL,
            "user_id"    INTEGER NOT NULL,
            "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
            CONSTRAINT "fk_chat_message_likes_message" FOREIGN KEY ("message_id") REFERENCES "chat_messages"("id") ON DELETE CASCADE,
            CONSTRAINT "fk_chat_message_likes_user"    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
            CONSTRAINT "uq_chat_message_likes_message_user" UNIQUE ("message_id", "user_id")
        );
        CREATE INDEX "idx_chat_message_likes_user" ON "chat_message_likes" ("user_id");
        RAISE NOTICE '已建立 chat_message_likes';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_room_reads') THEN
        CREATE TABLE "chat_room_reads" (
            "id"                   SERIAL PRIMARY KEY,
            "room_id"              INTEGER NOT NULL,
            "user_id"              INTEGER NOT NULL,
            "last_read_message_id" INTEGER,
            "last_read_at"         TIMESTAMPTZ NOT NULL DEFAULT now(),
            CONSTRAINT "fk_chat_room_reads_room" FOREIGN KEY ("room_id") REFERENCES "chat_rooms"("id") ON DELETE CASCADE,
            CONSTRAINT "fk_chat_room_reads_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
            CONSTRAINT "uq_chat_room_reads_room_user" UNIQUE ("room_id", "user_id")
        );
        COMMENT ON TABLE "chat_room_reads" IS '每人每室的已讀游標；未讀 = id > last_read_message_id 且非本人、未刪除的訊息數';
        CREATE INDEX "idx_chat_room_reads_user" ON "chat_room_reads" ("user_id");
        RAISE NOTICE '已建立 chat_room_reads';
    END IF;

    -- 回填：既有 lighthouse cohort 各建一間聊天室（冪等）
    INSERT INTO "chat_rooms" ("cohort_id")
    SELECT c."id" FROM "cohorts" c JOIN "programs" p ON p."id" = c."program_id"
    WHERE p."kind" = 'lighthouse'
    ON CONFLICT ("cohort_id") DO NOTHING;
END $$;
```

同步新增 `schema/` 對應建表檔（四張表各一檔，欄位、註解、index 與上述一致）。

## Risks / Trade-offs

- [輪詢負載：N 個開啟中的 client × 每 5 秒一次] → `after` 查詢命中 `(room_id, id)` index、無新訊息時回空陣列 ≤ 1KB；頁面 hidden 時 SWR 暫停（`refreshWhenHidden: false`）；上線後觀察 `/chat-rooms/*/messages` QPS，超過門檻再啟用 SSE 路徑。
- [Redis presence 與 DB 狀態不一致（Redis 重啟）] → presence 只是 UI 綠點，最多 90 秒內錯；服務降級為全部離線，不影響功能。
- [組織成員與 enrollment 同時存在且 role 不同] → `isHost` 取聯集為真；與 `requireCohortRole` 行為一致。
- [`updated_at` 被按讚頻繁 touch 導致 `changed` 回傳量大] → cohort 規模可忽略；若不夠，把按讚計數改成前端對可視訊息批次 `GET ?ids=` 刷新（contract 預留 `changed` 欄位不變）。
- [系統訊息 hook 失敗導致加入／退出失敗] → hook 在 transaction 之後、try/catch 只 log；系統訊息缺一則不影響資料一致性。
- [migration 回填與 server 部署時間差] → `ensureRoom` 在列表與存取時補建；順序仍應 storage → server。
- [ILIKE 搜尋在大房間變慢] → 單室訊息量以千計時仍在毫秒級；超過再加 `pg_trgm` GIN index，不改 contract。
- [f2e `types.ts` 需等 server 合入 dev 才同步] → f2e 先以 `chat-room.ts` 內的 zod schema 驗證（`useValidatedResponse` 慣例），types 同步後刪除擴充。
- [唯讀規則與產品期待不符（TP-MSG-050 只保證可讀）] → 集中在 `resolveRoomAccess` 一處，改判斷即可，見 D5「待確認」。

## Migration Plan

1. storage：套 087（dev → prod 由 CD 自動）；回滾 = `DROP TABLE chat_room_reads, chat_message_likes, chat_messages, chat_rooms`（無其他表依賴）。
2. server：部署後 `ensureRoom` 自動補漏；功能未上 f2e 前端點只是閒置。
3. f2e：`/messages` 頁替換 placeholder；sidebar badge 在 `totalUnread=0` 時不渲染，對既有使用者無感。
4. 回滾順序反過來：先 f2e 回 placeholder，再 server，再（可選）drop 表。

## Open Questions

- OQ-1（預設：唯讀）：活動課程結束後是否仍可發言？FRD TP-MSG-050 只寫「仍可查看歷史訊息」。本設計結束日後唯讀、封存唯讀、+90 天下線；後兩項 FRD 未提。
- OQ-2（預設：計入；FRD 未提）：系統訊息（成員加入／離開）是否計入未讀數？本設計計入，讓「有人加入」會亮 badge。
- OQ-3（預設：403；FRD 未提）：非成員存取聊天室回 403 還是 404？本設計 403（room 存在但無權）；challenge／停權組織 404。
- OQ-4（預設：不做；FRD 僅定義 sidebar「訊息」入口）：cohort 學員頁 `/cohorts/[cohortId]` 是否加「進入聊天室」入口（memberHome 回 `chatRoomId`）？列為 optional task 3.12。
- OQ-5（預設：不需要）：是否需要 host 可「關閉聊天室」開關？FRD 未提，本輪不做；若需要加 `chat_rooms.closed_at` 即可。
