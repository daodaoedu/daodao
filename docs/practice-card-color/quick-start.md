# 主題實踐卡片顏色功能 - 快速開始指南

## 文檔導覽

本目錄包含以下文檔：

1. **demand.md** - 原始需求說明
2. **implementation-plan.md** - 詳細實施計劃（本功能的核心文檔）
3. **architecture-reference.md** - 專案架構參考（訂閱、權限、偏好系統）
4. **quick-start.md** - 本文檔（快速開始指南）

## 功能概述

為「進行中」狀態的主題實踐卡片添加背景顏色，顏色按照創建順序循環顯示：紅 → 黃 → 藍 → 綠 → 紅...

**分階段實施**:
- **階段1**（當前）: 基礎功能 - 默認4色循環（所有用戶）
- **階段2**（未來）: 進階功能 - 自定義顏色（Premium 用戶）

## 5分鐘快速理解

### 技術方案

**純前端實現**（階段1）:
- ✅ 無需數據庫變更
- ✅ 無需後端 API 修改
- ✅ 實施簡單快速
- ✅ 開箱即用

### 核心邏輯

```typescript
// 1. 顏色配置（4種顏色）
const COLORS = ['red', 'yellow', 'blue', 'green'];

// 2. 計算邏輯
const colorIndex = practiceIndex % 4;
const color = COLORS[colorIndex];

// 3. 應用到卡片
<Card className={`bg-${color}-50 border-${color}-200`} />
```

### 需要修改的文件

**前端**（共3個核心文件）:
1. `/daodao-f2e/constants/practice.ts` - 添加顏色配置
2. `/daodao-f2e/utils/practiceColor.ts` - 新建顏色計算工具
3. `/daodao-f2e/features/practice/components/List/PracticeCard.tsx` - 修改卡片組件

**後端**: 階段1不需要修改

## 30分鐘實施指南

### 步驟 1: 創建顏色配置（5分鐘）

**文件**: `/Users/xiaoxu/Projects/daodao/daodao-f2e/constants/practice.ts`

在文件末尾添加：

```typescript
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
  },
  {
    name: 'yellow',
    background: 'bg-yellow-50',
    border: 'border-yellow-200',
    hover: 'hover:bg-yellow-100',
  },
  {
    name: 'blue',
    background: 'bg-blue-50',
    border: 'border-blue-200',
    hover: 'hover:bg-blue-100',
  },
  {
    name: 'green',
    background: 'bg-green-50',
    border: 'border-green-200',
    hover: 'hover:bg-green-100',
  }
] as const;

export type PracticeCardColor = typeof PRACTICE_CARD_COLORS[number];
```

### 步驟 2: 創建工具函數（10分鐘）

**文件**: `/Users/xiaoxu/Projects/daodao/daodao-f2e/utils/practiceColor.ts`（新建）

```typescript
import { PRACTICE_CARD_COLORS } from '@/constants/practice';
import type { Practice } from '@/services/practice/schema';

/**
 * 根據實踐在列表中的位置獲取對應的顏色配置（階段1使用）
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
 * 根據顏色主題名稱獲取顏色配置（階段2+使用，推薦）
 * @param themeName - 顏色主題名稱（如 "red", "yellow"）
 * @returns 顏色配置對象
 */
export function getColorByTheme(themeName?: string) {
  if (!themeName) {
    return PRACTICE_CARD_COLORS[0];  // 默認紅色
  }

  const color = PRACTICE_CARD_COLORS.find(c => c.name === themeName);
  return color || PRACTICE_CARD_COLORS[0];
}
```

**使用說明**:
- **階段1（純前端）**: 使用 `getPracticeCardColor()`，根據列表位置計算顏色
- **階段2+（後端持久化）**: 使用 `getColorByTheme(practice.cardColorTheme)`，直接使用後端返回的主題色

### 步驟 3: 修改 PracticeCard 組件（10分鐘）

**文件**: `/Users/xiaoxu/Projects/daodao/daodao-f2e/features/practice/components/List/PracticeCard.tsx`

**3.1 修改接口定義**:

```typescript
import type { PracticeCardColor } from '@/constants/practice';

interface PracticeCardProps {
  practice: Practice;
  currentUserId?: string;
  onEdit?: (practice: Practice) => void;
  onDelete?: (practiceId: string) => void;
  onCheckIn?: (practice: Practice) => void;
  showActions?: boolean;
  colorConfig?: PracticeCardColor;  // 新增
}
```

**3.2 修改組件實現**:

```typescript
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
        colorConfig?.background,   // 新增：應用背景色
        colorConfig?.border,        // 新增：應用邊框色
        colorConfig?.hover          // 新增：應用懸停效果
      )}
    >
      {/* 卡片內容保持不變 */}
    </Card>
  );
};
```

### 步驟 4: 修改 PracticeExploreSection 組件（5分鐘）

**文件**: `/Users/xiaoxu/Projects/daodao/daodao-f2e/features/practice/components/List/PracticeExploreSection.tsx`

**4.1 導入工具函數**:

```typescript
import { useMemo } from 'react';
import { getPracticeCardColor } from '@/utils/practiceColor';
```

**4.2 計算並傳遞顏色配置**:

