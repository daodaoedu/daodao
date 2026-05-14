## Context

靈感頁面（`/`）目前透過 `useShowcaseFeed` 呼叫舊的 `/v1/users/practices` endpoint，只能取得 practice 資料，且含有 hardcoded mock 打卡卡片。AI backend 已有統一的 `/v1/feed` endpoint（`src/routers/feed.py`），可回傳混合 `practice` + `checkin` items，前端也已定義好 `useFeed` hook 與 `FeedItem` 型別。

PRD/FRD v1.1（2026-04-22）進一步定義了 Feed 組成演算法（Slot Pattern）、ActivityCard、打卡互動（Reactions + Comments）、瀏覽活動（Browse Activity）等完整功能集。

---

## Goals / Non-Goals

**Goals**

- AI backend：在 `/v1/feed` 每個 item 加入 `feed_reason` 欄位，涵蓋 MVP 必要情境
- AI backend：實作 Slot Pattern 組裝邏輯（A→B→C→C→C），依 reactions/comments 決定 Slot A 則數
- AI backend：ActivityCard 資料聚合（社群活動事件 + 追蹤動態）
- 前端：靈感頁面從 `useShowcaseFeed` 切換為 `useFeed`，移除 hardcoded mock 打卡卡片
- 前端：FeedLabel 根據 `type` + `feed_reason` 動態渲染對應文案
- 前端：CheckInShowcaseCard 批次取得 Reaction 資料（useReactionsBatch），避免 N+1
- 前端：打卡詳情頁支援 Reactions（4 種）+ Comments（二層）
- 前端：瀏覽活動 BrowseActivityContent Bottom Sheet
- 不需要資料庫 migration（純業務邏輯欄位，由後端在組裝 feed 時即時計算）
- AI backend：reactions 表作為第三種 feed subquery，`sort_time` 使用 reaction 的 `created_at`，去重後以 `feed_reason: "cheered"` 回傳

**Non-Goals**

- 不改動 `/v1/feed` 的過濾邏輯（隱私設定等）
- 不修改 `useShowcaseFeed` 本身（保留給其他使用點，若無其他使用點再另行清除）
- ActivityCard 演算法不在此 change 內實作個人化排序（使用社群熱門事件作為 MVP fallback 即可）

---

## Decisions

### 1. 為什麼由後端下發 `feed_reason`，而非前端自行推斷

前端可以透過 `type === "practice" && data.is_brewing` 推斷出「醞釀中新發布」，但這種做法有幾個問題：

- **推斷邏輯分散**：未來若新增 reason（如 `cheered`），前端需要同步更新判斷條件，耦合過深
- **語意不明確**：`is_brewing` 是實踐的屬性，不代表 feed 出現的「原因」；同一筆實踐在不同時機入 feed，reason 可能不同
- **後端才有完整上下文**：後端在組裝 feed 時知道這筆資料為何入選（新發布、打卡、被推薦等），前端只能事後猜測

結論：`feed_reason` 屬於 feed 系統的 presentation layer 語意，應由後端在組裝時決定並下發。

### 2. `feed_reason` 枚舉值設計

```
new_practice   # 一般新發布的實踐（is_brewing = false）
new_release    # 醞釀中實踐正式發布（is_brewing = true）
checked_in     # 打卡紀錄
cheered        # practice 或 checkin 收到 reaction，以最新 reaction 的 created_at 排序
```

命名原則：
- 使用動詞過去式或名詞，描述「發生了什麼事」，而非「這筆資料是什麼」
- `new_release` 比 `brewing_practice` 更貼近用戶語言（「終於發布了」）
- `cheered` 由 reactions 表驅動，詳見 Decision 5

後端在 `src/schemas/feed.py` 新增 `FeedReason` enum；`FeedItem` schema 加入 `feed_reason: FeedReason` 欄位；`src/routers/feed.py` 組裝 items 時根據 item type 與 practice 屬性填入對應值。

### 3. 前端切換 hook 的策略：直接替換

