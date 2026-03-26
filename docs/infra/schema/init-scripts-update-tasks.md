# Init Scripts 更新任務清單

**目標**: 按照 `init-scripts-refactored` 的格式標準，更新 SQL 初始化腳本以符合 Prisma Schema

**基準目錄**: `/Users/xiaoxu/Projects/daodao/daodao-storage/init-scripts-refactored/`

**參考格式**: 現有腳本的註解風格和結構組織

---

## 📋 任務總覽

### 需要新增的檔案: 4 個
1. `520_create_table_likes.sql` - 貼文按讚表
2. `540_create_table_user_interests.sql` - 使用者興趣表
3. `550_create_table_professional_fields.sql` - 專業領域定義表
4. `560_create_table_user_professional_fields.sql` - 使用者專業領域對應表

### 需要修改的檔案: 18 個
- 10 個表結構修改（新增欄位、修改型態）
- 8 個索引補充文件

---

## 🆕 一、需要新增的 SQL 檔案

### 1. `520_create_table_likes.sql`

**檔案位置**: `/Users/xiaoxu/Projects/daodao/daodao-storage/init-scripts-refactored/520_create_table_likes.sql`

**檔案內容**:
```sql
-- =====================================================
-- DAODAO 學習平台 - 貼文按讚表
-- =====================================================
-- 文件說明：記錄使用者對貼文的按讚行為
-- 用途：支援社群互動功能，追蹤貼文熱度和使用者參與度
-- 依賴表格：users, post
-- 特殊功能：支援按讚/取消按讚，防止重複按讚
-- =====================================================

-- 貼文按讚表：追蹤使用者對貼文的點讚互動
-- 支援快速查詢特定貼文的按讚列表和使用者的按讚歷史
CREATE TABLE "likes" (
    "id" SERIAL PRIMARY KEY,                                    -- 按讚記錄唯一識別碼
    "post_id" INT,                                              -- 被按讚的貼文 ID
    "user_id" INT,                                              -- 按讚的使用者 ID
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,          -- 按讚時間

    -- 外鍵約束定義
    FOREIGN KEY ("post_id") REFERENCES "post"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- 建立效能優化索引
-- 複合索引：支援快速查詢特定貼文的按讚列表，以及檢查使用者是否已按讚
CREATE INDEX "idx_likes_post_user" ON "likes" ("post_id", "user_id");

-- 表格說明註解
COMMENT ON TABLE "likes" IS '貼文按讚表：記錄使用者對貼文的點讚互動，支援社群功能和熱度統計';
COMMENT ON COLUMN "likes"."id" IS '按讚記錄的唯一識別碼';
COMMENT ON COLUMN "likes"."post_id" IS '被按讚的貼文 ID，關聯 post 表';
COMMENT ON COLUMN "likes"."user_id" IS '執行按讚的使用者 ID，關聯 users 表';
COMMENT ON COLUMN "likes"."created_at" IS '按讚的時間戳記，用於統計和排序';
```

---

### 2. `540_create_table_user_interests.sql`

**檔案位置**: `/Users/xiaoxu/Projects/daodao/daodao-storage/init-scripts-refactored/540_create_table_user_interests.sql`

**檔案內容**:
```sql
-- =====================================================
-- DAODAO 學習平台 - 使用者興趣表
-- =====================================================
-- 文件說明：記錄使用者對各學習分類的興趣偏好
-- 用途：支援個性化推薦、興趣匹配、學習夥伴配對等功能
-- 依賴表格：users, categories
-- 特殊功能：一個使用者可以有多個興趣，透過分類系統組織
-- =====================================================

-- 使用者興趣表：將使用者與學習分類連結，建立興趣偏好檔案
-- 支援推薦系統、內容個性化和社群配對功能
CREATE TABLE "user_interests" (
    "id" SERIAL PRIMARY KEY,                                    -- 興趣記錄唯一識別碼
    "user_id" INT NOT NULL,                                     -- 使用者 ID
    "category_id" INT NOT NULL,                                 -- 感興趣的分類 ID
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,        -- 新增時間
    "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,        -- 更新時間

    -- 外鍵約束定義
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE NO ACTION,

    -- 唯一約束：防止重複記錄相同的使用者-分類組合
    CONSTRAINT "user_interests_unique" UNIQUE ("user_id", "category_id")
);

-- 建立效能優化索引
CREATE INDEX "idx_user_interests_user_id" ON "user_interests" ("user_id");        -- 查詢特定使用者的所有興趣
CREATE INDEX "idx_user_interests_category_id" ON "user_interests" ("category_id"); -- 查詢對特定分類感興趣的使用者

-- 表格說明註解
COMMENT ON TABLE "user_interests" IS '使用者興趣表：記錄使用者的學習興趣分類，支援個性化推薦和配對功能';
COMMENT ON COLUMN "user_interests"."id" IS '興趣記錄的唯一識別碼';
COMMENT ON COLUMN "user_interests"."user_id" IS '使用者 ID，關聯 users 表';
COMMENT ON COLUMN "user_interests"."category_id" IS '感興趣的分類 ID，關聯 categories 表';
COMMENT ON COLUMN "user_interests"."created_at" IS '興趣記錄的建立時間';
COMMENT ON COLUMN "user_interests"."updated_at" IS '興趣記錄的最後更新時間';
```

