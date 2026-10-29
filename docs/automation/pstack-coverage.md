# pstack 對照 daodao 採用狀況（2026-10-29，daodao main @ 28887ae）

範圍：pstack `skills/*`（含 poteto-mode 的 22 個 playbook 與 bugbot-triage reference）、`agents/`、`automations/benny/`、`docs/guide/` 的重點做法。daodao 只看正本（`plugin/skills`、`plugin/docs`、`plugin/templates`、`plugin/hooks`、`docs/automation`、`docs/workflow.md`、`.github`、`bin/pipeline`、`REVIEW.md`、`AGENTS.md`、`scripts/`），沒看 `.agents/skills/` 與 `plugin/out/` 產物，也沒看子專案 repo。

判定：「已採用」只用在能指出實作檔案的項目；狀態欄後的 PR 號取自 #411／#415／#417／#418／#419／#420／#422／#423 的 PR 說明，沒有 PR 號表示是在別的 PR 加入或來源不明。

## 1. 摘要

| 狀態 | 項目數 |
|---|---|
| 已採用 | 34 |
| 部分採用 | 32 |
| 未採用 | 24 |
| 不適用 | 2 |
| 合計 | 92 |

重點：

- 開發主線（develop 依類型分流 fix／refactor／perf、暫停與接手、開 PR 閘門、PR feedback 分流、review 誤判知識庫、POC 視覺比對、驗證工具與 feature map）已經大致對齊 pstack 的 playbook，主要在 #411、#415、#417、#418、#419 這五支 PR 完成。
- 24 條 principle 有 14 條能指到具體檔案。有落差的集中在程式風格與型別這一層：type-system、laziness、subtract、reader-load、migrate-callers 只出現在 refactor 分支或零星規則；#418 也寫明 TypeScript 規範要到 daodao-server、daodao-f2e 各自開 PR。
- 未採用的主要是三類：無人值守長跑（autopilot、orchestrate、hillclimb、overnight loop；Routine A／B／C 已在 2026-09-20 刻意退役）、形式驗證（TLA+、statechart），以及「說給人聽」的輸出整理（ketchup、bro、sharpen、unslop、technical-writing）。
- 部分採用的項目多半已經有素材，只差把它們串成固定流程。例如 feature map 有標註依據的 dev 版本，但沒有定期稽核；reflect 只在冒煙失敗等條件下觸發；blast-radius 有「搜同樣寫法」和 Codex 跨檔焦點，但沒有規定用實跑證明「安全的那一個前提」。

## 2. 對照表

### 工作流程 skills（含 poteto-mode playbook）

