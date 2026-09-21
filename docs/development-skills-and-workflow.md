# Skills 與開發流程

> 註（2026-09-20）：OpenSpec 已退役（#237），舊 `openspec/` 已封存於 `docs/archive/openspec/`；同日退役自動派工 Routine A／B（#241）與 Routine C；board 狀態由各 skill 呼叫 `bin/pipeline/board.ts` 寫回。規格以 docs/product 與 Issue 驗收契約為準。

更新：2026-09-19。本文件是入口導覽；細節以各 skill、AGENTS 與當下程式為準。共用規則見 [AI 檢核與人工審核](automation/ai-human-review-workflow.md)。

## 使用方式

人提供問題、來源或要完成的工作；AI 查核、產出、自審與修訂，再交人審核原意和決策。每次交接包含成果、主要依據、未驗證限制與待決策，不要求人按職稱重新分析。

| 階段 | Skill | AI 先完成的工作 | 人審核的內容 |
|---|---|---|---|
| 需求 | prd-generation、product-status-check | 讀來源、對照現況、補流程規則與驗收、自審草稿 | 原意、範圍及產品取捨 |
| Bug | file-bug-issue | 整理現象、查現況與重複卡、區分事實與推測 | 問題描述與預期行為 |
| 開卡／拆任務 | gh-card、publish-tasks | 同版需求到任務對照、相依、查重與發布預覽 | 工作範圍與尚未授權的發布／啟動 |
| 開發 | dev-task | 隔離工作目錄、技術規劃、實作、適用測試與自審修正 | 未決產品行為及必要例外 |
| 驗收 | dev-task verify | 逐原 FR／TP／AC 驗證、POC 差異、核心旅程矩陣（含錯誤路徑 HTTP 碼）、Google 文件報告 | 結果、POC 差異決策與未解差異是否可接受 |
| 提交 | pre-commit-check、format-commit | 依實際變更檢查、修正、產生 commit 範圍與訊息 | 按 AGENTS 確認具體提交 |
| 審查 | code-review、collect-pr-feedback | 查證 findings、修正已授權問題、重跑受影響驗證 | 產品取捨、剩餘風險及新增範圍 |
| 通知 | notify-related-issue | 核對 PR／Issue 狀態、草擬有證據的更新、查重 | 尚未授權的留言／關閉操作 |
| 合併收尾 | post-merge-wrapup、dev-task cleanup | 核實全部 repo merged、dev 冒煙、文件校準、清理前檢查 | 冒煙結果、未決完成範圍及必要清理授權 |
| board | gh-pipeline | Planning board 六欄語意、`bin/pipeline/board.ts set／remove／audit`、內建 workflow 限制 | 卡片狀態不對、想找哪些卡漏移 |

## 四平台的 skill 來源

上述 13 個 skill 的完整規則只有一份，在 `plugin/skills/<name>/SKILL.md`；四個平台的檔案都是 `pnpm plugin:build` 的產物：Claude Code 直接載入 `plugin/`，Codex 與 ChatGPT 桌面版讀 `.agents/skills/`，ChatGPT 網頁／行動版讀 `plugin/out/openai-plugin/`，Claude.ai 上傳 `plugin/out/claude-ai/` 打包的 zip（只收 7 個不需要 checkout 的流程）。安裝方式、能力落差與查證依據見 [plugin/README.md](../plugin/README.md)。子專案仍需讀其 AGENTS／CLAUDE 與實際 scripts。行銷、營運及寄信 skill 不屬於本次開發流程覆蓋。

Codex 有自己的 hooks（`.codex/hooks.json`，與 Claude Code 指向同一批腳本），但**首次使用要先 `/hooks` 信任**才會觸發；沒信任就等同沒有閘門，須主動執行相同檢查並保留輸出。ChatGPT 與 Claude.ai 沒有閘門機制，一律由 skill 內文逐項執行。工具不可用標限制；缺少獨立 agent 不把自審冒稱獨立 review。檔案存在不證明各客戶端端到端實測通過。

## 文件與執行基準

新需求只維護一份 PRD，既有 FRD 不必改名。保留 FR／TP／AC ID，多文件同 ID 加文件 ID；需求定稿後保存可回溯版本。task.md 是任務狀態入口及同版驗收投影，技術文件描述實作決策，報告記錄證據，不另發明驗收條件。

小變更可用已確認 Issue 驗收條件；大型變更補必要技術設計與任務，不固定要求另一份 FRD。本流程不依賴 OpenSpec skills；自動派工 pipeline 已退役，不再有 runner 讀 issue body 的 marker，Ready for Dev 只是管理狀態。

## 閘門（2026-09-19 起）

發 PR 由 `plugin/hooks/pre-pr-gate.sh` 攔：Status 未 `verified`、POC 比對缺、核心旅程矩陣缺或有 ⬜／❌、Deferred item 無子 issue、PR body 無「## 驗證證據」、前端手寫 `pattern` 編不過、「## 驗證」留未勾項目或「需要手動驗證」清單、UI repo 缺全 ✅ 的「### 版面探針」表（`references/layout-probe.mjs`）。CI 側 `pr-evidence-gate` 讀同一段（advisory，可升 block）。規則與升級策略見 `plugin/hooks/ADR-0001-gates-over-guidelines.md`；各階段細節見 `docs/workflow.md` Phase 3、6–8。跨 repo 子 PR 用 `Refs` 不用 `Closes`，中央卡由冒煙通過後手動關。

## 工作區與完成界線

開發由 dev-task 使用隔離 worktree；保留來源 checkout、staged 與未提交差異。授權範圍內 AI 先修正可查明問題；commit／push／發布／Ready／merge／部署依現有授權及 AGENTS 執行，不因 skill 已檢核就自動擴權。

程式存在、測試通過、PR 合併、部署及使用者實際可用各需對應證據。中央需求跨 repo 或驗收未完成時不得只因單一 PR merged 就關閉。

本次完成入口與文件流程整合；未改造部署同步器，也未執行遠端發布或兩客戶端完整實測。
