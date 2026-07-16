---
name: automation-pipeline
description: 你觀察到以下任一狀態時載入：處理帶 auto / notion:* / scope:* / spec-* label 的 issue 或 PR；Routine A/B/C 行為異常；Notion 卡片狀態與 GitHub 對不上；你自己就是被 pipeline dispatch 的 agent；想改 bin/notion-sync 或 bin/routine-dispatch
---

# Notion→Issue→Plan→PR 自動化管線

> 最後校準：2026-07-14。權威行為規範是 hub 的 `notion-pipeline` skill 與 `docs/automation/`——本檔是給「撞見管線產物」的 session 的最小生存指南 + 事故備忘。注意：`docs/workflow.md` Phase 9 描述的是**舊的**單一 Remote Agent（每 2 小時），已被 Routine A/B/C 部分取代（每小時）——兩份文件並存，以 docs/automation/ 為準。

## 管線一頁圖

- **Routine A**（hourly，`routine-a-notion-sync.yml` → `bin/notion-sync/sync.ts`）：Notion DB（雙閘：Status=Ready for Dev + Sync to GitHub=true）→ 在 8 個目標 repo 開 issue，貼 `auto` + `notion:<shortId>` label。dedup 靠 label。
- **Routine B**（dispatch，`bin/routine-dispatch/main.sh <repo> <issue>`）：按 label 推導狀態機（state.ts），依 Scope 走 handler：XS=單 PR（plan+code）、S=強制 test-first（RED commit → GREEN commit）、M=先 spec PR（monorepo）再 code PR、L=只出 spec PR + `human-coding`。政策層 `policy/enforce.sh` + tool-allowlist + write-path-blocklist 包住每個指令；token 預算 XS 50k / S 200k / M 800k / L 1.5M；模型路由 haiku(dispatch/judge)/sonnet(handler)/opus(spec)。
- **Routine C**（hourly，`bin/routine-c/sync-done.ts`）：tracked PR 開著 → Notion「PR Open」；merged → 「Review」（**Done 只有人類能設**，forward-only）。
- **Rule 0**：`daodao-storage` 與 `daodao-infra` 是 HIGH_RISK_REPOS（`bin/notion-sync/types.ts`），一律強制 plan-only——**管線永遠不對這兩個 repo 出 code PR**。

## 規則

### A1. 你是被 dispatch 的 agent 時
- 觸發：prompt/issue 帶 pipeline 標記（auto label、notion-id 註解、routine 字樣）。
- 步驟：先讀 hub `notion-pipeline` skill 全文（行為規範：留言格式、label 轉移、退出條件）。issue body 必須自給自足——**不要**去猜 Notion 上下文；body 不足時 openspec-headless 的正確行為是 exit 1（退回要求補件），不是腦補。
- 完成定義：所有狀態轉移用 label 表達（state.ts 是唯一裁判），留言符合規範。

### A2. 改動會被自動化讀寫的狀態時（label、Notion 欄位）
- 事實：三個修過的 bug 都源於狀態協定被破壞——缺 `tracked` label 讓 Routine C 永遠找不到 PR（`ce9ebf2`）；closingIssuesReferences 在 dev-branch PR 上恆空，連結靠 regex 解析 PR body 的 `closes #N`（`03acd22`，含 `\b` 防誤匹配 `c2d8f39`）；無條件覆寫把人工 Done 降級（`f733153`）。
- 步驟：手動開的 pipeline PR 要自己補 `tracked` label + body 裡寫 `closes #N`；寫回 Notion 的任何自動化必須 forward-only。
- 完成定義：dry-run（兩個 routine workflow 都有 dry-run input）確認無降級寫入。

### A3. 停下管線
- 檔案開關**一律放在 hub repo（daodao）的根目錄**，不是目標 repo——kill-switch.sh 只檢查 monorepo root（kill-switch.sh:21 `_KILL_SWITCH_ROOT` = bin/routine-dispatch/ 的上兩層）。全域：`/home/user/daodao/.automation-paused`；單 repo：`/home/user/daodao/.automation-paused-<repo>`（如 `.automation-paused-daodao-f2e`）。放錯地方（放進目標 repo 根）管線**不會停**而你會以為停了。單 issue：`automation:hold` label（暫停）或 `human-driving` label（**永久**接手，handoff.sh 會撤 auto labels 留審計留言）。
- 觸發：管線在做蠢事。步驟：先貼 label 止血，再查因。完成定義：下一輪 routine 跳過該對象。

### A4. 管線殘渣的處置
- PLAN.md 型檔案（管線把計畫檔 commit 進 repo 根，f2e 已有一例 `4cd94a4`）：確認對應 issue 已關即可刪。見 failure-archaeology §7。
- label 全集由 `bin/setup-auto-labels.sh` 定義（2026-07-14 實數 16 個；注意腳本自己的 header 註解寫 13——註解過期，以 `LABELS` 陣列為準）——新 repo 接入管線先跑它，別手造 label（拼錯 = 狀態機失明）。

### A5. 驗證迴圈的上限
- handler 的 verification-loop 最多重試 2 次（lint+test）後升級人類；context 超標以 exit 4 中止（exit code 定義在 main.sh / verification-loop.sh；estimate-context.ts 只負責預估）。你在 handler 裡遇到第三次同錯：照設計**停**，不是想辦法繞（同 CLAUDE.md 的三次規則）。
- ❌ 反例（觀察到的合理化）：「再多跑一輪說不定就綠了」——token 預算是硬上限，燒完的 issue 會卡死在半成品狀態，比乾淨升級更難收拾。

---
重新驗證：`grep -n "HIGH_RISK_REPOS" /home/user/daodao/bin/notion-sync/types.ts && ls /home/user/daodao/bin/routine-dispatch/handlers/ && grep -n "dry" /home/user/daodao/.github/workflows/routine-a-notion-sync.yml | head -3`
