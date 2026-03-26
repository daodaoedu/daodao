# Location 全球城市支援 - 實施規劃

## 一、需求背景

### 當前問題

使用者嘗試使用全球城市（如 `tokyo_japan`）作為居住地時，系統返回錯誤：

```text
'tokyo_japan' 不是有效的城市名稱
```

### 需求目標

將居住區（location）從僅支援台灣 22 個縣市擴展為支援全世界主要城市。

---

## 二、現況分析

### 2.1 資料架構現況

#### country 表

| 欄位 | 類型 | 內容範例 | 說明 |
| --- | --- | --- | --- |
| id | SERIAL | 1, 2, 3 | 主鍵 |
| alpha2 | CHAR(2) | `TW`, `JP`, `US` | ISO 3166-1 二字母代碼 |
| alpha3 | CHAR(3) | `TWN`, `JPN`, `USA` | ISO 3166-1 三字母代碼 |
| name | VARCHAR(100) | `台灣`, `日本`, `美國` | **已是中文名稱** |

#### city 表

| 欄位 | 類型 | 內容範例 | 說明 |
| --- | --- | --- | --- |
| id | SERIAL | 1, 2, 3 | 主鍵 |
| name | VARCHAR(100) | `tokyo_japan`, `taipei_city` | **實際上是 code** |

#### location 表

| 欄位 | 類型 | 說明 |
| --- | --- | --- |
| id | SERIAL | 主鍵 |
| city_id | INT | 關聯 city 表 |
| country_id | INT | 關聯 country 表 |
| isTaiwan | BOOLEAN | 是否為台灣地區 |

#### 關於 ISO 3166-1 代碼

| 代碼 | 格式 | 範例 | 常見用途 |
| --- | --- | --- | --- |
| alpha2 | 2 字母 | `TW`, `JP` | 網域、語系代碼、API 參數 |
| alpha3 | 3 字母 | `TWN`, `JPN` | 國際貿易、較少歧義 |

#### 城市代碼說明

城市**沒有**廣泛使用的國際標準代碼。現有的 `city.name` 使用 `{city}_{country}` 格式（如 `tokyo_japan`），這個設計：

- ✅ 可讀性高（一看就知道是哪裡）
- ✅ 全球唯一（包含國家，不會衝突）
- ✅ URL 友善（可直接用於路由）
- ✅ 前端已在使用

因此 **不需要** 額外新增城市標準代碼欄位。

### 2.2 涉及的核心檔案

| 層級 | 檔案路徑 | 關鍵內容 |
| --- | --- | --- |
| **資料庫** | `daodao-storage/init-scripts-refactored/050_create_table_country.sql` | country 表 |
| **資料庫** | `daodao-storage/init-scripts-refactored/060_create_table_city.sql` | city 表 |
| **資料庫** | `daodao-storage/init-scripts-refactored/090_create_table_location.sql` | location 表 |
| **服務層** | `src/services/user.service.ts` | `getCityNameMapping()`、建立/更新使用者邏輯 |
| **驗證層** | `src/validators/user.validators.ts` | Location 欄位的 Zod schema |
| **前端資料** | `daodao-f2e/public/data/cities.json` | 全球城市列表 |

---

## 三、技術方案設計

### 3.1 架構調整策略

保留現有表結構和欄位，新增多語系支援欄位。

### 3.2 資料庫調整方案

#### 欄位調整摘要

| 表 | 既有欄位 | 新增欄位 | 說明 |
| --- | --- | --- | --- |
| country | name (已是中文) | `name_en` | 只需新增英文 |
| city | name (實為 code) | `name_en`, `name_zh_tw`, `country_id`, `is_active` | 新增顯示名稱和關聯 |

#### 優化後架構

```text
┌──────────────────────────┐
│         country          │
│ - id                     │
│ - alpha2 (TW, JP)        │  ← 既有
│ - alpha3 (TWN, JPN)      │  ← 既有
│ - name (台灣、日本)       │  ← 既有，已是中文
│ - name_en                │  ← 新增 (Taiwan, Japan)
└────────────┬─────────────┘
             │ 1
             │
             │ N
┌────────────┴─────────────┐
│          city            │
│ - id                     │
│ - name (tokyo_japan)     │  ← 既有，實為 code
│ - name_en (Tokyo)        │  ← 新增
│ - name_zh_tw (東京)      │  ← 新增
│ - country_id             │  ← 新增（關聯 country）
│ - is_active              │  ← 新增
└────────────┬─────────────┘
             │ 1
             │
             │ N
┌────────────┴─────────────┐
│        location          │
│ - id                     │
│ - city_id                │  ← 既有
│ - country_id             │  ← 既有（保留相容）
│ - isTaiwan               │  ← 既有（保留相容）
└──────────────────────────┘
```

