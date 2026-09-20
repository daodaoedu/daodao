# Planning Board #10 稽核（2026-09-20）

> 來源：`gh project item-list 10` + GraphQL issue timeline（sub-issues、cross-referenced PR）。56 張卡全為 `daodaoedu/daodao` 中央 issue。
> Board Status 實際有六欄：Todo 33 / Ready for Dev 0 / In Progress 8 / Review 1 / Need Fix 3 / Done 11。
> `bin/pipeline/types.ts` 只映射四欄（缺 Review `f25bace1`、Need Fix `bb831d2b`）。

## 根因：沒有任何流程步驟會移卡

| 階段 | 現況 | 結果 |
|---|---|---|
| gh-card 開卡 | 設 Todo ✓ | — |
| dev-task start | 只加 `human-driving` label，不移 In Progress | 卡留在 Todo（#189、#218） |
| dev-task finish 開 PR | 不移卡 | 沒有「等 review／等驗收」訊號 |
| PR merged | 靠 Routine C，但它只認 `auto` label + `Closes #n`；人工流程依 docs/workflow.md 用 `Refs` | **人工開發的卡永遠不會到 Done**，停在 In Progress |
| dev-task cleanup | 應移除 `human-driving`，實際沒做 | Done 卡還掛 `human-driving`（#138/#152/#167/#190） |
| 驗收退回 | 無定義；有人手動用 Need Fix | 語意不明 |

## A. 狀態與實況不符

| # | Board | 實況 | 建議 |
|---|---|---|---|
| 138 共同挑戰 | In Progress，**issue 已 closed** | 6 PR merged（08~09 月）；子卡 #181/#182/#183/#184 仍 open | 移 Done；子卡各自追蹤 |
| 181 共同挑戰卡片調整 | In Progress | f2e#973 merged 09-05，之後無活動 | 移 Review（待驗收）|
| 184 共同挑戰頁面顯示 | In Progress | f2e#978 merged 09-05 | 移 Review |
| 182 加入挑戰視窗顯示不完整 | Todo | f2e#974 merged 09-05 | 移 Review |
| 188 無法建立場次 | In Progress | f2e#990 merged 09-10 | 移 Review |
| 171 Lighthouse 建立系列&場次 | In Progress | f2e#980 merged；唯一子卡 #188 已 merged | 移 Review |
| 154 群組訊息 | In Progress | f2e#984、server#457 merged 09-08 | 移 Review |
| 189 Lighthouse 動態／成果／模版庫 | **Todo** + human-driving | 5 repo PR 全 merged 09-19 | 移 Review |
| 210 資源連結超出格子 | Todo | f2e#1008 **open** | 移 In Progress |
| 241 退役派工 | In Progress | PR #243 open | 移 Review |
| 166 首頁「設定」修改 | In Progress | 多 PR merged，今天仍有衍生卡（#233 Done、#239/#240 Todo） | 維持 In Progress |
| 141 / 150 / 151 | Need Fix | 首輪 PR 08 月 merged；驗收退回後新開子 bug（#210–214、#201）在 Todo | 維持 Need Fix；定義為「驗收退回、待修正」 |
| 148 我的足跡 | Review | 1/3 子卡 close（#163、#165 open 在 Todo）自 08-23 未動 | 維持 Review；子卡若不做則決定關卡 |

## B. 過期／重複卡

| # | 問題 | 建議 |
|---|---|---|
| 170 Spec Drafter（OpenSpec） | OpenSpec 已於 #237 退役 | close + `wontfix` |
| 219 vs 216 修正 admin email 模板 | 同名重複，兩張都 Done | #219 標 `duplicate` |
| 180 vs 179 無法建立共同挑戰 | 同名重複，兩張都 Done | #180 標 `duplicate`（#180 是 #138 子卡，保留關聯） |
| 1 / 172 / 185 / 200 [Review 彙整] | 是報告不是工作卡，佔 Todo | 從 board 移除（issue 保留）|
| 173 [暫緩] 一般使用者建立活動課程 | 標題已寫暫緩 | 維持 Todo，移除 `needs-spec` |

## C. Label 清理

| Label | 掛在 | 建議 |
|---|---|---|
| `needs-spec`（已無意義） | #138 #150 #151 #152 #154 #166 #167 #171 #173 #174 | 整批移除 |
| `human-driving` 掛在 Done 卡 | #138 #152 #167 #190 | 移除 |
| `human-coding`（Routine B 時代） | #151 | 移除 |

## D. 提案：六欄語意 + 流程掛鉤

| Status | 進入條件 | 誰移 |
|---|---|---|
| Todo | 開卡預設 | gh-card |
| Ready for Dev | PRD／AC 定稿、可開工（選用，允許空） | 人工 |
| In Progress | 有 worktree／branch 在跑 | dev-task start（同時加 `human-driving`）|
| Review | PR 已開；merged 後仍留此欄直到驗收 | dev-task finish |
| Need Fix | 驗收退回或 review 要求改；開修時回 In Progress | 人工／collect-pr-feedback |
| Done | 全部 PR merged + 驗收通過；close issue、移除 `human-driving` | post-merge-wrapup |

實作項：
1. `bin/pipeline/types.ts` 補 Review／Need Fix option id；新增 `bin/pipeline/board.ts` CLI（`set <issue#> <status>`、`audit` 印本表）。
2. dev-task SKILL start／finish／cleanup 各加一步；gh-card、post-merge-wrapup、collect-pr-feedback 補對應步。
3. `docs/automation/github-issue-management.md` §3 補 Need Fix，§6 落差表更新；gh-pipeline SKILL 更新六欄常數。
4. （選配）Routine C 擴充：`human-driving` PR 用 `Refs #n` merged → 移 Review 而非 Done。

## 執行結果（2026-09-20，經使用者確認後執行）

- 決策：merged 後留 `Review`，dev 冒煙通過才 `Done`。
- 移卡：#138 → Done；#181 #184 #182 #188 #171 #154 #189 #241 → Review；#210 #238（稽核當下已各有 open PR）→ In Progress。
- 關卡：#170 close（not planned）+ `wontfix`；#219、#180 加 `duplicate` 並留言指向 #216、#179。
- 移出 board：#1 #172 #185 #200（Review 彙整報告，issue 保留）。
- 清 label：`needs-spec` ×10、`human-driving`（Done 卡）×4、`human-coding` ×1。
- 事後 `board.ts audit`：✅ 沒有狀態落差（In Progress 3 / Need Fix 3 / Done 13 / Review 9 / Todo 28；#244–247 為期間其他 session 新開）。
- 發現 board 開著七個 GitHub 內建 workflow（`Item closed → Done`、`Auto-close issue` 等），只認同 repo closing-keyword PR；已用瀏覽器確認並把「Pull request merged」目標由 Done 改為 Review（API 讀不到、改不了；PR linked → In Progress、Item closed → Done 維持）。
- 流程落地：`bin/pipeline/board.ts`（set／remove／audit）、`types.ts` 六欄、dev-task／post-merge-wrapup／gh-card／gh-pipeline skill 與 `docs/automation/github-issue-management.md`、AGENTS.md 同步。
