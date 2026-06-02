# OMC Teams 執行計畫
# inspiration-feed-display-enhancement

workspace root: `/Users/xiaoxu/Projects/daodao`
spec: `openspec/changes/inspiration-feed-display-enhancement/tasks.md`

---

## Wave 1 — 核心基礎（全 Claude，需讀 spec 做決策）

```bash
/omc-teams 4:claude "..."
```

| Worker | Agent | Repo | Tasks |
|--------|-------|------|-------|
| W1 | claude | `daodao-ai-backend` | **1.1** FeedReasonType enum → **1.2** feed_service 注入 feed_reason → **1.3** test_feed.py 基本驗證 |
| W2 | claude | `daodao-ai-backend` | **5.1** SlotType enum → **5.2** Slot Pattern ABCCC 組裝邏輯 → **5.3** 打卡則數判斷 |
| W3 | claude | `daodao-f2e` | **2.1** FeedItem 加 feed_reason → **2.2** ai-types.ts 更新 → **3.1** useShowcaseFeed → useFeed → **3.2** 移除 mock 資料 |
| W4 | claude | `daodao-f2e` | **4.1** CheckInShowcaseCard import → **4.1.1** 視覺結構 → **4.2** type=checkin 渲染 → **4.3** FeedLabel 動態化 → **4.4** new_release 群組 |

> W1/W2 都在 backend，但修改不同檔案（schemas vs service），不衝突
> W4 依賴 W3 的 3.1，需等 W3 commit 後再啟動（或分開 scope）

---

## Wave 2 — 進階功能（全 Claude，邏輯複雜）

```bash
/omc-teams 4:claude "..."
```

| Worker | Agent | Repo | Tasks |
|--------|-------|------|-------|
| W1 | claude | `daodao-ai-backend` | **1.4** cheered subquery（依賴 W1 Wave1）→ **6.1** ActivityCardItem schema → **6.2** Slot B ActivityCard 資料邏輯 |
| W2 | claude | `daodao-f2e` | **7.1** ActivityCardItem 型別 → **7.2** ActivityCard 元件 → **7.3** 靈感頁面渲染 ActivityCard |
| W3 | claude | `daodao-f2e` | **9.1** 打卡詳情頁 4 種反應按鈕 → **9.2** UX 流程（聚焦/Placeholder）→ **9.3** 二層留言 + @ 標記 → **9.4** bottomActions prop |
| W4 | claude | `daodao-f2e` | **8.1** useReactionsBatch hook → **8.2** 靈感頁面 batch 呼叫 → **8.3** batchReactionData prop 傳入卡片 |

---

## Wave 3 — 機械性收尾（Claude + Codex 混用）

```bash
/omc-teams 3:claude "..."   # 10.x
/omc-teams 2:codex "..."    # test + lint
```

| Worker | Agent | Repo | Tasks | 用 Codex 原因 |
|--------|-------|------|-------|------------|
| W1 | claude | `daodao-f2e` | **10.1** 三點選單邏輯 → **10.2** BrowseActivityContent Bottom Sheet → **10.3** 隱私規則過濾 | 邏輯仍需判斷，用 claude |
| W2 | codex | `daodao-ai-backend` | **5.4** Slot Pattern test cases → **6.3** ActivityCard test cases | 結構固定，輸入輸出明確 |
| W3 | codex | `daodao-f2e` | **11.1** `pnpm lint` + `pnpm typecheck`，自動修 error | 機械性修 lint error |

---

## Wave 4 — 整合驗收（Claude）

```bash
/omc-teams 1:claude "..."
```

| Worker | Agent | Tasks |
|--------|-------|-------|
| W1 | claude | **11.2** `pytest tests/routers/test_feed.py` 全數 pass → 確認 AC 清單 → 更新 tasks.md checkbox |

---

## 實際指令（Wave 1）

```bash
/omc-teams 4:claude "workspace: /Users/xiaoxu/Projects/daodao。請閱讀 openspec/changes/inspiration-feed-display-enhancement/tasks.md 作為主要規格。

W1: cd daodao-ai-backend
    完成 task 1.1（在 src/schemas/feed.py 新增 FeedReasonType enum: new_practice/new_release/checked_in/cheered）
    → task 1.2（修改 src/services/feed/feed_service.py，組裝 feed item 時注入 feed_reason）
    → task 1.3（更新 tests/routers/test_feed.py，驗證 feed_reason 欄位）
    完成後 commit

W2: cd daodao-ai-backend
    完成 task 5.1（src/schemas/feed.py 新增 SlotType enum A/B/C，FeedItem 加 slot_type）
    → task 5.2（feed_service.py 實作 A→B→C→C→C 循環組裝，每頁完整循環單位）
    → task 5.3（Slot A 打卡則數判斷：熱門 1 則/冷啟動 2 則/降級邏輯）
    完成後 commit

W3: cd daodao-f2e
    完成 task 2.1（packages/api/src/services/feed-hooks.ts 的 FeedItem 加 feed_reason: FeedReasonType）
    → task 2.2（packages/api/src/ai-types.ts 更新 /api/v1/feed response schema）
    → task 3.1（apps/product/src/app/[locale]/(with-layout)/page.tsx 替換 useShowcaseFeed → useFeed）
    → task 3.2（移除 hardcoded mock 打卡卡片與 mockCheckinReactions）
    執行 pnpm typecheck 確認通過後 commit

W4: cd daodao-f2e（等 W3 commit 後執行）
    完成 task 4.1（確認 CheckInShowcaseCard 可 import）
    → task 4.1.1（視覺結構：封面 240px/漸層遮罩/頭像 badge/留言預覽）
    → task 4.2（靈感頁面根據 FeedItem.type 渲染對應卡片）
    → task 4.3（FeedLabel 根據 feed_reason 動態顯示 icon+文案）
    → task 4.4（連續 new_release 只顯示一個 FeedLabel）
    執行 pnpm typecheck 確認通過後 commit"
```

