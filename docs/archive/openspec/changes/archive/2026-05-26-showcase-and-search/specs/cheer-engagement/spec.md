## ADDED Requirements

### Requirement: Practice reaction action
登入使用者 SHALL 能對靈感頁上任何可見的練習（Full Access Card 或 Brewing Card）執行反應操作（`POST /api/v1/practices/:id/react`），傳入 `reaction_type`。此端點取代原有未實作的 `/like` 路由。

`reaction_type` 值 SHALL 對應前端 `ReactionType` enum：`encourage | touched | fire | useful | sameHere | curious`。

同一使用者對同一練習的同一 `reaction_type` 再次呼叫 SHALL 視為取消（toggle）。同一使用者可同時持有同一練習的多種不同 reaction_type。

#### Scenario: 使用者對練習新增反應
- **WHEN** 使用者對 `practiceId = 42` 傳入 `{ reaction_type: "fire" }`
- **THEN** 系統 SHALL 在 `practice_reactions` 表建立記錄，回傳 `{ reaction_type: "fire", is_reacted: true, reactions: IReactionCount[] }`

#### Scenario: 使用者再次反應即取消（toggle）
- **WHEN** 使用者對已反應的練習用相同 `reaction_type` 再次呼叫
- **THEN** 系統 SHALL 刪除對應記錄，回傳 `{ reaction_type: "fire", is_reacted: false, reactions: IReactionCount[] }`

#### Scenario: 未登入使用者無法反應
- **WHEN** 未附帶有效 JWT 的請求呼叫反應 API
- **THEN** 系統 SHALL 回傳 `401 Unauthorized`

---

### Requirement: Reaction summary display
靈感頁卡片 API 回應 SHALL 包含每個練習的 `reactions: IReactionCount[]`，結構對應前端現有 `IReactionCount` 介面（`type`, `count`, `latestActorName`）。

卡片前端 SHALL 以前兩名有 count > 0 的 reaction emoji + `latestActorName`（搭配「與其他 N 人」）呈現聚合列；複用 `reaction-bar.tsx` 的 `IReactionCount` 型別，可直接作為 `reactions` prop 傳入。

若登入使用者已對該練習反應，對應 type 的按鈕 SHALL 呈現 selected 狀態（`is_reacted: true`）。

#### Scenario: 卡片回應包含反應聚合
- **WHEN** 呼叫 `GET /api/showcase/practices`
- **THEN** 每個練習物件 SHALL 包含 `reactions` 陣列，每筆含 `type`、`count`、`latestActorName`

#### Scenario: 多人反應時顯示代表者名稱
- **WHEN** 練習的 `fire` reaction 共 13 人，最新反應者為 Joy
- **THEN** 該 reaction 的 `latestActorName` SHALL 為 `"Joy"`，前端組合顯示為「🔥 Joy 與其他 12 人」

#### Scenario: 卡片顯示前兩名 emoji
- **WHEN** 練習有 `fire(13人)` 和 `touched(5人)` 兩種 reaction
- **THEN** 前端卡片聚合列 SHALL 顯示 「🔥💓 Joy 與其他 N 人」

---

### Requirement: Reaction notification for delayed practices
當一個 `privacy_status = 'delayed'` 的練習收到反應時，系統 SHALL 向該練習的擁有者發送通知，通知管道為 email（第一版）。

通知 SHALL 於 1 小時內合併同一練習的多次反應，以避免信件過多（batch notification）。

#### Scenario: 延遲分享練習收到反應觸發通知
- **WHEN** 使用者 A 對使用者 B 的 `privacy_status = 'delayed'` 練習反應
- **THEN** 系統 SHALL 排程一封通知信給使用者 B，告知「有人對你的練習加油了」

#### Scenario: 1 小時內多次反應合併通知
- **WHEN** 同一練習在 1 小時內收到 3 次反應
- **THEN** 系統 SHALL 只發送一封合併通知（包含反應次數），不發送 3 封獨立通知

#### Scenario: 即時公開練習收到反應不觸發通知
- **WHEN** 使用者 A 對 `privacy_status = 'public'` 的練習反應
- **THEN** 系統 SHALL NOT 發送任何通知給練習擁有者

---

### Requirement: Reaction data model
系統 SHALL 建立 `practice_reactions` 表，包含欄位：`id`、`practice_id`（FK to practices）、`user_id`（FK to users）、`reaction_type VARCHAR(20)`、`created_at`。`(practice_id, user_id, reaction_type)` 為唯一鍵。

`reaction_type` 允許值：`encourage | touched | fire | useful | sameHere | curious`（對應前端 `ReactionType` enum）。

#### Scenario: 防止重複反應記錄
- **WHEN** 相同的 `(practice_id, user_id, reaction_type)` 組合嘗試插入
- **THEN** 資料庫 SHALL 拋出唯一鍵衝突，API 層 SHALL 將其視為 toggle（改為刪除）
