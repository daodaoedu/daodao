# Design: 燈塔建立系列與場次——場次設定面板

## Context

現況（2026-09-03 盤點，動機見 proposal.md）：

- **cohort 資料模型**：`cohorts`（slug、display_name、start_date、end_date、join_token、join_paused、join_deadline、capacity、invite_message、status、visibility）→ `cohort_enrollments`（email、user_id、invite_token、status、role）→ `cohort_templates`（template_id、bound_at、unbound_at、**start_date**）→ `practice_templates`（**duration_days** 1–90、organization_id）。`programs`（name、description、kind、deleted_at，**無 status**）。
- **燈塔 API**（`organization.routes.ts`，mount `/api/v1/lighthouse`，全部 `requireOrganizationMember`）：programs CRUD＋archive（有場次 409）；cohorts list/create/get/update/archive/**duplicate**/join-token rotate|pause|resume；templates CRUD＋`PUT|DELETE /organizations/:oid/templates/:tid/cohorts/:cid`（bind 可帶 `startDate`）；invitations、members、dashboard、focus、feed、outcome、messages。
- **學員 API**（`cohort-join.routes.ts`，mount `/api/v1/cohorts`）：`GET|POST /join/:joinToken`（POST 收 `consent: true`，`cohortJoinService.join` → `ensureCohortDrafts` 依綁定建草稿，草稿 `privacy_status` 走 DB 預設 `'public'`）；`GET /:cohortId`（需 enrollment joined）；`exit`、`export-consent`、`feed`。
- **探索 API**（`activity.routes.ts`，optionalAuth）：`activitySummarySchema` 含名稱、系列、組織、日期、人數、`runStatus`、`canJoin`、`joinToken`。
- **spaces 區塊系統**（migration 084，`space.routes.ts`／`space.service.ts` 682 行）：`spaces`／`space_members`／`space_practices` 三張「容器」表 + `space_home_pages`（UNIQUE space_id、status draft|published）／`space_blocks`（block_type text|resources|calendar、title、body、position、is_pinned、publish_status draft|scheduled|published、scheduled_at）／`space_block_links`（name、url、is_name_customized、position）／`space_block_link_practices`／`space_block_events`（title、start_date、end_date、start_time、end_time、location、url）五張「內容」表。所有 service 以 `requireSpace(externalId)` + `findViewerRole(space_members)` 起手。**沒有任何 API 能建立 `spaces` 列**，2026-09-02 決策「保留不動、閒置」。f2e 元件：`space-block-editor`（383 行，含 blur 存檔、排程、刪除）、`space-resources-editor`（184，自動命名、指定實踐 popover）、`space-calendar-editor`（153）、`space-format-toolbar`（125，粗體／斜體／項目／連結）、`space-block-view`（113）、`space-home-tab`（304）、`space-toc`。
- **隱私現況**：`practices.privacy_status ∈ {public, private, delayed}`（`private` = 僅本人），`practices.visibility`（社群軸）；`practice_checkins` **沒有**逐則隱私欄位；`comments.visibility ∈ {private, public}`；`challenge-acl.service.ts` 只對 `kind='challenge'` 鎖定 `privacyStatus` 等欄位；cohort 動態牆 `cohort-feed.service` 直接查 `practice_checkins`（限成員與組織成員），不看 `privacy_status`。
- **f2e 燈塔**：`programs-manager.tsx` 651 行單檔（ProgramsManager → ProgramPanel → CohortCard），場次建立／編輯為單一 grid 表單；`?edit=<cohortId>#cohort-<id>` 由總覽頁 `lighthouse-overview.tsx:51` 帶入；`join-code.tsx` 已用 `qrcode` 畫 QR。i18n namespace：`lighthouse` 331 key、`cohort` 72、`space` 106、`explore_activities` 25。
- **storage**：本機無 clone；migration 序號最新 086（`086_add_cohort_visibility.sql`）；`schema/393_create_table_cohorts.sql` 為 cohorts 的 schema 檔。

## Goals / Non-Goals

**Goals:**
- 一份 cohort 資料模型同時服務燈塔設定面板、學員報名頁、學員首頁、探索頁，欄位語意單一來源在 server Zod。
- 區塊系統只維護一套程式碼（server engine + f2e 元件），cohort 與閒置的 space 共用。
- 兩階段建立、隱私連動、收費連動的規則在 server 正規化，不只靠前端。

**Non-Goals:**
- 不重做 spaces 容器（`spaces`／`space_members`／`space_practices`），不補建立 space 的 API。
- 不引入 cohort 範圍的逐則打卡／留言隱私軸（另案）。
- 不做金流。

## Decisions

### D1：新增欄位全部放 `cohorts` 純欄位，不用 JSONB；只有「多筆」的聚會時段與報名問題另開表

**決策**：

