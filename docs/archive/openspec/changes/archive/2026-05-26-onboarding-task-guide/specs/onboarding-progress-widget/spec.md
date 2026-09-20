## ADDED Requirements

### Requirement: Widget 顯示於畫面右下角
浮動進度組件 SHALL 固定顯示於畫面右下角，不得遮擋核心操作按鈕（如：新增實踐按鈕）。組件在 Onboarding 未完成時預設為展開狀態；用戶可隨時收合，收合後保持懸浮圖示。

#### Scenario: 首次進入時自動展開
- **WHEN** 用戶進入 product app 且 Onboarding 尚未完成
- **THEN** 進度清單自動展開顯示

#### Scenario: 用戶收合後不再自動展開
- **WHEN** 用戶手動收合 Widget
- **THEN** Widget 縮為懸浮圖示，不再自動展開，直到下次登入

#### Scenario: 不遮擋新增實踐按鈕
- **WHEN** Widget 展開時
- **THEN** 新增實踐按鈕仍可完整點擊，無遮擋

---

### Requirement: 適性化任務路由
系統 SHALL 根據 `user_source`（S1 / S2 / S3）提供不同的任務順序清單。

| 順序 | 1 | 2 | 3 | 4 | 5 |
|------|---|---|---|---|---|
| S1 (直接註冊) | B 帳號設定 | A 完成測驗 | C 建立實踐 | E 靈感留言 | D 打卡 |
| S2 (測驗導向) | B 帳號設定 | C 建立實踐 | E 靈感留言 | D 打卡 | — |
| S3 (工具導向) | C 建立實踐 | B 帳號設定 | D 打卡 | A 完成測驗 | E 靈感留言 |

#### Scenario: S1 用戶看到正確任務順序
- **WHEN** `user_source` 為 S1 的用戶開啟 Widget
- **THEN** 任務依序顯示：B → A → C → E → D

#### Scenario: S2 用戶僅顯示 4 個任務
- **WHEN** `user_source` 為 S2 的用戶開啟 Widget
- **THEN** 任務依序顯示：B → C → E → D，共 4 項（無 A）

#### Scenario: S3 用戶看到 C 為第一個任務
- **WHEN** `user_source` 為 S3 的用戶開啟 Widget
- **THEN** 任務依序顯示：C → B → D → A → E

---

### Requirement: 任務自動偵測與即時更新
系統 SHALL 在用戶完成對應動作後，即時將任務標記為已完成，無需用戶手動操作。

偵測完成標準：
- **A 測驗**：測驗結果寫入使用者檔案
- **B 帳號設定**：「公開資訊」、「帳號設定」、「領域偏好」必填欄位全部儲存完成
- **C 建立實踐**：建立實踐且狀態為「未開始」
- **D 打卡**：完成實踐的第一次一鍵打卡
- **E 留言**：於「靈感」中任一實踐留言（含打卡留言、第二層回覆）

#### Scenario: 完成測驗後任務 A 自動勾選
- **WHEN** 用戶提交測驗結果
- **THEN** Widget 中任務 A 立即標記為完成

#### Scenario: 建立實踐後任務 C 自動勾選
- **WHEN** 用戶成功建立一個狀態為「未開始」的實踐
- **THEN** Widget 中任務 C 立即標記為完成

#### Scenario: 跨裝置進度同步
- **WHEN** 用戶在手機完成任務後切換至桌機版
- **THEN** 桌機版 Widget 顯示相同的已完成進度（基於 UID 同步）

---

### Requirement: S2 用戶測驗任務預先完成
若用戶透過測驗連結進入並完成測驗後才完成註冊，系統 SHALL 自動將任務 A 標記為完成。

#### Scenario: 從測驗導向路徑完成註冊
- **WHEN** user_source 為 S2 且用戶在進入平台前已完成測驗
- **THEN** Onboarding 狀態中任務 A 預設為已完成
