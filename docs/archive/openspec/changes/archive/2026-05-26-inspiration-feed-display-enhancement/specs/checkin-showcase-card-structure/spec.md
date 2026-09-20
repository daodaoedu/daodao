## ADDED Requirements

### Requirement: CheckInShowcaseCard 封面區（Cover Area）

CheckInShowcaseCard 封面區 SHALL 高度為 240px，依有無圖片決定渲染方式。

#### Scenario: 有封面圖片
- **WHEN** 打卡包含 image_url
- **THEN** 封面 SHALL 顯示第一張 image_url，object-fit: cover

#### Scenario: 無封面圖片
- **WHEN** 打卡不包含 image_url
- **THEN** 封面 SHALL 渲染 CheckInCard 筆記本預覽（pointer-events: none，overflow hidden）

#### Scenario: 封面漸層遮罩
- **WHEN** 封面區渲染（不論有無圖片）
- **THEN** 封面底部 SHALL 疊加 transparent → logo-cyan 漸層遮罩

---

### Requirement: CheckInShowcaseCard 社群資訊區（Community Info Area）

CheckInShowcaseCard 社群資訊區 SHALL 位於封面下方，白色背景，包含以下元素：

- 用戶頭像（64x64）+ 心情 emoji badge（疊在頭像右下角）
- 打卡日期（text-light-gray 樣式）
- 打卡內容摘要（最多 2 行截斷）
- 分隔線
- 互動列：ReactionPickerButton（彙總模式）+ 留言計數圖示 + 留言數字
- 留言預覽（最多 2 則）：留言者頭像 24x24、名稱加粗、留言內容單行截斷

#### Scenario: 心情 emoji badge 位置
- **WHEN** 渲染社群資訊區頭像
- **THEN** 心情 emoji badge SHALL 疊在用戶頭像右下角

#### Scenario: 打卡摘要截斷
- **WHEN** 打卡內容超過 2 行
- **THEN** 內容 SHALL 截斷至最多 2 行顯示

#### Scenario: 留言預覽數量
- **WHEN** 打卡有留言
- **THEN** SHALL 顯示最多 2 則留言預覽，每則留言者頭像 24x24、名稱加粗、內容單行截斷

---

### Requirement: CheckInShowcaseCard 互動行為

#### Scenario: 點擊卡片本體跳轉詳情頁
- **WHEN** 用戶點擊卡片本體（非互動列、非三點選單）
- **THEN** 系統 SHALL router.push 至 `/practices/{practiceId}/check-ins/{checkInId}`

#### Scenario: 互動列與三點選單阻止跳轉
- **WHEN** 用戶點擊互動列或三點選單
- **THEN** 事件 SHALL stopPropagation，不觸發卡片本體跳轉

---

### Requirement: CheckInShowcaseCard 互動效能

#### Scenario: Reaction 計數更新延遲
- **WHEN** 用戶點擊 Reaction
- **THEN** 計數 SHALL 在 200ms 內更新顯示

#### Scenario: 留言送出即時顯示
- **WHEN** 用戶送出留言
- **THEN** 留言 SHALL 即時出現在留言列，不需重新載入頁面
