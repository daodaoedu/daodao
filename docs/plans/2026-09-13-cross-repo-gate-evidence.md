# 跨 Repo Benchmark Gate 實作

日期：2026-09-13。狀態：本機實作與整合驗證完成，尚未提交／推送本批變更。工作目錄統一在 `worktrees/benchmark-cross-repo/`，原 root／projects 修改保留。

## 現況更正

前一份 rollout 使用落後的 `projects/` checkout，將前端 Web CI 已修復的問題誤列為未實作。此次重新 fetch 並查 GitHub：f2e #1000 已合併，Linode 的個別失敗傳遞已存在；但最新 dev 的 Mobile CI 仍有另一段裸 `wait`，原 regression 未覆蓋，這次才補上。

Root #195 及 server #472 已合併。這批針對其餘六個 repo，不再新增 server 試點。

## 實作與本機驗證

| Repo／基準 | 實際修改 | 驗證結果 |
| --- | --- | --- |
| f2e／`79a25c4d` | Mobile CI 記錄每個 PID 並彙總失敗，保留等待全部檢查；延伸既有 shell regression | 先重現 typecheck／lint 各自假綠，再修復；3 個 unittest 方法通過，涵蓋 7 種 shell 情境及 EAS runtime |
| admin-ui／`463a6cc` | CI 加入既有 `pnpm test` 與 workflow 失敗注入 regression | Node 20.19.4：11 tests、lint、typecheck 通過；workflow 缺測試的 red 與接入後 green 已驗證 |
| worker／`a2c76ff` | CI 跑完整測試；將容許 200 或 500 的測試改為明確成功及供應商錯誤／無效輸出；隔離外部呼叫 | 嚴格成功斷言先 2 failed，再 16 passed；typecheck、2 項既有 Node CI contract、workflow 失敗注入通過 |
| ai-backend／`d6353c0` | Python 3.12＋固定 uv＋frozen lock 安裝後執行 `make test`；修 scheduler fallback 初始化例外；校準舊測試契約 | 原 18 failed／177 passed；修後完整 194 passed，scheduler 9 passed，`make check` 通過；`make lint` 仍有既有 advisory findings |
| storage／`74314da` | 獨立無 secrets 的 migration CI，實測既有 migration 016 的升級、直接重跑、partial unique constraint、髒資料及錯誤 SQL rollback | 真 PostgreSQL 14：3 tests 通過；停用索引的記憶體 mutation 使測試非零退出，歷史 migration／schema 未改 |
| infra／`7f69796` | 新增 always-running main PR nginx gate；唯讀掛載設定、不開 port、不連服務 network | 真 nginx 1.27.3：現有設定有效、未知指令失敗、缺 include 失敗，共 3 tests 通過 |

主 agent 重跑前端／admin／worker workflow regression 及 AI 完整測試，逐一核對六個 repo 的 actionlint 與 whitespace。AI 新增及既有 `setup-python@v4` 被 actionlint 判定過舊，已統一更新 v5 並重驗。Infra 腳本另通過 `bash -n`。容器測試全部清理，無正式資料庫操作。

## 測試契約審查

AI 測試修改不是為了接受任意輸出：

- Feed 的 Activity Card 產生與優先序方法已由 `1db1d5e`／`5f86c9c` 移除。舊 A-B-C 測試改為現有 A-C 循環、budget、cursor 與缺資料降級；legacy cached activity schema 測試保留。
- `ce8b8da` 已將 provider 錯誤由字串改為例外。三 provider 及 insight 測試改驗例外傳遞與不寫入 DB。
- Redis 缺環境鍵與空字串原本混用，改為隔離 env 並分別驗證預設、舊鍵及空值拒絕。
- Scheduler 加入有／無 service config 的明確 fixtures，驗證初始化失敗不查待處理資料、不生成內容，session 正常關閉；保留原有無 config 的處理規則。

Root test-integrity heuristic 對 AI 的舊斷言替換回報 `review-required`，不是 scanner 自動通過。上述移除原因與替代覆蓋已經 AI 查核，獨立 reviewer 重跑受影響模組 74 項通過，仍供人審閱；不偽造真人 review receipt。

Worker 測試呼叫 production `app.fetch` 與真實 Workers KV；AI binding、Langfuse、internal API 使用明確替身並禁止外部連線，等待 background context 完成。這不是 SELF service binding 或實際 provider／backend 可用性證據。

## 本機證據

`worktrees/benchmark-cross-repo/` 保存 `f2e-evidence.md`、`admin-worker-evidence.md`、`ai-backend-evidence.md`、`storage-evidence.md`、`infra-evidence.md` 及執行 logs。這些本機路徑不是公開附件。

## 剩餘界線

- 本批尚未 commit／push／建立 PR，不能宣稱最新 Linux CI 已通過。
- Worker 舊 PR #1 也修改 ci.yml；本批從最新 main 獨立實作，未更動該 PR，發布時需標明重疊。
- Storage 只驗 migration 016 SQL，不涵蓋整條 migration chain 或 runner 的 migration_history／skip／checksum 行為。
- Infra 只驗設定語法與拒絕無效設定，不代表 upstream 可用、production 路由驗收或部署。
- AI `make lint` 的既有 Pylint／Bandit advisory 未清除；沒有透過降低門檻使其消失。
- Required-check enforcement、完整模型行為 baseline、PR 自動修正與監控閉環仍未啟用。各 repo CI 的本機實作不等於這些項目完成。
