## Context

Dao Dao 是一個 Next.js 15 前端 + Express.js 後端 + Python AI backend 的 Monorepo 專案。

**本 change 啟動時，以下 Phase 1 & 2 功能已上線（前置依賴）：**
- 總結頁顯示 AI 洞察（`practice-summary-core`：`practices.insight` 由 AI backend cron 產生，server API 直接帶出）
- 公開分享頁（`practice-summary-core`：`/practices/[id]/showcase`）— QR Code 導向目標
- 總結頁已重構為兩欄 Owner View layout（`practice-summary-core`）+ 總結卡片 dark/light 雙主題
- .txt 匯出 + AI Prompt 複製（`practice-summary-core`）— 已在總結頁 Owner View 提供
- 覆盤 UI（`practice-summary-depth`：`practices.reflection` 存為 Markdown 格式，含 `<!-- template: orid -->` 或 `<!-- template: simple -->` 標記，各區塊以 `## 標題` 分隔）
- AI 品質門檻（`practice-summary-depth`：進度 ≥ 80% + 平均字數 ≥ 50，未達標的 insight 為 null）
- 見證指標 API（`practice-summary-depth`：`practice_social_proofs` 表 + toggle/status endpoints + 前端按鈕）

**現有可複用基礎：**
- `html-to-image`（前端 HTML → PNG，用於 Practice Summary 卡片分享）
- `practice-summary-page.tsx`（Phase 1 重構後的兩欄 Owner View layout）
- `use-practice-summary-image.tsx`（Blob URL 下載模式，可參考用於 PDF/ZIP 下載實作）
- Image Proxy API（`proxy.routes.ts` 檔案存在且實作完整含 SSRF 防護，但**尚未在 `app.ts` 註冊路由**——需在本 change 啟動前掛載）

**尚需建立：**
- 無任何 PDF 生成能力（無 jsPDF、Puppeteer、react-pdf 等）
- 無 QR Code 生成能力
- 無 Export 聚合 API（一次取得 PDF/MD 所需全部資料）

---

## Goals / Non-Goals

**Goals:**
- 讓完成狀態的實踐可導出 PDF 與 Markdown，3 秒內完成（前端處理）
- PDF 包含：AI 洞察、覆盤、全部 Check-ins、見證指標、驗證章、QR Code
- 判定高品質門檻並在 PDF 上附加驗證章
- 在 PDF 末頁附 QR Code 可導回公開分享頁

**Non-Goals:**
- 伺服器端 PDF 渲染（Puppeteer / headless Chrome）
- 批量匯出多個實踐
- 第三方驗證（如 blockchain 存證）
- 導出內容的線上預覽編輯器
- .txt 匯出與 AI Prompt 複製（已在 Phase 1 完成）
- 見證指標的資料模型與 API（已在 Phase 2 完成）

---

## Decisions

### 1. PDF 渲染方案：`@react-pdf/renderer`

**選擇：** 前端使用 `@react-pdf/renderer`（react-pdf）。

**原因：**
- 純 JS 執行，無需後端介入，符合「前端處理 ≤ 3 秒」需求
- 產生真正的 PDF（文字可選取、可搜尋），不同於 html-to-image 的純圖片方案
- 支援自訂 fonts、分頁控制、圖片嵌入
- 可在 Worker 內執行，不阻塞主執行緒

**捨棄方案：**
- `html2canvas + jsPDF`：圖片畫質差、文字不可選取、CORS 問題複雜
- `Puppeteer`（後端）：伺服器資源消耗大、需額外 container，冷啟動慢
- 純 `html-to-image`：PDF 格式不正確（僅為圖片），無法分頁

### 2. QR Code：`qrcode`（非 React wrapper）

**選擇：** 使用 `qrcode` npm 套件（非 `qrcode.react`）直接生成 PNG data URL，再以 `@react-pdf/renderer` 的 `<Image>` component 嵌入 PDF。

**原因：**
- `@react-pdf/renderer` 使用獨立渲染管道（非 React DOM），無法直接渲染 React DOM component
- `qrcode` 套件提供 `toDataURL()` API，直接輸出 PNG data URL，完全相容 `<Image src={dataUrl} />`

### 3. Markdown 生成：純前端字串組裝

**選擇：** 不引入額外函式庫，在前端直接組裝 Markdown 字串，以 `Blob` API 觸發下載。

**原因：** 需求明確（YAML front matter + 固定結構），無需 MDX 或動態渲染。

### 4. 圖片處理策略：Base64 嵌入 PDF，JPG 另存 Markdown

- **PDF**：呼叫 Image Proxy API（已建立）將 Cloudflare R2 圖片轉為 Base64 data URL 後嵌入 PDF，避免 CORS。
- **Markdown**：圖片以相對路徑引用，另以 JSZip 打包為 `.zip`（含 `.md` + 圖片資料夾）。