---

### 3. `550_create_table_professional_fields.sql`

**檔案位置**: `/Users/xiaoxu/Projects/daodao/daodao-storage/init-scripts-refactored/550_create_table_professional_fields.sql`

**檔案內容**:
```sql
-- =====================================================
-- DAODAO 學習平台 - 專業領域定義表
-- =====================================================
-- 文件說明：定義系統支援的專業領域選項（如軟體工程、資料科學等）
-- 用途：提供使用者選擇專業領域的標準選項，支援領域分類和專業配對
-- 依賴表格：無（基礎資料表）
-- 特殊功能：支援管理後台動態新增/編輯專業領域，支援排序和啟用/停用
-- =====================================================

-- 專業領域定義表：系統級的專業領域參考資料
-- 管理員可透過後台介面維護專業領域選項
CREATE TABLE "professional_fields" (
    "id" SERIAL PRIMARY KEY,                                    -- 專業領域唯一識別碼
    "name" VARCHAR(100) NOT NULL UNIQUE,                        -- 專業領域顯示名稱（中文）
    "value" VARCHAR(100) NOT NULL UNIQUE,                       -- 專業領域內部值（英文鍵值）
    "description" TEXT,                                         -- 專業領域詳細描述
    "display_order" INT DEFAULT 0,                              -- 顯示排序（數字越小越前面）
    "is_active" BOOLEAN DEFAULT TRUE,                           -- 是否啟用（停用的不會顯示在前端）
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,        -- 建立時間
    "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP         -- 更新時間
);

-- 建立效能優化索引
CREATE INDEX "idx_professional_fields_active" ON "professional_fields" ("is_active");      -- 快速查詢啟用的領域
CREATE INDEX "idx_professional_fields_name" ON "professional_fields" ("name");             -- 按名稱搜尋
CREATE INDEX "idx_professional_fields_value" ON "professional_fields" ("value");           -- 按值搜尋

-- 表格說明註解
COMMENT ON TABLE "professional_fields" IS '專業領域定義表：系統支援的專業領域選項，供使用者選擇和分類';
COMMENT ON COLUMN "professional_fields"."id" IS '專業領域的唯一識別碼';
COMMENT ON COLUMN "professional_fields"."name" IS '專業領域的顯示名稱，用於前端顯示';
COMMENT ON COLUMN "professional_fields"."value" IS '專業領域的內部鍵值，用於程式邏輯';
COMMENT ON COLUMN "professional_fields"."description" IS '專業領域的詳細描述和說明';
COMMENT ON COLUMN "professional_fields"."display_order" IS '前端顯示的排序順序，數字越小越優先';
COMMENT ON COLUMN "professional_fields"."is_active" IS '是否啟用此專業領域，未啟用的不會在前端顯示';
COMMENT ON COLUMN "professional_fields"."created_at" IS '專業領域的建立時間';
COMMENT ON COLUMN "professional_fields"."updated_at" IS '專業領域的最後更新時間';
```

---

### 4. `560_create_table_user_professional_fields.sql`

**檔案位置**: `/Users/xiaoxu/Projects/daodao/daodao-storage/init-scripts-refactored/560_create_table_user_professional_fields.sql`

