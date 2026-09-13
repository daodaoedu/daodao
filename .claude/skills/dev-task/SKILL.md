---
name: dev-task
description: >-
  以 issue 為單位的隔離平行開發流程。每個 issue 在 worktrees/編號-slug/ 建立獨立 worktree（或 clone）+ task.md manifest，多個 session 可同時開發不同 issue 互不干擾。Use when starting development on a GitHub issue, running parallel multi-issue development, or resuming a task from worktrees/. Trigger words: 開發 issue、開工、dev-task、平行開發、接手任務、發 PR、任務收尾。取代已退役的 dev-branch-workflow。
---

# Dev Task — Issue 隔離開發流程

一個 issue = 一個隔離資料夾 = 一個 session。`projects/` 下的 submodule 作為建立 worktree 的來源，保留其目前分支、工作檔案與暫存區；所有任務開發都在 `worktrees/` 進行。來源不在 `dev` 或有未提交變更，不構成開工阻擋。

```
daodao/
├── projects/<repo>/              ← 保留既有狀態，僅作為 worktree 來源
└── worktrees/                    ← gitignored
    └── <issue#>-<slug>/          ← 一個 issue 一個資料夾
        ├── task.md               ← 任務 manifest（唯一入口，接手先讀這個）
        ├── daodao-f2e/           ← worktree @ feat/<slug>
        └── daodao-server/        ← 跨 repo 時同名 branch
```

## AI 檢核與人審核

先讀 [共用交接規則](../../../docs/automation/ai-human-review-workflow.md)。AI 負責查核來源、實作、驗證、自審與修訂；人審閱結果並決定產品取捨。能由程式碼、測試或執行證據查明的問題先自行調查，不交由人猜測。交審附上已檢核事項、已修正問題、未驗證限制及待決策事項。

以下流程在 Claude、Codex 共用；瀏覽器、檔案讀取與提問以當前可用工具執行。Claude hook 是否啟用須實查，Codex 不可假定自動執行：發 PR 前須主動完成同等檢查。Commit、push、Issue comment、文件發布等外部動作沿用既有授權；無授權時先完成本機成果，依專案規則在該動作前確認。

## 判斷階段

依使用者輸入判斷進入哪個階段：

| 輸入 | 階段 |
|---|---|
| issue 編號/URL + （PRD／既有 FRD、Figma/Drive 或分支連結） | **start** |
| 「接手 <task>」或目前已在 worktrees/ 某資料夾內 | **dev** |
| 「驗證」「檢查畫面」或 dev 全部 phase 完成 | **verify** |
| 「發 PR」「開發完成」 | **finish**（前置：verify 必須通過） |
| 「merge 了」「收尾」 | **cleanup** |

---

## Phase 1: start — 建立任務

### 1.1 收集素材

1. `gh issue view <n>` 讀 issue（中央 issue 在 daodaoedu/daodao，鏡像 issue 在 sub-repo）
2. 收集使用者提供的 PRD／既有 FRD（`docs/product/`）、Issue 留言、POC/Figma/Drive 或分支連結；**POC 是 Google Drive 資料夾連結時，下載到本機**（見 [references/poc-download.md](references/poc-download.md)），verify 階段才有東西可以直接開來比對，不用每次現開 Drive
3. **判定涉及哪些 repo** — 依 [references/repo-detection.md](references/repo-detection.md)：逐條需求分類（純 UI / API 行為 / 資料欄位）→ grep 程式碼查證（DTO 驗證、schema 欄位）→ 每個 repo 附依據寫進 task.md；`repo:*` label 只當參考，查證結果為準
4. 決定命名：
   - **任務資料夾**：`<issue#>-<slug>`（例：`150-home-layout`）— 帶編號方便查找
   - **branch**：`feat/<語意化 slug>`（例：`feat/home-layout-sidebar`）— 用 kebab-case 描述「做了什麼」，不放 issue 編號；issue 關聯記在 task.md 與 PR body 的 `Closes #<n>`。fix 用 `fix/`、refactor 用 `refactor/`

### 1.1a 防撞檢查（建 worktree 前必做）

