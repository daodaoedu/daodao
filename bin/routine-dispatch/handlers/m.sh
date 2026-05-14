#!/usr/bin/env bash
# scope:M handler — two-phase: spec PR then code PR (plan §5.1 Blueprint).
#
# Usage: m.sh <repo> <issue_num> <state>
#
# Phase 1 (state=needs-spec):
#   Run openspec-headless.ts → open spec PR in monorepo
#   Add spec-pending label to sub-repo issue
#
# Phase 2 (state=needs-code, after spec-merged):
#   Run code implementation → open code PR in sub-repo

set -euo pipefail

REPO="${1:?Usage: m.sh <repo> <issue_num> <state>}"
ISSUE_NUM="${2:?Usage: m.sh <repo> <issue_num> <state>}"
STATE="${3:-needs-spec}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DISPATCH_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
MONOREPO_ROOT="$(cd "${DISPATCH_DIR}/../.." && pwd)"

# Source policy enforcement
# shellcheck source=../policy/enforce.sh
source "${DISPATCH_DIR}/policy/enforce.sh"

ISSUE_KEY="${REPO}#${ISSUE_NUM}"
SCOPE_LABEL="scope:M"

log() { echo "[handler:m] $*"; }

# ── deterministic: pre-flight ─────────────────────────────────────────────────

# Token budget check
BUDGET_OK=$(pnpm --silent tsx "${DISPATCH_DIR}/token-budget.ts" check "${ISSUE_KEY}" "${SCOPE_LABEL}" 2>/dev/null || echo "exceeded")
if [[ "${BUDGET_OK}" == "exceeded" ]]; then
  log "Token budget exceeded — aborting"
  safe_run "gh issue edit ${ISSUE_NUM} --repo daodaoedu/${REPO} --add-label human-coding" || true
  safe_run "gh issue comment ${ISSUE_NUM} --repo daodaoedu/${REPO} --body '⚠️ Token budget exceeded (scope:M cap 800k). Escalating to human.'" || true
  exit 1
fi

# Race detection: re-query labels
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
if echo "${LABELS}" | grep -q "stop-after-plan"; then
  log "stop-after-plan: will run Phase 1 only"
fi

SLUG=$(gh issue view "${ISSUE_NUM}" --repo "daodaoedu/${REPO}" --json title \
  --jq '.title | ascii_downcase | gsub("[^a-z0-9]+"; "-") | ltrimstr("-") | rtrimstr("-") | .[0:30]' \
  2>/dev/null || echo "issue")

# OpenSpec change folder: <repo-prefix>-<issue-num>-<slug>
REPO_PREFIX="${REPO##daodao-}"
CHANGE_ID="${REPO_PREFIX}-${ISSUE_NUM}-${SLUG}"

log() { echo "[handler:m] $*"; }
log "scope:M handler: state=${STATE}, change=${CHANGE_ID}"

if [[ "${STATE}" == "needs-spec" ]]; then
  # ── Phase 1: spec PR ────────────────────────────────────────────────────────
  log "Phase 1: generating spec PR via openspec-headless"

  SPEC_MODEL=$(pnpm --silent tsx "${DISPATCH_DIR}/model-router.ts" route spec 2>/dev/null || echo "claude-opus-4-7")
  log "Spec model: ${SPEC_MODEL}"

  # Run headless OpenSpec wrapper
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
      if [[ ${EXIT_CODE} -eq 2 ]]; then
        safe_run "gh issue comment ${ISSUE_NUM} --repo daodaoedu/${REPO} --body '⚠️ OpenSpec headless wrapper errored (exit 2). Human review needed.'" || true
      fi
      exit "${EXIT_CODE}"
    fi
  else
    log "openspec-headless.ts not found — would run spec generation here"
  fi

  # Add spec-pending label
  safe_run "gh issue edit ${ISSUE_NUM} --repo daodaoedu/${REPO} --add-label spec-pending" || true
  log "Phase 1 complete — spec PR opened, spec-pending label added"

