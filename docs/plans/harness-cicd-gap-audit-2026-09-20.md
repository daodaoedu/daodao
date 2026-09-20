# Harness／CI-CD 差距盤點（對照 MaiAgent 工具鏈）

> 日期：2026-09-20。參照 `~/Downloads/work-review 2/maiagent-cicd-architecture.md` 與 `dev-harness-mai-cli-architecture.md`，
> 對照 daodao 根目錄與七個 sub-repo 的 `.claude/hooks`、`.github/workflows`、live rulesets／environments、gate ledger。
> 本文是盤點與建議，不代表任何項目已完成。

## 已對齊的部分（不需再做）

| MaiAgent 模式 | daodao 現況 |
|---|---|
| Profile JSON + PreToolUse／Stop hook + ADR + Gate Ledger | `.claude/hooks/*`、`profiles/{frontend,backend,high-risk}.json`、ADR-0001、`~/.cache/daodao-harness/gate-ledger.jsonl` |
| Clean-context review／spec audit | dev-task Phase 4 `build-spec-audit.py` + 獨立 subagent；`code-review` skill 多引擎 |
| Known false positives | `.github/review-knowledge/false-positives.jsonl`（58 筆）本機＋CI 共用 |
| Concurrency 控制 | 七個 repo 的 CI／CD／code-review 都有 |
| Branch base check、schema drift、migration regression | 各 sub-repo 已有 |
| 部署 health check + verify job | server／f2e CD 有 |
| CI 時長 | server 3–4 分、f2e 3 分、ai-backend 1 分 → 不需要分片、不需要 DB dump cache |

## 差距與建議（依優先序）

### P0 — 閘門存在但不 required／可被繞過（Gates > Guidelines 尚未落地）

**1. Merge 治理只有 required checks，沒有 PR 規則**（design-review F-01 自 09-12 仍未關）
- live ruleset：`daodao`、`daodao-server`、`daodao-f2e`、`daodao-worker`、`daodao-infra` 只有 `required_status_checks`，沒有 `pull_request`／`non_fast_forward`／`deletion`；server／f2e 的 `main`（= production 部署分支）完全沒有 ruleset。
- Actions default permission 仍是 `write` + `can_approve_pull_request_reviews=true`（root／server／f2e 抽查）。
- 「不可直接 push dev，一律走 PR」目前只存在 memory／AGENTS.md，是 guideline 不是 gate。
- 建議：五個 repo 補 `pull_request`（approvals 可先 0）+ `non_fast_forward` + `deletion`；server／f2e 加 `main` ruleset；default permission 改 `read`，各 workflow 顯式 `permissions:`。ai-backend／storage／admin-ui 已有範本可直接複製。

**2. Production 部署沒有人工閘門，且會被新 push 取消**
- server／f2e／ai-backend／admin-ui 的 `production` environment：required reviewers = 0、wait timer = 0、無 deployment branch policy。
- server CD `concurrency.cancel-in-progress: true` 套用到 main／production；MaiAgent 的原則是 prod 永不取消（`cancel-in-progress: false`，獨立 group）。
- `force_deploy` input 可跳過 CI 直接部署；`StrictHostKeyChecking=no`（F-07 未關）。
- 建議：production environment 加 required reviewer；prod 用獨立 concurrency group 且不取消；`force_deploy` 至少要求填 reason 並留 comment／Slack 通知。

**3. AI code review：fail-open、非 required、接受率 0–2%**（F-06、F-09 未關）
- `code-review.yml` 在 secrets 缺、雙模型失敗、schema 不合時 `exit 0` 只留「Review 未完成」留言；只監聽 `opened, synchronize`，draft→ready 不會觸發。
- `docs/automation/evals.md` 最後三週接受率 0%／0%／2%，44 個 finding 38 個 silent；量測本身（review-evals）已於 #241 退役 → 現在連「它是不是噪音」都量不到。
- MaiAgent 的做法：verdict 分 BLOCKING／SUGGESTION，只有 BLOCKING 讓 check 紅；review 沒產出 = 紅。但在接受率 2% 時先 fail-closed 只會逼人關掉它。
- 建議順序：(a) 加 `ready_for_review` trigger（一行）；(b) 先把 finding 分級 + 用 review-knowledge 的 record 率當替代指標，每月統計一次；(c) 接受率 ≥ 30% 後才升 fail-closed + required。

