# 主題實踐卡片背景顏色功能 - 實施計劃

## 一、需求概述

為「進行中」狀態的主題實踐卡片添加背景顏色功能，顏色按照創建順序循環顯示：
- 第1個：紅色
- 第2個：黃色
- 第3個：藍色
- 第4個：綠色
- 第5個：紅色（循環）
- ...以此類推

## 二、技術方案設計

### 2.1 方案選擇

**方案A：純前端實現（推薦）**
- 優點：實施簡單、無需數據庫變更、無需後端API修改
- 缺點：顏色規則僅存在於前端
- 適用場景：顏色僅用於視覺區分，無業務邏輯依賴

**方案B：前後端協同實現**
- 優點：顏色數據持久化、可用於其他功能
- 缺點：需要數據庫遷移、API修改、開發成本高
- 適用場景：顏色需要持久化或參與業務邏輯

**選擇：方案A（純前端實現）**

### 2.2 顏色配色方案

考慮到可讀性和視覺舒適度，建議使用柔和的背景色：

```typescript
const PRACTICE_CARD_COLORS = [
  {
    name: 'red',
    background: 'bg-red-50',           // 淺紅色背景
    border: 'border-red-200',          // 紅色邊框
    text: 'text-red-900',              // 深紅色文字（高對比度）
    badge: 'bg-red-100 text-red-800'   // 徽章配色
  },
  {
    name: 'yellow',
    background: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-900',
    badge: 'bg-yellow-100 text-yellow-800'
  },
  {
    name: 'blue',
    background: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-900',
    badge: 'bg-blue-100 text-blue-800'
  },
  {
    name: 'green',
    background: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-900',
    badge: 'bg-green-100 text-green-800'
  }
];
```

### 2.3 顏色計算邏輯

```typescript
/**
 * 根據創建順序計算卡片顏色
 * @param practices - 已按 created_at 排序的實踐列表
 * @param practiceId - 目標實踐的 ID
 * @returns 顏色配置對象
 */
function getPracticeCardColor(
  practices: Practice[],
  practiceId: string
): ColorConfig {
  // 只考慮 status === 'active' 的實踐
  const activePractices = practices.filter(p => p.status === 'active');

  // 找到目標實踐在列表中的索引
  const index = activePractices.findIndex(p => p.id === practiceId);

  // 使用模運算循環顏色（0-3）
  const colorIndex = index % 4;

  return PRACTICE_CARD_COLORS[colorIndex];
}
```

## 三、實施步驟

### 3.1 前端修改

#### 步驟1：創建顏色配置常量

**文件**: `/Users/xiaoxu/Projects/daodao/daodao-f2e/constants/practice.ts`

```typescript
// 在文件末尾添加

/**
 * 主題實踐卡片顏色配置
 * 按照創建順序循環使用：紅、黃、藍、綠
 */
export const PRACTICE_CARD_COLORS = [
  {
    name: 'red',
    background: 'bg-red-50',
    border: 'border-red-200',
    hover: 'hover:bg-red-100',
    accent: 'bg-red-100 text-red-800'
  },
  {
    name: 'yellow',
    background: 'bg-yellow-50',
    border: 'border-yellow-200',
    hover: 'hover:bg-yellow-100',
    accent: 'bg-yellow-100 text-yellow-800'
  },
  {
    name: 'blue',
    background: 'bg-blue-50',
    border: 'border-blue-200',
    hover: 'hover:bg-blue-100',
    accent: 'bg-blue-100 text-blue-800'
  },
  {
    name: 'green',
    background: 'bg-green-50',
    border: 'border-green-200',
    hover: 'hover:bg-green-100',
    accent: 'bg-green-100 text-green-800'
  }
] as const;

export type PracticeCardColor = typeof PRACTICE_CARD_COLORS[number];
```

#### 步驟2：創建顏色計算工具函數

**文件**: `/Users/xiaoxu/Projects/daodao/daodao-f2e/utils/practiceColor.ts`（新建）

