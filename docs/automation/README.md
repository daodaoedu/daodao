# docs/automation — 自動化 Pipeline 文件索引

這個目錄包含 **GitHub Board → Issue → Plan → PR** 自動化 pipeline 的操作與維護文件。

> 2026-08 起任務管理層由 Notion DB 遷移到 GitHub org Project「Planning」+
> daodaoedu/daodao 中央 issues，Notion 完全退場。

## 文件索引

| 文件 | 說明 |
|---|---|
| [github-pipeline.md](github-pipeline.md) | **新架構總覽**（mermaid 流程圖 + 角色分工 + label 體系） |
| [routine-a-prompt.md](routine-a-prompt.md) | Routine A：Board → Sub-repo Dispatch（**Actions script** 運維手冊） |
| [routine-b-prompt-v2.md](routine-b-prompt-v2.md) | Routine B：Dispatch + PR patrol（**Claude cloud routine** prompt） |
| [routine-c-prompt.md](routine-c-prompt.md) | Routine C：Merged PR → Board Done（**Actions script** 運維手冊） |
| [troubleshooting.md](troubleshooting.md) | 常見 failure modes、log 位置、人工介入定義 |
| [manual-issue-to-routine.md](manual-issue-to-routine.md) | 人類手寫 issue 反向丟給 routine 的 step-by-step 指南 |
| [pipeline-status.md](pipeline-status.md) | Pipeline 即時狀態（自動產生） |
| [evals.md](evals.md) | Weekly 評估指標（自動產生） |
| [spec-drafter-spike.md](spec-drafter-spike.md) | Actions + Workers AI 自動起草最小 OpenSpec 的 spike 結果與正式化建議 |
| [review-false-positive-research.md](review-false-positive-research.md) | AI code review 誤判：知識庫解不了的三個問題的文獻對照與落地順序（#168／#169） |
| [../../.github/review-knowledge/README.md](../../.github/review-knowledge/README.md) | 誤判知識庫：樣態 A–F、記錄方式、本機 skill 與 CI 共用機制 |
| [architecture.md](architecture.md) | ⚠️ 舊版 Notion pipeline 架構（僅供考古） |

## High-Level 介紹

Product 在中央 repo [daodaoedu/daodao](https://github.com/daodaoedu/daodao/issues)
開 feature issue 並掛上 [Planning board](https://github.com/orgs/daodaoedu/projects/10)。
卡片標記 `Status=Ready for Dev` + `auto` label 後，Routine A 自動 dispatch 成
sub-repo 鏡像 issue，Routine B 接力 plan、code、開 PR 直到送上人類 review，
Routine C 把 merge 結果回寫 board。

**兩道閘門**：board `Status=Ready for Dev` + 中央 issue `auto` label 都滿足才 dispatch。

**Spec gate**：中央 issue 需註記 `OpenSpec: openspec/changes/{slug}/`，否則標 `needs-spec` 退回。

**8 個 sub-repo**：`daodao-server`、`daodao-f2e`、`daodao-ai-backend`、`daodao-storage`、`daodao-admin-ui`、`daodao-infra`、`daodao-mcp`、`daodao-worker`。

**高風險 repo**：`daodao-storage`（SQL migration）與 `daodao-infra`（IaC）強制 plan-only，永遠不自動開 PR。

詳見 [github-pipeline.md](github-pipeline.md)。
