# daodao root GitHub Actions 稽核（2026-09-20）

> 來源：`gh run list --limit 1000`（涵蓋 2026-09-09 起）、workflow 檔、run log。#243 已 merge：Routine A（pipeline-dispatch）、`_deploy`、`review-evals`、`spec-drafter-spike` 四支已刪，run 歷史裡的「Reusable Deploy Pipeline」「AI Review Weekly Evals」是它們的殘影；「Dependabot Updates」是 GitHub 內建安全更新（repo 無 dependabot.yml），不算 workflow。
> main 的 ruleset required checks：`test-integrity`、`pack-regression`、`scorer-regression`、`regression`。

| Workflow | 觸發 | 近 30 天 | 判斷 |
|---|---|---|---|
| **Pipeline Routine C**（pipeline-board-sync） | 每小時 cron | 259 次，**60/60 抽樣全是 `no central cards to update`** | **退役**。只認 `auto` label PR，Routine A 退役後輸入為零；每小時用同一顆 PAT 打 board／8 repo PR list，吃掉使用者的 5000/hr GraphQL 額度（今天 Sync Shared Config 就是 rate limit 掛的）；board 回寫已改由 skill + `board.ts`。 |
| **Branch Base Check** | 每 PR | 64 | **root 上重複**。它是 sync 到 8 個 sub-repo 的共用範本，root 自己另有 Branch Guard（`pull_request_target` + trusted script + regression）跑同一套規則。留檔當 sync 來源，但 job 加 `if: github.repository != 'daodaoedu/daodao'` 不在 root 跑。 |
| Branch Guard | 每 PR（`pull_request_target`） | 69 | 保留。 |
| Branch Guard Regression | PR，path-filtered | 少 | 保留。 |
| **Product Status Drift** | PR(paths) + 每週一 + Discord | **5/5 fail** | **壞的**。`island-2d-spatial` 宣告 `partial` 但 3 個 signal 檔全不存在（f2e／server 缺檔、workflow 沒 checkout daodao-worker → `repo-missing`）→ 每週一固定丟 Discord 警告，PR 上也紅。修法：manifest 改 `declared: planned`（POC 未落地）＋ workflow 補 checkout daodao-worker；不修就該關掉，紅燈看久了會被無視。 |
| Auto PR Description（Workers AI） | 每 PR | 33 | 低價值但無害。dev-task 發的 PR 都有「## 驗證證據」→ 直接 skip；只對手寫 PR 生描述。保留。 |
| Code Review（Workers AI） | 每 PR | 58 | 保留（collect-pr-feedback 的輸入之一）。 |
| PR Evidence Gate | 每 PR，`warn` 模式 | 26 | 保留（#225 剛上線，升 block 待定）。 |
| Test integrity / Spec Audit Pack / Skill eval scorer / Shared Config Regression | 每 PR | 各 ~50 | 保留，四支都是 required check、各 20–40 秒 python unittest。合併成一支可省 3 次 checkout + setup，但 required check 名稱要跟著改 ruleset，低優先。 |
| Sync Shared Config | push main(paths) + 每週一 | 16/19 | 保留。3 次 fail：2 次 rate limit（今日）、1 次等 required checks timeout；非邏輯錯。 |

## 建議動作

1. 退役 Routine C：刪 `pipeline-board-sync.yml`、`bin/pipeline/board-sync.ts`、`listMergedAutoPRs`／`searchIssuesByParent`／`parseClosingIssues`／comment builders 與對應測試；`gh.ts`／`lib.ts`／`types.ts` 只留 `board.ts` 用到的部分；gh-pipeline skill 改為只描述 board.ts；`docs/automation/routine-c-prompt.md`、`github-pipeline.md` 封存到 `docs/archive/automation/`。
2. Branch Base Check 加 repo 條件，root 只跑 Branch Guard。
3. Product Status Drift：manifest `island-2d-spatial` → `planned`，workflow 補 checkout `daodao-worker`。
4. 其餘不動。
5. （已做）board 內建「Pull request merged」workflow 目標 Done → Review，於設定頁手動改。
