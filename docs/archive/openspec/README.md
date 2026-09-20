# `openspec/` 退役歸檔

OpenSpec 於 2026-09-20 退役，原 repo 根目錄的 `openspec/` 整包封存於此，**結構不變**：

| 路徑 | 內容 |
|---|---|
| `specs/` | 已定稿的 capability specs（66 個目錄，每個一份 `spec.md`） |
| `changes/` | 退役時尚未 archive 的 change 目錄（下列 23 個），內含 `proposal.md`／`design.md`／`tasks.md`／`specs/` |
| `changes/archive/` | 已 archive 的 change（21 個目錄、149 檔） |
| `config.yaml` | 原 OpenSpec 專案設定（context 與 proposal／design／tasks 撰寫規則） |

歸檔內文仍保留原 `openspec/...` 路徑字樣，屬歷史紀錄，未改寫；把 `openspec/` 換成 `docs/archive/openspec/` 即可對應。

## 退役時未 archive 的 change

- `add-ai-service-management`
- `add-learner-persona`
- `admin-panel-overhaul`
- `buddy-ember`
- `cohort-setup-panel`
- `daily-inspiration-card`
- `dao-dao-agent`
- `encouragement-messages`
- `explore-activities-page`
- `future-letter`
- `group-challenge`
- `group-messages`
- `growth-map`
- `island-2d-spatial`
- `island-3d`
- `learning-harness`
- `lighthouse`
- `practice-create-flow`
- `practice-journey-export`
- `practice-summary-core`
- `practice-summary-depth`
- `unified-analytics-tracking`
- `wishpool-roadmap`

## 現行做法

規格與需求改以 `docs/product/` 與 GitHub Issue（`gh-card` 模板，Acceptance snapshot 直接填本卡驗收契約）為準；不再建立 OpenSpec change，也不再讀取 `tasks.md` 派工。相關流程入口見 `docs/development-skills-and-workflow.md`。
