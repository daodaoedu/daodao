# Troubleshooting

## Intervention Definition {#intervention-definition}

**「人工介入」的定義**（對齊 plan §11.1 acceptance criteria）：

人類在 GitHub 上對 issue 或 PR 做出**寫操作**，包括：
- 留 comment
- 新增或移除 label
- close 或 reopen issue/PR
- merge PR
- push commit

**不算介入**：
- 對 spec PR 做純閱讀 review（只讀不寫）

**注意**：spec PR merge 算 **1 次介入**。

SLA 目標：staging 7 天測試期間，每張測試卡的人工介入次數 ≤ 2 次（含 spec PR merge）。

---

## Failure Modes & Log Locations

| Failure Mode | 症狀 | Log 位置 | 處理方式 |
|---|---|---|---|
| **Notion API 錯誤** | Routine A 無法讀取 Notion DB；issue comment 含 "Notion API error" | `.omc/logs/notion-sync-latest.log`（後 80 行）| 檢查 `NOTION_API_KEY` env 是否設定；確認 DB ID 正確；檢查 Notion workspace 權限 |
| **GH push 拒絕** | handler push 失敗；issue comment 含 "push rejected" | `.omc/logs/routine-b-latest.log` | 確認 `GITHUB_TOKEN` 有 write 權限；確認 branch protection 設定；handler exit code 非 0 |
| **Test 失敗（verification loop 耗盡）** | issue 加上 `human-coding` label；issue comment 含 "verification loop exhausted (2 retries)" | `.omc/logs/routine-b-latest.log` | 手動查看 PR diff + test output；加 `human-driving` label 接手 |
| **Permission denied** | handler 嘗試執行不在 allowlist 的工具；issue comment 含 "BLOCKED: tool '…' not in allowlist" | `.omc/logs/routine-b-latest.log` | 確認 `bin/routine-dispatch/policy/tool-allowlist.json` 是否需更新（需 PR review） |
| **Headless OpenSpec timeout** | `bin/openspec-headless.ts` 超過 30 秒；exit code 2；issue comment 含 "headless OpenSpec hung" | `.omc/logs/routine-b-latest.log` | 確認 `OPENSPEC_NONINTERACTIVE=1` env 有設；檢查 openspec-ff-change skill 是否有 interactive prompt 殘留 |
| **Token budget exceeded** | issue comment 含 "Token budget exceeded (used X / cap Y)"；issue 加 `human-coding` label | `bin/routine-dispatch/state-store.json:token_usage_by_issue` | 評估任務是否 scope 設太小；升級 scope label 後移除 `human-coding` 讓 routine 重試 |
| **Context overflow predicted** | handler 不啟動；issue comment 含 "context overflow predicted"；exit code 4 | `.omc/logs/routine-b-latest.log` | 拆分任務至更小 scope；或升至 scope:L 讓人類 coding |
| **state.ts 規則 0 觸發（high-risk repo）** | `daodao-storage` 或 `daodao-infra` issue 被強制降級為 plan-only；issue body 含 "⚠️ high-risk repo，自動執行限制為 plan-only" | issue comment / `.omc/logs/routine-b-latest.log` | 此為設計行為，非 bug。若需 code PR，必須人類手動執行。 |

---

## Human Intervention Scenarios

### 情境 A — Manual Mode（PM 設定，Routine 跳過）

Notion 卡 `Auto Mode = manual`：Routine A 仍建 issue（含 `notion:<id>` label），但加 `manual` 而非 `auto`，Routine B 自然跳過。

### 情境 B — 人類中途接手（永久退場）

```bash
gh issue edit <num> --repo daodaoedu/<repo> --add-label human-driving
```

效果：
- `bin/routine-dispatch/handoff.sh` 自動移除 `auto`/`auto:*` label
- 留 audit comment「🤝 已交接給人類，routine 退場於 \<timestamp\>」
- Routine B 永久跳過此 issue

恢復：手動移除 `human-driving` 並加回 `auto`。

### 情境 F — Plan 後停

```bash
gh issue edit <num> --repo daodaoedu/<repo> --add-label stop-after-plan
```

效果：routine 跑完 plan 階段後停，不進入 code 階段。

### 情境 C — 人類手寫 issue 反向觸發

見 [manual-issue-to-routine.md](manual-issue-to-routine.md)。

---

## Kill Switch 操作

```bash
# 全域暫停（所有 routine）
touch /Users/xiaoxu/Projects/daodao/.automation-paused

# 恢復
rm /Users/xiaoxu/Projects/daodao/.automation-paused

# Per-repo 暫停
touch /Users/xiaoxu/Projects/daodao/.automation-paused-daodao-f2e

# Per-issue 暫停（下輪 routine 跳過，可恢復）
gh issue edit <num> --repo daodaoedu/<repo> --add-label automation:hold
```

Kill switch SLA：`touch .automation-paused` 後 ≤ 65 分鐘（下一輪 cron）routine 靜默。

---

## 常見問題

### Routine A 跑了但 GitHub issue 沒出現

1. 確認 Notion 卡 `Status = Ready for Dev` 且 `Sync to GitHub = true`
2. 查 `.omc/logs/notion-sync-latest.log` 最後 80 行
3. 確認 `NOTION_API_KEY` 與 `NOTION_DB_ID` 正確設定
4. 確認 Notion DB 已有必要欄位（見 plan §7.1）

### 同一張 Notion 卡建了兩個 issue（dedup 失效）

`gh issue list --repo daodaoedu/<repo> --label notion:<short-id>` 查詢。若有重複，手動 close 多餘的，Routine A 下輪會自動 reconcile。

### Routine B 跑了但 PR 沒出現

1. 確認 issue 有 `auto` + `auto:auto-pr` + `scope:*` labels
2. 確認 `target-repo:*` 不是 `storage` 或 `infra`（規則 0）
3. 查 `.omc/logs/routine-b-latest.log`
4. 確認 `.automation-paused*` 檔案不存在
