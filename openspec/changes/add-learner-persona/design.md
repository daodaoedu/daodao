## Context

島島阿學目前以「技能標籤」為主要連結機制，缺乏使用者「學習心理特質」的結構化資料。本次新增「學習者人物誌」功能，透過問答機制收集使用者偏好，用於 AI Mentor 個性化與社群深層連結。

涉及子專案：`daodao-storage`（schema）、`daodao-server`（API）、`daodao-f2e`（product + mobile UI）。

## Goals / Non-Goals

**Goals:**
- 建立問題庫資料模型（三種題型：選擇、完成句子、具體情境）
- 實作答題、略過、共鳴三種使用者行為 API
- 靈感牆輪播（Resonance Carousel）出現邏輯與 dismiss 機制
- 個人人物誌 Profile 分頁（自己 vs 訪客視圖）
- 閘門邏輯（< 5 題鎖定，≥ 5 題解鎖）

**Non-Goals:**
- AI Mentor RAG 注入（後續 iteration）
- Badge 獎勵系統實作（後續 iteration）
- 私密回答切換（PRD 明確排除）
- 對等揭露（Reciprocal Disclosure）的完整付費牆（本期僅做 < 5 題遮蔽）

## Decisions

### D1：題型統一用 `persona_question_type_t` enum + `options` JSONB 欄位

**決定**：資料表 `persona_questions` 以自定義 enum type `persona_question_type_t`（值為 `'choice', 'sentence_completion', 'scenario'`）區分題型，選擇題的選項存入 `options JSONB`。

**原因**：三種題型都需要儲存 prompt 文字，僅選擇題需額外選項清單。用 JSONB 而非多張子表可避免過度正規化，且 PostgreSQL JSONB 支援索引。

**命名**：DB 已有 `question_type_t` enum（survey 功能用，值為 `multiple_choice / single_choice / rating / text / yesno / scale / ranking`），必須使用 `persona_question_type_t` 避免命名衝突。專案慣例所有自定義 enum 加 `_t` 後綴，用 `DO $$ BEGIN CREATE TYPE ... EXCEPTION WHEN duplicate_object THEN NULL; END $$;` 包裝確保冪等。

**替代方案**：獨立建 `persona_question_options` 表 → 增加 JOIN 複雜度，選項排序也難管理，故放棄。

---

### D2：使用者答案與略過分開存表

**決定**：
- `persona_answers`：記錄正式提交的答案（選擇結果或文字）
- `persona_skips`：記錄略過次數，達 3 次後設 `suppressed = true`

**原因**：略過行為與答題行為語意不同，混在同一張表會產生 null 欄位，且略過只需計數器不需答案內容。

---

### D3：輪播出現邏輯由 Server 端計算，前端僅消費

**決定**：`GET /persona/carousel-state` 回傳 `{ shouldShow: boolean, questions: [...] }`，前端不自行判斷出現條件。

**原因**：出現邏輯涉及 `session_count_since_last_prompt`、`last_prompt_timestamp`、新手期判斷（註冊後 5 天），若分散在前端難以測試且易出現不一致。Server 集中計算後，Web 與 Mobile 共用同一邏輯。

**替代方案**：前端用 localStorage 計算 → 多裝置登入會失去同步，故放棄。

---

### D4：使用者輪播狀態存於 `persona_user_state`

**決定**：獨立建 `persona_user_state` 表，欄位包含：
- `session_count_since_last_prompt`：距上次提示後的登入次數
- `last_prompt_timestamp`：上次顯示輪播的時間
- `last_dismissed_at`：最近一次 dismiss 的日曆日期（用於當天不再顯示判斷）
- `is_new_user_period`：是否仍在新手期（依 `created_at + 5 days` 計算，可 cache）

**原因**：這些狀態與使用者主表無關，且日後可獨立清除或重置，避免污染 user 主表。

---

### D5：閘門狀態（Passport Gate）不存表，即時計算

**決定**：`locked = COUNT(persona_answers WHERE user_id = ?) < 5`，不在 user 表或 state 表存 `is_unlocked` flag。

**原因**：答題數是事實（fact），flag 是衍生值（derived value）。存 flag 會產生雙重事實源，需額外同步邏輯。COUNT 查詢在小數量下可接受，必要時加 Redis cache。

---

### D6：API 路由命名空間 `/api/v1/persona`

