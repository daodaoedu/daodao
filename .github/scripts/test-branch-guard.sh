#!/usr/bin/env bash
# Regression tests for check-branch-guard.sh.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CHECK="$SCRIPT_DIR/check-branch-guard.sh"
ENFORCEMENT_WORKFLOW="$SCRIPT_DIR/../workflows/branch-guard.yml"
REGRESSION_WORKFLOW="$SCRIPT_DIR/../workflows/branch-guard-regression.yml"

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
  local workflow="$1" job="$2"
  awk -v header="  $job:" '
    $0 == header { inside = 1 }
    inside && $0 != header && $0 ~ /^  [[:alnum:]_-]+:$/ { exit }
    inside { print }
  ' "$workflow"
}

[[ -f "$REGRESSION_WORKFLOW" ]] || fail "缺少獨立 regression workflow"

guard_job="$(job_section "$ENFORCEMENT_WORKFLOW" guard)"
regression_job="$(job_section "$REGRESSION_WORKFLOW" regression)"

grep -Eq '^  pull_request_target:' "$ENFORCEMENT_WORKFLOW" \
  || fail "enforcement workflow 必須由 pull_request_target 的 trusted definition 執行"
if grep -Eq '^  pull_request:' "$ENFORCEMENT_WORKFLOW"; then
  fail "enforcement workflow 不得使用 PR 可修改 definition 的 pull_request event"
fi
grep -Eq '^permissions: \{\}$' "$ENFORCEMENT_WORKFLOW" \
  || fail "enforcement workflow 預設 permissions 必須為空"
grep -Fq 'contents: read' <<< "$guard_job" \
  || fail "production guard 只能取得 checkout 所需的 contents: read"
trusted_ref_pattern="ref: \${{ github.event.repository.default_branch }}"
grep -Fq "$trusted_ref_pattern" <<< "$guard_job" \
  || fail "production guard 必須只 checkout trusted default branch"
grep -Fq 'persist-credentials: false' <<< "$guard_job" \
  || fail "production guard checkout 不得保留 credentials"
grep -Fq 'run: .github/scripts/check-branch-guard.sh' <<< "$guard_job" \
  || fail "production guard 未執行 trusted default-branch checker"
if grep -Fq '.github/scripts/test-branch-guard.sh' <<< "$guard_job"; then
  fail "production guard job 不得執行 PR checkout 內的測試"
fi
if grep -Eq '(pull_request\.head\.sha|github\.head_ref)' <<< "$guard_job"; then
  fail "production guard 不得 checkout PR head"
fi
if grep -Eq '(pull_request\.head\.sha|github\.head_ref|secrets\.|GITHUB_TOKEN|pull-requests:|issues:|contents: write)' "$ENFORCEMENT_WORKFLOW"; then
  fail "production guard 不得取得不必要的 token、secret 或 write permissions"
fi
[[ "$(grep -Ec 'uses: actions/checkout@' "$ENFORCEMENT_WORKFLOW")" -eq 1 ]] \
  || fail "enforcement workflow 只能 checkout 一次 trusted default branch"
[[ "$(grep -Ec '^[[:space:]]+run:' "$ENFORCEMENT_WORKFLOW")" -eq 1 ]] \
  || fail "enforcement workflow 只能執行 trusted checker"
echo "✅ trusted enforcement boundary"

[[ -n "$regression_job" ]] || fail "workflow 缺少 regression job"
grep -Eq '^  pull_request:' "$REGRESSION_WORKFLOW" \
  || fail "regression workflow 必須只在 pull_request context 執行 PR tests"
grep -Eq '^permissions: \{\}$' "$REGRESSION_WORKFLOW" \
  || fail "regression workflow 預設 permissions 必須為空"
grep -Fq 'permissions: {}' <<< "$regression_job" \
  || fail "regression job 必須使用 permissions: {}"
grep -Fq 'persist-credentials: false' <<< "$regression_job" \
  || fail "regression checkout 不得保留 credentials"
grep -Fq 'run: .github/scripts/test-branch-guard.sh' <<< "$regression_job" \
  || fail "regression job 未執行 PR 版本測試"
if grep -Eq '(secrets\.|GITHUB_TOKEN|permissions:[[:space:]]*$)' "$REGRESSION_WORKFLOW"; then
  fail "regression job 不得取得 secrets、token 或額外 permissions"
fi
if grep -Fq 'name: Branch flow rules' <<< "$regression_job"; then
  fail "regression check 不得與 required enforcement check 同名"
fi
echo "✅ tokenless regression job contract"

echo "✅ branch guard regression tests passed"
