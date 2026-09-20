# member-directory
- 涉及 repo: server / storage / f2e（前台名錄頁缺）
- 對應 archived change: 無
- 總計: 11 條 requirement / 22 個 scenario | ✅4 ⚠️3 ❌4 ❓0

## Requirement: 建立自訂個人檔案欄位 → ✅
證據: daodao-server:src/services/admin-community.service.ts:313 `createField` 支援 `'text' | 'dropdown' | 'multi_select' | 'url'`；controller POST /admin/community/member/fields（admin-community.controller.ts:96）；表 member_profile_fields 由 daodao-storage:migrate/sql/046_create_gamification_community_events_tables.sql 建立。
- Scenario: 新增文字類型 → ✅ — fieldType 'text'，name 可設（service:313）
- Scenario: 新增下拉選單 → ⚠️ — fieldType 'dropdown' 存在，但選項列表「新增/編輯/排序」的 options 結構未在 createField 簽名見到（僅 name/fieldType/isRequired/visibility）
- Scenario: 新增多選 → ⚠️ — fieldType 'multi_select' 存在，同上 options 管理未驗證
- Scenario: 新增網址 → ⚠️ — fieldType 'url' 存在；前台「可點擊連結呈現」無前台名錄頁可驗證

## Requirement: 設定欄位為必填或選填 → ⚠️
證據: admin-community.service.ts:313 `isRequired?: boolean`。
- Scenario: 設為必填 → ⚠️ — 後端有 is_required 欄位，但「Onboarding 時 MUST 填寫」的前台強制邏輯無實作可驗
- Scenario: 設為選填 → ⚠️ — 同上，前台跳過邏輯未驗

## Requirement: 設定欄位可見性 → ✅
證據: admin-community.service.ts:313/350 `visibility?: 'public' | 'members' | 'admin'`。
- Scenario: 設為公開 → ⚠️ — 後端有 visibility='public'，前台名錄對訪客顯示無前台頁驗證
- Scenario: 僅會員可見 → ⚠️ — visibility='members' 存在，前台過濾未驗
- Scenario: 僅管理員可見 → ⚠️ — visibility='admin' 存在，前台過濾未驗

## Requirement: 欄位排序 → ✅
證據: daodao-server:src/controllers/admin-community.controller.ts:127 PUT /admin/community/member/fields/reorder；service `reorderFields(fieldIds)`。
- Scenario: 拖曳排序 → ✅ — reorder endpoint 更新 sort_order（後端齊備；拖曳 UI 為 admin-ui，未驗）

## Requirement: 欄位使用統計 → ✅
證據: admin-community.service.ts:302/388 `fillRate`（依 total_users JOIN member_profile_values 計算）；GET /admin/community/member/stats（controller:137）。
- Scenario: 查看欄位使用統計 → ✅ — 回傳 name/fieldType/isRequired/visibility + fillRate 百分比

## Requirement: 前台名錄搜尋與篩選 → ❌
證據: 無。daodao-f2e:apps/product 無會員名錄頁（grep directory/名錄/member-list 僅命中 .gitkeep）；後端無 GET 名錄列表 + 搜尋/標籤/自訂欄位篩選 endpoint。
- Scenario: 依姓名搜尋 → ❌ — 無前台名錄頁與搜尋 API
- Scenario: 依標籤篩選 → ❌ — 無
- Scenario: 依自訂欄位篩選 → ❌ — 無

## Requirement: 會員連結請求 → ✅
證據: daodao-server:src/services/connection.service.ts:86 `sendConnectionRequest`（含 connect.request 通知 enqueue:180）；daodao-storage:migrate/sql/023_create_table_connection_requests.sql、024_create_table_connections.sql；daodao-f2e:packages/api/src/services/connection.ts:66 `sendConnectionRequest`。
- Scenario: 發送連結請求 → ✅ — connection.service.ts:142 upsert request + :180 通知對方
- Scenario: 接受或拒絕 → ✅ — connection.service.ts:118-138 反向請求自動建立 connection；connection.ts 前端 status none/incoming/outgoing/connected

## Requirement: 會員私訊功能 → ❌
證據: 無。grep private message / direct_message / /messages / conversation 於 server routes 皆無（僅 admin.routes.ts 無關命中）。無私訊表、無私訊 API、無 1:1 訊息介面。
- Scenario: 發送私訊 → ❌ — 無私訊功能
- Scenario: 未連結會員無法私訊 → ❌ — 無私訊功能

## Requirement: 啟用與停用會員名錄 → ❌
證據: 無。grep directory_enabled / toggleDirectory / enable directory 於 controller/service 皆無。無名錄功能開關。
- Scenario: 停用會員名錄 → ❌ — 無開關
- Scenario: 啟用會員名錄 → ❌ — 無開關

## Requirement: 管理員審核會員檔案（隱藏/恢復） → ❌
證據: 無。grep hide / restore / moderat / is_hidden 於 admin-community.service.ts 與 controller 皆無。無欄位內容隱藏/恢復機制。
- Scenario: 隱藏不適當欄位內容 → ❌ — 無
- Scenario: 恢復被隱藏的內容 → ❌ — 無

## Requirement: 名錄使用分析 → ⚠️
證據: daodao-server:src/controllers/admin-community.controller.ts:146 GET /admin/community/member/analytics + service `getDirectoryStats`（service:422，回 totalMembers/completedProfiles/averageFillRate）。
- Scenario: 查看名錄分析 → ⚠️ — 有 analytics endpoint，但回傳為 profile 填寫統計，**未見**搜尋次數/熱門關鍵字/個人檔案瀏覽次數/連結請求發送數+接受率
- Scenario: 篩選分析時間範圍 → ❌ — getDirectoryStats 無日期範圍參數

## 關鍵落差
後端「自訂欄位管理」（CRUD/reorder/stats/visibility/required）+ 連結請求完整；但**前台名錄頁、搜尋/篩選、私訊、名錄啟停開關、檔案審核隱藏/恢復**全缺，名錄分析也只有填寫統計、缺搜尋/瀏覽/連結率指標。
