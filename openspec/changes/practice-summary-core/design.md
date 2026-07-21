## Context

Dao Dao 是一個 Next.js 15 前端 + Express.js 後端 + Python AI backend 的 Monorepo 專案。

**Codebase 現狀：**
- AI 洞察生成已完成：`daodao-ai-backend` 每日 01:00 cron 對 `status=completed AND insight IS NULL` 的實踐生成 insight，寫入 `practices.insight` 欄位
- DB 的 `insight` 欄位已存在於 Prisma schema（`practices.insight String?`）
- 後端 `PracticeEntity` 不包含 `insight` 欄位，`findById()` 的 Prisma select 也未選取它
- 前端 `PracticeSummary` type 不包含 `insight`，`getPracticeSummary()` 純粹組合 practice detail + checkins + 鼓勵句
- 總結頁（`practices/[id]/summary/page.tsx`）是 Owner-only + 已到期/completed 才可進入
- 總結卡片（`practice-summary-card.tsx`）是 9:16 泡泡圖風格
- 圖片下載（`use-practice-summary-image.tsx`）使用 html-to-image → PNG
- 社群分享已有 Line/Threads/FB/X/LinkedIn/Native
- 公開切換 toggle 可設定 `privacy_status: "public"`，但無訪客可見頁面
- 無任何匯出功能

**可複用基礎：**
- `html-to-image`（已安裝，用於卡片 → PNG）
- `getShareAPI()`（`@daodao/shared`，含各平台分享 URL 組裝）
- `practice-summary-page.tsx`（現有 UI 骨架，需重構為兩欄 layout）
- `usePracticeSummaryImage` hook（Blob URL 下載模式）
- `getPracticeById()` / `usePracticeById()` / `getPracticeCheckIns()`（前端 API client）

---

## Goals / Non-Goals

**Goals:**
- 讓 completed 實踐的 AI 洞察在總結頁 Owner View 可見（有洞察顯示內容，無洞察顯示鼓勵語）
- 建立公開分享頁 `/practices/[id]/showcase`，`visibility === 'public'` 時訪客可見
- 提供 .txt 歷程下載 + AI Prompt 剪貼簿複製（純前端，零後端依賴）
- 以 POC 設計稿方向重設計總結卡片（dark/light 雙主題、驗證碼 placeholder）

**Non-Goals:**
- 覆盤 UI + API（Phase 2）
- AI 觸發品質門檻（Phase 2）
- 見證指標 UI + API（Phase 2）
- PDF/Markdown 匯出（Phase 3）
- 驗證章判定邏輯（Phase 3，卡片上僅放 placeholder）
- Clone 模版功能（已有獨立的複製實踐功能）

---

## Decisions

### D1：AI 洞察資料流——後端 API 直接帶出，不額外呼叫 AI backend

**做法：** 在 `daodao-server` 的 `PracticeEntity` 加上 `insight?: string`，`findById()` 的 Prisma query 加入 `insight: true`，practice detail API 回應直接攜帶 insight。前端 `getPracticeSummary()` 從 practice detail response 取出 insight 填入 `PracticeSummary`。

**原因：**
- `practices.insight` 欄位已由 AI backend cron 寫入，直接讀取即可
- 不需呼叫 `GET /v1/users/insights`（那是 AI backend 的 API，走不同 base URL）
- 減少前端多一次 API call，降低延遲

**棄選：前端直接呼叫 AI backend API**——跨 service 呼叫增加複雜度，且 `GET /v1/users/insights` 回傳的是使用者所有 insights 列表，不是單一 practice 的。

### D1b：AI 洞察可編輯——使用者可改寫 AI 生成的草稿

**做法：**
- 後端新增 `PATCH /api/v1/practices/:id/insight`，接收 `{ insight: string }`，Owner-only
- DB 新增 `insight_edited BOOLEAN DEFAULT FALSE` 欄位（daodao-storage migration）
- PATCH 時同時將 `insight_edited` 設為 `true`
- AI backend 的 `insight_scheduler.py` 在 `get_pending_practices()` 加入 `insight_edited = false` 條件，不覆蓋使用者編輯過的洞察
- 前端：AI 洞察區塊改為 inline textarea（blur 或按鈕觸發儲存），上方附帶引導文案「請編輯它，將其轉化為您真正的專屬知識」

