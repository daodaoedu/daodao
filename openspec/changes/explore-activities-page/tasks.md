> 前置條件：`cohort-setup-panel` Phase A 的 **storage 087** 與 **server PR** 已合併（`cohorts` 新欄位與 `activitySummarySchema` 擴充就緒）。分支：`claude/explore-activities-page-<待定>`（server、f2e 各一條）。契約以 `design.md`「API contract 摘要」與 `specs/*/spec.md` 為準。f2e 的 `packages/api/src/types.ts` 由 server 生成物同步，禁手改。若 `cohort-setup-panel` tasks 3.9（探索頁補簡介／互動方式／費用）尚未合併，直接由本 change 取代。

## 1. server

- [ ] 1.1 **前置確認**：確認 `cohort-setup-panel` Phase A server PR 已合併——`activitySummarySchema` 含 `tagline`／`interactionModes`／`feeType`／`feeAmount`／`signupMethod`、`activityDetailResponseSchema` 含 `location`／`sessions`／`externalSignupUrl`、`?mode=` 篩選可用。`prisma/schema.prisma` 含 `cohorts` 新欄位與 `cohort_sessions`。若未合併，本 change 暫停
  - 驗收：`pnpm run typecheck` 通過；`GET /api/v1/activities` 每筆含 `tagline`
  - 預估：1h

- [ ] 1.2 `daodao-server` — 新增 `src/constants/activity.ts`（`ACTIVITY_ENDED_LIMIT = 24`）；`activity.service.ts` 的 `list` 改為兩段查詢（`fetchActive` + `fetchEnded`），已結束段以 `end_date < today` + `end_date desc` + `take: ACTIVITY_ENDED_LIMIT + 1` 取得，與未結束合併後統一走 `buildSummaries`；controller 改用 `createSuccessResponse(data, { endedLimit, endedTruncated })`
  - 驗收：單元測試：全部未結束 → `endedTruncated=false`；30 個已結束 → 只回 24 筆 + `endedTruncated=true`；排序正確（未結束 start_date 升冪在前、已結束 end_date 降冪在後）；`?mode=` 對已結束也生效
  - 預估：3h

- [ ] 1.3 `daodao-server` — `activity.service.ts` 的 `buildSummaries` 並行新增：(a) `cohort_templates.groupBy` 計算 `templateCount`（`where: { unbound_at: null }` 的 `_count` by `cohort_id`）；(b) `resolveHosts(rows)` 實作 design D4 三層 fallback（enrollment owner → 組織 owner → 組織名兜底），查詢 `cohort_enrollments`、`organization_members`、`users`（含 `contacts.photo_url`、`custom_id`、`external_id`、`nickname`）。`activitySelect` 補 `program.organization.id`
  - 驗收：單元測試 host 三層 fallback：有 enrollment owner 時取最早 joined_at；無 enrollment owner 時取組織 owner；兩者皆無時 userId=null / name=組織名；templateCount 排除 unbound
  - 預估：4h

- [ ] 1.4 `daodao-server` — `activity.validator.ts`：新增 `activityHostSchema`（userId nullable int、name、avatar nullable、identifier nullable）、`activityListMetaSchema`（endedLimit int、endedTruncated bool）；`activitySummarySchema` 擴充 `host`、`location`（列表也回，放寬 #171 D11）、`templateCount` int；`activityListResponseSchema` 改為 `z.object({ data: z.array(activitySummarySchema), meta: activityListMetaSchema })`；新增 `activityHostParamsSchema`（userId coerce int positive）、`activityHostPreviewSchema`（userId、name、avatar、identifier、selfIntroduction nullable、organizationName nullable、hostedActivityCount、learnedWithCount、joinedYear nullable int）
  - 驗收：typecheck 通過；schema snapshot 測試
  - 預估：2h

- [ ] 1.5 `daodao-server` — 新增 `activity.service.getHostPreview(userId)`：依 D5 查統計（hostedActivityCount 不限 visibility、learnedWithCount 排除本人、joinedYear）；不是任何公開已發佈期的 host → 404；`activity.controller.ts` 新增 `hostPreview`；`activity.routes.ts` 新增 `GET /hosts/:userId`（**先於** `/:cohortId` 註冊），`registerPath` 含 hostPreview openapi
  - 驗收：單元測試：host 為 3 期（2 公開 1 私密）、25 人去重 → `hostedActivityCount=3`、`learnedWithCount=24`；非任何公開期 host → 404；未登入與登入結果相同
  - 預估：3h

