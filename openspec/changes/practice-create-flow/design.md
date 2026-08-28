## Context

現行建立流程：`apps/product/.../practices/create/manual/page.tsx` 五步驟精靈（名稱+行動 → 日期/天數/頻率 → 時間/時機 → 標籤/資源 → 預覽），單一 `POST /api/v1/practices`。程式碼查證（2026-08-28）發現的現況與落差：

| 層 | 現況 | 與新需求的落差 |
|---|---|---|
| storage `410_create_table_practices.sql:19` | `duration_days CHECK IN (7,14,21,30)` | 鎖死自訂天數；**server zod 已允許 7–90（`practice.validators.ts:122-133`），現在送 45 天會過驗證再被 Postgres 擋** |
| storage `410:23` | `session_duration_minutes CHECK IN (15,30,45,60)` | 自訂分鐘同樣被鎖；server zod 允許 5–240，同型落差 |
| storage `405_create_table_practice_templates.sql:18,20` | 同上兩個 CHECK | 模版走同一套規則，需一起放寬；server 模版 zod 卻是 1–365，三處不一致 |
| storage `470_create_table_resources.sql:24` | `url NOT NULL` | server `linkResources` 已用 `url: ''` 寫入（`practice.service.ts:1062-1105`），純名稱資源在資料層**已可行**，不需 migration |
| server `createPracticeSchema` | 無 `templateId`；`validation.middleware.ts:14-45` 以 parse 結果整包取代 `req.body` | `template_id` 永遠 null（既有 bug，隨本 change 修） |
| server | 無批次建立端點；`create()` 無 `$transaction`；主題色依「使用者最後一筆實踐」輪替（`practice.service.ts:478-488`） | 拆段需新端點 + 交易 + 顯式配色 |
| server `validators:249-265` | startDate ≤ today+14（UTC） | 與 FRD 一致，保留 |
| f2e `manual/schema.ts:139` | `durationDays: z.nativeEnum(DurationDays)` 字串 enum；`constants/practice-form.ts:38-93` 四組 7/14/21/30 對照表 | 全部改為 number |
| f2e `step-2.tsx:35` | 結束日 `addDays(start, days)` | **與 server 的 `+days-1` 差一天**，FRD 明定含首日 |
| f2e `step-4.tsx:33-67` | 已有 `extractOgImage` 抓 og:title（8s timeout） | 可沿用，補 FRD 的網域對照／路徑推導 fallback |
| f2e `template/[templateId]/page.tsx:84-96` | 模版天數 snap 到最近的 7/14/21/30 | 放寬後變成有損轉換，需移除 |
| f2e `packages/features/action-maker/.../use-create-practice-from-action.ts:36-49` | 直接呼叫 `createPractice`，hard-code 14 天 | 契約相容即可，不改 |
| admin-ui `ChallengesPage.tsx` | 「共同挑戰」= gamification `challenges` 表（`admin-gamification.service.ts:153-190`），與 practices/practice_templates 無關；「建立挑戰」按鈕無 onClick | 見 Open Questions |

## Goals / Non-Goals

**Goals:**
- 四步驟精靈取代五步驟，個人／模版兩版本共用一套元件
- 天數 1–90、分鐘自訂、頻率／時機自訂，前後端與 DB 三層規則一致
- 拆段一次建立 ≤ 3 筆，交易式、原子
- 名稱推導、頻率正規化、資源名稱推導為純函式 + 單元測試
- 順帶修 `templateId` 靜默丟棄

**Non-Goals:**
- 資源編輯造成 `resources` row 孤兒（`updateResources` 先軟刪再重建）——屬編輯流程，本 change 不碰
- `entity_resources` 標記 deprecated 的後續遷移
- admin-ui 建立共同挑戰表單（見 OQ）
- mobile app（`apps/mobile/providers/CreatePracticeProvider.tsx` 為舊平行副本，不同步）

## Decisions