1. **跟 pipeline 防撞**：任務對應中央卡（daodaoedu/daodao）時，手動開工前必須加 **`human-driving`** label（`gh issue edit <n> --repo daodaoedu/daodao --add-label human-driving`）；cleanup 時再移除。
   - 依據：`bin/pipeline/dispatch.ts:91` 的閘門只認 `dispatched` / `needs-spec` / `human-driving`——828b902 起 auto label 閘門已移除，**卡片一到 Ready for Dev 就會被派工**，human-driving 是唯一的人工退場機制
   - 不要跟 `human-coding` 混淆：那是 sub-repo 鏡像 issue 的「機器做不動、移交人類」標記，dispatch.ts 不認它，掛了也擋不住派工
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
- 明確從 `origin/dev` 建立任務分支，不使用來源工作目錄的 `HEAD`；有未合併任務依賴時，依「平行開發約定」指定依賴分支。
- `fetch` 與 `worktree add` 會更新共用 Git metadata，但不改動來源工作檔案、暫存區或目前分支。不得為了開工在 `projects/` 執行 `checkout`、`switch`、`pull`、`reset`、`stash`、`clean`，或安裝依賴、自動修復檔案。
- `fetch` 失敗時先處理錯誤，不得默默改用可能過期的 `origin/dev`。
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
# ⚠️ 必加 --ignore-workspace：monorepo 根的 pnpm-workspace.yaml 會把 worktrees/ 下的 repo 當成
#    workspace 成員而 no-op（「Done in 274ms」、沒有 node_modules）。repo 自己有 pnpm-workspace.yaml
#    的（daodao-f2e）不受影響但加了也無害。裝完用 ls node_modules/.bin 確認真的有東西
cd "$TASK/<repo>" && pnpm install --ignore-workspace
```

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

用 [references/task-template.md](references/task-template.md) 模板寫 `$TASK/task.md`，把 issue、PRD／既有 FRD、POC／分支連結、repos、phases、**驗收契約**全部記進去。**之後任何 session 接手都從這個檔開始。**

start 完成後回報任務資料夾路徑與 task.md 摘要，然後**預設直接進入 Phase 2 開始實作，不要停下來建議使用者開新 session**。只有兩種情況才建議換 session 接手：使用者表明要平行開發（這個 session 要留著做別的 issue）、或本 session context 已經很重。

---

## Phase 2: dev — 開發中

1. **先讀 task.md** — 確認 scope、phases、目前狀態
2. 修改、安裝依賴、測試與 commit 的範圍鎖在自己的任務資料夾。`projects/` 僅允許唯讀查證、讀取環境檔複製至任務目錄，以及本流程所需的 Git metadata 操作；不變更其工作檔案、暫存區或目前分支，也不修改其他任務的 worktree。
3. **每完成一個 phase 的預設動作序列（自動執行，不要問使用者「要 commit 還是先看效果」）**：
   1. **自行輕量驗證並修訂**：UI 變更 → 起 dev server 用瀏覽器實際看過該 phase 的改動（typecheck 過 ≠ 畫面對）；**有可互動 POC 的 UI phase，這一步就要把 POC 同一畫面開在旁邊，對該 phase 的元件跑一遍 [poc-probe-checklist](references/poc-probe-checklist.md) 的基本 probe**（不要等 verify 才第一次量，差異會累積到很難拆）；後端變更 → curl 打一輪；script / workflow / migration / skill 文件 → 依 `pre-commit-check` skill 步驟 3 的「變更類型 × 驗證」對照表。**任何類型的變更都有對應驗證，沒有「這種改動不用驗」這回事**。這是 phase 級的快篩，完整驗收留給 verify 階段
   2. **契約及測試完整性檢查**：依 [benchmark gates](references/benchmark-gates.md) 執行適用 repo 的 schema／API signal 與測試完整性檢查，保留實際結果及限制。
   3. **高風險變更掃描**：跑 `bash .claude/hooks/stop-quality-gate.sh` 看逐檔就緒清單和高風險分類（migration / API / auth / env / CI）。有高風險標記的 phase 在 task.md 備註區補記「⚠ 高風險：<分類>」
   4. 驗證與 AI 自審通過 → `pre-commit-check` → `format-commit` skill；依專案規則及既有授權確認後 commit
   5. 更新 task.md 的 checkbox 與 Status
   6. 直接進下一個 phase
   7. 只有驗證**失敗且修不掉**、或發現 scope 之外的問題時才停下來問使用者
4. **連續執行原則**：phase 邊界是繼續點，不是回報暫停點。**禁止**在 phase 完成後用「下一步：…要繼續嗎？」「要推的話說一聲」等句式收尾等指示——commit 完就開始下一個 phase。合法的停下來只有四種：
   - 全部 phase 完成 → 進 verify
   - 碰到 task.md 記載的待決事項**且該 phase 無法繞過它先行**（能先做別的就先做）
   - 驗證失敗 2 次修不掉
   - 使用者主動喊停
   進度回報用一行 status 夾在過程中說，不要當成回合終點
5. 在 push 已授權並完成專案 review 流程時定期 push：`git push -u origin feat/<slug>`——task.md 是本機檔案（gitignored），push 過的 branch 才是災難時唯一留得住的；跨多天的大任務每完成一個 phase 在已授權的 issue comment 記一行進度，讓狀態不只活在這台機器
6. 跨 repo 依賴順序：`storage (migration) → server (API) → ai-backend → f2e`
7. 需要跑 dev server 時，檢查 task.md 的 Port offset，避免與其他任務相撞

## Phase 3: verify — 瀏覽器驗證（總驗收）

有 UI 變更（f2e / admin-ui）的任務**必須**通過此階段才能發 PR；純後端任務改跑 API 驗證（curl / 整合測試）後跳到 finish。詳細操作見 [references/browser-verify.md](references/browser-verify.md)。

與 dev 階段 phase 級快篩的分工：快篩只看「這個 phase 的改動有沒有壞」；verify 是**對完整驗收清單（PRD／既有 FRD 的 Test Points）的總驗收**，含跨 phase 整合、回歸、無障礙與窄螢幕——快篩過了不能跳過 verify。

1. **起 dev server** — 在任務資料夾的 worktree 內起，套用 task.md 的 Port offset
2. **逐 phase 驗收** — 從 task.md 的 phases + 已確認的驗收契約展開檢查清單，用瀏覽器實際走過每一條：
   - 使用當前客戶端可用且已讀取操作指引的瀏覽器工具；Claude 可用 `claude-in-chrome`，Codex 使用已掛載的瀏覽器入口。無可用工具時記錄未驗證，不以靜態檢查替代瀏覽器通過。公開網頁研究仍依專案 Groundlane 規則，不使用禁止的抓取工具
   - 對照 task.md 連結的 POC / Figma 設計稿比對版面
   - **POC 並排比對**（`$TASK/poc/` 有可互動的 HTML 原型時必做——`.dc.html`，或 `index.html + support.js` 這種從 prototype 分支抽出的 Claude Design 原型都算；只有 Figma 或純截圖才跳過）：起 POC 靜態 server、並排截圖、**用 getComputedStyle 量測產出差異表**，見 [references/poc-compare.md](references/poc-compare.md)。行為驗收（Test Points）通過 ≠ 視覺對齊，兩者都要做完才能進 finish。三條硬規則：
     1. probe 表必須涵蓋 [poc-probe-checklist](references/poc-probe-checklist.md) 的全部類別（遮罩、按鈕各變體、modal 高度／捲動、input、表格、膠囊…），不能只挑「骨架」量
     2. 量完**逐組並排截圖用眼睛看一遍**（用可用的圖片檢視工具），把肉眼可見但 probe 沒抓到的差異補進差異表——#189 的遮罩深淺、ghost vs 外框鈕、modal 內捲，都是 probe 表漏掉、截圖一眼就看得出的
     3. 差異表裡沒有「設計系統」這個免死金牌：每一條 ❌ 不是修掉，就是列進「### POC 差異決策」附上差異證據、建議與影響交使用者審核；用當前可用提問工具或直接提問；使用者確認後在 task.md 寫一行 `POC 差異決策已確認`（發 PR 閘門會檢查）。「用 @daodao/ui 元件」與「尺寸／顏色對齊原型」不衝突——元件照用，數值用 className 對齊
3. **留證據** — 每個檢查點截圖存到 `$TASK/evidence/`，命名 `<phase>-<checkpoint>.png`
4. **記錄結果** — task.md 新增「驗證」區塊：檢查清單 + 通過/失敗 + 截圖檔名
5. **失敗處理** — 修復後重驗該項（沿用 pipeline 慣例：同一項失敗 2 次，停止重複相同嘗試；整理已查核原因、證據與阻塞，能繼續查明的技術問題由 AI 調查，不要交人猜根因或無限重試）
6. **產出 Google 文件驗證報告**（必做）— 把「驗證」區塊 + evidence/ 截圖整理成一份 Google 文件（截圖嵌圖，不是留在本機資料夾），連結記進 task.md 最上方；操作細節與一次性 rclone 設定見 [references/verify-report.md](references/verify-report.md)
7. 全部通過 → task.md Status → `verified`，進入 finish

## Phase 4: finish — 發 PR

前置：verify 已通過（task.md Status = `verified`）。發 PR 前核對驗收狀態、POC 報告與已確認差異。若環境另有註冊 `.claude/hooks/pre-pr-gate.sh`，確認其實際觸發與涵蓋範圍；未安裝或 Codex 不支援該 hook 時由 agent 主動執行同等檢查，不宣稱機器已攔截。對每個有變更的 repo（在任務資料夾內的 worktree 執行）：

1. 確認全部 commit：`git status`
2. 同步 dev：`git fetch origin dev && git rebase origin/dev`（衝突時列出檔案協助解決）
3. 品質檢查：`pnpm run typecheck && pnpm run lint && pnpm test`
4. **Clean-context spec audit** — 先讀 [spec audit 輸入規則](references/spec-audit.md)，用 `scripts/build-spec-audit.py` 產生固定版本的 audit pack，包含 diff、task.md 驗收契約、已確認 decisions.md／既有 design.md，以及適用 REVIEW.md。不得只傳 diff＋AC 而省略產品決策和實作約束。spawn 全新、不帶開發對話的獨立 subagent；依 pack 逐原 FR／TP／AC／決策與約束標 PASS / FAIL / UNCERTAIN 並附證據。FAIL 先修復，UNCERTAIN 由 AI 補查；必要執行證據不足不得標 PASS。需求／決策或 head 改變後重建 pack，重驗受影響項目。獨立 agent 不可用標未驗證，不以自審冒稱完成。

5. Push 前跑 `code-review` skill
6. Push（rebase 過需 force push 時先問使用者）
6. 開 PR：

```bash
gh pr create --base dev \
  --title "<type>(<scope>): <繁中描述>" \
  --body "..."   # Summary + Related（Issue／需求基準／既有開發規劃連結）+ Test plan
