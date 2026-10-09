#!/usr/bin/env bash
# Regression tests for plugin/hooks/pre-pr-gate.sh（dev-task 發 PR 閘門）。
# 每個案例建一個假的 worktrees/<n>-<slug>/task.md，模擬 Claude PreToolUse 的 CLAUDE_TOOL_INPUT。
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
HOOK="$SCRIPT_DIR/../../plugin/hooks/pre-pr-gate.sh"
[ -x "$HOOK" ] || chmod +x "$HOOK"

SANDBOX=$(mktemp -d)
SANDBOX=$(cd "$SANDBOX" && pwd -P)
export HOME="$SANDBOX/home"      # gate ledger 寫進沙盒，不污染真實 ~/.cache
mkdir -p "$HOME"
trap 'rm -rf "$SANDBOX"' EXIT

fail() { echo "❌ $1"; exit 1; }

# 建任務資料夾：$1=repo 名  $2=task.md 內容  回傳 task_dir
make_task() {
  local repo="$1" content="$2" n
  n=$(( $(ls "$SANDBOX/root/worktrees" 2>/dev/null | wc -l) + 100 ))
  local task_dir="$SANDBOX/root/worktrees/$n-case"
  mkdir -p "$task_dir/$repo" "$task_dir/notes"
  printf '%s\n' "$content" > "$task_dir/task.md"
  make_delivery "$task_dir/$repo"
  echo "$task_dir"
}

# 交付 fixture 在真實 Git repo 留下 base / head；證據放 task 目錄，避免污染 repo。
make_delivery() {
  python3 - "$1" <<'PYFIXTURE'
import hashlib, json, pathlib, subprocess, sys
repo = pathlib.Path(sys.argv[1])
def git(*args):
    return subprocess.check_output(['git', '-C', str(repo), *args], text=True, stderr=subprocess.DEVNULL).strip()
git('init', '-q')
git('config', 'user.name', 'Gate Test')
git('config', 'user.email', 'gate@example.invalid')
if not (repo / '.git/HEAD').exists():
    raise SystemExit('fixture repository missing')
try:
    base = git('rev-parse', '--verify', 'HEAD')
except subprocess.CalledProcessError:
    (repo / 'delivery.txt').write_text('base\n')
    git('add', '-A')
    git('commit', '-qm', 'base')
    base = git('rev-parse', 'HEAD')
git('update-ref', 'refs/remotes/origin/main', base)
git('update-ref', 'refs/remotes/origin/dev', base)
(repo / 'delivery.txt').write_text('changed\n')
git('add', '-A')
git('commit', '-qm', 'delivery')
head = git('rev-parse', 'HEAD')
paths = sorted(set(git('diff', '--name-only', base, head).splitlines()))
trace = repo.parent / ('trace.' + repo.name + '.json')
trace.write_text(json.dumps(dict(head_revision=head, events=[dict(kind='local-write', targets=paths)])))
artifact = dict(mode='development', claims=[], questions=[], owned_paths=paths, writes=paths,
                recurrences=[], base_revision=base, head_revision=head,
                trace=dict(ref=trace.name, sha256=hashlib.sha256(trace.read_bytes()).hexdigest()))
(repo.parent / ('agent-handoff.' + repo.name + '.json')).write_text(json.dumps(artifact))
PYFIXTURE
}

# 跑 hook：$1=cwd  $2=指令  → 輸出 exit code；stderr 存到 $ERR_FILE（run_hook 在 $(...) 子 shell 內跑，變數帶不出來）
ERR_FILE="$SANDBOX/last.err"
OUT_FILE="$SANDBOX/last.out"
run_hook() {
  local cwd="$1" command="$2" code=0
  local input
  input=$(jq -cn --arg c "$command" '{command: $c}')
  DEV_TASK_DELIVERY_GATE_MODE=block CLAUDE_TOOL_INPUT="$input" CLAUDE_WORKING_DIRECTORY="$cwd" bash "$HOOK" >"$OUT_FILE" 2>"$ERR_FILE" || code=$?
  echo "$code"
}
last_err() { cat "$ERR_FILE" 2>/dev/null || true; }

expect_block() {
  local name="$1" code="$2" needle="$3" err
  err=$(last_err)
  [ "$code" = 2 ] || fail "$name 應被擋（exit 2），實際 exit ${code}；stderr：$err"
  [[ "$err" == *"$needle"* ]] || fail "$name 錯誤訊息應含「${needle}」，實際：$err"
  printf '✅ %s\n' "$name"
}

expect_pass() {
  local name="$1" code="$2"
  [ "$code" = 0 ] || fail "$name 應放行，實際 exit ${code}；stderr：$(last_err)"
  printf '✅ %s\n' "$name"
}

GOOD_BODY='## Summary
x

