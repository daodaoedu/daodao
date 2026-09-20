## ADDED Requirements

### Requirement: Admin 可建立 Workflow
系統 SHALL 允許 admin 建立一個具名的 Workflow。

#### Scenario: 成功建立 Workflow
- **WHEN** admin 填入名稱與描述後送出
- **THEN** 系統建立 Workflow 並跳轉至 Workflow 編輯頁

#### Scenario: 名稱為空時拒絕建立
- **WHEN** admin 未填名稱即送出
- **THEN** 系統顯示驗證錯誤，不送出 API 請求

---

### Requirement: Admin 可新增、編輯、刪除 Node
系統 SHALL 允許 admin 在 Workflow 中新增 Node，每個 Node 必須選擇類型並填入對應 config。Phase 1 開放的 Node 類型：`llm-call`、`data-fetch`、`data-transform`、`tool-call`、`skill-call`、`approval-gate`、`output`（`condition` 預留，Phase 1 不開放）。

#### Scenario: 新增 llm-call Node
- **WHEN** admin 選擇類型 `llm-call`，選擇 provider，可覆寫 model，填入 system prompt 與 prompt template 後送出
- **THEN** 系統建立 Node，卡片顯示 provider、model 與 prompt 預覽

#### Scenario: prompt template 引用前驅節點輸出
- **WHEN** admin 在 prompt template 中輸入 `{{nodes.<nodeId>.output}}`
- **THEN** UI 提示可用的前驅節點清單，執行時 server 自動代入對應節點的輸出

#### Scenario: 引用不存在節點時警告
- **WHEN** admin 在 prompt template 中引用一個不存在的 nodeId
- **THEN** UI 顯示「找不到節點 <nodeId>」警告，允許儲存但執行前會拒絕

#### Scenario: 新增 data-fetch Node
- **WHEN** admin 選擇類型 `data-fetch`，選擇資料來源（users）、scope（single_user / all_users / query）、勾選欄位
- **THEN** 系統建立 Node，卡片顯示 scope 與欄位清單

#### Scenario: 新增 data-transform Node
- **WHEN** admin 選擇類型 `data-transform`，設定 filter / limit 等操作
- **THEN** 系統建立 Node，卡片顯示操作摘要

#### Scenario: 新增 tool-call Node
- **WHEN** admin 選擇類型 `tool-call`，填入 HTTP method、URL、body template
- **THEN** 系統建立 Node，卡片顯示 method 與 URL

#### Scenario: 新增 skill-call Node
- **WHEN** admin 選擇類型 `skill-call`，從下拉清單選擇已建立的 Skill 與版本，選擇 provider 並填入 input template
- **THEN** 系統建立 Node，卡片顯示 Skill 名稱、pinned version 與 provider

#### Scenario: production workflow 固定 Skill 版本
- **WHEN** admin 將 Workflow 啟用為 production
- **AND** Workflow 包含 `skill-call` Node
- **THEN** 每個 `skill-call` Node config SHALL 包含固定 `skill_version`
- **AND** 系統不得因 Skill 發布新版本而自動改動既有 Workflow 的 pinned version

#### Scenario: skill-call Node 執行
- **WHEN** Workflow 執行到 `skill-call` Node
- **THEN** daodao-server 呼叫 `POST /internal/execute/skill-call`（daodao-ai-backend），ai-backend 載入指定 Skill version，materialize 成標準 Skill folder，並在 sandbox runtime 中以 progressive disclosure + ReAct agent loop 執行後回傳輸出

#### Scenario: 新增 output Node
- **WHEN** admin 選擇類型 `output`，選擇 target（db / notification / webhook）並設定 mapping
- **THEN** 系統建立 Node，卡片顯示 target 類型

#### Scenario: output Node 支援最後行動目錄
- **WHEN** admin 設定 Workflow 的最後行動
- **THEN** 系統 SHALL 支援 email、站內通知、push、DB 寫回、建立草稿、發放 badge、建立任務 / 實踐、建立推薦卡、外部 API、dry-run 等行動類型或保留對應 target/mapping 擴充點
- **AND** 對外或不可逆行動 SHALL 建議或要求 `approval-gate` / `require_approval`

#### Scenario: 新增 approval-gate Node
- **WHEN** admin 選擇類型 `approval-gate`，設定 title、preview_template、actions 與 editable_fields
- **THEN** 系統建立人工流程關卡 Node，卡片顯示關卡名稱與可執行操作

