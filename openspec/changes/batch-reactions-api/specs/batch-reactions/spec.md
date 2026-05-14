## ADDED Requirements

### Requirement: Batch reactions API endpoint

系統 SHALL 提供 `GET /api/v1/reactions/batch` 端點，接受 `targetType` 和逗號分隔的 `targetIds` query 參數，一次回傳多個目標的反應計數、當前用戶反應狀態、以及個別用戶反應列表。

#### Scenario: 成功批次查詢多個目標的反應

- **WHEN** 客戶端發送 `GET /api/v1/reactions/batch?targetType=practice&targetIds=uuid1,uuid2,uuid3`
- **THEN** 回傳 200，body 包含 `data` 物件，每個 targetId 為 key，值包含 `reactions`（計數陣列）、`currentUserReaction`（當前用戶反應或 null）、`items`（用戶反應列表，對齊現有 `/reactions/list` 的命名）

#### Scenario: 未登入用戶查詢

- **WHEN** 未登入用戶發送 batch 查詢
- **THEN** 回傳 200，每個目標的 `currentUserReaction` 為 null，其餘資料正常回傳

#### Scenario: 目標無任何反應

- **WHEN** 查詢的某個 targetId 沒有任何反應紀錄
- **THEN** 該 targetId 的 `reactions` 為空陣列（各 type count 為 0），`currentUserReaction` 為 null，`reactionList` 為空陣列

### Requirement: Batch endpoint 參數驗證

系統 SHALL 驗證 `targetIds` 包含 1 至 50 個有效 UUID，`targetType` 為有效的 enum 值。

#### Scenario: targetIds 超過 50 個

- **WHEN** 客戶端發送超過 50 個 targetIds
- **THEN** 回傳 400 Bad Request

#### Scenario: targetIds 為空

- **WHEN** 客戶端發送空的 targetIds 參數
- **THEN** 回傳 400 Bad Request

#### Scenario: targetType 無效

- **WHEN** 客戶端發送不在 enum 中的 targetType
- **THEN** 回傳 400 Bad Request

### Requirement: 前端批次 reactions hook

前端 SHALL 提供 `useReactionsBatch` hook，接受 `targetType` 和 `targetIds` 陣列，呼叫 batch endpoint 並回傳以 targetId 為 key 的 reactions 資料 map。

#### Scenario: 列表頁使用 batch hook 取代個別請求

- **WHEN** 靈感頁面載入 20 張卡片
- **THEN** 僅發出 1 個 batch API 請求（而非 40 個個別請求）

#### Scenario: SWR 快取 key 一致性

- **WHEN** 相同的 targetIds 集合以不同順序傳入
- **THEN** 使用相同的 SWR 快取 key（targetIds 排序後組成）

### Requirement: 卡片元件支援預取 reactions props

`PracticeShowcaseCard` 和 `BrewingCard` SHALL 接受 optional reactions props。有傳入時使用 props 資料，未傳入時 fallback 到原本的獨立 hook。

#### Scenario: 列表頁傳入預取資料

- **WHEN** 列表頁透過 props 傳入 reactions 資料
- **THEN** 卡片不發出獨立的 reactions API 請求

#### Scenario: Detail page 不傳 props

- **WHEN** 卡片在 detail page 等場景使用，未傳入 reactions props
- **THEN** 卡片使用原本的獨立 hook 發出請求，行為不變

### Requirement: Mutation 後快取更新

用戶在列表頁的卡片上新增或移除反應後，系統 SHALL 更新 batch SWR 快取以反映最新狀態。

#### Scenario: 用戶在列表頁按反應

- **WHEN** 用戶在靈感頁的卡片上 toggle 一個反應
- **THEN** 呼叫 upsert/remove API 後，batch SWR 快取被 revalidate，UI 反映最新狀態
