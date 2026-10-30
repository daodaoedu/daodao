#!/usr/bin/env bash
# 確保共用 workflow 依賴的 label 存在於目標 repo（code-review.yml 靠貼 label 觸發，label 不存在就無法貼）
# 用法：ensure-labels.sh <owner/repo>；需要 GH_TOKEN 具備該 repo 的 issues 寫入權限
# 只建立缺少的 label，已存在的不改顏色或描述；任一 label 處理失敗時 exit 1
set -uo pipefail

REPO="${1:?usage: ensure-labels.sh <owner/repo>}"

LABELS=(
  "ai-review|BFD4F2|貼上即觸發 AI Code Review（跑完自動移除，要再審就再貼一次）"
  "ai-review:full|BFD4F2|AI Code Review 全部重審，不沿用上次結果"
)

failed=0
for entry in "${LABELS[@]}"; do
  IFS='|' read -r name color description <<<"$entry"
  encoded=$(jq -rn --arg l "$name" '$l|@uri')
  if gh api "repos/$REPO/labels/$encoded" --silent >/dev/null 2>&1; then
    echo "label 已存在：$REPO $name"
  elif gh api "repos/$REPO/labels" --method POST \
         -f name="$name" -f color="$color" -f description="$description" --silent >/dev/null; then
    echo "label 已建立：$REPO $name"
  else
    echo "::warning::無法建立 label：$REPO $name"
    failed=1
  fi
done
exit "$failed"
