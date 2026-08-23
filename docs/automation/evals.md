# Pipeline Weekly Evals

> AI review 接受率區塊由
> [review-evals.yml](../../.github/workflows/review-evals.yml) 每週執行
> `pnpm tsx bin/pipeline/review-evals.ts` 更新，commit 含 `[skip ci]`。
> Cross-repo fine-grained PAT 只需在目標 repos 開啟 `Contents: read`、
> `Issues: read` 與 `Pull requests: read`；workflow 的 `GITHUB_TOKEN`
> 僅用於寫回本 repo 的週報。

## 指標說明

| 指標 | 說明 |
|---|---|
| Per-scope merge 率 | scope:XS/S/M/L PR 在 7 天內 merged 的比率 |
| Failure 分類 | CI fail / context overflow / token overrun / human takeover / dedup race / spec rejected / judge dissent |
| Token cost | per-PR token 使用量（p50 / p95 / p99） |
| 人介次數 | per-issue intervention count（定義見 [troubleshooting.md#intervention-definition](troubleshooting.md#intervention-definition)） |
| Council dissent rate | reviewer-agent 與 writer-agent 分歧率（5%~30% 為健康區間） |

_（既有 pipeline 指標尚無資料；AI review 接受率會由 weekly workflow 另加表格。）_

## AI review 接受率的判定邊界

- 只統計 `github-actions[bot]` 寫入、且帶有
  `<!-- daodao-ai-code-review -->` marker 的 PR issue comment。
- Reviewer 會更新同一則 comment，所以 commit 與回覆的比較基準是
  comment 的 `updated_at`，不是第一次建立時的 `created_at`。
- `replied` 只計 PR author 在 review 後的 issue comment；inline review thread
  與第三方留言不計入。
- `fixed` 是 proxy：若 GitHub 的 commit `committedDate` 晚於 review，且該
  commit 碰過被點名的檔案，就視為已修復。這不能證明具體問題真的被修復，
  也可能漏掉「本機早已 commit、review 後才 push」的情況。
