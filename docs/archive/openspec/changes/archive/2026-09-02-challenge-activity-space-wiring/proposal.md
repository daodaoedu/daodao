# Proposal: 共同挑戰／活動／空間 串接後端

> 2026-09-02 依全 repo 實地盤點與使用者逐項確認產出。上游：issue #138（共同挑戰）、issue #150（主頁 layout 與 sidebar，「空間」的唯一規格來源）。

## Why

「共同挑戰與活動共用 program」的原則在後端已成立（`programs.kind` = `challenge` | `lighthouse`，server PR #432、storage #202 已合併），但前端有三處還沒接到這套資料：

1. 空間列表（`GET /api/v1/spaces`）的「共同挑戰」卡是 server 寫死的虛擬卡（`space.service.ts` 的 `TODO(#138)`），永遠回 0 人、無進行中實踐；而 `/api/v1/challenges` 早已有真資料。
2. 空間列表的「活動課程」卡讀的是 `space_members`（migration 084 的獨立 `spaces` 表），與使用者實際參加的活動（`cohort_enrollments`）完全脫鉤；且 server 沒有任何建立 space 的 API，所以這張卡在正式環境永遠是空的。
3. 探索活動頁 `/activities`（f2e #964）是 100% 假資料：lighthouse 的 cohort 沒有「公開／私密」旗標，也沒有比照 `GET /api/v1/challenges` 的公開列表端點。

## 已確認的產品決策

| 問題 | 決策 |
|---|---|
| 「活動」的本質 | 活動 = lighthouse 的 cohort（`programs.kind='lighthouse'`），不另開模型 |
| 空間「參加的活動」資料來源 | 從 `cohort_enrollments`（status=`joined`）聚合，點進去導向既有學員頁 `/cohorts/[cohortId]` |
| 空間「共同挑戰」卡 | 從 `cohort_enrollments`（`kind='challenge'`）聚合；本輪只補卡片數字，子頁下輪 |
| 活動探索頁 | 本輪一起做：cohort 加公開旗標 + server 公開端點 + f2e 換掉假資料 |
| 公開旗標設定處 | 燈塔後台期表單加開關，預設 `private`；既有 cohort 全部維持非公開 |
| 既有 `spaces` 八張表與區塊編輯 | 保留不動，閒置；本輪不補建立 API |
| 一般使用者建活動（自動建單人 organization） | 不包，另開 issue |

## What Changes

- **新增** `cohorts.visibility`（`private` | `public`，預設 `private`）：只有燈塔 cohort 會用到；共同挑戰 cohort 本來就走 `/challenges` 公開，不讀此欄位
- **新增** `GET /api/v1/activities`（optionalAuth）與 `GET /api/v1/activities/{cohortId}`：列出 `kind='lighthouse'` 且 `visibility='public'`、`status='published'`、未結束的 cohort；回應結構對齊 `challengeSummarySchema`，多帶 `organizationName` 與（可加入時的）`joinToken`
- **修改** 燈塔 cohort API：`createCohortSchema` / `updateCohortSchema` / `cohortResponseSchema` 加 `visibility`
- **修改** `GET /api/v1/spaces`：`challenge` 卡與 `event_course` 卡改由 `cohort_enrollments` 聚合；`event_course` 卡的 `id` 改為 `cohortId`，前端導向 `/cohorts/[cohortId]`
- **修改** f2e：`/activities` 換真資料、卡片「加入」導向既有 `/cohorts/join/[joinToken]` 流程；燈塔期表單加「公開到探索活動頁」開關；空間卡片連結調整
- **修改** admin-ui：不動（共同挑戰不使用 visibility；燈塔組織管理無期表單）

## Capabilities

### New Capabilities

- `activity-discovery`：活動的公開旗標、公開列表端點與探索活動頁
- `space-aggregation`：空間列表三種卡片的真實資料來源與導向規則

### Modified Capabilities

（無 — `challenge-discovery` 既有行為不變；燈塔 cohort 表單只是多一個欄位）

## Non-goals

- 一般使用者建立活動（自動建單人 organization、開放 `/lighthouse`）— 另開 issue
- `spaces` 表的建立 / 加入成員 API；`/spaces/[id]` 區塊首頁與 cohort 的對應 — 閒置，另案
- 空間「共同挑戰」子頁（`/spaces/challenge`）列出挑戰 — 下輪
- 活動的線上／實體、地點欄位：cohort 沒有這些欄位，探索頁本輪不做線上／實體篩選，僅保留「全部／開放加入中」
- 訊息（`/messages`）與管理（`/manage`）placeholder 頁
- mobile app

## Impact

- **daodao-storage**：`migrate/sql/086_add_cohort_visibility.sql` + 回寫 `schema/393_create_table_cohorts.sql`
- **daodao-server**：Prisma db pull + generate；cohort validators/service；新 `activity.routes.ts` / `activity.service.ts` / `activity.validator.ts`；`space.service.ts` 的 `listMySpaces` 重寫；openapi 重生
- **daodao-f2e**：`packages/api` 新 `activity.ts` + `activity-hooks.ts`、`types.ts` 同步；`apps/product` 的 `/activities` 頁、`SpaceCard`、燈塔 `programs-manager.tsx` 期表單；i18n `explore_activities` / `lighthouse` namespace
- **daodao-admin-ui**：無
- **daodao-ai-backend**：無（不讀 cohorts.visibility）
