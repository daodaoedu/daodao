# Mobile 首頁對齊 Product 首頁

**日期**: 2026-03-22
**狀態**: approved

## 目標

將 mobile app (`apps/mobile`) 首頁完全對齊 product app (`apps/product`) 首頁的功能和結構，不自創任何新內容。

## 現狀

### Product 首頁 (`apps/product/src/app/[locale]/(with-layout)/page.tsx`)
- 雙 tab：「靈感」+「我的」
- 靈感 tab：搜尋欄 + 建議下拉 + showcase feed（`PracticeShowcaseCard` / `BrewingCard`）+ 無限滾動
- 我的 tab：`DashboardHeader`（日期+統計）+ 狀態篩選 pills + `InProgressSection` + `CompletedSection` + `RandomPracticesSection`（空狀態）
- `AddTaskFAB` 浮動按鈕

### Mobile 首頁 (`apps/mobile/app/(tabs)/index.tsx`)
- 無 tab，只顯示自己的實踐
- 裝飾性 `HomeBanner` + 章魚 Lottie 動畫
- 右上角設定按鈕
- 水平滾動進行中卡片 + 垂直已完成列表
- 使用 mock data fallback

## 設計

### 整體結構

```
SafeAreaView
  ├── Tab Switcher（靈感 | 我的）
  │
  ├── 靈感 Tab
  │   ├── ShowcaseSearchBar（搜尋欄 + 建議下拉）
  │   ├── ShowcaseCard / BrewingCard 垂直列表
  │   ├── FlatList onEndReached 無限滾動
  │   └── Loading / Empty states
  │
  └── 我的 Tab
      ├── DashboardHeader（日期 + 統計卡片：連續登入、獲得迴響）
      ├── 狀態篩選 pills（全部/草稿/未開始/進行中/已完成）
      ├── InProgressSection（水平滾動 294px 寬主題卡片）
      ├── CompletedSection（垂直已完成卡片列表）
      └── RandomPracticesSection（無實踐時的推薦）

  └── AddTaskFAB（+ 按鈕，兩個 tab 都顯示，與 product 一致）
```

注意：不保留原本的 `HomeBanner`、`BackgroundAnimation`、設定按鈕。Product 的 `Banner` 和 `BackgroundAnimation` 是 web 裝飾元素，mobile 不需要。

### 需新建的元件

所有新元件放在 `apps/mobile/components/home/` 下：

| 元件檔案 | 對應 Product 元件 | 說明 |
|----------|-------------------|------|
| `tab-switcher.tsx` | page.tsx 內 tab buttons | 靈感/我的 底線切換 |
| `showcase-search-bar.tsx` | `ShowcaseSearchBar` | 搜尋欄 + 建議下拉（近期熱門 + 你的興趣） |
| `showcase-card.tsx` | `PracticeShowcaseCard` | 靈感卡片：status badge、日期、more menu（檢舉/關注/瀏覽活動）、標題、頭像+行動描述+頻率、reactions、留言數、留言預覽 |
| `brewing-card.tsx` | `BrewingCard` | 醞釀中卡片：與 showcase-card 相同，多一個「🍵 內容醞釀中，完成後解鎖！」提示 |
| `dashboard-header.tsx` | `DashboardHeader` + `StatCard` | 日期顯示（年/月/日）+ 統計卡片（連續登入天數、獲得迴響次數） |
| `filter-pills.tsx` | page.tsx 內 filter buttons | 水平滾動狀態篩選 pills：全部/草稿/未開始/進行中/已完成 |
| `in-progress-card.tsx` | `InProgressTaskCard` | 主題 SVG 背景 + badge + 標題 + 描述 + 打卡次數 + 打卡按鈕 + 進度條 |
| `completed-card.tsx` | `CompletedTaskCard` | 白底卡片：badge + tags + 標題 + 描述 + 進度條 |
| `random-practices.tsx` | `RandomPracticesSection` | 空狀態推薦：標語 + Stack 卡片 + 「更多主題」按鈕 |
| `showcase-filter-bar.tsx` | `ShowcaseFilterBar` | 進階篩選 UI：tags、時長、狀態（展開/收合） |
| `add-task-fab.tsx` | `AddTaskFAB` | 固定右下角 + 按鈕 |
| `index.ts` | — | barrel export |

### API 整合策略

**關鍵問題：** `@daodao/api` 的 shared client 使用 cookie-based auth（`credentials: "include"`），而 mobile app 使用 Bearer token auth（透過 `apps/mobile/services/api-client.ts`）。Showcase hooks 另外使用 `fetchAiBackend()` 直接呼叫 AI backend（`NEXT_PUBLIC_AI_API_URL`），也是 cookie auth。

**解決方案：** 在 mobile app 建立對應的 hooks，使用 mobile 的 `api-client.ts`（Bearer token auth）呼叫相同的 API endpoints。

