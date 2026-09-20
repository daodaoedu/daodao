## 0. 前置：Schema 同步（daodao-server）

- [x] 0.1 確認 migration 編號可用：執行 `make migrate-sql-status-dev`（或查 `migration_history` 表），確認 `040` 未被佔用
  - **AC**: 確認後記錄可用的起始編號

- [x] 0.2 執行 migration 後，在 daodao-server 跑 `pnpm run prisma db pull && pnpm run prisma:generate`，讓新表進入 `generated/prisma`；手動補 `schema.prisma` 的 relation 名稱（introspect 不自動生）
  - **AC**: `pnpm run typecheck` 無型別錯誤

## 1. 資料庫 Schema（daodao-storage）

- [x] 1.1 建立 migration `040_create_persona_tables.sql`：建立 `persona_questions`（id, prompt, question_type, options JSONB, is_new_user_priority, created_at）、`persona_answers`（id, user_id, question_id, selected_value, text_answer, created_at, updated_at）、`persona_skips`（id, user_id, question_id, skip_count, suppressed, updated_at）、`persona_resonances`（id, user_id, answer_id, created_at）、`persona_user_state`（user_id PK, session_count_since_last_prompt, last_prompt_timestamp, last_dismissed_at, created_at）；加必要索引
  - **AC**:
    - 檔案頭有標準 `==` header（文件說明 / 用途 / 表格修改 / 日期），格式參照 `032_create_ai_llm_tables.sql:1-9`
    - 所有 `CREATE TYPE / TABLE / INDEX` 包在 `DO $$ BEGIN ... END $$;` 冪等包裝
    - enum 命名為 `persona_question_type_t`（`_t` 後綴，避免與既有 `question_type_t` 衝突），用 `EXCEPTION WHEN duplicate_object THEN NULL` 包裝
    - column 一律 snake_case 加雙引號、`TIMESTAMPTZ`、FK 顯式 `ON DELETE CASCADE`
    - `persona_answers(user_id, question_id)` unique index 確保 upsert 正確
    - `persona_resonances(user_id, answer_id)` unique index 防重複共鳴
    - migration 在 dev DB 順利執行，`\d persona_questions` 可看到正確欄位

- [x] 1.2 建立 migration `041_seed_persona_questions.sql`：植入初始問題庫（選擇題 ≥ 3 題、完成句子題 ≥ 3 題、具體情境題 ≥ 3 題），其中至少 5 題標記 `is_new_user_priority = true`
  - **AC**:
    - 檔案頭有標準 `==` header
    - `INSERT` 使用 `ON CONFLICT DO NOTHING` 確保冪等
    - `SELECT COUNT(*) FROM persona_questions` >= 10；`is_new_user_priority = true` 的題目 >= 5

## 2. 後端 API — 問題庫與答題（daodao-server）

- [x] 2.0 在 `src/routes/index.ts` 新增 `import personaRoutes from './persona.routes'` 並加入 `router.use('/persona', personaRoutes)`；更新該檔案的路由清單註解
  - **AC**: `GET /api/v1/persona/questions` 可被 router 正確導向

- [x] 2.1 建立 `src/routes/persona.routes.ts`、`src/controllers/persona.controller.ts`、`src/services/persona.service.ts`、`src/validators/persona.validators.ts`；實作 `GET /api/v1/persona/questions`，附帶當前使用者的 `answered`、`skip_count`、`suppressed` 狀態；Zod schema 加 `.openapi()` 標籤；`registry.registerPath()` 完整註冊
  - **AC**: 呼叫 API 回傳正確問題列表；`answered` 依實際答題狀態回填；router 層用 `validate(schema, 'query')` middleware；service 用 factory function export

- [x] 2.2 實作 `POST /api/v1/persona/answers`：支援 `selectedValue`（選擇題）與 `textAnswer`（文字題）；同一使用者同一問題 upsert（依 unique index on user_id+question_id）；空字串 throw `BadRequestError`；OpenAPI 註冊
  - **AC**: 新增答案回 201、更新回 200；空白文字回 400（格式：`{ success: false, error: { code, message } }`）；`persona_answers` 資料正確寫入；DB column 用 snake_case（`selected_value / text_answer`），API JSON 用 camelCase（由 `formatPersonaAnswer()` 轉換）

- [x] 2.3 實作 `POST /api/v1/persona/skips`：遞增 `skip_count`；達 3 次設 `suppressed = true`；OpenAPI 註冊
  - **AC**: 第 3 次 skip 後 `suppressed = true`；後續 `GET /persona/questions` 不再回傳該題給同一使用者

- [x] 2.4 實作 `POST /api/v1/persona/resonances` 與 `DELETE /api/v1/persona/resonances/:answerId`；重複新增 throw `ConflictError`（回 409）；OpenAPI 註冊
  - **AC**: 新增共鳴成功回 201；重複操作回 409；刪除後 `resonanceCount` 正確遞減；`resonanceCount` 用 `COUNT(*)` groupBy 聚合，非多次 N+1 查詢

