# Code review 報告：chore/board-status-workflow（2026-09-20）

Base `origin/main` @ 26e58e9；review snapshot 為 branch commits + 工作樹（排除 submodule 指標與他人未提交檔案）。

## 引擎執行狀況

| 引擎 | 模型 | 結果 |
|---|---|---|
| Codex | gpt-5.6-sol，`model_reasoning_effort=high` | **5 條 P2**（全部查證屬實，全部已修） |
| Claude | claude-haiku-4-5 | No findings（需 `--strict-mcp-config --mcp-config '{"mcpServers":{}}'`，否則本機 MCP tool 定義撐爆 200k 上限） |
| OpenCode | opencode/nemotron-3-ultra-free | No issues found（`hy3-free` 已下架，`--pure`／`--dir` flag 已移除） |
| OMP | openrouter/poolside/laguna-s-2.1:free | 4 條「Critical」**全部是捏造的程式碼**，已記入誤判知識庫（F 類 ×3） |

## Codex findings（全部已修，commit 07ea6cf）

| # | 問題 | 查證 | 處置 |
|---|---|---|---|
| 1 | `auditCards` 一律排除 `daodao#` PR，root-only 工作 merge 後永遠不會被抓到 | 屬實，lib.ts:61-63 | 改用 GraphQL `ConnectedEvent`（真 link）vs `CrossReferencedEvent`（只是提到）區分；`gh.ts` 帶出 `linked` |
| 2 | `status === null` 印成 `(none)` 但不報 | 屬實 | 新增「卡片沒有 Status」規則 |
| 3 | closed issue 停在 Review／Need Fix 不報 | 屬實，檢查只涵蓋三欄 | 改用 `OPEN_STATES` 五欄；**實跑立刻抓到 #238** |
| 4 | open PR 建議「移 In Progress」與本 PR 自己寫的契約矛盾 | 屬實，AGENTS.md 寫 PR 開了 → Review | 規則與 troubleshooting 表都改「移 Review」；連帶修正放錯欄的 #210 |
| 5 | 封存 `github-pipeline.md` 等三份後，5 處連結 404，README 還寫 Routine C 在跑 | 屬實 | 五處改指 gh-pipeline skill 或封存路徑；順手修 review-false-positive-research 的舊路徑 |

## OMP findings（全部誤判，未採納）

| 宣稱 | 實際 |
|---|---|
| `resolveStatus(input: string \| undefined): BoardOptionId`，undefined 會流進 `moveCard` | 實際簽章 `(input: string, aliases) => string \| null`（lib.ts:33-38）；board.ts:49 有守衛；repo 內無 `BoardOptionId`／`moveCard` |
| `DEAD_LABELS = ['stale','needs triage','routine-c']`，需資料遷移 | 實際是 auto／auto:*／needs-spec／dispatched／spec-pending／human-coding／manual；`gh label list` 查無 `routine-c` |
| 缺 `resolveStatus(undefined)` 會 throw 的測試 | 建立在上一條的捏造簽章上；既有測試已斷言無效別名回傳 null |
| `queryIssues` 沒有跳脫層 | repo 內不存在此函式 |

OMP 輸出開頭出現「I notice the environment tools seem limited」，與既知的 free 模型幻覺模式一致。

## 修正後重驗

vitest bin/pipeline 8/8、tsc、sync-config contract、node contract 16/16、review-knowledge fixture 8/8、product-status drift 0、`board.ts audit` 0 落差。

## 尚未驗證

CI 端的 Branch Base Check skip、Product Status Drift 綠燈、Routine C 停跑需 merge 後才有證據（#249 的 AC-04～06）。