```typescript
import { PRACTICE_CARD_COLORS } from '@/constants/practice';
import type { Practice } from '@/services/practice/schema';

/**
 * 根據實踐在列表中的位置獲取對應的顏色配置
 * @param practices - 已排序的實踐列表（僅包含 active 狀態）
 * @param practiceId - 目標實踐的 ID
 * @returns 顏色配置對象
 */
export function getPracticeCardColor(
  practices: Practice[],
  practiceId: string
) {
  const index = practices.findIndex(p => p.id === practiceId);

  // 如果找不到，返回第一個顏色（紅色）作為默認值
  if (index === -1) {
    return PRACTICE_CARD_COLORS[0];
  }

  // 使用模運算循環顏色（0-3）
  const colorIndex = index % PRACTICE_CARD_COLORS.length;
  return PRACTICE_CARD_COLORS[colorIndex];
}

/**
 * 直接根據索引獲取顏色（用於已知索引的場景）
 * @param index - 索引位置（從0開始）
 * @returns 顏色配置對象
 */
export function getColorByIndex(index: number) {
  const colorIndex = index % PRACTICE_CARD_COLORS.length;
  return PRACTICE_CARD_COLORS[colorIndex];
}
```

#### 步驟3：修改 PracticeCard 組件

**文件**: `/Users/xiaoxu/Projects/daodao/daodao-f2e/features/practice/components/List/PracticeCard.tsx`

修改組件接口，添加 `colorConfig` 屬性：

```typescript
interface PracticeCardProps {
  practice: Practice;
  currentUserId?: string;
  onEdit?: (practice: Practice) => void;
  onDelete?: (practiceId: string) => void;
  onCheckIn?: (practice: Practice) => void;
  showActions?: boolean;
  colorConfig?: PracticeCardColor; // 新增：顏色配置
}

const PracticeCard: React.FC<PracticeCardProps> = ({
  practice,
  currentUserId,
  onEdit,
  onDelete,
  onCheckIn,
  showActions = false,
  colorConfig  // 新增
}) => {
  // ... 原有代碼

  return (
    <Card
      className={cn(
        'relative w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-3xl',
        'border-2 transition-all duration-200',
        colorConfig?.background,     // 應用背景色
        colorConfig?.border,          // 應用邊框色
        colorConfig?.hover           // 應用懸停效果
      )}
    >
      {/* 卡片內容保持不變 */}
    </Card>
  );
};
```

#### 步驟4：修改 PracticeExploreSection 組件

**文件**: `/Users/xiaoxu/Projects/daodao/daodao-f2e/features/practice/components/List/PracticeExploreSection.tsx`

傳遞顏色配置給每個卡片：

```typescript
import { getPracticeCardColor } from '@/utils/practiceColor';

const PracticeExploreSection = () => {
  // ... 原有代碼

  const { practices, pagination, isLoading, error, mutate } = usePractices(filter);

  // 過濾出 active 狀態的實踐（用於顏色計算）
  const activePractices = useMemo(
    () => practices.filter(p => p.status === 'active'),
    [practices]
  );

  return (
    <div className="space-y-4">
      {practices.map((practice) => {
        // 只為 active 狀態的卡片分配顏色
        const colorConfig = practice.status === 'active'
          ? getPracticeCardColor(activePractices, practice.id)
          : undefined;

        return (
          <PracticeCard
            key={practice.id}
            practice={practice}
            currentUserId={user?.id}
            colorConfig={colorConfig}  // 傳遞顏色配置
            onEdit={handleEdit}
            onDelete={handleDelete}
            onCheckIn={handleCheckIn}
            showActions
          />
        );
      })}
    </div>
  );
};
```

#### 步驟5：處理其他使用 PracticeCard 的地方

檢查以下文件是否使用了 PracticeCard 組件：
- `/Users/xiaoxu/Projects/daodao/daodao-f2e/features/practice/components/**/*.tsx`
- 用戶個人主頁的實踐列表
- 實踐詳情頁面

對於不需要顏色的場景，不傳遞 `colorConfig` 即可（組件應有默認樣式）。

### 3.2 後端修改（可選 - 階段2）

如果需要持久化顏色配置，可按以下步驟進行：

#### 步驟1：數據庫遷移

```prisma
// /Users/xiaoxu/Projects/daodao/daodao-server/prisma/schema.prisma

model practices {
  // ... 原有字段
  card_color_theme        String?   @db.VarChar(20)      // 顏色主題（如 "red", "yellow"）
  custom_color_enabled    Boolean?  @default(false)      // 是否為用戶自定義

  // ... 原有關聯
}
```

**遷移腳本**:
```bash
npx prisma migrate dev --name add_practice_card_color
```

#### 步驟2：創建時自動分配顏色主題

