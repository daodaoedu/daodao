## ADDED Requirements

### Requirement: Keyword search API
靈感 Tab 關鍵字搜尋 SHALL 使用 AI backend 現有端點 `GET /api/v1/users/practices?keyword=<keyword>`，在可見練習中進行多維度檢索。

搜尋範圍：練習 `title`、`practice_action`（行動清單）、關聯的標籤名稱（`tags.name`）、關聯的學習資源名稱（`resources.name`）。

#### Scenario: 關鍵字匹配標題
- **WHEN** 呼叫 `GET /api/v1/users/practices?keyword=德語`
- **THEN** 系統 SHALL 回傳所有 `title` 或 `practice_action` 包含「德語」的可見練習

#### Scenario: 關鍵字匹配標籤
- **WHEN** 呼叫 `GET /api/v1/users/practices?keyword=AI`
- **THEN** 系統 SHALL 回傳所有關聯標籤名稱包含「AI」的可見練習

#### Scenario: 延遲分享練習的打卡心得不被搜尋索引
- **WHEN** 使用 `privacy_status = 'delayed'` 練習打卡心得中的私密文字進行關鍵字搜尋
- **THEN** 系統 SHALL NOT 在結果中回傳該練習（AI backend 搜尋索引不包含延遲分享的 check-in 內容）

#### Scenario: 空搜尋結果顯示引導文案
- **WHEN** 搜尋關鍵字無任何符合的練習
- **THEN** 前端 SHALL 顯示「目前還沒有人實踐這個主題，你想成為第一個領航者嗎？」

---

### Requirement: Search suggestions
搜尋框聚焦時，系統 SHALL 使用 AI backend 現有端點 `GET /api/v1/users/practices/suggestions` 提供搜尋建議，包含：
- `trending_keywords`：近期熱門標籤（前 10 筆）
- `interest_tags`（登入使用者）：根據使用者技能興趣推薦的標籤

#### Scenario: 取得搜尋建議
- **WHEN** 呼叫 `GET /api/v1/users/practices/suggestions`
- **THEN** 回應 SHALL 包含 `trending_keywords` 陣列（最多 10 筆標籤名稱）

#### Scenario: 登入使用者取得個人化標籤建議
- **WHEN** 已登入使用者呼叫 `GET /api/v1/users/practices/suggestions`
- **THEN** 回應 SHALL 額外包含 `interest_tags` 陣列（依使用者興趣匹配）

---

### Requirement: Filter by tags
靈感 Tab SHALL 使用 AI backend 現有的 `tags` query param 過濾練習（`GET /api/v1/users/practices?tags[]=ai&tags[]=product-design`），多個標籤為 AND 邏輯。

#### Scenario: 單標籤篩選
- **WHEN** 呼叫 `GET /api/v1/users/practices?tags[]=ai`
- **THEN** 系統 SHALL 只回傳含有對應標籤的可見練習

#### Scenario: 多標籤 AND 篩選
- **WHEN** 呼叫 `GET /api/v1/users/practices?tags[]=ai&tags[]=product-design`
- **THEN** 系統 SHALL 只回傳同時含有兩個標籤的可見練習

---

### Requirement: Filter by duration
靈感 Tab SHALL 使用 AI backend 的 `duration_min` / `duration_max` 參數過濾（`GET /api/v1/users/practices?duration_min=7&duration_max=7`）。

#### Scenario: 篩選 7 天實踐
- **WHEN** 呼叫 `GET /api/v1/users/practices?duration_min=7&duration_max=7`
- **THEN** 系統 SHALL 只回傳 `durationDays = 7` 的可見練習

---

### Requirement: Filter by status
靈感 Tab SHALL 使用 AI backend 的 `status` query param 過濾（`GET /api/v1/users/practices?status=active|completed`）。

#### Scenario: 篩選進行中練習
- **WHEN** 呼叫 `GET /api/v1/users/practices?status=active`
- **THEN** 系統 SHALL 只回傳 `status = 'active'` 且符合展示條件的練習

#### Scenario: 組合篩選 AND 邏輯
- **WHEN** 呼叫 `GET /api/v1/users/practices?tags[]=ai&status=active&duration_min=7&duration_max=7`
- **THEN** 系統 SHALL 只回傳同時滿足 `#ai 標籤 + 進行中 + 7天` 三項條件的練習

#### Scenario: 組合篩選空結果
- **WHEN** 組合篩選後無符合練習
- **THEN** 前端 SHALL 顯示引導文案「目前還沒有人實踐這個主題，你想成為第一個領航者嗎？」

---

### Requirement: Default sort by newest update
靈感 Tab 預設排序 SHALL 為「最新更新」，使用 AI backend `sort_by=newest_updated` 參數。

#### Scenario: 最新打卡的練習排列在最前
- **WHEN** 使用者 A 完成一筆 check-in
- **THEN** 使用者 A 的練習 SHALL 立即出現在靈感列表第一筆（`GET /api/v1/users/practices?sort_by=newest_updated`）

#### Scenario: 延遲分享練習完成後出現在最新
- **WHEN** 一個 `privacy_status = 'delayed'` 的練習被標記為 `completed`
- **THEN** 該練習 SHALL 以「最新更新」出現在靈感列表，且打卡內容已解鎖（`is_brewing` 變為 `false`）
