# 用戶資料整合任務清單

## 問題摘要

前端儲存用戶資料時顯示成功但未存入資料庫，原因為前後端與資料庫之間存在以下不一致：

---

## 檢查結果總覽

| 嚴重程度 | 問題 | 位置 | 影響 |
|---------|------|------|------|
| :red_circle: **致命** | **birthDay vs birthDate 欄位名稱不一致** | user.types.ts:97 vs user.validators.ts:290 | **出生日期永遠無法儲存** |
| :red_circle: **致命** | **positionList 中英文映射不一致** | user-role.ts vs position 表 | **身份永遠無法儲存** |
| :red_circle: **致命** | **interestList/tagList 中英文不一致** | professional-fields.ts vs categories 表 | **專業領域/探索領域無法儲存** |
| :red_circle: 嚴重 | location 城市映射邏輯錯誤 | user.service.ts:160-211、1003-1023 | 用戶地區保存失敗或不正確 |
| :red_circle: 嚴重 | preferences 查詢邏輯可能有 SQL 錯誤 | user.service.ts:116-151 | 偏好設定無法正確儲存 |
| :orange_circle: 中等 | FormData 無法清空欄位 | user.controller.ts:148-149 | 無法更新清空某些聯絡方式 |
| :orange_circle: 中等 | roleList → positionList 命名需統一 | 全專案 | 文檔和代碼理解困難 |
| :yellow_circle: 輕微 | 缺少錯誤驗證 | user.service.ts:1155-1167 | 靜默失敗，無法清楚了解錯誤 |

---

## :rotating_light: 致命問題 1：birthDay vs birthDate 欄位名稱不一致

**這是導致出生日期無法儲存的根本原因！**

| 層級 | 欄位名 | 檔案位置 |
|------|--------|----------|
| 前端傳送 | `birthDay` | daodao-f2e/packages/api/src/services/user.ts:146 |
| 後端 Validator | `birthDay` | daodao-server/src/validators/user.validators.ts:290 |
| 後端 Types | `birthDate` | daodao-server/src/types/user.types.ts:97 |
| 後端 Service 解構 | `birthDate` | daodao-server/src/services/user.service.ts:975 |

**問題**：Validator 驗證的是 `birthDay`，但 Service 解構的是 `birthDate`，導致 `birthDate` 永遠是 `undefined`！

**修復方式**：統一欄位名稱為 `birthDay`

```typescript
// daodao-server/src/types/user.types.ts:97
// 修改前
birthDate?: Date | string;

// 修改後
birthDay?: Date | string;
```

```typescript
// daodao-server/src/services/user.service.ts:975
// 修改前
const {
  birthDate,
  // ...
} = userData;

// 修改後
const {
  birthDay,
  // ...
} = userData;
```

---

## :rotating_light: 致命問題 2：positionList 中英文映射不一致

**這是導致「身份」無法儲存的根本原因！**

> **注意**：欄位已從 `roleList` 重新命名為 `positionList`，以明確表示這是職位/身份，而非系統角色。

### Migration 更新內容

參考：`daodao-storage/migrate/sql/003_update_position_names.sql`

1. **格式更新**：kebab-case → snake_case
2. **移除 citizen**：與其他選項重疊
3. **新增 36 個職業選項**
4. **新增 custom_position 欄位**：允許用戶自訂身份

### 更新後的 position 表對照

| 舊值 (kebab-case) | 新值 (snake_case) |
|-------------------|-------------------|
| `normal-student` | `normal_student` |
| `experimental-educator` | `experimental_educator` |
| `experimental-education-student` | `experimental_education_student` |
| `citizen` | **已移除** |
| `educator` | `educator` (不變) |
| `other` | `other` (不變) |
| `parents` | `parents` (不變) |

### 新增的 36 個職業選項

