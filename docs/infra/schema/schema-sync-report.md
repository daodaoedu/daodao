# 資料庫結構同步報告

**產生日期**: 2024-12-26
**執行工具**: Claude Code (Sonnet 4.5)
**比對來源**:
- SQL 初始化腳本：`/daodao-storage/init-scripts-refactored/*.sql`
- Prisma Schema：`/daodao-server/prisma/schema.prisma`

---

## 📋 執行摘要

本次遷移將 PostgreSQL 資料庫結構與 Prisma Schema 進行同步，確保兩者一致性。

### 總變更統計
- ✅ **新增 4 張資料表**
- ✅ **新增 10 個欄位**到現有資料表
- ✅ **修改 20+ 個欄位型態**
- ✅ **重新命名 2 個欄位**
- ✅ **新增 50+ 個效能索引**

---

## 🆕 一、新增資料表 (4 張)

### 1.1 `likes` - 貼文按讚紀錄表
**用途**: 追蹤使用者對貼文的按讚行為

```sql
CREATE TABLE "likes" (
    "id" SERIAL PRIMARY KEY,
    "post_id" INT,                           -- 貼文 ID
    "user_id" INT,                           -- 使用者 ID
    "created_at" TIMESTAMP DEFAULT NOW(),    -- 建立時間
    FOREIGN KEY ("post_id") REFERENCES "post"("id") ON DELETE CASCADE,
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);
```

**影響範圍**:
- 前端需實作按讚/取消按讚功能
- API 需提供按讚相關端點

---

### 1.2 `user_interests` - 使用者興趣分類表
**用途**: 記錄使用者對各類別的興趣偏好

```sql
CREATE TABLE "user_interests" (
    "id" SERIAL PRIMARY KEY,
    "user_id" INT NOT NULL,                  -- 使用者 ID
    "category_id" INT NOT NULL,              -- 分類 ID
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
    FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE,
    UNIQUE ("user_id", "category_id")
);
```

**影響範圍**:
- 使用者個人檔案頁面需顯示/編輯興趣
- 推薦系統可根據興趣推薦內容

---

### 1.3 `professional_fields` - 專業領域定義表
**用途**: 定義系統支援的專業領域選項

```sql
CREATE TABLE "professional_fields" (
    "id" SERIAL PRIMARY KEY,
    "name" VARCHAR(100) NOT NULL UNIQUE,     -- 顯示名稱
    "value" VARCHAR(100) NOT NULL UNIQUE,    -- 內部值
    "description" TEXT,                      -- 描述
    "display_order" INT DEFAULT 0,           -- 顯示順序
    "is_active" BOOLEAN DEFAULT TRUE,        -- 是否啟用
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW()
);
```

**影響範圍**:
- 需建立後台管理介面來管理專業領域
- 需預先載入基礎專業領域資料

**建議初始資料**:
```sql
INSERT INTO "professional_fields" ("name", "value", "display_order") VALUES
('軟體工程', 'software_engineering', 1),
('資料科學', 'data_science', 2),
('產品設計', 'product_design', 3),
('數位行銷', 'digital_marketing', 4),
('專案管理', 'project_management', 5);
```

---

### 1.4 `user_professional_fields` - 使用者專業領域對應表
**用途**: 記錄使用者所屬的專業領域

```sql
CREATE TABLE "user_professional_fields" (
    "id" SERIAL PRIMARY KEY,
    "user_id" INT NOT NULL,                  -- 使用者 ID
    "professional_field_id" INT NOT NULL,    -- 專業領域 ID
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
    FOREIGN KEY ("professional_field_id") REFERENCES "professional_fields"("id") ON DELETE CASCADE,
    UNIQUE ("user_id", "professional_field_id")
);
```

**影響範圍**:
- 使用者註冊/個人檔案編輯時需選擇專業領域
- 可支援多選專業領域

---

## 📝 二、新增欄位

### 2.1 `users` 資料表新增欄位 (7 個)

