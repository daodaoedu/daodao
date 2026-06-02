## ADDED Requirements

### Requirement: Feed 依固定 Slot Pattern 組裝回傳

`/api/v1/feed` SHALL 依照 A→B→C→C→C 的循環順序組裝並回傳 feed items，每次分頁回傳一個完整循環單位（5～6 格）。

| Slot | 類型 | Component | 數量 |
|------|------|-----------|------|
| A | 打卡（Check-in） | CheckInShowcaseCard | 1～2 則 |
| B | 互動（Activity） | ActivityCard | 1 則 |
| C | 實踐（Practice） | PracticeShowcaseCard / BrewingCard | 3 則 |

#### Scenario: 正常 Feed 循環排列
- **WHEN** 用戶載入靈感頁面第一頁
- **THEN** 回傳的 items 順序 SHALL 符合 A→B→C→C→C 循環（每個 item 含 `slot_type: "A" | "B" | "C"` 欄位標示）

#### Scenario: 分頁載入完整循環單位
- **WHEN** 用戶觸發 load more
- **THEN** 每次回傳 MUST 為一個完整循環單位（5～6 格），不得截斷循環中間

---

### Requirement: 打卡候選池定義

Slot A 的打卡候選池 SHALL 由以下條件篩選：
- 當前使用者**尚未看過**的打卡
- 所屬主題實踐隱私狀態為**「即時公開（Learning Out Loud）」**
- 依個人化排序（身份匹配 + 社交加權）排序後的佇列

排除範圍：不公開主題實踐、封存主題實踐下的打卡；草稿狀態打卡。

#### Scenario: 不公開打卡不進候選池
- **WHEN** 打卡所屬主題實踐隱私狀態為非公開
- **THEN** 該打卡 SHALL 不出現在候選池，不進入 Slot A

#### Scenario: 已看過的打卡不重複出現
- **WHEN** 用戶已在前次 Feed 中看過某打卡
- **THEN** 該打卡 SHALL 不再出現在候選池

---

### Requirement: Slot A 打卡則數判斷邏輯

Slot A 的打卡則數由候選池狀態決定，優先序由上到下：

| 條件 | 顯示則數 |
|------|----------|
| 候選池打卡 reactions ≥ 1 或 comments ≥ 1 | 1 則（熱門打卡） |
| 候選池 ≥ 2 則打卡、均冷啟動（reactions=0, comments=0）、來自不同 userId | 2 則 |
| 候選池可用打卡 < 2 | 1 則（降級） |
| 候選池為空 | 跳過此 Slot |

#### Scenario: 熱門打卡（有 reaction 或留言）
- **WHEN** 候選池第一則打卡的 reactions ≥ 1 或 comments ≥ 1
- **THEN** Slot A SHALL 只放 1 則該打卡

#### Scenario: 冷啟動打卡（無 reaction 且無留言）
- **WHEN** 候選池前兩則打卡均為冷啟動，且 userId 不同
- **THEN** Slot A SHALL 放 2 則打卡，且兩則來自不同 userId

#### Scenario: 候選池不足
- **WHEN** 候選池可用打卡 < 2
- **THEN** Slot A SHALL 降級為 1 則；若候選池為空則跳過此 Slot

#### Scenario: 不得連續出現同一 userId 的打卡
- **WHEN** 計算 Slot A 的 2 則打卡
- **THEN** 兩則打卡的 userId SHALL 不同

---

### Requirement: Slot B ActivityCard 資料

Slot B 顯示 ActivityCard，內容為社群活動事件（類型 A）或追蹤動態彙整（類型 B）。

優先序：已連結（Connection）動態 > 關注（Follow）動態 > 社群熱門事件。

#### Scenario: 有追蹤對象且有近期活動
- **WHEN** 用戶有關注/連結對象且有近期活動
- **THEN** Slot B SHALL 顯示優先序最高的 ActivityCard

#### Scenario: 無追蹤對象或無近期活動（冷啟動）
- **WHEN** 用戶為新用戶或追蹤對象無近期活動
- **THEN** Slot B SHALL 以社群熱門事件補位（不跳過）

#### Scenario: ActivityCard 含類型標籤
- **WHEN** ActivityCard 出現在 Feed
- **THEN** 卡片 SHALL 標示「學習動態」類型標籤，以與打卡、實踐卡片視覺區分

---

### Requirement: 內容不足時的降級策略

#### Scenario: 某 Slot 內容池不足
- **WHEN** 某 Slot 的候選池為空（例如無可用打卡）
- **THEN** 系統 SHALL 跳過該 Slot，但不得連續出現同類型卡片超過 4 則

#### Scenario: 循環節奏維持
- **WHEN** 內容不足導致 Slot 被跳過
- **THEN** 剩餘 Slot 仍 SHALL 維持原有順序，不重排