**檔案內容**:
```sql
-- =====================================================
-- DAODAO 學習平台 - 使用者專業領域對應表
-- =====================================================
-- 文件說明：記錄使用者所屬的專業領域（多對多關係）
-- 用途：支援使用者選擇多個專業領域，建立專業檔案和配對功能
-- 依賴表格：users, professional_fields
-- 特殊功能：一個使用者可以有多個專業領域，支援跨領域學習者
-- =====================================================

-- 使用者專業領域對應表：連結使用者與專業領域的多對多關係
-- 支援專業配對、領域篩選和社群功能
CREATE TABLE "user_professional_fields" (
    "id" SERIAL PRIMARY KEY,                                    -- 對應記錄唯一識別碼
    "user_id" INT NOT NULL,                                     -- 使用者 ID
    "professional_field_id" INT NOT NULL,                       -- 專業領域 ID
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,        -- 建立時間
    "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,        -- 更新時間

    -- 外鍵約束定義
    CONSTRAINT "fk_user_professional_fields_user"
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "fk_user_professional_fields_field"
        FOREIGN KEY ("professional_field_id") REFERENCES "professional_fields"("id") ON DELETE CASCADE ON UPDATE NO ACTION,

    -- 唯一約束：防止重複記錄相同的使用者-領域組合
    CONSTRAINT "user_professional_fields_unique" UNIQUE ("user_id", "professional_field_id")
);

-- 建立效能優化索引
CREATE INDEX "idx_user_professional_fields_user_id" ON "user_professional_fields" ("user_id");           -- 查詢特定使用者的所有專業領域
CREATE INDEX "idx_user_professional_fields_field_id" ON "user_professional_fields" ("professional_field_id"); -- 查詢特定領域的所有使用者

-- 表格說明註解
COMMENT ON TABLE "user_professional_fields" IS '使用者專業領域對應表：記錄使用者所屬的專業領域，支援多領域配置';
COMMENT ON COLUMN "user_professional_fields"."id" IS '對應記錄的唯一識別碼';
COMMENT ON COLUMN "user_professional_fields"."user_id" IS '使用者 ID，關聯 users 表';
COMMENT ON COLUMN "user_professional_fields"."professional_field_id" IS '專業領域 ID，關聯 professional_fields 表';
COMMENT ON COLUMN "user_professional_fields"."created_at" IS '對應記錄的建立時間';
COMMENT ON COLUMN "user_professional_fields"."updated_at" IS '對應記錄的最後更新時間';
```

---

## 📝 二、需要修改的現有檔案

### 修改 1: `120_create_table_users.sql`

**檔案位置**: `/Users/xiaoxu/Projects/daodao/daodao-storage/init-scripts-refactored/120_create_table_users.sql`

**修改類型**: 新增欄位、修改欄位型態

**需要修改的內容**:

#### 1.1 修改 `language` 欄位型態
```sql
-- 修改前（約第 20 行）
"language" VARCHAR(10),

-- 修改後
"language" VARCHAR(255),                                     -- 用戶偏好語言設定（擴充至255支援更長語言代碼）
```

#### 1.2 在 `nickname` 欄位後新增以下欄位
```sql
-- 在第 22 行 "nickname" VARCHAR(50), 之後新增：

-- 自訂識別碼相關欄位（新增）
"custom_id" VARCHAR(50) UNIQUE,                              -- 使用者自訂唯一識別碼（如 @username）
"custom_id_verified" BOOLEAN DEFAULT FALSE,                 -- 自訂 ID 是否已驗證
"custom_id_created_at" TIMESTAMPTZ,                         -- 自訂 ID 建立時間

-- 專業與個人資訊欄位（新增）
"professional_field" VARCHAR(100),                          -- 專業領域（已廢棄，建議使用 user_professional_fields 表）
"personal_slogan" VARCHAR(200),                             -- 個人座右銘或標語
"referral_source" VARCHAR(100),                             -- 註冊來源追蹤（如 google, facebook, friend 等）
```

#### 1.3 在索引區塊新增（約第 59-60 行之後）
```sql
-- 在現有索引後新增
CREATE INDEX "idx_users_custom_id" ON "users" ("custom_id") WHERE "custom_id" IS NOT NULL; -- 自訂 ID 快速查詢（部分索引，僅索引非空值）
```

