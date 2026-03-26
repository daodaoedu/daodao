## 1. 前置確認（阻塞項，需產品/後端決策後才能進行後續任務）

- [x] 1.1 確認「覆盤（Reflection）」欄位方案：新增 `practices.reflection` 欄位 vs. 沿用現有欄位 → 採用選項 A：新增 `practices.reflection TEXT`
- [x] 1.2 確認 `practice_checkins.tags` 欄位是否實際存在於 DB（檢查 Prisma migration history）→ 不存在，導出時略去
- [x] 1.3 確認 Witnessed 觸發方式：主動按鈕（MVP）vs. 滾動至底部 vs. 停留時間閾值 → MVP：主動按鈕
- [x] 1.4 確認 PDF 品牌視覺設計稿（字體、配色、Logo 位置、驗證章圖像）→ 先用預設樣式（白底、黑字、品牌色 #FF7A45）

## 2. 資料庫 Migration

- [x] 2.1 新增 `practices.reflection TEXT` 欄位（視 1.1 決定；建立 Prisma migration）
- [x] 2.2 新增 `practice_social_proofs` 表（含 `practice_id`, `actor_id`, `type`, `created_at`、unique constraint、FK）
- [x] 2.3 在 `prisma/schema.prisma` 加入 `practice_social_proofs` model 及對應 relation
- [x] 2.4 在 `daodao-storage/init-scripts-refactored/` 新增對應 SQL init script（命名如 `430_create_table_practice_social_proofs.sql`）
- [ ] 2.5 執行 `prisma migrate dev` 並驗證 migration 可正常執行與 rollback

## 3. 後端：Export 聚合 API

- [ ] 3.1 在 `practice.service.ts` 新增 `getExportData(id, userId)` function，查詢完整 Check-ins（升序）、見證計數、驗證資格
- [ ] 3.2 在 `practice.service.ts` 實作驗證資格判定邏輯（持續天數 ≥ 14 且 Insightful 計數 ≥ 3）
- [ ] 3.3 在 `practice.controller.ts` 新增 `GET /api/v1/practices/:id/export` 端點，加入 auth middleware，驗證：未認證回 401、非擁有者回 403、archived 回 403
- [ ] 3.4 在 `practice.validators.ts` 新增 export 回應的 Zod schema
- [ ] 3.5 在 `practice.routes.ts` 註冊 export 路由並補充 OpenAPI 文件
- [ ] 3.6 撰寫 `practice.service.test.ts` 單元測試：驗證 isVerified 判定邏輯（符合/不符合各情境）
- [ ] 3.7 撰寫 integration test：archived 回傳 403；非擁有者回傳 403；未認證回傳 401；0 筆 check-in 的 completed 實踐正常回傳

## 4. 後端：Image Proxy API

- [x] 4.1 新增 `/api/v1/proxy/image` 端點，接受 `?url=` 參數，從 Cloudflare R2 fetch 圖片並回傳 Base64 data URL
- [x] 4.2 實作 SSRF 防護：建立 R2 域名 whitelist（`*.r2.dev`、`*.cloudflarestorage.com`），拒絕 whitelist 外的 URL；加入回應 size 上限（5MB）
- [x] 4.3 新增 proxy 端點的路由與 OpenAPI 文件

## 5. 後端：Social Proof API

- [x] 5.1 在 `practice-interaction.service.ts`（或新建 `practice-social-proof.service.ts`）實作 `toggleSocialProof(practiceId, actorId, type)` function
- [ ] 5.2 新增 `POST /api/v1/practices/:id/social-proof` 端點，body 含 `type: 'insightful' | 'referenced' | 'witnessed'`
- [ ] 5.3 新增 `GET /api/v1/practices/:id/social-proof/status` 端點，回傳當前使用者的三項見證狀態
- [ ] 5.4 在 `practice.routes.ts` 註冊 social proof 路由並補充 OpenAPI 文件
- [ ] 5.5 撰寫單元測試：同一使用者重複標記不重複計數；三種類型各自獨立

## 6. 前端：安裝依賴

- [ ] 6.1 在 `daodao-f2e/apps/product/package.json` 安裝 `@react-pdf/renderer`
- [ ] 6.2 安裝 `qrcode`（非 `qrcode.react`，用於生成 PNG data URL 嵌入 react-pdf）
- [ ] 6.3 安裝 `jszip`
- [ ] 6.4 執行 `pnpm install` 並確認無 peer dependency 衝突

