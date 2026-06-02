## ADDED Requirements

### Requirement: 觸發與參數

`monthly-insights` Skill SHALL 可由「整理這個月的使用者活躍與互動洞察 / 產出月報」類自然語言觸發，並接受參數：`month`（必填，預設當月）、`output`（必填，`markdown` / `notion` / `both`）、`notion_page_id`（當 output 含 notion 時必填）、`include_cohort`（選用，預設 true）、`top_n`（選用，預設 10）。

#### Scenario: 指定月份與輸出
- **WHEN** 用戶說「產出 2026-05 的月報，寫進 Notion」
- **THEN** Skill SHALL 以 `month=2026-05`、`output=notion` 啟動，並要求 `notion_page_id`

### Requirement: 定義時間範圍

Skill SHALL 由 `month` 推導 START（當月 1 日）、END（下月 1 日，不含）、PREV_START（上月 1 日）、PREV_END（本月 1 日）作為查詢邊界。

#### Scenario: 推導區間邊界
- **WHEN** `month = 2026-05`
- **THEN** START MUST 為 `2026-05-01`、END MUST 為 `2026-06-01`（不含）

### Requirement: 查詢核心活躍指標

Skill SHALL 透過 `daodao-pg-prod::query` 查詢：MAU（本月至少打卡 1 次的去重用戶數）、每日 DAU 趨勢、打卡總數與分布、新用戶數、新建與完成實踐數。

#### Scenario: 計算 MAU
- **WHEN** 查詢本月活躍
- **THEN** MAU MUST 為 `practice_checkins` 在 START–END 區間內 `DISTINCT user_id` 的數量

### Requirement: 查詢互動指標

Skill SHALL 查詢本月按讚 / 留言 / 新追蹤總數、被按讚最多的實踐 Top N、打卡次數最多的用戶 Top N。Top N 查詢 MUST 加 `LIMIT {top_n}`。

#### Scenario: 熱門實踐 Top N
- **WHEN** 查詢互動熱度
- **THEN** 系統 SHALL 回傳本月 reaction 數最高的前 top_n 個實踐，含 title、display_name 與 reaction_count

### Requirement: 計算留存率

當 `include_cohort = true`，Skill SHALL 計算上月活躍且本月仍活躍的留存率（retained / prev_mau）。

#### Scenario: 計算月對月留存
- **WHEN** `include_cohort = true`
- **THEN** 系統 SHALL 輸出 prev_mau、retained 與 retention_rate（百分比）

### Requirement: LLM 撰寫洞察

Skill SHALL 將活躍、互動、留存與 Top 清單整理為結構化資料，傳給 LLMClient，要求輸出 JSON 欄位 `summary`、`highlights`、`concerns`、`recommendations`、`narrative`，並以繁體中文解讀趨勢而非僅重述數字。

#### Scenario: 產出結構化洞察
- **WHEN** 指標資料齊備
- **THEN** LLM 輸出 MUST 包含 summary、highlights、concerns、recommendations、narrative 五個欄位

### Requirement: 組裝並輸出報告

Skill SHALL 依 `output` 參數輸出報告：`markdown` 產出含摘要、亮點、需關注、數據總覽表、詳細洞察、建議行動、Top 實踐與 Top 用戶的 Markdown；`notion` 透過 Notion MCP 寫入指定頁面（更新現有頁面前先以 notion-search 確認頁面 ID）；`both` 兩者皆做。

#### Scenario: 輸出至 Notion
- **WHEN** `output = notion`
- **THEN** Skill SHALL 透過 Notion MCP 將報告寫入 `notion_page_id` 指定的頁面

### Requirement: 唯讀與 PII 保護

Skill 的所有 SQL MUST 為 SELECT（經 `daodao-pg-prod::query`），報告輸出 MUST NOT 含 email 或 phone，Top 用戶僅顯示 display_name 與 user_id。

#### Scenario: 報告不洩漏個資
- **WHEN** 組裝 Top 用戶清單
- **THEN** 輸出 MUST NOT 包含 email 或 phone