```sql
-- 軍公教
'civil_servant', 'military', 'teacher', 'police_firefighter',

-- 專業人士
'medical_staff', 'lawyer', 'accountant', 'architect', 'social_worker',

-- 科技/工程
'software_engineer', 'hardware_engineer', 'it_professional', 'data_analyst',

-- 商業/金融
'finance', 'insurance', 'sales', 'marketing', 'hr', 'management',

-- 設計/創意/媒體
'designer', 'media', 'artist', 'content_creator',

-- 服務業
'food_beverage', 'retail', 'tourism', 'beauty', 'hospitality',

-- 製造/技術/勞動
'manufacturing', 'construction', 'transportation', 'technician', 'agriculture',

-- 自由/創業
'freelancer', 'business_owner', 'startup',

-- 其他身份
'homemaker', 'retired', 'unemployed', 'volunteer'
```

### 前端修復方式

```typescript
// daodao-f2e/apps/product/src/constants/user-position.ts (原 user-role.ts)
export const FormPositionToApiPositionMap: Record<UserPosition, string> = {
  student: "normal_student",           // 使用 snake_case
  experimentalStudent: "experimental_education_student",
  experimentalEducator: "experimental_educator",
  educator: "educator",
  parents: "parents",
  other: "other",
  // ... 新增職業選項
};
```

### 新增 custom_position 支援

```typescript
// 用戶可自訂身份
interface UpdateUserRequest {
  positionList?: string[];      // 選擇的職位
  customPosition?: string;      // 自訂身份（最多 100 字）
}
```

---

## :rotating_light: 致命問題 3：interestList/tagList 中英文映射不一致

**這是導致「專業領域」和「想探索的領域」無法儲存的根本原因！**

### 資料來源

參考：`daodao-storage/init-scripts-refactored/430_create_table_categories.sql` 和 `998_insert_categories_data.sql`

### Categories 表完整對照（14 個主分類）

| snake_case 值 | 英文顯示名稱 | 建議中文顯示 |
|---------------|-------------|-------------|
| `nature_environment` | Nature and Environment | 自然與環境 |
| `mathematical_logic` | Math and Logic | 數理與邏輯 |
| `information_computer_science` | Information and Computer Science | 資訊與電腦科學 |
| `languages` | Languages | 語言 |
| `humanities_history_geography` | Humanities, History, and Geography | 人文、歷史與地理 |
| `sociology_psychology` | Sociology and Psychology | 社會學與心理學 |
| `education_learning` | Education and Learning | 教育與學習 |
| `business_management_finance` | Business Management and Finance | 商管與理財 |
| `arts_design` | Arts and Design | 藝術與設計 |
| `lifestyle` | Lifestyle and Taste | 生活風格與品味 |
| `social_innovation_sustainability` | Social Innovation and Sustainability | 社會創新與永續 |
| `medicine_sports` | Medicine and Sports | 醫學與運動 |
| `personal_development` | Personal Development | 個人成長 |
| `others` | Others | 其他 |

### 前端修復方式

```typescript
// daodao-f2e/apps/product/src/constants/interest-categories.ts
export const INTEREST_CATEGORIES = [
  { value: "nature_environment", label: "自然與環境" },
  { value: "mathematical_logic", label: "數理與邏輯" },
  { value: "information_computer_science", label: "資訊與電腦科學" },
  { value: "languages", label: "語言" },
  { value: "humanities_history_geography", label: "人文、歷史與地理" },
  { value: "sociology_psychology", label: "社會學與心理學" },
  { value: "education_learning", label: "教育與學習" },
  { value: "business_management_finance", label: "商管與理財" },
  { value: "arts_design", label: "藝術與設計" },
  { value: "lifestyle", label: "生活風格與品味" },
  { value: "social_innovation_sustainability", label: "社會創新與永續" },
  { value: "medicine_sports", label: "醫學與運動" },
  { value: "personal_development", label: "個人成長" },
  { value: "others", label: "其他" },
] as const;

export type InterestCategoryValue = typeof INTEREST_CATEGORIES[number]['value'];
```

### API 傳送格式

```typescript
// 傳送時使用 snake_case value
const interestList = ["education_learning", "arts_design", "information_computer_science"];
```

---

