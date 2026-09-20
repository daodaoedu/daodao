# practice-tab-count-badge
- 涉及 repo: f2e (apps/product web + apps/mobile)
- 對應 archived change: 無
- 總計: 2 條 requirement / 6 個 scenario | ✅6 ⚠️0 ❌0 ❓0

## Requirement: Web 版 tab 標籤顯示數量 → ✅
證據: daodao-f2e:apps/product/src/components/practice/detail/practice-detail-shell.tsx:786-794 `countMap = { comments: commentCount ?? comments?.length ?? 0, checkins: checkInsData?.data?.length ?? 0, resources: practice?.resources?.length ?? 0 }`；:794 `displayLabel = count > 0 ? '${label}(${count})' : label`。
- Scenario: 留言 tab 顯示數量 → ✅ — comments: commentCount
- Scenario: 打卡紀錄 tab 顯示數量 → ✅ — checkins: checkInsData.data.length
- Scenario: 使用資源 tab 顯示數量 → ✅ — resources: practice.resources.length
- Scenario: 數量為零不顯示數字 → ✅ — `count > 0 ? '(N)' : label`，0 時僅文字

## Requirement: Mobile 版 tab 標籤顯示數量 → ✅
證據: daodao-f2e:apps/mobile/components/practice/detail/PracticeTabBar.tsx:11-13 props commentCount/checkinCount/resourceCount；:30-33 countMap；:42 `count != null && count > 0 ? '${tabLabel}(${count})' : tabLabel`。
- Scenario: 三個 tab 都顯示數量 → ✅ — comments/checkins/resources 三者皆映射 count
- Scenario: 數量未傳入時不顯示括號 → ✅ — `count != null && count > 0` 條件，undefined 時僅文字