- [ ] 1.6 `daodao-server` — `activityDetailResponseSchema` 擴充 `host`、`templateCount`（詳情也需要）；`getDetail` 的 map 補 host 與 templateCount（可呼叫 `resolveHosts` 單筆版或 inline query）
  - 驗收：整合測試：`GET /activities/:id` 回傳含 host 與 templateCount
  - 預估：2h

- [ ] 1.7 `daodao-server` — `pnpm run openapi:generate` + `openapi:generate-types`；lint + typecheck + 全套測試；pre-commit-check skill；format-commit skill；push
  - 驗收：CI 綠；`openapi.json` 含 `/activities/hosts/{userId}`、`activityHostPreview`、`meta` 結構
  - 預估：1h

## 2. f2e

- [ ] 2.1 `daodao-f2e` — 同步 `packages/api/src/types.ts`（server 生成物）；`packages/api/src/services/activity.ts` 新增 `getActivity(id)`、`getActivityHost(userId)`；`activity-hooks.ts` 新增 `useActivity(id)`（SWR）、`useActivityHost(userId | null)`（`useImmutable`，null 時不發請求）；`useActivities()` 回傳型別更新以含 `meta`；型別 `ActivityHostPreviewType`
  - 驗收：typecheck 通過
  - 預估：2h

- [ ] 2.2 `daodao-f2e` — 新增 `apps/product/src/constants/activity-color.ts`（`ACTIVITY_COLOR_KEYS`、`activityColorKey(id)`）與 `activity-filter.ts`（`ACTIVITY_STATUS_FILTERS`、`matchesStatus`、`matchesFee`、`searchActivities` 的 normalize + 比對 displayName/tagline/description/host.name/organizationName/location）
  - 驗收：vitest 單元測試：各篩選組合、不分大小寫、null 欄位不報錯
  - 預估：2h

- [ ] 2.3 `daodao-f2e` — `components/layout/sidebar/constant.tsx`：spaces 項的 `isMatch` 改為 `pathname.startsWith('/spaces') || pathname.startsWith('/activities')`
  - 驗收：`/activities` 側欄「空間」高亮
  - 預估：0.5h

- [ ] 2.4 `daodao-f2e` — 新增 `components/activity/explore-guest-header.tsx`（sticky、backdrop-blur、logo＋「島島阿學」、「登入」ghost button＋「免費加入」primary button，皆導 `/auth/login?redirect=/activities`）；新增 `explore-search.tsx`（膠囊搜尋框、清除按鈕）；新增 `explore-filters.tsx`（狀態 4 pill 單選 + 分隔線 + 費用 2 pill toggle）
  - 驗收：vitest：pill 選中切換、toggle 行為、搜尋框清除；瀏覽器：sticky 效果、backdrop-blur
  - 預估：3h

- [ ] 2.5 `daodao-f2e` — 重寫 `components/activity/activity-card.tsx`：白卡 20px 圓角、34px 色帶（`practiceThemeSvgMap`）、色帶上 badge（templateCount + runStatus）、名稱 16px/600、tagline 4 行截斷 min-h-[85px]、日期列、地點列（依 interactionModes 三態：線上/實體/混合）、分隔線、發起人列（20px 圓形頭像 + 名稱 role="button" + stopPropagation）、進行中「・N 位島民」、已結束「・N 位島民參與過」、費用 badge（免費灰底/付費淺綠底千分位）、右側箭頭 icon。已結束卡：`saturate-[.3] opacity-65`、降透明文字、「已結束」badge。hover `-translate-y-[3px]` + shadow + 邊框色
  - 驗收：TP-EX-18～28；vitest snapshot 測試
  - 預估：4h

