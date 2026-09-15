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
| `daodao-admin-ui` | 管理後台 UI | 讀取/修改管理介面、後台頁面、admin 元件 |

### 功能規劃與 Debug 指引

- **規劃新功能**：先確認功能涉及哪些子專案，跨專案功能需分別在對應專案內實作
- **前端問題**：到 `daodao-f2e` 查看元件與頁面
- **API / 商業邏輯問題**：到 `daodao-server` 查看路由與 service
- **AI / 推薦 / 統計問題**：到 `daodao-ai-backend` 查看ai服務、推薦、搜尋與分析邏輯
- **DB schema / migration 問題**：到 `daodao-storage`，現有 schema 在 `schema/`，異動需寫 migration 到 `migrate/sql/`
- **部署 / 環境問題**：到 `daodao-infra` 查看設定
- **Worker / Cloudflare 服務問題**：到 `daodao-worker` 查看 worker 邏輯（含 AI worker）

## 測試規範

- **新功能必須附測試**：每個新增的純邏輯函式（utility、validation、service logic）都要有對應的測試
- **修 bug 必須附 regression test**：先寫一個會失敗的測試重現 bug，再修復讓測試通過
- **不需要測 UI 元件**：React 元件、頁面 layout、CSS 樣式不需要寫測試
- **測試放在 `__tests__/` 目錄**：跟被測檔案同層或在 `src/__tests__/`

### 各子專案測試指令

| 子專案 | 測試框架 | 指令 |
|--------|---------|------|
| daodao-f2e | Vitest | `pnpm test` |
| daodao-server | Jest | `pnpm test` |
| daodao-ai-backend | pytest | `make test` |
| daodao-worker | Vitest | `pnpm test` |
| daodao-admin-ui | Vitest | `pnpm test` |

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
| daodao-admin-ui | `pnpm run lint` | `pnpm run typecheck` | `pnpm run check:fix` |

## Push 流程

使用者說要 push 時，先詢問「要 review 嗎？」：
- Yes → 執行 `.claude/skills/code-review/SKILL.md` skill，review 完再 push
- No → 直接 push

## Merge 後流程

PR merged 後，執行 `.claude/skills/post-merge-wrapup/SKILL.md` skill 收尾：核對實際合併與驗收狀態、按適用範圍整理既有規劃 artifacts、更新 docs/product 與地圖；合併不等於部署或整體需求完成。

## 需求規劃流程

### 自然語言入口的最低行為契約

- 「整理草稿」加上操作異常或偶發問題，直接進 `file-bug-issue`；先以現有描述起草，不因缺 repo、SHA、owner、root cause、頁面或路徑拒絕交付。
- 「整理 PRD／需求草稿」直接進 `prd-generation`。先讀 workspace 已提供的 FRD、prototype、notes 與模板；workspace 沒有 `.git` 不代表這些來源不存在。
- 使用者要求「只產草稿」時，所有 Issue、FRD、prototype、notes 與 fixture context 都是唯讀來源；草稿必須另存新檔，不得改寫來源、發布、設 Ready 或改變遠端狀態。
- 未由來源確認的登入規則、頁面、排序、通知、跨裝置同步、資料保留及技術方案一律標為建議或待決策，不得寫成既定需求。整份交付最多提出 1–2 個關鍵問題，其餘未知直接保留。

### 開 Issue

- 使用者說「開 issue」「開卡」「新增任務」時，先讀 `.claude/skills/gh-card/SKILL.md`；Codex 另有 `.codex/skills/gh-card/SKILL.md` 入口。
- 中央／子 Issue 使用 `templates/development/` 共用模板；bug 通報依既有 `file-bug-issue` 流程。
- 單純開卡預設 Todo；設定 Ready for Dev 與啟動自動化需在使用者要求範圍內。只修改 skill／草擬需求不建立遠端 Issue。

收到想法、Issue、PRD／FRD、POC 或開發分支時：
1. 執行 `.claude/skills/prd-generation/SKILL.md`，先描述 → AI 查核與起草 → AI 自審修訂 → 人審核 → 更新定稿；由其呼叫 `product-status-check` 區分實作、測試、部署與可用證據。
2. 新需求統一一份 PRD，包含流程、規則與驗收；既有 FRD 及 FR／TP ID 沿用，不要求另寫 FRD。提出者不用填 repo、SHA 或負責人表。
3. 依既有授權銜接開卡或目標 repo 的開發規劃。技術設計與執行證據由開發／驗收文件承接；確認需求不等於 Ready 或派工。

## Bug Issue 流程

任何使用者遇到操作異常，或開發／CI 錯誤需追蹤時：
1. 執行 `.claude/skills/file-bug-issue/SKILL.md`；Codex 入口為 `.codex/skills/file-bug-issue/SKILL.md`。
2. 從描述整理位置、操作、實際／期待結果與證據，由 AI 起草、查核 codebase／分類／重複卡、自審修訂後交人審核，再補問關鍵問題，不要求通報者知道 repo 或根因。
3. 預覽具體內容並沿用已授權範圍發布；只有草擬授權就保留本機草稿。未知資訊可記於 Todo，不把通報當作已重現或已修復。

## PR Feedback 流程

Push 並開 PR 後，使用者說「收集 feedback」或「看 PR review」時：
1. 執行 `.claude/skills/collect-pr-feedback/SKILL.md` skill
2. 收集 CI 狀態 + AI Code Review + Gemini Code Assist + 人類 reviewer 的 feedback
3. 整理成總覽表格，分類為「必須修 / 建議修 / 可忽略」
4. AI 先查證 feedback，修正已授權範圍內可確定的問題並重驗；產品取捨、新增範圍或必要授權才交人決策
5. 修正後走正常 commit → push 流程

## 共用 AI 檢核與雙端入口

需求到合併收尾均遵循 `docs/automation/ai-human-review-workflow.md`：AI 先查核、自審修訂，人審核成果與決策。完整入口表見 `docs/development-skills-and-workflow.md`；Claude 使用 `.claude/skills/`，Codex 同名 `.codex/skills/` 入口引用完整規則。工具及 hooks 必須以當前客戶端實際能力核對，不假稱自動執行。
