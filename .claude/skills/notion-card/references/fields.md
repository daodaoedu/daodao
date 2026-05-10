# Notion 欄位說明

DB ID: `3549cc8126978036803af61048468bde`
Data Source: `collection://3549cc81-2697-8166-8bad-000b27921b83`

---

## Task name（必填）
- 簡短動詞句，e.g., "新增 /health endpoint"、"修復登入後跳轉問題"

## Status
| 值 | 群組 | 說明 |
|----|------|------|
| `Not started` | to_do | **預設**（保守） |
| `Pending` | to_do | 等待中 |
| `In progress` | in_progress | 開發中 |
| `Review` | in_progress | 審查中 |
| `Done` | complete | 完成（Routine A 在 issue closed 後回寫） |
| `Not Considered` | complete | 不處理 |

> ⚠️ Pipeline plan 設計的 `Ready for Dev` 選項目前不存在 Status 欄位。  
> Routine A 的 sync 閘門需要對應現有選項，建議用 `In progress` 作為觸發條件，或請 PM 確認要新增 `Ready for Dev` 選項。

## Sync to GitHub（checkbox）
| 值 | 說明 |
|----|------|
| `false` | **預設**。不同步 |
| `true` | 搭配 Status 才會觸發 Routine A sync |

## Auto Mode
| 值 | 說明 |
|----|------|
| `plan-only` | **預設（保守）**。Pipeline 只跑到 plan 階段，不自動寫 code |
| `auto-pr` | 允許 pipeline 自動寫 code 並開 PR |
| `manual` | Routine B 完全不介入；Routine A 還是會建 GitHub issue，但 code 和 PR 由人類自行處理 |

## Scope
| 值 | Changed files cap | Token cap | 說明 |
|----|-------------------|-----------|------|
| `XS` | ≤3 | 50k | 極小改動，1-3 個檔案 |
| `S` | ≤10 | 200k | 小功能，明確範圍 |
| `M` | ≤30 | 800k | **預設（保守）**。中型，需 spec |
| `L` | — | 1.5M | 大型，只跑 spec，人類接手 code |

## Target Repo
| 值 | 說明 | 高風險 |
|----|------|--------|
| `daodao-server` | 後端服務 | |
| `daodao-f2e` | 前端 | |
| `daodao-ai-backend` | AI backend | |
| `daodao-storage` | DB/儲存層 | ⚠️ pipeline 強制 plan-only |
| `daodao-admin-ui` | 後台 UI | |
| `daodao-infra` | Infrastructure | ⚠️ pipeline 強制 plan-only |
| `daodao-mcp` | MCP servers | |
| `daodao-worker` | Background workers | |

## Acceptance Criteria（rich_text，建議填）
- Given/When/Then 格式最佳
- Pipeline 會帶入 GitHub issue body

## GitHub Issue（url，自動填寫）
- Routine A 建立 GitHub issue 後回寫
- 不需要手動填

## Priority
`Urgent` / `High` / `Medium` / `Normal`

## Feature
`主題實踐` / `通知` / `Email` / `LandingPage` / `我的小島` / `主頁` / `推薦` / `Onboarding` / `留言快速回應`

## Type
`optimization` / `QA`

## Assignee
person，填負責人

## Due date
ISO-8601 日期
