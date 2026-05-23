## ADDED Requirements

### Requirement: PM / 設計師可建立功能想法專案
系統 SHALL 允許 PM / 設計師在後台建立一個具名的功能想法專案，並指定要改動的基礎 codebase 與 base branch。

#### Scenario: 成功建立想法專案
- **WHEN** 使用者填入標題、功能構想描述，並選擇 base repo（預設 `daodao-f2e`）與 base branch（預設 `main`）後送出
- **THEN** 系統建立想法專案，並從指定 base branch 切出一個隔離工作區（記錄 `branch_ref` 與 `base_commit`）
- **AND** 跳轉至該專案的對話與預覽頁

#### Scenario: 標題為空時拒絕建立
- **WHEN** 使用者未填標題即送出
- **THEN** 系統顯示驗證錯誤，不送出 API 請求

#### Scenario: 工作區與 main 隔離
- **WHEN** 系統建立想法專案的工作區
- **THEN** 工作區為從 base branch 切出的暫時性分支 / worktree
- **AND** 該工作區的改動不會被合併或 push 到 main，也不影響生產環境

---

### Requirement: 使用者可用自然語言描述功能構想
系統 SHALL 允許使用者用自然語言描述要發想的功能或改動，並支援同一專案的多輪對話。

#### Scenario: 初始描述觸發改動
- **WHEN** 使用者輸入「在實踐詳情頁加一個『相似實踐』推薦區塊」
- **THEN** 系統將訊息寫入該專案對話，並觸發 AI coding agent 在工作區進行改動

#### Scenario: 多輪迭代描述
- **WHEN** 使用者在看過預覽後輸入「推薦區塊改放在頁面右側，並加上縮圖」
- **THEN** agent 在同一工作區基於上一版增量改動，產生新版本
- **AND** 保留先前版本與其 diff、預覽不被覆寫

---

### Requirement: AI coding agent 以真實 codebase 為基礎做改動
系統 SHALL 由 AI coding agent 在隔離工作區內，基於 daodao 既有專案程式碼進行實際檔案改動，而非生成獨立於專案的樣板。

#### Scenario: agent 讀取並改動真實檔案
- **WHEN** agent 處理一個功能構想
- **THEN** agent SHALL 先探索相關既有元件、頁面與檔案，再對真實檔案產生 code diff
- **AND** 改動 SHALL 復用 daodao 既有元件與設計系統，而非重造通用元件

#### Scenario: 改動後自我檢查
- **WHEN** agent 完成檔案改動
- **THEN** 系統 SHALL 在工作區執行建置與靜態檢查（lint / typecheck / build）
- **AND** 將 `build_status` 與 `build_log` 連同 diff 一併保存為一個版本

#### Scenario: 建置失敗時的處理
- **WHEN** 改動後建置失敗
- **THEN** agent SHALL 嘗試在 budget（`max_iterations`）內自動修復
- **AND** 若仍失敗，版本標記為建置失敗並保留 `build_log`，回報使用者可繼續對話修正
- **AND** 建置失敗的版本不可被 publish 成分享連結

#### Scenario: agent 執行受 budget 與 guard 限制
- **WHEN** agent 在工作區執行 ReAct loop
- **THEN** 系統 SHALL 復用既有 sandbox runtime、`max_iterations`、dead-loop detection
- **AND** 記錄該版本的 `cost_usd` 與 `latency_ms`

---

### Requirement: 改動依架構脈絡 grounding
系統 SHALL 在 agent 改動前注入 daodao 既有架構脈絡（設計系統 token、元件目錄、頁面 / 路由結構、資料實體 schema），使原型貼近真實產品。

#### Scenario: 使用既有元件與設計 token
- **WHEN** agent 需要新增 UI
- **THEN** agent SHALL 優先使用元件目錄中既有的元件與設計 token
- **AND** 不得臆造不存在於 codebase 的元件

#### Scenario: 引用資料實體
- **WHEN** 功能構想牽涉資料呈現（如 practices / users / challenges / badges）
- **THEN** agent SHALL 依架構脈絡中的實體 schema 摘要構造 mock 資料形狀
- **AND** 不得連線生產資料庫或真實 API

---

### Requirement: 版本歷史可檢視與比較
系統 SHALL 保存每個想法專案的所有改動版本，使用者可檢視各版本的 diff、建置狀態與對應預覽。

#### Scenario: 檢視版本 diff
- **WHEN** 使用者選擇某一版本
- **THEN** UI 顯示該版本相對前一版（或 base）的 code diff、建置狀態與預覽連結（若建置成功）

#### Scenario: 回到先前版本繼續迭代
- **WHEN** 使用者選擇從某一較早版本繼續發想
- **THEN** 系統以該版本為基礎進行後續改動，不破壞中間版本的歷史紀錄

---

### Requirement: 採用版本可交棒為 AI 開發任務
系統 SHALL 允許使用者將任一建置成功的版本「交棒工程」，把原型改動打包成可供 AI coding agent 接手正式開發的任務。交棒為人工觸發，原型分支僅作唯讀參考，不自動合併、不針對原型分支開 PR。

#### Scenario: 從採用版本產生 AI 開發任務
- **WHEN** 使用者對某建置成功的版本點擊「交棒工程」
- **THEN** 系統 SHALL 建立一筆 handoff 記錄，並產生一個 GitHub issue 並掛上 `auto` label
- **AND** issue 內容 SHALL 包含：構想原文（對話脈絡）、該版本相對 base 的 code diff、原型分支 ref 與 `base_commit`、preview 連結、邊界註記（mock 資料範圍與待補項，如真實 API 接線 / 測試 / edge case）

#### Scenario: 原型分支作為唯讀參考、AI 另起乾淨分支
- **WHEN** 交棒建立 AI 開發任務
- **THEN** 系統 SHALL 將原型工作區分支以具命名空間的 ref（如 `feature-idea/<project>/<version>`）push 為唯讀參考
- **AND** SHALL NOT 針對該原型分支開啟 PR，也不自動合併至 main
- **AND** 接手的 AI agent SHALL 以原型為參考、另起乾淨分支進行正式實作並開啟自己的 PR

#### Scenario: 僅建置成功的版本可交棒
- **WHEN** 使用者嘗試對建置失敗的版本交棒
- **THEN** 系統拒絕，並提示僅能交棒建置成功的版本

#### Scenario: 交棒可追溯
- **WHEN** handoff 建立後
- **THEN** 系統 SHALL 在該版本記錄對應的 issue URL 與（若後續產生）PR URL
- **AND** 後台可由原型版本追溯到其衍生的開發任務與 PR
