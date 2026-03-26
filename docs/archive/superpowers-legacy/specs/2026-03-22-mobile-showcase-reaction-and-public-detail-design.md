# Mobile 靈感卡片 Reaction + 公開實踐詳細頁

Date: 2026-03-22

## Goal

讓 mobile 靈感 tab 的 ShowcaseCard 和實踐詳細頁完全對齊 product web 版本。

## Scope

1. **靈感卡片加入 Reaction 功能** — 摘要顯示、長按 picker、留言預覽
2. **公開實踐詳細頁** — 從靈感 tab 點進別人的實踐，顯示完整公開視圖

## Architecture Decision

**複用 `@daodao/api` types + Mobile 自建 hooks（使用 `apiClient`）+ 新建 RN 原生 UI 元件**

`@daodao/api` 的 hooks 底層用 `openapi-fetch` client，硬編碼了：
- `NEXT_PUBLIC_API_URL`（Next.js 環境變數）
- `credentials: "include"`（cookie-based auth）

Mobile 使用 `EXPO_PUBLIC_API_URL` + Bearer token auth，兩者不相容。

因此：
- **Types** — 從 `@daodao/api` import TypeScript types（`ReactionTypeValue`, `CommentTargetType` 等）
- **Hooks** — 在 `apps/mobile/hooks/` 新建 mobile-specific hooks，使用 `apps/mobile/services/api-client.ts` 的 `api.get/post/delete` 呼叫相同 API endpoints
- **UI 元件** — RN 原生重寫

### Current User ID

使用 `useAuth()` from `apps/mobile/providers/AuthProvider.tsx` 取得登入用戶 `id`。

### Bottom Sheet

使用 Tamagui `Sheet`（已被 `CheckInSheet`, `ShareCheckInSheet` 使用）。

---

## Part 1: 靈感卡片 Reaction

### Bottom Bar 改造

現有 bottom bar 只有右側留言 icon。改為：

- **左側**：Reaction 摘要 — emoji 泡泡（最多 2 個疊加圓圈）+ "X 與其他 N 人" 文字
- **右側**：留言 icon + 數量（保持現有）

### 卡片層級的 Reaction 資料

`IShowcasePractice` 的 `reactions?: IReactionCountItem[]` 欄位已在 feed response 中返回 inline reaction 資料。

- **卡片摘要顯示**：直接用 `practice.reactions` 的 inline 資料，不額外呼叫 API（避免 N+1）
- **Mutation**（長按 picker 觸發）：呼叫 `POST /api/v1/reactions` 或 `DELETE /api/v1/reactions`，成功後 mutate feed

### Reaction Picker

- 長按左側 reaction 區域觸發
- 浮動 picker 顯示 4 個 emoji：useful (👍🏻), fire (🔥), touched (💓), curious (🧐)
- 選擇後關閉 picker，呼叫 reaction mutation API
- RN 用 `Animated` 做 fade-in 動畫
- Optimistic update：toggle 後立即更新本地 `reactions` 陣列，API 失敗時 rollback

### Emoji 渲染

- 先用靜態 emoji 文字（Product 的 fallback），不引入 `lottie-react-native`
- 日後可升級為 Lottie 動畫

### 留言預覽

- 卡片底部顯示最近 2 則留言
- 用 mobile hook 呼叫 `GET /api/v1/comments?targetType=practice&targetId={id}`
- 顯示：avatar + 名字 + 內容（1 行 clamp）+ 相對時間

### 新建檔案

| 檔案 | 用途 |
|------|------|
| `apps/mobile/components/reactions/ReactionPickerButton.tsx` | 摘要顯示 + 長按 picker，支援 `variant: "summary" \| "card"` |
| `apps/mobile/constants/reaction-type.ts` | Reaction config（emoji + label，不含 lottieUrl） |
| `apps/mobile/hooks/useReactions.ts` | Reaction query + mutation hooks（用 `apiClient`） |
| `apps/mobile/hooks/useCommentsForCard.ts` | 卡片用留言 hook（輕量，只取最近幾則） |

### 修改檔案

| 檔案 | 變更 |
|------|------|
| `apps/mobile/components/home/showcase-card.tsx` | Bottom bar 加入 ReactionPickerButton + 留言預覽 |

> `brewing-card.tsx` 不需要修改 — 它 wrap ShowcaseCard 的 `extraContent`，bottom bar 改動自動繼承。

### API Endpoints（mobile hooks 呼叫）

- `GET /api/v1/reactions?targetType=practice&targetId={id}` — reaction 計數 + currentUserReaction
- `POST /api/v1/reactions` body: `{ targetType, targetId, reactionType }` — upsert reaction
- `DELETE /api/v1/reactions` body: `{ targetType, targetId }` — remove reaction
- `GET /api/v1/reactions/list?targetType=practice&targetId={id}` — reactor 列表（用於 firstReactorName）
- `GET /api/v1/comments?targetType=practice&targetId={id}` — 留言列表

