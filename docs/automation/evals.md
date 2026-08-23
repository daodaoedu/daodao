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
- Reviewer producer 必須為每個 PR head 建立不可變的 finding snapshot，
  comment 同時帶 `<!-- daodao-ai-code-review -->` 與
  `<!-- daodao-ai-code-review-head:<40-char-lowercase-sha> -->`。新 head 必須
  POST 新 comment；只有同 head 重跑可 PATCH 該 snapshot。
- Consumer 只在 lookback 內的 bot snapshots 中，依 `updated_at` 取最新且
  含 findings 的一則。後來的 clean snapshot 不會把前一個 finding
  snapshot 的回饋窗口抹掉。
- `replied` 只計 PR author 在 review 後的 issue comment；inline review thread
  與第三方留言不計入。
- `fixed` 是 proxy：consumer 在 PR commits 陣列找到 snapshot head，並把
  它之後的 commits 當作候選修正；若其中有 commit 碰過被點名的檔案，
  就視為已修復。這不依賴 `committedDate`，但仍不能證明具體問題真的被修復。
  snapshot head 不在 PR commits 中時，該 PR 會警告並跳過，避免產生不準數據。

### Rollout dependency

必須先合併並部署 producer 的 per-head snapshot 合約，再啟用這個
consumer；root 與各 sub-repo 的 `code-review.yml` 都要先能產生上述
generic + head markers。若 consumer 先上線，舊 producer 的 comments 會全被拒絕，
weekly row 將誤寫為零；這種零值不得解讀為「沒有 findings」。

## 待辦：免費 reviewer 模型同場評測

目前的本機 reviewer 預設只代表「已測試可用」，尚未經足以證明最佳的
重複同場評測：OMP 使用 `openrouter/poolside/laguna-s-2.1:free`，OpenCode
使用 `opencode/hy3-free`；Codex CLI 的目前預設模型作為品質基準，不列入
免費模型排名。

- [ ] 評測開始時保存 OpenRouter 與 OpenCode Zen 的即時免費模型清單，排除已下架、付費或浮動 alias。
- [ ] 所有候選共用同一份 committed diff 與 Context Pack；每個 fixture 先 warm-up 一次，再正式執行至少五次。
- [ ] 覆蓋 seeded finding、decoy、clean 與截斷邊界案例，並以真實 PR patch 補充驗證。
- [ ] 記錄 finding recall、precision、clean pass、schema 解析成功率、timeout／錯誤率、p50／p95 延遲與多次輸出穩定性。
- [ ] 主模型硬門檻為 5/5 可解析且不 timeout；clean fixture 不得產生 High／Medium 誤報，也不得捏造 diff／Context Pack 外的事實。
- [ ] 將完整結果與選型理由寫回本文件後，才調整 `code-review` skill 的 OMP／OpenCode 預設模型。
