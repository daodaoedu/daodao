# Manual Issue to Routine

工程師在 sub-repo 直接手寫 issue，加齊 4 個必要 labels，Routine B 下輪掃到後正常 dispatch。

**不需要 `notion:*` label**，因為這是人類手動觸發，不經過 Notion 同步。

---

## Step-by-Step 指南

1. 決定目標 sub-repo 與 scope（XS / S / M / L）
2. 複製下方對應的 `gh issue create` 命令
3. 填入 `--title` 與 `--body`（body 建議含 Acceptance Criteria）
4. 執行命令，確認 issue 建立成功
5. 等待 Routine B 下輪 cron（最多 1 小時）開始 dispatch

**重要**：`daodao-storage` 與 `daodao-infra` 為高風險 repo，即使設 `auto:auto-pr` 也會被強制降級為 `plan-only`（state.ts 規則 0）。

---

## gh issue create 範本（8 個 sub-repo）

### daodao-server

```bash
gh issue create \
  --repo daodaoedu/daodao-server \
  --title "YOUR_TITLE_HERE" \
  --body "## Description

YOUR_DESCRIPTION_HERE

## Acceptance Criteria

- [ ] CRITERION_1
- [ ] CRITERION_2" \
  --label "auto" \
  --label "auto:auto-pr" \
  --label "scope:S" \
  --label "target-repo:daodao-server"
```

### daodao-f2e

```bash
gh issue create \
  --repo daodaoedu/daodao-f2e \
  --title "YOUR_TITLE_HERE" \
  --body "## Description

YOUR_DESCRIPTION_HERE

## Acceptance Criteria

- [ ] CRITERION_1
- [ ] CRITERION_2" \
  --label "auto" \
  --label "auto:auto-pr" \
  --label "scope:S" \
  --label "target-repo:daodao-f2e"
```

### daodao-ai-backend

```bash
gh issue create \
  --repo daodaoedu/daodao-ai-backend \
  --title "YOUR_TITLE_HERE" \
  --body "## Description

YOUR_DESCRIPTION_HERE

## Acceptance Criteria

- [ ] CRITERION_1
- [ ] CRITERION_2" \
  --label "auto" \
  --label "auto:auto-pr" \
  --label "scope:S" \
  --label "target-repo:daodao-ai-backend"
```

### daodao-storage（高風險 — 強制 plan-only）

```bash
# 注意：daodao-storage 為高風險 repo（SQL migration），state.ts 規則 0 強制 plan-only
# 即使設 auto:auto-pr 也不會自動開 code PR
gh issue create \
  --repo daodaoedu/daodao-storage \
  --title "YOUR_TITLE_HERE" \
  --body "## Description

YOUR_DESCRIPTION_HERE

## Acceptance Criteria

- [ ] CRITERION_1
- [ ] CRITERION_2

> ⚠️ high-risk repo，自動執行限制為 plan-only，code 階段需人類手動執行。" \
  --label "auto" \
  --label "auto:plan-only" \
  --label "scope:M" \
  --label "target-repo:daodao-storage"
```

### daodao-admin-ui

```bash
gh issue create \
  --repo daodaoedu/daodao-admin-ui \
  --title "YOUR_TITLE_HERE" \
  --body "## Description

YOUR_DESCRIPTION_HERE

## Acceptance Criteria

- [ ] CRITERION_1
- [ ] CRITERION_2" \
  --label "auto" \
  --label "auto:auto-pr" \
  --label "scope:S" \
  --label "target-repo:daodao-admin-ui"
```

### daodao-infra（高風險 — 強制 plan-only）

```bash
# 注意：daodao-infra 為高風險 repo（IaC、ops），state.ts 規則 0 強制 plan-only
# 即使設 auto:auto-pr 也不會自動開 code PR
gh issue create \
  --repo daodaoedu/daodao-infra \
  --title "YOUR_TITLE_HERE" \
  --body "## Description

YOUR_DESCRIPTION_HERE

## Acceptance Criteria

- [ ] CRITERION_1
- [ ] CRITERION_2

> ⚠️ high-risk repo，自動執行限制為 plan-only，code 階段需人類手動執行。" \
  --label "auto" \
  --label "auto:plan-only" \
  --label "scope:M" \
  --label "target-repo:daodao-infra"
```

### daodao-mcp

```bash
gh issue create \
  --repo daodaoedu/daodao-mcp \
  --title "YOUR_TITLE_HERE" \
  --body "## Description

YOUR_DESCRIPTION_HERE

## Acceptance Criteria

- [ ] CRITERION_1
- [ ] CRITERION_2" \
  --label "auto" \
  --label "auto:auto-pr" \
  --label "scope:S" \
  --label "target-repo:daodao-mcp"
```

### daodao-worker

```bash
gh issue create \
  --repo daodaoedu/daodao-worker \
  --title "YOUR_TITLE_HERE" \
  --body "## Description

YOUR_DESCRIPTION_HERE

## Acceptance Criteria

- [ ] CRITERION_1
- [ ] CRITERION_2" \
  --label "auto" \
  --label "auto:auto-pr" \
  --label "scope:S" \
  --label "target-repo:daodao-worker"
```

---

## Scope 選擇指南

| Scope | 適用情境 | 自動化程度 |
|---|---|---|
| `scope:XS` | 單一檔案小修改（≤3 檔） | plan + code 一個 PR |
| `scope:S` | 功能小改（≤10 檔） | plan.md + code 一個 PR |
| `scope:M` | 中型功能（≤30 檔） | 兩階段：先 spec PR，merge 後再 code PR |
| `scope:L` | 大型功能 | 只跑 spec PR，code 由人類接手 |

---

## Auto Mode 選擇指南

| Label | 說明 |
|---|---|
| `auto:auto-pr` | routine 通過 scope 閘門後自動開 code PR |
| `auto:plan-only` | routine 只跑 plan 階段，不開 code PR |

建議保守起步用 `auto:plan-only`，確認 plan 品質後再換成 `auto:auto-pr`。

---

## 驗證 issue 是否被 Routine B 接手

```bash
# 確認 issue 有正確 labels
gh issue view <num> --repo daodaoedu/<repo> --json labels

# 確認 Routine B 已開始處理（查 issue comments）
gh issue view <num> --repo daodaoedu/<repo> --comments
```

Routine B 開始處理時會在 issue 上留 comment 說明狀態。

---

## 人工開 PR（Path A）

如果你想自己寫 code、開 PR，但仍希望 Notion 任務進度自動更新，需要：

**前提**：Notion 任務已經過 Routine A 同步，GitHub Issue 已存在。

**開 PR 時的規範：**

1. PR body 加入 closing reference：
   ```
   Closes daodaoedu/<repo>#<issue-num>
   ```

2. PR 加上 `tracked` label：
   ```bash
   # 建立 PR 時直接加
   gh pr create --label tracked ...

   # 或事後補加
   gh pr edit <pr-num> --repo daodaoedu/<repo> --add-label tracked
   ```

這樣 Routine C 每小時會掃到這個 PR，自動將 Notion 狀態更新為 `PR Open`，merge 後更新為 `Done`。

**不需要追蹤 Notion 的 ad-hoc 小修 PR**，不加 `tracked` label 即可，Notion 不會被影響。
