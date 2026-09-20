# Troubleshooting

> **退役註記（2026-09-20，#241）**：Routine A（Board → Dispatch）與 Routine B（Claude cloud 實作）已退役，本文原本的 Notion API、handler push、verification loop、token budget、headless OpenSpec、state.ts 規則 0 等排錯列與「人類手寫 issue 反向觸發」情境一併移除；歷史版本見 git 或 [docs/archive/automation/](../archive/automation/README.md)。現行只剩 Routine C。

## Intervention Definition {#intervention-definition}

**「人工介入」的定義**：

人類在 GitHub 上對 issue 或 PR 做出**寫操作**，包括：
- 留 comment
- 新增或移除 label
- close 或 reopen issue/PR
- merge PR
- push commit

**不算介入**：純閱讀 review（只讀不寫）。

---

## Routine C（board-sync）Failure Modes

| 症狀 | 檢查 | 處理方式 |
|---|---|---|
| merge 了但中央卡沒動 | PR 是否有 `auto` label、body 是否有 `Closes #n`、子 issue body 是否有 `Parent: daodaoedu/daodao#<n>` | 補齊後等下一輪，或 `gh workflow run pipeline-board-sync.yml -f hours=168` 補跑；也可直接人工拖卡 |
| board 沒移 Done | 中央卡是否還有 open 的子 issue（sub-issues 或 `⏳ n/m` comment） | 關掉剩餘子 issue 或人工拖卡 |
| board item-edit 403 | `GIT_HUB_ACCESS_TOKEN` 缺 `project` scope | 重發 PAT（`repo` + `project`），更新 repo secret |
| run 立即結束、無輸出 | repo root 有 `.automation-paused` | 見 Kill Switch |
| 中央卡不在 board 上 | log 出現 `not on board — commented only` | 人工把 issue 加進 Planning board |
| 同一天重複進度留言 | `hasTodayComment` 只比對當日同文字 | 進度數字變了才會再留言；屬設計行為 |

Log 位置：GitHub Actions run log（`gh run view <id> --log`），每行以 `[board-sync]` 前綴；`WARN` 走 stderr。

---

## Human Intervention Scenarios

### 人工接手／開工

```bash
gh issue edit <num> --repo daodaoedu/daodao --add-label human-driving
```

`human-driving` 是人工開工標記（`/dev-task` start 自動掛）。退役後沒有任何 routine 會依此 label 改變行為；它只用來在 board 上辨識人工任務。

### 不想 Routine C 動某張卡

Routine C 只在「merged `auto` PR + `Closes #n` + 子 issue `Parent:` 行」三者齊備時才回寫；跨 repo 子 PR 依 `docs/workflow.md` 用 `Refs` 不用 `Closes`，就不會被觸發。

---

## Kill Switch 操作

```bash
# 全域暫停（Routine C）
touch /Users/xiaoxu/Projects/daodao/.automation-paused

# 恢復
rm /Users/xiaoxu/Projects/daodao/.automation-paused
```

Kill switch SLA：`touch .automation-paused` 後 ≤ 65 分鐘（下一輪 cron）routine 靜默。
（需 commit 到 main 才對 Actions 生效；本機檔案只影響本機 dry-run。）

---

## 常見問題

### 想手動觸發 Routine C

```bash
gh workflow run pipeline-board-sync.yml -R daodaoedu/daodao -f dry_run=true -f hours=48
gh run list -R daodaoedu/daodao --workflow pipeline-board-sync.yml --limit 5
```

### 想派工到 sub-repo

自動派工已退役。用 `/publish-tasks`（批次子 issue，人工發布）或 `/dev-task` 直接開工；要恢復自動派工需另開卡重新設計。
