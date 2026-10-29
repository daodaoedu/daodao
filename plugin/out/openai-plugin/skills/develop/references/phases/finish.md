# Phase 4: finish — 發 PR

`gh pr create` 被 GraphQL 限流時，改走 REST 並手動跑發 PR 閘門，見 [gotchas.md](../gotchas.md)「發 PR」。

前置：verify 已通過（task.md Status = `verified`）。發 PR 前核對驗收狀態、POC 報告、核心旅程矩陣與已確認差異。若環境另有註冊 `plugin/hooks/pre-pr-gate.sh`，確認其實際觸發與涵蓋範圍（閘門清單：Status 已 verified、POC 比對、核心旅程矩陣無 ⬜／❌ 且含錯誤路徑、Deferred items 全部有子 issue、PR body 有「## 驗證證據」、前端手寫驗證規則能編譯且對得到 server 規則、「## 驗證」無未勾項目／「需要手動驗證」清單、UI repo 有全 ✅ 的「### 版面探針」表）；未安裝或 Codex 不支援該 hook 時由 agent 主動執行同等檢查，不宣稱機器已攔截。hook 本身需要 `jq`（缺了會 fail closed 擋下 `gh pr create` 並提示安裝）、`python3` 與 `node`（parity 檢查，缺了只 warn）。

0. **Deferred items 先開卡再發 PR**：把 task.md「## Deferred items」與驗證中發現的範圍外問題整理成清單，依 `break-down-plan` skill 在既有授權範圍內開卡，每一項後面補 `#<n>`。先分兩類：**本卡範圍內沒做完的** → 開成子 issue：本任務是子卡時掛到**它的母卡**（只有兩層，不可掛在子卡底下），body 寫對應的 AC；本任務是獨立卡時掛在本任務底下。母卡要等它關閉才交 PM 驗收；**範圍外的後續改進／技術債** → 開成獨立 issue，body 寫「#<n> 的後續改進」，**不掛子卡關係**，否則母卡永遠關不掉（#214 → daodao-f2e#1032／#1033）；沒有開卡授權的項目寫 `（待開卡：<原因>）`，並在 issue comment 的 Known incomplete scope 原樣列出，讓人決定。**task.md 會在 cleanup 被刪，只留在 comment 裡的「之後再做」等於消失**——#171 的「驗證紅框取代 toast」就是這樣變成 #188 的第二個根因

對每個有變更的 repo（在任務資料夾內的 worktree 執行）：

1. 確認全部 commit：`git status`
2. 同步 dev：`git fetch origin dev && git rebase origin/dev`（衝突時列出檔案協助解決）。rebase 前後各算一次 patch-id，判斷 verify 的證據還算不算數：
   ```bash
   git diff "$(git merge-base origin/dev HEAD)" HEAD | git patch-id --stable | cut -d' ' -f1
   ```
   verify 通過時的值記在 task.md「## 驗證」。值相同表示 patch 沒變，核心旅程矩陣與驗證報告沿用，只更新 PR body 的 head SHA；值不同就列出改到的檔案，只重跑碰到那些檔案的旅程列和版面探針，其他列保留
3. 品質檢查：`pnpm run typecheck && pnpm run lint && pnpm test`
4. **Clean-context spec audit** — 先讀 [spec audit 輸入規則](../spec-audit.md)，用 `scripts/build-spec-audit.py` 產生固定版本的 audit pack，包含 diff、task.md 驗收契約、已確認 decisions.md／既有 design.md，以及適用 REVIEW.md。不得只傳 diff＋AC 而省略產品決策和實作約束。spawn 全新、不帶開發對話的獨立 subagent；依 pack 逐原 FR／TP／AC／決策與約束標 PASS / FAIL / UNCERTAIN 並附證據。FAIL 先修復，UNCERTAIN 由 AI 補查；必要執行證據不足不得標 PASS。需求／決策或 head 改變後重建 pack，重驗受影響項目。獨立 agent 不可用標未驗證，不以自審冒稱完成。