| pstack 項目 | 一句話機制 | 狀態 | daodao 對應位置／缺什麼 | 相關 PR |
|---|---|---|---|---|
| poteto-mode（路由） | 依請求類型分派到對應 playbook，搭配精簡回覆、刻意派 subagent、實證後才交付 | 部分採用 | `AGENTS.md`「流程入口」表依情況分派到 skill；`plugin/skills/develop/references/phases/dev.md` 第 3 步依類型分流。缺：單一入口自動判斷類型，也沒有全域的回覆風格規範 | #411 |
| poteto-help | 協助挑選 skill、playbook 或 principle | 部分採用 | `docs/development-skills-and-workflow.md` 入口總表、`plugin/README.md`。只是靜態文件，沒有互動式指引 | — |
| setup-pstack | 依角色設定使用的模型與推理預算 | 部分採用 | `docs/automation/agent-budget-policy.md` 依任務類型指派模型；`plugin/skills/review-change/references/engines.md` 有各引擎模型、fallback 鏈與 effort。缺：可偵測可用模型的設定工具 | — |
| bug-fix playbook | 先重現並留下修正前證據，失敗測試先 commit，修在源頭，被推翻的假設一併 revert | 已採用 | `plugin/skills/develop/references/phases/dev.md` 第 3 步 `fix`；`start.md` 驗收契約第一條 `REPRO-01` | #411、#417 |
| refactoring playbook | 改結構前先釘住行為基準，先刪死碼再重整，行為不變 | 已採用 | `dev.md` 第 3 步 `refactor`（rect-probe、characterization test、先刪死碼與單一呼叫者 wrapper 並單獨 commit） | #411 |
| perf-issue playbook | 先量基準，每個修正都對應一次量測，不靠讀程式碼猜瓶頸 | 已採用 | `dev.md` 第 3 步 `perf`（先寫要宣稱的那句話、`perf-before.json`、A／B 交錯至少 5 次、結論只有四種） | — |
| feature playbook | 先跑 how，再用 architect 平行探索設計，委派實作後驗證 | 部分採用 | develop start → dev → verify 全流程。缺：實作前的 how 步驟，也沒有平行探索多個設計 | — |
| investigation playbook | 唯讀調查，產出附引用的解釋或建議 | 部分採用 | `plugin/skills/check-product-status/SKILL.md`，限於需求現況查核。缺：一般性的「X 怎麼運作」調查 | — |
| multi-phase-plan playbook | 計畫本身是交付物：一份可逐項勾選、靠證據稽核的清單，這一步不實作 | 部分採用 | `plugin/skills/break-down-plan/SKILL.md` 把計畫拆成子 issue；develop 的 task.md 有 phases。缺：每一格都附證據欄的 owner 清單格式 | — |
| opening-a-pr playbook | 在 worktree 工作，用固定流程開 PR | 已採用 | `plugin/skills/develop/references/phases/finish.md`、`plugin/templates/pull-request.md`、`plugin/hooks/pre-pr-gate.sh`、`.github/workflows/pr-evidence-gate.yml` | #411 |
| babysit playbook | 一次處理一支 PR 到可以 merge；CI 失敗分類，碰到需要人決定的事就停 | 已採用 | `plugin/skills/collect-pr-feedback/SKILL.md`（CI 失敗分三類、偶發只重跑一次、base 過期先 fetch、修正併成一次 push） | #415 |
| bugbot-triage（reference） | 分流 bot review finding，濾掉雜訊 | 已採用 | `.github/scripts/review-knowledge.cjs`（G 類提醒型、高風險類別不降級）、`.github/review-knowledge/`；#423 把既有紀錄全部轉成回歸測試 | #415、#423 |
| shipping playbook | 每支 PR 各自驗證，只 land 已驗證的那段，之後不碰 stack | 部分採用 | `finish.md` 用 `git patch-id --stable` 判斷證據能否沿用，issue 留言加 marker 避免重複；`verify-deploy` 做 merge 後查核。缺：stacked PR 由 root 開始依序 land 的程序 | #417 |
| pause-safely playbook | 在安全邊界停下，留 WIP checkpoint 與接手紀錄 | 已採用 | `dev.md` 第 6 步（`wip:` commit、更新 task.md「## 接手點」）；`plugin/skills/develop/references/task-template.md` 的「## 接手點」 | #411 |
| session-pickup playbook | 讀前一段的紀錄接手，不重做 | 已採用 | `plugin/skills/develop/SKILL.md` 第 39 行依 task.md Status 決定接手階段；只有自述、沒附證據的項目到 verify 要重驗；`plugin/hooks/session-start.sh` 開場注入 worktree 狀態 | #411 |
| autonomous-run playbook | 先定可檢查的退出條件，用 wake 機制一路跑到完成 | 部分採用 | 每個 phase 檔都有「完成條件」；`dev.md` 第 6 步規定 phase 之間連續執行。缺：wake／loop 機制（排程已退役，見 `docs/automation/README.md`） | — |
| autopilot-full／autopilot-stack | 每支 PR 一個 owner 從建置做到 merge；由沒寫過那段程式的 swarm 驗證後才 merge | 未採用 | 2026-09-20 起 Routine A／B／C 刻意退役，所有變更都走人審 PR（`docs/workflow.md` 第 894 行） | — |
| orchestrate playbook | 一個協調者管理多日、多 PR、大量 subagent 的長期專案 | 未採用 | `plugin/skills/develop/references/parallel-dev.md` 只寫 2–3 個並行任務的約定，沒有協調者角色 | — |
| hillclimb playbook | 針對單一指標持續迭代改善 | 未採用 | 沒找到；`docs/automation/review-false-positive-research.md` 有 precision／recall 目標，但沒有迭代流程 | — |
| worktree-cleanup playbook | 先快照與稽核磁碟用量，用 `worktree-audit.sh` 判斷可清的 worktree 再清理 | 部分採用 | `plugin/skills/develop/references/phases/cleanup.md` 處理單一任務的 worktree 移除。缺：跨任務稽核腳本（共用 gitdir 的坑目前只記在個人 memory） | — |
| authoring-a-skill playbook | 修改 skill 都走驗證：frontmatter、引用檔案存在、跨 skill 連結可解析 | 已採用 | `plugin/scripts/build.ts`（`pnpm plugin:build`／`plugin:check`，含產物死連結檢查）；正本與產物分離規則寫在 `AGENTS.md` | #418 |
| arena | 平行產生 N 個候選，挑一個當基底，再把其他候選的優點移植進來 | 未採用 | 沒找到 | — |
| prototype playbook | 拋棄式原型用來做設計決策 | 未採用 | POC 由設計端提供，`poc-compare.md` 只做比對；沒有工程端的拋棄式原型流程 | — |
| swarm | 平行派出 N 個 worker，收齊後彙整成一份報告 | 部分採用 | `parallel-dev.md` 允許對機械子步驟 fan out subagent；review-change 四引擎平行執行並產出覆蓋表。缺：通用的分片、彙整與報告格式 | #415 |
| tdd | 先寫會失敗的測試再修 | 已採用 | `dev.md` 第 3 步 `fix`（失敗測試單獨 commit 在修正之前）；`AGENTS.md` 規定修 bug 必須附 regression test | #411 |
| no-comments | 派 Comment Sicko 找出多餘註解並刪掉 | 未採用 | 沒找到註解審查規則 | — |
| typescript-best-practices | 編輯 .ts／.tsx 時套用 TS 規範 | 部分採用 | `plugin/hooks/ADR-0001-gates-over-guidelines.md`：`no-any`、裸 `@ts-ignore` 直接阻擋，`as any` 只警告。#418 寫明子 repo 的 TS 規範尚未開 PR | #418 |

