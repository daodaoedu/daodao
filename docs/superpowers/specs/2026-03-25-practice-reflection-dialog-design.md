# Practice 完成反思對話 — 設計規格

## 概述

Practice 完成所有打卡後，Summary 頁上出現按鈕，點擊彈出 AI 三輪反思對話。AI 根據用戶的打卡數據（topNotes、moods、checkInCount）動態生成個人化選項，三輪對話逐步從「感受」收斂到「信念」，最終產出一句個人金句，存入後端。

## 使用者流程

```
Summary 頁載入（prefetch 第一輪）
    ↓
用戶點擊「AI 想跟你聊聊 ✨」按鈕
    ↓
彈窗開啟，第一輪秒出（已 prefetch）
    ↓
第一輪：感受層 — 「回顧這段時間，最大的感受是？」（3-4 選項 + 自由輸入）
    ↓ 用戶選擇
第二輪：原因層 — 根據選擇 + 筆記細節追問（3-4 選項 + 自由輸入）
    ↓ 用戶選擇
第三輪：信念層 — 收斂成金句選項（3-4 選項 + 自由輸入）
    ↓ 用戶選擇
結果頁：大字展示金句 + 存入後端
```

- 每輪之間有 loading 狀態（等待 AI 回應，約 1-2 秒）
- 不做特別過場動畫，loading 本身就是自然過渡
- 只能做一次，完成後按鈕替換為金句展示區塊（styled container 顯示金句文字）
- 用戶可以中途關閉彈窗，不影響 Summary 頁。中途關閉視為放棄，下次點按鈕重新開始

## 技術架構

### Worker API（worker.daodao.so）

#### `POST /reflection/start`

啟動反思對話 session，回傳第一輪內容。

```typescript
// Request
{
  practiceId: string;
  summaryData: {
    userName: string;
    practiceName: string;
    checkInCount: number;
    topMoods: { mood: string; count: number }[];
    topNotes: string[];
    startDate: string;  // YYYY-MM-DD
    endDate: string;    // YYYY-MM-DD
  };
}

// Response
{
  success: boolean;
  data: {
    sessionId: string;
    round: 1;
    message: string;       // AI 生成的引言，如「你連續打卡了 18 次，最常在週末練習。」
    options: string[];     // 3-4 個選項
    allowCustom: true;     // 是否允許自由輸入
  };
}
```

#### `POST /reflection/next`

根據用戶選擇，生成下一輪內容。

```typescript
// Request
{
  sessionId: string;      // Worker 透過 sessionId 追蹤當前輪次，不需要前端傳 round
  selection: string | { custom: string };  // 選擇的選項文字，或自由輸入
}

// Response (round 2)
{
  success: boolean;
  data: {
    round: 2;
    message: string;
    options: string[];
    allowCustom: true;
  };
}

// Response (round 3 — 最終輪)
{
  success: boolean;
  data: {
    round: 3;
    message: string;
    options: string[];     // 金句選項
    allowCustom: true;
  };
}
```

### 通用 Prompt 管理系統（Worker 層級）

> 此系統不限於 reflection，適用所有 AI 功能（action-maker、refine、reflection 等）。

#### 設計

- **KV 儲存**：key pattern `prompt:{feature}:{name}`，例如 `prompt:reflection:round1`、`prompt:action-maker:system`
- **Fallback 機制**：KV 沒有時，fallback 到程式碼中的預設模板（現有行為）
- **模板變數**：支援 `{{variableName}}` 語法，由各功能的 prompt builder 負責替換

#### `GET /prompts?feature={feature}`

取得某功能的所有 prompt 模板。

```typescript
// GET /prompts?feature=reflection
// Response
{
  success: true;
  data: {
    feature: "reflection";
    prompts: {
      "round1": { template: "...", variables: ["checkInCount", "topNotes", "topMoods", ...] },
      "round2": { template: "...", variables: ["previousSelection", "topNotes", ...] },
      "round3": { template: "...", variables: ["allSelections", ...] },
    };
  };
}

// GET /prompts?feature=action-maker
// Response
{
  success: true;
  data: {
    feature: "action-maker";
    prompts: {
      "system-zh": { template: "...", variables: ["category", "topic"] },
      "system-en": { template: "...", variables: ["category", "topic"] },
      "user": { template: "...", variables: ["category", "topic", "tags"] },
    };
  };
}
```

#### `PUT /prompts`

更新單一 prompt 模板。

```typescript
// Request
{
  feature: string;  // "reflection" | "action-maker" | "refine"
  name: string;     // "round1" | "system-zh" | ...
  template: string; // 模板內容，含 {{variable}} 佔位符
}
```