```

- **base 永遠是 `dev`**（main 只收 dev/hotfix/release）
- PR body 引用 issue（`Closes #<n>` 或鏡像 issue 連結）
- 跨 repo 時在各 PR body 互相引用並標注 merge 順序：

```
## 🔗 跨 Repo PR 關聯
請依序 merge：
1. daodao-storage — [daodao-storage#<n>](<url>) （migration，先 merge）
2. daodao-server — [daodao-server#<n>](<url>)
3. daodao-ai-backend — [daodao-ai-backend#<n>](<url>)
4. daodao-f2e — [daodao-f2e#<n>](<url>)
```

**連結一律用 Markdown 語法 `[文字](url)`，不要裸貼 URL**：GitHub autolink 不把全形標點（（、，。）當網址結尾，`…/pull/231（先 merge）` 會把「（先」吃進連結變 404。發出前掃一次：`grep -nE 'https?://[^ )]*[（）、，；：]'`。

7. 更新 task.md：Status → `in-review`，記下 PR 連結
8. **回寫 issue 狀態**（必做，不能只開 PR 不回報）：

```bash
gh issue comment <n> --repo daodaoedu/<repo> --body "$(cat <<'EOF'
## ✅ 驗收完成，已發 PR
- PR: [<repo>#<n>](<url>)（跨 repo 時全部列出 + merge 順序；連結用 Markdown 語法，勿裸貼 URL 接全形標點）
- 驗證報告（Google 文件，含截圖）: [Task <n> 驗證報告](<verify 階段產出的 doc url>)
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
git fetch origin dev   # 僅更新 origin/dev，不移動 projects/ 的本機分支
```

3. 刪任務資料夾：`rm -rf "$TASK"`（task.md 若有留存價值，先摘要進 issue comment）
4. 開工時加過 `human-driving` label 的：移除它
5. 接 `post-merge-wrapup` skill（歸檔 openspec change、更新 docs/product）
6. clone 模式的任務：確認無未 push commit 後 `rm -rf`
7. **順手掃殘留**：`ls worktrees/` 列出其他任務資料夾，PR 已 merge 的提醒使用者一併收尾，避免堆積

## 平行開發約定

- **執行載體選擇**（session vs subagent）：
  - M/L 任務（有中途決策點：驗證失敗判斷、force push、migration 過目）→ 獨立 Claude／Codex session，開場：「/dev-task 接手 worktrees/<n>-<slug>」或給 issue 編號
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
3. `projects/` 不在 `dev` 或有未提交變更時，保留原狀並從明確的 `origin/dev` 建立隔離 worktree，無需為此詢問。只有需要變更來源工作目錄、暫存區或目前分支，或發現同一任務已存在、開發範圍高度重疊時，才停下來確認。
4. worktree add 失敗說 branch 已存在 → 該 issue 可能已在進行，`git worktree list` 查證
