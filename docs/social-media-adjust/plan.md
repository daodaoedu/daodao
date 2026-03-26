# 社群連結功能調整規劃文件

## 一、專案背景

### 需求來源
根據 PRD 文件要求，使用者的社群連結應該要支援多種平台和使用者自己的網站。

### 當前問題
- **資料庫層面**: 僅支援 4 個平台 (Instagram, Facebook, Discord, Line)
- **前端層面**: 已支援 6 個平台 (Website, Facebook, Instagram, LinkedIn, Github, Discord)
- **資料不一致**: LinkedIn, Github, Website 僅在前端儲存，無法持久化到資料庫

### 調整目標
統一前後端支援的平台，確保以下 6 個平台完整支援：
1. Website (網站)
2. Facebook
3. Instagram
4. LinkedIn
5. Github
6. Discord

移除目前僅在資料庫的 Line 平台支援（不在 PRD 範圍內）。

---

## 二、現況分析

### 2.1 資料庫層 (4個平台)

**表格結構**: `contacts` 表
```sql
- ig (Instagram)      VARCHAR(30)
- fb (Facebook)       VARCHAR(50)
- discord (Discord)   VARCHAR(37)
- line (LINE)         VARCHAR(20)  ← 需要移除
```

**缺少欄位**:
- website
- linkedin
- github

### 2.2 後端層 (4個平台)

**相關檔案**:
- `daodao-server/prisma/schema.prisma` (L66-77)
- `daodao-server/src/types/user.types.ts` (L52-57, L85-90)
- `daodao-server/src/validators/user.validators.ts` (L76-115)
- `daodao-server/src/services/user.service.ts` (L279-287, L360-368)

**目前支援**: Instagram, Facebook, Discord, Line

**需要新增**: Website, LinkedIn, Github

**需要移除**: Line

### 2.3 前端層 (6個平台) ✓

**相關檔案**:
- `daodao-f2e/entities/user/model/constants.ts` (L189-196)
- `daodao-f2e/shared/ui/social-icon.tsx`
- `daodao-f2e/entities/user/ui/dynamic-contact-selector.tsx`
- `daodao-f2e/widgets/user/ui/user-profile-editor.tsx` (L47-56, L269-280)
- `daodao-f2e/widgets/user/ui/user-profile-widget.tsx` (L46-72)

**目前支援**: Website, Facebook, Instagram, LinkedIn, Github, Discord ✓

**狀態**: 前端已完整支援 PRD 要求的 6 個平台

---

## 三、實施方案

### 3.1 資料庫遷移

#### Step 1: 新增欄位到 contacts 表

**檔案**: `daodao-storage/init-scripts-refactored/100_create_table_contacts.sql`

**新增欄位**:
```sql
ALTER TABLE contacts
ADD COLUMN website VARCHAR(2048),    -- 支援完整的 URL
ADD COLUMN linkedin VARCHAR(100),    -- LinkedIn username/profile
ADD COLUMN github VARCHAR(100);      -- GitHub username
```

**欄位長度考量**:
- `website`: 2048 字元（完整 URL，與 photo_url 保持一致）
- `linkedin`: 100 字元（使用者名稱或自訂 URL）
- `github`: 100 字元（使用者名稱）

#### Step 2: 資料遷移策略

**Line 欄位處理**:
- **不刪除** `line` 欄位（保留歷史資料）
- 在應用層停止使用該欄位
- 未來可以透過單獨的遷移腳本刪除或歸檔

**現有資料**:
- 新欄位預設為 NULL
- 不影響現有使用者資料

#### Step 3: 建立 Prisma 遷移

**檔案**: `daodao-server/prisma/migrations/`

```bash
# 產生遷移檔案
npx prisma migrate dev --name add_social_media_fields

# 遷移內容
ALTER TABLE "contacts"
ADD COLUMN "website" VARCHAR(2048),
ADD COLUMN "linkedin" VARCHAR(100),
ADD COLUMN "github" VARCHAR(100);
```

