---
name: architecture-contract
description: 你觀察到以下任一狀態時載入：變更會跨越 repo 邊界（API contract、DB schema、auth、types）；想在 daodao-server 跑 prisma migrate；想手改 generated/ 或 openapi types；想把 admin-ui 的請求打到某個後端；想假設 worker 有 JWT 驗證；想從 assets barrel 移除 export
---

# 架構契約（不變量與承重決策）

> 最後校準：2026-07-14。每條不變量都附「為什麼承重」的事故出處。全景圖（誰呼叫誰、同步鏈細節）以各 repo 的 `system-map` skill 為權威——本檔只列**違反會出事**的契約，不重繪地圖。

## 不變量清單

### C1. DB schema 的 single source of truth 是 daodao-storage

- 觸發：任何 DB 結構變更的念頭，不管你人在哪個 repo。
- 契約：daodao-server **沒有 prisma migrate**（`prisma/` 只有 schema.prisma 與 seed/resync 兩支 email-template 腳本；驗證：`ls /home/user/daodao-server/prisma/`——無 migrations/ 目錄）。ai-backend 的 SQLAlchemy **不做 DDL**。結構變更只能從 storage 的 `migrate/sql/` 出發。
- 為什麼承重：photo_url 事故（storage #162 / server #350）證明繞過這條鏈會讓修復在下次 `prisma db pull` 或 fresh install 時回歸。
- 完成定義：見 migration-safety「三處同步規則」。

### C2. Migration 不可變——而且執行器不會幫你抓違規

- 契約：已存在的 `migrate/sql/*.sql` 禁改。**關鍵事實**：`sql_runner.py` 的 checksum 只記錄不驗證（`is_migration_executed` 只查 `migration_name + success=true`，sql_runner.py:54-62）；改了已成功的 migration 會被**靜默 SKIP**，你以為部署了，其實什麼都沒發生。撰寫端有 `.claude/hooks/pre-write-guard.sh` 攔 `migrate/sql/` 既有檔——但 hook 的實際阻斷力未驗證（現行 exit 1，見 governance-and-sync G4），**規則本身靠你自律遵守，hook 只是輔助**。
- 推論：failed（success=false）的 migration 下次部署**自動重跑**——這是 `99e3ed4` 能原地改 039 的唯一原因，不是通例。
- ❌ 反例（觀察到的合理化）：storage 舊版 project-rules 曾宣稱「SHA256 checksum 確保檔案未被修改」——假的，`797c85c` 修正了這句。不要再把 checksum 當防線寫進任何文件。

### C3. Types 同步鏈：兩條自動、兩條手動

- 契約（細節見 system-map）：server→f2e 與 ai-backend→f2e 有自動同步（f2e `sync-openapi.yml`，每日 cron UTC 21:00，從 server 的 **dev branch** 拉）；**worker→f2e 與 server/ai-backend→admin-ui 全靠手動**（f2e action-maker 手寫型別；admin-ui `src/api/types.ts` 千行手維護檔）。
- 觸發：你改了 worker 或任何後端的 API contract。步驟：查 system-map 的跨 repo 檢查表，把手動同步列為同一 change 的 task，或明確告知使用者尚未同步。完成定義：手動側改完，或 PR 描述載明未同步。
- 生成物禁手改：f2e `packages/api/src/types.ts`、`ai-types.ts`；server `generated/`、`openapi.json`/`openapi.yaml`（由 `pnpm run openapi:generate` 生成）。

### C4. Auth 邊界：JWT 只由 server 簽發；worker 目前無入向 auth

- 契約：JWT 由 daodao-server 簽發（HS256）；ai-backend 用共享 secret `JWT_SECURITY` 驗證。**daodao-worker 的 `src/middleware/auth.ts` 已定義但從未掛載**——入向防護只有 CORS allowlist + KV rate limit（5 req/10min/IP，generate 與 refine 共用池）。worker→server 用 `X-Internal-API-Key` header，不是 JWT。
- 觸發：你在 worker 加需要使用者身分的功能，或在安全審查時假設 worker 有驗證。步驟：不要假設 auth 存在；要嘛先掛 middleware（跨 repo 影響：f2e 呼叫端要帶 token），要嘛按現況設計。完成定義：PR 明確陳述 worker auth 現況。
- 為什麼承重：`51bd7ea` 之前的文件暗示 JWT 已生效，是文件與現實衝突的實例。

