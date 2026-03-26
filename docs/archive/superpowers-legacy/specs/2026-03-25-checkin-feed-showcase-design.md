# 主頁 Feed 打卡紀錄展示設計

> 日期：2026-03-25
> 狀態：Draft

## 概述

在主頁「靈感」tab 的 feed 中，除了現有的實踐卡片（PracticeShowcaseCard），新增**打卡摘要卡片（CheckInShowcaseCard）**，讓用戶可以在 feed 中看到其他人的單一打卡紀錄，並追溯回所屬的實踐。

## 子專案分工

依據 monorepo 架構（見 `AGENTS.md`），本功能涉及以下子專案：

| 子專案 | 負責範圍 | 具體工作 |
|--------|---------|---------|
| `daodao-f2e` | 前端 UI | CheckInShowcaseCard 元件、PracticeShowcaseCard badge 調整、useFeed hook、主頁 feed 渲染邏輯、FeedItem type 定義 |
| `daodao-ai-backend` | AI 後端 API | 新增 `GET /api/v1/feed` endpoint |
| `daodao-server` | 主後端 API | Reaction targetType 新增 `"checkin"`（現有：`practice`、`comment`）、Comment targetType 新增 `"checkin"`（現有 9 種）、對應的通知佇列擴展 |
| `daodao-storage` | DB 管理 | 若 checkin 的 reaction/comment 需要新 table 或欄位，在 `migrate/sql/` 新增 migration |

**不涉及的子專案**：`daodao-infra`、`daodao-worker`。

### 實作順序建議

1. **daodao-storage** — 確認 DB schema 是否需要變更（checkin reaction/comment 關聯）
2. **daodao-server** — Reaction/Comment targetType 擴展支援 `"checkin"`、通知佇列
3. **daodao-ai-backend** — 實作 `GET /api/v1/feed` endpoint
4. **daodao-f2e** — 前端元件、hook、主頁整合

## 設計決策摘要

| 項目 | 決策 |
|------|------|
| Feed 模式 | 混合 Feed — 打卡與實踐卡片按時間交錯排列 |
| 卡片密度 | 摘要卡片 — 心情 + 文字前 2 行 + 縮圖 + tags |
| 點擊導航 | 進入打卡詳情頁 `/practices/[id]/check-ins/[checkInId]` |
| 互動 | Reaction（ReactionPickerButton variant="summary"）+ 2 則留言預覽 |
| 排序邏輯 | 後端統一 feed API 決定排序，前端依序渲染 |
| 可見性 | 僅 public 實踐的打卡出現在 feed |
| 色系 | 打卡 = logo-orange 暖橘 / 實踐 = logo-cyan 冷青 |

## 現有架構

### 相關檔案

**daodao-f2e**（前端）：
- **主頁**：`apps/product/src/app/[locale]/(with-layout)/page.tsx` — 靈感 + 我的 tab
- **實踐卡片**：`apps/product/src/components/showcase/PracticeShowcaseCard.tsx`
- **釀造卡片**：`apps/product/src/components/showcase/BrewingCard.tsx`
- **打卡卡片**：`apps/product/src/components/check-in/display/check-in-card.tsx`
- **打卡詳情**：`apps/product/src/app/[locale]/practices/[id]/check-ins/[checkInId]/page.tsx`
- **Showcase hooks**：`packages/api/src/services/showcase-hooks.ts`
- **Reaction 元件**：`apps/product/src/components/check-in/reactions/reaction-picker-button.tsx`
- **Reaction 常數**：`apps/product/src/constants/reaction-type.ts`
- **色彩系統**：`packages/ui/src/styles/globals.css`

**daodao-server**（主後端）：
- Reaction routes/service：`src/routes/reaction.routes.ts`、`src/services/reaction.service.ts`（targetType 新增 `"checkin"`）
- Comment routes/service：`src/routes/comment.routes.ts`、`src/services/comment.service.ts`（targetType 新增 `"checkin"`）
- Reaction types：`src/types/reaction.types.ts`（現有：`practice`、`comment`）
- Comment types：`src/types/comment.types.ts`（現有 9 種 targetType）
- 通知佇列：`src/queues/reaction-notification.queue.ts`

**daodao-ai-backend**（AI 後端）：
- Feed API endpoint（新增）

**daodao-storage**（DB）：
- Schema 與 migration（視需要新增）

### 現有資料流

```
主頁 → useShowcaseFeed() → IShowcasePractice[] → PracticeShowcaseCard
```