```typescript
// /Users/xiaoxu/Projects/daodao/daodao-server/src/services/practice.service.ts

// 默認顏色主題循環
const DEFAULT_COLOR_THEMES = ['red', 'yellow', 'blue', 'green'];

export async function create(data: CreatePracticeInput, userId: number) {
  // 獲取該用戶已有的 active 實踐數量
  const activeCount = await prismaClient.practices.count({
    where: {
      user_id: userId,
      status: 'active',
      deleted_at: null
    }
  });

  // 計算顏色主題（循環分配）
  const colorTheme = DEFAULT_COLOR_THEMES[activeCount % DEFAULT_COLOR_THEMES.length];

  const practice = await prismaClient.practices.create({
    data: {
      ...data,
      user_id: userId,
      card_color_theme: colorTheme,       // 自動分配顏色主題
      custom_color_enabled: false,        // 非自定義
      created_at: new Date(),
    },
    include: { users: true }
  });

  return practice;
}
```

#### 步驟3：前端使用後端返回的顏色主題

```typescript
// /Users/xiaoxu/Projects/daodao/daodao-f2e/services/practice/schema.ts

export const practiceSchema = z.object({
  // ... 原有字段
  cardColorTheme: z.enum(['red', 'yellow', 'blue', 'green', 'purple', 'pink', 'indigo', 'teal', 'orange', 'cyan', 'lime', 'rose']).optional(),  // 新增字段
  customColorEnabled: z.boolean().optional(),  // 是否為自定義顏色
});

// /Users/xiaoxu/Projects/daodao/daodao-f2e/utils/practiceColor.ts

/**
 * 根據顏色主題名稱獲取顏色配置
 * @param themeName - 顏色主題名稱（如 "red", "yellow"）
 * @returns 顏色配置對象
 */
export function getColorByTheme(themeName?: string) {
  if (!themeName) {
    return PRACTICE_CARD_COLORS_BASIC[0];  // 默認紅色
  }

  // 先在基礎色板中查找
  const basicColor = PRACTICE_CARD_COLORS_BASIC.find(c => c.name === themeName);
  if (basicColor) return basicColor;

  // 再在 Premium 色板中查找
  const premiumColor = PRACTICE_CARD_COLORS_PREMIUM.find(c => c.name === themeName);
  if (premiumColor) return premiumColor;

  // 找不到則返回默認顏色
  return PRACTICE_CARD_COLORS_BASIC[0];
}

// /Users/xiaoxu/Projects/daodao/daodao-f2e/features/practice/components/List/PracticeExploreSection.tsx

const colorConfig = practice.status === 'active'
  ? getColorByTheme(practice.cardColorTheme)  // 使用後端返回的主題色
  : undefined;
```

## 四、測試計劃

### 4.1 單元測試

**文件**: `/Users/xiaoxu/Projects/daodao/daodao-f2e/utils/__tests__/practiceColor.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { getPracticeCardColor, getColorByTheme } from '../practiceColor';
import { PRACTICE_CARD_COLORS } from '@/constants/practice';

describe('practiceColor utils', () => {
  describe('getPracticeCardColor (階段1 - 純前端)', () => {
    const mockPractices = [
      { id: '1', status: 'active', createdAt: '2024-01-01' },
      { id: '2', status: 'active', createdAt: '2024-01-02' },
      { id: '3', status: 'active', createdAt: '2024-01-03' },
      { id: '4', status: 'active', createdAt: '2024-01-04' },
      { id: '5', status: 'active', createdAt: '2024-01-05' },
    ] as Practice[];

    it('應該按順序分配紅、黃、藍、綠色', () => {
      expect(getPracticeCardColor(mockPractices, '1')).toBe(PRACTICE_CARD_COLORS[0]); // 紅
      expect(getPracticeCardColor(mockPractices, '2')).toBe(PRACTICE_CARD_COLORS[1]); // 黃
      expect(getPracticeCardColor(mockPractices, '3')).toBe(PRACTICE_CARD_COLORS[2]); // 藍
      expect(getPracticeCardColor(mockPractices, '4')).toBe(PRACTICE_CARD_COLORS[3]); // 綠
    });

    it('應該在第5個實踐時循環回紅色', () => {
      expect(getPracticeCardColor(mockPractices, '5')).toBe(PRACTICE_CARD_COLORS[0]); // 紅
    });

    it('找不到實踐時應返回默認顏色（紅色）', () => {
      expect(getPracticeCardColor(mockPractices, 'non-existent')).toBe(PRACTICE_CARD_COLORS[0]);
    });
  });

  describe('getColorByTheme (階段2+ - 後端主題色)', () => {
    it('應該根據主題名稱返回正確的顏色配置', () => {
      expect(getColorByTheme('red')?.name).toBe('red');
      expect(getColorByTheme('yellow')?.name).toBe('yellow');
      expect(getColorByTheme('blue')?.name).toBe('blue');
      expect(getColorByTheme('green')?.name).toBe('green');
    });

    it('主題名稱不存在時應返回默認顏色（紅色）', () => {
      expect(getColorByTheme('invalid-color')?.name).toBe('red');
    });

    it('主題名稱為空時應返回默認顏色（紅色）', () => {
      expect(getColorByTheme()?.name).toBe('red');
      expect(getColorByTheme(undefined)?.name).toBe('red');
    });

    it('應該支持 Premium 顏色主題（如果在色板中）', () => {
      // 假設 PRACTICE_CARD_COLORS_PREMIUM 已包含這些顏色
      const premiumThemes = ['purple', 'pink', 'indigo', 'teal'];
      premiumThemes.forEach(theme => {
        const color = getColorByTheme(theme);
        expect(color).toBeDefined();
        // 如果色板中沒有，應返回默認紅色
      });
    });
  });
});
```

