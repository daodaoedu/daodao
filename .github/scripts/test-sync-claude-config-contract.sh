#!/usr/bin/env bash
# Contract checks for the cross-repository shared-config sync workflow.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WORKFLOW="$SCRIPT_DIR/../workflows/sync-claude-config.yml"

fail() {
  echo "❌ $1"
  exit 1
}

for path in \
  ".claude/skills/code-review/**" \
  ".github/workflows/auto-pr-description.yml" \
  ".github/workflows/code-review.yml" \
  ".github/scripts/retrieve-context.sh" \
  ".github/scripts/test-retrieve-context.sh" \
  ".github/scripts/test-code-review-contract.sh" \
  ".github/scripts/review-knowledge.cjs" \
  ".github/workflows/pr-evidence-gate.yml" \
  ".github/scripts/check-pr-evidence.sh" \
  ".github/scripts/test-pr-evidence.sh" \
  ".github/review-knowledge/**"; do
  grep -Fq -- "- '$path'" "$WORKFLOW" || fail "push paths 未監聽 $path"
done

sync_skills=$(sed -n 's/^[[:space:]]*for skill in \(.*\); do$/\1/p' "$WORKFLOW")
for required_skill in collect-pr-feedback code-review; do
  case " $sync_skills " in
    *" $required_skill "*) ;;
    *) fail "sync workflow 未同步 $required_skill skill" ;;
  esac
done

for script in retrieve-context.sh test-retrieve-context.sh test-code-review-contract.sh check-pr-evidence.sh test-pr-evidence.sh; do
  grep -Fq "$script" "$WORKFLOW" || fail "sync workflow 未包含 $script"
done
grep -Fq "pr-evidence-gate.yml" "$WORKFLOW" || fail "sync workflow 未同步 pr-evidence-gate.yml（PR 驗證證據 CI 閘門）"

grep -Fq 'git status --porcelain -- .claude .github/workflows .github/scripts' "$WORKFLOW" \
  || fail "變更偵測未涵蓋 untracked scripts"
grep -Fq 'git add -f .claude/ .github/workflows/ .github/scripts/' "$WORKFLOW" \
  || fail "commit scope 未包含 scripts"
grep -Fq 'chore/sync-claude-config-${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT}' "$WORKFLOW" \
  || fail "同步 branch 名稱未使用唯一 run identity"
if grep -Eq 'gh pr merge|--admin|--auto' "$WORKFLOW"; then
  fail "同步不得在 required checks/approval 尚未完成時合併 PR"
fi
grep -Fq 'PR awaiting checks and review: $PR_URL' "$WORKFLOW" \
  || fail "同步必須清楚回報 PR 尚待檢查與 review"

echo "✅ sync shared-config workflow contract tests passed"
grep -Fq 'cp .github/review-knowledge/false-positives.jsonl' "$WORKFLOW" \
  || fail "sync workflow 未同步 review-knowledge jsonl"
grep -Fq 'review-knowledge.cjs' "$WORKFLOW" || fail "sync workflow 未同步 review-knowledge.cjs"
