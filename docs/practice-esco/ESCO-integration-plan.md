# ESCO 技能分類系統整合計劃

## 目標

將 ESCO（歐洲技能、能力、資格與職業分類系統）整合到 DaoDao 學習平台，實現：
1. ESCO 技能搜尋（中英文）
2. 用戶技能標記
3. 基於技能的實踐推薦

---

## MVP 範圍

### 目標領域（4 個）
| 英文名稱 | 中文名稱 |
|---------|---------|
| ICT | 資訊通信技術 |
| Arts and humanities | 藝術與人文 |
| Language | 語言 |
| Communication, collaboration and creativity | 溝通、協作與創意 |

### 核心功能
1. **ESCO 技能搜尋** - 支援中英文關鍵字搜尋、自動補全
2. **用戶技能管理** - 添加/移除/更新個人 ESCO 技能
3. **實踐推薦** - 根據用戶技能推薦 2-3 個實踐模板

---

## 資料庫設計

### 新增表格概覽

| 表名 | 說明 | SQL 檔案 |
|------|------|---------|
| `esco_skills` | ESCO 技能主表 | `570_create_table_esco_skills.sql` |
| `user_esco_skills` | 用戶技能關聯 | `575_create_table_user_esco_skills.sql` |
| `practice_template_esco_skills` | 模板技能關聯 | `580_create_table_practice_template_esco_skills.sql` |

### 表格關係圖

```
users (1) ─────────────── (N) user_esco_skills (N) ─────────────── (1) esco_skills
                                                                          │
                                                                          │
practice_templates (1) ── (N) practice_template_esco_skills (N) ──────────┘
```

---

## API 設計

### ESCO 技能搜尋

| 方法 | 端點 | 說明 | 認證 |
|------|------|------|------|
| GET | `/api/v1/esco-skills/search` | 搜尋技能（中英文） | 否 |
| GET | `/api/v1/esco-skills/suggest` | 自動補全建議 | 否 |
| GET | `/api/v1/esco-skills/hierarchy` | 取得層級結構 | 否 |
| GET | `/api/v1/esco-skills/:id` | 取得單一技能詳情 | 否 |

#### 搜尋 API 參數

```
GET /api/v1/esco-skills/search?q=javascript&category=ICT&limit=20
```

| 參數 | 類型 | 說明 |
|------|------|------|
| `q` | string | 搜尋關鍵字（必填） |
| `category` | string | 篩選大類（選填） |
| `limit` | number | 結果數量，預設 20 |
| `offset` | number | 偏移量 |

#### 搜尋回應範例

```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "uri": "http://data.europa.eu/esco/skill/...",
      "preferredLabel": "JavaScript programming",
      "preferredLabelZh": "JavaScript 程式設計",
      "altLabels": ["JS development", "JavaScript coding"],
      "altLabelsZh": ["JS 開發"],
      "conceptType": "Skill",
      "hierarchy": {
        "level0": "ICT",
        "level1": "Programming languages",
        "level0Zh": "資訊通信技術",
        "level1Zh": "程式語言"
      },
      "matchType": "exact"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalItems": 100,
    "itemsPerPage": 20,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### 用戶技能管理

| 方法 | 端點 | 說明 | 認證 |
|------|------|------|------|
| GET | `/api/v1/users/me/esco-skills` | 取得我的技能 | 是 |
| POST | `/api/v1/users/me/esco-skills` | 添加技能 | 是 |
| PUT | `/api/v1/users/me/esco-skills/:skillId` | 更新技能 | 是 |
| DELETE | `/api/v1/users/me/esco-skills/:skillId` | 移除技能 | 是 |
| GET | `/api/v1/users/:userId/esco-skills` | 取得指定用戶技能 | 否 |

#### 添加技能請求

```json
POST /api/v1/users/me/esco-skills
{
  "escoSkillId": 123,
  "proficiency": 4,
  "isPrimary": true
}
```

### 推薦 API

| 方法 | 端點 | 說明 | 認證 |
|------|------|------|------|
| GET | `/api/v1/users/me/practice-recommendations` | 基於技能推薦實踐 | 是 |

#### 推薦回應範例

```json
{
  "success": true,
  "data": {
    "recommendations": [
      {
        "template": {
          "id": "uuid-here",
          "title": "每日程式練習"
        },
        "relevanceScore": 0.85,
        "matchedSkills": ["JavaScript programming", "Web development"],
        "reason": "根據您的技能「JavaScript 程式設計」推薦"
      }
    ]
  }
}
```

---

## 服務層設計

### 檔案結構

```
src/
├── services/
│   ├── esco-skill.service.ts          # ESCO 技能搜尋、層級
│   ├── user-esco-skill.service.ts     # 用戶技能 CRUD
│   └── skill-recommendation.service.ts # 推薦引擎
├── routes/
│   └── esco-skill.routes.ts
├── controllers/
│   └── esco-skill.controller.ts
├── validators/
│   └── esco-skill.validators.ts
├── types/
│   └── esco-skill.types.ts
└── scripts/
    └── import-esco-skills.ts          # 資料匯入
