# User Detail Timeline 規格

## ADDED Requirements

### Requirement: 使用者個人資料顯示

Page SHALL 顯示使用者的個人資料，包含姓名、Email、頭像、註冊日期、最後登入時間、帳號狀態。此區塊位於頁面頂部，作為使用者身份的快速摘要。

#### Scenario: 進入使用者詳情頁

- **WHEN** 管理員從使用者列表點擊某位使用者，導航至 `/users/:userId`
- **THEN** 頁面頂部 SHALL 顯示該使用者的姓名、Email、頭像、註冊日期、最後登入時間及帳號狀態（啟用/停用）

#### Scenario: 使用者無頭像

- **WHEN** 使用者尚未設定頭像
- **THEN** 頁面 SHALL 顯示預設頭像佔位圖

---

### Requirement: 活動時間軸顯示

Page SHALL 顯示活動時間軸，以時間順序列出使用者的所有事件，包含登入、打卡、發文、留言、AI 查詢、角色變更等類型。

#### Scenario: 載入使用者活動時間軸

- **WHEN** 使用者詳情頁載入完成
- **THEN** 頁面 SHALL 顯示該使用者的活動時間軸，事件依時間倒序排列，每筆事件 SHALL 顯示事件類型、時間戳記及相關摘要

#### Scenario: 無任何活動紀錄

- **WHEN** 使用者尚無任何活動紀錄
- **THEN** 時間軸區塊 SHALL 顯示空狀態提示訊息

---

### Requirement: 活動時間軸事件類型篩選

活動時間軸 SHALL 支援依事件類型篩選，管理員可選擇僅顯示特定類型的事件。

#### Scenario: 篩選特定事件類型

- **WHEN** 管理員在時間軸篩選器中選擇「AI 查詢」事件類型
- **THEN** 時間軸 SHALL 僅顯示 AI 查詢相關的事件，其餘類型事件 SHALL 被隱藏

#### Scenario: 清除篩選條件

- **WHEN** 管理員清除事件類型篩選
- **THEN** 時間軸 SHALL 恢復顯示所有類型的事件

---

### Requirement: 活動時間軸日期範圍篩選

活動時間軸 SHALL 支援日期範圍篩選，管理員可指定起始與結束日期來縮小時間軸範圍。

#### Scenario: 設定日期範圍篩選

- **WHEN** 管理員選擇起始日期為 2025-01-01、結束日期為 2025-01-31
- **THEN** 時間軸 SHALL 僅顯示該日期範圍內的事件

#### Scenario: 日期範圍與事件類型組合篩選

- **WHEN** 管理員同時設定日期範圍與事件類型篩選
- **THEN** 時間軸 SHALL 僅顯示符合兩項條件的事件

---

### Requirement: AI 查詢事件詳細資訊

每筆 AI 查詢事件 SHALL 顯示所使用的模型名稱、消耗的 token 數量及對應費用。

#### Scenario: 檢視 AI 查詢事件

- **WHEN** 時間軸中出現一筆 AI 查詢事件
- **THEN** 該事件 SHALL 顯示使用的模型名稱（如 GPT-4、Claude）、消耗的 token 數及估算費用

#### Scenario: AI 查詢事件展開詳情

- **WHEN** 管理員點擊某筆 AI 查詢事件
- **THEN** SHALL 展開顯示查詢的完整資訊，包含模型、token 數、費用

---

### Requirement: AI 使用統計彙總

Page SHALL 顯示彙總的 AI 使用統計資料，包含總查詢次數、總 token 消耗量、總費用及最常使用的模型。

#### Scenario: 檢視 AI 使用統計

- **WHEN** 使用者詳情頁載入完成
- **THEN** 頁面 SHALL 顯示 AI 使用統計區塊，包含：總查詢次數、總 token 數、總費用、最常使用的模型

#### Scenario: 使用者未曾使用 AI

- **WHEN** 使用者無任何 AI 查詢紀錄
- **THEN** AI 使用統計區塊 SHALL 顯示所有數值為 0，最常使用的模型顯示為「無」

---

### Requirement: 登入歷史紀錄

Page SHALL 顯示使用者的登入歷史，包含時間戳記、IP 位址、裝置/瀏覽器資訊。

#### Scenario: 檢視登入歷史

- **WHEN** 管理員查看使用者詳情頁的登入歷史區塊
- **THEN** 頁面 SHALL 顯示登入紀錄列表，每筆紀錄包含登入時間、IP 位址、裝置與瀏覽器資訊，依時間倒序排列

#### Scenario: 偵測異常登入

- **WHEN** 登入歷史中出現來自不同地理位置的連續登入
- **THEN** 該筆紀錄 SHALL 以視覺標記提示可能的異常登入

---

### Requirement: 使用者角色指派

Page SHALL 允許管理員指派或變更使用者的角色。

#### Scenario: 變更使用者角色

- **WHEN** 管理員在使用者詳情頁選擇新的角色並確認
- **THEN** 系統 SHALL 更新該使用者的角色，並在活動時間軸中新增一筆角色變更事件

#### Scenario: 角色變更確認

- **WHEN** 管理員嘗試變更使用者角色
- **THEN** 系統 SHALL 顯示確認對話框，說明角色變更的影響

---

### Requirement: 使用者帳號啟用/停用

Page SHALL 允許管理員啟用或停用使用者帳號。

#### Scenario: 停用使用者帳號

- **WHEN** 管理員點擊「停用帳號」按鈕並確認
- **THEN** 系統 SHALL 將該使用者帳號狀態設為停用，頁面上的狀態標籤 SHALL 更新為「已停用」

#### Scenario: 啟用已停用的帳號

- **WHEN** 管理員點擊「啟用帳號」按鈕並確認
- **THEN** 系統 SHALL 將該使用者帳號狀態設為啟用，頁面上的狀態標籤 SHALL 更新為「已啟用」

---

### Requirement: 個人資料匯出（GDPR）

Page SHALL 提供「匯出個人資料」按鈕，下載一份包含所有使用者資料的 JSON 檔案，涵蓋個人資料、活動紀錄、AI 查詢、打卡紀錄及角色歷史。

#### Scenario: 匯出使用者個人資料

- **WHEN** 管理員點擊「匯出個人資料」按鈕
- **THEN** 系統 SHALL 產生並下載一份 JSON 檔案，包含該使用者的完整資料：個人資料、活動紀錄、AI 查詢紀錄、打卡紀錄、角色歷史

#### Scenario: 匯出大量資料

- **WHEN** 使用者擁有大量活動紀錄導致匯出需要較長時間
- **THEN** 系統 SHALL 顯示匯出進度指示器，匯出完成後自動觸發下載

---

### Requirement: 資料載入骨架畫面

Page SHALL 在資料載入期間顯示骨架畫面（loading skeleton），避免頁面空白造成使用者困惑。

#### Scenario: 頁面初次載入

- **WHEN** 使用者詳情頁正在載入資料
- **THEN** 頁面 SHALL 顯示與各區塊佈局一致的骨架畫面，包含個人資料區、時間軸區、統計區

#### Scenario: 資料載入完成

- **WHEN** 所有 API 回應完成
- **THEN** 骨架畫面 SHALL 平滑過渡為實際內容
