#!/usr/bin/env bash
# 發 PR 前的閘門預演：在 develop verify 結束時跑，一次列出 pre-pr-gate 閘門 1–8 的所有缺漏。
# gate ledger 裡 133 次擋下（缺驗證證據 64、缺核心旅程矩陣 41、狀態沒到 verified 28）都是開 PR 當下才發現；
# 預演讓這些缺漏在 commit／finish 前就看到，而且不寫 ledger、不影響統計。
#
# 用法：
#   bash <daodao root>/plugin/hooks/pre-pr-gate-preview.sh <任務資料夾> [<repo 資料夾名>] [<PR body 檔>]
#   repo 省略時取任務資料夾底下唯一的 daodao-*；PR body 省略時用 <任務資料夾>/notes/pr-body-<repo>.md
# exit 0 = 閘門 1–8 都會通過；2 = 有缺漏（訊息在 stderr）；1 = 用法錯誤
set -euo pipefail

HOOKS_DIR="$(cd "$(dirname "$0")" && pwd)"
task_dir="${1:-}"
[ -n "$task_dir" ] && [ -f "$task_dir/task.md" ] || { echo "用法：pre-pr-gate-preview.sh <含 task.md 的任務資料夾> [repo] [PR body 檔]" >&2; exit 1; }
task_dir="$(cd "$task_dir" && pwd -P)"

repo="${2:-}"
if [ -z "$repo" ]; then
  repos=$(find "$task_dir" -mindepth 1 -maxdepth 1 -type d -name 'daodao*' -exec basename {} \; | sort)
  [ "$(printf '%s\n' "$repos" | grep -c .)" = 1 ] || { echo "任務資料夾有多個 repo（$(echo $repos)），請指定第二個參數" >&2; exit 1; }
  repo="$repos"
fi
[ -d "$task_dir/$repo" ] || { echo "找不到 $task_dir/$repo" >&2; exit 1; }

body="${3:-$task_dir/notes/pr-body-$repo.md}"
if [ ! -f "$body" ]; then
  echo "⚠️  PR body 檔還沒寫（$body）：照 develop finish.md 第 8 步的範本先寫好，閘門 5 才檢查得到「## 驗證證據」" >&2
fi

input=$(jq -cn --arg c "gh pr create --base dev --body-file \"$body\"" '{command: $c}')
PRE_PR_GATE_PREVIEW=1 DEV_TASK_DELIVERY_GATE_MODE=off \
  CLAUDE_TOOL_INPUT="$input" CLAUDE_WORKING_DIRECTORY="$task_dir/$repo" \
  bash "$HOOKS_DIR/pre-pr-gate.sh"
