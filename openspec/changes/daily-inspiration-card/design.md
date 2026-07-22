# Design: 今日靈感卡（每日書摘分享）

> 對應提案：`proposal.md`。各子專案的檔案觸點以 2026-07 各 repo 現況盤點為準。

## 1. 資料庫（daodao-storage）

### 1.1 Migration SQL

`migrate/sql/{下一序號}_add_daily_inspirations.sql`（序號以 storage repo 現況為準；**同步回寫 `schema/` 對應檔**）：

```sql
CREATE TABLE daily_inspirations (
    id          SERIAL PRIMARY KEY,
    quote_text  VARCHAR(500) NOT NULL,            -- 主文：書摘/重點詮釋
    action_hint VARCHAR(300),                     -- 行動建議（可為 NULL）
    book_title  VARCHAR(200) NOT NULL,            -- 書名（中文版書名）
    book_author VARCHAR(100) NOT NULL,            -- 作者
    theme       VARCHAR(50)  NOT NULL,            -- 主題 slug，值域由應用層管控（見 1.2）
    suggested_template_id INTEGER REFERENCES practice_templates(id) ON DELETE SET NULL,
                                                  -- 配對的實踐模板（可為 NULL）；一鍵轉換的關鍵欄位，見 3.3
    locale      VARCHAR(10)  NOT NULL DEFAULT 'zh-TW',
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    sort_order  INTEGER      NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_daily_inspirations_active
    ON daily_inspirations (is_active, sort_order, id);
```

Seed data 併入同一支 migration（或緊接的下一序號），內容見附錄 A。

### 1.2 theme 值域

**刻意不用 DB CHECK/enum**（避免 `schema-sync-check.yml` 三 repo 常量比對的維護成本），值域由 server 的 TS 常量 + Zod enum 管控：

| slug | 中文 | 對應素材 |
|------|------|----------|
| `habit` | 習慣養成 | 原子習慣、富有的習慣 |
| `discipline` | 紀律 | 紀律等於自由、執行長日記 |
| `mindset` | 心態與身份 | 七個習慣、原則 |
| `neuroplasticity` | 神經可塑性 | Rewire、改變是大腦的天性 |
| `action` | 立即行動 | 兩分鐘法則類 |
| `reflection` | 復盤反思 | 復盤日記類 |

## 2. 後端 API（daodao-server）

### 2.1 Public：取得今日靈感

```
GET /api/v1/inspirations/today
```

- 免登入（與首頁未登入可視範圍一致；如需鎖登入，掛 requireAuth 即可，MVP 先開放）
- Response（遵循 server 標準 response 格式）：

```jsonc
{
  "status": "success",
  "data": {
    "inspiration": {
      "id": 7,
      "quoteText": "每天進步 1%，一年後你會變得約 37 倍強大。微小的改變，帶來巨大的成果。",
      "actionHint": "今天挑一件事，做一個 1% 的小改善。",
      "bookTitle": "原子習慣",
      "bookAuthor": "James Clear",
      "theme": "habit",
      "suggestedTemplate": { "id": 12, "title": "每日閱讀 30 分鐘" },  // 無配對模板時為 null
      "date": "2026-07-22"
    }
  }
}
// 無任何 active 素材 → data.inspiration = null（前端不佔位）
```

### 2.2 選取邏輯（決定性輪播，無排程）

```
dayIndex = 自 epoch 起算的天數（Asia/Taipei 時區）
pool     = SELECT * FROM daily_inspirations
           WHERE is_active = TRUE AND locale = 'zh-TW'
           ORDER BY sort_order, id
today    = pool[dayIndex % pool.length]
```

- 同一天所有人看到同一則；跨日（台北時間 00:00）自動切換
- Redis cache：key `inspiration:today:zh-TW`，TTL 到當日台北時間午夜；admin 寫入操作時清除
- 素材增減會位移對應關係（proposal 已列為已知風險）

### 2.3 Public：隨機一則（打卡回饋用）

```
GET /api/v1/inspirations/random?theme=habit    # theme 可選
```