- [ ] 2.6 `daodao-f2e` — 新增 `components/activity/host-preview-dialog.tsx`：以 `@daodao/ui` Dialog 或 Sheet 實作；開啟時以 `useActivityHost(userId)` 載入；內容：頭像、名稱、角色「{org}・發起人」、自我介紹（無則提示）、三統計、「看看 TA 的小島」導向 `/users/{identifier}`、「傳訊息」disabled + tooltip「私訊功能即將推出」（訪客「加入後可傳訊息」）；遮罩點擊關閉、右上 ✕、內容 stopPropagation；載入失敗顯示錯誤 + 關閉
  - 驗收：TP-EX-29～34；vitest：開啟觸發 SWR、404 顯示錯誤
  - 預估：3h

- [ ] 2.7 `daodao-f2e` — 新增 `app/[locale]/activities/layout.tsx`（server component，`generateMetadata` 提供 `meta_title`／`page_subtitle`）；重寫 `page.tsx`：依 `isAuthenticated` 切 `UserShell`（`<Sidebar />`＋`md:pl-[132px]`＋`<PageHeader leftAction="back" ... title=page_title rightActionTo="/spaces" />`）與 `GuestShell`（`ExploreGuestHeader`＋H1 標頭＋副標）→ 共用 `ExploreContent`（state：searchQuery、statusFilter、feeFilter；useActivities → searchActivities → matchesStatus → matchesFee → 過濾列表；區段標題＋計數、grid、endedTruncated 提示、空狀態、CTA）。auth 未就緒時骨架。主內容 `max-w-[760px]` mx-auto
  - 驗收：TP-EX-01～05、10～16、35～39；瀏覽器：登入/訪客雙視圖、篩選搜尋疊加、空狀態
  - 預估：4h

- [ ] 2.8 `daodao-f2e` — 新增 `app/[locale]/activities/[id]/page.tsx`（精簡詳情頁）與 `components/activity/activity-detail.tsx`：`useActivity(id)` → 顯示名稱、簡介、系列說明、日期、互動方式＋地點、時段列表（若有 sessions）、費用＋報名方式、發起人列（可開快覽）、組織簡介＋外部連結、CTA（isJoined→學員頁/canJoin→加入/否則停用顯示原因）；沿用 UserShell/GuestShell；返回導 `/activities`；404 → 「找不到活動」
  - 驗收：瀏覽器：可加入導 join、已結束停用、私密 404
  - 預估：3h

- [ ] 2.9 `daodao-f2e` — i18n `explore_activities` namespace（zh-TW／en）：新增約 35 key（search、filter、section title、badge、location、fee、host、detail、guest header 相關），移除不再使用的 key（`section_open_title`、`section_ongoing_title`、`section_ongoing_subtitle`、`host_members`、`card_start_date`、`card_days_progress`、`empty_open`）；更新 `cta_prompt` → `cta_user_prompt`、`cta_button` → `cta_user_button` 並新增 `cta_guest_prompt`、`cta_guest_button`
  - 驗收：所有新元件的文案皆走 i18n、無 hardcode 中文
  - 預估：2h

- [ ] 2.10 `daodao-f2e` — lint + typecheck + vitest；pre-commit-check skill；format-commit skill；push
  - 驗收：CI 綠
  - 預估：1h

## 3. 收尾（daodao）

- [ ] 3.1 `daodao` — `scripts/product_status_manifest.yml` 探索活動 signals 補 `explore-activities-page`；`docs/product/` 若有活動區段更新狀態
  - 驗收：manifest 與檔案位置一致
  - 預估：0.5h

## 工時彙總

| 區段 | server | f2e | 其他 | 小計 |
|---|---|---|---|---|
| server | 16h | — | — | **16h** |
| f2e | — | 24.5h | — | **24.5h** |
| 收尾 | — | — | 0.5h | **0.5h** |
| 合計 | 16h | 24.5h | 0.5h | **41h** |

## 驗證備註

- 本環境無 DB／Redis，server 單元測試以 `prismaMock` 覆蓋；整合測試與瀏覽器實測待 dev 環境。
- f2e 卡片重寫是主要工時（2.5），因為 FRD 規格從 SVG 滿版背景改為白卡＋色帶＋地點列＋費用列＋發起人列，與既有元件差異大。
- 若 `cohort-setup-panel` tasks 3.9 已合併，本 change 的 2.1 types 同步需先 rebase 到 Phase A f2e 之上，`activity-card.tsx` 以本 change 為準（取代 3.9 的版本）。
