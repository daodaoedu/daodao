# 把第二次錯誤變成規則

這次依可用的歷史對話紀錄摘要選三件反覆被糾正的事；紀錄是選題依據，現況以本次 codebase 查核為準。保留現有 13 個開發 skill，將規則放進它們已引用的共用文件，避免再裝一整包重複 skills。

| 規則 | 過去糾正與風險 | 可執行防線 |
|---|---|---|
| R1 證據不能越級 | 本機模板當作團隊採用；測試／workflow 存在當作部署或實際可用 | handoff 每條 verified claim 必須有相同階段 evidence，記 revision、時間及證據位置；test 加命令／結果，deployment／usable 加環境／結果 |
| R2 需求者只回答產品問題 | 多次要求 repo、API、根因與固定負責人；逐格模板增加負擔 | intake 最多兩題，禁止 repo／sha／owner／root-cause 欄位；沿用 skill-evals 的 captured trace 檢查，來源不改寫 |
| R3 只寫明列的任務檔案 | 共用 dirty checkout 的其他成果被捲入提交／改動 | handoff 的 writes 必須屬於 owned_paths 的明列檔案，禁止絕對路徑與 traversal；dev-task 使用隔離 worktree，提交前另核對真實 Git diff／staged paths |

## 第二次發生時

先停止重試同一修法，從失敗輸出或對話抽出同一錯誤的兩次證據，在任務目錄保存 `agent-handoff.json`。`recurrences` 加一筆 count ≥ 2，逐項評估 lint、型別、目錄限制；填 control 與 regression_ref。只有機械限制無法合理表達時才選 prompt，並寫 why_not_mechanical。缺少評估或回歸位置，檢查失敗。

改規則時先新增會失敗的 regression case，再修 validator／既有 gate，重跑受影響測試。能安全修的格式與產物漂移自動修復；產品語意、完成狀態與授權由原流程決定。不得自動改遠端保護政策、降低測試或發布規則。

```sh
python3 scripts/check-agent-handoff.py /path/to/task/agent-handoff.json
pnpm agent:check
pnpm plugin:build  # 修改 canonical skills／共用文件後
pnpm plugin:check
```

[可複製範例](examples/agent-handoff.json) 是合成控制案例，沒有部署證據。欄位：mode 為 intake／development；claims 的 stage 為 implementation／test／merge／deployment／usable，status 為 verified／unverified。verified 的 evidence 有同名 stage、ref、revision、observed_at；階段特有欄位見 R1。questions 使用 field 分類；owned_paths 和 writes 都是相對於該 checkout 的檔案清單。

## 自動改善範圍

- 已有 `plugin:check` 與 shared-config CI 檢查產物，不再另寫一套；只改 `plugin/skills`、`plugin/docs` 等 canonical 後重建。
- 已有 skill-evals 的 scorer、trace importer、aggregate；用真實 client trace 才能檢查 agent 的實際問題與 mutation attempts，不能用 synthetic regression 代表行為改善。
- 新增 `agent:check` 跑 handoff regression 與範例，接入 shared-config CI。各 skill 交付前主動檢查任務 handoff；目前不自動掃描所有歷史對話，也不自動偵測同義錯誤。
- `plugin/hooks/analyze-ledger.sh` 的統計可作候選線索。下一步先用真實 trace 校準錯誤分類與誤判率，再把分類映射至規則候選；不讓 agent 自行改個人 memory 或正式規則。

此檢查只驗結構及聲明一致性，無法驗證證據真偽、JSON 是否完整涵蓋所有 prose／寫入，也不攔截實際 filesystem 操作。需由獨立 trace 與 Git diff 校對，仍須真實部署／操作證據。PR #301 的 shared regression、native macOS 與 test-integrity 已遠端通過；新增 Linux 路徑的遠端結果另記，不能由本機測試代替。各客戶端 hooks 是否生效仍須另驗。

## 文件維護

入口放 `docs/development-skills-and-workflow.md`；完整規則只放 `plugin/docs/ai-human-review-workflow.md`；任務證據放任務目錄，實驗與過期規劃不寫成產品完成狀態。平台能力與數量優先讀 `plugin/platforms.json`，避免手寫入口逐漸漂移。外部 skills 庫只借工作模式；先拿這三個真實反例試跑，再選少量需要的技能。這次未取得所指 Matt 庫的確切網址，未宣稱已比較或導入。

## 本次驗證紀錄（2026-10-10）

`agent:check` 9 個回歸測試與範例通過；plugin scripts 206 個測試、skill eval scorer 11 個測試、requester contracts 5 個測試通過；`plugin:check` 同步檢查與 `git diff --check` 通過。保留原有 dirty 子專案與 issue 草稿；未 commit／push，遠端 CI、真實 agent 行為與部署尚未驗證。

## PR 交付檢查的試行與啟用界線

實測回報：#296 的 5 個 diff 檔案沒有任何 Edit／Write target 可對上；#295 server／f2e 為 4／13 個、0／0 涵蓋；#293 為 7／0；#152 為 8／1。這是使用者提供的測量，尚未由本 session 重測。Bash 可以合法寫檔，但客戶端不會自動留下結構化 targets；最終 diff 不能回推完整操作。原版先強制 trace 的設計不成立，且共用 main 的 hook 修改直接影響其他 session，已改為預設不啟用。

