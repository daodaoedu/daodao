# Handoff: team-exec → team-verify

## Decided
- 全 12 subtask 完成（#1~#12）
- 5 worker 並行作業約 8 分鐘（17:53 ~ 18:01）
- 累計 ~120+ unit tests 通過（notion-sync 18 + spec-merged-scan 18 + openspec-headless 15 + token/model/context 30 + pipeline-status 16 + state 19 + 其他）
- 全部 shell script 過 shellcheck

## Files 全清單（已建立）
**Tooling root**：
- /package.json、/tsconfig.json、/pnpm-workspace.yaml、/.gitignore（追加）

**bin/notion-sync/**（worker-1）：
- notion-client.ts、dedup.ts、sync.ts、types.ts、schema-validate.ts、__tests__/

**bin/setup-auto-labels.sh**（worker-2）：14 fixed labels × 8 sub-repo

**bin/openspec-headless.ts + __tests__/**（worker-4）：含 fallback 路徑

**bin/routine-dispatch/**：
- spec-merged-scan.ts、state-store.json（worker-2）
- policy/{tool-allowlist.json, write-path-blocklist.json, enforce.sh}（worker-5）
- verification-loop.sh、estimate-context.ts、token-budget.ts、model-router.ts（worker-3）
- main.sh、state.ts、handoff.sh、handlers/{xs,s,m,l}.sh（worker-1）
- kill-switch.sh（worker-2）

**bin/pipeline-status.ts**（worker-2）

**templates/**：issue-template-auto.md、husky-pre-commit.sh

**docs/automation/**：6 個 markdown（worker-3）+ pre-commit-setup.md（worker-5）+ routine-a-prompt.md / routine-b-prompt-diff.md（worker-4）

## Rejected during execution
- 把 .husky/pre-commit 直接 push 到 8 個 sub-repo（改提供 template + user checklist）
- 把 routine prompt 直接寫到 Claude Code Console（改為產 markdown 給 user 貼上）

## Risks（給 verifier 留意）
1. **policy enforce.sh 的 bash 3.2 compat**：worker-5 改用 while/read 替代 mapfile（macOS 預設 bash 3.2）— verify 是否真的在 macOS bash 3.2 跑得起來
2. **state.ts 規則 0 hard-coded list**：daodao-storage / daodao-infra 的字串 match — verify 邏輯不可被 env / config 覆蓋
3. **worker-1 reporting accuracy**：worker-1 在訊息中 2 次錯誤把 #6 當成自己做的（實際是 worker-5）— 屬於 LLM hallucination；verify 時請以 TaskList + git 真實狀態為準
4. **openspec-headless fallback**：worker-4 提到 fallback 路徑會印 `⚠️ 用 fallback 路徑` — verify fallback 真的有觸發 stderr 警示
5. **Sub-repo 隔離承諾**：team 全程不應觸碰 daodao-* sub-repo 內容 — verify `git status` 在 8 sub-repo 都 clean
6. **整合驗證**：各 worker 自測通過，但跨 module 整合還沒驗 — handler 跑時是否真能 source enforce.sh + 用 token-budget + 用 model-router

## Remaining (給 team-verify 做)
- 跑全部 vitest（root + bin/）
- 跑全部 shellcheck（bin/**/*.sh、templates/*.sh）
- 驗證 plan §10 verification commands 可執行
- 驗證 plan §11.1 + §11.2 acceptance criteria 對應 file/test 都存在
- 跑 secret leak 自檢（grep NOTION_API_KEY in logs/code）
- 整合 smoke：tsx bin/notion-sync/sync.ts --dry-run（缺 NOTION_API_KEY 應 graceful）、bash bin/setup-auto-labels.sh --dry-run --all、bash bin/routine-dispatch/main.sh fixture-repo 1（mock）
- 8 sub-repo 不應有任何 untracked changes
- 終驗：critic 對照 plan 給 APPROVE / REVISE / REJECT verdict