### 3.2 後端程式碼調整

#### 3.2.1 更新 Prisma Schema

**檔案**: `daodao-server/prisma/schema.prisma` (L66-77)

**修改內容**:
```prisma
model contacts {
  id                 Int      @id @default(autoincrement())
  google_id          String?  @db.VarChar(255)
  photo_url          String?
  is_subscribe_email Boolean?
  email              String?  @db.VarChar(255)

  // 社群連結 (PRD 要求的 6 個平台)
  website            String?  @db.VarChar(2048)  // 新增
  fb                 String?  @db.VarChar(255)
  ig                 String?  @db.VarChar(255)
  linkedin           String?  @db.VarChar(100)   // 新增
  github             String?  @db.VarChar(100)   // 新增
  discord            String?  @db.VarChar(255)

  // 保留但不使用
  line               String?  @db.VarChar(255)

  users              users[]
}
```

#### 3.2.2 更新型別定義

**檔案**: `daodao-server/src/types/user.types.ts`

**修改內容**:
```typescript
// CreateUserRequest 介面 (L52-57)
export interface CreateUserRequest {
  contactList?: {
    website?: string;      // 新增
    facebook?: string;
    instagram?: string;
    linkedin?: string;     // 新增
    github?: string;       // 新增
    discord?: string;
    // 移除 line?: string;
  };
}

// UpdateUserRequest 介面 (L85-90)
export interface UpdateUserRequest {
  contactList?: {
    website?: string;      // 新增
    facebook?: string;
    instagram?: string;
    linkedin?: string;     // 新增
    github?: string;       // 新增
    discord?: string;
    // 移除 line?: string;
  };
}

// 回傳資料型別 (L146-154)
contactList: {
  email: string | null;
  photoURL: string | null;
  isSubscribeEmail: boolean | null;
  website: string | null;      // 新增
  facebook: string | null;
  instagram: string | null;
  linkedin: string | null;     // 新增
  github: string | null;       // 新增
  discord: string | null;
  // 移除 line
}
```

#### 3.2.3 更新驗證 Schema

**檔案**: `daodao-server/src/validators/user.validators.ts` (L76-115)

**修改內容**:
```typescript
const contactListSchema = z.object({
  website: z.string()
    .url("請輸入有效的網址")
    .optional()
    .describe("個人網站或部落格")
    .meta({
      title: "Website",
      examples: ["https://example.com", "https://blog.example.com"]
    }),

  facebook: z.string()
    .optional()
    .describe("Facebook 帳號")
    .meta({
      title: "Facebook",
      examples: ["john.doe.fb", "user123facebook"]
    }),

  instagram: z.string()
    .optional()
    .describe("Instagram 帳號")
    .meta({
      title: "Instagram",
      examples: ["@john_doe", "@user123", "john.doe"]
    }),

  linkedin: z.string()
    .optional()
    .describe("LinkedIn 帳號或自訂 URL")
    .meta({
      title: "LinkedIn",
      examples: ["john-doe", "in/john-doe"]
    }),

  github: z.string()
    .optional()
    .describe("GitHub 帳號")
    .meta({
      title: "GitHub",
      examples: ["johndoe", "user123"]
    }),

  discord: z.string()
    .optional()
    .describe("Discord 帳號")
    .meta({
      title: "Discord",
      examples: ["JohnDoe#1234", "User123#5678"]
    }),

  // 移除 line 驗證
});
```

#### 3.2.4 更新服務層

**檔案**: `daodao-server/src/services/user.service.ts` (L279-287, L360-368)

**修改內容**:

