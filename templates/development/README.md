# 開發與驗收文件範本

依據：[Issue 到開發、驗收與合併提案](../../docs/automation/issue-to-acceptance-workflow.md)。本目錄為可手動複製的 Markdown 範本；`schemaVersion` 與 `templateVersion` 是各模板的版本標記，不代表已有 JSON schema validator、文件生成器、Google 同步器或 merge gate。

## 使用順序

一般需求與 bug 的 labels、Board 狀態、父子／PR 關聯及關閉時機，統一依 [GitHub Issue 管理規範](../../docs/automation/github-issue-management.md)設定。

可用 `.claude/skills/gh-card/SKILL.md` 開卡（Claude `/gh-card`；Codex 專案入口 `.codex/skills/gh-card/SKILL.md`）。例如：「用 gh-card 根據這份需求開 Issue，先放 Todo」。skill 會讀本目錄模板、查重、發布與回讀；本目錄本身不執行自動化。

1. 描述想法、操作問題，或提供 Issue／PRD／FRD／POC／分支。使用 [prd-generation](../../.claude/skills/prd-generation/SKILL.md) 查核現況並以 [requirements-doc.md](requirements-doc.md) 起草一份 PRD；不要求提出者逐格填寫。既有 FRD 沿用原內容與 ID。
2. AI 先完成適用檢核、自審並修訂，交付草稿、檢核摘要、限制與待決策事項；人負責審核原意與產品取捨，不按角色分配檢查工作。AI 依審核意見修訂並重查受影響內容，每輪只補問一兩個關鍵決策。repo、技術版本與交接資訊由工具或開發補充，任務指派用 GitHub Assignees，不另填負責人表。
3. 已要求開卡時，由 gh-card 將同份需求摘要放入 [central-issue.md](central-issue.md)；跨 repo 且已要求拆卡才用 [subtask-issue.md](subtask-issue.md)。Todo 可保留缺項，需求確認不等於啟動開發。
4. 開發另補技術設計與任務；驗證結果使用 [acceptance-report.md](acceptance-report.md)，交付用 [pull-request.md](pull-request.md) 與 [issue-status-comment.md](issue-status-comment.md)。

操作異常改用 [file-bug-issue](../../.claude/skills/file-bug-issue/SKILL.md) 與 [bug-issue.md](bug-issue.md)：描述位置、操作、實際與期待結果，skill 起草並查核；不要求先知道 repo 或根因。Codex 對應入口位於 `.codex/skills/prd-generation/`、`.codex/skills/file-bug-issue/`。

建立／修改遠端 Issue、Google Docs、Drive 與 PR 仍依該次任務授權與專案流程。複製範本本身不會派工，也不代表已發布文件。

## 工程交接：來源與衍生資料

PRD（或既有 FRD）保存需求決策；確認後的同版需求／驗收 snapshot 是執行基準，工程文件引用它，不另訂需求。run manifest 與可核對事件是執行狀態來源。Issue、PR、Google 驗收報告與 `task.md` 都是閱讀投影，不另訂 AC。手動使用時從同一快照複製欄位並核對；將來生成器應取代這項人工同步，目前尚未實作。

需求與 POC 均保存 ID、版本或 modified time、匯出快照位置與 digest。所有受驗 repo 保存完整 base/head SHA；改動 SHA、base、規格或 POC 時重建 acceptance key，重新驗證受影響項目與簽核，不只替換報告上的 SHA。

額度依[專案政策](../../docs/automation/agent-budget-policy.md)填寫；目前方案為 Claude Max US$100／Codex Pro／Cloudflare Paid，這不代表每張任務有固定餘額。模板的狀態報告至少包含 Workers AI 已知或估算 Neurons、reset／stop reason 與是否允許付費 fallback。

## 工程模板填寫規則（由 skill／開發補充）

- 所有 `<...>` 必須替換；Todo 需求缺項填「待確認：原因／下一步」，執行階段受阻才填 `blocked`。Run、SHA、報告等開發後欄位在開卡時填「尚未開始／尚未產生」，不可留假值或要求開卡前先完成開發。
- 必填：中央 Issue ref、AC ID、契約版本／digest、執行與報告狀態（依階段補充）；開始執行後還需 run ID、版本 SHA map、證據索引與額度結果。
- AC 是驗收條件的統稱，沿用穩定 `FR-*`／`TP-*`／`AC-*`，多文件同 ID 以文件 ID 限定；子 Issue 只引用中央 AC，不另編同義條件。結果限 `pass / fail / blocked / not-run / n/a`，pass 必須附本版本證據。
- 不適用填 `n/a：<理由、適用範圍、判定人／依據>`。required AC 不可自行改 N/A；純後端 POC 等不適用範圍應在 Ready 前確認。沒有未完成項目明寫 `none`。
- Acceptance snapshot 直接填本卡驗收契約（路徑／URL 與契約版本）。OpenSpec 已於 2026-09-20 退役，模板不再有 `OpenSpec: <slug>` 行。
- 額度不可推估成已確認餘額；記錄 `available / exhausted / unknown / not-checked`、觀測時間、錯誤／下一步。用盡或 review 不可用填 blocked，保留成果，不預設付費 API fallback。
- 簽核記錄具權限的人、時間、acceptance key 與 GitHub record URL。文件自由文字、agent 勾選及 Google 評論不等同 merge 授權。
- Google Docs 可直接貼上內容；Drive 預設指定驗收群組。不可填 token、cookie、密碼、真實個資；截圖與 payload 去敏。報告發布後核對驗收者能讀取。

## 與 benchmark 的關係

參考 [Harness-Governed Generation](../../docs/research/harness-governed-generation-benchmark.md) 的薄 spec＋厚 gate：PRD 保留產品行為、必要約束與驗收，開發文件承接架構設計，驗收報告提供證據。共用 schema／API 定義以連結引用；不因計畫新增 gate 就刪除尚無驗證覆蓋的需求。本次調整模板與 skill，不表示研究文中的所有 gate 已實作。

## 與既有 auto 範本的關係

[issue-template-auto.md](../issue-template-auto.md) 保留既有 Notion／Routine A 管理欄位與 marker；本目錄不替換它，也不假設目前 pipeline 已解析新欄位。導入前另做相容性改造與測試，不能盲改 `notion-id`、managed marker、Target Repo 或派工格式。自動派工 Routine A／B 已於 2026-09-20 退役（#241），`bin/pipeline/lib.ts` 只剩 Routine C 用的 `Parent:`／closing-keyword parser；`auto` label 不再使用，Ready 只是管理狀態。
