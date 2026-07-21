# ai-workflow-nlp-generator
- 涉及 repo: server (workflow generator API+Zod)、admin-ui (draft UI)、storage (workflow_generator_* 表)、可能 ai-backend
- 對應 archived change: add-ai-service-management（git status 顯示 openspec/changes/add-ai-service-management 已刪除，含 ai-workflow-nlp-generator/ai-workflow-builder/workflow-skill-manager specs）
- 總計: 6 條 requirement / 18 個 scenario | ✅0 ⚠️0 ❌6 ❓0
- **整體結論：此 capability 在所有 repo 的 origin/dev 完全無實作。** grep workflow_generator / WorkflowDraft / workflow_nodes / workflow_edges / workflow_triggers / llm-call / skill-call / workflow_data_source_config 於 daodao-server、daodao-storage、daodao-admin-ui、daodao-ai-backend 皆 0 結果（僅 .github/workflows CI 檔誤匹配）

## Requirement: Admin 可透過對話建立 Workflow draft → ❌
證據: 無。無對話式 workflow 生成端點或 service
- Scenario: 從自然語言產生寄信 Workflow draft → ❌ — 無實作
- Scenario: 依需求判斷 llm-call/skill-call → ❌ — 無實作
- Scenario: 需求不足時追問 → ❌ — 無實作
- Scenario: 適合 Skill 但沒有既有 Skill → ❌ — 無實作
- Scenario: Draft 不直接啟用 → ❌ — 無實作

## Requirement: Generator 僅可使用已允許的資料欄位 → ❌
證據: 無 workflow_data_source_config / allowed_fields
- Scenario: 使用已啟用欄位 → ❌ — 無實作
- Scenario: 需求提到未啟用欄位 → ❌ — 無實作

## Requirement: Generator 產生可驗證的 Node config → ❌
證據: 無 node config schema / Zod 驗證 / workflow 靜態分析
- Scenario: 產生 llm-call 節點 → ❌ — 無實作
- Scenario: 產生 skill-call 節點 → ❌ — 無實作
- Scenario: 產生 output 節點 → ❌ — 無實作
- Scenario: 套用前驗證失敗 → ❌ — 無實作

## Requirement: Admin 可預覽、修改並套用 Workflow draft → ❌
證據: admin-ui 無 workflow/draft 相關頁面或元件
- Scenario: 預覽 Workflow draft → ❌ — 無實作
- Scenario: 套用 draft → ❌ — 無實作
- Scenario: Phase 1 event→manual → ❌ — 無實作

## Requirement: Generator 對話紀錄可延續 → ❌
- Scenario: 連續修改 draft → ❌ — 無實作
- Scenario: 切換為既有 Skill → ❌ — 無實作

## Requirement: 系統保存 Generator 對話與 Draft 版本 → ❌
證據: storage migrate/sql 無 workflow_generator_conversations / workflow_generator_messages / workflow_generator_drafts / workflows 表
- Scenario: 建立對話紀錄 → ❌ — 無實作
- Scenario: 保存 Draft 版本 → ❌ — 無實作
- Scenario: 套用後關聯正式 Workflow → ❌ — 無實作
