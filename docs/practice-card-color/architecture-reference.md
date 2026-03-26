# Daodao 專案架構參考

## 專案概述

Daodao 是一個學習社群平台，採用前後端分離架構：

- **前端**: Next.js 15 + React 19 + TypeScript
- **後端**: Node.js + Express + Prisma ORM
- **數據庫**: PostgreSQL
- **認證**: JWT
- **狀態管理**: Context API + SWR

**當前狀態**: Beta 階段，所有功能免費開放

## 訂閱與會員系統

### 數據模型

#### 訂閱方案表 (subscription_plan)

```prisma
model subscription_plan {
  id          Int       @id @default(autoincrement())
  name        String    @db.VarChar(50)
  description String?
  features    Json?     // JSON 格式存儲功能列表
  price       Decimal   @db.Decimal(10, 2)

  user_subscription user_subscription[]
}
```

**關鍵特性**:
- `features` 欄位使用 JSON 格式，靈活存儲功能列表
- 支持動態定價和方案配置

#### 用戶訂閱表 (user_subscription)

```prisma
model user_subscription {
  id         Int                   @id @default(autoincrement())
  user_id    Int
  plan_id    Int
  status     subscription_status   // enum: active, canceled, expired, suspended
  start_date DateTime
  end_date   DateTime?

  users              users              @relation(...)
  subscription_plan  subscription_plan  @relation(...)
}
```

**訂閱狀態**:
- `active`: 有效訂閱
- `canceled`: 已取消（仍可使用至期限）
- `expired`: 已過期
- `suspended`: 暫停

### 方案配置示例

```typescript
// 未來的訂閱方案配置
export const SUBSCRIPTION_PLANS = {
  FREE: {
    id: 1,
    name: 'free',
    displayName: '免費方案',
    price: 0,
    features: [
      'basic_practice_tracking',    // 基礎實踐追蹤
      'default_card_colors',         // 默認卡片顏色
      'community_access',            // 社群訪問
      'basic_analytics'              // 基礎數據分析
    ]
  },
  PREMIUM: {
    id: 2,
    name: 'premium',
    displayName: 'Premium',
    price: 299,  // TWD/月
    features: [
      'basic_practice_tracking',
      'custom_card_colors',          // 自定義卡片顏色
      'extended_color_palette',      // 擴展色板
      'advanced_analytics',          // 進階數據分析
      'priority_support',            // 優先客服
      'export_data',                 // 數據導出
      'ai_recommendations'           // AI 推薦
    ],
    permissions: [
      'practice:customize_color',
      'analytics:advanced',
      'export:data'
    ]
  }
};
```

## 權限控制系統

### 三層權限模型

```
用戶 (users)
  ↓ role_id
角色 (roles)
  ↓ role_permissions
權限 (permissions)
  ↓ resource:action
功能訪問控制
```

### 數據模型

#### 角色表 (roles)

```prisma
model roles {
  id          Int       @id @default(autoincrement())
  name        String    @unique @db.VarChar(50)
  description String?

  role_permissions role_permissions[]
  users            users[]
}
```

**系統角色**:
```typescript
export const ROLES = {
  SUPER_ADMIN: 'super_admin',   // 超級管理員
  ADMIN: 'admin',                // 管理員
  MODERATOR: 'moderator',        // 審核員
  EDITOR: 'editor',              // 編輯
  USER: 'user',                  // 一般用戶
  GUEST: 'guest'                 // 訪客
};
```

#### 權限表 (permissions)

```prisma
model permissions {
  id          Int       @id @default(autoincrement())
  resource    String    @db.VarChar(50)   // 資源名稱（如 practice, user）
  action      String    @db.VarChar(50)   // 動作（如 create, read, update）
  description String?

  role_permissions  role_permissions[]
  user_permissions  user_permissions[]
}
```

**權限命名規則**: `resource:action`

