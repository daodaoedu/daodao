#!/usr/bin/env bash
# scope:L handler — spec PR only, add human-coding for code phase (plan §3).
#
# Usage: l.sh <repo> <issue_num> <state>
#
# L scope: only Phase 1 (spec PR). Human does the coding.
# After spec PR: add human-coding label.

set -euo pipefail

REPO="${1:?Usage: l.sh <repo> <issue_num> <state>}"
ISSUE_NUM="${2:?Usage: l.sh <repo> <issue_num> <state>}"
STATE="${3:-needs-spec}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DISPATCH_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
MONOREPO_ROOT="$(cd "${DISPATCH_DIR}/../.." && pwd)"

# Source policy enforcement
# shellcheck source=../policy/enforce.sh
source "${DISPATCH_DIR}/policy/enforce.sh"

ISSUE_KEY="${REPO}#${ISSUE_NUM}"
SCOPE_LABEL="scope:L"

log() { echo "[handler:l] $*"; }

# ── deterministic: pre-flight ─────────────────────────────────────────────────

# Token budget check
BUDGET_OK=$(pnpm --silent tsx "${DISPATCH_DIR}/token-budget.ts" check "${ISSUE_KEY}" "${SCOPE_LABEL}" 2>/dev/null || echo "exceeded")
if [[ "${BUDGET_OK}" == "exceeded" ]]; then
  log "Token budget exceeded — aborting"
  safe_run "gh issue edit ${ISSUE_NUM} --repo daodaoedu/${REPO} --add-label human-coding" || true
  safe_run "gh issue comment ${ISSUE_NUM} --repo daodaoedu/${REPO} --body '⚠️ Token budget exceeded (scope:L cap 1.5M). Escalating to human.'" || true
  exit 1
fi

# Race detection
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

SLUG=$(gh issue view "${ISSUE_NUM}" --repo "daodaoedu/${REPO}" --json title \
  --jq '.title | ascii_downcase | gsub("[^a-z0-9]+"; "-") | ltrimstr("-") | rtrimstr("-") | .[0:30]' \
  2>/dev/null || echo "issue")

REPO_PREFIX="${REPO##daodao-}"
CHANGE_ID="${REPO_PREFIX}-${ISSUE_NUM}-${SLUG}"

log "scope:L handler: Phase 1 only (spec PR + human-coding label)"

if [[ "${STATE}" == "needs-spec" ]]; then
  SPEC_MODEL=$(pnpm --silent tsx "${DISPATCH_DIR}/model-router.ts" route spec 2>/dev/null || echo "claude-opus-4-7")
  log "Spec model: ${SPEC_MODEL}, change: ${CHANGE_ID}"

  OPENSPEC_HEADLESS="${MONOREPO_ROOT}/bin/openspec-headless.ts"
  if [[ -f "${OPENSPEC_HEADLESS}" ]]; then
    if OPENSPEC_NONINTERACTIVE=1 timeout 60 \
      pnpm tsx "${OPENSPEC_HEADLESS}" \
        --issue-num "${ISSUE_NUM}" \
        --repo "${REPO}" \
        --slug "${SLUG}" \
        < /dev/null; then
      log "openspec-headless succeeded"
    else
      EXIT_CODE=$?
      log "openspec-headless exited ${EXIT_CODE}"
      exit "${EXIT_CODE}"
    fi
  else
    log "openspec-headless.ts not found — would run spec generation here"
  fi

  # Add spec-pending + human-coding labels
  safe_run "gh issue edit ${ISSUE_NUM} --repo daodaoedu/${REPO} --add-label spec-pending" || true
  safe_run "gh issue edit ${ISSUE_NUM} --repo daodaoedu/${REPO} --add-label human-coding" || true

  # Leave handoff comment
  safe_run "gh issue comment ${ISSUE_NUM} --repo daodaoedu/${REPO} --body '📋 scope:L: spec PR opened. Code implementation requires human engineer. Please pick this up when ready.'" || true

  log "L Phase 1 complete — spec-pending and human-coding labels added"
else
  log "L handler: state=${STATE} — nothing to do (L scope never proceeds to code phase)"
fi

exit 0
