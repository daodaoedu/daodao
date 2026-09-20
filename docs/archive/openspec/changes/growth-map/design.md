## Context

Dao Dao 是學習資源與實踐社群平台，使用者透過 Practice 記錄學習歷程。目前所有學習記錄皆為線性時間軸（打卡列表），缺乏跨實踐的能力分布視角。

Growth Map 基於 WEF 全球技能分類（8 大 Level 2 支柱 → 26 Level 3 → 93 Level 4 微觀技能），以 D3.js 力導向圖將使用者的技能節點視覺化為「個人成長地圖」。

**現有可複用基礎：**
- `practice_checkins` 表（打卡記錄，含 `note` 文字與 `image_urls` 圖片）
- 通知分發管線（`notification_events`）——未來可用於節點升級通知
- AI backend（FastAPI + GPT-4o-mini / DeepSeek-Chat）——可承載分類端點

**尚需建立：**
- 技能節點與足跡的資料模型（`skills_nodes`、`footprints`）
- D3.js 力導向圖前端元件
- 三層分類引擎（前端 Regex + 繼承標籤 + LLM）
- Practice Check-in → Footprint 橋接機制

---

## Goals / Non-Goals

**Goals:**
- 建立 WEF 8 大支柱為基礎的技能節點資料模型，支援 seed/solid/cooling 生命週期
- 實作 D3.js 力導向圖，八角引力錨點佈局，互動操作流暢（60fps 拖曳）
- 實作三層分類引擎：前端 Regex（$0）→ 繼承標籤（$0）→ LLM（<$0.0001/次）
- Practice Check-in 完成後非同步橋接建立 footprint，Growth Map 自動獲得數據
- 3 次 footprint 後節點自動從 seed 升級為 solid
- 節點拖曳重疊 1.5 秒觸發合併 Modal

**Non-Goals:**
- 社群公開 Growth Map（僅個人可見）
- ESCO 對接、LinkedIn 整合
- 多媒體 AI 分析（Vision API）
- 回填既有歷史打卡為 footprint
- Level 3 中間層 UI

---

## Decisions

### D1：DB Schema 使用 SERIAL INT（對齊專案慣例），不用研究文件中的 UUID

**做法：** `skills_nodes` 和 `footprints` 表使用 `SERIAL PRIMARY KEY`，`user_id` 為 `INT REFERENCES users(id)`，對齊專案既有所有表的 ID 型別慣例。

**棄選：UUID**——研究文件原始設計使用 UUID，但 daodao 全專案統一使用 SERIAL INT，混用會造成 ORM 與 API 型別不一致。

---

### D2：`level2_anchor` 使用 TEXT + CHECK，不建 ENUM 型別

**做法：** `primary_pillar` 欄位為 `TEXT NOT NULL`，搭配 `CHECK` constraint 限制 8 個合法值。`secondary_pillars` 使用 `TEXT[]` 陣列。

**原因：** PostgreSQL ENUM 一旦建立，新增值需 `ALTER TYPE ... ADD VALUE`（不可在 transaction 中執行且不可移除），對未來支柱擴充不友善。TEXT + CHECK 更靈活，且效能差異在此規模下可忽略。

---

### D3：`node_status` 使用 TEXT + CHECK，On-Read 計算 cooling 狀態

**做法：** `status` 欄位存 `'seed'` 或 `'solid'`。`cooling` 不寫入 DB，由 API layer 根據 `updated_at` 與當前時間差即時判定（30 天無新 footprint → cooling）。

**原因：** 與 buddy-ember 的 D2 決策邏輯一致——on-read 計算永遠正確，無需 cron 維護。seed → solid 的升級則是寫入事件（第 3 次 footprint 時觸發 UPDATE），有明確時間點。

**cooling 判定規則：**
```
status = 'solid' AND (NOW() - updated_at) > INTERVAL '30 days' → cooling
```

---

### D4：Practice Check-in → Footprint 橋接——Option B，非同步橋接