### 4.2 視覺測試

使用 Storybook 或手動測試檢查：

1. **基本顏色顯示**
   - 創建4個 active 實踐
   - 檢查是否按順序顯示紅、黃、藍、綠
   - 創建第5個實踐，檢查是否顯示紅色（循環）

2. **響應式設計**
   - 在不同螢幕尺寸下檢查顏色顯示
   - 確保文字對比度足夠（可讀性）

3. **邊界情況**
   - 無 active 實踐時
   - 只有1個 active 實踐時
   - 混合 active/paused/completed 實踐時

4. **性能測試**
   - 列表包含 100+ 實踐時的渲染性能
   - 顏色計算是否造成性能瓶頸

### 4.3 端到端測試

**文件**: `/Users/xiaoxu/Projects/daodao/daodao-f2e/e2e/practice-card-colors.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Practice Card Colors', () => {
  test('應該按創建順序顯示不同顏色', async ({ page }) => {
    // 前往實踐列表頁面
    await page.goto('/practices');

    // 等待卡片加載
    await page.waitForSelector('[data-testid="practice-card"]');

    // 獲取所有 active 狀態的卡片
    const cards = page.locator('[data-testid="practice-card"][data-status="active"]');

    // 檢查前4個卡片的背景色
    await expect(cards.nth(0)).toHaveClass(/bg-red-50/);
    await expect(cards.nth(1)).toHaveClass(/bg-yellow-50/);
    await expect(cards.nth(2)).toHaveClass(/bg-blue-50/);
    await expect(cards.nth(3)).toHaveClass(/bg-green-50/);
  });

  test('第5個卡片應該循環回紅色', async ({ page }) => {
    await page.goto('/practices');
    const cards = page.locator('[data-testid="practice-card"][data-status="active"]');

    if (await cards.count() >= 5) {
      await expect(cards.nth(4)).toHaveClass(/bg-red-50/);
    }
  });
});
```

## 五、注意事項

### 5.1 排序一致性

- 確保前端列表的排序參數與顏色計算的排序邏輯一致
- 當前默認排序：`sortBy: 'createdAt', sortOrder: 'desc'`
- 如果用戶改變排序方式，顏色順序會改變（這是預期行為）

### 5.2 顏色可訪問性（A11y）

- 使用淺色背景（50系列）確保文字可讀
- 深色文字（900系列）提供足夠對比度
- 建議使用工具檢查對比度：https://webaim.org/resources/contrastchecker/

### 5.3 Tailwind CSS 配置

