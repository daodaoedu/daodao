> 執行順序：Phase A → B → C；每個 Phase 內 storage → server → f2e。分支一律 `claude/cohort-setup-panel-<待定>`（三個 repo 同名）。契約以 `design.md`「API contract 摘要」與 `specs/*/spec.md` 為準。f2e 的 `packages/api/src/types.ts` 由 server 生成物同步，禁手改。每個 task 2–4 小時；預估總工時見文末。

## 1. Phase A — 基本資訊、收費、隱私旗標、模版連結、複製／封存（storage）

- [ ] 1.1 `daodao-storage` — 新增 `migrate/sql/087_cohort_setup_fields.sql`（design「087」SQL：cohorts 12 個新欄位＋CHECK＋COMMENT、`cohort_sessions` 表＋index），以 `IF NOT EXISTS` 冪等
  - 驗收：本地 Postgres 載入全部 schema 後套用兩次皆無錯；`\d cohorts` 顯示新欄位、既有列 `is_private=true`、`fee_type='free'`、`interaction_modes='{}'`
  - 預估：2h
- [ ] 1.2 `daodao-storage` — 回寫 `schema/393_create_table_cohorts.sql`，新增 `schema/<下一序號>_create_table_cohort_sessions.sql`；`check_schema_sync.py` 不新增漂移
  - 驗收：pre-commit-check 通過；schema-sync-check 無新警告
  - 預估：1h

## 2. Phase A — server

- [ ] 2.1 `daodao-server` — Prisma `db pull` 或手改（cohorts 新欄位、`cohort_sessions` model 與關聯），`pnpm run prisma:generate`，`pnpm run schema:drift` 無漂移；新增 `src/constants/cohort-setup.ts`（`COHORT_INTERACTION_MODES`、`COHORT_FEE_TYPES`、`COHORT_SIGNUP_METHODS`）
  - 驗收：typecheck 通過；drift 通過
  - 預估：2h
- [ ] 2.2 `daodao-server` — `cohort.validators.ts`：`cohortSessionInputSchema`、`createCohortSchema`／`updateCohortSchema`／`cohortResponseSchema` 依 design contract 擴充（**本 task 新必填欄位 `tagline`／`joinDeadline`／`interactionModes` 先為 optional 並以 TODO 註記，於 4.1 收緊**）；加入 D3 收費、D4 隱私、D5 附屬欄位的 refine／transform（以 `superRefine` 對合併結果驗證的 helper `normalizeCohortSetup(current, input)` 放 service 層）
  - 驗收：單元測試：paid 缺 feeAmount → 400；paid 自動 `signupMethod='external'`；free+island_form 清 externalSignupUrl；`isPrivate=false` 覆寫兩旗標；modes 不含 sync 清 meetingUrl；tagline 81 字 → 400
  - 預估：4h
- [ ] 2.3 `daodao-server` — `cohort.service.ts`：`select`／`map` 含新欄位與 `sessions`（join `cohort_sessions` 依 position）；`create`／`update` 走 `normalizeCohortSetup`，`sessions` 全量覆寫（同交易 deleteMany + createMany）；新增 `PUT .../cohorts/:cohortId/sessions` 端點（controller + route + registerPath）
  - 驗收：整合測試：create 帶 3 個 sessions → GET 回 3 筆有序；PATCH `sessions: []` 清空；modes 移除 sync/physical 時 sessions 自動清空；startTime ≥ endTime → 400
  - 預估：4h
- [ ] 2.4 `daodao-server` — 隱私強制（D7）：`cohort-draft.service.ensureCohortDrafts` 依 `is_private` 寫 `privacy_status`；`cohort.service.update` 切換 `isPrivate` 時同交易 `updateMany` 該 cohort `creation_source='cohort_template'` 且 `cohort_id` 非 null 的實踐並回 `affectedPracticeCount`；新增 `cohort-acl.service.ts`（`assertLighthouseCohortPracticeUpdatable`：lighthouse cohort 實踐帶 `privacyStatus` → 400），掛進 `practice.service.update`（與 challenge-acl 並列）
  - 驗收：整合測試：私密場次加入 → 草稿 `privacy_status='private'`；PATCH isPrivate=false → 全部變 public、count 正確、已退出者不動；學員 PATCH privacyStatus → 400；challenge 既有測試維持綠
  - 預估：4h
