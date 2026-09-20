## Phase 3 前置確認

- [x] 1.1 確認「覆盤（Reflection）」欄位方案 → 採用 `practices.reflection TEXT`，Phase 2（`practice-summary-depth`）負責 UI + API，存為 Markdown 格式含模板標記
- [x] 1.2 確認 `practice_checkins.tags` 欄位是否實際存在於 DB → 不存在，導出時略去
- [x] 1.3 確認 Witnessed 觸發方式 → MVP：主動按鈕（Phase 2 負責實作）
- [x] 1.4 確認 PDF 品牌視覺 → 先用預設樣式（白底、黑字、品牌色 #FF7A45），待設計稿
- [x] 1.5 確認 `raw_logs_accumulator` → 不採用，AI backend 已有更好的做法
- [x] 1.6 確認 AI 洞察來源 → `practices.insight` 欄位，由 AI backend cron 寫入
- [x] 1.7 確認覆盤 Markdown 格式 → `<!-- template: orid/simple -->` + `## 標題` 分隔（`practice-summary-depth` D1 決定）
- [x] 1.8 確認 AI 品質門檻 → Phase 2 加入 80% 進度 + 50 字平均門檻，有 insight 的實踐已通過篩選
- [ ] 1.9 確認 `practice-summary-core`（Phase 1）全部上線
- [ ] 1.10 確認 `practice-summary-depth`（Phase 2）全部上線
- [ ] 1.11 確認見證數據已累積足夠（建議 Phase 2 上線至少 4 週）

## 已存在的基礎設施

- [x] DB: `practices.reflection TEXT` 欄位（Prisma schema，尚無讀寫 API — `practice-summary-depth` 負責建立）
- [x] DB: `practice_social_proofs` 表（Prisma schema + SQL init script，service 已實作但無 API endpoints — `practice-summary-depth` 負責接上）
- [ ] 後端: Image Proxy API（`proxy.routes.ts` 檔案存在且實作完整，但**尚未在 `app.ts` 掛載路由**——需在 Phase 1 或本 change 啟動前補上 route 註冊）
- [x] 後端: Social Proof service（`practice-social-proof.service.ts`，含 `toggleSocialProof()`、`getSocialProofStatus()`、`getSocialProofCounts()`）

## 2. 後端：Export 聚合 API

- [ ] 2.1 在 `practice.service.ts` 新增 `getExportData(id, userId)` function，查詢：完整 Check-ins（升序）、AI 洞察（`practices.insight`）、覆盤內容（`practices.reflection`）、見證計數、驗證資格
- [ ] 2.2 實作驗證資格判定邏輯（持續天數 ≥ 14 且 Insightful 計數 ≥ 3）
- [ ] 2.3 在 `practice.controller.ts` 新增 `GET /api/v1/practices/:id/export` 端點，加入 auth middleware，驗證：未認證回 401、非擁有者回 403；archived 狀態回 200 但 `pdfAllowed: false`（Markdown 仍可導出）
- [ ] 2.4 在 `practice.validators.ts` 新增 export 回應的 Zod schema
- [ ] 2.5 在 `practice.routes.ts` 註冊 export 路由並補充 OpenAPI 文件
- [ ] 2.6 撰寫單元測試：驗證 isVerified 判定邏輯（符合/不符合各情境）
- [ ] 2.7 撰寫 integration test：archived 回傳 200 + `pdfAllowed: false`；非擁有者回傳 403；未認證回傳 401；0 筆 check-in 的 completed 實踐正常回傳 + `pdfAllowed: true`

## 3. 前端：安裝依賴

- [ ] 3.1 安裝 `@react-pdf/renderer`
- [ ] 3.2 安裝 `qrcode`（非 `qrcode.react`，用於生成 PNG data URL 嵌入 react-pdf）
- [ ] 3.3 安裝 `jszip`
- [ ] 3.4 執行 `pnpm install` 並確認無 peer dependency 衝突

## 4. 前端：Export API Client

