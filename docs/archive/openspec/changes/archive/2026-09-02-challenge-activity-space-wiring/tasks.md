> 執行順序：1（storage）→ 2（server）→ 3（f2e）。分支皆為 `claude/frontend-challenge-activity-space-ouf0z5`。契約以 `design.md`「API contract 摘要」與 `specs/*/spec.md` 為準。f2e 的 `packages/api/src/types.ts` 由 server 生成物同步，禁手改。

## 1. DB Migration（daodao-storage）

- [x] 1.1 `daodao-storage` — 新增 `migrate/sql/086_add_cohort_visibility.sql`：`cohorts.visibility VARCHAR(20) NOT NULL DEFAULT 'private'` + COMMENT + partial index（design.md 的 SQL），以 `IF NOT EXISTS` 冪等
  - 驗收：dev DB apply 兩次皆無錯；`\d cohorts` 顯示欄位與 index；既有列全為 `private`
  - 預估：1h
- [x] 1.2 `daodao-storage` — 回寫 `schema/393_create_table_cohorts.sql`（欄位、註解、index），跑 `check_schema_sync.py` 不新增漂移
  - 驗收：pre-commit-check 通過；schema-sync-check 無新警告
  - 預估：0.5h

## 2. 後端（daodao-server）

- [x] 2.1 `daodao-server` — Prisma `db pull` 或手改 `cohorts.visibility`，`pnpm run prisma:generate`，`pnpm run schema:drift` 無漂移；新增 `src/constants/cohort-visibility.ts`（`COHORT_VISIBILITY = { PRIVATE, PUBLIC }`）
  - 驗收：typecheck 通過；drift 檢查通過
  - 預估：1h
- [x] 2.2 `daodao-server` — `cohort.validators.ts` 加 `cohortVisibilitySchema`，`createCohortSchema`（default private）/ `updateCohortSchema` / `cohortResponseSchema` / `organizationCohortResponseSchema` 補 `visibility`；`cohort.service.ts` create/update/toResponse 帶欄位；admin-challenge 的 cohort schema **不**加
  - 驗收：單元測試：未帶 → private；帶 `'public'` 建立後 GET 回 `public`；帶非法值 400；admin challenge 端點回應不含 `visibility`
  - 預估：2h
- [x] 2.3 `daodao-server` — 新增 `src/validators/activity.validator.ts`（design.md contract）與 `src/services/activity.service.ts`：`list(userId|null)`、`getDetail(cohortId, userId|null)`；抽出 `challenge.service.ts` 的 `deriveRunStatus` / `deriveJoinability` / participant 計數到共用 `cohort-run-state.ts`，joinability 加 `paused` 分支；`joinToken` 只在 `canJoin` 時回傳
  - 驗收：整合測試：public+published 出現、private 不出現、draft 不出現、kind=challenge 不出現、paused → `paused` 且 token null、full → token null、登入者 `isJoined` 正確；challenge 既有測試維持綠
  - 預估：4h
- [x] 2.4 `daodao-server` — 新增 `src/routes/activity.routes.ts`、`activity.controller.ts`，`app.ts` 掛 `/api/v1/activities`（optionalAuth）；`registry.registerPath` 兩條；`pnpm run openapi:generate` + `openapi:generate-types`
  - 驗收：supertest 打通兩端點；`openapi.json` 含 `/api/v1/activities`、`/api/v1/activities/{cohortId}` 且 cohort schema 含 `visibility`
  - 預估：2h
- [x] 2.5 `daodao-server` — 重寫 `space.service.ts` 的 `listMySpaces`（design D3）：challenge 卡與 event_course 卡改由 `cohort_enrollments` 聚合，移除 `TODO(#138)` 與 `space_members` 查詢；`space.validators.ts` 的 `spaceListItemSchema.id` 改 `string | null` 並補說明
  - 驗收：整合測試：無 enrollment → 三種卡數值為 0 且只有 personal+challenge；加入一檔挑戰 → challenge 卡 memberCount/practiceCount 正確；joined 兩期 lighthouse → 兩張 event_course 卡、`id` 為 cohortId 字串、依 lastActivityAt 排序；exit 後消失；既有 `/spaces/:id/*` 測試維持綠
  - 預估：4h
