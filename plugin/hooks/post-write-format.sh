#!/usr/bin/env bash
# PostToolUse hook: 寫完檔案自動 format
set -uo pipefail

HOOKS_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$HOOKS_DIR/lib.sh"
hook_normalize_input

filepath=$(echo "$HOOK_TOOL_INPUT" | jq -r '.file_path // .filePath // empty' 2>/dev/null)
[ -z "$filepath" ] && exit 0
[ ! -f "$filepath" ] && exit 0

# 依「被寫入檔案所屬的 repo」選 formatter，不依 session cwd：session 停在 f2e worktree 時改 server 檔，
# 用 cwd 會拿 f2e 的 biome 把 server 檔改成雙引號（daodao#295、#166）。不在 git repo 時才退回 cwd。
PROJECT_ROOT="$(git -C "$(dirname "$filepath")" rev-parse --show-toplevel 2>/dev/null || true)"
[ -n "$PROJECT_ROOT" ] || PROJECT_ROOT="$HOOK_CWD"

# 根據專案類型選擇 formatter
if [ -f "$PROJECT_ROOT/biome.json" ]; then
  cd "$PROJECT_ROOT" && npx biome check --write "$filepath" 2>/dev/null || true
elif [ -f "$PROJECT_ROOT/eslint.config.mjs" ] || [ -f "$PROJECT_ROOT/eslint.config.js" ]; then
  echo "$filepath" | grep -qE '\.(ts|js)$' && cd "$PROJECT_ROOT" && npx eslint --fix "$filepath" 2>/dev/null || true
elif [ -f "$PROJECT_ROOT/pyproject.toml" ]; then
  echo "$filepath" | grep -qE '\.py$' && cd "$PROJECT_ROOT" && python3 -m black "$filepath" 2>/dev/null && python3 -m ruff check --fix "$filepath" 2>/dev/null || true
fi

exit 0
