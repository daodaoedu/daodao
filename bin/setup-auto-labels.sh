#!/usr/bin/env bash
# Sets up the 13 fixed GitHub labels required by the automation pipeline
# on one or all 8 sub-repos.
#
# Usage:
#   bash bin/setup-auto-labels.sh daodao-server        # single repo
#   bash bin/setup-auto-labels.sh --all                # all 8 repos
#   bash bin/setup-auto-labels.sh --dry-run --all      # list operations, no-op
#   bash bin/setup-auto-labels.sh --dry-run daodao-f2e # list for one repo
set -euo pipefail

# ---------------------------------------------------------------------------
# Label definitions: "name|color|description"
# ---------------------------------------------------------------------------
LABELS=(
  "auto|0075ca|Routine B dispatch trigger"
  "auto:plan-only|e4e669|Automation mode: always stop at plan stage"
  "auto:auto-pr|d93f0b|Automation mode: allowed to open PR through scope gate"
  "scope:XS|c5def5|Task size XS — plan+code in one PR"
  "scope:S|c5def5|Task size S — plan.md + code in one PR"
  "scope:M|c5def5|Task size M — two-phase: spec PR then code PR"
  "scope:L|c5def5|Task size L — spec PR only; human codes"
  "spec-pending|fbca04|M scope Phase 1: spec PR open, awaiting merge"
  "spec-merged|0e8a16|M scope spec PR merged; ready for Phase 2"
  "human-coding|b60205|Escalated: routine hands off to human"
  "manual|ededed|Manual mode — routine skips this issue"
  "human-driving|1d76db|Human has taken over; routine exits permanently"
  "stop-after-plan|f9d0c4|Routine stops after plan stage for any scope"
  "automation:hold|bfd4f2|Soft pause: routine skips this round, resumable"
  "visual|e4e669|Visual/UI task — requires human design review"
  "tracked|0075ca|Tracked by Routine C for Notion status sync"
)

ALL_REPOS=(
  daodao-server
  daodao-f2e
  daodao-ai-backend
  daodao-storage
  daodao-admin-ui
  daodao-infra
  daodao-mcp
  daodao-worker
)

ORG="daodaoedu"
DRY_RUN=false
TARGET_REPOS=()

# ---------------------------------------------------------------------------
# Argument parsing
# ---------------------------------------------------------------------------
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --all)
      TARGET_REPOS=("${ALL_REPOS[@]}")
      shift
      ;;
    --*)
      echo "Unknown flag: $1" >&2
      exit 1
      ;;
    *)
      TARGET_REPOS+=("$1")
      shift
      ;;
  esac
done

if [[ ${#TARGET_REPOS[@]} -eq 0 ]]; then
  echo "Usage:" >&2
  echo "  $0 <repo-name>           # single repo" >&2
  echo "  $0 --all                 # all 8 repos" >&2
  echo "  $0 --dry-run --all       # dry run for all repos" >&2
  exit 1
fi

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
create_label() {
  local repo="$1"
  local name="$2"
  local color="$3"
  local description="$4"

  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[dry-run] gh label create \"$name\" --repo ${ORG}/${repo} --color \"$color\" --description \"$description\" --force"
    return 0
  fi

  gh label create "$name" \
    --repo "${ORG}/${repo}" \
    --color "$color" \
    --description "$description" \
    --force
}

# ---------------------------------------------------------------------------
# Main loop
# ---------------------------------------------------------------------------
TOTAL_OPS=0
FAILED=0

for repo in "${TARGET_REPOS[@]}"; do
  echo "==> ${ORG}/${repo}"
  for entry in "${LABELS[@]}"; do
    IFS='|' read -r label_name label_color label_desc <<< "$entry"
    TOTAL_OPS=$((TOTAL_OPS + 1))
    if ! create_label "$repo" "$label_name" "$label_color" "$label_desc"; then
      echo "  [ERROR] Failed to create label '$label_name' in ${repo}" >&2
      FAILED=$((FAILED + 1))
    fi
  done
done

echo ""
if [[ "$DRY_RUN" == "true" ]]; then
  echo "Dry-run complete: would perform ${TOTAL_OPS} label operation(s) across ${#TARGET_REPOS[@]} repo(s)."
else
  echo "Done: ${TOTAL_OPS} label operation(s) across ${#TARGET_REPOS[@]} repo(s). Failures: ${FAILED}."
  if [[ "$FAILED" -gt 0 ]]; then
    exit 1
  fi
fi
