#!/usr/bin/env bash
# PostToolUse hook: 寫完檔案自動 format
set -uo pipefail

HOOKS_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$HOOKS_DIR/lib.sh"
hook_normalize_input

filepath=$(echo "$HOOK_TOOL_INPUT" | jq -r '.file_path // .filePath // empty' 2>/dev/null)
[ -z "$filepath" ] && exit 0
[ ! -f "$filepath" ] && exit 0

PROJECT_ROOT="$HOOK_CWD"

# 根據專案類型選擇 formatter
if [ -f "$PROJECT_ROOT/biome.json" ]; then
  cd "$PROJECT_ROOT" && npx biome check --write "$filepath" 2>/dev/null || true
elif [ -f "$PROJECT_ROOT/eslint.config.mjs" ] || [ -f "$PROJECT_ROOT/eslint.config.js" ]; then
  echo "$filepath" | grep -qE '\.(ts|js)$' && cd "$PROJECT_ROOT" && npx eslint --fix "$filepath" 2>/dev/null || true
elif [ -f "$PROJECT_ROOT/pyproject.toml" ]; then
  echo "$filepath" | grep -qE '\.py$' && cd "$PROJECT_ROOT" && python3 -m black "$filepath" 2>/dev/null && python3 -m ruff check --fix "$filepath" 2>/dev/null || true
fi

exit 0