確保 Tailwind 配置包含所有需要的顏色：

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        // 確保包含 red/yellow/blue/green 的 50/100/200/800/900 系列
      }
    }
  }
}
```

### 5.4 暗色模式支持（未來）

如果需要支持暗色模式，需要調整顏色配置：

```typescript
const PRACTICE_CARD_COLORS = [
  {
    name: 'red',
    background: 'bg-red-50 dark:bg-red-900',
    text: 'text-red-900 dark:text-red-50',
    // ...
  },
  // ...
];
```

## 六、實施時程建議

### 階段1：核心功能實現（1-2天）
- [ ] 創建顏色配置常量
- [ ] 實現顏色計算工具函數
- [ ] 修改 PracticeCard 組件
- [ ] 修改 PracticeExploreSection 組件
- [ ] 基本功能測試

### 階段2：完善與測試（1天）
- [ ] 處理其他使用 PracticeCard 的地方
- [ ] 編寫單元測試
- [ ] 視覺測試與調整
- [ ] 可訪問性檢查

### 階段3：部署與監控（0.5天）
- [ ] 代碼審查
- [ ] 合併到主分支
- [ ] 部署到測試環境
- [ ] 用戶驗收測試
- [ ] 部署到生產環境

## 七、進階功能設計：自定義顏色（Premium 功能）

### 7.1 功能定位

**基礎功能（所有用戶）**：
- 使用系統預設的4色循環（紅、黃、藍、綠）
- 按照創建順序自動分配顏色
- 無需配置，開箱即用

**進階功能（付費用戶）**：
- 自定義每個實踐卡片的顏色
- 從擴展色板中選擇（8-12種顏色）
- 手動調整顏色分配
- 顏色偏好持久化

### 7.2 架構設計

參考專案現有架構模式：

#### 數據模型擴展

**用戶訂閱表**（已存在）：
```prisma
// /Users/xiaoxu/Projects/daodao/daodao-server/prisma/schema.prisma

model user_subscription {
  id         Int       @id @default(autoincrement())
  user_id    Int
  plan_id    Int
  status     subscription_status  // active, canceled, expired
  start_date DateTime
  end_date   DateTime?

  users              users              @relation(...)
  subscription_plan  subscription_plan  @relation(...)
}
```

**用戶偏好表**（已存在，用於存儲顏色偏好）：
```prisma
model user_preferences {
  id                   Int       @id @default(autoincrement())
  user_id              Int
  preference_option_id Int
  is_selected          Boolean   @default(false)
  preference_weight    Decimal?  @db.Decimal(3, 2)

  users               users               @relation(...)
  preference_options  preference_options  @relation(...)
}
```

**主題實踐表擴展**（新增字段）：
```prisma
model practices {
  id                      Int       @id @default(autoincrement())
  // ... 原有字段

  // 顏色配置（新增）
  card_color_theme        String?   @db.VarChar(20)      // 卡片顏色主題（如 "red", "yellow", "purple"）
  custom_color_enabled    Boolean?  @default(false)      // 是否為用戶自定義（Premium功能）

  // ... 原有關聯
}
```

**欄位說明**：
- `card_color_theme`: 顏色主題名稱
  - 免費用戶：自動分配 "red" | "yellow" | "blue" | "green"
  - Premium 用戶：可選擇 "purple" | "pink" | "indigo" | "teal" 等
- `custom_color_enabled`: 標記是否為用戶手動選擇（用於統計和分析）

#### 權限控制

**新增權限常量**：
```typescript
// /Users/xiaoxu/Projects/daodao/daodao-server/src/constants/permissions.ts

export const PERMISSIONS = {
  // ... 原有權限

  PRACTICE: {
    // ... 原有權限
    CUSTOMIZE_COLOR: 'practice:customize_color',  // 新增：自定義顏色權限
  }
};
```

**訂閱方案配置**：
```typescript
// /Users/xiaoxu/Projects/daodao/daodao-server/src/config/subscription-plans.ts

export const SUBSCRIPTION_PLANS = {
  FREE: {
    id: 1,
    name: 'free',
    features: [
      'basic_practice_tracking',
      'default_card_colors',  // 默認4色循環
      // ...
    ],
    permissions: []
  },
  PREMIUM: {
    id: 2,
    name: 'premium',
    features: [
      'basic_practice_tracking',
      'custom_card_colors',   // 自定義顏色
      'extended_color_palette',  // 擴展色板
      // ...
    ],
    permissions: [
      'practice:customize_color'
    ]
  }
};
```

### 7.3 前端實現

#### 擴展顏色配置

```typescript
// /Users/xiaoxu/Projects/daodao/daodao-f2e/constants/practice.ts

/**
 * 基礎顏色配置（所有用戶）
 */
export const PRACTICE_CARD_COLORS_BASIC = [
  { name: 'red', background: 'bg-red-50', border: 'border-red-200', ... },
  { name: 'yellow', background: 'bg-yellow-50', border: 'border-yellow-200', ... },
  { name: 'blue', background: 'bg-blue-50', border: 'border-blue-200', ... },
  { name: 'green', background: 'bg-green-50', border: 'border-green-200', ... }
] as const;

