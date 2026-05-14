## Why

主題實踐詳細頁面的三個 tab（留言、打卡紀錄、使用資源）目前只顯示文字標籤，使用者無法在切換前得知各 tab 內是否有內容、有多少內容。加上數字 badge 可以降低無效點擊，提升瀏覽效率。

## What Changes

- 在 web 版 `PracticeDetailShell` 的 tab 標籤旁加上數字 badge，格式如「留言(2)」
- 在 mobile 版 `PracticeTabBar` 的 tab 標籤旁加上相同數字 badge
- 數字來源：
  - 留言：使用現有的 `commentCount` prop（或 fallback `comments.length`）
  - 打卡紀錄：使用 `checkInsData.length`
  - 使用資源：使用 `practice.resources.length`

## Capabilities

### New Capabilities

- `practice-tab-count-badge`: 主題實踐詳細頁面 tab 標籤顯示項目數量 badge

### Modified Capabilities

（無既有 spec 需修改）

## Impact

- **影響子專案**: daodao-f2e（product app + mobile app）
- **影響檔案**:
  - `apps/product/src/components/practice/detail/practice-detail-shell.tsx` — web tab 渲染
  - `apps/mobile/components/practice/detail/PracticeTabBar.tsx` — mobile tab 渲染
- **不影響 API**: 所有計數資料已在前端可取得，不需新增後端端點
- **Non-goals**:
  - 不做即時推播更新（數字隨既有 SWR 策略刷新即可）
  - 不做 99+ 等大數字截斷（實踐頁面的數量級不會到這個規模）
  - 不修改 tab 的互動行為或樣式結構