#### 1.4 在 COMMENT 區塊新增註解
```sql
-- 在表格註解後新增欄位註解
COMMENT ON COLUMN "users"."custom_id" IS '使用者自訂的唯一識別碼，可用於個人頁面 URL（如 @username）';
COMMENT ON COLUMN "users"."custom_id_verified" IS '自訂 ID 是否通過驗證，防止濫用和衝突';
COMMENT ON COLUMN "users"."custom_id_created_at" IS '自訂 ID 的建立時間戳記';
COMMENT ON COLUMN "users"."professional_field" IS '使用者專業領域（單一值，已廢棄，請使用 user_professional_fields 表）';
COMMENT ON COLUMN "users"."personal_slogan" IS '使用者的個人座右銘或簡短標語';
COMMENT ON COLUMN "users"."referral_source" IS '使用者註冊來源，用於行銷分析和成效追蹤';
```

---

### 修改 2: `100_create_table_contacts.sql`

**檔案位置**: `/Users/xiaoxu/Projects/daodao/daodao-storage/init-scripts-refactored/100_create_table_contacts.sql`

**修改類型**: 修改欄位型態

**需要修改的內容**:

```sql
-- 修改所有 VARCHAR 欄位長度

-- 修改前
"google_id" VARCHAR(100),
"photo_url" VARCHAR(2048),
"email" VARCHAR(320),
"ig" VARCHAR(30),
"discord" VARCHAR(37),
"line" VARCHAR(20),
"fb" VARCHAR(50),

-- 修改後（統一為 255，photo_url 改為 TEXT）
"google_id" VARCHAR(255),                                   -- Google 帳號唯一識別碼
"photo_url" TEXT,                                           -- 使用者照片網址（不限長度）
"email" VARCHAR(255),                                       -- 電子郵件地址
"ig" VARCHAR(255),                                          -- Instagram 帳號
"discord" VARCHAR(255),                                     -- Discord 帳號
"line" VARCHAR(255),                                        -- LINE ID
"fb" VARCHAR(255),                                          -- Facebook 個人檔案連結
```

---

### 修改 3: `180_create_table_groups.sql`

**檔案位置**: `/Users/xiaoxu/Projects/daodao/daodao-storage/init-scripts-refactored/180_create_table_groups.sql`

**修改類型**: 修改欄位型態、新增索引

**需要修改的內容**:

#### 3.1 修改欄位型態
```sql
-- 修改前
"photo_url" VARCHAR(2048),
"photo_alt" VARCHAR(100),
"description" VARCHAR(500),

-- 修改後
"photo_url" VARCHAR(255),                                   -- 群組照片網址
"photo_alt" VARCHAR(255),                                   -- 照片替代文字（無障礙）
"description" VARCHAR(255),                                 -- 群組簡短描述
```

#### 3.2 新增索引（在表格建立後）
```sql
-- 在現有索引區塊後新增以下索引
CREATE INDEX "idx_group_TBD" ON "groups" ("TBD");                                          -- TBD 狀態查詢
CREATE INDEX "idx_group_city_id" ON "groups" ("city_id");                                  -- 城市篩選
CREATE INDEX "idx_group_group_type" ON "groups" USING GIN ("group_type");                  -- 群組類型篩選（GIN 索引支援陣列）
CREATE INDEX "idx_group_is_grouping" ON "groups" ("is_grouping");                          -- 組隊中狀態
CREATE INDEX "idx_group_is_online" ON "groups" ("is_online");                              -- 線上/線下篩選
CREATE INDEX "idx_group_partner_education_step" ON "groups" USING GIN ("partner_education_step"); -- 教育階段篩選（GIN 索引）
```

---

### 修改 4: `190_create_table_user_join_group.sql`

**檔案位置**: `/Users/xiaoxu/Projects/daodao/daodao-storage/init-scripts-refactored/190_create_table_user_join_group.sql`

**修改類型**: 欄位重新命名、新增索引

**需要修改的內容**:

#### 4.1 重新命名欄位
```sql
-- 修改前
"group_participation_role" group_participation_role_t DEFAULT 'Initiator',

-- 修改後
"group_participation_role_t" group_participation_role_t DEFAULT 'Initiator',  -- 群組參與角色（發起人或參與者）
```

#### 4.2 新增索引
```sql
-- 新增複合索引
CREATE INDEX "idx_user_group" ON "user_join_group" ("user_id", "group_id");   -- 使用者-群組快速查詢
```

---

### 修改 5: `210_create_table_project.sql`

**檔案位置**: `/Users/xiaoxu/Projects/daodao/daodao-storage/init-scripts-refactored/210_create_table_project.sql`

**修改類型**: 修改欄位型態

**需要修改的內容**:

