#!/usr/bin/env bash
# Dispatch entry for routine-dispatch (plan §8 Phase 3.1).
#
# Usage: main.sh <repo> <issue_num> [--legacy]
#
# Exit codes:
#   0 — dispatched successfully (or skipped)
#   1 — usage error
#   3 — policy blocked
#   4 — context overflow
#   5 — verification failed / retries exhausted

set -euo pipefail

REPO="${1:?Usage: main.sh <repo> <issue_num> [--legacy]}"
ISSUE_NUM="${2:?Usage: main.sh <repo> <issue_num> [--legacy]}"
LEGACY="${3:-}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MONOREPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# Source policy enforcement
# shellcheck source=policy/enforce.sh
source "${SCRIPT_DIR}/policy/enforce.sh"

log() { echo "[dispatch] $*"; }
err() { echo "[dispatch] ERROR: $*" >&2; }

# --legacy fallback: run old logic and exit
if [[ "${LEGACY}" == "--legacy" ]]; then
  log "Running in legacy mode — new dispatch logic skipped"
  exit 0
fi

# Kill switch checks
if [[ -f "${MONOREPO_ROOT}/.automation-paused" ]]; then
  log "⏸️ .automation-paused present — skipping all dispatch"
  exit 0
fi

if [[ -f "${MONOREPO_ROOT}/.automation-paused-${REPO}" ]]; then
  log "⏸️ .automation-paused-${REPO} present — skipping ${REPO}"
  exit 0
fi

log "step 0: spec-merged-scan"
LOG_FILE="${MONOREPO_ROOT}/.omc/logs/routine-b-latest.log"
mkdir -p "$(dirname "${LOG_FILE}")"
if [ -n "${PROC_TRACE:-}" ]; then
  echo "spec-merged-scan:called" >>"${LOG_FILE}"
fi
if ! pnpm tsx "${SCRIPT_DIR}/spec-merged-scan.ts" 2>>"${LOG_FILE}"; then
  log "⚠️ spec-merged-scan failed, continuing dispatch with stale labels"
fi

log "Deriving state for ${REPO}#${ISSUE_NUM}"

# Pre-fetch labels in bash where gh auth is reliable, then pass to state.ts
# (gh inside TypeScript execSync may not inherit cloud auth correctly)
_LABELS=$(gh issue view "${ISSUE_NUM}" --repo "daodaoedu/${REPO}" \
  --json labels --jq '[.labels[].name] | join(",")' 2>/dev/null || echo "")
log "Labels: ${_LABELS}"

# Derive dispatch state
STATE=$(ISSUE_LABELS="${_LABELS}" pnpm --silent tsx "${SCRIPT_DIR}/state.ts" "${REPO}" "${ISSUE_NUM}" 2>/dev/null)
log "State: ${STATE}"

case "${STATE}" in
  human-blocked)
    log "Issue is on automation:hold — skipping this round"
    exit 0
    ;;
  human-driving)
    log "human-driving detected — running handoff"
    bash "${SCRIPT_DIR}/handoff.sh" "${REPO}" "${ISSUE_NUM}"
    exit 0
    ;;
  manual-mode)
    log "Manual mode — skipping"
    exit 0
    ;;
  stop-after-plan-done)
    log "stop-after-plan: plan phase complete, not proceeding to code"
    exit 0
    ;;
  done)
    log "Issue already done — skipping"
    exit 0
    ;;
  spec-in-review)
    log "Spec PR in review — waiting for merge"
    exit 0
    ;;
  needs-spec)
    log "Dispatching to scope handler for spec phase"
    ;;
  needs-code)
    log "Dispatching to scope handler for code phase"
    ;;
  *)
    err "Unknown state: ${STATE}"
    exit 1
    ;;
esac

# Get scope label
SCOPE=$(gh issue view "${ISSUE_NUM}" --repo "daodaoedu/${REPO}" --json labels \
  --jq '.labels[].name | select(startswith("scope:")) | ltrimstr("scope:")' 2>/dev/null || echo "M")
SCOPE="${SCOPE:-M}"

log "Scope: ${SCOPE}, dispatching handler"

HANDLER="${SCRIPT_DIR}/handlers/$(echo "${SCOPE}" | tr '[:upper:]' '[:lower:]').sh"

if [[ ! -f "${HANDLER}" ]]; then
  err "No handler found for scope ${SCOPE}: ${HANDLER}"
  exit 1
fi

# Run handler via verification loop
bash "${SCRIPT_DIR}/verification-loop.sh" "${REPO}" "${ISSUE_NUM}" \
  bash "${HANDLER}" "${REPO}" "${ISSUE_NUM}" "${STATE}"
