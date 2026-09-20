---
name: gh-pipeline
description: "島島阿學 Planning Board 狀態操作與稽核：六欄語意、bin/pipeline/board.ts set／remove／audit、內建 workflow 限制與除錯。"
---

# gh-pipeline（Codex 入口）

完整讀取 [canonical skill](../../../.claude/skills/gh-pipeline/SKILL.md) 及 [共用交接規則](../../../docs/automation/ai-human-review-workflow.md)。本入口只負責導向，不複製完整流程。連結以各文件所在目錄解析；若依賴或工具不可用，標記限制，不假稱檢查完成。沿用對話授權，無額外發布或派工權限。

註（2026-09-20）：自動派工 Routine A／B（#241）與 Routine C 皆已退役，沒有任何 cron；board 狀態由 gh-card／dev-task／post-merge-wrapup 呼叫 `bin/pipeline/board.ts` 寫回。舊文件封存於 `docs/archive/automation/`。