5. 交付紀錄目前為試行，`DEV_TASK_DELIVERY_GATE_MODE` 預設 `off`，不得讓未完成的收集器阻擋其他 session。需試行時先定位 gate 的**絕對路徑**：Claude plugin 安裝目錄的 `hooks/check-agent-delivery.py` 或 daodao root 的 `plugin/hooks/check-agent-delivery.py`；確認檔案存在後存為 `DELIVERY_CHECKER`，不得從 task repo 用相對 `plugin/hooks/...` 執行。在 `$TASK/agent-handoff.<repo>.json` 保存此 repo 的紀錄（放 repo 外），使用最後 commit HEAD、與 PR 實際 base branch 的 merge-base；填 owned_paths、writes、claims、questions、recurrences。writes 是最終 Git diff 的檔案清單，可以从 Git 產生，**不代表完整寫入操作**。verified claim 的 evidence 需檔案 ref／sha256。執行 `python3 "$DELIVERY_CHECKER" --repo "$PWD" --artifact "$TASK/agent-handoff.<repo>.json" --base <merge-base-sha>`。沒有完整 trace 時必須填 `trace_status: unavailable`（或 partial）與 `trace_reason`，只能回報 manifest 核對通過、操作 trace 未驗證。客戶端 trace 有 Bash／未知工具時不能照 diff 補造，也不強迫重寫舊檔來湊紀錄。`import-agent-trace.py` 可匯入 Claude Write／Edit targets，Bash／未知工具會標 partial；必須先跑真實任務、確認包含 Bash 的操作能被完整觀測，再決定是否啟用 `--require-trace`。現有任務不可回溯製造 trace。新 macOS／Linux 任務可在派工前用 `record-agent-writes.py --repo <task-repo> --output <task>/trace.json --stop-file <task>/trace.stop` 啟動獨立原生 observer（macOS FSEvents／Linux inotify）（macOS 使用 repo 外 venv，安裝 `scripts/agent-trace/requirements.txt` 的 watchdog 6.0.0；Linux 不需額外 Python 套件），確認 ready sidecar 才派工；完成測試和 commit 後建立 stop-file，等 recorder 結束，再核對完整 trace。它不要求禁止 Bash；unsupported 平台、事件掉失或收集開始過晚都不得假稱完整。試行模式 `warn` 只留診斷，`block` 核對 manifest，`DEV_TASK_REQUIRE_TRACE=1` 才強制完整 trace；啟用 block 仍需明確決策與客戶端實測。
6. Push 前跑 `review-change` skill
7. Push（rebase 過需 force push 時先問使用者）
8. 開 PR。PR 本文要寫**安全前提**（參考 pstack blast-radius）：這個變更之所以不會弄壞別的地方，通常只靠 1～2 件事，例如「這個 hook 只有 settings 頁用」「舊欄位已經沒有任何呼叫端」。逐一寫出來，並標明證據做到哪一級：

   | 級 | 證據 | 例子 |
   |---|---|---|
   | 1 | 只是這樣說 | 「應該沒人用」——單獨不算數 |
   | 2 | 指出程式位置 | `path:line`，或函式庫原始碼 |
   | 3 | 推演過壞情況走不到 | 一步步走過失敗路徑，說明在哪一步就停了 |
   | 4 | 跑過真程式 | 腳本或測試直接呼叫真的函式，前提不成立就會失敗 |
   | 5 | 在執行中的 app 重現 | 瀏覽器或 dev 環境實際操作 |

   便宜的就往下做；停在哪一級照實寫，做不到就寫「未證明」。改到 REVIEW.md 高風險類別（auth、權限、個資、migration／schema、金流、資料刪除、併發）時，安全前提至少要到第 4 級；做不到要寫明原因，交 review 時列為待查證。搜尋呼叫端只是起點，要看的是 grep 找不到的地方：函式庫實際行為與版本、執行時機（卸載、非同步）、API 回傳的 JSON 與設定檔裡的字串引用。

```bash
cat > "$TASK/notes/pr-body-<repo>.md" <<'EOF'
## Why is this necessary?
- Refs daodaoedu/daodao#<n>
- <對應 issue 的問題與需求背景、需求基準、既有開發規劃連結放這裡>

## How does it address?
- <實作要點，含跨 repo merge 順序>

## 安全前提
- <這個變更不會弄壞別處，是因為 ___>（第 <1–5> 級：<證據，例如 path:line、測試名稱、指令輸出>）
- 已排除：<檢查過但不成立的風險與理由；沒有就寫 none>

## 驗證證據
- 驗證報告: [Task <n> 驗證報告](<Google 文件 url>)
- 環境: <本機 dev server 連 server-dev ／ 本機 docker>，HEAD <sha>

| ID | 旅程 | 類型 | 輸入 | 預期結果 | 實際 |
|---|---|---|---|---|---|
| J-01 | ... | 正常 | ... | 201 | ✅ 201 |
| J-02 | ... | 錯誤路徑 | ... | 400 訊息顯示、輸入保留 | ✅ 400 |

## Test plan
- [x] ...
EOF
gh pr create --base dev \
  --title "<type>(<scope>): <繁中描述>" \
  --body-file "$TASK/notes/pr-body-<repo>.md"
```

