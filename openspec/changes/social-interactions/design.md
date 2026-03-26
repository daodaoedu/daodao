## Context

DaoDao 現有社交基礎設施包含：
- `comments` 表（SQL + Prisma）：已支援多目標類型（target_type/target_id）和一層巢狀（parent_id）。SQL 已含 `mentions TEXT[]` 欄位，但 Prisma schema 尚未同步。SQL 的 `target_type CHECK` 目前限制為 `('post','resource','note','outcome','review','circle','idea','portfolio')`，需新增 `practice`。`visibility` 預設為 `public`（SQL 定義），Prisma 目前標記為 `private`（不一致，需修正）。
- `likes` 表：僅關聯 `post`，不通用
- `practice-interaction.service.ts`：`toggleLike` 有 TODO 待 reaction 表建立後實作
- `practices` 表有 `external_id UUID`（對外 ID），`practice_checkins` 亦有整數 `id`
- `users` 表有 `custom_id VARCHAR(50)` （`@username` 用途）和 `external_id UUID`
- 通知基礎設施：`practice-email.worker.ts`（BullMQ queue）已存在，需擴充事件類型
- **前端**：Next.js monorepo（`daodao-f2e`），使用 `@daodao/api`（openapi-fetch）呼叫 API、`@daodao/ui` 元件庫、`@daodao/shared` hooks
- **前端 practice 元件**：位於 `apps/product/src/components/practice/`，分 `list/`、`detail/`、`shared/`

本設計在現有 Prisma + Express + TypeScript (src/) 架構下，以**最小侵入**方式實作四個 capability。

---

## Goals / Non-Goals

**Goals:**
- 建立通用 `reactions` 表，解除 `likes` 對 `post` 的綁定限制
- 擴充 `CommentTargetType` 支援 `practice`
- 建立 `follows` 和 `connects` 表及完整 API
- 整合通知佇列（follow/connect 事件）
- 前端 Reaction Bar 元件與留言框聯動

**Non-Goals:**
- Phase 2 的「收藏 (Collection)」功能
- Phase 2 的「隱私權限橋接 (Privacy Bridge)」完整 UI（Phase 1 僅預留 API 層權限檢查介面）
- 進階隱私設定頁（僅實作 API 層的權限檢查）
- Real-time WebSocket 推送（使用既有 email/push 通知）
- 「不開放連結請求」的用戶設定（視為後續迭代）

---

## Decisions

### 1. Reactions 表設計：新增多型表，`likes` 表廢棄不再使用

**決策：** 新增 `reactions` 表；`likes` 表無資料，直接廢棄，不再擴展或 migrate。

```
reactions {
  id           Int      @id
  target_type  String   // 'practice'
  target_id    Int
  user_id      Int
  reaction_type String  // 'useful' | 'fire' | 'touched' | 'curious'
  created_at   DateTime

  @@unique([target_type, target_id, user_id])  // 每人每目標限一個反應
}
```

**理由：** `likes` 表無資料且強依賴 `post_id`，不值得改造；`reactions` 沿用 `comments` 的多型模式（target_type + target_id），保持一致性。`@@unique` 約束在 DB 層保證 upsert 語義。reaction_type 的 4 種值對齊前端 `PICKER_REACTIONS`（`reaction-picker-button.tsx`），不設計獨立的 'like' type，統一以 reaction 取代。

**替代方案：** 在 `comments` 加 `reaction_type` 欄位。**拒絕**——反應與留言是獨立操作（可只反應不留言），強行合併會讓查詢複雜化。

---

### 2. `CommentTargetType` 擴充

**決策：** 在 `src/types/comment.types.ts` 新增 `'practice'`；在 `src/services/id-converter.service.ts` 新增對應的 `EntityType` 解析邏輯。

**影響：** 現有留言 API 無需改動，目標驗證邏輯（`getTargetEntity`）需新增一個分支。

---

### 4. Follows 表設計：多型單向關係

```
follows {
  id             Int      @id
  follower_id    Int      // users.id
  followee_type  String   // 'user' | 'practice'
  followee_id    Int
  created_at     DateTime

  @@unique([follower_id, followee_type, followee_id])
}
```

**理由：** 同一用戶可關注「人」和「實踐」兩種目標，多型設計避免建兩張表，與 `reactions`/`comments` 的模式一致。

---

### 5. Connect 實作：沿用既有 `connection_requests` 表

