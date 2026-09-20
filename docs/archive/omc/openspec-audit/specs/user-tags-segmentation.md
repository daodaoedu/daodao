# user-tags-segmentation
- 涉及 repo: admin-ui (前台頁面/hook) / server (admin tag API) / storage (migration)
- 對應 archived change: 無（admin-panel-overhaul 相關，spec 來源於 docs/superpowers/specs/2026-05-30-user-tags-feature-design.md）
- 總計: 12 條 requirement / 22 個 scenario | ✅3 ⚠️7 ❌2 ❓0

## Requirement: 標籤列表顯示 → ✅
證據: daodao-admin-ui:src/pages/UserTagsPage.tsx:84-128 — 手動標籤表格列出名稱+顏色圓點(tag.color)+用戶數+建立日期；server listTags 回傳 type/color/userCount/createdAt（daodao-server:src/services/admin-tags.service.ts:13-39）
- Scenario: 檢視標籤列表 → ✅ — 表格欄位含名稱、顏色標記、userCount、createdAt
- Scenario: 區分手動與自動標籤 → ⚠️ — DB 有 type(manual/auto) 欄位且 server 回傳，但 UserTagsPage 將手動/自動拆成兩個獨立卡片區塊，未在同一列以「手動/自動」徽章標記；自動區塊實際渲染的是 tag_rules（規則），非 type=auto 的 tag

## Requirement: 建立手動標籤 → ⚠️
證據: daodao-server:src/services/admin-tags.service.ts:46-77 createTag + daodao-admin-ui:src/api/admin-users.ts:80 createTag API 存在
- Scenario: 建立新手動標籤 → ⚠️ — 後端與 API client 具備，但 UI「新增標籤」按鈕為 `alert('功能開發中')`（UserTagsPage.tsx:60），無表單可填名稱/顏色/描述
- Scenario: 標籤名稱重複驗證 → ⚠️ — DB 層有 `name VARCHAR(100) NOT NULL UNIQUE`（daodao-storage:migrate/sql/041_create_user_tags_tables.sql:25）會擋重複，但無 app 層友善錯誤訊息處理，UI 也無建立流程

## Requirement: 編輯與刪除手動標籤 → ⚠️
證據: updateTag/deleteTag service（admin-tags.service.ts:84-126）+ deleteTag UI 串接（UserTagsPage.tsx:30-48）
- Scenario: 編輯手動標籤 → ❌ — 編輯按鈕為 `alert('功能開發中')`（UserTagsPage.tsx:111），無編輯表單；後端 updateTag 存在但未被 UI 呼叫
- Scenario: 刪除手動標籤 → ⚠️ — 有刪除串接 deleteTag，但確認對話框僅 `confirm('確定要刪除此標籤嗎？')`（UserTagsPage.tsx:43），未顯示「從所有使用者移除」與影響人數

## Requirement: 建立自動標籤規則 → ⚠️
證據: createTagRule service（admin-tags.service.ts:159-194）+ migration tag_rules condition_type/operator/value（041 sql:53-79）
- Scenario: 建立「活躍使用者」自動標籤（最後登入天數）→ ⚠️ — condition_type 為自由字串（comment 舉例 days_since_last_login），DB/service 支援儲存，但無 UI 建立流程（createTagRule API client 端 admin-users.ts:92 簽名為 {name,condition} 與後端 {tagId,conditionType...} 不一致），且無實際依規則套用標籤的邏輯
- Scenario: 建立「高 AI 使用量」自動標籤（月 token）→ ⚠️ — 同上；condition_type 可存任意值，但無 token 用量評估實作

## Requirement: 自動標籤規則 AND/OR 條件組合 → ⚠️
證據: tag_rules.logic_operator VARCHAR(5) CHECK IN ('AND','OR')（041 sql:62）+ service createTagRule 傳入 logicOperator（admin-tags.service.ts:177）
- Scenario: AND 條件組合 → ⚠️ — schema 有 logic_operator 欄位可儲存 AND，但無評估引擎實際以 AND 篩選使用者
- Scenario: OR 條件組合 → ⚠️ — 同上，僅儲存層
- Scenario: 混合 AND/OR 條件 → ❌ — 單一 logic_operator 欄位無法表達多層巢狀 AND/OR，且無評估邏輯

