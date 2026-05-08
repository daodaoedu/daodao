#!/usr/bin/env bash
# Policy enforcement for routine-dispatch handlers.
# Source this file at the top of every handler script:
#   source "$(dirname "$0")/../policy/enforce.sh"
#
# Provides:
#   safe_run "<cmd>"    — run cmd only if it matches tool allowlist
#   safe_write "<path>" — block writes to blocklisted paths

set -euo pipefail

_POLICY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
_ALLOWLIST_FILE="${_POLICY_DIR}/tool-allowlist.json"
_BLOCKLIST_FILE="${_POLICY_DIR}/write-path-blocklist.json"

# Check if a command matches the allowlist (bash 3 compatible)
_tool_allowed() {
  local cmd="$1"
  local pattern
  while IFS= read -r pattern; do
    if [[ "${cmd}" =~ ${pattern} ]]; then
      return 0
    fi
  done < <(jq -r '.[].tool' "${_ALLOWLIST_FILE}")
  return 1
}

# Check if a path matches any blocklist glob (bash 3 compatible)
_path_blocked() {
  local path="$1"
  local glob prefix bare

  while IFS= read -r glob; do
    # Direct glob match
    # shellcheck disable=SC2053
    if [[ "${path}" == ${glob} ]]; then
      return 0
    fi
    # ** prefix match: strip trailing /** and check path prefix
    if [[ "${glob}" == *"/**"* ]]; then
      prefix="${glob%%/**}"
      if [[ "${path}" == "${prefix}/"* || "${path}" == "${prefix}" ]]; then
        return 0
      fi
    fi
    # Simple trailing-* match
    if [[ "${glob}" == *"*"* && "${glob}" != *"/**"* ]]; then
      bare="${glob%%\*}"
      if [[ "${path}" == "${bare}"* ]]; then
        return 0
      fi
    fi
  done < <(jq -r '.[]' "${_BLOCKLIST_FILE}")

  # Dynamic check: block already-merged SQL migration files
  if [[ "${path}" == migrate/sql/* ]]; then
    if git log --oneline -- "${path}" 2>/dev/null | grep -q .; then
      return 0
    fi
  fi

  return 1
}

# safe_run: execute a command only if it matches the allowlist
# Usage: safe_run "gh issue list --repo daodaoedu/daodao"
safe_run() {
  local cmd="$1"
  # Reject shell metacharacters that could chain commands
  local _metachar_re='[;|&`]'
  # shellcheck disable=SC2016  # single quotes intentional: literal $( and <( patterns, not expansions
  if [[ "${cmd}" =~ ${_metachar_re} ]] || [[ "${cmd}" == *'$('* ]] || [[ "${cmd}" == *'<('* ]]; then
    echo "BLOCKED: command contains shell metachar (; | & \` \$(..): ${cmd}" >&2
    return 3
  fi
  if ! _tool_allowed "${cmd}"; then
    echo "BLOCKED: tool '${cmd%% *}' not in allowlist (full cmd: ${cmd})" >&2
    return 3
  fi
  eval "${cmd}"
}

# safe_write: gate a git add / file write operation
# Usage: safe_write "path/to/file"
safe_write() {
  local path="$1"
  if _path_blocked "${path}"; then
    echo "BLOCKED: write to '${path}' denied by write-path blocklist" >&2
    return 3
  fi
  return 0
}