### 驗證與證據

| pstack 項目 | 一句話機制 | 狀態 | daodao 對應位置／缺什麼 | 相關 PR |
|---|---|---|---|---|
| create-verification-skill | 產生專案自己的驗證 skill，像使用者一樣操作 app（啟動、ready、操作、留證據、清理） | 已採用 | `plugin/skills/develop/references/browser-verify.md`（§1a 環境檢查、dev-login 配方、冒煙後清理）、`layout-probe.mjs`、`plugin/skills/test-acceptance/references/browser-session.mjs` | #418、#419、#420 |
| maintain-verification-skill | 定期稽核：每個功能派人讀原始碼，再用一個 live session 實際操作，最多開一支修正 PR | 部分採用 | `plugin/docs/feature-map/` 每份檔案標註依據的 dev 版本；規則是改到 UI 時順手更新；test-acceptance 會在報告記下與 feature map 不一致之處。缺：定期稽核 | #419、#420 |
| visual-parity playbook | 基準就是規格、不能動；用量測判斷是否等價，不靠肉眼 | 已採用 | `plugin/skills/develop/references/poc-compare.md`、`poc-report.py`（`config_sha256` 凍結設定）、`poc-probe-checklist.md`、`layout-probe.mjs`；`pre-pr-gate.sh` 的 `pr-poc-compare-missing` 與 `pr-layout-probe-missing` | #418 |
| benchmark-checklist | 報數字前先檢查限制因素、重複性，以及工作是否真的有跑 | 已採用 | `dev.md` 第 3 步 `perf`（冷／熱快取、request 是否真的送到 server、差距小於每次之間的變動就算沒有差異） | — |
| blast-radius | 找出 diff 以外會壞的地方，並用實跑證明安全所依賴的那一個前提 | 部分採用 | `dev.md` `fix`「修完搜一次同樣寫法」；`review-change/references/engines.md` 讓 Codex 負責跨檔契約；`retrieve-context.sh` 的 Context Pack 補 middleware、schema 與刪檔的替代者。缺：pstack 那套「把前提推到實跑等級，並說明停在哪一級」的確定度梯度 | #415 |
| interrogate | 讓對手試著打破變更，只保留重跑過能證明的 finding，並列出丟棄清單 | 已採用 | `plugin/skills/review-change/references/findings.md` 步驟 8：P0／P1 要在 review snapshot 重跑重現，交人時附各引擎的丟棄清單。刻意偏離：高風險類別即使無法重現仍阻擋 | #415、#422 |
| create-formal-verification-skill | 對 bug 代價最高、測試又碰不到的地方產生形式驗證 skill | 未採用 | 沒找到 TLA+／model checking | — |
| maintain-formal-verification-skill | 程式改了之後同步更新形式模型 | 未採用 | 前一項沒有，這項也就沒有 | — |
| statechart | 用 TLA+ 檢查狀態機，畫成 Mermaid，回報走到違規狀態的最短路徑 | 未採用 | 只有 `docs/automation/dual-subscription-development-workflow.md` 第 507 行一張說明用的 stateDiagram，沒有做檢查 | — |
| runtime-forensics playbook | 對執行中的程序加儀器取得 CPU／heap 訊號再診斷，不從原始碼推論 | 未採用 | 沒找到 | — |
| trace-forensics playbook | 從已存在的 trace／profile 檔案診斷 | 未採用 | 沒找到（`plugin/hooks/import-agent-trace.py` 是 agent 寫檔紀錄，用途不同） | — |
| eval playbook／「Test a skill change blind」 | 盲測 skill 的改動：受測模型看不到評分標準，與基準版本比較 | 部分採用 | `scripts/skill-evals/`（不讓模型看到 rubric、用隔離 workspace、分數根據獨立擷取的 trace）、`.github/workflows/skill-evals.yml`。CI 只測 scorer，不跑模型，也沒有新舊 skill 的 A／B 比較 | — |
| 指南：先講好完成條件 | 在開工前用可通過／可失敗的條件定義「完成」 | 已採用 | `start.md` 1.5 驗收契約、每個 phase 檔的「完成條件」、`plugin/templates/central-issue.md` 的 AC | — |
| 指南：平行工作各用各的工作區 | 平行任務各自隔離，不共用同一個 worktree | 已採用 | `plugin/skills/develop/SKILL.md`（`worktrees/<n>-<slug>/`）、`clone-mode.md`、`parallel-dev.md` 的 port offset | — |

