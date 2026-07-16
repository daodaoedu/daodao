---
name: debugging-playbook
description: 你觀察到以下任一狀態時載入：新使用者登入失敗但舊使用者正常；Cloudflare 回 520/502/413；nginx 報 no live upstreams；CI 突然 format 紅但本地綠；cold clone 後 typecheck/lint 大量報錯；EAS/mobile build 失敗；feed 無限滾動提早停止或重複頁；deploy job 被跳過或被取消；改了 nginx 設定但行為沒變
---

# 除錯手冊（症狀 → 分診）

> 最後校準：2026-07-14。每條都來自本專案真實事故（附 commit）。先對症狀查表，再開始通靈。

## 症狀表

### 1. 新使用者 OAuth 登入失敗（`/auth/error?reason=passport_error`），既有使用者正常

- **觸發**：只有「首次登入」的使用者失敗；server log 有 PG insert 錯誤。
- **步驟**：passport strategy 內的 DB 失敗會冒泡成通用 `passport_error`，錯誤訊息不會告訴你是欄位問題。具體查法：(1) server 錯誤 log 用 `docker logs <server container>`——**別找 PM2 log，它導到 /dev/null**（run-and-operate O4）；(2) 查 **prod 實際**的欄位約束用 daodao-mcp pg server 的 `describe_schema`（diagnostics-and-tooling T1）——**別只讀本地 `daodao-storage/schema/`，它有 ~70 表落後 prod**（migration-safety R8 的白名單）；(3) 比對 `temp_users` INSERT 的值是否違反長度、CHECK、NOT NULL。歷史案例：Google/Apple 頭像 URL > 255 字元，`temp_users.photo_url` 還是 VARCHAR(255)（storage `2566b9a` #162 + server `78e6e1c` #350，2026-07-13 全站新用戶無法註冊）。
- **完成定義**：找到具體違反的約束，且修復包含**三處同步**（見 migration-safety「三處同步規則」），不是只改一處。

### 2. Cloudflare 回 520，間歇性、container 重啟前後特別多

- **觸發**：CF 520/502，nginx 本身沒掛。
- **步驟**：這是 2026-03 打了兩天的仗（daodao-infra `b1699f5`→`6846ad3`，12 個 commit）。最終答案是**移除功能而非調參**：nginx↔container 之間的 keepalive 在這個流量規模是淨負債。先確認現行防線還在（路徑以 /home/user 為基準）：
  ```bash
  grep -n "keepalive_timeout 0" /home/user/daodao-infra/nginx/nginx.conf         # 必須存在（nginx.conf:22）
  grep -n "resolver 127.0.0.11" /home/user/daodao-infra/nginx/nginx.conf         # 不可加公共 DNS（nginx.conf:50）
  grep -n "max_fails=0" /home/user/daodao-infra/nginx/conf.d/upstreams.conf      # 每個 upstream 都要有
  grep -n "client_max_body_size" /home/user/daodao-infra/nginx/conf.d/server.conf # 10m，上傳 413 防線
  ```
  若有人「優化」加回 keepalive pool、`proxy_next_upstream`、外部 resolver 或調長 `valid=`，就是回歸事故現場。細節見 failure-archaeology §1。
- **完成定義**：520 停止，且上述四個防線 directive 原封不動。

### 3. nginx 報 `no live upstreams`，要手動 reload 才恢復

- **觸發**：某服務 container 重啟後 nginx 持續 502，直到 reload。
- **步驟**：兩個歷史成因——(a) resolver fallback 到 8.8.8.8 對 Docker hostname 回 NXDOMAIN，nginx 把 server 從 pool 永久移除（`d405ec9`）；(b) 預設 max_fails 把 upstream 標記永久死亡（`0b96df5`）。檢查 upstreams.conf 是否仍是 `zone <name> 64k; server <host> resolve max_fails=0;` 的形狀。
- **完成定義**：container 重啟後 nginx 在 30 秒內（DNS valid=30s）自動恢復，無需 reload。

### 4. 上傳檔案回 413

- **觸發**：前端上傳圖片失敗 413。
- **步驟**：nginx 預設 body 限制 1MB。確認 `client_max_body_size 10m` 存在於 `daodao-infra/nginx/conf.d/server.conf`（第 5、35 行；歷史：`c0aebf6`，nginx 重構時掉了這行）。新增 vhost/location 時要記得帶上。
- **完成定義**：上傳成功，且新 vhost 的 conf 有明確的 body size 設定。