- **base 是 `dev`**（main 只收 dev/hotfix/release）；daodao-worker、daodao-infra 沒有 `dev`，base 用 `main`，步驟 2 的 rebase 也改對 `origin/main`
- PR body 用獨立一行 `Refs daodaoedu/daodao#<n>` 引用中央 issue（root 與 sub-repo 都寫完整 `owner/repo#n`，`board.ts audit` 靠這行認定實作 PR）。**不要寫 `Closes`／`Fixes`／`Resolves`（含過去式、加冒號、接 issue URL）**：PR merge 時 GitHub 會自動關中央 issue，board 內建 `Item closed → Done` 把卡移到 Done，跳過 dev 冒煙與 PM 驗收（#333、#335、#337 就這樣被關）。中央卡只由 PM 驗收通過（或 `acceptance:engineering` 卡由 verify-deploy 冒煙通過）後關閉。CI 的 `pr-evidence-gate` 會偵測這類寫法並報錯
- **PR body 必須有「## 驗證證據」區塊**：驗證報告連結 + 核心旅程矩陣（證據欄可省）。沒有寫入路徑的任務把 task.md 那行 `核心旅程不適用：<原因>` 原樣放進來。CI 的 `pr-evidence-gate` 會讀這段（模式看 repo variable `PR_EVIDENCE_GATE_MODE`：daodao-f2e、daodao-server 為 `block` 且是 dev 的 required check，其餘 repo 未設定＝warn）；本機 `pre-pr-gate.sh` 也會擋。body 一律用 `--body-file`，不要 `--body "..."`（會產生字面 `\n`）
- body 沿用 Why／How 格式：`auto-pr-description` workflow 在 PR 開啟時會用 Workers AI 重寫沒有這兩段的 body；它看到「## 驗證證據」會跳過，但 Why／How 仍是全 repo 的 PR 格式
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

9. 更新 task.md：Status → `in-review`，記下 PR 連結
10. **回寫 issue 狀態**（必做，不能只開 PR 不回報）。finish 可能因為限流或閘門被擋而重跑，留言要先找再寫，不能每跑一次就多一則：留言第一行放 marker `<!-- daodao-delivery:pr-opened-<repo>#<pr> -->`，先用 `gh api repos/daodaoedu/<repo>/issues/<n>/comments --paginate` 找有這個 marker 的留言；找到就 `gh api -X PATCH repos/daodaoedu/<repo>/issues/comments/<id> -F body=@<body.md>` 更新那一則，找不到才新增，寫完讀回確認。留言內容：

```bash
gh issue comment <n> --repo daodaoedu/<repo> --body "$(cat <<'EOF'
<!-- daodao-delivery:pr-opened-<repo>#<pr> -->
## ✅ 驗收完成，已發 PR
- PR: [<repo>#<n>](<url>)（跨 repo 時全部列出 + merge 順序；連結用 Markdown 語法，勿裸貼 URL 接全形標點）
- 驗證報告（Google 文件，含截圖）: [Task <n> 驗證報告](<verify 階段產出的 doc url>)
- 瀏覽器驗證：<通過項目摘要，對應 task.md 驗證區塊；引用核心旅程 J-ID，例：J-01 建立場次 201、J-02 大寫 slug 被擋、J-03 重複 slug 409 訊息可見>
- 尚未在 dev 環境冒煙：merge 部署後由 verify-deploy 重跑核心旅程，通過前不視為可用
- Known incomplete scope: <每項附子 issue 連結 [#<n>](<url>)；未授權開卡的寫（待開卡：<原因>）；沒有就寫 none>
EOF
)"
```

   - 鏡像 issue（sub-repo）：comment 開在鏡像 issue 上
   - 中央 issue（daodaoedu/daodao）：comment 之後把 board 卡移到 `Review`（PR 開了、等 review／merge／驗收）：

     ```bash
     pnpm -s tsx bin/pipeline/board.ts set <n> review
     ```

     merged 之後卡**留在 Review**，要等 verify-deploy 的 dev 冒煙通過才移 `Acceptance` 交給 PM 驗收，PM 關 issue 才算 `Done`；sub-repo PR 用 `Refs` 不會觸發 GitHub 內建 workflow，Routine C 已退役，所以這一步不做就沒有人會移卡
11. 之後用 `collect-pr-feedback` skill 收集回饋修正

---

**完成條件**：每個 repo 的 PR 都已開、`task.md` Status 是 `in-review`、issue comment 已回寫、中央卡已移到 `Review`。

PR merge 後讀 [cleanup.md](cleanup.md) 收尾。