```

### 核心服務函數

#### esco-skill.service.ts

| 函數 | 說明 | 快取 |
|------|------|------|
| `searchEscoSkills(query, options)` | 搜尋技能（中英文） | 否 |
| `suggestEscoSkills(query, limit)` | 自動補全 | 否 |
| `getEscoHierarchy(category?)` | 取得層級結構 | Redis 1hr |
| `getEscoSkillById(id)` | 取得單一技能 | 否 |

#### user-esco-skill.service.ts

| 函數 | 說明 |
|------|------|
| `getUserEscoSkills(userId)` | 取得用戶技能 |
| `addUserEscoSkill(userId, data)` | 添加技能 |
| `updateUserEscoSkill(userId, skillId, data)` | 更新 |
| `removeUserEscoSkill(userId, skillId)` | 移除 |

#### skill-recommendation.service.ts

| 函數 | 說明 |
|------|------|
| `getRecommendedPractices(userId, limit)` | 推薦實踐模板 |

---

## 推薦引擎邏輯

### 簡單推薦算法

```
1. 獲取用戶的 ESCO 技能 IDs
2. 查詢 practice_template_esco_skills 中關聯這些技能的模板
3. 按 relevance_score 加總排序
4. 返回 top 3 推薦
5. 無技能時返回熱門模板
```

### 進階：層級相似度計算

```javascript
function calculateSkillSimilarity(userHierarchy, templateHierarchy) {
  // Level 0 匹配: 0.25
  // Level 1 匹配: 0.5
  // Level 2 匹配: 0.75
  // Level 3 匹配: 1.0
  let matchLevel = 0;
  for (let i = 0; i < 4; i++) {
    if (userHierarchy[i] === templateHierarchy[i]) {
      matchLevel = i + 1;
    } else {
      break;
    }
  }
  return matchLevel * 0.25;
}
```

---

## 資料匯入策略

### 資料來源

ESCO 官方提供 CSV 下載：https://esco.ec.europa.eu/en/use-esco/download

需要準備：
1. `skills_en.csv` - 英文技能資料
2. 中文翻譯資料（現有 `language.csv` 範例）
3. `skillsHierarchy_en.csv` - 層級關係

### 匯入腳本

```bash
# package.json scripts
"esco:import": "ts-node src/scripts/import-esco-skills.ts"

