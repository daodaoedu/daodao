## Why

Admin 介面需要管理使用者和查看系統統計，但目前後端缺少 Admin 專用的 API。現有的公開 API（如 `GET /api/v1/users`）缺少管理必要欄位（email_verified、is_active、roles、permissions），導致使用者管理頁面無法運作。

## What Changes

### 核心 API（必要）

- **新增 Admin 使用者列表 API** (`GET /api/v1/admin/users`)
  - 支援搜尋、角色篩選、email 驗證狀態篩選
  - 回傳完整管理欄位：email_verified、is_active、roles、permissions

- **新增 Admin 使用者詳情 API** (`GET /api/v1/admin/users/{userId}`)
  - 回傳完整使用者資料，包含 email_verified_at、roles[]、permissions[] 等

- **新增全站實踐統計 API** (`GET /api/v1/admin/practices/stats`)
  - 提供 Admin 總覽頁面所需的實踐數據

- **新增活躍用戶趨勢 API** (`GET /api/v1/admin/user-stats/active-users/trend`)
  - 回傳時間序列資料（過去 30 天每日 DAU/WAU/MAU）供折線圖使用

- **新增郵件發送歷史 API** (`GET /api/v1/email/history`)
  - 提供每封郵件的收件人、模板類型、發送時間、成功/失敗狀態

### 擴展 API（Nice to have）

- **新增使用者狀態管理 API** (`PUT /api/v1/admin/users/{userId}/status`)
  - 停用/啟用使用者帳號

- **新增使用者登入歷史 API** (`GET /api/v1/admin/users/{userId}/login-history`)
  - Admin 可查看任意使用者的登入記錄

- **新增使用者活躍統計 API** (`GET /api/v1/admin/users/{userId}/activity-stats`)
  - Admin 可查看任意使用者的活躍統計

## Capabilities

### New Capabilities

- `admin-user-management`: Admin 使用者列表與詳情 API，包含搜尋、篩選、完整管理欄位
- `admin-statistics`: Admin 統計相關 API，包含實踐統計和活躍用戶趨勢
- `email-history`: 郵件發送歷史記錄查詢

### Modified Capabilities

（無需修改現有規格）

## Impact

### 受影響的程式碼

- `src/routes/` - 新增 admin routes
- `src/controllers/` - 新增 admin controllers
- `src/services/` - 新增對應的 service 層
- `src/validators/` - 新增 Zod 驗證 schemas
- `src/swagger/schemas/` - 新增 API 文件 schemas

### API 變更

- 新增 `/api/v1/admin/*` 路由群組
- 所有 Admin API 需要 admin 角色授權

### 資料庫考量

- 可能需要新增 email 發送歷史表（如果目前沒有記錄）
- 可能需要新增每日活躍用戶快照表（用於趨勢圖）

### 依賴

- 現有的 JWT 認證與角色授權機制
- Prisma ORM 存取 PostgreSQL
