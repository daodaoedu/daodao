# Design: 共同挑戰／活動／空間 串接後端

## Context

現況（2026-09-02 盤點）：

- **已就緒**：`organization → programs(kind) → cohorts → cohort_enrollments` 鏈；`/api/v1/challenges/*`（探索共同挑戰，f2e 已接）；`/api/v1/me/cohorts`、`/api/v1/cohorts/join/:joinToken`、`/api/v1/cohorts/:cohortId`（學員端，f2e 已接）；燈塔後台 `/api/v1/lighthouse/*`（f2e 已接）。
- **空殼**：`space.service.ts:215` 的共同挑戰虛擬卡；`event_course` 卡讀 `space_members` 但無任何 API 能寫入 `spaces`。
- **假資料**：`apps/product/src/app/[locale]/activities/page.tsx` 的 `MOCK_*`。
- **閘門**：`apps/product/src/middleware.ts` 的 `hasLighthouseAccess` 只擋 `/lighthouse/*` 路由；`/activities` 已在 `global-provider.tsx` 的 publicPattern。

## Decisions

### D1：活動 = lighthouse cohort，公開性放在 `cohorts.visibility`

**決策**：`cohorts` 加 `visibility VARCHAR(20) NOT NULL DEFAULT 'private'`，值域 `private` | `public`。不加 DB CHECK（沿用 `programs.kind` 的 D2 慣例），值域由 server 常量 `COHORT_VISIBILITY` + Zod 守衛。

**理由**：旗標屬於「期」而非「系列」——同一系列可以有內部期與公開招生期。放 program 會讓組織無法只公開某一期。

**替代方案**：`programs.visibility` — 捨棄，粒度不夠。獨立 `activity_listings` 表 — 捨棄，多一張表只為一個 boolean。

**共同挑戰不讀此欄位**：`kind='challenge'` 的可見性由 `/challenges` 端點以 `status='published'` 決定，`visibility` 對它無意義，admin-challenge API 不暴露此欄位。

### D2：公開列表端點獨立掛 `/api/v1/activities`，不塞進 `/lighthouse`

`/api/v1/lighthouse/*` 全部走 `requireOrganizationMember`，且 f2e middleware 對 `/lighthouse` 路由有 ACL。探索頁是「任何人可看」，語意與共同挑戰的 `/challenges` 一致，因此比照它：

```
GET /api/v1/activities                optionalAuth   → activitySummary[]
GET /api/v1/activities/:cohortId      optionalAuth   → activityDetail
```

過濾條件：`program.kind='lighthouse'`、`program.deleted_at IS NULL`、`cohorts.status='published'`、`cohorts.visibility='public'`、`end_date >= today`；`orderBy start_date asc`。

`activitySummary` 對齊 `challengeSummarySchema` 並延伸：

| 欄位 | 來源 | 備註 |
|---|---|---|
| `id` | cohorts.id | |
| `displayName`、`startDate`、`endDate`、`joinDeadline`、`capacity` | cohorts | |
| `programName`、`description` | programs | |
| `organizationName` | organization.name | 探索卡的「主辦」 |
| `participantCount` | cohort_enrollments status=joined 計數 | 與 challenge 同 helper |
| `runStatus` | 由日期推導 | 沿用 `deriveRunStatus` |
| `canJoin`、`unavailableReason` | `deriveJoinability` + `join_paused` | `join_paused=true` → `unavailableReason='paused'` |
| `isJoined` | 登入者的 enrollment | |
| `joinToken` | cohorts.join_token | **只在 `canJoin=true` 時回傳**，否則 `null` |

**加入流程沿用既有 `/cohorts/join/:joinToken`**：探索卡的「加入」按鈕導向 `/cohorts/join/[joinToken]`，走既有的預覽 → 同意 → 加入 → 自動建實踐草稿。不新增 `POST /activities/:id/join`。

**理由**：join_token 本來就是「拿到連結的人可加入」的語意；公開 = 把連結公開在探索頁。`join_paused` / rotate 的既有機制自然生效。

**風險**：`joinToken` 出現在公開 JSON 中，任何人可拿到。這正是「公開」的定義；組織關閉公開後 token 不會自動失效，若要斷開需 rotate。此行為要寫進燈塔期表單的開關說明。

### D3：`listMySpaces` 三張卡全部改由 DB 聚合，`event_course` 卡改指向 cohort

```
personal     : practices（user_id、cohort_id IS NULL）        ← 現況
challenge    : cohort_enrollments joined × program.kind=challenge
event_course : cohort_enrollments joined × program.kind=lighthouse（每期一張卡）
```