| FRD 欄位 | 落點 | 型別／值域 |
|---|---|---|
| 一句話簡介 | `cohorts.tagline` | `VARCHAR(80) NULL`（既有列為 NULL；建立時必填） |
| 互動方式 | `cohorts.interaction_modes` | `VARCHAR(20)[] NOT NULL DEFAULT '{}'`，值域 `sync`／`async`／`physical`（比照 `practice_time_periods` 的陣列慣例；值域由 server 常量 `COHORT_INTERACTION_MODES` 管） |
| 會議連結 | `cohorts.meeting_url` | `TEXT NULL` |
| 活動地點 | `cohorts.location` | `VARCHAR(200) NULL` |
| 聚會時段 | 新表 `cohort_sessions` | `session_date DATE`、`start_time TIME`、`end_time TIME`、`position` |
| 收費 | `cohorts.fee_type`、`fee_amount`、`signup_method`、`external_signup_url` | `VARCHAR(10) NOT NULL DEFAULT 'free'`（free|paid）、`INT NULL`、`VARCHAR(20) NOT NULL DEFAULT 'island_form'`（island_form|external）、`TEXT NULL` |
| 私密活動 | `cohorts.is_private` | `BOOLEAN NOT NULL DEFAULT TRUE` |
| 參與者打卡預設私密 | `cohorts.checkin_default_private` | `BOOLEAN NOT NULL DEFAULT FALSE` |
| 發起人留言預設私密 | `cohorts.host_comment_default_private` | `BOOLEAN NOT NULL DEFAULT FALSE` |
| 列在探索活動課程頁面 | **既有 `cohorts.visibility`** | 不變 |
| 在報名頁面顯示邀請訊息 | `cohorts.show_invite_message_on_signup` | `BOOLEAN NOT NULL DEFAULT FALSE` |
| 報名表自訂問題 | 新表 `cohort_signup_questions` + `cohort_signup_answers` | 見 D8 |

**理由**：每個欄位都會被查詢或篩選（探索頁篩線上／實體、報名頁分流付費／外部、隱私旗標進 ACL），放 JSONB 會讓 Prisma 型別與 Zod 脫鉤、也無法建 partial index。聚會時段與報名問題是 1:N 且未來會被日曆區塊／RSVP／名單查詢引用（前一輪 PRD roadmap 已預告 sessions），開表成本低。

**替代方案**：`cohorts.settings JSONB` 一包塞 — 捨棄（型別、索引、drift 檢查全失效）。`cohort_pricing` 獨立表 — 捨棄（1:1 且四個欄位）。`sessions JSONB` — 捨棄（日曆區塊與 RSVP 會按日期查）。

**`is_private` 預設 TRUE** 承接前一輪 PRD「營內容預設不進公共靈感牆」；既有 cohort 全部補成 TRUE 但**不回溯改既有實踐的 `privacy_status`**（見 D7），避免 migration 悄悄改變已上線內容的可見性。

### D2：`POST` 只收基本資訊，其餘區段各自 `PATCH`／`PUT`；不引入「草稿場次」概念

**決策**：FR-CS-01 的兩階段對應到 API 就是「`POST /programs/:pid/cohorts` 建立列（基本資訊 + 「建立後立即發佈」→ `status`）→ 拿到 `cohortId` 後，區段二打模板綁定端點、區段三打主頁端點、區段四／五打 `PATCH`、問題打 `PUT .../signup-questions`」。`status='draft'` 就是「還沒對外」的狀態，不再疊一層。

`createCohortSchema` 擴充後的必填：`slug`、`displayName`、`tagline`、`startDate`、`endDate`、`joinDeadline`（FR-VL-01 列為必填；既有 API 為 optional，改為必填會讓沒帶的舊客戶端 400——f2e 是唯一客戶端，一起改）、`interactionModes`（≥1）、`feeType`。`capacity` 維持 nullable（null = 不限，「不限」toggle 是純前端表現）。

`updateCohortSchema` 全部 optional，但 server 對「組合欄位」做正規化（D3、D4）。

**理由**：區塊與問題是子資源，塞進一個巨大 `POST` 會讓驗證、錯誤回報與樂觀更新都難做；FRD 也明說其他區段在建立前是 disabled。

**替代方案**：單一 `PUT /cohorts/:id/setup` 全量覆寫 — 捨棄。新增 `status='setup'` — 捨棄（`draft` 語意已足夠，且探索頁／加入流程已依 `published` 判斷）。

### D3：收費規則在 server 正規化

- `feeType='paid'` ⇒ `feeAmount` 必填（正整數，NT$）、`signupMethod` 強制 `'external'`、`externalSignupUrl` 必填（https）。
- `feeType='free'` ⇒ `feeAmount` 清為 NULL；`signupMethod='external'` 時 `externalSignupUrl` 必填；`signupMethod='island_form'` 時 `externalSignupUrl` 清為 NULL。
- `PATCH` 只帶部分欄位時，以「更新後的合併結果」驗證（同 `update` 對日期的做法），不符回 400 並指名欄位。

**理由**：FRD 的 tooltip 明說「島島不會收到報名資料」，付費 = 外部，這條規則不能只靠前端。

### D4：隱私連動在 server 正規化，`visibility` 不變

- `isPrivate=false` ⇒ `checkinDefaultPrivate`、`hostCommentDefaultPrivate` 一律寫成 `false`（自動覆寫，不 400——`PATCH { isPrivate:false }` 單獨送來時 server 必須把另外兩個也關掉，否則會留下不一致列）。
- `isPrivate=true` ⇒ 另外兩個依輸入。
- 回應永遠回正規化後的值，前端以回應為準。
- `visibility`（列在探索頁）與 `isPrivate` 正交：公開列出但私密活動是合法組合（「讓人找得到，但內容只給成員」）。

