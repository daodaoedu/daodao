#!/usr/bin/env bash
# Session Start hook (Layer 1): 注入 worktree 狀態與開發 context
set -uo pipefail

HOOKS_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$HOOKS_DIR/lib.sh"
hook_normalize_input

PROJECT_ROOT="$HOOK_CWD"

# 任務清單只逐列「最近有動、還沒結案」的任務，其餘各收成一行數量。
# 2026-11-26：worktrees/ 累積到 212 個有 checkout 的任務，每個 session 注入 12.8KB 還被截斷，
# 真正在做的任務反而看不到。只看本機 task.md（狀態字與修改時間），不連網、不查 issue 狀態。
TASK_RECENT_DAYS=14
TASK_LIST_MAX=30
# 帶 --all-tasks 手動執行：不篩選、不設上限，列完任務清單就結束
LIST_ALL_TASKS=0
[ "${1:-}" = "--all-tasks" ] && LIST_ALL_TASKS=1

# task.md 的狀態原文：task-template 是「## Status」標題下一行；
# 舊任務用單行「Status: xxx」或清單項「- Status: xxx」（多筆時第一筆是最新的）
task_status_raw() {
  local st
  st=$(awk '
    /^## Status[[:space:]]*$/ {
      if ((getline nxt) > 0 && nxt !~ /^[[:space:]]*$/) { print nxt; found = 1; exit }
    }
    fb == "" && /^[[:space:]]*(-[[:space:]]+)?Status:/ {
      fb = $0
      sub(/^[[:space:]]*(-[[:space:]]+)?Status:[[:space:]]*/, "", fb)
    }
    END { if (!found) print fb }
  ' "$1" 2>/dev/null)
  st="${st#"${st%%[![:space:]]*}"}"
  printf '%s' "$st"
}

# 顯示用：task-template 的五個狀態詞後面常接備註（「verified（停在 commit 前…）」），
# 只顯示狀態詞；其他自由文字截短
TEMPLATE_STATUS_RE='^(planning|implementing|verified|in-review|merged)([^a-z-]|$)'
task_status_label() {
  local st="$1"
  if [[ "$st" =~ $TEMPLATE_STATUS_RE ]]; then
    st="${BASH_REMATCH[1]}"
  else
    st="${st:0:40}"
  fi
  printf '%s' "${st:-?}"
}

task_status() {
  task_status_label "$(task_status_raw "$1")"
}

# 終態＝開頭是 complete／completed／done／closed，或 merged-…-closed。
# 單純的 merged 不算：merge 不等於 Done，還要 dev 部署與驗收。
TERMINAL_STATUS_RE='^((completed?|done|closed)([^a-z]|$)|merged(-[a-z0-9]+)*-closed([^a-z0-9-]|$))'
is_terminal_status() {
  local rc=1
  shopt -s nocasematch
  if [[ "$1" =~ $TERMINAL_STATUS_RE ]]; then rc=0; fi
  shopt -u nocasematch
  return $rc
}

# 修改時間（epoch 秒）。GNU stat 用 -c、BSD／macOS 用 -f，只探測一次
if stat -c %Y "$HOOKS_DIR" >/dev/null 2>&1; then
  file_mtime() { stat -c %Y "$1" 2>/dev/null || echo 0; }
else
  file_mtime() { stat -f %m "$1" 2>/dev/null || echo 0; }
fi

