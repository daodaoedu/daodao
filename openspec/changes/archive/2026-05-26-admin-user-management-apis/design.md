## Context

DaoDao 後端已有完整的 Admin 框架，包括角色權限管理 (`/admin/roles`, `/admin/permissions`) 和豐富的用戶統計 API (`/admin/user-stats/*`)。然而，Admin 介面需要的核心功能——使用者管理——目前缺少專用 API。

**現有資源**：
- 角色權限系統：`roles`, `permissions`, `role_permissions`, `user_roles` 表完整
- 用戶統計：DAU/WAU/MAU、留存率、設備分析等已實作
- 認證中間件：`requireAdmin`, `requireSuperAdmin` 已就緒
- 資料結構：`users` 表有 `is_active`, `verified`, `verified_at` 欄位；`email_logs` 表已存在

**缺口**：
- 公開的 `GET /users` 不含敏感欄位（email_verified, roles, permissions）
- `GET /users/me/login-history` 只能查自己，Admin 無法查其他用戶
- `GET /admin/user-stats/active-users` 只回傳快照，缺少時間序列歷史資料
- `email_logs` 表存在但沒有查詢 API

## Goals / Non-Goals

**Goals:**
- 提供 Admin 專用的使用者列表與詳情 API，包含完整管理欄位
- 實作活躍用戶趨勢 API，回傳時間序列資料供圖表使用
- 開放郵件發送歷史查詢，支援問題排查
- 複用現有架構，保持程式碼一致性

**Non-Goals:**
- 不實作使用者批量操作（批量停用、批量刪除）
- 不修改現有公開 API 的回傳格式
- 不實作即時推播或 WebSocket 通知
- 不變更現有的角色權限資料結構

## Decisions

### 1. 路由組織方式

**決定**：在 `src/routes/admin.routes.ts` 中新增路由，而非建立新檔案

**理由**：
- 現有 `admin.routes.ts` 已有完整的角色權限路由，風格一致
- 共用 `requireAdmin` 中間件，減少重複
- 避免過度拆分小檔案

**替代方案**：建立 `admin-users.routes.ts` 獨立檔案
- 優點：職責分離更清晰
- 缺點：需要在 `app.ts` 額外註冊，增加維護成本

### 2. 使用者列表搜尋實作

**決定**：使用 Prisma `where` 條件實作搜尋與篩選

**篩選支援**：
- `search`：搜尋名稱或 email（使用 `contains` + `mode: insensitive`）
- `role`：篩選角色 ID
- `isActive`：篩選啟用狀態
- `isVerified`：篩選 email 驗證狀態

**理由**：
- Prisma 原生支援，效能足夠應付管理後台的查詢量
- 避免引入額外搜尋引擎（如 Elasticsearch）的複雜度

**替代方案**：使用 PostgreSQL Full-Text Search
- 優點：更強大的搜尋能力
- 缺點：需要額外的索引維護，Admin 使用場景不需要這麼複雜

### 3. 活躍用戶趨勢資料來源

**決定**：從 `user_activity_stats` 和 `user_login_history` 即時計算

**理由**：
- `user_login_history` 記錄每次登入，可回溯計算歷史 DAU
- 避免新增快照表，減少資料冗餘
- 使用 PostgreSQL `DATE_TRUNC` 進行日期分組，效能可接受

**替代方案**：新增每日快照表 `daily_active_users_snapshot`
- 優點：查詢更快，支援更長時間範圍
- 缺點：需要排程任務維護，增加系統複雜度
- **保留**：若即時計算效能不足，可作為後續優化方案

### 4. Admin 使用者詳情回傳格式

**決定**：定義 `AdminUserDetailResponse` 類型，擴展公開 `UserResponse`

```typescript
interface AdminUserDetailResponse extends UserResponse {
  email: string;              // 完整 email（公開 API 可能隱藏）
  emailVerified: boolean;
  emailVerifiedAt: Date | null;
  isActive: boolean;
  roles: RoleInfo[];
  permissions: string[];
  loginHistory: LoginHistoryItem[];  // 最近 10 筆
  activityStats: UserActivityStats;
}
```

**理由**：
- 一次請求取得所有管理所需資訊，減少前端多次呼叫
- 與現有 `UserResponse` 相容，前端可複用型別

### 5. 郵件歷史查詢 API 路徑

**決定**：使用 `GET /api/v1/admin/email/history` 而非 `GET /api/v1/email/history`

**理由**：
- 郵件歷史屬於敏感資訊，應限制為 Admin 專用
- 保持 `/admin/*` 路由的一致性
- 避免與未來可能的用戶自己郵件查詢 API 衝突

### 6. 權限控制策略

**決定**：依操作類型區分權限層級

| 操作類型 | 中間件 | 適用 API |
|---------|--------|----------|
| 查看資料 | `requireAdmin` | 使用者列表、詳情、統計、郵件歷史 |
| 修改資料 | `requireSuperAdmin` | 停用/啟用用戶、角色指派、權限管理 |

**理由**：
- Admin 可查看管理資料進行監控和問題排查
- 只有 SuperAdmin 可執行會影響用戶權限或狀態的操作
- 與現有角色權限 API 的設計一致

### 7. 分頁策略

**決定**：使用 offset-based 分頁（page, limit）

**理由**：
- Admin 後台通常需要跳頁功能，offset 分頁支援較好
- 資料量相對有限（使用者數萬級別），效能影響可接受
- 與現有 `user-stats` API 的分頁風格一致

## Risks / Trade-offs

### 1. 即時計算趨勢資料效能

**風險**：大量用戶時，從 `user_login_history` 即時計算 30 天趨勢可能變慢

**緩解**：
- 限制趨勢查詢的時間範圍（最多 90 天）
- 在 `login_at` 欄位已有索引
- 監控 API 回應時間，超過 500ms 時考慮引入快照表

### 2. N+1 查詢風險

**風險**：使用者詳情需要關聯 roles、permissions、login_history 等多張表

**緩解**：
- 使用 Prisma `include` 進行 eager loading
- 限制 login_history 回傳筆數（最近 10 筆）

### 3. 權限控制一致性

**風險**：新 API 的權限檢查可能與現有系統不一致

**緩解**：
- **查看類 API**（列表、詳情、統計、歷史）使用 `requireAdmin`
- **修改類 API**（停用用戶、角色指派、權限管理）使用 `requireSuperAdmin`

## Open Questions

1. **趨勢資料預設範圍**：預設回傳 30 天還是 7 天？前端可否自訂範圍？
   - 建議：預設 30 天，支援 `days` 參數（最大 90 天）

2. **使用者停用的連帶影響**：停用用戶時是否需要撤銷其 JWT token？
   - 建議：第一版不處理，依賴 token 過期機制；後續可加入 token 黑名單

3. **郵件歷史的保留期限**：`email_logs` 資料是否有清理機制？
   - 建議：暫不處理，待資料量增長後再評估
