> 執行順序：1 → 2 → 3（→ 4 待 OQ-A 定案）。每個 task 標注子專案與驗收條件。契約以 `specs/*/spec.md` 為準。

## 1. DB Migration（daodao-storage）

- [ ] 1.1 `daodao-storage` — 新增 `migrate/sql/069_relax_practice_duration_checks.sql`：對 `practices` 與 `practice_templates` 各自以 `EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', ...)` 動態查名移除 `duration_days` 與 `session_duration_minutes` 的 CHECK，重加 `duration_days BETWEEN 1 AND 90`、`session_duration_minutes BETWEEN 1 AND 999`；以 `IF NOT EXISTS` 守衛使冪等
  - 驗收：本地 dev DB apply 一次 + 重跑一次皆無錯；`\d practices` / `\d practice_templates` 顯示新 range CHECK；`INSERT ... duration_days = 45` 成功、`= 91` 被拒
  - 預估：1h
- [ ] 1.2 `daodao-storage` — 同步 `schema/410_create_table_practices.sql:19,23` 與 `405_create_table_practice_templates.sql:18,20` 的 DDL 註解與 CHECK（首次 init 路徑一致）
  - 驗收：`grep -n "duration_days" schema/4*.sql` 不再出現 `IN (7, 14, 21, 30)`
  - 預估：0.5h

## 2. 後端（daodao-server）

- [ ] 2.1 `daodao-server` — `practice.validators.ts`：`createPracticeSchema` 補 `templateId` (uuid optional)、`durationDays` 1–90、`sessionDurationMinutes` 1–999、`practiceAction` max 50、`resources` max 10；`updatePracticeSchema` 天數／分鐘同步（`practiceAction` 維持 200）；`createPracticeTemplateSchema` 天數收緊 1–90、分鐘 1–999
  - 驗收：validator 單元測試涵蓋 1／90／91 天、0／999／1000 分鐘、51 字行動、帶 `templateId` parse 後保留
  - 預估：2h
- [ ] 2.2 `daodao-server` — Prisma schema 同步（若 `schema.prisma` 有 CHECK 註解／enum 對應）+ `pnpm run prisma:generate`
  - 驗收：typecheck 通過
  - 預估：0.5h
- [ ] 2.3 `daodao-server` — `practice.service.ts`：抽出 `createCore(tx, data, userId, themeIndex)`（不含 onboarding 副作用），`create()` 改為 `$transaction` 包一次 `createCore`；主題色改由 index 決定
  - 驗收：既有 create 整合測試綠；帶 `templateId` 建立後 `template_id` 非 null（regression test）
  - 預估：3h
- [ ] 2.4 `daodao-server` — 新增 `batchCreate(segments, userId)`：`$transaction` 內依序 `createCore`，themeIndex 連續；refine 各段日期接續、段數 2–3；錯誤 path 為 `segments.<i>.<field>`
  - 驗收：整合測試——3 段合法回 201 三筆有序；第 2 段天數 0 → 400 且 DB 零寫入；4 段 → 400；日期不接續 → 400
  - 預估：4h
- [ ] 2.5 `daodao-server` — `practice.routes.ts`：新增 `POST /practices/batch`（`authenticate` + `validate(batchCreatePracticeSchema)` + 單次 `withOnboardingHook`）與 `POST /practices/templates/batch`；OpenAPI registry 補兩條路徑與 schema
  - 驗收：`pnpm run openapi:generate`（或等價）產出含 batch 端點；supertest 打通
  - 預估：2h
- [ ] 2.6 `daodao-server` — 執行時機自訂值：確認 `otherContext` 以 `、` 串接多個標籤可正確讀回（回應 DTO 拆分為 `customTimePeriods: string[]`）
  - 驗收：建立時送 `otherContext: "洗澡後、遛狗時"`，GET 回傳 `customTimePeriods: ["洗澡後","遛狗時"]`
  - 預估：1.5h
- [ ] 2.7 `daodao-server` — 檢查 `packages/features/action-maker` 生成的 `practiceAction` 可能 > 50 字：在 f2e 呼叫端 `slice(0, 50)`（記入 3.x）或 server 對 `creationMethod = action_generator` 放寬——決定並落實
  - 驗收：action-maker 流程建立實踐不因 50 字限制失敗
  - 預估：1h

## 3. 前端（daodao-f2e / apps/product）

- [ ] 3.1 `daodao-f2e` — `packages/api`：重產 OpenAPI 型別，新增 `batchCreatePractices`、`batchCreatePracticeTemplates` service；`createPractice` 型別含 `templateId`
  - 驗收：typecheck 通過；service 有對應單元測試（mock client）
  - 預估：1.5h
- [ ] 3.2 `daodao-f2e` — 純函式 + 測試：`deriveNameFromAction(action)`（FR-1.10 規則，含 TP-2.1～2.3 案例）、`normalizeFrequency(input)`（TP-5.1～5.4）、`deriveResourceName(url)`（TP-7.1～7.3）、`calcEndDate(start, days)`（含首日）、`allocateSegmentDays(total, n)`（TP-4.5）
  - 驗收：vitest 全綠，每個 TP 案例一個 test
  - 預估：3h
