# Handoff: team-fix → team-verify (re-iteration)

## Fixes 套用摘要

### Fix-1：state.ts logic bug（worker-1）
- 修：state.ts:102 條件邏輯（spec-merged + isPlanOnly 衝突）
- 改：XS/S scope 加 early return `if (isHighRisk) return "stop-after-plan-done"`
- 驗：state tests 21/21 pass，新增 2 fixture（storage+spec-merged → stop-after-plan-done、infra+spec-merged → stop-after-plan-done）

### Fix-2 + Fix-3：enforce.sh + allowlist（worker-5）
- 修 Fix-2：enforce.sh 加 metachar rejection（;、|、&、`、$()、<()），bash 3.2 compat
- 修 Fix-3：tool-allowlist.json 移除 `^pnpm exec ` catch-all，改為具體 4 個 binary（vitest/tsc/shellcheck/husky）
- 驗：13 acceptance tests pass（5 injection cases + curl 被擋 + vitest 通過 + 原 6 個基本 case）

### Fix-4 + LOW（worker-3）
- 修 Fix-4：main.sh:46-53 加 step 0 呼叫 spec-merged-scan.ts，失敗只 log warn 不卡死
- 修 LOW1：@vitest/coverage-v8 加進 devDeps，pnpm install 完成
- 修 LOW2：openspec-headless.ts --help 改 exit 0

### Fix-5：handlers defense-in-depth（worker-1）
- xs.sh / s.sh 開頭加 HIGH_RISK_REPOS 守門
- m.sh 在 Phase 2（needs-code）block 加守門，Phase 1（spec）保持允許
- l.sh 本來就 plan-only，無需守門

## ⚠️ 待 verify 確認的事

1. **Worker-1 自稱「confirmed live」（m.sh 對 daodao-storage:42 跑出 comment）** — 這是真的打到 GitHub API 還是 dry-run？需要 verifier 看 `gh issue view 42 --repo daodaoedu/daodao-storage` 確認沒留下測試 comment 污染（若有要 worker 補刪）
2. **All 3 worker 的 first message 都報 done，second message 是 "already done in prior session" 重複確認** — 這很正常（worker 重啟後 re-confirm），但 verifier 應以 disk + git 真實狀態為準
3. **Cross-fix 整合**：worker-3 改了 main.sh 加 spec-merged-scan call，worker-1 改了 handlers 加 DiD。整合後 main.sh → handlers 全鏈是否仍可跑？

## 修完條件再驗

- 3 個 must-fix 對應 fixture 全 pass
- shellcheck 全綠
- 全 bin/ 模組 vitest pass
- Verifier + Critic 兩者均 APPROVE → shutdown team
