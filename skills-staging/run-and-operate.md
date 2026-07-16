---
name: run-and-operate
description: 你觀察到以下任一狀態時載入：要在本機把整個 daodao 系統（或某幾個服務）跑起來；要把 prod 資料同步到本地；服務起了但互相連不到；要查線上服務健康狀態；需要進入或解除維護模式
---

# 本地運行與線上操作

> 最後校準：2026-07-14。啟動順序有真實依賴（network → DB → 後端 → 前端/admin），亂序的症狀是 connection refused 而不是清楚的錯誤。

## 本地全套啟動順序

```bash
# 0. 網路（external，不先建則各 compose 起不來或互相看不見）
docker network create dev-daodao-network 2>/dev/null || true
docker network create prod-daodao-network 2>/dev/null || true

# 1. DB（daodao-storage）
cd daodao-storage && make up-dev          # pg-dev + qdrant-dev；host 端 DB 在 :5423
make migrate-sql-dev                       # 增量 migration

# 2. 後端
cd ../daodao-server && pnpm install && pnpm run prisma:generate && pnpm run dev   # :3000
cd ../daodao-ai-backend && make up-dev     # :8002→8000；Redis 是硬依賴，compose 內建 redis-dev

# 3. 前端 / admin
cd ../daodao-f2e && pnpm install --frozen-lockfile && pnpm --filter @daodao/config generate:env && pnpm run dev:product   # :3001（website :3000 會撞 server，本地二選一或改 port）
cd ../daodao-admin-ui && pnpm install --frozen-lockfile && pnpm dev               # :5173，proxy 預期 ai-backend :8002、server :4000
```
注意：admin-ui 的 dev proxy 寫死 server 在 **:4000**（vite.config.ts），但 server 本地預設 :3000——本地要嘛改 server PORT，要嘛改 proxy target。這是已知摩擦點，動手前先確認你的 server 起在哪個 port。
mobile 見 f2e 的 `run-mobile-ios` skill（坑多，別裸跑）。

## 資料：prod → 本地

1. 拉備份：`cd daodao-storage && ansible-playbook -i ansible/inventory.ini ansible/playbook.yml`（遠端 pg_dump `pg-prod` → rsync 回 `./backup/{date}/full_backup.sql`）。需要 `~/.ssh/config` 有 `daodao` host（user-must-provide）。舊路徑 `fetch_data_vps_postgre.sh` 的檔名 glob 已過時，別用。
2. 匯入：`make import`——**會 DROP public schema CASCADE 再還原**，且它同時打 import-dev 與 import-prod 兩個 container。⚠️ **絕不在 VPS 上執行**：VPS 的 pg-prod 就是正式站資料庫，這個指令在那裡等於刪站。只在本地開發機跑。Makefile 自動挑最新備份（`ls ./backup/*/full_backup.sql | sort | tail -1`）。
3. 生命週期：`make down` / `make clean`（**sudo rm -rf ./data**，資料全滅）/ `make dev-setup`（down→clean→up 一條龍）。

## 線上健康檢查

| 服務 | 檢查 |
|---|---|
| server | `curl https://api.daodao.so/api/v1/health`（CD smoke 打的同一支） |
| ai-backend | `make health-prod` / `make health-dev`，或 `/api/v1/health` |
| worker | `GET https://worker.daodao.so/health`；log 用 `wrangler tail` |
| admin-ui | 容器 healthcheck 打 `/admin/` |
| DB migration 狀態 | `make migrate-sql-status-prod`（看 success 欄，CD 綠≠全部 success） |
| nginx | `docker exec nginx nginx -T` 確認生效設定 |

失敗通知集中在 Discord（CI/CD/schema-drift/product-drift 各 workflow 都接了）——查「昨晚有沒有事」先翻 Discord 頻道，不是翻 email。

## 線上操作規則

### O1. nginx 設定變更
- 觸發：改 daodao-infra/nginx 下任何檔。
- 步驟：本地 `docker run --rm -v $PWD/nginx:/etc/nginx:ro nginx:1.27.3 nginx -t` → push main 走 CD → 若改的是 nginx.conf 本體，確認生效方式是 restart 而非 reload（bind mount inode 陷阱，ci-cd-pipelines P4）。
- 完成定義：容器內 `nginx -T` 含變更。

### O2. 維護模式
- 機制：Cloudflare Worker（daodao-infra/worker.js）攔截 origin ≥500 回應與 fetch 例外，改回品牌維護頁（maintenance.html）；`GET /maintenance.html` 直接出頁。也就是說**全站掛掉時使用者看到的是維護頁，不是 CF 錯誤頁**——「看起來在維護」可能其實是 origin 5xx，先查 origin。
- （UNVERIFIED：此 worker 在 Cloudflare 上的部署方式與是否常駐——repo 內無 wrangler 設定，屬 Cloudflare dashboard 手動配置。）

### O3. 重啟後自癒
- 所有 compose 服務都應有 `restart: unless-stopped`（`98eab19`/`294a964` 的停電教訓）。新增服務到任何 compose 檔時帶上，否則主機重開機它就死透。

### O4. server 的 log 位置
- PM2 把 stdout/err 導到 /dev/null（ecosystem.config.js）——線上查 log 用 `docker logs <container>`，本地用 dev server 的 console。別浪費時間找 PM2 log 檔。

### O5. 高風險線上動作的邊界
- prod DB 直接操作（UPDATE/DELETE/權限）走 storage 的既有腳本（`ansible/upgrade_permission.yml` 等），不即興下 SQL；daodao-mcp 的 pg server 是**唯讀**設計，不是操作通道。
- 自動化 pipeline 對 storage/infra 強制 plan-only（hub `bin/notion-sync/types.ts` HIGH_RISK_REPOS）——AI agent 不該自行對這兩個 repo 出 code PR，人類按最後一鍵。

---
重新驗證：`grep -n "5423" /home/user/daodao-storage/docker-compose.dev-ports.yml && grep -n "4000\|8002" /home/user/daodao-admin-ui/vite.config.ts && grep -n "restart:" /home/user/daodao-storage/docker-compose.dev.yml`