- [ ] 4.1 在 `@daodao/api` 新增 `getPracticeExportData(id)` function，對應 `GET /api/v1/practices/:id/export`
- [ ] 4.2 在 `@daodao/api` 新增 `PracticeExportData` TypeScript 型別定義

## 5. 前端：PDF 生成

- [ ] 5.1 新增 `parseReflectionMarkdown(text)` utility function，解析覆盤 Markdown：讀取 `<!-- template: orid/simple -->` 標記，以 `## 標題` 分割區塊，回傳 `{ template, sections[] }`；無標記時視為純文字
  - 驗收：ORID 解析出 4 區塊、簡單回顧解析出 3 區塊、無標記文字回傳 plain 類型
  - 預估：1h
- [ ] 5.2 新增 `PracticeExportPdf` react-pdf Document component（`/components/practice/export/practice-export-pdf.tsx`），包含：封面、AI 洞察、結構化覆盤（使用 `parseReflectionMarkdown` 渲染 ORID/簡單回顧各區塊標題與內容）、Check-in 列表、見證指標區塊、末頁 QR Code
- [ ] 5.3 實作 PDF 分頁邏輯：圖片不跨頁
- [ ] 5.4 使用 `qrcode.toDataURL(url)` 生成 PNG data URL，QR Code 導向公開分享頁 URL
- [ ] 5.5 實作驗證章嵌入：`isVerified === true` 時在 PDF 指定位置疊加驗證章圖像
- [ ] 5.6 實作圖片 Base64 轉換：呼叫 Image Proxy API 並行 fetch 所有 Check-in 圖片
- [ ] 5.7 新增 `usePracticeExportPdf` hook，封裝 PDF 生成流程（含 loading、error 狀態）
- [ ] 5.8 以 `next/dynamic` 動態 import PDF 相關 component，避免 SSR 問題與首屏 bundle 過大

## 6. 前端：Markdown 生成

- [ ] 6.1 新增 `generatePracticeMarkdown(data: PracticeExportData)` utility function，產出含 YAML front matter 的 Markdown 字串（含 AI 洞察 + 覆盤）
- [ ] 6.2 實作 YAML front matter：`title`, `author`, `start_date`, `end_date`, `duration_days`, `exported_at`, `source_url`, `verified`
- [ ] 6.3 實作圖片下載並以 JSZip 打包（`images/YYYY-MM-DD(N).jpg` 命名）
- [ ] 6.4 無圖片時直接下載 `.md`；有圖片時下載 `.zip`
- [ ] 6.5 新增 `usePracticeExportMarkdown` hook，封裝 Markdown/ZIP 生成與下載流程

## 7. 前端：導出 UI

- [ ] 7.1 在總結頁 Owner View 的匯出區塊，延伸 Phase 1 已有的 .txt 匯出 UI，新增 PDF / Markdown 兩種格式選項
- [ ] 7.2 `status === 'archived'` 時隱藏 PDF 導出選項，但保留 Markdown 導出選項
- [ ] 7.3 實作導出檔名 sanitization utility：將主題名中的非法字元替換為 `-`，並組合為規範檔名
- [ ] 7.4 實作導出過程的 loading state（進度指示器）與失敗時的 error toast 提示

## 8. 效能驗證

- [ ] 8.1 測試包含 30 筆圖文 Check-in（每筆 3 張圖片）的 PDF 生成時間，確認 ≤ 3 秒
- [ ] 8.2 若超過效能目標，調整圖片解析度上限（800px 寬）並重新測試
- [ ] 8.3 測試 PDF 在行動裝置瀏覽器的可讀性

## 9. 整合測試與收尾

- [ ] 9.1 端對端測試：completed 實踐完整走完 PDF 導出流程，驗證檔案內容與命名
- [ ] 9.2 端對端測試：含圖片 Check-in 的 Markdown ZIP 導出，驗證 ZIP 結構與圖片命名
- [ ] 9.3 驗證 QR Code 掃描後正確導向公開分享頁
- [ ] 9.4 驗證驗證章在符合/不符合條件下正確出現/隱藏
- [ ] 9.5 更新 `@daodao/api` 套件的 TypeScript 型別並確認無 breaking change
