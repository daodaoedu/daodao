## Context

Dao Dao 是一個 Next.js 15 前端 + Express.js 後端的 Monorepo 專案。目前平台已有：
- `html-to-image`（前端 HTML → PNG，用於 Practice Summary 卡片分享）
- CSV/Excel 匯出工具（後端，用於管理員批量匯出用戶資料）
- Practice Check-in 完整 CRUD（含圖片上傳至 Cloudflare R2）
- `practice-summary-page.tsx`（結業式 UI，含 confetti 動畫與社群分享，可作為導出 UI 延伸基礎）
- `use-practice-summary-image.tsx`（Blob URL 下載模式，可參考用於 PDF/ZIP 下載實作）

**現有限制（已透過 code review 確認）：**
- 無任何 PDF 生成能力（無 jsPDF、Puppeteer、react-pdf 等）
- 無 QR Code 生成能力
- 無專業見證（Insightful / Referenced / Witnessed）資料模型
- `practice-interaction.service.ts` 中 like / favorite / share / view 全部為 **stub + TODO**，對應資料庫表格**尚未建立**
- `practices` 表**無 `reflection`（覆盤）欄位**，PRD 所述「最終覆盤」目前無對應資料結構
- `practice_checkins` SQL schema **無 `tags` 欄位**（TypeScript 型別有定義，但 DB 層待確認）

---

## Goals / Non-Goals

**Goals:**
- 讓完成狀態的實踐可導出 PDF 與 Markdown，3 秒內完成（前端處理）
- 建立 Insightful / Referenced / Witnessed 三項見證計數的資料模型與 API
- 判定高品質門檻並在 PDF 上附加驗證章
- 在 PDF 末頁附 QR Code 可導回原始實踐頁面

**Non-Goals:**
- 伺服器端 PDF 渲染（Puppeteer / headless Chrome）
- 批量匯出多個實踐
- 第三方驗證（如 blockchain 存證）
- 導出內容的線上預覽編輯器

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
- `@react-pdf/renderer` 使用獨立渲染管道（非 React DOM），**無法直接渲染 React DOM component**（包含 `qrcode.react` 輸出的 SVG/Canvas）
- `qrcode` 套件提供 `toDataURL()` API，直接輸出 PNG data URL，完全相容 `<Image src={dataUrl} />`
- 若日後前端 UI 也需顯示 QR Code 預覽，可另行以 `qrcode.react` 渲染，兩者共存不衝突

**捨棄方案：**
- `qrcode.react`：輸出 React component，無法直接嵌入 react-pdf 的渲染管道

### 3. Markdown 生成：純前端字串組裝

**選擇：** 不引入額外函式庫，在前端直接組裝 Markdown 字串，以 `Blob` API 觸發下載。

**原因：** 需求明確（YAML front matter + 固定結構），無需 MDX 或動態渲染。

### 4. 圖片處理策略：Base64 嵌入 PDF，JPG 另存 Markdown

- **PDF**：呼叫後端 proxy 將 Cloudflare R2 圖片轉為 Base64 data URL 後嵌入 PDF，避免 CORS。
- **Markdown**：圖片以相對路徑引用，另以 JSZip 打包為 `.zip`（含 `.md` + 圖片資料夾）。

### 5. 專業見證資料模型：新增 `practice_social_proofs` 表

**選擇：** 新增獨立的 `practice_social_proofs` Prisma model，記錄每筆見證行為。

**背景：** `practice-interaction.service.ts` 中現有的 like / favorite / share / view 皆為 stub（無對應 DB 表），因此本功能須完全從零建立資料層，不依賴任何現有 interaction 基礎設施。

**原因：**
- Insightful / Referenced / Witnessed 語意不同，需分類儲存
- 未來可延伸為 per-check-in 見證（不只 practice 層級）
- 透過 GROUP BY 聚合計數，導出時一次查詢取得三項指標
- 不混入現有 interaction stub 代碼，避免未來該 stub 被填充時產生衝突

Schema 設計：
```prisma
model practice_social_proofs {
  id          Int      @id @default(autoincrement())
  practice_id Int
  actor_id    Int      // 執行見證的使用者
  type        String   @db.VarChar(20)  // 'insightful' | 'referenced' | 'witnessed'
  created_at  DateTime @default(now()) @db.Timestamptz(6)

  practices   practices @relation(fields: [practice_id], references: [id])
  users       users     @relation(fields: [actor_id], references: [id])

  @@unique([practice_id, actor_id, type])
  @@index([practice_id])
}
```

