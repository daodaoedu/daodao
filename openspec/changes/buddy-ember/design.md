## Context

daodao 已完成 Buddy 的後端骨架（buddy_requests CRUD、BuddyRequest / BuddyAccepted 通知、前端通知頁接受/忽略）。
本次 change 在此基礎上補完：配對推薦、陪伴互動（聚合通知 / 守望相助 / 里程碑）、以及 Ember 火苗機制。

現有 stack 限制：
- 後端：Express 4 + Prisma + BullMQ（已用於其他排程）
- DB：PostgreSQL 14，SQL migration 在 daodao-storage（非 Prisma migrate）
- 前端：Next.js 15 + Tamagui，共用 `@daodao/api` client
- 通知系統：已有 `notification_events` 分發管線，新增事件類型不需改架構

---

## Goals / Non-Goals

**Goals:**
- 實作 Buddy 相似度推薦（`GET /practices/:id/suggested-buddies`）
- 實作 Buddy 列表 API（`GET /users/me/buddies`）
- 實作火苗（Ember）狀態模型與 DB schema
- 實作陪伴值（companion score）累積
- 實作三支 cron job：每日聚合通知、守望相助偵測、（隱含）火苗狀態快取更新
- 實作里程碑偵測（同步，打卡時觸發）
- 實作卡片傳送（`POST /buddies/:id/cards`）
- 前端：Buddy 列表頁、傳信畫面、推薦卡片、主動邀請 UI

**Non-Goals:**
- 小組（3–5 人）、Senpai/Kouhai 擴展
- 火苗視覺的實際美術稿（本 change 只定義資料模型與狀態 enum；視覺稿另開設計票）
- 留言公開/私密策略——本次以私密為預設，不建 UI 讓用戶選擇
- 火苗成長等級的精確數值公式——設計先用合理預設值，後續 A/B 調整

---

## Decisions

### D1：相似度推薦演算法——PostgreSQL Full-Text Search，不用向量搜尋

**做法**：對 `practices.title` 建立 `tsvector` index，`suggested-buddies` API 用 `ts_rank` 排序，先按 `template_id` 完全匹配，再按標題相似度降序，排除已是 Buddy 或有待處理請求的人。

**棄選：Qdrant 向量搜尋**——已有 AI backend 使用 Qdrant，但引入 embedding call 會增加延遲與複雜度；Buddy 推薦是低頻操作（建立實踐後觸發一次），FTS 精度對此場景已足夠。

**棄選：simple ILIKE**——不支援繁體/簡體語義相似，多詞匹配效果差。

---

### D2：火苗狀態——On-Read 計算，不由 cron 維護 enum 欄位

**做法**：`buddy_embers` 表只存 `last_checkin_at`、`consecutive_days`、`companion_score`；「旺/微弱/將熄/餘燼」狀態由 API layer 根據當前時間與 `last_checkin_at` 的差值即時計算，不寫入 DB。

```
距上次打卡天數 d：
  d ≤ 1 → 旺（active）
  2 ≤ d ≤ 3 → 微弱（fading）
  4 ≤ d ≤ 5 → 將熄（dying）  ← 守望相助觸發點
  d > 5 → 餘燼（dormant）
```

**棄選：cron 定期更新 status 欄位**——增加 cron 依賴，且 status 欄位在 cron 間隔內可能過期；on-read 永遠正確且無需額外 job。

**權衡**：查詢 Buddy 列表時需逐筆計算，資料量小（一人 Buddy 數量有限），可接受。

---

### D3：每日聚合通知——固定時間 BullMQ repeatable job，以 UTC+8 22:00 為準

**做法**：BullMQ repeatable job，每日 UTC 14:00（台灣時間 22:00）執行。Worker 查當日所有 `practice_buddy_requests`（status='accepted'）中有打卡的配對，按接收方分組，組出聚合通知後呼叫現有通知分發管線。

**棄選：delayed job（打卡時觸發，24h 後推送）**——每次打卡都建 job，量大；且同一天多次打卡會重複觸發。

**限制**：目前不支援用戶自訂通知時間（non-goal），統一用 UTC+8。

---

### D4：守望相助偵測——獨立 daily cron，不與聚合通知合併

**做法**：獨立 BullMQ repeatable job，每日 UTC 02:00 掃描 `buddy_embers.last_checkin_at`，找出距今 ≥ 5 天且尚未推送過守望相助通知的配對，推送通知給另一方。用 `watch_over_notified_at` 欄位防止重複推送（A 回來打卡後清除）。

**棄選：與聚合通知合併成一支 job**——責任混淆，且執行時間應不同（守望凌晨、聚合晚上）。

---

### D5：里程碑偵測——同步，打卡建立時觸發

**做法**：打卡 service 在寫入 checkin 後，同步計算該用戶在此實踐的連續天數，比對 `[7, 30, 100]` 及「完成整個實踐」，觸發對應通知事件。

**棄選：async job**——里程碑是少見事件，同步判斷開銷極低；async 反而增加通知延遲。

---

### D6：卡片傳送——專用 buddy_cards 表，不複用 comments

**做法**：`buddy_cards` 表存 `sender_id`、`buddy_relationship_id`、`card_type（preset|custom）`、`preset_key`、`content`；傳送後觸發 BuddyCard 通知事件，同時更新發送方 `companion_score`（+1）。

**棄選：複用 comments 表**——語意不同（卡片是私密一對一的，comments 是公開的）；混用會讓 comments query 需過濾 buddy 卡片。

---

## Risks / Trade-offs

**[Risk] FTS 推薦品質對短標題效果有限**
→ Mitigation：MVP 接受此限制；後續可補 embedding-based 推薦（feature flag 切換）。

