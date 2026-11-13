# 發布、重試與回復

發布 runner 由 #536 提供：`daodao-f2e/scripts/blog-release.py`。執行程式必須來自獨立受保護的 `BLOG_APPROVED_RUNNER_SHA` checkout，不能使用 moving workflow SHA，也不能因 frontend 已核准就信任其內的 runner；`BLOG_APPROVED_FRONTEND_SHA` 只核准待 build 的 frontend。查實際已核准 runner checkout 的 `docs/blog/releases.md`／help，不依賴私人絕對路徑。命令不重新實作 schema 或部署策略：

```sh
python3 <approved-runner>/scripts/blog-release.py prepare --frontend-repo <repo> --frontend-sha <sha> --approved-frontend-sha <protected-pin> --content-repo <repo> --content-sha <sha> --approvals <private-file> --baseline <trusted-prior-file> --build-env <trusted-public-build-env-json> --store <store>
python3 <approved-runner>/scripts/blog-release.py activate --store <store> --release <id> --generation <monotonic-generation> --base-url <verified-origin>
python3 <approved-runner>/scripts/blog-release.py rollback --store <store> --release <previous-verified-id> --generation <newer-generation> --base-url <verified-origin>
```

`activate`、`rollback` 與 `fetch-baseline` 的 `--base-url` 必須匹配可信任呼叫端獨立設定的 `BLOG_RELEASE_BASE_URL`，不得把 request 的值直接複製到環境變數來授權自己。正式 dev origin 必須是無 credentials、path、query、fragment 的 HTTPS origin；HTTP 只供字面 loopback `127.0.0.1`／`::1` 本機 adapter。缺設定或不匹配時停止。

第一篇經明確確認沒有前次版本時可省 baseline；後續由 runner 的 fetch-baseline 取得與前版 marker 綁定的資料。原始 approvals、baseline、public-build-env JSON 都必須位於可信任呼叫端獨立設定的 `BLOG_EVIDENCE_ROOT`，並與公開 content 分離；不得由請求檔案路徑反推此 scope。唯讀 preflight 另須保留可信任 `BLOG_CONTENT_DIR`，不能從 `--content` 反推。runner 為 child validator 建獨立私有 snapshot root；字串 SHA 相等或測試 receipt 不等於人工核准。

`serve`／filesystem-http 是受控本機 adapter；不得把這個成功回報為 Linode／cloud dev 已部署。正式 adapter／必要保護設定缺失時停止在預檢或 prepared。實際 branch 是 formal prod（default dev），不能猜不存在的 main。內容 main 更新透過 scoped workflow-dispatch 觸發專用 website workflow：保護的 BLOG_FRONTEND_CHANNEL=approved-dev-bootstrap 搭配分別已審查的 runner／frontend dev pins、各自匹配的 dev push CI 與 development 人工 gate，可在 prod 合併前測試；formal-prod 則要求 runner／frontend 的 prod pins／各自匹配的 push CI。content repo 的保護設定 BLOG_FRONTEND_REF 必須匹配 dev／prod，不能取自任意請求。不得使用普通 feat push 的舊 CD。

1. 確認有效授權覆蓋 content commit、push、觸發、目標環境；不擴到 production、社群送出或無關 product。
2. 驗證清楚的 content SHA、獨立已核准 runner SHA 與 frontend SHA、私人核准證據與可信任前次發布 baseline，呼叫同一 validator。缺一語或 stale digest 在發布前停止。
3. 呼叫既有 runner，保存工作 ID／artifact digest／runner、frontend、content SHAs。等待同一個確實仍在跑的 handle；timeout 先查狀態，不重送相同 mutation。
4. 抓取、格式、build 或部署失敗立即停止；不能以空站或 force bypass 覆蓋可用版本。已 commit 不代表已部署，重試不增加重複文章。
5. 回讀目標環境兩語文章、圖片、metadata 與部署版本；可用但版本錯也算失敗。併發舊工作不得覆蓋新版本，使用 runner 的序列化／版本檢查，勿自行另造 lock。
6. 已授權回復時透過 runner 恢復上一組受驗 frontend/content 配對，重做回讀。沒有回復權限或 runner 不支援時交付確切狀態與恢復條件，不擅改線上內容。

報告格式：各階段 status（not-run/running/pass/fail/blocked）、實際版本、工作 URL、錯誤、仍可讀的上一版本。失敗不是 published；未知不是 pass。

Build env 必須是可信任私人目錄內的明確 NEXT_PUBLIC_* JSON，至少提供有效 HTTPS NEXT_PUBLIC_APP_URL 與 NEXT_PUBLIC_WEBSITE_URL；runner 不繼承 ambient public variables。缺配置時停止，避免輸出 undefined 導覽連結。
