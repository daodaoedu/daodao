# Design: 探索活動課程頁——搜尋、篩選、三態卡片與發起人快覽

## Context

現況（2026-09-03 盤點，動機見 proposal.md）：

- **列表端點** `GET /api/v1/activities`（`activity.routes.ts`，optionalAuth）：`activity.service.list` 以 `status='published'`、`visibility='public'`、`end_date >= today(Asia/Taipei)`、`program.kind='lighthouse'`、`program.deleted_at IS NULL`、`organization.status='active'` 過濾，依 `start_date` 升冪；`buildSummaries` 以 `cohort_enrollments.groupBy` 算 `participantCount`（全部 `status='joined'`，含 owner／assistant）、以 `deriveRunStatus`／`deriveJoinability`（`cohort-run-state.ts`）推 `runStatus`／`canJoin`／`unavailableReason`，`joinToken` 只在 `canJoin` 時回傳。詳情 `getDetail` 已允許已結束（`isPublicActivity` 不看日期）。
- **資料模型**：`cohorts` 目前有 slug、display_name、start／end_date、join_token、join_paused、join_deadline、capacity、invite_message、status、visibility；**沒有** host 欄位。`programs → organization`；`organization`（name、bio、external_link、status）**沒有頭像**。`organization_members`（role 目前只有 `owner`，建組織必建一筆）。`cohort_enrollments.role ∈ owner|assistant|member`（名單頁可改，`cohort-join.service.ts:113` 已用 owner／assistant 通知）。`cohort_templates`（`unbound_at` 表示解除綁定）。使用者頭像 `contacts.photo_url`（`space.service.ts`、`cohort-membership.service.ts` 同源）、自我介紹 `basic_info.self_introduction`（`/users/profile/:identifier` 同源）、註冊時間 `users.created_at`、公開 identifier `custom_id ?? external_id`（`/users/:identifier/island` 與 sidebar 同規則）。
- **#171 Phase A（未合併）** 會加：`cohorts.tagline`、`interaction_modes[]`、`meeting_url`、`location`、`fee_type`／`fee_amount`／`signup_method`／`external_signup_url`、`is_private` 等，並把 `tagline`／`interactionModes`／`feeType`／`feeAmount`／`signupMethod` 加進 `activitySummarySchema`、詳情加 `location`／`sessions`／`externalSignupUrl`、列表 `?mode=`（其 design D11 明訂列表不回 `location`）。
- **f2e**：`apps/product/src/app/[locale]/activities/page.tsx` 為 `"use client"` 頁，`useActivities()`（SWR，60 秒輪詢）、篩選 all／open、兩段（即將開始／進行中）、CTA 導 `/spaces`；`components/activity/activity-card.tsx` 主題 SVG 背景（`THEME_ROTATION[id % 4]`）；`/activities` 在 `global-provider.tsx` publicPattern；路由在 `(with-layout)` 之外，無 `Sidebar`／`PageHeader`；`Sidebar` 「空間」`isMatch = pathname.startsWith('/spaces')`；`PageHeader`（`components/layout/page-header.tsx`）支援 `leftAction='back'`＋`rightActionTo`；產品站無訪客頂部導覽列元件；`/activities/[id]` 不存在；「我的小島」= `/users/[identifier]`；`/spaces` 建立 FAB 走 `SpaceCreateSheet` coming-soon toast；`useLighthouseOrganizations()` 可判斷是否為燈塔會員；登入＝註冊（Google 單一流程，`/auth/login?redirect=`）。
- **i18n** `explore_activities` 25 key。

## Goals / Non-Goals

- Goals：FRD #152 §3 全部（雙視圖、搜尋、篩選、三態卡片、快覽彈窗、空狀態、CTA）；列表端點包含已結束；發起人資料與統計可從 server 取得；不開 migration。
- Non-Goals：見 proposal（詳情頁完整設計、私訊、SSR／SEO、server 搜尋與分頁、mobile）。

## Decisions

### D1：列表端點 contract——接手完整形狀，欄位一次到位

**決策**：`GET /api/v1/activities` 每筆回傳：

