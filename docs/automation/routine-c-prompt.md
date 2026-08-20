# Routine C — Merged PR → Board Done（Actions script 運維手冊）

> 2026-08 二次改版：Routine C 不再由 Claude 執行，改為 GitHub Actions 跑純 script。
> Notion 版（bin/routine-c/sync-done.ts）與 cloud routine 版皆已退役。

## 組成

| 元件 | 位置 |
|---|---|
| Workflow | `.github/workflows/pipeline-board-sync.yml`（每小時 `:37` UTC + `workflow_dispatch`） |
| 入口 | `bin/pipeline/board-sync.ts`（`--dry-run` / `--hours <n>`，預設 48） |
| 共用邏輯 | `bin/pipeline/lib.ts` / `bin/pipeline/gh.ts` |
| Secret | `GIT_HUB_ACCESS_TOKEN`（PAT，需 `repo` + `project` scope） |

## 行為摘要

1. `.automation-paused` 存在 → 直接退出
2. 掃 8 個 sub-repo lookback 內 merged 的 `auto` PR，依 body `Closes #n` 補關鏡像 issue
3. 從鏡像 issue body 的 `Parent: daodaoedu/daodao#<n>` 反查中央卡（跨 repo 搜尋 + 精確比對）
4. 中央卡所有鏡像 closed → `✅ 全部完成` comment + board → Done；**不自動 close**（留給 product 驗收）
5. 尚有 open → `⏳ {done}/{total}` 進度 comment（同日同進度去重，避免洗版）

## 手動操作

```bash
# 本機 dry-run
pnpm tsx bin/pipeline/board-sync.ts --dry-run

# 拉長 lookback 補歷史（例如補過去一週）
pnpm tsx bin/pipeline/board-sync.ts --hours 168

# 從 GitHub 手動觸發
gh workflow run pipeline-board-sync.yml -R daodaoedu/daodao -f dry_run=true -f hours=48

# 看 run log
gh run list -R daodaoedu/daodao --workflow pipeline-board-sync.yml --limit 5
```

## 除錯快查

| 症狀 | 檢查 |
|---|---|
| merge 了但中央卡沒動 | PR 有 `auto` label 嗎？body 有 `Closes #n` 嗎？鏡像 body 的 `Parent:` 行格式對嗎 |
| board 沒移 Done | 中央卡是否還有 open 的鏡像 issue（看 sub-issues 或 `⏳` comment） |
| board 操作 403 | `GIT_HUB_ACCESS_TOKEN` 缺 `project` scope |

## 未來升級

事件驅動：在 sub-repo 加 `pull_request: closed` workflow 發 `repository_dispatch`
到中央 repo 觸發 board-sync，merge 當下即回寫，hourly 輪詢降為保底。