### D1. 天數／分鐘約束：DB 改 range CHECK，server zod 對齊，前端 number
- storage `069_relax_practice_duration_checks.sql`：`DROP CONSTRAINT IF EXISTS` 再加 `duration_days BETWEEN 1 AND 90`、`session_duration_minutes BETWEEN 1 AND 999`，practices 與 practice_templates 各一組。既有資料全在舊集合內，不需回填。約束為自動命名（`practices_duration_days_check`），用 `011_add_comments_target_type_practice.sql:16` 的 `EXECUTE format(... %I)` 動態查名模式避免名稱猜錯。
- server：`durationDays` 1–90、`sessionDurationMinutes` 1–999（create/update/template 三個 schema 同步；模版由 1–365 收緊到 1–90）。
- 替代方案：只放寬 DB 不動 server（server 已 7–90）——否決，因為分鐘與模版的上限仍三處不一致，一次對齊。

### D2. 拆段走新端點 `POST /api/v1/practices/batch`，不重用單筆端點迴圈
- Body：`{ segments: CreatePracticeRequest[] (2–3) }`；每段沿用 `createPracticeSchema`（含 `templateId`、`tags`、`resources`），`tags` 由前端複製到每段（FRD：標籤全流程共用），`resources` 依指派複製到對應段。
- Server 以 `prisma.$transaction` 包住 N 次 `create()` 的核心；主題色改由呼叫端傳入起始 index 後 `(base + i) % THEME_COLORS.length`，避免交易內讀「最後一筆」拿到同色。
- Refine：各段 `startDate` 接續（第 i+1 段 = 第 i 段 endDate + 1）、天數加總 = 首段 startDate 到末段 endDate 的跨度；任一失敗整批 400 並在 `details[].path` 帶 `segments.<i>.<field>` 讓前端定位到段卡片。
- 回傳 `{ practices: PracticeResponse[] }` 依序。
- 替代方案：前端迴圈打 3 次單筆端點——否決，第 2 筆失敗會留下半成品，且 onboarding hook 會觸發 3 次。
- 模版版本拆段：`POST /practices/templates/batch` 同構（模版無 startDate，接續驗證省略）。

### D3. 執行時機：預設值沿用 enum，自訂值進 `otherContext`
- 五個預設 ↔ 既有 `practiceTimePeriods` enum（`morning|afternoon|evening|night|commute`，UI 文案早餐前／通勤時／午休時／晚餐後／睡前對應）。
- 自訂時機標籤（≤ 20 字、可多個）以 `、` 串接寫入既有 `otherContext`（≤ 500），讀回時拆分。不新增欄位、不動 `practice_time_periods TEXT[]` 的 CHECK。
- 替代：放寬 `practice_time_periods` 為自由文字——否決，會破壞現有以 enum 做的統計／篩選。

### D4. 頻率：正規化在前端純函式，server 只驗最終格式
- 前端 `normalizeFrequency(input): string` 依 FRD 規則輸出 `"2-5"` 或 `"7"`，再拆成 `frequencyMinDays/MaxDays`（單一數字 → min = max）。
- server 維持 1–7 + `min ≤ max` refine，不重複實作正規化。

### D5. 資源名稱：已知網域對照表 → og:title → FRD 路徑推導鏈
- 已知網域先查對照表（確保 TP-7.1「博客來」穩定，不受該站 og:title 文案影響）；其餘沿用 `step-4.tsx` 既有 `extractOgImage` 流程（8s timeout）取 og:title；取不到時走純函式 `deriveResourceName(url)`：路徑最後一段（去連字號／底線、附「｜網域」、排除十六進位或 > 40 字）→ 網域。
- 推導鏈永遠有值，故 FRD「抓不到名稱，幫它取一個吧」只在 URL 無法 parse 時觸發。
- 純名稱資源沿用 server 現行 `url: ''` 慣例，前端送 `url: ""`；資源上限由 server 的 5 放寬到 10（FRD 未設上限，10 為合理防呆）。