#### 自訂 ID 相關欄位
```sql
ALTER TABLE "users" ADD COLUMN "custom_id" VARCHAR(50) UNIQUE;
ALTER TABLE "users" ADD COLUMN "custom_id_verified" BOOLEAN DEFAULT FALSE;
ALTER TABLE "users" ADD COLUMN "custom_id_created_at" TIMESTAMPTZ;
```
- **用途**: 允許使用者自訂唯一識別碼（類似 Instagram handle）
- **驗證機制**: 需實作驗證流程確保 custom_id 可用性

#### 專業資訊欄位
```sql
ALTER TABLE "users" ADD COLUMN "professional_field" VARCHAR(100);
ALTER TABLE "users" ADD COLUMN "personal_slogan" VARCHAR(200);
```
- **professional_field**: ⚠️ 已廢棄，建議使用 `user_professional_fields` 關聯表
- **personal_slogan**: 使用者個人座右銘/標語

#### 行銷追蹤欄位
```sql
ALTER TABLE "users" ADD COLUMN "referral_source" VARCHAR(100);
```
- **用途**: 追蹤使用者註冊來源（Google、Facebook、朋友推薦等）

#### 語言欄位擴充
```sql
ALTER TABLE "users" ALTER COLUMN "language" TYPE VARCHAR(255);
```
- **變更**: VARCHAR(10) → VARCHAR(255)
- **原因**: 支援更長的語言代碼或多語言設定

---

### 2.2 `task` 資料表新增欄位 (1 個)

```sql
ALTER TABLE "task" ADD COLUMN "position" INT DEFAULT 0;
```
- **用途**: 支援任務在里程碑內的排序功能
- **影響**: 任務列表需支援拖拉排序

---

### 2.3 `post` 資料表新增欄位 (1 個，條件式)

```sql
ALTER TABLE "post" ADD COLUMN "content" TEXT;
```
- **用途**: 儲存貼文主要內容
- **注意**: 如果此欄位已存在則不會新增

---

## 🔄 三、欄位型態變更

### 3.1 `contacts` 資料表

| 欄位 | 原型態 | 新型態 | 說明 |
|------|--------|--------|------|
| `email` | VARCHAR(320) | VARCHAR(255) | 統一欄位長度 |
| `google_id` | VARCHAR(100) | VARCHAR(255) | 統一欄位長度 |
| `photo_url` | VARCHAR(2048) | TEXT | 不限制長度 |
| `ig` | VARCHAR(30) | VARCHAR(255) | 統一欄位長度 |
| `fb` | VARCHAR(50) | VARCHAR(255) | 統一欄位長度 |
| `discord` | VARCHAR(37) | VARCHAR(255) | 統一欄位長度 |
| `line` | VARCHAR(20) | VARCHAR(255) | 統一欄位長度 |

---

### 3.2 `groups` 資料表

| 欄位 | 原型態 | 新型態 |
|------|--------|--------|
| `photo_url` | VARCHAR(2048) | VARCHAR(255) |
| `photo_alt` | VARCHAR(100) | VARCHAR(255) |
| `description` | VARCHAR(500) | VARCHAR(255) |

---

### 3.3 `project` 資料表

| 欄位 | 原型態 | 新型態 |
|------|--------|--------|
| `title` | VARCHAR(200) | VARCHAR(255) |
| `goal` | VARCHAR(200) | VARCHAR(255) |
| `img_url` | VARCHAR(2048) | VARCHAR(255) |

---

### 3.4 ⚠️ `resources` 資料表（重要變更）

| 欄位 | 原型態 | 新型態 | ⚠️ 注意事項 |
|------|--------|--------|------------|
| `name` | VARCHAR(200) | VARCHAR(255) | ✅ 安全 |
| `url` | VARCHAR(2048) | VARCHAR(1000) | ⚠️ **可能截斷** |
| `image_url` | VARCHAR(2048) | VARCHAR(1000) | ⚠️ **可能截斷** |
| `video_url` | VARCHAR(2048) | VARCHAR(1000) | ⚠️ **可能截斷** |

**⚠️ 重要警告**:
- URL 欄位長度從 2048 縮減至 1000
- **必須在執行遷移前檢查**是否有超過 1000 字元的 URL