elif [[ "${STATE}" == "needs-code" ]]; then
  # ── Phase 2: code PR ────────────────────────────────────────────────────────
  log "Phase 2: implementing code PR"

  # defense-in-depth: high-risk repos must never open code PRs
  HIGH_RISK_REPOS=("daodao-storage" "daodao-infra")
  for hrr in "${HIGH_RISK_REPOS[@]}"; do
    if [[ "${REPO}" == "${hrr}" ]]; then
      log "🛡️ defense-in-depth: high-risk repo ${REPO} refuses auto-pr in Phase 2"
      safe_run "gh issue comment ${ISSUE_NUM} --repo daodaoedu/${REPO} --body '🛡️ Auto-PR refused (high-risk repo defense-in-depth).'" || true
      exit 6
    fi
  done

  BRANCH="auto/${ISSUE_NUM}-${SLUG}"
  EXISTING_PR=$(gh pr list --repo "daodaoedu/${REPO}" --head "${BRANCH}" --json number \
    --jq '.[0].number' 2>/dev/null || echo "")
  if [[ -n "${EXISTING_PR}" ]]; then
    log "Code PR already exists (#${EXISTING_PR}) — skipping"
    exit 0
  fi

  CODE_MODEL=$(pnpm --silent tsx "${DISPATCH_DIR}/model-router.ts" route handler 2>/dev/null || echo "claude-sonnet-4-6")
  log "Code model: ${CODE_MODEL}"

  # Get ADR context
  ADR_FRAGMENT=$(pnpm --silent tsx "${DISPATCH_DIR}/model-router.ts" adr "${REPO}" "${CHANGE_ID}" "${ISSUE_NUM}" 2>/dev/null || echo "")
  if [[ -n "${ADR_FRAGMENT}" ]]; then
    log "ADR context injected (${#ADR_FRAGMENT} chars)"
  fi

  # ── deterministic: setup sub-repo branch ────────────────────────────────────
  # Locate sub-repo: try monorepo subdir first (local), then sibling (CCR cloud layout)
  REPO_DIR="${MONOREPO_ROOT}/${REPO}"
  if [[ ! -d "${REPO_DIR}/.git" ]]; then
    REPO_DIR="${MONOREPO_ROOT}/../${REPO}"
  fi
  if [[ ! -d "${REPO_DIR}/.git" ]]; then
    REPO_DIR=$(find "$(dirname "${MONOREPO_ROOT}")" /root /home /workspaces /tmp -maxdepth 4 -name ".git" -type d 2>/dev/null \
      | xargs -I{} dirname {} \
      | while read -r d; do
          url=$(git -C "$d" config --get remote.origin.url 2>/dev/null || true)
          if [[ "$url" == *"daodaoedu/${REPO}"* ]]; then echo "$d"; fi
        done | head -1)
  fi
  if [[ -z "${REPO_DIR}" || ! -d "${REPO_DIR}/.git" ]]; then
    log "ERROR: sub-repo ${REPO} not found (tried monorepo subdir, sibling, and find)"
    exit 1
  fi
  log "Sub-repo found at: ${REPO_DIR}"

  DEFAULT_BRANCH=$(gh repo view "daodaoedu/${REPO}" --json defaultBranchRef \
    --jq '.defaultBranchRef.name' 2>/dev/null || echo "main")

  cd "${REPO_DIR}"
  git fetch origin --quiet

  if git show-ref --verify --quiet "refs/heads/${BRANCH}"; then
    git checkout "${BRANCH}"
  else
    git checkout -b "${BRANCH}" "origin/${DEFAULT_BRANCH}"
  fi

  # Read spec files for context
  SPEC_DIR="${MONOREPO_ROOT}/openspec/changes/${CHANGE_ID}"
  SPEC_CONTEXT=""
  if [[ -d "${SPEC_DIR}" ]]; then
    for f in "${SPEC_DIR}"/*.md; do
      [[ -f "${f}" ]] || continue
      SPEC_CONTEXT+=$'\n\n'"=== $(basename "${f}") ==="$'\n'"$(cat "${f}")"
    done
  fi

  ISSUE_TITLE=$(gh issue view "${ISSUE_NUM}" --repo "daodaoedu/${REPO}" \
    --json title --jq '.title' 2>/dev/null || echo "")
  ISSUE_BODY=$(gh issue view "${ISSUE_NUM}" --repo "daodaoedu/${REPO}" \
    --json body --jq '.body' 2>/dev/null || echo "")

  log "Invoking ${CODE_MODEL} for Phase 2 code implementation (scope:M)..."
  claude --model "${CODE_MODEL}" \
    --dangerously-skip-permissions \
    -p "You are implementing GitHub issue #${ISSUE_NUM} in the ${REPO} repository (scope:M, Phase 2).

Title: ${ISSUE_TITLE}

Issue body:
${ISSUE_BODY}

Spec (from openspec/changes/${CHANGE_ID}):
${SPEC_CONTEXT}

Instructions (follow strictly):
1. Read the spec files above carefully — implement EXACTLY what is specified, no more
2. Read relevant source files to understand current codebase
3. For each task in the spec, follow TDD: write test → commit test(<area>): → verify RED → implement → commit feat/fix(<area>): → verify GREEN
4. If the spec is insufficient for a section, note it in a comment; do not guess
5. Scope:M means ≤30 files changed
6. Do NOT run git push or open a PR — the pipeline will do that
7. Follow existing code style and conventions"

  CLAUDE_EXIT=$?
  if [[ ${CLAUDE_EXIT} -ne 0 ]]; then
    log "Claude exited ${CLAUDE_EXIT} — escalating to human"
    safe_run "gh issue edit ${ISSUE_NUM} --repo daodaoedu/${REPO} --add-label human-coding" || true
    safe_run "gh issue comment ${ISSUE_NUM} --repo daodaoedu/${REPO} \
      --body '🚨 Agentic phase (Phase 2) failed (exit ${CLAUDE_EXIT}). Escalating to human.'" || true
    exit 1
  fi

  # ── deterministic: push branch + open PR ──────────────────────────────────
  cd "${REPO_DIR}"
  git push -u origin "${BRANCH}"

  # Find the spec PR number if it exists
  SPEC_PR=$(gh pr list --repo "daodaoedu/daodao" \
    --head "openspec/${CHANGE_ID}" --state merged \
    --json number --jq '.[0].number' 2>/dev/null || echo "")
  SPEC_REF=""
  [[ -n "${SPEC_PR}" ]] && SPEC_REF=$'\n'"References spec PR: daodaoedu/daodao#${SPEC_PR}"

  PR_BODY_FILE=$(mktemp)
  cat > "${PR_BODY_FILE}" <<PRBODY
## Summary

Implements #${ISSUE_NUM}: ${ISSUE_TITLE}
${SPEC_REF}

## Implementation Notes

<!-- agentic phase notes any spec gaps here -->

## Test plan

- [ ] TDD commit order verified (test: RED → feat/fix: GREEN per task)
- [ ] \`pnpm test\` passes
- [ ] \`pnpm lint\` passes
- [ ] Scope:M (≤30 files changed)
- [ ] Spec fully implemented (no gaps)

---
🤖 Auto-generated by daodao pipeline (scope:M, Phase 2)
Closes #${ISSUE_NUM}
PRBODY

  PR_URL=$(gh pr create \
    --repo "daodaoedu/${REPO}" \
    --title "[auto] ${ISSUE_TITLE}" \
    --body-file "${PR_BODY_FILE}" \
    --head "${BRANCH}" \
    --base "${DEFAULT_BRANCH}" \
    --label "auto" \
    2>/dev/null || echo "")

  rm -f "${PR_BODY_FILE}"

  if [[ -n "${PR_URL}" ]]; then
    log "Phase 2 PR created: ${PR_URL}"
    safe_run "gh issue comment ${ISSUE_NUM} --repo daodaoedu/${REPO} \
      --body '🔗 Code PR opened: ${PR_URL}'" || true
  else
    log "PR creation failed"
    exit 1
  fi

  log "M Phase 2 handler complete"
fi

exit 0