# 任務資料夾底下還有程式碼 checkout（worktree 或 clone）才算進行中
has_checkout() {
  local d
  [ -e "$1/.git" ] && return 0
  for d in "$1"/*/; do
    [ -e "${d}.git" ] && return 0
  done
  return 1
}

echo "🏗️  daodao-guard v0.1.0"
echo ""

# === 1. 偵測工作位置 ===
GIT_ROOT=$(cd "$PROJECT_ROOT" && git rev-parse --show-toplevel 2>/dev/null) || true

if echo "$PROJECT_ROOT" | grep -q 'worktrees/'; then
  task_dir=$(echo "$PROJECT_ROOT" | grep -oE 'worktrees/[^/]+')
  task_md="$PROJECT_ROOT/task.md"
  if [ -z "$task_dir" ]; then
    task_md=$(find "$PROJECT_ROOT" -maxdepth 2 -name "task.md" 2>/dev/null | head -1)
  fi

  echo "📍 工作區：$task_dir"
  if [ -n "$task_md" ] && [ -f "$task_md" ]; then
    status=$(task_status "$task_md")
    echo "   狀態：$status"
  fi
else
  echo "📍 工作區：monorepo root"
fi

# === 1b. 工作樹裡的 skill 正本是否落後 main ===
# AGENTS.md 的流程入口寫的是 repo 內路徑（plugin/skills/...）。checkout 停在舊分支時，
# 照路徑讀到的是過期副本：2026-11-17 review-change 讀到落後 38 個 commit 的版本，
# 跑了已下架的 OMP 模型；已安裝 plugin 其實早已更新。只比對本機 origin/main，不連網。
if [ -n "$GIT_ROOT" ] && [ -d "$GIT_ROOT/plugin/skills" ] \
  && git -C "$GIT_ROOT" rev-parse --verify -q refs/remotes/origin/main >/dev/null; then
  skills_behind=$(git -C "$GIT_ROOT" rev-list --count HEAD..refs/remotes/origin/main -- plugin/skills plugin/docs 2>/dev/null || echo 0)
  if [ "${skills_behind:-0}" -gt 0 ]; then
    root_branch=$(git -C "$GIT_ROOT" branch --show-current 2>/dev/null)
    echo ""
    echo "⚠️  工作樹的 plugin/skills 落後 origin/main ${skills_behind} 個 commit（branch=${root_branch:-detached}）："
    echo "   執行流程 skill 用已安裝的 plugin 版本（Claude Code：Skill tool daodao:<name>），"
    echo "   或讀 git show origin/main:plugin/skills/<name>/SKILL.md；不要直接讀這個工作樹的 plugin/skills/。"
  fi
fi

# === 2. 列出進行中的 worktrees ===
WORKTREES_DIR="$PROJECT_ROOT/worktrees"
if [ ! -d "$WORKTREES_DIR" ]; then
  # 可能在 worktree 裡面，往上找
  parent=$(dirname "$PROJECT_ROOT")
  if [ -d "$parent/worktrees" ]; then
    WORKTREES_DIR="$parent/worktrees"
  fi
fi

if [ -d "$WORKTREES_DIR" ]; then
  total=0
  records=0
  finished=0
  stale=0
  recent=0
  rows=""
  recent_cutoff=$(( $(date +%s) - TASK_RECENT_DAYS * 86400 ))
  for d in "$WORKTREES_DIR"/*/; do
    [ -d "$d" ] || continue
    d="${d%/}"
    total=$((total + 1))
    if ! has_checkout "$d"; then records=$((records + 1)); continue; fi
    # 沒有 task.md 的資料夾沒有狀態可讀，用資料夾自己的修改時間判斷新舊
    if [ -f "$d/task.md" ]; then
      raw=$(task_status_raw "$d/task.md")
      label=$(task_status_label "$raw")
      stamp="$d/task.md"
    else
      raw=""
      label="(no task.md)"
      stamp="$d"
    fi
    if [ "$LIST_ALL_TASKS" -eq 0 ] && is_terminal_status "$raw"; then finished=$((finished + 1)); continue; fi
    mtime=$(file_mtime "$stamp")
    if [ "$LIST_ALL_TASKS" -eq 0 ] && [ "$mtime" -lt "$recent_cutoff" ]; then stale=$((stale + 1)); continue; fi
    recent=$((recent + 1))
    rows="${rows}${mtime}"$'\t'"   ${d##*/} → ${label}"$'\n'
  done

  if [ "$total" -gt 0 ]; then
    echo ""
    if [ "$LIST_ALL_TASKS" -eq 1 ]; then
      echo "📂 有程式碼 checkout 的任務，全部 (${recent})，最近動過的在前："
      printf '%s' "$rows" | sort -t $'\t' -k1,1nr | cut -f2-
    else
      echo "📂 進行中的任務 (${recent})：${TASK_RECENT_DAYS} 天內有動、尚未結案，最近動過的在前"
      printf '%s' "$rows" | sort -t $'\t' -k1,1nr | head -n "$TASK_LIST_MAX" | cut -f2-
      if [ "$recent" -gt "$TASK_LIST_MAX" ]; then
        echo "   ⋯ 另有 $((recent - TASK_LIST_MAX)) 個也在 ${TASK_RECENT_DAYS} 天內有動，只列最近動過的 ${TASK_LIST_MAX} 個"
      fi
      if [ "$stale" -gt 0 ]; then
        echo "   💤 另有 $stale 個任務超過 ${TASK_RECENT_DAYS} 天沒動"
      fi
      if [ "$finished" -gt 0 ]; then
        echo "   ✅ 另有 $finished 個任務已結案（狀態是 complete／done／closed／merged-…-closed）"
      fi
    fi
    if [ "$records" -gt 0 ]; then
      echo "   📁 另有 $records 個任務只剩紀錄（程式碼已移除，等冒煙／PM 驗收後刪資料夾）"
    fi
    if [ "$LIST_ALL_TASKS" -eq 0 ]; then
      echo "   📊 worktrees/ 共 $total 個任務資料夾；完整清單：bash \"$HOOKS_DIR/session-start.sh\" --all-tasks"
    fi
  fi
fi

if [ "$LIST_ALL_TASKS" -eq 1 ]; then
  exit 0
fi

# === 3. projects/ 子模組狀態 ===
PROJECTS_DIR="$PROJECT_ROOT/projects"
if [ -d "$PROJECTS_DIR" ]; then
  dirty_repos=""
  for repo_dir in "$PROJECTS_DIR"/*/; do
    [ -d "$repo_dir/.git" ] || [ -f "$repo_dir/.git" ] || continue
    repo_name=$(basename "$repo_dir")
    branch=$(cd "$repo_dir" && git branch --show-current 2>/dev/null || echo "?")
    is_dirty=$(cd "$repo_dir" && git status --porcelain 2>/dev/null | head -1)

    # 預期分支＝該 repo 的 default branch，不是一律 dev：worker 與 infra 的預設是 main，
    # 硬編成 dev 會讓它們每個 session 都被誤報，久了整段就被當背景噪音
    # （2026-09-20：infra 長期顯示 ⚠️ branch=main，其實完全正常）。
    expected=$(cd "$repo_dir" && git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null | sed 's|^origin/||')
    if [ -n "$expected" ] && [ "$branch" != "$expected" ]; then
      # origin/HEAD 是本機快取，遠端改過預設分支就會過期（admin-ui 本機仍寫 main，實際是 dev）。
      # 只在不一致時付一次網路成本重抓，確認真的異常才提醒。
      (cd "$repo_dir" && git remote set-head origin -a >/dev/null 2>&1) || true
      expected=$(cd "$repo_dir" && git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null | sed 's|^origin/||')
    fi
    [ -n "$expected" ] || expected="dev"

    if [ "$branch" != "$expected" ] || [ -n "$is_dirty" ]; then
      # 注意：全形括號緊接 $branch 會被 bash 併進變數名，一定要加大括號
      dirty_repos="$dirty_repos\n   ⚠️  ${repo_name}: branch=${branch}"
      # 只有分支真的不對才提預期值；相符時多印一個「（預期 dev）」只是噪音
      [ "$branch" != "$expected" ] && dirty_repos="${dirty_repos}（預期 ${expected}）"
      [ -n "$is_dirty" ] && dirty_repos="$dirty_repos (dirty)"
    fi
  done

  if [ -n "$dirty_repos" ]; then
    echo ""
    echo "⚠️  projects/ 異常狀態（預期＝各 repo 的 default branch）："
    echo -e "$dirty_repos"
  fi
fi

# === 4. Gate Ledger 摘要 ===
LEDGER_FILE="${HOME}/.cache/daodao-harness/gate-ledger.jsonl"
if [ -f "$LEDGER_FILE" ]; then
  today=$(date -u +"%Y-%m-%d")
  today_blocks=$(grep "$today" "$LEDGER_FILE" 2>/dev/null | grep '"block"' | wc -l | tr -d ' ')
  today_warns=$(grep "$today" "$LEDGER_FILE" 2>/dev/null | grep '"warn"' | wc -l | tr -d ' ')
  total=$(wc -l < "$LEDGER_FILE" | tr -d ' ')

  if [ "$today_blocks" -gt 0 ] || [ "$today_warns" -gt 0 ]; then
    echo ""
    echo "📈 今日 Gate 統計：$today_blocks blocks, $today_warns warns（累計 $total 筆）"
  fi
fi

# === 5. 卡住的共用設定同步 PR ===
# sync-claude-config 用 auto-merge：checks 紅的同步 PR 會靜靜留著，workflow run 卻是綠的。
# 2026-09-20 的教訓是「紅燈 job 一整天沒人看」，所以把訊號放在每次 session 都會經過的地方。
# 單一 search 查詢（head: 限定詞；標題會被 auto-pr-description 改寫，不能用標題比對）、
# 逾時即放棄、結果快取 3 小時；查不到就安靜跳過，絕不拖慢開場。
SYNC_CACHE="${HOME}/.cache/daodao-harness/stale-sync-prs"
if command -v gh >/dev/null 2>&1; then
  mkdir -p "$(dirname "$SYNC_CACHE")"
  cache_age=999999
  if [ -f "$SYNC_CACHE" ]; then
    cache_mtime=$(stat -c %Y "$SYNC_CACHE" 2>/dev/null || stat -f %m "$SYNC_CACHE" 2>/dev/null || echo 0)
    cache_age=$(( $(date +%s) - cache_mtime ))
  fi
  if [ "$cache_age" -gt 10800 ]; then
    # macOS 沒有 coreutils 的 timeout；有 gtimeout 就用，兩者都沒有就直接跑（gh 自己有網路逾時）
    TIMEOUT_CMD=""
    for t in timeout gtimeout; do command -v "$t" >/dev/null 2>&1 && TIMEOUT_CMD="$t 8" && break; done
    cutoff=$(date -u -v-24H +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -u -d '24 hours ago' +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || echo "")
    if [ -n "$cutoff" ]; then
      # shellcheck disable=SC2086
      $TIMEOUT_CMD gh search prs --owner daodaoedu --state open "head:chore/sync-claude-config-" \
        --created "<$cutoff" --json repository,number,createdAt \
        --jq '.[] | "   \(.repository.nameWithOwner)#\(.number) 自 \(.createdAt[:10]) 未合"' \
        > "$SYNC_CACHE" 2>/dev/null || : > "$SYNC_CACHE"
    fi
  fi
  if [ -s "$SYNC_CACHE" ]; then
    echo ""
    echo "🔁 共用設定同步 PR 卡住超過 24 小時（checks 沒過，auto-merge 不會合）："
    cat "$SYNC_CACHE"
    echo "   查原因：gh pr checks <PR-URL>"
  fi
fi

echo ""

exit 0