#### country 表調整

```sql
-- 050_create_table_country.sql
CREATE TABLE "country" (
    "id" SERIAL PRIMARY KEY,
    "alpha2" CHAR(2) UNIQUE,                       -- 既有：ISO 3166-1 alpha-2
    "alpha3" CHAR(3) UNIQUE,                       -- 既有：ISO 3166-1 alpha-3
    "name" VARCHAR(100) NOT NULL,                  -- 既有：中文名稱（台灣、日本）
    "name_en" VARCHAR(100)                         -- 新增：英文名稱（Taiwan、Japan）
);

CREATE INDEX "idx_country_alpha2" ON "country" ("alpha2");
```

#### city 表調整

```sql
-- 060_create_table_city.sql
CREATE TABLE "city" (
    "id" SERIAL PRIMARY KEY,
    "name" VARCHAR(100) NOT NULL UNIQUE,           -- 既有：城市 code（tokyo_japan）
    "name_en" VARCHAR(100),                        -- 新增：英文名稱（Tokyo）
    "name_zh_tw" VARCHAR(100),                     -- 新增：繁體中文名稱（東京）
    "country_id" INT REFERENCES "country"("id"),   -- 新增：關聯國家
    "is_active" BOOLEAN DEFAULT true               -- 新增：是否啟用
);

CREATE INDEX "idx_city_name" ON "city" ("name");
CREATE INDEX "idx_city_country" ON "city" ("country_id");
CREATE INDEX "idx_city_active" ON "city" ("is_active");
```

#### location 表（維持不變）

```sql
-- 090_create_table_location.sql（保持現狀）
CREATE TABLE "location" (
    "id" SERIAL PRIMARY KEY,
    "city_id" INT REFERENCES "city"("id"),
    "country_id" INT REFERENCES "country"("id"),   -- 保留：相容現有資料
    "isTaiwan" BOOLEAN                             -- 保留：相容現有邏輯
);
```

### 3.3 後端服務層調整

#### 修改 `user.service.ts`

**調整前（當前邏輯）：**

```typescript
// 透過 enum 映射查找
const cityEnum = getCityNameMapping()[areaCode];
if (!cityEnum) {
  throw new ConflictError(`'${areaCode}' 不是有效的城市名稱`);
}
```

**調整後（新邏輯）：**

```typescript
// 直接查詢 city 表驗證
const city = await tx.city.findFirst({
  where: {
    name: areaCode,
    is_active: true
  },
  include: { country: true }
});

if (!city) {
  throw new ConflictError(`'${areaCode}' 不是有效的城市名稱`);
}

// 查找或建立對應的 location
let location = await tx.location.findFirst({
  where: { city_id: city.id }
});

if (!location) {
  location = await tx.location.create({
    data: {
      city_id: city.id,
      country_id: city.country_id,
      isTaiwan: city.country?.alpha2 === 'TW'
    }
  });
}
```

#### 新增城市查詢服務

```typescript
// src/services/city.service.ts
export const cityService = {
  // 取得所有啟用的城市
  getAllCities: async (locale: string = 'zh-TW') => {
    const cities = await prisma.city.findMany({
      where: { is_active: true },
      include: { country: true },
      orderBy: { name: 'asc' }
    });

    return cities.map(city => ({
      code: city.name,
      displayName: locale === 'en'
        ? city.name_en || city.name
        : city.name_zh_tw || city.name_en || city.name,
      countryCode: city.country?.alpha2,
      countryName: locale === 'en'
        ? city.country?.name_en || city.country?.name
        : city.country?.name  // country.name 已是中文
    }));
  },

  // 按國家篩選城市
  getCitiesByCountry: async (countryCode: string) => {
    return await prisma.city.findMany({
      where: {
        country: { alpha2: countryCode },
        is_active: true
      },
      include: { country: true }
    });
  },

  // 搜尋城市（支援多語系）
  searchCities: async (query: string) => {
    return await prisma.city.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { name_en: { contains: query, mode: 'insensitive' } },
          { name_zh_tw: { contains: query, mode: 'insensitive' } }
        ],
        is_active: true
      },
      include: { country: true }
    });
  }
};
```

### 3.4 API 端點

```typescript
// GET /api/v1/cities
// GET /api/v1/cities?country=TW
// GET /api/v1/cities?search=東京
// GET /api/v1/cities?locale=en

router.get('/api/v1/cities', async (req, res) => {
  const { country, search, locale = 'zh-TW' } = req.query;

  let cities;
  if (search) {
    cities = await cityService.searchCities(search as string);
  } else if (country) {
    cities = await cityService.getCitiesByCountry(country as string);
  } else {
    cities = await cityService.getAllCities(locale as string);
  }

  return res.json({ success: true, data: cities });
});
```