| 欄位 | 來源 | 備註 |
|---|---|---|
| `id`、`displayName`、`startDate`、`endDate`、`joinDeadline`、`capacity` | cohorts | 既有 |
| `programName`、`description` | programs | 既有；`description` 供詳情與搜尋，卡片不顯示 |
| `tagline` | cohorts.tagline（#171） | 卡片簡介（≤80 字，4 行截斷） |
| `organizationName` | organization.name | 既有；快覽彈窗「角色」列顯示 |
| `host` | design D4 | `{ userId: int\|null, name: string, avatar: string\|null, identifier: string\|null }` |
| `interactionModes` | cohorts.interaction_modes（#171） | `('sync'\|'async'\|'physical')[]` |
| `location` | cohorts.location（#171） | **列表也回**（放寬 #171 D11，PM OQ-2 已允許「屆時可再放寬」）；卡片地點列需要 |
| `feeType`、`feeAmount`、`signupMethod` | #171 | `feeAmount` 為每人一次金額 |
| `templateCount` | `cohort_templates` where `unbound_at IS NULL` 的 groupBy 計數 | 「N 個主題實踐」 |
| `participantCount` | 既有 | 「N 位島民」／「N 位島民參與過」 |
| `runStatus`、`canJoin`、`unavailableReason`、`isJoined`、`joinToken` | 既有 | 已結束 → `runStatus='ended'`、`canJoin=false`、`unavailableReason='ended'`、`joinToken=null` |

**不加** `open`／`ongoing`／`ended`／`paid` 布林：它們全是 `runStatus`／`canJoin`／`feeType` 的函數，重複欄位只會製造不一致。FRD 篩選邏輯的對應固定寫在 f2e 常量（D3）。

**不加** `colorKey`：見 D6。**不回** `meetingUrl`、`inviteMessage`、`externalSignupUrl`（列表）——維持 #171 D11 的揭露邊界。

查詢參數：`?mode=sync|async|physical`（沿用 #171），其餘篩選在前端。回應以 `createSuccessResponse(data, meta)` 帶 `meta: { endedLimit: 24, endedTruncated: boolean }`。

**替代方案**：把 host 拆成獨立端點、列表只回 `hostUserId` — 捨棄，卡片每張都要頭像＋名稱，N+1 沒必要；批次一次查完。

### D2：列表包含已結束期，已結束只回最近 24 筆，不做 cursor 分頁

**決策**：`list` 改為兩段查詢合併：

1. 未結束（`end_date >= today`）全量，`start_date asc`（既有）。
2. 已結束（`end_date < today`）`end_date desc` 取 `ACTIVITY_ENDED_LIMIT + 1` 筆，多出的一筆只用來算 `endedTruncated`。

`ACTIVITY_ENDED_LIMIT = 24`（`src/constants/activity.ts`）。兩段的過濾條件相同（published、public、lighthouse、組織 active）。已結束的 `joinability` 由 `deriveJoinability` 自然得到 `ended`，`joinToken=null`，不需額外分支。

**理由**：FRD 的搜尋與篩選都是即時前端過濾，任何 server 分頁都會讓「已結束 + 搜尋『阿哲』」需要來回打 API，體驗與複雜度都差；公開燈塔期的量級是數十筆。已結束無上限則會隨時間線性成長，24 筆是「兩欄 grid 12 列」的可捲動量。

**取捨**：已結束超過 24 筆時，較舊的活動在探索頁找不到（詳情頁仍可直連）。前端在「已結束」篩選底部顯示「僅顯示最近 24 筆」提示（`meta.endedTruncated`）。若日後需要，加 `?ended_cursor=` 即可，不影響現有欄位。

### D3：搜尋與篩選全部在前端，資料一次載入

- `useActivities()` 維持單一請求（SWR 60 秒輪詢不變）。
- 搜尋：`normalize = (s) => s.toLocaleLowerCase('zh-TW').trim()`，比對 `displayName`、`tagline`、`description`、`host.name`、`organizationName`、`location`（null 跳過）。
- 狀態篩選常量（`apps/product/src/constants/activity-filter.ts`）：

```ts
export const ACTIVITY_STATUS_FILTERS = ['all', 'open', 'ongoing', 'ended'] as const;
export const matchesStatus = (a, f) =>
  f === 'all' ? true
  : f === 'open' ? a.canJoin && a.runStatus !== 'ended'
  : f === 'ongoing' ? a.runStatus === 'ongoing'
  : a.runStatus === 'ended';
export const matchesFee = (a, fee: 'free' | 'paid' | null) =>
  fee === null ? true : (a.feeType === 'paid') === (fee === 'paid');
```

