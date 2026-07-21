## 0. 後端：掛載 Image Proxy 路由

- [x] **0.1** `daodao-server` — 在 `src/app.ts` 的 routes 陣列中註冊 `proxy.routes.ts`（檔案已存在含完整實作 + SSRF 防護，但從未掛載）
  - 驗收：`GET /api/v1/proxy/image?url=...` 回傳 200 + Base64 圖片；無效 URL 回傳 400
  - 預估：0.5h

## 0b. DB Migration：insight_edited 欄位

- [x] **0b.1** `daodao-storage` — 新增 migration SQL，在 `practices` 表加 `insight_edited BOOLEAN DEFAULT FALSE NOT NULL`
  - 驗收：migration up/down 可乾淨執行；既有資料 `insight_edited` 預設為 `false`
  - 預估：0.5h

- [x] **0b.2** `daodao-server` — 執行 `pnpm run prisma:generate` 更新 Prisma client types
  - 驗收：`generated/prisma` 中 `practices` 型別包含 `insight_edited`
  - 預估：0.5h

## 1. 後端：Practice API 支援 insight 欄位

- [x] **1.1** `daodao-server` — 在 `src/types/practice.types.ts` 的 `PracticeEntity` interface 新增 `insight?: string` 欄位
  - 驗收：TypeScript 編譯通過，`PracticeEntity` 型別包含 optional `insight`
  - 預估：0.5h

- [x] **1.2** `daodao-server` — 在 `src/services/practice.service.ts` 的 `findById()` 中，Prisma select 加入 `insight: true`，entity mapping 加入 `insight: practice.insight || undefined`
  - 驗收：`GET /api/v1/practices/:id` 回應中包含 `insight` 欄位（有值時為字串，無值時為 `undefined` / 不出現在 JSON）
  - 預估：0.5h

- [x] **1.3** `daodao-server` — 在 `findAll()` 的 practice list mapping 同步加入 `insight`（select + entity mapping），確保列表 API 也能帶出 insight
  - 驗收：`GET /api/v1/me/practices` 回應中每個 practice 包含 `insight` 欄位
  - 預估：0.5h

- [x] **1.4** `daodao-server` — 更新 Swagger/OpenAPI schema，在 practice response 中加入 `insight` 欄位文檔
  - 驗收：`/api-docs` 頁面顯示 `insight` 欄位說明；`pnpm run typecheck` 通過
  - 預估：0.5h

## 1b. 後端：Insight 編輯 API

- [x] **1b.1** `daodao-server` — 在 `src/services/practice.service.ts` 新增 `updateInsight(practiceId, userId, insight)` function：驗證 Owner 身份後 UPDATE `practices.insight` + `insight_edited = true`
  - 驗收：Owner 可更新；非 Owner 回 403；更新後 `insight_edited` 為 true
  - 預估：1h

- [x] **1b.2** `daodao-server` — 在 `src/controllers/practice.controller.ts` 新增 `patchInsight` handler，在 `src/routes/practice.routes.ts` 註冊 `PATCH /api/v1/practices/:id/insight`（auth middleware）
  - 驗收：endpoint 可正常呼叫；Swagger 文檔顯示此 endpoint
  - 預估：1h

- [x] **1b.3** `daodao-server` — 在 `src/validators/practice.validators.ts` 新增 `updateInsightSchema`（`z.object({ insight: z.string().min(1).max(2000) })`）
  - 驗收：空字串回 400；超過 2000 字回 400
  - 預估：0.5h

- [x] **1b.4** `daodao-ai-backend` — 在 `insight_scheduler.py` 的 `get_pending_practices()` 查詢中加入 `AND insight_edited = false` 條件，防止 AI cron 覆蓋使用者編輯過的洞察
  - 驗收：`insight_edited = true` 的實踐不被 cron 重新生成 insight
  - 預估：0.5h

- [x] **1b.5** `daodao-server` — 撰寫 integration test：Owner PATCH 成功 + insight_edited 設為 true；非 Owner PATCH 回 403；未認證回 401
  - 驗收：所有 test case 通過
  - 預估：1.5h

## 2. 後端：Public Practice API

- [x] **2.1** `daodao-server` — 在 `src/services/practice.service.ts` 新增 `findPublicById(externalId: string)` function：查詢 `external_id` 匹配且 `visibility === 'public'` 的實踐（使用 `visibility` 欄位而非 `privacy_status`，對齊現有 `findById()` 的存取控制慣例），回傳精簡資料（title、practiceAction、dates、checkInCount、insight、user info、themeColor、tags）+ topCheckIns（note 最長的 3 筆打卡，含 dayNumber 計算）
  - 驗收：public 實踐回傳正確資料；非 public 實踐拋出 NotFound error；topCheckIns 按 note 長度降序且最多 3 筆
  - 預估：2h

