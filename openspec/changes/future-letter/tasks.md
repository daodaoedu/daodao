> 0-11 為初版歷史工作紀錄；與 FRD v0.1 衝突之內容一律由 12-13 取代，不代表最終驗收契約。最終契約以 `specs/future-letter/spec.md` 為準。

## 0. DB Migration

- [x] **0.1** `daodao-storage` — 新增 migration SQL `migrate/sql/XXXX_create_future_letters.sql`
  ```sql
  -- Up
  CREATE TABLE future_letters (
    id SERIAL PRIMARY KEY,
    external_id UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    user_id INT NOT NULL REFERENCES users(id),
    current_self TEXT NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    deliver_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    practice_id INT REFERENCES practices(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE INDEX idx_future_letters_user_id ON future_letters(user_id);
  CREATE INDEX idx_future_letters_status_deliver_at ON future_letters(status, deliver_at);

  -- Down
  DROP TABLE IF EXISTS future_letters;
  ```
  - 驗收：migration up/down 可乾淨執行；`\d future_letters` 顯示正確欄位與索引
  - 預估：0.5h

- [x] **0.2** `daodao-server` — 同步新表至 Prisma schema，再執行 `pnpm run prisma:generate` 生成 Prisma client types
  - 驗收：`schema.prisma` 包含 `future_letters` model；`generated/prisma` 中包含對應型別
  - 預估：0.5h

## 1. 後端：Types + Validators

- [x] **1.1** `daodao-server` — 新增 `src/types/future-letter.types.ts`，定義 `FutureLetterEntity` interface
  ```typescript
  interface FutureLetterEntity {
    externalId: string;
    currentSelf: string;
    message: string;
    status: 'draft' | 'scheduled' | 'delivered' | 'deleted';
    deliverAt: string | null;
    deliveredAt: string | null;
    practiceId: string | null; // external_id of related practice
    practice: { id: string; title: string } | null;
    createdAt: string;
    updatedAt: string;
  }
  ```
  - 驗收：TypeScript 編譯通過
  - 預估：0.5h

- [x] **1.2** `daodao-server` — 新增 `src/validators/future-letter.validators.ts`，定義 Zod schemas
  - `createFutureLetterSchema`：`currentSelf` (0-2000), `message` (0-2000)，草稿允許空字串；`deliverAt` (optional ISO), `practiceId` (optional UUID)
  - `updateFutureLetterSchema`：partial of create（所有欄位 optional）
  - `sendFutureLetterSchema`：`deliverAt` (required, >= now+7d, <= now+90d)；service 在寄出時驗證既有草稿的 `currentSelf` / `message` 皆非空
  - 驗收：各 schema parse 正確；`deliverAt` 邊界值（7d 含、90d 含）驗證通過
  - 預估：1h

## 2. 後端：Service

- [x] **2.1** `daodao-server` — 新增 `src/services/future-letter.service.ts`
  - `create(userId, data)` — 建立草稿（status 固定為 draft）
  - `findAllByUser(userId, filters)` — 列出使用者信件（排除 deleted），支援 status filter + 分頁，join practice 帶出 title
  - `findById(userId, externalId)` — 取得單封信件（驗證 ownership via userId）
  - `update(userId, externalId, data)` — 更新草稿（僅 draft 狀態可更新，非 draft 拋 BadRequestError）
  - `softDelete(userId, externalId)` — 軟刪除（status → deleted）。若原 status 為 scheduled，呼叫 `removeFutureLetterJob(letterId)` 移除 BullMQ job
  - `send(userId, externalId, deliverAt)` — draft → scheduled，建立 BullMQ delayed job（jobId = `future-letter-${letterId}`）
  - `deliver(letterId)` — scheduled → delivered，設 `delivered_at = now()`，觸發 notification event
  - 驗收：各方法 CRUD 正確；狀態轉換符合狀態機；非 Owner 拋 NotFoundError
  - 預估：4h

## 3. 後端：Controller + Routes

- [x] **3.1** `daodao-server` — 新增 `src/controllers/future-letter.controller.ts`
  - `createLetter` / `getLetters` / `getLetter` / `updateLetter` / `deleteLetter` / `sendLetter`
  - 使用 `id-converter.service.ts` 將 external_id ↔ internal id
  - 回應使用 `createSuccessResponse()` / `createPaginatedResponse()`
  - 驗收：各 handler 正確呼叫 service 並回應
  - 預估：2h

