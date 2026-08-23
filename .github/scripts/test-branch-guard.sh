#!/usr/bin/env bash
# Regression tests for check-branch-guard.sh.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CHECK="$SCRIPT_DIR/check-branch-guard.sh"
WORKFLOW="$SCRIPT_DIR/../workflows/branch-guard.yml"

fail() {
  echo "❌ $1"
  exit 1
}

expect_pass() {
  local name="$1" head="$2" base="$3" changed="$4"
  local output
  if ! output="$(HEAD="$head" BASE="$base" CHANGED="$changed" "$CHECK" 2>&1)"; then
    fail "$name 應通過，實際輸出：$output"
  fi
  [[ "$output" == *"branch guard passed"* ]] || fail "$name 缺少通過訊息：$output"
  printf '✅ %s\n' "$name"
}

expect_fail() {
  local name="$1" head="$2" base="$3" changed="$4" expected="$5"
  local output
  if output="$(HEAD="$head" BASE="$base" CHANGED="$changed" "$CHECK" 2>&1)"; then
    fail "$name 應失敗，卻通過：$output"
  fi
  [[ "$output" == *"$expected"* ]] || fail "$name 錯誤訊息不符：$output"
  printf '✅ %s\n' "$name"
}

expect_pass "feat/main" "feat/root-branch-guard" "main" 3
expect_fail "invalid branch" "feature/root-branch-guard" "main" 3 "分支名"
expect_fail "dev base" "feat/root-branch-guard" "dev" 3 "應以 main 為 base"
expect_pass "dependabot" "dependabot/npm_and_yarn/actions-checkout-4" "main" 1
expect_pass "ci prefix" "ci/harden-branch-guard" "main" 2
expect_pass "build prefix" "build/update-toolchain" "main" 2

output="$(HEAD="feat/large-pr" BASE="main" CHANGED=61 "$CHECK" 2>&1)" || fail "61 files 應警告但通過：$output"
[[ "$output" == *"::warning::"* ]] || fail "61 files 缺少 warning：$output"
[[ "$output" == *"branch guard passed"* ]] || fail "61 files 缺少通過訊息：$output"
echo "✅ 61 files warning/pass"

job_section() {
  local job="$1"
  awk -v header="  $job:" '
    $0 == header { inside = 1 }
    inside && $0 != header && $0 ~ /^  [[:alnum:]_-]+:$/ { exit }
    inside { print }
  ' "$WORKFLOW"
}

guard_job="$(job_section guard)"
regression_job="$(job_section regression)"

base_load_pattern="git show \"\$BASE_SHA:.github/scripts/check-branch-guard.sh\" > \"\$TRUSTED_CHECK\""
trusted_run_pattern="\"\$RUNNER_TEMP/check-branch-guard.sh\""
grep -Fq "$base_load_pattern" <<< "$guard_job" \
  || fail "workflow 未從 base SHA 載入可信腳本"
grep -Fq "$trusted_run_pattern" <<< "$guard_job" \
  || fail "workflow 未執行 runner 暫存目錄內的可信副本"
if grep -Fq '.github/scripts/test-branch-guard.sh' <<< "$guard_job"; then
  fail "production guard job 不得執行 PR checkout 內的測試"
fi
echo "✅ trusted base script boundary"

[[ -n "$regression_job" ]] || fail "workflow 缺少 regression job"
grep -Fq 'permissions: {}' <<< "$regression_job" \
  || fail "regression job 必須使用 permissions: {}"
grep -Fq 'persist-credentials: false' <<< "$regression_job" \
  || fail "regression checkout 不得保留 credentials"
grep -Fq 'run: .github/scripts/test-branch-guard.sh' <<< "$regression_job" \
  || fail "regression job 未執行 PR 版本測試"
if grep -Eq '(secrets\.|GITHUB_TOKEN|permissions:[[:space:]]*$)' <<< "$regression_job"; then
  fail "regression job 不得取得 secrets、token 或額外 permissions"
fi
echo "✅ tokenless regression job contract"

echo "✅ branch guard regression tests passed"