---

## 四、多語系設計

### 4.1 欄位設計

| 表 | 中文欄位 | 英文欄位 | 說明 |
| --- | --- | --- | --- |
| country | `name`（既有） | `name_en`（新增） | name 本身已是中文 |
| city | `name_zh_tw`（新增） | `name_en`（新增） | name 是 code |

### 4.2 顯示邏輯（Fallback）

```typescript
// 國家名稱
function getCountryName(country: Country, locale: string): string {
  if (locale === 'en') {
    return country.name_en || country.name;
  }
  return country.name;  // name 已是中文
}

// 城市名稱
function getCityName(city: City, locale: string): string {
  if (locale === 'en') {
    return city.name_en || city.name;
  }
  return city.name_zh_tw || city.name_en || city.name;
}
```

### 4.3 翻譯資料來源

| 類型 | 來源 |
| --- | --- |
| 台灣城市 | 官方行政區名稱 |
| 全球城市 | GeoNames（免費）、OpenStreetMap |
| 國家名稱 | ISO 3166-1 官方名稱 |

---

## 五、實施步驟

### Phase 1: 資料庫調整

- [ ] 1.1 更新 `050_create_table_country.sql`
  - [ ] 新增 `name_en` 欄位
  - [ ] 為 `alpha2`、`alpha3` 新增 UNIQUE 約束
- [ ] 1.2 更新 `060_create_table_city.sql`
  - [ ] 新增 `name_en`、`name_zh_tw` 欄位
  - [ ] 新增 `country_id` 外鍵
  - [ ] 新增 `is_active` 欄位
- [ ] 1.3 準備翻譯資料
  - [ ] 更新 country 資料（補充 name_en）
  - [ ] 更新 city 資料（補充 name_en、name_zh_tw、country_id）

### Phase 2: 後端服務調整

- [ ] 2.1 重構 `user.service.ts`
  - [ ] 移除 `getCityNameMapping()` 硬編碼映射
  - [ ] 改為查詢 `city` 表驗證
  - [ ] 支援自動建立 location 記錄
- [ ] 2.2 建立 `city.service.ts`
- [ ] 2.3 新增城市 API 端點
- [ ] 2.4 更新 Prisma Schema

### Phase 3: 前端整合

- [ ] 3.1 更新城市資料源（從 API 取得）
- [ ] 3.2 城市選擇器支援多語系顯示

---

## 六、查詢範例

```sql
-- 取得使用者位置完整資訊（繁體中文）
SELECT
    l.id as location_id,
    c.name as city_code,
    COALESCE(c.name_zh_tw, c.name_en, c.name) as city_name,
    co.alpha2 as country_code,
    co.name as country_name  -- country.name 已是中文
FROM location l
JOIN city c ON l.city_id = c.id
LEFT JOIN country co ON c.country_id = co.id
WHERE l.id = ?;

-- 取得使用者位置完整資訊（英文）
SELECT
    c.name as city_code,
    COALESCE(c.name_en, c.name) as city_name,
    co.alpha2 as country_code,
    COALESCE(co.name_en, co.name) as country_name
FROM location l
JOIN city c ON l.city_id = c.id
LEFT JOIN country co ON c.country_id = co.id
WHERE l.id = ?;
```

---

## 七、風險評估

| 風險 | 影響 | 機率 | 對策 |
| --- | --- | --- | --- |
| 翻譯資料不完整 | 中 | 高 | Fallback 機制 |
| 現有資料相容性 | 高 | 低 | 新增欄位皆為 nullable |
| 查詢效能 | 中 | 低 | 建立適當索引 |

---

## 八、關鍵決策記錄

### 決策 1：country.name 保留為中文，只新增 name_en

- **理由**：`country.name` 已存儲中文名稱，無需重複
- **效益**：減少欄位數量，避免資料冗餘

### 決策 2：city.name 保留為 code，新增 name_en 和 name_zh_tw

- **理由**：`city.name` 實際上是 code（如 `tokyo_japan`），需要另外的顯示名稱
- **效益**：保持 code 的唯一性和 URL 友善性

### 決策 3：不新增城市標準代碼

- **理由**：城市沒有廣泛使用的國際標準代碼，現有 `{city}_{country}` 格式已足夠
- **效益**：簡化設計，避免不必要的複雜度

### 決策 4：city 表新增 country_id

- **理由**：建立城市與國家的直接關聯
- **效益**：查詢更直覺，可直接從 city 取得國家資訊

---

**文件版本**: 4.0
**建立日期**: 2025-12-18
**最後更新**: 2026-02-05
**審核狀態**: 待審核