### C5. admin-ui 雙後端前綴是路由契約

- 契約：`/api/*`（實務上 `/api/v1/admin/*`）→ ai-backend；`/daodao-server/*` → daodao-server（proxy rewrite 掉前綴）。域分工：AI/LLM 管理歸 ai-backend，users/community/learning/trust/audit 歸 server。**選錯前綴會靜默打到錯的後端**（回 404 或錯資料，不會報「你打錯後端」）。LLM/Playground 呼叫必須用 `slowApiClient`（120s），不是 `apiClient`（30s）。
- 驗證：`grep -n "daodao-server\|/api" daodao-admin-ui/vite.config.ts`。

### C6. server 的 response / 分層契約

- 契約（細節在 server 的 project-rules/codebase-map，不重複）：所有 response 走 `response-helper`；錯誤只 throw AppError 子類；controller 一律 `asyncHandler` 包裹；validator（Zod）是驗證 + OpenAPI 的 SSOT；禁 class（factory pattern）。改 API contract 後 `openapi:generate` 是**手動義務**（build 只重生 types 不重生 spec）。
- 為什麼承重：f2e 的型別是從這份 spec 自動同步的（C3）；spec 忘了重生 = f2e 隔天拉到舊型別。

### C7. assets barrel 是跨 app 契約

- 契約：`packages/assets/generated/index.ts` 的每個 export 都可能被 website/product/mobile 任一使用。移除 export = 跨 app breaking change。
- 觸發：想從 barrel 移除（通常為了 mobile build 體積）。步驟：先 `grep -rn "<ExportName>" apps/`，把所有使用點改成路徑匯入（`@daodao/assets/images/...`，走 exports map），再刪。完成定義：三個 app build 全綠。
- 為什麼承重：`b2ba1e5`（07-12）刪了、`63daf8b`（07-13）收屍——product 的 build/deploy 被擋約兩天。
- ❌ 反例（觀察到的合理化）：「mobile 沒用到這個 SVG，刪掉沒事」——product 有用到，build 就炸了。

### C8. 複製式共用檔案：改一份 = 改 N 份

- 契約：`.claude/hooks/*.sh`、`.claude/settings.json`、`.claude/skills/system-map/SKILL.md`、`.claude/README.md` 在六個 repo 逐位元相同；hub 的 `sync-claude-config.yml` 會覆寫其中的 hooks/settings（+ `collect-pr-feedback` skill + 兩個 workflow）。在子 repo 單獨改這些檔案 = 下次同步被蓋掉或造成 md5 分裂。細節與正確改法見 governance-and-sync。
- 驗證：`md5sum /home/user/daodao-*/.claude/hooks/pre-write-guard.sh`（六個 hash 必須一致）。

### C9. Docker network 是 external 的，由誰建立有順序

- 契約：`dev-daodao-network` / `prod-daodao-network` 是 external network，各 repo 的 compose 掛同一張網互通。f2e 的 compose 註明 network 由 daodao-server 建立；storage 的 `make up` 會自建兩張網。本地起服務前 network 必須先存在（`docker network create dev-daodao-network` 或先 `make up`）。
- 為什麼承重：掛錯網 = 服務互相看不見，症狀是 nginx no live upstreams / connection refused，容易誤診成應用 bug。

### C10. 靈感頁 = showcase-only 是產品決策

- 契約：f2e 靈感頁用 `useShowcaseFeed`（只有實踐），不用混合 feed。這是 `9bd139e`（#552/#554）的**產品性 revert**，不是未完成的功能。
- 觸發：你覺得「靈感頁怎麼沒有打卡卡片，補上吧」。步驟：停，這是刻意的。要改需要產品決策，不是工程判斷。

---
重新驗證：`ls /home/user/daodao-server/prisma/; sed -n '54,62p' /home/user/daodao-storage/migrate/sql_runner.py; if grep -q "auth" /home/user/daodao-worker/src/index.ts; then echo "警告：worker index.ts 出現 auth——C4 需重新核實"; else echo "worker 無 auth 掛載（符合 C4）"; fi`
