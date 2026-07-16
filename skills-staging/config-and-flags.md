---
name: config-and-flags
description: 你觀察到以下任一狀態時載入：服務起不來且錯誤指向 env/設定；要新增或改名任何環境變數；不確定某個 env 在哪裡定義、由誰注入；worker secrets / KV / bindings 相關工作；admin-ui proxy 打不到後端
---

# 設定與環境變數地圖

> 最後校準：2026-07-14。env 是本專案「文件最容易說謊」的層——本檔只寫核對過的機制，值本身屬部署機密（user-must-provide）。

## 各 repo 的 env 機制（機制不同，別套用直覺）

### daodao-f2e：env 是「生成物」，不是 runtime 讀取
- `@daodao/config` 的 `generate:env` 把 env **靜態生成**到 `packages/config/generated/env`（gitignored）。改 `.env` 後不重跑 generate:env = 讀舊值。程式碼一律經 `@daodao/config` 的 `getEnv`，禁 `process.env`（project-rules）。
- mobile/EAS：雲端 build 是乾淨 checkout，靠 `eas-build-post-install` hook 重生 env；`EXPO_PUBLIC_*` 值烘在 `apps/mobile/eas.json` 各 profile；`mobile-deploy.yml` 裡**再複製了一份** preview env（`eas update` 讀不到 build profile env）——改後端 URL 要三處同改：eas.json、workflow env、（本地）.env.development。
- 已知不一致：`NEXT_PUBLIC_API_URL` fallback 兩處網域不同（client.ts 用 api.daodao.so、action-maker hooks 用 server.daodao.so）；`NEXT_PUBLIC_WORKER_URL` 未列於 .env.example（system-map 已記載）。

### daodao-server
- 測試 env：`tests/setup.ts` 載 `.env.test`（repo 內有檔）並硬設 JWT_SECRET 等——測試不需要真服務。
- runtime：Docker compose `--env-file .env.<env>`；PM2（ecosystem.config.js）只是容器內的行程管理，**所有 log 導到 /dev/null**（診斷時別在 PM2 log 找東西，用 `docker logs`）。

### daodao-ai-backend：巢狀 delimiter + 十家 provider
- `src/config.py`：`ENVIRONMENT` 決定載 `.env.dev` 或 `.env.prod`；巢狀鍵用 `__`（如 `LLM_BACKEND__GEMINI__API_KEY`、`INSIGHT__LLM_BACKEND`）。10 個 LLM provider 的 URL/MODEL 有硬編碼預設（config.py `_LLM_BACKEND_DEFAULTS`），只有 API key 必填。
- **伺服器上的 .env 是手管的**：deploy 絕不覆寫既有 .env（`2f9c61c` 政策）。要加新 key = SSH 上去手加，不是改 .sample 等部署。
- 已知缺陷（codebase-map 記載）：`llm/factory.py` 硬編碼 `"gemini"`，不讀 `ai_service_configs` 的 active row——改「切換 LLM」相關功能前先看這裡。
- `API_SECRET_KEY`（x-api-key middleware）管一般路由；admin 路由走 JWT 豁免 api-key。

### daodao-worker：secrets 的權威清單是 src/types.ts
- 非機密設定在 `wrangler.toml`（KV id、routes、LANGFUSE_BASEURL）；機密用 `wrangler secret put`，**清單以 `src/types.ts` 的 `Env` interface 為準**：LANGFUSE_SECRET_KEY、LANGFUSE_PUBLIC_KEY、INTERNAL_API_URL、INTERNAL_API_KEY、JWT_SECRET。
- 測試用 `wrangler.test.toml`（無 AI binding；KV id 是佔位字串）——測試裡 AI 路由回 200/500 都算過，是已知的妥協。
- 無 dotenv、無 DB：持久化走 server 的 `/api/internal/ai-generations`（fire-and-forget, waitUntil）。

### daodao-admin-ui：proxy target 是 runtime env
- dev：vite proxy `/api`→localhost:8002（ai-backend）、`/daodao-server`→localhost:4000（rewrite 掉前綴）。
- Docker：**runtime 是 `vite preview`**，proxy target 讀 `BACKEND_URL` / `SERVER_BACKEND_URL` 環境變數——所以 image 必須保留 node_modules + vite.config.ts，別「優化」成純靜態 nginx image（會弄斷 proxy）。
- 前端 token 放 localStorage `daodao_admin_token`。

### daodao-storage
- `migrate/conf.py` 讀 DB 連線；Makefile/CD 注入 `DB_HOST=pg-dev|pg-prod`（Docker 網內 5432）。本地工具連 dev DB 用 `localhost:5423`（僅 dev-ports overlay 開放）。

### daodao-mcp
- `DATABASE_URL` / `REDIS_URL` 由 MCP client 設定注入；`SSH_TUNNEL=ssh-host:local-port:remote-host:remote-port`（如 `daodao:5433:localhost:5432`）啟動時自動開 tunnel（已開則跳過）。注意本地 5423 被 pg-dev 佔用——tunnel 用 5424+（packages/pg/README.md 記載的踩坑）。

## 規則

### F1. 新增 env 變數
- 觸發：diff 引入新的環境變數。
- 步驟：(1) 加進該 repo 的 .sample/.env.example（若存在）；(2) 找出所有注入點——compose env_file、CI/CD workflow、eas.json（mobile）、伺服器手管 .env（ai-backend 要 SSH 手加）；(3) f2e 記得 generate:env 的生成物語義。
- 完成定義：乾淨環境照 .sample 能啟動；部署環境的注入點清單寫進 PR。
- ❌ 反例（觀察到的合理化）：「加進 .sample 部署就會生效」——ai-backend 的部署不重建 .env，.sample 只服務全新機器。

### F2. 讀值前先確認「誰是 source of truth」
- f2e：生成物；server：env_file；ai-backend：伺服器手管 .env；worker：wrangler secrets；admin-ui：容器 runtime env。跨 repo 改同名概念（如後端 URL）時，五種機制各走各的更新路徑。

### F3. 機密紅線
- 任何 secret 不進版控（pre-write-guard hook 擋 .env/.pem/.key 寫入；husky 模板含 gitleaks/ggshield 掃描）。本檔與所有 skill 只記 **key 名**，值一律 user-must-provide。

---
重新驗證：`grep -n "SSH_TUNNEL" /home/user/daodao-mcp/packages/pg/src/server.ts | head -3 && grep -n "BACKEND_URL\|SERVER_BACKEND_URL" /home/user/daodao-admin-ui/vite.config.ts && grep -n "env_nested_delimiter\|__" /home/user/daodao-ai-backend/src/config.py | head -3`