- [x] **3.2** `daodao-server` — 新增 `src/routes/future-letter.routes.ts`
  - `POST /api/v1/me/future-letters` → createLetter
  - `GET /api/v1/me/future-letters` → getLetters
  - `GET /api/v1/me/future-letters/:id` → getLetter
  - `PATCH /api/v1/me/future-letters/:id` → updateLetter
  - `DELETE /api/v1/me/future-letters/:id` → deleteLetter
  - `POST /api/v1/me/future-letters/:id/send` → sendLetter
  - 所有 route 掛 `authenticate` + `requireOnboardingComplete` middleware
  - 使用 `registry.registerPath()` 註冊 OpenAPI schema
  - 驗收：`/api-docs` 顯示所有 endpoint；API 可正常呼叫
  - 預估：2h

- [x] **3.3** `daodao-server` — 在 `src/app.ts` 註冊 `future-letter.routes.ts`
  - 驗收：server 啟動無報錯，routes 可達
  - 預估：0.5h

## 4. 後端：BullMQ Queue + Worker

- [x] **4.1** `daodao-server` — 新增 `src/queues/future-letter.queue.ts`
  - 建立 `futureLetterQueue` (BullMQ Queue)
  - export `scheduleFutureLetterDelivery(letterId, delayMs)` — 加入 delayed job，jobId 設為 `future-letter-${letterId}`（確保可用 jobId 查找移除）
  - export `removeFutureLetterJob(letterId)` — 用 `queue.remove(`future-letter-${letterId}`)` 移除 delayed job
  - 驗收：job 可正確加入 queue 且 delay 正確；remove 可正確移除未執行的 job
  - 預估：1h

- [x] **4.2** `daodao-server` — 依現有 queue 架構新增 `src/queues/future-letter.worker.ts`
  - BullMQ Worker 監聯 `future-letter` queue
  - 到期時呼叫 `futureLetterService.deliver(letterId)`
  - error handling + retry（max 3 次，backoff exponential）
  - 驗收：delayed job 到期後信件 status 變為 delivered；通知送出
  - 預估：1.5h

- [x] **4.3** `daodao-server` — 啟動時 recovery 邏輯
  - server 啟動時查詢 `status = 'scheduled' AND deliver_at <= now()` 的信件
  - 對每封建立即時 BullMQ job（delay = 0），使用相同 jobId 命名規則
  - 驗收：Redis 重啟後，過期信件在 server 重啟時自動補送
  - 預估：1h

## 5. 後端：通知整合

- [x] **5.1** `daodao-server` — 在 notification event types 中新增 `FutureLetterDelivered`
  - 通知標題：「你寫給未來的自己的信到了！」
  - 通知內容：信件 message 前 50 字 + 連結到信件詳情頁
  - 驗收：in-app 通知正確建立且可在通知列表看到
  - 預估：1.5h

- [x] **5.2** `daodao-server` — notification preferences 新增 future letter 類型（預設 in-app on, email on）
  - 驗收：使用者可在設定中開關此通知類型
  - 預估：0.5h

## 6. 後端：測試

- [x] **6.1** `daodao-server` — 撰寫 integration test for CRUD
  - 建立草稿成功 201；取得信件 200；更新草稿 200；更新非 draft 回 400；刪除 200
  - 未認證回 401；查詢別人的信回 404
  - 預估：2h

- [x] **6.2** `daodao-server` — 撰寫 integration test for send + deliver
  - send draft → scheduled 成功；send 非 draft 回 400
  - deliverAt < 7d 回 400；deliverAt > 90d 回 400；deliverAt = 7d 成功
  - deliver worker 將 status 改為 delivered + 建立 notification event
  - 預估：2h

## 7. 前端：API Service

- [x] **7.1** `daodao-f2e` — 新增 `packages/api/src/services/future-letter.ts`
  - `createFutureLetter(data)` / `getMyFutureLetters(params)` / `getFutureLetter(id)` / `updateFutureLetter(id, data)` / `deleteFutureLetter(id)` / `sendFutureLetter(id, data)`
  - 驗收：各 function 正確呼叫對應 API endpoint
  - 預估：1h

- [x] **7.2** `daodao-f2e` — 新增 `packages/api/src/services/future-letter-hooks.ts`
  - `useMyFutureLetters(params)` / `useFutureLetter(id)` (SWR hooks)
  - 驗收：hooks 正確 fetch 資料並處理 loading/error
  - 預估：1h

