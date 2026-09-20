# audit-log
- 涉及 repo: daodao-server + daodao-admin-ui + daodao-storage
- 對應 archived change: admin-user-management-apis（推測）
- 總計: 11 條 requirement / 18 個 scenario | ✅3 ⚠️4 ❌3 ❓1

## Requirement: 自動記錄管理操作 → ❌
證據: `createAuditLog` 存在於 daodao-server:src/services/admin-audit.service.ts:55-67，但全 repo grep 找不到任何 controller/middleware/route 呼叫它（controller 只用 listAuditLogs/setComplianceHold/get|updateDataRetentionPolicy）。無自動寫入日誌的攔截機制。
- Scenario: Admin 執行操作後自動產生日誌 → ❌ — 無自動觸發點，function 未被呼叫。

## Requirement: 稽核日誌項目欄位（時間戳/Admin/類型/資源/舊值/新值/IP/UA）→ ✅
證據: daodao-storage:migrate/sql/043_create_support_audit_tables.sql:131-141 `audit_logs` 表含 action_type/target_resource/target_id/old_value(JSONB)/new_value(JSONB)/ip_address(INET)/user_agent(TEXT)/created_at/admin_id；service listAuditLogs 映射全部欄位（src/services/admin-audit.service.ts:43-49）。
- Scenario: 檢視日誌項目完整資訊 → ✅ — schema + service 映射齊全。

## Requirement: 操作類型涵蓋範圍（登入/登出/角色變更/...）→ ⚠️
證據: action_type 為自由字串 VARCHAR(50)（migration:134），無 enum 限制涵蓋清單；admin-ui 端硬編一組類型（AuditLogPage.tsx:13 `登入|角色變更|用戶停用|設定修改|資料匯出|通知發送`），與 spec 9 類清單不完全一致（缺登出/標籤指派/內容審核），且無後端寫入產生這些類型。
- Scenario: 角色變更被記錄 → ⚠️ — 無自動寫入，僅 schema 支援。
- Scenario: 登入被記錄 → ⚠️ — 同上，無寫入點。
- Scenario: 資料匯出被記錄 → ⚠️ — 同上。

## Requirement: 稽核日誌頁面顯示與分頁（反向時間序）→ ✅
證據: daodao-admin-ui:src/pages/AuditLogPage.tsx 有 page/PAGE_SIZE/offset 分頁（:68,76,85）；storage 索引 `idx_audit_logs_created ON created_at DESC`（migration:156）；listAuditLogs 支援 limit/offset。
- Scenario: 檢視列表（最新優先 + 分頁）→ ✅ — created_at DESC 索引 + offset 分頁。
- Scenario: 翻頁檢視更早日誌 → ✅ — page state 控制 offset。

## Requirement: 稽核日誌篩選（Admin/類型/資源/日期範圍）→ ⚠️
證據: service:8-14 支援 actionType / search(ILIKE action_type|target_resource|target_id) 過濾；validator 有 filter schema。但 admin-ui AuditLogPage 主要對 mock `allLogs` 做 client-side 過濾（:90-103），日期範圍過濾在後端 service 未見明確 dateFrom/dateTo 條件。
- Scenario: 依操作者篩選 → ⚠️ — service 有 admin filter 條件但 UI 走 mock。
- Scenario: 依操作類型 + 日期範圍 → ⚠️ — 日期範圍後端條件未確認。
- Scenario: 依目標資源篩選 → ✅ — service:14 ILIKE target_resource。

## Requirement: 稽核日誌全文搜尋 → ✅
證據: daodao-server:src/services/admin-audit.service.ts:14 `(action_type ILIKE :q OR target_resource ILIKE :q OR target_id ILIKE :q)`。
- Scenario: 以關鍵字搜尋 → ✅ — search 參數轉 ILIKE 模糊比對。

## Requirement: 稽核日誌保留期限（預設 365 天）→ ⚠️
證據: getDataRetentionPolicy 硬回傳 auditLogRetentionDays:365（service:79），但**無任何自動清除 job**（grep 不到 `DELETE FROM audit_logs` 或 cron）。policy 只是讀取值，未實際執行刪除。
- Scenario: 超過保留期限自動清除 → ❌ — 無刪除排程實作。
- Scenario: 未超過期限持續保留 → ✅ — 預設不刪（因根本無刪除機制）。

## Requirement: 稽核日誌匯出（ExportButton，依篩選結果）→ ⚠️
證據: daodao-admin-ui:src/pages/AuditLogPage.tsx:5,116-119 使用 `<ExportButton data={filtered} columns={exportColumns}>`，但 data 來源為前端 mock/filtered 陣列，非後端完整篩選結果匯出端點。
- Scenario: 匯出篩選後日誌 → ⚠️ — 前端匯出 filtered，非伺服器端依 filter 全量匯出。
- Scenario: 匯出全部日誌 → ⚠️ — 受前端分頁/mock 資料限制。

## Requirement: 合規保留鎖定 → ⚠️
證據: daodao-storage migration:172 `compliance_holds` 表（date_from/date_to/reason）；service setComplianceHold(:69-75) INSERT；route admin.routes.ts:1280 `POST /audit-logs/compliance-hold`（requireSuperAdmin）；admin-ui createComplianceHold(:43)。**但**保留鎖定僅寫入紀錄，因無自動刪除 job，鎖定保護無實際生效對象（解除鎖定也無刪除可恢復）。
- Scenario: 設定合規保留鎖定 → ⚠️ — 可寫入 hold 紀錄，但無刪除機制使其保護無實質作用。
- Scenario: 解除合規保留鎖定 → ❌ — 未見解除（DELETE/update compliance_holds）端點。

## Requirement: 資料保留政策設定（帳號刪除後天數/內容保留）→ ⚠️
證據: route admin.routes.ts:1281-1282 GET/PUT `/data-retention-policy`；validator 限制 30-3650 天（admin-audit.validator.ts:21-23）。但 updateDataRetentionPolicy(service:82-84) 為 **no-op**（直接 `return policy` 不持久化），getDataRetentionPolicy 回硬編預設值，且無後端依政策執行刪除的排程。
- Scenario: 設定帳號刪除後資料保留天數 → ⚠️ — 可呼叫 PUT 但未持久化、未執行。
- Scenario: 設定內容保留期限 → ⚠️ — 同上。

## Requirement: 稽核日誌不可變性 → ❓
證據: 無 UPDATE/DELETE audit_logs 的 API 端點（route 僅 GET /audit-logs），故實務上不可從 API 改/刪。但無資料庫層面的觸發器/權限明文保證不可變（migration 未見 REVOKE UPDATE/DELETE 或 trigger）。
- Scenario: 嘗試編輯日誌 → ❓ — 無編輯端點，但無明確拒絕機制（隱性不可變）。
- Scenario: 嘗試手動刪除日誌 → ❓ — 無刪除端點（含 retention 自動刪除也未實作），隱性不可刪但非主動拒絕。