- [x] 2.5 server 路由完成後執行 `pnpm run types:generate`，更新 `openapi.json`；確認 f2e `packages/api` 可讀到新型別
  - **AC**: `packages/api/src/openapi.d.ts`（或對應 type 檔）包含 `PersonaQuestion / PersonaAnswer / PersonaCarouselState` 等 schema；`pnpm run typecheck`（f2e）無型別錯誤

## 3. 後端 API — 閘門與輪播狀態（daodao-server）

- [x] 3.1 實作閘門工具函式 `getPassportState(userId)`：計算 `answeredCount = COUNT(persona_answers WHERE user_id = ?)`，回傳 `{ isLocked: boolean, answeredCount, answersNeeded }`；確認 `persona_answers(user_id)` index 存在
  - **AC**: answeredCount < 5 時 isLocked = true；>= 5 時 isLocked = false；可被 3.2、4.1、4.2 複用

- [x] 3.2 實作 `GET /api/v1/persona/carousel-state`：依新手期（`created_at + 5 days > now()` 動態計算）vs 一般用戶出現規則計算 `shouldShow`；選取最多 5 題（排除已答、已壓制，確保輪完一輪再重複）；`shouldShow: true` 時更新 `last_prompt_timestamp`、重設 `session_count_since_last_prompt = 0`；支援 `?replace=<questionId>` 換一題；OpenAPI 註冊
  - **AC**: 新手期使用者當天未答題未 dismiss 時 `shouldShow: true`；一般用戶 session < 2 時 `shouldShow: false`；全數回答後回傳 `allAnswered: true, shouldShow: false`

- [x] 3.3 實作 `POST /api/v1/persona/carousel-dismiss`：寫入 `last_dismissed_at = today`（UTC date）；重設 `session_count_since_last_prompt = 0`；OpenAPI 註冊
  - **AC**: dismiss 後同日再呼叫 `carousel-state` 回傳 `shouldShow: false`；隔日（UTC 日曆天）恢復正常判斷

- [x] 3.4 在所有 auth token 核發路徑中遞增 `session_count_since_last_prompt`：grep `jwt.sign` 找出所有呼叫點（包含 `login`、`register`、`refresh`、`googleCallback` 等），每處加入 `personaService.incrementSession(userId)`（upsert `persona_user_state`）
  - **AC**: `grep -n "jwt.sign"` 的所有路徑都有對應的 incrementSession；登入後 session_count 正確遞增 1；refresh token 不重複計數（依業務邏輯決定是否排除）

## 4. 後端 API — Profile 人物誌（daodao-server）

- [x] 4.1 實作 `GET /api/v1/persona/profile/me`：回傳所有問題，已答附 `answer`（含 `resonanceCount`）、未答標記 `isPlaceholder: true`；`resonanceCount` 用聚合查詢（非 N+1）；OpenAPI 註冊
  - **AC**: 回應包含全部問題；已答題目 `answer` 欄位非 null；未答題目 `isPlaceholder: true`；`pnpm run typecheck` 無錯誤

- [x] 4.2 實作 `GET /api/v1/persona/profile/:userId`：回傳目標使用者已答問題列表（含答案與 `resonanceCount`）；若請求者 `isLocked` 則回應加上 `viewerIsLocked: true` 與 `answersNeeded`；支援 `?exclude=<questionId>` 換一題；optionalAuth middleware（未登入可瀏覽但無 isLocked 判斷）；OpenAPI 註冊
  - **AC**: 訪客只看到目標使用者已答問題；請求者 isLocked 時回應含正確 `answersNeeded`；exclude 參數正確排除指定題

## 5. 前端 — @daodao/api persona 套件（daodao-f2e / packages/api）

- [x] 5.0 在 `packages/api/src/services/` 新增 `persona.ts`（server-side / client-side fetch 函式，參考 `services/reaction.ts`）與 `persona-hooks.ts`（`useQuery` / `useMutate` hooks，參考 `services/reaction-hooks.ts`）；從 `packages/api/src/index.ts` 確認已被 `export *` 涵蓋
  - **AC**: `import { usePersonaCarouselState, submitPersonaAnswer } from '@daodao/api'` 可成功 resolve；所有函式型別來自 `openapi.d.ts` 的 `paths / components`，無 `any`

## 6. 前端 — Profile 人物誌分頁（daodao-f2e / product）

- [x] 6.1 決定 Profile Tab 容器架構：評估現有 `users/[identifier]/page.tsx`（目前無 Tabs）是否改為 client Tabs 容器（參考 `resource-detail-client.tsx:55-77`），或僅在 `me/` 路徑新增獨立頁面；確認後於 `users/[identifier]/` 或 `me/` 加入 Tab 框架，state 同步至 URL query string（`?tab=persona`）
  - **AC**: Tab 切換後 URL 正確更新；重新整理後 Tab 狀態保留；`TabEnum` 含 `persona` key

