#!/usr/bin/env bash
# scope:XS handler — plan+code in one PR (plan §5.1 Blueprint).
#
# Usage: xs.sh <repo> <issue_num> <state>
#
# Blueprint:
#   deterministic: setup worktree, checkout branch, source policy
#   agentic:       LLM writes code (Sonnet)
#   verification:  pnpm lint && pnpm test
#   deterministic: push → open PR

set -euo pipefail

REPO="${1:?Usage: xs.sh <repo> <issue_num> <state>}"
ISSUE_NUM="${2:?Usage: xs.sh <repo> <issue_num> <state>}"
STATE="${3:-needs-code}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DISPATCH_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
# Source policy enforcement
# shellcheck source=../policy/enforce.sh
source "${DISPATCH_DIR}/policy/enforce.sh"

ISSUE_KEY="${REPO}#${ISSUE_NUM}"
SCOPE_LABEL="scope:XS"

log() { echo "[handler:xs] $*"; }

# ── defense-in-depth: high-risk repo guard (plan §1, defense-in-depth) ────────
# This check is independent of state.ts — even if state routing is bypassed,
# handlers refuse to open auto-PR for storage/infra.
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
  log "Token budget exceeded for ${ISSUE_KEY} — aborting"
  safe_run "gh issue edit ${ISSUE_NUM} --repo daodaoedu/${REPO} --add-label human-coding" || true
  safe_run "gh issue comment ${ISSUE_NUM} --repo daodaoedu/${REPO} --body '⚠️ Token budget exceeded (scope:XS cap 50k). Escalating to human.'" || true
  exit 1
fi

# Race detection: re-query labels before destructive action
LABELS=$(gh issue view "${ISSUE_NUM}" --repo "daodaoedu/${REPO}" --json labels \
  --jq '[.labels[].name | @text] | join(",")' 2>/dev/null || echo "")

if echo "${LABELS}" | grep -q "human-driving"; then
  log "⏸️ human-driving detected on re-query — aborting"
  exit 0
fi
if echo "${LABELS}" | grep -q "automation:hold"; then
  log "⏸️ automation:hold detected on re-query — aborting"
  exit 0
fi

# Get issue slug for branch name
SLUG=$(gh issue view "${ISSUE_NUM}" --repo "daodaoedu/${REPO}" --json title \
  --jq '.title | ascii_downcase | gsub("[^a-z0-9]+"; "-") | ltrimstr("-") | rtrimstr("-") | .[0:40]' \
  2>/dev/null || echo "issue")

BRANCH="auto/${ISSUE_NUM}-${SLUG}"

# Check if branch already exists (idempotent — don't open second PR)
EXISTING_PR=$(gh pr list --repo "daodaoedu/${REPO}" --head "${BRANCH}" --json number \
  --jq '.[0].number' 2>/dev/null || echo "")
if [[ -n "${EXISTING_PR}" ]]; then
  log "PR already exists (#${EXISTING_PR}) for branch ${BRANCH} — skipping"
  exit 0
fi

# Get model for this stage
MODEL=$(pnpm --silent tsx "${DISPATCH_DIR}/model-router.ts" route handler 2>/dev/null || echo "claude-sonnet-4-6")

log "Branch: ${BRANCH}, Model: ${MODEL}"

# ── deterministic: verify base branch is dev/main, never push there ───────────
# (actual push target will be BRANCH, base for PR is dev)

log "scope:XS handler: plan+code in one PR for ${REPO}#${ISSUE_NUM}"
log "State: ${STATE}"

# ── agentic: (stubbed — real handler would invoke claude code here) ───────────
# In production: claude --model ${MODEL} -p "..." to write code in the repo
# For now, scaffold shows the correct structure

log "Agentic phase: would invoke ${MODEL} to implement ${ISSUE_KEY}"

# ── verification: run lint + test ────────────────────────────────────────────
# verification-loop.sh wraps this entire handler, so individual lint/test
# failures here propagate up correctly.

log "XS handler complete — verification-loop.sh will run lint+test"
exit 0
