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
    └── daodao-worker/    # Cloudflare Worker API
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

## 開發工具（Claude Code Skills）

| Skill | 用途 |
|-------|------|
| `/openspec-*` | 需求 → 規格 → 任務的完整工作流 |
| `/format-commit` | 結構化 commit message（Why / How） |
| `/pre-commit-check` | Commit 前自動品質檢查與修復 |
| `/code-review` | Push 前本地 code review |
| `/collect-pr-feedback` | 收集 PR 上所有 review 回饋 |
| `/file-bug-issue` | 無法立即修復的 bug 開成 GitHub issue |
| `/publish-tasks` | 發布 OpenSpec tasks 為 GitHub issues 供 Remote Agent 自動實作 |
| `/post` | 踩坑經驗記錄，發佈到 quidproquo.cc |

詳細開發流程見 [docs/workflow.md](docs/workflow.md)。
