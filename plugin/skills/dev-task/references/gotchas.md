# dev-task 實跑陷阱

規則說要做、第一次做卻會卡 5–10 分鐘的地方，依階段分組。每條是「症狀 → 做法」，附出處 issue。遇到列在這裡的症狀，先照做法處理，再懷疑程式碼。

POC 比對的陷阱在 [poc-compare.md](poc-compare.md)「`.dc.html` POC 的已知陷阱」段；核心旅程矩陣的分組規則在 [journey-matrix.md](journey-matrix.md)。

## 環境準備（Phase 1.4）

- **daodao-server 起不來，log 出現 `FUTURE_LETTER_ENCRYPTION_KEYS is required`**：`projects/` 的 `.env` 沒有這兩個變數。在 worktree 的 `.env` 補上 `FUTURE_LETTER_ACTIVE_KEY_VERSION=v1` 與 `FUTURE_LETTER_ENCRYPTION_KEYS={"v1":"<openssl rand -base64 32 的輸出>"}`，dev 用隨機 key 即可。（#167）
- **server 的 `openapi.json`／`openapi.yaml` 冒出十幾萬行 diff**：`pnpm dev` 啟動時會重寫這兩個檔，而 origin/dev 的檔案排序早已和產生器輸出不同。commit 前先 `git diff --stat`，只 commit `generated/openapi-types.ts`；兩個檔用 `git checkout origin/dev -- openapi.json openapi.yaml` 還原，重生留給獨立 chore PR。已經進 commit 的，`git reset --soft HEAD~1` 後還原再重做。（#167、#236）
- **本機連不到 `*.orb.local`（OrbStack DNS 解不到）**：指令列覆寫連線。server 用 `DATABASE_URL=…@127.0.0.1:5423`；ai-backend 用 `POSTGRES_DB_HOST=127.0.0.1 POSTGRES_DB_PORT=5423 REDIS_URL=redis://<docker inspect 出的 IP>:6379`，平台 AI 加 `INSIGHT__LLM_BACKEND=cloudflare`。（#189）

## 開發與瀏覽器驗證（Phase 2–3）

### f2e

- **跑完 `pnpm lint`／`pnpm typecheck` 後瀏覽器掉登入**：turbo 會觸發 `packages/config` 的 `generate:env`，把 `generated/env.ts` 的 `NEXT_PUBLIC_API_URL` 蓋回 `http://localhost:4000`，middleware 連不到 worktree 的 server，導去 `/auth/login` 並清掉 cookie。瀏覽器驗證期間先別跑 turbo；跑了就立刻 `cd packages/config && NEXT_PUBLIC_API_URL=http://localhost:<server port> pnpm generate:env`。掉登入時先開公開頁（`/zh-TW/challenges`）重設 cookie，再進目標頁。（#189）
- **畫面顯示 `namespace.key_name` 這種 raw key**：locale 佔位符寫成 i18next 風格 `{{count}}`。next-intl 用 ICU 格式 `{count}`，寫錯不會被 typecheck／lint 抓到，執行時 `INVALID_MESSAGE: MALFORMED_ARGUMENT` 後 fallback 成 key。查法：`grep -n "{{" packages/i18n/src/locales/*.json`。（#273）
- **practices 的 `/summary`、`/edit` 量到的是詳情頁**：非 owner 會被 `isOwner && isExpired` 導回詳情頁。測試資料用**登入者本人擁有、且 `end_date` 已過**的 practice。dev-login JWT 的 `id` 是 `users.id`（內部整數），`_id` 才是 external UUID，判斷 owner 要用 `users.id` 對 `practices.user_id`。（#240）
- **不同 route 需要不同身分**：`/auth/onboarding` 要 dev-login `mode=temp` 的新用戶、`/auth/verify-email/pending` 要未登入、`/practices/copy-success` 要帶 `?practiceId=`。rect-probe 的 `routes.json` 每條可指定 `user`／`temp`／`none`。（#239）

### admin-ui

- **驗完 product 再驗 admin-ui，admin 被踢回登入頁**：localhost 的 cookie 不分 port，product 留下的一般用戶 `auth_token` 會一起送到 admin-ui 代理的 server，而 server 讀 cookie 優先於 Bearer，`/auth/me` 回非 admin。驗 admin 前先把 `document.cookie` 的 `auth_token` 換成 admin token。（#218）
- **要用真實後台 UI 打本機 worktree 的 server**：admin-ui 的 vite 會把 `/daodao-server/*` proxy 到 `SERVER_DEV_URL`。`SERVER_DEV_URL=http://localhost:<server port> npx vite --port <port>`；登入用 `localStorage.setItem('daodao_admin_token', <dev-login token>)`，帳號用 SuperAdmin（pg-dev 的 `users.role_id=6`）。（#236）

