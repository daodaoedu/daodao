#!/usr/bin/env bash
# verify.sh — Routine B v3 驗證與收尾（唯一的品質閘門）
#
# 在 next.sh 產生工單、session 模型完成實作後執行。
# 所有強制檢查都在這裡：禁改路徑、scope caps、lint/typecheck/test。
# 通過 → push + 開 PR + labels + comment + Notion 回寫。
# 失敗 → 回報缺陷讓模型修（最多 verifyAttempts 次），超過 → human-coding 升級。
#
# 用法：verify.sh <repo> <issue_num>
# Exit code：
#   0 = 全部完成（PR 已開）
#   4 = 驗證失敗，還有重試額度 → 修正後重跑本指令
#   5 = 驗證失敗且額度用盡 → 已升級 human-coding，換下一個 issue
#   1 = 內部錯誤 / run-state 不存在

set -uo pipefail   # 刻意不用 -e：所有失敗都要被捕捉並回報，不能默默中斷

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
CONFIG="${ROOT}/bin/pipeline.config.json"
BLOCKLIST="${SCRIPT_DIR}/policy/write-path-blocklist.json"

REPO="${1:?Usage: verify.sh <repo> <issue_num>}"
NUM="${2:?Usage: verify.sh <repo> <issue_num>}"
RUN_FILE="${SCRIPT_DIR}/runs/${REPO}-${NUM}.json"

log() { echo "[verify] $*" >&2; }
[[ -f "$RUN_FILE" ]] || { log "FATAL: run-state ${RUN_FILE} 不存在（先跑 next.sh）"; exit 1; }

ORG=$(jq -r '.org' "$CONFIG")
MODE=$(jq -r '.mode' "$RUN_FILE")
SCOPE=$(jq -r '.scope' "$RUN_FILE")
BRANCH=$(jq -r '.branch' "$RUN_FILE")
BASE=$(jq -r '.base' "$RUN_FILE")
WORKDIR=$(jq -r '.workdir' "$RUN_FILE")
PR_REPO=$(jq -r '.pr_repo' "$RUN_FILE")
CHANGE_ID=$(jq -r '.change_id' "$RUN_FILE")
TITLE=$(jq -r '.title' "$RUN_FILE")
ATTEMPTS=$(jq -r '.attempts' "$RUN_FILE")
MAX_ATTEMPTS=$(jq -r '.quotas.verifyAttempts' "$CONFIG")

cd "$WORKDIR" || { log "FATAL: workdir ${WORKDIR} 不存在"; exit 1; }
CURRENT=$(git rev-parse --abbrev-ref HEAD)
[[ "$CURRENT" == "$BRANCH" ]] || { log "FATAL: 目前在 ${CURRENT}，應為 ${BRANCH}"; exit 1; }

FAILURES=()

# ---------------------------------------------------------------------------
# 1. 結構性檢查（deterministic，模型無法繞過）
# ---------------------------------------------------------------------------
CHANGED_FILES=$(git diff --name-only "origin/${BASE}...HEAD")
N_FILES=$(echo "$CHANGED_FILES" | grep -c . || true)
DIFF_LINES=$(git diff --shortstat "origin/${BASE}...HEAD" \
  | grep -oE '[0-9]+ (insertion|deletion)' | grep -oE '[0-9]+' | paste -sd+ | bc 2>/dev/null || echo 0)

[[ "$N_FILES" -gt 0 ]] || FAILURES+=("沒有任何 commit / 變更（branch 與 origin/${BASE} 相同）")

# 1a. 禁改路徑（write-path-blocklist.json 終於在執行路徑上強制）
while read -r pattern; do
  [[ -n "$pattern" ]] || continue
  # glob → regex（** → .*，* → [^/]*）
  regex=$(echo "$pattern" | sed 's/[.[\\^$+?(){}|]/\\&/g; s/\*\*/\x01/g; s/\*/[^\/]*/g; s/\x01/.*/g')
  hits=$(echo "$CHANGED_FILES" | grep -E "^${regex}$" || true)
  [[ -z "$hits" ]] || FAILURES+=("禁改路徑被修改（${pattern}）：$(echo "$hits" | tr '\n' ' ')")
done < <(jq -r '.[]' "$BLOCKLIST")

