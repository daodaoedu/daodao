## ADDED Requirements

### Requirement: 期邀請信事件

系統 SHALL 在學員被邀請加入期時，發送一封邀請 email。該 email MUST 走既有 email template 系統，內容 MUST 以變數化方式帶入（期名稱、邀請連結等），MUST NOT 硬編碼。email MUST 包含可用的邀請連結。此事件 MUST 歸類為 P1（高價值）。

#### Scenario: 邀請學員時發送邀請信

- **WHEN** 教練邀請一位學員加入某期
- **THEN** 系統 SHALL 透過既有 email template 系統發送一封 P1 邀請 email，內含變數化的期資訊與可用的邀請連結

#### Scenario: 邀請信內容變數化

- **WHEN** 系統組裝邀請 email
- **THEN** 系統 SHALL 以變數方式帶入期名稱、邀請連結等內容，MUST NOT 硬編碼於模板中

### Requirement: 期加入確認事件

系統 SHALL 在學員透過邀請連結或 QR 成功加入期時，通知該期的教練。此事件 MUST 歸類為 P1（高價值）。

#### Scenario: 學員成功加入時通知教練

- **WHEN** 一位學員透過邀請連結或 QR 成功加入某期
- **THEN** 系統 SHALL 建立一筆 P1 類型的通知事件，recipient 為該期的教練，actor 為加入的學員

### Requirement: 期成員移除通知事件

系統 SHALL 在教練將學員移出期時，通知被移除的學員。通知措辭 MUST 為中性，MUST NOT 帶有負面或指責性用語。此事件 MUST 歸類為 P1（高價值）。

#### Scenario: 移除學員時發送中性通知

- **WHEN** 教練將一位學員移出某期
- **THEN** 系統 SHALL 建立一筆 P1 類型的通知事件，recipient 為被移除的學員，內容措辭 MUST 為中性且 MUST NOT 帶負面措辭

### Requirement: 教練週報 digest 事件

系統 SHALL 每週自動寄送一封教練摘要信（digest）給教練。摘要 MUST 包含本週打卡數、待回應項目、需關心名單，且名單 MUST 附直達連結。此排程 MUST 由 BullMQ 執行。此事件 MUST 歸類為 P2（鼓勵性）。

#### Scenario: 每週自動寄送教練摘要信

- **WHEN** BullMQ 週期排程觸發教練週報
- **THEN** 系統 SHALL 為教練建立一筆 P2 類型的通知事件並寄送摘要 email，內含打卡數、待回應、需關心名單及各自的直達連結

#### Scenario: 摘要名單附直達連結

- **WHEN** 系統組裝教練週報 digest 的需關心名單
- **THEN** 系統 SHALL 為名單中每一項附上可直接前往對應學員或實踐的直達連結