```typescript
// Prisma 關聯型別定義
interface PrismaUserWithRelations {
  contacts?: {
    email?: string | null;
    photo_url?: string | null;
    is_subscribe_email?: boolean | null;
    website?: string | null;     // 新增
    fb?: string | null;
    ig?: string | null;
    linkedin?: string | null;    // 新增
    github?: string | null;      // 新增
    discord?: string | null;
    // 移除 line
  } | null;
}

// 格式化回應函式
const formatUserResponse = async (user: PrismaUserWithRelations) => {
  return {
    contactList: {
      email: user.contacts?.email || null,
      photoURL: user.contacts?.photo_url || null,
      isSubscribeEmail: user.contacts?.is_subscribe_email || null,
      website: user.contacts?.website || null,        // 新增
      facebook: user.contacts?.fb || null,
      instagram: user.contacts?.ig || null,
      linkedin: user.contacts?.linkedin || null,      // 新增
      github: user.contacts?.github || null,          // 新增
      discord: user.contacts?.discord || null,
      // 移除 line
    }
  };
};

// 建立/更新使用者的資料庫操作
// 從 contactList 提取欄位
const { website, facebook, instagram, linkedin, github, discord } = contactList;

// 資料庫操作
tx.contacts.create({
  data: {
    website,
    fb: facebook,
    ig: instagram,
    linkedin,
    github,
    discord,
    // 移除 line
  }
});
```

### 3.3 前端程式碼調整 (微調)

前端已完整支援 PRD 要求的 6 個平台，僅需確認以下內容：

#### 3.3.1 檢查常數定義

**檔案**: `daodao-f2e/entities/user/model/constants.ts` (L189-196)

**確認內容** (已正確):
```typescript
CONTACT_PLATFORM_OPTIONS: [
  { value: 'website', label: 'Website' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'github', label: 'GitHub' },
  { value: 'discord', label: 'Discord' },
]
```

#### 3.3.2 檢查編輯器驗證

**檔案**: `daodao-f2e/widgets/user/ui/user-profile-editor.tsx` (L47-56)

**確認內容** (已正確):
```typescript
contactList: z
  .object({
    website: z.string().optional(),
    facebook: z.string().optional(),
    instagram: z.string().optional(),
    linkedin: z.string().optional(),
    github: z.string().optional(),
    discord: z.string().optional(),
  })
  .optional()
```

#### 3.3.3 檢查展示元件

**檔案**: `daodao-f2e/widgets/user/ui/user-profile-widget.tsx` (L46-72)

**確認內容** (已正確):
```typescript
const socialPlatformList: SocialPlatformItem[] = [
  { platform: 'linkedin', generateHref: (v) => `https://www.linkedin.com/in/${v}` },
  { platform: 'github', generateHref: (v) => `https://www.github.com/${v}` },
  { platform: 'instagram', generateHref: (v) => `https://www.instagram.com/${v}` },
  { platform: 'facebook', generateHref: (v) => `https://www.facebook.com/${v}` },
  { platform: 'website', generateHref: (v) => v },
  { platform: 'discord' },
];
```

**注意**: 確保移除任何對 `line` 平台的引用（如果存在）。

### 3.4 資料遷移腳本 (可選)

如果需要在正式環境遷移現有 Line 資料，可以建立遷移腳本：

**檔案**: `daodao-storage/migrations/migrate_line_to_discord.sql`

```sql
-- 將 Line 資料遷移到備註欄位或匯出
-- 僅在需要時執行

-- 選項 1: 匯出現有 Line 資料
COPY (
  SELECT id, line
  FROM contacts
  WHERE line IS NOT NULL
) TO '/tmp/contacts_line_backup.csv' CSV HEADER;

