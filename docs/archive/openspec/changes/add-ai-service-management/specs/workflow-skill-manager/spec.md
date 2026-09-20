## ADDED Requirements

### Requirement: Admin 可建立、編輯、刪除 Skill
系統 SHALL 允許 admin 對 Skill 進行 CRUD 操作。每個 Skill 是符合 Claude Agent Skills 模型的 versioned file bundle，包含必備 SKILL.md（YAML frontmatter + Markdown 指令）與選配 scripts/、references/、assets/、templates/ 檔案。

#### Scenario: 建立新 Skill
- **WHEN** admin 在 `/workflow-skills` 頁面點擊「新增 Skill」，填入名稱與描述後送出
- **THEN** 系統建立 Skill 記錄並跳轉至 Skill 詳情頁，SKILL.md 初始為空白模板
- **AND** 初始 SKILL.md SHALL 包含 `name` 與 `description` frontmatter

#### Scenario: 刪除 Skill
- **WHEN** admin 點擊 Skill 的刪除按鈕並確認
- **THEN** 系統刪除該 Skill 及所有相關檔案；已有 `skill-call` Node 引用此 Skill 的 Workflow 顯示警告

---

### Requirement: Skill 必須符合 Claude Agent Skills 結構
系統 SHALL 驗證 Skill bundle 的結構與 metadata，確保可被 runtime materialize 成標準資料夾。

#### Scenario: 驗證 SKILL.md frontmatter
- **WHEN** admin 儲存或套用 SKILL.md
- **THEN** 系統驗證 YAML frontmatter 必須包含 `name` 與 `description`
- **AND** `name` 僅允許小寫字母、數字、連字號且不可使用保留字
- **AND** `description` 不可為空，且 UI 提示它應描述「做什麼」與「何時使用」

#### Scenario: 管理標準子目錄檔案
- **WHEN** admin 上傳 Skill 檔案
- **THEN** 系統只允許 path 位於 `scripts/`、`references/`、`assets/`、`templates/` 其中之一
- **AND** 系統保存 path、category、checksum 與 executable flag

#### Scenario: 建立新 Skill 版本
- **WHEN** admin 套用 SKILL.md 或檔案變更
- **THEN** 系統建立新的 `workflow_skill_versions` 版本並保存該版本的 SKILL.md 與檔案快照
- **AND** 既有 Workflow 已 pin 的 skill_version 不會被自動改動

---

### Requirement: Admin 可透過 UI 直接編輯 Skill 內容
系統 SHALL 在 Skill 詳情頁提供直接編輯介面，允許 admin 修改 SKILL.md 並管理各子目錄的檔案。

#### Scenario: 編輯 SKILL.md
- **WHEN** admin 在「SKILL.md」分頁編輯 textarea 內容後點擊「儲存」
- **THEN** 系統呼叫 PATCH `/api/admin/workflow-skills/:skillId`，驗證 frontmatter 並更新 draft 內容，顯示「已儲存」toast
- **AND** admin 發布或套用變更時 SHALL 建立新的 `workflow_skill_versions` 版本

#### Scenario: 上傳 scripts/ 檔案
- **WHEN** admin 在「Scripts」分頁點擊「上傳檔案」並選擇檔案
- **THEN** 系統呼叫 POST `/api/admin/workflow-skills/:skillId/files`（category: scripts），上傳成功後檔案出現在清單中

#### Scenario: 上傳 references/ 檔案
- **WHEN** admin 在「References」分頁上傳 Markdown 檔案
- **THEN** 系統儲存至 references 類別，顯示檔案名稱與可預覽內容

#### Scenario: 上傳 templates/ 檔案
- **WHEN** admin 在「Templates」分頁上傳 JSON schema 或範本檔
- **THEN** 系統儲存至 templates 類別，顯示檔案名稱與可預覽內容

#### Scenario: 刪除檔案
- **WHEN** admin 點擊某個檔案的刪除按鈕並確認
- **THEN** 系統呼叫 DELETE `/api/admin/workflow-skills/:skillId/files/:fileId`，檔案從清單移除

---

