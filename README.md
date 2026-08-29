# daodao

島島阿學共用基礎設施 monorepo，集中管理跨專案的規格、文件、CI/CD 設定與開發工具。

## 結構

```
daodao/
├── .claude/          # Claude Code 共用設定與 skills
├── .github/          # GitHub Actions workflows、PR template
├── docs/             # 跨專案文件（PRD、FRD、技術文件）
├── openspec/         # OpenSpec 規格與變更管理
│   ├── specs/        # 主規格
│   └── changes/      # 進行中的變更
└── projects/         # 各專案（git submodule）
    ├── daodao-f2e/       # 前端
    ├── daodao-server/    # 後端 API
    ├── daodao-ai-backend/# AI 後端
    ├── daodao-storage/   # 資料庫與儲存
    ├── daodao-infra/     # 基礎設施
    ├── daodao-worker/    # Cloudflare Worker API
    └── daodao-admin-ui/  # 管理後台 UI
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
| daodao-f2e | 前端 | [daodaoedu/daodao-f2e](https://github.com/daodaoedu/daodao-f2e) |
| daodao-server | 後端 API | [daodaoedu/daodao-server](https://github.com/daodaoedu/daodao-server) |
| daodao-ai-backend | AI 後端 | [daodaoedu/daodao-ai-backend](https://github.com/daodaoedu/daodao-ai-backend) |
| daodao-storage | 資料庫與儲存 | [daodaoedu/daodao-storage](https://github.com/daodaoedu/daodao-storage) |
| daodao-infra | 基礎設施 | [daodaoedu/daodao-infra](https://github.com/daodaoedu/daodao-infra) |
| daodao-worker | Cloudflare Worker API | [daodaoedu/daodao-worker](https://github.com/daodaoedu/daodao-worker) |
| daodao-admin-ui | 管理後台 UI | [daodaoedu/daodao-admin-ui](https://github.com/daodaoedu/daodao-admin-ui) |

## 開發工具（Claude Code Skills）

| Skill | 用途 |
|-------|------|
| `/openspec-*` | 需求 → 規格 → 任務（L/M 功能必要；S 卡進 pipeline 用 `ff-change`） |
| `/gh-card` | 開中央 issue 掛 Planning board；label 決定 plan-only / auto-pr / human-driving |
| `/dev-task` | issue 隔離開發：worktrees/<n>-<slug>/ + task.md，start → dev → verify → finish → cleanup |
| `/post-merge-wrapup` | merge 後歸檔 openspec、更新 docs/product 狀態 |
| `/format-commit` | 結構化 commit message（Why / How） |
| `/pre-commit-check` | Commit 前自動品質檢查與修復 |
| `/code-review` | Push 前本地 code review（四引擎；查證為誤判的 finding 記進誤判知識庫） |
| `/collect-pr-feedback` | 收集 PR 上所有 review 回饋（含收割 `/fp` 回覆進誤判知識庫） |
| `/file-bug-issue` | 無法立即修復的 bug 開成 GitHub issue |
| `/publish-tasks` | Routine A 的手動版：OpenSpec tasks → sub-repo issues + auto label |
| `/post` | 踩坑經驗記錄，發佈到 quidproquo.cc |

詳細開發流程見 [docs/workflow.md](docs/workflow.md)；規格要寫到哪一層（FRD / OpenSpec / issue AC）見其 Phase 1.5，自動化 pipeline 見 [docs/automation/github-pipeline.md](docs/automation/github-pipeline.md)。

### AI Code Review 誤判知識庫

本機 `/code-review` 與 CI `code-review.yml` 兩個 reviewer 共用同一份誤判紀錄與過濾規則，記一次、兩處受益：

```
記錄                                   消費
  /code-review 步驟 8 查證為誤判 ──┐      ┌─ CI  code-review.yml：known-FP 進 prompt → filter 在 strict validator 前
  PR 作者回 /fp <n> <A-F> <why>  ├→ jsonl ┤
  （collect-pr-feedback 收割）   ─┘      └─ 本機 /code-review：known-FP 進 review input → filter 套各引擎輸出
```

- 單一來源：`.github/review-knowledge/false-positives.jsonl` + 腳本 `.github/scripts/review-knowledge.cjs`（`prompt-block` / `filter` / `record --db auto` / `test`）；sync 派發唯讀副本到各 sub-repo，CI 從 base ref 載入
- 樣態 A–F 與對策：[.github/review-knowledge/README.md](.github/review-knowledge/README.md)；未解問題的調研與落地順序：[docs/automation/review-false-positive-research.md](docs/automation/review-false-positive-research.md)
- 規則：查證為誤判的 finding **必 record**；改過濾正則**必附 `--sample` + `--expected` fixture**，`review-knowledge.cjs test` 要綠