## 新增元件：CheckInShowcaseCard

### 資料結構

後端需提供統一的 feed endpoint，回傳 union type：

```typescript
// Feed item union type
type FeedItem =
  | { type: "practice"; data: IShowcasePractice }
  | { type: "checkin"; data: IShowcaseCheckIn };

// 新增的打卡展示資料（定義於 packages/api/src/services/showcase-hooks.ts）
// 命名慣例：沿用 IShowcasePractice 的 snake_case（對齊 AI backend API response）
interface IShowcaseCheckIn {
  id: string;
  checkin_date: string;            // "YYYY-MM-DD"
  mood: ApiMoodType;               // API 回傳值："give_up" | "frustrated" | "bored" | "neutral" | "good" | "happy"
  note: string;                    // 打卡反思文字
  tags: string[];
  image_urls: string[];            // 最多 3 張
  created_at: string;              // ISO timestamp
  practice: {
    id: string;
    title: string;
  };
  user?: {
    id: string;
    name: string;
    photo_url?: string | null;
  };
  reactions?: IReactionCountItem[];   // 來自 showcase-hooks.ts
  comment_count?: number;
  comment_preview?: {                 // 最多 2 則最新留言（由 feed API 內嵌回傳，避免 N+1）
    id: string;
    content: string;
    created_at: string;
    user?: {
      id: string;
      name: string;
      photo_url?: string | null;
    };
  }[];
}

// 前端渲染 mood icon 時需轉換：
// import { mapApiMoodToMoodType } from "@/constants/mood";
// const frontendMood = mapApiMoodToMoodType(item.mood);
```

### 卡片佈局（由上到下）

1. **Header row**
   - 左：「打卡」badge（pencil icon + 橘色文字，bg logo-orange/10）+ 日期（text-dark/50）
   - 右：Mood icon（SVG 表情，bg logo-orange/8，圓形 28x28）

2. **實踐追溯連結**
   - Pin icon + 實踐標題（logo-cyan，underline）+ chevron icon
   - 點擊 → `/practices/[practiceId]`（stopPropagation，不觸發卡片整體導航）

3. **用戶 + 內容**
   - 左：32x32 圓形頭像
   - 右：用戶名（font-semibold）+ 打卡文字（line-clamp-2）

4. **圖片縮圖**（條件渲染：有圖片時才顯示）
   - flex row，64x64 圓角方塊，最多 3 張
   - 背景：logo-orange/6

5. **Tags**（條件渲染：有 tags 時才顯示）
   - 標籤 pills：bg primary-lightest，text logo-cyan
   - 前綴 `#`

6. **Reaction bar**（border-t `#E4EAE9`，無背景色）
   - 左：ReactionPickerButton variant="summary"（與 PracticeShowcaseCard 一致，顯示疊加 emoji + 「X 與其他 N 人」文字）
   - 右：DialogOutlineSvg + 留言數