**4. `pr-evidence-gate` 仍是 warn、不在任何 ruleset**
- ADR-0001 自己寫「閘門存在但不 required 等於沒有」；本機 `pre-pr-gate` 一週擋了 13 次（poc-compare 4、deferred-unlinked 4、status-not-verified 1…），證明有需求。
- 建議：dev-task PR 主要落在 f2e／server／admin-ui，這三個先設 `PR_EVIDENCE_GATE_MODE=block` 並加進「Benchmark required checks」。

### P1 — Hook 覆蓋率與版本漂移

**5. Hook 幾乎沒在 worktree session 裡跑**
- gate ledger 從 09-12 到 09-19 只有 18 筆、集中在 2 天；同期 dev-task 開了十幾個任務。
- `worktrees/<n>-<slug>/` 根目錄沒有 `.claude/`（抽查 233-settings-overflow）；如果 session 從 worktree 根啟動，Layer 2／3 hook 全部不生效；從 `worktrees/<n>/daodao-f2e` 啟動則吃到 sub-repo 那份（見下條，已漂移）。
- Codex session 完全沒有 hook → 只剩 CI 側閘門（回到第 4 點：CI gate 必須 block 才有意義）。
- 建議：dev-task `start` 在 worktree 根 symlink／複製根目錄 `.claude`（settings + hooks + skills）；session-start 印出「hooks 來源路徑」讓人一眼看到有沒有吃到。

**6. 共用 hook／workflow 跨 repo 漂移，沒有 CI 強制版本一致**
- `pre-pr-gate.sh` 在 f2e／server／ai-backend／storage／infra 五個 repo 與 root 不同；worker 缺全部 hooks 與 `pr-evidence-gate.yml`／`branch-base-check.yml`；admin-ui 缺 `pre-pr-gate.sh`、`frontend.json` 漂移；ai-backend／storage／infra／worker／admin-ui 的 `code-review.yml` 與 root 不同（部分是 sync PR 待 merge，但沒人知道哪些）。
- MaiAgent：五個檔案版號必須相同，CI 強制；Layer 0 每次 prompt 背景比對版本。
- 建議：root 加 `.claude/HARNESS_VERSION` + `harness-manifest.json`（檔案 sha256），sub-repo 的 `shared-config-regression` 或 CI 加一個 job 比對，不一致 warn（兩週後 block）；session-start 也印 root 與當前 repo 的版本差。

### P2 — CI 效率與安全掃描（MaiAgent Tier 2／3 的便宜項目）

**7. f2e `linode-ci.yml` 對 `feat/**` push 與 pull_request 各跑一次** → 每次 push 兩份 3 分鐘 runner。concurrency group 用 `head_ref || ref`，push 與 PR 落在不同 group 所以不會互相取消。改成 push 只跑 main／dev／prod。

**8. 安全掃描只有 f2e 有，且不在 repo workflow 裡**（修正前次說法）：f2e 已啟用 CodeQL default setup（actions／js-ts／python）＋ SonarCloud ＋ GitGuardian，都是 GitHub App／預設設定，所以 grep `.github/workflows` 看不到。其餘七個 repo 的 code scanning 需先開 Code Security（API 回 403）。依賴面仍是全空：沒有任何 repo 有 `dependabot.yml`、`pnpm audit`／`pip-audit`、image trivy。最小做法：先把 f2e 的 CodeQL default setup 複製到 server／ai-backend／storage／admin-ui／worker，再每個 repo 加 `dependabot.yml`（weekly、grouped），只報告不阻擋。

**9. 沒有任何 coverage 門檻**：AGENTS.md 規定新功能必附測試，但沒有機器量。建議先做 diff coverage（只看 PR 新增行，門檻 70%），不做總 floor（缺基線會一上線就紅）。

**10. `storage/schema-sync-check.yml` 用 `pull_request: paths`** — 目前不是 required 所以無害，但若日後加進 ruleset 會永遠 pending。改為 always-trigger + job 內 skip（MaiAgent 模式 1）。

