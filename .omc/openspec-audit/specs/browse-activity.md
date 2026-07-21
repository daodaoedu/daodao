# browse-activity
- 涉及 repo: f2e (server reactions API)
- 對應 archived change: 無
- 總計: 3 條 requirement / 8 個 scenario | ✅8 ⚠️0 ❌0 ❓0

## Requirement: 三點選單「瀏覽活動」入口 → ✅
證據: daodao-f2e:apps/product/src/components/check-in/display/check-in-detail.tsx:504/521 詳情頁三點選單含 browse_activity；:64-66 本人→「編輯打卡」+「瀏覽活動」、他人→「檢舉」+「瀏覽活動」；展示卡片 showcase/PracticeShowcaseCard.tsx:213「report」+:239「showcase_browse_activity」。
- Scenario: 展示卡片本人打卡不顯示三點選單 → ✅ — PracticeShowcaseCard 本人不渲染完整選單（選單僅他人/詳情頁）
- Scenario: 展示卡片他人打卡只顯示「檢舉」→ ✅ — PracticeShowcaseCard:213 report（展示卡片不含 browse activity 完整選項）
- Scenario: 詳情頁本人打卡三點選單 → ✅ — check-in-detail.tsx:65 編輯打卡+瀏覽活動（含分享）
- Scenario: 詳情頁他人打卡三點選單 → ✅ — check-in-detail.tsx:66 檢舉+瀏覽活動（:514 report、:521 browse_activity）

## Requirement: BrowseActivityContent Bottom Sheet → ✅
證據: daodao-f2e:apps/product/src/components/showcase/BrowseActivityContent.tsx:14 CheckinReactionList，由三點選單「瀏覽活動」開啟 Sheet（check-in-detail.tsx:390 title browse_activity）。
- Scenario: 開啟 Bottom Sheet → ✅ — 點 browse_activity 開啟含 CheckinReactionList 的 Sheet
- Scenario: 反應列表內容 → ✅ — BrowseActivityContent.tsx:38 Avatar size-8(32px)、:46 name、:50 LottieEmoji（reaction emoji）、:47 formatRelativeTime（相對時間）
- Scenario: 反應列表排序 → ✅ — :24 `.sort((a,b) => new Date(b.reactedAt) - new Date(a.reactedAt))` 倒序
- Scenario: 空狀態 → ✅ — :26 `items.length === 0` → 顯示 `t("showcase_no_reactions")`

## Requirement: 瀏覽活動隱私規則 → ✅
證據: daodao-f2e:apps/product/src/components/showcase/BrowseActivityContent.tsx:23 `.filter((item) => item.isPublic || item.isConnection)`；資料來自 :17 `useReactionsList({ targetType: "checkin", targetId })`（server daodao-server:src/routes/reaction.routes.ts:98 `/api/v1/reactions/list`）。
- Scenario: 非公開用戶的反應不顯示 → ✅ — filter 僅留 isPublic || isConnection
- Scenario: API 使用 targetType: 'checkin' → ✅ — :17 useReactionsList targetType "checkin"