**原因：**
- POC 明確定位 AI 洞察為「草稿」，最終文字主權在使用者
- `insight_edited` flag 防止 cron 覆蓋使用者改過的內容
- 不需額外的 `insight_original` 備份欄位（YAGNI，使用者不會想還原 AI 版本）

### D2：Public View 路由——新增 `/practices/[id]/showcase` page，後端新增公開 API

**做法：**
- 前端新增 `apps/product/src/app/[locale]/practices/[id]/showcase/page.tsx`
- 後端新增 `GET /api/v1/practices/:id/public` endpoint（無 auth middleware），查詢條件為 `visibility === 'public'`（server 端存取控制欄位，非 user-facing 的 `privacy_status`）；非 public 回傳 404。注意：codebase 中 `practices` 表同時有 `privacy_status` 和 `visibility` 兩個欄位，`findById()` 使用 `visibility` 做存取控制（L342-351），`comment.service.ts` 的 fallback chain 為 `visibility ?? privacy_status ?? 'public'`。Public API 應以 `visibility` 為準。
- 前端新增 `@daodao/api` 的 `getPublicPractice(id)` function 呼叫此 endpoint
- Showcase page 使用 `getPublicPractice()` 取得資料（含 insight），不需登入

**原因：**
- 現有 `GET /api/v1/practices/:id` 走 auth middleware，改動影響面大
- 獨立的 public endpoint 可精確控制回傳欄位（不回傳 owner-only 資訊）
- 路由用 `showcase` 而非 `public`，語意上是「展示」而非「公開設定」

**回傳欄位：** practice title、practiceAction、startDate、endDate、checkInCount、insight、user（name + photoURL）、topCheckIns（精選 3 筆打卡，按 note 長度排序）、themeColor、tags

### D3：.txt 匯出——純前端字串組裝 + Blob 下載

**做法：** 在前端新增 `generatePracticeTxt(practice, checkIns)` utility function，按匯出 FRD 排版規格組裝 Markdown 相容的 .txt 字串，使用 `Blob` + `URL.createObjectURL()` + `<a download>` 觸發下載。

**原因：**
- 匯出 FRD 明確定義零後端依賴
- .txt 格式簡單，前端已有 practice detail + checkins 資料
- 打卡資料可能量大（最多 200 筆），但字串組裝效能不是問題

**檔名規範：** `[DaoDao]_[主題名]_[使用者名]_[完成日期].txt`（非法字元替換為 `-`）

### D3b：一鍵複製打卡紀錄 Markdown——Clipboard API

**做法：** 新增 `generatePracticeMarkdown(practice, checkIns)` function，組裝 Markdown 格式的打卡紀錄（含 YAML front matter + 每筆打卡的日期/心情/內容），使用 `navigator.clipboard.writeText()` 寫入剪貼簿，觸發 Toast 提示。

**原因：** POC 設計中包含此功能，與 .txt 下載互補——.txt 適合檔案保存，Markdown 複製適合直接貼入 Obsidian / Notion / NotebookLM 等知識管理工具。

**與 .txt 的差異：** 格式相同（Markdown 相容），但觸發方式不同（複製到剪貼簿 vs 檔案下載）。共用 `generatePracticeTxt()` 的內容組裝邏輯。

### D4：AI Prompt 複製——動態編譯 + Clipboard API

**做法：** 新增 `generateAiPrompt(practice)` function，將實踐名稱、practice_id 等動態資料填入 prompt 模板，使用 `navigator.clipboard.writeText()` 寫入剪貼簿，觸發 Toast 提示。

**原因：** 匯出 FRD 要求「不跳轉頁面」，Clipboard API 是最簡做法。

**Fallback：** 行動裝置不支援 Clipboard API 時，改用 `document.execCommand('copy')` polyfill。