### 5. 驗證章判定：導出時動態計算，不儲存

**原因：** 門檻條件（持續 ≥ 14 天 + Insightful ≥ 3）皆可由現有資料即時計算，避免狀態同步問題。

### 6. 匯出 API 端點：新增聚合端點

新增 `GET /api/v1/practices/:id/export` 端點，一次回傳：
- 實踐完整資料（主題、時間範圍、AI 洞察、覆盤內容）
- 全部 Check-ins（按 `checkin_date` 升序，含圖片 URL、note、mood）
- 三項見證計數（`insightfulCount`, `referencedCount`, `witnessedCount`）
- 驗證資格（`isVerified: boolean`）
- 導出權限（`pdfAllowed: boolean`）：`status === 'archived'` 時為 `false`，其餘為 `true`
- archived 狀態仍回傳 HTTP 200（資料可用於 Markdown 導出），由前端根據 `pdfAllowed` 控制 PDF 按鈕顯示
- 未認證回 401、非擁有者回 403

### 7. 覆盤內容解析：解析 Markdown 結構化模板

**做法：** PDF 渲染覆盤區塊時，解析 `practices.reflection` 的 Markdown 格式：
1. 讀取首行 HTML 註解取得模板類型（`<!-- template: orid -->` 或 `<!-- template: simple -->`）
2. 以 `## 標題` 分割各區塊
3. ORID 模板渲染為四段結構（Objective / Reflective / Interpretive / Decisional），各段帶標題
4. 簡單回顧模板渲染為三段（驚訝發現 / 避坑指南 / 應用計畫）
5. 若無模板標記（向後相容），整段作為純文字渲染

**原因：** Phase 2（`practice-summary-depth` D1）決定覆盤以 Markdown + 模板標記存入 `practices.reflection`。PDF 需結構化呈現覆盤內容以提升可讀性，而非直接輸出原始 Markdown。

**實作位置：** 前端 utility function `parseReflectionMarkdown(text: string)` → 回傳 `{ template: 'orid' | 'simple' | 'plain', sections: Array<{title, content}> }`

### 8. AI 洞察資料來源（已釐清）

AI 洞察由 `daodao-ai-backend` 的 `insight_scheduler.py` 每日 01:00 自動產生，寫入 `practices.insight` 欄位。
- 觸發條件：`status=completed AND insight IS NULL`
- 生成方式：直接 query `practice_checkins` 做統計 + 精選 2 條筆記，不使用 `raw_logs_accumulator`
- Export API 直接讀取 `practices.insight` 欄位即可，不需額外呼叫 AI backend

~~原 FRD 建議的 `raw_logs_accumulator` append-only 欄位不採用~~ — AI backend 已有更好的做法（query-time 統計），accumulator 有一致性風險且無實際效能需求。

---

## Risks / Trade-offs

| 風險 | 緩解策略 |
|------|---------|
| `@react-pdf/renderer` bundle size 過大（~200KB gzip）| 動態 import（`next/dynamic`），僅在觸發導出時載入 |
| 30 筆圖文 Check-in 超過 3 秒效能目標 | 限制嵌入圖片解析度（最大 800px 寬），圖片並行 fetch |
| Markdown ZIP 打包於主執行緒 | 使用 `JSZip` 的 async API + Web Worker |
| 使用者匯出封存實踐（UI 繞過）| 後端 export 端點驗證 `status !== 'archived'` |
| 見證數據不足（Phase 2 上線初期）| 驗證章在見證數據累積前形同虛設；建議 Phase 2 上線至少 4 週後再啟動本 change |

---

## Migration Plan

1. **確認前置依賴**：Phase 1 + Phase 2 全部上線且見證數據已累積
2. **後端部署**：
   - 新增 `GET /api/v1/practices/:id/export` 聚合端點
3. **前端部署**：
   - 安裝 `@react-pdf/renderer`、`qrcode`、`jszip`
   - 在總結頁 Owner View 的匯出區塊新增 PDF / Markdown 選項（延伸 Phase 1 的 .txt 匯出 UI）
4. **Rollback**：前端移除 PDF/MD 導出選項即可回退

---

## Resolved Questions

| 問題 | 決議 |
|------|------|
| 覆盤欄位 | `practices.reflection TEXT` 已在 Prisma schema（Phase 2 負責 UI + API） |
| `practice_checkins.tags` | DB 不存在，導出時略去 |
| Witnessed 觸發方式 | MVP：主動按鈕（Phase 2 負責實作） |
| PDF 品牌視覺 | 先用預設樣式（白底、黑字、品牌色 #FF7A45），待設計稿 |
| `raw_logs_accumulator` | 不採用 — AI backend 直接 query checkins 做統計，更好維護 |
| AI 洞察來源 | `practices.insight` 欄位，由 AI backend cron 寫入，Export API 直接讀取 |