### D5：`interaction_modes` 為陣列欄位，`sync`／`physical` 的附屬欄位不強制

- `meetingUrl` 只在 modes 含 `sync` 時保留，否則清 NULL；`location` 同理對 `physical`；`sessions` 只在含 `sync` 或 `physical` 時保留，否則清空。
- **不**強制「選了 sync 就必填 meetingUrl」：FR-VL-01 的必填清單沒有列它們，實務上會議連結常在開課前才拿到。
- `async` 只記事實；報名頁文案「以島島群組訊息進行」與訊息功能依賴 #154。

### D6：場次活動主頁 = spaces 區塊系統改掛 cohort（翻案 2026-09-02 決策）

**決策**：`space_home_pages` 改為「頁面擁有者二擇一」——`space_id` 放寬為 NULL、新增 `cohort_id INT NULL UNIQUE`、`CHECK ((space_id IS NULL) <> (cohort_id IS NULL))`。`space_blocks`／`space_block_links`／`space_block_link_practices`／`space_block_events` 四張內容表**不動結構語意，只加欄位**。`space.service.ts` 把「以 page 為單位的區塊 CRUD／排序／發佈／序列化」抽成 `space-block-engine.service.ts`（輸入 `pageId` + 已驗證的操作者角色，不再碰 `spaces`／`space_members`）；`space.service.ts` 與新的 `cohort-home-page.service.ts` 各自負責「找到 page 與判斷角色」再呼叫 engine。

角色對應：

| 檢視者 | 判定 | 看得到 |
|---|---|---|
| host | 該 cohort 所屬組織的 `organization_members` | 全部區塊（含草稿），附狀態徽章 |
| member | `cohort_enrollments` status=joined | `publish_status` 有效為 published 的區塊（public + members） |
| public | 報名頁／探索詳情的匿名或未加入者 | published 且 `visibility='public'` 的區塊 |

cohort 的 page 在第一次 `POST .../home-page/blocks` 時由 server 自動建立（`status='published'`——FRD 沒有頁面層級的發佈，區塊各自管發佈），不需要 `POST /home-page` 與 `/home-page/publish`。

新增／調整欄位：

| 欄位 | 用途 | 對 legacy space 的影響 |
|---|---|---|
| `space_blocks.visibility VARCHAR(20) NOT NULL DEFAULT 'members'`（public|members） | FR-HP-02 公開／限成員 toggle | `getPublicSpace` 維持不看此欄（行為不變） |
| `space_block_links.template_id INT NULL FK practice_templates ON DELETE SET NULL` | FR-HP-04 資源指定所屬實踐（單選；cohort 語境的「實踐」是模板） | 不使用 |
| `space_block_events.description TEXT NULL` | FR-HP-05 活動描述（rich text） | 不使用 |

「從實踐模版匯入資源」不加端點：模板列表 API 已回 `resources[]`，前端匯入後以 `PATCH links[]` 全量覆寫（既有 blur-save 模式），去重以 `url`（空 url 則以 `name`）為 key。區塊複製新增 `POST .../blocks/:id/duplicate`（標題加「（複本）」、`publish_status='draft'`、`position` 緊接原區塊、子列全複製）。

**為什麼翻案**：2026-09-02 決策「閒置」的前提是「FRD 未要求」；#171 明確要求且三種區塊、狀態、排序、rich text 與現有實作重疊 90% 以上。重寫一套 `cohort_home_pages` 等於複製 682 行 service + 1,200 行元件再分叉維護。

**為什麼是 page 級 owner，不是 `spaces` 1:1 影子列**：影子列要塞 `owner_user_id NOT NULL`（cohort 沒有單一 owner）、`name` 要跟 `display_name` 同步、`space_members` 要跟 `cohort_enrollments` 同步——三個同步點都是 bug 溫床。page 級 owner 只多一個 nullable FK 與一條 CHECK。

**替代方案**：(a) 重建 `cohort_home_pages`+`cohort_blocks`… — 捨棄（分叉維護）。(b) `spaces.cohort_id` 影子列 — 捨棄（同步點）。(c) 把五張內容表改名為 `home_page_*` — 本輪不做（改名 migration 會動 084 建立的 FK／index 名，收益只有可讀性；在 schema COMMENT 註明「亦供 cohort 使用」即可，日後可另案改名）。

**留下的閒置**：`spaces`／`space_members`／`space_practices` 三表、`/api/v1/spaces/*` 端點、`/spaces/[id]` 頁面維持現況，不刪不改行為。

### D7：隱私旗標——本輪強制 `is_private`，另兩旗標只存不強制

**決策**：