- [ ] 2.5 `daodao-server` — `program.service.ts`：新增 `duplicate`（D9，audit `PROGRAM_DUPLICATED`）與級聯 `archive`（同交易封存全部場次，回 `archivedCohortCount`，audit `PROGRAM_ARCHIVED_CASCADE`）；`program.validators.ts` 加 `programArchiveResultSchema`；route `POST /programs/:programId/duplicate` + registerPath；`audit-action.ts` 加兩個常量
  - 驗收：整合測試：duplicate 產生「（複製）」且無場次；challenge program → 403；archive 有 3 個未封存場次 → 全 archived、count=3；既有「無場次封存」測試維持綠
  - 預估：3h
- [ ] 2.6 `daodao-server` — `cohort.service.duplicate` 深複製擴充（D10 Phase A 範圍：新欄位、`sessions`；`visibility` 強制 private）
  - 驗收：整合測試：副本含 sessions 與收費欄位、visibility=private、joinPaused=false、新 token
  - 預估：2h
- [ ] 2.7 `daodao-server` — 學員與探索端點揭露（D11）：`cohort-join.validators.ts`／`cohort-join.service.ts` 的 join info 加 tagline、interactionModes、location、sessions、fee*、signupMethod、externalSignupUrl、capacity、joinDeadline、participantCount、privacy；`inviteMessage` 依 `show_invite_message_on_signup` 決定是否回；member home 加 meetingUrl 等；`activity.validator.ts`／`activity.service.ts` summary 加 tagline／interactionModes／fee*／signupMethod，詳情加 location／sessions／externalSignupUrl，`?mode=` 篩選
  - 驗收：整合測試：join info 不含 meetingUrl；show flag=false 時 inviteMessage=null；member home 含 meetingUrl；`/activities?mode=physical` 只回含 physical 的期；activity-discovery 既有測試維持綠
  - 預估：4h
- [ ] 2.8 `daodao-server` — `pnpm run openapi:generate` + `openapi:generate-types`；lint + typecheck + 全套測試；commit 依 format-commit skill；push
  - 驗收：CI 綠；`openapi.json` 含新欄位與 `/programs/{programId}/duplicate`、`/cohorts/{cohortId}/sessions`
  - 預估：1h

## 3. Phase A — f2e

- [ ] 3.1 `daodao-f2e` — 同步 `packages/api/src/types.ts`；`services/cohort.ts` 加 `duplicateLighthouseProgram`、`putLighthouseCohortSessions`，zod schema（`lighthouseCohortSchema`、`cohortJoinInfoResponseSchema`、`cohortMemberHomeResponseSchema`、activity schema）補新欄位；`activity.ts` 的 `getActivities` 接 `mode` query
  - 驗收：typecheck 通過；service 單元測試（mock client）
  - 預估：3h
- [ ] 3.2 `daodao-f2e` — 拆 `programs-manager.tsx`：抽出 `cohort-setup-panel/panel.tsx`（五個 pill、兩階段 enable、標題切換、關閉、`scrollIntoView`、底部操作列、錯誤訊息與跳區段）與 `use-cohort-form.ts`（表單狀態、zod 驗證與 server 對齊、dirty 追蹤）；保留 `?edit=<cohortId>` 深連結；`CohortCard` 的「編輯」改開面板
  - 驗收：瀏覽器：新建／編輯標題正確、四區段 disable→enable、深連結開啟並捲動；vitest 覆蓋 `use-cohort-form` 的必填與跳區段邏輯（TP-CS-01～04）
  - 預估：4h