7. **留言預覽**（border-t `#E4EAE9`，無背景色）
   - 資料來源：`IShowcaseCheckIn.comment_preview`（feed API 內嵌回傳，避免 N+1 查詢）
   - 最多 2 則最新留言
   - 格式：avatar(24x24) + 名字(#295E5C) + 內容(text-dark) + 相對時間(#9FB5B8)

### 點擊行為

- **卡片整體**：導航至 `/practices/[practiceId]/check-ins/[checkinId]`
- **實踐標題連結**：導航至 `/practices/[practiceId]`（stopPropagation）
- **Reaction / 留言區域**：原地互動（stopPropagation）

## 實踐卡片調整：PracticeShowcaseCard

### 新增類型 badge

在現有 header row 加入「實踐」類型 badge，讓混合 feed 中兩種卡片可快速辨識：

- 新增：`flag icon + 實踐` badge（bg light-blue，text logo-cyan）
- 原有的「進行中/已完成」badge 縮小為次級 badge（bg primary-lightest，較小字體）

### 不變的部分

- 標題、用戶資訊、頻率/時長、reaction、留言 — 全部維持現有設計

## 色彩規範

使用專案色彩系統（`packages/ui/src/styles/globals.css`）。分隔線 `#E4EAE9` 沿用現有 PracticeShowcaseCard 的硬編碼值（專案未定義對應 CSS variable）。

| 用途 | 實踐卡片 | 打卡卡片 |
|------|---------|---------|
| 邊框 | `light-blue` | `logo-orange/15` |
| Badge 背景 | `light-blue` | `logo-orange/10` |
| Badge 文字 | `logo-cyan` | `logo-orange` |
| Mood icon 背景 | — | `logo-orange/8` |
| 圖片縮圖背景 | — | `logo-orange/6` |
| 分隔線 | `#E4EAE9` | `#E4EAE9`（共用） |
| 留言背景 | 無（白底） | 無（白底） |
| 追溯連結 | — | `logo-cyan`（共用色） |
| Tags | `primary-lightest` + `logo-cyan` | `primary-lightest` + `logo-cyan`（共用） |
| 文字 | `text-dark` | `text-dark`（共用） |

## API 設計

### 統一 Feed Endpoint

```
GET /api/v1/feed
```

**Backend**：AI backend（與現有 `/api/v1/users/practices` 同一服務）。現有 endpoint 保留不動，新 endpoint 為其超集。前端遷移完成後可視情況廢棄舊 endpoint。

**Query params**（延續現有 showcase feed 的篩選能力）：
- `cursor` — 分頁游標（opaque string，替代現有的 `after_id`）
- `limit` — 每頁數量
- `keyword` — 搜尋關鍵字
- `tags` — 標籤篩選
- `type` — 篩選類型：`all`（預設）| `practice` | `checkin`

**Response**：
```typescript
{
  data: FeedItem[];
  next_cursor?: string;
}
```

### Reaction 擴展

現有 reaction `targetType` 需新增 `"checkin"` 類型：
- `targetType: "practice"` — 實踐
- `targetType: "checkin"` — 打卡（新增）
- `targetType: "comment"` — 留言

後端已確認可以配合此擴展。

### 留言擴展

Comment 的 `targetType` 也需新增 `"checkin"`，讓打卡可以有獨立的留言串。

## 前端 Hook 設計

新增 `useFeed` hook，與 `useShowcaseFeed` 平行共存。主頁靈感 tab 遷移至 `useFeed`，其他使用 `useShowcaseFeed` 的地方（如搜尋頁）暫不遷移。

```typescript
// 新增於 packages/api/src/services/showcase-hooks.ts
function useFeed(params: {
  keyword?: string;
  tags?: string[];
  type?: "all" | "practice" | "checkin";
}) {
  // 使用 useSWRInfinite 實現無限滾動
  // endpoint: GET /api/v1/feed
  // 回傳 FeedItem[]
}
```

## 渲染邏輯

```tsx
// 主頁靈感 tab 的 feed 列表
{feedItems.map((item) => {
  switch (item.type) {
    case "practice":
      return <PracticeShowcaseCard key={`p-${item.data.id}`} {...item.data} />;
    case "checkin":
      return <CheckInShowcaseCard key={`c-${item.data.id}`} {...item.data} />;
  }
})}
```

## Loading / Error / Empty States

沿用現有 PracticeShowcaseCard 的模式：
- **Loading**：skeleton 卡片（與 CheckInShowcaseCard 同尺寸的灰色佔位區塊）
- **Error**：顯示通用錯誤提示，允許重試
- **Empty**（feed 無內容或篩選 `type=checkin` 無結果）：沿用靈感頁現有的空狀態提示

## 無障礙

沿用 PracticeShowcaseCard 的無障礙模式：
- 卡片整體為可點擊區域，內部互動元素用 `stopPropagation` 隔離
- 保持與現有卡片相同的 biome-ignore 例外（`useKeyWithClickEvents` / `noStaticElementInteractions`）

## 共用元件

打卡摘要卡片複用以下現有元件：
- `ReactionPickerButton` — variant="summary"，reaction 互動（與 PracticeShowcaseCard 一致）
- `DialogOutlineSvg` — 留言 icon
- `Avatar` / `AvatarImage` / `AvatarFallback` — 頭像
- `LottieEmoji` — Lottie 動態表情（mood icon 可選用）
- `formatRelativeTime` — 相對時間格式化

## Wireframe 參考

視覺 wireframe 存放於：
`.superpowers/brainstorm/70168-1774402996/feed-card-comparison-v6.html`

可用 `npx serve .superpowers/brainstorm/70168-1774402996/` 在本地檢視。

## 不在此次範圍

- 同一實踐的連續打卡摺疊（「還有 N 則打卡」）— 作為 v2 功能
- 打卡時「分享到靈感」的開關 — 作為 v2 功能
- 釀造中實踐的打卡模糊展示 — 不做
- Feed 推薦演算法 — 初期用時間排序，後端可後續調整
