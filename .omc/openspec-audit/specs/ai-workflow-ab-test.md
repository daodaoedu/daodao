# ai-workflow-ab-test
- 涉及 repo: admin-ui（AB 測試頁/並排對比）/ ai-backend 或 server（workflow runs）/ storage（workflow_* tables）— 預期，但全部未實作
- 對應 archived change: add-ai-service-management（該 change 於 git status 顯示為已刪除 D，功能未落地）
- 總計: 3 條 requirement / 8 個 scenario | ✅0 ⚠️0 ❌8 ❓0

## Requirement: Admin 可建立 A/B 測試對比兩個 Workflow → ❌
證據: grep `workflow_ab|ab_test|workflow_run|node_run|dry_run` 於 ai-backend(app/)、daodao-server(src/)、admin-ui(src/)、storage(migrate/、schema/) origin/dev **全部無結果**；ai-backend app/ 無任何 workflow 檔案；無 workflow_runs / workflow_ab_tests 資料表
- Scenario: 成功建立 A/B 測試 → ❌ — 無 dry-run 觸發、無 workflow_runs / workflow_ab_tests 寫入邏輯
- Scenario: 未選擇兩個 Workflow 時拒絕 → ❌ — 無建立流程與驗證
- Scenario: A/B 測試不寫回業務資料 → ❌ — 無 output Node / workflow_node_runs 機制

## Requirement: Admin 可查看逐節點並排對比結果 → ❌
證據: admin-ui src/ grep `並排|side.by.side|node.*run|abTest` 無結果；無 AB 測試結果頁元件；App.tsx 無 ab-test 路由
- Scenario: 兩個 run 皆完成時顯示並排結果 → ❌ — 無並排對比 UI
- Scenario: 其中一個 run 失敗 → ❌ — 無 run 狀態/失敗 Node 顯示
- Scenario: 執行中以 polling 更新狀態 → ❌ — 無 3 秒 polling 進度指示器

## Requirement: Admin 可查看 A/B 測試歷史 → ❌
證據: admin-ui 無 AB 測試歷史列表頁；無 workflow_ab_tests 查詢
- Scenario: 查看 A/B 測試歷史列表 → ❌ — 無歷史列表
- Scenario: 重新查看歷史對比結果 → ❌ — 無歷史結果頁

## 關鍵落差
1. 整個 AI Workflow A/B 測試功能在所有 repo 的 origin/dev 程式碼中完全不存在：無 workflow 引擎、無 workflow_runs/workflow_ab_tests/workflow_node_runs 資料表、無 admin-ui AB 測試頁面或路由。
2. 此 spec 對應的 add-ai-service-management change 在當前 git status 中為已刪除狀態（D），代表整個 AI 服務管理（含 workflow builder / AB test / skill manager）規格群組從未實作落地。
3. admin-ui 雖有 AIServiceConfigsPage / PlaygroundPage，但內容與 workflow / AB test / node run 概念無任何關聯。