### D5：總結卡片重設計——保留 html-to-image 機制，重寫 JSX

**做法：** 重寫 `practice-summary-card.tsx` 的 JSX，以 POC 設計稿為方向：
- 新增：島島 Logo（綠色鑽石）、使用者名稱、期間、實踐行動（tag 形式）、反思文字、個人小島連結、卡片產生日期、verification ID placeholder
- 支援 `theme` prop（`'dark' | 'light'`），預設 dark
- 保留 `forwardRef` + `ref` 機制，`use-practice-summary-image.tsx` 不需改動

**原因：**
- html-to-image 已驗證可行，換 library 風險高
- 純 JSX + Tailwind 修改，不需新增依賴
- Dark/light 切換用 Tailwind 的 class 條件即可

**棄選：Canvas API 重繪**——複雜度高，且失去 Tailwind utility 的開發效率

### D6：Owner View Layout 重構——從單欄慶祝頁改為 POC 兩欄式

**做法：** 重構 `practice-summary-page.tsx`，改為 POC 設計的兩欄 layout：
- **左欄**：精選打卡亮點 → 查看完整打卡紀錄連結 → AI 核心洞察區塊 → 匯出與留檔
- **右欄**：公開分享設定（toggle）→ 總結卡片（dark theme）→ 社群分享 + 下載圖片
- 行動裝置（< 768px）：單欄，右欄內容堆疊在左欄下方

**原因：** POC 設計稿已驗證此 layout 的資訊層級合理，兩欄讓 Owner 同時看到「內容」與「分享工具」。

### D7：Public View Layout——以 POC 設計稿為方向

**做法：** Showcase page 採用 POC Public View 兩欄 layout：
- **左欄**：總結達成者（avatar + achieved date）→ 精選打卡亮點
- **右欄**：總結卡片（light theme）→ 分享/下載按鈕
- 不顯示：匯出、覆盤、編輯功能、kebab menu
- 行動裝置單欄

### D8：精選打卡亮點——前端從 checkins 篩選

**做法：** 在前端從已載入的 checkins 中篩選「精選打卡」：
- Owner View：取 note 最長的前 5 筆，顯示 Day N + 日期 + 內容 + mood
- Public View：由後端 public API 回傳 `topCheckIns`（前 3 筆），減少資料暴露

**原因：** Owner View 已有完整 checkins 資料（`getPracticeCheckIns()`），不需額外 API；Public View 則由後端控制精選邏輯。

---

## API 變更

### 後端：`PracticeEntity` 新增 `insight` 欄位

```typescript
// src/types/practice.types.ts
export interface PracticeEntity {
  // ... existing fields
  insight?: string;  // 新增：AI 洞察文字
}
```

### 後端：`findById()` select insight

```typescript
// src/services/practice.service.ts — findById() 的 Prisma query
const practice = await prisma.practices.findUniqueOrThrow({
  where: { id },
  select: {
    // ... existing select fields
    insight: true,  // 新增
  }
});

// entity mapping
const practiceEntity: PracticeEntity = {
  // ... existing fields
  insight: practice.insight || undefined,
};
```

### 後端：新增 `GET /api/v1/practices/:id/public`

```typescript
// 無 auth middleware，任何人可呼叫
// 回傳 public 實踐的精簡資料

// Request
GET /api/v1/practices/:id/public
// :id 為 external_id (UUID)

// Response 200
{
  success: true,
  data: {
    id: string;
    title: string;
    practiceAction?: string;
    startDate?: string;
    endDate?: string;
    checkInCount: number;
    insight?: string;
    themeColor?: string;
    tags: string[];
    user: {
      name: string;
      photoURL?: string;
    };
    topCheckIns: Array<{
      checkinDate: string;
      mood?: string;
      note?: string;
      dayNumber: number;  // 從 startDate 算起的天數
    }>;
  }
}

// Response 404（practice 不存在或 visibility !== 'public'）
{
  success: false,
  error: { code: 'NOT_FOUND', message: 'Practice not found' }
}
```