- [x] **7.3** `daodao-f2e` — 更新 `packages/api/src/services/index.ts` barrel export
  - 預估：0.5h

## 8. 前端：接 API

- [x] **8.1** `daodao-f2e` — 更新 `future-letter-dialog.tsx`：表單驗證與 API 串接
  - 「寄出」流程：前端驗證（currentSelf/message 非空且 <= 2000 字、送達時間已選）→ POST 建草稿 → POST /:id/send 排程 → toast.success + 關閉 Modal + mutate
  - 「存草稿」流程：不驗證 → POST 建草稿 → toast.success + 關閉 Modal
  - 錯誤時按 project-rules：檢查 `response.error` → `toast.error(errorMessage)` → return
  - 兩個 textarea 底部加字數計數器 `n / 2000`，超過 2000 字計數器變紅 + 「寄出」按鈕 disabled
  - 驗收：空欄位寄出→驗證錯誤提示；超過字數→按鈕 disabled；正常寄出→toast + 關閉
  - 預估：2h

- [x] **8.2** `daodao-f2e` — 更新 `future-letter-dialog.tsx`：「自訂日期」DatePicker
  - 選擇「自訂日期」後顯示 `@daodao/ui` DatePicker（`packages/ui/src/components/date-picker.tsx`）
  - 可選範圍限制：`today + 7d` ~ `today + 90d`，範圍外 disabled
  - 驗收：選自訂日期→DatePicker 出現→選範圍外日期無法選取→選範圍內日期正常
  - 預估：1h

- [x] **8.3** `daodao-f2e` — 更新 `future-letter-dialog.tsx`：「關聯主題實踐」真實資料
  - Select 改為讀取 `useMyPractices()` 真實資料
  - 只列 in-progress + completed 的實踐
  - 預設「不關聯」
  - 驗收：下拉列出使用者的實踐；選取後 practiceId 正確帶入 API
  - 預估：1h

- [x] **8.4** `daodao-f2e` — 更新 `future-letter-dialog.tsx`：「想對未來的自己說」help tooltip
  - (?) icon 點擊顯示 tooltip/popover：「試著寫下你對未來的期許、想完成的事、或想提醒自己的話」
  - 使用 `@daodao/ui` Popover 或 Tooltip 元件
  - 預估：0.5h

- [x] **8.5** `daodao-f2e` — 更新 `future-letter-timeline.tsx`：接 API + 草稿管理
  - 移除 MOCK_ENTRIES/COLLAPSED_ENTRIES，改用 `useMyFutureLetters()` 取得真實資料
  - delivered 信件顯示為時間軸卡片（含送達日期）
  - scheduled 信件顯示為「等待中」狀態（虛線框 + 倒數天數）
  - draft 信件顯示在獨立「草稿」區塊：標示「草稿」badge + 建立日期
  - 點擊草稿 → 打開 Modal 預填欄位（編輯模式，呼叫 PATCH API）
  - 草稿可刪除（kebab menu → 確認 → DELETE API）
  - 空狀態顯示引導文案
  - 驗收：時間軸正確顯示各狀態信件；草稿可編輯/刪除
  - 預估：3h

## 9. 後端：學習時間軸 API

- [x] **9.1** `daodao-server` — 新增 `src/services/timeline.service.ts`
  - `getTimeline(userId, page, limit)` — 聚合查詢多張表：
    - `future_letters`（status = delivered）
    - `practice_checkins`（使用者的打卡記錄）
    - 里程碑事件（計算連續打卡天數達 7/14/30/60/90 天）
    - `quiz_results`（學習 DNA 結果）
  - 各來源統一為 `TimelineEntry { type, title, description?, date, meta? }`
  - 按 date 倒序合併，支援 cursor-based 分頁
  - 驗收：回傳混合事件流且時間排序正確；分頁斷點無遺漏
  - 預估：4h

- [x] **9.2** `daodao-server` — 新增 `src/controllers/timeline.controller.ts` + `src/routes/timeline.routes.ts`
  - `GET /api/v1/me/timeline` → getTimeline
  - 掛 `authenticate` middleware
  - 使用 `registry.registerPath()` 註冊 OpenAPI schema
  - 驗收：`/api-docs` 顯示 timeline endpoint；API 可正常呼叫
  - 預估：1.5h

- [x] **9.3** `daodao-server` — 在 `src/app.ts` 註冊 `timeline.routes.ts`
  - 預估：0.5h