**做法：** 打卡 service 在寫入 `practice_checkins` 成功後，發出一個輕量 async job（BullMQ），由橋接 worker 根據打卡內容建立或更新 footprint。橋接邏輯：

1. 若該 Practice 已有對應的 `skills_nodes`（透過 `pinned_footprint_id` 或 Practice → Node 映射），直接在該節點新增 footprint
2. 若無對應節點，先執行三層分類引擎（Regex → 繼承標籤 → LLM）建立新節點，再新增 footprint
3. `is_manual_override = TRUE` 的節點不被 AI 重新分類

**棄選 Option A（完全獨立）：** Growth Map 無法從既有實踐活動中自動獲得數據，使用者需手動雙重輸入，體驗割裂。

**棄選 Option C（合併表）：** `practice_checkins` 與 `footprints` 語意不同——前者是「特定實踐的打卡」，後者是「跨實踐的技能成長證據」。合併會汙染現有打卡 query 且增加 migration 風險。

**橋接表：** 新增 `practice_checkin_footprints` join table，記錄哪些 footprint 是從哪筆 check-in 橋接來的，避免重複橋接。

---

### D5：三層分類引擎——前端 Regex 為主，LLM 為輔

**做法：**

**第一層（前端 Regex，$0）：** `WEF_8_REGEX_DICTIONARY` 包含 8 組中英雙語 regex patterns，對打卡文字做累加計分。分數最高的支柱作為建議分類。置信度 > 0.7 時直接採用，不呼叫 LLM。

**第二層（繼承標籤，$0）：** 若該 Practice 的發起人已設定預設支柱標籤（`practices.default_pillar`，新增欄位），直接繼承。使用者手動覆寫（`is_manual_override`）優先於繼承。

**第三層（LLM，<$0.0001/次）：** 前端 Regex 置信度 ≤ 0.7 且無繼承標籤時，呼叫 AI backend `POST /api/v1/skill-classification/classify`。Prompt 要求 JSON 回應：`{ "primary_pillar": "...", "level4_subskills": ["...", "..."] }`。模型：GPT-4o-mini（主）/ DeepSeek-Chat（備援）。

**成本估算（3000 MAU）：** 約 15% 打卡觸發 LLM 分類 ≈ 450 calls/month < $0.05/month。

---

### D6：D3.js 力導向圖——八角圓形引力錨點佈局

**做法：** 使用 `d3-force` 模組，8 個 WEF 支柱作為不可見的引力錨點，以正八角形排列：

```
θ_i = i × π/4 - π/8  (i = 0..7)
錨點座標: (cx + r × cos(θ_i), cy + r × sin(θ_i))
r = 220px（引力半徑）
```

Force 參數：
- `d3.forceManyBody().strength(-350)`（節點斥力）
- `d3.forceCollide().radius(d => d.radius + 15)`（碰撞半徑）
- `d3.forceX/Y().strength(0.08)`（引力錨點吸引力）

**Hybrid Halo：** 節點有 `secondary_pillars` 時，以 SVG `<linearGradient>` 渲染混色外圈，顏色對應次要支柱。

**Tooltip：** hover 時顯示節點名稱 + Level 4 微觀技能 tags（跳過 Level 3）。

---

### D7：節點合併——拖曳重疊 1.5 秒觸發 Modal

**做法：** 前端偵測拖曳中的節點與目標節點圓心距離 < 合併閾值（兩者半徑之和）且持續 1.5 秒，彈出合併確認 Modal。確認後呼叫 `POST /api/v1/skill-nodes/merge` API：

- 保留主節點，刪除被合併節點
- 被合併節點的 footprints 轉移至主節點
- 被合併節點的 `secondary_pillars` 與 `level4_subskills` 合併至主節點（去重）
- 不可逆操作，Modal 需明確警告

---

### D8：AI 分類端點——FastAPI，獨立於既有 AI 功能

**做法：** 在 `daodao-ai-backend` 新增 `POST /api/v1/skill-classification/classify` 端點：

**Request：**
```json
{
  "text": "今天練習了 30 分鐘冥想，感覺更能覺察情緒波動",
  "context": "每日冥想實踐"
}
```