`DEV_TASK_DELIVERY_GATE_MODE`：

| 模式 | 行為 |
|---|---|
| off（預設） | 不新增 delivery 阻擋；既有 PR gates 照常 |
| warn（試行） | 執行核對並留下未驗證診斷，失敗不阻擋 |
| block（明確啟用的試行） | 強制 manifest 與實際 Git／證據檔核對；缺 trace 須明列 unavailable／partial 及理由 |

`DEV_TASK_REQUIRE_TRACE=1`／CLI `--require-trace` 是另一個嚴格 pilot，沒有完整 capture 時必須失败；不要套到既有任務。模式不由 agent 自動升級。啟用前須真實任務端到端證據，不能只有 synthetic regression。

`plugin/hooks/check-agent-delivery.py` 使用任務 repo 外的 `agent-handoff.<repo>.json`：base_revision／head_revision 對上當前 commit 與 PR 實際 base 的 merge-base；writes 完整等於 committed diff，owned_paths 涵蓋任務允許寫入的全部檔案（包括修改後還原的測試 fixture），不必等於最終 diff；rename 兩端都列。verified claims 引用同版 evidence 檔案和 SHA-256，tracked／untracked 差異阻擋。writes 表示最終改動檔案，不表示所有實際寫入。缺 trace 必須以 trace_status 與 trace_reason 誠實記錄，輸出明列 operation trace unverified，仍核對 evidence 檔案。

### Trace 匯入與限制

`plugin/hooks/import-agent-trace.py` 讀 Claude client／subagent JSONL，只將 Write／Edit／MultiEdit 的 file_path 轉成 targets；任何 Bash 或未知工具都留下 opaque event、標 partial 並返回 exit 2，完全不讀 Git diff 猜 targets。source_sha256 綁定輸入，head_revision 為匯入時 HEAD，不能當作工具呼叫當時版本的證明。即使 structured-tools-only 也不證明沒有未記錄的 filesystem 操作。

```sh
python3 /absolute/daodao/plugin/hooks/import-agent-trace.py   --session /private/client/agent.jsonl --repo /absolute/task/repo   --head <final-head-sha> --output /private/task/trace.json
python3 /absolute/daodao/plugin/hooks/check-agent-delivery.py   --repo /absolute/task/repo --artifact /private/task/agent-handoff.repo.json   --base <merge-base-sha>
```

範例只說明介面；raw session 不提交，避免包含私有資訊。partial capture 作診斷，不能作完整 trace 通過依據。已有 `scripts/skill-evals/trace_adapter.py` 偏向技能評估，不能以其輸出自動宣稱 filesystem coverage。

真正完成嚴格 trace pilot，還需獨立觀測 Bash／腳本的寫入（或受控的寫入工具），驗證跨 subagent、產物生成、rename／delete、重試與失敗 attempts，再做真實任務抽樣。現有任務不重寫 diff 製造假 trace，也不要求人繞 hook。非 dev-task、其他 PR API、未啟用 hooks 不受此入口控制；遠端 required checks 尚未設定。

## 可執行的 Bash trace 收集路徑

原生觀測器 `plugin/hooks/record-agent-writes.py` 在 agent 之外訂閱 macOS FSEvents／Linux inotify，不解析 shell，也不從 diff 生出 targets。它在任務開始前確認 repo 乾淨，用檔案事件 probe 確認訂閱 ready；任務完成後再做 drain probe，保存事件 journal 與 SHA-256、start／final revision。掉事件、需 rescan、observer 停止或 probe 失敗都標 partial；沒有 polling fallback。macOS 使用 watchdog 6.0.0；Linux 使用標準函式庫及 libc 的 inotify，不需額外 Python 套件。

一次設定（venv 放 repo 外）：

```sh
python3 -m venv /absolute/private/trace-venv
/absolute/private/trace-venv/bin/pip install -r /absolute/daodao/scripts/agent-trace/requirements.txt
```

完整任務可由觀測器包住 client 命令，或先啟動 stop-file 模式讓既有 UI／subagents 在同一 repo 工作：

```sh
/absolute/private/trace-venv/bin/python /absolute/daodao/plugin/hooks/record-agent-writes.py   --repo /absolute/task/repo --output /absolute/task/trace.json   --stop-file /absolute/task/trace.stop
```

等 `trace.json.ready.json` 出現後才派工。所有修改、測試與 commit 完成後建立 `/absolute/task/trace.stop`，等待 recorder 退出並產生 trace.json；尚未完成時不讀半份紀錄。也可用 `-- <client command and args>` 代替 stop-file，獨立觀測器會在 client 啟動前 ready。

manifest 的 trace.ref／sha256 引用產生的 trace.json。嚴格 pilot 額外核對 source、coverage、errors、start revision、原始 journal hash 與事件 targets。journal 中保留被 .gitignore 忽略的 build/cache 寫入；.git metadata 排除於 source scope。它證明觀測期間的 repo 檔案事件，沒有 process attribution，不證明 repo 外／網路操作或每次瞬間寫入的完整序列；FSEvents 可合併同檔事件。多個 agent 同時改同 repo 會混在一起，必須隔離任務。

