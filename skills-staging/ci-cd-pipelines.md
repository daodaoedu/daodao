---
name: ci-cd-pipelines
description: 你觀察到以下任一狀態時載入：要修改任何 .github/workflows/ 檔；merge 後沒有部署或部署到錯環境；需要緊急重建/重部署；要理解某 repo 從 merge 到上線的路徑；deploy job 行為與預期不符
---

# CI/CD 管線與部署路徑

> 最後校準：2026-07-14。GitHub Actions 條件邏輯是本專案跨三個 repo 的慣性出事區——改 workflow 請把本檔當 checklist。

## 部署拓撲（merge 之後發生什麼）

| Repo | 觸發 | 路徑 | 目標 |
|---|---|---|---|
| daodao-f2e | Linode CI 完成後 workflow_run → linode-cd.yml | 變更偵測 → runner 上 build → docker build（copy-only Dockerfile）→ push Docker Hub → SSH Linode compose up | website :3000 / product :3001（prod/dev/feat 三環境） |
| daodao-server | push main/production/dev → continuous-delivery.yml | 呼叫 CI（reusable）→ docker build + smoke `/api/v1/health` → SSH Linode `docker compose up -d --wait` | prod_app / production_app / dev_app |
| daodao-ai-backend | push main/dev → cd.yml（呼叫 ci.yml） | docker build/push → 部署；`force_deploy` dispatch 可跳過 CI | backend-prod / backend-dev |
| daodao-storage | push main(prod)/dev → cd-postgres.yml | SSH Linode `git reset --hard` → `bash scripts/deploy.sh` → make migrate-sql-* | pg-prod / pg-dev |
| daodao-worker | **無自動部署**——手動 `pnpm run deploy:preview` / `deploy:production`（wrangler） | — | Cloudflare Workers |
| daodao-admin-ui | cd.yml → docker image（runtime 是 `vite preview`，不是 nginx） | compose 拉 `dev-${COMMIT_SHA}` image | admin.daodao.so |
| daodao-infra | push main → deploy-nginx.yml：runner 上 nginx -t → SSH git pull → **`docker restart nginx`**（deploy-nginx.yml:63，註解明言為了刷新 bind mount inode）→ 容器內 nginx -t | step 名稱還叫 "reload" 但實際是 restart——歷史原因見 P4 | nginx 容器 |

緊急通道：f2e `linode-emergency-rebuild.yml`、server `emergency-rebuild.yml`（皆手動 dispatch，可選 skip tests，需填 reason）。

## 已踩雷 checklist（改 workflow 前逐條過）

### P1. always() / needs / workflow_dispatch 三角

- 觸發：你在 deploy job 鏈上加任何 `if:` 條件。
- 事實：上游 job 用 `always()` 時，下游 job 的預設成功判斷會誤跳過；workflow_dispatch 與 push 的觸發上下文不同。server 為此修了兩輪（`51d5047` #268；`0388669` #291——**第二輪 bug 是第一輪修復造成的**）。
- 步驟：改完後 push 觸發 + 手動 dispatch 各實測一次。完成定義：兩個 run link 都綠且 deploy job 實際執行。

### P2. concurrency group 必須編入觸發來源

- 事實：f2e `b7487f4`——PR merge 同時觸發 push 與 pull_request 兩條 CI，pull_request 的 CD（全 skip 的 no-op）把 push 的 CD（真部署）取消了。修法是 concurrency group 加入 `github.event.workflow_run.event`。
- 觸發：你在任何 workflow 加 `concurrency:`。步驟：確認同一 commit 的不同觸發來源不會互相取消。

### P3. Vercel ignoreCommand：exit 0 = 跳過

- 事實：exit 0 = 不 build、exit 1 = build——與 shell 直覺相反，`4193915` 曾整個反轉（dev 一直 build、feat 全被跳過）。

### P4. infra 的 config 生效問題

- `nginx.conf` 是**檔案級 bind mount**，git pull rename 換 inode 後容器讀的還是舊檔——所以 CD 用 `docker restart nginx` 而非 reload（`246aa32` 的教訓；已核實 deploy-nginx.yml:63 現行如此）。手動操作時同理：restart，不要 reload、不要 docker cp。改 nginx 前先本地驗證：`docker run --rm -v $PWD/nginx:/etc/nginx:ro nginx:1.27.3 nginx -t`。

### P5. env 檔名與 secrets

- server 曾部署到錯的 env 檔（`ce46f0e`）、引用不存在的 `.env.production`（`78e051f`）。改 compose service 名或 env 檔名時，grep 全部 workflow 的 `--env-file` 引用。
- ai-backend 的 `.env` 政策：**不存在才從 .sample 初始化，絕不覆寫**（`2f9c61c`；歷史教訓見 failure-archaeology §4）。
- infra 重用 server 的 `LINODE_INSTANCE_IP` / `LINODE_SSH_PRIVATE_KEY` secrets——改名會同時弄壞兩個 repo。

### P6. 共用 workflow 是複製品不是引用

- `auto-pr-description.yml` 與 `code-review.yml` 在各 repo 是 hub 同步來的**逐位元複製**（無 workflow_call）。在子 repo 改它們會被下次同步覆寫——改 hub 版（見 governance-and-sync）。

### P7. dev/production 雙軌的歷史噪音

- server 的 promotion 模型讓 dev/production 出現成對重複 commit（#288/#289 等）。讀歷史時這不是 bug；但**新 repo 不要複製這個模型**，storage 已示範過 squash 分歧的代價（migration-safety R7）。

## 排程任務清單（誰在半夜動你的 repo）

| Cron（UTC） | 什麼 | 效果 |
|---|---|---|
| 每日 21:00 | f2e sync-openapi.yml | 從 server dev branch 重生 `packages/api/src/types.ts` 並**自動 commit** |
| 每日 02:00 | server schema-drift.yml | 漂移 → Discord 警報 |
| 每日 00:00 | storage schema-sync-check.yml | 三 repo 常量比對 → Discord |
| 每小時 | hub routine-a-notion-sync / routine-c-sync-done | Notion↔GitHub 同步（見 automation-pipeline） |
| 每週一 01:00 | hub sync-claude-config.yml | 共用設定推向 8 個子 repo（自動開 PR + admin merge） |
| 每週一 00:00 | hub product-status-drift.yml | docs/product 狀態 vs 程式碼 → Discord |

含義：dev branch 上「沒人動卻出現的 commit」多半來自這些排程（sync-openapi 的 bot commit、sync shared config PR）。rebase/force-push dev 前先想到它們。

---
重新驗證：`ls /home/user/daodao-*/.github/workflows/ 2>/dev/null && grep -n "cron" /home/user/daodao/.github/workflows/*.yml && grep -n "docker restart nginx" /home/user/daodao-infra/.github/workflows/deploy-nginx.yml`