- [ ] 3.3 `daodao-f2e` — `section-basic.tsx`：responsive grid（auto-fit 200px）、簡介字數計數器（>80 轉 #C03A3A）、slug mono、日期三欄、人數＋「不限」toggle、互動方式多選下拉（checkbox 樣式、摘要「、」分隔、外部點擊關閉遮罩）、會議連結／地點條件顯示
  - 驗收：TP-BS-01～06、TP-RD-01、TP-A11Y-03；i18n `lighthouse` 補 key
  - 預估：4h
- [ ] 3.4 `daodao-f2e` — `section-basic.tsx` 續：聚會時段列（date + time～time + 刪除、「＋ 新增時段」帶入前一筆、至少保留一列）、收費區（免費／付費下拉、費用、報名連結＋tooltip、報名方式、外部連結＋tooltip）；送出時整合成 `createLighthouseCohort`／`updateLighthouseCohort` payload（含 `sessions`）
  - 驗收：TP-BS-07～09、TP-VL-02～03；空白時段列不送出
  - 預估：4h
- [ ] 3.5 `daodao-f2e` — `section-templates.tsx`：搜尋框＋展開 chevron、checkbox 列表模糊過濾、「找不到符合的模版」、已連結卡片（開始日 date input → `setLighthouseTemplateBinding(..., true, { startDate })`、結束日 = 開始日 + durationDays − 1、移除）、計數器、空狀態；移除舊建立表單內的模板勾選 fieldset
  - 驗收：TP-PT-01～05；結束日計算與 `cohort-draft.service.addDays` 一致（單元測試）
  - 預估：4h
- [ ] 3.6 `daodao-f2e` — `section-privacy.tsx`：四張 toggle 卡片（grid auto-fit 220px、aria-label、軌道色）、私密活動關閉時連動 disable 與提示文字替換、兩張「尚未強制」卡片標示、切換 isPrivate 的確認對話框（帶成員數）；`section-signup.tsx` Phase A 部分：邀請訊息 textarea＋「在報名頁面顯示」checkbox（未勾選 disabled + placeholder）
  - 驗收：TP-PV-01～03、TP-RD-02、TP-A11Y-01、TP-SU-01
  - 預估：3h
- [ ] 3.7 `daodao-f2e` — 系列卡與場次列：系列 context menu（複製 → `duplicateLighthouseProgram`；封存 → confirm 帶「將一併封存 N 個場次」）；場次列摘要補「公開／私密」「收費」；場次 context menu（複製 → 既有 `duplicateLighthouseCohort`；封存不限 published）；邀請區塊加「以 email 邀請成員」導向名單頁
  - 驗收：TP-CP-03～04、FR-PC-03 全部項目；瀏覽器實測
  - 預估：3h
- [ ] 3.8 `daodao-f2e` — 學員端：`cohort-join-page.tsx` 拆出 `cohort-signup-view.tsx`（純展示：名稱、簡介、chip 列、互動方式卡片、時段、邀請訊息、隱私說明、CTA）；報名頁依 `signupMethod` 分流（島島報名 vs 「前往報名頁面」＋「已完成報名？加入場次」）；`cohort-member-page.tsx` 顯示會議連結／地點／時段；i18n `cohort` 補 key
  - 驗收：TP-SU-10～11；匿名訪客看不到會議連結；瀏覽器 390px 版面
  - 預估：4h
- [ ] 3.9 `daodao-f2e` — 探索頁 `/activities`：`activity-card.tsx` 顯示簡介、互動方式 chip、免費／NT$ badge；篩選加「線上／實體」（`mode` query）；詳情頁 `[id]` 顯示地點、時段、外部報名連結；i18n `explore_activities` 補 key
  - 驗收：瀏覽器：篩選生效、卡片新欄位顯示；vitest 250+ 維持綠
  - 預估：3h
- [ ] 3.10 `daodao-f2e` — lint + typecheck + vitest；commit 依 format-commit skill；push
  - 驗收：CI 綠
  - 預估：1h

## 4. Phase A — 收尾

- [ ] 4.1 `daodao-server` — f2e Phase A 上線後：`createCohortSchema` 收緊 `tagline`／`joinDeadline`／`interactionModes` 為必填（移除 2.2 的 TODO），補測試；openapi 重生
  - 驗收：缺 tagline 建立 → 400；f2e 新面板建立成功
  - 預估：1h
