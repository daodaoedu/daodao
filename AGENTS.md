# AI Agent Instructions

## 專案分工

daodao 是一個 monorepo，各子專案職責如下：

| 子專案 | 職責 | 什麼時候去這裡 |
|--------|------|----------------|
| `daodao-f2e` | 前端與 App | 讀取/修改 UI、頁面、元件、前端邏輯 |
| `daodao-server` | 後端 API | 讀取/修改 API、商業邏輯、後端服務 |
| `daodao-ai-backend` | AI 相關服務 | 統計分析、推薦系統、AI 功能開發與 debug |
| `daodao-storage` | DB 管理 | Schema 定義、migrations、資料庫結構變更 |
| `daodao-infra` | 基礎建設 | 部署、CI/CD、雲端資源、環境設定 |
| `daodao-worker` | Cloudflare Workers | AI 相關 worker 與其他免費服務（Cloudflare 平台） |

### 功能規劃與 Debug 指引

- **規劃新功能**：先確認功能涉及哪些子專案，跨專案功能需分別在對應專案內實作
- **前端問題**：到 `daodao-f2e` 查看元件與頁面
- **API / 商業邏輯問題**：到 `daodao-server` 查看路由與 service
- **AI / 推薦 / 統計問題**：到 `daodao-ai-backend` 查看ai服務、推薦、搜尋與分析邏輯
- **DB schema / migration 問題**：到 `daodao-storage`，現有 schema 在 `schema/`，異動需寫 migration 到 `migrate/sql/`
- **部署 / 環境問題**：到 `daodao-infra` 查看設定
- **Worker / Cloudflare 服務問題**：到 `daodao-worker` 查看 worker 邏輯（含 AI worker）

## Commit 流程

commit 時必須依序執行：

1. 先執行 `.claude/skills/pre-commit-check/SKILL.md` skill 跑品質檢查
2. 檢查通過後，執行 `.claude/skills/format-commit/SKILL.md` skill 產生 commit message
3. 使用者確認後才執行 git commit

### 各子專案品質檢查指令

| 子專案 | lint | typecheck | 自動修復 |
|--------|------|-----------|---------|
| daodao-f2e | `pnpm run lint` | `pnpm run typecheck` | `pnpm run check:fix` |
| daodao-server | `pnpm run lint` | `pnpm run typecheck` | `pnpm run lint:fix` |
| daodao-ai-backend | `make lint` | — | `make format` |
| daodao-worker | — | `pnpm run typecheck` | — |

## Push 流程

使用者說要 push 時，先詢問「要 review 嗎？」：
- Yes → 執行 `.claude/skills/code-review/SKILL.md` skill，review 完再 push
- No → 直接 push