---

## 實際指令（Wave 2）

```bash
/omc-teams 4:claude "workspace: /Users/xiaoxu/Projects/daodao。請閱讀 openspec/changes/inspiration-feed-display-enhancement/tasks.md 作為主要規格。

W1: cd daodao-ai-backend
    完成 task 1.4（在 src/services/feed/feed_service.py 的 UNION SQL 新增 cheered subquery：
      - 從 reactions 表 JOIN practices/practice_checkins
      - 以 MAX(r.created_at) 為 sort_time，分別處理 practice/checkin 兩種 target_type
      - 去重確保同一 item 不因多人 reaction 重複出現
      - 回傳含 feed_reason: "cheered" 與 latest_actor_name 欄位）
    → task 6.1（src/schemas/feed.py 新增 ActivityCardItem schema：
      item_type: "activity"、activity_type: "community_event"|"follow_summary"、event_text、label）
    → task 6.2（feed_service.py 實作 Slot B ActivityCard 資料邏輯：
      MVP 以社群熱門事件補位，查詢近期 reactions/new_practices，組裝成 ActivityCardItem，
      Slot B 回傳 item_type: "activity"、event_text、label: "學習動態"）
    完成後 commit

W2: cd daodao-f2e
    完成 task 7.1（packages/api/src/ai-types.ts 新增 ActivityCardItem 型別，對應 backend schema）
    → task 7.2（實作 apps/product/src/components/showcase/ActivityCard.tsx：
      顯示類型標籤「學習動態」與事件文字）
    → task 7.3（更新靈感頁面渲染邏輯：item_type === "activity" 渲染 ActivityCard）
    執行 pnpm typecheck 確認通過後 commit

W3: cd daodao-f2e
    完成 task 9.1（打卡詳情頁 /practices/{practiceId}/check-ins/{checkInId} 加入 4 種快速回應按鈕：
      加油/啟發/共鳴/好奇，使用 upsertReaction/removeReaction，targetType: 'checkin'，
      每用戶只能選一種，再次點擊取消）
    → task 9.2（點擊反應後 UX：計數更新 → 留言框自動聚焦 → Placeholder 替換為對應引導文字，四種各有文案）
    → task 9.3（打卡詳情頁加入二層留言系統，targetType: 'checkin'，支援 @ 標記帶出用戶清單，
      本人留言可編輯/刪除，他人留言可回覆）
    → task 9.4（透過 bottomActions prop 注入互動列至 CheckInCard，卡片本體不含硬編碼互動邏輯）
    執行 pnpm typecheck 確認通過後 commit

W4: cd daodao-f2e
    完成 task 8.1（確認或實作 useReactionsBatch hook：packages/api/src/services/，
      接受 targetIds 陣列，回傳 map by targetId 的 reaction summary）
    → task 8.2（靈感頁面 Feed 載入後收集所有 type=checkin 的 item IDs，
      呼叫 useReactionsBatch 一次取得所有 Reaction 資料，整頁只發 1 次 batch 請求）
    → task 8.3（將 batchReactionData prop 傳入每張 CheckInShowcaseCard，
      卡片使用 prop 資料而非自行發請求）
    執行 pnpm typecheck 確認通過後 commit"
```

---

## 實際指令（Wave 3）

### 指令一：Claude 處理 10.x 邏輯任務（3 workers）

