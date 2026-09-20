---
name: gh-pipeline
description: "查核並操作島島阿學 Planning Board 回寫 pipeline（Routine C：merged PR → Board Done），含 board-sync dry-run 與除錯。"
---

# gh-pipeline（Codex 入口）

完整讀取 [canonical skill](../../../.claude/skills/gh-pipeline/SKILL.md) 及 [共用交接規則](../../../docs/automation/ai-human-review-workflow.md)。本入口只負責導向，不複製完整流程。連結以各文件所在目錄解析；若依賴或工具不可用，標記限制，不假稱檢查完成。沿用對話授權，無額外發布或派工權限。

註（2026-09-20，#241）：自動派工 Routine A／B 已退役，pipeline 只剩 Routine C（`bin/pipeline/board-sync.ts` + `pipeline-board-sync.yml`）；舊文件封存於 `docs/archive/automation/`。