if [[ "$MODE" == "spec" ]]; then
  # 1b. spec 模式：只允許 openspec/changes/<change_id>/ 內的變更
  BAD=$(echo "$CHANGED_FILES" | grep -v "^openspec/changes/${CHANGE_ID}/" || true)
  [[ -z "$BAD" ]] || FAILURES+=("spec PR 只能改 openspec/changes/${CHANGE_ID}/，越界檔案：$(echo "$BAD" | tr '\n' ' ')")
  for f in proposal.md tasks.md; do
    [[ -f "openspec/changes/${CHANGE_ID}/${f}" ]] || FAILURES+=("缺少 openspec/changes/${CHANGE_ID}/${f}")
  done
else
  # 1c. code 模式：scope caps
  MAX_FILES=$(jq -r --arg s "$SCOPE" '.scopeCaps[$s].maxFiles' "$CONFIG")
  MAX_LINES=$(jq -r --arg s "$SCOPE" '.scopeCaps[$s].maxDiffLines' "$CONFIG")
  if [[ "$MAX_FILES" -eq 0 ]]; then
    FAILURES+=("scope:${SCOPE} 不允許 code PR（plan-only）")
  else
    [[ "$N_FILES" -le "$MAX_FILES" ]] || FAILURES+=("檔案數 ${N_FILES} 超過 scope:${SCOPE} 上限 ${MAX_FILES}（縮小改動或請人類把 issue 升級 scope）")
    [[ "${DIFF_LINES:-0}" -le "$MAX_LINES" ]] || FAILURES+=("diff ${DIFF_LINES} 行超過 scope:${SCOPE} 上限 ${MAX_LINES}")
  fi
  # 1d. scope:S 需要 PLAN.md（M 的計畫在 spec，XS 免計畫）
  if [[ "$SCOPE" == "S" ]]; then
    echo "$CHANGED_FILES" | grep -q "^PLAN.md$" \
      || FAILURES+=("scope:S 需要在 branch 根目錄 commit PLAN.md")
  fi
fi

# ---------------------------------------------------------------------------
# 2. 品質指令（來自 pipeline.config.json；null 則跳過）
# ---------------------------------------------------------------------------
if [[ "$MODE" == "code" ]]; then
  for step in lint typecheck test; do
    CMD=$(jq -r --arg r "$REPO" --arg s "$step" '.repos[$r].quality[$s] // empty' "$CONFIG")
    [[ -n "$CMD" ]] || continue
    log "running ${step}: ${CMD}"
    OUTPUT=$(eval "$CMD" 2>&1); STATUS=$?
    if [[ $STATUS -ne 0 ]]; then
      FAILURES+=("${step} 失敗（${CMD}）：$(echo "$OUTPUT" | tail -15)")
    fi
  done
fi

