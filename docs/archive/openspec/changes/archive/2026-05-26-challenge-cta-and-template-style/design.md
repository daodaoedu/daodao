## Context

`daodao-f2e` 的 `feat/challenge` branch 已有初步實作：
- `practice-detail-shell.tsx`：「我也想實踐」按鈕已存在，但位置在 `PracticeOverviewCard` **內部**
- `copy-success-preview`：複製成功慶祝畫面已完成（Confetti + Lottie）
- `CommunityChallengeCard`、`ExploreTopicCard`：列表卡片元件存在，但**尚未加入 CTA**

後端（`daodao-server`）目前**沒有**複製實踐的 API endpoint；複製流程需要新增。

## Goals / Non-Goals

**Goals:**
- 將「我也想實踐」按鈕移到 `PracticeOverviewCard` 外部（視覺層級提升）
- 在列表卡片（`CommunityChallengeCard` / `ExploreTopicCard`）加入同一 CTA
- 在自己的實踐詳情頁右上角 `...` 選單加入「建立複本」按鈕（複製自己）
- 新增後端 `POST /api/v1/practices/:id/copy` endpoint
- 前端呼叫 copy API，成功後導向慶祝畫面
- 調整 template-preview 頁面的樣式

**Non-Goals:**
- 不修改複製後實踐的隱私／可見度邏輯
- 不在此次重構 PracticeOverviewCard 其他互動元件
- 不支援批次複製多個實踐

## Decisions

### 1. 按鈕位置：卡片外部，卡片下方

**決定：** 按鈕置於 `PracticeOverviewCard` 之後、「更多資訊」摺疊區塊之前（獨立 DOM 層級）

**原因：** 讓按鈕脫離卡片的視覺邊框，形成明顯的全寬 CTA，與圖片設計稿一致。

**替代方案：** 放在卡片底部 border 內 → 被卡片邊框限制，視覺層級不夠高。

### 2. 後端：新增 `POST /api/v1/practices/:id/copy`

**決定：** 新增獨立的 copy endpoint，而非讓前端帶完整欄位呼叫 `POST /api/v1/practices`

**原因：**
- 複製邏輯（哪些欄位帶、哪些重置）應在 server 端統一管理
- 後端可驗證來源實踐的可見度（複製他人時僅 public 可被複製；複製自己不受此限）
- 與既有 `/projects/:id/duplicate` 模式一致

**欄位處理：**
- **帶入（copy）：** title, practice_action, duration_days, session_duration_minutes, frequency_min_days/max_days, practice_time_periods, other_context, has_resources, theme_color, template_id
- **新增追蹤：** source_practice_id → 來源實踐的 internal id（用於 analytics）
- **初始狀態（與一般 `create()` 對齊）：** status → `"not_started"`、progress_percentage → `INITIAL_PROGRESS`（20）、start_date → 今日、end_date → `start_date + duration_days - 1`、user_id → 當前使用者
  - **依據：** 產品規格 `/docs/product/copy/複製.md`「進度仍需在複製後顯示 20%」、「開始日為複製日當天」。複製出來的實踐應與一般使用者新建的實踐有一致的 UX（同樣的 INITIAL_PROGRESS、同樣 status flow），不採用 `'draft'` 以避免「進度 20% + 草稿」的矛盾顯示。
- **回傳 id：** 新實踐的 `external_id`（UUID 字串），不是 internal numeric id。`GET /api/v1/practices/:id` 路由 expects external_id，若回傳數字會導致 `/practices/:id/edit` 等頁面 404。
- **被複製計數：** 來源實踐的 `copy_count` +1（需在 practices 表新增此欄位）

### 3. 列表卡片 CTA

**決定：** `CommunityChallengeCard` 與 `ExploreTopicCard` 都加入「我也想實踐」按鈕，透過 `onCopyPractice?: (practiceId: string) => void` prop 傳入

**原因：** 保持元件無狀態、讓父層控制 mutation 邏輯，與現有 `practice-detail-shell.tsx` 的 `onCopyPractice` 設計一致。

### 4. 複製成功跳轉

**決定：** 複製 API 成功後，前端 router push 到 `/practices/copy-success?practiceId={newId}`，為獨立全頁面路由（與 `/practices/create/success` 模式一致）。

**實作方式：** 另開 feature branch（base `dev`），新建 `/practices/copy-success/page.tsx`，視覺設計參考 `feat/challenge` 的 `dev/copy-success-preview/page.tsx`，mock 資料替換為 copy API 回傳的真實資料。

## Risks / Trade-offs

- **[Risk] feat/challenge branch 尚未 merge** → 實作需 base 在 `feat/challenge`，待 merge 後才能到 main。應確認 merge 時序。
- **[Risk] copy API 未做 rate limiting** → 使用者可能快速複製大量實踐 → Mitigation: 加入每日複製次數限制（初期可不做，記錄為 TODO）
- **[Trade-off] 重置 start_date 為今日** → 使用者可能希望自訂起始日 → 目前複製後可進「編輯內容」修改，可接受

## Migration Plan

> 三個 repo 皆從 `dev` 開新分支，建議統一命名 `feat/challenge-cta-and-template-style`。

1. daodao-storage（base `dev`）：
   a. `migrate/sql/034_add_source_practice_id_to_practices.sql`：`ALTER TABLE practices ADD COLUMN source_practice_id INT DEFAULT NULL REFERENCES practices(id) ON DELETE SET NULL`
   b. `migrate/sql/035_add_copy_count_to_practices.sql`：`ALTER TABLE practices ADD COLUMN copy_count INT NOT NULL DEFAULT 0`
   c. `schema/410_create_table_practices.sql`：在 `practices` DDL 加入 `source_practice_id`、`copy_count` 欄位定義
2. daodao-server（base `dev`）：新增 `POST /api/v1/practices/:id/copy` route + service + validator，`copyPractice()` 寫入 `source_practice_id`、copy_count +1；Prisma schema 加入欄位
3. daodao-f2e（base `dev`，參考 `feat/challenge` 實作）：
   a. 將 `practice-detail-shell.tsx` 的按鈕移至卡片外
   b. `CommunityChallengeCard` + `ExploreTopicCard` 加入 CTA prop
   c. 呼叫 copy API hook，成功後跳轉慶祝畫面
   d. Template-preview 樣式調整

## Open Questions

1. ~~**慶祝畫面路由**：`/dev/copy-success-preview` 應改為正式路由（`/practices/copy-success`）還是作為 modal？~~ → **已決定**：新建獨立路由 `/practices/copy-success?practiceId={newId}`，參考 `feat/challenge` dev preview 設計。
2. ~~**已複製過的按鈕狀態**：若使用者已複製該實踐，按鈕是否顯示不同狀態（e.g., disabled + 「已在你的清單」）？~~ → **已決定**：按鈕不調整 UI 狀態，允許重複複製；後端透過 `source_practice_id` 記錄來源追蹤即可。
