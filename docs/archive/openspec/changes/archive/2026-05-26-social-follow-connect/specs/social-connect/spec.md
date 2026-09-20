## ADDED Requirements

### Requirement: 發送連結請求（標準門檻）
當雙方在主題實踐中的留言互動**低於 3 次**時，用戶 SHALL 必須填寫連結原因才能發送請求。

#### Scenario: 互動不足強制填寫原因
- **WHEN** 用戶 A 欲連結用戶 B，且雙方互動次數 < 3
- **THEN** 系統跳出 Modal，強制 A 填寫連結原因（限 50 字以內）

#### Scenario: 未填寫原因阻擋送出
- **WHEN** 用戶在標準門檻 Modal 中未輸入任何文字即點擊送出
- **THEN** 系統攔截請求，顯示錯誤提示，不送出連結請求

#### Scenario: 填寫原因後成功送出
- **WHEN** 用戶填寫連結原因（1–50 字）並點擊確認
- **THEN** 系統建立 Pending 狀態的連結請求，並通知受邀者

---

### Requirement: 信任豁免機制（Familiarity Bypass）
當雙方在彼此實踐內容中的累計互動**達 3 次（含）以上**時，系統 SHALL 允許直接發送連結請求，無需填寫原因。

#### Scenario: 達到互動門檻可跳過 Modal
- **WHEN** 用戶 A 欲連結用戶 B，且雙方互動次數 ≥ 3
- **THEN** 系統直接建立 Pending 請求，不跳出 Modal

#### Scenario: 跨實踐累計互動計算
- **WHEN** 用戶 A 在 B 的實踐#1 留言（1次）、B 回覆（2次）、A 在 B 的實踐#2 留言（3次）
- **THEN** 系統判定 A→B 互動達 3 次，A 連結 B 時觸發信任豁免

#### Scenario: 對話環正確計數
- **WHEN** A 留言（1次）、B 回覆（2次）、A 再回覆（3次）
- **THEN** 系統正確累計為 3 次互動，觸發信任豁免

---

### Requirement: 互動計數範圍
系統 SHALL 將以下行為計入雙方互動次數，採**雙向對稱累計制**，不限於單一實踐。計數以 `(min(a,b), max(a,b))` pair 儲存，A 在 B 的實踐互動與 B 在 A 的實踐互動均累計至同一個 pair 的計數中。

#### Scenario: 留言計入互動
- **WHEN** 用戶 A 在用戶 B 的實踐下發表留言
- **THEN** A→B 互動計數 +1

#### Scenario: 回覆留言計入互動
- **WHEN** 用戶 A 回覆用戶 B 在某實踐下的留言
- **THEN** A→B 互動計數 +1

#### Scenario: @ 標記計入互動
- **WHEN** 用戶 A 在留言中 @ 標記用戶 B
- **THEN** A 與 B 的 pair 互動計數 +1

---

### Requirement: 自我連結防護
系統 SHALL 拒絕用戶對自己發送連結請求。

#### Scenario: 自我連結被攔截
- **WHEN** 用戶 A 嘗試向自己發送連結請求
- **THEN** 系統回傳錯誤，拒絕操作

---

### Requirement: 並發連結請求處理
當 A 嘗試連結 B 時，若 B 已有一筆發給 A 的 pending 請求，系統 SHALL 自動接受 B 的請求，而非新建第二筆。

#### Scenario: 雙向並發請求自動合併
- **WHEN** B 已有一筆發給 A 的 pending 連結請求，且 A 此時也發送連結請求給 B
- **THEN** 系統自動接受 B→A 的 pending 請求，雙方建立連結，不新建第二筆 pending 請求

---

### Requirement: 情境化連結請求
從主題實踐頁發送連結請求時，系統 SHALL 預帶當前實踐名稱至請求文字。

#### Scenario: 實踐頁預帶實踐名稱
- **WHEN** 用戶從特定主題實踐頁發送連結請求
- **THEN** Modal 預填帶入當前實踐名稱，用戶可自行編輯

---

### Requirement: 連結請求狀態管理
系統 SHALL 維護連結請求的三種狀態：Pending、Accepted、Rejected/Ignored。

#### Scenario: 發起方看到等待中狀態
- **WHEN** 用戶 A 成功送出連結請求後查看按鈕
- **THEN** 按鈕顯示「等待回應」

#### Scenario: 受邀方接受請求
- **WHEN** 用戶 B 接受用戶 A 的連結請求
- **THEN** 雙方建立正式夥伴關係，雙方均可存取對方的非公開內容

#### Scenario: 受邀方忽略請求
- **WHEN** 用戶 B 忽略用戶 A 的連結請求
- **THEN** 請求狀態更新為 Rejected，用戶 A **不收到**拒絕通知

#### Scenario: 發起方撤回請求
- **WHEN** 用戶 A 撤回已發出的連結請求
- **THEN** 發起方的待處理清單與受邀方的收到請求清單同步移除該請求

---

### Requirement: 解除連結
任何一方 SHALL 能隨時解除連結，解除後雙方立即失去對彼此非公開內容的存取權。

#### Scenario: 解除連結後隱私同步失效
- **WHEN** 用戶 A 解除與用戶 B 的連結
- **THEN** B 從 A 的夥伴清單消失，且 A 無法存取 B 的「僅限夥伴」內容（反之亦然）

#### Scenario: 非連結者無法存取夥伴內容
- **WHEN** 非連結的用戶嘗試透過 URL 直接存取設為「僅限夥伴」的內容頁面
- **THEN** 系統拒絕存取，顯示權限不足提示