**Response：**
```json
{
  "primary_pillar": "motivation_self_awareness",
  "confidence": 0.85,
  "level4_subskills": ["self-awareness", "emotional-regulation"]
}
```

Prompt 設計：system prompt 包含 8 大支柱定義 + 93 個 Level 4 微觀技能清單，要求嚴格回傳 JSON。

---

## daodao-server API 設計

### 技能節點 CRUD

| Method | Path | 說明 |
|--------|------|------|
| `GET` | `/api/v1/skill-nodes` | 取得當前使用者所有技能節點（含 on-read status） |
| `POST` | `/api/v1/skill-nodes` | 建立技能節點（手動或 AI 分類結果） |
| `PATCH` | `/api/v1/skill-nodes/:id` | 更新節點（label、手動覆寫分類、pin footprint） |
| `DELETE` | `/api/v1/skill-nodes/:id` | 刪除節點（cascade 刪除關聯 footprints） |
| `POST` | `/api/v1/skill-nodes/merge` | 合併兩個節點（body: `{ sourceId, targetId }`） |

### 足跡 CRUD

| Method | Path | 說明 |
|--------|------|------|
| `GET` | `/api/v1/skill-nodes/:nodeId/footprints` | 取得節點的所有足跡（分頁） |
| `POST` | `/api/v1/skill-nodes/:nodeId/footprints` | 新增足跡（手動） |
| `DELETE` | `/api/v1/footprints/:id` | 刪除足跡 |

### 橋接

| Method | Path | 說明 |
|--------|------|------|
| `POST` | `/api/v1/skill-nodes/bridge-checkin` | 內部呼叫：將 practice check-in 橋接為 footprint |

所有端點皆需 auth middleware，僅限操作自己的資料（`user_id` 驗證）。Request/Response 使用 Zod schema 驗證。

---

## Risks / Trade-offs

| 風險 | 緩解策略 |
|------|---------|
| D3.js bundle size（~50KB gzip）影響首屏載入 | `next/dynamic` 動態 import，僅進入 `/growth-map` 頁面時載入 |
| 力導向圖在節點數 > 100 時效能下降 | 設定節點上限提示（> 80 節點時建議合併），simulation alpha decay 加速收斂 |
| LLM 分類結果不穩定（同一文字不同次分類結果不同） | 前端 Regex 優先減少 LLM 依賴；`is_manual_override` 讓使用者有最終決定權 |
| 橋接 job 失敗導致 footprint 遺漏 | BullMQ retry 3 次 + dead letter queue；橋接失敗不影響原始打卡 |
| `secondary_pillars` TEXT[] 陣列 query 效率 | 此欄位僅用於讀取時渲染 Halo，不需索引；列表 query 不 filter 此欄位 |
| 前端 Regex 字典維護成本 | 初版由 AI 輔助產生，後續可從 LLM 分類結果回饋優化 regex patterns |

---

## DB Migration

### 新增 skills_nodes 表

> ID 型別對齊專案慣例（SERIAL INT）。`primary_pillar` 使用 TEXT + CHECK 而非 ENUM（見 D2）。

```sql
CREATE TABLE IF NOT EXISTS "skills_nodes" (
    "id"                  SERIAL PRIMARY KEY,
    "user_id"             INT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "label"               VARCHAR(50) NOT NULL,
    "primary_pillar"      TEXT NOT NULL CHECK ("primary_pillar" IN (
                            'analytical_thinking', 'creative_thinking',
                            'resilience_agility', 'motivation_self_awareness',
                            'empathy_listening', 'leadership_influence',
                            'tech_literacy', 'systems_ai_competency'
                          )),
    "secondary_pillars"   TEXT[] DEFAULT '{}',
    "level4_subskills"    TEXT[] DEFAULT '{}',
    "status"              TEXT NOT NULL DEFAULT 'seed' CHECK ("status" IN ('seed', 'solid')),
    "is_manual_override"  BOOLEAN NOT NULL DEFAULT FALSE,
    "pinned_footprint_id" INT DEFAULT NULL,
    "created_at"          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at"          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_skills_nodes_user_id ON "skills_nodes" ("user_id");
CREATE INDEX idx_skills_nodes_pillar ON "skills_nodes" ("user_id", "primary_pillar");
```

