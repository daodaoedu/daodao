## 1. 類型定義與驗證 Schema

- [x] 1.1 在 `src/types/` 新增 `admin-user.types.ts`，定義 AdminUserListResponse、AdminUserDetailResponse、AdminUserFilters 等類型
- [x] 1.2 在 `src/types/` 新增 `admin-statistics.types.ts`，定義 PracticeStatsResponse、ActiveUsersTrendResponse 等類型
- [x] 1.3 在 `src/types/` 新增 `email-history.types.ts`，定義 EmailHistoryResponse、EmailHistoryFilters 等類型
- [x] 1.4 在 `src/validators/` 新增 `admin-user.validator.ts`，使用 Zod 定義查詢參數驗證 schema
- [x] 1.5 在 `src/validators/` 新增 `admin-statistics.validator.ts`，定義趨勢查詢參數驗證 schema
- [x] 1.6 在 `src/validators/` 新增 `email-history.validator.ts`，定義郵件歷史查詢參數驗證 schema

## 2. Admin User Management Service

- [x] 2.1 在 `src/services/` 新增 `admin-user.service.ts`
- [x] 2.2 實作 `getAdminUserList()` 函數：支援搜尋、篩選、分頁
- [x] 2.3 實作 `getAdminUserDetail()` 函數：包含 roles、permissions、loginHistory、activityStats
- [x] 2.4 實作 `getUserLoginHistory()` 函數：支援日期範圍篩選
- [x] 2.5 實作 `getUserActivityStats()` 函數
- [x] 2.6 實作 `toggleUserStatus()` 函數：啟用/停用用戶，檢查不可停用自己

## 3. Admin Statistics Service

- [x] 3.1 在 `src/services/` 新增 `admin-statistics.service.ts`
- [x] 3.2 實作 `getPracticeStats()` 函數：聚合全站實踐統計
- [x] 3.3 實作 `getActiveUsersTrend()` 函數：從 user_login_history 計算 DAU/WAU/MAU 時間序列

## 4. Email History Service

- [x] 4.1 在 `src/services/` 新增 `email-history.service.ts`
- [x] 4.2 實作 `getEmailHistory()` 函數：支援多條件篩選、分頁、排序
- [x] 4.3 實作 `getEmailHistoryStats()` 函數：計算 sent/failed/pending 統計

## 5. Admin Controllers

- [x] 5.1 在 `src/controllers/` 新增 `admin-user.controller.ts`，實作 listUsers、getUserDetail、getLoginHistory、getActivityStats、updateStatus
- [x] 5.2 在 `src/controllers/` 新增 `admin-statistics.controller.ts`，實作 getPracticeStats、getActiveUsersTrend
- [x] 5.3 在 `src/controllers/` 新增 `email-history.controller.ts`，實作 getEmailHistory

## 6. 路由註冊

- [x] 6.1 在 `src/routes/admin.routes.ts` 新增 `/admin/users` 相關路由（使用 requireAdmin）
- [x] 6.2 在 `src/routes/admin.routes.ts` 新增 `PUT /admin/users/:userId/status` 路由（使用 requireSuperAdmin）
- [x] 6.3 在 `src/routes/admin.routes.ts` 新增 `/admin/practices/stats` 路由
- [x] 6.4 在 `src/routes/admin.routes.ts` 新增 `/admin/user-stats/active-users/trend` 路由
- [x] 6.5 在 `src/routes/admin.routes.ts` 新增 `/admin/email/history` 路由

## 7. Swagger 文檔

- [x] 7.1 在 `src/swagger/schemas/` 新增 admin-user schemas
- [x] 7.2 在 `src/swagger/schemas/` 新增 admin-statistics schemas
- [x] 7.3 在 `src/swagger/schemas/` 新增 email-history schemas
- [x] 7.4 為所有新路由添加 Swagger 註解（@swagger JSDoc）

## 8. 驗證與測試

- [x] 8.1 執行 `pnpm run typecheck` 確保類型正確
- [x] 8.2 執行 `pnpm run lint` 確保程式碼風格
- [ ] 8.3 手動測試各 API 端點功能
- [ ] 8.4 確認 Swagger 文檔正確顯示新 API