### 5. 改了 nginx 設定、push 了，但線上行為沒變

- **觸發**：`git pull` 後 reload，config 看起來沒生效。
- **步驟**：**檔案級 bind mount 綁 inode**——git pull 用 rename 換檔（新 inode），container 內還讀舊檔（`246aa32`）。正確動作是 `docker restart nginx`，不是 `nginx -s reload`。也不要 `docker cp` 蓋 bind mount（`unlinkat: device or resource busy`，`19fb26f` 的 revert）。改設定前先在同版本 nginx 本地驗證：`docker run --rm -v $PWD/nginx:/etc/nginx:ro nginx:1.27.3 nginx -t`（`090c320` 學到的）。
- **完成定義**：container 內 `nginx -T` 輸出含你的變更。

### 6. CI format check 紅，但你本地跑 format 是綠的

- **觸發**：ai-backend PR 上 `black --check` 失敗，本地看不出差異。
- **步驟**：版本不一致。CI 精確釘死 `black==25.9 ruff==0.14.1`（`.github/workflows/ci.yml:30`），但 pyproject 只有下限，`uv sync` 可能拉到更新版——Black 25.9 與 26.x 對多行字串格式化不同（ai-backend `60b78f5` 一整個 PR 被燒掉後，`19e74a0` 成文此規則）。本地執行 `uv pip install "black==25.9" "ruff==0.14.1"`（乾淨環境要先 `uv sync` 建好 .venv，否則 uv pip 沒有目標環境）後重跑 `make check`。CI workflow 檔是版本的 source of truth。
- **完成定義**：本地工具版本 == CI 釘死版本，`make check` 綠。
- ❌ 反例（實際發生過的合理化）：「formatter 都一樣，直接用我環境裡的 Black 重排就好」——60b78f5 就是這樣多燒了兩個 commit 來回打架。

### 7. cold clone 後 typecheck / lint / test 全面爆炸

- **觸發**：剛 clone（或 CI cache miss）就跑品質指令，成串 module-not-found。
- **步驟**：
  - **daodao-server**：先 `pnpm run prisma:generate`——client 生成在 `generated/prisma`（schema.prisma:1-3 的 output 設定），沒生成則所有 `@generated/prisma` import 死光。
  - **daodao-f2e**：不要在單一 package 內裸跑 `tsc --noEmit`；root `pnpm run typecheck` 走 turbo，會先建 `@daodao/assets#build` 與 `@daodao/shared#build`（turbo.json 的 typecheck dependsOn）。另外 `pnpm --filter @daodao/config generate:env` 是 build 前置。
  - **daodao-ai-backend**：`uv sync` 建 `.venv`；Makefile 寫死 `.venv/bin/python3.12`。
- **完成定義**：對應 repo 的 CLAUDE.md 品質指令全綠。

### 8. EAS / mobile build 失敗：bundling 找不到模組或 env

- **觸發**：EAS 雲端 build 失敗，本地 `expo start` 正常。
- **步驟**：EAS 是全新 checkout——所有 gitignored 生成物都不存在。`packages/config/generated/env` 靠 `eas-build-post-install` hook 重生（apps/mobile/package.json；歷史 `a54dcf8`）；env 值烘在 eas.json 各 profile。`.easignore` 在 **repo 根目錄**且一旦存在 EAS 會完全忽略 .gitignore。若是 `Attempted import error` 指向 `@daodao/assets`，見症狀 9。跑模擬器的既有坑（prebuild 過期、簽章、Metro 舊 bundle）見 f2e 的 `run-mobile-ios` skill，不重複。
- **完成定義**：EAS build 過 bundling 階段。

### 9. `next build` 失敗：`has no exported member` 指向 @daodao/assets

- **觸發**：某 app build 掛在 assets 的具名 import。
- **步驟**：有人從 assets barrel（`packages/assets/generated/index.ts`）移除了 export（通常為了縮 mobile build 體積，如 `b2ba1e5`），但其他 app 還在用。修法是改成路徑匯入（`import X from "@daodao/assets/images/icon/xxx.svg"`，走 package.json exports map）。**刪 barrel export 前先 grep 三個 apps**（`b2ba1e5` 2026-07-12 弄破、`63daf8b` 2026-07-13 修復——product 的 build 被擋約兩天）。
- **完成定義**：三個 apps 都 build 通過，不只是改動的那個。

