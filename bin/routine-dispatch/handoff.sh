#!/usr/bin/env bash
# Handles human-driving handoff (plan §6 Scenario B).
# Removes auto/auto:* labels and leaves an audit comment.
# Idempotent: if labels already removed, this is a no-op.
#
# Usage: handoff.sh <repo> <issue_num>

set -euo pipefail

REPO="${1:?Usage: handoff.sh <repo> <issue_num>}"
ISSUE_NUM="${2:?Usage: handoff.sh <repo> <issue_num>}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source policy enforcement
# shellcheck source=policy/enforce.sh
source "${SCRIPT_DIR}/policy/enforce.sh"

log() { echo "[handoff] $*"; }

TIMESTAMP="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

# Get current labels
CURRENT_LABELS=$(gh issue view "${ISSUE_NUM}" \
  --repo "daodaoedu/${REPO}" \
  --json labels \
  --jq '[.labels[].name]' 2>/dev/null || echo "[]")

# Check if auto label still present (idempotent check)
HAS_AUTO=$(echo "${CURRENT_LABELS}" | jq 'any(. == "auto")' 2>/dev/null || echo "false")

if [[ "${HAS_AUTO}" == "false" ]]; then
  log "auto label already removed — handoff already completed (idempotent)"
  exit 0
fi

log "Removing auto/auto:* labels from ${REPO}#${ISSUE_NUM}"

# Remove auto label
safe_run "gh issue edit ${ISSUE_NUM} --repo daodaoedu/${REPO} --remove-label auto" || true

# Remove auto:plan-only if present
AUTO_PLAN=$(echo "${CURRENT_LABELS}" | jq 'any(. == "auto:plan-only")' 2>/dev/null || echo "false")
if [[ "${AUTO_PLAN}" == "true" ]]; then
  safe_run "gh issue edit ${ISSUE_NUM} --repo daodaoedu/${REPO} --remove-label auto:plan-only" || true
fi

# Remove auto:auto-pr if present
AUTO_PR=$(echo "${CURRENT_LABELS}" | jq 'any(. == "auto:auto-pr")' 2>/dev/null || echo "false")
if [[ "${AUTO_PR}" == "true" ]]; then
  safe_run "gh issue edit ${ISSUE_NUM} --repo daodaoedu/${REPO} --remove-label auto:auto-pr" || true
fi

# Leave audit comment
safe_run "gh issue comment ${ISSUE_NUM} --repo daodaoedu/${REPO} --body '🤝 已交接給人類，routine 退場於 ${TIMESTAMP}'" || true

log "Handoff complete for ${REPO}#${ISSUE_NUM} at ${TIMESTAMP}"
