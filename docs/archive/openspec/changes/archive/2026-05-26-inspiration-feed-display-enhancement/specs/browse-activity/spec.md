## ADDED Requirements

### Requirement: 三點選單「瀏覽活動」入口

三點選單行為依**場景**（展示卡片 vs 詳情頁）與**身份**（本人 vs 他人）區分：

**CheckInShowcaseCard 展示卡片**

| 身份 | 三點選單 |
|------|---------|
| 本人打卡 | **不顯示三點選單**（完整選單僅在詳情頁） |
| 他人打卡 | 「檢舉」 |

**打卡詳情頁**

| 身份 | 三點選單選項 |
|------|-------------|
| 本人打卡 | 編輯打卡、分享打卡、**瀏覽活動** |
| 他人打卡 | 檢舉、**瀏覽活動** |

#### Scenario: 展示卡片本人打卡不顯示三點選單
- **WHEN** 本人查看 CheckInShowcaseCard 上自己的打卡
- **THEN** 展示卡片 SHALL 不顯示三點選單按鈕

#### Scenario: 展示卡片他人打卡只顯示「檢舉」
- **WHEN** 用戶查看 CheckInShowcaseCard 上他人的打卡
- **THEN** 三點選單 SHALL 只顯示「檢舉」（不含「瀏覽活動」）

#### Scenario: 詳情頁本人打卡三點選單
- **WHEN** 本人在打卡詳情頁查看自己的打卡
- **THEN** 三點選單 SHALL 顯示「編輯打卡」、「分享打卡」、「瀏覽活動」

#### Scenario: 詳情頁他人打卡三點選單
- **WHEN** 用戶在打卡詳情頁查看他人打卡
- **THEN** 三點選單 SHALL 顯示「檢舉」、「瀏覽活動」

---

### Requirement: BrowseActivityContent Bottom Sheet

點擊「瀏覽活動」 SHALL 開啟 BrowseActivityContent Bottom Sheet，顯示對此打卡有反應的用戶列表。

#### Scenario: 開啟 Bottom Sheet
- **WHEN** 用戶點擊三點選單中的「瀏覽活動」
- **THEN** 系統 SHALL 開啟 BrowseActivityContent Bottom Sheet

#### Scenario: 反應列表內容
- **WHEN** BrowseActivityContent 載入
- **THEN** 列表 SHALL 顯示每則反應的：用戶頭像（32x32）、名稱、反應 emoji、相對時間

#### Scenario: 反應列表排序
- **WHEN** 多位用戶對同一打卡有反應
- **THEN** 列表 SHALL 依 `reactedAt` 時間倒序排列（最新的在最上方）

#### Scenario: 空狀態
- **WHEN** 該打卡尚無任何反應
- **THEN** 系統 SHALL 顯示「還沒有人互動，成為第一個給予回應的人吧！」

---

### Requirement: 瀏覽活動隱私規則

BrowseActivityContent 的反應列表 SHALL 僅顯示公開使用者及已連結者（Connection）的互動紀錄。

#### Scenario: 非公開用戶的反應不顯示
- **WHEN** 某用戶的隱私設定為非公開，且非與當前用戶已連結
- **THEN** 該用戶的反應 SHALL 不出現在 BrowseActivityContent 列表中

#### Scenario: API 使用 targetType: 'checkin'
- **WHEN** BrowseActivityContent 載入反應列表
- **THEN** 使用 `useReactionsList(targetType: 'checkin', targetId)` 取得資料