```sql
-- 修改前
"img_url" VARCHAR(2048),
"title" VARCHAR(200),
"goal" VARCHAR(200),

-- 修改後
"img_url" VARCHAR(255),                                     -- 專案封面圖片網址
"title" VARCHAR(255),                                       -- 專案標題
"goal" VARCHAR(255),                                        -- 專案目標
```

---

### 修改 6: `230_create_table_milestone.sql`

**檔案位置**: `/Users/xiaoxu/Projects/daodao/daodao-storage/init-scripts-refactored/230_create_table_milestone.sql`

**修改類型**: 新增索引

**需要修改的內容**:

```sql
-- 在表格建立後新增索引
CREATE INDEX "idx_milestone_project_id" ON "milestone" ("project_id");  -- 專案里程碑查詢優化
```

---

### 修改 7: `240_create_table_task.sql`

**檔案位置**: `/Users/xiaoxu/Projects/daodao/daodao-storage/init-scripts-refactored/240_create_table_task.sql`

**修改類型**: 新增欄位、新增索引

**需要修改的內容**:

#### 7.1 新增 position 欄位
```sql
-- 在表格定義中新增（建議在 days_of_week 之後）
"position" INT DEFAULT 0,                                    -- 任務在里程碑中的排序位置
```

#### 7.2 新增索引
```sql
-- 新增索引
CREATE INDEX "idx_task_milestone_id" ON "task" ("milestone_id");  -- 里程碑任務查詢優化
```

#### 7.3 新增欄位註解
```sql
COMMENT ON COLUMN "task"."position" IS '任務在里程碑內的排序位置，支援拖拉排序功能';
```

---

### 修改 8: `250_create_table_post.sql`

**檔案位置**: `/Users/xiaoxu/Projects/daodao/daodao-storage/init-scripts-refactored/250_create_table_post.sql`

**修改類型**: 新增欄位（條件式）、新增索引

**需要修改的內容**:

#### 8.1 檢查並新增 content 欄位（如果不存在）
```sql
-- 在表格定義中檢查是否有 content 欄位，如果沒有則新增
"content" TEXT,                                              -- 貼文主要內容
```

#### 8.2 新增索引
```sql
-- 新增複合索引
CREATE INDEX "idx_posts_project_status" ON "post" ("project_id", "status");  -- 專案貼文狀態查詢優化
```

---

### 修改 9: `270_create_table_note.sql`

**檔案位置**: `/Users/xiaoxu/Projects/daodao/daodao-storage/init-scripts-refactored/270_create_table_note.sql`

**修改類型**: 新增索引

**需要修改的內容**:

```sql
-- 新增索引
CREATE INDEX "idx_note_post_id" ON "note" ("post_id");  -- 貼文筆記查詢優化
```

---

### 修改 10: `260_create_table_outcome.sql`

**檔案位置**: `/Users/xiaoxu/Projects/daodao/daodao-storage/init-scripts-refactored/260_create_table_outcome.sql`

**修改類型**: 新增索引

**需要修改的內容**:

```sql
-- 新增索引
CREATE INDEX "idx_outcome_post_id" ON "outcome" ("post_id");  -- 貼文成果查詢優化
```

---

### 修改 11: `280_create_table_review.sql`

**檔案位置**: `/Users/xiaoxu/Projects/daodao/daodao-storage/init-scripts-refactored/280_create_table_review.sql`

**修改類型**: 新增索引

**需要修改的內容**:

```sql
-- 新增索引
CREATE INDEX "idx_review_post_id" ON "review" ("post_id");  -- 貼文評論查詢優化
```

---

### 修改 12: `290_create_table_comments.sql`

**檔案位置**: `/Users/xiaoxu/Projects/daodao/daodao-storage/init-scripts-refactored/290_create_table_comments.sql`

**修改類型**: 欄位重新命名、修改預設值、新增索引

**需要修改的內容**:

#### 12.1 欄位重新命名
```sql
-- 修改前
"parent_comment_id" INT,

-- 修改後
"parent_id" INT,                                             -- 父留言 ID（支援巢狀留言結構）
```

#### 12.2 修改預設值
```sql
-- 修改前
"target_type" VARCHAR(20) NOT NULL CHECK ...

-- 修改後
"target_type" VARCHAR(20) DEFAULT 'post' CHECK ...          -- 目標類型（預設為貼文）
```

