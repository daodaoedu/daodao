# 瀏覽器驗證 — 操作細節

## 1. 起 dev server

在任務資料夾的 worktree 內起（不是 `projects/`）：

```bash
cd "$TASK/daodao-f2e/apps/<product|mobile|website>"
pnpm dev   # port offset ≠ 0 時：pnpm dev --port <預設+offset>
```

- 起完先 curl 確認有回應再開瀏覽器
- 依賴後端的頁面：確認本地 docker（server/DB）在跑，或 task.md 備註要連哪個環境
- **任務本身有改 server**：必須跑「任務資料夾裡的 server worktree」，不是 `projects/daodao-server`——驗到舊版後端等於沒驗。先停掉 projects 版的 server container/process 再起任務版

## 2. 展開檢查清單

驗證前先把「要驗什麼」寫成清單，來源優先序：

1. FRD 的驗收條件（task.md 連結的 `docs/product/...`）
2. task.md 的 phases（每個 phase 至少一條）
3. 基本盤（每次都驗）：
   - console 無新增 error
   - 改動頁面在桌機 + 行動版寬度（390px）下版面正常
   - **版面探針**（見 §4a）：每條 route × 390／1024／1440 無登入牆、無橫向溢出、無出界元素
4. **核心旅程矩陣**（有寫入路徑就必填，見 [journey-matrix.md](journey-matrix.md)）：任務碰到的每條「建立／編輯／刪除／送出」旅程，至少一列用真實輸入送出成功、一列用 server 會拒絕的輸入送出失敗。「點擊、輸入、送出可走通」不是驗收條件——**用什麼輸入送出、server 回了什麼、畫面顯示了什麼**才是。沒有寫入路徑時寫一行 `核心旅程不適用：<原因>`。

## 3. 工具選擇

**一律使用 `playwright` MCP**（`mcp__playwright__*`），不使用 `claude-in-chrome` MCP。

| 用途 | 工具 |
|---|---|
| 導航、互動操作 | `playwright_navigate`、`playwright_click`、`playwright_fill` |
| 截圖（存檔 + 視覺確認） | `playwright_screenshot`（`savePng` 存到 `$TASK/evidence/`） |
| 讀取頁面文字 | `playwright_get_visible_text` |
| 注入 JS（設 cookie、量測尺寸） | `playwright_evaluate` |
| 讀 console | `playwright_console_logs` |
| 對照設計稿 | Figma MCP `get_screenshot`（task.md 的 Figma 連結） |

注意：不要觸發 alert/confirm 對話框（會卡住 session）。

**多任務競爭瀏覽器時**：playwright MCP 是共用單一瀏覽器實例——兩個 session 同時用會互踩。發現被佔用時，寫一支獨立 Playwright script 用 `npx playwright` 跑 headless 截圖：
```bash
cd "$TASK/<repo>" && npx playwright screenshot --viewport-size=390,844 \
  http://localhost:<port>/<path> ../evidence/<phase>-<checkpoint>.png
```

## 3a. 登入牆處理（碰到「要登入才能看」時，先自己解，不要直接丟回給使用者）

**硬規則：登入牆截圖 = 該頁未驗證。** 導頁後 `location.pathname` 落在 `/auth/*`、`/login` 的截圖不能存進 evidence/ 當檢查點證據，task.md 也不能寫「需要手動驗證（需 Google OAuth 登入）」然後把 Status 往下推——#166 就是這樣把 6 個 settings 頁面沒看過就 merge，evidence 裡的 `verify-bug-report.png` 其實是 "Welcome back to Dao Dao!"。發 PR 閘門 `pr-verify-unchecked` 會擋這種清單；`layout-probe.mjs` 也會把落在登入牆的 route 標 ❌。走下面配方 A／B 登入後再驗，全部配方都不通才請使用者手動登入，並在該項寫「（豁免：<使用者說的原因>）」。

**daodao 現成配方 A：dev-login 端點（部署後冒煙、要「全新帳號」時優先走這條）**