1. `is_private` 決定 cohort 實踐（`practices.cohort_id = 此 cohort` 且 `creation_source='cohort_template'`）的 `privacy_status`：`true → 'private'`、`false → 'public'`。
   - 加入時 `ensureCohortDrafts` 依當下旗標寫入。
   - `PATCH` 切換 `isPrivate` 時，同一交易內 `updateMany` 該 cohort 尚未退出成員的上述實踐（退出者已轉個人實踐，`cohort_id` 為 NULL，天然排除）。
   - 新增 `cohort-acl.service.ts`：lighthouse cohort 實踐的 `privacyStatus` 由場次統一設定，學員 `PATCH /practices/:id` 帶 `privacyStatus` 回 400（比照 `assertChallengePracticeUpdatable`）。
   - 效果：私密活動的打卡在一般實踐頁／靈感牆／個人頁對非本人不可見（既有 `private` 語意），但 **cohort 動態牆（教練＋同期學員）仍看得到**（`cohort-feed.service` 不看 `privacy_status`）——這正是 FRD「打卡與互動僅公開於在此場次」。
2. `checkin_default_private`、`host_comment_default_private`：存值、回傳、報名頁隱私說明引用；**不**改任何打卡／留言查詢。UI 的 toggle 旁標示「設定將於打卡隱私功能上線後生效」。
3. `comments`：本輪不動。「私密活動關閉後留言公開」在現況下等同「留言跟著打卡可見性」——打卡公開時留言本來就公開。

**理由**：逐則打卡隱私（「參與者仍可選定在此場次內公開特定打卡」）需要 `practice_checkins` 新增 cohort 範圍的隱私欄位、改 `getCheckIns`／showcase／feed／comment 的五處過濾，並與前一輪 PRD 已「緩議」的「僅自己」決策對齊——這是一個獨立 change 的量。而 `is_private` 用既有 `privacy_status` 就能達到 FRD 描述的效果，且修正了現況「cohort 草稿一律 public」與 PRD 原則 2 的矛盾。

**風險**：
- [切換 `isPrivate` 會覆寫學員曾手動設定的 `privacy_status`] → 加 ACL 鎖之後學員不能再改，只有 migration 前的既有資料可能被覆寫；`PATCH` 回應帶 `affectedPracticeCount`，f2e 在 confirm 對話框顯示「將影響 N 個實踐的可見性」。
- [既有 cohort 的 `is_private` 預設 TRUE 但實踐仍是 public] → migration 不回溯；燈塔面板在區段四顯示「此場次有 N 個實踐與目前設定不一致」＋「套用」按鈕（= `PATCH { isPrivate: true }`），由帶領人決定。
- [兩個不強制的 toggle 讓使用者以為有效] → UI 標示 + 報名頁隱私說明只引用已強制的旗標。

### D8：報名表問題與答案

```
cohort_signup_questions
  id, cohort_id FK, position INT, label VARCHAR(200), question_type VARCHAR(20)
  (short_text | long_text | single_choice | multi_choice), options JSONB NULL (string[]),
  is_required BOOLEAN DEFAULT FALSE, created_at, updated_at, deleted_at
cohort_signup_answers
  id, enrollment_id FK cohort_enrollments, question_id FK cohort_signup_questions,
  answer JSONB (string | string[]), created_at
  UNIQUE (enrollment_id, question_id)
```

- 問題以 `PUT /programs/:pid/cohorts/:cid/signup-questions` 全量覆寫（body `questions[]`，帶 `id` 者更新、無 `id` 者新增、缺席者 `deleted_at`——**軟刪除**以保留已收到的答案）。上限 20 題、選項上限 10。
- 「怎麼稱呼你」「Email」不入表（Google 帳號帶入），前端固定顯示。
- 加入流程：`GET /cohorts/join/:token` 回 `questions[]`（未刪除、依 position）；`POST /cohorts/join/:token` body 擴為 `{ consent: true, answers?: [{ questionId, value }] }`。server 驗證：必填題缺答 400、選擇題的值必須在 options 內、非本 cohort 的 questionId 400。答案與 enrollment 同交易寫入。
- **只有 `signupMethod='island_form'` 的場次收答案**；外部報名場次 `questions[]` 回空陣列，`answers` 忽略。
- 燈塔 `GET .../participants` 與 `.../enrollments` 每列附 `answers[]`（`{ questionId, label, value }`，label 取當下問題文字；已刪題仍回，標 `deleted: true`）。回傳欄位白名單原則不變：答案是報名者主動填給主辦的內容。
- 邀請信（`invite_token` 路徑）加入者跳過問題（他們是主辦方名單匯入的，主辦已認識）；report 上 `answers=[]`。

**替代方案**：問題存 `cohorts.signup_schema JSONB` + 答案 JSONB 在 enrollment — 捨棄（無法逐題統計、刪題後答案對不回去）。硬刪問題 — 捨棄（答案孤兒）。

### D9：系列複製與級聯封存

- `POST /programs/:pid/duplicate`：只複製 program 本體（`name` 加「（複製）」截 100 字、`description`），**不複製場次**——前一輪 PRD 定案「續開下一期是新 cohort」，系列是主題容器，複製系列的意義是開新主題線；需要複製場次時用場次自己的「複製」。TP-CP-03 說「狀態為 draft」，`programs` 沒有 status，也不新增（系列沒有對外可見性，草稿無意義）；f2e 不顯示系列狀態。
- `DELETE /programs/:pid`（封存）：改為級聯——同一交易內把該系列下 `status <> 'archived'` 的場次全部 `archived`，再寫 `deleted_at`。回應帶 `archivedCohortCount`。f2e confirm 文案帶數字。寫 audit `PROGRAM_ARCHIVED_CASCADE`。
- 兩者皆走既有 `getOwned`（`kind='lighthouse'` 限定），共同挑戰主題不受影響。