#### 12.3 新增索引
```sql
-- 新增複合索引和單一欄位索引
CREATE INDEX "idx_comments_target" ON "comments" ("target_type", "target_id");  -- 目標留言查詢
CREATE INDEX "idx_comments_user" ON "comments" ("user_id");                      -- 使用者留言查詢
CREATE INDEX "idx_comments_visibility" ON "comments" ("visibility");             -- 可見性篩選
```

---

### 修改 13: `310_create_table_marathon.sql`

**檔案位置**: `/Users/xiaoxu/Projects/daodao/daodao-storage/init-scripts-refactored/310_create_table_marathon.sql`

**修改類型**: 修改欄位型態、新增索引

**需要修改的內容**:

#### 13.1 修改欄位型態
```sql
-- 修改前
"title" VARCHAR(200),

-- 修改後
"title" VARCHAR(255),                                        -- 馬拉松活動標題
```

#### 13.2 新增索引
```sql
-- 新增索引
CREATE INDEX "idx_marathon_start_date" ON "marathon" ("start_date");  -- 開始日期查詢優化（時間軸顯示）
```

---

### 修改 14: `320_create_table_project_marathon.sql`

**檔案位置**: `/Users/xiaoxu/Projects/daodao/daodao-storage/init-scripts-refactored/320_create_table_project_marathon.sql`

**修改類型**: 新增索引

**需要修改的內容**:

```sql
-- 新增索引
CREATE INDEX "idx_project_marathon_status" ON "project_marathon" ("status");  -- 報名狀態查詢優化
```

---

### 修改 15: `430_create_table_categories.sql`

**檔案位置**: `/Users/xiaoxu/Projects/daodao/daodao-storage/init-scripts-refactored/430_create_table_categories.sql`

**修改類型**: 新增索引

**需要修改的內容**:

```sql
-- 新增索引
CREATE INDEX "idx_categories_name" ON "categories" ("name");           -- 名稱搜尋優化
CREATE INDEX "idx_categories_parent_id" ON "categories" ("parent_id"); -- 階層查詢優化
```

---

### 修改 16: `060_create_table_city.sql`

**檔案位置**: `/Users/xiaoxu/Projects/daodao/daodao-storage/init-scripts-refactored/060_create_table_city.sql`

**修改類型**: 新增索引

**需要修改的內容**:

```sql
-- 新增索引
CREATE INDEX "idx_city_name" ON "city" ("name");  -- 城市名稱查詢優化
```

---

### 修改 17: `090_create_table_location.sql`

**檔案位置**: `/Users/xiaoxu/Projects/daodao/daodao-storage/init-scripts-refactored/090_create_table_location.sql`

**修改類型**: 新增索引

**需要修改的內容**:

```sql
-- 新增索引
CREATE INDEX "idx_location_city_id" ON "location" ("city_id");        -- 城市位置查詢
CREATE INDEX "idx_location_country_id" ON "location" ("country_id");  -- 國家位置查詢
```

---

### 修改 18: `160_create_table_user_profiles.sql`

**檔案位置**: `/Users/xiaoxu/Projects/daodao/daodao-storage/init-scripts-refactored/160_create_table_user_profiles.sql`

**修改類型**: 新增索引

**需要修改的內容**:

```sql
-- 新增索引
CREATE INDEX "idx_user_profiles_is_public" ON "user_profiles" ("is_public");  -- 公開檔案篩選
```

---

### 修改 19: `170_create_table_user_subscription.sql`

**檔案位置**: `/Users/xiaoxu/Projects/daodao/daodao-storage/init-scripts-refactored/170_create_table_user_subscription.sql`

**修改類型**: 新增索引

**需要修改的內容**:

```sql
-- 新增複合索引
CREATE INDEX "idx_user_subscription_user_status" ON "user_subscription" ("user_id", "status");  -- 使用者訂閱狀態查詢
```

---

### 修改 20: `470_create_table_resources.sql`

**檔案位置**: `/Users/xiaoxu/Projects/daodao/daodao-storage/init-scripts-refactored/470_create_table_resources.sql`

**修改類型**: 修改欄位型態、新增索引

**需要修改的內容**:

