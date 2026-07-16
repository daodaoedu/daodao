---
name: diagnostics-and-tooling
description: 你觀察到以下任一狀態時載入：需要查 prod/dev 資料庫或 Redis 的實際狀態；MCP DB 連線 ECONNRESET 或 tunnel 掛掉；要追 worker 的 500；要看自動化 pipeline 現在卡在哪；需要比對 schema 漂移；想確認某功能「到底上線了沒」
---

# 診斷工具箱

> 最後校準：2026-07-14。原則：能用指令驗證就不用直覺（.claude/README.md 設計原則 4）。

## T1. 查資料庫真相：daodao-mcp pg server

- 用途：唯讀查 prod/dev PostgreSQL。工具：`describe_schema`、`query`、`get_user_full_context`。內建 SQL AST 驗證、唯讀 transaction、statement timeout、PII 遮罩。
- 啟用：`cd daodao-mcp && pnpm install && pnpm build`，MCP client 註冊 `node packages/pg/dist/server.js`，env `DATABASE_URL` + 可選 `SSH_TUNNEL=daodao:5433:localhost:5432`（自動開 tunnel，已開則跳過——`b4a0583`）。
- **歷史坑**：早期 tunnel 指向硬編碼 Docker 內部 IP（172.21.0.6），container 重啟就 ECONNRESET（那次凍結了 checkin image 調查）；後改 socat/DNS 名稱（hub `325091b`）。今天再遇 ECONNRESET：先檢查 tunnel 目標是不是又寫死了 IP。
- **信任邊界（TODO.md 自承，2026-07 快照）**：PII 遮罩**從未對真實資料驗證過**（開發時 pg-dev 是空 schema）；`get_user_full_context` 的 5 路 Promise.all 撞 pool max:3 可能 timeout。把它當調查工具，別把輸出直接貼進公開 issue（遮罩可能有漏）。
- Redis 同款：`packages/redis`（`redis_keys/get/info/command` allowlist 制），server/ai 兩實例分 6380/6381。

## T2. schema 漂移三件套

```bash
cd daodao-server && pnpm run schema:drift        # 名字層級：prisma vs storage/schema（需本地有 ../daodao-storage 或設 STORAGE_SCHEMA_PATH）
cd daodao-storage && make check-schema           # CHECK 值三層一致 + migrate/sql vs schema/ 完整性
make migrate-sql-status-dev                      # migration_history 的 success 真相
```
盲區備忘：drift 不比型別；check-schema 有 ~70 表白名單（= 已知債）。兩個都綠仍可能有型別漂移（photo_url 型）。

## T3. worker 追錯

- `wrangler tail`（需 Cloudflare 登入）。generate 路徑的 500 已有結構化錯誤 log（route、session_id、category、locale、model + stack——`c0a9d62` 加的，用來區分「AI 呼叫失敗」vs「JSON parse 失敗」）。
- AI 回應解析有三段防禦（剝 `<think>` → JSON.parse → regex 撈 `{...}`）——Qwen 系模型會吐 reasoning 標籤，parse 失敗先看原始輸出有沒有這類雜訊。
- Langfuse tracing：`LANGFUSE_BASEURL`（prod 指 us.cloud.langfuse.com）。

## T4. 自動化 pipeline 卡點診斷

- 總覽：讀 `daodao/docs/automation/pipeline-status.md`（由 `pnpm tsx bin/pipeline-status.ts` 重生）。
- 常見卡點（都發生過）：
  - Notion 卡「In progress」不動 → PR 少了 `tracked` label（`ce9ebf2`）。
  - Notion GitHub PR 欄位空白 → PR 打 dev branch，closingIssuesReferences 永遠空（`03acd22`）——看 PR body 的 closes #N 才是實際連結。
  - 人工設的狀態被蓋 → Routine C 舊版行為，已修為 forward-only（`f733153`）；再發生就是回歸。
  - 全面停擺 → 檢查 kill switch：`.automation-paused`（全域）、`.automation-paused-<repo>`、issue 上的 `automation:hold` label。
- 手動觸發：workflow_dispatch `routine-a-notion-sync.yml` / `routine-c-sync-done.yml`（都有 dry-run input——先 dry-run）。

## T5. 「這功能上線了沒」

- 別信 docs/product 的狀態標籤（普遍落後，會讓你重做已上線功能）。跑 hub 的 `product-status-check` skill，或直接：`cd daodao && python scripts/check_product_status.py --verbose`（manifest：`scripts/product_status_manifest.yml`，2026-07-06 校準）。每週一 cron 有 drift 檢查 + Discord 警報。

## T6. Discord 是事故時間線

- CI 失敗、CD 失敗、schema drift、product drift 全部推 Discord。回溯「什麼時候開始壞」先翻 Discord 頻道時間線，比翻 Actions run 列表快。

## T7. 容器管理小工具

- `daodao/utils/dm`：互動式 docker 容器管理 TUI（bash）。SSH 到 VPS 後的快速面板；不適合腳本化（互動式選單）。

## T8. grep 衛生

- f2e：永遠排除 `packages/assets/generated/`（多 MB 單行）與 `node_modules`；server：排除 `generated/`（prisma client）。全 workspace 掃 TODO 的基準（2026-07-14）：f2e 7 個、server 39 個（集中 src/services/）、ai-backend 3、worker/admin-ui/mcp 0——若某目錄突然暴增，是異味。

---
重新驗證：`ls /home/user/daodao-mcp/packages/ && test -f /home/user/daodao/scripts/check_product_status.py && echo OK && grep -n "tracked" /home/user/daodao/bin/routine-c/sync-done.ts | head -2`