- 從 active pool 隨機回傳一則（與 today 不同：每次呼叫可不同句），response 形狀同 2.1（不含 `date`）
- 供打卡成功回饋混用（見 3.5）；與既有 `checkin-encouragements/random` 端點**並存**，混合策略放前端

### 2.4 Admin CRUD

掛在 `admin.routes.ts`（沿用既有 admin middleware / 角色檢查）：

```
GET    /api/v1/admin/inspirations          # list：?theme=&isActive=&page=&limit=
POST   /api/v1/admin/inspirations          # create
PUT    /api/v1/admin/inspirations/:id      # update（含 is_active 切換）
DELETE /api/v1/admin/inspirations/:id      # hard delete（誤刪風險低，素材可重建）
```

### 2.5 檔案觸點

| 檔案 | 動作 |
|------|------|
| `prisma/schema.prisma` | 新增 `daily_inspirations` model（`prisma db pull` 或手改）→ `pnpm run prisma:generate` → `pnpm run schema:drift` |
| `src/routes/inspiration.routes.ts` | 新增（public today）；admin 端點加入 `src/routes/admin.routes.ts` |
| `src/controllers/inspiration.controller.ts` | 新增 |
| `src/services/inspiration.service.ts` | 新增（選取邏輯 + CRUD；factory pattern，禁 class） |
| `src/validators/inspiration.validator.ts` | Zod schemas + `registry.registerPath`（**必做**，f2e 型別靠這個生成） |
| `src/types/inspiration.types.ts` | theme 常量（`const object + as const`） |
| `src/app.ts` | 掛載 `/api/v1/inspirations` |
| `__tests__/` | service 單元測試（見 tasks 驗收條件） |

## 3. 前端（daodao-f2e / product）

### 3.1 API 層（packages/api）

| 檔案 | 內容 |
|------|------|
| `src/services/inspiration.ts` | `getTodayInspiration()` 純函式（openapi-fetch；錯誤走 `response.error`，處理完 `return`） |
| `src/services/inspiration-hooks.ts` | `useTodayInspiration()` SWR hook（檔內順序：Imports → Types → Query Hooks） |
| `src/services/index.ts` | barrel 匯出 |
| `src/types.ts` | 生成物，**禁手改**——開發期用手動 `gen:types` 對 server 分支生成；merge 到 server dev 後由 `sync-openapi.yml` 接手 |

### 3.2 UI

| 檔案 | 內容 |
|------|------|
| `apps/product/src/components/showcase/inspiration-card.tsx` | 新增。`"use client"`。引號視覺語言參考 `resonance-carousel.tsx`（QuoteFillSvg）。區塊：主題 chip → 引文 → 「整理自《書名》— 作者」→ actionHint（有才顯示）。`data.inspiration === null` 時 return null 不佔位 |
| `apps/product/src/components/showcase/index.ts` | 匯出 |
| `apps/product/src/app/[locale]/(with-layout)/page.tsx` | 插入位置：`<ResonanceCarousel />` 與 feed 列表之間 |
| `apps/product/src/i18n` | 卡片標籤 keys（如「今日靈感」「整理自」「試試看」） |

> 位置備選：feed 首張固定卡。MVP 採獨立區塊（不動 `reorderFeedItems`，實作與回滾都簡單）；若上線後想更沉浸再併入 feed（見 Phase 2）。

### 3.3 行動導流（轉換的關鍵設計，非加分項）

行為設計依據：名言卡只能短暫拉高動機（Fogg B=MAP 的 M），動機高峰以秒計衰減——CTA 必須在**同一張卡片內**把行動門檻（A）降到最低，否則轉換鏈在「進入空白建立頁」就斷掉。

- **有配對模板**（`suggestedTemplate != null`）：CTA 顯示「用這個模板開始：{{template.title}} →」，深連結至既有 practices 建立流程並**預填模板**（帶 `template` 參數 + 溯源參數，實作時對齊 `practices/create` 模板流程現況）
- **無配對模板**：CTA 退回一般「建立實踐 →」→ `/practices/create`
- 素材與模板的天然配對範例：兩分鐘法則→「每天 2 分鐘小事」、每日閱讀 30 分鐘→閱讀打卡模板、復盤日記→「睡前 5 分鐘復盤」（配對關係由營運在 admin 頁維護）

