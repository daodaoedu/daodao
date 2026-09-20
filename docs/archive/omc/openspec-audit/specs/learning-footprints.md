# learning-footprints
- 涉及 repo: server + f2e
- 對應 archived change: 個人互動足跡相關 change
- 總計: 2 條 requirement / 6 個 scenario | ✅2 ⚠️4 ❌0 ❓0

端點: daodao-server:src/routes/me.routes.ts + controller me.controller.ts:121-133 (`GET /api/v1/me/footprints`)、service me.service.ts:402-475。
前端: daodao-f2e:apps/product/src/components/me/footprints-list.tsx + hook packages/api/src/services/footprint-hooks.ts。

## Requirement: 顯示個人互動足跡列表 → ⚠️
證據: daodao-server:src/services/me.service.ts:411-432 查 user 在 practice 上的留言，orderBy created_at desc；回傳 content/createdAt/practiceTitle/practiceId/practiceDeleted。前端 footprints-list.tsx:32-55 渲染清單。
差異1（回覆）：service:413-415 **只查 `target_type: 'practice'` 的 comments**，未涵蓋「回覆其他留言」(`target_type:'comment'` / parent reply)，spec 要求留言與回覆都顯示。
差異2（頭像）：spec 要求每筆含「對應互動對象的頭像」，但 MyLearningFootprintItem 回傳欄位（me.service.ts:449-455）**無 avatar**，前端也未顯示頭像。
- Scenario: 顯示留言足跡 → ⚠️ — 留言有顯示且時間倒序，但缺互動對象頭像欄位
- Scenario: 顯示回覆足跡 → ⚠️ — 僅查 practice 留言，回覆(comment 為 target)未被納入查詢
- Scenario: 足跡列表分頁 → ✅ — me.service.ts:407-409,471 skip/take + calculatePagination；hook footprint-hooks.ts:24-37 帶 page/limit 並回傳 currentPage/totalPages/hasNextPage
- Scenario: 空狀態顯示 → ✅ — footprints-list.tsx:28 footprints.length===0 顯示 `footprints_empty` 提示

## Requirement: 足跡跳轉至互動現場 → ⚠️
證據: daodao-f2e:apps/product/src/components/me/footprints-list.tsx:41-46 未刪除時以 CustomLink 連到 `/practices/${item.practiceId}`。
差異：連結僅指向實踐頁，**未定位（anchor/scroll）至對應留言位置**，spec 要求「定位至對應留言的位置」。
- Scenario: 點擊足跡跳轉至實踐 → ⚠️ — 導向實踐頁 ✅，但無留言位置定位（無 #comment-id anchor）
- Scenario: 實踐已刪除的足跡處理 → ✅ — me.service.ts:454 practiceDeleted 由 deleted_at 判定；footprints-list.tsx:36-39 顯示 `footprints_deleted`（內容已刪除）且不渲染連結（不可點擊跳轉）