### 核心旅程矩陣實跑

- **前端完整鏡射 server 規則，錯誤路徑發不出請求**：browser 列寫「未發請求」，另加同輸入的 curl 列證明 server 回 400。要驗「server 錯誤訊息有沒有顯示在畫面」，用「另一端已改」情境：先用 curl 封存／刪除，再從還沒重整的畫面操作，看 409／404 toast。（#189）
- **toast 截不到**：sonner toast 只活 4 秒。`playwright_click` 後下一個呼叫立刻 `playwright_screenshot`；備援是 evaluate 抓 `[data-sonner-toast]` 的文字。（#189）
- **DELETE 回 204 時 `playwright_assert_response` 直接 throw**：204 沒有 body。狀態碼改從 `notes/server-dev.log` 的 `Request completed` 撈。（#189）
- **驗證途中 `ERR_CONNECTION_REFUSED`**：本機 server 可能被其他 session 的 pkill 收掉。先 `lsof -iTCP:<port>` 確認，重啟後只重跑受影響的列。（#218）

### 寄信行為

- **要驗「寄出的信內容真的變了」**：`email.config.ts` 的 SMTP 寫死 `service: 'gmail'`，指不到 mailpit。在 server worktree 內放一支小 harness（例如 `.verify-<n>/send.ts`），在 import `email.service` **之前**覆寫 `nodemailer.createTransport`，把 `sendMail` 的 mailOptions（含最終 HTML）存檔；用 `npx ts-node --transpile-only -r tsconfig-paths/register` 跑。報告寫明「只有 SMTP socket 是替換的」；驗完刪掉 harness。測試信只寄既有帳號。（#236）
- **在後台編輯器改過的 DB 內容，復原後要回讀比對**：CodeMirror 會自動補結尾標籤，刪掉自己加的字串不等於復原。比對 `length(body)` 與原值。（#236）

### 資料庫

- **要下會回真值的 SQL**：`daodao-pg-dev` MCP 會遮罩 `external_id`、`user_id` 等欄位，連一般整數 FK（如 `cohort_enrollments.user_id`）都會換成假值，而且每次不一致。統計、篩選用 MCP 沒問題；要拿 ID 去鑄 token 或核對身分，改用 `docker exec -i pg-dev psql -U daodao -d daodao -At -c "select …"`（本機沒裝 psql，role 是 `daodao` 不是 `postgres`），或在 server 目錄用 `new PrismaClient()` 查。
- **手插測試資料時間差 8 小時**：`comments.created_at` 是 timestamp without time zone、實際存 UTC，插入時用 UTC。`practice_checkins.mood` 有 CHECK：`give_up|frustrated|bored|neutral|good|happy`。
- **dev 有的表沒有 prod 有的資料（或反過來）**：`daodao-storage/schema/*.sql` 的 seed 只在容器第一次 init 時跑一次，之後加進 seed 檔的資料不會補到既有 DB。補資料寫成 idempotent SQL 用 psql 跑；`resources` 只有 `external_id` 有 unique，`ON CONFLICT DO NOTHING` 對它無效，改用 `WHERE NOT EXISTS (… url …)`。追蹤式 migration 在 `migrate/sql/`。

## 發 PR（Phase 4）

- **`gh pr create` 報 `API rate limit already exceeded`，但 `gh api rate_limit` 顯示額度還有**：GraphQL 的二級限流，REST 正常。改用 `gh api repos/<owner>/<repo>/pulls -X POST -f title=… -f head=… -f base=… -F body=@<file>`。這樣不會觸發 `pre-pr-gate.sh`，要在該 repo worktree 內手動跑一次（靜默＝通過）：
  ```bash
  CLAUDE_TOOL_INPUT="$(jq -nc --arg c 'gh pr create --base dev --body-file <body file>' '{command:$c}')" \
  CLAUDE_WORKING_DIRECTORY="$(pwd)" bash <daodao root>/plugin/hooks/pre-pr-gate.sh
  ```
  issue comment 同樣走 `gh api …/issues/<n>/comments -X POST -F body=@<file>`。（#218）
- **刪測試需要的 `.test-integrity-review.json` 回條**：回條綁定那一次的測試 diff，留在 main 會擋下之後每個 PR 的 `test-integrity` required check。改了任何測試檔就重算 digest，PR 一 merge 就刪。完整流程見 root 的 `scripts/check-test-integrity.md`。
