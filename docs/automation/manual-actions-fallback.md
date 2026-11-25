# 私有 repo 的 Actions 不能跑時，手動補跑 CI／CD

2026-11-25 起，daodaoedu 組織私有 repo 的 GitHub Actions job 全部沒有啟動，GitHub 的提示是：

> The job was not started because recent account payments have failed or your spending limit needs to be increased.

這份文件說明：在付款問題解決之前，如何手動做完 Actions 原本負責的檢查與部署。各步驟都是從當時各 repo 的 workflow 整理出來的，workflow 改了就要回頭對照更新。

## 先確認影響範圍

| repo | 公開／私有 | 受影響 |
|---|---|---|
| daodao-storage | 私有 | 是 |
| daodao-worker | 私有 | 是 |
| daodao-infra | 私有 | 是 |
| daodao（root）、daodao-server、daodao-f2e、daodao-ai-backend、daodao-admin-ui | 公開 | 否 |

查某個 check 是不是因為付款問題才失敗：

```bash
gh api repos/daodaoedu/<repo>/check-runs/<job id>/annotations --jq '.[].message'
```

這類失敗不會擋 merge，PR 的 `mergeStateStatus` 會是 `UNSTABLE`，而不是 `BLOCKED`。所以 **merge 不等於已部署**：私有 repo merge 後，要先確認 Actions 有沒有真的跑；沒跑，就照下面的步驟補，並在 PR 或 issue 留言記錄補跑的結果。

根本解法是組織管理者到 GitHub 的 Billing & plans 處理付款，或調高 spending limit。

## daodao-storage

### CI

| workflow | 本機替代 |
|---|---|
| Migration Regression | `python3 -B -m unittest discover -s scripts/__tests__ -p 'test_*.py'` |
| PostgreSQL CI Test | 只有改到 `schema/` 才需要：在乾淨的資料庫裡套一遍 `cat schema/*.sql \| psql --set ON_ERROR_STOP=1`。做法見 `.github/workflows/ci-postgres.yml` |

### CD：部署到 dev（對應 workflow「Deploy to Linode」，推到 dev 時觸發）

```bash
ssh <Linode 主機>
cd /root/daodao-storage
git log -1 --format=%h                       # 1. 記下主機目前的版本
git fetch --all
git log --oneline <主機版本>..origin/dev      # 2. 看這次會套用哪些 migration
set -a; . ./.env; set +a                     # 3. 主機的 .env 已有 DAO_POSTGRES_* 等變數
git checkout dev && git reset --hard origin/dev
bash scripts/deploy.sh dev pg-dev "$DAO_POSTGRES_USER" "$DAO_POSTGRES_PASSWORD" "$DAO_POSTGRES_DB"
docker exec pg-dev pg_isready -U "$DAO_POSTGRES_USER" -d "$DAO_POSTGRES_DB"   # 4. 確認資料庫正常
```

- `scripts/deploy.sh` 會先用 `pg_dump` 備份，再執行 `make migrate-sql-dev`。最後會印出 migration 清單，可以確認新的 migration 是 `OK`。
- 主機目錄 `/root/daodao-storage` 由 dev 和正式站共用。部署 dev 之後，主機上的程式會停在 dev 分支。
- **正式站**的流程結構一樣，但 workflow 會帶入不同的分支、環境和資料庫主機。執行前要先對照 `.github/workflows/cd-postgres.yml` 逐項確認，並取得負責人同意；不要直接套用上面的 dev 參數。

2026-11-25 用這套流程實際部署過 dev：主機從 `56c42c9` 更新到 `6451559`，沒有新的 migration 要套用，`pg-dev` 狀態正常。

## daodao-worker

worker 本來就沒有 CD，部署一直是手動用 wrangler。CI 照 `.github/workflows/ci.yml` 的順序執行：

```bash
pnpm install --frozen-lockfile --ignore-workspace   # 在 monorepo 底下一定要加 --ignore-workspace，否則依賴裝不到
node --test __tests__/ci-setup.contract.mjs
pnpm test
pnpm run typecheck
python3 -B -m unittest discover -s .github/scripts/__tests__ -p 'test_quality_gate.py'   # 需要 PyYAML
```

## daodao-infra

| workflow | 觸發 | 本機或主機替代 |
|---|---|---|
| Nginx Configuration Validation | PR | `docker run --rm -v $PWD/nginx/nginx.conf:/etc/nginx/nginx.conf:ro -v $PWD/nginx/conf.d:/etc/nginx/conf.d:ro -v $PWD/nginx/snippets:/etc/nginx/snippets:ro nginx:1.27.3 nginx -t`，再加上 `python3 -m unittest discover -s scripts/__tests__ -p 'test_*.py'` |
| Deploy nginx config to VPS | 推到 main，且改到 `nginx/**` | 先在本機跑上一列的 `nginx -t`。通過後在主機上依序執行：`git -C /root/daodao-infra checkout main`、`git -C /root/daodao-infra pull origin main`、`docker restart nginx`、`docker exec nginx nginx -t` |
| Nightly dev journeys、Build isolated PM QA images | 排程或手動 | 暫停期間不會跑。需要時照該 workflow 的步驟手動執行 |

nginx 會影響所有網站。restart 之前一定要先在本機確認 `nginx -t` 通過。

## 補跑之後

- 在 PR 或 issue 留言，寫下補跑了哪些步驟、結果、部署後的主機版本（例如 `git log -1`）。
- 付款恢復後，用 `gh run rerun <run id>` 重跑原本失敗的 workflow 留下紀錄，並把本文件標成「已恢復」。