### P3 — 回饋迴路：砍掉 metric 驅動的那條，只留「事故 → block」

**11. metric 驅動的迴路在 daodao 從未產生過規則，不再投資**
- 證據：review 接受率 0–2%、ledger 一週 18 筆、`review-evals` 已退役、`analyze-ledger.sh` 從未排程。
- 真正長出規則的是「事故 → post-mortem → ADR-0001 加 block」（#189、#171→#188、#166→#233），零基礎設施。
- 連帶修 ADR-0001：「新規則先 warn 兩週、看 ledger 決定升級」也是同一條沒人讀數據的迴路。改為：**事故出身的規則直接 block**，`DEV_TASK_SKIP_GATE="<原因>"` 留痕即是誤報安全閥；warn 只留給「不確定是不是問題」的風格類規則。
- 不做：escape label、月報、worker-feedback-collector 對應物、review 接受率恢復。

**12. worktrees／projects 衛生**（維持原建議，但降為順手做）

- `worktrees/` 有 48 個任務目錄 + ~30 個 `benchmark-*.json/md/py/txt` 散檔；session-start 每次列 48 條但沒有「哪些 PR 已 merge 可清」的判斷（MaiAgent Layer 1 會算 stale worktree）。
- `projects/` f2e／storage／worker dirty、infra 停在 main，每次 session-start 警告但沒人修。
- 建議：benchmark 散檔搬到 `docs/archive/benchmarks/`；session-start 用本機 cache 的 PR 狀態（避免 gh rate limit）標記「已 merge」的 worktree；加一個 `pnpm harness:heal`（ff-only pull projects、prune 已 merge worktree），對應 `mai heal`。

### P4 — 三種狀態拆開（review verdict／technical attestation／delivery gate）

**13. PR 證據沒有綁 head SHA**
- `pr-evidence-gate` 只驗 PR body 有「## 驗證證據」段落，不驗證據對應哪個 head；push 新 commit 後舊報告連結仍然通過。
- MaiAgent 的 `mai-technical-review` fenced JSON 記 head／base／checks[]，technical-check 核對同一 head。
- 建議：dev-task finish 在 PR body 寫一段 fenced JSON（`head`、`evidence_url`、`journey_matrix: pass`、`layout_probe: pass`）；gate 比對 `head == pull_request.head.sha`，不符標 `stale`（warn），re-verify 後再更新。post-merge-wrapup 讀同一段判斷「可 Done」還是「Need Fix」。

## 建議的執行順序（原則：只有 CI + ruleset 是每次、每個 agent、每台機器都會經過的層）

「每次都阻擋」目前有三個洞：本機 hook 不是每次都跑（worktree 根無 `.claude/`、Codex 零 hook）、CI 閘門是 warn／fail-open、ruleset 不要求 PR。本機 hook 的價值是早一步提醒省一輪 CI，**不是閘門**；閘門只能放在 CI 與 ruleset。

| 序 | 項目 | 為什麼 |
|---|---|---|
| 1 | #1 ruleset 補 `pull_request` + `non_fast_forward`、server／f2e `main` 加 ruleset、Actions permission 改 read | 堵最底下的洞：直接 push 繞過全部 |
| 2 | #4 `pr-evidence-gate` 升 block 並加進 required checks（f2e／server／admin-ui）；本機 `pre-pr-gate` 九條規則逐條確認 CI 有對應 | Codex 發的 PR 沒有本機 hook，CI 不擋等於沒擋 |
| 3 | #13 evidence 綁 head SHA | 否則「每次阻擋」擋的是舊 head 的證據 |
| 4 | #2 prod environment reviewer、prod concurrency 不取消 | 部署層的同一件事 |
| 5 | #3(a) ready_for_review、#7 雙跑、#10 paths、#8 dependabot、#9 diff coverage | 設定類，順手 |
| 6 | #5 worktree hooks、#6 版本 manifest | 降為 P2：提醒層，不是閘門 |
| — | #11 metric 迴路 | 不做 |

## 不建議照搬的 MaiAgent 項目

