## ADDED Requirements

### Requirement: 關注用戶（Follow User）
用戶 SHALL 能單向關注其他用戶。關注後，當被關注用戶發起新的 Connect 邀請尋找夥伴時，關注者 SHALL 收到通知。

#### Scenario: 關注用戶
- **WHEN** 用戶 A 點擊用戶 B 頁面上的「關注」按鈕
- **THEN** 系統 SHALL 建立 A → B 的 follow 記錄，且不需要 B 同意

#### Scenario: 取消關注
- **WHEN** 用戶 A 已關注用戶 B，再次點擊關注按鈕（切換）
- **THEN** 系統 SHALL 刪除對應 follow 記錄

#### Scenario: 重複關注防護
- **WHEN** 用戶 A 嘗試再次關注已關注的用戶 B
- **THEN** 系統 SHALL 回傳 409 或冪等地忽略，不建立重複記錄

---

### Requirement: 關注實踐（Follow Practice）
用戶 SHALL 能關注狀態為公開（可被他人瀏覽）的主題實踐，有新打卡或實踐內容更新時收到通知。私人實踐（用戶設定為非公開）不得被關注。

#### Scenario: 關注公開實踐
- **WHEN** 用戶點擊公開實踐頁的「關注此實踐」按鈕
- **THEN** 系統 SHALL 建立 followee_type: 'practice' 的 follow 記錄

#### Scenario: 阻止關注非公開用戶的實踐
- **WHEN** 用戶嘗試透過 API 直接關注一個非公開用戶的實踐（該用戶已將所有實踐設為非公開）
- **THEN** 系統 SHALL 回傳 403 並拒絕建立 follow 記錄

#### Scenario: 實踐有新打卡時通知
- **WHEN** 實踐擁有者新增打卡記錄
- **THEN** 系統 SHALL 對所有關注此實踐的用戶發送通知

#### Scenario: 實踐內容更新時通知
- **WHEN** 實踐擁有者更新實踐內容（如描述、目標等）
- **THEN** 系統 SHALL 對所有關注此實踐的用戶發送通知

---

### Requirement: Connect 請求發送
Connect 為雙向夥伴連結，必須由一方發送請求，另一方同意後才成立。

從**用戶個人頁**發送 Connect 請求時，SHALL 要求填寫連結原因（reason 必填）。
從**主題實踐頁**發送 Connect 請求時，reason 可為選填（直接送出）。

#### Scenario: 從用戶頁發送 Connect 請求（附理由）
- **WHEN** 用戶 A 在用戶 B 的個人頁點擊「連結」並填寫原因送出
- **THEN** 系統 SHALL 建立 status: 'pending' 的 connect 記錄，並通知用戶 B

#### Scenario: 從用戶頁發送未填理由
- **WHEN** 用戶 A 在用戶個人頁嘗試發送 Connect 但未填寫 reason
- **THEN** 系統 SHALL 回傳 400 錯誤，要求填寫原因

#### Scenario: 從實踐頁發送 Connect 請求
- **WHEN** 用戶 A 在某實踐頁點擊「尋找夥伴 / 連結」
- **THEN** 系統 SHALL 建立 pending connect 記錄，reason 可為空

#### Scenario: 防止重複發送
- **WHEN** 已有 pending 或 accepted 的 connect 記錄存在於 A-B 之間（無論方向：A→B 或 B→A）
- **THEN** 系統 SHALL 拒絕再次發送，回傳 409
- **NOTE** 服務層須查詢雙向 `(requester=A, receiver=B)` 和 `(requester=B, receiver=A)` 以防止重複，因 DB unique constraint 僅防單向

---

### Requirement: Connect 請求回應
收到 Connect 請求的用戶 SHALL 能同意或拒絕。

#### Scenario: 同意 Connect
- **WHEN** 用戶 B 同意 A 的 Connect 請求
- **THEN** connect 記錄 status SHALL 更新為 'accepted'，雙方可互看非公開內容