### 新增 footprints 表

```sql
CREATE TABLE IF NOT EXISTS "footprints" (
    "id"         SERIAL PRIMARY KEY,
    "node_id"    INT NOT NULL REFERENCES "skills_nodes"("id") ON DELETE CASCADE,
    "content"    TEXT NOT NULL,
    "media_url"  VARCHAR(255) DEFAULT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_footprints_node_id ON "footprints" ("node_id");
CREATE INDEX idx_footprints_created_at ON "footprints" ("node_id", "created_at" DESC);
```

### 新增 practice_checkin_footprints 橋接表

> 記錄 check-in 與 footprint 的對應關係，防止重複橋接。

```sql
CREATE TABLE IF NOT EXISTS "practice_checkin_footprints" (
    "id"          SERIAL PRIMARY KEY,
    "checkin_id"  INT NOT NULL REFERENCES "practice_checkins"("id") ON DELETE CASCADE,
    "footprint_id" INT NOT NULL REFERENCES "footprints"("id") ON DELETE CASCADE,
    "created_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE ("checkin_id")
);
```

### practices 表新增 default_pillar 欄位

> 讓實踐發起人可預設支柱標籤，橋接時繼承。

```sql
ALTER TABLE "practices" ADD COLUMN IF NOT EXISTS "default_pillar" TEXT DEFAULT NULL
    CHECK ("default_pillar" IS NULL OR "default_pillar" IN (
        'analytical_thinking', 'creative_thinking',
        'resilience_agility', 'motivation_self_awareness',
        'empathy_listening', 'leadership_influence',
        'tech_literacy', 'systems_ai_competency'
    ));
```

### pinned_footprint_id FK（延遲建立）

> `skills_nodes.pinned_footprint_id` 的 FK 需在 `footprints` 表建立後才能加：

```sql
ALTER TABLE "skills_nodes"
    ADD CONSTRAINT fk_skills_nodes_pinned_footprint
    FOREIGN KEY ("pinned_footprint_id") REFERENCES "footprints"("id") ON DELETE SET NULL;
```

**Rollback：**
```sql
ALTER TABLE "skills_nodes" DROP CONSTRAINT IF EXISTS fk_skills_nodes_pinned_footprint;
ALTER TABLE "practices" DROP COLUMN IF EXISTS "default_pillar";
DROP TABLE IF EXISTS "practice_checkin_footprints";
DROP TABLE IF EXISTS "footprints";
DROP TABLE IF EXISTS "skills_nodes";
```

---

## Migration Plan

1. **部署 DB migration**（skills_nodes → footprints → practice_checkin_footprints → practices.default_pillar → pinned FK）——純新增，無停機
2. **部署 AI backend**：新增 `POST /api/v1/skill-classification/classify` 端點
3. **部署後端 API**：技能節點 CRUD + 足跡 CRUD + 合併 + 橋接 service + BullMQ bridge worker
4. **部署前端**：D3.js Growth Map 頁面，feature flag 控制，先對內部帳號開放
5. **觀察期**：確認橋接 job 穩定、LLM 分類品質可接受
6. **全量開放**

---

## Open Questions

1. **cooling 門檻天數**：目前假設 30 天，是否需根據使用者活躍度動態調整？——MVP 先固定 30 天。
2. **前端 Regex 字典初版品質**：需人工審核 8 組 regex patterns 的召回率與準確率——上線前由產品團隊抽樣驗證。
3. **節點數量軟上限**：是否在 UI 層面限制最大節點數？——MVP 先不限制，超過 80 顯示提示。
4. **Practice 總結頁「下一步」區塊連結到 Growth Map**：此 UI 入口是否在本次範圍內？——建議納入，但為低優先級 task。
