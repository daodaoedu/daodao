#!/usr/bin/env bash
# test-retrieve-context.sh — retrieve-context.sh 的 fixture 回歸測試
#
# 重演筆記裡 #1374 的形態：PR 只修了一個 postMessage 呼叫點，
# 斷言 context pack 必須列出其他檔案裡的同類呼叫點與被改元件的 importer。
# 每次改 retrieve-context.sh 都要過這關。
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
RETRIEVE="$SCRIPT_DIR/retrieve-context.sh"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

cd "$TMP"
git init -q -b main
git config user.email test@test && git config user.name test

mkdir -p src/components src/lib
# 同一種呼叫模式散在多個檔案（PR 只會修其中一個）
cat > src/lib/sdk.ts <<'EOF'
export function sendPing() {
  window.parent.postMessage({ type: "ping" }, "*");
}
EOF
cat > src/lib/chatbotInit.ts <<'EOF'
export function init() {
  window.parent.postMessage({ type: "init" }, "*");
}
EOF
cat > src/components/Navbar.tsx <<'EOF'
export function Navbar() {
  const notify = () => window.parent.postMessage({ type: "nav" }, "*");
  return null;
}
EOF
cat > src/components/InputBar.tsx <<'EOF'
import { helperFn } from "../lib/helper";
export function InputBar() {
  return null;
}
EOF
cat > src/lib/helper.ts <<'EOF'
export function helperFn() {
  return 1;
}
EOF
git add -A && git commit -qm "base"

# PR branch：只修 sdk.ts 的 postMessage（加 origin 參數），並改動 helper.ts
git checkout -qb fix/postmessage-origin
cat > src/lib/sdk.ts <<'EOF'
export function sendPing() {
  window.parent.postMessage({ type: "ping" }, window.location.origin);
}
EOF
cat > src/lib/helper.ts <<'EOF'
export function helperFn() {
  return 2;
}
EOF
git add -A && git commit -qm "fix: postMessage origin (partial)"

PACK="$("$RETRIEVE" main fix/postmessage-origin)"

fail() { echo "❌ $1"; echo "---- pack ----"; printf '%s\n' "$PACK"; exit 1; }

# 斷言 1：漏掉的同類呼叫點檔案全部要在 pack 裡（#1374 的教訓）
for f in chatbotInit.ts Navbar.tsx; do
  printf '%s' "$PACK" | grep -q "$f" || fail "pack 缺少同類 postMessage 呼叫點：$f"
done

# 斷言 2：pack 不得把 diff 內的檔案當成 ⚠ 位置（sdk.ts 只能出現在統計，不在命中清單）
printf '%s' "$PACK" | grep -E '^\s+- (\./)?src/lib/sdk\.ts:' && fail "diff 內檔案 sdk.ts 被列為 diff 外命中"

# 斷言 3：被改檔案 helper.ts 的 importer（InputBar.tsx）要被列出
printf '%s' "$PACK" | grep -q "InputBar.tsx" || fail "pack 缺少 helper.ts 的 importer：InputBar.tsx"

# 斷言 4：reviewer 規則要注入
printf '%s' "$PACK" | grep -q "Incomplete scope" || fail "pack 缺少 Incomplete scope 規則"

echo "✅ retrieve-context fixture 回歸測試通過"
