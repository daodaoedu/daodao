#!/usr/bin/env bash
# ensure-labels.sh 回歸測試：用假的 gh 模擬 GitHub API，驗證只建立缺少的 label、不改已存在的、失敗會回報
set -euo pipefail

SCRIPT="$(cd "$(dirname "$0")" && pwd)/ensure-labels.sh"
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

cat > "$WORK/gh" <<'FAKE'
#!/usr/bin/env bash
# 假 gh：$EXISTING 列出已存在的 label（以 | 分隔，URL 編碼後比對），$FAIL_CREATE=1 時建立失敗
printf '%s\n' "$*" >> "$GH_LOG"
path="$2"
if [ "${3:-}" = --method ] && [ "$4" = POST ]; then
  [ "${FAIL_CREATE:-0}" = 1 ] && exit 1
  exit 0
fi
label="${path##*/labels/}"
case "|$EXISTING|" in *"|$label|"*) exit 0 ;; esac
exit 1
FAKE
chmod +x "$WORK/gh"

pass=0
fail() { echo "❌ $1"; exit 1; }
run() {  # $1=existing $2=fail_create → exit code；呼叫紀錄在 $WORK/log
  : > "$WORK/log"
  local code=0
  PATH="$WORK:$PATH" GH_LOG="$WORK/log" EXISTING="$1" FAIL_CREATE="$2" bash "$SCRIPT" daodaoedu/x >"$WORK/out" 2>&1 || code=$?
  echo "$code"
}
creates() { grep -c -- '--method POST' "$WORK/log" || true; }

[ "$(run '' 0)" = 0 ] || fail "兩個都缺時應成功"
[ "$(creates)" = 2 ] || fail "兩個都缺時應建立 2 個，實際 $(creates)"
grep -q 'name=ai-review ' "$WORK/log" && grep -q 'name=ai-review:full ' "$WORK/log" || fail "應建立 ai-review 與 ai-review:full"
echo "✅ 缺少的 label 會建立"; pass=$((pass+1))

[ "$(run 'ai-review|ai-review%3Afull' 0)" = 0 ] || fail "都存在時應成功"
[ "$(creates)" = 0 ] || fail "都存在時不應建立或改動任何 label"
echo "✅ 已存在的 label 不改動"; pass=$((pass+1))

[ "$(run 'ai-review%3Afull' 0)" = 0 ] || fail "只缺一個時應成功"
[ "$(creates)" = 1 ] && grep -q 'name=ai-review ' "$WORK/log" || fail "只缺 ai-review 時應只建立它"
echo "✅ 只建立缺少的那一個"; pass=$((pass+1))

[ "$(run '' 1)" = 1 ] || fail "建立失敗時應 exit 1"
grep -q '::warning::無法建立 label' "$WORK/out" || fail "建立失敗時應輸出 warning"
echo "✅ 建立失敗會回報"; pass=$((pass+1))

echo "✅ ensure-labels tests passed ($pass)"
