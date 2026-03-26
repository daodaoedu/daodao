# Action Maker 功能狀態檢視

> 檢視日期：2026-03-24
> 前端路徑：`apps/website/src/app/[locale]/(without-layout)/action-maker/`
> Feature package：`packages/features/action-maker/`
> 後端路徑：`/Users/xiaoxu/Projects/daodao/daodao-worker/`（獨立 repo）

## 定位

Website app 上的行銷導流頁面。多步驟引導使用者透過 AI 建立個人化微習慣行動計畫，完成後可登入建立 practice 並導向 product app。

## 導航流程

```
intro → category ─── 下一步 ──→ nickname → actions → detail → result
                 └── 我想自己設定 → topic → actions → detail → result
```

| 路由 | 元件 | 功能 |
|---|---|---|
| `/action-maker` | `ActionMakerIntro` | 入口介紹頁 |
| `/action-maker/category` | `ActionMakerCategory` | 選擇分類（6 大類）+ tag 篩選 |
| `/action-maker/nickname` | `ActionMakerNickname` | 輸入暱稱 |
| `/action-maker/topic` | `ActionMakerTopic` | 自訂主題（僅從 category「我想自己設定」進入） |
| `/action-maker/actions` | `ActionMakerActions` | AI 行動建議 carousel + 自訂行動 refine 流程 |
| `/action-maker/detail` | `ActionMakerDetail` | 行動細節 + 觸發時機設定 |
| `/action-maker/result` | `ActionMakerResult` | 結果卡片 + 開始實踐 / 分享 / 再玩一次 |

## 狀態管理

- `useReducer` + `React Context`（`ActionMakerProvider`）
- `sessionStorage` 持久化，重新整理可還原
- State 包含：`userInput`、`userSelection`、`generatedActions`、`sessionId`、`usedRefine`

## 後端整合

### daodao-worker（Cloudflare Worker）

| Endpoint | 功能 | 前端串接 |
|---|---|---|
| `POST /action-maker/generate` | AI 生成 3 個行動建議（beginner/intermediate/advanced） | `useGenerateActions` 已串接 |
| `POST /action-maker/refine` | AI 精煉自訂行動，補充 tip/rationale/duration | `useRefineAction` 已串接 |

- IP rate limit（KV）、Langfuse tracing、錯誤處理皆已實作
- API 失敗時前端自動 fallback 到靜態建議（6 類 × 3 等級）

### daodao-server

| 操作 | 功能 | 前端串接 |
|---|---|---|
| `createPractice` API | 從結果建立 practice（14 天、每日） | `useCreatePracticeFromAction` 已串接 |
| `PATCH /api/v1/ai-generations/:sessionId` | 回報使用者互動紀錄（選了哪個 action、是否用 refine、是否建立 practice） | 已串接（non-blocking） |

### 結果頁行為

- 已登入：點「開始實踐」→ 建立 practice → 導向 product app
- 未登入：點「開始實踐」→ 登入對話框 → 登入成功後自動建立 practice → 導向 product app

## 自訂行動 Refine 流程

actions 頁的「我想自己設定」進入 4 步子流程：

1. **選擇強度** — beginner / intermediate / advanced
2. **填寫表單** — 標題、描述、預估時間
3. **AI 精煉中** — loading 狀態
4. **比較結果** — 採用 AI 版本 / 自己修改 / 用原本的

Refine 失敗時顯示錯誤訊息並允許使用者直接用原本的行動。

---

## 已完成

- 完整多步驟 UI（分類 carousel、暱稱/主題輸入、行動卡片 carousel、行動細節、結果卡片）
- AI 生成行動建議（Worker `/generate`）+ 前端串接
- AI 精煉自訂行動（Worker `/refine`）+ 前端串接 + 4 步 refine 子流程
- 建立 practice + 登入後自動建立 + 導向 product app
- AI generation session 紀錄回報
- 結果截圖分享（`captureElementAsImage`）+ Native Share API
- 星空背景、Lottie 動畫、reduced motion 支援
- Fallback 靜態行動建議（6 類 × 3 等級）
- sessionStorage 狀態持久化與還原
- Refine 錯誤處理 UI

## 待處理

### P1 — UX 問題

| # | 項目 | 位置 | 說明 |
|---|---|---|---|
| 1 | **ProgressBar total=4 但只有 3 步顯示** | `progress-bar.tsx:11` | `total` 預設 4，但只有 nickname(1)、actions(2)、detail(3) 顯示 progress bar，進度條永遠到不了終點 |
| 2 | **Generate 無錯誤處理 UI** | `action-maker-actions.tsx` | `useGenerateActions` 的 `error` 狀態在 actions 頁主畫面沒有顯示（fallback 為空時使用者看到空白）。注意：refine 的錯誤 UI 已有 |

### P2 — 收尾

| # | 項目 | 位置 | 說明 |
|---|---|---|---|
| 3 | **分享 fallback 只有 Facebook** | `action-maker-result.tsx:64-70` | Native share 失敗後只呼叫 `facebookShare`，缺少複製連結、LINE 等 |
| 4 | **子頁缺少 SEO metadata** | 各子頁 `page.tsx` | 只有 intro page 設了 `metadata` |

## 未 commit 的改動

以上大部分功能在 working tree 有 diff 尚未 commit，包含：
- `use-generate-actions.ts` — mock → 真實 API
- `use-refine-action.ts` — 新增
- `use-create-practice-from-action.ts` — 新增
- `action-maker-actions.tsx` — 加入 refine 流程
- `action-maker-result.tsx` — 加入開始實踐 + 登入後自動建立
- `action-maker-provider.tsx` — 新增 `sessionId`、`usedRefine` state