- 「全部」的排序：未結束在前（server 順序），已結束接在後（server 已如此排）。
- 區段標題：`section_title_{filter}`（全部 →「活動與課程」），計數 = 過濾後長度。
- 篩選狀態不寫入 URL（FRD 未要求；避免 `?mode=` 與前端狀態兩套）。`?mode=` 保留給外部連結，頁面不提供 UI。

### D4：「發起人」= 一個人，依 enrollment owner → 組織 owner 解析

**決策**：`resolveHosts(rows)` 批次解析，優先序：

1. 該 cohort `cohort_enrollments` 中 `status='joined'`、`role='owner'`、`user_id IS NOT NULL`，取最早 `joined_at` 者。
2. 否則該 cohort 所屬 `organization` 的 `organization_members` 中 `role='owner'`，取最早 `created_at` 者（建組織時必建一筆，`organization.service.ts:194`）。
3. 兩者皆無（owner 使用者已被刪除）→ `host = { userId: null, name: organization.name, avatar: null, identifier: null }`，卡片名稱不可點。

`host.name = users.nickname ?? organization.name`、`host.avatar = contacts.photo_url`、`host.identifier = custom_id ?? external_id`。

**理由**：FRD 要的是「人」——頭像、自我介紹、加入島島年份、「看看 TA 的小島」全是使用者維度；`organization` 沒有頭像也沒有小島。enrollment owner 是帶領人在名單頁明確指定的角色，最貼近「發起人」；組織 owner 是穩定的兜底（#173 之後一般使用者建活動會自動建單人組織，owner 即本人）。仍保留 `organizationName` 讓卡片與彈窗能標示「所屬組織」。

**替代方案**：`cohorts.host_user_id` 新欄位 — 捨棄，需要 migration 與 #171 面板 UI，且與 enrollment role 重複。只用組織 — 捨棄，無頭像無小島。

**成本**：兩個批次查詢（enrollment owner by cohort ids、organization owner by organization ids）＋一個 users 查詢；全部在 `buildSummaries` 內與既有 `groupBy` 並行。

### D5：發起人快覽走獨立端點 `GET /api/v1/activities/hosts/{userId}`

**決策**：不內嵌在列表（統計要三個聚合查詢，列表每張卡都算太貴，且多數使用者不會點）。彈窗開啟時才呼叫，SWR `useImmutable` 快取於頁面生命週期。

回應：

| 欄位 | 計算 | 成本 |
|---|---|---|
| `userId`、`name`、`avatar`、`identifier` | 同 D4 | 1 查詢 |
| `selfIntroduction` | `basic_info.self_introduction` | 同上 join |
| `organizationName` | 該使用者為 owner 的組織中，擁有最多公開期者；無則第一個 | 同下 join |
| `hostedActivityCount` | 依 D4 規則此人為 host、`status='published'`、`kind='lighthouse'`、組織 active 的 cohort 數（**不限 visibility**，數字不洩漏內容） | 1 查詢（enrollment owner ∪ 組織 owner 的 cohort id 集合） |
| `learnedWithCount` | 上述 cohort 集合內 `status='joined'`、`user_id IS NOT NULL` 且 ≠ host 的 **distinct user_id** 數 | 1 查詢（`findMany distinct` 或 `$queryRaw COUNT(DISTINCT)`） |
| `joinedYear` | `EXTRACT(YEAR FROM users.created_at)`；null → null | 同第一查詢 |

**404 條件**：此 `userId` 不是任何「公開、已發佈」期的 host（依 D4）→ 404。避免任意 userId 撈統計。

**替代方案**：改用既有 `GET /api/v1/users/profile/:identifier` — 捨棄，它回整包 profile（tag、位置、追蹤數…）且沒有活動統計；要「一起學過的島民」勢必新端點。放在 `/api/v1/users/:id/host-stats` — 捨棄，語意屬探索活動，掛 `/activities` 之下同一個 router、同一個 optionalAuth。

**路由順序**：`router.get('/hosts/:userId')` 必須註冊在 `router.get('/:cohortId')` 之前（既有 `user.routes.ts` 的 `/:identifier/island` 有同樣註記）。

### D6：色帶 `blue/green/yellow/pink` 由 `id % 4` 前端派生

**決策**：不加 server 欄位。f2e `apps/product/src/constants/activity-color.ts`：

```ts
export const ACTIVITY_COLOR_KEYS = ['blue', 'green', 'yellow', 'pink'] as const;
export const activityColorKey = (id: number) => ACTIVITY_COLOR_KEYS[id % ACTIVITY_COLOR_KEYS.length];
```

