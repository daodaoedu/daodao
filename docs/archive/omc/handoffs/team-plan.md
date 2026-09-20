# Handoff: team-plan → team-exec

## Decided
- **Scope**：Phase 1+2+3+4+5 Tier 1（Tier 2/3 — observability 擴充、Slack trigger、council、runtime isolation — defer 到下一輪 team run）
- **`bin/` 位置**：monorepo 根新建 `package.json` + `bin/`（與 `openspec/`、`docs/` 同層）；用 pnpm workspace 整合
- **Notion DB schema 狀態**：尚未補欄位。所有同步邏輯走 **relaxed mode + fail-loud fallback**（hard-coded：`plan-only` / `scope:M` / `target=daodao-f2e` + warning comment）
- **8 sub-repo（user 確認，原 plan 是 4 個）都是獨立 git repo**，不是 submodule：daodao-server / daodao-f2e / daodao-ai-backend / daodao-storage / daodao-admin-ui / daodao-infra / daodao-mcp / daodao-worker。所有 `bin/` 工具放 monorepo（daodao），`ISSUE_TEMPLATE` 與 `.husky/` 改由 team 提供 `templates/` + 使用者 checklist 手動 copy 到各 sub-repo
- **Defense in depth**：daodao-storage（SQL migration）與 daodao-infra（IaC）由 state.ts 規則 0 強制 plan-only，hard-coded，**不**從 env 讀，修改需 PR review
- **Team 規模**：5 個 executor worker + 後續 verifier + critic 各 1
- **依賴關係**：#1（bootstrap）必先完成；#2/#5/#6/#7/#9 依賴 #1。#8 依賴 #5/#6/#7

## Rejected
- bin/ 放 daodao-server（跨層不乾淨）
- bin/ 放 tooling/ 子目錄（多打字、routine prompt 變複雜）
- 8 worker（overkill）
- 3 worker（太慢）
- 預設 fail-loud 模式（user 還沒補 Notion schema）

## Risks
- worker 跑 #2 時 schema-validate 必須默認 ON，但 entry 必須走 relaxed mode（fallback 鎖死）
- #8 dispatch core 是依賴密集點，若 #5/#6/#7 任一 fail，整個 #8 卡住
- 4 sub-repo 不一定有 push 權限，所以 ISSUE_TEMPLATE / .husky 改由 template + checklist
- `pnpm tsx` 在 monorepo 根需要 pnpm workspace 設定（worker 寫 #1 時要注意）

## Files（team 將建立）
- `/package.json`、`/tsconfig.json`、`/pnpm-workspace.yaml`、`/.gitignore` 追加
- `/bin/notion-sync/{notion-client,dedup,sync,types,schema-validate}.ts` + `__tests__/`
- `/bin/setup-auto-labels.sh`
- `/bin/openspec-headless.ts`
- `/bin/pipeline-status.ts`
- `/bin/routine-dispatch/{main.sh, state.ts, handoff.sh, spec-merged-scan.ts, state-store.json}`
- `/bin/routine-dispatch/handlers/{xs,s,m,l}.sh`
- `/bin/routine-dispatch/policy/{tool-allowlist.json, write-path-blocklist.json, enforce.sh}`
- `/bin/routine-dispatch/{verification-loop.sh, estimate-context.ts, token-budget.ts, model-router.ts}`
- `/docs/automation/{architecture, troubleshooting, manual-issue-to-routine, routine-a-prompt, routine-b-prompt-diff, pre-commit-setup, pipeline-status}.md`
- `/templates/{issue-template-auto.md, husky-pre-commit.sh}`（user copy 到 4 sub-repo 用）

## Remaining（給 team-exec 做）
- 12 個 subtasks 完整實作
- bin/notion-sync/ + bin/routine-dispatch/ unit test coverage ≥ 80%（vitest）
- 所有 *.sh 過 shellcheck
- 整合 smoke：`pnpm tsx bin/notion-sync/sync.ts --dry-run`（無 DB 也應 exit 0）+ `bash bin/setup-auto-labels.sh --dry-run`

## User checklist（team 完成後必須由 user 做的人工步驟）
1. **Notion DB**：加 8 個必要欄位（Auto Mode / Scope / Target Repo / Sync to GitHub / GitHub Issue / Acceptance Criteria / Notion Page ID formula）
2. **Notion API key**：從 Notion 設定拿 token
3. **Claude Code Console**：
   - 新建 Routine A，貼上 `docs/automation/routine-a-prompt.md` 的內容（含 NOTION_API_KEY 注入到 env）
   - 改既有 trig_01KATY routine 的 prompt，照 `docs/automation/routine-b-prompt-diff.md` 改寫
4. **每 sub-repo**（全 8 個：daodao-server、daodao-f2e、daodao-ai-backend、daodao-storage、daodao-admin-ui、daodao-infra、daodao-mcp、daodao-worker）：
   - copy `templates/issue-template-auto.md` → 該 repo `.github/ISSUE_TEMPLATE/auto.md`
   - copy `templates/husky-pre-commit.sh` → 該 repo `.husky/pre-commit` + 跑 `pnpm install` 觸發 husky
   - 跑 `bash <monorepo>/bin/setup-auto-labels.sh <sub-repo>` 建 13 個 labels