-- 選項 2: 如果未來需要刪除 line 欄位
-- ALTER TABLE contacts DROP COLUMN line;
```

---

## 四、實施步驟

### Phase 1: 資料庫準備 (優先權: 高)

- [ ] **1.1** 建立資料庫遷移腳本
  - 新增 `website`, `linkedin`, `github` 欄位
  - 確認欄位型別和長度

- [ ] **1.2** 在開發環境測試遷移
  - 執行遷移腳本
  - 驗證表格結構

- [ ] **1.3** 備份正式環境資料
  - 匯出現有 contacts 表資料
  - 特別備份 line 欄位資料

### Phase 2: 後端程式碼更新 (優先權: 高)

- [ ] **2.1** 更新 Prisma Schema
  - 修改 `schema.prisma`
  - 產生 Prisma Client

- [ ] **2.2** 更新型別定義
  - 修改 `user.types.ts`
  - 新增欄位，移除 line

- [ ] **2.3** 更新驗證器
  - 修改 `user.validators.ts`
  - 新增 website URL 驗證
  - 更新 linkedin、github 驗證規則

- [ ] **2.4** 更新服務層
  - 修改 `user.service.ts`
  - 更新 formatUserResponse 函式
  - 更新建立/更新使用者邏輯

### Phase 3: 前端程式碼檢查 (優先權: 中)

- [ ] **3.1** 檢查常數定義
  - 確認 `CONTACT_PLATFORM_OPTIONS` 正確

- [ ] **3.2** 檢查編輯器
  - 確認 `user-profile-editor.tsx` 驗證規則
  - 測試動態選擇器功能

- [ ] **3.3** 檢查展示元件
  - 確認 `user-profile-widget.tsx` 顯示邏輯
  - 測試連結產生功能

### Phase 4: 測試 (優先權: 高)

- [ ] **4.1** 單元測試
  - 測試驗證器 schema
  - 測試服務層格式化函式

- [ ] **4.2** 整合測試
  - 測試建立使用者 API
  - 測試更新使用者 API
  - 測試取得使用者資訊 API

- [ ] **4.3** E2E 測試
  - 測試使用者編輯社群連結
  - 測試連結顯示和跳轉
  - 測試 Discord 複製功能

### Phase 5: 部署 (優先權: 高)

- [ ] **5.1** 部署到測試環境
  - 執行資料庫遷移
  - 部署後端程式碼
  - 部署前端程式碼

- [ ] **5.2** 驗證測試環境
  - 完整功能測試
  - 資料完整性檢查

- [ ] **5.3** 部署到正式環境
  - 執行資料庫遷移
  - 灰度發布後端
  - 灰度發布前端

### Phase 6: 監控和回滾準備 (優先權: 中)

- [ ] **6.1** 監控
  - API 錯誤率
  - 使用者行為異常

- [ ] **6.2** 回滾方案
  - 準備回滾腳本
  - 準備降級方案

---

## 五、影響範圍分析

### 5.1 資料庫層

**影響表格**: `contacts`

**風險等級**: 低
- 僅新增欄位，不修改現有欄位
- 新欄位預設為 NULL，不影響現有資料
- Line 欄位保留，不刪除歷史資料

### 5.2 後端 API

**影響介面**:
- `POST /api/users` (建立使用者)
- `PUT /api/users/:userId` (更新使用者)
- `GET /api/users/:userId` (取得使用者資訊)

**相容性**: 向後相容
- 新欄位為可選欄位
- 移除 line 欄位不影響現有客戶端（前端已不使用）

### 5.3 前端介面

**影響頁面**:
- 使用者資料編輯頁
- 使用者資料展示頁

**使用者體驗**: 改善
- 使用者可以新增更多社群連結
- LinkedIn、Github、Website 可以持久化儲存

### 5.4 現有使用者資料

**Line 使用者資料**:
- 現有 line 資料保留在資料庫
- 前端不再顯示和編輯 line 欄位
- 使用者需要重新使用其他平台（如 Discord）替代

**遷移策略**:
- 通知現有 Line 使用者更新社群連結
- 提供匯出功能（如需要）

---

## 六、風險評估與應對

### 6.1 資料遷移風險

**風險**: 資料庫遷移失敗

**影響**: 嚴重 - 系統無法正常運作

**應對措施**:
- 在開發和測試環境充分測試
- 正式環境執行前完整備份
- 準備回滾腳本
- 選擇離峰時段執行

### 6.2 Line 使用者流失風險

**風險**: 移除 Line 支援導致使用者不滿

**影響**: 中等 - 可能影響部分使用者體驗

**應對措施**:
- 提前通知使用者（公告、郵件）
- 提供替代方案（Discord）
- 保留歷史資料，允許使用者查看

### 6.3 API 相容性風險

**風險**: 舊版客戶端呼叫 API 失敗

**影響**: 低 - 前端已支援新欄位

**應對措施**:
- 新欄位為可選，保持向後相容
- 監控 API 錯誤率
- 準備降級方案

### 6.4 效能風險

**風險**: 新增欄位影響查詢效能

**影響**: 低 - 欄位數量少，資料量小

**應對措施**:
- 監控資料庫查詢效能
- 必要時新增索引

---

## 七、測試計畫

### 7.1 單元測試

**測試目標**: 驗證各層邏輯正確性

**測試內容**:
```typescript
// 驗證器測試
describe('contactListSchema', () => {
  it('應該接受所有 6 個平台的有效資料', () => {
    const valid = {
      website: 'https://example.com',
      facebook: 'john.doe',
      instagram: '@john_doe',
      linkedin: 'john-doe',
      github: 'johndoe',
      discord: 'JohnDoe#1234'
    };
    expect(() => contactListSchema.parse(valid)).not.toThrow();
  });

  it('應該拒絕無效的 website URL', () => {
    const invalid = { website: 'not-a-url' };
    expect(() => contactListSchema.parse(invalid)).toThrow();
  });

  it('應該允許所有欄位為空', () => {
    expect(() => contactListSchema.parse({})).not.toThrow();
  });
});

