# docs/automation — 自動化 Pipeline 文件索引

這個目錄包含 Notion → GitHub Issue → Plan → PR 自動化 pipeline 的操作與維護文件。

## 文件索引

| 文件 | 說明 |
|---|---|
| [architecture.md](architecture.md) | Pipeline 架構總覽（ASCII 圖 + 元件說明） |
| [troubleshooting.md](troubleshooting.md) | 常見 failure modes、log 位置、人工介入定義 |
| [manual-issue-to-routine.md](manual-issue-to-routine.md) | 人類手寫 issue 反向丟給 routine 的 step-by-step 指南 |
| [pipeline-status.md](pipeline-status.md) | Pipeline 即時狀態（自動產生） |
| [evals.md](evals.md) | Weekly 評估指標（自動產生） |

## High-Level 介紹

本 pipeline 將 Notion 任務 DB 中標記為「可開發」的卡片自動同步為 GitHub sub-repo issue，再由 Claude Code routine 接力做 plan、code、開 PR，直到送上人類 review。

**兩道閘門**：Notion 端 `Status=Ready for Dev` + `Sync to GitHub=true` 兩個條件都滿足才觸發同步。

**8 個 sub-repo**：`daodao-server`、`daodao-f2e`、`daodao-ai-backend`、`daodao-storage`、`daodao-admin-ui`、`daodao-infra`、`daodao-mcp`、`daodao-worker`。

**高風險 repo**：`daodao-storage`（SQL migration）與 `daodao-infra`（IaC）強制 plan-only，永遠不自動開 PR。

詳見 [architecture.md](architecture.md)。
