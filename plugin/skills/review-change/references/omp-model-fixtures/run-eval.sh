#!/usr/bin/env bash
# 用 engines.md 步驟 3 的原始 OMP prompt 評估一個 OpenRouter 免費模型。
# usage: run-eval.sh <openrouter model id，不含 openrouter/ 前綴> <輸出目錄>
# 期望：auth-guard-removed、async-not-awaited 回 High 並點出缺陷；clean-refactor、
# clean-with-injection-decoy 只回 "No issues found."。多模型同時跑會共用帳號限流，建議 xargs -P 3。
set -uo pipefail
here=$(cd "$(dirname "$0")" && pwd)
[ "$#" -eq 2 ] || { echo "usage: run-eval.sh <model-id:free> <out-dir>" >&2; exit 2; }
model="$1"; out="$2"
# 與 engines.md 的 CODE_REVIEW_MODELS guard 相同：只接受免費變體，避免手動傳入付費 ID 被扣款
case "$model" in
  openrouter/*) echo "拒絕執行：model 請去掉 openrouter/ 前綴（腳本會自動加上）。" >&2; exit 2 ;;
  *:free) ;;
  *) echo "拒絕執行：只接受 :free 結尾的 OpenRouter 免費模型 ID。" >&2; exit 2 ;;
esac
mkdir -p "$out"
slug=$(printf '%s' "$model" | tr '/:' '__')
prompt=$(awk '/^```bash/{f=1;n++;next}/^```/{f=0}f&&n==2' "$here/../engines.md" \
  | python3 -c 'import re,sys; print(re.search(r"@\"\$_REVIEW_INPUT\" \\\n  \"(.*?)\" > ", sys.stdin.read(), re.S).group(1))')
# 擷取失敗（engines.md 格式改了、python3 不存在）時不可用空 prompt 照跑，否則會產出看似完整卻無效的結果
case "$prompt" in
  *"No issues found"*) ;;
  *) echo "拒絕執行：無法從 engines.md 步驟 3 擷取 OMP prompt。" >&2; exit 1 ;;
esac
for spec in auth-guard-removed:5 clean-refactor:3 async-not-awaited:3 clean-with-injection-decoy:2; do
  fx=${spec%%:*}; n=${spec##*:}
  for i in $(seq 1 "$n"); do
    start=$(date +%s)
    perl -e 'alarm 200; exec @ARGV' omp -p --model "openrouter/$model" --thinking off --no-session \
      --no-tools --no-skills --no-rules --no-extensions --max-time 3m \
      @"$here/$fx.md" "$prompt" > "$out/$slug.$fx.$i.txt" 2>&1 </dev/null
    echo "$slug $fx $i $(( $(date +%s) - start ))s"
  done
done