// 服務層測試
describe('formatUserResponse', () => {
  it('應該正確格式化 contactList', () => {
    const user = {
      contacts: {
        website: 'https://example.com',
        fb: 'john.doe',
        ig: '@john_doe',
        linkedin: 'john-doe',
        github: 'johndoe',
        discord: 'JohnDoe#1234'
      }
    };

    const result = formatUserResponse(user);

    expect(result.contactList).toEqual({
      email: null,
      photoURL: null,
      isSubscribeEmail: null,
      website: 'https://example.com',
      facebook: 'john.doe',
      instagram: '@john_doe',
      linkedin: 'john-doe',
      github: 'johndoe',
      discord: 'JohnDoe#1234'
    });
  });
});
```

### 7.2 整合測試

**測試目標**: 驗證 API 端到端流程

**測試案例**:

| 案例 | 輸入 | 預期輸出 |
|------|------|---------|
| 建立使用者 - 完整社群連結 | 所有 6 個平台資料 | 201 Created, 回傳完整資料 |
| 建立使用者 - 部分社群連結 | 僅 3 個平台資料 | 201 Created, 其他欄位為 null |
| 建立使用者 - 無效 website | `website: "invalid"` | 400 Bad Request, 驗證錯誤 |
| 更新使用者 - 新增社群連結 | 新增 linkedin、github | 200 OK, 資料已更新 |
| 更新使用者 - 移除社群連結 | 設定欄位為空字串 | 200 OK, 欄位設為 null |
| 取得使用者 - 有社群連結 | userId | 200 OK, contactList 完整 |
| 取得使用者 - 無社群連結 | userId | 200 OK, contactList 所有欄位為 null |

**測試腳本範例**:
```typescript
describe('User API - Social Media Links', () => {
  it('POST /api/users - 應該建立使用者並儲存所有社群連結', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({
        name: 'John Doe',
        contactList: {
          website: 'https://johndoe.com',
          facebook: 'john.doe.fb',
          instagram: '@johndoe',
          linkedin: 'john-doe',
          github: 'johndoe',
          discord: 'JohnDoe#1234'
        }
      });

    expect(response.status).toBe(201);
    expect(response.body.contactList).toMatchObject({
      website: 'https://johndoe.com',
      facebook: 'john.doe.fb',
      instagram: '@johndoe',
      linkedin: 'john-doe',
      github: 'johndoe',
      discord: 'JohnDoe#1234'
    });
  });

  it('PUT /api/users/:id - 應該更新社群連結', async () => {
    const userId = 'test-user-id';

    const response = await request(app)
      .put(`/api/users/${userId}`)
      .send({
        contactList: {
          linkedin: 'new-linkedin',
          github: 'new-github'
        }
      });

    expect(response.status).toBe(200);
    expect(response.body.contactList.linkedin).toBe('new-linkedin');
    expect(response.body.contactList.github).toBe('new-github');
  });
});
```

### 7.3 前端 E2E 測試

**測試目標**: 驗證使用者介面互動

**測試場景**:
1. 使用者編輯資料，新增所有 6 個社群連結
2. 使用者編輯資料，移除部分社群連結
3. 使用者查看自己的資料，顯示所有社群連結
4. 使用者點擊 LinkedIn/Github/Instagram/Facebook 連結，跳轉正確
5. 使用者點擊 Discord，複製到剪貼簿
6. 使用者點擊 Website，跳轉到自訂網址

**測試工具**: Playwright / Cypress

**測試腳本範例**:
```typescript
test('使用者應該能夠新增和查看所有社群連結', async ({ page }) => {
  // 登入並進入編輯頁面
  await page.goto('/profile/edit');

  // 新增 LinkedIn
  await page.click('text=新增社群');
  await page.selectOption('[name="platform"]', 'linkedin');
  await page.fill('[name="value"]', 'john-doe');

  // 新增 Github
  await page.click('text=新增社群');
  await page.selectOption('[name="platform"]', 'github');
  await page.fill('[name="value"]', 'johndoe');

  // 儲存
  await page.click('text=儲存');

  // 驗證資料頁顯示
  await page.goto('/profile');
  await expect(page.locator('text=LinkedIn')).toBeVisible();
  await expect(page.locator('text=Github')).toBeVisible();

  // 驗證連結正確
  const linkedinLink = page.locator('a[href*="linkedin.com"]');
  await expect(linkedinLink).toHaveAttribute('href', 'https://www.linkedin.com/in/john-doe');
});
```

### 7.4 資料完整性測試

**測試目標**: 確保資料遷移前後一致

**測試步驟**:
1. 遷移前：匯出現有 contacts 表資料
2. 執行遷移：新增欄位
3. 遷移後：驗證所有現有資料未改變
4. 新增資料：驗證新欄位可以正常儲存

**驗證 SQL**:
```sql
-- 驗證現有資料完整性
SELECT COUNT(*) FROM contacts WHERE ig IS NOT NULL;
SELECT COUNT(*) FROM contacts WHERE fb IS NOT NULL;
SELECT COUNT(*) FROM contacts WHERE discord IS NOT NULL;

