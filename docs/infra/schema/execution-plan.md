# 資料庫結構同步執行計劃

## 📋 快速摘要

**目標**: 同步 `daodao-storage/init-scripts-refactored` 與 `daodao-server/prisma/schema.prisma`

**變更規模**:
- 新增 4 張表
- 新增 10 個欄位
- 修改 20+ 欄位型態
- 新增 50+ 索引

**遷移檔案位置**: `/Users/xiaoxu/Projects/daodao/daodao-storage/migrations/schema-sync-2024-12/`

---

## ⚠️ 重要警告

### 🔴 必須注意的破壞性變更

**Resources 表 URL 欄位縮減**
- `url`: VARCHAR(2048) → VARCHAR(1000)
- `image_url`: VARCHAR(2048) → VARCHAR(1000)
- `video_url`: VARCHAR(2048) → VARCHAR(1000)

**執行前必須檢查**:
```sql
-- 如果有任何結果，必須先處理
SELECT id, name, LENGTH(url) FROM resources WHERE LENGTH(url) > 1000;
```

---

## ✅ 執行前檢查清單

### 1. 備份資料庫（必做！）
```bash
pg_dump -h localhost -U your_user -d daodao > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 2. 資料驗證
```sql
-- 檢查 URL 長度
SELECT COUNT(*) FROM resources WHERE LENGTH(url) > 1000;
SELECT COUNT(*) FROM resources WHERE LENGTH(image_url) > 1000;
SELECT COUNT(*) FROM resources WHERE LENGTH(video_url) > 1000;
-- ⚠️ 如果任何一個 COUNT > 0，必須先修正資料
```

### 3. 環境確認
- [ ] 已在測試環境測試過
- [ ] 已規劃維護時間（建議 30-60 分鐘）
- [ ] 已通知相關人員
- [ ] 已準備回滾方案

---

## 🚀 執行步驟

### 最簡單方式（推薦）

```bash
# 1. 切換到遷移目錄
cd /Users/xiaoxu/Projects/daodao/daodao-storage/migrations/schema-sync-2024-12

# 2. 執行主腳本
psql -h localhost -U your_user -d daodao -f run_all_migrations.sql

# 3. 重新產生 Prisma Client
cd /Users/xiaoxu/Projects/daodao/daodao-server
npm run prisma:generate

# 4. 驗證
npx prisma validate
```

### 預估執行時間

| 資料庫大小 | 執行時間 |
|-----------|---------|
| < 1GB | 5 分鐘 |
| 1-10GB | 15-30 分鐘 |
| > 10GB | 30-60 分鐘 |

---

## 🔍 執行後驗證

### 快速驗證
```sql
-- 1. 檢查新表（應該有 4 筆）
SELECT COUNT(*) FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('likes', 'user_interests', 'professional_fields', 'user_professional_fields');

-- 2. 檢查 users 新欄位（應該有 6 筆）
SELECT COUNT(*) FROM information_schema.columns
WHERE table_name = 'users'
AND column_name IN ('custom_id', 'custom_id_verified', 'custom_id_created_at',
                     'professional_field', 'personal_slogan', 'referral_source');

-- 3. Prisma 驗證
-- 在 daodao-server 目錄執行：
-- npx prisma validate
```

---

## 🔙 如果需要回滾

```bash
# 從備份還原
psql -h localhost -U your_user -d daodao < backup_YYYYMMDD_HHMMSS.sql
```

---

## 💻 程式碼需要的變更

### 必須更改（Breaking Changes）

#### 1. 欄位重新命名
```typescript
// ❌ 舊程式碼
user_join_group.group_participation_role
comments.parent_comment_id

// ✅ 新程式碼
user_join_group.group_participation_role_t
comments.parent_id
```

**搜尋並取代**:
```bash
# 在專案中搜尋這些字串並替換
grep -r "group_participation_role" --exclude-dir=node_modules
grep -r "parent_comment_id" --exclude-dir=node_modules
```

#### 2. URL 長度驗證
```typescript
// 新增資源時加入驗證
if (url.length > 1000) {
  throw new Error('URL 不可超過 1000 字元，請使用短網址');
}
```

---

## 📝 新功能開發建議

遷移完成後，可以開發以下新功能：

### 1. 按讚功能 (likes 表)
- POST `/api/posts/:id/like` - 按讚
- DELETE `/api/posts/:id/like` - 取消按讚
- GET `/api/posts/:id/likes` - 查詢按讚列表

### 2. 使用者興趣 (user_interests 表)
- 個人檔案頁顯示興趣標籤
- 根據興趣推薦內容
- PUT `/api/users/:id/interests` - 更新興趣

### 3. 專業領域 (professional_fields 表)
- 註冊時選擇專業領域
- 個人檔案顯示專業領域
- 後台管理專業領域選項

### 4. 自訂 ID (users.custom_id)
- 使用者可設定自訂 ID（如 @username）
- 驗證 ID 可用性
- 個人頁面 URL 使用自訂 ID

---

## 📊 資料庫效能影響

### 正面影響 ✅
- 查詢速度提升（50+ 個新索引）
- JOIN 效能優化
- 常用查詢條件組合優化

### 注意事項 ⚠️
- 資料庫大小增加 10-20%
- INSERT/UPDATE 略慢（需更新索引）
- 建議執行後運行 `VACUUM ANALYZE`

---

## 📂 相關檔案位置

```
daodao-storage/
└── migrations/
    └── schema-sync-2024-12/
        ├── 001_create_missing_tables.sql      # 建立新表
        ├── 002_add_missing_columns.sql        # 新增欄位
        ├── 003_alter_column_types.sql         # 修改型態
        ├── 004_rename_columns.sql             # 重新命名
        ├── 005_create_missing_indexes.sql     # 建立索引
        ├── run_all_migrations.sql             # 主執行腳本 ⭐
        ├── README.md                          # 英文完整文件
        ├── MIGRATION_SUMMARY.md               # 執行摘要（英文）
        └── QUICK_START.md                     # 快速開始（英文）

doc/
└── schema-compare/
    ├── demand.md                              # 原始需求
    ├── schema-sync-report.md                  # 完整中文報告 ⭐
    └── execution-plan.md                      # 本檔案 ⭐
```

---

## 🎯 下一步行動

### 立即執行
1. [ ] 閱讀本文件
2. [ ] 在測試環境執行遷移
3. [ ] 測試所有功能
4. [ ] 確認無誤後在正式環境執行

### 短期（1週）
1. [ ] 更新程式碼（欄位重新命名）
2. [ ] 重新產生 Prisma Client
3. [ ] 更新 API 文件
4. [ ] 部署到正式環境

### 中期（1個月）
1. [ ] 開發新功能（按讚、興趣等）
2. [ ] 建立專業領域管理介面
3. [ ] 使用者文件更新

---

## 📞 需要協助？

**完整文件**: `/Users/xiaoxu/Projects/daodao/doc/schema-compare/schema-sync-report.md`

**英文文件**: `/Users/xiaoxu/Projects/daodao/daodao-storage/migrations/schema-sync-2024-12/README.md`

---

**建立日期**: 2024-12-26
**狀態**: 準備就緒，可執行
**建議執行時間**: 低流量時段或維護窗口
