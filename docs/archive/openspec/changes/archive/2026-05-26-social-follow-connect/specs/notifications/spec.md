## ADDED Requirements

### Requirement: 關注相關通知類型
通知系統 SHALL 支援關注行為觸發的通知類型。

#### Scenario: 被關注通知
- **WHEN** 用戶 B 被用戶 A 關注
- **THEN** 用戶 B 收到通知，內容含 A 的頭像與名稱

#### Scenario: 關注者的實踐更新通知
- **WHEN** 用戶 A 關注的用戶 B 開始一個新的主題實踐
- **THEN** 用戶 A 收到「B 開始了新實踐」通知

#### Scenario: 關注者發送 Buddy 請求通知
- **WHEN** 用戶 A 關注的用戶 B 發送 Buddy 請求
- **THEN** 用戶 A 收到對應通知（Buddy 請求觸發邏輯依 Buddy FRD 定義，本 spec 僅標示此通知類型存在）

#### Scenario: 關注實踐打卡通知
- **WHEN** 用戶 A 關注的主題實踐有新打卡更新
- **THEN** 用戶 A 收到打卡更新通知

#### Scenario: 關注實踐結束通知
- **WHEN** 用戶 A 關注的主題實踐宣告結束
- **THEN** 用戶 A 收到實踐結束通知

---

### Requirement: 連結請求相關通知類型
通知系統 SHALL 支援連結請求生命週期的通知。

#### Scenario: 收到連結請求通知
- **WHEN** 用戶 B 收到用戶 A 的連結請求
- **THEN** 用戶 B 收到通知，含 A 的頭像、名稱，以及連結原因（若有）

#### Scenario: 連結請求被接受通知
- **WHEN** 用戶 B 接受用戶 A 的連結請求
- **THEN** 用戶 A 收到「連結已建立」通知

#### Scenario: 被拒絕不發通知
- **WHEN** 用戶 B 忽略用戶 A 的連結請求
- **THEN** 用戶 A **不收到**任何通知
