#!/usr/bin/env bash
# 讓各子專案接上 daodao plugin（skills + hooks + 模板），並同步共用 workflows。
# 用法: .claude/sync.sh /path/to/daodao
#
# 2026-09-21 起不再逐檔複製 hooks 與 skills——那是漂移的來源。
# 子專案只寫一份 settings.json 指向 marketplace，實際內容由 plugin 提供，
# 更新 plugin 後子專案下次開 session 就拿到新版。
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BASE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SOURCE_SETTINGS="$SCRIPT_DIR/settings.json"
SOURCE_WORKFLOWS="$BASE_ROOT/.github/workflows"

# 要同步的共用 workflows（頂層 → 子專案）
SHARED_WORKFLOWS=(auto-pr-description.yml code-review.yml)

REPOS=(daodao-f2e daodao-server daodao-ai-backend daodao-storage daodao-worker daodao-infra daodao-admin-ui)

if [ "${1:-}" = "" ]; then
  echo "Usage: $0 /path/to/daodao-parent-dir"
  echo "  Example: $0 /Users/xiaoxu/Projects/daodao"
  exit 1
fi

BASE_DIR="$1"

# permissions 與 plugin 設定從頂層 settings.json 取，確保單一來源。
# 濾掉 null：`{a,b,c}` 對缺席的 key 會給 null，而 `.[0] * .[1]` 會把 null 寫進子專案，
# 等於把它原本的設定清掉。
PLUGIN_SETTINGS=$(jq '{permissions, extraKnownMarketplaces, enabledPlugins}
  | with_entries(select(.value != null))' "$SOURCE_SETTINGS")

if [ "$(printf '%s' "$PLUGIN_SETTINGS" | jq -r 'has("enabledPlugins")')" != "true" ]; then
  echo "❌ 頂層 .claude/settings.json 沒有 enabledPlugins，同步出去的子專案會拿不到 plugin。" >&2
  exit 1
fi

for repo in "${REPOS[@]}"; do
  target="$BASE_DIR/$repo"
  [ ! -d "$target" ] && echo "⏭ $repo not found, skipping" && continue

  mkdir -p "$target/.claude"

  # 合併 settings.json：保留子專案自己的設定，覆蓋 plugin 與 permissions 區塊。
  # del(.hooks) 不可省：深合併不會移除子專案原有的 hooks 區塊，而那些設定指向的
  # .claude/hooks/*.sh 下面就會被刪掉，留著等於每次 Write/Edit 都去執行不存在的檔案。
  # hooks 現在一律由 plugin 提供。
  if [ -f "$target/.claude/settings.json" ]; then
    jq -s '.[0] * .[1] | del(.hooks)' "$target/.claude/settings.json" <(printf '%s' "$PLUGIN_SETTINGS") \
      > "$target/.claude/settings.json.tmp"
    mv "$target/.claude/settings.json.tmp" "$target/.claude/settings.json"
  else
    printf '%s\n' "$PLUGIN_SETTINGS" | jq 'del(.hooks)' > "$target/.claude/settings.json"
  fi

  # 清掉舊版逐檔複製的產物，避免與 plugin 版本並存後雙重觸發。
  # 整批刪而不是列舉檔名：歷年同步過的腳本不只兩支，漏掉的會跟 plugin hooks 疊加觸發。
  if [ -d "$target/.claude/hooks" ]; then
    rm -f "$target/.claude/hooks"/*.sh "$target/.claude/hooks"/*.py "$target/.claude/hooks/profiles"/*.json
    echo "   🧹 移除舊 hooks 複本"
  fi
  rmdir "$target/.claude/hooks/profiles" 2>/dev/null || true
  for stale_skill in collect-pr-feedback post-merge-wrapup; do
    dir="$target/.claude/skills/$stale_skill"
    [ -d "$dir" ] && rm -rf "$dir" && echo "   🧹 移除舊複本 .claude/skills/$stale_skill"
  done
  rmdir "$target/.claude/hooks" 2>/dev/null || true
  rmdir "$target/.claude/skills" 2>/dev/null || true

  # 同步共用 workflows
  mkdir -p "$target/.github/workflows"
  for wf in "${SHARED_WORKFLOWS[@]}"; do
    [ -f "$SOURCE_WORKFLOWS/$wf" ] && cp "$SOURCE_WORKFLOWS/$wf" "$target/.github/workflows/$wf"
  done

  echo "✅ $repo synced（plugin: daodao@daodao）"
done

echo "🎉 Done"
echo
echo "子專案第一次開 Claude Code session 時會自動從 marketplace 取得 plugin。"
echo "若沒有自動載入，在該 repo 執行：/plugin marketplace add daodaoedu/daodao"