### D10：複製場次的深複製範圍

`cohortService.duplicate` 擴充為同一交易內複製：

| 複製 | 不複製 |
|---|---|
| 基本欄位全部（含 D1 新欄位；`visibility` 強制 `private`、`status='draft'`） | `join_token`（新列自帶新 token）、`join_paused` |
| `cohort_sessions` | `cohort_enrollments`、`cohort_signup_answers` |
| `cohort_templates`（既有） | 打卡、實踐、統計快照 |
| `cohort_signup_questions`（未刪除者） | — |
| 主頁：`space_home_pages` + 全部區塊與子列，區塊 `publish_status='draft'`、`scheduled_at=NULL`，`visibility` 沿用 | — |

日期（起訖、截止、時段）原樣複製——與現況一致，帶領人在面板改。

### D11：報名頁與探索頁的資訊揭露邊界

| 欄位 | `GET /activities(/:id)`（匿名） | `GET /cohorts/join/:token`（匿名） | `GET /cohorts/:id`（已加入） |
|---|---|---|---|
| tagline、interactionModes、feeType、feeAmount、signupMethod | ✅ | ✅ | ✅ |
| location、sessions | ❌ 列表／✅ 詳情 | ✅ | ✅ |
| meetingUrl | ❌ | ❌ | ✅ |
| externalSignupUrl | ❌ 列表／✅ 詳情 | ✅ | — |
| inviteMessage | 既有（詳情） | 只在 `showInviteMessageOnSignup=true` 時回，否則 `null` | — |
| 公開區塊（`visibility='public'` 且 published） | ✅ 詳情 | ✅ | ✅（全部 published） |
| questions[] | ❌ | ✅（island_form 才有） | — |
| 隱私說明 `privacy: { isPrivate, checkinDefaultPrivate, hostCommentDefaultPrivate }` | ❌ | ✅ | ✅ |

外部報名場次的報名頁：主 CTA「前往報名頁面」開外部連結；次要 CTA「已完成報名？加入場次」走既有 token join（不收答案）。**風險**：無法驗證是否真的付費／填了外部表單 → 面板 tooltip 建議付費場次「暫停加入連結、改用 email 邀請」，且名單頁既有的移除成員可補救。

### D12：f2e 結構

- `components/lighthouse/programs-manager.tsx` 拆為 `programs-manager.tsx`（列表與系列卡）+ `cohort-setup-panel/`：`panel.tsx`（pill 導覽、兩階段 enable、底部操作列、錯誤跳區段）、`section-basic.tsx`、`section-templates.tsx`、`section-home-page.tsx`、`section-privacy.tsx`、`section-signup.tsx`、`signup-preview.tsx`、`use-cohort-form.ts`（表單狀態與驗證，`zod` 與 server schema 對齊）。
- `components/spaces/space-block-editor|view|resources-editor|calendar-editor|format-toolbar|toc` 搬到 `components/blocks/`，以 `BlockApi` adapter（`update/move/publish/draft/delete/duplicate`）與 `linkTargets: { id, title }[]` 泛化；spaces 頁面改 import 新路徑並傳入 space adapter（行為不變）。
- 學員 `cohort-member-page.tsx` 新增「主頁」分頁（`BlockView` 唯讀）；`cohort-join-page.tsx` 拆出 `cohort-signup-view.tsx`（純展示，吃 view model），燈塔預覽與真實報名頁共用。
- 「預覽活動主頁」= 在燈塔內以 host GET 的資料、過濾 published 後用 `BlockView` 唯讀渲染於 modal，不打學員端點（帶領人通常沒有 enrollment）。
- `?edit=<cohortId>` 深連結 → 開啟面板於「基本資訊」區段並 `scrollIntoView`。

## 資料模型變更（migration SQL）

### `087_cohort_setup_fields.sql`（Phase A）

