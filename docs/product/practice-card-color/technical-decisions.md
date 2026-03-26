# 技術決策文檔

## 決策1: 使用顏色主題名稱（theme）而非索引（index）

### 決策內容

後端 API 回傳 `card_color_theme: "red"` 而非 `card_color_index: 0`

### 背景

實施卡片顏色功能時，有兩種數據設計方案：

**方案A：使用索引**
```typescript
{
  card_color_index: 0  // 0=紅, 1=黃, 2=藍, 3=綠
}
```

**方案B：使用主題名稱**（✅ 選擇此方案）
```typescript
{
  card_color_theme: "red"  // 直接存儲顏色名稱
}
```

### 決策理由

#### 1. 語義化清晰 ✅

**使用索引（不佳）**:
```json
{
  "id": "abc-123",
  "title": "學習 TypeScript",
  "card_color_index": 2
}
```
- 需要查文檔才知道 2 代表什麼顏色
- API 響應不具自解釋性

**使用主題色（優秀）**:
```json
{
  "id": "abc-123",
  "title": "學習 TypeScript",
  "card_color_theme": "blue"
}
```
- 一眼就知道是藍色
- API 響應可讀性高

#### 2. 靈活擴展 ✅

**使用索引（限制）**:
```typescript
// 如果要新增顏色，索引會變複雜
const colors = ['red', 'yellow', 'blue', 'green'];  // 0-3
// 新增紫色和粉色
const colors = ['red', 'yellow', 'blue', 'green', 'purple', 'pink'];  // 0-5

// 問題：舊數據的索引不變，但顏色循環邏輯需要調整
// 如果有 100 個實踐，索引從 0-99，當添加新顏色後，需要重新計算
```

**使用主題色（靈活）**:
```typescript
// 新增顏色只需添加配置
const BASIC_COLORS = ['red', 'yellow', 'blue', 'green'];
const PREMIUM_COLORS = ['purple', 'pink', 'indigo', 'teal'];

// 舊數據不受影響，新數據可選新顏色
```

#### 3. Premium 功能實現更自然 ✅

**使用索引（複雜）**:
```typescript
// 需要兩個欄位：一個存索引，一個存自定義顏色名
{
  card_color_index: 2,          // 默認顏色
  custom_color_value: "purple"  // 自定義顏色（Premium）
}

// 前端需要判斷使用哪個值
const color = practice.custom_color_value || DEFAULT_COLORS[practice.card_color_index];
```

**使用主題色（簡潔）**:
```typescript
// 只需一個欄位
{
  card_color_theme: "purple",      // 統一存儲
  custom_color_enabled: true       // 標記是否自定義（用於統計）
}

// 前端直接使用
const color = getColorByTheme(practice.card_color_theme);
```

#### 4. 降低維護成本 ✅

**使用索引（維護成本高）**:
- 前後端需要維護同步的索引映射表
- 任何顏色順序調整都會破壞索引映射
- 需要版本控制來處理索引變化

**使用主題色（維護成本低）**:
- 顏色名稱是穩定的常量
- 不受順序調整影響
- 新增顏色不影響現有數據

#### 5. 更好的錯誤提示 ✅

**使用索引（錯誤提示不清晰）**:
```json
{
  "error": "Invalid color index: 10",
  "message": "Color index must be between 0 and 3"
}
```

**使用主題色（錯誤提示清晰）**:
```json
{
  "error": "INVALID_COLOR_THEME",
  "message": "無效的顏色主題: purple",
  "allowedThemes": {
    "basic": ["red", "yellow", "blue", "green"],
    "premium": ["purple", "pink", "indigo", "teal"]
  }
}
```

#### 6. 資料庫查詢更直觀 ✅

**使用索引**:
```sql
-- 查詢所有藍色卡片（需要記住藍色是索引 2）
SELECT * FROM practices WHERE card_color_index = 2;
```

**使用主題色**:
```sql
-- 查詢所有藍色卡片（語義清晰）
SELECT * FROM practices WHERE card_color_theme = 'blue';
```

#### 7. 支持未來的顏色分類 ✅

**使用主題色允許未來擴展**:
```typescript
// 可以輕鬆實現顏色分類
const COLOR_CATEGORIES = {
  warm: ['red', 'orange', 'yellow'],
  cool: ['blue', 'cyan', 'teal'],
  neutral: ['gray', 'slate'],
  vibrant: ['pink', 'purple', 'lime']
};

// 用戶可以按分類選擇顏色
```

### 實現細節

#### 數據庫 Schema

```prisma
model practices {
  id                      Int       @id @default(autoincrement())
  external_id             String    @unique @default(uuid())

  // 顏色配置
  card_color_theme        String?   @db.VarChar(20)      // 顏色主題名稱
  custom_color_enabled    Boolean?  @default(false)      // 是否為用戶自定義

  // ... 其他欄位
}
```

**有效值約束**（通過應用層驗證）:
```typescript
const VALID_THEMES = [
  'red', 'yellow', 'blue', 'green',      // 基礎
  'purple', 'pink', 'indigo', 'teal',    // Premium
  'orange', 'cyan', 'lime', 'rose'       // Premium
];
```

#### 後端 API

**創建實踐時自動分配**:
```typescript
// POST /api/v1/practices
const DEFAULT_THEMES = ['red', 'yellow', 'blue', 'green'];

const activeCount = await getActiveCount(userId);
const theme = DEFAULT_THEMES[activeCount % DEFAULT_THEMES.length];

await prisma.practices.create({
  data: {
    ...practiceData,
    card_color_theme: theme,
    custom_color_enabled: false
  }
});
```

