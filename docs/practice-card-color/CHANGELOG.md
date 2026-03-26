# 變更日誌

記錄主題實踐卡片顏色功能規劃文檔的重要變更。

---

## [1.1.0] - 2025-12-29

### 🎯 重大變更：採用顏色主題名稱（theme）替代索引（index）

#### 變更內容

**數據模型變更**:
```diff
// 之前
- card_color_index: Int?
- custom_color_value: String?

// 現在
+ card_color_theme: String?         // 統一的顏色主題欄位
+ custom_color_enabled: Boolean?    // 標記是否自定義
```

**API 響應變更**:
```diff
// 之前
{
-  "cardColorIndex": 2,
-  "customColorValue": "purple"
}

// 現在
{
+  "cardColorTheme": "blue",
+  "customColorEnabled": false
}
```

**前端工具函數變更**:
```diff
// 新增（推薦用於階段2+）
+ getColorByTheme(themeName: string)

// 保留（用於階段1純前端）
  getPracticeCardColor(practices, practiceId)
```

#### 變更原因

採用主題色名稱的7大優勢：

1. **語義化清晰** - `"blue"` 比 `2` 更直觀，API 響應可自解釋
2. **靈活擴展** - 新增顏色不會破壞現有數據的索引映射
3. **Premium 整合自然** - 免費和付費顏色使用同一欄位
4. **降低維護成本** - 無需維護前後端的索引映射表
5. **更好的錯誤提示** - 可直接顯示可用顏色名稱列表
6. **資料庫查詢直觀** - `WHERE card_color_theme = 'blue'` vs `WHERE card_color_index = 2`
7. **支持未來擴展** - 可按冷暖色調分類、顏色別名系統等

詳細分析請參考 [technical-decisions.md](./technical-decisions.md)。

#### 影響範圍

**新增文檔**:
- ✅ `technical-decisions.md` - 詳細的技術決策說明

**更新文檔**:
- ✅ `implementation-plan.md` - 所有代碼示例更新為主題色方式
- ✅ `quick-start.md` - 添加主題色說明和新的常見問題
- ✅ `README.md` - 添加技術決策文檔鏈接

**測試更新**:
- ✅ 單元測試新增 `getColorByTheme` 測試用例
- ✅ 測試分組為階段1和階段2+

#### 向後兼容性

- ✅ 階段1（純前端）實現不受影響，仍使用 `getPracticeCardColor()`
- ✅ 階段2+（後端持久化）採用新的主題色方式
- ✅ 兩種方式可共存，漸進式遷移

#### 遷移指南

**如果已經開始實施階段1**:
- 無需修改，繼續使用 `getPracticeCardColor()` 即可

**如果準備實施階段2（後端持久化）**:
1. 使用 `card_color_theme` 欄位替代 `card_color_index`
2. 後端創建時分配主題名稱（如 "red"）而非索引（如 0）
3. 前端使用 `getColorByTheme(practice.cardColorTheme)`
4. 參考 `implementation-plan.md` 第 3.2 節

**如果準備實施階段4（Premium 自定義顏色）**:
- 直接使用 `card_color_theme` 欄位存儲用戶選擇
- 無需額外的 `custom_color_value` 欄位
- 參考 `implementation-plan.md` 第 7 章

---

## [1.0.0] - 2025-12-29

### 🎉 初始版本發布

#### 新增內容

**核心文檔**:
- ✅ `README.md` - 文檔總覽與導航
- ✅ `quick-start.md` - 30分鐘快速實施指南
- ✅ `implementation-plan.md` - 完整技術實施方案
- ✅ `architecture-reference.md` - 專案架構參考
- ✅ `demand.md` - 原始需求說明

#### 功能設計

**階段1: 基礎功能（純前端）**
- 4色循環：紅 → 黃 → 藍 → 綠
- 按創建順序自動分配
- 僅適用於「進行中」狀態

**階段2: 數據持久化（可選）**
- 後端自動分配顏色
- 顏色持久化到數據庫

**階段3-4: 進階功能（Premium）**
- 12色擴展色板
- 用戶自定義顏色
- 權限控制與訂閱整合

#### 架構參考

- 完整的訂閱系統架構說明
- 基於 RBAC 的權限控制機制
- 用戶偏好設置系統
- 進階功能實現模式

---

## 版本說明

版本號格式：`主版本.次版本.修訂版本`

- **主版本**: 重大架構變更或不兼容的 API 變更
- **次版本**: 新增功能但保持向後兼容
- **修訂版本**: 問題修正和文檔更新

---

## 文檔維護

- **維護者**: 開發團隊
- **更新頻率**: 根據需求和實施進度更新
- **反饋渠道**: GitHub Issues

---

## 相關連結

- [技術決策文檔](./technical-decisions.md)
- [實施計劃](./implementation-plan.md)
- [快速開始](./quick-start.md)
- [專案架構參考](./architecture-reference.md)
