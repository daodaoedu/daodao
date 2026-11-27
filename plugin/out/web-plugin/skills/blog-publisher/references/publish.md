# 執行細節

先沿用工作區與既有 workflow 的設定；以下是 AI 執行時查用的細節，不是要求使用者逐項填寫的表單。發布時讀所用 runner checkout 的 `docs/blog/releases.md`／CLI help，以該版本支援的流程為準。

## 唯讀預檢

定位 frontend 與 content checkout，讀該 frontend 版本的 `packages/blog-content/README.md`，用 [預檢轉接器](../scripts/preflight.py) 呼叫唯一 validator：

```sh
python3 <skill-dir>/scripts/preflight.py --frontend <frontend-checkout> --content <content-checkout> --approvals <private-approvals> --baseline <trusted-published-baseline>
```

- 純草稿檢查加 `--mode draft`，沒有核准紀錄時省略 `--approvals`；結果不代表已核准。新文章沒有前次發布 baseline 時可省略 `--baseline`；既有文章須用可信任前次發布 manifest。
- 可信任工作區須先設定 `BLOG_CONTENT_DIR`，與 content checkout 一致。讀私人 JSON 前須有獨立設定的 `BLOG_EVIDENCE_ROOT`，與公開內容分離；不得從文章、`--content` 或 JSON 路徑反推授權範圍。實際路徑與私人檔案範圍由 shared validator 檢查，轉接器不重寫規則。
- config 產物缺失時，已授權的環境準備步驟可執行 `pnpm --filter @daodao/config generate:env`；唯讀預檢不生成、不安裝、不 commit／push／build／deploy。
- 保留 validator 的具體檔案、錯誤與 exit code。缺 pnpm、package 或權限就回報缺項，不跳過檢查。schema、digest、圖片規則皆由 `@daodao/blog-content` 維護，不在 skill 複製。

## 發布設定與命令

發布 runner 由 #536 提供：`daodao-f2e/scripts/blog-release.py`。優先使用已設定的發布 workflow，由它承接受保護設定與 runner 呼叫；直接執行 runner 時遵守相同設定與授權。

執行程式必須來自獨立受保護的 `BLOG_APPROVED_RUNNER_SHA` checkout，不能使用 moving workflow SHA，也不能因 frontend 已核准就信任其內的 runner；`BLOG_APPROVED_FRONTEND_SHA` 只核准待 build 的 frontend。runner／frontend／content SHAs 分開記錄，來源 scopes、目標 origin 與 public build env 取自受保護設定，不從同一不可信請求複製。

```sh
python3 <approved-runner>/scripts/blog-release.py prepare --frontend-repo <repo> --frontend-sha <sha> --approved-frontend-sha <protected-pin> --content-repo <repo> --content-sha <sha> --approvals <private-file> --baseline <trusted-prior-file> --build-env <trusted-public-build-env-json> --store <store>
python3 <approved-runner>/scripts/blog-release.py activate --store <store> --release <id> --generation <monotonic-generation> --base-url <verified-origin>
python3 <approved-runner>/scripts/blog-release.py rollback --store <store> --release <previous-verified-id> --generation <newer-generation> --base-url <verified-origin>
```

`prepare` 只產 immutable artifact；`activate`／`rollback` 才改受控部署指標及回讀。命令不重新實作 schema 或部署策略。

`activate`、`rollback` 與 `fetch-baseline` 的 `--base-url` 必須匹配可信任呼叫端獨立設定的 `BLOG_RELEASE_BASE_URL`，不得把 request 的值直接複製到環境變數來授權自己。正式 dev origin 必須是無 credentials、path、query、fragment 的 HTTPS origin；HTTP 只供字面 loopback `127.0.0.1`／`::1` 本機 adapter。缺設定或不匹配時停止。

第一篇經明確確認沒有前次版本時可省 baseline；後續由 runner 的 `fetch-baseline` 取得與前版 marker 綁定的資料。原始 approvals、baseline、public-build-env JSON 都必須位於可信任呼叫端獨立設定的 `BLOG_EVIDENCE_ROOT`，並與公開 content 分離；不得由請求檔案路徑反推此 scope。唯讀 preflight 另須保留可信任 `BLOG_CONTENT_DIR`，不能從 `--content` 反推。runner 為 child validator 建獨立私有 snapshot root；字串 SHA 相等或測試 receipt 不等於人工核准。

Build env 必須是可信任私人目錄內的明確 `NEXT_PUBLIC_*` JSON，至少提供有效 HTTPS `NEXT_PUBLIC_APP_URL` 與 `NEXT_PUBLIC_WEBSITE_URL`；runner 不繼承 ambient public variables。缺配置時停止，避免輸出 undefined 導覽連結。

## 環境與 workflow

`serve`／filesystem-http 是受控本機 adapter；不得把這個成功回報為 Linode／cloud dev 已部署。正式 adapter／必要保護設定缺失時停止在預檢或 prepared。

實際 branch 是 formal prod（default dev），不能猜不存在的 main。內容 main 更新透過 scoped workflow-dispatch 觸發專用 website workflow：保護的 `BLOG_FRONTEND_CHANNEL=approved-dev-bootstrap` 搭配分別已審查的 runner／frontend dev pins、各自匹配的 dev push CI 與 development 人工 gate，可在 prod 合併前測試；formal-prod 則要求 runner／frontend 的 prod pins／各自匹配的 push CI。content repo 的保護設定 `BLOG_FRONTEND_REF` 必須匹配 dev／prod，不能取自任意請求。不得使用普通 feat push 的舊 CD。

## 重試、回復與證據

- 有效授權須涵蓋實際 content commit、push、觸發與目標環境；不擴到 production、社群送出或無關 product。缺一語或 stale digest 在發布前停止。
- 保存工作 ID／URL、artifact digest、runner／frontend／content SHAs 與各階段 status（not-run/running/pass/fail/blocked）。等待同一個確實仍在跑的 handle；timeout 先查狀態，不重送相同 mutation。
- 抓取、格式、build 或部署失敗立即停止；不能以空站或 force bypass 覆蓋可用版本。已 commit 不代表已部署，重試不增加重複文章。
- 回讀目標環境兩語文章、圖片、metadata 與部署版本；可用但版本錯也算失敗。併發舊工作不得覆蓋新版本，使用 runner 的序列化／版本檢查，勿自行另造 lock。
- 已授權回復時透過 runner 恢復上一組受驗 frontend/content 配對，重做回讀。沒有回復權限或 runner 不支援時，交付確切狀態、仍可讀的上一版本與恢復條件。此入口不修網站功能來掩蓋發布失敗。

對外只摘要結果、文章／工作連結或阻礙；需要追查時提供上述紀錄。失敗不是 published；未知不是 pass。