- [x] 6.2 實作「我的學習人物誌」分頁：用 `usePersonaProfileMe()` hook 串接；已答卡片亮起呈現答案與 `resonanceCount`，未答以虛線空位呈現；i18n key 補齊（`persona.myProfile.*`）
  - **AC**: 切換 Tab 可見問題列表；已答 / 未答視覺差異清晰；無 `any` 型別

- [x] 6.3 實作就地回答（Inline Answer）：點擊虛線空位展開回答介面（選擇題用按鈕組，文字題用 textarea）；用 `submitPersonaAnswer()` 提交，檢查 `response.error` 並 `toast.error()`；成功後 SWR mutate 即時更新卡片狀態
  - **AC**: 提交後卡片由虛線變亮起；不需整頁重新整理；失敗時 toast 正確顯示

- [x] 6.4 實作訪客 Profile 人物誌視圖：單一卡片；「換一題」用 `usePersonaProfileUser({ exclude: questionId })` hook；`viewerIsLocked: true` 時顯示「再回答 N 題才能查看」i18n 文字；共鳴按鈕用 `addPersonaResonance()` 並即時更新計數；用 `@daodao/ui` 元件
  - **AC**: 訪客看不到目標使用者未答問題；`isLocked` 時顯示正確 N 值；共鳴按鈕正確 fire

## 7. 前端 — 靈感牆輪播（daodao-f2e / product）

- [x] 7.1 建立 `ResonanceCarousel` 組件：直接複用 `@daodao/ui/components/carousel`（Embla-based，已存在）組合卡片；dismiss 按鈕呼叫 `dismissPersonaCarousel()` + SWR mutate；用 `usePersonaCarouselState()` hook 決定是否 render；位置在靈感牆前 10 則隨機插入（server-side 決定插入 index）；i18n key `persona.carousel.*`
  - **AC**: `shouldShow: false` 時組件完全不 render；dismiss 後當天不再顯示；`@daodao/ui` carousel 元件正確渲染

- [x] 7.2 輪播卡片鎖定狀態遮蔽：`viewerIsLocked: true` 時最多顯示 2 則他人回應，其餘渲染遮蔽 UI 並附「回答以解鎖」提示
  - **AC**: isLocked 使用者看到 > 2 筆回應時，第 3 筆以後呈現遮蔽 UI；解鎖後重新 fetch 顯示完整

- [x] 7.3 輪播換一題：點擊「換一題」呼叫 `usePersonaCarouselState({ replace: questionId })`，以新問題替換該卡片（不影響其他卡片）
  - **AC**: 換一題後該位置顯示不同問題；其他卡片不閃爍

## 8. 前端 — Mobile 支援（daodao-f2e / mobile）

- [x] 8.1 在 `apps/mobile/src/components/persona/` 用 **Tamagui Tabs**（`@tamagui/tabs`）實作 `PersonaProfileTab`；用 `usePersonaProfileMe()` hook（與 product 共用 `@daodao/api`）串接資料；Tamagui 樣式 token 替代 Tailwind
  - **AC**: iOS / Android Simulator 可見人物誌分頁；已答 / 未答視覺區別清晰

- [x] 8.2 選定 React Native carousel 套件（建議 `react-native-snap-carousel` 或 Tamagui ScrollView 橫向）並建立 `ResonanceCarousel` mobile 版；用 `usePersonaCarouselState()` hook；dismiss 與換一題邏輯與 product 共用 service 函式
  - **AC**: iOS / Android Simulator 符合條件時可見輪播；dismiss 後當天不再顯示

## 9. 測試（daodao-server / daodao-f2e）

- [x] 9.1 為 persona service 撰寫單元測試（mock Prisma）：閘門邏輯（answeredCount < 5 / >= 5）、`carousel shouldShow` 計算（新手期 5 種情境、一般用戶 session count / 48h / dismiss）、skip suppressed 邏輯（第 3 次設 suppressed）
  - **AC**: `pnpm test` 通過；覆蓋 spec 中所有 Scenario；參考既有 `src/__tests__/` 結構

- [x] 9.2 為 persona API routes 撰寫整合測試（真實測試 DB）：答題 upsert（新增 201 / 更新 200）、空字串回 400、共鳴重複回 409、dismiss 後 shouldShow = false、訪客 isLocked 回傳正確 answersNeeded
  - **AC**: 所有 integration tests pass；regression test 確保既有路由（reactions / survey 等）不受影響

- [ ] 9.3 E2E smoke test：答題 5 題前後 isLocked 狀態正確切換；dismiss 後當天不再顯示輪播；重新整理後 Tab 狀態保留
  - **AC**: E2E test pass on CI
