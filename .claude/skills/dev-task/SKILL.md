---
name: dev-task
description: 以 issue 為單位的隔離平行開發流程。每個 issue 在 worktrees/<n>-<slug>/ 建立獨立 worktree（或 clone）+ task.md manifest，多個 session 可同時開發不同 issue 互不干擾。Use when starting development on a GitHub issue, running parallel multi-issue development, or resuming a task from worktrees/. Trigger words: 開發 issue、開工、dev-task、平行開發、接手任務、發 PR、任務收尾。取代已退役的 dev-branch-workflow。
---

# Dev Task — Issue 隔離開發流程

一個 issue = 一個隔離資料夾 = 一個 session。`projects/` 下的 submodule 永遠停在 `dev`（乾淨、供整合與 pipeline 用），所有開發都在 `worktrees/` 進行。

```
daodao/
├── projects/<repo>/              ← 永遠停在 dev，不在這裡開發
└── worktrees/                    ← gitignored
    └── <issue#>-<slug>/          ← 一個 issue 一個資料夾
        ├── task.md               ← 任務 manifest（唯一入口，接手先讀這個）
        ├── daodao-f2e/           ← worktree @ feat/<slug>
        └── daodao-server/        ← 跨 repo 時同名 branch
```

## 判斷階段

依使用者輸入判斷進入哪個階段：

| 輸入 | 階段 |
|---|---|
| issue 編號/URL + （FRD 路徑、Figma/Drive 連結） | **start** |
| 「接手 <task>」或目前已在 worktrees/ 某資料夾內 | **dev** |
| 「驗證」「檢查畫面」或 dev 全部 phase 完成 | **verify** |
| 「發 PR」「開發完成」 | **finish**（前置：verify 必須通過） |
| 「merge 了」「收尾」 | **cleanup** |

---

## Phase 1: start — 建立任務

### 1.1 收集素材

1. `gh issue view <n>` 讀 issue（中央 issue 在 daodaoedu/daodao，鏡像 issue 在 sub-repo）
2. 收集使用者提供的 FRD 路徑（`docs/product/`）、POC/Figma/Drive 連結
3. **判定涉及哪些 repo** — 依 [references/repo-detection.md](references/repo-detection.md)：逐條需求分類（純 UI / API 行為 / 資料欄位）→ grep 程式碼查證（DTO 驗證、schema 欄位）→ 每個 repo 附依據寫進 task.md；`repo:*` label 只當參考，查證結果為準
4. 決定命名：
   - **任務資料夾**：`<issue#>-<slug>`（例：`150-home-layout`）— 帶編號方便查找
   - **branch**：`feat/<語意化 slug>`（例：`feat/home-layout-sidebar`）— 用 kebab-case 描述「做了什麼」，不放 issue 編號；issue 關聯記在 task.md 與 PR body 的 `Closes #<n>`。fix 用 `fix/`、refactor 用 `refactor/`

### 1.1a 防撞檢查（建 worktree 前必做）

1. **跟 pipeline 防撞**：中央卡（daodaoedu/daodao）有 `auto` label 時，手動開工前必須加 `human-coding` label（`gh issue edit <n> --repo daodaoedu/daodao --add-label human-coding`），讓 Routine A/B 退場，避免兩邊重工；cleanup 時再移除。（org 實際 label 名為 `human-coding`；部分舊文件寫 `human-driving`，以 `gh label list` 為準）
2. **跟其他任務防撞**：對每個目標 repo 檢查 in-flight 工作：
   - `git worktree list`（在 `projects/<repo>` 內）→ 已有任務在做同一個 repo 時，比對雙方 scope 是否碰同一片檔案
   - `gh pr list --repo daodaoedu/<repo> --base dev --state open` → 有 open PR 改到同區域時，在 task.md 備註標注，實作時避開或先等它 merge
3. 發現高重疊 → 停下來問使用者：等待、換順序做、還是接受 conflict 風險

### 1.2 選擇隔離模式

**預設 worktree**。以下情況改用完整 clone（見 [references/clone-mode.md](references/clone-mode.md)）：
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
- 所有 repo 用**同一個 branch 名稱** `feat/<slug>`（fix 用 `fix/`）
- git 禁止同一 branch 掛兩個 worktree——若報錯代表該 issue 已有人在做，停下來確認
- 高風險 repo（`daodao-storage`、`daodao-infra`）依 pipeline 規範不自動開發，涉及時提醒使用者

### 1.4 環境準備

worktree 不含 gitignored 檔案，需要補：