## 1. 欄位命名不一致

### 1.1 用戶名稱

| 層級 | 欄位名 |
|------|--------|
| 資料庫 | `nickname` |
| 後端 API Request | `name` |
| 後端 API Response | `name` (映射自 nickname) |
| 前端 | `name` |

**檢查結果**：:white_check_mark: 通過
- **位置**：user.service.ts:972、1102
- **說明**：程式碼正確地將 `name` 映射到 `nickname`

### 1.2 出生日期

| 層級 | 欄位名 | 資料型態 |
|------|--------|----------|
| 資料庫 | `birth_date` | DATE |
| 後端 API | `birthDay` | string (YYYY-MM-DD) |
| 前端 | `birthDay` | string |

**檢查結果**：:red_circle: **致命** - 後端 Types 使用 `birthDate`，需統一為 `birthDay`

### 1.3 自我介紹

| 層級 | 欄位名 |
|------|--------|
| 資料庫 | `basic_info.self_introduction` |
| 後端 API | `selfIntroduction` |
| 前端 | `selfIntroduction` |

**檢查結果**：:white_check_mark: 通過

---

## 2. 資料型態不符

### 2.1 陣列欄位處理

| 欄位 | 前端傳送 | 資料庫儲存 |
|------|----------|------------|
| `tagList` | `string[]` | `entity_tags` 表 |
| `positionList` | `string[]` | 關聯 `user_positions` 表 |
| `interestList` | `string[]` (分類名稱) | 關聯 `user_interests` 表 (category_id) |
| `professionalField` | `string[]` | 關聯 `user_professional_fields` 表 |
| `wantToDoList` | `string[]` | 關聯 `basic_info.want_to_do_list` |

**檢查結果**：

- [x] **positionList 名稱轉換** - :red_circle: 中英文不一致
  - **位置**：user.service.ts:850-862、1122-1143
  - **問題**：前端傳送中文，資料庫使用英文
  - **修復**：統一使用 snake_case 英文值

- [x] **interestList 分類名稱轉換** - :red_circle: 中英文不一致
  - **位置**：user.service.ts:61-90（setUserInterests）
  - **問題**：前端傳送中文，資料庫使用英文
  - **修復**：建立 value/label 映射

- [x] **professionalField 寫入** - :warning: 邊界情況
  - **位置**：user.service.ts:1112、1161-1167
  - **問題**：如果 professionalField 是空陣列，邏輯正確但缺少錯誤處理

- [x] **wantToDoList 寫入** - :white_check_mark: 通過

### 2.2 偏好設定結構

| 層級 | 結構 |
|------|------|
| 前端傳送 | `Record<string, string[]>` (類型名稱 → 選項值陣列) |
| 後端期望 | 需轉換為 `preference_option_id` |
| 資料庫 | `user_preferences` 表 (user_id, preference_option_id, is_selected) |

**檢查結果**：:red_circle: 嚴重問題 - 需確認查詢邏輯是否正確

---

## 3. API 介面不匹配

### 3.1 FormData vs JSON

- [x] **後端支援 multipart/form-data** - :white_check_mark: 通過
- [x] **巢狀物件解析** - :white_check_mark: 通過
- [ ] **FormData 無法清空欄位** - :orange_circle: 中等問題

### 3.2 聯絡資訊結構

| 前端傳送 | 資料庫 |
|----------|--------|
| `contactList.instagram` | `contacts.ig` |
| `contactList.discord` | `contacts.discord_id` |
| `contactList.line` | `contacts.line_id` |
| `contactList.facebook` | `contacts.fb` |

**檢查結果**：:white_check_mark: 通過

### 3.3 位置資訊

| 前端傳送 | 後端處理 | 資料庫 |
|----------|----------|--------|
| `location` (area code 或城市名) | 需查詢 location 表 | `users.location_id` (FK) |

**檢查結果**：:red_circle: 嚴重問題 - getCityNameMapping 不支援簡短格式

---

## 4. 關聯資料更新問題

### 4.1 多對多關聯更新

