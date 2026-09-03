> 執行順序：1（storage）→ 2（server）→ 3（f2e）→ 4（收尾）。分支一律 `claude/group-messages-<待定>`（三個 repo 各開一條，同名後綴）。契約以 `design.md`「API contract 摘要」與 `specs/*/spec.md` 為準。f2e 的 `packages/api/src/types.ts` 由 server 生成物同步，禁手改；server 合入 dev 前 f2e 以 `chat-room.ts` 內的 zod schema 過渡。

## 1. DB Migration（daodao-storage）

- [ ] 1.1 `daodao-storage` — 新增 `migrate/sql/087_create_chat_tables.sql`（design.md 的 SQL）：`chat_rooms`、`chat_messages`、`chat_message_likes`、`chat_room_reads` 四表、FK／unique／index、COMMENT，末尾回填既有 lighthouse cohort 的 room；全程 `IF NOT EXISTS` + `ON CONFLICT DO NOTHING` 冪等
  - 驗收：本地 Postgres 載入全部 schema 後套用兩次皆無錯；`\d chat_messages` 顯示 partial index；`SELECT count(*) FROM chat_rooms` = lighthouse cohort 數，challenge cohort 無 room
  - 預估：2h
- [ ] 1.2 `daodao-storage` — 新增 `schema/` 四張建表檔（序號接在現有最大值後），內容與 087 一致；跑 `check_schema_sync.py` 不新增漂移；commit 依 format-commit skill
  - 驗收：pre-commit-check 通過；schema-sync-check 無新警告
  - 預估：1h

## 2. 後端（daodao-server）

- [ ] 2.1 `daodao-server` — Prisma `db pull` 或手改四個 model（`chat_rooms` ↔ `cohorts` 一對一、`chat_messages` 自參照 `reply_to`、`users` 三條具名 relation），`pnpm run prisma:generate`、`pnpm run schema:drift`；新增 `src/constants/chat.ts`（kinds、system events、content states、長度／分頁／TTL 常數）
  - 驗收：typecheck 通過；drift 檢查通過；constants 有單元測試覆蓋值域
  - 預估：1.5h
- [ ] 2.2 `daodao-server` — 新增 `src/services/chat-acl.service.ts`：`resolveRoomAccess(roomId, userId)`（D5 邏輯：lighthouse／deleted／組織 active 檢查、member／host 推導、`contentState` 只看 archived（不用 `getCohortContentState`、無 gone）、非成員 → ForbiddenError）與 `listHostUserIds(cohortId)`；`assertWritable(access)` helper
  - 驗收：單元測試：joined member、org member 無 enrollment（host）、exited、challenge cohort（404）、停權組織（404）、結束日後（writable）、+91 天（仍 writable，不回 410）、archived（read_only）
  - 預估：3h
- [ ] 2.3 `daodao-server` — 新增 `src/services/chat-room.service.ts`：`ensureRoom(tx, cohortId)`（只對 lighthouse，`ON CONFLICT DO NOTHING`）、`appendSystemMessage(cohortId, event, user)`（更新 `last_message_at`）、`listMyRooms(userId)`（enrollment ∪ org member 的 lighthouse cohort、排除 gone、`unreadCount` 子查詢、`totalUnread`、`lastMessage`、`iconLabel`／`colorSeed`、缺 room 時補建）、`getRoom`、`listMembers`（合併 presence）、`markRead`（只前進）；在 `cohort.service.create`／`duplicate` 交易內呼叫 `ensureRoom`；在 `cohort-join.service.join`（newlyJoined）、`cohort-membership.service.exit`／`remove` 後 try/catch 呼叫 `appendSystemMessage`
  - 驗收：整合測試：建 lighthouse cohort 後 room 存在、建 challenge cohort 後不存在；join 後出現系統訊息且 coach 通知既有測試維持綠；exit 後列表消失；未讀計數符合 spec（本人不計、系統訊息計、無游標全計）；`markRead` 倒退不變
  - 預估：4h
- [ ] 2.4 `daodao-server` — 新增 `src/services/chat-message.service.ts` 的讀寫核心：`listPage(before, limit)`（cursor）、`listDelta(after, since)`（messages／changed／deletedIds／pinnedCount／memberCount／serverTime）、`create(body, replyToMessageId)`（同室、非系統、writable；更新 room `last_message_at`）、`update`（本人、text、writable、`edited_at`）、`remove`（本人或 host、writable、軟刪 + 取消置頂 + touch `updated_at`）；作者 `isHost` 以 host id 集合標記；`replyTo` 含 `isDeleted`；已刪帳號 `author=null`
  - 驗收：單元／整合測試：分頁 `hasMore` 與 `nextCursor`；delta 帶到編輯、刪除；引用他室 400、引用系統訊息 400；他人編輯 403；一般成員刪他人 403、host 刪他人 204；read_only 寫入 409
  - 預估：4h