### 6. 驗證章判定：導出時動態計算，不儲存

**原因：** 門檻條件（持續 ≥ 14 天 + Insightful ≥ 3）皆可由現有資料即時計算，避免狀態同步問題。

### 7. 匯出 API 端點：新增聚合端點

新增 `GET /api/v1/practices/:id/export` 端點，一次回傳：
- 實踐完整資料（主題、時間範圍、**覆盤欄位視 Open Question #1 決定**）
- 全部 Check-ins（按 `checkin_date` 升序，含圖片 URL、note、mood、**tags 視 Open Question #3 決定**）
- 三項見證計數（`insightfulCount`, `referencedCount`, `witnessedCount`）
- 驗證資格（`isVerified: boolean`）
- 狀態驗證：`status === 'archived'` 時回傳 HTTP 403

---

## Risks / Trade-offs

| 風險 | 緩解策略 |
|------|---------|
| `@react-pdf/renderer` bundle size 過大（~200KB gzip）| 動態 import（`next/dynamic`），僅在觸發導出時載入 |
| 30 筆圖文 Check-in 超過 3 秒效能目標 | 限制嵌入圖片解析度（最大 800px 寬），圖片並行 fetch |
| Cloudflare R2 圖片 CORS 限制 | 後端新增 `/api/v1/proxy/image?url=` 端點回傳 Base64 |
| Markdown ZIP 打包於主執行緒 | 使用 `JSZip` 的 async API + Web Worker |
| 使用者匯出封存實踐（UI 繞過）| 後端 export 端點驗證 `status !== 'archived'` |
| Interaction service 全為 stub，社群見證需從零建立 | `practice_social_proofs` 完全獨立，不依賴現有 interaction stub，降低未來衝突風險 |
| `practices` 缺少覆盤欄位，上線前需 DB migration | 需在 export 功能上線前完成 `reflection` 欄位的 migration 或確認替代欄位 |

---

## Migration Plan

1. **前置確認（阻塞項）**：解決 Open Question #1（覆盤欄位）與 #3（tags 欄位），視結果執行對應 migration
2. **DB Migration**：
   - 新增 `practice_social_proofs` table（含 FK 至 practices、users）
   - 若確認新增覆盤：新增 `practices.reflection` TEXT 欄位
3. **後端部署**：
   - 新增 `GET /api/v1/practices/:id/export` 聚合端點
   - 新增 `/api/v1/proxy/image` 圖片 proxy 端點
   - 新增 social proof CRUD 端點（Insightful / Referenced / Witnessed）
4. **前端部署**：
   - 安裝 `@react-pdf/renderer`、`qrcode.react`、`jszip`
   - 在 practice 詳情頁新增導出入口（延伸自現有 `practice-summary-page.tsx` 模式）
5. **Rollback**：前端移除導出按鈕即可回退；`practice_social_proofs` 無其他表依賴，可安全 drop

---

## Open Questions

1. **[阻塞] 覆盤（Reflection）欄位**：`practices` 表目前無 `reflection` 欄位，但 PRD 提到「最終覆盤」是導出內容之一。需產品/後端確認：
   - 選項 A：在 `practices` 表新增 `reflection TEXT` 欄位（需 migration + UI 輸入入口）
   - 選項 B：覆盤即為現有 `summary` 頁面的內容，確認對應欄位名稱

2. **[阻塞] Witnessed 互動觸發點**：PRD 定義「具備相關技能標籤的使用者閱讀過此完整歷程」，但「閱讀完成」在技術上如何定義？需產品確認：
   - 選項 A（MVP）：使用者主動點選「見證此歷程」按鈕（目前 spec 採用此方案）
   - 選項 B：頁面滾動至底部自動觸發
   - 選項 C：停留時間超過閾值自動觸發

3. **[待確認] `practice_checkins.tags` 欄位**：TypeScript 型別定義中有 `tags` 欄位，但 SQL init script（`420_create_table_practice_checkins.sql`）中無此欄位。需確認：
   - 是否已透過 migration 補充？（檢查 Prisma migration history）
   - 若不存在，導出 Check-in 時略去 tags

4. **PDF 品牌視覺**：需設計稿確認 Dao Dao PDF 排版樣式（字體、品牌配色、Logo 位置、驗證章圖像）
