<!-- gh-card draft — title: 開發流程回寫 Planning board 六欄狀態；退役 Routine C 與清理 Actions | repo: daodaoedu/daodao | labels: enhancement, scope:M, human-driving | board: Review -->
# 開發流程回寫 Planning board 六欄狀態；退役 Routine C 與清理 Actions

> 工程交接模板。這張卡是 2026-09-20 board 稽核的落地卡，同時追蹤同日執行的 board 校正與 Actions 清理。

schemaVersion: 1
templateVersion: 1

## 任務索引與責任

- 中央 Issue：daodaoedu/daodao#249 https://github.com/daodaoedu/daodao/issues/249
- 任務指派：xiaoxu（human-driving）
- Google 需求文件：無；需求來源為對話與稽核表 `docs/plans/board-audit-2026-09-20.md`、`docs/plans/actions-audit-2026-09-20.md`
- 核准需求快照：使用者於 2026-09-20 對話中確認兩項決策（merged 留 Review／冒煙過才 Done；稽核校正全部照建議執行）
- Acceptance snapshot：本卡驗收契約
- POC：不適用（無 UI）
- Drive 任務資料夾／驗收群組：不適用

## 目標與範圍

- 使用者問題：Planning #10 看不出哪些做完、哪些在做——沒有任何流程步驟移卡，Routine C 只認 `auto` label，人工開發的卡永遠停在 In Progress／Todo；board 六欄（含 Review／Need Fix）與程式、文件只認四欄不一致；退役 label 殘留。
- 完成後可觀察結果：PM 只看 board 即可追蹤——每張卡的 Status 對得上 issue 開關、PR 狀態；Review／Need Fix 卡有最新狀態 comment；`board.ts audit` 跑出 0 落差；無 no-op cron 消耗 API 額度。
- 包含：`bin/pipeline/board.ts`（set／remove／audit）與六欄常數；gh-card／dev-task／post-merge-wrapup 各補一步移卡；退役 Routine C；Branch Base Check 不在 root 重複跑；Product Status Drift 常紅修正；文件對齊與封存；board 一次性校正（移卡 13、關 #170、標 2 張 duplicate、移出 4 張報告卡、清 15 個死 label、11 張卡補狀態 comment）。
- 不包含：合併四支 required regression workflow；改 GitHub 內建 board workflow 目標欄位（API 不支援，需人工在設定頁確認「Pull request merged」→ Review）；Routine C 改造為合併＋驗收＋部署條件（已退役，不再改造）。
- 風險：無 UI／API／migration；CI 變更（刪 1 支 workflow、改 2 支）。
- 涉及 repo：僅 daodaoedu/daodao（root）。sub-repo 的 `branch-base-check.yml` 由 Sync Shared Config 在 merge 後自動同步。

## 驗收契約

| AC ID | Required | Given／When／Then | Repo | 測試資料／角色 | 必須證據 |
|---|---|---|---|---|---|
| AC-01 | yes | Given 任一中央卡，When 執行 `board.ts set <n> <status>`，Then board Status 變更並回讀一致；不在 board 會先加入 | daodao | 中央 issue | CLI 輸出「回讀 OK」 |
| AC-02 | yes | Given 校正後的 board，When 執行 `board.ts audit`，Then 回報 0 落差 | daodao | 全部 board 卡 | audit 輸出 |
| AC-03 | yes | Given dev-task start／finish、post-merge-wrapup 各 skill，When 依 SKILL.md 執行，Then 各自有明確的 board 移卡步驟（In Progress／Review／Done／Need Fix） | daodao | — | SKILL.md diff |
| AC-04 | yes | Given `pipeline-board-sync.yml` 已刪，When 過一小時，Then Actions 不再有 Routine C run | daodao | — | `gh run list --workflow pipeline-board-sync.yml` 無新 run |
| AC-05 | yes | Given root PR，When CI 跑，Then Branch Base Check job 顯示 skipped、Branch Guard 通過 | daodao | 本 PR | PR checks 頁 |
| AC-06 | yes | Given manifest 修正，When Product Status Drift 跑，Then 0 漂移、綠燈 | daodao | — | workflow run |
| AC-07 | yes | Given Review／Need Fix 共 11 張卡，When PM 打開卡片，Then 最新 comment 說明已合併 PR、現況、下一步 | daodao | #181 #184 #182 #188 #171 #154 #189 #148 #141 #150 #151 | comment 連結 |

- 環境／語系／瀏覽器：不適用（CLI + Actions）
- POC 容差與差異決策：不適用
- 真實後端驗證：不適用
- Done 條件：PR merged 到 main；AC-04～06 在 merge 後由 Actions 實跑證明；AC-01／02／07 已於 2026-09-20 執行完成

## 執行政策與狀態

- 模式／writer：local / claude
- 已授權範圍：daodaoedu/daodao root；board／issue 寫操作已於 2026-09-20 對話授權
- Merge：人工；人工驗收：pending
- Ready 缺項：none
- Run ID／狀態：不適用（人工 dev-task）
- Lease／額度／預算：未啟用
- 阻塞與下一步：PR 待開；merge 後跑 post-merge-wrapup 確認 AC-04～06，並請人工到 board 設定頁確認「Pull request merged」內建 workflow 目標欄位為 Review

## 跨 repo 交付索引

| Repo | 子 Issue | Base SHA | Head SHA | PR | 受驗後端 image／schema version | 狀態 |
|---|---|---|---|---|---|---|
| daodaoedu/daodao | 本卡 | 26e58e976a24c3d569d519880c8a13b11deab0b1 | 尚未產生 | 尚未開 | N/A（無後端） | branch `chore/board-status-workflow` 3 commits 本機完成，待 push |

- 驗收報告：`docs/plans/board-audit-2026-09-20.md`（含執行結果）、`docs/plans/actions-audit-2026-09-20.md`
- AC 結果：AC-01／02／07 pass（2026-09-20 本機／live 執行）；AC-03 pass（本 PR diff）；AC-04～06 not-run（待 merge）
- 回報同步狀態：pending