-- 驗證新欄位可用
SELECT website, linkedin, github FROM contacts WHERE id = ?;

-- 驗證 Line 資料保留
SELECT COUNT(*) FROM contacts WHERE line IS NOT NULL;
```

---

## 八、上線檢查清單

### 8.1 程式碼審查

- [ ] Prisma Schema 更新正確
- [ ] 型別定義完整且一致
- [ ] 驗證規則合理（特別是 website URL 驗證）
- [ ] 服務層邏輯正確
- [ ] 前端元件無 line 引用
- [ ] 程式碼 review 通過

### 8.2 測試驗證

- [ ] 單元測試全部通過
- [ ] 整合測試全部通過
- [ ] E2E 測試全部通過
- [ ] 資料遷移測試通過
- [ ] 效能測試無異常

### 8.3 文件更新

- [ ] API 文件更新（Swagger/OpenAPI）
- [ ] 資料庫 schema 文件更新
- [ ] 使用者手冊更新（如果有）
- [ ] 發布說明（Release Notes）

### 8.4 部署準備

- [ ] 資料庫備份完成
- [ ] 遷移腳本準備就緒
- [ ] 回滾腳本準備就緒
- [ ] 監控告警設定完成
- [ ] 部署時間窗口確認

### 8.5 使用者溝通

- [ ] 發布公告準備
- [ ] Line 使用者通知（如需要）
- [ ] 客服訓練（了解變更內容）

---

## 九、附錄

### 9.1 關鍵檔案清單

#### 資料庫層
- `daodao-storage/init-scripts-refactored/100_create_table_contacts.sql`

#### 後端層
- `daodao-server/prisma/schema.prisma`
- `daodao-server/src/types/user.types.ts`
- `daodao-server/src/validators/user.validators.ts`
- `daodao-server/src/services/user.service.ts`

#### 前端層
- `daodao-f2e/entities/user/model/constants.ts`
- `daodao-f2e/shared/ui/social-icon.tsx`
- `daodao-f2e/entities/user/ui/dynamic-contact-selector.tsx`
- `daodao-f2e/widgets/user/ui/user-profile-editor.tsx`
- `daodao-f2e/widgets/user/ui/user-profile-widget.tsx`

### 9.2 平台支援對照表

| 平台 | 資料庫欄位名 | 前端欄位名 | PRD 要求 | 目前狀態 |
|------|------------|----------|---------|---------|
| Website | `website` | `website` | ✓ | 需新增 (DB) |
| Facebook | `fb` | `facebook` | ✓ | ✓ 已支援 |
| Instagram | `ig` | `instagram` | ✓ | ✓ 已支援 |
| LinkedIn | `linkedin` | `linkedin` | ✓ | 需新增 (DB) |
| Github | `github` | `github` | ✓ | 需新增 (DB) |
| Discord | `discord` | `discord` | ✓ | ✓ 已支援 |
| LINE | `line` | - | ✗ | 需移除 (前端) |

### 9.3 資料庫欄位詳細規格

| 欄位名 | 型別 | 長度 | 可空 | 說明 |
|--------|------|------|------|------|
| `website` | VARCHAR | 2048 | YES | 完整的 URL，支援 https |
| `fb` | VARCHAR | 255 | YES | Facebook 使用者名稱或 ID |
| `ig` | VARCHAR | 255 | YES | Instagram 使用者名稱 |
| `linkedin` | VARCHAR | 100 | YES | LinkedIn 使用者名稱或自訂 URL |
| `github` | VARCHAR | 100 | YES | GitHub 使用者名稱 |
| `discord` | VARCHAR | 255 | YES | Discord 使用者名稱#標籤 |
| `line` | VARCHAR | 255 | YES | LINE ID (保留，不使用) |

### 9.4 URL 產生規則

| 平台 | 輸入範例 | 產生的 URL |
|------|---------|-----------|
| LinkedIn | `john-doe` | `https://www.linkedin.com/in/john-doe` |
| Github | `johndoe` | `https://www.github.com/johndoe` |
| Instagram | `@johndoe` 或 `johndoe` | `https://www.instagram.com/johndoe` |
| Facebook | `john.doe` | `https://www.facebook.com/john.doe` |
| Website | `https://example.com` | `https://example.com` (直接使用) |
| Discord | `JohnDoe#1234` | 無連結，點擊複製 |

---

## 十、總結

### 核心變更
1. **資料庫**: 新增 `website`, `linkedin`, `github` 三個欄位
2. **後端**: 更新所有相關型別、驗證、服務層程式碼
3. **前端**: 確認已支援 6 個平台，移除 line 引用

### 關鍵優勢
- 統一前後端支援的平台
- 符合 PRD 要求
- 保持向後相容
- 改善使用者體驗

### 風險控管
- 充分測試
- 資料備份
- 回滾方案
- 監控告警

### 下一步行動
1. 開發團隊 review 本規劃文件
2. 評估時間和資源
3. 開始 Phase 1: 資料庫準備
4. 按計畫逐步推進各階段

---

**文件版本**: v1.0
**建立日期**: 2025-12-18
**最後更新**: 2025-12-18
**負責人**: [待填寫]
**審核人**: [待填寫]