## Requirement: 自動標籤規則啟用/停用 → ⚠️
證據: tag_rules.is_enabled BOOLEAN（041 sql:63）+ UI toggle（UserTagsPage.tsx:160-180）
- Scenario: 停用自動標籤規則 → ⚠️ — UI toggle 僅存於 localToggles state（UserTagsPage.tsx:13-26），未呼叫任何 update API 持久化；後端無 updateTagRule route 串接
- Scenario: 重新啟用自動標籤規則 → ⚠️ — 同上，純前端狀態切換，無持久化、無下次評估週期套用

## Requirement: 系統定期評估自動標籤規則 → ❌
證據: 無。grep `evaluateTagRules|applyTagRules|cron.*tag` 於 daodao-server origin/dev 無結果；queues 目錄無 tag 評估 worker
- Scenario: 定期評估週期 → ❌ — 無排程/cron/queue 評估規則並增刪使用者標籤
- Scenario: 新使用者符合規則 → ❌ — 無任何自動評估觸發

## Requirement: 手動指派/移除使用者標籤 → ⚠️
證據: bulkAssignTag service（admin-tags.service.ts:200-216）支援 add/remove，bulkTagUsers API（admin-users.ts:98）
- Scenario: 從使用者詳情頁指派標籤 → ❌ — UserDetailPage 無標籤指派 UI（grep bulkTag/tagIds 僅出現在 admin-users.ts API 定義，無頁面呼叫）
- Scenario: 從使用者詳情頁移除標籤 → ❌ — 同上，無 UI

## Requirement: 批次指派/移除標籤 → ⚠️
證據: POST /admin/users/bulk-tag route（daodao-server:src/routes/admin.routes.ts:1235）+ bulkTagSchema 驗證（admin-tags.validator.ts bulkTagSchema）+ bulkAssignTag service
- Scenario: 批次指派標籤 → ⚠️ — 後端完整（route+validator+service add 分支），但使用者列表頁無批次新增標籤 UI 串接
- Scenario: 批次移除標籤 → ⚠️ — 後端 remove 分支存在，UI 未串接

## Requirement: 使用者列表標籤篩選 → ❌
證據: 無。grep `tag.*filter|filter.*tag` 於 admin-ui origin/dev 無使用者列表依標籤篩選的實作
- Scenario: 依單一標籤篩選 → ❌ — 無實作
- Scenario: 依多個標籤篩選 → ❌ — 無實作

## Requirement: 標籤刪除確認與影響提示 → ❌
證據: UserTagsPage.tsx:43 僅 `confirm('確定要刪除此標籤嗎？')`，未含使用者人數
- Scenario: 刪除標籤時顯示影響 → ❌ — 確認框未顯示「此標籤目前有 N 位使用者...」
- Scenario: 取消刪除 → ✅ — 原生 confirm 取消即不執行 mutate（UserTagsPage.tsx:43-46）

## Requirement: 標籤使用者人數顯示 → ✅
證據: listTags 以 `COUNT(uta.user_id)` 計算 user_count（admin-tags.service.ts:23）+ UI 顯示 tag.userCount（UserTagsPage.tsx:104）
- Scenario: 檢視標籤使用者人數 → ✅ — 表格「用戶數」欄顯示 userCount
- Scenario: 人數即時更新 → ⚠️ — 重新載入時由 LEFT JOIN COUNT 反映最新值，但因無指派/移除 UI（前述），實際無從在 UI 觸發人數變動

## 關鍵落差
1. 自動標籤完全缺乏執行引擎：tag_rules 表與 CRUD 存在，但無任何排程/cron/queue 依規則評估並套用標籤至使用者（Requirement 「系統定期評估」完全 ❌）。
2. UI 多處為 placeholder：新增/編輯標籤、規則建立、規則啟用/停用皆為 `alert('功能開發中')` 或純前端 state，未持久化；使用者列表標籤篩選與詳情頁指派 UI 不存在。
3. API 契約不一致：admin-ui createTagRule 送 {name,condition}，後端 createTagRuleSchema 期望 {tagId,conditionType,conditionOperator,conditionValue,logicOperator}（admin-users.ts:92 vs admin-tags.validator.ts）。