/**
 * 擴展顏色配置（Premium 用戶）
 */
export const PRACTICE_CARD_COLORS_PREMIUM = [
  ...PRACTICE_CARD_COLORS_BASIC,
  { name: 'purple', background: 'bg-purple-50', border: 'border-purple-200', ... },
  { name: 'pink', background: 'bg-pink-50', border: 'border-pink-200', ... },
  { name: 'indigo', background: 'bg-indigo-50', border: 'border-indigo-200', ... },
  { name: 'teal', background: 'bg-teal-50', border: 'border-teal-200', ... },
  { name: 'orange', background: 'bg-orange-50', border: 'border-orange-200', ... },
  { name: 'cyan', background: 'bg-cyan-50', border: 'border-cyan-200', ... },
  { name: 'lime', background: 'bg-lime-50', border: 'border-lime-200', ... },
  { name: 'rose', background: 'bg-rose-50', border: 'border-rose-200', ... }
] as const;
```

#### 權限檢查 Hook

```typescript
// /Users/xiaoxu/Projects/daodao/daodao-f2e/hooks/usePracticeColorPermission.ts

import { useAuth } from '@/entities/user/model/auth-context';

export function usePracticeColorPermission() {
  const { user } = useAuth();

  // 檢查用戶是否有自定義顏色權限
  const canCustomizeColor = useMemo(() => {
    if (!user) return false;

    // 方式1：檢查訂閱狀態
    const hasActiveSubscription =
      user.subscription?.status === 'active' &&
      user.subscription?.plan?.features?.includes('custom_card_colors');

    // 方式2：檢查權限（更細粒度）
    const hasPermission = user.permissions?.includes('practice:customize_color');

    return hasActiveSubscription || hasPermission;
  }, [user]);

  // 獲取可用的顏色配置
  const availableColors = useMemo(() => {
    return canCustomizeColor
      ? PRACTICE_CARD_COLORS_PREMIUM
      : PRACTICE_CARD_COLORS_BASIC;
  }, [canCustomizeColor]);

  return {
    canCustomizeColor,
    availableColors,
    isPremiumUser: canCustomizeColor
  };
}
```

#### 顏色選擇器組件

```typescript
// /Users/xiaoxu/Projects/daodao/daodao-f2e/features/practice/components/ColorPicker.tsx

import { usePracticeColorPermission } from '@/hooks/usePracticeColorPermission';
import { ProtectedComponent } from '@/entities/user/ui/protected-component';

interface ColorPickerProps {
  value?: string;
  onChange: (colorName: string) => void;
  practiceId: string;
}

export const PracticeColorPicker: React.FC<ColorPickerProps> = ({
  value,
  onChange,
  practiceId
}) => {
  const { canCustomizeColor, availableColors } = usePracticeColorPermission();

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">卡片顏色</h3>

      <div className="grid grid-cols-4 gap-2">
        {availableColors.slice(0, 4).map((color) => (
          <ColorOption
            key={color.name}
            color={color}
            selected={value === color.name}
            onClick={() => onChange(color.name)}
          />
        ))}
      </div>

      {/* Premium 顏色選項 */}
      {availableColors.length > 4 && (
        <ProtectedComponent
          checkUserAuthorized={() => canCustomizeColor}
          noPermissionFallback={
            <PremiumColorsLockedState onUpgrade={handleUpgrade} />
          }
        >
          <div className="grid grid-cols-4 gap-2 pt-2 border-t">
            {availableColors.slice(4).map((color) => (
              <ColorOption
                key={color.name}
                color={color}
                selected={value === color.name}
                onClick={() => onChange(color.name)}
              />
            ))}
          </div>
        </ProtectedComponent>
      )}
    </div>
  );
};

/**
 * Premium 顏色鎖定狀態
 */