```sql
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cohorts' AND column_name='tagline') THEN
    ALTER TABLE "cohorts"
      ADD COLUMN "tagline" VARCHAR(80),
      ADD COLUMN "interaction_modes" VARCHAR(20)[] NOT NULL DEFAULT '{}',
      ADD COLUMN "meeting_url" TEXT,
      ADD COLUMN "location" VARCHAR(200),
      ADD COLUMN "fee_type" VARCHAR(10) NOT NULL DEFAULT 'free',
      ADD COLUMN "fee_amount" INTEGER,
      ADD COLUMN "signup_method" VARCHAR(20) NOT NULL DEFAULT 'island_form',
      ADD COLUMN "external_signup_url" TEXT,
      ADD COLUMN "is_private" BOOLEAN NOT NULL DEFAULT TRUE,
      ADD COLUMN "checkin_default_private" BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN "host_comment_default_private" BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN "show_invite_message_on_signup" BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE "cohorts" ADD CONSTRAINT "chk_cohorts_fee_amount_positive" CHECK ("fee_amount" IS NULL OR "fee_amount" > 0);
    COMMENT ON COLUMN "cohorts"."tagline" IS '一句話簡介（≤80 字），顯示於探索卡與報名頁';
    COMMENT ON COLUMN "cohorts"."interaction_modes" IS '互動方式多選：sync | async | physical；值域由 daodao-server 常量管控';
    COMMENT ON COLUMN "cohorts"."fee_type" IS 'free | paid；paid 時 signup_method 必為 external';
    COMMENT ON COLUMN "cohorts"."signup_method" IS 'island_form | external；值域由 daodao-server 管控';
    COMMENT ON COLUMN "cohorts"."is_private" IS '私密活動：TRUE 時 cohort 實踐 privacy_status 為 private；FALSE 時 checkin_default_private / host_comment_default_private 必為 FALSE';
    COMMENT ON COLUMN "cohorts"."checkin_default_private" IS '參與者打卡預設私密（本輪僅存值，強制行為另案）';
    COMMENT ON COLUMN "cohorts"."host_comment_default_private" IS '發起人留言預設私密（本輪僅存值，強制行為另案）';
    RAISE NOTICE '已新增 cohorts 場次設定欄位';
  ELSE
    RAISE NOTICE 'cohorts.tagline 已存在，跳過';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "cohort_sessions" (
  "id"           SERIAL PRIMARY KEY,
  "cohort_id"    INTEGER NOT NULL,
  "session_date" DATE NOT NULL,
  "start_time"   TIME,
  "end_time"     TIME,
  "position"     INTEGER NOT NULL DEFAULT 0,
  "created_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "fk_cohort_sessions_cohort" FOREIGN KEY ("cohort_id") REFERENCES "cohorts"("id") ON DELETE CASCADE,
  CONSTRAINT "chk_cohort_sessions_time_order" CHECK ("start_time" IS NULL OR "end_time" IS NULL OR "start_time" < "end_time")
);
CREATE INDEX IF NOT EXISTS "idx_cohort_sessions_cohort_date" ON "cohort_sessions" ("cohort_id", "session_date", "position");
COMMENT ON TABLE "cohort_sessions" IS '場次聚會時段（FR-BS-03）；僅 interaction_modes 含 sync/physical 時有列';
```

回寫 `schema/393_create_table_cohorts.sql`（欄位、CHECK、COMMENT）與新增 `schema/<下一序號>_create_table_cohort_sessions.sql`。

### `088_space_blocks_for_cohorts.sql`（Phase B）

```sql
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='space_home_pages' AND column_name='cohort_id') THEN
    ALTER TABLE "space_home_pages" ALTER COLUMN "space_id" DROP NOT NULL;
    ALTER TABLE "space_home_pages" ADD COLUMN "cohort_id" INTEGER;
    ALTER TABLE "space_home_pages" ADD CONSTRAINT "fk_space_home_pages_cohort" FOREIGN KEY ("cohort_id") REFERENCES "cohorts"("id") ON DELETE CASCADE;
    ALTER TABLE "space_home_pages" ADD CONSTRAINT "uq_space_home_pages_cohort_id" UNIQUE ("cohort_id");
    ALTER TABLE "space_home_pages" ADD CONSTRAINT "chk_space_home_pages_owner" CHECK (("space_id" IS NULL) <> ("cohort_id" IS NULL));
    COMMENT ON TABLE "space_home_pages" IS '主頁容器；擁有者為 space 或 cohort 二擇一（cohort 為燈塔場次活動主頁，FRD #171）';
    ALTER TABLE "space_blocks" ADD COLUMN "visibility" VARCHAR(20) NOT NULL DEFAULT 'members';
    COMMENT ON COLUMN "space_blocks"."visibility" IS 'public | members；public 的已發佈區塊會出現在報名頁與探索詳情';
    ALTER TABLE "space_block_links" ADD COLUMN "template_id" INTEGER;
    ALTER TABLE "space_block_links" ADD CONSTRAINT "fk_space_block_links_template" FOREIGN KEY ("template_id") REFERENCES "practice_templates"("id") ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS "idx_space_block_links_template_id" ON "space_block_links" ("template_id");
    COMMENT ON COLUMN "space_block_links"."template_id" IS '資源所屬實踐模版（cohort 主頁用；space 主頁用 space_block_link_practices）';
    ALTER TABLE "space_block_events" ADD COLUMN "description" TEXT;
    RAISE NOTICE '已讓 space 區塊表支援 cohort 主頁';
  ELSE
    RAISE NOTICE 'space_home_pages.cohort_id 已存在，跳過';
  END IF;
END $$;
```

回寫 084 建立的 spaces schema 檔（`space_home_pages`、`space_blocks`、`space_block_links`、`space_block_events`）。Prisma：`space_home_pages.space_id Int?`、`spaces space_home_pages?` 關聯改可選、新增 `cohort cohorts?`、`cohorts.space_home_page space_home_pages?`。

### `089_cohort_signup_questions.sql`（Phase C）