**檢查指令**:
```sql
-- 檢查是否有超長 URL
SELECT id, name, LENGTH(url) as url_length
FROM resources
WHERE LENGTH(url) > 1000;

SELECT id, name, LENGTH(image_url) as img_length
FROM resources
WHERE LENGTH(image_url) > 1000;

SELECT id, name, LENGTH(video_url) as vid_length
FROM resources
WHERE LENGTH(video_url) > 1000;
```

**解決方案**:
1. 使用短網址服務（如 bit.ly）
2. 將資源移至 CDN 並使用較短路徑
3. 或保持 VARCHAR(2048) 不變更（需修改遷移腳本）

---

### 3.5 `marathon` 資料表

| 欄位 | 原型態 | 新型態 |
|------|--------|--------|
| `title` | VARCHAR(200) | VARCHAR(255) |

---

## 🏷️ 四、欄位重新命名

### 4.1 `user_join_group` 資料表
```sql
-- 舊欄位名稱
group_participation_role

-- 新欄位名稱
group_participation_role_t
```

**影響範圍**:
- 所有查詢此欄位的程式碼需更新
- API 回應欄位名稱需對應調整

---

### 4.2 `comments` 資料表
```sql
-- 舊欄位名稱
parent_comment_id

-- 新欄位名稱
parent_id
```

**影響範圍**:
- 留言巢狀結構查詢需更新
- 前端留言元件需調整

---

## 🚀 五、效能索引新增 (50+ 個)

### 5.1 核心實體索引

```sql
-- 分類表
CREATE INDEX "idx_categories_name" ON "categories" ("name");
CREATE INDEX "idx_categories_parent_id" ON "categories" ("parent_id");

-- 城市表
CREATE INDEX "idx_city_name" ON "city" ("name");

-- 地點表
CREATE INDEX "idx_location_city_id" ON "location" ("city_id");
CREATE INDEX "idx_location_country_id" ON "location" ("country_id");
```

---

### 5.2 使用者相關索引

```sql
-- 使用者檔案
CREATE INDEX "idx_user_profiles_is_public" ON "user_profiles" ("is_public");

-- 使用者訂閱（複合索引）
CREATE INDEX "idx_user_subscription_user_status" ON "user_subscription" ("user_id", "status");

-- 使用者加入群組（複合索引）
CREATE INDEX "idx_user_group" ON "user_join_group" ("user_id", "group_id");
```

---

### 5.3 專案與任務索引

```sql
-- 里程碑
CREATE INDEX "idx_milestone_project_id" ON "milestone" ("project_id");

-- 任務
CREATE INDEX "idx_task_milestone_id" ON "task" ("milestone_id");

-- 貼文（複合索引）
CREATE INDEX "idx_posts_project_status" ON "post" ("project_id", "status");

-- 筆記、成果、評論
CREATE INDEX "idx_note_post_id" ON "note" ("post_id");
CREATE INDEX "idx_outcome_post_id" ON "outcome" ("post_id");
CREATE INDEX "idx_review_post_id" ON "review" ("post_id");
```

---

### 5.4 群組與社群索引

```sql
-- 群組表（使用 GIN 索引支援陣列查詢）
CREATE INDEX "idx_group_TBD" ON "groups" ("TBD");
CREATE INDEX "idx_group_city_id" ON "groups" ("city_id");
CREATE INDEX "idx_group_group_type" ON "groups" USING GIN ("group_type");
CREATE INDEX "idx_group_is_grouping" ON "groups" ("is_grouping");
CREATE INDEX "idx_group_is_online" ON "groups" ("is_online");
CREATE INDEX "idx_group_partner_education_step" ON "groups" USING GIN ("partner_education_step");
```

**說明**: GIN 索引適用於陣列型態欄位的包含查詢

---

### 5.5 馬拉松與活動索引

```sql
CREATE INDEX "idx_marathon_start_date" ON "marathon" ("start_date");
CREATE INDEX "idx_project_marathon_status" ON "project_marathon" ("status");
```

---

### 5.6 留言與互動索引

```sql
-- 留言表（複合索引）
CREATE INDEX "idx_comments_target" ON "comments" ("target_type", "target_id");
CREATE INDEX "idx_comments_user" ON "comments" ("user_id");
CREATE INDEX "idx_comments_visibility" ON "comments" ("visibility");
```