### 10. feed 無限滾動提早結束 / 重複頁

- **觸發**：ai-backend feed API 分頁行為異常。
- **步驟**：歷史雷區在 ai-backend `src/services/feed/feed_service.py`（`aebca34`→`60b78f5`）：(a) `has_next` 必須同時看 practice 與 checkin 兩個 pool，只看一個就會提早停；(b) practices 全被規則跳過時 cursor 會變空 → 下一頁從頭抓（重複頁）；(c) 快取 + 分頁 + response validation 三者交互是慣性出 bug 區（cache key 少了 offset、快取資料過不了 schema 驗證等）。改 feed 邏輯必須同時測「某一 pool 先耗盡」與「整頁被過濾」兩個邊界。
- **完成定義**：兩個邊界 case 有測試或至少手動驗證過。

### 11. GitHub Actions：deploy job 被跳過 / 被取消 / 用錯 env 檔

- **觸發**：merge 後沒部署、或 workflow_dispatch 不觸發 deploy。
- **步驟**：三類已踩過的雷——
  - 上游 job 用 `always()` 時，下游 `if:` 沒配合會被誤判跳過；workflow_dispatch 與 push 走不同路徑，**每次改 workflow 條件都要手動 dispatch 測一次**（server `51d5047`、`0388669`：同一個 bug 修了兩輪，第二輪是第一輪的修復引起的）。
  - concurrency group 沒編入 trigger 來源 → pull_request 的 no-op run 取消了真正會部署的 push run（f2e `b7487f4`）。
  - env 檔名寫錯 / 引用不存在的 `.env.production`（server `ce46f0e`、`78e051f`）。
  - Vercel `ignoreCommand`：exit 0 = 跳過 build，exit 1 = 繼續——語義跟直覺相反（f2e `4193915`）。
- **完成定義**：push 與 workflow_dispatch 兩種觸發都實測過一次。

### 12. email_logs CHECK constraint violation 出現在 prod log

- **觸發**：`email_logs_email_type_check` 違反，某類 email 靜默寫不進去。
- **步驟**：這是本專案被咬過三次的字段（`0fec92b`、`067bc4f`、`99e3ed4`）。email_type 合法值活在 ≥3 層：server `src/types/email/base.types.ts` 的 `EMAIL_TYPES`、storage `schema/`、storage `migrate/sql/`（+ prod 實際 constraint）。新增 email type 必須全加；重建 constraint 必須先枚舉 prod 既有資料。守門員：storage `make check-schema`（`schema-sync-check.yml` 每日跑）+ server 的 integration test。
- **完成定義**：`python scripts/check_schema_sync.py --ci` 綠，且新值出現在全部三層。

### 13. 打卡圖片 404 / R2 bucket 疑似 dev-prod 錯置

- **觸發**：prod URL `storage.daodao.so/checkins/...` 404，但 dev bucket 有同 key。
- **步驟**：這是**未結案**的調查（`daodao-server/ops-2026-06-23-checkin-image-storage-audit.md`：查到一半 MCP 連線 ECONNRESET 就凍結了，repo 內無結案記錄）。若再遇到：先確認上傳端的 bucket env 是否 dev/prod 錯置，再用 daodao-mcp pg server 查當日 `practice_checkins.image_urls`。當年查不下去的 tunnel 問題已由 socat/SSH_TUNNEL 修好（見 diagnostics-and-tooling）。
- **完成定義**：能回答「事故是否仍在發生」並把結論補進該 ops 檔或開 issue。

## 三次失敗就停

同一個錯誤連修三次仍失敗 → 停下，總結「已嘗試什麼、卡在哪」回報使用者（六個 repo 的 CLAUDE.md 皆有此規則）。nginx saga 的教訓：第 4 次「再調一個參數」通常是在移動失敗，不是消除失敗。

---
重新驗證：`grep -n "keepalive_timeout 0" /home/user/daodao-infra/nginx/nginx.conf && grep -n "black==" /home/user/daodao-ai-backend/.github/workflows/ci.yml && ls /home/user/daodao-storage/migrate/sql/ | tail -3`