**權限範例**:
```typescript
export const PERMISSIONS = {
  PRACTICE: {
    CREATE: 'practice:create',
    READ: 'practice:read',
    UPDATE: 'practice:update',
    DELETE: 'practice:delete',
    CUSTOMIZE_COLOR: 'practice:customize_color'  // 自定義顏色
  },
  RESOURCE: {
    CREATE: 'resource:create',
    READ: 'resource:read',
    UPDATE: 'resource:update',
    DELETE: 'resource:delete'
  },
  ADMIN: {
    DASHBOARD: 'admin:dashboard',
    SETTINGS: 'admin:settings',
    ANALYTICS: 'admin:analytics'
  }
};
```

#### 角色權限關聯 (role_permissions)

```prisma
model role_permissions {
  role_id       Int
  permission_id Int

  @@id([role_id, permission_id])
  roles       roles       @relation(...)
  permissions permissions @relation(...)
}
```

#### 用戶直接權限 (user_permissions)

```prisma
model user_permissions {
  user_id       Int
  permission_id Int
  granted_by    Int?          // 授權者
  granted_at    DateTime      @default(now())
  expires_at    DateTime?     // 權限過期時間

  @@id([user_id, permission_id])
  users       users       @relation(...)
  permissions permissions @relation(...)
}
```

### 後端權限驗證

#### 權限服務

**檔案**: `/Users/xiaoxu/Projects/daodao/daodao-server/src/services/auth/permission.service.ts`

**核心方法**:

```typescript
// 檢查單個權限
async hasPermission(userId: number, resource: string, action: string): Promise<boolean>

// 檢查任一權限
async hasAnyPermission(userId: number, permissions: PermissionCheck[]): Promise<boolean>

// 檢查所有權限
async hasAllPermissions(userId: number, permissions: PermissionCheck[]): Promise<boolean>

// 檢查角色
async hasRole(userId: number, roleName: string): Promise<boolean>

// 檢查是否為資源擁有者
async isResourceOwner(userId: number, resourceType: string, resourceId: string): Promise<boolean>
```

**權限檢查邏輯**:
1. 超級管理員自動通過所有權限檢查
2. 檢查用戶角色關聯的權限
3. 檢查用戶直接分配的權限（user_permissions）
4. 檢查權限是否過期

#### 權限中間件

**檔案**: `/Users/xiaoxu/Projects/daodao/daodao-server/src/middleware/permission.middleware.ts`

**主要函數**:

```typescript
// 要求特定權限
requirePermission(options: PermissionMiddlewareOptions)

// 要求特定角色
requireRole(roles: string | string[])

// 要求管理員權限
requireAdmin()

// 要求超級管理員權限
requireSuperAdmin()

// 要求資源擁有權
requireOwnership(options: OwnershipOptions)

// 組合權限邏輯（任一權限即可）
requireAnyOf(options: PermissionOptions[])
```

**中間件選項**:
```typescript
interface PermissionMiddlewareOptions {
  permissions?: PermissionOptions[];  // 權限列表
  roles?: string[];                   // 角色列表
  requireAll?: boolean;               // 是否需要所有權限
  allowTemp?: boolean;                // 是否允許臨時用戶
  allowSelf?: boolean;                // 是否允許對自己的資源操作
  resourceParam?: string;             // 資源 ID 參數名（如 ':id'）
  resourceType?: string;              // 資源類型（如 'practice'）
}
```

**使用範例**:
```typescript
// 要求用戶有 practice:update 權限，或者是資源擁有者
router.put(
  '/practices/:id',
  authenticate,
  requirePermission({
    permissions: [{ resource: 'practice', action: 'update' }],
    allowSelf: true,       // 允許修改自己的實踐
    resourceParam: 'id',
    resourceType: 'practice'
  }),
  practiceController.update
);

// 要求管理員或審核員角色
router.post(
  '/practices/:id/approve',
  authenticate,
  requireRole(['admin', 'moderator']),
  practiceController.approve
);
```

### 前端權限控制

#### 認證上下文

**檔案**: `/Users/xiaoxu/Projects/daodao/daodao-f2e/entities/user/model/auth-context.tsx`