#### `GET /prompts/features`

列出所有已註冊的功能及其 prompt 名稱。

```typescript
// Response
{
  success: true;
  data: [
    { feature: "action-maker", prompts: ["system-zh", "system-en", "user"] },
    { feature: "refine", prompts: ["system", "user"] },
    { feature: "reflection", prompts: ["system", "round1", "round2", "round3"] },
  ];
}
```

**以上 prompt 管理 API 為 admin-only，需要 JWT 驗證權限。**

#### Prompt 載入邏輯

各功能的 prompt builder 改為：
1. 先查 KV `prompt:{feature}:{name}`
2. 有 → 用 KV 版本，替換 `{{variables}}`
3. 沒有 → 用程式碼中的 hardcoded 預設值（向後相容）

這樣現有的 action-maker prompt 不需要立即遷移，但可以透過 API 覆寫。

### Worker Session 生命週期

- Session TTL：30 分鐘，過期自動清除
- 前端收到 session expired 錯誤時，重新呼叫 `/reflection/start`
- 放棄的 session（prefetch 後用戶沒點按鈕）自然過期，不需清理

### 後端 API 修改

#### `PUT /api/v1/practices/{id}`

新增 `reflectionQuote` 欄位，三輪對話完成後前端呼叫此 API 存入金句。

```typescript
// Request body 新增欄位
{
  reflectionQuote?: string;
}
```

#### `GET /api/v1/practices/{id}/summary`

Response 新增 `reflectionQuote` 欄位。

```typescript
// PracticeSummary 新增
{
  // ...existing fields
  reflectionQuote?: string | null;  // 用戶完成反思對話後的金句
}
```

### 對話記錄儲存

#### `reflection_sessions` table

獨立 table 存放完整的反思對話歷程。

```sql
CREATE TABLE "reflection_sessions" (
  "id" SERIAL PRIMARY KEY,
  "external_id" UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  "practice_id" INT NOT NULL REFERENCES "practices"("id"),
  "user_id" INT NOT NULL REFERENCES "users"("id"),
  "rounds" JSONB NOT NULL,           -- 三輪對話完整記錄
  "quote" VARCHAR(100),              -- 最終金句（冗餘存放，方便查詢）
  "status" VARCHAR(20) NOT NULL DEFAULT 'completed',  -- completed / abandoned
  "created_at" TIMESTAMPTZ DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ DEFAULT NOW()
);
```

`rounds` JSONB 結構：

```json
[
  {
    "round": 1,
    "message": "你連續打卡了 18 次...",
    "options": ["比想像中有趣", "比想像中難，但撐下來了", ...],
    "selection": "比想像中難，但撐下來了"
  },
  {
    "round": 2,
    "message": "你在第 3 週的筆記寫到...",
    "options": ["反覆嘗試", "看了教學", ...],
    "selection": "反覆嘗試"
  },
  {
    "round": 3,
    "message": "聽起來你是做中學型的人...",
    "options": ["不懂沒關係，做了就會懂", ...],
    "selection": "不懂沒關係，做了就會懂"
  }
]
```

#### 儲存時機

Worker 完成最後一輪後，在 `/reflection/next` 的 round 3 response 中附帶完成信號。前端收到金句後：
1. 呼叫 `PUT /api/v1/practices/{id}` 存 `reflectionQuote`
2. 呼叫 `POST /api/v1/reflection-sessions` 存完整對話記錄

#### 後端新增 API

```typescript
// POST /api/v1/reflection-sessions
{
  practiceId: string;
  rounds: Array<{
    round: number;
    message: string;
    options: string[];
    selection: string;
  }>;
  quote: string;
}
```

### AI 輸出驗證

不做 AI second-pass 驗證。驗證策略：

1. **Prompt 約束** — system prompt 要求繁體中文、引用用戶數據、輸出 JSON 格式
2. **Zod Schema 驗證** — 驗證回傳結構完整性（message 非空、options 3-4 個、每個選項 ≤ 30 字）
3. **簡單規則** — 繁體中文偵測（regex）、字數範圍檢查
4. **失敗策略** — 驗證失敗重試 1 次，仍失敗則回傳 fallback 預設內容（每輪準備一組 generic 選項）

### 自由輸入處理

用戶選「自己寫」時輸入的文字直接當作選擇，不做 AI 潤飾。最後一輪如果自己寫，該文字即為金句。

