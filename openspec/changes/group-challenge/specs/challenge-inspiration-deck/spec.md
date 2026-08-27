# challenge-inspiration-deck

## ADDED Requirements

### Requirement: 卡組管理
管理者 SHALL 可於 admin 後台建立靈感卡卡組：欄位包含卡組名稱、卡片數與內容。卡組 SHALL 可修改、刪除、複製，並可重複使用、assign 給不同共同挑戰。卡片內容 SHALL 僅有文字（無圖片）且最多 50 字。

#### Scenario: 手動建立卡組
- **WHEN** 管理者建立卡組並逐張新增卡片
- **THEN** 卡組建立成功，超過 50 字的卡片內容被拒絕

#### Scenario: Excel 匯入
- **WHEN** 管理者上傳符合欄位要求（卡片數和內容）的 Excel 檔
- **THEN** 系統批次建立卡片；格式不符時回報錯誤列

### Requirement: 卡組指派給共同挑戰
卡組 assign 給共同挑戰後，該挑戰的主題實踐卡片 UI SHALL 顯示抽卡 icon，參與者 SHALL 可由此進入抽卡。

#### Scenario: 指派後顯示
- **WHEN** 管理者將卡組 assign 給某挑戰
- **THEN** 該挑戰卡片出現抽卡 icon

### Requirement: 每日抽卡限制與排除
同一使用者同日（Asia/Taipei 日界）SHALL 最多抽 3 次；再抽 SHALL 排除本日已出現與之前已選過的卡。抽完後使用者 SHALL 可選定今天使用的卡片；系統 SHALL 記錄該次選擇，於下次抽卡時排除已選過的卡。

#### Scenario: 每日三抽
- **WHEN** 使用者當日第 4 次嘗試抽卡
- **THEN** 系統拒絕並提示明日再來；跨時區使用者不因時區差異獲得額外抽數

#### Scenario: 排除已選
- **WHEN** 使用者先前已選定某張卡，之後再次抽卡
- **THEN** 該卡不再出現在抽取結果中