**提供的 Hooks**:
```typescript
// 認證狀態
const { isLoggedIn, isLoggingIn, user, token } = useAuth();

// 認證操作
const { login, logout, refreshUser } = useAuthActions();
```

**用戶資料結構**:
```typescript
interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: RoleEnum;
  permissions?: string[];           // 用戶權限列表
  subscription?: {                  // 訂閱資訊
    status: 'active' | 'canceled' | 'expired';
    plan: {
      id: number;
      name: string;
      features: string[];
    };
    startDate: string;
    endDate?: string;
  };
}
```

#### 權限保護組件

**檔案**: `/Users/xiaoxu/Projects/daodao/daodao-f2e/entities/user/ui/protected-component.tsx`

**使用方式**:
```tsx
<ProtectedComponent
  checkUserAuthorized={(user) => {
    // 自定義權限檢查邏輯
    return user.subscription?.status === 'active';
  }}
  noPermissionFallback={<UpgradePrompt />}
  skeleton={<LoadingSkeleton />}
>
  {/* 受保護的內容 */}
  <PremiumFeature />
</ProtectedComponent>
```

**Props**:
```typescript
interface ProtectedComponentProps {
  onlyCheckToken?: boolean;                                      // 只檢查 token
  fallback?: React.ReactNode;                                    // 未登入時顯示
  noPermissionFallback?: React.ReactNode;                        // 無權限時顯示
  skeleton?: React.ReactNode;                                    // 加載中顯示
  checkUserAuthorized?: (user: UserProfile) => boolean | Promise<boolean>;  // 自定義權限檢查
}
```

#### 認證守衛按鈕

**檔案**: `/Users/xiaoxu/Projects/daodao/daodao-f2e/entities/user/ui/auth-guard-button.tsx`

**使用方式**:
```tsx
<AuthGuardButton onClick={handlePremiumAction}>
  使用進階功能
</AuthGuardButton>
```

**行為**:
- 未登入：打開登入模態框
- 已登入：執行 onClick 回調

## 用戶偏好設置系統

### 數據模型

#### 偏好類型 (preference_types)

```prisma
model preference_types {
  id              Int       @id @default(autoincrement())
  name            String    @unique @db.VarChar(50)
  value           String    @unique @db.VarChar(50)
  max_selections  Int?      @default(3)        // 最大選擇數量
  display_order   Int?      @default(0)        // 顯示順序

  preference_options preference_options[]
}
```

**偏好類型範例**:
- `goals`: 目標（職涯技能、個人興趣等）
- `learningStyle`: 學習方式（循序漸進、自由探索等）
- `timeCommitment`: 時間投入（短期每日、每週聚焦等）
- `interactionStyle`: 互動方式（獨立學習、同儕支持等）
- `feedbackStyle`: 反饋方式（詳細解說、鼓勵支持等）

#### 偏好選項 (preference_options)

```prisma
model preference_options {
  id                  Int       @id @default(autoincrement())
  preference_type_id  Int
  value               String    @db.VarChar(50)
  label_key           String    @db.VarChar(100)  // 多語系標籤 key
  description         String?
  is_active           Boolean   @default(true)

  preference_types  preference_types    @relation(...)
  user_preferences  user_preferences[]
}
```

#### 用戶偏好 (user_preferences)

```prisma
model user_preferences {
  id                   Int       @id @default(autoincrement())
  user_id              Int
  preference_option_id Int
  is_selected          Boolean   @default(false)
  preference_weight    Decimal?  @db.Decimal(3, 2)  // 偏好權重 (0.00-1.00)
  last_accessed_at     DateTime?
  access_count         Int?      @default(0)

  users               users               @relation(...)
  preference_options  preference_options  @relation(...)

  @@unique([user_id, preference_option_id])
}
```

**關鍵特性**:
- `preference_weight`: 權重化偏好，用於推薦算法
- `access_count`: 訪問計數，用於優化推薦
- `last_accessed_at`: 最後訪問時間

