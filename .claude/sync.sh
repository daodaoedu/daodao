#!/usr/bin/env bash
# 同步 .claude/ 和 .github/workflows/ 到所有子專案
# 用法: .claude/sync.sh /path/to/daodao
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BASE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SOURCE_HOOKS="$SCRIPT_DIR/hooks"
SOURCE_SETTINGS="$SCRIPT_DIR/settings.json"
SOURCE_WORKFLOWS="$BASE_ROOT/.github/workflows"

# 要同步的共用 workflows（頂層 → 子專案）
SHARED_WORKFLOWS=(auto-pr-description.yml code-review.yml)

REPOS=(daodao-f2e daodao-server daodao-ai-backend daodao-storage daodao-worker daodao-infra)

if [ "${1:-}" != "" ]; then
  BASE_DIR="$1"
  for repo in "${REPOS[@]}"; do
    target="$BASE_DIR/$repo"
    [ ! -d "$target" ] && echo "⏭ $repo not found, skipping" && continue

    # 同步 .claude/hooks
    mkdir -p "$target/.claude/hooks"
    cp "$SOURCE_HOOKS/pre-write-guard.sh" "$target/.claude/hooks/"
    cp "$SOURCE_HOOKS/post-write-format.sh" "$target/.claude/hooks/"
    chmod +x "$target/.claude/hooks/"*.sh

    # 合併 settings.json（保留現有設定，加入 hooks + permissions）
    if [ -f "$target/.claude/settings.json" ]; then
      jq -s '.[0] * .[1]' "$target/.claude/settings.json" "$SOURCE_SETTINGS" > "$target/.claude/settings.json.tmp"
      mv "$target/.claude/settings.json.tmp" "$target/.claude/settings.json"
    else
      cp "$SOURCE_SETTINGS" "$target/.claude/settings.json"
    fi

    # 同步共用 skills
    for skill in collect-pr-feedback; do
      if [ -d "$SCRIPT_DIR/skills/$skill" ]; then
        mkdir -p "$target/.claude/skills/$skill"
        cp "$SCRIPT_DIR/skills/$skill/SKILL.md" "$target/.claude/skills/$skill/SKILL.md"
      fi
    done

    # 同步共用 workflows
    mkdir -p "$target/.github/workflows"
    for wf in "${SHARED_WORKFLOWS[@]}"; do
      if [ -f "$SOURCE_WORKFLOWS/$wf" ]; then
        cp "$SOURCE_WORKFLOWS/$wf" "$target/.github/workflows/$wf"
      fi
    done

    echo "✅ $repo synced"
  done
  echo "🎉 Done"
  exit 0
fi

echo "Usage: $0 /path/to/daodao-parent-dir"
echo "  Example: $0 /Users/xiaoxu/Projects/daodao"
