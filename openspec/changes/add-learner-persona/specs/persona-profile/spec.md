## ADDED Requirements

### Requirement: 自己的人物誌分頁
系統 SHALL 在個人 Profile 中提供「我的學習人物誌」分頁。使用者 SHALL 可看到所有問題，已答題目清晰亮起，未答題目顯示為虛線空位，點擊可就地回答。

#### Scenario: 自己查看所有問題
- **WHEN** 已登入使用者呼叫 `GET /persona/profile/me`
- **THEN** 系統 SHALL 回傳所有問題，每題含 `answered: boolean`、`answer`（若已答）、`isPlaceholder: boolean`（未答者為 true）

#### Scenario: 點擊虛線空位就地回答
- **WHEN** 使用者點擊未答問題的虛線空位
- **THEN** 前端 SHALL 展開就地回答介面，提交後 SHALL 呼叫 `POST /persona/answers` 並即時更新該卡片狀態

### Requirement: 訪客查看他人人物誌
訪客查看他人 Profile 時，系統 SHALL 僅顯示該使用者已回答的問題。顯示形式為單一卡片，可透過「換一題」瀏覽其他已答題目。

#### Scenario: 訪客查看他人已答問題
- **WHEN** 使用者呼叫 `GET /persona/profile/:userId`（非自己的 userId）
- **THEN** 系統 SHALL 僅回傳目標使用者已回答的問題與答案，不顯示未答問題

#### Scenario: 訪客換一題瀏覽
- **WHEN** 訪客點擊「換一題」
- **THEN** 前端 SHALL 呼叫 `GET /persona/profile/:userId?exclude=<questionId>` 取得另一道已答問題

#### Scenario: 他人尚無任何回答
- **WHEN** 目標使用者尚未回答任何問題
- **THEN** 系統 SHALL 回傳空陣列，前端 SHALL 顯示「此使用者尚未填寫人物誌」提示

### Requirement: 鎖定狀態下的訪客限制
當請求者處於鎖定狀態（自身答題數 < 5），系統 SHALL 在 `GET /persona/profile/:userId` 回應中標示 `viewerIsLocked: true`，前端 SHALL 顯示提示，告知還差幾題才可完整查看他人人物誌。

#### Scenario: 鎖定狀態下查看他人 Profile
- **WHEN** 請求者 `isLocked: true` 且呼叫 `GET /persona/profile/:userId`
- **THEN** 回應 SHALL 包含 `viewerIsLocked: true` 與 `answersNeeded`（5 - 請求者已答題數）

#### Scenario: 鎖定提示內容
- **WHEN** 前端收到 `viewerIsLocked: true`
- **THEN** 前端 SHALL 顯示「再回答 N 題就能查看完整人物誌」提示，N 為 `answersNeeded`

### Requirement: 人物誌無私密回答選項
系統 SHALL NOT 提供私密回答切換功能。所有已提交答案均為公開狀態。使用者若不希望公開某題，直接不回答即可。

#### Scenario: 提交答案即為公開
- **WHEN** 使用者提交任何問題的答案
- **THEN** 該答案 SHALL 對所有解鎖狀態的訪客可見，不存在私密選項

### Requirement: 共鳴計數顯示
Profile 中每道已答問題的卡片 SHALL 顯示共鳴計數「N 位使用者對此有共鳴」。

#### Scenario: 顯示共鳴數
- **WHEN** 訪客或本人查看已答問題卡片
- **THEN** 卡片 SHALL 顯示該答案的 `resonanceCount`

#### Scenario: 訪客可對答案表達共鳴
- **WHEN** 解鎖狀態的訪客點擊共鳴按鈕
- **THEN** 前端 SHALL 呼叫 `POST /persona/resonances` 並即時更新計數
