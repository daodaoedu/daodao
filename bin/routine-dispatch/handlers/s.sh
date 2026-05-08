#!/usr/bin/env bash
# scope:S handler — plan.md + code in one PR, test-first enforced (plan §5.6).
#
# Usage: s.sh <repo> <issue_num> <state>
#
# Test-first order (§5.6):
#   1. commit "test: <name>" — must be RED (fail)
#   2. commit "feat/fix: <name>" — must be GREEN (pass)
#   3. push → PR

set -euo pipefail

REPO="${1:?Usage: s.sh <repo> <issue_num> <state>}"
ISSUE_NUM="${2:?Usage: s.sh <repo> <issue_num> <state>}"
# STATE is passed but used implicitly in log; suppress unused warning
# shellcheck disable=SC2034
STATE="${3:-needs-code}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DISPATCH_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Source policy enforcement
# shellcheck source=../policy/enforce.sh
source "${DISPATCH_DIR}/policy/enforce.sh"

ISSUE_KEY="${REPO}#${ISSUE_NUM}"
SCOPE_LABEL="scope:S"

log() { echo "[handler:s] $*"; }

# ── defense-in-depth: high-risk repo guard ────────────────────────────────────
HIGH_RISK_REPOS=("daodao-storage" "daodao-infra")
for hrr in "${HIGH_RISK_REPOS[@]}"; do
  if [[ "${REPO}" == "${hrr}" ]]; then
    log "🛡️ defense-in-depth: high-risk repo ${REPO} refuses auto-pr"
    safe_run "gh issue comment ${ISSUE_NUM} --repo daodaoedu/${REPO} --body '🛡️ Auto-PR refused (high-risk repo defense-in-depth).'" || true
    exit 6
  fi
done

# ── deterministic: pre-flight ─────────────────────────────────────────────────

# Token budget check
BUDGET_OK=$(pnpm --silent tsx "${DISPATCH_DIR}/token-budget.ts" check "${ISSUE_KEY}" "${SCOPE_LABEL}" 2>/dev/null || echo "exceeded")
if [[ "${BUDGET_OK}" == "exceeded" ]]; then
  log "Token budget exceeded — aborting"
  safe_run "gh issue edit ${ISSUE_NUM} --repo daodaoedu/${REPO} --add-label human-coding" || true
  safe_run "gh issue comment ${ISSUE_NUM} --repo daodaoedu/${REPO} --body '⚠️ Token budget exceeded (scope:S cap 200k). Escalating to human.'" || true
  exit 1
fi

# Race detection: re-query labels before destructive action
LABELS=$(gh issue view "${ISSUE_NUM}" --repo "daodaoedu/${REPO}" --json labels \
  --jq '[.labels[].name | @text] | join(",")' 2>/dev/null || echo "")

if echo "${LABELS}" | grep -q "human-driving"; then
  log "⏸️ human-driving on re-query — aborting"
  exit 0
fi
if echo "${LABELS}" | grep -q "automation:hold"; then
  log "⏸️ automation:hold on re-query — aborting"
  exit 0
fi

# Branch dedup check
SLUG=$(gh issue view "${ISSUE_NUM}" --repo "daodaoedu/${REPO}" --json title \
  --jq '.title | ascii_downcase | gsub("[^a-z0-9]+"; "-") | ltrimstr("-") | rtrimstr("-") | .[0:40]' \
  2>/dev/null || echo "issue")
BRANCH="auto/${ISSUE_NUM}-${SLUG}"

EXISTING_PR=$(gh pr list --repo "daodaoedu/${REPO}" --head "${BRANCH}" --json number \
  --jq '.[0].number' 2>/dev/null || echo "")
if [[ -n "${EXISTING_PR}" ]]; then
  log "PR already exists (#${EXISTING_PR}) — skipping"
  exit 0
fi

MODEL=$(pnpm --silent tsx "${DISPATCH_DIR}/model-router.ts" route handler 2>/dev/null || echo "claude-sonnet-4-6")

log "Branch: ${BRANCH}, Model: ${MODEL}"
log "scope:S handler: test-first plan+code PR for ${REPO}#${ISSUE_NUM}"

# ── agentic: test-first (§5.6) ───────────────────────────────────────────────
# In production flow:
#   1. LLM writes tests → commit "test: <name>"
#   2. Run pnpm test → must FAIL (if passes, escalate — test doesn't cover behavior)
#   3. LLM writes implementation → commit "feat: <name>"
#   4. Run pnpm test → must PASS

log "Agentic phase (test-first): would invoke ${MODEL} for ${ISSUE_KEY}"
log "  Step 1: write tests (commit test:)"
log "  Step 2: verify tests RED"
log "  Step 3: write implementation (commit feat:)"
log "  Step 4: verify tests GREEN"

log "S handler complete — verification-loop.sh will run lint+test"
exit 0
