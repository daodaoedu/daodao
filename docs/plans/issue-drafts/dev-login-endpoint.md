# dev 環境測試登入端點（agent 冒煙用）

> 工程交接模板，由 skill／開發補充；提出者只需確認需求與驗收。AC 為本卡首次定義（無既有 FRD）。

schemaVersion: 1
templateVersion: 1

## 需求摘要（白話）

dev 環境目前唯一登入方式是 Google OAuth。新開發流程要求每次 merge 後在 dev 用「核心旅程矩陣」冒煙，但 onboarding／註冊這類旅程需要「尚未註冊」的帳號，Google 登入那一步 agent 無法自動化，還要有人到 DB 清測試帳號才能重測——#190 就是因此跳過冒煙，dev onboarding 壞了一週才發現。

要一個**只在 dev 存在**的登入端點：agent 用 `curl` 帶 secret 就能拿到「剛 Google 登入的新用戶」（temp）或「既有使用者」（user）身份的 cookie，直接跑 onboarding 或其他旅程。prod 沒有這條路由。

## 任務索引與責任

- 中央 Issue：daodaoedu/daodao#230 https://github.com/daodaoedu/daodao/issues/230
- 任務指派：沿用 GitHub Assignees；本卡以 human-driving 人工開發
- Google 需求文件：n/a：需求全文在本卡，無外部文件
- 核准需求快照：本卡 body（建立後以 issue 版本為準）
- Acceptance snapshot：本卡「驗收契約」表；S 人工任務不使用 OpenSpec
- POC：n/a：純後端端點，無 UI；判定依據 templates/development/README.md「純後端 POC 可 N/A」
- Drive 任務資料夾／驗收群組：n/a：驗證報告以 issue comment 與 Google 文件（dev-task verify 產出）交付

## 目標與範圍

- 使用者問題與完成後可觀察結果：agent 或工程師對 `server-dev.daodao.so` 送一個帶 secret 的 `POST /api/v1/auth/dev-login`，回應設好 `auth_token` cookie，之後在 `app-dev.daodao.so` 以該身份操作；`mode=temp` 時能從 onboarding 第一步跑到註冊完成；prod 打同一路徑得到 404。
- 本次包含：
  - `POST /api/v1/auth/dev-login`，body `{ email: string, mode: "temp" | "user", name?: string }`
    - `temp`：以 email 走既有 `findOrCreateTempUser`（`src/services/auth/auth.service.ts:59`）建 `temp_users` 列，回 `isTemp` JWT；googleId 用 `dev-login:<email>` 前綴避免與真實 Google ID 碰撞
    - `user`：以 email 找 `users`，找不到回 404；找到回正式 JWT
    - 兩種都用既有 `setAuthCookie`（`src/utils/cookie-config.ts:49`）設 cookie，回應 body 同 `/auth/me` 形狀，另附 `token` 方便非瀏覽器用
  - 三重保險（fail closed）：`process.env.NODE_ENV === 'dev'` **且** `process.env.DEV_LOGIN_SECRET` 非空 **且** request header `X-Dev-Login-Secret` 等於它；任一不成立 → 路由**不註冊**（app 啟動時決定），不是回 403
  - rate limit 沿用既有 auth limiter
  - 回歸測試：NODE_ENV 未設／`prod`／`production`、secret 未設、secret 錯誤四種情況路由 404；`dev` + 正確 secret 兩種 mode 各成功；`user` 找不到 404；temp 重複呼叫同 email 回同一 temp user
  - OpenAPI 產物同步（`pnpm run openapi:generate && openapi:generate-types`），route 標 `x-internal: true`
  - `daodao-infra`：dev compose／CD 加 `DEV_LOGIN_SECRET`（值放 GitHub secret，不進 repo）；prod 不加
  - `.claude/skills/dev-task/references/browser-verify.md` 補一段「dev 冒煙取 token」用法
- 本次不包含：前端任何改動；Apple 流程；prod／staging 開放；用 dev-login 取代本機開發的 Google OAuth 設定
- 風險：API（新路由）／auth（發 token）／env（新 secret）／infra（CD 變數）。主要風險是 server#190 那類「環境變數沒設就開門」——因此採 fail closed，且 CI 測試鎖住
- 涉及 repo、相依與部署順序：daodao-server（主體）→ daodao-infra（secret 注入；server 先合但沒 secret 時路由不存在，安全）→ daodao（skill 文件）

## 驗收契約

