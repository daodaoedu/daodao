# workflow-skill-manager
- 涉及 repo: admin-ui + server + ai-backend + storage（皆未實作）
- 對應 archived change: add-ai-service-management
- 總計: 6 條 requirement / 19 個 scenario | ✅0 ⚠️0 ❌6 ❓0

整體結論：此 spec **完全未實作**。跨 4 個 repo 的 origin/dev grep 全部 0 命中：
- daodao-admin-ui：無 `/workflow-skills` 頁面、無 `skill-call` Node、無 WorkflowSkill 元件（src/ 下 grep `skill-call`/`workflowSkill`/`workflow.*node` 皆無；僅有 repo 自身的 .claude/.agents SKILL.md 工具檔，與功能無關）。
- daodao-server：無 `/api/admin/workflow-skills*` route、無 `workflow_skill_versions`、grep `workflow-skills`/`workflowSkill`/`skill-call` 0 命中。
- daodao-ai-backend：app/ 下無 workflow / skill materialize / SKILL.md / sandbox runtime 0 命中。
- daodao-storage：無 `workflow_skill` / `skill_version` migration 0 命中。

## Requirement: Admin 可建立、編輯、刪除 Skill → ❌
證據: daodao-admin-ui/server grep workflow-skills CRUD route/page 0 命中。
- Scenario: 建立新 Skill → ❌
- Scenario: 刪除 Skill → ❌

## Requirement: Skill 必須符合 Claude Agent Skills 結構 → ❌
證據: 無 SKILL.md frontmatter 驗證、無 scripts/references/assets/templates 子目錄管理實作。
- Scenario: 驗證 SKILL.md frontmatter → ❌
- Scenario: 管理標準子目錄檔案 → ❌
- Scenario: 建立新 Skill 版本 → ❌ — 無 workflow_skill_versions 表

## Requirement: Admin 可透過 UI 直接編輯 Skill 內容 → ❌
證據: 無 PATCH `/api/admin/workflow-skills/:skillId`、無 files upload/delete endpoint。
- Scenario: 編輯 SKILL.md → ❌
- Scenario: 上傳 scripts/ 檔案 → ❌
- Scenario: 上傳 references/ 檔案 → ❌
- Scenario: 上傳 templates/ 檔案 → ❌
- Scenario: 刪除檔案 → ❌

## Requirement: Admin 可透過 Agent 對話建立或調整 Skill → ❌
證據: 無 `/api/admin/workflow-skills/:skillId/chat`、`/apply` endpoint，無 Agent 對話面板。
- Scenario: 開啟 Agent 對話面板 → ❌
- Scenario: 送出對話訊息 → ❌
- Scenario: Agent 回傳 Skill 差異預覽 → ❌
- Scenario: 確認套用 Agent 建議 → ❌
- Scenario: 忽略 Agent 建議 → ❌
- Scenario: 連續對話迭代修改 → ❌

## Requirement: Skill 清單提供所有可用 Skill 供 skill-call Node 選擇 → ❌
證據: 無 GET `/api/admin/workflow-skills`、無 skill-call Node 設定表單。
- Scenario: skill-call Node 選擇 Skill → ❌
- Scenario: 無可用 Skill 時提示 → ❌

## Requirement: skill-call 執行時使用 materialized Skill runtime → ❌
證據: daodao-ai-backend 無 materialize/sandbox runtime 載入 SKILL.md 的實作。
- Scenario: 執行指定版本的 Skill → ❌
- Scenario: Progressive disclosure → ❌
- Scenario: scripts 於 sandbox 執行 → ❌
