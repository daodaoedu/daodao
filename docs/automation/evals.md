# Pipeline Weekly Evals

> **此檔案將由 weekly cron 自動產生（v2 範圍）。**
>
> 自動更新排程：`pnpm tsx bin/evals-snapshot.ts`（每週執行，commit 含 `[skip ci]`）。

<!-- AUTO-GENERATED BELOW — DO NOT EDIT MANUALLY -->

## 指標說明

| 指標 | 說明 |
|---|---|
| Per-scope merge 率 | scope:XS/S/M/L PR 在 7 天內 merged 的比率 |
| Failure 分類 | CI fail / context overflow / token overrun / human takeover / dedup race / spec rejected / judge dissent |
| Token cost | per-PR token 使用量（p50 / p95 / p99） |
| 人介次數 | per-issue intervention count（定義見 [troubleshooting.md#intervention-definition](troubleshooting.md#intervention-definition)） |
| Council dissent rate | reviewer-agent 與 writer-agent 分歧率（5%~30% 為健康區間） |

_（尚無資料，等待 bin/evals-snapshot.ts 初次執行）_