### API 接口

**檔案**: `/Users/xiaoxu/Projects/daodao/daodao-server/src/routes/me.routes.ts`

```typescript
// GET /api/v1/me/preferences - 獲取用戶偏好
router.get('/preferences', authenticate, meController.getMyPreferences);

// PUT /api/v1/me/preferences - 更新用戶偏好
router.put('/preferences', authenticate, meController.updateMyPreferences);
```

**請求格式**:
```json
{
  "preferences": [
    {
      "preferenceTypeId": 1,
      "optionId": 1,
      "isSelected": true,
      "weight": 0.8
    }
  ]
}
```

### 前端實現

**偏好設置編輯器**: `/Users/xiaoxu/Projects/daodao/daodao-f2e/widgets/preferences/ui/preferences-settings-editor.tsx`

**技術棧**:
- React Hook Form + Zod 驗證
- Shadcn/ui 組件
- 多語系支持 (next-intl)

## 進階功能實現模式

### 功能分級策略

**基礎功能**（所有用戶）:
```typescript
const basicFeatures = [
  '主題實踐追蹤',
  '默認卡片顏色（4色循環）',
  '社群互動',
  '基礎數據統計'
];
```

**進階功能**（Premium 用戶）:
```typescript
const premiumFeatures = [
  '自定義卡片顏色（12色色板）',
  '進階數據分析',
  'AI 推薦',
  '數據導出',
  '優先客服'
];
```

### 實現檢查清單

當添加新的進階功能時，按照以下步驟進行：

#### 1. 後端實現

- [ ] **數據庫變更**
  - 添加必要的欄位到相關表
  - 創建遷移腳本
  - 更新 Prisma schema

- [ ] **權限定義**
  - 在 `permissions.ts` 添加新權限
  - 更新訂閱方案配置
  - 將權限關聯到 Premium 方案

- [ ] **API 端點**
  - 添加/更新 API 路由
  - 添加權限中間件
  - 實現業務邏輯
  - 添加數據驗證

#### 2. 前端實現

- [ ] **權限檢查 Hook**
  - 創建自定義 Hook（如 `usePracticeColorPermission`）
  - 檢查訂閱狀態或權限
  - 提供可用功能列表

- [ ] **UI 組件**
  - 使用 `ProtectedComponent` 包裝進階功能
  - 實現 `noPermissionFallback` 提示組件
  - 添加升級引導按鈕

- [ ] **鎖定狀態設計**
  ```tsx
  <ProtectedComponent
    checkUserAuthorized={(user) => checkPremiumFeature(user)}
    noPermissionFallback={
      <LockedFeaturePrompt
        featureName="自定義顏色"
        upgradeUrl="/pricing"
      />
    }
  >
    <PremiumFeature />
  </ProtectedComponent>
  ```

#### 3. 測試

- [ ] 後端測試
  - 權限驗證測試
  - API 端點測試
  - 邊界條件測試

- [ ] 前端測試
  - 免費用戶體驗測試
  - Premium 用戶體驗測試
  - 權限切換測試

## 設計模式總結

### 權限檢查模式

**後端**:
```typescript
// 1. 基於角色
requireRole(['admin', 'moderator'])

// 2. 基於權限
requirePermission({
  permissions: [{ resource: 'practice', action: 'customize_color' }]
})

// 3. 基於擁有權
requirePermission({
  permissions: [{ resource: 'practice', action: 'update' }],
  allowSelf: true,
  resourceParam: 'id',
  resourceType: 'practice'
})

// 4. 組合權限
requireAnyOf([
  { resource: 'practice', action: 'update' },
  { resource: 'practice', action: 'admin' }
])
```