靈感頁面（`apps/product/src/app/[locale]/(with-layout)/page.tsx`）是 `useShowcaseFeed` 唯一的目標切換點。採用**直接替換**而非並行共存：

- `useFeed` 已穩定存在（`packages/api/src/services/feed-hooks.ts`），介面成熟
- 不需要 A/B 測試，行為是確定性改善
- 並行共存會造成兩個 API call、多餘的狀態管理複雜度

切換步驟：
1. 將 `useShowcaseFeed` 替換為 `useFeed`
2. 根據 `item.type` 渲染對應卡片元件（practice card / checkin card / activity card）
3. 根據 `item.feed_reason` 選擇 FeedLabel 文案
4. 移除 hardcoded mock 打卡卡片

### 4. FeedLabel 文案映射

| `type`               | `feed_reason`   | 文案                              |
|----------------------|-----------------|----------------------------------|
| `practice`           | `new_practice`  | `{name} 發布了新實踐`             |
| `practice`           | `new_release`   | `最新發布`                        |
| `checkin`            | `checked_in`    | `{name} 在 {practiceTitle} 打卡` |
| `practice`/`checkin` | `cheered`       | `{latestActorName} 表達了加油`   |

文案由前端 i18n key 管理，後端只提供 reason，不下發文字。

### 5. cheered 的觸發邏輯：reactions 作為 feed 事件

`reactions` table 有 `target_type`（practice/checkin）、`target_id`、`user_id`、`created_at`。

做法：在 feed UNION SQL 新增第三個 subquery，從 reactions 表 JOIN practices/practice_checkins，以 reaction 的 `created_at` 作為 `sort_time`：

```sql
-- cheered practice
SELECT 'practice' AS item_type, r.target_id AS item_id,
       MAX(r.created_at) AS sort_time, 'cheered' AS feed_reason_hint,
       (
           SELECT u.nickname FROM reactions r2
           JOIN users u ON u.id = r2.user_id
           WHERE r2.target_type = 'practice' AND r2.target_id = r.target_id
           ORDER BY r2.created_at DESC LIMIT 1
       ) AS latest_actor_name
FROM reactions r
JOIN practices p ON p.id = r.target_id AND r.target_type = 'practice'
WHERE p.privacy_status = 'public' AND p.deleted_at IS NULL
GROUP BY r.target_id

UNION ALL

-- cheered checkin
SELECT 'checkin' AS item_type, r.target_id AS item_id,
       MAX(r.created_at) AS sort_time, 'cheered' AS feed_reason_hint,
       (
           SELECT u.nickname FROM reactions r2
           JOIN users u ON u.id = r2.user_id
           WHERE r2.target_type = 'checkin' AND r2.target_id = r.target_id
           ORDER BY r2.created_at DESC LIMIT 1
       ) AS latest_actor_name
FROM reactions r
JOIN practice_checkins c ON c.id = r.target_id AND r.target_type = 'checkin'
JOIN practices p ON p.id = c.practice_id
WHERE p.privacy_status = 'public' AND p.deleted_at IS NULL
GROUP BY r.target_id
```

`GROUP BY` 取 `MAX(created_at)` 避免同一 item 因多人 reaction 重複出現。

`latest_actor_name` 欄位由 subquery 取得最新 reaction 的操作者 nickname，供前端 FeedLabel 顯示「XXX 表達了加油」；若為 `None` 則前端 fallback 為「有人表達了加油」。

`feed_reason_hint` 欄位傳遞到後段組裝邏輯，`feed_service.py` 在組裝時讀取此 hint 而非重新推算。

### 6. 「最新發布」群組邏輯定義

showcase-preview 設計稿中，多個 `is_brewing=true` 的實踐共用一個 FeedLabel（「最新發布」）。

定義：**同一頁（pagination page）中，連續排列的 `is_brewing=true` 實踐視為同一群組**，前端在渲染時若發現相鄰 item 均為 `feed_reason: "new_release"`，則只在第一個上方顯示 FeedLabel，其餘省略。