- `challenge` 卡：`memberCount` = 我加入的挑戰中「進行中」的參與者總數（若無進行中則取最近一檔）；`practiceCount` = 我的 `practices.cohort_id IN (挑戰 cohort)` 數；`hasActivePractice` = 其中有 `status='active'`；`memberAvatars` 取最近一檔挑戰前 N 位 joined。`id` 維持 `null`，前端仍導 `/spaces/challenge`。
- `event_course` 卡：`id` 改為 `String(cohort.id)`；`name` = `display_name`；`host` = `organization.name`；`memberCount` = joined 數；`practiceCount` / `hasActivePractice` = 我在該 cohort 的實踐；`isHost` = 該 cohort enrollment role ∈ {owner, assistant}；`lastActivityAt` = 我在該 cohort 實踐的最新 `last_checkin_at`，無則 `joined_at`。
- 排序：personal → challenge → event_course by `lastActivityAt desc`。

`spaceListItemSchema` 的 `id` 型別由 uuid 改為 `string | null`（cohortId 字串），並補 `description` 說明語意。`space_members` / `spaces` 表在此函式中不再被讀取，但其餘 `/spaces/:id/*` 端點與表保留不動（Non-goal）。

### D4：f2e 導向規則

| 卡片 | 目標 |
|---|---|
| personal | `/spaces/personal`（不變） |
| challenge | `/spaces/challenge`（不變；子頁內容下輪） |
| event_course | `/cohorts/${id}`（改，原 `/spaces/${id}`） |

`SpaceCard` 的 `href` 改法只動 `event_course` 分支。`/spaces/[id]` 頁面與元件保留，不再有卡片連過去。

### D5：燈塔期表單的公開開關

`programs-manager.tsx` 的 cohort 建立／編輯表單加 checkbox「公開到探索活動頁」，對應 `visibility: 'public' | 'private'`。文案需提示：公開後任何人可從探索頁取得加入連結；取消公開不會讓已流出的連結失效，需另按「重置加入連結」。

## API contract 摘要（供 f2e types 同步）

```ts
// activity.validator.ts
activityRunStatusSchema = z.enum(['upcoming','ongoing','ended'])
activitySummarySchema = {
  id, displayName, programName, description, organizationName,
  startDate, endDate, joinDeadline, capacity,
  participantCount, runStatus, canJoin,
  unavailableReason: z.enum(['ended','expired','full','paused']).nullable(),
  isJoined, joinToken: z.string().uuid().nullable()
}
activityDetailResponseSchema = activitySummarySchema.extend({
  organization: { name, bio, externalLink },
  inviteMessage: z.string().nullable()
})
// cohort.validators.ts
cohortVisibilitySchema = z.enum(['private','public'])
createCohortSchema  += visibility: cohortVisibilitySchema.optional().default('private')
updateCohortSchema  += visibility: cohortVisibilitySchema.optional()
cohortResponseSchema += visibility: cohortVisibilitySchema
// space.validators.ts
spaceListItemSchema.id: z.string().nullable()   // event_course 為 cohortId 字串
```

## Migration SQL（daodao-storage `migrate/sql/086_add_cohort_visibility.sql`）

```sql
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'cohorts' AND column_name = 'visibility'
    ) THEN
        ALTER TABLE "cohorts" ADD COLUMN "visibility" VARCHAR(20) NOT NULL DEFAULT 'private';
        COMMENT ON COLUMN "cohorts"."visibility" IS '探索活動頁可見性：private | public；值域由 daodao-server 常量管控，僅 programs.kind=lighthouse 使用';
        CREATE INDEX IF NOT EXISTS "idx_cohorts_visibility_public"
            ON "cohorts" ("end_date") WHERE "visibility" = 'public' AND "status" = 'published';
        RAISE NOTICE '已新增 cohorts.visibility';
    ELSE
        RAISE NOTICE 'cohorts.visibility 已存在，跳過';
    END IF;
END $$;
```

同步回寫 `schema/393_create_table_cohorts.sql`（欄位 + 註解 + partial index）。

## Open Questions

- OQ-1：探索頁「開放加入中」篩選是否也要排除 `join_paused`？本設計視 paused 為不可加入（`unavailableReason='paused'`），篩選時排除。
- OQ-2：共同挑戰卡 `memberCount` 在同時有多檔進行中挑戰時的定義（本設計：加總）。若產品希望顯示「最近一檔」可在實作時改一行。
