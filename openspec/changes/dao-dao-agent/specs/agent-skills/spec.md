## ADDED Requirements

### Requirement: Static Skills（版本控制）

系統 SHALL 支援存放於檔案系統 `src/services/agent/skills/*/SKILL.md` 的 Static Skills。每個 Skill 的核心為 `SKILL.md`，MUST 包含 YAML frontmatter（至少 `name`、`description`）與步驟說明，並可附選用的執行腳本或 SQL 參考檔。

#### Scenario: 載入 Static Skill metadata
- **WHEN** Agent 啟動
- **THEN** 系統 MUST 從檔案系統載入所有 Static Skill 的 metadata（name / description）

### Requirement: Dynamic Skills（runtime 產生）

系統 SHALL 支援存放於 PostgreSQL `agent_skills` 資料表的 Dynamic Skills，欄位至少含 `name`、`description`、`skill_md`、`status`、`created_at`。status MUST 遵循 `draft → active → archived` 流程，且可在對話中即時建立。

#### Scenario: 只載入 active 的 Dynamic Skill
- **WHEN** Agent 啟動並查詢 agent_skills
- **THEN** 系統 SHALL 僅載入 `status = 'active'` 的 Dynamic Skill 進入 registry

#### Scenario: 對話中建立 Dynamic Skill
- **WHEN** 用戶在對話中要求把一段流程存成 Skill
- **THEN** 系統 SHALL 以 `status = 'draft'` 寫入 agent_skills

### Requirement: 啟動時合併雙來源 registry

Agent 啟動時 SHALL 合併 Static Skills 與 active Dynamic Skills 的 metadata 為單一 skill registry。

#### Scenario: 合併兩來源
- **WHEN** Agent 啟動完成
- **THEN** skill registry MUST 同時包含檔案系統與 DB（active）兩來源的 Skill metadata

### Requirement: 漸進式載入

系統 SHALL 在啟動時只載入 Skill metadata，待 Skill 被觸發時才讀取其完整內容，以避免一次佔滿 context。

#### Scenario: 觸發時才讀完整內容
- **WHEN** 某 Skill 被意圖識別命中
- **THEN** 系統 MUST 此時才讀取該 Skill 的完整 SKILL.md 內容，而非啟動時全部載入

### Requirement: 升格流程

系統 SHALL 支援將 DB 中的 active Dynamic Skill「升格」為 Static Skill：匯出為 `SKILL.md` 並 commit 進 repo 後，從 DB 移除。

#### Scenario: Dynamic 升格為 Static
- **WHEN** 一個 active Dynamic Skill 被決定升格
- **THEN** 系統 SHALL 將其匯出為 SKILL.md 供 commit，並在完成後將該筆從 agent_skills 移除

### Requirement: Memory / KV Store 動態行為

系統 SHALL 提供 Memory / KV Store（Redis 或 `agent_memory` 資料表），用於儲存偏好、歷史操作、用戶選擇的 provider、dry_run 狀態等動態脈絡。Skill 執行時 SHALL 可從 memory 讀取參數，使同一 Skill 定義不變而行為可調整。

#### Scenario: Skill 讀取 memory 參數
- **WHEN** 一個 Skill 執行且 memory 中存有相關偏好
- **THEN** Skill SHALL 套用該偏好，而不需修改 Skill 定義本身

### Requirement: Memory 層分工

系統 SHALL 以 **Redis**（TTL）存放揮發性執行期狀態（當前 provider、dry_run、active turn 暫存、approval pending），以 **`agent_memory` 表**（PostgreSQL）持久化跨 session 偏好與歷史操作摘要。Skill 執行時 SHALL 從 `agent_memory` 讀取長期偏好參數。

#### Scenario: session 結束後偏好仍保留
- **WHEN** 用戶設定慣用模型偏好後關閉對話並重新開啟
- **THEN** 系統 SHALL 從 `agent_memory` 讀回該偏好，無需重新設定

#### Scenario: AppState 揮發資料放 Redis
- **WHEN** Agent 更新當前 provider 或 dry_run 狀態
- **THEN** 系統 SHALL 將其寫入 Redis（含 TTL），而非持久化至 Postgres

### Requirement: Dynamic Skill 工具白名單

Dynamic Skill（存於 `agent_skills`，status=draft/active）SHALL 只能呼叫白名單工具：唯讀資料工具（pg SELECT、describe_schema、get_user_full_context）與通用唯讀工具（web_search、stealth_fetch、python_repl）。MUST 禁止呼叫寫入型與系統型工具（bash、write_file、cron_create、email/bulk、notifications）。Dynamic Skill MUST NOT 在定義內覆寫 `dry_run`，dry_run 強制為 `true`。

#### Scenario: Dynamic Skill 嘗試呼叫 bash 被擋
- **WHEN** 一個 Dynamic Skill 定義中包含 bash 工具呼叫
- **THEN** 系統 MUST 拒絕執行並回報該工具不在 Dynamic Skill 白名單

#### Scenario: Dynamic Skill 無法關閉 dry_run
- **WHEN** Dynamic Skill 定義中設定 `dry_run=false`
- **THEN** 系統 MUST 忽略該設定並維持 `dry_run=true`

#### Scenario: Static Skill 可使用寫入型工具
- **WHEN** 一個已升格為 Static Skill 的 SKILL.md 呼叫 email/bulk
- **THEN** 系統 SHALL 允許執行（已過 code review），工具白名單限制不適用於 Static Skill

### Requirement: Skill 生命週期

系統 SHALL 支援三階段 Skill 生命週期：臨時執行（Ad-hoc）→ 封裝成 Skill → 升級為排程（Schedule，有需要才做）。

#### Scenario: 臨時流程封裝成 Skill
- **WHEN** 一段臨時組合的流程被確認為重複性業務
- **THEN** 系統 SHALL 支援將其封裝為 Skill，使之後可一句話觸發

#### Scenario: 高頻 Skill 升級排程
- **WHEN** 某 Skill 被高頻使用且適合無人值守
- **THEN** 系統 SHALL 支援將其包裝為排程任務並設定執行週期

### Requirement: 任務後可重用程式碼沉澱評估

Agent 於任務完成後 SHALL 評估該次流程是否可沉澱為可重用腳本或 Dynamic Skill，以供後續排程復用與開發者 audit，避免一次性 ad-hoc 程式碼累積。沉澱產物 MUST 走 `draft → active →（升格）` 流程取得人工 review，MUST NOT 未經 review 直接進入排程。

#### Scenario: 任務完成後建議沉澱
- **WHEN** Agent 完成一個由多步工具組合的臨時任務，且判斷該流程具重複使用價值
- **THEN** 系統 SHALL 主動向用戶建議將其存為 draft Dynamic Skill 或腳本，並附上內容摘要供審閱

#### Scenario: 沉澱物需 review 才能排程
- **WHEN** 一段任務產生的腳本被要求直接掛上 cron 排程
- **THEN** 系統 MUST 要求先完成 draft → active（或升格 Static）之 review 流程，不得直接排程未經審閱的程式碼
