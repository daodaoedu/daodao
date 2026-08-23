#!/usr/bin/env bash
# Contract test for the validators and marker ownership in code-review.yml.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WORKFLOW="$SCRIPT_DIR/../workflows/code-review.yml"
SKILL="$SCRIPT_DIR/../../.claude/skills/code-review/SKILL.md"

fail() {
  echo "❌ $1" >&2
  exit 1
}

extract_validator() {
  local target="$1"
  awk -v target="$target" '
    /^          is_valid_review\(\) \{/ { seen++; capture = (seen == target) }
    capture {
      line = $0
      sub(/^          /, "", line)
      print line
    }
    capture && /^          }$/ { exit }
  ' "$WORKFLOW"
}

run_validator() {
  local occurrence="$1" input="$2" function_body
  function_body="$(extract_validator "$occurrence")"
  [ -n "$function_body" ] || fail "validator #$occurrence not found"
  eval "$function_body"
  is_valid_review "$input"
}

VALID_FINDING='## Code Review

### 問題

| 嚴重度 | 檔案 | 問題 | 建議 |
|---|---|---|---|
| 🔴 High | `src/auth.ts:42` | 權限檢查可被繞過 | 補上檢查 |

### 總結

需要修正。'

EMPTY_FINDING='## Code Review

### 問題

| 嚴重度 | 檔案 | 問題 | 建議 |
|---|---|---|---|

### 總結

沒有問題。'

for occurrence in 1 2; do
  run_validator "$occurrence" '✅ 沒有發現明顯問題'
  run_validator "$occurrence" '✅ 沒有發現明顯問題。'
  run_validator "$occurrence" "$VALID_FINDING"

  if run_validator "$occurrence" $'前文\n✅ 沒有發現明顯問題'; then
    fail "validator #$occurrence accepted prefixed clean output"
  fi
  if run_validator "$occurrence" $'✅ 沒有發現明顯問題\n後文'; then
    fail "validator #$occurrence accepted suffixed clean output"
  fi
  if run_validator "$occurrence" "$EMPTY_FINDING"; then
    fail "validator #$occurrence accepted an empty findings table"
  fi
done

grep -q '<!-- daodao-ai-code-review -->' "$WORKFLOW" || fail "review marker is missing"
grep -q '<!-- daodao-ai-code-review-head:\$HEAD_SHA -->' "$WORKFLOW" || fail "head-specific review marker is missing"
grep -Fq "grep -Eq '^[0-9a-f]{40}$'" "$WORKFLOW" || fail "head marker does not enforce the consumer's exact SHA contract"
grep -q 'contains(\\\"\$HEAD_MARKER\\\")' "$WORKFLOW" || fail "comment lookup does not use the exact head marker"
grep -Fq '.user.login == \"github-actions[bot]\"' "$WORKFLOW" || fail "comment lookup does not verify marker ownership"
if grep -q 'select(.body | startswith(\"## Code Review\"))' "$WORKFLOW"; then
  fail "comment lookup still claims unmarked Code Review comments"
fi

POST_LINE=$(grep -n -- '--method POST' "$WORKFLOW" | tail -1 | cut -d: -f1)
PATCH_LINE=$(grep -n -- '--method PATCH' "$WORKFLOW" | tail -1 | cut -d: -f1)
[ "$PATCH_LINE" -lt "$POST_LINE" ] || fail "same-head PATCH/new-head POST branches are not present"
grep -q 'HEAD_SHA: \${{ github.event.pull_request.head.sha }}' "$WORKFLOW" \
  || fail "workflow does not bind the marker to the event head SHA"

grep -Fq '## 步驟 0：建立可重現的 review input' "$SKILL" || fail "manual review skill has no Context Pack Step 0"
grep -Fq 'git show "$_BASE_REF:.github/scripts/retrieve-context.sh"' "$SKILL" \
  || fail "manual review skill does not load the retriever from the trusted base"
grep -Fq 'read the shared review input at $_REVIEW_INPUT' "$SKILL" \
  || fail "Codex does not receive the shared Context Pack input"
grep -Fq '@"$_REVIEW_INPUT"' "$SKILL" || fail "OMP does not receive diff plus Context Pack"
grep -Fq -- '--file="$_REVIEW_INPUT"' "$SKILL" || fail "OpenCode does not receive diff plus Context Pack"
grep -Fq -- '--tools "" < "$_REVIEW_INPUT"' "$SKILL" || fail "Haiku input is missing or tools remain enabled"
[ "$(grep -Fc 'untrusted repository data' "$SKILL")" -ge 4 ] \
  || fail "manual reviewers do not consistently treat diff and Context Pack as untrusted data"

echo "✅ code-review workflow contract tests passed"
