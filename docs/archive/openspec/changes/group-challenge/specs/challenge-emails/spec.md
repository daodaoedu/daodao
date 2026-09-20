# challenge-emails

## ADDED Requirements

### Requirement: 六節點信件序列
共同挑戰 SHALL 具備六個信件節點，各有明確觸發條件（時區以 Asia/Taipei 計）：
- **Welcome**：使用者加入後立即寄送
- **T-48h**：開始日前 48 小時寄送
- **Day 1**：開始日當天 06:00 寄送
- **First Check-in**：使用者首次於此挑戰打卡的隔日 08:00 寄送
- **Weekly Summary**：併入現有週報，以每週摘要為首張卡片，其後為個人近期打卡回顧；此為週摘要唯一出現位置
- **End**：結束日隔日 06:00 寄送，附實踐總結頁連結

文案 SHALL 依 FRD 連結的 Email 文案文件建立模板。

#### Scenario: 加入即寄 Welcome
- **WHEN** 使用者完成加入
- **THEN** 系統立即寄出 Welcome 信，內含挑戰名稱、開始日與天數

#### Scenario: 排程節點觸發
- **WHEN** 到達 T-48h／Day 1／End 的觸發時點
- **THEN** 對應信件寄給該挑戰所有參與者（End 信寄給結束時仍為參與狀態者）

#### Scenario: 首次打卡信
- **WHEN** 使用者在挑戰內完成第一次打卡
- **THEN** 隔日 08:00 寄出 First Check-in 信；之後的打卡不再觸發

### Requirement: 不重寄不漏發
每個節點對同一使用者同一挑戰 SHALL 恰好寄送一次：系統 SHALL 以寄送紀錄查重防止重寄，排程失敗 SHALL 可重試而不產生重複信件。

#### Scenario: 重複觸發
- **WHEN** 同一節點因重試或重複事件被觸發第二次
- **THEN** 系統偵測已寄送紀錄，不再寄出
