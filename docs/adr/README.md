# 架構決策紀錄（ADR）

daodao 自動化 pipeline 的關鍵架構決策。每份 ADR 記錄一個決策的背景、內容與後果，
取代舊 plan 文件的 §N 引用。

## 索引

| ADR | 標題 | 狀態 |
|---|---|---|
| [001](001-high-risk-repos-plan-only.md) | 高風險 repo 強制 plan-only | 已採用 |
| [002](002-tracked-vs-auto-labels.md) | `tracked` 與 `auto` label 語意分離 | 已採用 |
| [003](003-merge-sets-review-not-done.md) | Merge 只推到 Review，Done 由人類收尾 | 已採用 |
| [004](004-monotonic-notion-status.md) | Notion Status 單向推進、永不倒退 | 已採用 |
| [005](005-ticket-mode-v3.md) | v3 工單模式：腳本驅動取代 v1/v2 | 已採用 |
| [006](006-scope-caps-replace-token-budget.md) | 檔案數/diff 行數上限取代 token budget | 已採用 |
| [007](007-spec-prs-in-monorepo.md) | Spec PR 集中在 monorepo，用 Spec-For 標記 | 已採用 |
| [008](008-config-ssot.md) | `bin/pipeline.config.json` 為單一事實來源 | 已採用 |

## 格式

每份 ADR 含四節：**狀態**（已採用/已棄用/被取代）、**背景**（為什麼需要決策）、
**決策**（決定了什麼）、**後果**（好處、代價、後續影響）。