---

### 5.7 資源管理索引

```sql
-- 資源表（多個單一欄位索引）
CREATE INDEX "idx_resource_cost" ON "resources" ("cost");
CREATE INDEX "idx_resource_created_at" ON "resources" ("created_at");
CREATE INDEX "idx_resource_created_by" ON "resources" ("created_by");
CREATE INDEX "idx_resource_level" ON "resources" ("level");
CREATE INDEX "idx_resource_type" ON "resources" ("type");

-- 資源表（複合索引，用於多條件篩選）
CREATE INDEX "idx_resource_type_cost_level" ON "resources" ("type", "cost", "level");

-- 資源評論
CREATE INDEX "idx_review_resource_id" ON "resource_review" ("resource_id");
CREATE INDEX "idx_review_user_id" ON "resource_review" ("user_id");
```

---

### 5.8 標籤與元資料索引

```sql
CREATE INDEX "idx_entity_tags_created_at" ON "entity_tags" ("created_at");
CREATE INDEX "idx_entity_tags_tag_id" ON "entity_tags" ("tag_id");
CREATE INDEX "idx_entity_tags_type_entity" ON "entity_tags" ("entity_type", "entity_id");
```

---

## 📦 六、遷移檔案說明

所有遷移腳本已產生於：
```
/Users/xiaoxu/Projects/daodao/daodao-storage/migrations/schema-sync-2024-12/
```

### 檔案列表

| 檔案 | 大小 | 優先級 | 說明 |
|------|------|--------|------|
| `001_create_missing_tables.sql` | 6.1KB | 高 | 建立 4 張新表 |
| `002_add_missing_columns.sql` | 2.8KB | 中 | 新增 10 個欄位 |
| `003_alter_column_types.sql` | 2.9KB | 中 | 修改欄位型態 |
| `004_rename_columns.sql` | 1.8KB | 中 | 重新命名欄位 |
| `005_create_missing_indexes.sql` | 5.9KB | 低 | 建立效能索引 |
| `run_all_migrations.sql` | 3.9KB | - | 主執行腳本 |
| `README.md` | 9.5KB | - | 完整英文文件 |
| `MIGRATION_SUMMARY.md` | 7.2KB | - | 執行摘要 |
| `QUICK_START.md` | 2KB | - | 快速開始指南 |

---

## ✅ 七、執行前檢查清單

### 7.1 資料備份（必要！）
```bash
# 備份資料庫
pg_dump -h localhost -U your_user -d daodao > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 7.2 資料驗證
```sql
-- 檢查 URL 長度
SELECT COUNT(*) FROM resources WHERE LENGTH(url) > 1000;
SELECT COUNT(*) FROM resources WHERE LENGTH(image_url) > 1000;
SELECT COUNT(*) FROM resources WHERE LENGTH(video_url) > 1000;

-- 檢查是否有重複的 custom_id
SELECT custom_id, COUNT(*)
FROM users
WHERE custom_id IS NOT NULL
GROUP BY custom_id
HAVING COUNT(*) > 1;
```

### 7.3 環境確認
- [ ] 已在測試環境執行過
- [ ] 已確認測試環境無問題
- [ ] 已規劃維護時間窗口
- [ ] 已通知相關團隊成員
- [ ] 已準備回滾方案

---

## 🚀 八、執行步驟

### 方法一：使用主腳本（推薦）
```bash
cd /Users/xiaoxu/Projects/daodao/daodao-storage/migrations/schema-sync-2024-12
psql -h localhost -U your_user -d daodao -f run_all_migrations.sql
```

### 方法二：逐一執行
```bash
cd /Users/xiaoxu/Projects/daodao/daodao-storage/migrations/schema-sync-2024-12

# 依序執行
psql -h localhost -U your_user -d daodao -f 001_create_missing_tables.sql
psql -h localhost -U your_user -d daodao -f 002_add_missing_columns.sql
psql -h localhost -U your_user -d daodao -f 003_alter_column_types.sql
psql -h localhost -U your_user -d daodao -f 004_rename_columns.sql
psql -h localhost -U your_user -d daodao -f 005_create_missing_indexes.sql