const PremiumColorsLockedState: React.FC<{ onUpgrade: () => void }> = ({ onUpgrade }) => {
  return (
    <div className="relative">
      <div className="grid grid-cols-4 gap-2 pt-2 border-t opacity-50 blur-sm">
        {PRACTICE_CARD_COLORS_PREMIUM.slice(4).map((color) => (
          <div key={color.name} className={cn('h-10 rounded', color.background)} />
        ))}
      </div>

      <div className="absolute inset-0 flex items-center justify-center">
        <Card className="p-4 text-center space-y-2">
          <Lock className="w-6 h-6 mx-auto text-gray-400" />
          <p className="text-sm font-medium">更多顏色選擇</p>
          <p className="text-xs text-gray-500">升級至 Premium 解鎖 8 種額外顏色</p>
          <Button size="sm" onClick={onUpgrade}>
            升級方案
          </Button>
        </Card>
      </div>
    </div>
  );
};
```

#### 整合到實踐編輯表單

```typescript
// /Users/xiaoxu/Projects/daodao/daodao-f2e/features/practice/components/PracticeForm.tsx

import { PracticeColorPicker } from './ColorPicker';

export const PracticeForm = () => {
  const { canCustomizeColor } = usePracticeColorPermission();
  const form = useForm({
    // ... 表單配置
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* ... 其他表單字段 */}

      {/* 顏色選擇（條件顯示） */}
      {canCustomizeColor && (
        <FormField
          control={form.control}
          name="customColor"
          render={({ field }) => (
            <FormItem>
              <FormLabel>卡片顏色</FormLabel>
              <FormControl>
                <PracticeColorPicker
                  value={field.value}
                  onChange={field.onChange}
                  practiceId={practice?.id}
                />
              </FormControl>
            </FormItem>
          )}
        />
      )}

      {/* ... 提交按鈕 */}
    </form>
  );
};
```

### 7.4 後端 API 實現

#### 權限驗證中間件

```typescript
// /Users/xiaoxu/Projects/daodao/daodao-server/src/routes/practice.routes.ts

import { requirePermission } from '../middleware/permission.middleware';
import { PERMISSIONS } from '../constants/permissions';

// 更新實踐（帶顏色自定義檢查）
router.put(
  '/:id',
  authenticate,
  requirePermission({
    // 基本更新權限
    permissions: [{ resource: 'practice', action: 'update' }],
    allowSelf: true
  }),
  // 自定義驗證：如果嘗試設置自定義顏色，需要額外權限
  validateCustomColorPermission,
  validate(updatePracticeSchema),
  practiceController.update
);
```

#### 自定義顏色驗證

```typescript
// /Users/xiaoxu/Projects/daodao/daodao-server/src/middleware/practice.middleware.ts

// 顏色主題常量
const BASIC_COLOR_THEMES = ['red', 'yellow', 'blue', 'green'];
const PREMIUM_COLOR_THEMES = ['purple', 'pink', 'indigo', 'teal', 'orange', 'cyan', 'lime', 'rose'];

export async function validateCustomColorPermission(req, res, next) {
  const { card_color_theme, custom_color_enabled } = req.body;

  // 如果沒有設置顏色，直接通過
  if (!card_color_theme) {
    return next();
  }

  // 檢查是否為基礎顏色（免費用戶可用）
  if (BASIC_COLOR_THEMES.includes(card_color_theme)) {
    return next();
  }

  // 如果是 Premium 顏色，檢查權限
  if (PREMIUM_COLOR_THEMES.includes(card_color_theme)) {
    const hasPermission = await permissionService.hasPermission(
      req.user.id,
      'practice',
      'customize_color'
    );

    if (!hasPermission) {
      return res.status(403).json({
        error: 'PERMISSION_DENIED',
        message: `顏色 "${card_color_theme}" 僅供 Premium 用戶使用`,
        requiredPermission: 'practice:customize_color',
        upgradeUrl: '/pricing',
        availableColors: BASIC_COLOR_THEMES
      });
    }

    // 標記為自定義顏色（用於統計）
    req.body.custom_color_enabled = true;
    return next();
  }

  // 無效的顏色主題
  return res.status(400).json({
    error: 'INVALID_COLOR_THEME',
    message: `無效的顏色主題: ${card_color_theme}`,
    allowedThemes: {
      basic: BASIC_COLOR_THEMES,
      premium: PREMIUM_COLOR_THEMES
    }
  });
}
```

#### 服務層實現

```typescript
// /Users/xiaoxu/Projects/daodao/daodao-server/src/services/practice.service.ts

// 允許的顏色主題
const BASIC_COLOR_THEMES = ['red', 'yellow', 'blue', 'green'];
const PREMIUM_COLOR_THEMES = ['purple', 'pink', 'indigo', 'teal', 'orange', 'cyan', 'lime', 'rose'];
const ALL_COLOR_THEMES = [...BASIC_COLOR_THEMES, ...PREMIUM_COLOR_THEMES];