實作：純前端邏輯，後端不感知群組——只確保相同 `feed_reason` 的 items 在排序上盡量相鄰（目前按 `created_at DESC` 自然相鄰）。

### 7. Feed 組成演算法（Slot Pattern）

PRD/FRD v1.1 定義 Feed 以固定節奏排列，以 5～6 格為一個循環單位：

```
A → B → C → C → C → A → B → C → C → C → ...
```

| Slot | 類型 | Component | 數量 |
|------|------|-----------|------|
| A | 打卡（Check-in） | CheckInShowcaseCard | 1～2 則 |
| B | 互動（Activity） | ActivityCard | 1 則 |
| C | 實踐（Practice） | PracticeShowcaseCard / BrewingCard | 3 則 |

**Slot A 則數判斷邏輯**（優先序由上到下）：
1. 打卡 reactions ≥ 1 或 comments ≥ 1 → **1 則**（熱門打卡獨佔版面）
2. 候選池 ≥ 2 則打卡、均為冷啟動（reactions=0, comments=0）、來自不同 userId → **2 則**
3. 候選池可用打卡 < 2（內容不足）→ **1 則（降級）**；候選池為空則跳過此 Slot

**後端實作方式**：feed service 在組裝回傳前按 Slot Pattern 排列，每次分頁輸出完整循環單位（5～6 格），確保前端節奏不被截斷。打卡則數判斷在 feed 組裝層進行，query 打卡候選池時帶入 reactions_count 與 comments_count。

**冷啟動與降級**：
- 新用戶（無關注/連結）Slot B 僅顯示社群熱門事件
- 內容池不足時，循環中可跳過某 Slot，但不得連續出現同類型卡片超過 4 則

### 8. ActivityCard 資料來源設計

ActivityCard（Slot B）顯示社群活動訊號，分兩種類型：

- **類型 A（社群活動事件）**：單一社群事件，如「Anna 對 Bob 的打卡說加油了」、「Bob 開始了新實踐」
- **類型 B（追蹤動態彙整）**：彙整關注/連結對象的近期動態

優先序：已連結（Connection）動態 > 關注（Follow）動態 > 社群熱門事件

**MVP 實作策略**：ActivityCard 在此 change 的 MVP 版本中，以社群熱門事件（類型 A）為主，個人化排序（Connection > Follow）列為後續迭代。後端提供 `GET /api/v1/feed/activities` 或在 feed Slot B 位置注入 activity item。

ActivityCard 需標示類型標籤（如「學習動態」）以與打卡、實踐卡片視覺區分。

### 9. CheckInShowcaseCard 批次 Reaction 資料

避免 N+1 問題：每次 Feed 載入後，透過 `useReactionsBatch` 一次取得所有打卡 Reaction 資料，傳入各卡片的 `batchReactionData` prop。

禁止各卡片單獨發 Reaction 查詢。`useReactionsBatch` 接受 `targetIds` 陣列，回傳 map by `targetId` 的 reaction summary。

### 10. 打卡詳情頁 Reactions + Comments 設計

**4 種快速回應**：

| 口語標籤 | 英文 | Placeholder | Emoji |
|----------|------|-------------|-------|
| 加油 | Support | 「說點什麼鼓勵他吧！」 | 🙌 |
| 啟發 | Insightful | 「你從這篇得到了什麼靈感？」 | 💡 |
| 共嗚 | Relate | 「你也有同樣的感受嗎？」 | 🤝 |
| 好奇 | Curious | 「你想進一步了解什麼？」 | 🔍 |

觸發流程：點擊反應 → 計數即時更新 → 留言框自動聚焦 → Placeholder 動態替換。
每位用戶每則打卡只能選一種反應；再次點擊同一反應 → 取消。

**Comments 系統**：二層（留言 + 回覆），支援 @ 標記。API 使用 `targetType: 'checkin'`。