**[Risk] 每日聚合 job 在用戶量大時掃表慢**
→ Mitigation：`practice_buddy_requests` 已有 `(requester_id)`、`(receiver_id)` index；checkins 表加 index on `(user_id, created_at::date)`；初期用戶量下不成問題。

**[Risk] companion_score 整數累加，無防重複機制**
→ Mitigation：每個 BuddyCard 發送記錄在 `buddy_cards` 表，分數更新時檢查同日是否已加過（optional，MVP 先不加，先觀察濫用情形）。

**[Risk] 守望相助通知在 Buddy 快速回來後仍顯示**
→ Mitigation：`watch_over_notified_at` 在 A 打卡時清 null，確保下次觸發是全新 5 天週期。

**[Trade-off] On-read 計算狀態 vs. 查詢效率**
列表頁每張卡片都要計算狀態，但因 Buddy 數量有軟限制（義務感自然限制），實際列表 < 20 筆，可接受。

---

## DB Migration

### D7（新增）：火苗歸屬——user-pair，不綁特定 practice request

**決策**：`buddy_embers` 綁的是「兩個人的關係」，不綁某筆 `practice_buddy_requests`。同一對用戶可在多個 practice 成為 Buddy，但只有一簇火苗。

**實作**：`buddy_embers` 以 `(user_a_id, user_b_id)` 為 unique key，寫入時永遠以較小的 `user_id` 作為 `user_a_id`（canonical ordering），避免正反向重複建立。

**`GET /users/me/buddies`**：以 user-pair 層級回傳，每個 Buddy 只出現一次；若該對有多筆 accepted requests（不同 practice），顯示最新的那個 practice 名稱作為代表。

---

### 新增 buddy_embers 表

> 火苗歸屬 user-pair（見 D7），不 FK 到 practice_buddy_requests。
> ID 型別對齊現有慣例（SERIAL INT）。

```sql
CREATE TABLE buddy_embers (
  id                      SERIAL PRIMARY KEY,
  user_a_id               INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b_id               INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_checkin_at         TIMESTAMPTZ,
  consecutive_days        INTEGER NOT NULL DEFAULT 0,
  companion_score_a       INTEGER NOT NULL DEFAULT 0,
  companion_score_b       INTEGER NOT NULL DEFAULT 0,
  watch_over_notified_at  TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_a_id, user_b_id),
  CHECK (user_a_id < user_b_id)
);

CREATE INDEX idx_buddy_embers_user_a ON buddy_embers (user_a_id);
CREATE INDEX idx_buddy_embers_user_b ON buddy_embers (user_b_id);
CREATE INDEX idx_buddy_embers_last_checkin ON buddy_embers (last_checkin_at);
```

建立邏輯：接受 Buddy 請求時（`PATCH /buddy-requests/:id` status='accepted'），若 user-pair 的 ember 不存在，則 INSERT；已存在則不重複建立（一對只有一簇）。

### 新增 buddy_cards 表

> 卡片綁到 user-pair（sender → receiver），不綁特定 practice request。

```sql
CREATE TABLE buddy_cards (
  id          SERIAL PRIMARY KEY,
  sender_id   INT NOT NULL REFERENCES users(id),
  receiver_id INT NOT NULL REFERENCES users(id),
  card_type   TEXT NOT NULL CHECK (card_type IN ('preset', 'custom')),
  preset_key  TEXT,
  content     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (sender_id <> receiver_id)
);

CREATE INDEX idx_buddy_cards_sender   ON buddy_cards (sender_id,   created_at DESC);
CREATE INDEX idx_buddy_cards_receiver ON buddy_cards (receiver_id, created_at DESC);
```

### practices.title FTS index

```sql
ALTER TABLE practices ADD COLUMN IF NOT EXISTS title_tsv TSVECTOR
  GENERATED ALWAYS AS (to_tsvector('simple', coalesce(title, ''))) STORED;

CREATE INDEX idx_practices_title_tsv ON practices USING GIN (title_tsv);
```

**Rollback**：DROP TABLE buddy_cards; DROP TABLE buddy_embers; DROP INDEX idx_practices_title_tsv; ALTER TABLE practices DROP COLUMN title_tsv;

---

## Migration Plan

1. 部署 DB migration（buddy_embers、buddy_cards、practices FTS index）——無停機，純新增
2. 部署後端 API 新 endpoints（suggested-buddies、buddies list、cards）
3. 部署 BullMQ jobs（daily-checkin-summary、watch-over-detector）——先以 dry-run 模式驗證 query 結果
4. 部署前端（feature flag 控制，先對內部帳號開放）
5. 全量開放

---

## Open Questions

1. **✅ 已解：buddy 關係的底層表**：確認為 `practice_buddy_requests`（SERIAL INT PK），無獨立 `buddy_relationships` 表。
2. **✅ 已解：一對用戶 vs. per-practice 火苗**：選 A——user-pair 一簇火苗，不綁特定 practice。`buddy_embers` 以 `(user_a_id, user_b_id)` unique，不限制同一對在多個 practice 成為 Buddy。詳見 D7。
3. **✅ 已解：`GET /users/me/buddies` dedup 層級**：per-user（一個 Buddy 只出現一次），若有多筆 accepted requests 則顯示最新的 practice 名稱作代表。
4. **守望相助留言公開/私密**：本 design 以私密為預設（buddy_cards 表），若後續決定支援公開選項，需新增 `visibility` 欄位。
5. **火苗狀態的精確天數門檻**：目前假設 d=5 對齊守望相助通知；若調整通知門檻，狀態計算邏輯同步更新。
6. **companion_score 在 profile 的呈現形式**：資料模型已備，UI 設計待另行討論。