---

## Part 2: 公開實踐詳細頁

### 路由策略

在現有 `/practices/[id]/index.tsx` 中判斷：
- 用 `useAuth()` 取得 `currentUserId`
- Fetch practice data 後比對 `practice.user.id !== currentUserId` → 公開視圖
- 否則 → 現有 owner 視圖（打卡、封存、刪除）

### API 確認

Mobile 的 `usePractice(id)` 呼叫 `GET /api/v1/practices/{id}`。需確認此 endpoint 對 non-owner 也返回 `privacy_status: "public"` 的實踐資料。若不支援，改呼叫 showcase feed 的 endpoint 或新增一個。

### 公開視圖結構

對齊 Product 的 `PracticeDetailShell`：

**Header：**
- 返回按鈕 + "主題實踐" 標題 + 更多選單按鈕（`MoreHorizontal` icon）
- 更多選單（Tamagui Sheet 或 Popover）：
  - 檢舉（開啟外部連結 `https://tally.so/r/BzGQy4`）
  - 關注/取消關注（呼叫 follow API）
  - 瀏覽活動（開啟 BrowseActivitySheet）

**Practice Overview Card：**
- Status badge + 日期範圍
- 標題
- User avatar（可點擊導向 `/users/{userId}`）+ 實踐行動描述
- 頻率（天/週）+ 時長（分鐘/次）
- Tags

**Reaction 區域：**
- `ReactionPickerButton` 以 `variant="card"` 佔滿寬度
- 顯示聚合 reaction emoji + 總計數
- 長按彈出 picker

**Tabs（簡單 tab bar，不使用 swipe）：**
- **留言** — 留言列表 + 底部固定輸入框
  - 支援新增留言（POST）
  - 長按留言可編輯（PUT）/ 刪除（DELETE）（僅自己的留言）
  - 每則留言顯示：avatar + 名字 + 內容 + 相對時間
  - Keyboard handling：`KeyboardAvoidingView` 包裹整個頁面
- **打卡紀錄** — 複用現有 `CheckInList` 元件
- **資源** — resources 列表

**瀏覽活動 Bottom Sheet（Tamagui Sheet）：**
- 瀏覽次數、留言數
- Reaction 列表（avatar + 名字 + emoji + 相對時間）

### Loading / Error / Empty States

- Loading：`Spinner` centered（已有 pattern）
- Error / 404：顯示 "找不到此實踐" + 返回按鈕（已有 pattern）
- 留言為空：顯示 "還沒有留言" placeholder
- 打卡紀錄為空：顯示 "尚無打卡紀錄" placeholder

### 新建檔案

| 檔案 | 用途 |
|------|------|
| `apps/mobile/components/practice/detail/PublicPracticeView.tsx` | 公開視圖主體 |
| `apps/mobile/components/practice/detail/CommentSection.tsx` | 留言列表 + CRUD + 輸入框 |
| `apps/mobile/components/practice/detail/BrowseActivitySheet.tsx` | 瀏覽活動 Tamagui Sheet |
| `apps/mobile/components/practice/detail/PracticeTabBar.tsx` | 三 tab 切換（簡單 button group） |
| `apps/mobile/hooks/useComments.ts` | 留言 CRUD hooks（用 `apiClient`） |
| `apps/mobile/hooks/useFollow.ts` | Follow/unfollow hooks（用 `apiClient`） |

### 修改檔案

| 檔案 | 變更 |
|------|------|
| `apps/mobile/app/practices/[id]/index.tsx` | 加入 owner/public 判斷，public 時渲染 `PublicPracticeView` |

### API Endpoints（mobile hooks 呼叫）

- `GET /api/v1/practices/{id}` — 實踐詳細（需確認支援公開實踐）
- `GET /api/v1/reactions` / `POST` / `DELETE` — reaction CRUD（同 Part 1）
- `GET /api/v1/reactions/list` — reactor 列表
- `GET /api/v1/comments` — 留言列表
- `POST /api/v1/comments` — 新增留言
- `PUT /api/v1/comments/{commentId}` — 編輯留言
- `DELETE /api/v1/comments/{commentId}` — 刪除留言
- `POST /api/v1/follows` body: `{ targetType: "practice", targetId }` — 關注
- `DELETE /api/v1/follows/practice/{id}` — 取消關注
- `GET /api/v1/follows/check/practice/{id}` — 檢查關注狀態

---

## Out of Scope

- Lottie 動畫 emoji（先用靜態 emoji）
- 留言中的 reaction（只做 practice 層級）
- 分享功能
- 公開詳細頁的 check-in 按鈕（僅 owner 視圖有）
- Tab swipe gesture（先用 button tap 切換）