#### 需新建的 Mobile Hooks（`apps/mobile/hooks/`）

| Hook | 對應 API endpoint | 說明 |
|------|-------------------|------|
| `useShowcaseFeed.ts` | `GET {AI_API_URL}/api/v1/users/practices` | 靈感 feed，用 `useSWRInfinite` + mobile apiClient，需加 `EXPO_PUBLIC_AI_API_URL` 環境變數 |
| `useShowcaseSuggestions.ts` | `GET {AI_API_URL}/api/v1/users/practices/suggestions` | 搜尋建議 |
| `useMyPracticeStats.ts` | `GET /api/v1/me/practices/stats` | 統計數據（連續登入、打卡總數） |

#### 可直接使用的 `@daodao/api` Hooks

以下 hooks 已在 mobile 正常運作（不需 auth 或已透過其他方式處理）：

- `useRandomPracticeTemplates({ count })` — 推薦模板（公開 API，不需 auth）
- `useReactions({ targetType, targetId })` — reaction 資料
- `useReactionsList({ targetType, targetId })` — reaction 詳細列表
- `useComments({ targetType, targetId })` — 留言資料
- `usePracticeById(id)` — 單一實踐詳情

#### 現有 Hook 擴充

- `apps/mobile/hooks/usePractices.ts` — 已有 `usePractices()`，需擴充以支援 status 篩選和 data mapping（轉換為 `InProgressTask` / `CompletedTask` 格式），對齊 product 的 `useMyPractices` 使用方式

### 需複製/適配的 Constants

從 product app 複製到 mobile app：

- `constants/practice-status.ts` — PracticeStatus 定義（已存在則確認一致）
- `constants/task-status.ts` — TaskStatus, FilterStatus, mapPracticeStatusToTaskStatus（移除 `BadgeProps` 依賴，改用 mobile 自訂的 variant 字串）
- `constants/filter-status.ts` — FilterStatus 定義和 filterOptions 列表

### 移除的東西

- `HomeBanner` 元件引用（從首頁移除，元件檔案保留以免影響其他頁面）
- 右上角設定按鈕（設定入口移到 profile tab）
- `MOCK_PRACTICES` / `MOCK_COMPLETED` mock data
- 舊的水平滾動進行中卡片佈局

### Mobile 特有適配

| Product 機制 | Mobile 替代 |
|-------------|------------|
| `IntersectionObserver` 無限滾動 | `FlatList` `onEndReached` |
| `<Link>` / `<CustomLink>` 導航 | `router.push()` (expo-router) |
| Tailwind CSS 樣式 | Tamagui styled components |
| `window.open()` 外部連結 | `Linking.openURL()` (react-native) |
| `useSearchParams` URL 參數同步 | `useState` 本地狀態（mobile 無需 URL 同步）|
| `useSheetManager` bottom sheet | Tamagui Sheet 或自建 bottom sheet |
| `toast.success/error` | `Alert.alert` 或 toast library |

### 卡片互動功能（靈感 tab）

每張靈感卡片包含：
1. **More menu**（三點按鈕）：檢舉、關注/取消關注、瀏覽活動
2. **Reaction picker**：emoji 反應（summary 模式顯示）
3. **留言計數**：點擊導航到實踐詳情
4. **留言預覽**：最近 2 則留言
5. **點擊卡片**：導航到 `/practices/{id}`

### 篩選功能（靈感 tab）

搜尋欄支持：
- 關鍵字搜尋（Enter 觸發）
- 清除按鈕
- Focus 時顯示建議下拉（近期熱門 + 你的興趣）
- 點擊建議項直接搜尋

Feed params 傳遞：
- `keyword` — 搜尋關鍵字
- `tags` — 標籤篩選
- `duration_min` / `duration_max` — 時長篩選
- `status` — 狀態篩選
- `sort_by: "newest_updated"` — 排序

### Loading / Empty / Error States

對齊 product 行為：

**靈感 tab：**
- **Loading**：顯示 3 個 skeleton placeholder 卡片（animate-pulse 效果）
- **Empty**：搜尋無結果時顯示「沒有找到相關實踐」提示
- **Load more**：底部顯示「載入中...」文字
- **Pull-to-refresh**：`RefreshControl` 重新載入 feed

**我的 tab：**
- **Loading**：顯示「載入中...」
- **Pull-to-refresh**：`RefreshControl` 重新載入實踐列表

### 「我的」Tab 邏輯

完全複製 product 的 data mapping 邏輯：

1. `useMyPractices({ limit: 16 })` 取得實踐列表
2. 依 `PracticeStatus` 分類為 `inProgressTasks` 和 `completedTasks`
3. `useMyPracticeStats()` 取得統計（連續登入、獲得迴響）
4. 篩選 pills 控制顯示哪些狀態的卡片
5. 無實踐時顯示 `RandomPracticesSection`
