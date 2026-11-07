# Fixture 異動前的占用攔截

[情境占用簿](acceptance-scenarios.md)仍是本機協作紀錄；以下已整合的入口會強制讀取它、在異動前拒絕衝突，並持鎖至操作結束。這不會攔截直接 SQL／HTTP、未整合的私人腳本、不同 state-dir 或另一台機器，不能稱作全資料庫保護。

## 先明確初始化共用狀態

預設位置是 `~/.daodao/acceptance-reservations/dev`；同一台機器、不同 repo 必須共用此目錄。可用 `DAODAO_ACCEPTANCE_STATE_DIR` 明確設定相同路徑，storage 也支援 `--reservation-state-dir`。不要為繞過衝突另建空占用簿。

```sh
pnpm -s tsx bin/pipeline/acceptance-scenario-cli.ts init --state-dir "$HOME/.daodao/acceptance-reservations/dev"
```

此指令只建立私人空狀態，既有合法資料保持原狀；不修壞檔、不清除舊 claim。占用簿缺失、壞檔、不安全權限或鎖被占用，異動入口會受阻，絕不默認成「沒有人占用」。初始化不是遠端資料就緒證明。

## 已整合入口

- Root `acceptance-fixture-cli.ts` 的 prepare／rebuild／cleanup，以及直接呼叫的 exported `runFixture`。先核對整份 manifest、實際組織與所有發現的 invitation／request，再做第一個 HTTP 異動；不會先清掉前一組才發現後一組被保留。唯讀 check 可繼續核對保留中的資料。
- Storage `scripts/acceptance_fixtures/fixtures.py` 的 seed／reset／dry-run。dry-run 會先執行 DML 再 rollback，因此也受保護。先檢查固定範圍，再以唯讀 SQL 取得實際受影響後代資源，最後才准許異動 SQL。

Node／Python 使用同一個 `.lock` 協定，鎖覆蓋即時查核與整段異動。期間新的 acquire／release 也不能插入；不是先檢查再放鎖、最後才操作。程序中斷留下鎖時必須先查明原操作已結束，不自動接管。

資料庫查詢無法解析的相關保留 namespace 會保守拒絕；不能因「看起來是另一卡」就忽略。尚未整合的 ad hoc SQL／API 腳本不受這層機制強制攔截，不能直接拿來重設 PM fixture。

## 驗收後清理：先授權，後清理，最後釋放

不能先釋放保護、再慢慢清理；也不能因 taskOwner 相同就跳過所有保留。先確認正式 PM PASS 或使用者明確取消，保存**私人 terminal authorization JSON**：

```json
{
  "issue": "https://github.com/daodaoedu/daodao/issues/123",
  "generation": "example-generation",
  "contractDigest": "replace-with-exact-64-hex-ledger-contract-digest",
  "operation": "cleanup",
  "outcome": "accepted",
  "outcomeEvidence": "replace-with-formal-PM-result-or-explicit-cancellation-reference"
}
```

這是格式示意，不能直接執行。issue／generation／digest 必須精確匹配同一筆 retained claim，operation 也必須符合將執行的操作。`accepted` 的來源要是正式驗收結果，`cancelled` 要有明確取消紀錄；操作者負責查真，工具不把檔案／字串存在當成驗收已通過。檔案須為本人持有的0600 regular file，不含登入 token。

```sh
pnpm -s tsx bin/pipeline/acceptance-fixture-cli.ts cleanup \
  --run-dir /private/task/run --credentials-file /private/task/credentials.json \
  --cleanup-authorization-file /private/task/terminal-authorization.json
```

授權只對精確的那一筆 claim 生效，其他卡保留中的相同資源仍會擋下；原 claim 與共用鎖仍保留。prepare／check 不接受這個 terminal 授權。rebuild 必須明寫 operation=rebuild；storage 的 seed／reset／dry-run 也須各自符合 operation，沒有泛用 skipguard。

清理成功且已取得真實回讀後，才執行原本的 release，附正式結果來源與本次 cleanup readback。若清理中途失敗，占用不會自動釋放，需保留現場與 journal。授權不是已清理證明，guard 通過也不是產品／PM驗收通過。

## 容器、權限與適用界線

要求 POSIX private directory0700、檔案0600及相同 uid；不同容器要掛載同一個本機檔案系統目錄並使用相容 uid，否則會受阻。沒有共享 mount 的排程不會自動看見 host 的占用，也不允許默默回退空狀態。Windows 無對應 uid 語意時不宣稱支援。

保護只涵蓋明列且已整合的操作入口及同一份狀態。任何直接 SQL、print-reset 後另行 pipe 到 psql、原始 HTTP、惡意同 uid 改檔或不同機器，仍需另外的執行環境／伺服器層控制。不得為了解除 #471 的一次性重播阻擋而繞過 guard；目前填答結果先保留、等 PM 進度確認。