`POST /api/v1/auth/dev-login`（[daodao#230](https://github.com/daodaoedu/daodao/issues/230)）只在 server-dev 掛載，需要 `DEV_LOGIN_SECRET`（放在 `~/.claude/projects/-Users-xiaoxu-Projects-daodao/dev-login-secret.txt`，缺了請使用者從 GitHub environment secret 抄一份；不進 repo、不貼對話）：

```bash
SECRET=$(cat ~/.claude/projects/-Users-xiaoxu-Projects-daodao/dev-login-secret.txt)
# temp：模擬「剛 Google 登入、尚未註冊」的新用戶 → 可直接跑 onboarding；同 email 重複呼叫回同一個 temp user
curl -s -X POST https://server-dev.daodao.so/api/v1/auth/dev-login   -H "content-type: application/json" -H "x-dev-login-secret: $SECRET"   -d '{"email":"qa+<task>@daodao.so","mode":"temp","name":"冒煙 QA"}'
# user：以既有 email 取得正式用戶身份
curl -s ... -d '{"email":"<既有 email>","mode":"user"}'
```

回應 `data.token` 就是 `auth_token` cookie 的值，後續注入方式同下方步驟 3；`mode=user` 找不到 email 回 404，secret 錯回 401，prod 沒有這條路由（404）。每個任務用獨立 email（`qa+<issue#>@daodao.so`），冒煙完把 `temp_users`／註冊出來的 `users` 清掉。

**daodao 現成配方 B：預存 JWT（既有使用者、本機 dev server）**：

1. **讀取 JWT**：`~/.claude/projects/-Users-xiaoxu-Projects-daodao/dev-jwt.txt`（使用者預存的 JWT，過期時請使用者更新）
2. **確保 API 可達**：
   - 本地 server 在跑（`curl -s localhost:4000/api/v1/challenges`）→ 直接用
   - 沒跑 → 起 CORS 反向代理（見 memory `feedback-dev-login-jwt`），確認 `.env.local` 的 `NEXT_PUBLIC_API_URL=http://localhost:4000`
3. **注入 auth 狀態**（用 `playwright_evaluate`，cookie 名稱是 `auth_token`）：
   ```js
   document.cookie = 'auth_token=<JWT>;path=/;max-age=86400';
   localStorage.setItem('_userinfo', JSON.stringify({
     id:"<users.external_id>", customId:null,
     email:"<email>", name:"<name>", photoUrl:null,
     roles:["SuperAdmin",...], permissions:[]
   }));
   ```
   先在公開頁（如 `/zh-TW/challenges`）設定，再導航到需要登入的頁面。

**跨域注意**：f2e API client 用 `credentials: "include"`，cookie 必須跟 API 同域。本地 server（localhost:4000）天然同域沒問題；連 server-dev.daodao.so 時**必須**透過本地代理，不能直連——瀏覽器不會把 localhost cookie 帶給不同域的 API。

**其他專案的通用步驟**（daodao 配方不適用時）：

1. 找 dev 登入後門：`rg -i "dev.*login|test.*login|bypass|impersonate" <server>/src`
2. 自己鑄 session：讀 auth 實作，用 `.env` 裡的 secret 簽 JWT，用 `playwright_evaluate` 注入 cookie
3. 直接打 auth API：curl 走非 OAuth 途徑拿 Set-Cookie
4. 以上全部不通才請使用者手動登入

## 4a. 版面探針（UI 任務必跑；發 PR 閘門 `pr-layout-probe-missing` 檢查）

肉眼看截圖抓不到「整頁多 132px、右邊被 overflow-hidden 切掉」這種問題（#233：settings 十五頁 `w-screen` 疊在 layout 的 `md:pl-[132px]` 上，2026-03 進來、2026-09 才被使用者發現），所以量：

```bash
cd "$TASK/daodao-f2e/apps/product"    # admin-ui 則是 repo 根；腳本從 cwd 的 node_modules 找 @playwright/test，f2e 只裝在 apps/product
TOKEN=$(curl -s -X POST https://server-dev.daodao.so/api/v1/auth/dev-login ... | jq -r .data.token)   # 見 §3a 配方 A
node "$ROOT/.claude/skills/dev-task/references/layout-probe.mjs" \
  --base http://localhost:3001 \
  --routes /zh-TW/settings,/zh-TW/settings/bug-report \
  --cookie "auth_token=$TOKEN" --cookie-domain localhost \
  --out "$TASK/evidence/verify-layout-probe"
```

- 預設寬度 390／1024／1440（`--widths` 可改）；每組量三件事：落在登入牆 → ❌、`scrollWidth > innerWidth` → ❌ 並印出最寬元素、`main`／`[role=dialog]`／`aside` 內元素超出 viewport → ❌
- 產出 `verify-layout-probe.md`（「### 版面探針」表，整段貼進 task.md「## 驗證」底下）、`.json`、每組一張截圖
- 有 ❌：修掉重跑，不能自行放過；表裡留 ❌ 發 PR 會被擋
- `--routes` 要列**任務碰到的每條 route**，包含新開的頁、改了共用 layout／元件時所有掛在它底下的頁（#166 改了 sidebar，settings 全部子頁都算）
- 本機 dev server 連 server-dev 時 cookie 跨域問題同 §3a：先起 CORS 代理（`.cjs` 副檔名——monorepo 根 package.json 是 `"type": "module"`，`.js` 會被當 ESM 炸 `require is not defined`），`--cookie-domain localhost`
- 拿不到 `[id]` 動態 route 的真實 id 時，先打 `GET /api/v1/auth/me` 取 `data.user.id`；空 id 會落在別的頁，探針表的「落點」欄要對得上 route
- `--out` 用絕對路徑；產出的 md 有 route 表，另有真實 id 的補跑結果要合併進 task.md 同一張表
- diff 完全沒碰頁面／版面（只改 i18n 字串、純 hook 邏輯）時，在 task.md「## 驗證」寫一行 `版面探針不適用：<具體原因>`

## 4. 驗證迴圈

對清單每一項：

1. 操作 → 觀察結果
2. 截圖存 `$TASK/evidence/<phase>-<checkpoint>.png`
3. 與 POC / Figma 比對（版面、間距、狀態）——完整流程見 [poc-compare.md](poc-compare.md)（起 POC server、並排截圖、量測差異表、寫進驗證報告）。**涉及 padding / margin / gap / 寬高 / 對齊時，一律用量測數字比對，不能只憑截圖肉眼判斷**（人眼看螢幕截圖對這類數值極不可靠，尤其有 DPI 縮放或多螢幕環境時）。做法：先把 POC 逐項讀過列成清單（元素、間距值），不要事後憑印象回想；用 `javascript_tool` 對實作頁面注入 probe 讀 `getComputedStyle` 與 `getBoundingClientRect()`，能起本地 server 開 POC 檔案的話（`python3 -m http.server` 起 POC 所在資料夾，`file://` 常被瀏覽器擴充功能擋掉）就對 POC 也跑一次同樣的 probe，兩邊數字對不上才算沒過：
   ```js
   const el = document.querySelector('<selector>');
   const cs = getComputedStyle(el);
   JSON.stringify({ padding: cs.padding, gap: cs.gap, width: cs.width, rect: el.getBoundingClientRect() });
   ```
   截圖仍要留（存 evidence/）當證據，但**量測數字才是判斷依據**，不是截圖本身。
4. 讀 console（`read_console_messages`，用 pattern 過濾）確認無新 error
5. **旅程列（矩陣 J-xx）多做兩件事**：送出前先掛 `playwright_expect_response`（對 API path），送出後用 `playwright_assert_response` 讀 status 與 body，把狀態碼寫進「實際」欄；錯誤路徑要再確認三件事——server 訊息有顯示在畫面上、和 response body 的 message 一致、使用者輸入沒被清掉（React 19 form action 完成後會 reset 表單，#188 就是這樣把欄位清空的）。靠 toast 一閃而過的訊息要截到圖，截不到就用 `playwright_get_visible_text` 抓文字存進備註
6. 記入 task.md「驗證」區塊：✅/❌ + 截圖檔名 + 備註；旅程列記在「### 核心旅程矩陣」表格

**失敗**：修復 → 只重驗該項。同一項修 2 次仍失敗 → 停下來，把現象（截圖 + console + 重現步驟）整理給使用者判斷。同一類問題被使用者連續指正兩次以上，代表驗證方法本身有問題（通常是又用了肉眼截圖比對），不是再找一個漏網之魚就好——這是換成量測方法的訊號。

## 5. 純後端任務的替代驗證

無 UI 變更時跳過瀏覽器，改為：

- 新/改 API：curl 實際打一輪（正常 + 邊界 + 錯誤輸入），記 request/response 到 task.md；同樣填「### 核心旅程矩陣」，FE 規則來源欄寫 `—`，證據欄放 `-w '%{http_code}'` 的輸出檔（`evidence/verify-jNN.txt`）。錯誤路徑的 response body 要有可給前端顯示的欄位級訊息，不能只回通用字串
- migration：在本地 DB 跑過 + rollback 測試（psql，遵守 idempotent 原則）
- 有整合測試就跑整合測試

## 6. 驗證結果的去向

- task.md「驗證」區塊 = 完整記錄（含失敗與修復過程）
- PR body 的 Test plan = 通過項目的摘要（勾選狀態）
- issue comment（finish 階段步驟 8）= 對外回報：PR 連結 + 驗證摘要 + known incomplete scope
- `evidence/` 截圖留在任務資料夾，cleanup 時隨資料夾刪除；需要留存的關鍵截圖由使用者拖進 PR/issue
