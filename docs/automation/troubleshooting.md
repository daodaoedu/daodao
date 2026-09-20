# Troubleshooting

> **退役註記（2026-09-20，#241）**：Routine A（Board → Dispatch）與 Routine B（Claude cloud 實作）已退役，本文原本的 Notion API、handler push、verification loop、token budget、headless OpenSpec、state.ts 規則 0 等排錯列與「人類手寫 issue 反向觸發」情境一併移除；歷史版本見 git 或 [docs/archive/automation/](../archive/automation/README.md)。Routine C（board-sync）亦於同日退役，board 狀態由各 skill 呼叫 `bin/pipeline/board.ts` 寫回。

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

## Planning Board（board.ts）Failure Modes

| 症狀 | 檢查 | 處理方式 |
|---|---|---|
| merge 了但卡沒動 | 正常——已無 cron | 跑 `post-merge-wrapup`，它依 dev 冒煙結果 `board.ts set <n> done`／`needfix` |
| `set` 回讀失敗 exit 1 | `gh api rate_limit --jq .resources.graphql`；PAT 額度 5000/hr 與 Actions 的 Sync Shared Config 共用 | 等 reset 再跑；大批操作前先看額度 |
| board 操作 403 | PAT 缺 `project` scope | 重發 PAT（`repo` + `project`） |
| 有人開 PR 但卡在 Todo | sub-repo PR 用 `Refs`，內建 workflow 認不到 | `board.ts set <n> wip` |
| 卡 close 了卻在 Todo／In Progress | 內建 `Item closed → Done` 沒觸發 | `board.ts set <n> done` |
| 不知道哪些卡不對 | — | `board.ts audit`（列八類落差） |

操作手冊：[.claude/skills/gh-pipeline/SKILL.md](../../.claude/skills/gh-pipeline/SKILL.md)。

---

## Human Intervention Scenarios

### 人工接手／開工

```bash
gh issue edit <num> --repo daodaoedu/daodao --add-label human-driving
```

`human-driving` 是人工開工標記（`/dev-task` start 自動掛）。退役後沒有任何 routine 會依此 label 改變行為；它只用來在 board 上辨識人工任務。

### 想暫停自動化

沒有東西可暫停：所有 cron（Routine A／B／C）都已退役，`.automation-paused` 檔案已無作用。GitHub 內建的 board workflow（Item closed → Done 等）要在 board 設定頁關。

### 想派工到 sub-repo

自動派工已退役。用 `/publish-tasks`（批次子 issue，人工發布）或 `/dev-task` 直接開工；要恢復自動派工需另開卡重新設計。