- [ ] 4.2 `daodao`（本 repo）— 一次性 script 列出「`is_private=true` 但存在 `privacy_status='public'` 場次實踐」的 cohort 清單交營運；`scripts/product_status_manifest.yml` 燈塔 signals 補 `cohort-setup-panel`；建立 `docs/product/lighthouse/README.md` 指向本 change 與 FRD 來源
  - 驗收：script 可跑；manifest 與檔案位置一致
  - 預估：2h

## 5. Phase B — 活動主頁掛 cohort（storage）

- [ ] 5.1 `daodao-storage` — 新增 `migrate/sql/088_space_blocks_for_cohorts.sql`（design「088」SQL），冪等；回寫 084 對應的 spaces schema 檔（`space_home_pages`、`space_blocks`、`space_block_links`、`space_block_events`）
  - 驗收：套用兩次無錯；既有 space 列滿足 `chk_space_home_pages_owner`；schema-sync 無新漂移
  - 預估：3h

## 6. Phase B — server

- [ ] 6.1 `daodao-server` — Prisma 更新（`space_home_pages.space_id Int?`、`cohort_id`、`spaces.space_home_pages?` 可選、`cohorts.space_home_page`、`space_blocks.visibility`、`space_block_links.template_id` + 關聯、`space_block_events.description`）、generate、drift；新增 `BLOCK_VISIBILITIES` 常量
  - 驗收：typecheck 通過（含 `space.service.ts` 對 `space_id` 的 non-null 守衛）；drift 通過
  - 預估：2h
- [ ] 6.2 `daodao-server` — 抽出 `space-block-engine.service.ts`：以 `pageId` 為單位的 `listBlocks(viewer)`、`createBlock`、`updateBlock`（links 含 `templateId`、events 含 `description`、`visibility`）、`moveBlock`、`publishBlock`、`draftBlock`、`deleteBlock`、`duplicateBlock`、`serializeBlock`；`space.service.ts` 改呼叫 engine，行為不變（`getPublicSpace` 不看 visibility）
  - 驗收：既有 `/spaces/*` 整合測試全綠；engine 單元測試覆蓋 duplicate（標題「（複本）」、draft、位置、子列）與 move 邊界
  - 預估：4h
- [ ] 6.3 `daodao-server` — `space.validators.ts` 擴充 block schema（`visibility`、`templateId`、`description`）；新增 `cohort-home-page.validators.ts`／`.service.ts`／`.controller.ts`：host 端點（GET lazy 空頁、POST blocks lazy 建頁、PATCH／move／publish／draft／duplicate／DELETE）掛 `organization.routes.ts`；角色判定走 `getOwned`
  - 驗收：整合測試：無頁 GET 回空；第一次 POST 建頁；非組織成員 403；templateId 非同組織模板 → 400
  - 預估：4h
- [ ] 6.4 `daodao-server` — 學員與公開視圖：`GET /api/v1/cohorts/:cohortId/home-page`（joined 成員；published 區塊）掛 `cohort-join.routes.ts`；`cohort-join.service.getJoinInfo` 與 `activity.service.getDetail` 加 `publicBlocks`（published + public）；`cohort.service.duplicate` 深複製主頁（D10）
  - 驗收：整合測試：成員看到 public+members 已發佈、看不到草稿；未加入者 404；join info／activity detail 只含 public；duplicate 後區塊全 draft
  - 預估：4h
- [ ] 6.5 `daodao-server` — openapi 重生；lint + typecheck + 測試；commit；push
  - 驗收：CI 綠；`openapi.json` 含 `.../home-page/blocks/{blockId}/duplicate` 與 `/cohorts/{cohortId}/home-page`
  - 預估：1h

## 7. Phase B — f2e

- [ ] 7.1 `daodao-f2e` — 同步 types；`services/cohort.ts` 加主頁 CRUD 函式與 `useCohortHomePage`（學員）／`useLighthouseCohortHomePage`（host）hooks；`space.ts` 型別隨 block schema 更新
  - 驗收：typecheck；service 單元測試
  - 預估：2h