與 `group-messages` D8（`palette[colorSeed % n]`，seed 為 roomId）同一做法；現有 `activity-card.tsx` 的 `THEME_ROTATION[id % 4]` 順序 blue/green/yellow/pink 正好一致，只是改為 34px 色帶而非滿版背景。色帶圖案沿用 `practiceThemeSvgMap`（`preserveAspectRatio="xMidYMid slice"` 裁成 34px）。

### D7：訪客視圖 CSR，不做 SSR／SEO；導覽列自建

- 頁面維持 `"use client"`＋SWR；`generateMetadata` 由 `activities/layout.tsx`（新增，server component）提供 `meta_title`／`page_subtitle`，足夠讓分享連結有標題。SEO（sitemap、OG 圖、SSR 卡片）另開 change——公開目錄的 SEO 值得做，但與本 FRD 無關。
- 訪客頂部導覽列 `components/activity/explore-guest-header.tsx`：`sticky top-0 z-20 backdrop-blur-[10px] bg-white/80 border-b`（樣式參考官網 `header.tsx` 第 17 行），左 logo＋「島島阿學」，右「登入」（ghost）＋「免費加入」（實心 `bg-logo-cyan`）；兩者皆導 `/auth/login?redirect=/activities`（登入＝註冊）。不重用官網 header（錨點導覽與 `useScrollVisibility` 隱藏行為不符 FRD「固定在頂部」）。
- 登入狀態以 `useAuthContext()` 的 `isAuthenticated`；auth 尚未 ready 時渲染骨架（不閃訪客列）。

### D8：使用者視圖在 standalone 路由內自行組裝 Sidebar＋PageHeader

- `/activities` 留在 `(with-layout)` 之外（訪客不能有側欄；`(with-layout)` 的 `Sidebar` 需要登入者 identifier）。頁面登入時渲染 `<Sidebar />`＋`<div className="md:pl-[132px]">`（複製 `(with-layout)/layout.tsx` 的兩行）＋`<PageHeader leftAction="back" onLeftAction={() => router.push('/spaces')} rightActionTo="/spaces" title={t('page_title')} />`。
- `components/layout/sidebar/constant.tsx` spaces 項 `isMatch` 改為 `pathname.startsWith('/spaces') || pathname.startsWith('/activities')`（TP-EX-01）。
- 主內容 `max-w-[760px]`（FRD）；現有 640px 放寬。

### D9：卡片導向與 CTA

| 情境 | 卡片 `<a href>` |
|---|---|
| `isJoined` | `/cohorts/{id}`（學員頁） |
| 其他（含已結束） | `/activities/{id}`（精簡詳情頁，待確認 #5） |

卡片不再放「加入」按鈕（FRD 卡片結構沒有），加入 CTA 移到詳情頁：`canJoin && joinToken` → `/cohorts/join/{joinToken}`；`isJoined` → `/cohorts/{id}`；否則停用並顯示 `cta_full/paused/expired/ended`。精簡詳情頁只做資訊揭露＋CTA，不做區塊、不做報名表。

發起人名稱 `role="button"`，`onClick` 內 `e.preventDefault(); e.stopPropagation()` 後開彈窗（TP-EX-29）。

### D10：底部 CTA

| 視圖 | 文案 | 導向 |
|---|---|---|
| 使用者 | 「也想辦一場自己的活動嗎？」＋「開一個空間」 | `useLighthouseOrganizations()` 有組織 → `/lighthouse/programs`；否則 `/spaces`（既有 coming-soon） |
| 訪客 | 「想報名或發起自己的活動嗎？」＋「免費加入島島」 | `/auth/login?redirect=/activities` |

### D11：與 `cohort-setup-panel` 的分工與合併順序

| 項目 | #171 cohort-setup-panel | 本 change |
|---|---|---|
| `cohorts` 欄位、migration 087 | ✅ 擁有 | 只讀 |
| `activitySummarySchema` 加 `tagline`／`interactionModes`／`feeType`／`feeAmount`／`signupMethod`、`?mode=` | ✅ 先做（Phase A 2.7） | 沿用，再加 `location`、`templateCount`、`host`、已結束、`meta` |
| 詳情 `location`／`sessions`／`externalSignupUrl`／`publicBlocks` | ✅ 擁有 | 沿用，再加 `host`、`templateCount` |
| `/activities` 卡片 UI、篩選 | 其 tasks 3.9 註明「若 #152 先行則縮減為只接新欄位」 | ✅ 擁有 |
| 主規格 `activity-discovery`「探索活動頁公開列表端點」 | delta 描述後端揭露 | delta 為**最終版**（包含 #171 的內容） |