# ---------------------------------------------------------------------------
# 3. 失敗 → 重試或升級
# ---------------------------------------------------------------------------
if [[ ${#FAILURES[@]} -gt 0 ]]; then
  ATTEMPTS=$((ATTEMPTS + 1))
  jq --argjson a "$ATTEMPTS" '.attempts = $a' "$RUN_FILE" > "${RUN_FILE}.tmp" \
    && mv "${RUN_FILE}.tmp" "$RUN_FILE"
  log "驗證失敗（第 ${ATTEMPTS}/${MAX_ATTEMPTS} 次）："
  for f in "${FAILURES[@]}"; do echo "  ✗ $f" >&2; done
  if [[ "$ATTEMPTS" -ge "$MAX_ATTEMPTS" ]]; then
    SUMMARY=$(printf '%s\n' "${FAILURES[@]}" | head -c 1500)
    gh issue edit "$NUM" --repo "${ORG}/${REPO}" --add-label human-coding 2>/dev/null
    gh issue comment "$NUM" --repo "${ORG}/${REPO}" --body "🚨 自動驗證失敗（${MAX_ATTEMPTS} 次重試用盡），升級給人類。

\`\`\`
${SUMMARY}
\`\`\`
branch: \`${BRANCH}\`（未推送）" 2>/dev/null
    log "已升級 human-coding。請放棄此 issue，繼續下一個（重跑 next.sh）。"
    exit 5
  fi
  log "請修正以上問題後重跑：bash ${SCRIPT_DIR}/verify.sh ${REPO} ${NUM}"
  exit 4
fi

# ---------------------------------------------------------------------------
# 4. 通過 → push + PR + labels + comment
# ---------------------------------------------------------------------------
log "驗證通過（${N_FILES} 檔 / ${DIFF_LINES:-0} 行）"
git push -u origin "$BRANCH" || { log "FATAL: push 失敗"; exit 1; }

if [[ "$MODE" == "spec" ]]; then
  PR_TITLE="[spec] ${REPO}#${NUM} ${TITLE}"
  LABELS=(auto spec-pending)
  BODY_FILE=$(mktemp)
  cat > "$BODY_FILE" <<EOF
## OpenSpec Change

\`openspec/changes/${CHANGE_ID}/\`

## Summary

Spec for ${ORG}/${REPO}#${NUM}: ${TITLE}

Spec-For: ${ORG}/${REPO}#${NUM}

---
🤖 Auto-generated by daodao pipeline (spec phase)
EOF
else
  PR_TITLE="[auto] #${NUM} ${TITLE}"
  LABELS=(auto tracked)
  BODY_FILE=$(mktemp)
  cat > "$BODY_FILE" <<EOF
## Summary
Implements #${NUM}: ${TITLE}

## Test plan
- 結構性檢查（檔案數 / 禁改路徑）通過
- 品質指令（lint / typecheck / test）通過，由 verify.sh 強制執行

---
🤖 Auto-generated by daodao pipeline
Closes #${NUM}
EOF
fi

for l in "${LABELS[@]}"; do
  gh label create "$l" --repo "$PR_REPO" --force \
    --color "$([[ $l == auto ]] && echo 0075ca || echo 0e8a16)" \
    --description "daodao pipeline label" >/dev/null 2>&1 || true
done

gh pr create --repo "$PR_REPO" --title "$PR_TITLE" --body-file "$BODY_FILE" \
  --head "$BRANCH" --base "$BASE" || { log "FATAL: gh pr create 失敗"; exit 1; }
rm -f "$BODY_FILE"

PR_NUM=$(gh pr list --repo "$PR_REPO" --head "$BRANCH" --json number --jq '.[0].number')
gh pr edit "$PR_NUM" --repo "$PR_REPO" $(printf -- '--add-label %s ' "${LABELS[@]}")

# label 驗證（套用失敗 → 升級）
PR_LABELS=$(gh pr view "$PR_NUM" --repo "$PR_REPO" --json labels --jq '[.labels[].name] | join(",")')
for l in "${LABELS[@]}"; do
  if ! echo "$PR_LABELS" | tr ',' '\n' | grep -qx "$l"; then
    gh issue comment "$NUM" --repo "${ORG}/${REPO}" \
      --body "🚨 PR #${PR_NUM} 的 label \`${l}\` 套用失敗（current: ${PR_LABELS}），需人類介入。" || true
    exit 1
  fi
done

PR_URL=$(gh pr view "$PR_NUM" --repo "$PR_REPO" --json url --jq '.url')

if [[ "$MODE" == "spec" ]]; then
  gh issue edit "$NUM" --repo "${ORG}/${REPO}" --add-label spec-pending
  gh issue comment "$NUM" --repo "${ORG}/${REPO}" \
    --body "📋 Spec PR opened: ${PR_URL}（merge 後下一輪自動進入 code 階段）"
  # Notion 回寫 Spec Review（沒有 NOTION_API_KEY 就跳過）
  NOTION_PAGE_ID=$(gh issue view "$NUM" --repo "${ORG}/${REPO}" --json body --jq '.body' \
    | grep -o 'Notion page ID: `[^`]*`' | sed 's/Notion page ID: `//;s/`$//' || true)
  if [[ -n "${NOTION_PAGE_ID:-}" && -n "${NOTION_API_KEY:-}" ]]; then
    (cd "$ROOT" && pnpm --silent tsx bin/notion-sync/update-status.ts "$NOTION_PAGE_ID" "Spec Review") \
      || log "WARN: Notion 回寫失敗"
  fi
  # monorepo 切回 main，避免污染下一輪
  git -C "$ROOT" checkout "$BASE" >/dev/null 2>&1 || true
else
  gh issue edit "$NUM" --repo "${ORG}/${REPO}" --add-label auto-pr-open
  gh issue comment "$NUM" --repo "${ORG}/${REPO}" --body "🔗 PR opened: ${PR_URL}"
fi

rm -f "$RUN_FILE"
log "完成：${PR_URL}"
echo "DONE: ${PR_URL}"
exit 0