| AC ID | Required | Given／When／Then | Repo | 測試資料／角色 | 必須證據 |
|---|---|---|---|---|---|
| AC-01 | yes | Given `NODE_ENV=dev` 且 `DEV_LOGIN_SECRET` 已設／When POST dev-login `mode=temp` 帶正確 header／Then 200，`Set-Cookie: auth_token`，body `isTemporary: true`，`temp_users` 有該 email 列 | daodao-server | 全新 email `qa+<ts>@daodao.so` | 測試 + dev curl 回讀 + `/auth/me` 回讀 |
| AC-02 | yes | Given 同上／When `mode=user` 帶既有 email／Then 200，cookie 為正式 JWT，`/auth/me` 回該 user 的 nickname | daodao-server | dev DB 既有 user | 測試 + dev curl |
| AC-03 | yes | Given 同上／When `mode=user` 帶不存在 email／Then 404 | daodao-server | 隨機 email | 測試 |
| AC-04 | yes | Given `NODE_ENV` 為 `prod`、`production` 或**未設**／When POST dev-login／Then 404（與其他不存在路由同格式），app 啟動 log 不出現該路由 | daodao-server | — | 測試（三個 case） |
| AC-05 | yes | Given `NODE_ENV=dev` 但 `DEV_LOGIN_SECRET` 未設／When POST／Then 404 | daodao-server | — | 測試 |
| AC-06 | yes | Given 一切就緒但 header secret 錯誤或缺／When POST／Then 401，不洩漏 secret 是否存在 | daodao-server | — | 測試 |
| AC-07 | yes | Given AC-01 拿到的 cookie／When 在 app-dev 開 onboarding 走完三步／Then 註冊成功、`users` 出現該 email，第一步的名稱查重仍生效 | daodao-server + app-dev | temp 帳號 | 瀏覽器截圖（核心旅程 J-01 成功、J-02 重複名稱被擋） |
| AC-08 | yes | Given prod 部署／When `curl -X POST https://server.daodao.so/api/v1/auth/dev-login`／Then 404 | daodao-server（prod） | — | curl 回讀（merge 部署後由 post-merge-wrapup 執行） |
| AC-09 | yes | temp 模式同 email 連續呼叫兩次／Then 回同一 `temp_users.id`，不重複建列 | daodao-server | — | 測試 |

- 環境／語系／瀏覽器／viewport／DPR：AC-07 用 app-dev zh-TW，桌面 1280 寬；其餘為 API
- POC 容差與差異決策：n/a：無 UI
- 真實後端驗證：`https://server-dev.daodao.so`，版本以 CD run 的 image tag／`/health` 回應為證；AC-01/02 寫入後以 `/auth/me` 與 DB 回讀
- Done 條件：server PR merge + CD 部署到 dev + infra secret 設定完成 + AC-01～09 全 pass（AC-08 在 prod 下一次部署後補）；skill 文件 PR merge

## 執行政策與狀態

- 模式／writer：local / claude（human-driving）
- 已授權範圍：daodao-server 開分支、commit、push、開 PR（依既有 AGENTS 流程逐步確認）；infra secret 值由人設定
- Merge：人工；人工驗收：pending
- Ready 缺項：none（S 人工任務，AC 已定義；不設 Ready for Dev，不走自動派工）
- Run ID／狀態／state version：尚未開始
- Lease owner／fencing token／期限：未啟用（人工任務）
- 額度：not-checked（人工任務不占 pipeline 額度）
- 預算政策版本／Workers AI reservation／paid fallback：n/a：人工任務；不使用 Workers AI
- 阻塞與下一步：none；下一步依 dev-task start 建 worktree

## 跨 repo 交付索引

| Repo | 子 Issue | Base SHA | Head SHA | PR | 受驗後端 image／schema version | 狀態 |
|---|---|---|---|---|---|---|
| daodao-server | n/a：S 任務不拆子卡 | 尚未開始 | 尚未產生 | 尚未產生 | 尚未產生 | todo |
| daodao-infra | n/a | 尚未開始 | 尚未產生 | 尚未產生 | n/a：只加 env | todo |
| daodao | n/a | 尚未開始 | 尚未產生 | 尚未產生 | n/a：文件 | todo |

- 驗收報告／manifest／acceptance key：尚未產生
- AC 結果：not-run 0/9
- 回報同步狀態：pending

## 參考

- 起因：[daodaoedu/daodao#190](https://github.com/daodaoedu/daodao/issues/190) 合併收尾留言——server PR 懸置一週、dev onboarding 卡死，因缺可自動化的測試帳號而未冒煙
- 反面教材：[daodao-server#190](https://github.com/daodaoedu/daodao-server/issues/190)（NODE_ENV 未設即注入測試 user）——本卡採 fail closed 並以測試鎖住
- 流程依據：`docs/workflow.md` Phase 8 dev 冒煙、`.claude/skills/post-merge-wrapup/SKILL.md` §2.5