```sql
CREATE TABLE IF NOT EXISTS "cohort_signup_questions" (
  "id"            SERIAL PRIMARY KEY,
  "cohort_id"     INTEGER NOT NULL,
  "position"      INTEGER NOT NULL DEFAULT 0,
  "label"         VARCHAR(200) NOT NULL,
  "question_type" VARCHAR(20) NOT NULL,
  "options"       JSONB,
  "is_required"   BOOLEAN NOT NULL DEFAULT FALSE,
  "created_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"    TIMESTAMPTZ,
  "deleted_at"    TIMESTAMPTZ,
  CONSTRAINT "fk_cohort_signup_questions_cohort" FOREIGN KEY ("cohort_id") REFERENCES "cohorts"("id") ON DELETE CASCADE,
  CONSTRAINT "chk_cohort_signup_questions_type" CHECK ("question_type" IN ('short_text','long_text','single_choice','multi_choice'))
);
CREATE INDEX IF NOT EXISTS "idx_cohort_signup_questions_cohort_position" ON "cohort_signup_questions" ("cohort_id", "position") WHERE "deleted_at" IS NULL;

CREATE TABLE IF NOT EXISTS "cohort_signup_answers" (
  "id"            SERIAL PRIMARY KEY,
  "enrollment_id" INTEGER NOT NULL,
  "question_id"   INTEGER NOT NULL,
  "answer"        JSONB NOT NULL,
  "created_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "fk_cohort_signup_answers_enrollment" FOREIGN KEY ("enrollment_id") REFERENCES "cohort_enrollments"("id") ON DELETE CASCADE,
  CONSTRAINT "fk_cohort_signup_answers_question" FOREIGN KEY ("question_id") REFERENCES "cohort_signup_questions"("id") ON DELETE CASCADE,
  CONSTRAINT "uq_cohort_signup_answers_enrollment_question" UNIQUE ("enrollment_id", "question_id")
);
COMMENT ON TABLE "cohort_signup_questions" IS '報名表自訂問題（FR-SU-02）；刪題為軟刪除以保留答案';
COMMENT ON TABLE "cohort_signup_answers" IS '報名答案；僅 signup_method=island_form 且經 join_token 加入者有列';
```

## API contract 摘要（供 f2e types 同步）

```ts
// constants
COHORT_INTERACTION_MODES = ['sync','async','physical']
COHORT_FEE_TYPES = ['free','paid']
COHORT_SIGNUP_METHODS = ['island_form','external']
BLOCK_VISIBILITIES = ['public','members']
SIGNUP_QUESTION_TYPES = ['short_text','long_text','single_choice','multi_choice']

// cohort.validators.ts
cohortSessionInputSchema = { sessionDate: 'YYYY-MM-DD', startTime: 'HH:MM'|null, endTime: 'HH:MM'|null }
cohortSessionSchema      = cohortSessionInputSchema & { id }
createCohortSchema = {
  slug, displayName, tagline: string(1..80), startDate, endDate, joinDeadline: date (必填),
  capacity: int|null, inviteMessage?, showInviteMessageOnSignup?: bool (default false),
  interactionModes: enum[] (min 1), meetingUrl?: url|null, location?: string(≤200)|null,
  sessions?: cohortSessionInputSchema[] (≤50),
  feeType: 'free'|'paid', feeAmount?: int|null, signupMethod?: 'island_form'|'external', externalSignupUrl?: url|null,
  isPrivate?: bool (default true), checkinDefaultPrivate?: bool, hostCommentDefaultPrivate?: bool,
  visibility?: 'private'|'public' (default private), status?: 'draft'|'published' (default draft)
}  // refine：D3 收費規則、D4 隱私連動（正規化）、D5 附屬欄位清理、起訖日
updateCohortSchema = 上述全部 optional（至少一欄）；server 以合併結果套同一組 refine
cohortResponseSchema += tagline: string|null, interactionModes: enum[], meetingUrl, location,
  sessions: cohortSessionSchema[], feeType, feeAmount, signupMethod, externalSignupUrl,
  isPrivate, checkinDefaultPrivate, hostCommentDefaultPrivate, showInviteMessageOnSignup,
  hasHomePage: bool, signupQuestionCount: int
cohortUpdateResultSchema = cohortResponseSchema & { affectedPracticeCount?: int }  // PATCH 切 isPrivate 時附
programArchiveResultSchema = { programId, archivedCohortCount }
programResponseSchema（duplicate 回傳同 programResponseSchema）

// cohort-signup.validators.ts
signupQuestionInputSchema = { id?: int, label: string(1..200), questionType, options?: string[](1..10), isRequired: bool }
putSignupQuestionsSchema  = { questions: signupQuestionInputSchema[] (≤20) }   // 選擇題 options 必填
signupQuestionSchema      = signupQuestionInputSchema & { id, position }
signupAnswerSchema        = { questionId, label, value: string|string[], deleted: bool }

// cohort-home-page.validators.ts（沿用 space.validators 的 block schema 並擴充）
blockSchema += visibility: 'public'|'members'
blockLinkInputSchema += templateId?: int|null      // cohort 用；practiceIds 仍存在供 space 用
blockEventInputSchema += description?: string|null
updateBlockSchema += visibility?: 'public'|'members'
cohortHomePageResponseSchema = { status: 'published', blocks: blockSchema[] }
publicBlocksSchema = blockSchema[]（只含 published + public）

// cohort-join.validators.ts
cohortJoinInfoResponseSchema += tagline, interactionModes, location, sessions, feeType, feeAmount,
  signupMethod, externalSignupUrl, capacity, joinDeadline, participantCount,
  questions: signupQuestionSchema[], publicBlocks: blockSchema[],
  privacy: { isPrivate, checkinDefaultPrivate, hostCommentDefaultPrivate }
  // inviteMessage 只在 showInviteMessageOnSignup 時非 null
joinCohortSchema = { consent: literal(true), answers?: [{ questionId: int, value: string|string[] }] }
cohortMemberHomeResponseSchema += tagline, interactionModes, meetingUrl, location, sessions, feeType, privacy
// 新端點
GET /api/v1/cohorts/:cohortId/home-page  → cohortHomePageResponseSchema（joined 成員；published 區塊）

// activity.validator.ts
activitySummarySchema += tagline: string|null, interactionModes: enum[], feeType, feeAmount: int|null, signupMethod
activityDetailResponseSchema += location, sessions, externalSignupUrl, publicBlocks: blockSchema[]
activityListQuerySchema = { mode?: 'sync'|'async'|'physical' }   // 探索頁篩選

// 燈塔新端點（皆 requireOrganizationMember）
POST   /api/v1/lighthouse/programs/:programId/duplicate
PUT    /api/v1/lighthouse/programs/:programId/cohorts/:cohortId/sessions            { sessions[] }（亦可經 PATCH cohort 帶 sessions）
PUT    /api/v1/lighthouse/programs/:programId/cohorts/:cohortId/signup-questions    putSignupQuestionsSchema
GET    /api/v1/lighthouse/programs/:programId/cohorts/:cohortId/home-page           host 視圖（page 不存在回 { status:'published', blocks:[] }）
POST   /api/v1/lighthouse/programs/:programId/cohorts/:cohortId/home-page/blocks    { blockType }（lazy 建 page）
PATCH  /api/v1/lighthouse/programs/:programId/cohorts/:cohortId/home-page/blocks/:blockId
POST   .../home-page/blocks/:blockId/move | publish | draft | duplicate
DELETE .../home-page/blocks/:blockId
// participants / enrollments 回應每列 += answers: signupAnswerSchema[]
```

