# Phase 1: start — 建立任務

### 1.1 收集素材

1. `gh issue view <n>` 讀 issue（中央 issue 在 daodaoedu/daodao，鏡像 issue 在 sub-repo）。**只在子卡或獨立卡上開工**：issue 底下有 sub-issues（是母卡）時不在母卡上開發，改挑或依 AC 先拆子卡（[GitHub Issue 管理規範 §4](../../../../../docs/automation/github-issue-management.md#4-母卡子卡pr-與相依關係)）
2. 收集使用者提供的 PRD／既有 FRD（`docs/product/`）、Issue 留言、POC/Figma/Drive 或分支連結；**POC 是 Google Drive 資料夾連結時，下載到本機**（見 [poc-download.md](../poc-download.md)），verify 階段才有東西可以直接開來比對，不用每次現開 Drive
3. **判定涉及哪些 repo** — 依 [repo-detection.md](../repo-detection.md)：逐條需求分類（純 UI / API 行為 / 資料欄位）→ grep 程式碼查證（DTO 驗證、schema 欄位）→ 每個 repo 附依據寫進 task.md；`repo:*` label 只當參考，查證結果為準
4. 決定命名：
   - **任務資料夾**：`<issue#>-<slug>`（例：`150-home-layout`）— 帶編號方便查找
   - **branch**：`feat/<語意化 slug>`（例：`feat/home-layout-sidebar`）— 用 kebab-case 描述「做了什麼」，不放 issue 編號；issue 關聯記在 task.md 與 PR body 的 `Closes #<n>`。fix 用 `fix/`、refactor 用 `refactor/`

### 1.1a 防撞檢查（建 worktree 前必做）

1. **人工開工標記 + board 移 In Progress**：任務對應中央卡（daodaoedu/daodao）時，建 worktree 前執行：

   ```bash
   pnpm -s tsx bin/pipeline/board.ts set <n> wip --add-label human-driving
   ```

   一行同時把 Planning board 卡片移到 `In Progress`（不在 board 會先加入）、掛 `human-driving` label，並回讀確認。從 `Need Fix`（dev 冒煙失敗或 PM 驗收退回）接手的卡同樣用這行；PM 退回的先讀他留言指出哪條 AC 沒過。
   - 自動派工 Routine A／B 已於 2026-09-20 退役（#241），`human-driving` 現在只用來在 board 上辨識「有人在做」，不再是防派工閘門
   - 不要手動 `gh project item-edit`：board 的七欄語意與 option id 統一放在 `bin/pipeline/types.ts`，見 [gh-pipeline](../../../gh-pipeline/SKILL.md)
   - 不要跟 `human-coding` 混淆：那是 Routine B 時代 sub-repo 鏡像 issue 的移交標記，已不再使用
2. **跟其他任務防撞**：對每個目標 repo 檢查 in-flight 工作：
   - `git worktree list`（在 `projects/<repo>` 內）→ 已有任務在做同一個 repo 時，比對雙方 scope 是否碰同一片檔案
   - `gh pr list --repo daodaoedu/<repo> --base dev --state open` → 有 open PR 改到同區域時，在 task.md 備註標注，實作時避開或先等它 merge
3. 發現高重疊 → 停下來問使用者：等待、換順序做、還是接受 conflict 風險

### 1.2 選擇隔離模式

**預設 worktree**。以下情況改用完整 clone（見 [clone-mode.md](../clone-mode.md)）：
- 任務會改 docker-compose / port 配置 / 本地 DB 初始化
- 長期 prototype（活得比一般 feature branch 久）
- 需要與另一個任務**同時跑 dev server**（撞 port）

### 1.3 建立 worktree

對每個涉及的 repo：

```bash
ROOT=$(git rev-parse --show-toplevel)   # monorepo root
TASK="$ROOT/worktrees/<issue#>-<slug>"
mkdir -p "$TASK"

cd "$ROOT/projects/<repo>"
git fetch origin dev
git worktree add "$TASK/<repo>" -b feat/<slug> origin/dev
```

注意：
- 明確從 `origin/dev` 建立任務分支，不使用來源工作目錄的 `HEAD`；有未合併任務依賴時，依「平行開發約定」指定依賴分支。
- `fetch` 與 `worktree add` 會更新共用 Git metadata，但不改動來源工作檔案、暫存區或目前分支。不得為了開工在 `projects/` 執行 `checkout`、`switch`、`pull`、`reset`、`stash`、`clean`，或安裝依賴、自動修復檔案。
- `fetch` 失敗時先處理錯誤，不得默默改用可能過期的 `origin/dev`。
- 所有 repo 用**同一個 branch 名稱** `feat/<slug>`（fix 用 `fix/`）
- git 禁止同一 branch 掛兩個 worktree——若報錯代表該 issue 已有人在做，停下來確認
- 高風險 repo（`daodao-storage`、`daodao-infra`）依 pipeline 規範不自動開發，涉及時提醒使用者

### 1.3a 操作觀測試行（派工前）

需要寫入 trace 的新 macOS／Linux 任務，必須在第一次修改、產物生成與 subagent 派工**之前**啟動獨立 `record-agent-writes.py`。確認 task repo 乾淨，macOS 使用 repo 外 venv 安裝固定 watchdog 6.0.0；Linux 用 Python 標準函式庫及 libc，不需 watchdog，output／stop-file 放任務目錄、不可放 repo 內。等待 `trace.json.ready.json` 再進下一步；若 setup 已改 tracked 檔案才啟動，不能把 trace 說成全任務覆蓋。完整操作方式與限制見 daodao root 的 `docs/automation/agent-learning-loop.md`。collector 是輔助驗證，delivery gate 預設 off，不能為了補 trace 重寫舊 diff；UI／API 驗收仍依 Phase 3。Bash／Python／產物生成可由原生 watcher 觀測，不要求只用 Edit／Write。保持 collector 運行到測試與最終 commit 都完成，再建立 stop-file 並核對最終 HEAD。Linux repo 必須在 VM／container 本機檔案系統；NFS／Docker host-share 不適用。新增或搬移目錄可能有遞迴訂閱空窗，會標 partial，不能用掃描或重寫補成完整。

### 1.4 環境準備

worktree 不含 gitignored 檔案，需要補：

```bash
# 複製 env 檔（含子目錄 apps/*/）
cd "$ROOT/projects/<repo>"
find . -name ".env*" -not -path "*/node_modules/*" -maxdepth 3 | while read f; do
  mkdir -p "$TASK/<repo>/$(dirname "$f")" && cp "$f" "$TASK/<repo>/$f"
done

# 裝依賴（pnpm 共享 store，多為 hardlink，很快）
# repo 自己有 pnpm-workspace.yaml（daodao-f2e）→ 直接 pnpm install，用它自己的 workspace 與 catalog；
#   加 --ignore-workspace 會讓 catalog 失效，報 ERR_PNPM_CATALOG_ENTRY_NOT_FOUND_FOR_SPEC
# 其他 repo（daodao-server 等）→ 加 --ignore-workspace，否則 monorepo 根的 pnpm-workspace.yaml
#   會把它當成 workspace 成員而 no-op（「Done in 274ms」、沒有 node_modules）
# 裝完用 ls node_modules/.bin 確認真的有東西
cd "$TASK/<repo>"
if [ -f pnpm-workspace.yaml ]; then pnpm install; else pnpm install --ignore-workspace; fi
```

server 起不來、openapi 檔冒出大量 diff、連不到 `*.orb.local` 等環境問題，先查 [gotchas.md](../gotchas.md)「環境準備」。

### 1.5 產出驗收契約

從已確認的 PRD／既有 FRD 或 Issue 建立 task.md 的 `## 驗收契約`。沿用來源 FR／TP／AC ID，保留需求與驗收的對應；跨文件同名 ID 以文件識別碼區分，不為模板重新編號。每條需有可判定結果，技術驗證方法由 AI 查核後補上，不能把測試方法誤寫成產品已承諾的 API 或行為。

```markdown
## 驗收契約
- [ ] <來源文件識別碼>#TP-01（對應 FR-01）：<已確認的可驗收行為>
  - 驗證方式：<操作／測試與預期結果>
  - 證據：<執行後補連結；尚未執行時明記>
```

沒有驗收條件時，先由 AI 起草候選條件、查核現況、自審補洞。由既有已確認條件展開驗證步驟不需重複確認；新增產品行為或取捨必須列為待確認，不得因「合理推導」自動成為已批准契約。**沒有已確認的驗收契約就不開工**；有局部待決事項時，只推進不依賴該決策的已確認範圍。

在 task.md 記錄來源版本／快照與查核的 repo、ref、HEAD、base／merge-base、dirty 狀態，這些由 AI 取得。參考 POC／分支與目標實作基準分開；mock 或靜態畫面不能當作正式功能證據。來源更新時保留原驗收基準，列出變更與影響，經必要產品決策確認後才更新契約。新需求統一 PRD，不另強制產出 FRD。

### 1.6 寫 task.md

用 [task-template.md](../task-template.md) 模板寫 `$TASK/task.md`，把 issue、PRD／既有 FRD、POC／分支連結、repos、phases、**驗收契約**全部記進去。**之後任何 session 接手都從這個檔開始。**

start 完成後回報任務資料夾路徑與 task.md 摘要，然後**預設直接進入 Phase 2 開始實作，不要停下來建議使用者開新 session**。只有兩種情況才建議換 session 接手：使用者表明要平行開發（這個 session 要留著做別的 issue）、或本 session context 已經很重。

---

**完成條件**：每個涉及的 repo 都有 worktree 且依賴已裝好（`ls node_modules/.bin` 有東西）；`task.md` 已寫入，含已確認的驗收契約。

達成後讀 [dev.md](dev.md) 接著實作。