### 設計與規劃

| pstack 項目 | 一句話機制 | 狀態 | daodao 對應位置／缺什麼 | 相關 PR |
|---|---|---|---|---|
| architect | 寫 code 前先畫出型別、簽名與模組結構，實作期間持續對照 | 部分採用 | `start.md` 1.5a 設計草圖（呼叫端用法、型別草圖、邊界、被否決的形狀）；`dev.md` 第 4 步偏離紀錄。只在動到 API、schema 或狀態時才寫；沒有模組結構，也沒有平行設計探索 | #418 |
| figure-it-out | 大型或無人監看的工作：依任務調整嚴謹度，跑假設迴圈並記錄決策 | 部分採用 | develop 的 task.md 有 phases，`dev.md` 第 6 步「兩次修正共同假設」。缺：大型遷移專用的 playbook 與決策紀錄 | #411 |
| how | 解釋子系統架構、執行流程、程式該放哪一層 | 部分採用 | `check-product-status` 限於需求現況查核；feature map 涵蓋功能的到達路徑。缺：一般架構導覽 | #419 |
| why | 跨各種證據來源（版控、issue、文件、聊天）查設計理由與 regression | 部分採用 | `plugin/skills/report-bug/SKILL.md` 第 29 行（`git log`／`git blame`／`gh pr view`）；1.5a 記設計理由；PRD 模板 §5「不採用的方案」。缺：查聊天、文件等其他證據類別 | #417、#418 |
| teach | 結合 how 和 why，讓人真正理解 | 未採用 | 沒找到 | — |
| sharpen | 把任務改得更深而不是更大，再重寫 prompt | 未採用 | 沒找到 | — |
| in-your-own-words | 先重述使用者的目標與問題 | 未採用 | 沒找到明確的重述步驟（report-bug 會改寫成草稿，但用途是整理通報，不是確認目標） | — |
| 指南：共用程式先寫 README | 共用程式先寫 README 再實作 | 未採用 | 沒找到 | — |

### 學習與回顧

