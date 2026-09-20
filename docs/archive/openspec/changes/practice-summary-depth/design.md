## Context

Dao Dao 是一個 Next.js 15 前端 + Express.js 後端 + Python AI backend 的 Monorepo 專案。

**本 change 啟動時，Phase 1 功能已上線（前置依賴）：**
- 總結頁顯示 AI 洞察（`practices.insight`，由 `daodao-ai-backend` 每日 cron 產生）
- 公開分享頁（`/practices/[id]/showcase`）
- .txt 匯出 + AI Prompt 複製

**現有可複用基礎：**
- DB：`practices.reflection TEXT` 欄位已存在（migration `018_add_practices_reflection.sql`），但無任何讀寫 API
- DB：`practice_social_proofs` 表已存在（migration `026_create_table_practice_social_proofs.sql`），含 UNIQUE constraint `(practice_id, actor_id, type)`
- 後端：`practice-social-proof.service.ts` 已實作 `toggleSocialProof()`、`getSocialProofStatus()`、`getSocialProofCounts()` 三個 function，但未接上任何 API endpoint
- AI 後端：`insight_scheduler.py` + `insight_service.py` 已完整運作，`get_pending_practices()` 查詢 `status=completed AND insight IS NULL`
- AI 後端：`Practice` model（SQLAlchemy）有 `progress_percentage` 欄位，但缺少 `reflection` column mapping
- 前端：`practice-summary-page.tsx` 總結頁已存在

**尚需建立：**
- 覆盤的讀寫 API（PATCH endpoint）
- 見證指標的 API endpoints（包裝現有 service）
- AI 洞察品質門檻（修改 `get_pending_practices()`）
- 前端覆盤 UI、見證按鈕、clarity score 元件

---

## Goals / Non-Goals

**Goals:**
- 讓完成實踐的使用者能透過結構化模板（ORID / 簡單回顧）撰寫覆盤
- 確保只有達到品質門檻的實踐才觸發 AI 洞察生成
- 提供 clarity score 視覺化，鼓勵使用者提升打卡品質
- 讓社群成員能透過按鈕對他人實踐表達認可（見證指標）

**Non-Goals:**
- 覆盤內容 feed 給 AI 生成洞察（並聯模型，各自獨立）
- AI 二次合成（覆盤 + 洞察合併）
- 見證的滾動偵測觸發
- 見證數據統計分析
- PDF/Markdown 匯出（Phase 3）

---

## Decisions

### D1：覆盤模板——前端 JSON 定義，不存 DB

**做法：** 兩種模板（ORID、簡單回顧）定義為前端 JSON constant，使用者選模板後填寫，最終存入 `practices.reflection` 的是帶結構標記的純文字。

ORID 模板四個區塊：
- Objective（看到什麼——事實）
- Reflective（感覺什麼——情緒）
- Interpretive（發現什麼——洞察）
- Decisional（決定什麼——行動）

簡單回顧模板三個區塊：
- 最驚訝的發現？
- 避坑指南
- 打算應用在哪？

**存儲格式：** Markdown 格式存入 `practices.reflection`，各區塊以 `## 標題` 分隔，首行標記模板類型 `<!-- template: orid -->` 或 `<!-- template: simple -->`。

**棄選方案：**
- DB 存 JSONB 結構化資料：增加 schema 維護成本，且未來模板可能變動
- 另建 `practice_reflections` 表：過度設計，一個實踐只有一份覆盤

### D2：覆盤置頂邏輯——前端 72 小時倒計時

**做法：** 前端根據 `practices.updated_at`（reflection 更新時間）與當前時間比對，72 小時內覆盤區塊置頂於總結頁 AI 洞察之上。超過 72 小時後回到正常位置（AI 洞察之下）。

**理由：** 純前端邏輯，無需後端額外欄位。使用 `updated_at` 而非新增欄位，因為 reflection 的寫入會觸發 Prisma 的 `updatedAt` 自動更新。

### D3：AI 品質門檻——修改 `get_pending_practices()` 查詢條件

**做法：** 在 `insight_service.py` 的 `get_pending_practices()` 中新增兩個過濾條件：

```python
# 條件 1：進度 ≥ 80%
Practice.progress_percentage >= 80

# 條件 2：平均打卡字數 ≥ 50（subquery）
subq = (
    select(func.avg(func.length(PracticeCheckIn.note)))
    .where(PracticeCheckIn.practice_id == Practice.id)
    .correlate(Practice)
    .scalar_subquery()
)
subq >= 50
```

**棄選方案：**
- 在 scheduler 層過濾（取出後 Python 判斷）：效能差，取出不需要的資料
- 新增 DB 欄位存品質分數：增加維護成本，品質門檻可能調整

**邊界情況：**
- 0 筆打卡的 completed 實踐：`AVG(NULL)` = NULL → 不符合 `>= 50` → 不觸發（正確行為）
- note 為 NULL 的打卡：`LENGTH(NULL)` = NULL → 不計入平均（PostgreSQL 行為）

### D4：Clarity Score——純前端計算，不存 DB

**做法：**

```typescript
function calcClarityScore(
  avgWordCount: number,
  progressPercentage: number,
  isEnded: boolean
): number {
  const wordRatio = Math.min(avgWordCount / 50, 1);
  const progressRatio = Math.min(progressPercentage / 80, 1);
  const raw = Math.round(Math.min(wordRatio, progressRatio) * 100);
  if (!isEnded) return Math.min(raw, 99);
  return raw;
}
```

