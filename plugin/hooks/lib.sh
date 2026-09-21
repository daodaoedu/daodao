#!/usr/bin/env bash
# 共用函式庫 — profile 偵測、gate ledger、路徑工具

HOOKS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROFILES_DIR="$HOOKS_DIR/profiles"
LEDGER_DIR="${HOME}/.cache/daodao-harness"
LEDGER_FILE="$LEDGER_DIR/gate-ledger.jsonl"

mkdir -p "$LEDGER_DIR"

detect_profile() {
  local filepath="$1"

  # daodao-f2e 底下的 .ts/.tsx/.vue → frontend
  if echo "$filepath" | grep -qE '(daodao-f2e|daodao-admin-ui)/'; then
    echo "frontend"
    return
  fi

  # daodao-server / daodao-ai-backend → backend
  if echo "$filepath" | grep -qE '(daodao-server|daodao-ai-backend)/'; then
    echo "backend"
    return
  fi

  # 依副檔名 fallback
  if echo "$filepath" | grep -qE '\.(vue|tsx)$'; then
    echo "frontend"
  elif echo "$filepath" | grep -qE '\.(ts|js)$'; then
    echo "backend"
  else
    echo ""
  fi
}

log_gate_event() {
  local rule_id="$1"
  local filepath="$2"
  local result="$3"  # block / warn / pass
  local profile="$4"
  local timestamp
  timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

  printf '{"ts":"%s","rule":"%s","file":"%s","result":"%s","profile":"%s"}\n' \
    "$timestamp" "$rule_id" "$filepath" "$result" "$profile" >> "$LEDGER_FILE"
}

check_pattern() {
  local content="$1"
  local pattern="$2"

  if [ -z "$pattern" ] || [ "$pattern" = "null" ]; then
    return 1
  fi

  echo "$content" | grep -qE "$pattern"
}

path_matches() {
  local filepath="$1"
  local pattern="$2"

  if [ -z "$pattern" ] || [ "$pattern" = "null" ]; then
    return 0  # no pattern = match all
  fi

  echo "$filepath" | grep -qE "$pattern"
}

path_excluded() {
  local filepath="$1"
  local pattern="$2"

  if [ -z "$pattern" ] || [ "$pattern" = "null" ]; then
    return 1  # no exclude = not excluded
  fi

  echo "$filepath" | grep -qE "$pattern"
}

# --- harness 正規化 -----------------------------------------------------
# Claude Code 把 hook 輸入放在 CLAUDE_TOOL_INPUT／CLAUDE_TOOL_NAME 環境變數；
# Codex 把事件 JSON 放 stdin。兩邊都讀，統一成 HOOK_TOOL_INPUT／HOOK_TOOL_NAME／HOOK_CWD，
# 讓同一批腳本在兩個 harness 上行為一致。
#
# HOOK_RAW 保留未解析的原文，給 jq 不在時的 fail-closed 判斷用。
hook_normalize_input() {
  HOOK_RAW="${CLAUDE_TOOL_INPUT:-}"

  if [ -z "$HOOK_RAW" ] && [ ! -t 0 ]; then
    # 只有在 Claude Code 沒給環境變數時才碰 stdin（Codex 路徑），避免無謂阻塞
    HOOK_RAW="$(cat 2>/dev/null || true)"
  fi

  if [ -n "${CLAUDE_TOOL_INPUT:-}" ]; then
    HOOK_TOOL_INPUT="$CLAUDE_TOOL_INPUT"
    HOOK_TOOL_NAME="${CLAUDE_TOOL_NAME:-}"
  elif [ -n "$HOOK_RAW" ] && jq --version >/dev/null 2>&1; then
    # Codex 事件外面多包一層，tool_input 才是 Claude Code 的等價物
    HOOK_TOOL_INPUT="$(printf '%s' "$HOOK_RAW" | jq -c '.tool_input // .toolInput // .' 2>/dev/null || printf '%s' "$HOOK_RAW")"
    HOOK_TOOL_NAME="$(printf '%s' "$HOOK_RAW" | jq -r '.tool_name // .toolName // empty' 2>/dev/null || true)"
  else
    HOOK_TOOL_INPUT="$HOOK_RAW"
    HOOK_TOOL_NAME=""
  fi

  # 工作目錄獨立解析：SessionStart 這類事件只有 CLAUDE_WORKING_DIRECTORY、沒有 tool input，
  # 綁在上面的 if 裡會整個被跳過，hook 就跑去掃真正的 cwd 而不是指定的工作區。
  HOOK_CWD="${CLAUDE_WORKING_DIRECTORY:-}"
  if [ -z "$HOOK_CWD" ] && [ -n "$HOOK_RAW" ] && jq --version >/dev/null 2>&1; then
    HOOK_CWD="$(printf '%s' "$HOOK_RAW" | jq -r '.cwd // .workingDirectory // empty' 2>/dev/null || true)"
  fi
  [ -n "$HOOK_CWD" ] || HOOK_CWD="$(pwd)"

  export HOOK_RAW HOOK_TOOL_INPUT HOOK_TOOL_NAME HOOK_CWD
}