```bash
/omc-teams 3:claude "workspace: /Users/xiaoxu/Projects/daodao。請閱讀 openspec/changes/inspiration-feed-display-enhancement/tasks.md 作為主要規格。

W1: 工作目錄: /Users/xiaoxu/Projects/daodao/daodao-f2e
    完成 task 10.1（三點選單差異化邏輯）：
      - CheckInShowcaseCard 展示卡片：本人打卡不顯示三點選單；他人打卡只顯示「檢舉」
      - 打卡詳情頁（/practices/{practiceId}/check-ins/{checkInId}）：
        本人打卡顯示「編輯打卡」/「分享打卡」/「瀏覽活動」；他人打卡顯示「檢舉」/「瀏覽活動」
      - 依據目前 CheckInShowcaseCard props 結構判斷 isOwner，透過 prop 注入選單項目，不改動卡片本體邏輯
    執行 pnpm typecheck 確認通過後 commit

W2: 工作目錄: /Users/xiaoxu/Projects/daodao/daodao-f2e
    完成 task 10.2（BrowseActivityContent Bottom Sheet）：
      - 實作 apps/product/src/components/showcase/BrowseActivityContent.tsx
      - 使用 useReactionsList(targetType: 'checkin', targetId) 取得反應列表
      - 列表顯示：頭像 32x32、用戶名稱、反應 emoji、相對時間，依 reactedAt 倒序排列
      - 空狀態顯示「還沒有人表達反應」文案
      - 整合進 Bottom Sheet 元件（參考既有 Bottom Sheet 實作方式）
    執行 pnpm typecheck 確認通過後 commit

W3: 工作目錄: /Users/xiaoxu/Projects/daodao/daodao-f2e（等 W2 commit 後執行）
    完成 task 10.3（隱私規則過濾）：
      - 修改 BrowseActivityContent，過濾反應列表：僅顯示 isPublic=true 或 isConnection=true 的用戶
      - 確認 useReactionsList 回傳資料包含 isPublic / isConnection 欄位（若缺少需更新型別定義）
      - 過濾後若列表為空，顯示與空狀態相同文案
    執行 pnpm typecheck 確認通過後 commit"
```

---

### 指令二：Codex 處理 tests + lint（2 workers）

```bash
/omc-teams 2:codex "workspace: /Users/xiaoxu/Projects/daodao。請閱讀 openspec/changes/inspiration-feed-display-enhancement/tasks.md 作為主要規格。

W1: 工作目錄: /Users/xiaoxu/Projects/daodao/daodao-ai-backend
    完成 task 5.4（Slot Pattern test cases）：
      在 tests/routers/test_feed.py 新增以下 4 個 test cases：
      1. 熱門打卡（reactions ≥ 1）→ Slot A 只放 1 則打卡
      2. 冷啟動（reactions=0, comments=0, 候選池有 2 個不同 userId）→ Slot A 放 2 則打卡
      3. 候選池 < 2（只有 1 則）→ 降級為 1 則
      4. 候選池為空 → Slot A 跳過（該循環少一格）
      另驗證 API 回傳 items 順序符合 A→B→C→C→C 循環。
    完成 task 6.3（ActivityCard test cases）：
      在 tests/routers/test_feed.py 新增 1 個 test case：
      驗證 Slot B 位置的 item 含 item_type='activity', event_text 非空字串, label='學習動態'。
    完成後 commit

W2: 工作目錄: /Users/xiaoxu/Projects/daodao/daodao-f2e
    完成 task 11.1（lint + typecheck 自動修復）：
      1. 執行 pnpm --filter @daodao/product typecheck 2>&1，記錄所有 TypeScript error
      2. 逐一修復 error（missing types、unused imports、型別不符等），不能改動業務邏輯
      3. 執行 pnpm --filter @daodao/product lint --fix 自動修正可修復的 lint error
      4. 再次執行 typecheck 與 lint 確認 0 error
    完成後 commit"
```

---

## 注意事項

1. **Backend W1/W2 不衝突**：`schemas/feed.py` 都會修改，建議 W1 先處理 enum，W2 確認 pull 後再加 SlotType
2. **Frontend W3/W4 有序依賴**：W4 的 page.tsx 修改依賴 W3 的 useFeed 完成
3. **Codex Wave 3 W2**：給 codex 的 task 描述要非常明確，直接列出函數簽名與預期輸出格式
4. **每個 wave 結束後**：執行 `git log --oneline -5` 確認 commit 正常後再開始下一波

## UI 參考

`daodao-f2e/apps/product/src/app/[locale]/dev/showcase-preview/page.tsx` 是靈感頁面的 UI ground truth（mock 資料，不需後端）。

### 已確認元件狀態

- `CheckInShowcaseCard` — 已存在於 `apps/product/src/components/showcase/CheckInShowcaseCard.tsx`，**task 4.1 直接跳過**
- `PracticeShowcaseCard` — 已存在，無需處理
- `FeedLabel` — 目前在 preview page 內定義，**task 4.3 需提取為獨立 component** 並加入 feed_reason routing
- `batchReactionData` prop — CheckInShowcaseCard 已支援，task 8.3 直接使用

### CheckInShowcaseCard Props 介面

```tsx
<CheckInShowcaseCard
  id checkin_date mood note tags image_urls created_at
  practice={{ id, title }}
  user={{ id, name, photo_url }}
  comment_count
  batchReactionData={mockReactions}
  comment_preview={[{ id, content, user: { id, name, photo_url }, created_at }]}
/>
```

### Feed 節奏（從 preview page 萃取）

```
checkin（checked_in）→ checkin（checked_in）→ practice × 3（new_release 群組，共用一個 FeedLabel）
```