- 使用 `Math.min(wordRatio, progressRatio)` 而非平均值，確保兩項指標都需達標
- 未到結束日上限鎖 99%（`isEnded` 由 `end_date <= today` 判定）
- 每次打卡後前端重新計算（基於 API 回傳的 check-in 列表統計）

**棄選方案：** 後端計算存 DB——增加複雜度且無持久化需求，clarity score 只是前端展示用的輔助指標。

### D5：見證指標 API——包裝現有 service，新增 2 個 endpoints

**做法：** `practice-social-proof.service.ts` 已完整實作 `toggleSocialProof()`、`getSocialProofStatus()`、`getSocialProofCounts()` 三個 function。本 change 只需：

1. 新增 `POST /api/v1/practices/:id/social-proof` — 呼叫 `toggleSocialProof()`
2. 新增 `GET /api/v1/practices/:id/social-proof/status` — 呼叫 `getSocialProofStatus()` + `getSocialProofCounts()`

**權限設計：**
- toggle：需登入，不可對自己的實踐操作（403）
- status：需登入，可查詢任何公開實踐（回傳自己的標記狀態 + 計數）

### D6：覆盤 PATCH API——單一 endpoint，Zod 驗證

**做法：** `PATCH /api/v1/practices/:id/reflection`

```typescript
// Request body
const reflectionUpdateSchema = z.object({
  reflection: z.string().min(1).max(5000)
});

// Response
const reflectionUpdateResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    id: z.number(),
    reflection: z.string(),
    updatedAt: z.string()
  })
});
```

**權限：** 需登入 + 必須是實踐擁有者 + 實踐 status 必須為 `completed`（draft/active/archived 皆不可寫入覆盤）。

### D7：AI Backend Practice Model 補 reflection

**做法：** 在 `src/models/Practice.py` 的 `Practice` class 新增：

```python
reflection = Column(Text, nullable=True)
```

**理由：** DB 欄位已存在（`018_add_practices_reflection.sql`），但 SQLAlchemy model 未映射。目前 AI backend 不讀寫 reflection（並聯模型），但 model 應反映實際 DB schema，避免未來查詢時出現 unmapped column 警告。

---

## Risks / Trade-offs

| 風險 | 緩解策略 |
|------|---------|
| 覆盤 Markdown 格式未來解析困難 | 以 `<!-- template: xxx -->` 標記模板類型，保留程式化解析能力 |
| 品質門檻 50 字 / 80% 數值可能不適合所有實踐類型 | 先以此數值上線觀察，後續可依 template 分類調整門檻（但不在本 change 範圍） |
| `AVG(LENGTH(note))` subquery 在大量 checkins 時的效能 | `get_pending_practices()` 是每日 cron 執行一次，非即時 API；且 completed 實踐數量有限 |
| 見證按鈕濫用（反覆 toggle） | `toggleSocialProof()` 已有 UNIQUE constraint 確保一人一類型只能標記一次，toggle 行為天然防濫用 |
| 覆盤置頂 72 小時的 `updated_at` 判定在其他欄位更新時誤觸 | 可在 reflection 寫入時同時記錄 `reflection_updated_at` 至 response，前端用此判定；但 MVP 先用 `updated_at`，後續觀察是否需要獨立欄位 |

---

## Migration Plan

1. **確認前置依賴**：Phase 1（practice-summary-core）全部上線
2. **AI Backend 部署**：
   - `Practice` model 補 `reflection` column mapping
   - `get_pending_practices()` 加入品質門檻條件
3. **後端部署**：
   - 新增 `PATCH /api/v1/practices/:id/reflection`
   - 新增 `POST /api/v1/practices/:id/social-proof`
   - 新增 `GET /api/v1/practices/:id/social-proof/status`
4. **前端部署**：
   - 覆盤 UI（模板選擇 + 編輯器 + 置頂邏輯）
   - 見證按鈕（Insightful / Referenced / Witnessed）
   - Clarity score 元件
5. **Rollback**：前端隱藏覆盤 UI 與見證按鈕即可回退；後端 API 可獨立存在不影響現有功能；AI 品質門檻回退只需移除 `get_pending_practices()` 的兩個條件

---

## Resolved Questions

| 問題 | 決議 |
|------|------|
| 覆盤欄位是否需要新 migration？ | 否——`practices.reflection TEXT` 已存在（`018_add_practices_reflection.sql`） |
| `practice_social_proofs` 表是否需要新 migration？ | 否——已存在（`026_create_table_practice_social_proofs.sql`） |
| 見證 service 是否需要重寫？ | 否——`practice-social-proof.service.ts` 已完整實作三個 function，只需接 API endpoints |
| AI 品質門檻寫在 scheduler 還是 service？ | `insight_service.get_pending_practices()`——門檻是查詢條件，屬 service 層責任 |
| Clarity score 存 DB 還是前端計算？ | 前端計算——無持久化需求，純展示用 |
| 覆盤與 AI 洞察是否串聯？ | 否——維持並聯模型，覆盤不 feed 給 AI，AI 不讀取覆盤內容 |
| AI Backend Practice model 是否缺 reflection？ | 是——DB 有欄位但 SQLAlchemy model 未映射，需補上 |
| 品質門檻具體數值？ | 進度 ≥ 80%、平均打卡字數 ≥ 50（FRD 原寫 70%，綜合規劃調為 80%） |
