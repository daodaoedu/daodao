# `.omc/` 退役歸檔

原 `.omc/` 目錄（OMP / oh-my-pi 工具的工作區）於 2026-09-20 退役，專案已不再使用 OMP/omc 工具。有價值的內容依下表搬遷至 `docs/`；`sessions/`、`state/`、`logs/` 等執行期資料未保留。

| 舊路徑 | 新路徑 | 說明 |
|---|---|---|
| `.omc/plans/*.md` | `docs/plans/` | 規劃文件（8 份） |
| `.omc/plans/issue-drafts/` | `docs/plans/issue-drafts/` | gh-card / file-bug-issue 的 issue 草稿與發布紀錄 |
| `.omc/plans/requirements/` | `docs/plans/requirements/` | prd-generation 草稿目錄（退役時尚無檔案，僅 skill 路徑改指此處） |
| `.omc/research/` | `docs/research/` | 研究筆記 |
| `.omc/specs/` | `docs/archive/omc/specs/` | 舊 spec 草稿 |
| `.omc/openspec-audit/` | `docs/archive/omc/openspec-audit/` | OpenSpec 稽核報告、協定、批次與每份 spec 明細 |
| `.omc/handoffs/` | `docs/archive/omc/handoffs/` | omc-teams 交接文件 |
| `.omc/artifacts/` | `docs/archive/omc/artifacts/` | omc 產出物 |
| `.omc/sessions/`、`.omc/state/`、`.omc/logs/` | （已刪除） | 執行期資料，原本即在 `.gitignore` |

歸檔文件內文仍保留原 `.omc/...` 路徑字樣（例如 `openspec-audit/REPORT.md`、`PROTOCOL.md`），屬歷史紀錄，未改寫；對照本表即可找到新位置。