- pytest 16 分片、DB dump cache：CI 已 < 5 分鐘。
- EC2 per-task worker、Label Bus autofix：Routine A／B 剛退役，先把本機閘門和 CI gate 做實。
- Brand guard、多租戶 CloudFront、on-prem tag pipeline：沒有對應場景。

---

## 執行紀錄

### 2026-09-20：步驟 1（ruleset）已套用

八個 repo 的 live ruleset 現況（快照在 `docs/plans/ruleset-snapshots/<repo>-before-2026-09-20.json`，回滾＝刪除新建的 `Protect branches` ruleset）：

| repo | 新增 | 涵蓋分支 |
|---|---|---|
| daodao | `Protect branches`：deletion、non_fast_forward、pull_request(approvals=0) | main |
| daodao-server | 同上 | dev、main、production |
| daodao-worker | 同上 | main、dev |
| daodao-infra | 同上 | main |
| daodao-f2e | `Protect branches`：deletion、non_fast_forward（**沒有 pull_request**） | dev、prod |
| ai-backend／storage／admin-ui | 未動（已有 pull_request approvals=1） | dev、main |

修正前次盤點的錯誤：**daodao-f2e 沒有 `main` 分支**，production 分支是 `prod`；default branch 是 `dev`。

f2e 缺 pull_request 規則的原因：`generate-mobile-tokens.yml`（push dev／feat）、`sync-openapi.yml`（每日 cron）、`update-i18n.yml` 三支會 `git push` 直推 dev。GitHub 不接受把 GitHub Actions 加成 ruleset bypass actor（422：must be part of the ruleset source or owner organization），所以只能二選一：破壞這三支，或先不加 pull_request。選後者。
**後續**：把這三支改成開 PR（`peter-evans/create-pull-request` 或 `gh pr create`），再補 f2e 的 pull_request 規則。這是唯一還能直推主幹的洞。

另外發現：所有既有 ruleset（含各 repo 的 `Benchmark required checks`）都帶 `bypass_actors=[RepositoryRole 5]`，即 **repo admin 永遠可繞過 required checks**；新建的 `Protect branches` 沒有 bypass actor。要讓 required checks 對 admin 也生效，得移除那個 bypass。

未做（原計畫步驟 1 的一部分）：Actions default workflow permission 仍是 `write`。19 支 workflow 沒有顯式 `permissions:`（含 server CD、f2e CI、各 repo CI／CD），直接改 read 會一次打斷部署與測試。正確順序是先逐支補 `permissions:`，再改 org／repo 預設。

### 2026-09-20：步驟 2（evidence gate 升 block）已套用

- `PR_EVIDENCE_GATE_MODE=block`：daodao-f2e、daodao-server（repo variable）。
- `Benchmark required checks` ruleset 加入 context `PR evidence（驗證報告 + 核心旅程）`（app 15368）；`gh api repos/.../rules/branches/dev` 已確認生效。
- 未做：admin-ui、worker 還沒有 `pr-evidence-gate.yml`（sync-claude-config 未涵蓋），要先同步檔案才能設。ai-backend／storage／infra 有檔案但與 root 版本漂移，先不動。

升級前的衝擊實測（用 `check-pr-evidence.sh` MODE=block 跑最近 15 張 PR 的 body）：

| repo | 豁免（chore/test 前綴） | 通過 | 會被擋 |
|---|---:|---:|---:|
| daodao-f2e | 9 | 2 | 4（#1008 open、#1005／#1003／#1000 已 merged） |
| daodao-server | 9 | 3 | 3（#481／#480／#477 已 merged） |

被擋的全是「沒寫驗證證據就 merge」的功能 PR，正是這道閘門要抓的。**注意：f2e #1008 目前 open，下一次 push／edit 後這道 check 會變紅，要補「## 驗證證據」才能 merge**（或加 label `evidence-exempt`）。

### 待決策（已於同日執行，見下方「(a)(b)(c) 執行結果」）

~~移除既有 ruleset 的 `RepositoryRole 5`（admin）bypass。~~ → 已執行，九個 repo 的 `bypass_actors` 皆為 0。

### 2026-09-20：(a)(b)(c) 執行結果