#### Scenario: 拒絕 Connect
- **WHEN** 用戶 B 拒絕 A 的 Connect 請求
- **THEN** connect 記錄 status SHALL 更新為 'rejected'，不觸發額外通知

#### Scenario: 被拒絕後可重新發送請求
- **WHEN** 用戶 A 的 Connect 請求曾被用戶 B 拒絕（status: 'rejected'）
- **THEN** 用戶 A 再次發送請求時，系統 SHALL 允許，並將 status 重設為 'pending'，通知用戶 B

---

### Requirement: 取消 Connect
已連結的雙方任一方 SHALL 能隨時取消連結，取消後回到無連結狀態。

#### Scenario: 取消連結
- **WHEN** 連結中的用戶 A 選擇取消與用戶 B 的連結
- **THEN** 系統 SHALL 將 connect 記錄 status 標記為 'cancelled'（保留記錄，不刪除），雙方不再具備互看非公開內容的權限

#### Scenario: 取消後重新發送連結請求
- **WHEN** 用戶 A 與用戶 B 的連結已被取消（status: 'cancelled'）
- **THEN** 任一方再次發送 Connect 請求時，系統 SHALL 允許，並將 status 重設為 'pending'，通知對方

---

### Requirement: Connected 雙方更新通知
當兩用戶已成功 Connect（status: 'accepted'），任一方有新的實踐更新（新打卡、實踐內容變更）時，系統 SHALL 通知對方。

#### Scenario: Connected 用戶有新打卡
- **WHEN** 用戶 A 與用戶 B 已 Connect，且 A 新增打卡記錄
- **THEN** 系統 SHALL 發送通知給用戶 B

#### Scenario: Connected 用戶更新實踐內容
- **WHEN** 用戶 A 與用戶 B 已 Connect，且 A 更新實踐內容
- **THEN** 系統 SHALL 發送通知給用戶 B

---

### Requirement: 非公開內容互看權限（Privacy Bridge）— Phase 2
> **注意**：PRD 將隱私權限橋接列為 Phase 2 功能。Phase 1 僅在 Connect 流程中預留 API 層的權限檢查介面，不實作完整的隱私設定 UI。

隱私設定為**用戶層級（user-level）**：用戶可統一設定底下所有實踐為公開或非公開，不支援針對單一實踐個別設定。

當兩用戶成功 Connect（status: 'accepted'）後，且目標用戶已將所有實踐設為「僅限連結」可見，雙方 SHALL 能互相查看對方的非公開實踐內容。

#### Scenario: Connected 用戶查看非公開內容
- **WHEN** 用戶 A 與用戶 B 已 Connect，且 B 將實踐可見性設為「僅限連結」（user-level 設定）
- **THEN** A 查看 B 的所有實踐 SHALL 皆能看到

#### Scenario: 未 Connect 用戶被阻擋
- **WHEN** 用戶 C 未與用戶 B Connect，嘗試存取 B 的非公開實踐
- **THEN** 系統 SHALL 回傳 403，或顯示內容已設為私人

#### Scenario: 隱私設定為用戶層級
- **WHEN** 用戶設定實踐可見性為「僅限連結」
- **THEN** 該設定 SHALL 套用於用戶底下所有實踐，不可針對單一實踐個別設定

---

### Requirement: 關注與連結管理頁
用戶 SHALL 能在個人設定或個人資料頁查看並管理自己的關注清單與連結清單。

#### Scenario: 查看關注清單
- **WHEN** 用戶進入關注管理頁
- **THEN** 系統 SHALL 分別列出「我關注的人」、「我關注的實踐」、「關注我的人」三個清單

#### Scenario: 查看連結清單（公開）
- **WHEN** 任何人查看某用戶的個人公開頁
- **THEN** 系統 SHALL 顯示該用戶已連結的夥伴清單（accepted 狀態）
