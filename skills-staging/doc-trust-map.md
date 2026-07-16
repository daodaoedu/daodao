---
name: doc-trust-map
description: 你觀察到以下任一狀態時載入：正要引用任何 daodao 文件（README、docs/、workflow.md、openspec project.md）作為行動依據；文件敘述與你在程式碼看到的不符；要規劃功能而依據是 PRD/FRD 的狀態標籤
---

# 文件信任地圖（哪些文件會說謊、往哪查真相）

> 最後校準：2026-07-14。本專案明文規則：文件與現實衝突以現實為準並修文件。本檔列出**已查證**的謊言與各主題的真相權威，讓你不用每次重新考古。

## 已知的文件謊言 / 過期敘述（2026-07-14 快照）

| 文件與敘述 | 真相 | 佐證 |
|---|---|---|
| `daodao/docs/workflow.md` §3.3 表格稱 daodao-server 是「NestJS 後端」 | Express + Prisma（factory pattern 禁 class）；同文件 §9.7 自己也寫 Express | server codebase-map、src/app.ts |
| `docs/workflow.md` Phase 9：單一 Remote Agent 每 2 小時掃 4 repo | 已被 Routine A/B/C（hourly、8 repo、scope 分級）部分取代；兩代文件並存 | daodao/docs/automation/、.github/workflows/routine-*.yml |
| `daodao-storage/docs/` 三份 migration 文件（naming-conventions / developer-guide / strategy）：日期前綴命名、rollback 檔、Flyway、migrations/ 目錄 | **機制從未存在**。真相＝`migrate/sql_runner.py`（序號檔名、無 rollback、無 Flyway）。三份已加過時警告 banner | `797c85c`（#159） |
| storage 舊 project-rules：「SHA256 checksum 確保 migration 未被修改」 | checksum 只記錄不驗證；改舊檔被靜默 SKIP | sql_runner.py:54-62、`797c85c` |
| `daodao-server/openspec/project.md`：「混合 JavaScript/TypeScript 架構，正逐步遷移」 | 遷移已完成，legacy JS 已移除；以 codebase-map「以本檔為準」為準 | server codebase-map（2026-07-06 校準） |
| `daodao-server/package.json` engines：node `>=16.14.0`、pnpm `>=8` | 實際 CI/Docker 是 Node 20 + pnpm 9；engines 是過鬆殘留 | continuous-integration.yml、Dockerfile:4 |
| `daodao-infra/README.md` vhost 表：admin 路由到 `daodao-admin:3000` | upstreams.conf 實際定義 `admin-ui-prod`/`admin-ui-dev` | nginx/conf.d/upstreams.conf |
| `docs/product/` 各 PRD/FRD 的狀態標籤（規劃中/進行中） | 普遍落後於程式碼——照文件規劃會重做已上線功能 | product-status-drift.yml:3-5 明文；product-status-check skill 因此存在 |
| f2e `update-i18n.yml` workflow 寫入路徑 `shared/config/locales` | 該路徑不存在於現行樹（實際 locales 在 packages/i18n）；workflow 疑似陳舊（未驗證其最後成功 run） | workflow 檔 vs 檔案樹 |
| `daodao-storage/Sync Data and Import Container Guide.md`：手動編輯 Makefile 備份路徑 | Makefile 已自動挑最新備份 | Makefile:11 |
| `daodao-f2e/PLAN.md`、`daodao-server/plan.md` 看似待辦 | 兩者都是**已落地**工作的計畫殘渣（前者 #773；後者的 `scripts/collect-learning-resources/` 已在 `77499a8` #245 建立）——照著它們「開工」會重做既有工作 | failure-archaeology §7 |

## 主題 → 真相權威（先查這裡，不查散文）

| 主題 | 權威 |
|---|---|
| migration 執行語義 | `daodao-storage/migrate/sql_runner.py`（程式碼本身） |
| CI 到底跑什麼 | 各 repo `.github/workflows/*.yml`（不是 workflow.md 的表格） |
| toolchain 版本 | CI workflow 的釘死版本 > pyproject/engines 的範圍宣告 |
| 跨 repo 呼叫與同步鏈 | `system-map` skill（2026-07-06 校準，六份相同） |
| 各 repo 結構與慣例 | 各 repo `codebase-map` / `project-rules` skill（皆 2026-07 校準，比任何 README 新） |
| 功能上線狀態 | `check_product_status.py` + 程式碼本身（product-status-check skill） |
| worker secrets 清單 | `daodao-worker/src/types.ts` 的 `Env` interface |
| 自動化管線行為 | `daodao/docs/automation/` + `bin/` 原始碼（不是 workflow.md Phase 9） |

## 規則

### D1. 引用文件前的最低驗證
- 觸發：你打算依某段文件敘述行動（建目錄、跑指令、假設機制存在）。
- 步驟：查上表是否已知說謊 → 不在表上則抽驗一個可證偽點（路徑存在？指令在 package.json/Makefile 裡？）→ 驗證失敗就依現實行動並修文件（同 PR）。
- 完成定義：行動依據是「驗證過的現實」，文件修正已入 PR 或明確告知使用者。
- ✅ 正例：`797c85c` 稽核——逐條驗證 docs 敘述、給死文件加 banner 而非刪除（保留考古價值）、把修正寫進 skills。
- ❌ 反例（觀察到的合理化）：「README 說 migration 在 migrations/sql/，我就建這個目錄」——真目錄是 migrate/sql/，README 那句已在 #159 修掉；照舊文件行事會把檔案放進 runner 根本不掃的地方。

### D2. 你修好一個文件謊言之後
- 把該條從本表移除（或標已修）並更新最後校準日——本檔自己也會腐爛，維護方式同 system-map。

---
重新驗證：`grep -n "NestJS" /home/user/daodao/docs/workflow.md | head -2 && grep -n "過時文件警告" /home/user/daodao-storage/docs/*.md | head -3 && grep -rn "shared/config/locales" /home/user/daodao-f2e/.github/workflows/update-i18n.yml`