- [x] **2.2** `daodao-server` — 在 `src/validators/practice.validators.ts` 新增 `publicPracticeResponseSchema` Zod schema
  - 驗收：schema 正確驗證 findPublicById 的回傳格式
  - 預估：0.5h

- [x] **2.3** `daodao-server` — 在 `src/controllers/practice.controller.ts` 新增 `getPublicPractice` handler，呼叫 `findPublicById()`
  - 驗收：handler 正確處理成功（200）與 not found（404）回應
  - 預估：0.5h

- [x] **2.4** `daodao-server` — 在 `src/routes/practice.routes.ts` 註冊 `GET /api/v1/practices/:id/public`（無 auth middleware），補充 Swagger 文檔
  - 驗收：endpoint 可被匿名呼叫；`/api-docs` 顯示此 endpoint
  - 預估：0.5h

- [x] **2.5** `daodao-server` — 撰寫 integration test：public 實踐回 200 + 正確資料；private 實踐回 404；不存在的 id 回 404；topCheckIns 數量正確
  - 驗收：所有 test case 通過
  - 預估：2h

## 3. 前端：@daodao/api 型別與 service 更新

- [x] **3.1** `daodao-f2e` — 執行 `pnpm run generate:api` 更新 OpenAPI types（依賴 task 1.4 後端部署）
  - 驗收：generated types 包含 `insight` 欄位
  - 預估：0.5h

- [x] **3.2** `daodao-f2e` — 在 `packages/api/src/services/practice.ts` 的 `PracticeSummary` interface 新增 `insight?: string`
  - 驗收：TypeScript 編譯通過
  - 預估：0.5h

- [x] **3.3** `daodao-f2e` — 在 `getPracticeSummary()` function 中，從 practice response 取出 `insight` 填入 summary 物件
  - 驗收：`usePracticeSummary()` hook 回傳的 summary 包含 insight 值
  - 預估：0.5h

- [x] **3.4** `daodao-f2e` — 在 `packages/api/src/services/practice.ts` 新增 `getPublicPractice(id: string)` function + `usePublicPractice(id)` hook，呼叫 `GET /api/v1/practices/:id/public`
  - 驗收：hook 在 public 實踐時回傳資料；非 public 或不存在時回傳 error
  - 預估：1h

- [x] **3.5** `daodao-f2e` — 在 `packages/api/src/services/index.ts` export 新增的 functions 和 types
  - 驗收：其他 packages/apps 可 import `getPublicPractice`、`usePublicPractice`
  - 預估：0.5h

## 4. 前端：AI 洞察顯示（1a）

- [x] **4.1** `daodao-f2e` — 在 `practice-summary-page.tsx` 中新增「AI 核心洞察」區塊：有 insight 時顯示 inline textarea（可編輯）+ 「萃取核心洞察，AI 輔助」標注 + 引導文案「請編輯它，將其轉化為您真正的專屬知識」；無 insight 時顯示鼓勵語（複用現有 `encouragementText`）
  - 驗收：有 insight → 顯示可編輯 textarea，blur 或按鈕觸發 PATCH API 儲存；無 insight → 顯示鼓勵語
  - 預估：3h

- [x] **4.2** `daodao-f2e` — 在 `@daodao/api` 新增 `updatePracticeInsight(id, insight)` function，呼叫 `PATCH /api/v1/practices/:id/insight`
  - 驗收：成功更新回傳 200；TypeScript 無 any
  - 預估：0.5h

- [x] **4.3** `daodao-f2e` — 新增 i18n 翻譯 key（zh-TW / en）：`summary_insight_title`、`summary_insight_empty`、`summary_insight_edit_hint`、`summary_insight_saved`（toast）
  - 驗收：中英文切換正確顯示；儲存後 toast 顯示
  - 預估：0.5h

## 5. 前端：Owner View Layout 重構

- [x] **5.1** `daodao-f2e` — 重構 `practice-summary-page.tsx` 為兩欄式 layout（左：精選打卡亮點 + AI 洞察 + 匯出；右：公開設定 + 卡片 + 分享），行動裝置（< 768px）回退為單欄堆疊
  - 驗收：桌面版顯示兩欄；行動裝置顯示單欄；現有功能（分享、下載、公開 toggle）不受影響
  - 預估：3h

