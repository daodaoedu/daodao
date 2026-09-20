# docs/automation — 自動化 Pipeline 文件索引

> **退役註記（2026-09-20）**：自動派工 Routine A／B（#241）與 merge 回寫 Routine C 皆已退役，沒有任何 cron；board 狀態由 gh-card／dev-task／post-merge-wrapup 呼叫 `bin/pipeline/board.ts` 寫回（見 [gh-pipeline skill](../../.claude/skills/gh-pipeline/SKILL.md)）；舊 prompt 與模板封存於 [../archive/automation/](../archive/automation/README.md)。OpenSpec 已於 #237 退役（`docs/archive/openspec/`）。下文仍提到 Routine A／B 的文件屬歷史提案或設計審查，不是現行指示。

這個目錄包含 **GitHub Board／Issue／PR** 自動化與開發流程的操作與維護文件。

> 2026-08 起任務管理層由 Notion DB 遷移到 GitHub org Project「Planning」+
> daodaoedu/daodao 中央 issues，Notion 完全退場。

## 文件索引

| 文件 | 說明 |
|---|---|
| [github-issue-management.md](github-issue-management.md) | **Issue 管理規範**：需求／bug 欄位、labels、Board 狀態、父子與 PR 關聯、關閉時機及現有自動化落差 |
| [development-workflow-diagrams.md](development-workflow-diagrams.md) | **Mermaid 圖解入口**：目前完成度、Issue／PR 文件分工、雙入口開發、驗收與回寫，以及導入順序 |
| [issue-to-acceptance-workflow.md](issue-to-acceptance-workflow.md) | **目標流程提案**：Issue／Google Docs／Drive、雙入口開發、瀏覽器與後端驗收、merge gate、Issue 自動回寫 |
| [agent-budget-policy.md](agent-budget-policy.md) | Claude Code／Codex 訂閱與 Workers AI 分工、預算保留、限額與失敗處理提案 |
| [開發文件模板](../../templates/development/README.md) | 可複用的中央／子 Issue、需求文件、驗收報告、PR 與狀態回寫格式 |
| [github-actions-design-review.md](github-actions-design-review.md) | GitHub Actions 現況審查、風險證據與雙訂閱 agent 導入 gate（2026-09 審查快照；Routine A／review-evals 段落已退役） |
| [dual-subscription-agents-prd.md](dual-subscription-agents-prd.md) | Claude Code + Codex 訂閱雙 agent 自動化 PRD（提案；所依賴的 Routine A／B 已退役，導入前需重新設計 dispatch） |
| [dual-subscription-development-workflow.md](dual-subscription-development-workflow.md) | 雙訂閱 agent 的 v2 開發流程、Harness、Runner、Artifact 與分階段落地規劃（提案；Routine A／B 已退役） |
| [troubleshooting.md](troubleshooting.md) | board.ts 除錯、人工介入定義 |
| [evals.md](evals.md) | Weekly 評估指標（歷史快照；`review-evals` 週報已停） |
| [../archive/automation/](../archive/automation/README.md) | 已退役：Routine A／B 運維手冊與 prompt、manual-issue-to-routine、spec-drafter spike、gh-pipeline agentic flows／templates |
| [review-false-positive-research.md](review-false-positive-research.md) | AI code review 誤判：知識庫解不了的三個問題的文獻對照與落地順序（#168／#169） |
| [../../.github/review-knowledge/README.md](../../.github/review-knowledge/README.md) | 誤判知識庫：樣態 A–F、記錄方式、本機 skill 與 CI 共用機制 |
| [architecture.md](architecture.md) | ⚠️ 舊版 Notion pipeline 架構（僅供考古） |

## High-Level 介紹

Product 在中央 repo [daodaoedu/daodao](https://github.com/daodaoedu/daodao/issues)
開 feature issue 並掛上 [Planning board](https://github.com/orgs/daodaoedu/projects/10)。
開發由人工 `/dev-task` 在隔離 worktree 進行（start 時自動掛 `human-driving`），
PR 開了由 `/dev-task` finish 移 Review；合併後 `/post-merge-wrapup` 依 dev 冒煙結果移 Done（內建 workflow 順手 close issue）或 Need Fix。

**沒有自動派工**：`Ready for Dev` 只是管理狀態；`auto`／`auto:*`／`needs-spec`／`dispatched` 等 labels 不再使用（保留不刪）。

**8 個 sub-repo**：`daodao-server`、`daodao-f2e`、`daodao-ai-backend`、`daodao-storage`、`daodao-admin-ui`、`daodao-infra`、`daodao-mcp`、`daodao-worker`。

**高風險 repo**：`daodao-storage`（SQL migration）與 `daodao-infra`（IaC）一律人工開發。

詳見 [github-pipeline.md](github-pipeline.md)。