- [ ] 7.2 `daodao-f2e` — `components/spaces/{space-block-editor,space-block-view,space-resources-editor,space-calendar-editor,space-format-toolbar,space-toc}` 搬到 `components/blocks/` 並泛化：`BlockApi` adapter（update／move／publish／draft／delete／duplicate）、`linkTargets: {id,title}[]`（space 傳 practices、cohort 傳模板）、可見性 toggle、日曆活動描述（含 rich text 工具列）；spaces 頁面改 import 並傳 space adapter
  - 驗收：`/spaces/[id]` 行為不變（vitest 既有測試綠）；blocks 元件單元測試覆蓋 adapter 呼叫
  - 預估：4h
- [ ] 7.3 `daodao-f2e` — `section-home-page.tsx`：頂部「新增區塊」下拉（三型別）、「預覽活動主頁」modal（唯讀、過濾 published）、區塊列表用 `blocks/*`＋cohort adapter、複製／刪除 ⋮ 選單、狀態徽章、排序按鈕邊界
  - 驗收：TP-HP-01～03、TP-HP 複製與狀態；i18n `lighthouse`／`space` 補 key
  - 預估：4h
- [ ] 7.4 `daodao-f2e` — 資源區塊 cohort 特化：「從實踐模版匯入」面板（多選已連結模版、顯示資源數、匯入去重、來源 badge、自動帶 templateId）、資源「所屬實踐」下拉（已連結模版＋「未指定實踐」＋已解綁標示）、手動輸入名稱切換
  - 驗收：TP-HP 匯入去重與兩種輸入模式；單元測試覆蓋去重 key
  - 預估：4h
- [ ] 7.5 `daodao-f2e` — 學員 `/cohorts/[cohortId]` 加「主頁」分頁（`BlockView` 唯讀、月份分組日曆）；報名頁與探索詳情顯示 `publicBlocks`
  - 驗收：瀏覽器：成員看到已發佈區塊；匿名報名頁只看到 public 區塊；390px 版面
  - 預估：3h
- [ ] 7.6 `daodao-f2e` — lint + typecheck + vitest；commit；push
  - 驗收：CI 綠
  - 預估：1h

## 8. Phase C — 報名表與預覽（storage）

- [ ] 8.1 `daodao-storage` — 新增 `migrate/sql/089_cohort_signup_questions.sql`（design「089」SQL），冪等；新增兩個 schema 檔
  - 驗收：套用兩次無錯；schema-sync 無新漂移
  - 預估：2h

## 9. Phase C — server

- [ ] 9.1 `daodao-server` — Prisma 更新兩張表與關聯、generate、drift；`SIGNUP_QUESTION_TYPES` 常量；`cohort-signup.validators.ts`（`putSignupQuestionsSchema`、`signupQuestionSchema`、`signupAnswerSchema`）
  - 驗收：typecheck；單元測試：選擇題缺 options → 400；>20 題 → 400
  - 預估：2h
- [ ] 9.2 `daodao-server` — `cohort-signup.service.ts`：`replaceQuestions`（diff by id、軟刪除、position 重排）、`listQuestions`、`listAnswersByEnrollment`；端點 `PUT .../cohorts/:cohortId/signup-questions`；`cohortResponseSchema.signupQuestionCount`；`cohort.service.duplicate` 複製未刪除問題
  - 驗收：整合測試：新增／更新／刪除混合 PUT 後順序正確；刪題後答案仍在；duplicate 帶問題
  - 預估：4h
- [ ] 9.3 `daodao-server` — 加入流程：`joinCohortSchema` 加 `answers[]`；`cohort-join.service.getJoinInfo` 回 `questions[]`（僅 island_form）；`join` 驗證必填／選項／歸屬並同交易寫 `cohort_signup_answers`；invite_token 路徑跳過；`show_invite_message_on_signup=true` 時 `inviteMessage` 必填（validators refine）
  - 驗收：整合測試：必填缺答 400 指名 questionId；選項外值 400；成功寫入答案；external 場次 questions 空且忽略 answers
  - 預估：4h