#### 20.1 修改欄位型態
```sql
-- ⚠️ 重要變更：URL 欄位長度縮減

-- 修改前
"name" VARCHAR(200),
"url" VARCHAR(2048),
"image_url" VARCHAR(2048),
"video_url" VARCHAR(2048),

-- 修改後
"name" VARCHAR(255),                                         -- 資源名稱
"url" VARCHAR(1000),                                         -- 資源網址（⚠️ 從 2048 縮減至 1000）
"image_url" VARCHAR(1000),                                   -- 封面圖網址（⚠️ 從 2048 縮減至 1000）
"video_url" VARCHAR(1000),                                   -- 影片網址（⚠️ 從 2048 縮減至 1000）
```

**⚠️ 注意**：執行此變更前，務必先檢查現有資料：
```sql
-- 檢查指令（在檔案註解中加入提醒）
-- 執行此腳本前請先檢查：
-- SELECT id, LENGTH(url) FROM resources WHERE LENGTH(url) > 1000;
-- SELECT id, LENGTH(image_url) FROM resources WHERE LENGTH(image_url) > 1000;
-- SELECT id, LENGTH(video_url) FROM resources WHERE LENGTH(video_url) > 1000;
-- 如有結果，請先處理超長 URL
```

#### 20.2 新增索引
```sql
-- 新增多個查詢優化索引
CREATE INDEX "idx_resource_cost" ON "resources" ("cost");                          -- 費用類型篩選
CREATE INDEX "idx_resource_created_at" ON "resources" ("created_at");              -- 時間排序
CREATE INDEX "idx_resource_created_by" ON "resources" ("created_by");              -- 建立者查詢
CREATE INDEX "idx_resource_level" ON "resources" ("level");                        -- 難度篩選
CREATE INDEX "idx_resource_type" ON "resources" ("type");                          -- 資源類型篩選
CREATE INDEX "idx_resource_type_cost_level" ON "resources" ("type", "cost", "level"); -- 複合條件查詢優化
```

---

### 修改 21: `490_create_table_resource_review.sql`

**檔案位置**: `/Users/xiaoxu/Projects/daodao/daodao-storage/init-scripts-refactored/490_create_table_resource_review.sql`

**修改類型**: 新增索引

**需要修改的內容**:

```sql
-- 新增索引
CREATE INDEX "idx_review_resource_id" ON "resource_review" ("resource_id");  -- 資源評論查詢
CREATE INDEX "idx_review_user_id" ON "resource_review" ("user_id");          -- 使用者評論查詢
```

---

### 修改 22: `510_create_table_entity_tags.sql`

**檔案位置**: `/Users/xiaoxu/Projects/daodao/daodao-storage/init-scripts-refactored/510_create_table_entity_tags.sql`

**修改類型**: 新增索引

**需要修改的內容**:

```sql
-- 新增索引
CREATE INDEX "idx_entity_tags_created_at" ON "entity_tags" ("created_at");              -- 時間排序
CREATE INDEX "idx_entity_tags_tag_id" ON "entity_tags" ("tag_id");                      -- 標籤查詢
CREATE INDEX "idx_entity_tags_type_entity" ON "entity_tags" ("entity_type", "entity_id"); -- 實體標籤查詢
```

---

## 📋 三、執行檢查清單

### 新增檔案檢查
- [ ] `520_create_table_likes.sql` - 已建立並遵循格式規範
- [ ] `540_create_table_user_interests.sql` - 已建立並遵循格式規範
- [ ] `550_create_table_professional_fields.sql` - 已建立並遵循格式規範
- [ ] `560_create_table_user_professional_fields.sql` - 已建立並遵循格式規範

### 修改檔案檢查（依編號順序）
- [ ] `060_create_table_city.sql` - 已新增索引
- [ ] `090_create_table_location.sql` - 已新增索引
- [ ] `100_create_table_contacts.sql` - 已修改欄位型態
- [ ] `120_create_table_users.sql` - 已新增欄位、修改型態、新增索引
- [ ] `160_create_table_user_profiles.sql` - 已新增索引
- [ ] `170_create_table_user_subscription.sql` - 已新增索引
- [ ] `180_create_table_groups.sql` - 已修改欄位型態、新增索引
- [ ] `190_create_table_user_join_group.sql` - 已重新命名欄位、新增索引
- [ ] `210_create_table_project.sql` - 已修改欄位型態
- [ ] `230_create_table_milestone.sql` - 已新增索引
- [ ] `240_create_table_task.sql` - 已新增欄位和索引
- [ ] `250_create_table_post.sql` - 已新增欄位和索引
- [ ] `260_create_table_outcome.sql` - 已新增索引
- [ ] `270_create_table_note.sql` - 已新增索引
- [ ] `280_create_table_review.sql` - 已新增索引
- [ ] `290_create_table_comments.sql` - 已重新命名欄位、修改預設值、新增索引
- [ ] `310_create_table_marathon.sql` - 已修改欄位型態、新增索引
- [ ] `320_create_table_project_marathon.sql` - 已新增索引
- [ ] `430_create_table_categories.sql` - 已新增索引
- [ ] `470_create_table_resources.sql` - 已修改欄位型態、新增索引
- [ ] `490_create_table_resource_review.sql` - 已新增索引
- [ ] `510_create_table_entity_tags.sql` - 已新增索引

