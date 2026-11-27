# GitHub 排程發布

排程使用 `daodaoedu/daodao-f2e` 的 `Scheduled Blog publication` workflow，不使用 Codex 本機排程。先讀該 repo 最新 default branch 的 `docs/blog/scheduled-publication.md` 與 `docs/blog/production-publication.md`，以實際已安裝版本為準。

## 設定一次排程

1. 從對話辨識已核准的雙語版本、目標日期時間與發布授權；缺日期時間才補問，未指定時區用 `Asia/Taipei`。GitHub 每 24 小時（台北 09:00）檢查，於第一個不早於指定時間的檢查發布；遇 GitHub 延遲會在後續檢查補執行，不承諾精確分鐘。
2. 沿用既有正式發布準備：查找完整 content commit、目前線上 baseline、有效核准、production 設定及 CI，不要求使用者提供 SHA 或技術路徑。由已有授權的操作流程準備 `BLOG_PROD_CONTENT_SHA`、`BLOG_PROD_PUBLISHED_CONTENT_SHA`、`BLOG_PROD_APPROVALS`，私人證據不放入公開文章庫。排程期間保持這組設定不變。
3. 查明 default `dev` 已安裝 `blog-scheduled-publish.yml`／sync helper，且 `prod` 的 `blog-prod-publish.yml` 支援 `expected_content_sha`。缺 workflow、Actions／變數寫入能力或發布設定時，交付具體缺項；不能稱已排程。保留既有 production environment 審核規則；若執行時需人工核准，先明確告知此限制，不自行停用保護。
4. 依上述 frontend 文件的 schema，將完整目標／baseline SHAs 與含明確 UTC offset 的 `publish_at` 寫入 frontend 的 **repository variable** `BLOG_PROD_PUBLICATION_SCHEDULE`，再回讀核對。這是發布授權與設定的保存步驟，不是新一輪審稿。目前一次支援一個待發布 release（可含多篇核准文章）；已有不同排程時先說明衝突，不默默覆蓋。
5. 用 workflow 的 `dry_run=true` 檢查設定，回讀同一次工作的 decision。只驗草稿、JSON 存檔或 dispatch 成功，都不能代替 repository variable 寫入成功或預檢。若工具不能操作 Actions／variables，提供已填妥的操作交接並標示未排程；不另建本機 automation 代替。
6. 確認 production publisher 的成功驗證後續步驟已有雲端 Email 通知，收件人為 `contact@daodao.so`，且寄信憑證與寄件身分已設定。通知必須隨 GitHub 發布流程在本機關機、對話結束後仍可執行；不能只留下未來呼叫聊天 Email 工具的指示。若尚未接上，明確回報「發布已排程，Email 通知尚未設定」，列出缺少的寄信接點／設定；不宣稱會自動寄信，也不擅自更動 workflow 或憑證。

設定完成時簡短回報文章、指定時間、首次每日檢查時間、Actions 連結、「已排程，尚未發布」及 Email 通知是否已設定。未來由 production publisher 以預期 content SHA 再驗設定、核准與 CI，發布 Website 並回讀正文／圖片／marker；只有實際驗證成功才回報「發布完成」，再執行下列 Email 通知。不為排程自行製造核准或重新批准未改的版本。

## 發布成功後寄送 Email

這是排程發布的固定後續通知，收件人為 `contact@daodao.so`。沿用有效的排程發布與通知授權，不在文章已發布後重複要求確認；本節不授權另寄其他信件或收件人。

- 以該次 production publication 驗證成功為寄信條件：兩語正文、圖片及 `/blog-release.json` 均對上排程的 content SHA。預檢、dry run、尚未到期、dispatch 成功、失敗／回復或取消排程都不寄發布成功通知；只看 scheduler job 成功不足以寄信。
- 主旨使用「[島島 Blog] 排程文章已發布：<文章標題>」。內文列出文章標題、中英文正式網址、實際驗證成功時間（`Asia/Taipei`）、content SHA 與 production Actions 連結。同批多篇文章可合併一封並逐篇列出；不附私人核准資料或憑證。
- 沿用發布流程的持久通知紀錄，以 content SHA、文章 ID 與收件人識別已通知項目。成功保存寄信服務接受的 message ID／時間；這只代表服務接受寄送，不宣稱收件匣已收到。workflow 重跑或後續每日檢查先查紀錄，不重複寄已成功項目；timeout 結果不明先查寄信服務狀態，不盲目重送。
- 寄信失敗或缺設定時，保留「文章已發布，Email 通知未完成」及可追查原因與待寄資料；即使完成排程清理也須保留獨立通知紀錄。只補通知，不重新發布或 rollback 已上線文章，也不套用文章發布的自動重試次數。只有取得寄信成功證據才回報「已寄送通知至 contact@daodao.so」。

## 改期、取消與失敗

- 改期前回讀現有排程及進行中的 publication；保留核准版本，只更新授權內的日期時間。內容變更須重新確認對應核准與發布設定。
- 取消以刪除該 repository variable 並回讀確認。已進入 production queue 的工作須另查狀態；刪除變數不代表已停止在跑的發布，不擅自 rollback。
- 已發布的相同 content 不重發；失敗最多再試一次，後續 daily check 會停止自動重試並保留 Actions／既有 Discord 告警。不要由 skill 另造重試或跨 repo dispatch。
- 驗證成功後，依現有操作流程更新 published baseline，清除完成的排程。新排程不可繞過上一個未完成工作的查核。