- 前端限制：一般輪次最多 200 字，金句輪最多 100 字
- 後端 `reflectionQuote` 欄位：VARCHAR(100)

## 前端元件結構

### 新增檔案

```
apps/product/src/components/practice/summary/reflection-dialog/
├── reflection-dialog.tsx       # 主容器，直接用 Dialog/Sheet primitives（不用 useDialog()）
├── reflection-round.tsx        # 單輪 UI：message + options 列表 + 自由輸入框
├── reflection-loading.tsx      # 等待 AI 回應的 skeleton 動畫
├── reflection-result.tsx       # 最終金句展示 + 關閉按鈕
└── use-reflection.ts           # Hook：session 管理、Worker 呼叫、狀態機
```

### 修改檔案

- `practice-summary-page.tsx` — 新增「AI 想跟你聊聊 ✨」按鈕，頁面載入時 prefetch 第一輪
- `practice-summary-card.tsx` — 暫不修改（金句顯示在 dialog 內，不嵌入卡片）

### 狀態機

```
idle → loading_round_1 → round_1 → loading_round_2 → round_2 → loading_round_3 → round_3 → result → saved
                ↘                       ↘                          ↘                          ↘
               error ←←←←←←←←←←←←←←←← error ←←←←←←←←←←←←←←←←← error ←←←←←←←←←←←←←←←←← error
```

- `error` 狀態顯示「發生錯誤，請再試一次」+ 重試按鈕
- 重試會重新呼叫失敗的那一輪
- 如果 save 失敗，停留在 result 狀態，顯示錯誤提示 + 重試

### `use-reflection.ts`

```typescript
interface UseReflectionReturn {
  state: ReflectionState;
  currentRound: { round: number; message: string; options: string[] } | null;
  quote: string | null;
  isLoading: boolean;
  error: Error | null;
  start: (summaryData: SummaryData) => Promise<void>;  // prefetch 用
  select: (selection: string | { custom: string }) => Promise<void>;
  save: () => Promise<void>;  // 存金句到後端
}
```

### `reflection-dialog.tsx`

- 直接使用 Dialog/Sheet primitives（`animate-ui/primitives/radix/dialog` + `animate-ui/components/radix/sheet`），不用 `useDialog()` hook（因為 useDialog 是 one-shot confirm 模式，不支援多輪動態更新內容）
- 自行管理 open/close 狀態，用 `useMediaQuery` 判斷 desktop Dialog / mobile Sheet
- 進度指示器：3 個圓點顯示當前輪次
- 根據 state 渲染：loading → round → result

### Prefetch 策略

- 僅在 `summary.reflectionQuote` 為 `null` 時才 prefetch（已完成反思的不再呼叫）
- Summary 頁載入時即呼叫 `POST /reflection/start`，將第一輪結果快取
- 用戶點按鈕時第一輪秒出，無需等待

## 明確不做的事

- **Summary Card 不改** — 金句只在 dialog 結果頁顯示，卡片 layout 調整另開 ticket
- **不做 AI second-pass 驗證** — 風險低，Prompt + Zod + 規則檢查足夠
- **不做重複對話** — 一個 practice 只能做一次反思，金句確定後固定
- **自由輸入不做 AI 潤飾** — 保持用戶原文
- **不做過場動畫** — loading 狀態即自然過渡

## 各子專案分工

依據 monorepo 分工（參考 AGENTS.md）：

| 子專案 | 工作內容 |
|--------|----------|
| `daodao-worker` | 新增 `/reflection/start`、`/reflection/next`、`GET/PUT /reflection/prompts` endpoints；Prompt 模板存 KV；AI 輸出驗證（Zod + 規則）；Session 管理（TTL 30 分鐘） |
| `daodao-storage` | Practice table 新增 `reflection_quote` 欄位（VARCHAR(100), nullable）；新增 `reflection_sessions` table；寫 migration |
| `daodao-server` | `PUT /api/v1/practices/{id}` 支援 `reflectionQuote` 寫入；`GET /api/v1/practices/{id}/summary` response 新增 `reflectionQuote`；新增 reflection session CRUD |
| `daodao-f2e` | 新增 `reflection-dialog/` 元件組；修改 `practice-summary-page.tsx` 加按鈕 + prefetch；更新 `PracticeSummary` type |
| `daodao-infra` | 無需變更 |
| `daodao-ai-backend` | 無需變更 |

### 實作順序建議

1. `daodao-storage` — migration 先行
2. `daodao-server` — API 欄位支援
3. `daodao-worker` — AI reflection endpoints
4. `daodao-f2e` — 前端元件與整合