| pstack 項目 | 一句話機制 | 狀態 | daodao 對應位置／缺什麼 | 相關 PR |
|---|---|---|---|---|
| correct | 把 agent 反覆犯的錯變成不可能再犯：依序考慮架構、型別、lint、test，最後才是文件；並證明檢查會在真實的過去錯誤上失敗 | 已採用 | `plugin/docs/ai-human-review-workflow.md` 第 44 行；`docs/automation/agent-learning-loop.md`（R1–R3、`agent-handoff.json`）；`ADR-0001` 進場條件（事故修正前跑出 ❌、修正後 ✅）。缺：主動掃描歷史對話找出重複錯誤（文件寫明目前不做） | #418 |
| reflect | 三個平行 reviewer 檢視整段對話，把學到的東西各自對應到某個 skill 的具體修改 | 部分採用 | `plugin/skills/verify-deploy/SKILL.md` §3.5（教訓分成閘門候選、gotchas、丟棄三類，人核准後才改）。只在冒煙失敗、失敗兩次、PM 退回時觸發，不審整段對話 | #417 |
| recall | 從對話紀錄、即時狀態與共享紀錄重建工作脈絡 | 部分採用 | `session-start.sh` 注入 worktree 與 task.md 狀態；task.md「接手點」。缺：從對話紀錄與 issue／事故紀錄彙整成簡報 | #411 |
| ketchup | 整理上次訊息之後的進度，列出每件等人決定的事與決定所需資訊 | 未採用 | 沒找到；`bin/pipeline/board.ts audit` 只稽核 board 狀態 | — |
| ketchup-video | 同 ketchup，改用附字幕的投影片影片呈現 | 未採用 | 沒找到 | — |
| show-me-your-work | 長時間工作每個決策記一列 TSV（做了什麼、為什麼、證據、結果） | 部分採用 | task.md 有備註、「偏離紀錄」「來源變更」欄；`plugin/hooks/analyze-ledger.sh` 統計閘門紀錄。缺：每個決策一列的格式；task.md 在 cleanup 時會被刪掉 | — |
| automate-me | 把使用者的工作偏好寫成個人的 -mode skill | 未採用 | repo 裡沒有（偏好放在 repo 外的個人 memory） | — |
| bro | 用白話重述上一則訊息 | 未採用 | 沒找到 | — |
| unslop | 刪掉文字裡的 AI 腔 | 未採用 | repo 裡沒找到（使用者全域有 write-for-reader skill，不在 repo） | — |
| technical-writing | 分層的技術寫作標準（Diátaxis、Google 風格、STE） | 未採用 | 沒找到 repo 層級的寫作規範 | — |
| make-bot-ui | 做一個用 webhook 喚醒 Grok Bot 的 UI | 不適用 | 綁定 Grok Bot webhook 與 Tailscale，與本 repo 無關 | — |

### principle 原則

