# Benchmark gate 實作追蹤

> 最新核對（2026-09-13 UTC）：root #194／#195／#196、server #470／#472，以及其餘六個 repo 的 gate PR 均已合併，適用工程 CI 通過。下方明確標記的歷史快照不是目前發布狀態。詳細報告：[跨 repo 合併與驗證](2026-09-13-cross-repo-gate-evidence.md)。前次將已修復的 f2e Web CI 誤列待辦，已更正。

## 目前狀態

- Root [#197](https://github.com/daodaoedu/daodao/pull/197) 於 2026-09-13 15:55:52 UTC 合併為 `3bca764dcc1fa0194e4ca9f28694967c3a848b6c`。三個 PR workflow 路徑過濾修正、唯讀保護規則 collector 與啟用提案已合併；PR head 的 pack-regression、scorer-regression、regression、test-integrity 與其他 checks 全部通過。合併後另經維護者批准啟用並完成非 bypass 驗收，設定與回復證據見 [啟用前查核](2026-09-13-enforcement-readiness.md)。

- Root [#194](https://github.com/daodaoedu/daodao/pull/194)、[#195](https://github.com/daodaoedu/daodao/pull/195)、[#196](https://github.com/daodaoedu/daodao/pull/196) 已合併；pack／scorer／integrity 的適用 checks 通過。Merge commits 分別為 `ffbf781b7b392fa36ca4ffe1148124e7122391a2`、`2068dd5be7cc680ba6494663638a4bb777e430aa`、`8875e20f88701d707e518a4ef22e48e6b135b7b6`。
- Server [#470](https://github.com/daodaoedu/daodao-server/pull/470)、[#472](https://github.com/daodaoedu/daodao-server/pull/472) 已合併；test／workflow-tests／schema drift 通過。Merge commits 分別為 `d23a33d686ec0aa687ce2a8125b7b49af7060041`、`798795ec27573cfec5e2db0ef86b1dcd8f40be5f`。
- #194／#470 的 AI Code Review 為 SKIPPED，不算 review 已執行；後續 #195／#472 為 SUCCESS。這些是 PR head 的檢查結果，不是現在所有 repo 的全量重驗或部署證據。
- Claude／Codex native trace adapter 及離線 CI 已完成；隔離客戶端讀取 skill 與 Claude Write hook 阻擋已有證據。完整模型 baseline 仍未完成，Claude exact fixture 目前僅 1/4 案例、0/1 通過。
- 六個 repo 的測試／CI 接入與 Infra 分支規則修正均已合併；新 benchmark checks 的遠端強制效果尚未驗收。既有 admin review、AI Format & Lint、storage PostgreSQL CI Test rulesets 仍存在，不能說所有保護均未啟用。

## 待辦清單（目前）

- [x] 經批准啟用 root main / server dev benchmark required checks（rulesets 23186104 / 23186106）；strict、Actions 來源與管理員 bypass 皆回讀確認，其餘六 repo 保護未變。
- [x] 使用僅具 Write、無 bypass 的 `vincentxuwork` 驗證 root #198 / server #473：失敗 head 為 BLOCKED，修復新 head 全綠後 CLEAN；root docs-only #199 的四個 contexts 均回報成功。三個 PR 已關閉且未合併。
- [ ] 其他 repo 新 benchmark required checks 尚未 rollout；base 前進後 strict 更新情境尚未用可丟棄 integration branch 變更實測。
- [ ] 完整 Claude／Codex 需求、bug、開發與入口自動載入驗收；建立模型行為 baseline 與真正的行為回歸 CI。
- [ ] 擴充 server 兩端點／15 tests 以外的 response contract、隱私與業務規則測試。
- [ ] 擴充 storage 整條 migration chain 及 runner 的 migration_history／skip／checksum；目前只驗 migration 016 SQL。
- [ ] 建立 PR feedback 自動修正迴圈，包含隔離執行、授權、重試上限、驗證證據及人工接手。
- [ ] 建立監控異常去重、需求／bug 開卡、修復與部署驗收回饋流程。
- [ ] 按產品範圍取得正式部署、真實 provider、目標客戶端與實際可用性證據。

## 初輪歷史快照

以下保留當時本機驗證與發布順序；「尚未」「未完成」等敘述僅描述該輪時間點，最新狀態及待辦以上方為準。

本輪落地工程 gate，並依後續「commit push」授權提交及推送至兩個獨立分支；保留原 shared dirty tree，未部署。研究文的全空白測試盤點已過時，完成狀態以本次實查為準。

## 本輪範圍

- [x] REVIEW.md：嚴重度、證據及架構／資料契約規則。
- [x] spec auditor 輸入同版 decisions／design 與驗收；增加可執行版本化 pack builder 和回歸測試。
- [x] test integrity diff scanner、版本綁定 review receipt、回歸測試及根 repo CI；Claude Write／Edit hook 已註冊，尚未實際客戶端觸發驗證。
- [x] skill behavioral eval fixtures／scorer／adapter 介面及離線 scorer CI。
- [x] Phase 2 schema drift／OpenAPI signal 指令及能力限制。
- [x] server 隔離 worktree HTTP wire contract／privacy pilot：兩端點，5 tests，typecheck／owned lint／OpenAPI generation 通過。
- [x] 本輪整合測試與 benchmark 狀態回填；遠端 CI／實際客戶端驗證仍未完成。

## 證據界線與後續

- Test integrity 是 heuristic，不能驗證所有語意弱化；receipt 不驗證真人身分，CI 設定已推送至開發分支，尚未驗證遠端執行或設定 required check。
- Evals CI 驗 scorer，不跑模型；真實 Claude／Codex trace adapter 與模型 pass-rate baseline 未完成。
- server 已存在部分 negative／invariant tests；本輪補 response schema pilot，不宣稱覆蓋所有 API。
- 根 repo gate 不等同所有 sibling CI／hooks；監控閉環、PR 自動修正、各 repo 測試擴充尚未完成。DDD 僅在產品複雜度有需要時評估，不當本輪預設重構。

## 本輪驗證（本機）

- `python3 -m unittest discover -s scripts/__tests__ -p 'test_*.py'`：20 passed（audit pack 4、test integrity 9、hook 7）。
- `python3 scripts/__tests__/skill-evals-test.py`：10 passed；包含 review 發現的 trace 提問數漏判回歸，僅評分器，不是模型測試。Root 合計 30 項測試通過。
- `bash .github/scripts/test-code-review-contract.sh` 通過；4 份異動／新增 workflows 的 YAML 及內嵌 shell 語法通過。
- 修改的 dev-task／code-review skill 格式、diff whitespace 檢查通過；新 root 測試無 integrity scanner finding。
- Server pilot worktree：[任務證據](2026-09-13-server-contract-validation.md)。原來源 checkout 的 OpenAPI dirty 修改保留。
- 隔離 server `STORAGE_SCHEMA_PATH=<source-storage>/schema pnpm run schema:drift` 通過，檢查 136 SQL tables／122 Prisma models；只證明此工具支援的存在性範圍。
- REVIEW.md 已接本機 review input 與 CI，CI 只讀 base revision policy；首次尚未合併到 base 時明示不可用，不宣稱已驗證政策符合。

所有 CI／hook 的變更已推送至 root 開發分支；尚未驗證遠端 CI／客戶端觸發、未設定遠端 required check，沒有部署證據。

獨立整合 review 發現 CI review prompt 舊有「不確定不回報」與新規則衝突；已改為保留未驗證／限制並明確對應 P0–P3 與既有輸出嚴重度。workflow contract regression 重跑通過。

## 提交與推送紀錄

以下為本次操作完成並以 `git ls-remote` 核對的遠端 commit；不代表後續 PR／CI 狀態已重新查詢。

| Repo | 分支 | 已推送 commit |
|---|---|---|
| daodao | [chore/requester-skills-benchmark-gates](https://github.com/daodaoedu/daodao/tree/chore/requester-skills-benchmark-gates) | `bc828819cc5c2864920b515d2ddfcae0b58dbad9` |
| daodao-server | [feat/benchmark-response-contracts](https://github.com/daodaoedu/daodao-server/tree/feat/benchmark-response-contracts) | `8fbc585d7bf4ada91a351db917bd93cd2b3df1fe` |

提交前已做獨立審查，修正 scorer 對 trace 提問數的漏判並重驗。Server 全量 lint 通過（既有 warnings）、typecheck 與 5 項契約測試通過。此次操作未建立 PR 或合併；原工作區其他修改及子模組指標未納入提交。

## 初輪待辦快照（非目前狀態）

- [ ] 為 root／server 分支開 PR，執行適用遠端 CI、處理結果後依授權合併。
- [ ] Claude／Codex 真實試跑需求、bug、開發驗收；確認入口載入、交接與 Claude hook 觸發。
- [ ] 補客戶端 trace adapter、建立模型行為通過率基準，串接真正的行為回歸 CI。
- [ ] 重新盤點其餘 API／repo，擴充 response contract、隱私與業務規則測試。
- [ ] 將適用 gate 接入各 repo CI，配置 required checks 並驗證強制效果。
- [ ] 建立 PR feedback 自動修正迴圈，保留授權、重試上限及驗證證據。
- [ ] 建立監控異常到需求／bug 的回饋流程。

本次文件回填是上述已推送 commit 之後的本機更新，尚未另行提交或推送。

## 續作歷史快照（2026-09-13，發布前）

- [x] 已建立 root [PR #194](https://github.com/daodaoedu/daodao/pull/194) 與 server [PR #470](https://github.com/daodaoedu/daodao-server/pull/470)，兩者仍為 draft。
- [x] 已推送 head 的適用遠端 CI 通過：root pack／scorer／integrity；server full test／workflow tests／schema drift。AI review 因 draft 跳過，沒有合併。
- [x] 補 Claude／Codex native trace adapter、版本與來源綁定、失敗呼叫保留，以及拒絕重複／synthetic 樣本的彙整器；離線 CI 已補測試，本輪新增內容尚未提交。
- [x] 隔離客戶端實際讀取 skill，Claude Write hook 實際阻擋弱化測試並確認檔案未變。這不等於正常專案自動載入或完整需求／開發驗收。
- [x] Server HTTP pilot 由 5 增至 15 tests；本輪本機通過。其他 API／repo 尚未全面擴充。
- [x] 本輪 root 51 tests、workflow contract、YAML parse、root/server diff-check 通過；server typecheck／full lint 通過（183 既有 warnings）。
- [ ] Claude exact fixture 仍失敗（提問過量、無依據的一次性頻率），已保留 AI-reviewed trace／score，1/4 案例、0/1 通過；不能建立完整模型 baseline。
- [ ] 新增修改需 commit／push 後重跑新 head CI。Required checks、跨 repo gate rollout、feedback 自動修正與監控閉環仍未啟用。

續作實作與完整驗證報告位於隔離工作樹：
`worktrees/requester-skills-release/docs/plans/2026-09-13-benchmark-continuation-evidence.md`。
Rollout 具體設定與跨 repo 盤點位於同目錄的
`2026-09-13-benchmark-rollout.md`。
原始客戶端證據留在 `worktrees/benchmark-client-smoke/REPORT.md`，不提交認證或完整客戶端紀錄。