**更新實踐時驗證權限**:
```typescript
// PUT /api/v1/practices/:id
const PREMIUM_THEMES = ['purple', 'pink', 'indigo', 'teal', 'orange', 'cyan', 'lime', 'rose'];

if (PREMIUM_THEMES.includes(requestedTheme)) {
  // 檢查 Premium 權限
  if (!user.hasPremium) {
    throw new ForbiddenError('Premium feature');
  }
}
```

#### 前端使用

**Schema 定義**:
```typescript
export const practiceSchema = z.object({
  // ... 其他欄位
  cardColorTheme: z.enum([
    'red', 'yellow', 'blue', 'green',
    'purple', 'pink', 'indigo', 'teal',
    'orange', 'cyan', 'lime', 'rose'
  ]).optional(),
  customColorEnabled: z.boolean().optional()
});
```

**顏色映射**:
```typescript
export function getColorByTheme(theme?: string) {
  const allColors = [...BASIC_COLORS, ...PREMIUM_COLORS];
  return allColors.find(c => c.name === theme) || BASIC_COLORS[0];
}
```

### 性能考量

#### 存儲空間

**索引方式**:
- INT (4 bytes) + Boolean (1 byte) = 5 bytes

**主題色方式**:
- VARCHAR(20) (最多 20 bytes) + Boolean (1 byte) = 21 bytes

**差異**: 每筆記錄多 16 bytes

**影響分析**:
- 10,000 筆實踐 = 160 KB 額外空間
- 100,000 筆實踐 = 1.6 MB 額外空間
- **結論**: 可忽略不計

#### 查詢性能

**索引方式**:
```sql
CREATE INDEX idx_color_index ON practices(card_color_index);
-- INT 索引效率：優秀
```

**主題色方式**:
```sql
CREATE INDEX idx_color_theme ON practices(card_color_theme);
-- VARCHAR 索引效率：良好（顏色名稱短且固定）
```

**效能差異**: 微乎其微（顏色名稱長度短且固定）

### 風險與緩解

#### 風險1: 拼寫錯誤

**風險**: 前端或後端可能輸入錯誤的顏色名稱（如 "reed" 而非 "red"）

**緩解**:
1. 使用 TypeScript enum 或 const assertions
2. 後端 API 驗證層嚴格檢查
3. 前端 Zod schema 驗證

```typescript
// 前端
const THEME = {
  RED: 'red',
  YELLOW: 'yellow',
  // ...
} as const;

// 後端
const VALID_THEMES = ['red', 'yellow', 'blue', 'green'] as const;
```

#### 風險2: 未來重命名顏色

**風險**: 如果需要將 "red" 改為 "crimson"，需要數據遷移

**緩解**:
1. 選擇穩定的通用顏色名稱
2. 提供顏色別名系統（未來）
3. 數據遷移腳本

```typescript
// 未來的別名系統
const COLOR_ALIASES = {
  'crimson': 'red',  // crimson 映射到 red
  'navy': 'blue'
};
```

### 替代方案考慮

#### 方案C: 混合方式（不推薦）

```typescript
{
  card_color_index: 0,
  card_color_name: "red"  // 冗餘存儲
}
```

**缺點**:
- 數據冗餘
- 需要保持同步
- 增加複雜度

**結論**: 不採用

#### 方案D: 使用顏色 Hex 值（不推薦）

```typescript
{
  card_color: "#FEF2F2"  // 直接存 Hex
}
```

**缺點**:
- 失去語義化
- 難以管理和分類
- 不利於主題切換（如暗色模式）

**結論**: 不採用

### 決策總結

| 考量因素 | 索引方式 | 主題色方式 | 勝者 |
|---------|---------|-----------|-----|
| 語義化 | ❌ 需要查表 | ✅ 自解釋 | **主題色** |
| 靈活性 | ❌ 順序綁定 | ✅ 獨立擴展 | **主題色** |
| Premium 整合 | ❌ 需要額外欄位 | ✅ 統一欄位 | **主題色** |
| 維護成本 | ❌ 需同步映射 | ✅ 獨立配置 | **主題色** |
| 錯誤提示 | ❌ 數字不直觀 | ✅ 名稱清晰 | **主題色** |
| 存儲空間 | ✅ 5 bytes | ❌ 21 bytes | 索引（但差異可忽略） |
| 查詢性能 | ✅ INT 索引 | ✅ VARCHAR 索引 | **平手** |

**最終決策**: 使用顏色主題名稱（theme）

### 實施時間表

**階段1: 純前端** （當前）
- 不使用後端數據
- 前端計算顏色

**階段2: 持久化** （可選）
- 添加 `card_color_theme` 欄位
- 後端自動分配主題色
- 前端使用後端返回值

**階段3-4: Premium 功能**
- 用戶可選擇主題色
- 權限驗證 Premium 顏色
- 持久化用戶選擇

### 參考

- [PostgreSQL VARCHAR vs INT Performance](https://www.postgresql.org/docs/current/datatype-character.html)
- [API Design Best Practices - Semantic Responses](https://restfulapi.net/resource-naming/)
- [Database Normalization vs Denormalization](https://en.wikipedia.org/wiki/Database_normalization)

---

**決策者**: 開發團隊 + 產品經理
**決策日期**: 2025-12-29
**狀態**: ✅ 已確認