export async function update(practiceId: string, data: UpdatePracticeInput, userId: number) {
  const practice = await prismaClient.practices.findUnique({
    where: { external_id: practiceId }
  });

  if (!practice) {
    throw new NotFoundError('Practice not found');
  }

  // 驗證顏色主題是否有效
  if (data.card_color_theme && !ALL_COLOR_THEMES.includes(data.card_color_theme)) {
    throw new ValidationError(`Invalid color theme: ${data.card_color_theme}`);
  }

  // 更新資料
  const updated = await prismaClient.practices.update({
    where: { external_id: practiceId },
    data: {
      ...data,
      card_color_theme: data.card_color_theme,
      custom_color_enabled: data.custom_color_enabled ?? false,
      updated_at: new Date()
    },
    include: { users: true }
  });

  return updated;
}
```

### 7.5 使用者體驗流程

#### 免費用戶遇到進階功能

```
1. 用戶編輯實踐 → 看到基礎4色選項
2. 看到模糊的額外顏色 + 鎖圖標
3. 點擊「升級方案」按鈕
4. 跳轉到 /pricing 頁面
5. 查看訂閱方案對比
6. 選擇 Premium 方案 → 完成支付
7. 返回實踐編輯頁面 → 解鎖所有顏色
```

#### Premium 用戶使用自定義顏色

```
1. 用戶編輯實踐
2. 看到完整的12色選項
3. 點擊選擇喜歡的顏色
4. 保存實踐
5. 列表頁面立即顯示新顏色
6. 顏色偏好持久化到數據庫
```

### 7.6 實施優先級

**階段1：基礎功能（當前）**
- [x] 實現默認4色循環
- [x] 前端顏色計算邏輯
- [ ] 基礎測試與部署

**階段2：數據持久化（可選）**
- [ ] 添加 `card_color_theme` 和 `custom_color_enabled` 欄位
- [ ] 後端自動分配顏色主題邏輯
- [ ] 遷移現有數據（為已有實踐分配顏色）
- [ ] 前端使用後端返回的 `cardColorTheme`

**階段3：進階功能準備（訂閱系統上線後）**
- [ ] 設計 Premium 色板
- [ ] 實現權限檢查機制
- [ ] 創建顏色選擇器組件
- [ ] 添加升級引導流程

**階段4：自定義顏色功能（Premium 功能）**
- [ ] 數據庫 schema 更新
- [ ] API 權限驗證
- [ ] 前端自定義顏色 UI
- [ ] 顏色持久化與同步
- [ ] E2E 測試

## 八、後續優化建議

1. **性能優化**
   - 如果列表很長，考慮添加 `created_at` 索引（後端）
   - 使用 `React.memo` 優化卡片組件渲染
   - 顏色配置使用 CSS 變量減少重繪

2. **功能擴展**
   - 支持更多顏色選項（如漸變色）
   - 顏色主題包（如「柔和色調」、「高對比度」）
   - 按顏色篩選實踐

3. **用戶體驗**
   - 添加顏色圖例說明
   - 在實踐創建時預覽將分配的顏色
   - 快速顏色切換（右鍵選單）
   - 顏色使用統計（幫助用戶平衡顏色分配）

4. **可訪問性**
   - 高對比度模式
   - 色盲友善配色
   - 顏色名稱語音標註

## 九、參考文件

### 前端關鍵文件
- `/Users/xiaoxu/Projects/daodao/daodao-f2e/constants/practice.ts`
- `/Users/xiaoxu/Projects/daodao/daodao-f2e/features/practice/components/List/PracticeCard.tsx`
- `/Users/xiaoxu/Projects/daodao/daodao-f2e/features/practice/components/List/PracticeExploreSection.tsx`
- `/Users/xiaoxu/Projects/daodao/daodao-f2e/services/practice/hooks.ts`

### 後端關鍵文件
- `/Users/xiaoxu/Projects/daodao/daodao-server/prisma/schema.prisma`
- `/Users/xiaoxu/Projects/daodao/daodao-server/src/services/practice.service.ts`
- `/Users/xiaoxu/Projects/daodao/daodao-server/src/controllers/practice.controller.ts`

### 設計參考
- Tailwind CSS Colors: https://tailwindcss.com/docs/customizing-colors
- Material Design Colors: https://m2.material.io/design/color/
- Accessibility Guidelines: https://www.w3.org/WAI/WCAG21/quickref/
