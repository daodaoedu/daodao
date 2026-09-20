# email-history
- 涉及 repo: server
- 對應 archived change: admin-user-management-apis (email-history spec)
- 總計: 2 條 requirement / 11 個 scenario | ✅10 ⚠️1 ❌0 ❓0

## Requirement: Admin can query email sending history → ✅
證據: daodao-server:src/routes/admin.routes.ts:1073-1077 (`GET /email/history` + authenticateAny + requireAdmin)、controller src/controllers/email-history.controller.ts:16-35、service src/services/email-history.service.ts:19-144（查 `email_logs` 表）。
- Scenario: Successful email history retrieval → ✅ — service:115-122 回傳 id/userId/recipientEmail/emailType/status/sentAt/createdAt
- Scenario: Filter by email type → ✅ — service:37-39 `where.email_type = emailType`
- Scenario: Filter by status → ✅ — service:41-43 `where.status = status`
- Scenario: Filter by recipient → ✅ — service:50-54 透過 users.contacts/email `contains` + insensitive
- Scenario: Filter by date range → ✅ — service:65-74 `sent_at.gte/lte`（endDate 含當日結尾）
- Scenario: Filter by user ID → ✅ — service:45-47 `where.user_id = userId`
- Scenario: Pagination support → ✅ — service:133-141 回傳 currentPage/totalPages/totalCount/hasNext/hasPrev/limit
- Scenario: Sort by sent date → ✅ — service:79-82 `orderBy.sent_at = sortOrder`
- Scenario: Unauthorized access denied → ✅ — route 套 requireAdmin（403）

## Requirement: Admin can view email sending statistics summary → ⚠️
證據: daodao-server:src/services/email-history.service.ts:150-200 getEmailHistoryStats 回傳 totalRecords/sentCount/failedCount/pendingCount/successRate（外加 openedCount/openRate）。
差異：spec 說統計放在「response metadata」，實作放在 `result.stats`（與 pagination 平行的 stats 物件），欄位內容完全符合但鍵名不是 metadata。功能等價，標 ⚠️。
- Scenario: Statistics included in response → ✅ — service:131,182-188 回傳 totalRecords/sentCount/failedCount/pendingCount/successRate（在 stats 物件內）
- Scenario: Statistics reflect applied filters → ✅ — getEmailHistoryStats 接收同一個 `where` 條件 (service:131 傳入)，統計反映篩選