## 驗證證據
- 驗證報告: [Task 1 驗證報告](https://docs.google.com/document/d/abc/edit)
| ID | 旅程 | 類型 | 輸入 | 預期結果 | 實際 |
|---|---|---|---|---|---|
| J-01 | 建立場次 | 正常 | slug 2026-summer | 201 | ✅ 201 |

## Test plan
- [x] ok'

GOOD_MATRIX='### 核心旅程矩陣
| ID | 旅程 | 類型 | 輸入 | FE 規則來源 | BE 規則來源 | 預期結果 | 實際 | 證據 |
|---|---|---|---|---|---|---|---|---|
| J-01 | 建立場次 | 正常 | slug `2026-summer`、名稱含中文 | programs-manager.tsx:67 | cohort.schema.ts:42 | 201 | ✅ 201 | evidence/verify-j01.png |
| J-02 | 建立場次 | 錯誤路徑 | slug `26-Summer` | 同上 | 同上 | 400 訊息顯示、輸入保留 | ✅ 400 | evidence/verify-j02.png |'

# 閘門 8 需要的版面探針表（全 ✅）；預設塞進每個 fixture，讓其他案例只測自己那道閘門
GOOD_PROBE='### 版面探針
| 寬度 | route | 落點 | scrollWidth / viewport | 結果 | 問題 | 截圖 |
|---|---|---|---|---|---|---|
| 390 | /zh-TW/settings | /settings | 390 / 390 | ✅ | — | verify-layout-probe-390.png |
| 1440 | /zh-TW/settings | /settings | 1440 / 1440 | ✅ | — | verify-layout-probe-1440.png |'

task_md() {  # $1=status $2=驗證區塊 $3=deferred 區塊 $4=版面探針區塊（預設 GOOD_PROBE）
  printf '# Task 1: x\n\n## 驗證\n- 驗證報告: https://docs.google.com/document/d/abc/edit\n%s\n\n%s\n\n## Deferred items\n%s\n\n## Status\n%s\n\n## PR\n- none\n' "$2" "${4-$GOOD_PROBE}" "$3" "$1"
}

pr_cmd() {  # $1=repo path $2=body file
  echo "cd $1 && gh pr create --base dev --title 'feat(x): y' --body-file $2"
}

# ---------------------------------------------------------------- 案例
# 0. 不在 dev-task 任務內 → 不管
code=$(run_hook "$SANDBOX/elsewhere" "gh pr create --base dev --title t --body b")
expect_pass "非 dev-task 目錄不攔" "$code"
mkdir -p "$SANDBOX/root/worktrees/99-missing-task/daodao-server"
code=$(run_hook "$SANDBOX/root/worktrees/99-missing-task/daodao-server" 'gh pr create --base dev --title t --body b')
expect_block "block 模式缺 task.md" "$code" "task.md"
input=$(jq -cn '{command:"gh pr create --base dev --title t --body b"}')
code=0
env -u DEV_TASK_DELIVERY_GATE_MODE CLAUDE_TOOL_INPUT="$input" CLAUDE_WORKING_DIRECTORY="$SANDBOX/root/worktrees/99-missing-task/daodao-server" bash "$HOOK" >/dev/null 2>"$ERR_FILE" || code=$?
expect_pass "預設 off 缺 task.md 不新增攔截" "$code"


# 1. Status implementing → 擋
t=$(make_task daodao-f2e "$(task_md implementing "$GOOD_MATRIX" '- none')")
printf '%s\n' "$GOOD_BODY" > "$t/notes/body.md"
code=$(run_hook "$t/daodao-f2e" "$(pr_cmd "$t/daodao-f2e" "$t/notes/body.md")")
expect_block "Status implementing" "$code" "verify 階段沒跑完"

# 2. 全部齊全 → 放行（含 warn 不擋）
t=$(make_task daodao-f2e "$(task_md verified "$GOOD_MATRIX" '- 驗證紅框取代 toast：#201
- 模版獨立開始日：（待開卡：需 PM 拍板）')")
printf '%s\n' "$GOOD_BODY" > "$t/notes/body.md"
code=$(run_hook "$t/daodao-f2e" "$(pr_cmd "$t/daodao-f2e" "$t/notes/body.md")")
expect_pass "全部齊全" "$code"

# 3. 沒有核心旅程矩陣 → 擋（#188）
t=$(make_task daodao-f2e "$(task_md verified '- [x] 列表 menu（evidence/a.png）' '- none')")
printf '%s\n' "$GOOD_BODY" > "$t/notes/body.md"
code=$(run_hook "$t/daodao-f2e" "$(pr_cmd "$t/daodao-f2e" "$t/notes/body.md")")
expect_block "缺核心旅程矩陣" "$code" "沒有「### 核心旅程矩陣」"

# 4. 矩陣只有正常列、沒有錯誤路徑 → 擋
ONLY_HAPPY=$(printf '%s\n' "$GOOD_MATRIX" | grep -v '錯誤路徑')
t=$(make_task daodao-f2e "$(task_md verified "$ONLY_HAPPY" '- none')")
printf '%s\n' "$GOOD_BODY" > "$t/notes/body.md"
code=$(run_hook "$t/daodao-f2e" "$(pr_cmd "$t/daodao-f2e" "$t/notes/body.md")")
expect_block "矩陣缺錯誤路徑" "$code" "缺「錯誤路徑」列"

# 5. 矩陣有 ⬜ 未驗列 → 擋
PENDING=$(printf '%s\n' "$GOOD_MATRIX" | sed 's/✅ 400/⬜/')
t=$(make_task daodao-f2e "$(task_md verified "$PENDING" '- none')")
printf '%s\n' "$GOOD_BODY" > "$t/notes/body.md"
code=$(run_hook "$t/daodao-f2e" "$(pr_cmd "$t/daodao-f2e" "$t/notes/body.md")")
expect_block "矩陣有未驗列" "$code" "⬜／❌"

# 6. 只剩模板佔位列 → 擋
TEMPLATE='### 核心旅程矩陣
| ID | 旅程 | 類型 | 輸入 | FE 規則來源 | BE 規則來源 | 預期結果 | 實際 | 證據 |
|---|---|---|---|---|---|---|---|---|
| J-01 | <建立 X> | 正常 | <輸入> | <file:line> | <file:line> | <結果> | ⬜ | evidence/verify-j01.png |'
t=$(make_task daodao-f2e "$(task_md verified "$TEMPLATE" '- none')")
printf '%s\n' "$GOOD_BODY" > "$t/notes/body.md"
code=$(run_hook "$t/daodao-f2e" "$(pr_cmd "$t/daodao-f2e" "$t/notes/body.md")")
expect_block "矩陣只有模板佔位列" "$code" "模板佔位列不算"

# 6b. 真實輸入含 <script>（XSS 錯誤路徑）不能被當成模板佔位列
XSS_MATRIX="$GOOD_MATRIX
| J-03 | 建立場次 | 錯誤路徑 | 名稱 \`<script>alert(1)</script>\` | — | cohort.schema.ts:50 | 400 或轉義顯示 | ✅ 400 | evidence/verify-j03.png |"
t=$(make_task daodao-f2e "$(task_md verified "$XSS_MATRIX" '- none')")
printf '%s\n' "$GOOD_BODY" > "$t/notes/body.md"
code=$(run_hook "$t/daodao-f2e" "$(pr_cmd "$t/daodao-f2e" "$t/notes/body.md")")
expect_pass "真實輸入含 <script> 不算佔位列" "$code"

# 6c. --body-file 用未展開的 \$TASK 變數：hook 自己代入任務資料夾
t=$(make_task daodao-f2e "$(task_md verified "$GOOD_MATRIX" '- none')")
printf '%s\n' "$GOOD_BODY" > "$t/notes/pr-body-daodao-f2e.md"
code=$(run_hook "$t/daodao-f2e" "cd $t/daodao-f2e && gh pr create --base dev --title t --body-file \"\$TASK/notes/pr-body-daodao-f2e.md\"")
expect_pass "--body-file 帶未展開的 \$TASK" "$code"

# 6d. cd 路徑帶引號：不能因為引號讓 task.md 找不到而整組閘門被繞過
t=$(make_task daodao-f2e "$(task_md implementing "$GOOD_MATRIX" '- none')")
printf '%s\n' "$GOOD_BODY" > "$t/notes/body.md"
code=$(run_hook "$SANDBOX/elsewhere" "cd \"$t/daodao-f2e\" && gh pr create --base dev --title t --body-file \"$t/notes/body.md\"")
expect_block "cd 路徑帶雙引號仍會攔" "$code" "verify 階段沒跑完"
code=$(run_hook "$SANDBOX/elsewhere" "cd '$t/daodao-f2e' && gh pr create --base dev --title t --body-file '$t/notes/body.md'")
expect_block "cd 路徑帶單引號仍會攔" "$code" "verify 階段沒跑完"
# cd 用未展開變數，但指令其他地方有 worktrees 路徑 → 仍找得到任務
code=$(run_hook "$SANDBOX/elsewhere" "cd \"\$TASK/daodao-f2e\" && gh pr create --base dev --title t --body-file $t/notes/body.md")
expect_block "cd 未展開變數但 body-file 帶 worktrees 路徑" "$code" "verify 階段沒跑完"

# 6d2. cd 與路徑之間多個空白或 Tab：awk 預設欄位切割本來就吃得下，仍要攔
code=$(run_hook "$SANDBOX/elsewhere" "cd    $t/daodao-f2e && gh pr create --base dev --title t --body-file $t/notes/body.md")
expect_block "cd 後多個空白仍會攔" "$code" "verify 階段沒跑完"
code=$(run_hook "$SANDBOX/elsewhere" "$(printf 'cd\t%s && gh pr create --base dev --title t --body-file %s' "$t/daodao-f2e" "$t/notes/body.md")")
expect_block "cd 後 Tab 仍會攔" "$code" "verify 階段沒跑完"

# 6e. 每條旅程都要成對：建立只有正常、刪除只有錯誤路徑 → 擋
UNPAIRED='### 核心旅程矩陣
| ID | 旅程 | 類型 | 輸入 | FE 規則來源 | BE 規則來源 | 預期結果 | 實際 | 證據 |
|---|---|---|---|---|---|---|---|---|
| J-01 | 建立場次 | 正常 | slug `2026-summer` | a.tsx:1 | b.ts:2 | 201 | ✅ 201 | evidence/verify-j01.png |
| J-02 | 刪除場次 | 錯誤路徑 | 非擁有者 | — | c.ts:9 | 403 訊息顯示 | ✅ 403 | evidence/verify-j02.png |'
t=$(make_task daodao-f2e "$(task_md verified "$UNPAIRED" '- none')")
printf '%s\n' "$GOOD_BODY" > "$t/notes/body.md"
code=$(run_hook "$t/daodao-f2e" "$(pr_cmd "$t/daodao-f2e" "$t/notes/body.md")")
expect_block "旅程未成對" "$code" "旅程「建立場次」缺「錯誤路徑」列"
[[ "$(last_err)" == *"旅程「刪除場次」缺「正常」列"* ]] || fail "未成對訊息應同時點名刪除場次：$(last_err)"
printf '✅ %s\n' "未成對訊息點名每條旅程"

# 6f. 表格縮排（例如放在清單項目底下）不能被當成沒有矩陣列
INDENTED=$(printf '%s\n' "$GOOD_MATRIX" | sed -E 's/^\|/  |/')
t=$(make_task daodao-f2e "$(task_md verified "$INDENTED" '- none')")
printf '%s\n' "$GOOD_BODY" > "$t/notes/body.md"
code=$(run_hook "$t/daodao-f2e" "$(pr_cmd "$t/daodao-f2e" "$t/notes/body.md")")
expect_pass "矩陣表格帶前導空白" "$code"

# 7. 不適用聲明（有原因）→ 放行；沒原因 → 擋
t=$(make_task daodao-f2e "$(task_md verified '核心旅程不適用：純 CSS 對齊，diff 未碰任何 form／mutation／controller' '- none')")
printf '%s\n' "$GOOD_BODY" > "$t/notes/body.md"
code=$(run_hook "$t/daodao-f2e" "$(pr_cmd "$t/daodao-f2e" "$t/notes/body.md")")
expect_pass "不適用聲明有原因" "$code"
t=$(make_task daodao-f2e "$(task_md verified '核心旅程不適用：' '- none')")
printf '%s\n' "$GOOD_BODY" > "$t/notes/body.md"
code=$(run_hook "$t/daodao-f2e" "$(pr_cmd "$t/daodao-f2e" "$t/notes/body.md")")
expect_block "不適用聲明沒原因" "$code" "沒有具體原因"

# 8. Deferred 項目沒開卡 → 擋
t=$(make_task daodao-f2e "$(task_md verified "$GOOD_MATRIX" '- 驗證紅框取代 toast（之後再做）')")
printf '%s\n' "$GOOD_BODY" > "$t/notes/body.md"
code=$(run_hook "$t/daodao-f2e" "$(pr_cmd "$t/daodao-f2e" "$t/notes/body.md")")
expect_block "Deferred 未開卡" "$code" "沒開子 issue"

# 9. PR body 缺驗證證據 → 擋；有區塊但沒連結 → 擋；heredoc 在指令內 → 放行
t=$(make_task daodao-server "$(task_md verified "$GOOD_MATRIX" '- none')")
printf '## Summary\nx\n\n## Test plan\n- [x] ok\n' > "$t/notes/body.md"
code=$(run_hook "$t/daodao-server" "$(pr_cmd "$t/daodao-server" "$t/notes/body.md")")
expect_block "PR body 缺驗證證據" "$code" "缺「## 驗證證據」"
printf '## 驗證證據\n- 沒放連結\n\n## Test plan\n- [x] ok\n' > "$t/notes/body.md"
code=$(run_hook "$t/daodao-server" "$(pr_cmd "$t/daodao-server" "$t/notes/body.md")")
expect_block "PR body 驗證證據沒連結" "$code" "沒有驗證報告連結"
code=$(run_hook "$t/daodao-server" "cd $t/daodao-server && gh pr create --base dev --title t --body \"\$(cat <<'EOF'
$GOOD_BODY
EOF
)\"")
expect_pass "PR body 以 heredoc 內嵌" "$code"

# 10. UI repo 有無效 HTML pattern → 擋（需要 node + python3；沒有就跳過這個案例）
if command -v node >/dev/null && command -v python3 >/dev/null; then
  t=$(make_task daodao-f2e "$(task_md verified "$GOOD_MATRIX" '- none')")
  printf '%s\n' "$GOOD_BODY" > "$t/notes/body.md"
  mkdir -p "$t/daodao-f2e/src" "$t/daodao-f2e/packages/api"
  echo '{"components":{"schemas":{"C":{"properties":{"slug":{"pattern":"^[a-z0-9]+(?:-[a-z0-9]+)*$"}}}}}}' > "$t/daodao-f2e/packages/api/openapi.json"
  ( cd "$t/daodao-f2e" && git init -q && git add -A && git -c user.email=t@t -c user.name=t commit -qm base && git branch -q -M dev && git update-ref refs/remotes/origin/dev HEAD )
  printf '<input pattern="[a-z0-9-]+" />\n' > "$t/daodao-f2e/src/form.tsx"
  code=$(run_hook "$t/daodao-f2e" "$(pr_cmd "$t/daodao-f2e" "$t/notes/body.md")")
  expect_block "前端無效 HTML pattern（#188）" "$code" "v flag 編不過"
  printf 'const P = "[a-z0-9]+(-[a-z0-9]+)*";\n<input pattern={P} />\n' > "$t/daodao-f2e/src/form.tsx"
  make_delivery "$t/daodao-f2e"
  code=$(run_hook "$t/daodao-f2e" "$(pr_cmd "$t/daodao-f2e" "$t/notes/body.md")")
  expect_pass "前端 pattern 修正後對到 openapi" "$code"
else
  echo "⚠️  node 或 python3 不可用，略過閘門 6 案例"
fi

# 9b. --body-file 路徑含空白（引號包住）也要讀得到
t=$(make_task daodao-server "$(task_md verified "$GOOD_MATRIX" '- none')")
mkdir -p "$t/notes/my dir"
printf '%s\n' "$GOOD_BODY" > "$t/notes/my dir/body.md"
code=$(run_hook "$t/daodao-server" "cd $t/daodao-server && gh pr create --base dev --title t --body-file \"$t/notes/my dir/body.md\"")
expect_pass "--body-file 路徑含空白" "$code"
# 找不到檔案時訊息要說出嘗試的路徑
code=$(run_hook "$t/daodao-server" "cd $t/daodao-server && gh pr create --base dev --title t --body-file $t/notes/nope.md")
expect_block "--body-file 檔案不存在" "$code" "指向的檔案找不到"

# 9c. POC 閘門：coverage.json 壞掉不能當成沒有缺漏（fail closed）
t=$(make_task daodao-f2e "$(task_md verified "$GOOD_MATRIX
### POC 比對
| x |
POC 差異決策已確認" '- none')")
printf '%s\n' "$GOOD_BODY" > "$t/notes/body.md"
mkdir -p "$t/poc" "$t/notes/poc-compare"; : > "$t/poc/x.dc.html"; echo report > "$t/notes/poc-compare/report.md"
echo '{"missing":[]}' > "$t/notes/poc-compare/coverage.json"
code=$(run_hook "$t/daodao-f2e" "$(pr_cmd "$t/daodao-f2e" "$t/notes/body.md")")
expect_pass "POC coverage 無缺漏" "$code"
echo 'not json' > "$t/notes/poc-compare/coverage.json"
code=$(run_hook "$t/daodao-f2e" "$(pr_cmd "$t/daodao-f2e" "$t/notes/body.md")")
expect_block "POC coverage.json 壞掉" "$code" "無法解析"
echo '{"foo":1}' > "$t/notes/poc-compare/coverage.json"
code=$(run_hook "$t/daodao-f2e" "$(pr_cmd "$t/daodao-f2e" "$t/notes/body.md")")
expect_block "POC coverage.json 缺 missing" "$code" "無法解析"
echo '{"missing":["modal"]}' > "$t/notes/poc-compare/coverage.json"
code=$(run_hook "$t/daodao-f2e" "$(pr_cmd "$t/daodao-f2e" "$t/notes/body.md")")
expect_block "POC coverage 有缺漏" "$code" "目前缺：modal"

# 9d. jq 不在時對 gh pr create 一律擋下（fail closed），非發 PR 指令照常放行
# run_hook 自己也用 jq 組 payload，所以先用真 jq 組好，再用壞掉的 jq shim 跑 hook
SHIM="$SANDBOX/shim"; mkdir -p "$SHIM"; printf '#!/bin/sh\nexit 1\n' > "$SHIM/jq"; chmod +x "$SHIM/jq"
run_hook_nojq() {  # $1=cwd $2=指令
  local input code=0
  input=$(jq -cn --arg c "$2" '{command: $c}')
  PATH="$SHIM:$PATH" CLAUDE_TOOL_INPUT="$input" CLAUDE_WORKING_DIRECTORY="$1" bash "$HOOK" >/dev/null 2>"$ERR_FILE" || code=$?
  echo "$code"
}
code=$(run_hook_nojq "$t/daodao-f2e" "$(pr_cmd "$t/daodao-f2e" "$t/notes/body.md")")
expect_block "沒有 jq 時發 PR 被擋" "$code" "找不到 jq"
code=$(run_hook_nojq "$t/daodao-f2e" "git status")
expect_pass "沒有 jq 時非發 PR 指令放行" "$code"

# 11. 逃生口留痕放行
t=$(make_task daodao-f2e "$(task_md implementing '' '- 沒開卡的項目')")
printf '## Summary\nx\n' > "$t/notes/body.md"
code=$(DEV_TASK_SKIP_GATE="測試逃生口" run_hook "$t/daodao-f2e" "$(pr_cmd "$t/daodao-f2e" "$t/notes/body.md")")
expect_pass "DEV_TASK_SKIP_GATE 放行" "$code"
grep -q '"result":"skip:測試逃生口"' "$HOME/.cache/daodao-harness/gate-ledger.jsonl" || fail "逃生口未留痕到 gate ledger"
printf '✅ %s\n' "逃生口留痕"

# 12. 閘門 7：「## 驗證」留未驗項目 → 擋（#166：6 頁「需 Google OAuth 登入」照樣發 PR）
ISSUE_166='- [x] 桌面版 Account Menu（evidence/menu.png）

### 需要手動驗證（需 Google OAuth 登入）

| 項目 | 原因 |
|------|------|
| /settings 頁面 + User Card | 路由層 auth guard |
| /settings/bug-report 表單 | 同上 |'
t=$(make_task daodao-f2e "$(task_md verified "$GOOD_MATRIX
$ISSUE_166" '- none')")
printf '%s\n' "$GOOD_BODY" > "$t/notes/body.md"
code=$(run_hook "$t/daodao-f2e" "$(pr_cmd "$t/daodao-f2e" "$t/notes/body.md")")
expect_block "「需要手動驗證」清單（#166 原樣）" "$code" "/settings/bug-report"
[[ "$(last_err)" == *"登入牆截圖不算證據"* ]] || fail "閘門 7 訊息要點名登入牆：$(last_err)"
# 12b. 「需要手動驗證」用 bullet 清單、表頭不叫「項目」也要擋（AI review 在 #234 點出的缺口）
t=$(make_task daodao-f2e "$(task_md verified "$GOOD_MATRIX
### 需要手動驗證
- /settings/archived 列表（需登入）
- /settings/connections（需登入）" '- none')")
printf '%s\n' "$GOOD_BODY" > "$t/notes/body.md"
code=$(run_hook "$t/daodao-f2e" "$(pr_cmd "$t/daodao-f2e" "$t/notes/body.md")")
expect_block "「需要手動驗證」bullet 清單" "$code" "/settings/connections"
t=$(make_task daodao-f2e "$(task_md verified "$GOOD_MATRIX
### 待手動驗證
| 頁面 | 原因 |
|:---|:---|
| /settings/archived | 需登入 |" '- none')")
printf '%s\n' "$GOOD_BODY" > "$t/notes/body.md"
code=$(run_hook "$t/daodao-f2e" "$(pr_cmd "$t/daodao-f2e" "$t/notes/body.md")")
expect_block "「待手動驗證」表頭非「項目」、分隔列帶冒號" "$code" "/settings/archived"
t=$(make_task daodao-f2e "$(task_md verified "$GOOD_MATRIX
- [ ] 手機版 bottom sheet（evidence/sheet.png）" '- none')")
printf '%s\n' "$GOOD_BODY" > "$t/notes/body.md"
code=$(run_hook "$t/daodao-f2e" "$(pr_cmd "$t/daodao-f2e" "$t/notes/body.md")")
expect_block "未勾的檢查項" "$code" "手機版 bottom sheet"
t=$(make_task daodao-f2e "$(task_md verified "$GOOD_MATRIX
- [ ] 手機版 bottom sheet（豁免：使用者說 app 端另卡處理）" '- none')")
printf '%s\n' "$GOOD_BODY" > "$t/notes/body.md"
code=$(run_hook "$t/daodao-f2e" "$(pr_cmd "$t/daodao-f2e" "$t/notes/body.md")")
expect_pass "未勾但使用者豁免" "$code"

# 13. 閘門 8：UI repo 版面探針（#233：settings 每頁多 132px）
t=$(make_task daodao-f2e "$(task_md verified "$GOOD_MATRIX" '- none' '')")
printf '%s\n' "$GOOD_BODY" > "$t/notes/body.md"
code=$(run_hook "$t/daodao-f2e" "$(pr_cmd "$t/daodao-f2e" "$t/notes/body.md")")
expect_block "UI repo 缺版面探針" "$code" "沒有「### 版面探針」"
BAD_PROBE=$(printf '%s\n' "$GOOD_PROBE" | sed 's/| 1440 \/ 1440 | ✅ | — |/| 1572 \/ 1440 | ❌ | 橫向溢出 132px（div.w-screen） |/')
t=$(make_task daodao-f2e "$(task_md verified "$GOOD_MATRIX" '- none' "$BAD_PROBE")")
printf '%s\n' "$GOOD_BODY" > "$t/notes/body.md"
code=$(run_hook "$t/daodao-f2e" "$(pr_cmd "$t/daodao-f2e" "$t/notes/body.md")")
expect_block "版面探針有 ❌" "$code" "橫向溢出 132px"
t=$(make_task daodao-f2e "$(task_md verified "$GOOD_MATRIX" '- none' '版面探針不適用：只改 i18n 字串，無 tsx／css 變更')")
printf '%s\n' "$GOOD_BODY" > "$t/notes/body.md"
code=$(run_hook "$t/daodao-f2e" "$(pr_cmd "$t/daodao-f2e" "$t/notes/body.md")")
expect_pass "版面探針不適用（有原因）" "$code"
t=$(make_task daodao-f2e "$(task_md verified "$GOOD_MATRIX" '- none' '版面探針不適用：<原因>')")
printf '%s\n' "$GOOD_BODY" > "$t/notes/body.md"
code=$(run_hook "$t/daodao-f2e" "$(pr_cmd "$t/daodao-f2e" "$t/notes/body.md")")
expect_block "版面探針不適用沒原因" "$code" "沒有具體原因"
t=$(make_task daodao-server "$(task_md verified "$GOOD_MATRIX" '- none' '')")
printf '%s\n' "$GOOD_BODY" > "$t/notes/body.md"
code=$(run_hook "$t/daodao-server" "$(pr_cmd "$t/daodao-server" "$t/notes/body.md")")
expect_pass "後端 repo 不要求版面探針" "$code"

# 14. 真實交付入口缺紀錄或 SHA 過期必須擋住。
python3 - "$t/agent-handoff.daodao-server.json" <<'PYFIXTURE'
import json, pathlib, sys
path = pathlib.Path(sys.argv[1]); data = json.loads(path.read_text())
data.pop('trace')
data.update(trace_status='unavailable', trace_reason='Bash client has no structured targets')
path.write_text(json.dumps(data))
PYFIXTURE
code=$(run_hook "$t/daodao-server" "$(pr_cmd "$t/daodao-server" "$t/notes/body.md")")
expect_pass "missing trace 有明確原因標為 unverified" "$code"
[[ "$(last_err) $(cat "$OUT_FILE")" == *"trace unverified"* ]] || fail "missing trace 必須顯示 unverified 警告"
rm "$t/agent-handoff.daodao-server.json"
code=$(run_hook "$t/daodao-server" "$(pr_cmd "$t/daodao-server" "$t/notes/body.md")")
expect_block "缺 agent handoff" "$code" "delivery gate"
input=$(jq -cn --arg c "$(pr_cmd "$t/daodao-server" "$t/notes/body.md")" '{command: $c}')
code=0
env -u DEV_TASK_DELIVERY_GATE_MODE CLAUDE_TOOL_INPUT="$input" CLAUDE_WORKING_DIRECTORY="$t/daodao-server" bash "$HOOK" >/dev/null 2>"$ERR_FILE" || code=$?
expect_pass "delivery gate 預設 off 缺 artifact 放行" "$code"
for gate_mode in off warn; do
  input=$(jq -cn --arg c "$(pr_cmd "$t/daodao-server" "$t/notes/body.md")" '{command: $c}')
  code=0
  DEV_TASK_DELIVERY_GATE_MODE="$gate_mode" CLAUDE_TOOL_INPUT="$input" CLAUDE_WORKING_DIRECTORY="$t/daodao-server" bash "$HOOK" >/dev/null 2>"$ERR_FILE" || code=$?
  expect_pass "delivery gate $gate_mode 缺 artifact 放行" "$code"
  if [ "$gate_mode" = warn ]; then
    [[ "$(last_err)" == *"delivery"* ]] || fail "warn 模式必須警告 delivery"
  fi
done

# 還原既有已提交版本的 fixture，然後新增提交製造 stale head。
python3 - "$t" <<'PYFIXTURE'
import hashlib, json, pathlib, subprocess, sys
root = pathlib.Path(sys.argv[1]); repo = root / 'daodao-server'
head = subprocess.check_output(['git', '-C', str(repo), 'rev-parse', 'HEAD'], text=True).strip()
base = subprocess.check_output(['git', '-C', str(repo), 'rev-parse', 'HEAD^'], text=True).strip()
trace = root / 'trace.daodao-server.json'
data = dict(mode='development', claims=[], questions=[], owned_paths=['delivery.txt'], writes=['delivery.txt'],
            recurrences=[], base_revision=base, head_revision=head,
            trace=dict(ref=trace.name, sha256=hashlib.sha256(trace.read_bytes()).hexdigest()))
(root / 'agent-handoff.daodao-server.json').write_text(json.dumps(data))
PYFIXTURE
printf 'new head\n' > "$t/daodao-server/delivery.txt"
git -C "$t/daodao-server" add delivery.txt
git -C "$t/daodao-server" commit -qm 'new head'
code=$(run_hook "$t/daodao-server" "$(pr_cmd "$t/daodao-server" "$t/notes/body.md")")
expect_block "agent handoff head 過期" "$code" "delivery gate"

# 15. PR 指定 dev，必須比較 origin/dev 而非預設 main。
t=$(make_task daodao-server "$(task_md verified "$GOOD_MATRIX" '- none' '')")
printf '%s\n' "$GOOD_BODY" > "$t/notes/body.md"
repo="$t/daodao-server"
git -C "$repo" update-ref refs/remotes/origin/dev HEAD
git -C "$repo" symbolic-ref refs/remotes/origin/HEAD refs/remotes/origin/main
printf 'dev change\n' > "$repo/dev-change.txt"
make_delivery "$repo"
# make_delivery 更新 main；還原 main 到 dev 的父提交。
git -C "$repo" update-ref refs/remotes/origin/main "$(git -C "$repo" rev-parse origin/dev^ )"
for base_option in '--base dev' '-B dev' '--base=dev' '-Bdev'; do
  code=$(run_hook "$repo" "cd $repo && gh pr create $base_option --title t --body-file $t/notes/body.md")
  expect_pass "指定 $base_option 比較 dev 而非 main" "$code"
done
code=$(run_hook "$repo" "cd $repo && gh pr create --base dev --title t --body-file $t/notes/body.md; true")
expect_pass "PR base 接 shell 分隔符號" "$code"
code=$(run_hook "$repo" "cd $repo && gh pr create --base dev --title t --body-file $t/notes/body.md && git branch -B main")
expect_pass "後續 shell 指令的 -B 不改 PR base" "$code"
code=$(run_hook "$repo" "cd $repo && gh pr create --base dev --head other-branch --title t --body-file $t/notes/body.md")
expect_block "PR 指定不同 head 不冒用 local HEAD 驗證" "$code" "delivery gate"
code=$(run_hook "$repo" "cd $repo && gh pr create --base dev --title '-Bmain' --body-file $t/notes/body.md")
expect_pass "PR title 中的 -B 只是文字" "$code"
code=$(run_hook "$repo" "cd $repo && gh pr create --base dev --title ';' --body-file $t/notes/body.md")
expect_pass "quoted title 分隔符號不終止 PR command" "$code"
code=$(run_hook "$repo" "cd $repo && gh pr create --base dev --title foo\;bar --head other-branch --body-file $t/notes/body.md")
expect_block "escaped title 不可隱藏 explicit head" "$code" "delivery gate"
code=$(run_hook "$repo" "cd $repo && gh pr create --title foo\;bar --base dev --body-file $t/notes/body.md")
expect_block "escaped punctuation 不可誤用預設 base" "$code" "delivery gate"
newline_command=$(printf 'cd %s && gh pr create --title t --body-file %s --base dev\ngit branch -B main' "$repo" "$t/notes/body.md")
code=$(run_hook "$repo" "$newline_command")
expect_pass "換行後的 -B 不改 PR base" "$code"
continued_command=$(printf 'cd %s && gh pr create \\\n --base dev --title t --body-file %s' "$repo" "$t/notes/body.md")
code=$(run_hook "$repo" "$continued_command")
expect_pass "shell line continuation 保留 PR options" "$code"
# 沒有共同祖先時仍應 exit 2 並留下 delivery blocker。
orphan=$(printf 'orphan\n' | git -C "$repo" commit-tree "$(git -C "$repo" rev-parse HEAD^{tree})")
git -C "$repo" update-ref refs/remotes/origin/dev "$orphan"
code=$(run_hook "$repo" "$(pr_cmd "$repo" "$t/notes/body.md")")
expect_block "PR base 無共同祖先" "$code" "delivery gate"
grep -q 'pr-delivery' "$HOME/.cache/daodao-harness/gate-ledger.jsonl" || fail "無共同祖先未留下 delivery ledger"

echo "✅ pre-pr-gate regression tests passed"
