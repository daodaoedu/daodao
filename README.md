# daodao

島島阿學共用基礎設施 monorepo，集中管理跨專案的規格、文件、CI/CD 設定與開發工具。

## 結構

```
daodao/
├── .agents/          # Codex 讀的 skills（plugin 產物，不手改）
├── .claude/          # Claude Code 共用設定、行銷與營運 skills
├── .codex/           # Codex 的 hooks、Playwright MCP 與指令放行規則（plugin 產物）
├── .github/          # GitHub Actions workflows、PR template
├── docs/             # 跨專案文件（PRD、FRD、技術文件）
│   └── archive/openspec/  # 已退役的 OpenSpec 規格與變更（2026-09-20 封存）
├── plugin/           # 開發流程 plugin 正本：14 個 skill、hooks、模板、feature map
└── projects/         # 各專案（git submodule）
    ├── daodao-f2e/       # 使用者端前端與 App（含燈塔講師／團主管理端）
    ├── daodao-server/    # 後端 API
    ├── daodao-ai-backend/# AI 後端
    ├── daodao-storage/   # 資料庫與儲存
    ├── daodao-infra/     # 基礎設施
    ├── daodao-worker/    # Cloudflare Worker API
    └── daodao-admin-ui/  # 島島內部員工用的管理後台（不是燈塔）
```

## 開始使用

```bash
# Clone（含所有子專案）
git clone --recurse-submodules https://github.com/daodaoedu/daodao.git

# 已 clone 但子專案是空的
git submodule update --init --recursive

# 更新所有子專案到最新
git submodule update --remote
```

## 各專案 Repo

| 專案 | 說明 | Repo |
|------|------|------|
| daodao-f2e | 使用者端前端與 App（含燈塔講師／團主管理端） | [daodaoedu/daodao-f2e](https://github.com/daodaoedu/daodao-f2e) |
| daodao-server | 後端 API | [daodaoedu/daodao-server](https://github.com/daodaoedu/daodao-server) |
| daodao-ai-backend | AI 後端 | [daodaoedu/daodao-ai-backend](https://github.com/daodaoedu/daodao-ai-backend) |
| daodao-storage | 資料庫與儲存 | [daodaoedu/daodao-storage](https://github.com/daodaoedu/daodao-storage) |
| daodao-infra | 基礎設施 | [daodaoedu/daodao-infra](https://github.com/daodaoedu/daodao-infra) |
| daodao-worker | Cloudflare Worker API | [daodaoedu/daodao-worker](https://github.com/daodaoedu/daodao-worker) |
| daodao-admin-ui | 島島內部員工用的管理後台（不是燈塔） | [daodaoedu/daodao-admin-ui](https://github.com/daodaoedu/daodao-admin-ui) |

## 開發工具（daodao plugin）

開發流程打包成 [plugin](plugin/README.md)，14 個 skill 在 Claude Code（`/daodao:<skill>`）與 Codex（讀 `.agents/skills/`）能力一致；Claude.ai 與 ChatGPT 網頁版裝 `daodao-web`，只有不需要本機 checkout 的 7 個。安裝方式與平台差異見 [plugin/README.md](plugin/README.md)。

| Skill | 用途 |
|-------|------|
| `/draft-prd` | 需求查核與 PRD 起草（OpenSpec 已於 2026-09-20 退役，`/openspec-*` 不再使用） |
| `/check-product-status` | 規劃或實作前查核相關程式碼的行為與需求差異 |
| `/request-feature` | 套共用模板開中央／子 Issue，含 AC 與驗收方式；涉及 repo 要附程式碼依據 |
| `/break-down-plan` | 把已確認計畫的未完成任務批次發成中央 repo 的子 issue（人工發布；自動派工已退役） |
| `/report-bug` | 把操作異常或 CI 錯誤整理成 bug issue，skill 自行查核歸屬 |
| `/develop` | issue 隔離開發：worktrees/<n>-<slug>/ + task.md，start → dev → verify → finish → cleanup |
| `/check-commit` | Commit 前自動品質檢查與修復 |
| `/format-commit` | 結構化 commit message（Why / How） |
| `/review-change` | Push 前本地 code review（四引擎；查證為誤判的 finding 記進誤判知識庫） |
| `/collect-pr-feedback` | 收集 PR 上所有 review 回饋（含收割 `/fp` 回覆進誤判知識庫） |
| `/verify-deploy` | merge 後查核部署、dev 冒煙，移卡交 PM 驗收 |
| `/test-acceptance` | PM 驗收：照請驗收留言在 dev 實測、截圖，回報 pass／fail |
| `/move-board-card` | Planning board 狀態操作與稽核 |
| `/notify-related-issue` | 依 PR 與驗收狀態草擬關聯 Issue 更新 |

快速導覽與現況盤點見 [docs/development-skills-and-workflow.md](docs/development-skills-and-workflow.md)；完整開發流程見 [docs/workflow.md](docs/workflow.md)；規格要寫到哪一層（FRD / issue AC；OpenSpec 已退役）見其 Phase 1.5，Planning board 狀態怎麼流（自動派工與 Routine C 皆已退役，改由各 skill 呼叫 `bin/pipeline/board.ts`）見 [move-board-card skill](plugin/skills/move-board-card/SKILL.md)。

新增的[Issue → 開發 → 驗收 → 合併流程提案](docs/automation/issue-to-acceptance-workflow.md)涵蓋 Google Docs／Drive、人工與自動入口、Issue 回寫；另有[額度分配政策](docs/automation/agent-budget-policy.md)與[可複用文件模板](plugin/templates/README.md)。這些是待導入設計，不代表自動化已啟用。

### AI Code Review 誤判知識庫

本機 `/review-change` 與 CI `code-review.yml` 兩個 reviewer 共用同一份誤判紀錄與過濾規則。**2026-10-29 起不再收集新紀錄**：既有紀錄全部轉成過濾規則的回歸測試（fixture、已知漏網或寫明不測的原因）。

```
既有紀錄（凍結）                        消費
  false-positives.jsonl ─────────────┬─ CI  code-review.yml：known-FP 進 prompt → verify 標註 absent-claim
                                     └─ 本機 /review-change：known-FP 進 review input → filter → verify 套各引擎輸出
```

- 單一來源：`.github/review-knowledge/false-positives.jsonl` + 腳本 `.github/scripts/review-knowledge.cjs`（`prompt-block` / `filter` / `verify` / `test`；`record` 已退役）；sync 派發唯讀副本到各 sub-repo，CI 從 base ref 載入
- 樣態 A–F 與對策：[.github/review-knowledge/README.md](.github/review-knowledge/README.md)；未解問題的調研與落地順序：[docs/automation/review-false-positive-research.md](docs/automation/review-false-positive-research.md)
- 規則：誤判不再記錄；改過濾正則時直接在 jsonl 加 `pr` 為 0 的 fixture 與 `expected: keep` 反例，`review-knowledge.cjs test` 要綠