## Risks / Trade-offs

- [`createCohortSchema` 必填欄位增加（tagline、joinDeadline、interactionModes）會讓舊前端 400] → server 與 f2e 同一 Phase 上線；server 先部署期間舊表單建立會失敗——以 dev 環境驗證後同日部署，或 server 先以 optional 上線、f2e 接上後再收緊（tasks 採後者：A-2.2 先 optional + 註記，A-3.x 上線後 A-4.1 收緊）。
- [`is_private` 切換覆寫實踐隱私] → D7 的 confirm 與 `affectedPracticeCount`。
- [翻案 spaces 決策後，`space.service.ts` 重構可能動到閒置但有測試的 `/spaces/*`] → engine 抽出時既有 space 整合測試必須維持綠；`getPublicSpace` 明確不看 `visibility`。
- [外部報名場次無付款驗證] → 面板 tooltip 建議暫停連結改 email 邀請；名單頁移除成員。
- [`joinDeadline` 改必填但既有列為 NULL] → `PATCH` 不強制；只在 create 必填；`deriveJoinability` 既有的「NULL = 到結束日」邏輯保留。
- [`interaction_modes` 陣列欄位的值域沒有 DB CHECK] → 沿用 `programs.kind`／`cohorts.visibility` 慣例，值域由 server 常量與 `schema-sync-check` 管。
- [`space_home_pages.space_id` 放寬 NULL 後 Prisma 關聯型別改變] → `space.service.ts` 內對 `page.space_id` 的使用要加 non-null 守衛；typecheck 會抓。
- [報名答案含個資（自由文字）] → 只回給組織成員；匯出（`outcome/export`）**不**帶答案；帳號刪除匿名化流程（`cohort-anonymization.service`）要一併清 `cohort_signup_answers`。
- [i18n key 數量大（估 120+）] → 每個 Phase 的 f2e 任務各自補 key，不集中一次。

## Migration Plan

1. 每個 Phase：storage PR（migration + schema 回寫）→ dev 套用 → server PR（prisma、API、openapi 生成物）→ f2e PR（types 同步、UI）。
2. 回滾：三支 migration 皆為加欄位／加表／放寬 NOT NULL，不刪資料；回滾 server 即可，欄位留著無害。088 的 `CHECK chk_space_home_pages_owner` 對既有 space 列成立（`space_id` 非 NULL、`cohort_id` NULL）。
3. Phase A 上線後跑一次性 script 產出「`is_private=true` 但實踐 public」的 cohort 清單，交由帶領人在面板套用（不自動回溯）。

## Open Questions

- OQ-1：`checkin_default_private`／`host_comment_default_private` 的強制何時做？預設：另開 change `cohort-content-visibility`，等 #154 群組訊息落地後一起設計逐則隱私（不影響本 change 的 specs／tasks）。
- OQ-2：探索頁列表是否也要回 `location`？預設：列表不回（卡片空間有限、地點屬詳情），詳情回。
- OQ-3：系列複製是否要連同「未封存的場次」一起深複製？預設：不（D9），若第一批帶領人回饋需要再加 `?withCohorts=true`。
