# CI 修復證據契約

只適用已接手的 CI 修復；唯讀調查、一般 review 與無關任務不啟動。目的是避免「猜原因 → 局部探針綠 → push → CI 再失敗」；不新增產品 AC、不擴大發布權限。

## 開始與重現

以下 `$GATE` 是已讀取的 daodao checkout 的 `plugin/hooks` 絕對路徑，`$REPO` 是隔離修復 worktree 的絕對路徑。先確認來源程式與失敗 job／SHA、測試名稱、companion revisions 相符。

沒有 repo／shell 的客戶端只能交接受阻事項，不能宣稱這些原生檢查已啟動。現有安裝缺腳本時使用已查證的新 checkout，不能憑 skill 名稱假設工具存在。

```sh
python3 "$GATE/ci-repair-publish.py" install --repo "$REPO"
python3 "$GATE/check-ci-repair.py" start --repo "$REPO" \
  --pr 1190 --repository daodaoedu/daodao-f2e \
  --case 'PR1190: organization-first-signup callback' \
  --environment 'isolated-stack; pinned companion revisions recorded in task.md' \
  --command-json '["bash","scripts/run-the-failing-journey.sh"]'
python3 "$GATE/check-ci-repair.py" run --repo "$REPO" --phase before --scope full
```

指令只是格式範例，必須換成實際失敗路徑的 argv；不建立假入口。`start` 後相同問題的完整重現指令不可換成較小的測試。環境欄位是宣告而非環境證明，companion SHAs／啟動方式與差異仍須記在 `task.md`。變更環境後不得沿用舊回條。

`run` 實際執行指令並記錄 exit code、原始輸出雜湊及程式內容指紋。只有完整路徑真正失敗可作 before；timeout 124、指令無法啟動 127 不算重現。輸出留在 Git 管理目錄的私有檔案，不直接印出可能含 token／個資的日誌。`--timeout` 可設定有界執行。

修正後用同一指令跑：

```sh
python3 "$GATE/check-ci-repair.py" run --repo "$REPO" --phase after --scope full
python3 "$GATE/check-ci-repair.py" check --repo "$REPO" --phase publish
```

沒有 before、最新完整 after 失敗、只有 probe、程式修改後未重驗，或日誌遭更動都會被拒絕。證據綁定檔案內容而非只看 HEAD，因此內容不變的 commit 可沿用驗證。回條按 worktree 儲存，不污染原始碼或其他任務；原生 Git hook 只檢查有回條的 worktree。

本機缺空間／服務／權限時，先診斷可修前提，否則標為驗證受阻。簡化 harness 可用來查假設，不能填作 `full`。必須遠端調查時，先設計有界、能區分假設且不暴露敏感內容的診斷執行；它仍不是修復證據。本版不提供把未重現修法直接推上遠端的自動逃生口。

## 兩次失敗先重檢假設

同一 case 的完整 after 連續兩次失敗，下一次完整嘗試／發布會被擋。先寫出兩次修法的共同假設，再用實際觀察區分它：

```sh
python3 "$GATE/check-ci-repair.py" run --repo "$REPO" --phase after --scope probe \
  --probe-command-json '["python3","scripts/observe-the-assumption.py"]'
python3 "$GATE/check-ci-repair.py" audit --repo "$REPO" \
  --assumption 'browser response preserves the server redirect' \
  --observation 'summarize the actual bounded observation without secrets' \
  --observation-run 4 \
  --decision 'what the observation rules out and what will be tested next'
```

腳本與 run ID 必須換成實際存在的觀察與回條編號。audit 綁定最近兩次失敗及其後成功執行的 probe；只有文字、自述或舊 probe 不能解鎖。成功的完整 after 會重置連續失敗計數。

## 發布與完成

依原規則完成 commit 確認與已授權的 review／push。啟動時可用 `--allow-skipped 'EAS Build Check'`、`--allow-skipped notify-failure` 明確列出允許略過的檢查；預設不接受 skipped。

```sh
python3 "$GATE/ci-repair-publish.py" push --repo "$REPO" \
  --pr 1190 --repository daodaoedu/daodao-f2e --wait-seconds 0 \
  -- origin HEAD:feat/the-repair-branch
```

wrapper 先檢查本機證據，再 push，最後實際讀取 GitHub PR 的 HEAD 與 checks。原生 `git push` 也受 pre-push 檢查，並非只靠模型記得呼叫 checker。wrapper 不接受 bypass、force、delete 等選項。若需特殊 Git 操作，依既有授權流程另行處理，不修改證據冒充通過。

- exit 0：新 HEAD 的所有回報 checks 成功或為明列的預期 skipped。
- exit 2：本機 gate、安裝或參數有問題，未證明可發布。
- exit 3：已 push，但尚未取得遠端通過證據；不得稱修復完成。

可設定 `--wait-seconds`（最多 1200 秒）作有界等待；使用 agent 工具時仍須定期提供狀態。超時／網路失敗後不再 push，直接讀回：

```sh
python3 "$GATE/check-ci-repair.py" complete --repo "$REPO" \
  --pr 1190 --repository daodaoedu/daodao-f2e
python3 "$GATE/check-ci-repair.py" check --repo "$REPO" --phase complete
```

完成檢查綁定 start 時的 repo／PR，要求乾淨工作樹、PR head 等於當前 HEAD、非空且全部終態可接受的 checks；每次都重新查遠端。舊 SHA、pending、failure、neutral、空 checks 不能當完成。原生 push 另檢查工作樹乾淨及每個傳出的 commit SHA 必須等於受驗 HEAD，避免測到未提交的修正卻推送舊程式。這仍不代表 merge、部署或 PM 驗收。

## 安裝、限制與復盤

installer 不改全域 Git 設定；使用該 repo 的有效 hooks 路徑，保存 checker 快照並拒絕覆寫外來 pre-push hook。共用 hook 的 linked worktrees 各用自己的回條。有既有 hook 時先整合而非刪掉它；驗證安裝後才宣稱自動攔截。版本更新後重跑 install 更新快照。

原生 pre-push 已有真 Git／bare remote 正反向測試；客戶端 PreToolUse／Stop 自動觸發不是本版的安裝保證，也沒有改動其他 session 正在修改的 Stop hook。原生 Git 檢查只在修復已啟動且 hook 已安裝時有效；刻意略過 hook、修改本機回條或假標 `full` 不是防範對象。此工具是可檢驗的流程約束，不是不可偽造的安全證明。

每次交接附：已證實根因／尚未證實假設、before/after 的真實範圍、待解前提、遠端新 SHA 結果，以及本輪排除了哪個假設。新 session 必須先讀既有回條與 task.md，不能覆蓋 active 回條重新把失敗次數歸零。
