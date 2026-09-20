## ADDED Requirements

### Requirement: 火苗狀態模型
每對 Buddy 關係 SHALL 擁有一簇共有火苗（ember），其狀態由「距上次打卡天數（d）」on-read 計算，不儲存 status enum：
- d ≤ 1 → `active`（旺）
- 2 ≤ d ≤ 3 → `fading`（微弱）
- 4 ≤ d ≤ 5 → `dying`（將熄）
- d > 5 → `dormant`（餘燼）

狀態 SHALL 僅由 A 的打卡驅動；若雙方都有實踐，雙方打卡互為燃料（取最近打卡時間計算 d）。

#### Scenario: 當天打卡後狀態為旺
- **WHEN** Buddy A 今天完成打卡
- **THEN** 火苗狀態 SHALL 回傳 `active`

#### Scenario: 超過 5 天未打卡變餘燼
- **WHEN** 距上次打卡已超過 5 天
- **THEN** 火苗狀態 SHALL 回傳 `dormant`

#### Scenario: 餘燼不消失
- **WHEN** 火苗狀態為 `dormant`
- **THEN** Buddy 關係 SHALL 仍存在，fire 記錄 SHALL NOT 被刪除

---

### Requirement: 燃料規則
打卡 SHALL 是唯一能讓火苗狀態回升的行為。B 的提醒 / 傳送卡片 SHALL NOT 改變 ember 的 `last_checkin_at`，僅延緩守望相助的重複通知。

#### Scenario: 提醒不加溫
- **WHEN** B 傳送卡片給 A（A 已 4 天未打卡）
- **THEN** 火苗狀態 SHALL 仍為 `dying`，`last_checkin_at` SHALL 不變

#### Scenario: 打卡重燃餘燼
- **WHEN** 火苗狀態為 `dormant`，A 完成一次打卡
- **THEN** 火苗狀態 SHALL 更新為 `active`，`last_checkin_at` SHALL 更新為當下時間

---

### Requirement: 共同連續天數
火苗 SHALL 追蹤兩人共同建立的 `consecutive_days`，代表雙方共建的累積進度。A 每次打卡且前一天也有打卡，`consecutive_days` SHALL +1；若中斷（狀態曾為 `dormant`）重燃後，`consecutive_days` SHALL 明顯下降（重置為 1）。

#### Scenario: 連續打卡累積
- **WHEN** A 連續第 7 天打卡
- **THEN** `consecutive_days` SHALL 為 7

#### Scenario: 中斷後重燃從頭算
- **WHEN** 火苗曾進入 `dormant` 後 A 重新打卡
- **THEN** `consecutive_days` SHALL 重置為 1

---

### Requirement: 陪伴值（B 的獨立獎勵線）
系統 SHALL 為 Buddy 關係中的每一方分別累積 `companion_score`，記錄其主動關心行為（傳送卡片 +1）。`companion_score` SHALL 與火苗狀態、A 是否完成實踐完全脫鉤；火苗進入 `dormant` SHALL NOT 扣減 `companion_score`。

#### Scenario: 傳送卡片累積陪伴值
- **WHEN** B 傳送一張卡片給 A
- **THEN** B 的 `companion_score` SHALL +1

#### Scenario: 火苗熄滅不影響陪伴值
- **WHEN** 火苗進入 `dormant`
- **THEN** 雙方的 `companion_score` SHALL 維持不變

---

### Requirement: 火苗可見性
火苗狀態（ember status、consecutive_days、companion_score）SHALL 僅對這對 Buddy 的兩名成員可見。任何其他用戶的 API 請求 SHALL 收到 403 Forbidden。

#### Scenario: 非 Buddy 成員無法查看火苗
- **WHEN** 第三方用戶呼叫該對 Buddy 的 ember 相關 API
- **THEN** 系統 SHALL 回傳 403 Forbidden

#### Scenario: Buddy 成員可查看火苗
- **WHEN** Buddy 關係的成員之一呼叫 ember 狀態 API
- **THEN** 系統 SHALL 回傳完整的 ember 資料