| pstack 項目 | 一句話機制 | 狀態 | daodao 對應位置／缺什麼 | 相關 PR |
|---|---|---|---|---|
| attack-the-premise | 同一前提下的修正失敗兩次，先寫出前提並直接驗證 | 已採用 | `dev.md` 第 6 步「兩次修正共同假設」與推翻觀察 | #411 |
| boundary-discipline | 驗證集中在系統邊界，內部信任型別 | 已採用 | `REVIEW.md` 第 20 行；`start.md` 1.5a「邊界：在哪一層 parse」；`benchmark-gates.md` 規定規則來源優先序（server zod → openapi） | #418 |
| build-the-lever | 做出能完成或證明工作的工具，不手工做 | 已採用 | `ADR-0001`「常駐檢查進場條件」；`layout-probe.mjs`、`poc-compare.mjs`、`bin/pipeline/board.ts` | #418 |
| encode-lessons-in-structure | 第二次寫同樣的指示時，改寫成 lint、腳本或檢查 | 已採用 | `ai-human-review-workflow.md` 第 44 行；`ADR-0001`；`pre-pr-gate.sh` 每條規則都附事故來源 | — |
| exhaust-the-design-space | 沒有先例的決策，先做 2–3 個原型比較 | 部分採用 | 1.5a 要求「一個被否決的形狀」；PRD「不採用的方案」。缺：實際做出原型並排比較 | #418 |
| experience-first | 使用者體驗優先於實作方便 | 未採用 | 沒找到成文規則（PM 驗收是流程，不是取捨原則） | — |
| explain-the-number | 量測前後都要找出限制因素，排除量錯東西的可能 | 已採用 | `dev.md` `perf` | — |
| fix-root-causes | 往回追到第一個出錯的地方修；只有在被處理的狀態本身合法時，加 guard 才算修正 | 已採用 | `dev.md` `fix`「先判斷觸發狀態本身合不合法」「不留可能有幫助的防禦碼」 | #411 |
| foundational-thinking | 先把資料結構定對，下游程式就會自然明朗 | 部分採用 | 1.5a 型別草圖。缺：並行 actor 與 scaffold 先後順序的考量 | #418 |
| guard-the-context-window | 大量輸出交給 subagent，主線只留摘要 | 已採用 | `docs/automation/agent-budget-policy.md` §4；`parallel-dev.md`（唯讀調查用 Explore） | — |
| laziness-protocol | 偏向刪除，做最小的改動 | 部分採用 | 只在 `dev.md` `refactor` 寫「先刪死碼」；沒有通用的 diff 大小原則 | #411 |
| make-operations-idempotent | 重跑會收斂到相同的最終狀態 | 已採用 | `finish.md` 第 10 步（marker：先找再 PATCH）；`check-commit` 規定 migration 冪等重跑；`test-acceptance` 報告用 marker 防止重複發布 | #417、#419 |
| migrate-callers-then-delete-legacy-apis | 同一波遷移完呼叫端並刪掉舊 API，不留相容層 | 部分採用 | #411 實際這樣做（dev-task 改名、不留轉介 skill），但沒寫成規則 | #411 |
| minimize-reader-load | 減少讀者要追的層數，收掉只有一個呼叫者的 wrapper | 部分採用 | 只在 `dev.md` `refactor` 提到單一呼叫者的 wrapper | #411 |
| model-the-domain | 有狀態的邏輯要建模，不散成分支 | 部分採用 | 1.5a 要求狀態 union，追加需求時不再加第二個 boolean。缺：獨立的審查準則 | #418 |
| never-block-on-the-human | 可回復的工作不問就做 | 已採用 | `dev.md` 第 5–6 步（禁止在 phase 結尾問「要繼續嗎」）；`format-commit` 第 122 行 | — |
| outcome-oriented-execution | 計畫內的重寫直接收斂到目標，不保留平順的中間狀態 | 未採用 | 沒找到 | — |
| prove-it-works | 對真實產物驗證，不用代理指標 | 已採用 | `check-product-status` 第 4 步四級證據；`agent-learning-loop.md` R1；`pre-pr-gate.sh` 的 `pr-verify-unchecked` | — |
| redesign-from-first-principles | 新需求進來時，問「如果第一天就有，設計會不會不同」 | 已採用 | `start.md` 1.5a「如果這個需求一開始就存在…」 | #418 |
| separate-before-serializing-shared-state | 先消除共享，真正必要時才結構性地序列化 | 已採用 | worktree 隔離；`parallel-dev.md`「migration 類任務一次只做一個」；`check-agent-delivery.py` 的 `owned_paths` | — |
| sequence-verifiable-units | 拆成每步都可驗證的小單位，PR 的順序本身能證明自己 | 已採用 | `dev.md` 第 5 步（每個 phase 先驗證再 commit）；`parallel-dev.md` 的依賴鏈 PR base | — |
| subtract-before-you-add | 先刪掉死碼與多餘的驗證，再往上加 | 部分採用 | 同 laziness，只在 `refactor` 出現 | #411 |
| test-behavior-not-implementation | 測試斷言使用者看得到的行為 | 已採用 | `AGENTS.md` 測試規範（兩種假想修改）；`REVIEW.md` 第 26–27 行；`.github/workflows/test-integrity.yml` | #411、#415 |
| type-system-discipline | 讓非法狀態無法表示、用 branded type、在邊界 parse、窮舉 variant | 部分採用 | `ADR-0001` 阻擋 `no-any`；`dev.md` 第 4 步把新增 `as`／`!` 當成偏離訊號。缺：branded type、窮舉檢查；子 repo 規範未做 | #418 |

### automation 與 agents