```typescript
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
            colorConfig={colorConfig}  // 新增：傳遞顏色配置
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

## 測試檢查清單

### 基礎功能測試

- [ ] 創建4個「進行中」的實踐，檢查顏色是否按紅、黃、藍、綠順序顯示
- [ ] 創建第5個實踐，檢查是否循環回紅色
- [ ] 檢查非 active 狀態的實踐是否沒有背景顏色
- [ ] 在不同螢幕尺寸（手機、平板、桌面）下檢查顯示效果

### 視覺測試

- [ ] 文字對比度是否足夠（可使用 https://webaim.org/resources/contrastchecker/）
- [ ] 卡片懸停效果是否正常
- [ ] 顏色過渡動畫是否流暢

### 邊界情況

- [ ] 沒有實踐時頁面是否正常
- [ ] 只有1個實踐時是否正常顯示紅色
- [ ] 刪除實踐後，顏色順序是否保持一致

## 常見問題

### Q1: 後端為什麼使用顏色主題名稱而非索引？

**A**: 設計決策採用 `card_color_theme: "red"` 而非 `card_color_index: 0`，原因：

**優勢**:
- ✅ **語義清晰**: API 響應自解釋，`"blue"` 比 `2` 更直觀
- ✅ **靈活擴展**: 新增顏色不影響現有數據
- ✅ **Premium 整合**: 統一使用一個欄位，無需額外的 `custom_color_value`
- ✅ **更好的錯誤提示**: 可以顯示可用顏色列表
- ✅ **降低維護成本**: 不需要維護索引映射表

**示例對比**:
```typescript
// 使用主題色（✅ 推薦）
{
  "cardColorTheme": "blue",
  "customColorEnabled": false
}

// 使用索引（❌ 不推薦）
{
  "cardColorIndex": 2,  // 需要查表知道是藍色
  "customColorValue": "purple"  // 需要兩個欄位
}
```

詳細分析請參考 `technical-decisions.md`。

### Q2: 為什麼不直接在數據庫存儲顏色（階段1）？

**A**: 階段1採用純前端實現，原因：
- 實施簡單快速，無需數據庫遷移
- 降低開發成本和風險
- 快速驗證用戶接受度
- 為未來的自定義顏色（Premium 功能）預留空間

如果需要顏色持久化（階段2），可以參考 `implementation-plan.md` 中的「3.2 後端修改」章節。

### Q3: 如果用戶改變排序方式，顏色會變嗎？

**A**:
- **階段1（純前端）**: 會變。顏色基於當前列表的順序計算
  - 如果按「創建時間」排序，顏色順序固定
  - 如果按「更新時間」排序，顏色順序會隨更新而變化
  - 這提供了視覺反饋，幫助用戶識別最近活躍的實踐
- **階段2+（後端持久化）**: 不會變。顏色從後端返回，與排序無關

### Q4: 暗色模式怎麼辦？

**A**: 階段1使用的淺色背景（如 `bg-red-50`）在亮色模式下效果最佳。

如果需要支持暗色模式，可以使用 Tailwind 的 `dark:` 前綴：

```typescript
{
  name: 'red',
  background: 'bg-red-50 dark:bg-red-900',
  border: 'border-red-200 dark:border-red-700',
}
```

### Q5: 如何添加更多顏色？

**A**: 修改 `PRACTICE_CARD_COLORS` 配置即可：

```typescript
export const PRACTICE_CARD_COLORS = [
  { name: 'red', ... },
  { name: 'yellow', ... },
  { name: 'blue', ... },
  { name: 'green', ... },
  { name: 'purple', ... },  // 新增
  { name: 'pink', ... },    // 新增
] as const;
```

**階段1**: 模運算會自動處理循環邏輯
**階段2+**: 後端也需要更新 `DEFAULT_COLOR_THEMES` 常量

### Q6: 其他頁面的 PracticeCard 也會有顏色嗎？

**A**: 只有傳遞了 `colorConfig` prop 的卡片才會顯示顏色。

如果某些頁面不需要顏色，只需不傳遞該 prop：

```tsx
<PracticeCard practice={practice} />  {/* 無顏色 */}
<PracticeCard practice={practice} colorConfig={color} />  {/* 有顏色 */}
```

## 進階功能預覽

階段2（未來）將實現自定義顏色作為 Premium 功能：

### 免費用戶
- 使用默認4色循環（紅、黃、藍、綠）
- 無法自定義顏色

### Premium 用戶
- 解鎖8種額外顏色（紫、粉、靛、青、橙、青檸、玫瑰等）
- 可以為每個實踐手動選擇顏色
- 顏色偏好持久化到數據庫

詳細設計請參考 `implementation-plan.md` 的「七、進階功能設計」章節。

## 實施時程參考

**預估時間**: 1-2 天

| 階段 | 任務 | 預估時間 |
|------|------|----------|
| 開發 | 創建顏色配置 + 工具函數 | 0.5小時 |
| 開發 | 修改 PracticeCard 組件 | 0.5小時 |
| 開發 | 修改 PracticeExploreSection | 0.5小時 |
| 開發 | 處理其他使用 PracticeCard 的地方 | 1小時 |
| 測試 | 功能測試 + 視覺測試 | 2小時 |
| 測試 | 跨瀏覽器/設備測試 | 1小時 |
| 優化 | 調整顏色配置、修復問題 | 1小時 |
| 審查 | 代碼審查 + 文檔更新 | 0.5小時 |
| **總計** | | **7小時（約1天）** |

## 下一步

1. **閱讀完整實施計劃**: `implementation-plan.md`
2. **了解專案架構**: `architecture-reference.md`（如需實現進階功能）
3. **開始實施**: 按照本文檔的「30分鐘實施指南」開始編碼
4. **測試**: 使用「測試檢查清單」確保品質
5. **部署**: 創建 PR，通過審查後合併

## 需要幫助？

- **技術問題**: 參考 `implementation-plan.md` 的詳細說明
- **架構問題**: 參考 `architecture-reference.md`
- **設計問題**: 可以調整 `PRACTICE_CARD_COLORS` 中的 Tailwind 類名

## 參考資源

- [Tailwind CSS Colors](https://tailwindcss.com/docs/customizing-colors)
- [Web Content Accessibility Guidelines (WCAG)](https://www.w3.org/WAI/WCAG21/quickref/)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
