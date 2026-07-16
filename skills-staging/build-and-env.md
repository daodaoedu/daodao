---
name: build-and-env
description: 你觀察到以下任一狀態時載入：剛 clone 任一 daodao repo 準備跑起來；install/build/typecheck 在乾淨環境失敗；不確定該用哪個 node/pnpm/python 版本；lockfile 與套件管理器對不上；CI 綠但本地紅（或反之）
---

# 從零重建與環境陷阱

> 最後校準：2026-07-14。指令全部核對過各 repo 的 package.json / Makefile / CI workflow。版本數字屬易變事實，過期就以「重新驗證」一節的指令為準。

## 版本矩陣（2026-07-14 快照）

| Repo | 執行環境 | 套件管理 | 依據 |
|---|---|---|---|
| daodao-f2e | Node 20.19.4（.nvmrc/.node-version） | pnpm 10.20.0（packageManager 欄位） | root package.json engines |
| daodao-server | CI/Docker 用 Node 20 + pnpm 9；engines 寫 `>=16.14`（**過鬆的殘留**，別當真） | pnpm | continuous-integration.yml、Dockerfile:4 |
| daodao-ai-backend | Python 3.12（Makefile 寫死 `.venv/bin/python3.12`；pyproject `>=3.10` 過鬆） | uv（uv.lock） | Makefile:5、pyproject |
| daodao-worker | Node（wrangler）；**repo 只有 package-lock.json（npm）但 CI 用 pnpm**——已知不一致，見 system-map | CI: pnpm | .github/workflows/ci.yml |
| daodao-admin-ui | Node 20 + pnpm 10.20.0（CI corepack） | pnpm | ci.yml:33 |
| daodao-mcp | Node >=20, pnpm >=10 | pnpm workspace | root package.json |
| daodao（hub） | Node + pnpm，單一 workspace package | pnpm | package.json |

## 各 repo 從零到綠

### daodao-f2e
```bash
pnpm install --frozen-lockfile
pnpm --filter @daodao/config generate:env   # env 是靜態生成物，不生成則 build/dev 讀不到
pnpm build                                   # turbo run build（拓撲順序）
pnpm run typecheck && pnpm run lint && pnpm test
```
陷阱：
- **不要在單一 package 裸跑 tsc**——turbo 的 typecheck dependsOn `@daodao/assets#build` + `@daodao/shared#build`（turbo.json）。
- 改了 `.env` 之後要重跑 `generate:env`，否則讀到舊值（env 是生成物不是 runtime 讀取）。
- `@daodao/ui` 沒有 build script（source 直接被 transpilePackages 吃）；`@daodao/assets` 的 `generated/` 是**進版控的生成物**（273 檔）。
- `apps/product` postinstall 跑 husky；`.husky/pre-commit` 硬編碼 `/opt/homebrew/bin`，Linux 上可能失效（已知問題，見 system-map）。
- grep 時排除 `packages/assets/generated/`（多 MB 單行 SVG）。

### daodao-server
```bash
pnpm install
pnpm run prisma:generate     # 不跑 = lint/typecheck/test/build 全掛（client 在 generated/prisma）
pnpm run typecheck && pnpm run lint && pnpm test
pnpm run dev                 # ts-node-dev, src/server.ts
```
陷阱：
- 測試不需要真 DB/Redis——integration/e2e 也全 mock（tests/setup.ts 載 `.env.test`，prisma 服務被 jest.mock）。跑不起來別先去架 DB。
- `jest.setup.js` 是孤兒（無任何引用；活的是 `tests/setup.ts`）。
- tsconfig 的 include 還列著不存在的 `models/**` 等目錄——無害殘留，別「修」它引發連鎖。
- 改 validator/route 後：`pnpm run openapi:generate`（手動義務）→ commit 生成的 openapi.json/yaml。

### daodao-ai-backend
```bash
uv sync                                            # 建 .venv
uv pip install "black==25.9" "ruff==0.14.1"        # 對齊 CI 釘死版本（ci.yml:30），否則 format 紅
make check                                         # black --check + ruff —— 真正的 CI gate
make test                                          # pytest（本地跑；CI 不跑測試）
make up-dev                                        # Docker: backend-dev :8002→8000 + redis-dev
```
陷阱：
- `make lint`（pylint+bandit）帶 `|| true`，不是 gate；gate 是 `make check`。
- 啟動硬依賴：PostgreSQL 可達 + **Redis health check 失敗會直接 abort app**。Qdrant/ClickHouse 已停用（lifespan 註解掉），不用架。
- `make test-insight` 引用已不存在的測試檔（已知殘留）。

### daodao-worker
```bash
pnpm install --frozen-lockfile   # 跟 CI 一致；雖然 repo 裡躺著 npm 的 package-lock.json
pnpm run typecheck               # CI 唯一 gate
pnpm test                        # vitest + workers pool（wrangler.test.toml；無 AI binding，route 測試接受 200 或 500）
pnpm run dev                     # wrangler dev
```

### daodao-admin-ui
```bash
pnpm install --frozen-lockfile
pnpm lint && pnpm exec tsc --noEmit   # = CI（tests 不在 CI）
pnpm dev                              # vite :5173；proxy 需要兩個後端活著（見 config-and-flags）
```

### daodao-storage（不是 app，是 DB 生命週期）
```bash
docker network create dev-daodao-network 2>/dev/null; docker network create prod-daodao-network 2>/dev/null
make up-dev          # pg-dev(:5423 host) + qdrant-dev；schema/ 作為 initdb 只在空 PGDATA 首啟時執行
make migrate-sql-dev # 增量 migration（Docker 內跑 sql_runner.py）
make check-schema    # = python scripts/check_schema_sync.py --ci
```
陷阱：DB 只在 `docker-compose.dev-ports.yml` overlay 下才有 host port（5423）；prod 完全無 host port。`make clean` 會 `sudo rm -rf ./data`。

### daodao-mcp
```bash
pnpm install && pnpm build && pnpm test && pnpm typecheck
```
（**無 CI**——這四個指令就是全部的品質防線。）

### daodao（hub）
```bash
pnpm install && pnpm test   # vitest：bin/ 下的 notion-sync / routine-dispatch 測試
```

## 通用規則

- 觸發：CI 綠紅與本地不一致。步驟：先 diff「CI workflow 實際跑的指令與版本」vs 你本地——CI YAML 是 source of truth（Black 版本事故、worker pnpm/npm、admin-ui corepack 皆此類）。完成定義：本地指令與版本和 CI 完全同構後再判斷是不是真 bug。
- 觸發：想「順手升級」formatter/linter 版本。步驟：同一 PR 必須同步改 CI 的釘死版本 + 全量 reformat，否則 CI 永久紅。參考 `19e74a0` 的版本鎖定成文。

---
重新驗證：`cat /home/user/daodao-f2e/.nvmrc && grep -n '"packageManager"' /home/user/daodao-f2e/package.json && grep -n "python3.12" /home/user/daodao-ai-backend/Makefile && grep -n "black==" /home/user/daodao-ai-backend/.github/workflows/ci.yml`