合併順序：#171 Phase A storage 087 → #171 Phase A server → **本 change server** → #171 Phase A f2e（可與本 change f2e 並行，衝突檔只有 `activity.ts`／`activity-hooks.ts`／`activity-card.tsx`，以本 change 為準）→ **本 change f2e**。

本 change **不開 migration**：所有新欄位由 087 提供；`templateCount`、host、快覽統計皆為即時聚合，量級（單頁數十期、單人數十期）不需要快照表。

## API contract 摘要（供 f2e types 同步）

```ts
// src/constants/activity.ts
ACTIVITY_ENDED_LIMIT = 24

// activity.validator.ts
activityHostSchema = {
  userId: int | null,            // null = 找不到 owner 使用者，name 為組織名
  name: string,
  avatar: string | null,         // contacts.photo_url
  identifier: string | null      // custom_id ?? external_id，導向 /users/{identifier}
}
activitySummarySchema = {
  id, displayName, programName, description, tagline: string|null, organizationName,
  host: activityHostSchema,
  startDate, endDate, joinDeadline, capacity,
  interactionModes: ('sync'|'async'|'physical')[], location: string|null,
  feeType: 'free'|'paid', feeAmount: int|null, signupMethod: 'island_form'|'external',
  templateCount: int, participantCount: int,
  runStatus: 'upcoming'|'ongoing'|'ended', canJoin, unavailableReason: 'ended'|'expired'|'full'|'paused'|null,
  isJoined, joinToken: uuid|null   // ended → null
}
activityListQuerySchema = { mode?: 'sync'|'async'|'physical' }          // 沿用 #171
activityListMetaSchema  = { endedLimit: int, endedTruncated: boolean }    // createSuccessResponse(data, meta)
activityDetailResponseSchema = activitySummarySchema.extend({
  organization: { name, bio, externalLink }, inviteMessage,               // 既有
  sessions, externalSignupUrl, publicBlocks                              // #171
})
activityHostParamsSchema = { userId: coerce int positive }
activityHostPreviewSchema = {
  userId, name, avatar, identifier, selfIntroduction: string|null, organizationName: string|null,
  hostedActivityCount: int, learnedWithCount: int, joinedYear: int|null
}

// 端點
GET /api/v1/activities                    optionalAuth  → { data: activitySummary[], meta: activityListMeta }
GET /api/v1/activities/hosts/{userId}     optionalAuth  → activityHostPreview | 404（非任何公開期的發起人）
GET /api/v1/activities/{cohortId}         optionalAuth  → activityDetail（既有，多 host/templateCount）
```

## 各子專案實作

### daodao-server

- `activity.service.ts`：`list` 拆 `fetchActive`／`fetchEnded`；`buildSummaries` 並行加 `cohort_templates.groupBy({ where: { unbound_at: null } })` 與 `resolveHosts`；新 `getHostPreview(userId)`；`activitySelect` 補 `tagline`、`interaction_modes`、`location`、`fee_type`、`fee_amount`、`signup_method`、`program.organization.id`。
- `resolveHosts(rows)`：
  1. `cohort_enrollments.findMany({ where: { cohort_id: in, status: 'joined', role: 'owner', user_id: { not: null } }, orderBy: joined_at asc, select: cohort_id, user_id })` → 每 cohort 取第一筆。
  2. 缺的 cohort 依 `organization_id` 查 `organization_members.findMany({ where: { organization_id: in, role: 'owner' }, orderBy: created_at asc })`。
  3. `users.findMany({ where: { id: in }, select: { id, nickname, custom_id, external_id, contacts: { photo_url } } })`。
- `getHostPreview`：hostCohortIds = enrollment owner cohorts ∪ 組織 owner 的組織的 cohorts，過濾 published／lighthouse／組織 active；若其中無 `visibility='public'` → 404；`learnedWithCount` 用 `cohort_enrollments.findMany({ distinct: ['user_id'], where: { cohort_id: in, status: 'joined', user_id: { not: null, not: userId } } })` 取長度（量級小）。
- `activity.controller.ts`：`list` 改 `createSuccessResponse(data, { endedLimit, endedTruncated })`；新 `hostPreview`。
- `activity.routes.ts`：`registerPath` 三條；`/hosts/:userId` 先於 `/:cohortId`。
- 測試 `tests/unit/services/activity.service.test.ts`：已結束納入與截斷、host 三層 fallback、templateCount、快覽 404／統計；沿用 `prismaMock`。