### 3.4 成效量測（漏斗定義，MVP 必做）

沒有這條漏斗，無法回答「這張卡有沒有促成主題實踐」。沿用既有 `@daodao/analytics` 事件慣例與 server `interaction_events` / view-tracking 基礎：

```
inspiration_card_impression   卡片進入 viewport（帶 inspirationId, theme, hasTemplate）
        ↓
inspiration_cta_click         點擊 CTA（帶 inspirationId, templateId?）
        ↓
practice_created              既有事件，建立來源需可歸因（from=inspiration&inspirationId=N）
        ↓
7 日內首次打卡                 既有 checkin 資料可回溯查詢，不需新事件
```

- 溯源方式：CTA 深連結帶 query 參數，建立完成時寫入歸因（實作時對齊既有 analytics/interaction_events 慣例，避免另建機制）
- 觀察指標：曝光→點擊率、點擊→建立率、建立→7 日打卡率；並可對比「有模板 vs 無模板」素材的轉換差異（這是驗證本設計假說的實驗）

### 3.5 打卡成功回饋混入書摘（MVP）

行為設計依據：《原子習慣》第四法則「讓獎賞令人滿足」——打卡完成是全產品接受度最高的時刻，且版位已存在（`checkin_encouragements` 打卡成功隨機鼓勵語）。書摘在此不開新版位，而是讓既有版位的內容變強。

- 打卡成功畫面的內容池加入書摘：**70% 既有鼓勵語 / 30% 書摘**（機率混合在前端，比例常數集中管理便於調整）
- 書摘顯示格式與靈感卡一致（引文 +「整理自《書名》— 作者」），**不顯示 actionHint 與 CTA**——使用者剛完成行動，這一刻是獎賞不是導流
- 曝光追蹤：`inspiration_checkin_impression`（帶 inspirationId）；此整合目標是留存/連續打卡而非轉換，歸因困難，MVP 只追曝光、不強行歸因 streak
- ⚠️ **版位協調**：`encouragement-messages` 提案（社群鼓勵語池）規劃使用同一版位。該提案落地時需統一「打卡回饋內容決策」（建議：里程碑日書摘優先、平日社群/系統鼓勵語輪替），詳見 6.4

## 4. 管理後台（daodao-admin-ui）

照 `admin-content.ts` + `useContentPerformance.ts` + `ContentPerformancePage.tsx` 範本：

| 檔案 | 內容 |
|------|------|
| `src/api/admin-inspirations.ts` | 新增。**前綴 `/daodao-server/api/v1/admin/inspirations`**（打 server，不是 ai-backend）；用 `apiClient`；型別就近 export |
| `src/hooks/useInspirations.ts` | react-query；queryKey `['admin', 'inspirations', ...]`；mutation onSuccess invalidate |
| `src/pages/InspirationsPage.tsx` | 列表（theme 篩選 + 啟用開關 inline toggle + 是否配對模板欄位）+ 新增/編輯 dialog（含**模板配對下拉選單**，選項來自 practice templates 列表；若 admin 無現成端點，於 server admin CRUD 一併補簡單 list）+ 刪除確認。附「今日預覽」小卡（呼叫 public today API） |
| `src/App.tsx` | lazy route `/inspirations` |
| `src/components/layout/Sidebar.tsx` | 「內容」group 加 `{ to: '/inspirations', label: '每日靈感', icon: Quote }`（lucide-react） |

## 5. 跨 repo 順序（依 system-map SOP）

```
1. storage   migration + seed + schema/ 回寫 → make migrate-sql-dev
2. server    prisma 同步 → API 實作 → openapi:generate
3. f2e       gen:types（手動）→ service/hooks → InspirationCard → 首頁
4. admin-ui  手動補 types → 管理頁
（ai-backend 本階段不動）
```