- [x] **9.4** `daodao-f2e` — 新增 `packages/api/src/services/timeline.ts` + `timeline-hooks.ts`
  - `useMyTimeline(params)` SWR hook
  - 預估：1h

- [x] **9.5** `daodao-f2e` — 更新 `future-letter-timeline.tsx` 改用 timeline API
  - 從 `useMyFutureLetters()` 切換到 `useMyTimeline()`
  - 根據 `type` 欄位渲染不同卡片樣式（check-in / milestone / letter / learning-dna）
  - 驗收：時間軸顯示所有類型事件且排序正確
  - 預估：2h

## 10. 前端：成長對照 UI

- [x] **10.1** `daodao-f2e` — 新增 `apps/product/src/components/future-letter/letter-detail-card.tsx`
  - delivered 信件展開後並排顯示：左欄「寫信時的我」（currentSelf + 寫信日期），右欄「現在的我」（可編輯，讓使用者填寫現在的狀態）
  - 中間顯示 message（當時對未來說的話）
  - 關聯的主題實踐連結（若有）
  - 驗收：delivered 信件點開可看到完整對照 layout
  - 預估：3h

- [x] **10.2** `daodao-f2e` — 在通知點擊後導向信件對照頁
  - 通知中的連結導向 `/mine` 並自動展開對應信件
  - 或新增 `/me/future-letters/:id` 獨立頁面
  - 驗收：收到通知→點擊→看到成長對照卡片
  - 預估：1.5h

## 11. OpenAPI types 同步

- [x] **11.1** 使用 server canonical OpenAPI 生成流程，將新 endpoint types 同步到 `@daodao/api/src/types.ts`
  - 驗收：前端 types.ts 包含 future-letter 相關型別；`pnpm run typecheck` 通過
  - 預估：0.5h

---

**總預估：** ~45h（後端 ~26h 含測試，前端 ~19h）

## 12. FRD v0.1 校準與隱私修正

- [x] **12.1** 更新 proposal/design/spec，採用 FRD v0.1；記錄自訂日期 3-90 天與不顯示字數限制的決策
- [x] **12.2** `daodao-storage` — 新增後續 migration：內容密文/版本、`sent_at`、`opened_at`、`practice_title_snapshot`、單一草稿約束
- [x] **12.3** `daodao-server` — 同步 Prisma schema，加入 authenticated encryption service 與金鑰設定驗證
- [x] **12.4** `daodao-server` — 改為任一非空白欄位可寄出、自訂日期 3-90 天、唯一草稿 upsert
- [x] **12.5** `daodao-server` — scheduled response 全面遮蔽明文；寄出時加密、送達 owner read 時解密
- [x] **12.6** `daodao-server` — 新增 `sentAt` / `openedAt`、冪等 open endpoint、實踐名稱快照
- [x] **12.7** `daodao-server` — 移除 `FutureLetterDelivered` 通知事件、偏好與所有 preview，採 timeline 安靜送達
- [x] **12.8** `daodao-server` — 補齊隱私、ownership、唯一草稿、狀態轉換、刪除與日期邊界測試

## 13. FRD v0.1 前端互動修正

- [x] **13.1** `daodao-f2e` — 寫信 Dialog 支援任一欄寄出、移除字數計數、加入永久反壓力與隱私文案
- [x] **13.2** `daodao-f2e` — 關閉自動保存唯一草稿、空白不保存、CTA 自動還原與介面內刪除草稿
- [x] **13.3** `daodao-f2e` — 自訂日期改為 3-90 天並顯示最晚日期
- [x] **13.4** `daodao-f2e` — 完整足跡改為 API 驅動水平日期座標，支援 scheduled / delivered-unopened / opened 標記
- [x] **13.5** `daodao-f2e` — scheduled 與 delivered/opened 刪除確認；取消為安全預設焦點
- [x] **13.6** `daodao-f2e` — 閱讀時呼叫 open endpoint，移除可編輯 reflection，顯示寄出/送達日期與實踐快照
- [x] **13.7** `daodao-f2e` — 首頁摘要改用共享 API 資料與座標，移除 CTA/menu/tooltip 並支援焦點導流
- [x] **13.8** 重生 OpenAPI/types，補前端 pure logic tests 與 Playwright FRD E2E（含 server/worker logs 和錄影）
  - [x] 重生 OpenAPI/types
  - [x] 補前端 pure logic tests
  - [x] 建立可攜 Playwright FRD E2E、隔離 fixtures、server/worker log attachments 與錄影
