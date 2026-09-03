# Proposal: 燈塔建立系列與場次——場次設定面板

> 2026-09-03 依 issue daodaoedu/daodao#171 的 FRD（Google Doc 1VmkffdRLSaJdaOZ4Sp_PPrAC-mb-blwwluMBAEFpHDg）與 server／f2e 實地盤點產出。上游：2026-09-02 歸檔的 `challenge-activity-space-wiring`（活動 = lighthouse cohort、`cohorts.visibility`、探索頁真資料）。相依：issue #154 群組訊息（另案 `group-messages`）、issue #173 一般使用者建活動（暫緩）。

## Why

燈塔的「系列／場次」頁面已上線（server `organization.routes.ts`、f2e `programs-manager.tsx`），但場次表單只有 slug、名稱、起訖日、截止日、人數、邀請訊息、公開開關八個欄位——帶領人無法描述「這個活動怎麼進行、在哪裡、收不收費、報名要填什麼、參與者進來看到什麼」。探索活動頁上線後這個缺口變成對外可見：卡片沒有簡介、線上／實體、費用，報名頁只有一個同意勾選框。FRD #171 把場次設定重整為五個區段（基本資訊／連結實踐模版／場次活動主頁／隱私／報名設定），本 change 負責把這五個區段落到資料模型、API 與燈塔前端。

## FRD 要求 vs. 現況對照（2026-09-03 程式碼實查）

| FRD 條目 | 現況（程式碼實查） | 缺口 |
|---|---|---|
| FR-PC-01 頁面標頭、「建立系列」按鈕 | ✅ `programs-manager.tsx` 已有 eyebrow／H1／說明／按鈕，內嵌展開表單 | 無 |
| FR-PC-02 系列卡片：編輯、複製、封存 | ✅ 編輯、封存；❌ 複製（無 API 也無 UI）；❌ context menu（現為兩顆按鈕） | `POST /programs/:id/duplicate`、⋮ 選單 |
| FR-PC-03 場次列：狀態標籤、「尚未綁定模板」badge、摘要、邀請區塊、發佈／編輯／管理 | ✅ 全部存在，且 **QR code 已用 `qrcode` 套件實作**（`join-code.tsx`，非占位）；❌ 摘要缺「公開／私密、收費」；❌ 複製（server `POST .../cohorts/:id/duplicate` 已有、f2e 未接）；❌ 封存只在 published 顯示；❌「以 email 邀請成員」按鈕 | 摘要補欄位、⋮ 選單接複製／封存、email 邀請按鈕導向名單頁 |
| TP-CP-03 複製系列產生「{原名}（複製）」且狀態 draft | ❌ `programs` 表**沒有 status 欄位**（只有 `deleted_at`） | 新增複製 API；「draft」無對應，見 design D9 |
| TP-CP-04 封存系列 → 所有場次 archived | ❌ `programService.archive` 目前**有場次就拒絕**（409） | 改為級聯封存，見 design D9 |
| FR-CP-01 建立系列表單 | ✅ 完整 | 無 |
| FR-CS-01 內嵌五區段面板、兩階段（基本資訊存檔後才 enable 其他區段） | ❌ 現為單一 grid 表單；`?edit=<cohortId>` 深連結已有 | 面板重寫，保留深連結 |
| FR-CS-02 底部操作列、驗證錯誤跳區段 | ❌ | f2e |
| FR-BS-01 場次名稱、**一句話簡介（≤80）**、slug、起訖日、截止日、人數上限＋「不限」 | ✅ 名稱／slug／日期／截止／人數；❌ 一句話簡介（無欄位）；「不限」以空值表示、無 toggle | `cohorts.tagline` |
| FR-BS-02 互動方式多選＋會議連結＋活動地點 | ❌ 無任何欄位 | `interaction_modes[]`、`meeting_url`、`location` |
| FR-BS-03 聚會時段 | ❌ | 新表 `cohort_sessions` |
| FR-BS-04 收費：免費／付費、費用、報名方式、外部連結 | ❌ | `fee_type`、`fee_amount`、`signup_method`、`external_signup_url` |
| FR-BS-05 建立後生成邀請連結與 QR、enable 其他區段 | ✅ `join_token` DB 預設生成、QR 已有；❌ 區段 enable（無面板） | f2e |
| FR-PT-01 模版搜尋、checkbox 列表、模糊過濾 | 部分：建立表單勾選模板（預設全勾）；❌ 搜尋／過濾；❌ 編輯模式改綁（只能去模板庫頁） | f2e |
| FR-PT-02 每個實踐獨立開始日＋依模版天數算結束日 | ✅ **API 齊備**：`cohort_templates.start_date`（per-binding）、`practice_templates.duration_days`、`PUT /organizations/:oid/templates/:tid/cohorts/:cid {startDate}`、模板列表回 `durationDays` 與 `bindings[]`；❌ UI | f2e；結束日 = 開始日 + durationDays − 1（與 `cohort-draft.service.addDays` 一致） |
| FR-HP-01～05 活動主頁三種區塊 | ✅ **區塊系統已存在但掛在 `spaces`**：8 張表（migration 084）、14 個 `/api/v1/spaces/*` 端點、f2e 7 個元件（`space-block-editor` 383 行、`space-resources-editor`、`space-calendar-editor`、`space-format-toolbar`、`space-block-view`、`space-home-tab`、`space-toc`）；但 server 沒有建立 space 的 API，cohort 無法使用；❌ 區塊「公開／限成員」toggle（`space_blocks` 無 visibility 欄）；❌ 區塊複製；❌ 資源「從實踐模版匯入」與「指定所屬實踐」（現有 `space_block_link_practices` 對到學員 practice，不是模板）；❌ 日曆活動描述欄位 | 把區塊系統改掛 cohort（design D6，**翻案 2026-09-02「spaces 八張表閒置」決策**） |
| FR-PV-01 四個隱私 toggle | ✅ 「列在探索活動課程頁面」= 既有 `cohorts.visibility`（public/private）；❌ 私密活動、參與者打卡預設私密、發起人留言預設私密 | 三個 boolean 欄位 |
| FR-PV-02 私密活動關閉 → 兩個 toggle 強制關閉 | ❌ | server 正規化＋f2e 連動 |
| 隱私下游行為（打卡／留言可見範圍） | 現況：cohort 草稿以 `privacy_status='public'` 建立，打卡對所有人公開；`challenge-acl.service` 只管 `kind='challenge'`；`practice_checkins` **沒有**逐則隱私欄位 | 見 design D7（本輪只強制 `is_private`，另兩旗標存值不強制） |
| FR-SU-01 邀請訊息＋「在報名頁面顯示」checkbox | ✅ `invite_message`；❌ 顯示旗標與必填連動 | `show_invite_message_on_signup` |
| FR-SU-02 報名表自訂問題 | ❌ 全無；`POST /cohorts/join/:token` 只收 `consent: true` | 新表 `cohort_signup_questions`、`cohort_signup_answers` |
| FR-SU-04／05 報名頁預覽（內嵌＋modal） | ❌ | f2e（純前端） |
| FR-VL-01／02 驗證與儲存 | 部分：server 驗證 slug 格式、起訖日；「建立後立即發佈」✅ | 新欄位驗證、付費／外部連結連動 |
| 學員端加入流程 `/cohorts/join/[joinToken]` | ✅ 預覽 → 同意 → 加入 → 自動建草稿 | 報名頁需顯示簡介、互動方式、時段、費用、名額；付費／外部報名走外部連結；自訂問題 Step 2 |
| 探索頁 `/activities` 卡片 | ✅ 真資料；`activitySummary` 沒有簡介／互動方式／費用 | 補欄位，篩選加「線上／實體」 |