**決策（更新）：** 不另建 `connects` 表，沿用既有 `connection_requests` 表。

**對應關係：**
- `reason` → `intent` 欄位（語義相同）
- `source = 'user_page'` → 以**互動次數門檻**取代（互動 < 3 次時 `intent` 必填）
- `source = 'practice_page'` → `context_practice_id IS NOT NULL` 隱含此語義
- 雙向唯一性 → `@@unique([requester_id, receiver_id])` + service 層查詢 `(A,B)` 和 `(B,A)`

**理由：** 既有實作以「互動熟悉度」取代「頁面來源」判斷 reason 必填性，語義更精確。重建 connects 表會造成資料遷移成本，且不帶來額外價值。

---

### 6. 通知整合：擴充既有 BullMQ Worker

**決策：** 在既有 `practice-email.worker.ts` 的事件類型中新增 `follow.user`、`follow.practice_checkin`、`follow.practice_update`、`connect.request`、`connect.accepted`、`connect.partner_checkin`、`connect.partner_update`，或建立獨立的 `social-notification.worker.ts`。

**建議：** 建立獨立 worker，避免 practice email worker 承擔過多職責。

---

### 7. @mention 儲存：使用已有 `comments.mentions TEXT[]`

**決策：** `comments.mentions TEXT[]` 欄位已存在於 SQL schema，但 Prisma schema 尚未同步。後端解析留言中的 `@custom_id` 格式，轉換為對應用戶的字串 ID 後存入此欄位。

**格式：** `mentions` 陣列存 `user_id`（INTEGER 轉為字串），前端顯示時再解析 custom_id。

**理由：** 欄位已存在，僅需同步 Prisma schema 並實作解析邏輯。

---

## Risks / Trade-offs

| 風險 | 緩解措施 |
|---|---|
| `reactions.@@unique` 在高並發下的 race condition（雙重送出） | DB unique constraint 作為最後防線；前端 debounce + 樂觀更新 |
| `connects` 查詢需雙向 OR 可能影響查詢效能 | 對 `(requester_id, status)` 和 `(receiver_id, status)` 建立複合 index |
| `CommentTargetType` 擴充 `practice` 後，舊資料的 `target_type: 'post'` 仍有效 | 不破壞現有記錄，舊邏輯繼續運作 |
| @mention 的 user_id 格式需前後端協定 | 統一使用 public user ID（hash ID）格式，透過 `id-converter` 轉換 |
| 隱私設定為 user-level，所有實踐一致套用，無法細粒度控制 | Phase 1 先以簡單模型上線，Phase 2 視需求決定是否開放 per-practice 設定 |

---

## Migration Plan

1. **SQL migration**：
   - 更新 `comments.target_type` CHECK constraint 新增 `practice`
   - 修正 Prisma schema 的 `comments.visibility` default 為 `public`（與 SQL 一致）
   - 同步 Prisma schema 加入 `comments.mentions String[]`
   - 新增 SQL init scripts：`530_create_table_reactions.sql`、`565_create_table_follows.sql`、`575_create_table_connects.sql`
2. **Prisma migration**：對應新增 `reactions`、`follows`、`connects` model；`comments` 新增 `reaction_type String?`
3. **後端 API**：依序實作 reactions → comments 擴充 → follows → connects
4. **通知 worker**：建立 `src/queues/social-notification.worker.ts`，擴充事件類型 `follow.user`、`follow.practice_checkin`、`follow.practice_update`、`connect.request`、`connect.accepted`、`connect.partner_checkin`、`connect.partner_update`、`mention`
5. **前端**：Reaction Bar 元件（`components/practice/shared/`）→ 留言框聯動 → Follow/Connect 按鈕 → 管理頁（`app/[locale]/settings/`）
6. **Rollback**：舊 `/likes` API 保持不動，新功能使用獨立 endpoints

---

## Open Questions

1. **反應聚合顯示的用戶名稱順序**：顯示「最早」還是「最新」反應的用戶名稱？（建議：最新，因更有即時感）
2. **Connect 管理頁的 URL 路徑**：整合進現有 `/me` 路由，還是獨立路徑 `/connections`？
3. **實踐隱私設定 UI**：PRD 指定為 user-level 設定（所有實踐統一），UI 入口在哪個頁面？（需與前端確認，且此為 Phase 2 範疇）
4. **@mention 的用戶範圍**：僅限「已在該留言串參與的用戶」，還是「所有平台用戶」？（FRD 指定留言區用戶清單）
