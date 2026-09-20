# Pipeline Status

> **退役註記（2026-09-20，#241）**：本檔原由 `bin/pipeline-status.ts` 自動產生（Notion 同步、Routine A／B 派工與 spec PR 狀態）。產生器與 Routine A／B 已退役，舊報表不再更新；最後一版快照可從 git 歷史取得。

現行 pipeline 只剩 **Routine C**（merged PR → Board Done），狀態直接查 GitHub：

```bash
# 最近幾次 board-sync run（成功／失敗、時間）
gh run list -R daodaoedu/daodao --workflow pipeline-board-sync.yml --limit 5

# 看某次 run 的 log（[board-sync] 前綴）
gh run view <run-id> -R daodaoedu/daodao --log

# 本機 dry-run 看目前會動哪些卡
pnpm tsx bin/pipeline/board-sync.ts --dry-run --hours 168

# Planning board 現況
gh project item-list 10 --owner daodaoedu --format json --limit 200
```

kill switch：repo root 有 `.automation-paused` 時 Routine C 直接退出。

詳見 [routine-c-prompt.md](routine-c-prompt.md) 與 [github-pipeline.md](github-pipeline.md)。