- [ ] 2.5 `daodao-server` — `chat-message.service.ts` 補 `like`／`unlike`（冪等、touch `updated_at`、系統訊息 400）、`pin`／`unpin`（host、冪等、已刪／系統 400）、`listPins`（`pinned_at desc`）、`search(q)`（ILIKE body 或 sender nickname，text 且未刪，最多 200）；新增 `src/services/chat-presence.service.ts`（`touch(roomId,userId)` SET EX 90、`getOnlineSet(roomId, userIds)` MGET，Redis 錯誤吞掉並 log）
  - 驗收：測試：重複 PUT like 計數不變；一般成員 pin 403；刪除置頂後 `listPins` 不含；search 命中作者暱稱、不含系統與已刪；presence 在 Redis mock 失敗時回空集合
  - 預估：3h
- [ ] 2.6 `daodao-server` — 新增 `src/validators/chat-room.validators.ts`（design 契約，全欄位 `.openapi()`）、`src/controllers/chat-room.controller.ts`（`asyncHandler`、`createSuccessResponse`／`createCursorPaginatedResponse`）、`src/routes/chat-room.routes.ts`（`meChatRoomRoutes` + `chatRoomRoutes`，`authenticateAny`、`validate` params/query/body、`POST messages` 加 `createLimiter`、`after` 模式呼叫 presence.touch）；`app.ts` 掛 `/api/v1/me/chat-rooms` 與 `/api/v1/chat-rooms`；`pnpm run openapi:generate` + `openapi:generate-types`
  - 驗收：supertest 打通全部 13 條路由的成功與主要錯誤碼；`openapi.json` 含 `/api/v1/me/chat-rooms` 與 `/api/v1/chat-rooms/{roomId}/messages`；`before` 與 `after` 同時帶回 400
  - 預估：4h
- [ ] 2.7 `daodao-server` — 端到端整合測試 `tests/integration/chat/`：兩位成員 + 一位 org host 的完整劇本（建期 → 加入 → 發言 → 回覆 → 按讚 → 置頂 → 編輯 → 刪除 → 搜尋 → 標讀 → 退出），驗證 spec 三份的 scenario 對應點；覆蓋 challenge cohort 全程 404
  - 驗收：`pnpm test:integration` 綠；覆蓋率報告含 chat-* services
  - 預估：4h
- [ ] 2.8 `daodao-server` — lint + typecheck + 全套測試；commit 依 format-commit skill；push 前 code-review skill
  - 驗收：CI 綠；`openapi.json` 與 `generated/openapi-types.ts` 已 commit
  - 預估：1h

## 3. 前端（daodao-f2e）

- [ ] 3.1 `daodao-f2e` — 新增 `packages/api/src/services/chat-room.ts`（zod schema 對齊契約、純函式 `sendChatMessage`／`updateChatMessage`／`deleteChatMessage`／`likeChatMessage`／`unlikeChatMessage`／`pinChatMessage`／`unpinChatMessage`／`markChatRoomRead`）與 `chat-room-hooks.ts`（`useMyChatRooms` 30s、`useChatRoom`、`useChatMembers`、`useChatMessageHistory`（`useInfinite` before）、`useChatMessageDelta`（5s、`refreshWhenHidden:false`）、`useChatPins`、`useChatSearch`），`services/index.ts` barrel；server 進 dev 後同步 `types.ts`（生成物不手改）
  - 驗收：typecheck 通過；vitest mock client 測 hooks key 與 mutation 呼叫路徑
  - 預估：3h
- [ ] 3.2 `daodao-f2e` — `apps/product/src/constants/chat.ts`（色盤、常數）與 `hooks/use-chat-timeline.ts`：把 history 頁 + delta（messages／changed／deletedIds）reduce 成單一時間軸，並推導日期分隔線（date-fns、Asia/Taipei）與同作者群組（分隔線／系統訊息打斷）
  - 驗收：vitest：新訊息 append、changed 覆寫、deletedIds 移除、跨日插分隔線、系統訊息打斷群組、去重
  - 預估：3h
- [ ] 3.3 `daodao-f2e` — `/messages/page.tsx` 改為 client 頁面 + `components/chat/chat-layout.tsx`（288px aside + 對話區）與 `room-list.tsx`：列表項（派生 icon、名稱、預覽「你：」、時間、未讀 pill、active 高亮）、列表篩選（即時、清空、無結果文案）、`useQueryState('room')` 記目前室；切換時重置所有 UI 狀態並捲到底；空狀態（尚無聊天室）
  - 驗收：瀏覽器：列表與 mock／dev 資料一致；篩選符合 spec；切換清除草稿與面板；390px 寬時列表與對話區擇一顯示
  - 預估：4h
- [ ] 3.4 `daodao-f2e` — `room-header.tsx`（44px 圖示、h2、搜尋鈕、成員鈕含 3 頭像堆疊 + 總數 + active 邊框、置頂鈕僅有置頂時顯示）與 `message-list.tsx`／`message-item.tsx`：氣泡樣式（本人／他人、76% 上限、圓角）、群組化渲染、日期 pill、系統訊息、發起人盾牌、引用區塊（2 行截斷、點擊捲動 + flash 1.6s、已刪除文案）、「・已編輯」、反應 pill；向上捲動載入更早分頁、底部黏著、新訊息到達時若在底部自動捲動
  - 驗收：瀏覽器對照 FRD 3.3–3.4 樣式；TP-MSG-010～016 手動通過；vitest 對 message-item 的角色分支渲染
  - 預估：4h
