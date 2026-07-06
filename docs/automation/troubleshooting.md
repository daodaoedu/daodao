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
| **GH push 拒絕** | `verify.sh` push 失敗；issue comment 含 "push rejected" | `.omc/logs/routine-b-latest.log` | 確認 `GITHUB_TOKEN` 有 write 權限；確認 branch protection 設定 |
| **驗證失敗（verify.sh exit 4）** | verify.sh 輸出缺陷清單（品質指令失敗、scope caps 超限、blocklist 違規、缺 PLAN.md 等） | verify.sh 輸出 / `bin/routine-dispatch/runs/<repo>-<issue>.json` | 依缺陷清單逐條修正，重跑**同一個** verify.sh（不要跑 next.sh） |
| **重試耗盡（verify.sh exit 5）** | issue 加上 `human-coding` label；issue comment 含升級說明（verifyAttempts=2 耗盡） | `.omc/logs/routine-b-latest.log` / `bin/routine-dispatch/runs/` | 手動查看 diff + 缺陷清單；人類接手，或修正後移除 `human-coding` 讓 routine 重試 |
| **禁改路徑違規** | verify.sh exit 4；缺陷清單含 "blocked path"（`.github/workflows/`、`.env*`、`secrets/`、已 merged migration 等） | verify.sh 輸出 | 撤掉違規改動。若 blocklist 本身需更新，改 `bin/routine-dispatch/policy/write-path-blocklist.json`（需 PR review） |
| **Spec 邊界違規** | spec ticket 改動了 `openspec/changes/<change_id>/` 以外的檔案，或缺 `proposal.md`/`tasks.md`；verify.sh exit 4 | verify.sh 輸出 | 把改動限制在 change 目錄內、補齊必要檔案後重跑 verify.sh |
| **Scope caps 超限** | verify.sh exit 4；缺陷清單含 "scope cap exceeded"（檔案數或 diff 行數超過 `pipeline.config.json` scopeCaps） | verify.sh 輸出 | 縮小 diff；若任務本質就超過該 scope，升級 scope label 後重新 dispatch，或人類接手 |
| **next.sh FATAL** | next.sh 中止並輸出 FATAL（gh 認證、config 讀取、工作區準備失敗等） | next.sh 輸出 / `.omc/logs/routine-b-latest.log` | 停止本輪並回報錯誤全文；不要手動補做 next.sh 的工作 |
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

以下指令都在 monorepo 根目錄執行（`git rev-parse --show-toplevel` 確認位置）：

```bash
# 全域暫停（所有 routine）
touch .automation-paused

# 恢復
rm .automation-paused

# Per-repo 暫停
touch .automation-paused-daodao-f2e

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
