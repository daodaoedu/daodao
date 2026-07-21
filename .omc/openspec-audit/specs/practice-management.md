# practice-management
- 涉及 repo: admin-ui (server stats API)
- 對應 archived change: 無
- 總計: 8 條 requirement / 17 個 scenario | ✅5 ⚠️3 ❌0 ❓0

主檔: daodao-admin-ui:src/pages/PracticesPage.tsx

## Requirement: 可搜尋的實踐列表 → ⚠️
證據: PracticesPage.tsx:557 `search = searchParams.get('q')`、:633 API `query: search`、:789 Search input。為 **server-side query**（非 spec 描述的 client 即時 title 篩選），但功能等效。
- Scenario: 搜尋實踐 → ⚠️ — 以 API query 搜尋，非純前端即時
- Scenario: 搜尋無結果 → ⚠️ — 空狀態文字為「沒有符合條件的實踐」(:1013)，非 spec 的「查無符合的主題實踐」（文案差異）
- Scenario: 清除搜尋 → ✅ — :576 `q: ''` 清除回復列表

## Requirement: 依狀態篩選 → ✅
證據: PracticesPage.tsx:558 `statusFilter`、:799/:802 Select（全部狀態 / active / draft 等），:634 傳入 API `status`。
- Scenario: 篩選啟用中 → ✅ — status=active
- Scenario: 顯示全部狀態 → ✅ — value 'all'

## Requirement: 排序功能 → ✅
證據: PracticesPage.tsx:37 `SortField = 'createdAt'|'updatedAt'|'likeCount'`、:562-563 sort/order param、SortableHeader(:123) 切換方向；預設 createdAt desc(:562)。
- Scenario: 依按讚數排序 → ✅ — likeCount sort
- Scenario: 切換排序方向 → ✅ — order asc/desc 切換
（註：spec 提到「參與人數」排序，欄位實作為 createdAt/updatedAt/likeCount，無 participants 排序 — 部分欄位差異）

## Requirement: 實踐列表欄位顯示 → ✅
證據: PracticesPage.tsx:71-76 欄位（狀態/打卡次數/迴響數）、statusConfig(:41) 含 className/color，草稿(:58)。
- Scenario: 顯示實踐列表項目 → ✅ — 標題/狀態/建立者/日期/參與(打卡次數)/讚(迴響數)
- Scenario: 狀態標籤顏色 → ✅ — statusConfig 提供顏色 class（草稿等）

## Requirement: 摘要統計資訊 → ✅
證據: PracticesPage.tsx:613 `usePracticeStats()`、:734-764 多個 StatCard（總實踐數/活躍中/...），server API daodao-admin-ui:src/api/admin-users.ts:127 `getPracticeStats` → `/api/v1/admin/practices/stats`。
- Scenario: 顯示全域統計 → ✅ — StatCard 總數/活躍
- Scenario: 篩選後統計更新 → ⚠️ — stats 由獨立 usePracticeStats 取得，是否隨 status 篩選即時連動未明確驗證（StatCard 來源與列表 filter 解耦）

## Requirement: 分頁功能 → ✅
證據: PracticesPage.tsx:564 currentPage、:667-669 pagination、:1027/:1040 上一頁/下一頁（disabled hasPrev/hasNext）、:1035 `第 {currentPage} / {totalPages} 頁`；預設 limit 20(:565)。
- Scenario: 瀏覽第二頁 → ✅ — setPage(currentPage+1)
- Scenario: 首頁時上一頁 disabled → ✅ — `disabled={!pagination?.hasPrev}`

## Requirement: 匯出功能 → ✅
證據: PracticesPage.tsx:25 import ExportButton、:729 `<ExportButton data={exportData} columns={exportColumns} fileName="practices" />`。
- Scenario: 匯出篩選後的實踐資料 → ✅ — ExportButton 以當前 exportData

## Requirement: 變更實踐狀態 → ⚠️
證據: PracticesPage.tsx:1061 `onStatusChange={(status) => changeStatus(...)}`、PracticeDetail Sheet 內 Select(:533) 直接變更；批次變更(:862)。**但缺確認對話框**：grep 無 AlertDialog/confirm/「確定要停用此主題實踐嗎？」。
- Scenario: 停用實踐（顯示確認對話框）→ ❌(部分) — 無確認對話框，直接 Select 變更
- Scenario: 確認停用（API 更新 + 列表即時更新）→ ✅ — changeStatus mutation 呼叫 updatePracticeStatus
- Scenario: 取消狀態變更 → ❌(部分) — 無確認對話框故無「取消」流程
