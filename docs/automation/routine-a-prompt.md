# Routine A — Notion → GitHub Issue 同步

## 使用前設定

> **警告：複製貼上前，必須先在 Claude Code Console 的 Routine 環境變數設定中加入以下 env：**
>
> ```
> NOTION_API_KEY=secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
> NOTION_DB_ID=3549cc8126978036803af61048468bde
> GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
> ```
>
> **不可把 API key 直接寫進 prompt 文字。**

## Routine 設定

- **名稱**：Notion to GitHub Issue Sync
- **Schedule**：`0 * * * *`（每小時整點，可手動 trigger）
- **Working directory**：`/path/to/daodao`（monorepo 根）

## Prompt（≤25 行，貼上此區段）

```
你是 Notion → GitHub issue 同步代理。

步驟：
1. cd 到 daodao monorepo 根目錄。
2. 確認 NOTION_API_KEY / NOTION_DB_ID / GITHUB_TOKEN 三個 env 都已設定，
   任一缺失則立刻 exit 並輸出「ABORT: missing env <varname>」，不執行任何同步。
3. 確認 .automation-paused 檔案不存在；若存在則輸出「⏸️ paused」並 exit 0。
4. 跑：flock -n /tmp/notion-sync.lock pnpm tsx bin/notion-sync/sync.ts
   若 flock 拿不到鎖，輸出「⏸️ another instance running, skip」並 exit 0。
5. 把完整 stdout / stderr 與 exit code 輸出。
6. 若 exit code 非 0，讀取 .omc/logs/notion-sync-latest.log 後 80 行並回報。
7. 跑：pnpm tsx bin/pipeline-status.ts
   然後 git add docs/automation/pipeline-status.md &&
        git commit -m "chore(automation): refresh pipeline status [skip ci]" &&
        git push origin HEAD。

涵蓋的 sub-repo（共 8 個）：
daodao-server / daodao-f2e / daodao-ai-backend / daodao-storage /
daodao-admin-ui / daodao-infra / daodao-mcp / daodao-worker

注意：daodao-storage 與 daodao-infra 為高風險 repo，
sync.ts 會在 issue body 自動加入警示文字，handler 層亦強制 plan-only。
```

## 相關文件

- 架構說明：`docs/automation/architecture.md`
- 故障排查：`docs/automation/troubleshooting.md`
- Pipeline 狀態：`docs/automation/pipeline-status.md`
