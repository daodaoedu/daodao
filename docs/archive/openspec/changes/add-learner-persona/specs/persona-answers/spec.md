## ADDED Requirements

### Requirement: 提交答案
系統 SHALL 允許已登入使用者對任一問題提交答案。選擇題 SHALL 儲存 `selected_value`，文字題 SHALL 儲存 `text_answer`。同一使用者對同一問題 SHALL 只能有一筆答案（不允許重複提交，需更新）。

#### Scenario: 成功提交選擇題答案
- **WHEN** 使用者呼叫 `POST /persona/answers` 並傳入 `{ questionId, selectedValue }`
- **THEN** 系統 SHALL 儲存答案並回傳 `{ id, questionId, selectedValue, createdAt }`

#### Scenario: 成功提交文字題答案
- **WHEN** 使用者呼叫 `POST /persona/answers` 並傳入 `{ questionId, textAnswer }`（非空字串）
- **THEN** 系統 SHALL 儲存答案並回傳 `{ id, questionId, textAnswer, createdAt }`

#### Scenario: 重複提交同一問題
- **WHEN** 使用者對已答問題再次呼叫 `POST /persona/answers`
- **THEN** 系統 SHALL 更新現有答案，而非新增，並回傳更新後的答案資料

#### Scenario: 空文字答案被拒
- **WHEN** 使用者提交文字題但 `textAnswer` 為空字串或僅含空白
- **THEN** 系統 SHALL 回傳 `400 Bad Request`

### Requirement: 閘門邏輯（Passport Gate）
系統 SHALL 以使用者的答題總數作為閘門判定基準。答題數 < 5 題為「鎖定狀態」，≥ 5 題為「解鎖狀態」。

#### Scenario: 鎖定狀態判定
- **WHEN** 使用者答題總數 < 5
- **THEN** `GET /persona/carousel-state` 與 `GET /persona/profile/:userId` SHALL 於回應中標示 `isLocked: true`

#### Scenario: 解鎖狀態判定
- **WHEN** 使用者答題總數 >= 5
- **THEN** 上述 API SHALL 回傳 `isLocked: false`，且無任何遮蔽限制

### Requirement: 對等揭露（鎖定狀態下的遮蔽）
當請求者處於鎖定狀態（自身答題數 < 5），系統 SHALL 在靈感牆輪播中最多顯示 2 則他人回應，其餘遮蔽並提示需回答問題以解鎖。

#### Scenario: 鎖定狀態下他人回應遮蔽
- **WHEN** 請求者 `isLocked: true` 且輪播中某問題有 > 2 筆他人答案
- **THEN** API SHALL 只回傳最多 2 筆答案，其餘以 `{ masked: true, count: N }` 表示

#### Scenario: 解鎖狀態下無遮蔽
- **WHEN** 請求者 `isLocked: false`
- **THEN** API SHALL 回傳該問題所有他人答案，不做遮蔽

### Requirement: 共鳴（Resonance）
系統 SHALL 允許使用者對他人答案表達共鳴。同一使用者對同一答案 SHALL 只能共鳴一次。

#### Scenario: 新增共鳴
- **WHEN** 使用者呼叫 `POST /persona/resonances` 並傳入 `{ answerId }`
- **THEN** 系統 SHALL 記錄共鳴並回傳更新後的共鳴計數

#### Scenario: 重複共鳴被拒
- **WHEN** 使用者對同一答案再次呼叫 `POST /persona/resonances`
- **THEN** 系統 SHALL 回傳 `409 Conflict`

#### Scenario: 取消共鳴
- **WHEN** 使用者呼叫 `DELETE /persona/resonances/:answerId`
- **THEN** 系統 SHALL 刪除共鳴記錄並回傳更新後的共鳴計數
