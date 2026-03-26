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
    └── daodao-worker/    # 背景任務
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
| daodao-worker | 背景任務 | [daodaoedu/daodao-worker](https://github.com/daodaoedu/daodao-worker) |