| 欄位 | 關聯表 |
|------|--------|
| `interestList` | `user_interests` |
| `professionalField` | `user_professional_fields` |
| `positionList` | `user_positions` |
| `preferences` | `user_preferences` |

**檢查結果**：
- [x] **使用交易 (transaction)** - :white_check_mark: 通過
- [x] **刪除舊資料 → 插入新資料流程** - :white_check_mark: 通過
- [ ] **Transaction 中的錯誤驗證** - :yellow_circle: 缺失

### 4.2 關聯表建立

**檢查結果**：:white_check_mark: 通過

---

## 5. 調試與驗證任務

### 5.1 後端日誌

- [ ] 在 `user.service.ts` 的 update 方法加入請求參數日誌
- [ ] 確認 SQL 查詢是否正確執行
- [ ] 檢查是否有未捕獲的錯誤

### 5.2 資料庫驗證

- [ ] 更新後直接查詢資料庫確認資料變更
- [ ] 檢查 `updated_at` 時間戳是否更新

### 5.3 API 回應驗證

- [ ] 確認 API 回應的資料與資料庫一致
- [ ] 檢查是否有快取導致顯示舊資料

---

## 6. 優先處理項目

根據影響範圍，建議按以下順序處理：

### 0. :rotating_light: 致命 - 立即修復（根本原因）

- [ ] **修復 birthDay vs birthDate 欄位名稱不一致**
  - 檔案：`daodao-server/src/types/user.types.ts:97`
  - 問題：Types 定義 `birthDate`，但 Validator 和前端都用 `birthDay`
  - 影響：出生日期永遠無法儲存
  - 修復：將 types 中的 `birthDate` 改為 `birthDay`

- [ ] **修復 positionList 中英文映射不一致**
  - 檔案：`daodao-f2e/apps/product/src/constants/user-role.ts`（需重命名為 user-position.ts）
  - 問題：前端傳送中文（「學生」），但資料庫 position.name 是英文（`normal_student`）
  - 影響：身份永遠無法儲存
  - 修復：修改映射使用 snake_case 英文值

- [ ] **修復 interestList/tagList 中英文不一致**
  - 檔案：`daodao-f2e/apps/product/src/constants/professional-fields.ts`
  - 問題：`AVAILABLE_FIELDS` 使用中文，但資料庫 categories.name 是英文
  - 影響：專業領域、想探索的領域永遠無法儲存
  - 修復：建立 value/label 映射，傳送英文 value

### 1. :red_circle: 高優先 - 立即修復

- [ ] **修復 location 城市映射邏輯**
  - 檔案：`daodao-server/src/services/user.service.ts:160-211`
  - 問題：getCityNameMapping 不支援簡短格式（如 'taipei'）
  - 影響：用戶地區無法正確儲存

- [ ] **檢查 preferences 查詢邏輯**
  - 檔案：`daodao-server/src/services/user.service.ts:116-151`
  - 問題：preference_options 和 preference_types 的關聯查詢可能有問題
  - 影響：偏好設定無法正確儲存

### 2. :orange_circle: 中優先 - 盡快修復

- [ ] **修復 FormData 無法清空欄位問題**
  - 檔案：`daodao-server/src/controllers/user.controller.ts:148-149`
  - 問題：空值被跳過，無法清空欄位
  - 影響：無法透過 FormData 清空聯絡資訊

- [ ] **統一 roleList → positionList 命名**
  - 檔案：全專案（前端、後端）
  - 問題：命名混淆，roleList 實際對應 positions 表
  - 影響：文檔和代碼理解困難
  - 修復：全域搜尋並替換 `roleList` → `positionList`

### 3. :yellow_circle: 低優先 - 後續改進

- [ ] **加入關聯資料的錯誤驗證**
  - 檔案：`daodao-server/src/services/user.service.ts:1155-1167`
  - 問題：無效的 interestList 會靜默失敗
  - 影響：開發者難以定位問題

- [ ] **統一日期格式處理**
- [ ] **統一陣列欄位處理**

---

