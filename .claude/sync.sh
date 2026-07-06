#!/usr/bin/env bash
# 同步 .claude/ 共用 harness 到所有子專案（v3）
#
# 正本：
#   .claude/shared/hooks/*.sh        → <repo>/.claude/hooks/
#   .claude/shared/settings.json     → <repo>/.claude/settings.json（整檔覆蓋，防 drift）
#   .claude/shared/skills/*/SKILL.md → <repo>/.claude/skills/*/SKILL.md
#   bin/pipeline.config.json         → <repo>/.claude/repo.json（產生，單一事實來源）
#   .github/workflows/{auto-pr-description,code-review}.yml → <repo>/.github/workflows/
#
# repo 清單來自 bin/pipeline.config.json，不要在此另行維護。
# 用法: .claude/sync.sh /path/to/daodao-parent-dir
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BASE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CONFIG="$BASE_ROOT/bin/pipeline.config.json"
SHARED="$SCRIPT_DIR/shared"
SOURCE_WORKFLOWS="$BASE_ROOT/.github/workflows"
SHARED_WORKFLOWS=(auto-pr-description.yml code-review.yml)
SHARED_SKILLS=(pre-commit-check format-commit code-review collect-pr-feedback)

command -v jq >/dev/null || { echo "FATAL: 需要 jq"; exit 1; }
[ -f "$CONFIG" ] || { echo "FATAL: $CONFIG 不存在"; exit 1; }

if [ "${1:-}" = "" ]; then
  echo "Usage: $0 /path/to/daodao-parent-dir"
  exit 1
fi
BASE_DIR="$1"

gen_repo_json() { # <repo-name> <target-file>
  jq --arg r "$1" \
    '{repo: $r,
      defaultBranch: .repos[$r].defaultBranch,
      highRisk: (.highRiskRepos | index($r) != null),
      quality: .repos[$r].quality,
      formatFile: .repos[$r].formatFile,
      reviewFocus: .repos[$r].reviewFocus,
      protectedPaths: .repos[$r].protectedPaths,
      generatedBy: "daodao/.claude/sync.sh — 不要手改，改 bin/pipeline.config.json 後重新 sync"
    }' "$CONFIG" > "$2"
}

sync_repo() { # <target-dir> <repo-name>
  local target="$1" repo="$2"

  mkdir -p "$target/.claude/hooks"
  cp "$SHARED/hooks/pre-write-guard.sh" "$target/.claude/hooks/"
  cp "$SHARED/hooks/post-write-format.sh" "$target/.claude/hooks/"
  chmod +x "$target/.claude/hooks/"*.sh

  cp "$SHARED/settings.json" "$target/.claude/settings.json"

  for skill in "${SHARED_SKILLS[@]}"; do
    mkdir -p "$target/.claude/skills/$skill"
    cp "$SHARED/skills/$skill/SKILL.md" "$target/.claude/skills/$skill/SKILL.md"
  done

  gen_repo_json "$repo" "$target/.claude/repo.json"

  mkdir -p "$target/.github/workflows"
  for wf in "${SHARED_WORKFLOWS[@]}"; do
    [ -f "$SOURCE_WORKFLOWS/$wf" ] && cp "$SOURCE_WORKFLOWS/$wf" "$target/.github/workflows/$wf"
  done
  echo "✅ $repo synced"
}

while read -r repo; do
  target="$BASE_DIR/$repo"
  [ ! -d "$target" ] && echo "⏭ $repo not found, skipping" && continue
  sync_repo "$target" "$repo"
done < <(jq -r '.repos | keys[]' "$CONFIG")

# monorepo 自己也要 hooks/settings/共用 skills/repo.json
mkdir -p "$BASE_ROOT/.claude/hooks"
cp "$SHARED/hooks/"*.sh "$BASE_ROOT/.claude/hooks/"
chmod +x "$BASE_ROOT/.claude/hooks/"*.sh
cp "$SHARED/settings.json" "$BASE_ROOT/.claude/settings.json"
for skill in "${SHARED_SKILLS[@]}"; do
  mkdir -p "$BASE_ROOT/.claude/skills/$skill"
  cp "$SHARED/skills/$skill/SKILL.md" "$BASE_ROOT/.claude/skills/$skill/SKILL.md"
done
jq -n '{repo: "daodao", defaultBranch: "main", highRisk: false,
  quality: {fix: null, lint: null, typecheck: null, test: "pnpm test"},
  formatFile: null,
  reviewFocus: ["pipeline 腳本正確性：exit code、set -e 陷阱、jq 解析", "SSOT 一致性：新增設定是否進了 bin/pipeline.config.json"],
  protectedPaths: [".github/workflows/*", ".env*", "secrets/*"],
  generatedBy: "daodao/.claude/sync.sh"}' > "$BASE_ROOT/.claude/repo.json"

echo "🎉 Done"