## 6. Phase 2/3 預留（本次不實作，僅確認不被 MVP 擋路）

### 6.1 Feed 插卡（Phase 2）

ai-backend `schemas/feed.py` 已有 `SlotType.B` 預留；屆時 f2e `FeedItem` union 加 `type: "inspiration"`、`FeedReasonType` 加 `daily_quote`。`daily_inspirations` 表結構已含 `theme`，可供依使用者 practice 標籤選卡。

### 6.2 分享圖（Phase 3）

沿用 `app/api/og-image/route.ts` 模式。

### 6.3 信件整合（Phase 3，優先序已排）

server 信件基礎建設完整（email queues、`email_templates`、`email_trigger_rules`、`notification_preferences`），書摘進信件不需新機制。email worker 與 inspiration service 同在 server，直接呼叫 service 取素材（不走 HTTP）。決定性輪播的副作用是**信裡與首頁當日同句**，形成跨渠道重複曝光，零同步成本。

依「改動成本 × 情境相關度」排序：

| 優先 | 觸點 | 做法 | 為什麼 |
|------|------|------|--------|
| P1 | 既有實踐信（PE 系列：週報、打卡鼓勵信） | 信尾加「本週一句」區塊；進階：依 practice tag 對應素材 `theme` 選句 | 收信者正在做實踐，情境最準；只改既有模板，零新增寄信頻率 |
| P1 | Onboarding 序列信（`onboarding-email` queue） | 書摘 + 模板 CTA 深連結（`from=email` 溯源） | 收信者是「還沒開始實踐」族群，轉換假說最強的位置；漏斗量測直接沿用 |
| P2 | Weekly digest（`notification-weekly` queue） | 加「本週靈感」區塊 | 順手做，零風險 |
| P3 | 獨立每日靈感信 | **必須 opt-in**（`notification_preferences` 新增 type）；先看 P1/P2 開信與點擊數據再決定 | 每日一信退訂/垃圾信風險高，不預設開 |

量測：email 端 CTA 帶 `from=email&touchpoint={pe_weekly|onboarding|digest}` 參數，併入 3.4 漏斗；開信/點擊沿用既有 `email_logs` 追蹤。

### 6.4 打卡整合進階（Phase 2）

MVP 只做 3.5 的機率混合；以下進階留 Phase 2：

- **情境選句**：依 practice tags 對應 theme（運動→habit、日記→reflection）、打卡 mood 低落→自我慈悲類素材、連續打卡里程碑（第 7/30/66 天）→複利與迴路固化類素材（第 66 天彈「神經迴路穩固」書摘，用科學語言為堅持蓋章）
- **LLM 鼓勵搭配**：ai-backend `encouragement/generate` 失敗或限流時以書摘為 fallback（版位永遠有內容）；或 LLM 個人化鼓勵尾附一句書摘出處（溫度 + 權威感）
- **版位統一決策**：屆時打卡回饋內容來源有三種（系統鼓勵語、社群鼓勵語 encouragement-messages、書摘），需與該提案負責人共同定義優先序/輪替策略，避免兩提案在同一版位打架

---

## 附錄 A：首批 seed 素材（40 條）

> 來源：團隊整理（Grok 對話彙整）。**皆為重點詮釋非逐字引文**，匯入前需人工校對書名譯名與內容。格式：theme | quote_text | action_hint | book_title | book_author
> `suggested_template_id` 不在 seed 內寫死（模板 id 依環境而異）——上線後由營運在 admin 頁逐條配對；**行動型素材（#7、#8、#20、#28、#33 等有 action_hint 者）優先配對**。

