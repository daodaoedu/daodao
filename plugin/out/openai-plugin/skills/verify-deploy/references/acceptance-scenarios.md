# 驗收情境、占用與資料保留

先確認帳號，再準備本卡情境。帳號名單見 [actors.json](../../test-acceptance/references/actors.json)，身分及權限核對見 [帳號前置檢查](acceptance-actor-preflight.md)。情境契約與占用工具只管理本機紀錄，不建立 seed、不修改權限、不寄信、不重設資料，也不執行契約中的文字或引用。

## 每卡一份情境契約

`bin/pipeline/acceptance-scenario.ts` 的 strict schema 是格式來源。契約放在 repo 外的任務目錄，包含：

- 中央 issue、唯一 generation、負責 task，及指定 actor 的 external UUID／email／預期角色與必要情境權限。
- 所有會碰到的固定資源 ID 與使用方式：`read`、`write` 或一次性 `consume`。同時列出父層組織／場次：例如修改場次內範本會影響共用組織資料時，不能只鎖範本、不列組織。工具只比對相同資源鍵，不推導父子階層。實際資料列用明確類型（如 program、practice-template、survey、owner-invitation）與唯一的標準 ID：account／practice／survey 用 external UUID，其餘資料列類型用 numeric ID；尚未建立的物件或一次性副作用用明確 namespace 類型（如 survey-response、cohort-comments、ai-summary-generation、rate-limit-bucket）與固定小寫 slug，不編造遠端 ID。不同任務必須共用相同資源鍵命名，不能用別名繞過衝突。
- 每條前提的白話條件與可追溯的證據引用；例如必須仍 pending 的邀請、尚未填答的回饋、未鎖定的實踐資源。不能只憑名稱或資料存在就填已就緒。
- `retention.retainUntil: "pm-accepted"`、`reviewAt` 複查時間，以及清理／重建步驟和對應依據。

範例見 [acceptance-scenario.example.json](acceptance-scenario.example.json)：#480 不需要額外內容 seed，指定兩個 PM 帳號即可；其帳號資源是 read。範例的 reviewAt 只是複查時間，須依當次交接更新，絕非刪除或到期授權。

`VALID` 只表示 schema 合格；`RESERVED`／`RETAINED` 只表示本機占用紀錄符合。工具始終回報 `readiness: NOT_VERIFIED`，不能將它們改稱 READY 或 PM 驗收通過。真正可交接仍需：即時帳號／權限與資料檢查、同帳號逐步網頁重播、還原後再查，以及實際保留安排。

2026-11-07 的十張待驗卡安排見**逐卡契約快照**（`../docs/testing/acceptance-scenarios/2026-11-07/README.md`，未隨本包出貨），後續須依最新留言重新核對，不把日期快照視為即時清單。

## 共用占用簿

同一部開發機上的所有參與任務使用同一個 state-dir：`~/.daodao/acceptance-reservations/dev`。不要各自放在 task 目錄，否則互相看不到衝突。此版本要求 POSIX uid 與 0700／0600 權限（macOS／Linux）；Windows 缺少 uid 語意時會受阻，不假稱已支援。這是 advisory 協作紀錄，**不是跨機器鎖，也不會阻止未整合的 SQL／API／夜間 reset**。跨機器操作或現有排程仍須由負責人協調；沒有實際停用或排除 reset 的證據，不宣稱 fixture 已受保護。

```sh
pnpm -s tsx bin/pipeline/acceptance-scenario-cli.ts validate --contract /private/task/scenario.json --state-dir "$HOME/.daodao/acceptance-reservations/dev"
pnpm -s tsx bin/pipeline/acceptance-scenario-cli.ts acquire --contract /private/task/scenario.json --state-dir "$HOME/.daodao/acceptance-reservations/dev"
pnpm -s tsx bin/pipeline/acceptance-scenario-cli.ts check --contract /private/task/scenario.json --state-dir "$HOME/.daodao/acceptance-reservations/dev"
```

- read/read 可共用；只要同一資源有 write 或 consume 就互斥。一次 acquire 全部成功或全部不寫入，不留下部分占用。
- 同一 issue/generation 與相同契約重跑可續用；內容漂移先受阻。要更換基線，先保留舊結果並受控清理，再用新的 generation。
- 超過 reviewAt 仍保留占用，執行 check 時回報 reviewDue，提示重新核對有效期／資料漂移。它不建立排程，也不主動寄信或通知。不能自動釋放、讓其他人重設，或以舊報告證明資料仍有效。
- 狀態損壞或殘留 lock 會受阻。先確認原程序結束並保存檔案，由負責人處理；工具不自動接管鎖、不把壞檔當成空的占用簿。

## 交接及收尾

1. 以已核對 actor 及資料準備情境，再 acquire。已有他人 fixture 的卡只讀查核，不接管其資料或任務；衝突先協調。
2. 按卡的領域工具檢查內容前提。#463 仍使用既有 `acceptance-fixture-cli.ts prepare/check/rebuild/cleanup` 與 `docs/testing/acceptance-fixture-lifecycle.md`，不以 generic ledger 取代它的真收信、申請、pending 與到期檢查。
3. 消耗型情境分開 generation：取消／失敗分支先驗，成功批准、填答、刪除、寄信、AI 生成等消耗步驟最後。工程用過的消耗型資料不交給 PM 重做；要重建新一代並再查。
4. 請驗收留言列出資料入口、指定帳號、操作順序、有效條件、複查／重建方式與負責 task；工程命令只放工程證據，PM 步驟只放畫面操作。
5. 正式 PM 通過，或使用者明確取消後，依既定步驟清理／退休**自己建立的**資料，保存前後回讀。既有 PM 帳號不降權、不停用；共用 fixture 不套一般冒煙清理。
6. 最後釋放占用：

```sh
pnpm -s tsx bin/pipeline/acceptance-scenario-cli.ts release --contract /private/task/scenario.json --state-dir "$HOME/.daodao/acceptance-reservations/dev" --outcome accepted --outcome-evidence 'https://github.com/daodaoedu/daodao/issues/480#issuecomment-EXAMPLE' --cleanup-evidence /private/task/cleanup-readback.json
```

上例的驗收來源是格式示意，不能直接使用；實際需正式驗收來源。取消用 `--outcome cancelled` 並引用明確取消紀錄。兩種結果都須有 cleanup readback；引用由操作人負責查真，工具不會把字串存在當成驗收／清理已執行。release 僅更新本機占用簿、保留歷史，不操作遠端資料。

## PM 登入能力仍分開

團主／教練的全域角色可能是 User 或 Admin，須讀取確切組織／場次權限；不能靠全域 Admin 或 membership 清單代替。工程同帳號 dev-login 可作前置檢查；PM 必須以自己可控制的 Google 身分完成正式畫面驗收。Google 再驗證、密碼與驗證碼由 PM 自行處理，不索取憑證，也不把工程通過轉成正式驗收。