| pstack 項目 | 一句話機制 | 狀態 | daodao 對應位置／缺什麼 | 相關 PR |
|---|---|---|---|---|
| benny：triage-issue-reports | 自動分流 Slack 通報：在討論串給一個結論、依原因分派、在 tracker 查重；條件不足時不開卡 | 部分採用 | `plugin/skills/report-bug/SKILL.md`（查重、分派子專案、未授權不開卡、不要求通報者知道根因）。屬人工觸發；沒有 Slack 入口，也不是自動化 | #417 |
| benny：reproduce-and-fix-issues | 用 control adapter 重現已分流的 bug，確認既有修復，有修正前後證據才開 draft PR | 部分採用 | `dev.md` `fix`（`repro-before`）；`report-bug` 驗證既有修復；`test-acceptance` FAIL 要重現兩次才移 Need Fix。不是自動化，也沒有自動開 draft PR | #417、#419 |
| benny：verify-existing-fix（reference） | 找到既有修復後實際走一次通報路徑，分成已修好、修復不足、無法判定 | 已採用 | `report-bug/SKILL.md` 第 33 行附近的三分類 | #417 |
| benny：feature-map（reference） | 每個功能的到達路徑、選擇器、角色與陷阱 | 已採用 | `plugin/docs/feature-map/`（Web 14、後台 8、App 8，附 `path:line` 與依據的 dev 版本） | #419、#420 |
| benny：control-adapter（reference） | 統一的 app 操作介面 | 已採用 | `test-acceptance/references/browser-session.mjs`、`environment.md`；`develop/references/browser-verify.md` | #419、#420 |
| benny：setup-benny | 設定 Slack、tracker、routing、model 與預算 | 不適用 | 依賴 Slack 通報與 Cursor automation；daodao 的通報入口是 GitHub 與人工觸發 | — |
| agent：poteto-agent | poteto-mode 派出的委派 subagent，每個新任務開新的 | 部分採用 | `parallel-dev.md` 的執行載體選擇（XS/S 可整包委派，需要人中途點頭的工作不放背景）。沒有專用的 agent 定義檔 | — |
| agent：comment-sicko | 專門刪多餘註解、批評 workaround 程式碼的 reviewer | 未採用 | 沒找到；review-change 四引擎的焦點沒有涵蓋註解 | — |

## 3. 建議下一步

1. **blast-radius 的確定度梯度併進 review-change／develop finish**（S）
   - 為什麼：daodao 已有「搜同樣寫法」和 Codex 跨檔焦點，但小 diff 的安全前提多半停在「我說的」或「指到某一行」。#422 已要求 P0／P1 重跑重現，可以把同樣做法延伸到「為什麼這個改動安全」：每個變更寫出 1–2 個安全前提，標明證據停在梯度哪一級，高風險類別要求到「實跑」。
   - 怎麼做：改 `findings.md`／`finish.md` 各一段，PR 模板加一欄。
2. **feature map 定期稽核（maintain-verification-skill）**（M）
   - 為什麼：PM 驗收與 develop verify 都依賴 feature map，而 feature map 只靠「改 UI 時順手更新」。#419 已有一次性的 `path:line` 比對腳本，可以做成像 `board-audit.yml` 的排程：比對 `path:line` 與 `data-testid` 是否仍存在，加一輪 live 抽測，最多開一支修正 PR。這能直接減少 #277／#282 這類 BLOCKED。
3. **「等你決定」彙整（ketchup）**（S）
   - 為什麼：人類 reviewer 同時面對多張卡、多支 PR，還有 PM 驗收；`board.ts audit` 只看狀態，沒有列出「卡在誰、要決定什麼、決定所需資訊」。可以加一個唯讀指令或 skill，彙整 Review／Acceptance／Need Fix 卡上待人決定的事項與最新證據連結。
4. **子 repo 的型別紀律規範（type-system-discipline）**（M）
   - 為什麼：#418 明確留下「TypeScript 規範需在 daodao-server、daodao-f2e 各自開 PR」；`ADR-0001` 只擋 `any`。可以補窮舉檢查（`satisfies never`）、ID 類 branded type、在 zod 邊界 parse 後不再斷言，並依 `ADR-0001` 的進場條件，先拿過去的事故證明 lint 會失敗。
5. **correct 的定期掃描**（M）
   - 為什麼：防線機制已經有了，但候選來源只有「人發現第二次」。`analyze-ledger.sh` 已在累積閘門紀錄，`verify-deploy` §3.5 也有閘門候選。可以每兩週做一次：彙整 ledger 與 §3.5 的草稿，找出反覆出現的類別，再依 `agent-learning-loop.md` 的流程提出候選規則，人核准後才實作。