## 已確認的產品決策

| 問題 | 決策 |
|---|---|
| 使用者範圍 | 仍限燈塔組織會員（`requireOrganizationMember`）；#173 一般使用者建活動暫緩，不在本 change |
| 「線上非同步：以島島群組訊息進行」 | 只存 `interaction_modes` 含 `async` 的事實；群組訊息本身依賴 #154（`group-messages` change，另人同時起草），本 change **不設計訊息** |
| 場次活動主頁 | 沿用 spaces 區塊系統改掛 cohort，不另建一套（design D6）；翻案 2026-09-02「spaces 八張表保留不動、閒置」 |
| 「列在探索活動課程頁面」 | 就是既有 `cohorts.visibility`，不新增欄位 |
| 私密活動旗標的行為 | **PM 2026-09-03 拍板**：本輪強制 `is_private`，且關閉私密時**既有**打卡與留言一起變公開（D7 回溯）；「打卡預設私密」「發起人留言預設私密」存值＋顯示，不強制（需要逐則打卡隱私欄位，另案） |
| 探索活動頁 | **PM 拍板**：探索頁有自己的 FRD（issue #152「活動探索頁」），列表卡片欄位與篩選以 #152 為準；本 change 的 `activity-discovery` delta 只補後端資料揭露（簡介、互動方式、收費、詳情的地點／時段／外部報名連結），不定義探索頁 UI |
| 建立場次兩階段 | 一次 `POST`（基本資訊）→ 其餘區段各自 `PATCH`／`PUT`；不引入新的「草稿」概念（`status='draft'` 已足夠） |
| QR code | 現況已實作，不做占位 |
| 分期 | 三個 Phase（見下），specs 涵蓋全部，tasks 依 Phase 分組 |