實際路由（含完整前綴）：
```
GET    /api/v1/persona/questions           # 問題列表（含使用者已答/已略過狀態）
POST   /api/v1/persona/answers             # 提交答案
POST   /api/v1/persona/skips               # 略過問題
POST   /api/v1/persona/resonances          # 共鳴
DELETE /api/v1/persona/resonances/:id      # 取消共鳴
GET    /api/v1/persona/carousel-state      # 輪播應否顯示 + 本次問題清單
POST   /api/v1/persona/carousel-dismiss    # Dismiss 輪播（當天不再顯示）
GET    /api/v1/persona/profile/:userId     # 取得某使用者的人物誌（含鎖定判斷）
GET    /api/v1/persona/profile/me          # 自己的人物誌（含未答虛線格）
```

需在 `src/routes/index.ts` 加入 `router.use('/persona', personaRoutes)`，並在 `persona.routes.ts` 為每條路由呼叫 `registry.registerPath()` 以供 f2e `@daodao/api` 自動生 TypeScript 型別。

---

### D7：`persona_resonances` 獨立建表，不重用 `reactions` 泛型表

**決定**：新建 `persona_resonances`（user_id, answer_id, created_at），而非重用既有泛型 `reactions` 表（target_type + target_id + reaction_type）。

**原因**：共鳴（resonance）語意單一（無 reaction_type 區分），且 `persona_resonances` 需對 `persona_answers` 建立明確 FK 約束，用泛型表會失去 referential integrity。獨立表查詢更直接，index 也更精準。

**替代方案**：重用 `reactions` 表（`target_type='persona_answer'`）→ 立刻獲得 unique constraint，但失去 FK、型別安全性下降，且污染 reactions 表的 target_type enum，故放棄。

---

### D8：跨 repo 型別同步流程

前端 `@daodao/api` 的型別來自 server 端 OpenAPI schema 自動生成，跨 repo 同步流程如下：

```
daodao-storage  →  daodao-server
migration SQL      prisma db pull / prisma:generate
                   → schema.prisma 更新
                   → 寫 routes + validators（含 registry.registerPath + .openapi()）
                   → pnpm run types:generate → openapi.json 更新

daodao-server  →  daodao-f2e
openapi.json       packages/api/src/services/persona.ts（引用 paths/components type）
                   packages/api/src/services/persona-hooks.ts（useQuery/useMutate）
                   → 前端組件用 hooks，禁止直接 fetch
```

tasks.md 5.x 章節必須等 server 路由 + types:generate 完成後才能開始。

---

## Risks / Trade-offs

**[輪播 session 計數器準確性]** → session 計數依賴後端每次登入 event 遞增，若前端 silent refresh 觸發多次會重複計數。Mitigation：登入 event 改以 token issue 為準，而非 API call 數量。

**[新手期判斷 race condition]** → 同時多個 request 可能讀到舊 `is_new_user_period`。Mitigation：`is_new_user_period` 以 DB 欄位 `created_at + 5 days > now()` 動態計算，不存 flag。

**[閘門 COUNT 效能]** → 高併發時 `COUNT(*)` 可能成為瓶頸。Mitigation：加 `persona_answers(user_id)` index；若未來規模擴大，改為 Redis counter。

**[JSONB options 缺乏 schema 驗證]** → 選擇題選項格式若寫錯不會在 DB 層報錯。Mitigation：Server 端用 Zod schema 驗證寫入內容，並在 migration seed 時統一格式。

## Migration Plan

1. 新增 migration `040_create_persona_tables.sql`：建立 `persona_questions`、`persona_answers`、`persona_skips`、`persona_resonances`、`persona_user_state` 五張表
2. 新增 migration `041_seed_persona_questions.sql`：植入初始問題庫
3. Server 新增 `/persona` 路由（新路由，不影響既有 API）
4. 前端逐步上線：先上 Profile 人物誌分頁，再上靈感牆輪播
5. Rollback：刪除 migration、關閉路由 feature flag（若有）

## Open Questions

- **問題庫初始題目數量**：PRD 未明確定義，建議 MVP 先準備 10-15 題，涵蓋三種題型各 3-5 題。
- **共鳴是否影響閘門**：共鳴行為（resonance）是否計入 5 題門檻？目前假設不計入，僅答題算數。
- **`session_count` 重置時機**：dismiss 後計數器歸零，但使用者關掉 App 再開算一次還是多次 session？需確認定義。
