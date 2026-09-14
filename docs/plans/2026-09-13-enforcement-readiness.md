# Required-check 啟用前查核

日期：2026-09-13，最後更新：2026-09-14。最新狀態：八個 repo 的 benchmark ruleset 已啟用並回讀確認，且均完成無 bypass 身分的失敗阻擋與修復驗收。下方原始盤點及提案保留為啟用前快照。

## 已批准啟用

- Root main：[ruleset 23186104](https://github.com/daodaoedu/daodao/rules/23186104)，要求 test-integrity、pack-regression、scorer-regression、regression。
- Server dev：[ruleset 23186106](https://github.com/daodaoedu/daodao-server/rules/23186106)，要求 test、workflow-tests、Compare SQL ↔ Prisma schemas。
- 兩者 active、strict=true、GitHub Actions integration_id=15368；RepositoryRole 5 / always 保留管理員緊急 bypass。沒有新增其他 actor 或覆寫原有規則。
- 於 2026-09-13 15:59 UTC 建立，GET rulesets 及 rules/branches 回讀確認適用分支。八 repo 前後 JSON 快照與 `verify-benchmark-activation.py` 比對通過：兩筆符合批准 payload，其他六 repo 及 classic protection 未變。
- 本機證據：`worktrees/benchmark-protection-before-activation.json`、`worktrees/benchmark-protection-after-activation.json`、`worktrees/benchmark-{root,server}-ruleset.json`。不提交原始內部快照。
- 非 bypass 驗收已於 2026-09-14 使用僅具 Write 權限的 `vincentxuwork` 完成；驗收後切回管理員帳號。沒有嘗試合併失敗內容。
- 緊急回復只停用本輪各 repo 的獨立 benchmark ruleset，需在批准的回復範圍內執行；保留既有 review、簽章與 required-check 規則，不整份覆寫 repository protection。

## Sibling repo rollout 與驗收

| Repo / branch | Ruleset | Required contexts | 非 bypass 驗收 |
| --- | --- | --- | --- |
| daodao-f2e / dev | `23312238` | TypeScript & Lint Check、test、workflow-tests | [#1007](https://github.com/daodaoedu/daodao-f2e/pull/1007)：`33d2fb5` FAILURE / BLOCKED；`09cbf3a` 三項成功，checks 完成後 CLEAN |
| daodao-admin-ui / dev | `23304253` | Continuous Integration | [#145](https://github.com/daodaoedu/daodao-admin-ui/pull/145)：`8214d28` FAILURE / BLOCKED；`af3c18c` SUCCESS / CLEAN |
| daodao-worker / main | `23304254` | TypeCheck | [#89](https://github.com/daodaoedu/daodao-worker/pull/89)：`56d201d` FAILURE / BLOCKED；`6491144` SUCCESS / CLEAN |
| daodao-ai-backend / dev | `23304256` | Unit Tests | [#222](https://github.com/daodaoedu/daodao-ai-backend/pull/222)：`b2f0a6e` FAILURE / BLOCKED；`bb84ced` SUCCESS，仍由既有 code-owner 規則阻擋 |
| daodao-storage / dev | `23304257` | Migration Upgrade & Constraints | [#241](https://github.com/daodaoedu/daodao-storage/pull/241)：`760e7a7` FAILURE / BLOCKED；`68a68ad` SUCCESS / CLEAN |
| daodao-infra / main | `23310188` | Nginx configuration and gate regression | [#81](https://github.com/daodaoedu/daodao-infra/pull/81)：`feff9cd` FAILURE / BLOCKED；`33677ba` SUCCESS / CLEAN |

上述 ruleset 均為 active、strict=true，required contexts 綁定 GitHub Actions integration_id `15368`，並保留 RepositoryRole 5 / always 的管理員緊急 bypass。各驗收 PR 均已關閉且未合併；臨時 direct Write 權限已移除。AI #222 的修復 head required checks 全綠，但既有 code-owner 規則仍獨立生效，因此不以整體 `CLEAN` 作為該 repo 的 required-check 成功條件。

Infra 初次 [#79](https://github.com/daodaoedu/daodao-infra/pull/79) 驗收發現 main 基線的 branch-base regression expectation 過期；ruleset `23304260` 當場移除，沒有將主線留在永久紅燈。修復 [#80](https://github.com/daodaoedu/daodao-infra/pull/80) 合併為 `467afd1a88d3ba70e54c44aa02f6ca8e14a3b64c` 且 CI 全綠後，才建立 ruleset `23310188` 並由 #81 重新完成驗收。

合併更新：[#197](https://github.com/daodaoedu/daodao/pull/197) 於 15:55:52 UTC 合併，merge SHA `3bca764dcc1fa0194e4ca9f28694967c3a848b6c`。PR head 的四個工程 gate（pack-regression、scorer-regression、regression、test-integrity）及其他 checks 通過。此更新不是合併後重跑、部署或遠端規則設定證據；以下規則清單仍是 15:51:18Z 的讀取快照。

## 遠端現況

透過 `gh api` 讀取八個 repo 的 integration branch classic protection、ruleset 清單與非空項目的完整內容。所有 classic protection 回應明確的 `Branch not protected`，但這不代表沒有 ruleset：

| Repo / branch | 目前 ruleset / required checks |
| --- | --- |
| daodao / main | 清單為空 |
| daodao-server / dev | 清單為空 |
| daodao-f2e / dev | 清單為空 |
| daodao-admin-ui / dev | active 16368557：一人審核、禁止刪除與 non-fast-forward，未要求 status checks |
| daodao-worker / main | 清單為空 |
| daodao-ai-backend / dev | active 5802080：已要求 `Format & Lint`，另有審核、簽章及分支保護 |
| daodao-storage / dev | active 5802089：已要求 `PostgreSQL CI Test`，另有審核及分支保護 |
| daodao-infra / main | 清單為空 |

上述三個 active ruleset 都涵蓋 main 與 dev，且保留 RepositoryRole 5 的 always bypass；目前登入者可 bypass。AI / Storage 的 required checks 綁定 integration_id 15368，strict policy 為 false。不能用管理員成功合併或 `mergeable` 單一欄位證明 gate 已強制阻擋。

本輪新增 `scripts/collect-gate-protection.py` 保存唯讀、帶時間及 branch SHA 的 JSON 快照。權限錯誤、一般 404 或不完整查詢不得視為沒有保護；只將明確 Branch not protected 分類為 absent。快照不包含權杖，仍應作為內部操作證據審閱，不自動發布原始資料。

實跑快照時間為 `2026-09-13T15:51:18Z`，八個 repo 均收集成功，本機檔案 `worktrees/benchmark-protection-snapshot-2026-09-13.json`。`complete=true` 僅表示 API 收集完成，不代表規則語意有效、適用分支已驗收或合併強制效果成立。

## 本輪前置修正

Root `pack-regression`、`scorer-regression` 與 Shared Config Regression 的 `regression` 原本有 PR paths 過濾。移除這三個 PR 路徑過濾，保留既有 push 過濾；加上可執行 trigger regression。這確保無關檔案 PR 也能排程檢查，不是已驗證遠端 docs-only / stale-head 強制效果。

Root 的兩個 workflow 仍共用 `Branch flow rules` 名稱。此提案不把該 context 設為 required，避免同名來源歧義；之後需獨立處理命名與共用設定同步。Test-integrity 是 heuristic 且執行 PR head 的 scanner，不是可抵抗惡意修改 workflow / scanner 的信任邊界。

## 建議設定草案

第一階段先 root / server，再依驗收結果逐 repo 啟用：

| Branch | 候選 required contexts |
| --- | --- |
| daodao main | `test-integrity`；本輪 workflow 合併及遠端通過後再加入 `pack-regression`、`scorer-regression`、`regression` |
| daodao-server dev | `test`、`workflow-tests`、`Compare SQL ↔ Prisma schemas` |
| daodao-f2e dev | `TypeScript & Lint Check`、`test`、`workflow-tests`；啟用前逐一查核所有 PR 都會回報 |
| daodao-admin-ui dev | `Continuous Integration` |
| daodao-worker main | `TypeCheck`（現有 job 內含完整測試） |
| daodao-ai-backend dev | 保留 `Format & Lint`，新增 `Unit Tests` |
| daodao-storage dev | 保留 `PostgreSQL CI Test`，新增 `Migration Upgrade & Constraints` |
| daodao-infra main | `Nginx configuration and gate regression` |

候選不等於全部已具備 unconditional scheduling 證據。每個 context 啟用前仍需核對最新合併 workflow 的 event / branch / paths / job if / context 唯一性，以及成功 check-run 的 app.id。不得將其他 repo 的 app id 或先前 head 的綠燈直接當作本次設定證據。

建議新增獨立 benchmark ruleset，限表列 integration branch，避免覆蓋既有審核、簽章、main 保護與 bypass 設定。設定來源綁 GitHub Actions；是否 strict up-to-date、是否允許管理員 bypass 均需維護者確認。建議 strict=true、沿用現有管理員緊急處理能力，但用無 bypass 身分驗收。沒有已授權驗收帳號時，停在設定讀回，不宣稱阻擋驗收完成。

## 啟用與回復驗收

### 實際驗收結果（2026-09-14）

| 情境 | 失敗／等待證據 | 修復後證據 | 結論 |
| --- | --- | --- | --- |
| Root required failure | [#198](https://github.com/daodaoedu/daodao/pull/198) head `4b54fe6` 的 test-integrity 失敗（[run](https://github.com/daodaoedu/daodao/actions/runs/34840615347)），GitHub 回報 `mergeStateStatus=BLOCKED` | 同 PR head `d01ccac` 四個 required contexts 全部通過，狀態 `CLEAN` | 失敗 head 被擋；新 head 不沿用舊綠燈，修復後解除 |
| Server required failure | [#473](https://github.com/daodaoedu/daodao-server/pull/473) head `965316d` 的 workflow-tests 失敗（[run](https://github.com/daodaoedu/daodao-server/actions/runs/34840617136)），相依 test skipped，狀態 `BLOCKED` | 同 PR head `9db1fd2` 的 workflow-tests、test（[run](https://github.com/daodaoedu/daodao-server/actions/runs/34840702591)）及 schema drift 全部通過，狀態 `CLEAN` | 失敗與 pending required contexts 均維持阻擋；修復後解除 |
| Root docs-only | [#199](https://github.com/daodaoedu/daodao/pull/199) head `4596e36` | test-integrity、pack-regression、scorer-regression、regression 全部出現並通過，狀態 `CLEAN` | 無 path-filter 永久 pending |

三個 PR 均由非 bypass 帳號建立，驗收後關閉且未合併；分支保留作稽核證據。此次未驗證 base 在檢查完成後前進所觸發的 strict 更新行為，因為那會額外變更 integration branch；strict=true 已由 ruleset 及 effective branch rules 回讀確認。

1. 維護者確認 repo / branch / contexts、strict 策略、bypass actor 與試驗 PR 授權；保存原始 ruleset 快照及版本。
2. 先確認相關 workflow 已合併且最新 head checks 通過，再建立獨立 ruleset；讀回完整規則及適用分支。任何既有規則差異都中止，不能整份覆寫。
3. 以明確授權且無 bypass 的帳號，對可丟棄分支跑失敗 fixture，確認合併被阻擋。不要合併刻意失敗的 PR，也不要觸發 production 部署。
4. 同一 PR 修復後確認新 head 綠燈；另驗 docs-only、push 後舊 head 成功不沿用、base 前進時 strict 策略、必要 job 沒有產生結果的情境。保留 SHA、check-run URL 與阻擋證據。
5. 回復僅停用本次新增 ruleset（依保存 id），不移除原有 ruleset；讀回驗證原本的審核、簽章及既有 required checks 未變。停用只在已批准回復範圍內執行。

## 尚未完成

本輪整合驗證：Python unittest 50 項與離線 scorer 10 項通過；既有 Node shared-config 16 項及 shell contract 通過；三份 workflow actionlint 與 diff-check 通過。唯讀 collector 經獨立審查無阻擋問題。測試結果不是模型 baseline 或遠端 enforcement 證據。

- 本輪沒有遠端規則寫入、試驗 PR、非 bypass 操作或部署。
- 完整 Claude / Codex 行為 baseline、真實模型 CI、自動 feedback repair、監控閉環與 domain coverage 擴充仍保留於原計畫。
