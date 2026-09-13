# Required-check 啟用前查核

日期：2026-09-13。這是設定提案與前置修正，不是已啟用強制 gate 或已完成阻擋驗收。

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

1. 維護者確認 repo / branch / contexts、strict 策略、bypass actor 與試驗 PR 授權；保存原始 ruleset 快照及版本。
2. 先確認相關 workflow 已合併且最新 head checks 通過，再建立獨立 ruleset；讀回完整規則及適用分支。任何既有規則差異都中止，不能整份覆寫。
3. 以明確授權且無 bypass 的帳號，對可丟棄分支跑失敗 fixture，確認合併被阻擋。不要合併刻意失敗的 PR，也不要觸發 production 部署。
4. 同一 PR 修復後確認新 head 綠燈；另驗 docs-only、push 後舊 head 成功不沿用、base 前進時 strict 策略、必要 job 沒有產生結果的情境。保留 SHA、check-run URL 與阻擋證據。
5. 回復僅停用本次新增 ruleset（依保存 id），不移除原有 ruleset；讀回驗證原本的審核、簽章及既有 required checks 未變。停用只在已批准回復範圍內執行。

## 尚未完成

本輪整合驗證：Python unittest 50 項與離線 scorer 10 項通過；既有 Node shared-config 16 項及 shell contract 通過；三份 workflow actionlint 與 diff-check 通過。唯讀 collector 經獨立審查無阻擋問題。測試結果不是模型 baseline 或遠端 enforcement 證據。

- 本輪沒有遠端規則寫入、試驗 PR、非 bypass 操作或部署。
- 完整 Claude / Codex 行為 baseline、真實模型 CI、自動 feedback repair、監控閉環與 domain coverage 擴充仍保留於原計畫。
