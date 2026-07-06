## ADDED Requirements

### Requirement: 任務循環引擎（QueryEngine）

Harness SHALL 提供任務循環引擎，作為 Agent 的調度核心。引擎接收用戶輸入後，MUST 依序完成：注入 DaoDao 業務脈絡 → 識別意圖 → 選擇 Skill 或臨時組合工具 → 執行工具呼叫 → 將結果回流到下一輪推理，直到任務完成。

#### Scenario: 完成一次任務循環
- **WHEN** 用戶送出一段自然語言輸入
- **THEN** 引擎注入業務脈絡並識別意圖，選擇 Skill 或臨時組合工具執行，並將工具結果回流產生下一步，直至產出最終結果

#### Scenario: 無對應 Skill 時臨時組合
- **WHEN** 識別意圖後沒有任何 Skill 匹配
- **THEN** 引擎 SHALL 臨時組合可用工具完成任務，而非中止

### Requirement: 脈絡注入（Context）

Harness SHALL 在每個 Turn 開始前自動注入脈絡，至少包含：當前日期、用戶操作權限、DB schema 摘要、當前 provider 設定與 `dry_run` 狀態、前幾次操作的摘要。

#### Scenario: Turn 開始注入脈絡
- **WHEN** 一個新 Turn 開始
- **THEN** 系統 MUST 在送交 LLM 前注入當前日期、用戶權限、DB schema 摘要、provider 與 dry_run 狀態，以及先前操作摘要

#### Scenario: schema 摘要支撐 SQL 生成
- **WHEN** 任務需要產生 SQL 查詢
- **THEN** 注入的 DB schema 摘要 SHALL 足以讓 LLM 寫出引用正確資料表與欄位的查詢

### Requirement: 會話狀態管理（AppState）

Harness SHALL 維護跨 Turn 保留的運行時狀態，至少包含：當前 LLM provider、`dry_run` 開關、active thread ID、已執行工具清單、累積的 approval 記錄。

#### Scenario: 狀態跨 Turn 保留
- **WHEN** 用戶在前一 Turn 切換 provider 或關閉 dry_run
- **THEN** 後續 Turn MUST 沿用該設定，無需重新指定

### Requirement: Context 耐久性管理

Harness SHALL 主動管理 context 健康度，在長對話後對退化的 context 採取行動，至少支援：摘要化早期 turns、壓縮大型查詢結果、必要時重注入核心指令。

#### Scenario: 長對話壓縮中間結果
- **WHEN** 對話累積大量中間查詢結果導致 context 品質退化
- **THEN** Harness SHALL 摘要化早期 turns 或壓縮大型結果，以維持決策品質

### Requirement: 資源容量護欄

Harness MUST 在每次 session / thread 開始前評估所處 VM／容器的記憶體與磁碟餘裕，並在執行高耗用操作（python_repl、檔案寫入、大型查詢結果）時持續檢查。餘裕不足時 SHALL 拒絕啟動或降級處理（壓縮、分批、截斷），MUST NOT 使程序 out of memory 或 out of disk。

#### Scenario: 啟動前容量不足
- **WHEN** 新 session 啟動時偵測到記憶體或磁碟餘裕低於安全水位
- **THEN** 系統 MUST 拒絕啟動該 session 並回報資源不足，而非帶病執行

#### Scenario: 執行中降級處理
- **WHEN** Turn 進行中一筆查詢結果大到逼近記憶體水位
- **THEN** Harness SHALL 對結果採取壓縮、分批或截斷，使 Turn 得以完成而不 OOM

### Requirement: Model Drift 偵測

Harness SHALL 在每個 Turn 結束時自我檢查當前執行路徑是否仍在用戶原始指令範圍內。偵測到偏離時 MUST 中斷並重新向用戶確認。

#### Scenario: 偵測到偏離原始意圖
- **WHEN** 連續多次工具呼叫後執行路徑偏離用戶原始指令
- **THEN** Harness MUST 中斷當前路徑並向用戶重新確認意圖
