#!/usr/bin/env bash
# Contract test for the validators and marker ownership in code-review.yml.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WORKFLOW="$SCRIPT_DIR/../workflows/code-review.yml"

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
grep -q 'contains(\"<!-- daodao-ai-code-review -->\")' "$WORKFLOW" || fail "comment lookup does not use the marker"
grep -q '\.user\.login == \"github-actions\[bot\]\"' "$WORKFLOW" || fail "comment lookup does not verify marker ownership"
if grep -q 'select(.body | startswith(\"## Code Review\"))' "$WORKFLOW"; then
  fail "comment lookup still claims unmarked Code Review comments"
fi

echo "✅ code-review workflow contract tests passed"
