## ADDED Requirements

### Requirement: 四種反應類型
系統 SHALL 支援以下四種反應類型，儲存值為英文代碼：

| 顯示標籤 | 代碼 (reaction_type) |
|---|---|
| 加油 | useful |
| 啟發 | fire |
| 共鳴 | touched |
| 好奇 | curious |

#### Scenario: 取得反應類型清單
- **WHEN** 前端需要渲染 Reaction Bar
- **THEN** 系統 SHALL 提供上述四種類型的完整清單（含代碼與顯示標籤）

---

### Requirement: 每用戶每目標限單一反應（Toggle）
每位用戶對同一目標內容 SHALL 只能持有一個有效反應。點擊相同反應時切換（取消），點擊不同反應時替換。

目標類型 (target_type) 僅包含：`practice`（主題實踐）。

#### Scenario: 觸發反應（桌面端點擊 / 行動端長按展開選單）
- **WHEN** 用戶點擊反應按鈕（桌面端），或長按展開反應選單後選擇（行動端）
- **THEN** 系統 SHALL 新增一筆 reaction 記錄，並回傳更新後計數

#### Scenario: 切換至不同反應
- **WHEN** 用戶已對目標存有反應 A，並點擊不同的反應 B
- **THEN** 系統 SHALL 將舊反應 A 更新為 B，計數即時更新

#### Scenario: 取消已選反應
- **WHEN** 用戶點擊與自身現有反應相同的按鈕
- **THEN** 系統 SHALL 刪除該 reaction 記錄（計數歸零此用戶的貢獻）

---

### Requirement: 反應計數聚合顯示
系統 SHALL 對每種反應類型聚合計數，並在 API 回應中提供：
- 各類型的總計數
- 當前用戶已選的反應類型（若有）

#### Scenario: 單一用戶反應
- **WHEN** 只有一位用戶 (User A) 對目標按了「火焰（啟發）」
- **THEN** 顯示格式 SHALL 為「User A 覺得很有啟發」

#### Scenario: 多用戶同類反應聚合
- **WHEN** 6 位用戶對同一目標按了「火焰（啟發）」，當前用戶為其中之一
- **THEN** 顯示格式 SHALL 為「[User A] 與其他 5 人覺得很有啟發」（顯示最早或最後一位用戶名稱）

#### Scenario: 無反應
- **WHEN** 目標上沒有任何反應
- **THEN** 計數顯示 SHALL 為 0，不顯示用戶名稱

---

### Requirement: 反應與留言框聯動
點擊反應按鈕後，系統 SHALL 自動將焦點移至對應的留言輸入框，並帶入對應的引導 placeholder。

| reaction_type | 留言框 Placeholder |
|---|---|
| useful | 你做得很好，繼續加油！我覺得... |
| fire | 這點對我很有啟發，特別是... |
| touched | 你說的這點我很有共鳴，因為... |
| curious | 這部分好有趣，我很好奇關於...？ |

#### Scenario: 點擊反應後聚焦留言框
- **WHEN** 用戶點擊任一反應按鈕
- **THEN** 留言輸入框 SHALL 自動獲得焦點，並顯示對應的 placeholder 文字

#### Scenario: 切換反應更新 Placeholder
- **WHEN** 用戶先點擊「加油」後再點擊「好奇」
- **THEN** placeholder SHALL 即時更新為「這部分好有趣，我很好奇關於...？」，不殘留舊文字

---

### Requirement: Reaction Bar 顯示位置
反應按鈕與留言入口按鈕 SHALL 顯示於主題實踐卡片（practice card）的最外層，可直接點選觸發。

#### Scenario: 卡片上顯示 Reaction Bar
- **WHEN** 用戶瀏覽主題實踐列表
- **THEN** 每張實踐卡片底部 SHALL 顯示四個反應按鈕及留言數計數