# 更新統計資訊
psql -h localhost -U your_user -d daodao -c "VACUUM ANALYZE;"
```

### 方法三：Docker 環境
```bash
# 複製遷移檔案到容器
docker cp migrations/schema-sync-2024-12 daodao-postgres:/tmp/

# 在容器內執行
docker exec -it daodao-postgres bash
cd /tmp/schema-sync-2024-12
psql -U your_user -d daodao -f run_all_migrations.sql
```

---

## 🔍 九、執行後驗證

### 9.1 檢查新表是否建立
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('likes', 'user_interests', 'professional_fields', 'user_professional_fields');
```

預期結果：應回傳 4 筆資料

---

### 9.2 檢查新欄位是否新增
```sql
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name IN ('custom_id', 'professional_field', 'personal_slogan', 'referral_source');
```

預期結果：應回傳 4 筆資料

---

### 9.3 檢查索引是否建立
```sql
SELECT COUNT(*) as index_count
FROM pg_indexes
WHERE schemaname = 'public';
```

執行前後對比：應增加約 50 個索引

---

### 9.4 驗證 Prisma Schema
```bash
cd /Users/xiaoxu/Projects/daodao/daodao-server
npx prisma validate
```

預期結果：✅ Schema validation successful

---

### 9.5 重新產生 Prisma Client
```bash
npm run prisma:generate
```

---

## 🔙 十、回滾方案

### 10.1 從備份還原（推薦）
```bash
# 停止應用程式
# 從備份還原
psql -h localhost -U your_user -d daodao < backup_YYYYMMDD_HHMMSS.sql
# 重啟應用程式
```

### 10.2 手動回滾（不推薦）
```sql
-- 刪除新增的表
DROP TABLE IF EXISTS user_professional_fields CASCADE;
DROP TABLE IF EXISTS professional_fields CASCADE;
DROP TABLE IF EXISTS user_interests CASCADE;
DROP TABLE IF EXISTS likes CASCADE;

-- 移除新增的欄位
ALTER TABLE users DROP COLUMN IF EXISTS custom_id;
ALTER TABLE users DROP COLUMN IF EXISTS custom_id_verified;
ALTER TABLE users DROP COLUMN IF EXISTS custom_id_created_at;
ALTER TABLE users DROP COLUMN IF EXISTS professional_field;
ALTER TABLE users DROP COLUMN IF EXISTS personal_slogan;
ALTER TABLE users DROP COLUMN IF EXISTS referral_source;
ALTER TABLE task DROP COLUMN IF EXISTS position;

-- 還原欄位名稱
ALTER TABLE user_join_group RENAME COLUMN group_participation_role_t TO group_participation_role;
ALTER TABLE comments RENAME COLUMN parent_id TO parent_comment_id;

-- 注意：欄位型態變更和索引需要手動還原
```

---

## 📊 十一、效能影響評估

### 正面影響 ✅
- **查詢效能提升**: 50+ 個新索引大幅提升查詢速度
- **外鍵查詢優化**: JOIN 操作速度提升
- **複合索引**: 常用查詢條件組合效能提升

### 潛在影響 ⚠️
- **資料庫大小**: 預估增加 10-20%（索引佔用空間）
- **寫入效能**: INSERT/UPDATE 略為下降（需更新索引）
- **初次建立索引**: 大型資料表可能需要數分鐘

### 建議執行時間
| 資料庫大小 | 預估時間 | 建議時段 |
|-----------|---------|---------|
| < 1GB | 5 分鐘 | 任何時段 |
| 1-10GB | 15-30 分鐘 | 低流量時段 |
| > 10GB | 30-60 分鐘 | 維護時間窗口 |

---

## 💻 十二、應用程式碼變更需求

### 12.1 必須變更（Breaking Changes）

#### 欄位重新命名
```typescript
// ❌ 舊寫法
const role = userGroup.group_participation_role;
const parentId = comment.parent_comment_id;

// ✅ 新寫法
const role = userGroup.group_participation_role_t;
const parentId = comment.parent_id;
```

