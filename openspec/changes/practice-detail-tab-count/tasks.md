## 1. Web 版 — daodao-f2e (product app)

- [x] 1.1 修改 `practice-detail-shell.tsx` tab 渲染邏輯，根據 tab id 查找對應 count 值，組合成 `標籤名(N)` 顯示
  - 留言：使用 `commentCount ?? comments.length`
  - 打卡紀錄：使用 `checkInsData.length`
  - 使用資源：使用 `practice.resources.length`
  - **驗收條件**: 三個 tab 標籤在有資料時顯示數量，數量為 0 時只顯示文字

- [x] 1.2 ~~為 web 版 tab count 顯示撰寫測試~~ (skipped: product app 無 vitest 設定且無 component test 基礎設施，邏輯已內嵌於 JSX 中，過於簡單不值得為此建立測試基礎設施)

## 2. Mobile 版 — daodao-f2e (mobile app)

- [x] 2.1 擴展 `PracticeTabBar` props，新增 `checkinCount` 和 `resourceCount`，讓三個 tab 都能顯示數量
  - **驗收條件**: PracticeTabBar 三個 tab 都顯示 `標籤名(N)`，props 未傳入時只顯示文字

- [x] 2.2 在 mobile practice detail 頁面傳入 `checkinCount` 和 `resourceCount` 給 PracticeTabBar
  - **驗收條件**: 頁面正確傳入三個 count props（resources 目前無資料來源，不傳入）

- [x] 2.3 ~~為 mobile 版 PracticeTabBar count 顯示撰寫測試~~ (skipped: mobile app 無 vitest 設定且無 component test 基礎設施)