## What Changes

- **新增** `cohorts` 欄位：`tagline`（≤80）、`interaction_modes[]`（sync/async/physical）、`meeting_url`、`location`、`fee_type`／`fee_amount`／`signup_method`／`external_signup_url`、`is_private`／`checkin_default_private`／`host_comment_default_private`、`show_invite_message_on_signup`
- **新增** 表 `cohort_sessions`（聚會時段）、`cohort_signup_questions`（報名表自訂問題）、`cohort_signup_answers`（報名答案）
- **修改** `space_home_pages` 加 `cohort_id`（與 `space_id` 二擇一）、`space_blocks` 加 `visibility`（public/members）、`space_block_links` 加 `template_id`、`space_block_events` 加 `description`；spaces 區塊服務抽成共用 block engine，供 cohort 與（閒置中的）space 共用
- **修改** 燈塔 cohort API：`createCohortSchema`／`updateCohortSchema`／`cohortResponseSchema` 全面擴充；`duplicate` 深複製範圍擴大（新欄位、時段、模板綁定、主頁區塊、報名問題）；`PATCH` 對隱私與收費做正規化
- **新增** 燈塔端點：`POST /programs/:id/duplicate`、`PUT .../cohorts/:id/sessions`、`PUT .../cohorts/:id/signup-questions`、`GET/POST/PATCH/DELETE .../cohorts/:id/home-page(/blocks/...)`、`POST .../blocks/:id/duplicate`
- **修改** `programService.archive`：有場次時改為級聯封存（全部場次 → archived），不再 409
- **修改** 學員端：`GET /cohorts/join/:token` 回傳簡介、互動方式（不含會議連結）、地點、時段、費用、名額、自訂問題、公開區塊；`POST /cohorts/join/:token` 收 `answers[]`；`GET /cohorts/:id` 學員首頁多會議連結與主頁區塊；新增 `GET /cohorts/:id/home-page`
- **修改** `GET /api/v1/activities(/:id)`：summary 多 `tagline`、`interactionModes`、`feeType`、`feeAmount`、`signupMethod`
- **修改** 燈塔 `GET .../participants`／`enrollments`：附報名答案
- **修改** f2e：`programs-manager.tsx` 場次表單重寫為五區段內嵌面板（保留 `?edit=<cohortId>` 深連結）；spaces 區塊元件抽成通用 `blocks/*` 供燈塔重用；學員 `/cohorts/[cohortId]` 加「主頁」分頁；`/cohorts/join/[joinToken]` 加資訊區、外部報名分流、Step 2 問題表單；`/activities` 卡片補簡介／互動方式／費用
- **不改** admin-ui（共同挑戰不讀新欄位，DB 有預設值）；ai-backend 不讀新欄位

## Capabilities

### New Capabilities

- `program-management`：系列與場次頁面、系列複製、系列級聯封存、場次列摘要與 context menu
- `cohort-basic-setup`：場次設定面板骨架（五區段、兩階段）、基本資訊（簡介／互動方式／會議連結／地點／聚會時段／收費）、複製場次的深複製範圍、驗證規則
- `cohort-practice-linking`：連結實踐模版區段——搜尋選取、每個實踐獨立開始日、依模版天數推算結束日
- `cohort-home-page`：場次活動主頁——三種區塊掛在 cohort、區塊可見性、複製、資源指定實踐模版、日曆活動描述、學員與公開視圖
- `cohort-privacy`：四個隱私旗標、連動規則、`is_private` 對 cohort 實踐隱私的強制、報名頁隱私說明
- `cohort-signup`：邀請訊息顯示旗標、報名表自訂問題與答案、報名頁資訊與外部報名分流、報名頁預覽

### Modified Capabilities

- `activity-discovery`：「探索活動頁公開列表端點」每筆回傳欄位增加一句話簡介、互動方式、收費資訊，並提供 `?mode=` 篩選參數；探索頁 UI（卡片版面、篩選列）由 issue #152 的 FRD 另案定義

## Non-goals

