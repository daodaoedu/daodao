# 國家與城市選擇功能 - 現況分析

## 概覽

本文件記錄 daodao 專案中使用者編輯個人資料時，選擇國家與城市的完整實作邏輯。

---

## 1. 資料庫結構

### 1.1 相關資料表

#### `country` 表
位置：`daodao-storage/init-scripts-refactored/050_create_table_country.sql`

| 欄位 | 類型 | 說明 |
|------|------|------|
| id | SERIAL PRIMARY KEY | 自動遞增主鍵 |
| alpha2 | CHAR(2) | ISO 3166-1 alpha-2 代碼（如：TW、US、JP） |
| alpha3 | CHAR(3) | ISO 3166-1 alpha-3 代碼（如：TWN、USA、JPN） |
| name | VARCHAR(100) | 國家名稱 |

- 資料量：約 250 個國家
- 資料來源：`999_insert_data.sql`（705 行）
- 特殊處理：台灣的 ID 被硬編碼為 158

#### `city` 表
位置：`daodao-storage/init-scripts-refactored/060_create_table_city.sql`

| 欄位 | 類型 | 說明 |
|------|------|------|
| id | SERIAL PRIMARY KEY | 自動遞增主鍵 |
| name | VARCHAR(100) UNIQUE | 城市名稱（具唯一性） |

- 索引：`idx_city_name`
- 資料量：3,890 個城市
- 資料來源：`902_insert_cities_data.sql`（88 KB，3,959 行）

#### `location` 表
位置：`daodao-storage/init-scripts-refactored/090_create_table_location.sql`

| 欄位 | 類型 | 說明 |
|------|------|------|
| id | SERIAL PRIMARY KEY | 自動遞增主鍵 |
| city_id | INT (FK→city) | 城市 ID |
| country_id | INT (FK→country) | 國家 ID |
| isTaiwan | BOOLEAN | 是否為台灣的標記 |

- 複合唯一索引：`ux_location_country_city`（防止重複組合）

### 1.2 城市資料分類

| 類別 | 數量 | 命名格式 | 範例 |
|------|------|---------|------|
| 台灣縣市 | 22 | `{city}_city` | taipei_city, new_taipei_city |
| 特殊城市 | 3 | 特定值 | other, tbd, online |
| 全球城市 | 3,865 | `{city}_{country}` | tokyo_japan, paris_france |

---

## 2. 後端實作

### 2.1 相關檔案

| 檔案 | 路徑 | 說明 |
|------|------|------|
| user.service.ts | `daodao-server/src/services/user.service.ts` | 核心業務邏輯 |
| user-stats-service.ts | `daodao-server/src/services/user-stats-service.ts` | 位置統計 |
| schema.prisma | `daodao-server/prisma/schema.prisma` | 資料模型定義 |

### 2.2 城市名稱映射（user.service.ts 第 160-211 行）

```typescript
const getCityNameMapping = (): Record<string, city_t> => {
  // 中文→英文映射（台灣城市）
  '台北市' → 'taipei_city'
  '基隆市' → 'keelung_city'
  // ... 共 22 個台灣城市

  // 英文枚舉值直接映射
  'taipei_city' → 'taipei_city'
  'tbd' → 'tbd'
  'online' → 'online'
}
```

### 2.3 API 端點

| 方法 | 端點 | 說明 |
|------|------|------|
| POST | /api/v1/users | 創建用戶（可設定 location） |
| PUT | /api/v1/users/me | 更新當前用戶（包含 location） |
| GET | /api/v1/users | 查詢用戶列表（支援 location 過濾） |
| GET | /api/v1/users/me | 獲取當前用戶信息 |

**注意：目前沒有專門的 country/city 查詢 API 端點**

### 2.4 位置過濾邏輯

```typescript
// user.service.ts 第 437-495 行
if (location) {
  whereConditions.location = {
    city: {
      name: {
        in: String(location).split(',')  // 支援多個城市過濾
      }
    }
  };
}
```

---

## 3. 前端實作

### 3.1 相關檔案

| 檔案 | 路徑 | 說明 |
|------|------|------|
| basic-info-section.tsx | `daodao-f2e/apps/product/src/components/settings/public-info/` | 城市選擇 UI |
| public-info-form.tsx | 同上 | 完整表單 |
| schema.ts | 同上 | 表單驗證 |
| zh-TW.json | `daodao-f2e/packages/i18n/src/locales/` | 城市翻譯（3,884 項） |

### 3.2 城市選擇組件（CityCombobox）

**功能特性：**
- 搜尋篩選（支援中英文、城市名稱和代碼）
- 鍵盤導航（上下箭頭、Enter、Escape）
- 按標籤字母排序（基於 locale 語言）
- 最多 3,884 個選項的下拉列表