### Requirement: Admin 可透過 Agent 對話建立或調整 Skill
系統 SHALL 在 Skill 詳情頁提供 Agent 對話面板，admin 以自然語言描述需求，AI Agent 生成或修改完整 Skill bundle，admin 確認後寫回為新版本。

#### Scenario: 開啟 Agent 對話面板
- **WHEN** admin 點擊「Agent 協助」分頁
- **THEN** 頁面顯示對話歷史（若有）與輸入框，並提示「描述您希望這個 Skill 能做什麼」

#### Scenario: 送出對話訊息
- **WHEN** admin 在輸入框填入需求（例如「幫我寫一個可以根據用戶學習目標推薦任務的 Skill」）後送出
- **THEN** 系統呼叫 POST `/api/admin/workflow-skills/:skillId/chat`，顯示送出中 spinner；AI Agent 回覆包含建議的 SKILL.md 與 scripts/references/assets/templates 檔案差異

#### Scenario: Agent 回傳 Skill 差異預覽
- **WHEN** Agent 回應包含 SKILL.md 或檔案修改建議
- **THEN** UI 在對話氣泡中展示 bundle diff 預覽（現有內容 vs 建議內容），並提供「套用」與「忽略」按鈕

#### Scenario: 確認套用 Agent 建議
- **WHEN** admin 點擊「套用」
- **THEN** 系統呼叫 POST `/api/admin/workflow-skills/:skillId/apply`，將 Agent 建議的 SKILL.md 及檔案寫回資料庫並建立新版本，對話記錄中標記為已套用

#### Scenario: 忽略 Agent 建議
- **WHEN** admin 點擊「忽略」
- **THEN** 對話繼續，不寫入任何變更，admin 可繼續描述需求

#### Scenario: 連續對話迭代修改
- **WHEN** admin 在套用後繼續對話，要求調整某個 scripts/ 工具
- **THEN** Agent 可根據對話上下文生成新的 scripts/ 檔案內容，以相同 diff 預覽方式呈現

---

### Requirement: Skill 清單提供所有可用 Skill 供 skill-call Node 選擇
系統 SHALL 在 `skill-call` Node 設定表單中，透過 GET `/api/admin/workflow-skills` 取得 Skill 清單供選擇。

#### Scenario: skill-call Node 選擇 Skill
- **WHEN** admin 在 `skill-call` Node 的設定表單開啟 Skill 下拉選單
- **THEN** UI 顯示所有 active Skill 的名稱、描述與可用版本，admin 選擇後 Node 卡片顯示 Skill 名稱與 pinned version

#### Scenario: 無可用 Skill 時提示
- **WHEN** admin 嘗試新增 `skill-call` Node 但系統中尚無任何 Skill
- **THEN** 下拉選單顯示「尚無 Skill，請先至 Skill 管理頁建立」，並提供跳轉連結

---

### Requirement: skill-call 執行時使用 materialized Skill runtime
系統 SHALL 在執行 `skill-call` 時，將 DB registry 中的 Skill version materialize 成標準資料夾，並在 sandbox runtime 中按需載入內容。

#### Scenario: 執行指定版本的 Skill
- **WHEN** Workflow 執行到 `skill-call` Node 且 config 包含 `skill_id` 與 `skill_version`
- **THEN** ai-backend 載入該版本的 Skill metadata、SKILL.md 與檔案快照
- **AND** 在 runtime 目錄建立 `SKILL.md`、`scripts/`、`references/`、`assets/`、`templates/`

#### Scenario: Progressive disclosure
- **WHEN** Skill runtime 啟動
- **THEN** 系統只預載 Skill metadata
- **AND** 只有當任務觸發該 Skill 時才讀取 SKILL.md
- **AND** references/templates/scripts 只有在 SKILL.md 指示或 agent 需要時才讀取或執行

#### Scenario: scripts 於 sandbox 執行
- **WHEN** agent 需要執行 Skill scripts
- **THEN** scripts SHALL 在 sandbox/container 中執行
- **AND** 未通過 safety review 的 Skill version 不可發布給 production workflow 使用