**bottomActions prop 模式**：CheckInCard 組件透過 `bottomActions` prop 注入互動列，保持卡片本體與互動邏輯解耦。

### 11. 瀏覽活動（Browse Activity）入口設計

三點選單依身份區分：
- 本人打卡：「編輯打卡」、「分享打卡」、「**瀏覽活動**」
- 他人打卡：「檢舉」、「**瀏覽活動**」

點擊「瀏覽活動」→ 開啟 `BrowseActivityContent` Bottom Sheet，使用 `useReactionsList(targetType: 'checkin', targetId)` 取得資料，依 `reactedAt` 倒序排列，顯示頭像 + 名稱 + 反應 emoji + 相對時間。

隱私規則：僅顯示公開使用者及已連結者（Connection）的互動紀錄。

---

## Risks / Trade-offs

| 風險 | 說明 | 緩解方式 |
|------|------|----------|
| schema breaking change | `feed_reason` 為新增欄位，若前端先上線而後端未部署，會拿到 `undefined` | 前端對 `undefined` 做 fallback，顯示預設文案；後端先行部署 |
| `useShowcaseFeed` 殘留 | 若其他頁面也有使用，直接替換靈感頁面不影響它們 | 先 grep 確認使用點，change 完成後追蹤清除 |
| checkin 卡片元件尚未存在 | 若 `IShowcaseCheckIn` 對應的卡片元件未完成，會阻塞渲染 | 確認現有元件清單；若缺失則列為此 change 的 task（已排為 Task 4.1）|
| feed cache 舊資料 | 後端部署後 2 分鐘內 cache 仍為舊格式，`feed_reason` 缺失 | 前端 fallback 處理 `undefined`，不顯示 FeedLabel；2 分鐘後 cache 自動刷新，可接受 |
| cheered 去重不完整 | 同一 item 同時因「新發布」和「被 reaction」出現兩次 | feed UNION 加 WHERE 排除 cheered subquery 中已在 created_at 較新的 practice/checkin |
| Slot Pattern 後端複雜度 | 依 reactions/comments 決定則數需額外查詢 | 打卡候選池 query 帶入計數欄位，一次查詢完成，不做二次 query |
| ActivityCard MVP 範圍 | 個人化排序（Connection > Follow）實作複雜 | MVP 以社群熱門事件為主，個人化列為後續迭代 |
| N+1 Reactions | Feed 含多張打卡卡片各自查 Reaction 導致 N+1 | 強制使用 `useReactionsBatch`，禁止單卡查詢 |

---

## Migration Plan

不需要資料庫 migration。`feed_reason` 是純後端業務邏輯欄位，在 feed 組裝層（`src/routers/feed.py`）即時計算：

- `type == "practice"` 且 `data.is_brewing == True` → `new_release`
- `type == "practice"` 且 `data.is_brewing == False` → `new_practice`
- `type == "checkin"` → `checked_in`
- reactions subquery 的 item → `cheered`（由 `feed_reason_hint` 傳遞，見 Decision 5）

部署順序：
1. 後端部署（`/v1/feed` 開始回傳 `feed_reason` 與 Slot Pattern 組裝）
2. 前端部署（靈感頁面切換 hook、FeedLabel 動態渲染、ActivityCard、Reactions/Comments）

兩者可獨立部署，前端對 `feed_reason` 缺失做 fallback 即可。

---

## Open Questions

1. **ActivityCard 個人化排序**：MVP 先以社群熱門事件補位，Connection > Follow 優先序列為後續迭代？（已確認）
2. **`useShowcaseFeed` 其他使用點**：切換前需 grep 確認是否有其他頁面依賴此 hook，若有則需獨立處理。
3. **`feed_reason` 是否需要考慮「推薦」場景**：未來若後端基於演算法推薦特定實踐，現在的 enum 設計是否預留空間？（目前設計為 open enum，後端可新增值不影響前端 fallback）
4. **打卡候選池個人化排序**：目前定義為「身份匹配 + 社交加權」，MVP 版本採用哪種簡化策略？
