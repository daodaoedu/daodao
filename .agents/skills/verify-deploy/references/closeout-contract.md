# Post-merge 收尾完成契約

這個檢查防止 #401 的重複失敗：Git 已乾淨、工程冒煙 PASS，但沒有 PM 資料、重播與交接，agent 就停止。它檢查本輪證據是否存在、內容有無矛盾及是否綁定同一交接；不是用 JSON 證明瀏覽器真的操作過，也不取代獨立自審。各階段證據的來源、部署 revision 是否包含合併 commit、冒煙是否針對該環境，仍依 verify-deploy §2.5 查核；此 checker 不遞迴驗證 wrapper 內的遠端 revision 關係，也不能從帳號或網址字串推斷自然語言步驟的角色語意。

## 收據與完成條件

`begin` 在 task 目錄建立 `post-merge-closeout.json`，既有事實與證據不覆寫；每次 begin 只更新 `last_begin_at`，要求 blocked 在本輪重新觀察，避免手動客戶端一直沿用舊 502。`goal` 固定 `pm-handoff`，不能自行縮成 smoke-only。每筆本機證據用 task-relative `path` 與實際檔案的 SHA256；token、密碼、Google 憑證不進收據。

完成收據包含：

| 欄位 | 必須能核對的內容 |
|---|---|
| merged / deployed / smoke | 各自的遠端合併、目標環境部署與實際冒煙證據，不能互相代替 |
| plan | 確定版交接草稿 digest、指定帳號、資料直接連結、從草稿「驗收步驟」編號擷取的逐步 ID、`step_contexts` 的每步指定帳號／資料、操作前預期基準；計畫內帳號與資料網址須明載於同一草稿；資料網址限 dev 前台 `https://app-dev.daodao.so` 或 dev 後台 `https://admin-dev.daodao.so` |
| replay | PM UI 重播結果；同一草稿 digest／帳號／資料／步驟，每步 PASS 並附原始證據，含起訖時間 |
| restore | 重播之後的唯讀前置檢查 PASS；基準與實際還原資料一致，不只宣稱「已還原」 |
| retention | 同一份 PM 資料仍保留、尚未到期、已實跑的重設證據；純唯讀項改附未變更與基準回讀證據，不要求重設腳本。不得指向工程清理已刪的資料 |
| lint | 對同一草稿帶原 issue 與逐 AC coverage 執行 acceptance-lint（`--issue`、`--coverage`），exit 0 並記錄早於 UI 重播開始的 observed_at；不在重播後才補齊草稿必填欄位 |
| handoff | 發布的交接留言、同草稿 digest、Acceptance／issue OPEN、assignees 含 PM_LOGIN、labels 不含 acceptance:blocked 的遠端回讀 |

handoff 結構化證據的 `pm_login` 必須從當前 `bin/pipeline/types.ts` 的 PM_LOGIN 取得，`assignees` 與 `labels` 保存 GitHub 回讀的 login／label 名稱陣列；checker 優先從綁定 task 的父目錄定位 monorepo 的 bin/pipeline/types.ts 讀取 PM_LOGIN（支援安裝版 plugin），repo-local 執行才可退回腳本所在 monorepo，無法讀取就不放行；核對設定 PM 與清除受阻，仍不能自行證明遠端資料真實。

可執行範例與結構以 `plugin/hooks/__tests__/test_post_merge_closeout.py` 的 `complete()` 為準；正式任務必須換成真實操作的資料、證據與時間，不能複製測試中的 PASS。草稿修改後 digest 改變，就要重新核對受影響步驟與 lint，不沿用先前版本的收據。

## blocked 不是完成

只接受查證後的外部前提：維護、工具故障、登入／權限不足或必要產品決策。需有最近的失敗原始證據、觀察時間、已嘗試路徑、AI 無法自行處理的具體原因、恢復條件與下一步。#376 受控停寫期間的 API 502 可以是外部阻擋；「尚未準備 fixture」「沒有被另行叫我交接」不是。

`check` 對 complete/incomplete/blocked 分別 exit 0/1/3。blocked 只容許誠實回報未完成，不可寫交付完成或移 Acceptance；恢復後仍須重新查證。每次失敗嘗試需有 `observed_at`，其結構化證據 JSON 的 `observed_at` 須一致；外層 blocker 時間須等於最新嘗試，不能只改外層時間沿用舊證據。每次允許 blocked Stop 後更新 session 的觀察門檻，下次停止前必須重新查證。

## Session 範圍與客戶端能力

`begin` 將本 session ID 的雜湊綁定至這份收據，位置在使用者 cache 下 `daodao-harness/post-merge/`。Stop 只讀精確的 session 綁定，未綁定不介入；不得從 cwd、其他 worktree 或全域 62 張 task 猜本輪目標。明確綁定卻缺檔／格式錯誤時不能默默放行。

這是明確註冊任務的收尾契約，不是對所有 session 啟用的新全域掃描。已綁定任務的 incomplete 會由 Stop 回 exit 2；有效 blocked 允許停止但仍回報未完成。Claude／Codex 的 Stop 接入沿用既有 hook 設定；客戶端未信任或不支援 hook 時，用 `begin --no-bind` 建收據並主動跑 `check`。本機測試不能冒稱已在真實客戶端自動攔截，須另附實際 client 觸發紀錄。

## 使用者明確停止或變更範圍

使用者後來明確要求暫停、取消或限縮範圍時，遵循其指示。以 `release --reason <原因> --evidence <task相對路徑>` 保存該次使用者指示並解除精確session綁定；保留原收據未完成狀態與release稽核，不改成 handed-off。這不是 agent 方便停工的 escape：沒有實際使用者指示不可使用，也不刪其他session綁定。

## Codex 啟用確認

[官方 hooks 定義](https://developers.openai.com/codex/hooks#stop) 要求 Stop 成功輸出為 JSON；exit 2 的 stderr 可要求繼續工作。舊 advisory 保留在 stderr，不能污染成功 JSON。非受管 hook 或其腳本變更後須由客戶端重新 Review hooks／信任；產物生成與 shell 測試不等於信任已完成，勿自動改寫使用者信任紀錄。未信任時仍執行必要的 CLI check，並明列自動 Stop 尚未驗證。