## 7. 前端：Export API Client

- [ ] 7.1 在 `@daodao/api` 套件新增 `getPracticeExportData(id)` function，對應 `GET /api/v1/practices/:id/export`
- [ ] 7.2 在 `@daodao/api` 套件新增 export data 的 TypeScript 型別定義（`PracticeExportData`）
- [ ] 7.3 新增 `toggleSocialProof(id, type)` 與 `getSocialProofStatus(id)` API functions

## 8. 前端：PDF 生成

- [ ] 8.1 新增 `PracticeExportPdf` react-pdf Document component（`/components/practice/export/practice-export-pdf.tsx`），包含封面、Check-in 列表、見證指標區塊、末頁 QR Code
- [ ] 8.2 實作 PDF 分頁邏輯：圖片不跨頁（`break-inside: avoid` 等 react-pdf 對應設定）
- [ ] 8.3 使用 `qrcode.toDataURL(url)` 生成 PNG data URL，以 react-pdf `<Image>` 嵌入 PDF 末頁
- [ ] 8.4 實作驗證章嵌入：`isVerified === true` 時在 PDF 指定位置疊加驗證章圖像
- [ ] 8.5 實作圖片 Base64 轉換：呼叫 image proxy 並行 fetch 所有 Check-in 圖片
- [ ] 8.6 新增 `usePracticeExportPdf` hook，封裝 PDF 生成流程（含 loading、error 狀態）
- [ ] 8.7 以 `next/dynamic` 動態 import PDF 相關 component，避免 SSR 問題與首屏 bundle 過大

## 9. 前端：Markdown 生成

- [ ] 9.1 新增 `generatePracticeMarkdown(data: PracticeExportData)` utility function，產出含 YAML front matter 的 Markdown 字串
- [ ] 9.2 實作 YAML front matter：`title`, `author`, `start_date`, `end_date`, `duration_days`, `exported_at`, `source_url`, `verified`
- [ ] 9.3 實作圖片下載並以 JSZip 打包（`images/YYYY-MM-DD(N).jpg` 命名）
- [ ] 9.4 無圖片時直接下載 `.md`；有圖片時下載 `.zip`
- [ ] 9.5 新增 `usePracticeExportMarkdown` hook，封裝 Markdown/ZIP 生成與下載流程

## 10. 前端：導出 UI

- [ ] 10.1 在 practice 詳情頁（`/practices/[id]/page.tsx`）新增「導出作品集」入口按鈕，僅在 `status === 'completed'` 時顯示
- [ ] 10.2 `status === 'archived'` 時隱藏 PDF 導出選項，但保留 Markdown 導出選項
- [ ] 10.3 新增導出 Sheet 或 Modal（`practice-export-sheet.tsx`），提供 PDF 與 Markdown 兩種格式選擇
- [ ] 10.4 導出流程加入「結業式」氛圍：進度動畫、完成提示（參考 `practice-summary-page.tsx` confetti 模式）
- [ ] 10.5 實作導出檔名 sanitization utility：將主題名中的非法字元替換為 `-`，並組合為規範檔名
- [ ] 10.6 新增 Social Proof 見證按鈕元件（Insightful / Referenced / Witnessed），整合 toggle API
- [ ] 10.7 實作導出過程的 loading state（進度指示器）與失敗時的 error toast 提示
- [ ] 10.8 若 1.1 決定新增 `reflection` 欄位：在實踐詳情頁新增覆盤輸入/編輯 UI

## 11. 效能驗證

- [ ] 11.1 測試包含 30 筆圖文 Check-in（每筆 3 張圖片）的 PDF 生成時間，確認 ≤ 3 秒
- [ ] 11.2 若超過效能目標，調整圖片解析度上限（800px 寬）並重新測試
- [ ] 11.3 測試 PDF 在行動裝置瀏覽器的可讀性（文字字級、圖片不超出頁面邊界）

## 12. 整合測試與收尾

- [ ] 12.1 端對端測試：completed 實踐完整走完 PDF 導出流程，驗證檔案內容與命名
- [ ] 12.2 端對端測試：含圖片 Check-in 的 Markdown ZIP 導出，驗證 ZIP 結構與圖片命名
- [ ] 12.3 驗證 QR Code 掃描後正確導向實踐頁面
- [ ] 12.4 驗證驗證章在符合/不符合條件下正確出現/隱藏
- [ ] 12.5 更新 `@daodao/api` 套件的 TypeScript 型別並確認無 breaking change
