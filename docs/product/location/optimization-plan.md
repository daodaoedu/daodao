# 國家/城市選擇效能優化方案

## 問題概述

| 問題 | 影響 |
|------|------|
| i18n 包含 3,884 個城市 | Bundle size 增加 ~88 KB |
| 無伺服器端搜尋 API | 前端每次都要處理全部資料 |
| 扁平式選擇 | 從 3,884 項中找城市困難 |

## 推薦方案：伺服器端搜尋 + 分層選擇

### 核心改動

1. **新增城市搜尋 API** - 伺服器端過濾，前端只載入搜尋結果
2. **分層選擇 UI** - 先選國家，再搜尋該國城市
3. **移除 i18n 城市資料** - 改由 API 提供翻譯

### 效能提升預估

| 指標 | 改動前 | 改動後 |
|------|--------|--------|
| i18n bundle | ~88 KB | ~0 KB |
| 初始載入選項 | 3,884 | 0（按需載入） |
| 每次搜尋處理量 | 3,884 | ~10-20（API 限制） |

---

## 實作步驟

### Phase 1：後端 - 新增城市搜尋 API

#### 1.1 新增 city controller

**檔案：** `daodao-server/src/controllers/city.controller.ts`

**API 端點設計：**

```
GET /api/v1/cities/search
Query Parameters:
  - q: string (搜尋關鍵字，必填)
  - country_id?: number (國家 ID，選填)
  - limit?: number (預設 20，最大 50)

Response:
{
  success: true,
  data: [
    { id: 1, name: "taipei_city", label_zh: "台北市", label_en: "Taipei" },
    ...
  ]
}
```

```
GET /api/v1/countries
Query Parameters:
  - q?: string (搜尋關鍵字，選填)

Response:
{
  success: true,
  data: [
    { id: 158, alpha2: "TW", name: "台灣", name_en: "Taiwan" },
    ...
  ]
}
```

#### 1.2 新增 city service

**檔案：** `daodao-server/src/services/city.service.ts`

- 使用 Prisma `contains` + `mode: 'insensitive'` 進行模糊搜尋
- 支援按 country_id 過濾
- 回傳多語言標籤

#### 1.3 新增路由

**檔案：** `daodao-server/src/routes/city.routes.ts`

---

### Phase 2：資料庫 - 新增多語言欄位

#### 2.1 修改 city 表結構

```sql
ALTER TABLE city ADD COLUMN label_zh VARCHAR(100);
ALTER TABLE city ADD COLUMN label_en VARCHAR(100);
```

#### 2.2 資料遷移腳本

- 從現有 i18n JSON 讀取翻譯
- 更新 city 表的 label_zh 和 label_en

---

### Phase 3：前端 - 重構城市選擇組件

#### 3.1 新增 API hooks

**檔案：** `daodao-f2e/packages/api/src/services/city-hooks.ts`

```typescript
export const useCitySearch = (query: string, countryId?: number) => {
  return useQuery("/api/v1/cities/search", {
    params: { query: { q: query, country_id: countryId, limit: 20 } },
  }, { enabled: query.length >= 2 });
};

export const useCountries = () => {
  return useQuery("/api/v1/countries");
};
```

#### 3.2 重構 CityCombobox

**檔案：** `daodao-f2e/apps/product/src/components/settings/public-info/basic-info-section.tsx`

改動：
- 新增國家選擇下拉（使用現有 Select 組件）
- CityCombobox 改用 debounced API 搜尋（300ms）
- 移除從 i18n 載入城市的邏輯

#### 3.3 移除 i18n 城市資料

**檔案：**
- `daodao-f2e/packages/i18n/src/locales/zh-TW.json`
- `daodao-f2e/packages/i18n/src/locales/en.json`

刪除 `cities` 物件（約 3,884 項）

---

## 需要修改的檔案清單

### 後端（新增）

| 檔案 | 說明 |
|------|------|
| `daodao-server/src/controllers/city.controller.ts` | 城市 API 控制器 |
| `daodao-server/src/services/city.service.ts` | 城市服務層 |
| `daodao-server/src/routes/city.routes.ts` | 路由定義 |

### 後端（修改）

| 檔案 | 說明 |
|------|------|
| `daodao-server/src/routes/index.ts` | 註冊新路由 |

### 資料庫

| 檔案 | 說明 |
|------|------|
| `daodao-storage/init-scripts-refactored/060_create_table_city.sql` | 新增欄位 |
| 新增遷移腳本 | 填入多語言資料 |

### 前端（新增）

| 檔案 | 說明 |
|------|------|
| `daodao-f2e/packages/api/src/services/city-hooks.ts` | API hooks |

### 前端（修改）

| 檔案 | 說明 |
|------|------|
| `daodao-f2e/apps/product/src/components/settings/public-info/basic-info-section.tsx` | 組件重構 |
| `daodao-f2e/packages/i18n/src/locales/zh-TW.json` | 移除 cities |
| `daodao-f2e/packages/i18n/src/locales/en.json` | 移除 cities |

---

## 驗證方式

### 1. API 測試

```bash
# 城市搜尋
curl "http://localhost:3000/api/v1/cities/search?q=taipei"
curl "http://localhost:3000/api/v1/cities/search?q=tokyo&country_id=112"

# 國家列表
curl "http://localhost:3000/api/v1/countries"
curl "http://localhost:3000/api/v1/countries?q=taiwan"
```

### 2. 前端測試

- 開啟編輯個人資料頁面
- 驗證國家選擇下拉正常
- 驗證城市搜尋功能（輸入 2 字元後觸發）
- 驗證選擇後資料正確儲存

### 3. 效能驗證

- 檢查 i18n bundle size 減少
- 檢查頁面初始載入時間
- 使用 Chrome DevTools 的 Network 面板確認 API 呼叫

---

## 向下相容考量

- 現有用戶的 location 資料不受影響（city.name 保持不變）
- API 回傳的 city name 與現有格式一致
- 舊版前端（如有）可繼續使用現有資料

---

## 時程建議

| 階段 | 工作項目 |
|------|---------|
| Phase 1 | 後端 API 開發 |
| Phase 2 | 資料庫遷移 |
| Phase 3 | 前端組件重構 |
| 測試 | 整合測試與效能驗證 |

---

*文件建立日期：2026-02-02*