## pstack 原始碼對照（2026-10-10）

原始參考：[/correct](https://github.com/cursor/plugins/blob/main/pstack/skills/correct/SKILL.md)、[create-verification-skill](https://github.com/cursor/plugins/blob/main/pstack/skills/create-verification-skill/SKILL.md)、[verify-and-ship](https://github.com/cursor/plugins/blob/main/pstack/docs/guide/06-verify-and-ship.md)、[make-it-yours](https://github.com/cursor/plugins/blob/main/pstack/docs/guide/09-make-it-yours.md)。此前實作只有導讀文章依據，未直接比較原始 skill。

採用的做法：先讀 repo 而非要求人填技術欄位；規則由架構／型別／lint／CI／test 到 docs 逐層選擇；驗證工具提供 launch、ready／doctor、drive、evidence、cleanup，先實跑再交付；skill 變更隔離試驗，不即時污染其他任務。這幾份 pstack 文件重點是實際產品行為，沒有把完整寫入操作 trace 當所有 PR 的通用前置条件。寫入 trace 是我們另加的輔助證據，不能取代 API／UI／服務驗收，collector 不適用時不得阻擋原本合法的驗收流程。

本機實測：原生 Bash／Python／rename／delete／還原案例有 14 個檔案事件、0 個 collector error；真實 Codex CLI 修 doubled utility，先見測試失敗再修正通過，shell Python 修改由 FSEvents 捕捉、獨立 supervisor 提交，完整 capture 通過 strict delivery 核對。此為隔離小型任務的端到端證據，不是五個既有任務的追溯證明，也不代表所有平台／大型 repo 已通過。原始 logs、journal 與 proof 保留在本機私有 pilot 目錄，不提交 raw session。


## Linux 雲端 runner

相同 recorder CLI 自動選 inotify；不安裝 watchdog、不需要 root／privileged container。必須由可信任 supervisor 啟動，watcher 訂閱所有既有目錄並經 probe ready 後才放行 agent。repo 放 runner 本機 ext4／xfs／btrfs／overlay／tmpfs 等受支援檔案系統，trace／journal／stop-file 放 repo 外。Docker 上不要監看 macOS bind mount，應在 container 自己的 `/tmp` 或本機 volume clone task repo；掛載 source 工具目錄可唯讀。

```bash
# 在 Linux VM／container 中執行；使用實際安裝路徑。
python3 /tools/plugin/hooks/record-agent-writes.py \
  --repo /workspace/task-repo --output /evidence/trace.json \
  --stop-file /evidence/trace.stop
# supervisor 等 /evidence/trace.json.ready.json，再放行 agent。
# agent 完成測試和 commit 後，supervisor 建立 stop-file、等待 recorder 結束。
```

Linux collector 處理 rename cookie、刪除、既有目錄遞迴訂閱；偵測 `IN_Q_OVERFLOW`、watch 消失、unmount、reader 異常及截斷事件時標 partial。新增／搬入／搬移目錄一律標 partial，因為初次訂閱前可能已寫入檔案；仍繼續收集可觀測事件，但不從掃描或 Git diff 補造漏失紀錄。預期新增目錄可在任務 base 準備階段建立；不能在寫入發生後重新開 collector，卻聲稱原任務完整。

[inotify Linux manual](https://man7.org/linux/man-pages/man7/inotify.7.html) 說明此 API 不涵蓋網路檔案系統的遠端寫入、mmap 修改，也無 process attribution；本紀錄表示 native filesystem event 覆蓋，不保證每次 byte mutation。symlink 指向 repo 外的寫入也不在 repo scope。需要更強保證時另評估具備權限的 system-level instrumentation，不能自行升級宣稱。

無法啟動獨立 watcher 的託管 agent 平台需平台提供原始寫入攔截／journal；只有 Bash 命令文字仍不足。沒有這項能力就保留 operation-unverified，不阻擋原本的產品驗收。gate 預設 off 不變。

Linux 真實 client pilot（2026-10-10）：獨立 recorder 訂閱 ready 後，delegated Codex agent 透過實際 Docker exec 先重現 `7 != 6`，用 Bash／Python 修正，再測試通過與 commit；observer 停止在 commit 之後。6 個事件、0 個 collector error，嚴格核對 exit 0；restored.txt 還原後不在 final diff，但出現在 raw journal。repo 使用 container 原生 `/tmp`，容器無網路／無 privileged，僅工具唯讀掛載；證據保存在 `/tmp/daodao-linux-trace/pilot/`，不提交原始 session。這證明本機 Linux container 路徑，不代表所有 hosted agent 已整合。

此外，以真正 Linux kernel queue 填滿觸發 `IN_Q_OVERFLOW` 驗證掉失偵測（未修改 sysctl、未使用 root）；另有 decoder fault injection、watch-loss、瞬間新增又刪除目錄、非 UTF-8 檔名與本機 mount 判定回歸。這些與真實 agent pilot 分別保存，不能互相代替。