#### Scenario: approval-gate Node 執行
- **WHEN** Workflow 執行到 `approval-gate` Node
- **THEN** 系統解析 preview_template，建立 `workflow_approval_requests`，將 run status 改為 `pending_approval`
- **AND** admin 核准後，系統將核准後 payload 寫入該 gate node 的 output，後續 Node 可用 `{{nodes.<gateNodeId>.output}}` 引用
- **AND** admin 拒絕後，run 標記為 `failed`，後續 Node 標記為 `skipped`

#### Scenario: 刪除 Node
- **WHEN** admin 點擊 Node 的刪除按鈕並確認
- **THEN** 系統移除該 Node 及所有相關 Edge

---

### Requirement: Admin 可管理 Node 間的 Edge
系統 SHALL 允許 admin 新增與刪除 Edge，定義 Node 的執行順序。Phase 1 UI 以拖拉排序卡片方式隱式管理 Edge。

#### Scenario: 拖拉排序隱式更新 Edge
- **WHEN** admin 在卡片列表中拖拉調整 Node 順序
- **THEN** 系統依新順序重建 Edge（前一張卡 → 後一張卡），舊 Edge 自動刪除

#### Scenario: 執行前驗證 Edge 合法性
- **WHEN** admin 觸發 Workflow 執行
- **THEN** server 執行靜態分析，確認所有 Node 可達且無懸空引用，若有問題則拒絕執行並回報具體 Node

---

### Requirement: Admin 可設定 Trigger
系統 SHALL 允許 admin 為 Workflow 新增 Trigger。Phase 1 只開放 `manual` Trigger。

#### Scenario: 新增 manual Trigger
- **WHEN** admin 在 Trigger 設定頁點擊「新增手動觸發」
- **THEN** 系統建立 `trigger_type: manual` 的 Trigger，Workflow 詳情頁出現「執行」按鈕

#### Scenario: 設定 scheduled Trigger（預留）
- **WHEN** admin 嘗試新增 `scheduled` Trigger
- **THEN** UI 顯示「排程觸發將於 Phase 2 開放」提示，不允許建立

---

### Requirement: Admin 可手動執行 Workflow 並選擇 Scope
系統 SHALL 允許 admin 透過 `manual` Trigger 觸發 Workflow 執行，並以 polling 查詢狀態。

#### Scenario: 選擇 single_user scope 執行
- **WHEN** admin 點擊「執行」，選擇 scope `single_user` 並填入 user ID 後確認
- **THEN** 系統建立 `workflow_runs` 記錄（status: pending），UI 每 3 秒 polling 狀態

#### Scenario: 選擇 all_users scope 執行
- **WHEN** admin 選擇 scope `all_users` 並確認
- **THEN** 系統建立執行記錄，以全部用戶資料作為輸入

#### Scenario: 執行完成顯示每個 Node 的結果
- **WHEN** run status 變為 `completed`
- **THEN** UI 依 Node 順序顯示每個 `workflow_node_runs` 的輸入與輸出摘要

#### Scenario: 某 Node 執行失敗
- **WHEN** 某個 Node 的 `workflow_node_runs.status` 變為 `failed`
- **THEN** 系統停止執行後續 Node，整個 run 標記為 `failed`，UI 標示失敗的 Node 並顯示錯誤訊息

---

### Requirement: 系統提供可用 AI Provider 清單
系統 SHALL 提供 API 回傳 daodao-ai-backend 支援的 provider 清單，供 llm-call Node 的設定表單使用。

#### Scenario: 取得 provider 清單
- **WHEN** admin 開啟 llm-call Node 的設定表單
- **THEN** UI 向 `GET /api/admin/ai-providers` 取得清單，顯示所有 provider 及其預設 model

#### Scenario: 切換 provider 時自動帶入預設 model
- **WHEN** admin 切換 provider
- **THEN** model 欄位自動更新為新 provider 的預設 model，已手動修改的不覆寫

---

### Requirement: Admin 可查看 Workflow 執行歷史
系統 SHALL 提供執行歷史列表，並可查看每次 run 的逐節點詳情。

#### Scenario: 查看執行歷史列表
- **WHEN** admin 進入 Workflow 的「執行記錄」頁
- **THEN** 系統列出所有 runs，依時間倒序排列，每筆顯示時間、scope、狀態、是否 dry-run

#### Scenario: 查看單次執行逐節點詳情
- **WHEN** admin 點擊某筆 run
- **THEN** 系統顯示每個 Node 的執行狀態、輸入與輸出
