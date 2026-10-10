#!/usr/bin/env bash
# Regression tests for plugin/hooks/post-write-format.sh：formatter 依「被寫入檔案所屬的 repo」選，
# 不依 session cwd（daodao#295、#166：session 停在 f2e worktree 時改 server 檔案，被 biome 改成雙引號）。
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
HOOK="$SCRIPT_DIR/../../plugin/hooks/post-write-format.sh"

fail() {
  echo "❌ $1"
  exit 1
}

# 用實體路徑：macOS 的 /var 是 symlink，git rev-parse --show-toplevel 回的是 /private/var
TMP="$(cd "$(mktemp -d)" && pwd -P)"
trap 'rm -rf "$TMP"' EXIT

# 假 npx：只記錄呼叫參數與當下目錄，不真的跑 formatter
mkdir -p "$TMP/bin"
cat > "$TMP/bin/npx" <<'STUB'
#!/usr/bin/env bash
printf '%s|%s\n' "$PWD" "$*" >> "$NPX_LOG"
STUB
chmod +x "$TMP/bin/npx"

make_repo() {
  local dir="$1" marker="$2"
  mkdir -p "$dir/src"
  git -C "$dir" init -q
  : > "$dir/$marker"
  : > "$dir/src/file.ts"
}

make_repo "$TMP/f2e" biome.json
make_repo "$TMP/server" eslint.config.mjs
mkdir -p "$TMP/f2e/packages/api/src"
: > "$TMP/f2e/packages/api/src/nested.ts"
mkdir -p "$TMP/loose"
: > "$TMP/loose/file.ts"

run_hook() {
  local cwd="$1" file="$2"
  : > "$TMP/npx.log"
  PATH="$TMP/bin:$PATH" NPX_LOG="$TMP/npx.log" \
    CLAUDE_WORKING_DIRECTORY="$cwd" \
    CLAUDE_TOOL_INPUT="{\"file_path\":\"$file\"}" \
    bash "$HOOK" </dev/null
  cat "$TMP/npx.log"
}

expect_call() {
  local name="$1" cwd="$2" file="$3" root="$4" tool="$5"
  local log
  log="$(run_hook "$cwd" "$file")"
  [[ "$log" == "$root|$tool"* ]] || fail "${name}：應在 ${root} 跑 ${tool}，實際：${log:-（沒有呼叫）}"
  printf '✅ %s\n' "${name}"
}

expect_call "cwd 在 f2e、改 server 檔 → server 的 eslint" \
  "$TMP/f2e" "$TMP/server/src/file.ts" "$TMP/server" "eslint --fix"
expect_call "cwd 在 server、改 f2e 檔 → f2e 的 biome" \
  "$TMP/server" "$TMP/f2e/src/file.ts" "$TMP/f2e" "biome check --write"
expect_call "monorepo 子套件 → repo 根目錄的 biome" \
  "$TMP/server" "$TMP/f2e/packages/api/src/nested.ts" "$TMP/f2e" "biome check --write"
expect_call "不在任何 git repo → 沿用 session cwd" \
  "$TMP/server" "$TMP/loose/file.ts" "$TMP/server" "eslint --fix"

echo "post-write-format regression passed"
