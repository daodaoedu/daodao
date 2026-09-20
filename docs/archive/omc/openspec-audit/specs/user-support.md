# user-support
- 涉及 repo: admin-ui (UI) / server (API)
- 對應 archived change: admin-user-management-apis（部分）
- 總計: 12 條 requirement / 21 個 scenario | ✅4 ⚠️7 ❌1 ❓0

## Requirement: 意見回饋列表顯示 → ✅
證據: daodao-server:src/services/admin-feedback.service.ts:35 — `ORDER BY f.created_at DESC` 最新優先；admin-ui:src/pages/FeedbackPage.tsx + useFeedback.ts → GET /admin/feedback
- Scenario: 進入意見回饋頁面 → ✅ — 後端依 created_at DESC 排序、前端渲染列表

## Requirement: 意見回饋項目資訊 → ⚠️
證據: admin-ui:src/pages/FeedbackPage.tsx:140-165 顯示 userName/date/category/status/content；service 回傳 user_name 但**未回傳 Email**（SELECT 只取 u.name）
- Scenario: 檢視回饋項目詳情 → ⚠️ — spec 要求顯示 Email，後端與前端均無 Email 欄位

## Requirement: 意見回饋狀態變更 → ⚠️
證據: server PATCH /feedback/:id → updateFeedbackStatus (service:60)；API client admin-support.ts:updateFeedbackStatus 存在
- Scenario: 將回饋標記為已關閉 → ⚠️ — 後端支援，但 FeedbackPage.tsx:206 前端「確認」按鈕只呼叫 `alert()`，**未串接 mutation**
- Scenario: 將回饋標記為已回覆 → ✅ — service replyToFeedback 自動 `UPDATE feedback SET status='replied'`（後端層面）

## Requirement: 意見回饋回覆 → ⚠️
證據: server POST /feedback/:id/reply → replyToFeedback (service:76) INSERT feedback_replies + status=replied
- Scenario: 回覆回饋並通知使用者 → ⚠️ — **未實際送出 Email/站內通知**（service 無 sendEmail/notify 呼叫）；前端「送出回覆」也只 alert()，未呼叫 replyToFeedback API

## Requirement: 意見回饋分類標籤 → ⚠️
證據: updateFeedbackStatus 支援 category 參數 (service:62)；FeedbackPage categoryOptions 含 Bug/功能建議/問題/其他
- Scenario: 為回饋指定分類 → ⚠️ — 前端僅有篩選用的分類，無「為單筆指定分類」的 UI 互動；分類命名與 spec 不符（spec: Bug/功能請求/問題詢問/其他 vs 程式: Bug/功能建議/問題/其他）
- Scenario: 變更已指定的分類 → ⚠️ — 後端 PATCH 支援 category，但前端無變更分類的 UI

## Requirement: 意見回饋篩選 → ✅
證據: service:18-19 status/category WHERE 條件；FeedbackPage useFeedback 傳 status/category param
- Scenario: 依狀態篩選 → ✅
- Scenario: 依分類篩選 → ✅
- Scenario: 同時依狀態與分類 → ✅ — 後端兩條件 AND，前端 filtered 也雙條件過濾

## Requirement: 未處理回饋計數徽章 → ❌
證據: stats.pending 數值存在於 FeedbackListResponse，並以 StatCard 顯示總數
- Scenario: 顯示待處理計數 → ⚠️ — 有 pending StatCard 數字，但**非入口處紅點徽章**（spec 指側欄/入口 badge「5」）
- Scenario: 處理回饋後計數即時 -1 → ❌ — 前端狀態變更只 alert()，不會更新計數；無即時減 1 邏輯

## Requirement: FAQ 項目建立 → ⚠️
證據: server POST /faq/items → createFaqItem；admin-ui useCreateFaqItem + FAQManagementPage form
- Scenario: 建立新 FAQ → ⚠️ — answer 用普通 `<Textarea>`（FAQManagementPage 匯入 input），**非富文本編輯器**；spec 要求富文本

## Requirement: FAQ 分類管理 → ✅
證據: server faq/categories CRUD；admin-ui useFaqCategories；FAQManagementPage 有 category tab 切換
- Scenario: 將 FAQ 歸入分類 → ✅ — createFaqItem 帶 categoryId
- Scenario: 檢視特定分類 FAQ → ✅ — listFaqItems(categoryId) 過濾

## Requirement: FAQ 項目拖拉排序 → ⚠️
證據: server PATCH /faq/items/reorder → reorderFaqItems(service:223) 存在且可運作
- Scenario: 拖拉調整 FAQ 順序 → ⚠️ — **後端 reorder API 有，但 admin-ui 未串接**：admin-support.ts 無 reorder 函式，FAQManagementPage 僅顯示 GripVertical 圖示，無 DnD 邏輯與 mutation 呼叫

## Requirement: FAQ 項目發布與取消發布 → ✅
證據: FAQManagementPage:29 togglePublish → useUpdateFaqItem({isPublished}); server updateFaqItem 支援 is_published
- Scenario: 取消發布已發布 FAQ → ✅
- Scenario: 發布未發布 FAQ → ✅

## Requirement: FAQ 變更即時同步前端 → ⚠️
證據: admin 端 invalidateQueries 重抓；但 server **無公開（非 admin）FAQ 端點**（grep 僅 admin.routes 有 faq）
- Scenario: 新增 FAQ 後前端顯示 → ⚠️ — 無前台讀取 published FAQ 的 public API，無法確認 daodao-f2e 前台同步路徑
- Scenario: 修改 FAQ 後前端更新 → ⚠️ — 同上，缺前台消費端點證據

## Requirement: FAQ 批次發布與取消發布 → ✅
證據: server PATCH /faq/items/bulk-publish → bulkPublishFaqItems(service:233)；admin-ui useBulkPublishFaqItems + admin-support.bulkPublishFaqItems
- Scenario: 批次發布多個 → ✅
- Scenario: 批次取消發布多個 → ✅ — bulkPublishFaqItems(ids, isPublished) 支援雙向
