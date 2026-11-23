#!/usr/bin/env bash
# PreToolUse hook (Bash): agent 不得自行切換 GitHub repo 可見性
#
# 攔下：
#   - `gh repo edit ... --visibility <public|private|internal>`
#   - `gh api ... repos/<owner>/<repo> ...` 帶 `visibility=` 或 `private=` 欄位（REST PATCH 改可見性）
# 唯讀查詢（`gh repo view --json visibility`、`gh api repos/x --jq .visibility`）不攔。
#
# 為什麼：2026-11-07 一個 AI session 把 daodao-server 從 public 切回 private，
# 當時 secret scanning／push protection 仍開著，private repo 上這兩項是付費的 Secret Protection，
# 組織沒有付款方式 → $3.80 帳單收不到 → GitHub 鎖帳務、方案降成 Free、全組織 Actions 停擺。
# 可見性還牽涉公開歷史與憑證曝露，是對外、難回復的操作，一律交給人。
#
# 逃生口：啟動 session 的環境設 DAODAO_ALLOW_VISIBILITY_CHANGE="<原因>"，會寫進 gate ledger 留痕。
# 建議做法：請使用者自己在 prompt 用 `! gh repo edit ...` 執行。
set -euo pipefail

HOOKS_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$HOOKS_DIR/lib.sh"
hook_normalize_input

if ! jq --version >/dev/null 2>&1; then
  # 沒有 jq 時粗略比對原始 payload；像是在改可見性就擋（fail closed）
  if printf '%s' "$HOOK_RAW" | grep -qE -- '--visibility|visibility=|private='; then
    echo "❌ visibility-change-guard 需要 jq 解析工具輸入，但找不到 jq；看起來在改 repo 可見性，先擋下（brew install jq / apt install jq）" >&2
    exit 2
  fi
  exit 0
fi

cmd=$(printf '%s' "$HOOK_TOOL_INPUT" | jq -r '.command // empty' 2>/dev/null || true)
[ -z "$cmd" ] && exit 0

hit=""
# 逐段檢查（; && || | 分隔），避免「gh repo view x; echo --visibility」這類跨段誤判
while IFS= read -r seg; do
  if printf '%s' "$seg" | grep -qE '(^|[[:space:]])gh[[:space:]]+repo[[:space:]]+edit([[:space:]]|$)' \
    && printf '%s' "$seg" | grep -qE -- '(^|[[:space:]])--visibility([[:space:]=]|$)'; then
    hit="gh repo edit --visibility"
    break
  fi
  if printf '%s' "$seg" | grep -qE '(^|[[:space:]])gh[[:space:]]+api([[:space:]]|$)' \
    && printf '%s' "$seg" | grep -qE 'repos/[^[:space:]/]+/[^[:space:]/]+' \
    && printf '%s' "$seg" | grep -qE -- "(-f|-F|--field|--raw-field)[[:space:]=]+[\"']?(visibility|private)="; then
    hit="gh api repos/... visibility/private"
    break
  fi
done < <(printf '%s\n' "$cmd" | sed -E 's/(\&\&|\|\||;|\|)/\n/g')

[ -n "$hit" ] || exit 0

if [ -n "${DAODAO_ALLOW_VISIBILITY_CHANGE:-}" ]; then
  log_gate_event "repo-visibility-change" "$hit" "skip" "${DAODAO_ALLOW_VISIBILITY_CHANGE}"
  echo "⚠️ visibility-change-guard 放行（DAODAO_ALLOW_VISIBILITY_CHANGE=${DAODAO_ALLOW_VISIBILITY_CHANGE}），已留痕" >&2
  exit 0
fi

log_gate_event "repo-visibility-change" "$hit" "block" ""
cat >&2 <<'EOF'
❌ agent 不可自行切換 GitHub repo 可見性（public／private／internal）。

切可見性是對外、難回復的操作，而且會影響帳單：
- public → private 時若 secret scanning／push protection／code scanning 還開著，
  會變成付費的 Advanced Security（按 active committer 計費）。
  2026-11-07 daodao-server 就因此產生 $3.80，組織沒有付款方式而被鎖帳務、整個組織的 Actions 停擺。
- private → public 會公開完整 git 歷史，可能曝露舊憑證。

請改成：
1. 停下來，向使用者說明要切哪個 repo、為什麼，以及上述風險。
2. 若要切 private：先請使用者到 repo Settings → Advanced Security 關掉 secret scanning、push protection、code scanning
   （或改套用「Legacy - private/internal repositories」安全設定），再切。
3. 由使用者自己在 prompt 執行：! gh repo edit <owner>/<repo> --visibility <...> --accept-visibility-change-consequences
EOF
exit 2
