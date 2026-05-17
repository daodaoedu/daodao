## ADDED Requirements

### Requirement: Admin 可建立、編輯、刪除 Skill
系統 SHALL 允許 admin 對 Skill 進行 CRUD 操作。每個 Skill 包含：SKILL.md（system prompt + YAML frontmatter）、scripts/ 工具檔案、references/ 參考文件、assets/ 靜態資源。

#### Scenario: 建立新 Skill
- **WHEN** admin 在 `/workflow-skills` 頁面點擊「新增 Skill」，填入名稱與描述後送出
- **THEN** 系統建立 Skill 記錄並跳轉至 Skill 詳情頁，SKILL.md 初始為空白模板

#### Scenario: 刪除 Skill
- **WHEN** admin 點擊 Skill 的刪除按鈕並確認
- **THEN** 系統刪除該 Skill 及所有相關檔案；已有 `skill-call` Node 引用此 Skill 的 Workflow 顯示警告

---

### Requirement: Admin 可透過 UI 直接編輯 Skill 內容
系統 SHALL 在 Skill 詳情頁提供直接編輯介面，允許 admin 修改 SKILL.md 並管理各子目錄的檔案。

#### Scenario: 編輯 SKILL.md
- **WHEN** admin 在「SKILL.md」分頁編輯 textarea 內容後點擊「儲存」
- **THEN** 系統呼叫 PATCH `/api/admin/workflow-skills/:skillId`，更新 `skill_md` 欄位，顯示「已儲存」toast

#### Scenario: 上傳 scripts/ 檔案
- **WHEN** admin 在「Scripts」分頁點擊「上傳檔案」並選擇檔案
- **THEN** 系統呼叫 POST `/api/admin/workflow-skills/:skillId/files`（category: scripts），上傳成功後檔案出現在清單中

#### Scenario: 上傳 references/ 檔案
- **WHEN** admin 在「References」分頁上傳 Markdown 檔案
- **THEN** 系統儲存至 references 類別，顯示檔案名稱與可預覽內容

#### Scenario: 刪除檔案
- **WHEN** admin 點擊某個檔案的刪除按鈕並確認
- **THEN** 系統呼叫 DELETE `/api/admin/workflow-skills/:skillId/files/:fileId`，檔案從清單移除

---

### Requirement: Admin 可透過 Agent 對話建立或調整 Skill
系統 SHALL 在 Skill 詳情頁提供 Agent 對話面板，admin 以自然語言描述需求，AI Agent 生成或修改 Skill 內容，admin 確認後寫回。

#### Scenario: 開啟 Agent 對話面板
- **WHEN** admin 點擊「Agent 協助」分頁
- **THEN** 頁面顯示對話歷史（若有）與輸入框，並提示「描述您希望這個 Skill 能做什麼」

#### Scenario: 送出對話訊息
- **WHEN** admin 在輸入框填入需求（例如「幫我寫一個可以根據用戶學習目標推薦任務的 Skill」）後送出
- **THEN** 系統呼叫 POST `/api/admin/workflow-skills/:skillId/chat`，顯示送出中 spinner；AI Agent 回覆包含建議的 SKILL.md 內容與說明

#### Scenario: Agent 回傳 Skill 差異預覽
- **WHEN** Agent 回應包含 SKILL.md 修改建議
- **THEN** UI 在對話氣泡中展示 diff 預覽（現有內容 vs 建議內容），並提供「套用」與「忽略」按鈕

#### Scenario: 確認套用 Agent 建議
- **WHEN** admin 點擊「套用」
- **THEN** 系統呼叫 POST `/api/admin/workflow-skills/:skillId/apply`，將 Agent 建議的 skill_md 及檔案寫回資料庫，對話記錄中標記為已套用

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
- **THEN** UI 顯示所有 Skill 的名稱與描述，admin 選擇後 Node 卡片顯示 Skill 名稱

#### Scenario: 無可用 Skill 時提示
- **WHEN** admin 嘗試新增 `skill-call` Node 但系統中尚無任何 Skill
- **THEN** 下拉選單顯示「尚無 Skill，請先至 Skill 管理頁建立」，並提供跳轉連結