- [x] 2.6 `daodao-server` — lint + typecheck + 全套測試；commit 依 format-commit skill；push
  - 驗收：CI 綠；openapi 生成物已 commit
  - 預估：1h

## 3. 前端（daodao-f2e）

- [x] 3.1 `daodao-f2e` — 從 server 分支同步 `packages/api/src/types.ts`（生成物，不手改）；新增 `packages/api/src/services/activity.ts` + `activity-hooks.ts`（`useActivities`、`useActivity`），barrel 匯出；`cohort.ts` 的 cohort zod schema 補 `visibility`
  - 驗收：typecheck 通過；service 單元測試（mock client）
  - 預估：2h
- [x] 3.2 `daodao-f2e` — `apps/product/src/app/[locale]/activities/page.tsx` 移除 `MOCK_*`，改用 `useActivities`；篩選只留 全部／開放加入中；卡片抽成 `components/activity/activity-card.tsx`（沿用 `ChallengeCard` 的進度條與頭像堆疊樣式）；CTA：`canJoin` → `/cohorts/join/[joinToken]`，`isJoined` → `/cohorts/[id]`，否則停用並顯示原因；空狀態；i18n `explore_activities` 補 `unavailable_paused/full/expired`、`empty`
  - 驗收：瀏覽器：未登入可看、點加入進入既有加入流程、已加入顯示徽章、空列表顯示空狀態；390px 版面
  - 預估：4h
- [x] 3.3 `daodao-f2e` — 燈塔 `components/lighthouse/programs-manager.tsx` 期建立／編輯表單加「公開到探索活動頁」checkbox（design D5 文案），`createCohort`/`updateCohort` 帶 `visibility`；期列表顯示「公開」標籤；i18n `lighthouse` namespace 補 key
  - 驗收：勾選後儲存 → 探索頁出現；取消 → 消失；表單提示文案含「連結不會自動失效」
  - 預估:3h
- [x] 3.4 `daodao-f2e` — `components/spaces/space-card.tsx` 的 `event_course` href 改 `/cohorts/${id}`；`space-hooks.ts` 型別隨 types.ts 更新；確認 `/spaces/challenge` 與 `/spaces/personal` 不受影響
  - 驗收：點活動卡開學員頁；challenge 卡數字反映 server 真資料；typecheck 通過
  - 預估：1.5h
- [x] 3.5 `daodao-f2e` — 移除死碼 `apps/product/src/hooks/use-challenges.ts` 內的 mock `useChallenges`（保留 `IExploreTopicRecommendation` 型別或搬到 constants）
  - 驗收：`grep -rn "mock_challenge_" apps/product/src` 為空；lint 通過
  - 預估：1h
- [x] 3.6 `daodao-f2e` — lint + typecheck + vitest；commit 依 format-commit skill；push
  - 驗收：CI 綠
  - 預估：1h

## 驗證備註

- storage：migration 086 於本地 Postgres 16 載入全部 schema 後套用兩次，冪等、既有列預設 private
- server：typecheck / lint 通過；affected 單元測試 63/63；全套 unit 有 7 個套件在改動前即失敗（環境相關，與本次無關）；schema:drift 無漂移
- f2e：typecheck 17/17；lint 錯誤全在未觸及檔案（既有）；product vitest 250/250；api vitest 只剩既有的 dashboard fixture 失敗
- **未做瀏覽器實測**（本環境無 DB / Redis 可起 server），3.2 / 3.3 的畫面驗收待 dev 環境部署後補

## 4. 收尾（daodao）

- [x] 4.1 `daodao` — 開 issue「一般使用者建立活動課程（自動建單人 organization、開放 /lighthouse）」與「空間共同挑戰子頁列出挑戰」，引用本 change（→ #173、#174）；更新 `docs/product/prd/learning-ecosystem.md` 共同挑戰狀態（已上線）與 `scripts/product_status_manifest.yml` 燈塔 signals（指到實際檔案）
  - 驗收：兩張 issue 建立；文件狀態與程式碼一致
  - 預估：1h