- [ ] 3.3 `daodao-f2e` — `constants/practice-form.ts` + `manual/schema.ts`：`durationDays` 改 number（1–90）、`sessionDurationMinutes` number optional（1–999）、頻率改 `{min,max}`、新增拆段欄位（`isSegmented`、`segments[]` 含逐段 override、`rejectedDayValue`）、`mode: personal|template`（template 時 startDate optional）、`resources[].url` 允許 `""`、`customTimePeriods: string[]`；移除 `DurationDays` 字串 enum 與四組對照表
  - 驗收：schema 單元測試涵蓋 Step 2 驗證彙總的每條錯誤文案
  - 預估：3h
- [ ] 3.4 `daodao-f2e` — 精靈骨架：`manual/page.tsx` 改 `TOTAL_STEPS = 4`，步驟驗證欄位對照更新，`?mode=` 讀取，頁首標題／進度條／摘要區塊依 spec 顯示規則，步驟切換捲頂 + 關日曆，草稿 key 改 `ManualPracticeDraftV2`
  - 驗收：瀏覽器走 4 步，TP-1.1～1.6 通過
  - 預估：3h
- [ ] 3.5 `daodao-f2e` — Step 1：行動 textarea（50 字、計數器、可拉高、最小三行）+ 名稱靜態／編輯狀態（覆寫、清空恢復推導、Enter/Escape）
  - 驗收：TP-2.1～2.9 瀏覽器通過
  - 預估：3h
- [ ] 3.6 `daodao-f2e` — Step 2（未拆段）：行內日曆（今日～+14、預設今日、template 模式隱藏）、天數四按鈕 + 自訂夾限 90、結束日文案、頻率三按鈕 + 自訂正規化、執行時間四按鈕 + 自訂、執行時機五按鈕（3+2）+ 自訂標籤；舊 step-3 併入、`step-2.tsx:35` 結束日改用 `calcEndDate`
  - 驗收：TP-3.1～3.8、TP-5.1～5.9 瀏覽器通過
  - 預估：4h
- [ ] 3.7 `daodao-f2e` — Step 2（拆段）：詢問卡（> 30、拒絕記憶）、段數調整器 2–3、天數分配與日期接續、配額文字、逐段卡片六欄位（名稱 20／行動 50／天數／頻率下拉+其他／時間下拉+其他／時機下拉+其他）、隱藏全域三區塊、≤ 30 自動關閉、「維持一個實踐」連結
  - 驗收：TP-4.1～4.15 瀏覽器通過（段數上限改為 3）
  - 預估：4h
- [ ] 3.8 `daodao-f2e` — Step 3 標籤抽屜：關鍵字輸入、可用標籤空狀態、加入去重、已選用移除、完成清空
  - 驗收：TP-6.1～6.6 通過
  - 預估:2h
- [ ] 3.9 `daodao-f2e` — Step 3 資源：連結輸入 + 擷取中狀態 + 三段錯誤、名稱判定鏈（對照表 → og:title → 推導）、手動模式切換、純名稱資源、去重（連結／名稱）、卡片內編輯（名稱／連結、Enter/Escape、單一編輯態、清空連結轉純文字）、拆段時「用在」指派列
  - 驗收：TP-7.1～7.17、TP-8.1～8.5 通過
  - 預估：4h
- [ ] 3.10 `daodao-f2e` — Step 4 預覽：單段（大標題 + 卡片 + 資訊列省略規則 + 同年省年份 + 全域資源區塊）、多段（逐段卡片 + 共用標籤 + 段內資源）；template 模式無日期區間
  - 驗收：TP-8.6～8.10 通過
  - 預估：3h
- [ ] 3.11 `daodao-f2e` — 送出與完成彈窗：未拆段呼叫 `createPractice`／`createTemplate`，拆段呼叫 batch；成功捲頂 + 彈窗（標題依版本／段數、膠囊列表、主次按鈕、reduced-motion）；失敗停留 Step 4 顯示錯誤；`details[].path` 含 `segments.<i>` 時定位到段卡片
  - 驗收：TP-9.1～9.4 通過；斷網送出不開彈窗
  - 預估：3h
- [ ] 3.12 `daodao-f2e` — 模版流程整併：`template/[templateId]/page.tsx` 改用共用 `toCreateRequest()` 並補送 `templateId`；移除 `mapDurationDaysToString` / `mapFrequencyToFormValue` 的 snap；模版入口導向 `?mode=template`
  - 驗收：從模版建立實踐後 DB `template_id` 非 null；45 天模版帶入後天數顯示 45
  - 預估：2h
- [ ] 3.13 `daodao-f2e` — action-maker：`use-create-practice-from-action.ts` 依 2.7 決定補 `slice(0, 50)` 或不動
  - 驗收：action-maker 端到端建立成功
  - 預估：0.5h
- [ ] 3.14 `daodao-f2e` — 無障礙與稽核：純圖示按鈕 aria-label、40px 目標、Tab 順序、375px 版面、固定頁尾不遮欄位；反遊戲化與範圍外稽核（TP-9.5～9.9、TP-10.x、TP-11.x）
  - 驗收：對應 TP 逐條瀏覽器驗證並截圖
  - 預估：2h

## 4. 共同挑戰 → admin（待 OQ-A 定案，本 change 暫不執行）

- [ ] 4.1 待 PM 確認共同挑戰是 practice_templates 的一種（加 `kind` 欄位 + admin 模版列表）還是 gamification challenges；定案後另開 change 或在此補 tasks
  - 驗收：PM 回覆記入 design.md OQ-A
  - 預估：—
