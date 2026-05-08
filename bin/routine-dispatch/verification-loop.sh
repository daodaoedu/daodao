#!/usr/bin/env bash
# Implements plan §5.3: verification loop with max 2 retries before escalation.
#
# Usage: verification-loop.sh <repo> <issue_num> <handler_cmd...>
#
# Exit codes:
#   0 — success (handler passed lint + test)
#   4 — context too large (pre-estimated before run)
#   5 — retries exhausted (2 attempts, both failed)

set -euo pipefail

REPO="${1:?Missing repo}"
ISSUE_NUM="${2:?Missing issue_num}"
shift 2
HANDLER_CMD=("$@")

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MONOREPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Context overflow guard (plan §5.3)
CONTEXT_WINDOW=200000
estimated=$(pnpm --silent tsx "$SCRIPT_DIR/estimate-context.ts" "$REPO" "$ISSUE_NUM" 2>/dev/null || echo 0)
threshold=$(( CONTEXT_WINDOW * 70 / 100 ))
if [ "$estimated" -gt "$threshold" ]; then
  echo "CONTEXT_OVERFLOW: estimated $estimated tokens > 70% of $CONTEXT_WINDOW context window" >&2
  gh issue comment "$ISSUE_NUM" \
    --repo "daodaoedu/$REPO" \
    --body "⚠️ Context overflow predicted (estimated ${estimated} tokens, threshold ${threshold}). Escalating to human." \
    2>/dev/null || true
  exit 4
fi

attempt=0
last_error=""

while [ $attempt -lt 2 ]; do
  attempt=$(( attempt + 1 ))
  echo "verification-loop: attempt $attempt/2"

  if "${HANDLER_CMD[@]}"; then
    # Handler succeeded — run lint + test
    if cd "$MONOREPO_ROOT" && pnpm lint 2>&1 && pnpm test 2>&1; then
      echo "verification-loop: attempt $attempt passed"
      exit 0
    else
      last_error="lint/test failed on attempt $attempt"
      echo "verification-loop: $last_error"
    fi
  else
    last_error="handler exited non-zero on attempt $attempt"
    echo "verification-loop: $last_error"
  fi
done

# Retries exhausted — escalate (plan §5.3: 第 3 次修不好就不會修好)
echo "verification-loop: retries exhausted after 2 attempts. Escalating." >&2
gh issue edit "$ISSUE_NUM" \
  --repo "daodaoedu/$REPO" \
  --add-label "human-coding" \
  2>/dev/null || true
gh issue comment "$ISSUE_NUM" \
  --repo "daodaoedu/$REPO" \
  --body "🚨 Verification loop exhausted (2 retries). Last error: ${last_error}. Escalating to human." \
  2>/dev/null || true
exit 5