# 執行
pnpm run esco:import
```

### 匯入流程

1. 讀取英文 CSV
2. 讀取中文翻譯 CSV
3. 過濾 MVP 目標領域（4 個大類）
4. 批次匯入（每次 100 筆）
5. 建立層級關係

---

## 與現有系統整合

### 整合用戶個人檔案

在 `FormattedUserResponse` 中新增 `escoSkills` 欄位：

```typescript
{
  // ... 現有欄位
  escoSkills: [
    {
      id: 123,
      label: "JavaScript 程式設計",
      isPrimary: true
    }
  ]
}
```

### 混合搜尋（ESCO + 自訂標籤）

```
GET /api/v1/skills/search?q=程式
```

同時返回 ESCO 技能和現有標籤結果：

```json
{
  "escoSkills": [...],
  "customTags": [...]
}
```

---

## 實施順序

### Phase 1：資料庫與匯入（第 1 週）
- [ ] 新增 SQL 建表腳本到 `init-scripts-refactored`
- [ ] 執行 migration
- [ ] 準備 ESCO CSV 資料
- [ ] 實作匯入腳本
- [ ] 匯入 MVP 領域資料

### Phase 2：核心 API（第 2 週）
- [ ] 更新 `prisma/schema.prisma`
- [ ] 執行 `pnpm run prisma:generate`
- [ ] 實作 `esco-skill.service.ts`
- [ ] 實作搜尋和建議 API
- [ ] 添加 Redis 快取
- [ ] OpenAPI 文檔

### Phase 3：用戶整合（第 3 週）
- [ ] 實作 `user-esco-skill.service.ts`
- [ ] 用戶技能管理 API
- [ ] 整合到用戶個人資料回應

### Phase 4：推薦系統（第 4 週）
- [ ] 建立模板-技能關聯資料
- [ ] 實作推薦服務
- [ ] 推薦 API

---

## 關鍵檔案清單

### 新增檔案

| 檔案路徑 | 說明 |
|---------|------|
| `daodao-storage/init-scripts-refactored/570_create_table_esco_skills.sql` | ESCO 技能表 |
| `daodao-storage/init-scripts-refactored/575_create_table_user_esco_skills.sql` | 用戶技能關聯表 |
| `daodao-storage/init-scripts-refactored/580_create_table_practice_template_esco_skills.sql` | 模板技能關聯表 |
| `daodao-server/src/services/esco-skill.service.ts` | 技能搜尋服務 |
| `daodao-server/src/services/user-esco-skill.service.ts` | 用戶技能服務 |
| `daodao-server/src/services/skill-recommendation.service.ts` | 推薦服務 |
| `daodao-server/src/routes/esco-skill.routes.ts` | API 路由 |
| `daodao-server/src/controllers/esco-skill.controller.ts` | 控制器 |
| `daodao-server/src/validators/esco-skill.validators.ts` | 驗證器 |
| `daodao-server/src/types/esco-skill.types.ts` | 類型定義 |
| `daodao-server/src/scripts/import-esco-skills.ts` | 資料匯入腳本 |

### 修改檔案

| 檔案路徑 | 修改內容 |
|---------|---------|
| `daodao-server/prisma/schema.prisma` | 新增 3 個 model |
| `daodao-server/src/types/user.types.ts` | 新增 escoSkills 類型 |
| `daodao-server/src/services/user.service.ts` | 整合 ESCO 技能到用戶回應 |
| `daodao-server/src/app.ts` | 註冊新路由 |

---

## 驗證方式

### 1. 資料匯入驗證

```bash
pnpm run esco:import
# 預期：匯入 MVP 領域的技能資料
```

```sql
SELECT COUNT(*) FROM esco_skills;
-- 預期：數千筆資料
```

### 2. API 測試

```bash
# 搜尋測試
curl "http://localhost:3000/api/v1/esco-skills/search?q=javascript"

# 用戶技能管理
curl -X POST "http://localhost:3000/api/v1/users/me/esco-skills" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"escoSkillId": 123}'

# 推薦測試
curl "http://localhost:3000/api/v1/users/me/practice-recommendations" \
  -H "Authorization: Bearer $TOKEN"
```

### 3. Swagger 文檔

訪問 `/api-docs` 確認新 API 有正確文檔
