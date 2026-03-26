# 興趣領域 Bug 技術分析文件

## 目錄
1. [問題概述](#問題概述)
2. [根本原因分析](#根本原因分析)
3. [程式碼結構分析](#程式碼結構分析)
4. [資料流程圖](#資料流程圖)
5. [受影響的檔案清單](#受影響的檔案清單)
6. [解決方案建議](#解決方案建議)

---

## 問題概述

### Bug 描述
使用者在編輯個人資訊時選擇興趣領域，前端介面提供了 14 個選項，但只有 3-5 個選項能成功儲存到後端資料庫。其餘 9-11 個選項會被後端靜默忽略，導致使用者選擇遺失。

### 影響範圍
- **影響功能**: 新使用者註冊流程、個人資料編輯
- **影響使用者**: 所有試圖設定興趣領域的使用者
- **嚴重程度**: 高（資料遺失、使用者體驗問題）

---

## 根本原因分析

### 問題根源：命名不一致

**前端定義的興趣領域名稱** 與 **後端資料庫的分類名稱** 不匹配，導致後端無法找到對應的分類 ID。

#### 前端傳送的值（簡短格式）
檔案位置: `daodao-f2e/entities/user/model/constants.ts:134-149`

```typescript
export const INTEREST_AREAS: OptionProps[] = [
  { value: 'nature', label: '自然與環境' },
  { value: 'math_logic', label: '數理邏輯' },
  { value: 'information', label: '資訊與電腦科學' },
  { value: 'language', label: '語言' },
  { value: 'humanities', label: '人文史地' },
  { value: 'social_psychology', label: '社會與心理學' },
  { value: 'education', label: '教育與學習' },
  { value: 'business_finance', label: '商管與理財' },
  { value: 'arts_design', label: '藝術與設計' },
  { value: 'lifestyle', label: '生活品味' },
  { value: 'social_innovation', label: '社會創新與永續' },
  { value: 'sports', label: '醫藥與運動' },
  { value: 'personal_development', label: '個人發展' },
  { value: 'other', label: '其他' },
];
```

#### 後端資料庫的分類名稱（完整格式）
檔案位置: `daodao-storage/init-scripts-refactored/998_insert_categories_data.sql:13-30`

```sql
INSERT INTO categories (name, parent_id) VALUES ('nature_environment', NULL);
INSERT INTO categories (name, parent_id) VALUES ('mathematical_logic', NULL);
INSERT INTO categories (name, parent_id) VALUES ('humanities_history_geography', NULL);
INSERT INTO categories (name, parent_id) VALUES ('law_politics_military', NULL);
INSERT INTO categories (name, parent_id) VALUES ('education_learning', NULL);
INSERT INTO categories (name, parent_id) VALUES ('business_management_finance', NULL);
INSERT INTO categories (name, parent_id) VALUES ('languages', NULL);
INSERT INTO categories (name, parent_id) VALUES ('engineering', NULL);
INSERT INTO categories (name, parent_id) VALUES ('sociology_psychology', NULL);
INSERT INTO categories (name, parent_id) VALUES ('mass_communication', NULL);
INSERT INTO categories (name, parent_id) VALUES ('lifestyle', NULL);
INSERT INTO categories (name, parent_id) VALUES ('information_computer_science', NULL);
INSERT INTO categories (name, parent_id) VALUES ('arts_design', NULL);
INSERT INTO categories (name, parent_id) VALUES ('social_innovation_sustainability', NULL);
INSERT INTO categories (name, parent_id) VALUES ('medicine_sports', NULL);
INSERT INTO categories (name, parent_id) VALUES ('personal_development', NULL);
INSERT INTO categories (name, parent_id) VALUES ('others', NULL);
```

#### 名稱對照表

| 前端 value | 後端 category name | 狀態 | 說明 |
|-----------|-------------------|------|------|
| `nature` | `nature_environment` | ❌ 不匹配 | 缺少 `_environment` |
| `math_logic` | `mathematical_logic` | ❌ 不匹配 | `math` vs `mathematical` |
| `information` | `information_computer_science` | ❌ 不匹配 | 缺少 `_computer_science` |
| `language` | `languages` | ❌ 不匹配 | 單數 vs 複數 |
| `humanities` | `humanities_history_geography` | ❌ 不匹配 | 缺少 `_history_geography` |
| `social_psychology` | `sociology_psychology` | ❌ 不匹配 | `social` vs `sociology` |
| `education` | `education_learning` | ❌ 不匹配 | 缺少 `_learning` |
| `business_finance` | `business_management_finance` | ❌ 不匹配 | 缺少 `_management` |
| `arts_design` | `arts_design` | ✅ 匹配 | 完全相同 |
| `lifestyle` | `lifestyle` | ✅ 匹配 | 完全相同 |
| `social_innovation` | `social_innovation_sustainability` | ❌ 不匹配 | 缺少 `_sustainability` |
| `sports` | `medicine_sports` | ❌ 不匹配 | 缺少 `medicine_` |
| `personal_development` | `personal_development` | ✅ 匹配 | 完全相同 |
| `other` | `others` | ❌ 不匹配 | 單數 vs 複數 |

**結論**: 14 個選項中只有 3 個完全匹配！
- ✅ 可儲存: `arts_design`, `lifestyle`, `personal_development`
- ❌ 無法儲存: 其餘 11 個選項

---

## 程式碼結構分析

### 1. 前端架構

#### 1.1 常數定義
**檔案**: `daodao-f2e/entities/user/model/constants.ts`

```typescript
/**
 * 興趣領域選項
 * 問題: value 使用簡短格式,與後端資料庫不一致
 */
export const INTEREST_AREAS: OptionProps[] = [
  { value: 'nature', label: '自然與環境' },
  // ... 其他選項
];

export const interestAreasEnum = optionListToEnum(INTEREST_AREAS);
```

**職責**:
- 定義前端表單可選的興趣領域
- 提供給註冊流程和個人資料編輯使用

#### 1.2 註冊流程 - 興趣選擇步驟
**檔案**: `daodao-f2e/widgets/auth/ui/steps/interests-step.tsx`

```tsx
<FormCheckboxGroup
  name="interestList"
  options={INTEREST_AREAS}
  max={5}
  label="興趣領域"
/>
```

**職責**:
- 呈現興趣領域選擇介面
- 限制最多選擇 5 個
- 將使用者選擇綁定到表單的 `interestList` 欄位

#### 1.3 表單驗證
**檔案**: `daodao-f2e/widgets/auth/model/onboarding-schema.ts`

```typescript
interestList: z
  .array(z.string())
  .min(1, '請至少選擇一個興趣領域')
  .max(5, '最多只能選擇五個興趣領域'),
```

**職責**:
- 驗證使用者至少選擇 1 個,最多 5 個興趣
- 不驗證值的格式或是否存在於資料庫

#### 1.4 API 呼叫
**檔案**: `daodao-f2e/entities/user/model/auth-context.tsx:87-136`

```typescript
const updateUser = useCallback<AuthActions['updateUser']>(
  async (input) => {
    if (isTemporary(state, input)) {
      // 臨時用戶轉為正式用戶
      const { data, error } = await client.POST('/api/v1/users/me', {
        body: input, // 包含 interestList: string[]
      });
    }
    if (isPermanent(state, input)) {
      // 更新現有用戶
      const { data, error } = await client.PUT('/api/v1/users/me', {
        body: removeNullValues(updatedUser),
      });
    }
  },
  [state, user, mutate, setToken, handleError]
);
```

**職責**:
- 將表單資料（包含 `interestList`）傳送到後端 API
- 處理 token 更新和錯誤處理
- 更新 SWR 快取

**問題點**: 直接傳送前端定義的值,沒有進行名稱轉換

---

### 2. 後端架構

#### 2.1 API 路由
**檔案**: `daodao-server/src/routes/user.routes.ts`

```typescript
// POST /api/v1/users/me - 建立用戶（註冊）
router.post('/me',
  authenticate,
  validateRequest({ body: createUserSchema }),
  userController.createUser
);

// PUT /api/v1/users/me - 更新當前用戶
router.put('/me',
  authenticate,
  validateRequest({ body: updateUserSchema }),
  userController.updateMe
);
```

**職責**:
- 定義 API 端點
- 套用認證中介層
- 使用 Zod schema 驗證請求

#### 2.2 控制器
**檔案**: `daodao-server/src/controllers/user.controller.ts`

```typescript
// 建立用戶 (第109-130行)
const createUser = async (req: Request, res: Response) => {
  const userData: CreateUserRequest = req.body;
  const tempUserId = req.user?.external_id;

  const result = await userService.createUser(userData, tempUserId);
  res.status(201).json(result);
};

// 更新用戶 (第136-150行)
const updateMe = async (req: Request, res: Response) => {
  const userData: UpdateUserRequest = req.body;
  const externalId = req.user?.external_id;

  const result = await userService.updateUser(externalId, userData);
  res.status(200).json(result);
};
```

**職責**:
- 接收 HTTP 請求
- 呼叫 service 層處理業務邏輯
- 返回標準化的 API 回應

#### 2.3 服務層 - 核心邏輯
**檔案**: `daodao-server/src/services/user.service.ts`

##### 設置用戶興趣 (第56-85行)
```typescript
const setUserInterests = async (
  userId: number,
  categoryNames: string[], // 接收 category names 陣列
  tx: PrismaTransaction
): Promise<void> => {
  // 1. 刪除現有興趣
  await tx.user_interests.deleteMany({
    where: { user_id: userId }
  });

  // 2. 將 category names 轉換為 IDs
  if (categoryNames && categoryNames.length > 0) {
    const categories = await tx.categories.findMany({
      where: { name: { in: categoryNames } }, // 🔴 問題點: 如果名稱不存在,返回空陣列
      select: { id: true }
    });
    const categoryIds = categories.map((c) => c.id);

    // 3. 批量新增興趣
    if (categoryIds.length > 0) {
      await tx.user_interests.createMany({
        data: categoryIds.map(categoryId => ({
          user_id: userId,
          category_id: categoryId
        }))
      });
    }
    // 🔴 問題點: 如果 categoryIds 為空,不會拋出錯誤,靜默失敗
  }
};
```

**問題分析**:
1. 查詢使用 `where: { name: { in: categoryNames } }`
2. 如果前端傳來的名稱（如 `'nature'`）在資料庫中不存在
3. `categories.findMany()` 返回空陣列
4. `categoryIds` 為空
5. 不會新增任何記錄,也不會拋出錯誤
6. **結果**: 使用者以為已儲存,實際上資料遺失

##### 建立用戶 (第639-863行)
```typescript
const createUser = async (
  userData: CreateUserRequest,
  tempUserId: string
): Promise<ApiSuccessResponse<{ user: FormattedUserResponse; token: string }>> => {
  // ... 交易處理

  // 處理興趣資料 (第824-826行)
  if (userData.interestList && userData.interestList.length > 0) {
    await setUserInterests(newUser.id, userData.interestList, tx);
  }

  // ... 返回結果
};
```

##### 更新用戶 (第868-1082行)
```typescript
const updateUser = async (
  externalId: string,
  userData: UpdateUserRequest
): Promise<ApiSuccessResponse<FormattedUserResponse>> => {
  // ... 交易處理

  // 處理興趣更新 (第1028-1031行)
  if (userData.interestList) {
    await setUserInterests(userId, userData.interestList, tx);
  }

  // ... 返回結果
};
```

#### 2.4 資料驗證
**檔案**: `daodao-server/src/validators/user.validators.ts:28-40`

```typescript
const interestListSchema = z
  .array(z.string())
  .max(5, '最多選擇 5 個興趣')
  .optional()
  .describe("興趣分類清單 (category names)")
  .meta({
    title: "興趣清單",
    examples: [
      ["information_computer_science", "education_learning"], // ✅ 正確格式
      ["nature_environment", "arts_design"]                    // ✅ 正確格式
    ]
  });
```

**注意**:
- 文件範例顯示應使用完整的資料庫名稱
- 但沒有對值進行實際驗證（沒有 enum 限制）
- 允許任何字串通過驗證

#### 2.5 TypeScript 型別定義
**檔案**: `daodao-server/src/types/user.types.ts:68`

```typescript
export interface CreateUserRequest {
  // ...
  interestList?: string[]; // category names 陣列 (例如: ["education_learning", "nature_environment"])
  // ...
}
```

**注意**: 型別註解明確說明應使用完整的資料庫名稱

---

### 3. 資料庫結構

#### 3.1 Categories 表
**檔案**: `daodao-storage/init-scripts-refactored/430_create_table_categories.sql`

```sql
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  parent_id INTEGER REFERENCES categories(id),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**特性**:
- `name` 欄位必須唯一
- 支援階層式結構（`parent_id`）
- 包含 17 個主分類 + 100+ 個子分類

#### 3.2 User_interests 表
**檔案**: `daodao-server/prisma/schema.prisma:985-997`

```prisma
model user_interests {
  id          Int        @id @default(autoincrement())
  user_id     Int
  category_id Int
  created_at  DateTime?  @default(now()) @db.Timestamptz(6)
  updated_at  DateTime?  @default(now()) @db.Timestamptz(6)
  categories  categories @relation(fields: [category_id], references: [id])
  users       users      @relation(fields: [user_id], references: [id])

  @@unique([user_id, category_id])
  @@index([category_id])
  @@index([user_id])
}
```

**特性**:
- 多對多關係表（使用者 ↔ 分類）
- 複合唯一索引（避免重複）
- 外鍵約束保證資料完整性

---

## 資料流程圖

### 當前錯誤流程

```
前端 (User Input)
  │
  ├─ 使用者選擇: ["nature", "math_logic", "arts_design", "lifestyle"]
  │
  ▼
前端常數 (constants.ts)
  │
  ├─ INTEREST_AREAS 定義簡短格式
  │   value: 'nature', 'math_logic', 'arts_design', 'lifestyle'
  │
  ▼
表單驗證 (onboarding-schema.ts)
  │
  ├─ Zod 驗證: 1-5 個字串 ✅ 通過
  │
  ▼
API 呼叫 (auth-context.tsx)
  │
  ├─ POST /api/v1/users/me
  ├─ body: { interestList: ["nature", "math_logic", "arts_design", "lifestyle"] }
  │
  ▼
後端路由 (user.routes.ts)
  │
  ├─ 認證中介層 ✅
  ├─ Zod 驗證: string[] ✅ 通過（沒有檢查值的有效性）
  │
  ▼
控制器 (user.controller.ts)
  │
  ├─ createUser(req, res)
  │
  ▼
服務層 (user.service.ts)
  │
  ├─ setUserInterests(userId, ["nature", "math_logic", "arts_design", "lifestyle"], tx)
  │
  ▼
資料庫查詢
  │
  ├─ SELECT id FROM categories
  │   WHERE name IN ('nature', 'math_logic', 'arts_design', 'lifestyle')
  │
  ├─ 查詢結果:
  │   ├─ 'nature' → ❌ 找不到 (資料庫是 'nature_environment')
  │   ├─ 'math_logic' → ❌ 找不到 (資料庫是 'mathematical_logic')
  │   ├─ 'arts_design' → ✅ 找到 (ID: 26)
  │   └─ 'lifestyle' → ✅ 找到 (ID: 24)
  │
  ├─ categoryIds = [26, 24]  // 只有 2 個!
  │
  ▼
插入資料
  │
  ├─ INSERT INTO user_interests (user_id, category_id)
  │   VALUES (123, 26), (123, 24)
  │
  └─ 結果: 只儲存了 arts_design 和 lifestyle
      ⚠️  使用者選的 nature 和 math_logic 遺失了!
```

### 期望的正確流程

```
前端 (User Input)
  │
  ├─ 使用者選擇: ["自然與環境", "數理邏輯", "藝術與設計", "生活品味"]
  │
  ▼
前端常數 (constants.ts) - 修正後
  │
  ├─ INTEREST_AREAS 使用完整資料庫名稱
  │   value: 'nature_environment', 'mathematical_logic',
  │          'arts_design', 'lifestyle'
  │
  ▼
API 呼叫
  │
  ├─ body: { interestList: ["nature_environment", "mathematical_logic",
  │                          "arts_design", "lifestyle"] }
  │
  ▼
資料庫查詢
  │
  ├─ SELECT id FROM categories
  │   WHERE name IN ('nature_environment', 'mathematical_logic',
  │                  'arts_design', 'lifestyle')
  │
  ├─ 查詢結果:
  │   ├─ 'nature_environment' → ✅ 找到 (ID: 14)
  │   ├─ 'mathematical_logic' → ✅ 找到 (ID: 15)
  │   ├─ 'arts_design' → ✅ 找到 (ID: 26)
  │   └─ 'lifestyle' → ✅ 找到 (ID: 24)
  │
  ├─ categoryIds = [14, 15, 26, 24]  // 全部 4 個! ✅
  │
  ▼
插入資料
  │
  ├─ INSERT INTO user_interests (user_id, category_id)
  │   VALUES (123, 14), (123, 15), (123, 26), (123, 24)
  │
  └─ 結果: 全部 4 個興趣都成功儲存! ✅
```

---

## 受影響的檔案清單

### 前端檔案

| 檔案路徑 | 影響類型 | 說明 |
|---------|---------|------|
| `daodao-f2e/entities/user/model/constants.ts` | 🔴 核心問題 | INTEREST_AREAS 定義錯誤的 value |
| `daodao-f2e/widgets/auth/ui/steps/interests-step.tsx` | 🟡 間接影響 | 使用 INTEREST_AREAS 渲染選項 |
| `daodao-f2e/widgets/auth/model/onboarding-schema.ts` | 🟡 需加強驗證 | 應驗證 interestList 的值是否有效 |
| `daodao-f2e/entities/user/model/auth-context.tsx` | 🟡 間接影響 | 傳送 interestList 到 API |
| `daodao-f2e/widgets/user/ui/user-profile-editor.tsx` | 🟢 未實作 | 目前不包含興趣編輯功能 |

### 後端檔案

| 檔案路徑 | 影響類型 | 說明 |
|---------|---------|------|
| `daodao-server/src/services/user.service.ts` | 🔴 核心邏輯 | setUserInterests 靜默失敗 |
| `daodao-server/src/validators/user.validators.ts` | 🟡 需加強驗證 | interestListSchema 沒有 enum 限制 |
| `daodao-server/src/types/user.types.ts` | 🟢 文件正確 | 註解說明應使用完整名稱 |
| `daodao-server/src/controllers/user.controller.ts` | 🟢 無需修改 | 只是轉發請求 |
| `daodao-server/src/routes/user.routes.ts` | 🟢 無需修改 | 路由定義正確 |

### 資料庫檔案

| 檔案路徑 | 影響類型 | 說明 |
|---------|---------|------|
| `daodao-storage/init-scripts-refactored/998_insert_categories_data.sql` | 🟢 資料正確 | 定義了完整的分類名稱 |
| `daodao-storage/init-scripts-refactored/430_create_table_categories.sql` | 🟢 結構正確 | categories 表結構合理 |
| `daodao-server/prisma/schema.prisma` | 🟢 結構正確 | user_interests 關聯正確 |

---

## 解決方案建議

### 方案 A: 修正前端常數（推薦）

**優點**:
- 最小改動
- 與現有資料庫結構一致
- 後端不需修改

**缺點**:
- 需要檢查是否有其他地方使用舊的簡短名稱

**實作步驟**:

1. **修改前端常數** (`daodao-f2e/entities/user/model/constants.ts`)

```typescript
export const INTEREST_AREAS: OptionProps[] = [
  { value: 'nature_environment', label: '自然與環境' },
  { value: 'mathematical_logic', label: '數理邏輯' },
  { value: 'information_computer_science', label: '資訊與電腦科學' },
  { value: 'languages', label: '語言' },
  { value: 'humanities_history_geography', label: '人文史地' },
  { value: 'sociology_psychology', label: '社會與心理學' },
  { value: 'education_learning', label: '教育與學習' },
  { value: 'business_management_finance', label: '商管與理財' },
  { value: 'arts_design', label: '藝術與設計' },
  { value: 'lifestyle', label: '生活品味' },
  { value: 'social_innovation_sustainability', label: '社會創新與永續' },
  { value: 'medicine_sports', label: '醫藥與運動' },
  { value: 'personal_development', label: '個人發展' },
  { value: 'others', label: '其他' },
];
```

2. **加強後端驗證** (`daodao-server/src/validators/user.validators.ts`)

```typescript
// 定義允許的興趣領域
const VALID_INTEREST_CATEGORIES = [
  'nature_environment',
  'mathematical_logic',
  'information_computer_science',
  'languages',
  'humanities_history_geography',
  'sociology_psychology',
  'education_learning',
  'business_management_finance',
  'arts_design',
  'lifestyle',
  'social_innovation_sustainability',
  'medicine_sports',
  'personal_development',
  'others',
] as const;

const interestListSchema = z
  .array(z.enum(VALID_INTEREST_CATEGORIES))
  .max(5, '最多選擇 5 個興趣')
  .optional()
  .describe("興趣分類清單 (category names)");
```

3. **改進錯誤處理** (`daodao-server/src/services/user.service.ts`)

```typescript
const setUserInterests = async (
  userId: number,
  categoryNames: string[],
  tx: PrismaTransaction
): Promise<void> => {
  await tx.user_interests.deleteMany({
    where: { user_id: userId }
  });

  if (categoryNames && categoryNames.length > 0) {
    const categories = await tx.categories.findMany({
      where: { name: { in: categoryNames } },
      select: { id: true, name: true }
    });

    // 🔥 新增: 檢查是否有未找到的分類
    const foundNames = categories.map(c => c.name);
    const missingNames = categoryNames.filter(name => !foundNames.includes(name));

    if (missingNames.length > 0) {
      throw new Error(`找不到以下分類: ${missingNames.join(', ')}`);
    }

    const categoryIds = categories.map((c) => c.id);

    if (categoryIds.length > 0) {
      await tx.user_interests.createMany({
        data: categoryIds.map(categoryId => ({
          user_id: userId,
          category_id: categoryId
        }))
      });
    }
  }
};
```

4. **資料遷移腳本** (修正現有錯誤資料)

```sql
-- 備份現有資料
CREATE TABLE user_interests_backup AS
SELECT * FROM user_interests;

-- 由於舊資料使用錯誤的名稱已無法對應,
-- 建議使用者重新選擇興趣領域
-- 或者可以寫一個腳本嘗試智能對應
```

---

### 方案 B: 新增名稱映射層

**優點**:
- 前端可以保持簡短名稱
- 向後相容

**缺點**:
- 增加維護複雜度
- 需要維護映射表

**實作步驟**:

1. **在後端新增映射函數**

```typescript
// daodao-server/src/utils/interest-mapper.ts
const INTEREST_NAME_MAPPING: Record<string, string> = {
  'nature': 'nature_environment',
  'math_logic': 'mathematical_logic',
  'information': 'information_computer_science',
  'language': 'languages',
  'humanities': 'humanities_history_geography',
  'social_psychology': 'sociology_psychology',
  'education': 'education_learning',
  'business_finance': 'business_management_finance',
  'arts_design': 'arts_design',
  'lifestyle': 'lifestyle',
  'social_innovation': 'social_innovation_sustainability',
  'sports': 'medicine_sports',
  'personal_development': 'personal_development',
  'other': 'others',
};

export const mapInterestNames = (frontendNames: string[]): string[] => {
  return frontendNames.map(name => INTEREST_NAME_MAPPING[name] || name);
};
```

2. **在服務層使用映射**

```typescript
// daodao-server/src/services/user.service.ts
import { mapInterestNames } from '../utils/interest-mapper';

const createUser = async (...) => {
  // ...
  if (userData.interestList && userData.interestList.length > 0) {
    const mappedInterests = mapInterestNames(userData.interestList);
    await setUserInterests(newUser.id, mappedInterests, tx);
  }
  // ...
};
```

**不推薦此方案**: 增加技術債,且前端名稱沒有標準化的必要性。

---

### 方案 C: 動態從資料庫載入選項（最佳長期方案）

**優點**:
- 單一資料來源（資料庫）
- 支援動態新增分類
- 完全避免同步問題

**缺點**:
- 需要新的 API 端點
- 實作複雜度較高

**實作步驟**:

1. **新增 API 端點**

```typescript
// GET /api/v1/categories?type=interest
router.get('/categories', categoryController.getCategories);
```

2. **前端從 API 載入選項**

```typescript
// daodao-f2e/entities/user/api/categories.ts
export const useInterestCategories = () => {
  const { data, error } = useSWR('/api/v1/categories?type=interest', fetcher);

  return {
    categories: data?.data || [],
    isLoading: !error && !data,
    error
  };
};
```

3. **動態渲染表單**

```tsx
const { categories } = useInterestCategories();

<FormCheckboxGroup
  name="interestList"
  options={categories.map(c => ({ value: c.name, label: c.label }))}
  max={5}
/>
```

---

## 建議實施順序

### Phase 1: 緊急修復（1-2 天）
1. ✅ 修正前端 `constants.ts` 中的 value
2. ✅ 後端加入錯誤處理（檢測無效分類名稱）
3. ✅ 部署到測試環境驗證

### Phase 2: 加強驗證（3-5 天）
1. ✅ 後端 Zod schema 加入 enum 驗證
2. ✅ 前端加入前置驗證（可選）
3. ✅ 撰寫單元測試
4. ✅ 部署到生產環境

### Phase 3: 長期改善（1-2 週）
1. ✅ 實作動態分類載入 API
2. ✅ 前端改為從 API 載入選項
3. ✅ 移除硬編碼的常數
4. ✅ 新增個人資料編輯頁面的興趣編輯功能

---

## 測試建議

### 單元測試

```typescript
// daodao-server/src/services/__tests__/user.service.test.ts
describe('setUserInterests', () => {
  it('應該拋出錯誤當分類不存在', async () => {
    await expect(
      setUserInterests(1, ['invalid_category'], mockTx)
    ).rejects.toThrow('找不到以下分類: invalid_category');
  });

  it('應該成功儲存所有有效的分類', async () => {
    await setUserInterests(1, ['lifestyle', 'arts_design'], mockTx);
    expect(mockTx.user_interests.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        { user_id: 1, category_id: 24 },
        { user_id: 1, category_id: 26 },
      ])
    });
  });
});
```

### 整合測試

```typescript
// daodao-server/src/__tests__/integration/user.integration.test.ts
describe('POST /api/v1/users/me', () => {
  it('應該成功建立用戶並儲存所有興趣', async () => {
    const response = await request(app)
      .post('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({
        interestList: ['lifestyle', 'arts_design', 'personal_development']
      });

    expect(response.status).toBe(201);
    expect(response.body.data.user.interestList).toHaveLength(3);
  });

  it('應該返回 400 當興趣分類無效', async () => {
    const response = await request(app)
      .post('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({
        interestList: ['invalid_category']
      });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toContain('找不到以下分類');
  });
});
```

### E2E 測試

```typescript
// daodao-f2e/cypress/e2e/user-registration.cy.ts
describe('使用者註冊流程', () => {
  it('應該成功選擇並儲存興趣領域', () => {
    cy.visit('/auth/register');

    // 選擇興趣
    cy.get('[data-testid="interest-nature_environment"]').click();
    cy.get('[data-testid="interest-mathematical_logic"]').click();
    cy.get('[data-testid="interest-arts_design"]').click();

    // 提交表單
    cy.get('[data-testid="submit-button"]').click();

    // 驗證儲存成功
    cy.get('[data-testid="success-message"]').should('be.visible');

    // 驗證個人資料顯示正確
    cy.visit('/profile/me');
    cy.get('[data-testid="user-interests"]').should('contain', '自然與環境');
    cy.get('[data-testid="user-interests"]').should('contain', '數理邏輯');
    cy.get('[data-testid="user-interests"]').should('contain', '藝術與設計');
  });
});
```

---

## 監控與告警

### 建議新增的監控指標

1. **興趣儲存成功率**
   ```typescript
   // 記錄每次儲存操作的成功/失敗
   logger.info('interest_save_attempt', {
     userId,
     requestedCount: categoryNames.length,
     savedCount: categoryIds.length,
     missingCategories: missingNames
   });
   ```

2. **無效分類名稱追蹤**
   ```typescript
   // 當檢測到無效名稱時記錄
   if (missingNames.length > 0) {
     analytics.track('invalid_interest_categories', {
       categories: missingNames,
       source: 'user_registration'
     });
   }
   ```

3. **Sentry 錯誤追蹤**
   ```typescript
   import * as Sentry from '@sentry/node';

   if (missingNames.length > 0) {
     Sentry.captureMessage('Invalid interest categories detected', {
       level: 'warning',
       extra: {
         userId,
         invalidCategories: missingNames
       }
     });
   }
   ```

---

## 相關文件

- [需求文件](./demand.md)
- [Prisma Schema](../../daodao-server/prisma/schema.prisma)
- [前端開發指南](../../daodao-f2e/CLAUDE.md)
- [後端開發指南](../../daodao-server/CLAUDE.md)

---

## 修訂歷史

| 日期 | 版本 | 修改者 | 說明 |
|------|------|--------|------|
| 2025-12-18 | 1.0 | Claude Code | 初版建立 |

---

**文件狀態**: ✅ 完整分析完成
**下一步行動**: 實施方案 A（修正前端常數）