## 參考檔案

| 類型 | 路徑 |
|------|------|
| 資料庫 Schema | `daodao-storage/init-scripts-refactored/120_create_table_users.sql` |
| Position Migration | `daodao-storage/migrate/sql/003_update_position_names.sql` |
| Categories 表結構 | `daodao-storage/init-scripts-refactored/430_create_table_categories.sql` |
| Categories 資料 | `daodao-storage/init-scripts-refactored/998_insert_categories_data.sql` |
| 後端類型定義 | `daodao-server/src/types/user.types.ts` |
| 後端服務 | `daodao-server/src/services/user.service.ts` |
| 後端控制器 | `daodao-server/src/controllers/user.controller.ts` |
| 前端 API | `daodao-f2e/packages/api/src/services/user.ts` |
| 前端 Hooks | `daodao-f2e/packages/api/src/services/user-hooks.ts` |

---

## 欄位對照表

### 完整欄位映射參考

| 功能 | 前端欄位 | 後端欄位 | 資料庫欄位/表 | 狀態 |
|------|----------|----------|---------------|------|
| 用戶名稱 | `name` | `name` → `nickname` | `users.nickname` | :white_check_mark: |
| 性別 | `gender` | `gender` | `users.gender` | :white_check_mark: |
| 出生日期 | `birthDay` | `birthDate`（需改為 birthDay） | `users.birth_date` | :red_circle: **致命** |
| 教育程度 | `educationStage` | `educationStage` | `users.education_stage` | :white_check_mark: |
| 個人座右銘 | `personalSlogan` | `personalSlogan` | `users.personal_slogan` | :white_check_mark: |
| 位置 | `location` | `location` → `location_id` | `users.location_id` | :red_circle: 問題 |
| 公開位置 | `isOpenLocation` | `isOpenLocation` | `users.is_open_location` | :white_check_mark: |
| 公開檔案 | `isOpenProfile` | `isOpenProfile` | `users.is_open_profile` | :white_check_mark: |
| 訂閱郵件 | `isSubscribeEmail` | `isSubscribeEmail` | `contacts.is_subscribe_email` | :white_check_mark: |
| 標籤 | `tagList` | `tagList` | `entity_tags` | :red_circle: 中英文 |
| 自我介紹 | `selfIntroduction` | `selfIntroduction` | `basic_info.self_introduction` | :white_check_mark: |
| 目標清單 | `wantToDoList` | `wantToDoList` | `basic_info.want_to_do_list` | :white_check_mark: |
| 分享 | `share` | `share` | `basic_info.share` | :white_check_mark: |
| 聯絡資訊 | `contactList` | `contactList` | `contacts.*` | :white_check_mark: |
| 想探索的領域 | `interestList` | `interestList` | `user_interests` → `categories` | :red_circle: 中英文（14 分類） |
| 專業領域 | `professionalField` | `professionalField` | `user_professional_fields` | :white_check_mark: |
| 職位(身份) | `positionList` | `positionList` | `user_positions` | :red_circle: 中英文 |
| 自訂身份 | `customPosition` | `customPosition` | `users.custom_position` | :new: 新增 |
| 偏好設定 | `preferences` | `preferences` | `user_preferences` | :red_circle: 問題 |
| 自訂 ID | `customId` | `customId` | `users.custom_id` | :white_check_mark: |
| 來源追蹤 | `referralSource` | `referralSource` | `users.referral_source` | :white_check_mark: |

---

## Position 表完整對照

### 原有選項（更新後）

| snake_case 值 | 中文顯示 |
|---------------|----------|
| `normal_student` | 一般學生 |
| `experimental_education_student` | 實驗教育學生 |
| `experimental_educator` | 實驗教育工作者 |
| `educator` | 教育工作者 |
| `parents` | 家長 |
| `other` | 其他 |

### 新增選項（36 項）

