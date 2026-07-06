# Pipeline Evals

> **自動 evals 尚未實作。** 目前以 `pnpm tsx bin/pipeline-status.ts` 的輸出與 PR merge 率**人工檢視**。
> 待自動化實作後再更新此文件（屆時應同步更新 [README.md](README.md) 索引）。

## 人工檢視指標

| 指標 | 說明 | 資料來源 |
|---|---|---|
| Per-scope merge 率 | scope:XS/S/M/L PR 在 7 天內 merged 的比率 | `gh pr list` + labels |
| Failure 分類 | verify.sh exit 4/5 原因、human takeover、spec rejected | issue comments / `human-coding` label |
| 人介次數 | per-issue intervention count（定義見 [troubleshooting.md#intervention-definition](troubleshooting.md#intervention-definition)） | issue/PR timeline |
| Pipeline 即時狀態 | 各 issue 所在階段、卡住的卡 | `pnpm tsx bin/pipeline-status.ts` |