- [x] **5.2** `daodao-f2e` — 新增「精選打卡亮點」component（`practice-top-checkins.tsx`），從 checkins 中取 note 最長的前 5 筆，顯示 Day N + 日期 + 摘要 + mood icon
  - 驗收：正確計算 Day N（從 startDate 算起）；mood icon 對應正確；note 過長時 truncate
  - 預估：2h

- [x] **5.3** `daodao-f2e` — 新增「查看完整打卡紀錄」連結，導向 `/practices/[id]/check-ins`（或現有打卡列表入口）
  - 驗收：點擊後正確跳轉
  - 預估：0.5h

## 6. 前端：總結卡片重設計（1d）

- [x] **6.1** `daodao-f2e` — 重寫 `practice-summary-card.tsx` 的 JSX，以 POC 設計稿為方向：島島 Logo、使用者名稱、期間（起迄日）、主題實踐名稱、實踐行動（tag 形式）、使用者反思文字（引號包裹，取 topNotes[0]）、個人小島連結（`daodao.so/users/[userId]`）、卡片產生日期、verification ID placeholder
  - 驗收：卡片包含所有 POC 元素；保留 `forwardRef` + `ref`；`use-practice-summary-image.tsx` 下載 PNG 仍正常
  - 預估：3h

- [x] **6.2** `daodao-f2e` — 為 `PracticeSummaryCard` 新增 `theme` prop（`'dark' | 'light'`），預設 `'dark'`；dark 版深色背景 + 淺色文字，light 版淺色背景 + 深色文字
  - 驗收：兩種主題視覺正確；Owner View 預設 dark，Public View 預設 light
  - 預估：2h

- [x] **6.3** `daodao-f2e` — 在 Owner View 右欄新增主題切換按鈕（dark/light toggle），切換後卡片即時更新
  - 驗收：切換流暢，無閃爍；下載圖片時使用當前選中的主題
  - 預估：1h

## 7. 前端：Public View（1b）

- [x] **7.1** `daodao-f2e` — 新增 `apps/product/src/app/[locale]/practices/[id]/showcase/page.tsx`，使用 `usePublicPractice(id)` 取得資料
  - 驗收：public 實踐可正常顯示；private 實踐顯示 404 頁面；未登入也能瀏覽
  - 預估：2h

- [x] **7.2** `daodao-f2e` — 建立 `practice-showcase-page.tsx` component，實作 POC Public View 兩欄 layout：左欄（總結達成者 + 精選打卡亮點）、右欄（light theme 卡片 + 分享/下載按鈕）
  - 驗收：layout 符合 POC 設計；行動裝置單欄；分享/下載功能正常
  - 預估：3h

- [x] **7.3** `daodao-f2e` — 在 Owner View 新增「預覽公開頁」連結（新分頁開啟 `/practices/[id]/showcase`）+ 一鍵複製連結按鈕（Clipboard API + toast）
  - 驗收：連結正確開啟 showcase 頁面；複製後剪貼簿內容正確；toast 提示出現
  - 預估：1h

- [x] **7.4** `daodao-f2e` — 新增 showcase 頁面的 i18n 翻譯 key（zh-TW / en）：頁面標題、達成者標籤、精選打卡標題、分享按鈕文字
  - 驗收：中英文切換正確
  - 預估：0.5h

- [x] **7.5** `daodao-f2e` — Showcase 頁面 SEO：設定 `<title>`、`<meta description>`、Open Graph tags（圖片使用卡片截圖 URL 或預設 OG image）
  - 驗收：社群分享連結顯示正確 OG 卡片
  - 預估：1h

## 8. 前端：.txt 匯出 + AI Prompt 複製（1c）

- [x] **8.1** `daodao-f2e` — 新增 `utils/practice-export.ts`，實作 `generatePracticeTxt(practice, checkIns)` function，按匯出 FRD 排版規格組裝 .txt 字串：YAML front matter（來源、名稱、行動、日期、頻率、資源、標籤）+ 打卡紀錄（日期 + 心情 + 文字）
  - 驗收：輸出的 .txt 格式完全符合匯出 FRD 規格；包含所有打卡紀錄；無 AI 指令污染
  - 預估：2h

- [x] **8.2** `daodao-f2e` — 新增 `generateAiPrompt(practice)` function，動態將實踐名稱、practice_id 等資料填入 AI Mentor 提示詞模板
  - 驗收：輸出的 prompt 中 `[主題實踐名稱]`、`[practice_id]` 等 placeholder 皆被替換為真實數據
  - 預估：1h

