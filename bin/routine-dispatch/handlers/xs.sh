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
MONOREPO_ROOT="$(cd "${DISPATCH_DIR}/../.." && pwd)"
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

# ── deterministic: setup sub-repo branch ──────────────────────────────────────
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

# ── agentic: LLM implements issue (test-first, scope:XS) ─────────────────────
ISSUE_TITLE=$(gh issue view "${ISSUE_NUM}" --repo "daodaoedu/${REPO}" \
  --json title --jq '.title' 2>/dev/null || echo "")
ISSUE_BODY=$(gh issue view "${ISSUE_NUM}" --repo "daodaoedu/${REPO}" \
  --json body --jq '.body' 2>/dev/null || echo "")

log "Invoking ${MODEL} for agentic phase (scope:XS)..."
claude --model "${MODEL}" \
  --dangerously-skip-permissions \
  -p "You are implementing GitHub issue #${ISSUE_NUM} in the ${REPO} repository (scope:XS).

Title: ${ISSUE_TITLE}

Issue body:
${ISSUE_BODY}

Instructions (follow strictly):
1. Read the relevant source files first to understand the codebase
2. Write test(s) first — git commit as: test(xs): <what is being tested>
3. Run the tests — they MUST fail at this point (if they pass, your test does not cover the behavior; rewrite it)
4. Write the implementation — git commit as: feat/fix(xs): <what was done>
5. Run the tests — they MUST pass
6. Scope:XS means ≤3 files changed. Stay within this limit.
7. Do NOT run git push or open a PR — the pipeline will do that.
8. Follow existing code style and conventions in this repo."

CLAUDE_EXIT=$?
if [[ ${CLAUDE_EXIT} -ne 0 ]]; then
  log "Claude exited ${CLAUDE_EXIT} — escalating to human"
  safe_run "gh issue edit ${ISSUE_NUM} --repo daodaoedu/${REPO} --add-label human-coding" || true
  safe_run "gh issue comment ${ISSUE_NUM} --repo daodaoedu/${REPO} \
    --body '🚨 Agentic phase failed (exit ${CLAUDE_EXIT}). Escalating to human.'" || true
  exit 1
fi

# ── deterministic: push branch + open PR ─────────────────────────────────────
git push -u origin "${BRANCH}"

PR_BODY_FILE=$(mktemp)
if [[ "${VISUAL_MODE:-false}" == "true" ]]; then
cat > "${PR_BODY_FILE}" <<PRBODY
## Summary

Implements #${ISSUE_NUM}: ${ISSUE_TITLE}

## Visual Review Checklist

> 👁️ 此 PR 包含視覺變更，請在 staging 或本機確認：
- [ ] 畫面呈現符合 Acceptance Criteria
- [ ] 手機版 RWD 正常
- [ ] 無非預期的樣式影響（其他頁面/元件）

---
🤖 Auto-generated by daodao pipeline (scope:XS, visual mode)
Closes #${ISSUE_NUM}
PRBODY
else
cat > "${PR_BODY_FILE}" <<PRBODY
## Summary

Implements #${ISSUE_NUM}: ${ISSUE_TITLE}

## Test plan

- [ ] \`pnpm test\` passes
- [ ] \`pnpm lint\` passes
- [ ] Scope:XS (≤3 files changed)

---
🤖 Auto-generated by daodao pipeline (scope:XS)
Closes #${ISSUE_NUM}
PRBODY
fi

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
  log "PR created: ${PR_URL}"
  safe_run "gh issue comment ${ISSUE_NUM} --repo daodaoedu/${REPO} \
    --body '🔗 PR opened: ${PR_URL}'" || true
else
  log "PR creation failed"
  exit 1
fi

log "XS handler complete — verification-loop.sh will run lint+test"
exit 0