- [ ] 9.4 `daodao-server` — `cohort-dashboard.service.listParticipants` 與 `cohort-membership.service.listEnrollments` 每列附 `answers[]`（label 取當下、deleted 標示）；`cohort-export.service` 明確不帶答案（測試斷言）；`cohort-anonymization.service` 刪除答案
  - 驗收：整合測試：名單含答案；匯出不含；匿名化後答案為 0
  - 預估：3h
- [ ] 9.5 `daodao-server` — openapi 重生；lint + typecheck + 測試；commit；push
  - 驗收：CI 綠
  - 預估：1h

## 10. Phase C — f2e

- [ ] 10.1 `daodao-f2e` — 同步 types；`services/cohort.ts` 加 `putLighthouseCohortSignupQuestions`、`joinCohort(token, answers)`；schema 補 questions／answers
  - 驗收：typecheck；service 單元測試
  - 預估：2h
- [ ] 10.2 `daodao-f2e` — `section-signup.tsx` 問題編輯器：固定欄位兩列（不可刪、標示 Google 帶入）、新增題、題型下拉（切單選／多選出現選項輸入）、必填／選填 toggle、上移／下移、刪除後題號重排、儲存 → `PUT`
  - 驗收：TP-SU-02～05；vitest 覆蓋排序與重排
  - 預估：4h
- [ ] 10.3 `daodao-f2e` — `signup-preview.tsx`：內嵌預覽（標題列「活動加入頁」＋短網址＋複製連結「已複製」、吃 `use-cohort-form` 的未儲存狀態組 view model、Step 1／Step 2 切換、外部／免費提示文案、「尚未填寫」提示＋「僅發起人可見」badge）；共用 `cohort-signup-view.tsx`；「預覽報名頁」modal（560px、獨立捲動、標題與說明）
  - 驗收：TP-SU-06～11、TP-PV-04；預覽與真實報名頁 DOM 結構一致（snapshot 測試）
  - 預估：4h
- [ ] 10.4 `daodao-f2e` — 真實報名頁 Step 2：Google 帳號確認、自訂問題表單（四種題型、必填標示、錯誤標紅）、「送出報名」帶 `answers`、「回上一步」；燈塔名單頁（`cohort-roster.tsx`／`cohort-participants-table.tsx`）展開顯示答案與「未填寫報名表」
  - 驗收：瀏覽器：完成兩步報名並在名單看到答案；必填缺答時對應題標紅
  - 預估：4h
- [ ] 10.5 `daodao-f2e` — lint + typecheck + vitest；commit；push
  - 驗收：CI 綠
  - 預估：1h

## 11. 全部完成後（daodao）

- [ ] 11.1 `daodao` — 依 post-merge-wrapup：歸檔本 change、同步 `openspec/specs/`（六個新能力＋activity-discovery 更新）、更新 manifest 狀態；開 issue「cohort-content-visibility：打卡／留言預設私密的強制行為」引用本 change 與 #154
  - 驗收：`openspec/specs/` 含新能力；issue 建立
  - 預估：1h

## 工時彙總

| Phase | storage | server | f2e | 其他 | 小計 |
|---|---|---|---|---|---|
| A | 3h | 25h（含 4.1） | 33h | 2h | **63h** |
| B | 3h | 15h | 18h | — | **36h** |
| C | 2h | 14h | 15h | — | **31h** |
| 收尾 | — | — | — | 1h | **1h** |
| 合計 | 8h | 54h | 66h | 3h | **131h** |

## 驗證備註

- 本環境無 DB／Redis，server 整合測試與 f2e 瀏覽器實測皆待 dev 環境；每個 Phase 的 f2e task 驗收以「dev 部署後瀏覽器實測」為準。
- Phase A 的 2.2／4.1 兩段式收緊必填欄位，是為了避免 server 先上線時舊表單建立場次 400；若三 repo 同日部署可合併為一步。