- [ ] 3.5 `daodao-f2e` — `composer.tsx`：textarea autosize（≤120px）、Enter 送出／Shift+Enter 換行、空白 disabled、提示文字、回覆模式列（teal 左線 +「回覆 {作者}」+ 預覽 + 取消、下半圓角）、編輯模式列（填入原文、取消還原空值）、兩模式互斥；送出／編輯樂觀更新（先 append／覆寫再 revalidate，失敗 toast 並回滾）
  - 驗收：TP-MSG-042～047 手動通過；vitest 鍵盤行為與模式互斥
  - 預估：4h
- [ ] 3.6 `daodao-f2e` — hover 操作列（按讚、回覆、本人編輯、本人或 host「更多」）、更多選單（依角色：置頂／已置頂 toggle、刪除）、按讚樂觀 toggle、刪除確認與樂觀移除；錯誤處理照 project-rules（`response.error` → toast → return）
  - 驗收：TP-MSG-017、018、021、022 手動通過；一般成員看不到他人的刪除／置頂
  - 預估：3h
- [ ] 3.7 `daodao-f2e` — `pin-banner.tsx`（最新置頂作者 + 單行預覽 + 收起、淺黃底、點擊開面板）、`pin-panel.tsx`（320px 右側滑出 + 遮罩、「置頂訊息 · N」、逆序、host 可取消置頂、空狀態文案）、標頭置頂鈕兩種樣式；收起狀態存 `getStorage(StorageEnum.ChatPinBannerDismissed)`（`packages/shared` 新增 key，local）並以最新置頂 id 判定是否重現
  - 驗收：TP-MSG-023～026 手動通過；重新整理後收起狀態保留；新置頂後 banner 重現
  - 預估：3h
- [ ] 3.8 `daodao-f2e` — `member-panel.tsx`（240px 右側滑出 + 遮罩、「成員 · N」、頭像 32px + 名稱 + 描述、發起人盾牌、在線綠點）；與置頂面板互斥；面板開啟時每 30 秒 revalidate 成員
  - 驗收：TP-MSG-027～029 手動通過
  - 預估：2h
- [ ] 3.9 `daodao-f2e` — `search-bar.tsx` 與搜尋狀態：展開／關閉、300ms debounce 與 Enter、`useChatSearch` 結果、「N 則結果」／「沒有符合的訊息」、上下箭頭與「第 M / N 則」、首尾 disabled、跳轉時若目標未載入則連續 `before` 載入（上限 20 頁）、關鍵字黃底 highlight 與焦點深黃、關閉清除並回底部、切換室自動關閉
  - 驗收：TP-MSG-033～041 手動通過；vitest 對 highlight 工具函式與導航索引邏輯
  - 預估：4h
- [ ] 3.10 `daodao-f2e` — 未讀整合：進入室且最新訊息可見時 `markChatRoomRead` + 樂觀更新 `useMyChatRooms` 快取（該室歸零、`totalUnread` 扣減）；delta 帶回新訊息且頁面在前景時即時標讀；`sidebar/desktop.tsx`、`mobile.tsx` 對 `badge === "unread-count"` 渲染 `totalUnread` pill（99+，0 不渲染）
  - 驗收：TP-MSG-007 手動通過；兩個分頁開同帳號，一邊標讀另一邊 30 秒內歸零；badge 0 時 DOM 無 pill
  - 預估：2h
- [ ] 3.11 `daodao-f2e` — i18n：新增 `chat` namespace（zh-TW／en）涵蓋 FRD 全部文案（placeholder、空狀態、提示、系統訊息模板 `{name} 加入了聊天室`／`離開了聊天室`、已結束資訊標籤、已封存唯讀標籤）；封存室 composer 改為提示文字並停用操作；介面不提供「離開聊天室」；已刪帳號顯示「已離開的島民」
  - 驗收：`pnpm run lint`（Biome）無未使用 key 警告；切 en 無漏翻 key
  - 預估：2h

- [ ] 3.13 `daodao-f2e` — lint + typecheck + vitest；commit 依 format-commit skill；push 前 code-review skill
  - 驗收：CI 綠
  - 預估：1h

## 4. 收尾（daodao）

- [ ] 4.1 `daodao` — 三個 repo PR 合併後：`openspec archive group-messages`、更新 `docs/product` 群組訊息功能狀態與 `scripts/product_status_manifest.yml` signals（指到 `chat-room.routes.ts` 與 `components/chat/`）；把 OQ-1～OQ-5 的最終答案回寫 design.md；若 OQ-1 改為「結束後可聊」，同步修 `resolveRoomAccess` 與 spec
  - 驗收：`product-status-check` 判定「已上線」；六份 system-map 不需更動（無新服務／呼叫關係）
  - 預估：1h