---

## ⚠️ 重要注意事項

### 1. 檔案編號規則
- 新增的表格檔案編號：520, 540, 550, 560
- 遵循現有編號間隔（10的倍數）
- 按照相關性和依賴關係排序

### 2. 格式規範
所有新增和修改的檔案必須遵循：
- ✅ 檔案開頭的分隔線和說明區塊（5個等號）
- ✅ 中文註解說明（文件說明、用途、依賴表格、特殊功能）
- ✅ 欄位的行內註解（每個欄位都要有中文說明）
- ✅ 外鍵約束的明確定義
- ✅ 索引的建立和說明
- ✅ COMMENT ON TABLE 和 COLUMN 的詳細註解

### 3. 破壞性變更警告
**⚠️ `470_create_table_resources.sql` 的 URL 欄位縮減**

修改前必須：
1. 備份資料庫
2. 執行檢查查詢確認無超長 URL
3. 如有超長 URL，先使用短網址服務處理

### 4. 欄位重新命名
以下欄位有重新命名，影響應用程式碼：
- `user_join_group.group_participation_role` → `group_participation_role_t`
- `comments.parent_comment_id` → `parent_id`

### 5. 索引建立策略
- 單一欄位索引：用於經常單獨查詢的欄位
- 複合索引：用於經常組合查詢的欄位組
- GIN 索引：用於陣列型態欄位（如 group_type, partner_education_step）
- 部分索引：用於條件查詢（如 WHERE custom_id IS NOT NULL）

---

## 📝 四、驗證方法

### 修改後驗證
```sql
-- 1. 檢查新表是否建立
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('likes', 'user_interests', 'professional_fields', 'user_professional_fields');

-- 2. 檢查 users 表新欄位
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name IN ('custom_id', 'custom_id_verified', 'professional_field', 'personal_slogan');

-- 3. 檢查索引數量
SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public';
-- 應該比修改前增加約 50 個索引

-- 4. 驗證欄位重新命名
SELECT column_name FROM information_schema.columns
WHERE table_name = 'user_join_group' AND column_name = 'group_participation_role_t';

SELECT column_name FROM information_schema.columns
WHERE table_name = 'comments' AND column_name = 'parent_id';
```

---

## 🎯 五、執行建議

### 分階段執行策略

#### 階段一：新增表格（低風險）
1. 建立 4 個新 SQL 檔案
2. 在測試環境執行
3. 驗證表格結構

#### 階段二：新增索引（低風險）
1. 修改檔案新增索引定義
2. 測試索引效能
3. 確認無鎖表問題

#### 階段三：新增欄位（中風險）
1. 修改表格新增欄位
2. 測試應用程式相容性
3. 確認預設值正確

#### 階段四：修改欄位型態（高風險）
1. 備份資料
2. 檢查資料相容性
3. 執行型態變更
4. 驗證資料完整性

#### 階段五：重新命名欄位（高風險）
1. 更新應用程式碼
2. 測試所有相關功能
3. 執行欄位重新命名
4. 部署新版本應用程式

---

## 📚 參考資料

- **Prisma Schema**: `/Users/xiaoxu/Projects/daodao/daodao-server/prisma/schema.prisma`
- **現有 Init Scripts**: `/Users/xiaoxu/Projects/daodao/daodao-storage/init-scripts-refactored/`
- **遷移腳本**: `/Users/xiaoxu/Projects/daodao/daodao-storage/migrations/schema-sync-2024-12/`
- **完整報告**: `/Users/xiaoxu/Projects/daodao/doc/schema-compare/schema-sync-report.md`

---

**建立日期**: 2024-12-26
**文件版本**: 1.0
**狀態**: 待執行
**預估工時**: 4-6 小時（包含測試）
