# ai-workflow-builder
- 涉及 repo: server / ai-backend / admin-ui / storage
- 對應 archived change: add-ai-service-management（被刪除中，proposal 仍可參考）
- 總計: 8 條 requirement / 30 個 scenario | ✅0 ⚠️0 ❌8 ❓0

整體結論：此 capability **完全未實作**。在 origin/dev 全面搜尋四個 repo，找不到任何 workflow node/edge/trigger/run 的資料表、API、UI 或 ai-backend skill-call 端點。admin-ui 雖有 LLM model 管理（`src/api/admin-ai.ts`、`listLLMModels`），但那是 LLM 模型清單功能，與 spec 描述的 Workflow Builder 無關。

## Requirement: Admin 可建立 Workflow → ❌
證據: 無。`git grep -i workflow origin/dev -- 'src/**'`（server）與 admin-ui src 皆無 Workflow CRUD；無 `POST .../workflows` 端點。
- Scenario: 成功建立 Workflow → ❌ — 無建立 Workflow API/UI
- Scenario: 名稱為空時拒絕建立 → ❌ — 無對應驗證

## Requirement: Admin 可新增、編輯、刪除 Node → ❌
證據: 無。`git grep -i 'llm-call\|data-fetch\|approval-gate\|skill-call' origin/dev`（admin-ui / server）零結果。
- 全部 11 個 scenario（llm-call/data-fetch/data-transform/tool-call/skill-call/output/approval-gate/刪除等）→ ❌ — 無任何 Node 類型實作；ai-backend 無 `POST /internal/execute/skill-call`（`git grep -i 'skill-call' origin/dev` 零結果）

## Requirement: Admin 可管理 Node 間的 Edge → ❌
證據: 無。無 edge 資料模型或拖拉排序 UI。
- Scenario: 拖拉排序隱式更新 Edge → ❌
- Scenario: 執行前驗證 Edge 合法性 → ❌

## Requirement: Admin 可設定 Trigger → ❌
證據: 無。`trigger_type` 只出現在 badge-award / email-trigger（不同功能），非 workflow trigger。
- Scenario: 新增 manual Trigger → ❌
- Scenario: 設定 scheduled Trigger（預留）→ ❌

## Requirement: Admin 可手動執行 Workflow 並選擇 Scope → ❌
證據: 無。無 `workflow_runs` / `workflow_node_runs` 資料表（storage migrate/sql 無對應 migration）或執行端點。
- 全部 4 個 scenario（single_user / all_users / 完成顯示 / 失敗處理）→ ❌

## Requirement: 系統提供可用 AI Provider 清單 → ❌
證據: 無。`git grep -i 'ai-providers' origin/dev -- 'src/**'`（server）零結果；無 `GET /api/admin/ai-providers` 端點。
- Scenario: 取得 provider 清單 → ❌
- Scenario: 切換 provider 時自動帶入預設 model → ❌

## Requirement: Admin 可查看 Workflow 執行歷史 → ❌
證據: 無。無 runs 列表 API/UI。
- Scenario: 查看執行歷史列表 → ❌
- Scenario: 查看單次執行逐節點詳情 → ❌