### daodao-f2e

- `packages/api/src/services/activity.ts`：`getActivities(params?: { mode? })`、`getActivity(id)`、`getActivityHost(userId)`；`activity-hooks.ts`：`useActivities(params?)`、`useActivity(id)`、`useActivityHost(userId | null)`（`useImmutable`，`null` 時 `enabled: false`）；型別 `ActivityHostPreviewType`。
- `app/[locale]/activities/layout.tsx`（新，`generateMetadata`）、`page.tsx` 重寫：`ExploreActivitiesPage` → 依 `isAuthenticated` 切 `UserShell`（Sidebar＋PageHeader）／`GuestShell`（`ExploreGuestHeader`＋H1 標頭）→ 共用 `ExploreContent`（搜尋、篩選、區段、grid、空狀態、CTA）。
- `components/activity/`：`explore-guest-header.tsx`、`explore-search.tsx`、`explore-filters.tsx`、`activity-card.tsx`（重寫：白卡 20px 圓角、34px 色帶、badge、資訊列、發起人列、費用 badge、箭頭、hover `-translate-y-[3px]`、已結束 `saturate-[.3] opacity-65`）、`host-preview-dialog.tsx`（`@daodao/ui` Dialog；遮罩關閉、內容 stopPropagation、右上 ✕、兩顆按鈕）、`activity-detail.tsx`（精簡詳情）。
- `constants/activity-color.ts`、`constants/activity-filter.ts`。
- `components/layout/sidebar/constant.tsx` spaces `isMatch`。
- i18n `explore_activities`（zh-TW／en）新增：`filter_ongoing`、`filter_ended`、`filter_free`、`filter_paid`、`search_placeholder`、`search_clear`、`section_title_all/open/ongoing/ended`、`badge_ongoing`、`badge_ended`、`template_count`、`location_online`、`location_hybrid`、`fee_free`、`fee_paid`、`fee_amount`、`members_count`、`members_count_ended`、`ended_truncated`、`empty_title`、`empty_hint`、`cta_user_prompt`、`cta_user_button`、`cta_guest_prompt`、`cta_guest_button`、`guest_login`、`guest_signup`、`host_role`、`host_stat_activities`、`host_stat_learned_with`、`host_stat_joined_year`、`host_view_island`、`host_message`、`host_message_guest`、`host_message_soon`、`detail_*`。移除不再使用的 `section_open_title`、`section_ongoing_*`、`host_members`、`card_start_date`、`card_days_progress`、`empty_open`。

## Risks / Trade-offs

- **host 解析可能對不上帶領人預期**：若名單頁沒指定 owner，卡片會顯示組織 owner（可能是行政帳號）。緩解：#171 面板可在後續加「發起人」選擇；本輪在燈塔名單頁的 role 說明加註「owner 會顯示為探索頁發起人」（文案 task）。
- **已結束 24 筆上限**：舊活動從探索頁消失。緩解：`meta.endedTruncated` 提示；詳情頁可直連。
- **統計為即時聚合**：`learnedWithCount` 對「發起 50 期、每期 100 人」的 host 要掃 5000 列 enrollment；量級目前遠低於此，且只在點擊時算。若成長再加快取或快照。
- **與 #171 f2e 衝突**：`activity-card.tsx` 兩邊都改；約定本 change 為準，#171 tasks 3.9 縮減。
- **`participantCount` 口徑**：探索頁算全部 joined，燈塔 `cohort.service` 只算 member；兩處數字可能差 1～2。列入 Non-goal，另案統一。

## Open Questions

- OQ-1（待 PM）：快覽彈窗 vs 直接導向我的小島（proposal 待確認 #1）——預設彈窗。
- OQ-2（待 PM）：已結束 24 筆上限是否足夠（#2）。
- OQ-3（待 PM）：使用者 CTA 導向（#3）。
- OQ-4（待 PM）：費用只做每人一次（#4）。
- OQ-5（待 PM）：精簡詳情頁 vs 卡片直導加入頁（#5）。
- OQ-6（已定）：`hostedActivityCount` 不限 visibility；`learnedWithCount` 排除 host 本人。
- OQ-7（已定）：`interactionModes` 空陣列（#171 Phase A 上線前建立的舊期）→ 卡片地點列隱藏，不顯示「線上」。
