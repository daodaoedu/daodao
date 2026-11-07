# #463 驗收資料生命週期

每次驗收使用獨立 generation，每個 generation 各有 cancel / approve 組織。取消確認與成功批准分開操作，成功批准排最後。工程冒煙的資料不交給 PM 再次使用。

## 前置條件

只支援 server-dev。既有 PM 301 必須仍為 Admin，申請人 328 必須仍為 User；不得調整角色或可信 Email 來湊前提。使用合法登入取得的 token。收件人使用經確認可收到信的 QA 信箱或別名，且不能匹配已有可信登入 Email，否則會直接加入 owner 而非產生 pending 邀請。

建立權限 0600 的 JSON 憑證檔，包含 `adminToken`、`applicantToken`、`recipientEmail`，內容不放 Git、公開報告或命令列。執行以下指令時使用絕對路徑：

```sh
pnpm -s tsx bin/pipeline/acceptance-fixture-cli.ts prepare --run-dir /private/path/run --credentials-file /private/path/credentials.json
pnpm -s tsx bin/pipeline/acceptance-fixture-cli.ts check --run-dir /private/path/run --credentials-file /private/path/credentials.json
pnpm -s tsx bin/pipeline/acceptance-fixture-cli.ts rebuild --run-dir /private/path/run --credentials-file /private/path/credentials.json
pnpm -s tsx bin/pipeline/acceptance-fixture-cli.ts cleanup --run-dir /private/path/run --credentials-file /private/path/credentials.json
```

## 準備與驗收

1. `prepare` 建立全新的兩個組織與邀請。重新執行應續接原 generation；遇到不確定寫入結果先核對日誌，不手動刪檔重跑。
2. 到真正的 QA 收件匣，核對組織名稱及收件人，分別開啟兩封邀請。以申請人 328 完成登入／申請；不能直接批准。工具不收取、重建或代送邀請 token，以免錯用另一組資料的連結。
3. 執行唯讀 `check`。帳號、角色、組織、成員、邀請、申請、至少剩餘 1 小時有效期及無權存取全部符合才可交接。等待收信／申請屬前置未完成；已批准／過期／出現額外成員屬資料漂移。不得把這些結果寫成產品功能失敗或通過。
4. 交接時提供本 generation 的兩個 admin-dev 組織頁、操作順序及 check 時間。先在 cancel 組織打開批准確認，按取消，確認仍無成員及申請人仍無權進入；最後才在 approve 組織成功批准並確認 owner 可進入。
5. 誤批准後停止使用該組資料，保留結果，執行 `rebuild` 退休舊 generation 並建立新組織／邀請，再依步驟 2–3 完成前置。不要加自己為 owner、移除最後 owner 或用 SQL 清空 accepted / approved 欄位。
6. 驗收結束執行 `cleanup` 並回讀結果。先撤銷未接受邀請，再停權組織；已批准 owner 留在停權組織。這是保留稽核資料的退休，不是刪除資料。

停權不會召回已寄出的信，撤銷也不能召回寄送中的 SMTP。撤銷使未接受連結失效；清理結果不代表收件匣沒有新信。

## 中斷與狀態

私有 run 目錄保存 manifest、寫入意圖、report.json 及前一代紀錄，不可改 ID 或搬入別組資料。每次執行會先把 report 標成不可交接，成功檢查後才更新結果。`check` 的 `READY` 表示基線符合；等待收信／申請回傳 exit 1，輸入或不確定操作錯誤回傳 exit 2，成功清理回傳 exit 0 與 `CLEANUP_COMPLETE`。

程序異常結束可能留下 `.lock`；先核對其中 PID 的程序確實已結束、沒有其他工作使用此目錄，再人工移除自己的殘留鎖。工具不自動接管另一個程序的鎖。工具只操作能核對名稱與 ID 的自有資源。遇到名稱不符、未知資源、無法判定的寫入結果或「已停權但仍有 pending 邀請」時停止，人工查明；不自動重新啟用組織。

本工具完成不代表 #463 驗收通過。實作、測試、PR、合併、工具實跑、PM 正式驗收分別記錄。#463 維持 Acceptance，直到正式 PM 驗收通過。

收尾檢查器的 admin-dev 適用性修正另依 PR #478 合併順序處理，不在此工具變更覆寫該檢查器。
