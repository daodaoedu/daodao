#!/usr/bin/env bash
# Kill switch checker for the automation pipeline.
#
# Provides: check_kill_switch <repo> <issue_num>
#   Returns 0 = OK to proceed
#           1 = paused (any kill switch active)
#
# Four granularities (checked in priority order):
#   1. .automation-paused          — global kill switch
#   2. .automation-paused-<repo>   — per-repo kill switch
#   3. issue label automation:hold — per-issue soft pause (requires gh CLI)
#   4. runtime checkpoint file     — .automation-paused-runtime (set by handler)
#
# Source this file in handlers:
#   source "$(dirname "$0")/../routine-dispatch/kill-switch.sh"
#   check_kill_switch daodao-f2e 42 || exit 0

set -euo pipefail

# Monorepo root: two levels up from this script (bin/routine-dispatch/)
_KILL_SWITCH_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
_ORG="daodaoedu"

# ---------------------------------------------------------------------------
# check_kill_switch <repo> <issue_num>
# Returns 0 (proceed) or 1 (paused).
# ---------------------------------------------------------------------------
check_kill_switch() {
  local repo="${1:-}"
  local issue_num="${2:-}"

  # 1. Global kill switch
  if [[ -f "${_KILL_SWITCH_ROOT}/.automation-paused" ]]; then
    echo "[kill-switch] PAUSED: global .automation-paused" >&2
    return 1
  fi

  # 2. Per-repo kill switch
  if [[ -n "$repo" && -f "${_KILL_SWITCH_ROOT}/.automation-paused-${repo}" ]]; then
    echo "[kill-switch] PAUSED: per-repo .automation-paused-${repo}" >&2
    return 1
  fi

  # 3. Runtime checkpoint
  if [[ -f "${_KILL_SWITCH_ROOT}/.automation-paused-runtime" ]]; then
    echo "[kill-switch] PAUSED: runtime checkpoint .automation-paused-runtime" >&2
    return 1
  fi

  # 4. Per-issue automation:hold label (requires gh CLI + issue context)
  if [[ -n "$repo" && -n "$issue_num" ]] && command -v gh &>/dev/null; then
    local labels
    labels=$(gh issue view "$issue_num" \
      --repo "${_ORG}/${repo}" \
      --json labels \
      --jq '.labels[].name' 2>/dev/null || true)
    if echo "$labels" | grep -qx "automation:hold"; then
      echo "[kill-switch] PAUSED: issue ${repo}#${issue_num} has automation:hold label" >&2
      return 1
    fi
  fi

  return 0
}

# ---------------------------------------------------------------------------
# Convenience: set / clear runtime checkpoint
# ---------------------------------------------------------------------------
set_runtime_pause() {
  touch "${_KILL_SWITCH_ROOT}/.automation-paused-runtime"
  echo "[kill-switch] Runtime checkpoint set." >&2
}

clear_runtime_pause() {
  rm -f "${_KILL_SWITCH_ROOT}/.automation-paused-runtime"
  echo "[kill-switch] Runtime checkpoint cleared." >&2
}

# ---------------------------------------------------------------------------
# CLI mode: bash kill-switch.sh check <repo> <issue_num>
# ---------------------------------------------------------------------------
if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  cmd="${1:-check}"
  case "$cmd" in
    check)
      check_kill_switch "${2:-}" "${3:-}"
      ;;
    set-runtime)
      set_runtime_pause
      ;;
    clear-runtime)
      clear_runtime_pause
      ;;
    *)
      echo "Usage: $0 check [<repo> [<issue_num>]]" >&2
      echo "       $0 set-runtime" >&2
      echo "       $0 clear-runtime" >&2
      exit 1
      ;;
  esac
fi
