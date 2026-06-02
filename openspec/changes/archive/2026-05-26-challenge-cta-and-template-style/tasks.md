## 1. DB Schema（daodao-storage）

- [x] 1.1 新增 `migrate/sql/034_add_source_practice_id_to_practices.sql`：`ALTER TABLE practices ADD COLUMN source_practice_id INT DEFAULT NULL REFERENCES practices(id) ON DELETE SET NULL`
- [x] 1.2 新增 `migrate/sql/035_add_copy_count_to_practices.sql`：`ALTER TABLE practices ADD COLUMN copy_count INT NOT NULL DEFAULT 0`
- [x] 1.3 更新 `schema/410_create_table_practices.sql`：在 CREATE TABLE DDL 加入 `source_practice_id`、`copy_count` 欄位定義

**驗收條件：** migration 可執行成功；schema 檔與 migration 一致

---

## 2. 後端：新增複製實踐 API（daodao-server）

- [x] 2.1 在 `practice.routes.ts` 新增 `POST /api/v1/practices/:id/copy` route（含 OpenAPI 文件、`authenticate` middleware）
- [x] 2.2 在 `practice.service.ts` 實作 `copyPractice(sourceId, userId)` factory function，帶入指定欄位、寫入 source_practice_id、status 設 `'not_started'`、progress_percentage 設 `INITIAL_PROGRESS`（20）、start_date 設今日、end_date = today + duration_days - 1、user_id 設當前使用者，並將來源實踐的 copy_count +1。**回傳 `external_id`（UUID 字串），不是 internal numeric id**，使前端 `/practices/:id/edit` 等路由能直接使用。
- [x] 2.3 在 `practice.validators.ts` 新增 copy endpoint 的 request/response schema（Zod）
- [x] 2.4 在 `practice.controller.ts` 新增 `copyPractice` handler，處理以下情境：
  - 401（未登入）
  - 404（來源實踐不存在）
  - 403（複製他人的非 public 實踐；複製自己的實踐不受此限）
- [x] 2.5 在 `prisma/schema.prisma` 新增 `source_practice_id`、`copy_count` 欄位，執行 `prisma generate`
- [x] 2.6 補充 integration test：成功複製、複製非 public、複製不存在、未登入四個 scenario

**驗收條件：** `POST /api/v1/practices/:id/copy` 回傳 201 + `{ id }`；新實踐的 source_practice_id 正確記錄；來源實踐 copy_count +1；錯誤情境回傳正確 HTTP status

---

## 3. 前端 API Hook（daodao-f2e，base `dev`，參考 `feat/challenge`）

- [x] 3.1 在 `packages/api/src/services/practice-hooks.ts` 新增 `useCopyPractice()` mutation hook，呼叫 `POST /api/v1/practices/:id/copy`，回傳新實踐 id
- [x] 3.2 在 `packages/api/src/services/practice.ts` 新增 `copyPractice(id)` service function（Zod response 驗證）

**驗收條件：** hook 可在元件中呼叫，loading/error/success 狀態正確

---

## 4. 前端 UI：詳情頁 CTA 移位（daodao-f2e）

- [x] 4.1 修改 `practice-detail-shell.tsx`：將「我也想實踐」按鈕從 `PracticeOverviewCard` 內部移至卡片外部（卡片下方、獨立全寬，`outline` 樣式）
- [x] 4.2 確認按鈕僅對非擁有者顯示、未登入者點擊導向登入

**驗收條件：** 在 `/dev/challenge-preview` 看到按鈕位於卡片外部；擁有者視角不顯示

---

## 5. 前端 UI：列表卡片加入 CTA（daodao-f2e）

- [x] 5.1 在 `CommunityChallengeCard` 新增 `onCopyPractice?: (practiceId: string) => void` prop，並渲染「我也想實踐」按鈕（待 `feat/challenge` merge 後實作）
- [x] 5.2 在 `ExploreTopicCard`（`explore-topics-section.tsx`）同樣加入 `onCopyPractice` prop 與按鈕
- [x] 5.3 在父層（dashboard 或對應頁面）注入 `useCopyPractice()` 並傳入 prop

**驗收條件：** 探索列表每張卡片顯示 CTA，點擊後觸發複製流程

---

## 6. 前端：複製成功慶祝畫面接線（daodao-f2e）

- [x] 6.1 新建 `/practices/copy-success/page.tsx`，接收 `practiceId` query param，呼叫 `GET /practices/:id` 取得實踐資料後渲染慶祝畫面（視覺設計參考 `feat/challenge` 的 `dev/copy-success-preview`）
- [x] 6.2 `useCopyPractice()` 成功後 router.push 到慶祝頁，帶入新實踐 id
- [x] 6.3 慶祝頁「馬上開始」導向 `/practices/:id`；「編輯內容」導向 `/practices/:id/edit`

**驗收條件：** 完整複製流程可走通（點擊 CTA → API → 慶祝畫面 → 下一步）

---

## 7. 前端 UI：「建立複本」按鈕（複製自己，daodao-f2e）

- [x] 7.1 在 `practice-detail-shell.tsx` 的 owner 選單（`...`）加入「建立複本」選項，點擊後呼叫 `useCopyPractice()` 並跳轉慶祝畫面

**驗收條件：** 擁有者視角的 `...` 選單出現「建立複本」；點擊後複製自己的實踐，跳轉 `/practices/copy-success?practiceId={newId}`

---

## 8. 前端：Template 預覽樣式調整（daodao-f2e）

- [x] 8.1 依設計稿更新 `/dev/template-preview` 頁面樣式（與複製成功畫面設計語言一致）

**驗收條件：** `/dev/template-preview` 樣式符合設計稿，無版面破版