### 後端：Zod validation schema

```typescript
// src/validators/practice.validators.ts
import { z } from 'zod';

export const publicPracticeResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  practiceAction: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  checkInCount: z.number(),
  insight: z.string().optional(),
  themeColor: z.string().optional(),
  tags: z.array(z.string()),
  user: z.object({
    name: z.string(),
    photoURL: z.string().nullable().optional(),
  }),
  topCheckIns: z.array(z.object({
    checkinDate: z.string(),
    mood: z.string().optional(),
    note: z.string().optional(),
    dayNumber: z.number(),
  })),
});
```

### 前端：`@daodao/api` 變更

```typescript
// packages/api/src/services/practice.ts

// PracticeSummary type 新增
export interface PracticeSummary {
  // ... existing fields
  insight?: string;  // 新增：AI 洞察文字
}

// 新增 function
export const getPublicPractice = async (id: string) => {
  return client.GET("/api/v1/practices/{id}/public", {
    params: { path: { id } },
  });
};
```

---

## Risks / Trade-offs

| 風險 | 緩解策略 |
|------|---------|
| Public View 暴露過多使用者打卡內容 | 後端 public API 只回傳精選 3 筆 topCheckIns（note 最長），不暴露全部 checkins |
| .txt 匯出包含 200 筆打卡，Blob 生成可能短暫阻塞 UI | 字串組裝是 O(n) 線性操作，200 筆不到 50KB，效能不成問題 |
| Clipboard API 在部分行動裝置不支援 | fallback 使用 `document.execCommand('copy')`；不支援時顯示 toast 提示「請手動複製」 |
| 卡片重設計可能破壞現有 html-to-image 下載 | 保留 `forwardRef` + `ref` 機制不變，僅改 JSX 內容；需在 task 中驗證下載仍正常 |
| Owner View 兩欄 layout 在行動裝置的體驗 | 行動裝置（< 768px）回退為單欄堆疊 |
| `GET /api/v1/practices/:id/public` 被惡意掃描 | Rate limiting（全域 1000 req/min），且只回傳 public 實踐；非 public 一律 404 不洩漏存在性 |

---

## Migration Plan

1. **後端部署**（daodao-server）：
   - `PracticeEntity` 加 `insight` 欄位
   - `findById()` 加 select `insight`
   - 新增 `GET /api/v1/practices/:id/public` endpoint
   - 無 DB migration（`practices.insight` 欄位已存在）
2. **前端部署**（daodao-f2e）：
   - 執行 `pnpm run generate:api` 更新 OpenAPI types
   - `@daodao/api` 加 `insight` 欄位 + `getPublicPractice()` function
   - 部署 1a（AI 洞察顯示）→ 1d（卡片重設計）→ 1b（Public View）→ 1c（匯出）
   - 可逐步部署，各 sub-feature 互不依賴（除 1b 依賴後端 public API）
3. **Rollback**：前端移除新增元件即可回退；後端 `insight` 欄位為 optional，移除不影響既有 API

---

## Resolved Questions

| 問題 | 決議 |
|------|------|
| AI 洞察來源 | `practices.insight` 欄位，由 AI backend cron 寫入，後端 API 直接讀取 |
| `raw_logs_accumulator` | 不使用——AI backend 直接 query checkins 做統計，更好維護 |
| 覆盤 vs AI 洞察關係 | 並聯（各自獨立），Phase 1 不處理覆盤 |
| Public View 路由名稱 | `/practices/[id]/showcase`（語意：展示成果）|
| 卡片驗證碼 | Phase 1 放 placeholder（如 `DAODAO-XXXX`），Phase 3 實作真正驗證邏輯 |
| .txt 匯出是否需要後端 API | 不需要——前端已有完整 practice detail + checkins 資料 |
| Kebab menu 匯出入口位置 | 排在「編輯實踐」之上，Owner-only |
| AI Prompt 模板內容 | 初版硬編碼在前端，後續可考慮從 CMS 動態載入 |
