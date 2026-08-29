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
  ".github/review-knowledge/**"; do
  grep -Fq -- "- '$path'" "$WORKFLOW" || fail "push paths 未監聽 $path"
done

grep -Fq 'for skill in collect-pr-feedback code-review; do' "$WORKFLOW" \
  || fail "sync workflow 未同步 code-review skill"

for script in retrieve-context.sh test-retrieve-context.sh test-code-review-contract.sh; do
  grep -Fq "$script" "$WORKFLOW" || fail "sync workflow 未包含 $script"
done

grep -Fq 'git status --porcelain -- .claude .github/workflows .github/scripts' "$WORKFLOW" \
  || fail "變更偵測未涵蓋 untracked scripts"
grep -Fq 'git add -f .claude/ .github/workflows/ .github/scripts/' "$WORKFLOW" \
  || fail "commit scope 未包含 scripts"
grep -Fq 'chore/sync-claude-config-${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT}' "$WORKFLOW" \
  || fail "同步 branch 名稱未使用唯一 run identity"
grep -Fq 'gh pr merge "$PR_URL" --squash --admin --delete-branch' "$WORKFLOW" \
  || fail "缺少立即 bot merge"
if grep -Fq 'gh pr merge "$PR_URL" --squash --admin --delete-branch 2>/dev/null' "$WORKFLOW"; then
  fail "admin merge 不得隱藏 gh 錯誤"
fi
grep -Fq '::error::Admin merge failed; inspect the gh error above' "$WORKFLOW" \
  || fail "同步失敗未讓 workflow 告警"

echo "✅ sync shared-config workflow contract tests passed"
grep -Fq 'cp .github/review-knowledge/false-positives.jsonl' "$WORKFLOW" \
  || fail "sync workflow 未同步 review-knowledge jsonl"
grep -Fq 'review-knowledge.cjs' "$WORKFLOW" || fail "sync workflow 未同步 review-knowledge.cjs"
