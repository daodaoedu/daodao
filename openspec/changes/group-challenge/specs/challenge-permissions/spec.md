## ADDED Requirements

### Requirement: 頁面載入時識別使用者挑戰身分
系統 SHALL 在挑戰相關頁面載入時，透過查詢 `challenge_participants` 資料表判斷當前使用者的身分：`participant`（已報名成員）、`observer`（已登入但未報名）或 `anonymous`（未登入）。

#### Scenario: 參與者身分識別
- **WHEN** 已登入且已報名的使用者載入挑戰頁面
- **THEN** 後端 middleware 將 `req.challengeRole` 設為 `participant`

#### Scenario: 觀察者身分識別
- **WHEN** 已登入但未報名的使用者載入挑戰頁面
- **THEN** 後端 middleware 將 `req.challengeRole` 設為 `observer`

#### Scenario: 匿名使用者身分識別
- **WHEN** 未登入使用者訪問挑戰頁面
- **THEN** 後端 middleware 將 `req.challengeRole` 設為 `anonymous`

### Requirement: 參與者擁有評論與回覆權限
挑戰 Feed 中，身分為 `participant` 的使用者 SHALL 可看到並使用評論輸入框與回覆功能。

#### Scenario: 參與者可輸入評論
- **WHEN** `participant` 使用者瀏覽挑戰 Feed 中的打卡
- **THEN** 顯示評論輸入框，可成功送出評論

#### Scenario: 參與者可回覆他人評論
- **WHEN** `participant` 使用者點擊回覆按鈕
- **THEN** 回覆輸入框正常顯示，可成功送出回覆

### Requirement: 外部觀察者僅可使用快速回應（送花）
身分為 `observer` 或 `anonymous` 的使用者 SHALL 無法輸入評論，僅可使用快速回應（送花）按鈕。

#### Scenario: 觀察者看不到評論輸入框
- **WHEN** `observer` 或 `anonymous` 使用者瀏覽挑戰打卡
- **THEN** 評論輸入框不顯示，改顯示「僅限參與者交流，歡迎加入下一次挑戰」文字

#### Scenario: 觀察者可送花（快速回應）
- **WHEN** `observer` 使用者點擊快速回應按鈕
- **THEN** 回應成功記錄，反應計數即時更新於打卡上

#### Scenario: 後端阻擋非參與者送出評論
- **WHEN** `observer` 或 `anonymous` 使用者直接呼叫評論建立 API
- **THEN** API 回傳 403，錯誤訊息為「僅限挑戰成員留言」

### Requirement: 快速回應計數即時更新
外部觀察者送出的快速回應 SHALL 即時反映於參與者打卡下方的計數顯示。

#### Scenario: 送花後計數即時更新
- **WHEN** 任何使用者對某打卡送出快速回應
- **THEN** 該打卡的回應計數立即更新（無需重新整理頁面）

### Requirement: 參與者標籤
後端 SHALL 於使用者完成報名時，在 `challenge_participants` 中記錄其參與狀態，作為 ACL 查詢依據。

#### Scenario: 報名後標籤生效
- **WHEN** 使用者完成報名
- **THEN** `challenge_participants` 新增一筆記錄，後續 ACL middleware 能正確識別其為 `participant`