**搜尋邏輯：**
```typescript
filteredOptions = options.filter(
  (option) =>
    option.label.toLowerCase().includes(query) ||
    option.value.toLowerCase().includes(query)
)
```

### 3.3 i18n 資料結構

**城市資料格式（zh-TW.json）：**
```json
{
  "cities": {
    "aalborg_denmark": "奧爾堡, 丹麥",
    "taipei_city": "台北市",
    "tokyo_japan": "東京, 日本",
    ...
  }
}
```

**特性：**
- 總計 3,884 個城市條目
- key：英文代碼（與資料庫 city.name 一致）
- value：中文標籤（用於前端顯示）
- 國家信息包含在標籤中，而非單獨的下拉選擇器

### 3.4 表單架構

```typescript
// schema.ts
location: z.string().optional()
```

- location 是可選欄位
- 只儲存城市代碼（不分離儲存國家）
- 國家信息通過 location 表中的外鍵自動關聯

---

## 4. 資料流

```
┌─────────────────────────────────────────────────────────────────────┐
│                           完整資料流                                  │
└─────────────────────────────────────────────────────────────────────┘

1. 前端載入
   └── i18n 翻譯檔載入 3,884 個城市選項
       └── 格式：{ value: "tokyo_japan", label: "東京, 日本" }

2. 用戶搜尋與選擇
   └── 輸入搜尋詞 → 即時過濾
       └── 選擇城市 → 取得 value（城市代碼）

3. 提交到後端
   └── 城市代碼（例："taipei_city"）作為 location 欄位發送
       └── API：PUT /api/v1/users/me

4. 後端處理
   └── 驗證城市代碼（使用城市映射表）
       └── 查詢或創建 location 記錄
           └── 將 location_id 儲存到 users 表

5. 資料檢索
   └── 查詢用戶 → location → city → name
       └── 前端根據城市代碼從 i18n 取得中文標籤顯示
```

---

## 5. 現有問題

### 5.1 前端效能問題

| 問題 | 影響 | 嚴重程度 |
|------|------|---------|
| i18n 包含 3,884 個城市條目 | 增加 bundle size | 中 |
| 每次編輯都載入完整城市列表 | 記憶體與渲染效能 | 中 |
| 無伺服器端分頁或搜尋 | 無法擴展 | 高 |

### 5.2 架構設計問題

| 問題 | 說明 | 嚴重程度 |
|------|------|---------|
| 缺少城市查詢 API | 前端必須在 build 時包含全部城市 | 高 |
| 國家資料未被利用 | 資料庫有 250+ 國家但前端無國家選擇 | 中 |
| isTaiwan 硬編碼 | 應使用 country_id == 158 查詢 | 低 |
| 城市名稱嵌入國家 | 命名格式如 `tokyo_japan` 缺乏彈性 | 中 |

### 5.3 用戶體驗問題

| 問題 | 說明 |
|------|------|
| 無法單獨選擇國家 | 必須從 3,884 個城市中選擇 |
| 搜尋不夠智能 | 只支援字串包含搜尋 |
| 無分類或階層選擇 | 所有城市扁平顯示 |

---

## 6. 相關檔案總覽

### 資料庫

```
daodao-storage/init-scripts-refactored/
├── 050_create_table_country.sql      # 國家表定義
├── 060_create_table_city.sql         # 城市表定義
├── 090_create_table_location.sql     # 位置表定義
├── 902_insert_cities_data.sql        # 城市資料（88 KB）
└── 999_insert_data.sql               # 國家資料
```

### 後端

```
daodao-server/src/
├── services/
│   ├── user.service.ts               # 核心業務邏輯
│   └── user-stats-service.ts         # 位置統計
├── controllers/
│   └── user.controller.ts            # API 控制器
├── types/
│   └── user.types.ts                 # 類型定義
└── prisma/
    └── schema.prisma                 # 資料模型
```

### 前端

```
daodao-f2e/
├── apps/product/src/components/settings/public-info/
│   ├── basic-info-section.tsx        # 城市選擇 UI
│   ├── public-info-form.tsx          # 完整表單
│   └── schema.ts                     # 表單驗證
└── packages/i18n/src/locales/
    └── zh-TW.json                    # 城市翻譯（3,884 項）
```

### 文件

```
doc/location/
├── cities.json                       # 城市資料來源（3,891 項）
├── demand.md                         # 原始需求記錄
└── current-state.md                  # 本文件
```

---

## 7. 待解決事項

1. **建立城市查詢 API** - 支援伺服器端搜尋和分頁
2. **分離國家和城市選擇** - 減少前端載入的資料量
3. **優化前端組件** - 支援虛擬滾動或懶載入
4. **清理 isTaiwan 標記** - 改用 country_id 查詢
5. **重新設計資料結構** - 考慮城市-國家關係的正規化

---

*文件建立日期：2026-02-02*
