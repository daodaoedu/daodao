## ADDED Requirements

### Requirement: Admin 可建立 A/B 測試對比兩個 Workflow
系統 SHALL 允許 admin 選擇兩個 Workflow（A 組、B 組）對相同輸入 scope 進行 dry-run 對比執行。

#### Scenario: 成功建立 A/B 測試
- **WHEN** admin 選定 Workflow A、Workflow B 與 scope 後送出
- **THEN** 系統同時觸發兩個 dry-run，建立兩筆 `workflow_runs`（`is_dry_run: true`）與一筆 `workflow_ab_tests` 關聯記錄，導向對比結果頁

#### Scenario: 未選擇兩個 Workflow 時拒絕
- **WHEN** admin 只選擇一個 Workflow 即送出
- **THEN** 系統顯示驗證錯誤，不觸發執行

#### Scenario: A/B 測試不寫回業務資料
- **WHEN** A/B 測試的兩個 dry-run 完成
- **THEN** `output` Node 不執行寫回操作，結果僅存入 `workflow_node_runs`

---

### Requirement: Admin 可查看逐節點並排對比結果
系統 SHALL 在結果頁以左右並排方式展示兩個 Workflow 每個 Node 的輸出。

#### Scenario: 兩個 run 皆完成時顯示並排結果
- **WHEN** A 組與 B 組的 run status 皆變為 `completed`
- **THEN** UI 依 Node 順序並排顯示兩組每個 Node 的輸出內容

#### Scenario: 其中一個 run 失敗
- **WHEN** A 組或 B 組任一 run 失敗
- **THEN** 失敗的欄位顯示錯誤訊息與失敗 Node，成功的欄位正常顯示

#### Scenario: 執行中以 polling 更新狀態
- **WHEN** A/B 測試觸發後尚未完成
- **THEN** UI 每 3 秒 polling 兩個 run 的狀態，並以進度指示器顯示各 Node 執行進度

---

### Requirement: Admin 可查看 A/B 測試歷史
系統 SHALL 提供歷史 A/B 對比記錄列表。

#### Scenario: 查看 A/B 測試歷史列表
- **WHEN** admin 進入「A/B 測試」頁面
- **THEN** 系統列出所有歷史對比記錄，依時間倒序排列，每筆顯示 Workflow A 名稱、Workflow B 名稱、執行時間與兩組狀態

#### Scenario: 重新查看歷史對比結果
- **WHEN** admin 點擊某筆歷史記錄
- **THEN** 系統顯示該次 A/B 對比的並排結果頁
