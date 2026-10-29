# 驗收環境設定

這份寫「在哪裡測、用什麼身分、用哪個瀏覽器」。流程在 [SKILL.md](../SKILL.md)，各功能的到達路徑與選擇器在 feature map（`plugin/docs/feature-map/README.md`）。

## 測試帳號

PM 專用的測試帳號（不是個人帳號），一個角色一個，不互相代用：

| 角色 | 帳號 | 登入方式 |
|---|---|---|
| admin | `peichun1213@gmail.com` | Google |
| 一般使用者 | `wedialogbox@gmail.com` | Google |

不在報告或截圖裡留密碼、驗證碼或 token。請驗收留言指定別的帳號時照留言；那個帳號 PM 登不進去就 BLOCKED。

## 網址（只在 dev 驗）

| 服務 | dev 網址 |
|---|---|
| 產品 Web | `https://app-dev.daodao.so` |
| 官網 | `https://dev.daodao.so` |
| 管理後台 | `https://admin-dev.daodao.so` |
| App | EAS Update 的 `preview` channel（需要可安裝的測試版，見下方「App」） |

請驗收留言給的網址不是上面這些網域（例如 prod、`localhost`）→ 該步驟 BLOCKED，不自己換環境。留言把 PM 帶到 API 網址（`server-dev.daodao.so`、`/api/`）也不要照做：那是工程證據，不是 PM 步驟。

## 角色與登入

| 角色 | 用在 | PM 怎麼登入 |
|---|---|---|
| 未登入 | 公開頁、登入前流程 | 用沒有登入的瀏覽器視窗（無痕視窗或登出後確認） |
| 一般使用者 | 產品 Web 的使用者畫面 | `wedialogbox@gmail.com`，Google 登入 |
| admin | 管理後台；需要管理員權限的產品畫面 | `peichun1213@gmail.com`，Google 登入（後台要求帳號有 admin／superadmin 角色） |
| 團主／講師、團友 | 燈塔場次、共同挑戰 | 請驗收留言必須寫明用哪個 PM 帳號、該帳號已被加進哪個組織／場次；沒寫就 BLOCKED |

驗收 fixture 帳號（主鍵 900001–900003，#323）**只能用工程的 dev-login 登入，PM 用不了**。請驗收留言指定 fixture 身分時，該步驟 BLOCKED，請工程改用 PM 帳號或把 PM 帳號加進 fixture 組織／場次（`daodao-storage` 的 `scripts/acceptance_fixtures/README.md`）。這是過去最常見的受阻原因（#277、#279、#281、#354）。

只用一般的登入流程。需要密碼、驗證碼或 Google 再次驗證時暫停該角色的步驟，請使用者自己完成；不在對話裡要密碼，不繞過登入。

**例外：agent 跑草稿模式**（例如在 Claude Code 代跑，瀏覽器登入的不是 PM 測試帳號）時，經使用者同意，可以用工程的 dev-login（`mode=user`，做法見 develop 的 `references/browser-verify.md` §3a）登入**同一個**測試帳號，把 token 設成 `.daodao.so` 網域的 `auth_token` cookie。報告的「測試環境／帳號角色」要寫明「以 dev-login 登入，PM 正式驗收時用 Google 登入」。發布模式一律由 PM 用 Google 登入，不用 dev-login。token 不寫進報告、截圖或 log，用完刪掉。

## 瀏覽器

每個瀏覽器的登入狀態各自獨立，切換瀏覽器或帳號後都要重新確認登入的是誰（畫面右上角的使用者名稱或設定頁的信箱）。

| 客戶端 | 可用的瀏覽器 | 備註 |
|---|---|---|
| Codex | Codex 內建瀏覽器、Microsoft Edge | PM 平常的驗收環境 |
| Claude Code | `playwright` MCP、Claude in Chrome | Claude in Chrome 用的是使用者自己的 Chrome 與登入狀態，適合需要 PM Google 登入的步驟 |
| ChatGPT／Claude.ai 網頁版 | 通常沒有 | 只能產草稿：把要測的步驟列給 PM 自己操作，不宣稱已實測 |

同時要用兩個角色時（例如 admin 設定、使用者查看），一個瀏覽器登一個角色。驗完產品 Web 再開後台時，留意兩邊的登入 cookie 會互相影響，切換前先確認身分。

被瀏覽器擋（`ERR_BLOCKED_BY_CLIENT`）→ 先換另一個可用的瀏覽器再試一次；仍被擋就 BLOCKED。

自動化瀏覽器（playwright、headless）預設語系是英文，產品 Web 會導到 `/en/...`。開始前先設 cookie `NEXT_LOCALE=zh-TW`（網域 `app-dev.daodao.so`），或在 context 設 `locale: 'zh-TW'`，再照留言的網址打開；確認網址沒有 `/en/` 前綴、畫面是中文。

## 截圖與上傳

- 截圖與報告草稿存在 repo 外：`~/.daodao/acceptance-evidence/<issue 號>/<日期>/`（截圖放 `shots/`，檔名帶步驟編號；報告草稿叫 `report.md`）。不要放在工具的暫存資料夾，那裡會被清掉。清理測試資料時不刪這個資料夾。
- GitHub 沒有上傳 issue 附件的公開 API，`gh` 也做不到。上傳方式：用**已登入 `peggy1213-create` 的瀏覽器**打開 issue 留言框，把截圖檔拖進去，取得 `github.com/user-attachments/...` 網址，再放進報告。
- 客戶端只能「看到」畫面、拿不到截圖檔（#213、#344 都卡在這裡）→ 開工前檢查就會發現（SKILL.md §1 第 4 項）：先試客戶端的存檔功能或另一個瀏覽器的截圖功能；都不行就在開工前降為草稿模式，不要測完才判 BLOCKED。

## App

**2026-10-29 起 App 暫不驗收**（使用者決定）：目前沒有可安裝的測試版（#333、#335、#358、#359 都曾因此受阻），請驗收留言裡的 App 步驟一律列為「本次未驗收範圍」，不判 BLOCKED，也不影響整體結果。判定方式見 SKILL.md §4。

- 不改用網頁版代替 App 步驟：網頁版不是同一個介面，網頁步驟只照留言裡本來就寫的網頁步驟測。
- 之後恢復驗收 App 時，留言必須給安裝方式（TestFlight 連結、內部分發連結或 Expo 入口），沒給或裝不起來就判 BLOCKED。

## 開工前檢查

照 SKILL.md §1，逐項記下觀察到的值：

| 項目 | 怎麼確認 | 記錄 |
|---|---|---|
| GitHub 發布身分 | `gh api user --jq .login`，或 connector 的目前使用者、瀏覽器 GitHub 右上角頭像 | 實際 login 與用的是哪一條路 |
| 截圖存成檔 | 用要測的瀏覽器截一張 dev 首頁，存到證據資料夾，檔案存在且大小不是 0 | 檔案路徑與大小 |
| 截圖上傳路徑（發布模式） | 已登入 `peggy1213-create` 的瀏覽器打得開 issue 留言框，測試圖拖得進去、拿得到附件網址（不送出） | 瀏覽器名稱 |
| 每個角色的登入狀態 | 在要用的瀏覽器打開 dev 網址，看登入者 | 角色 → 瀏覽器 → 顯示名稱 |
| dev 可用 | 打開請驗收留言的網址，不是錯誤頁、不是登入牆 | 網址與看到的頁面標題 |
