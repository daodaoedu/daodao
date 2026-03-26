## Context

Dao Dao 的 `practices` model 目前無隱私狀態欄位，`practice_cheers` 互動表尚未建立（`practice-interaction.service.ts` 中有 TODO 標記）。`checkin_encouragements` 是打卡鼓勵句模板，與此功能的「加油哦」互動不同。通知目前只有 email 通道，schema 中無 push token 欄位。

前端架構：Next.js (`apps/product`) + React Native Expo (`apps/mobile`)，共用 `packages/features/` 套件。後端為 Express + Prisma + PostgreSQL + Redis/BullMQ。

## Goals / Non-Goals

**Goals:**
- 新增靈感頁（含「靈感」與「我的」子 Tab），依隱私狀態分兩種卡片呈現
- 卡片顯示日期區間、頻率資訊（天/週、分鐘/次）、emoji 反應列、留言數
- 實作加油互動（emoji 🔥/❤️）並對延遲分享練習的擁有者發送通知；加油後以「XXX 與其他 N 人」格式展示加油者
- 實作搜尋、篩選、排序，搜尋索引需排除延遲分享的打卡心得

**Non-Goals:**
- Phase 2 使用者搜尋（搜尋其他使用者，非練習）
- 進階排序（Most Liked、Trending）— 預留欄位但不在此實作
- Push notification（Expo 推播）— 通知以 email 作為第一版實作，架構預留推播擴充點
- 收藏 / 追蹤功能

## Decisions

### 1. 隱私狀態欄位：新增 `privacy_status` 至 `practices`

**決策**：在 `practices` 表新增 `privacy_status VARCHAR(20) DEFAULT 'private'`，值為 `private | public | delayed`。

**理由**：現有 `visibility` 欄位在其他 model 已用於不同語意（comment visibility），避免混用。使用明確的三態值比 boolean `is_public` 更能表達「延遲分享」這一中間狀態。

**替代方案**：在 `practice_settings` 建立額外表格 — 過度設計，此欄位與 practice 是 1:1 關係。

### 2. 反應互動：新增 `practice_reactions` 表，複用現有 `ReactionType`

**決策**：建立 `practice_reactions(id, practice_id, user_id, reaction_type, created_at)` 表，`(practice_id, user_id, reaction_type)` 唯一鍵防止重複反應；同一使用者可對同一練習用不同 reaction_type 反應。`reaction_type` 值對應前端 `ReactionType` enum（`encourage | touched | fire | useful | sameHere | curious`）。

**理由**：前端已有完整的 `ReactionBar` 元件（`social/reaction-bar.tsx`）與 6 種 `ReactionType` 定義，`IReactionCount` 也已含 `latestActorName` 欄位，直接對應「Joy 與其他 N 人」的聚合顯示需求。複用現有 UI 與型別，避免重複建立只有單一 emoji 的 cheer 機制。

**替代方案**：單一 `practice_cheers` 表（無 reaction_type）— 無法展示多種 emoji 聚合，且與現有 ReactionBar 元件脫節，不選。

### 3. 搜尋實作：ILIKE（Phase 1），預留 FTS 擴充路徑

**決策**：Phase 1 使用 PostgreSQL `ILIKE` 對 `title`、`practice_action`、標籤名稱（JOIN `entity_tags + tags`）、資源名稱（JOIN `resources`）進行模糊匹配。延遲分享的 `check-in` 心得文字不 JOIN 進搜尋條件。

**理由**：PostgreSQL 內建 Full-Text Search（`tsvector` / `to_tsquery`）對中文支援有限，需安裝 `pg_jieba` 或 `zhparser` 擴充套件，增加部署複雜度。現階段資料量小，ILIKE 效能足夠；待使用者量成長或中文擴充套件就緒後，可無縫遷移至 FTS（加 `tsvector` generated column + GIN index 即可）。

**替代方案**：FTS tsvector — 對英文效能更好，但中文需額外擴充，推遲至 Phase 2。

### 4. 通知：Email + 架構預留推播

**決策**：「延遲分享練習收到加油」的通知，第一版透過 email 發送（沿用現有 email queue 架構）。在 `users` 表預留 `expo_push_token` 欄位以利未來 mobile 推播擴充。

**理由**：Schema 目前無 push token，Expo SDK 整合需要額外工作。Email 通道已有完整基礎設施（BullMQ queue、模板引擎）可快速交付。

### 5. 靈感頁 Feed API：使用 AI backend 現有路由

**決策**：
- **靈感 Tab**：使用 AI backend 的 `GET /api/v1/users/practices`（`ai-types.ts`），支援 `keyword`、`tags`、`duration_min/max`、`status`、`sort_by`、cursor 分頁。需擴充回傳欄位以包含 `privacy_status`、`reactions`（`IReactionCount[]`）。
- **我的 Tab**：使用現有 Node.js backend practice API（`types.ts`）。
- **搜尋建議**：使用 AI backend 現有的 `GET /api/v1/users/practices/suggestions`。
- **反應互動**：在 Node.js backend 新增 `POST /api/v1/practices/{id}/react`，延伸現有 `/like` 路由模式（`practice-interaction.service.ts`）。

**理由**：AI backend 已有完整的搜尋、過濾、排序、cursor 分頁邏輯，不需重複建置 showcase 專用路由。Node.js backend 負責寫操作（反應 toggle、`privacy_status` 更新），職責清晰。

## Risks / Trade-offs

- **全文搜尋多語言支援**：PostgreSQL 預設全文搜尋對中文支援有限（需 `pg_jieba` 或 `zhparser` 擴充）。短期以 ILIKE 補足中文搜尋，長期規劃安裝中文語言包。→ 文件中標記此 open question。
- **延遲分享隱私外洩風險**：搜尋索引必須在資料寫入時就排除延遲分享的 check-in 心得，不能在查詢時過濾。→ 在 indexing job 中強制檢查 `privacy_status`。
- **加油通知信件騷擾**：每次加油都發信可能太頻繁。→ 實作 1 小時內同一練習的加油合併通知（batch notification）。

## Migration Plan

1. `prisma migrate dev`：新增 `privacy_status` 至 `practices`，建立 `practice_cheers` 表，新增 `expo_push_token` 至 `users`
2. 資料回填：現有 practices 的 `privacy_status` 預設為 `private`
3. 新增 `GET /api/showcase` 端點（不影響現有路由）
4. 前端新增廣場頁入口（Sidebar）

## Open Questions

- 中文全文搜尋：是否在此 change 安裝 PostgreSQL 中文擴充套件，或維持 ILIKE？
- 合併通知的時間窗口：1 小時是否合適？
- 廣場頁是否需要登入才能瀏覽（目前設計為可公開存取）？