- FRD 2.2 四項：總覽頁、場次內頁籤（儀表板／名單／今日焦點）、模板庫（Templates）、組織設定——皆已上線或另有 FRD，本 change 不動
- 群組訊息（線上非同步的互動載體）—— issue #154 / `group-messages` change
- 一般使用者建立活動（自動建單人 organization）—— issue #173
- 「參與者打卡預設私密」「發起人留言預設私密」的實際強制（需要 `practice_checkins`／`comments` 的 cohort 範圍隱私軸）—— 本 change 只存旗標並在 UI 標示「設定將於打卡隱私功能上線後生效」，另開 change `cohort-content-visibility`
- 付費場次的金流、付款驗證——報名走外部連結，島島不收款；名單核對靠發起人
- 島島報名表的 email 通知／確認信內容變更（沿用既有邀請信 template，只多帶邀請訊息）
- `spaces`／`space_members`／`space_practices` 三張表與 `/spaces/[id]` 頁面：仍閒置，本 change 只讓 5 張區塊表為 cohort 服務
- mobile app；日曆區塊的 ICS 匯出；報名表問題的條件邏輯／檔案上傳題型

## Impact

- **daodao-storage**：`migrate/sql/087_cohort_setup_fields.sql`（cohorts 新欄位 + `cohort_sessions`）、`088_space_blocks_for_cohorts.sql`（`space_home_pages.cohort_id`、`space_blocks.visibility`、`space_block_links.template_id`、`space_block_events.description`）、`089_cohort_signup_questions.sql`（兩張新表）；回寫 `schema/393_create_table_cohorts.sql` 與 spaces 對應 schema 檔（084 建立的那組）
- **daodao-server**：Prisma schema + generate；`cohort.validators.ts`／`cohort.service.ts`／`cohort.controller.ts`；新 `cohort-session`、`cohort-signup`、`cohort-home-page` validators／services／controllers；`space.service.ts` 抽出 `space-block-engine.service.ts`；`program.service.ts` 的 duplicate 與級聯 archive；`cohort-join.service.ts`／`cohort-draft.service.ts`（隱私＋答案）；`activity.service.ts`／`activity.validator.ts`；新 `cohort-acl.service.ts`（鎖 cohort 實踐 privacyStatus）；`organization.routes.ts`／`cohort-join.routes.ts` 註冊；`openapi.json` 重生；audit action 常量新增 `PROGRAM_DUPLICATED`、`PROGRAM_ARCHIVED_CASCADE`
- **daodao-f2e**：`packages/api/src/types.ts` 同步（生成物）；`services/cohort.ts`／`cohort-hooks.ts` 新函式；`apps/product/src/components/lighthouse/programs-manager.tsx` 拆成 `cohort-setup-panel/` 目錄（五個區段元件）；`components/spaces/*` 抽成 `components/blocks/*`；`components/cohort/cohort-join-page.tsx`、`cohort-member-page.tsx`；`app/[locale]/activities`；i18n `lighthouse`（現 331 key）、`cohort`（72）、`explore_activities`（25）、`space`（106）namespace 補 key
- **daodao-admin-ui**：無（不暴露新欄位；`src/api/types.ts` 不需手動同步）
- **daodao-ai-backend**：無（不讀新欄位；若 `src/models/` 有 cohorts ORM 需補 nullable 欄位，無強制）
- **daodao（本 repo）**：`scripts/product_status_manifest.yml` 燈塔 signals 補 `cohort-setup-panel`；`docs/product/lighthouse/` 建立 FRD 落地備忘（manifest 指到的目錄目前不存在）

## Phase 拆法

| Phase | 範圍 | 交付後使用者看得到什麼 | 相依 |
|---|---|---|---|
| **A 基本資訊＋收費＋隱私旗標＋模版連結＋複製／封存** | migration 087；cohorts 新欄位、`cohort_sessions`；`PATCH` 正規化；`is_private` 強制；系列複製與級聯封存；探索頁與報名頁顯示新資訊；f2e 五區段面板骨架 + 區段一／二／四 + 區段五的邀請訊息部分 | 帶領人能完整描述場次；探索卡有簡介／線上實體／費用；報名頁顯示時段與費用、付費／外部報名分流 | 無 |
| **B 活動主頁掛 cohort** | migration 088；block engine 抽出；燈塔主頁端點；學員主頁分頁；公開區塊出現在報名頁與探索詳情 | 帶領人能組裝主頁，學員加入後看得到 | A（面板骨架） |
| **C 報名表＋預覽＋答案** | migration 089；問題 CRUD；加入流程 Step 2；名單顯示答案；報名頁預覽（內嵌＋modal） | 島島報名表可收自訂問題；帶領人可預覽島民畫面 | A（區段五骨架） |

每個 Phase 各自跨三 repo 開 PR（storage → server → f2e，同一分支名 `claude/cohort-setup-panel-<待定>`），Phase 之間可獨立上線。
