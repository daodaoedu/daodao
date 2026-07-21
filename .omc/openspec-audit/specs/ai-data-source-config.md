# ai-data-source-config
- 涉及 repo: server / ai-backend / admin-ui（全部未找到）
- 對應 archived change: openspec/changes/add-ai-service-management（已從工作區刪除，僅規格留存）
- 總計: 4 條 requirement / 8 個 scenario | ✅0 ⚠️0 ❌8 ❓0

## Requirement: 系統維護全域資料欄位白名單 → ❌
證據: 無。grep `workflow_data_source_config`、`allowed_fields`、`data-fetch` / `data_source` 於 daodao-server:src、daodao-ai-backend:src、daodao-admin-ui:origin/main 皆無相關實作（僅命中無關的 email trigger 腳本）。
- Scenario: 初始狀態白名單為空 → ❌ — 無資料來源設定頁、無 config 表
- Scenario: 白名單為空時 data-fetch Node 執行被拒絕 → ❌ — 無 data-fetch Node 概念

## Requirement: Admin 可啟用或停用資料欄位 → ❌
證據: 無。`user.name`/`user.bio`/`activity.viewed_resources` 等白名單欄位定義、`workflow_data_source_config.allowed_fields` 更新邏輯均不存在。
- Scenario: 啟用欄位 → ❌ — 無
- Scenario: 停用欄位 → ❌ — 無
- Scenario: 儲存後顯示確認 → ❌ — 無

## Requirement: data-fetch Node 只能選取白名單內欄位 → ❌
證據: 無。無 Workflow / data-fetch Node 欄位選單實作。
- Scenario: 欄位選單只顯示已啟用欄位 → ❌ — 無

## Requirement: Workflow 執行時僅傳入白名單欄位資料 → ❌
證據: 無。無 Workflow 執行引擎讀取 allowed_fields 的程式碼。
- Scenario: 執行時套用白名單過濾 → ❌ — 無
- Scenario: 白名單變更不影響進行中的 run → ❌ — 無

## 關鍵落差
整個 ai-data-source-config 規格（屬已從工作區刪除的 add-ai-service-management change）**在 dev/main 三個 repo 均無任何實作**——無白名單 config 表、無 data-fetch Node、無 Workflow 引擎。整條 AI workflow 資料來源功能尚未動工。