| 分類 | snake_case 值 | 建議中文顯示 |
|------|---------------|--------------|
| 軍公教 | `civil_servant` | 公務員 |
| | `military` | 軍人 |
| | `teacher` | 教師 |
| | `police_firefighter` | 警消人員 |
| 專業人士 | `medical_staff` | 醫護人員 |
| | `lawyer` | 律師 |
| | `accountant` | 會計師 |
| | `architect` | 建築師 |
| | `social_worker` | 社工 |
| 科技/工程 | `software_engineer` | 軟體工程師 |
| | `hardware_engineer` | 硬體工程師 |
| | `it_professional` | 資訊人員 |
| | `data_analyst` | 數據分析師 |
| 商業/金融 | `finance` | 金融業 |
| | `insurance` | 保險業 |
| | `sales` | 業務 |
| | `marketing` | 行銷 |
| | `hr` | 人資 |
| | `management` | 管理職 |
| 設計/創意/媒體 | `designer` | 設計師 |
| | `media` | 媒體業 |
| | `artist` | 藝術家 |
| | `content_creator` | 內容創作者 |
| 服務業 | `food_beverage` | 餐飲業 |
| | `retail` | 零售業 |
| | `tourism` | 旅遊業 |
| | `beauty` | 美容美髮 |
| | `hospitality` | 飯店業 |
| 製造/技術/勞動 | `manufacturing` | 製造業 |
| | `construction` | 營建業 |
| | `transportation` | 運輸業 |
| | `technician` | 技術人員 |
| | `agriculture` | 農業 |
| 自由/創業 | `freelancer` | 自由工作者 |
| | `business_owner` | 企業主 |
| | `startup` | 創業者 |
| 其他身份 | `homemaker` | 家管 |
| | `retired` | 退休 |
| | `unemployed` | 待業中 |
| | `volunteer` | 志工 |

---

## Categories 表完整對照（想探索的領域）

參考：`daodao-storage/init-scripts-refactored/430_create_table_categories.sql`、`998_insert_categories_data.sql`

### 14 個主分類

| snake_case 值 | 英文顯示名稱 | 建議中文顯示 |
|---------------|-------------|-------------|
| `nature_environment` | Nature and Environment | 自然與環境 |
| `mathematical_logic` | Math and Logic | 數理與邏輯 |
| `information_computer_science` | Information and Computer Science | 資訊與電腦科學 |
| `languages` | Languages | 語言 |
| `humanities_history_geography` | Humanities, History, and Geography | 人文、歷史與地理 |
| `sociology_psychology` | Sociology and Psychology | 社會學與心理學 |
| `education_learning` | Education and Learning | 教育與學習 |
| `business_management_finance` | Business Management and Finance | 商管與理財 |
| `arts_design` | Arts and Design | 藝術與設計 |
| `lifestyle` | Lifestyle and Taste | 生活風格與品味 |
| `social_innovation_sustainability` | Social Innovation and Sustainability | 社會創新與永續 |
| `medicine_sports` | Medicine and Sports | 醫學與運動 |
| `personal_development` | Personal Development | 個人成長 |
| `others` | Others | 其他 |

### 前端實作範例

```typescript
// constants/interest-categories.ts
export const INTEREST_CATEGORIES = [
  { value: "nature_environment", label: "自然與環境" },
  { value: "mathematical_logic", label: "數理與邏輯" },
  { value: "information_computer_science", label: "資訊與電腦科學" },
  { value: "languages", label: "語言" },
  { value: "humanities_history_geography", label: "人文、歷史與地理" },
  { value: "sociology_psychology", label: "社會學與心理學" },
  { value: "education_learning", label: "教育與學習" },
  { value: "business_management_finance", label: "商管與理財" },
  { value: "arts_design", label: "藝術與設計" },
  { value: "lifestyle", label: "生活風格與品味" },
  { value: "social_innovation_sustainability", label: "社會創新與永續" },
  { value: "medicine_sports", label: "醫學與運動" },
  { value: "personal_development", label: "個人成長" },
  { value: "others", label: "其他" },
] as const;

// 使用時
const selectedInterests = ["education_learning", "arts_design"]; // 傳送 snake_case 值
```