| # | theme | quote_text | action_hint | 書名 / 作者 |
|---|-------|-----------|-------------|--------------|
| 1 | habit | 你的習慣就是你的未來。日常的小選擇，決定十年後的你——別只設定目標，先建立能自動執行的系統。 | 寫下一個你想養成的小習慣，明天就開始。 | 執行長日記 / Steven Bartlett |
| 2 | habit | 不要硬對抗壞習慣（容易反彈），而是用更好的正向行為去替換它。 | 想少滑手機→把手機放到另一個房間，改拿一本書。 | 執行長日記 / Steven Bartlett |
| 3 | discipline | 動機來來去去，真正的成功靠紀律。即使不想做，也要去做該做的事。 | — | 執行長日記 / Steven Bartlett |
| 4 | mindset | 人生有五個桶子：知識、技能、人脈、資源、聲望。持續填滿前兩個，未來就無人能奪走你的價值。 | 今天為「知識」桶子裝一點東西：讀 10 頁書。 | 執行長日記 / Steven Bartlett |
| 5 | reflection | 復盤是成長的加速器。每晚問自己：今天哪裡做得好？明天如何更好？ | 今晚花 5 分鐘寫下這兩個問題的答案。 | 執行長日記 / Steven Bartlett |
| 6 | mindset | 世界變化再快，沒有人能奪走你腦中的知識和練就的技能。這是你最可靠的資產。 | — | 執行長日記 / Steven Bartlett |
| 7 | habit | 每天進步 1%，一年後你會變得約 37 倍強大。微小的改變，帶來巨大的成果。 | 今天挑一件事，做一個 1% 的小改善。 | 原子習慣 / James Clear |
| 8 | action | 兩分鐘法則：任何新習慣，一開始都縮減到「兩分鐘內就能完成」。降低門檻，就能開始。 | 想運動→先只穿上運動鞋；想閱讀→先只打開書。 | 原子習慣 / James Clear |
| 9 | mindset | 別說「我要努力運動」，改說「我是一個會規律運動的人」。當行為符合新身份，習慣就會自然堅持。 | 用「我是一個會___的人」造一個句子。 | 原子習慣 / James Clear |
| 10 | habit | 把好習慣設計得顯而易見、容易執行；把壞習慣變得隱藏且困難。環境設計決定一切。 | 想多喝水→把水杯永遠放在桌上。 | 原子習慣 / James Clear |
| 11 | habit | 決定你成功或失敗的，不是你的目標，而是你的系統。 | — | 原子習慣 / James Clear |
| 12 | habit | 小習慣像雪球，開始時不起眼，時間越久滾得越大。堅持下去，你會看到驚人變化。 | — | 原子習慣 / James Clear |
| 13 | habit | 不要靠意志力硬撐——透過環境設計，讓好習慣變成最容易的選擇。 | — | 原子習慣 / James Clear |
| 14 | action | 不用等到完美才行動。先開始，再慢慢優化——完美主義是敵人。 | 那件拖延的事，今天先做最小的一步。 | 原子習慣 / James Clear |
| 15 | habit | 成功不是一夜之間，而是每天都比昨天更好一點的累積。 | — | 原子習慣 / James Clear |
| 16 | mindset | 主動積極是第一個習慣。不要被環境或他人左右，要為自己的生命負責。 | — | 高效能人士的七個習慣 / Stephen R. Covey |
| 17 | mindset | 以終為始。先在腦中清楚看見你想要的未來，再回頭決定今天該怎麼做。 | 花 3 分鐘想像一年後理想的自己。 | 高效能人士的七個習慣 / Stephen R. Covey |
| 18 | mindset | 雙贏思維：真正的成功不是贏過別人，而是找到大家都能受益的方式。 | — | 高效能人士的七個習慣 / Stephen R. Covey |
| 19 | habit | 富有的習慣不是運氣，而是日復一日的選擇。早起、閱讀、儲蓄、建立人脈，是大多數富人的共同點。 | — | 富有的習慣 / Thomas C. Corley |
| 20 | habit | 每天閱讀 30 分鐘以上，能大幅拉開你與他人的差距。 | 今天挑一本書，讀 30 分鐘。 | 富有的習慣 / Thomas C. Corley |
| 21 | reflection | 痛苦＋反思＝進步。遇到挫折時，勇敢面對並找出根本原因，這就是成長的捷徑。 | 回想最近一次挫折，寫下它教你的一件事。 | 原則 / Ray Dalio |
| 22 | mindset | 擁抱現實，無論它有多殘酷。只有接受真相，才能做出正確的決定。 | — | 原則 / Ray Dalio |
| 23 | discipline | 紀律等於自由。當你能掌控自己，你才能掌控人生。 | — | 紀律等於自由 / Jocko Willink |
| 24 | neuroplasticity | 大腦不是一出生就固定。透過重複的行為與思考，你正在親手重塑自己的大腦。 | — | 改變是大腦的天性 / Norman Doidge |
| 25 | neuroplasticity | 科學已證實：我們的思考、習慣和學習，能實際改變腦內的神經連結。 | — | 改變是大腦的天性 / Norman Doidge |
| 26 | neuroplasticity | 即使受過傷、年紀較大，或有先天限制，大腦依然擁有驚人的自癒與重塑能力。改變永遠不嫌晚。 | — | 改變是大腦的天性 / Norman Doidge |
| 27 | neuroplasticity | 每一次堅持好習慣，都是在強化新的神經通路；放下壞習慣，則是讓舊通路逐漸弱化。 | — | 改變是大腦的天性 / Norman Doidge |
| 28 | neuroplasticity | 在腦中「想像練習」，就能活化相同的神經迴路——心理排練也能改變大腦。 | 睡前花 2 分鐘，在腦中排練明天想做好的事。 | 改變是大腦的天性 / Norman Doidge |
| 29 | neuroplasticity | 你的思考習慣刻在大腦迴路裡，但迴路不是永久固定——你隨時都能重新配線。 | — | Rewire-神經可塑性 / Nicole Vignola |
| 30 | neuroplasticity | 重複＋注意力＋刻意＝持久改變。想改變人生，就從刻意重複新思考模式開始。 | — | Rewire-神經可塑性 / Nicole Vignola |
| 31 | neuroplasticity | 負面習慣像寬敞的大馬路，正向新習慣像雜草小徑。每天刻意走新路，它就會逐漸變寬。 | — | Rewire-神經可塑性 / Nicole Vignola |
| 32 | mindset | 不要試圖壓抑情緒——越壓抑越強烈。真正有效的是改變產生情緒的思考。 | — | Rewire-神經可塑性 / Nicole Vignola |
| 33 | action | 生理性嘆息：連續用鼻子吸氣兩次，再慢慢長吐氣，能立刻啟動副交感神經、平復焦慮。 | 感到緊繃時，現在就試一次。 | Rewire-神經可塑性 / Nicole Vignola |
| 34 | neuroplasticity | 大腦懶得改變，喜歡走熟悉的老路（即使那條路讓你痛苦）。要打破循環，就要刻意選擇新路徑，直到它變得自動。 | — | Rewire-神經可塑性 / Nicole Vignola |
| 35 | mindset | 你不是壞掉的人，只是卡在舊迴路裡。改變永遠可能，而且科學站在你這一邊。 | — | Rewire-神經可塑性 / Nicole Vignola |
| 36 | neuroplasticity | 注意力決定神經可塑性的方向。把焦點從「我不行」轉移到「我正在學習」，改變就開始了。 | — | Rewire-神經可塑性 / Nicole Vignola |
| 37 | neuroplasticity | 睡眠是大腦重塑的最佳時機——良好睡眠能鞏固白天學習的新神經連結。 | 今晚提早 30 分鐘上床。 | Rewire-神經可塑性 / Nicole Vignola |
| 38 | mindset | 苛責自己只會強化壓力迴路；對自己溫柔，反而更容易打破舊模式。自我慈悲是改變的催化劑。 | — | Rewire-神經可塑性 / Nicole Vignola |
| 39 | action | 不要追求完美，追求進步。神經可塑性重視的是持續的小行動，而不是一次到位的劇變。 | — | Rewire-神經可塑性 / Nicole Vignola |
| 40 | neuroplasticity | 你擁有改變大腦的權力。無論過去如何，現在都能透過刻意練習，創造更健康的心理狀態與人生。 | — | Rewire-神經可塑性 / Nicole Vignola |