**前端**:
```typescript
// 1. 基於訂閱
const canUseFeature = user?.subscription?.status === 'active' &&
                      user?.subscription?.plan?.features?.includes('custom_colors');

// 2. 基於權限
const canUseFeature = user?.permissions?.includes('practice:customize_color');

// 3. 使用自定義 Hook
const { canCustomizeColor } = usePracticeColorPermission();

// 4. 使用 ProtectedComponent
<ProtectedComponent checkUserAuthorized={(user) => checkFeature(user)}>
  <Feature />
</ProtectedComponent>
```

### 升級引導模式

```tsx
// 鎖定狀態組件模板
const LockedFeaturePrompt = ({ featureName, description, upgradeUrl }) => (
  <div className="relative">
    {/* 模糊的功能預覽 */}
    <div className="opacity-50 blur-sm pointer-events-none">
      <FeaturePreview />
    </div>

    {/* 升級提示覆蓋層 */}
    <div className="absolute inset-0 flex items-center justify-center">
      <Card className="p-6 text-center space-y-3">
        <Lock className="w-8 h-8 mx-auto text-gray-400" />
        <h3 className="font-semibold">{featureName}</h3>
        <p className="text-sm text-gray-600">{description}</p>
        <Button asChild>
          <Link href={upgradeUrl}>升級至 Premium</Link>
        </Button>
      </Card>
    </div>
  </div>
);
```

## 關鍵檔案索引

### 後端

**架構核心**:
- `/Users/xiaoxu/Projects/daodao/daodao-server/prisma/schema.prisma` - 數據庫 Schema
- `/Users/xiaoxu/Projects/daodao/daodao-server/src/constants/permissions.ts` - 權限定義
- `/Users/xiaoxu/Projects/daodao/daodao-server/src/constants/roles.ts` - 角色定義

**權限系統**:
- `/Users/xiaoxu/Projects/daodao/daodao-server/src/middleware/permission.middleware.ts` - 權限中間件
- `/Users/xiaoxu/Projects/daodao/daodao-server/src/services/auth/permission.service.ts` - 權限服務

**API**:
- `/Users/xiaoxu/Projects/daodao/daodao-server/src/routes/me.routes.ts` - 用戶相關路由
- `/Users/xiaoxu/Projects/daodao/daodao-server/src/routes/practice.routes.ts` - 實踐相關路由

### 前端

**認證與權限**:
- `/Users/xiaoxu/Projects/daodao/daodao-f2e/entities/user/model/auth-context.tsx` - 認證上下文
- `/Users/xiaoxu/Projects/daodao/daodao-f2e/entities/user/ui/protected-component.tsx` - 權限保護組件
- `/Users/xiaoxu/Projects/daodao/daodao-f2e/entities/user/ui/auth-guard-button.tsx` - 認證守衛按鈕

**用戶設置**:
- `/Users/xiaoxu/Projects/daodao/daodao-f2e/widgets/account/ui/account-settings-editor.tsx` - 賬戶設置
- `/Users/xiaoxu/Projects/daodao/daodao-f2e/widgets/preferences/ui/preferences-settings-editor.tsx` - 偏好設置

**訂閱相關**:
- `/Users/xiaoxu/Projects/daodao/daodao-f2e/widgets/landing-page/ui/plan-section.tsx` - 訂閱方案展示

## 最佳實踐

### 1. 漸進式權限設計

- 所有功能先以基礎版本開放
- 識別可以增值的進階功能
- 設計合理的功能分級
- 避免過度限制基礎功能

### 2. 優雅的權限提示

- 不隱藏進階功能，使用鎖定狀態
- 清晰說明升級後的好處
- 提供一鍵升級流程
- 避免打斷用戶工作流程

### 3. 靈活的權限配置

- 使用資料庫存儲權限配置
- 支持動態調整功能訪問
- 支持臨時權限和試用期
- 提供權限過期機制

### 4. 前後端一致性

- 前後端使用相同的權限標識符
- 前端檢查用於 UX，後端檢查用於安全
- 權限錯誤提供有意義的提示
- 統一的權限檢查邏輯

### 5. 測試覆蓋

- 測試所有權限分支
- 測試權限過期場景
- 測試訂閱狀態變更
- 測試降級後的體驗
