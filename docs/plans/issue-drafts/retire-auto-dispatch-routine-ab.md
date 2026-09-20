# 退役自動派工 Routine A／B，pipeline 只保留 Routine C

> 工程交接模板，由 skill／開發補充。AC 為本卡新訂。

schemaVersion: 1
templateVersion: 1

## 需求摘要（白話）

**現況**：OpenSpec 已於 2026-09-20 退役（#237）。自動派工 Routine A（Board → Sub-repo Dispatch）的 Spec gate 讀 `openspec/changes/<slug>/tasks.md` 決定要拆哪些鏡像 issue，目錄不存在後只會把每張 Ready for Dev 卡退回 `needs-spec`；workflow 已手動 disable。Routine B（Claude cloud 實作）依賴 Routine A 的鏡像 issue，從未穩定跑通。目前所有開發都走人工 `dev-task`。

**要達成**：把 Routine A／B 的程式、workflow、skill 段落與 prompt 文件整批退役（封存到 `docs/archive/`），pipeline 只保留 Routine C（merged PR → Board Done）；`bin/pipeline/lib.ts` 只留 Routine C 用到的函式並維持測試綠燈。

**不包含**：
- Routine C 行為不變。
- `scripts/product_status_manifest.yml` 與 product-status-drift 紅燈——另開卡。
- 重新設計新的自動派工。

## 任務索引與責任

- 中央 Issue：daodaoedu/daodao#241 https://github.com/daodaoedu/daodao/issues/241
- 任務指派：沿用 GitHub Assignees
- Google 需求文件：無；依本卡與 #237 查證
- 核准需求快照：尚未產生
- Acceptance snapshot：本卡「驗收契約」
- POC：n/a：純工程清理
- 相關：#237（omc／OpenSpec 退役）、#236

## 目標與範圍

- 本次包含：
  1. 刪除 `bin/pipeline/dispatch.ts`、`bin/pipeline/review-evals.ts` 與其測試、`bin/openspec-headless.ts` 與其測試、`bin/__tests__/pipeline-status.test.ts`（import 的 `pipeline-status.js` 早已不存在）、`.github/workflows/pipeline-dispatch.yml`、`bin/setup-auto-labels.sh`（只服務自動派工 labels）。
  2. `bin/pipeline/lib.ts` 精簡為 Routine C 所需（`parseParentIssue`、`parseClosingIssues`、`buildProgressComment`、`buildAllDoneComment`），移除 `parseOpenSpecSlug`、`parseTasksMd`、`assignSectionsToRepos`、mirror／dispatch／needs-spec 相關；`lib.test.ts` 同步精簡；`types.ts` 移除無人使用的型別。
  3. 刪除 10 個 `.github/skills/openspec-*`（#237 已標 DEPRECATED）。
  4. `gh-pipeline` skill 改寫為只描述 Routine C；`references/agentic-flows.md`、`templates.md` 封存至 `docs/archive/automation/`；`.codex/skills/gh-pipeline` 薄入口同步。
  5. `docs/automation/`：`routine-a-prompt.md`、`routine-b-prompt-v2.md`、`routine-b-prompt-diff.md`、`manual-issue-to-routine.md`、`spec-drafter-spike.md` 封存至 `docs/archive/automation/`；`github-pipeline.md`、`github-issue-management.md`、`pipeline-status.md` 改寫成只剩 Routine C 的現況（`auto`／`auto:*`／`needs-spec`／`dispatched` labels 標為不再使用，不刪 label）。
  6. `.claude/settings.json` 移除 `Bash(openspec:*)`。
  7. 關閉 #219（#216 重複卡）。
- 風險：`sync-claude-config.yml` 會把 `.github/scripts` 與部分 skill 同步到 sub-repo，刪檔後要確認 contract test 仍綠；`review-knowledge.cjs` 不動。
- 涉及 repo：daodao（monorepo root）only。

## 驗收契約

| AC ID | Required | Given／When／Then | Repo | 必須證據 |
|---|---|---|---|---|
| AC-01 | yes | 刪除清單中的檔案後／`git grep -n "openspec\|dispatch.ts\|needs-spec" -- ':!docs/archive' ':!projects' ':!worktrees'`／只剩歷史敘述與 label 退役說明 | daodao | grep 輸出 |
| AC-02 | yes | `pnpm exec vitest run bin/pipeline`／lib.test.ts 通過且只測 Routine C 函式 | daodao | 測試輸出 |
| AC-03 | yes | `pipeline-board-sync.yml` 手動 `workflow_dispatch` 一次／成功，行為與退役前相同 | daodao | run URL |
| AC-04 | yes | 本機跑 CI 離線套件（spec-audit、test-integrity、skill-evals、required-workflow-triggers、collect-gate-protection、node script tests、sync-config contract）／全綠 | daodao | 輸出摘要 |
| AC-05 | yes | `gh-pipeline` SKILL.md 與 `docs/automation/github-pipeline.md` 只描述 Routine C；不再出現「Ready for Dev + auto 觸發派工」的現行指示 | daodao | diff |
| AC-06 | yes | #219 已關閉並註明重複 #216 | GitHub | issue 狀態 |

- Done 條件：PR merge 到 main；AC-03 在 merge 後跑一次。

## 執行政策與狀態

- 模式／writer：local / claude（human-driving）
- 已授權範圍：使用者 2026-09-20 同意方案 (a) 整條退役並執行
- Merge：人工；人工驗收：pending
- Ready 缺項：none
- 阻塞與下一步：none

## 跨 repo 交付索引

| Repo | 子 Issue | PR | 狀態 |
|---|---|---|---|
| daodao | n/a | 尚未開始 | todo |