**(a) 自動 commit 改走 PR** — daodao-f2e PR [#1017](https://github.com/daodaoedu/daodao-f2e/pull/1017)，四個 required checks 全綠，待 merge。
新增 daodao-f2e 的 `.github/scripts/commit-changes.sh`（受保護分支開 PR、其餘直推）＋ 7 條測試；`generate-mobile-tokens`／`update-i18n`／`sync-openapi` 不再 `git push`。
merge 後才可補 f2e 的 `pull_request` 規則。PR 用 `BOT_PAT`：`GITHUB_TOKEN` 開的 PR 不觸發 `pull_request` workflow，required checks 永遠不出現。

**(b) 移除 admin bypass** — 八個 repo 共 11 個 ruleset 的 `bypass_actors` 由 `[RepositoryRole 5 always]` 清空。
影響：`gh pr merge --admin` 從此無效；2026-09-03 server #449「紅燈仍被 merge」那條路已關。
併同決策（使用者選定）：ai-backend／storage／admin-ui 的 `pull_request` approvals 由 1 改 0，與其餘五個一致——
approvals=1 過去一直被 admin bypass 繞過，從未實際生效，留著只會擋住機器同步。

**(c) 共用設定同步** — 七張卡住的 sync PR 已合六張（worker #97、infra #88、server #491、mcp #73、storage #248、admin-ui #155）。
以各 repo **default branch 的遠端內容**逐檔比對 root：六個 repo 已一致，只剩 `daodao-ai-backend` 的 `branch-base-check.yml` 漂移。

**修正前次盤點的 P1 #6**：當時說「五個 repo 的 `pre-pr-gate.sh` 與 root 不同、worker 缺全部 hooks」——那是拿 **本機 `projects/` 過期 checkout** 比對的結果，不是遠端實況。
真正的漂移只有卡住的 sync PR 所帶的內容，根因是 sync 自動化壞了，不是同步清單缺項（`sync-claude-config.yml` 早就涵蓋 `pr-evidence-gate.yml`、`branch-base-check.yml` 與全部 hooks）。

sync 壞掉的兩個根因：
1. `REPO_SYNC_TOKEN`（fine-grained PAT）缺 `Checks: read` → `gh pr checks --watch` 回 `Resource not accessible by personal access token`，2026-09-20 04:13 起連續四次 run 失敗。**需人工在 GitHub UI 補權限，API 改不了。**
2. merge 用 `gh pr merge --admin`，在 (b) 之後必然失敗 → 已於 root PR [#255](https://github.com/daodaoedu/daodao/pull/255) 改成一般 merge，契約測試加一條「不得帶 --admin」。

### 尚未解決（此表為當時快照，五項均已於同日結案——現況見文末「目前未完成」）

| 項目 | 結果 |
|---|---|
| f2e 補 `pull_request` 規則 | ✅ PR #1017 merge 後已補 |
| sync 自動化恢復 | ✅ 改走 auto-merge，不再需要 `Checks: read` |
| ai-backend 同步 PR #230 | ✅ 移除 `required_signatures` |
| worker `dev` 分支沒有閘門 | ✅ `dev` 是死分支，已刪除 |
| Actions default permission | ✅ 九個 repo 皆改為 `read` |

### 2026-09-20：順帶修掉的 repo 級阻斷

root repo 的 `test-integrity` required check **對每一張 PR 都失敗**，與 PR 內容無關：
`.test-integrity-review.json`（人工核可回條）在 #253 被 commit 進 main，之後每張 PR 的工作目錄都有這個檔，
workflow 看到檔案存在就帶 `--review`，而 checker 無論本次有沒有刪測試都要求回條的 base／digest 對得上 → `ValueError` → exit 3。

修法（root PR [#255](https://github.com/daodaoedu/daodao/pull/255) 第二個 commit）：回條只在本次 diff 真的有 `removed-test-or-assertion` 時才檢查；
刪測試＋回條無效仍 exit 3、刪測試＋無回條仍 exit 2。同時刪掉 main 上殘留的回條檔，補一條 regression，並把 `__pycache__/` 加進 `.gitignore`。

這正好是本盤點的主題的反例：**閘門本身壞掉時，它擋的是所有人，而不是該擋的東西**——而且從 #253 merge 到現在沒人發現，因為 required check 紅燈在 admin bypass 存在時本來就可以直接 merge 過去。

### 2026-09-20：收斂後的最終狀態

兩張 PR 已 merge：daodao [#255](https://github.com/daodaoedu/daodao/pull/255)、daodao-f2e [#1017](https://github.com/daodaoedu/daodao-f2e/pull/1017)。
f2e 的 `pull_request` 規則已補上（三支自動 commit workflow 不再直推）。

八個 repo 的 default branch 有效規則（`gh api repos/.../rules/branches/<default>`）：

| repo | 分支 | 規則 | required checks |
|---|---|---|---|
| daodao | main | deletion, non_fast_forward, pull_request, required_status_checks | test-integrity, pack-regression, scorer-regression, regression |
| daodao-server | dev | 同上 | test, workflow-tests, Compare SQL ↔ Prisma schemas, **PR evidence** |
| daodao-f2e | dev | 同上 | TypeScript & Lint Check, test, workflow-tests, **PR evidence** |
| daodao-worker | main | 同上 | TypeCheck |
| daodao-infra | main | 同上 | Nginx configuration and gate regression |
| daodao-ai-backend | dev | 同上 ＋ required_signatures | Unit Tests, Format & Lint |
| daodao-storage | dev | 同上 | Migration Upgrade & Constraints, PostgreSQL CI Test |
| daodao-admin-ui | dev | 同上 | Continuous Integration |

八個 repo 的 `bypass_actors` 總數皆為 0。

（此段為當時快照；四項均已於同日結案，見下方「四件待辦的處理結果」與文末「目前未完成」。）

### 2026-09-20：四件待辦的處理結果

**1. sync 的 PAT 權限** — 改走 GitHub auto-merge（root PR #260），不再輪詢 checks，`Checks: read` 不再是必要條件。
偵測改放 `session-start`：列出開超過 24 小時的同步 PR（`gh search prs --owner daodaoedu "head:chore/sync-claude-config-"`，
快取 3 小時，macOS 無 `timeout` 時退回 `gtimeout`）。原因是「job 紅了一整天沒人看」——訊號要放在每天會經過的地方。
八個 repo（含 root）打開 `allow_auto_merge` 與 `delete_branch_on_merge`。
**實跑驗證**：改完後第一次 sync run 八個 repo 全綠，八張 PR 全部自行 auto-merge 完成。

**2. ai-backend `required_signatures`** — 移除。它自 2026-09-20 admin bypass 清空後開始真的生效，導致整個 repo 對所有人凍結：
近四張人類 PR（#228／#225／#223／#221）的 commit 全部 `verified=0`，過去能合是靠 bypass。
`pull_request` 規則上線後，進 dev 的 commit 一律由 GitHub 產生（本來就有簽章），這條規則的邊際保護已很小，
代價卻是人與機器全部停擺。移除後 PR #233 立刻 CLEAN 並自動合入。

**3. worker `dev` 分支與 guard 誤報** — `dev` 為死分支（0 ahead／38 behind，近 10 張 PR 全 target `main`）已刪除
（SHA `0804d8b0d6383bfbe503f8dbeb24fcf59da7bf3a`，可還原），ruleset 條件縮為 `refs/heads/main`。
`session-start` 的「預期全在 dev」改為讀各 repo 的 default branch（root PR #262）：infra 的長期誤報消失。
過程中兩次踩到「全形括號緊接 `$var` 被併進變數名 → `set -u` 直接中止」，已補 4 條 regression（含斷言輸出不得含 `unbound variable`）。

**4. Actions default permission write → read** — 盤點 19 支無 `permissions:` 的 workflow：17 支完全不碰 `GITHUB_TOKEN`，
唯一複合 action 走 Discord webhook，只有 f2e `mobile-ci.yml` 用 `gh pr diff`（f2e PR #1026）。
逐 repo 改並**實際觸發 CI 驗證**（設定寫入成功 ≠ CI 還能跑）：

| 批次 | repo | 驗證 |
|---|---|---|
| 1 | mcp／worker／infra | worker CI ✅、infra nginx validation ✅ |
| 2 | storage／ai-backend／admin-ui | 三支 CI 全 ✅ |
| 3 | server | CI ✅ |
| 4 | f2e | PR #1026 已 merge，權限已改；CI ✅ |
| 5 | root daodao | `product-status-drift`（唯一無宣告者，全程用 `GIT_HUB_ACCESS_TOKEN` PAT）實跑 ✅ |

九個 repo 最終皆為 `default_workflow_permissions=read`、`can_approve_pull_request_reviews=false`，
design-review F-01 的四個子項（ruleset／required checks／default permission／Actions 自我核可）全部關閉。

`can_approve_pull_request_reviews` 一併關閉（F-01 的另一半）。

SonarCloud 在 PR #1026 擋下我自己的寫法（`S7637`：權限應宣告在 job 而非 workflow 層，MAJOR/VULNERABILITY，
new_security_rating 3）——先查前五張 PR 的 SonarCloud 皆綠、確認非 flaky 後改為逐 job 宣告。

---

## 目前未完成（唯一權威清單，2026-09-20 收盤）

前面各段是按時間追加的執行紀錄，會保留當時的判斷與快照；**要看還有什麼沒做，只看這一節**。

| # | 項目 | 現況與下一步 | 來源 |
|---|---|---|---|
| 1 | 依賴弱點與掃描 | 七個 sub-repo 沒有 `dependabot.yml`／`pnpm audit`／`pip-audit`／image trivy。f2e 預設分支已累積 **168 個 dependabot 警報（6 critical／97 high／57 moderate／8 low）**。f2e 另有 CodeQL default setup＋SonarCloud＋GitGuardian，其餘 repo 的 code scanning 需先啟用 Code Security（API 目前回 403）。 | P2 #8 |
| 2 | PR 證據綁 head SHA | `pr-evidence-gate` 只驗 PR body 有「## 驗證證據」，不驗證據對應哪個 head；push 新 commit 後舊報告仍會通過。做法：dev-task finish 在 PR body 寫 fenced JSON（`head`、`evidence_url`、`journey_matrix`、`layout_probe`…），gate 比對 `head == pull_request.head.sha`。 | P4 #13 |
| 3 | 本機九條 PR 閘門在 CI 無對應 | `task.md` 在 `.gitignore` 第 20 行，CI 永遠讀不到，因此 `pr-status-not-verified`／`pr-verify-unchecked`／`pr-poc-compare-missing`／`pr-layout-probe-missing`／`pr-deferred-unlinked`／`pr-fe-pattern-invalid` 六條只在 Claude Code 的 Bash 工具生效，Codex／手動 `gh` 全繞得過。解法與 #2 同一段 JSON；`pr-fe-pattern-invalid` 可獨立在 CI 真跑 parity 腳本，不必信宣告。 | P0 #4 延伸 |
| 4 | diff coverage 門檻 | AGENTS.md 要求新功能附測試但沒有機器量。建議只做 diff coverage（PR 新增行，門檻 70%），不做總 floor。 | P2 #9 |
| 5 | f2e `linode-ci` 雙跑 | `feat/**` 的 push 與 pull_request 各跑一次，每次多一份 3 分鐘 runner；concurrency group 不同所以不會互相取消。 | P2 #7 |
| 6 | daodao-storage `.github/workflows/schema-sync-check.yml` 用 `pull_request: paths` | 目前不是 required 所以無害；若日後加進 ruleset 會永遠 pending。改 always-trigger + job 內 skip。 | P2 #10 |
| 7 | worker 舊分支堆積 | 十餘個 `chore/sync-claude-config-*` 分支未清（`delete_branch_on_merge` 今天才打開，之後的會自動清）。 | 本次觀察 |
| 8 | `REPO_SYNC_TOKEN` 會過期 | 已非阻塞（auto-merge 不需要 `Checks: read`），但 PAT 到期那天所有 sync 會以難懂的錯誤死掉。長期解是換 GitHub App。 | 本次觀察 |

已明確決定**不做**：metric 驅動的回饋迴路（escape label、月報、review 接受率恢復、worker-feedback-collector 對應物）——見 P3。

> 這份文件是規劃與執行紀錄，不是任務系統。上表若要進入實際排程，應依 `gh-card` 開成 Planning board 的 issue。