```bash
# 複製 env 檔（含子目錄 apps/*/）
cd "$ROOT/projects/<repo>"
find . -name ".env*" -not -path "*/node_modules/*" -maxdepth 3 | while read f; do
  mkdir -p "$TASK/<repo>/$(dirname "$f")" && cp "$f" "$TASK/<repo>/$f"
done

# 裝依賴（pnpm 共享 store，多為 hardlink，很快）
cd "$TASK/<repo>" && pnpm install
```

### 1.5 寫 task.md

用 [references/task-template.md](references/task-template.md) 模板寫 `$TASK/task.md`，把 issue、FRD、POC 連結、repos、phases 全部記進去。**之後任何 session 接手都從這個檔開始。**

start 完成後回報任務資料夾路徑與 task.md 摘要，然後**預設直接進入 Phase 2 開始實作，不要停下來建議使用者開新 session**。只有兩種情況才建議換 session 接手：使用者表明要平行開發（這個 session 要留著做別的 issue）、或本 session context 已經很重。

---

## Phase 2: dev — 開發中

1. **先讀 task.md** — 確認 scope、phases、目前狀態
2. 工作範圍鎖在自己的任務資料夾，**不碰 `projects/`、不碰其他 worktrees/**
3. **每完成一個 phase 的預設動作序列（自動執行，不要問使用者「要 commit 還是先看效果」）**：
   1. **自行輕量驗證**：UI 變更 → 起 dev server 用瀏覽器實際看過該 phase 的改動（typecheck 過 ≠ 畫面對）；後端變更 → curl 打一輪。這是 phase 級的快篩，完整驗收留給 verify 階段
   2. 驗證過 → `pre-commit-check` → `format-commit` skill commit
   3. 更新 task.md 的 checkbox 與 Status
   4. 直接進下一個 phase
   5. 只有驗證**失敗且修不掉**、或發現 scope 之外的問題時才停下來問使用者
5. 定期 push：`git push -u origin feat/<slug>`——task.md 是本機檔案（gitignored），push 過的 branch 才是災難時唯一留得住的；跨多天的大任務每完成一個 phase 順手在 issue comment 記一行進度，讓狀態不只活在這台機器
6. 跨 repo 依賴順序：`storage (migration) → server (API) → ai-backend → f2e`
7. 需要跑 dev server 時，檢查 task.md 的 Port offset，避免與其他任務相撞

## Phase 3: verify — 瀏覽器驗證（總驗收）

有 UI 變更（f2e / admin-ui）的任務**必須**通過此階段才能發 PR；純後端任務改跑 API 驗證（curl / 整合測試）後跳到 finish。詳細操作見 [references/browser-verify.md](references/browser-verify.md)。

與 dev 階段 phase 級快篩的分工：快篩只看「這個 phase 的改動有沒有壞」；verify 是**對完整驗收清單（FRD 的 Test Points）的總驗收**，含跨 phase 整合、回歸、無障礙與窄螢幕——快篩過了不能跳過 verify。

1. **起 dev server** — 在任務資料夾的 worktree 內起，套用 task.md 的 Port offset
2. **逐 phase 驗收** — 從 task.md 的 phases + FRD 驗收條件展開檢查清單，用瀏覽器實際走過每一條：
   - 首選 `claude-in-chrome` MCP（真實 Chrome、帶登入狀態）；不可用時 fallback `playwright` MCP
   - 對照 task.md 連結的 POC / Figma 設計稿比對版面
3. **留證據** — 每個檢查點截圖存到 `$TASK/evidence/`，命名 `<phase>-<checkpoint>.png`
4. **記錄結果** — task.md 新增「驗證」區塊：檢查清單 + 通過/失敗 + 截圖檔名
5. **失敗處理** — 修復後重驗該項（沿用 pipeline 慣例：同一項失敗 2 次，停下來把現象整理給使用者判斷，不要無限重試）
6. 全部通過 → task.md Status → `verified`，進入 finish

## Phase 4: finish — 發 PR

前置：verify 已通過（task.md Status = `verified`）。對每個有變更的 repo（在任務資料夾內的 worktree 執行）：

1. 確認全部 commit：`git status`
2. 同步 dev：`git fetch origin dev && git rebase origin/dev`（衝突時列出檔案協助解決）
3. 品質檢查：`pnpm run typecheck && pnpm run lint && pnpm test`
4. Push 前跑 `code-review` skill
5. Push（rebase 過需 force push 時先問使用者）
6. 開 PR：

```bash
gh pr create --base dev \
  --title "<type>(<scope>): <繁中描述>" \
  --body "..."   # Summary + Related（issue/OpenSpec 連結）+ Test plan
```

- **base 永遠是 `dev`**（main 只收 dev/hotfix/release）
- PR body 引用 issue（`Closes #<n>` 或鏡像 issue 連結）
- 跨 repo 時在各 PR body 互相引用並標注 merge 順序：

```
## 🔗 跨 Repo PR 關聯
請依序 merge：
1. daodao-storage — <link>（migration，先 merge）
2. daodao-server — <link>
3. daodao-ai-backend — <link>
4. daodao-f2e — <link>
```

7. 更新 task.md：Status → `in-review`，記下 PR 連結
8. **回寫 issue 狀態**（必做，不能只開 PR 不回報）：

```bash
gh issue comment <n> --repo daodaoedu/<repo> --body "$(cat <<'EOF'
## ✅ 驗收完成，已發 PR
- PR: <PR 連結>（跨 repo 時全部列出 + merge 順序）
- 瀏覽器驗證：<通過項目摘要，對應 task.md 驗證區塊>
- Known incomplete scope: <範圍外未處理的項目，沒有就寫 none>
EOF
)"
```

   - 鏡像 issue（sub-repo）：comment 開在鏡像 issue 上
   - 中央 issue（daodaoedu/daodao）：comment 之外，若卡在 Planning board 上，merge 後的 board 回寫由 Routine C 自動處理，不用手動改 Status
9. 之後用 `collect-pr-feedback` skill 收集回饋修正

## Phase 5: cleanup — merge 後收尾

1. 確認所有 PR 已 merge（`gh pr view <link>`）
2. 移除 worktree 與 branch：

```bash
cd "$ROOT/projects/<repo>"
git worktree remove "$TASK/<repo>"
git branch -d feat/<slug>
git fetch origin dev   # 讓 projects/ 的 dev 追上
```

3. 刪任務資料夾：`rm -rf "$TASK"`（task.md 若有留存價值，先摘要進 issue comment）
4. 開工時加過 `human-coding` label 的：移除它
5. 接 `post-merge-wrapup` skill（歸檔 openspec change、更新 docs/product）
6. clone 模式的任務：確認無未 push commit 後 `rm -rf`
7. **順手掃殘留**：`ls worktrees/` 列出其他任務資料夾，PR 已 merge 的提醒使用者一併收尾，避免堆積

## 平行開發約定

- **執行載體選擇**（session vs subagent）：
  - M/L 任務（有中途決策點：驗證失敗判斷、force push、migration 過目）→ 獨立 Claude session，開場：「/dev-task 接手 worktrees/<n>-<slug>」或給 issue 編號
  - XS/S 任務（scope 明確、無決策點）→ 可整包委派一個 subagent 從 start 做到 finish（prompt 指明任務資料夾與本 skill 路徑），或標 `auto` 走 pipeline
  - 任何任務**內部**的機械子步驟（repo 查證、掃 caller、批次改檔、寫測試）→ 隨時 fan out subagent，唯讀調查用 Explore agent
  - 判斷原則：需要使用者中途點頭的工作不要塞進背景 subagent——要嘛卡住要嘛自作主張
- `git worktree list`（在 `projects/<repo>` 內執行）可查目前有哪些任務在進行
- DB/docker 是全機共享——migration 類任務一次只做一個
- 兩個任務要同時跑 dev server：後開的用 clone 模式或設 port offset
- **issue 之間有依賴**（B 需要 A 未 merge 的 code）：B 的 worktree 從 A 的分支開（`git worktree add ... -b feat/<B-slug> feat/<A-slug>`），PR base 先設 A 的分支並在 body 標注依賴；A merge 後 B rebase 回 dev、base 改回 dev。task.md 記清楚依賴鏈
- 並行數量甜蜜點是 2–3 個（本機留給需要瀏覽器驗證/人工判斷的 M/L 任務；XS/S 雜項標 `auto` 走 pipeline 讓 Routine B 雲端做，不佔本機）
- **rebase 政策**：別的 PR merge 了不用立刻 rebase——只在「發 PR 前」和「輪到自己 merge 前有 conflict」兩個時機 rebase，避免連鎖 rebase 稅

## 注意事項

1. 永遠從 `origin/dev` 開分支，PR 開回 `dev`
2. 不在 monorepo 根目錄 commit submodule 指標變更（submodule 各自管理）
3. `projects/` 發現不在 dev 或有髒變更 → 先停下來問使用者（可能是舊流程殘留）
4. worktree add 失敗說 branch 已存在 → 該 issue 可能已在進行，`git worktree list` 查證