#### URL 長度驗證
```typescript
// 新增資源時驗證 URL 長度
if (url.length > 1000) {
  throw new Error('URL 長度不可超過 1000 字元');
}
```

### 12.2 建議新增功能

#### 1. 按讚功能
```typescript
// POST /api/posts/:id/like
async function likePost(postId: number, userId: number) {
  await prisma.likes.create({
    data: { post_id: postId, user_id: userId }
  });
}

// DELETE /api/posts/:id/like
async function unlikePost(postId: number, userId: number) {
  await prisma.likes.delete({
    where: {
      post_id_user_id: { post_id: postId, user_id: userId }
    }
  });
}
```

#### 2. 使用者興趣管理
```typescript
// PUT /api/users/:id/interests
async function updateUserInterests(userId: number, categoryIds: number[]) {
  // 刪除現有興趣
  await prisma.user_interests.deleteMany({ where: { user_id: userId } });

  // 新增新興趣
  await prisma.user_interests.createMany({
    data: categoryIds.map(categoryId => ({
      user_id: userId,
      category_id: categoryId
    }))
  });
}
```

#### 3. 專業領域管理
```typescript
// GET /api/professional-fields
async function getProfessionalFields() {
  return await prisma.professional_fields.findMany({
    where: { is_active: true },
    orderBy: { display_order: 'asc' }
  });
}

// PUT /api/users/:id/professional-fields
async function updateUserProfessionalFields(userId: number, fieldIds: number[]) {
  await prisma.user_professional_fields.deleteMany({
    where: { user_id: userId }
  });

  await prisma.user_professional_fields.createMany({
    data: fieldIds.map(fieldId => ({
      user_id: userId,
      professional_field_id: fieldId
    }))
  });
}
```

#### 4. 自訂 ID 驗證
```typescript
// POST /api/users/check-custom-id
async function checkCustomIdAvailability(customId: string) {
  const exists = await prisma.users.findUnique({
    where: { custom_id: customId }
  });
  return { available: !exists };
}
```

---

## 🎯 十三、後續工作建議

### 短期（1 週內）
- [ ] 在測試環境執行遷移
- [ ] 測試所有現有功能
- [ ] 更新 API 文件
- [ ] 更新前端程式碼

### 中期（1 個月內）
- [ ] 實作新表相關功能（按讚、興趣等）
- [ ] 建立專業領域後台管理介面
- [ ] 載入初始專業領域資料
- [ ] 效能監控與優化

### 長期（3 個月內）
- [ ] 棄用 `users.professional_field` 欄位
- [ ] 資料遷移至新表結構
- [ ] 完整的功能測試
- [ ] 使用者教育訓練

---

## 📞 十四、聯絡資訊

### 技術問題
- **資料庫團隊**: [待填寫]
- **後端團隊**: [待填寫]
- **前端團隊**: [待填寫]

### 業務問題
- **產品負責人**: [待填寫]
- **專案經理**: [待填寫]

---

## 📚 十五、相關文件連結

- **遷移腳本目錄**: `/Users/xiaoxu/Projects/daodao/daodao-storage/migrations/schema-sync-2024-12/`
- **英文完整文件**: `migrations/schema-sync-2024-12/README.md`
- **快速開始指南**: `migrations/schema-sync-2024-12/QUICK_START.md`
- **Prisma Schema**: `/Users/xiaoxu/Projects/daodao/daodao-server/prisma/schema.prisma`
- **SQL 初始化腳本**: `/Users/xiaoxu/Projects/daodao/daodao-storage/init-scripts-refactored/`

---

## ✍️ 十六、簽核記錄

| 角色 | 姓名 | 簽核日期 | 備註 |
|------|------|----------|------|
| 準備者 | Claude Code | 2024-12-26 | 自動產生 |
| 審核者 | _______ | _______ | |
| 核准者 | _______ | _______ | |
| 執行者 | _______ | _______ | |

**執行記錄**:
- 開始時間: _____________
- 結束時間: _____________
- 執行狀態: _____________
- 問題記錄: _____________

---

**產生日期**: 2024-12-26
**文件版本**: 1.0
**狀態**: 待審核