- [x] **8.3** `daodao-f2e` — 新增 `generatePracticeMarkdown(practice, checkIns)` function，組裝 Markdown 格式打卡紀錄（共用 `generatePracticeTxt` 的內容組裝邏輯），使用 Clipboard API 寫入剪貼簿 + toast
  - 驗收：複製的 Markdown 可直接貼入 Obsidian / Notion；含 YAML front matter + 打卡紀錄；行動裝置正常運作
  - 預估：1h

- [x] **8.4** `daodao-f2e` — 新增 `usePracticeExport(practiceId)` hook，封裝三個功能：.txt 下載（Blob + download）、AI Prompt 複製（Clipboard API + toast）、Markdown 複製（Clipboard API + toast）
  - 驗收：.txt 下載檔名符合規範 `[DaoDao]_[主題名]_[使用者名]_[日期].txt`；AI Prompt 複製後剪貼簿內容正確；Markdown 複製後內容正確；行動裝置正常運作
  - 預估：2h

- [x] **8.5** `daodao-f2e` — 在 Owner View 左欄「匯出與留檔」區塊，新增三個按鈕：「匯出文字檔(.txt)」+「複製 AI Mentor 提示詞」+「一鍵複製打卡紀錄(Markdown)」，上方附帶微文案
  - 驗收：按鈕 Owner-only（非 Owner 不顯示）；點擊觸發對應功能；微文案正確顯示
  - 預估：1h

- [x] **8.6** `daodao-f2e` — 在實踐卡片（practice card）+ 實踐詳情頁的 kebab menu 中，為 Owner 動態插入「匯出文字檔(.txt)」+「複製 Prompt 讓 AI 分析」兩個選項，排在「編輯實踐」之上
  - 驗收：Owner 看到選項；非 Owner / 訪客看不到；點擊直接觸發功能不跳轉
  - 預估：2h

- [x] **8.7** `daodao-f2e` — 新增匯出相關 i18n 翻譯 key（zh-TW / en）：按鈕文字、toast 訊息、微文案（含 Markdown 複製相關）
  - 驗收：中英文切換正確
  - 預估：0.5h

## 9. 整合測試與收尾

- [ ] **9.1** `daodao-f2e` — 端對端驗證：有 AI 洞察的 completed 實踐 → 總結頁顯示 AI 洞察 + 卡片 + 匯出功能完整
  - 驗收：完整 user flow 走通
  - 預估：1h

- [ ] **9.2** `daodao-f2e` — 端對端驗證：無 AI 洞察的 completed 實踐 → 總結頁顯示鼓勵語 + 卡片 + 匯出功能正常
  - 驗收：無 insight 不破壞任何功能
  - 預估：0.5h

- [ ] **9.3** `daodao-f2e` — 端對端驗證：public 實踐 → showcase 頁面訪客可見 + OG tags 正確 + 分享連結可開啟
  - 驗收：未登入瀏覽器可正常檢視；分享到 Line/FB 顯示 OG 卡片
  - 預估：1h

- [ ] **9.4** `daodao-f2e` — 端對端驗證：private 實踐 → showcase 頁面顯示 404
  - 驗收：非 public 實踐一律 404，不洩漏存在性
  - 預估：0.5h

- [ ] **9.5** `daodao-f2e` — 端對端驗證：AI 洞察可編輯 → 修改後 blur 儲存成功 → 重新整理頁面顯示編輯後內容 → AI cron 不覆蓋已編輯的洞察
  - 驗收：edit + save + reload 完整流程；`insight_edited` 為 true 時 cron 跳過
  - 預估：1h

- [ ] **9.6** `daodao-f2e` — 端對端驗證：.txt 下載內容純淨 + AI Prompt 剪貼簿內容動態替換正確 + Markdown 複製內容正確 + 行動裝置可用
  - 驗收：下載的 .txt 無 AI 指令；剪貼簿內容 placeholder 已替換；iOS/Android 正常運作
  - 預估：1h

- [ ] **9.6** `daodao-f2e` — 驗證卡片 dark/light 雙主題下載 PNG 皆正常（html-to-image 無白屏或截斷）
  - 驗收：兩種主題的 PNG 圖片完整呈現卡片內容
  - 預估：0.5h

- [x] **9.7** 確認前端 `pnpm run lint` + `pnpm run typecheck` 全部通過
  - 驗收：零 error
  - 預估：0.5h
