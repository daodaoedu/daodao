#!/usr/bin/env bash
# Validate the root monorepo pull-request branch flow.
set -euo pipefail

HEAD="${HEAD:-${1:-}}"
BASE="${BASE:-${2:-}}"
CHANGED="${CHANGED:-${3:-0}}"

BRANCH_RE='^(feat|fix|refactor|perf|test|docs|chore|ci|build|hotfix|release|auto|claude|codex|dependabot|renovate)/.+'

if [[ ! "$HEAD" =~ $BRANCH_RE ]]; then
  echo "::error::分支名 '$HEAD' 不符慣例（type/description，type ∈ feat|fix|refactor|perf|test|docs|chore|ci|build|hotfix|release|auto|claude|codex|dependabot|renovate）"
  exit 1
fi

if [[ "$BASE" != "main" ]]; then
  echo "::error::PR base 是 '$BASE'，monorepo 的 PR 應以 main 為 base"
  exit 1
fi

if (( CHANGED > 60 )); then
  echo "::warning::此 PR 變更 $CHANGED 個檔案（>60）——請確認沒有帶入非本題檔案或 base 選錯"
fi

echo "✅ branch guard passed: $HEAD → $BASE ($CHANGED files)"
