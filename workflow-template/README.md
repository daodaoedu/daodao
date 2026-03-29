# Claude Code Workflow Template

一套基於 Claude Code + OpenSpec 的完整開發工作流程模板，涵蓋從需求到部署的每個環節。

## 功能

- **OpenSpec 規格驅動開發** — 16 個 Claude Code skills，將模糊需求轉化為可執行的工程任務
- **自動品質守護** — Pre/Post write hooks 保護敏感檔案、自動格式化
- **結構化 commit** — Why / How 格式的 commit message
- **本地 code review** — Push 前自動審查邏輯、安全、效能、架構
- **PR feedback 收集** — 一鍵整理 CI + AI review + 人類 review 回饋
- **Remote Agent 自動化** — 將 tasks 發布為 GitHub issues，雲端 agent 自動實作
- **多 repo 同步** — 共用設定自動同步到所有子專案

## 快速開始

### 1. 複製到你的專案

```bash
# 方法 A：用 GitHub template（推薦）
# 先將此 repo 設為 template，然後 Use this template 建新 repo

# 方法 B：手動複製
cp -r workflow-template/{.claude,.github,openspec,docs} /path/to/your-project/
```

### 2. 設定 `openspec/config.yaml`

編輯 `openspec/config.yaml`，填入你的專案資訊：

```yaml
schema: spec-driven

context: |
  # 你的專案名稱
  專案描述...

  ## 技術棧
  - 前端: ...
  - 後端: ...

  ## 開發慣例
  - ...
```

### 3. 設定 `.claude/settings.json`

根據你的專案需求調整 permissions。預設已包含常用指令，你可能需要：
- 加入專案特定的套件管理工具（如 `pnpm`、`yarn`、`pip` 等）
- 加入專案特定的 CLI 工具

### 4. 調整 hooks（可選）

- `pre-write-guard.sh` — 取消註解 migration 保護（如果你有 SQL migrations）
- `post-write-format.sh` — 已支援 Biome / ESLint / Black + Ruff，無需修改

### 5. 開始使用

```bash
cd your-project
claude

# 探索需求
/openspec-explore

# 建立新功能
/openspec-new-change my-feature

# 快速產生所有 artifacts
/openspec-ff-change my-feature

# 開始實作
/openspec-apply-change my-feature
```

## 目錄結構

```
.claude/
├── settings.json                   # Claude Code 權限和 hooks 設定
├── sync.sh                         # 同步設定到子專案（多 repo 使用）
├── hooks/
│   ├── pre-write-guard.sh          # 寫入前保護（敏感檔案、migration）
│   └── post-write-format.sh        # 寫入後自動格式化
└── skills/
    ├── openspec-explore/           # 探索需求
    ├── openspec-new-change/        # 建立新 change
    ├── openspec-continue-change/   # 逐步產生 artifacts
    ├── openspec-ff-change/         # 快速產生所有 artifacts
    ├── openspec-apply-change/      # 實作 tasks
    ├── openspec-verify-change/     # 驗收
    ├── openspec-archive-change/    # 歸檔
    ├── openspec-bulk-archive-change/ # 批次歸檔
    ├── openspec-sync-specs/        # 同步 delta specs
    ├── openspec-onboard/           # 新手教學
    ├── format-commit/              # 結構化 commit message
    ├── code-review/                # Push 前 code review
    ├── pre-commit-check/           # Commit 前品質檢查
    ├── collect-pr-feedback/        # PR feedback 收集
    ├── file-bug-issue/             # 開 bug issue
    └── publish-tasks/              # 發布 tasks 到 GitHub

openspec/
├── config.yaml                     # OpenSpec 專案設定（需自訂）
└── changes/                        # OpenSpec changes（自動產生）
    └── archive/                    # 已歸檔的 changes

.github/workflows/
└── sync-shared-config.yml          # 共用設定同步（多 repo 使用）

docs/
└── workflow.md                     # 完整工作流程文件
```

## Skills 一覽

### OpenSpec 規格流程

| Skill | 用途 |
|-------|------|
| `/openspec-explore` | 探索需求、釐清問題、思考方案 |
| `/openspec-new-change` | 建立新 change + proposal |
| `/openspec-continue-change` | 逐步產生下一個 artifact |
| `/openspec-ff-change` | 一次產生所有 artifacts |
| `/openspec-apply-change` | 根據 tasks 開始實作 |
| `/openspec-verify-change` | 驗收：實作是否符合規格 |
| `/openspec-archive-change` | 歸檔完成的 change |
| `/openspec-bulk-archive-change` | 批次歸檔多個 changes |
| `/openspec-sync-specs` | 同步 delta specs 到 main specs |
| `/openspec-onboard` | 新手教學導覽 |

### 開發流程

| Skill | 用途 |
|-------|------|
| `/format-commit` | 產生 Why/How 格式的 commit message |
| `/code-review` | Push 前 review 整個 branch |
| `/pre-commit-check` | Commit 前格式化 + lint + type check |
| `/collect-pr-feedback` | 收集 PR 上所有 review feedback |
| `/file-bug-issue` | 為無法修復的 bug 開 GitHub issue |
| `/publish-tasks` | 將 tasks 發布為 GitHub issues（供 Remote Agent 使用） |

## 多 Repo 同步

如果你的專案由多個 repo 組成，可以設定自動同步：

1. 編輯 `.claude/sync.sh`，在 `REPOS` 陣列中填入子專案名稱
2. 編輯 `.github/workflows/sync-shared-config.yml`，在 `matrix.repo` 中填入子專案
3. 在 GitHub 設定 `REPO_SYNC_TOKEN` secret（需要跨 repo 存取權限）

## 前置需求

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) — `npm install -g @anthropic-ai/claude-code`
- [GitHub CLI](https://cli.github.com/) — 用於 PR、issue、CI 操作
- Node.js 20+ / Python 3.12+（依你的專案需求）
- `jq` — hooks 和 sync 腳本使用

## License

MIT