### D6. 前端結構：4 個 step 元件 + `useCreatePracticeWizard` 狀態
- 現行 step-3（時間／時機）併入 step-2；step-5 預覽變 step-4。
- 拆段狀態（`segments[]`、`rejectedDayValue`、逐段 override）放在同一個 react-hook-form 表單內，schema 用 `z.discriminatedUnion('isSegmented', ...)`。
- 版本切換：路由 `/practices/create/manual?mode=personal|template`；`mode=template` 時 Step 2 隱藏日期、送 `/practices/templates(/batch)`。現行 `template/[templateId]/page.tsx` 的重複 converter 統一改用共用 `toCreateRequest()`；移除 `mapDurationDaysToString` snap。
- 草稿：`StorageEnum.ManualPracticeDraft` 改名為 `ManualPracticeDraftV2`，舊草稿自然失效。
- 完成彈窗取代 `/practices/create/success` 頁（該頁保留給 action-maker 等其他呼叫端）。
- 結束日計算統一用共用 `calcEndDate(start, days) = addDays(start, days - 1)`，前後端各附測試。

### D7. `templateId` 修正
`createPracticeSchema` 補 `templateId: z.string().uuid().optional()`；`template/[templateId]/page.tsx` 的 converter 補送 `templateId`。加一支 regression test：帶 `templateId` 建立後 `template_id` 非 null。

### D8. 執行順序與 PR 切法
`storage`（migration）→ `server`（validator + batch）→ `f2e`。三個 PR 互相引用、標注 merge 順序；server 端點不依賴 f2e，可先 merge；f2e 在 server 未 merge 前以 OpenAPI 型別重產先行開發。

## Risks / Trade-offs

- [DB CHECK 放寬後舊 client 送任意天數] → 舊前端 UI 仍只有四個按鈕，server 驗 1–90，可控。
- [`practiceAction` 由 200 收緊到 50 擋到既有 caller] → 只收緊 create schema；update schema 維持 200 以免既有資料無法編輯；action-maker 生成文字若超 50 需在該 feature 端 `slice(0, 50)`（tasks 內列為檢查項）。
- [交易內 3 筆 create 觸發 onboarding hook 次數] → batch route 只掛一次 `withOnboardingHook`，以第一筆回應判定。
- [`entity_resources` 標 deprecated] → 本 change 不擴大用途，只沿用；不阻塞。
- [模版 zod 由 1–365 收緊到 1–90] → 查 prod `practice_templates.duration_days` 無 > 90 資料（DB 現有 CHECK 本來就只允許 ≤ 30），無回歸。
- [og:title 擷取 8s] → FRD 已定義「擷取中…」狀態；timeout 後走推導鏈不阻塞。

## Migration Plan

1. storage PR merge → dev DB 跑 `069`，確認 `\d practices` 兩個 CHECK 已換為 range；冪等重跑一次無錯。
2. server PR merge（含 OpenAPI 更新）。
3. f2e PR merge；舊草稿因 key 改名自動失效，無需清理腳本。
4. Rollback：f2e 可獨立 revert；server 端點新增不影響舊路徑；DB CHECK 放寬不可逆但無害（收緊需先確認無超界資料）。

## Open Questions

- **OQ-A 「共同挑戰 → 出現在島島 admin」的落地**：admin-ui 現有的「挑戰」是 gamification `challenges` 表（name/description/startDate/endDate/requiredAction/reward），與 practice_templates 是兩個世界，且 admin 沒有 practice template 列表。需 PM 定義：共同挑戰是 (a) 一個 `practice_templates` row 加 `kind='group_challenge'` 欄位、admin 新增模版列表頁，還是 (b) 走 gamification challenges 另一套流程。**本 change 先實作個人版與「活動課程模版」版；共同挑戰入口與 admin 去向待定案後另開 change。**
- **OQ-B 標籤來源**：FRD 標籤抽屜只有「自訂關鍵字」，沒有系統標籤清單。沿用現行 `tags: string[]`（server 建 `tags` + `entity_tags`），不接推薦；若之後要接 `GET /tags` 建議清單，再加。
