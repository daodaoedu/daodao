# skills-staging Manifest

建立：2026-07-14，由離任首席架構師 session 產出（三輪獨立 review 後定稿：factual / doctrine / usability）。範圍：/home/user 下九個 daodao repo 的 workspace 級 skill 庫，補既有 per-repo `.claude/skills`（project-rules / codebase-map / system-map）沒有覆蓋的層：事故史、跨 repo 驗證標準、營運與治理。與既有 skill 衝突時：先驗證 codebase，現實為準。

**路徑慣例**：本庫所有指令與相對路徑以 `/home/user` 為基準（九個 repo 平行並列於此）。你若在某個 repo 內部，請用各檔給的絕對路徑或先確認 cwd。

**零上下文 session 的進場順序**：(1) 目標 repo 的 `CLAUDE.md` →(2) 動手前該 repo 的 `project-rules`、不熟結構讀 `codebase-map`、跨 repo 影響讀 `system-map` →(3) 本庫按 frontmatter 觸發條件載入對應檔。commit/push 一律走 CLAUDE.md 的互動流程（pre-commit-check → format-commit → 使用者確認；push 前問要不要 review），自動化情境也不可自答跳過。

| Skill | 一行說明 | 證據基礎 |
|---|---|---|
| debugging-playbook.md | 13 個症狀→分診路徑 | 全部對應真實事故 commit：photo_url 登入斷（#162/#350）、nginx 520 saga 12 commits、Black 版本事故（60b78f5/19e74a0）、barrel 事故（63daf8b）、EAS env（a54dcf8）、feed 分頁（60b78f5）、Actions 條件雷（51d5047/0388669/b7487f4）、email_type 三連環 |
| failure-archaeology.md | 死路、revert、為什麼——防止重走 | git 考古：nginx saga 完整弧線（含被拆掉的中間修復）、email_type 三次、squash 分歧（3b5c062）、.env 翻車（2f9c61c）、Routine C 三 bug、5 個 revert、6 個孤兒檔逐一驗屍 |
| architecture-contract.md | 10 條違反會出事的不變量（C1–C10） | 每條附事故出處；sql_runner.py / turbo.json / vite.config.ts / wrangler.toml / hooks 逐檔核實；worker auth 未掛載經 grep src/index.ts 確認 |
| migration-safety.md | storage migration 的 9 條規則（R1–R9） | sql_runner.py 語義逐行核實（skip 條件、checksum 不驗證）；deploy.sh 備份行號核實（63 vs 註解的 79）；068 空號、雙 039 撞號、b92a996 非法語法皆查證 |
| build-and-env.md | 七個 repo 從零到綠 + 版本矩陣 | 指令全部對照 package.json/Makefile/CI YAML；turbo 隱藏依賴、prisma:generate 前置、Black 釘版、mock 測試不需 DB 皆核實 |
| validation-and-qa.md | 「CI 綠」的折算表與各類變更的證據標準 | 各 repo CI YAML 逐檔讀過：ai-backend/worker/admin-ui CI 不跑測試、mcp 無 CI、server 三層測試全 mock、drift 檢查只比名字 |
| ci-cd-pipelines.md | 部署拓撲 + 改 workflow 的已踩雷 checklist + 排程清單 | CD workflow 逐檔讀過；P1–P7 各對應 commit；cron 清單來自 workflow 檔 |
| config-and-flags.md | 五種互異的 env 機制與新增變數 SOP | config.py/_DEFAULTS、src/types.ts Env、vite.config.ts proxy、generate:env 生成物語義、.env 手管政策（2f9c61c）皆讀檔核實 |
| run-and-operate.md | 本地全套啟動順序、prod 資料同步、線上操作規則 | Makefile/compose/ansible playbook 逐檔讀過；PM2 log 導 /dev/null、5423 port、network external、維護頁 worker 皆核實 |
| diagnostics-and-tooling.md | 查 DB/Redis/worker/pipeline 真相的工具箱 | daodao-mcp 原始碼 + TODO.md（含遮罩未驗證的自承）；pipeline 卡點對應三個修過的 bug；TODO 基準數字為 2026-07-14 實測 |
| governance-and-sync.md | 共用檔同步機器、hooks 能力邊界、開工載入順序 | sync-claude-config.yml 與 sync.sh 逐行讀過（含兩者 repo 清單不一致）；六 repo md5 實測一致；hook exit code 實測為 1 |
| automation-pipeline.md | 撞見管線產物時的生存指南（A1–A5） | bin/ 原始碼讀過：HIGH_RISK_REPOS、token 預算、kill switch、三個已修 bug（f733153/ce9ebf2/03acd22） |
| doc-trust-map.md | 已查證的文件謊言表 + 主題→真相權威 | 每條謊言本 session 親自 grep 核實（NestJS:357、banner 三檔、update-i18n 路徑、infra README、project.md、engines） |

輔檔：UNCERTAINTY.md（review 後產出的未定案事項）。

維護方式：每檔頂部有「最後校準」日期、尾部有一行重新驗證指令。指令跑不過 = 該檔需要重新校準，不是照舊引用。
