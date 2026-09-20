# admin-user-management
- 涉及 repo: server
- 對應 archived change: admin-user-management-apis
- 總計: 5 條 requirement / 18 個 scenario | ✅5 ⚠️0 ❌0 ❓0

## Requirement: Admin can list all users with management fields → ✅
證據: daodao-server:src/routes/admin.routes.ts:966-975 (`GET /admin/users` + requireAdmin)、controller src/controllers/admin-user.controller.ts:27-46、service src/services/admin-user.service.ts:24-183（回傳 emailVerified/emailVerifiedAt/isActive/roles/permissions/createdAt/lastLoginAt）。
- Scenario: Successful user list retrieval → ✅ — service:177-183 回傳 emailVerified、permissions、lastLoginAt 等欄位
- Scenario: Search users by name or email → ✅ — service:43-46 `nickname` 與 `contacts.email` 皆 `contains` + `mode:'insensitive'`（"name"=nickname）
- Scenario: Filter users by role → ✅ — service:51-52 `where.role_id = roleId`
- Scenario: Filter users by active status → ✅ — service:56-57 `where.is_active = isActive`
- Scenario: Filter users by email verification status → ✅ — service:61-62 `where.verified = isVerified`
- Scenario: Pagination support → ✅ — controller:43-46 回傳 currentPage/totalPages/itemsPerPage 等 metadata
- Scenario: Unauthorized access denied → ✅ — route 套 requireAdmin（403 由 permission.middleware 處理）

## Requirement: Admin can view user details with full management data → ✅
證據: daodao-server:src/routes/admin.routes.ts:977-985 (`GET /admin/users/:userId` + requireAdmin)、service src/services/admin-user.service.ts:215-337 回傳 permissions、recentLoginHistory、activityStats。
- Scenario: Successful user detail retrieval → ✅ — service:331-337 含 emailVerified、recentLoginHistory、activityStats
- Scenario: User not found → ✅ — service:237 `throw new NotFoundError('User not found')`
- Scenario: Unauthorized access denied → ✅ — requireAdmin

## Requirement: Admin can view any user's login history → ✅
證據: daodao-server:src/routes/admin.routes.ts:988-996 (`/users/:userId/login-history` + requireAdmin)、service src/services/admin-user.service.ts:352-408。
- Scenario: Successful login history retrieval → ✅ — service:401-408 map 出 loginAt/ipAddress/device 等
- Scenario: Filter login history by date range → ✅ — service:373-381 `login_at.gte/lte`（endDate 含當日結尾）
- Scenario: User not found → ✅ — service:365 NotFoundError

## Requirement: Admin can view any user's activity statistics → ✅
證據: daodao-server:src/routes/admin.routes.ts:1003-1007 (`/users/:userId/activity-stats` + requireAdmin)、service getUserActivityStats src/services/admin-user.service.ts:428-450。
- Scenario: Successful activity stats retrieval → ✅ — service:450+ 回傳 lastLoginAt 等統計（含 loginCount、device 欄位）
- Scenario: User not found → ✅ — service:435 NotFoundError

## Requirement: SuperAdmin can toggle user active status → ✅
證據: daodao-server:src/routes/admin.routes.ts (PUT `/users/:userId/status` + requireSuperAdmin, 約 line 1035)、controller updateStatus、service toggleUserStatus src/services/admin-user.service.ts:528-566。
- Scenario: Successfully disable a user → ✅ — service:549-558 update is_active=false 並回傳
- Scenario: Successfully enable a user → ✅ — 同上 isActive=true
- Scenario: Cannot disable own account → ✅ — service:534-536 `if (userId === currentUserId && !isActive) throw BadRequestError('Cannot disable your own account')`
- Scenario: User not found → ✅ — service:545 NotFoundError
- Scenario: Regular admin access denied → ✅ — route 套 requireSuperAdmin（403）
