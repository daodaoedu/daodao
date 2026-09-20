#!/usr/bin/env bash
# Contract checks for the cross-repository shared-config sync workflow.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WORKFLOW="$SCRIPT_DIR/../workflows/sync-claude-config.yml"

fail() {
  echo "❌ $1"
  exit 1
}

for path in \
  ".claude/skills/code-review/**" \
  ".github/workflows/auto-pr-description.yml" \
  ".github/workflows/code-review.yml" \
  ".github/scripts/retrieve-context.sh" \
  ".github/scripts/test-retrieve-context.sh" \
  ".github/scripts/test-code-review-contract.sh" \
  ".github/scripts/review-knowledge.cjs" \
  ".github/workflows/pr-evidence-gate.yml" \
  ".github/scripts/check-pr-evidence.sh" \
  ".github/scripts/test-pr-evidence.sh" \
  ".github/review-knowledge/**"; do
  grep -Fq -- "- '$path'" "$WORKFLOW" || fail "push paths 未監聽 $path"
done

sync_skills=$(sed -n 's/^[[:space:]]*for skill in \(.*\); do$/\1/p' "$WORKFLOW")
for required_skill in collect-pr-feedback code-review; do
  case " $sync_skills " in
    *" $required_skill "*) ;;
    *) fail "sync workflow 未同步 $required_skill skill" ;;
  esac
done

for script in retrieve-context.sh test-retrieve-context.sh test-code-review-contract.sh check-pr-evidence.sh test-pr-evidence.sh; do
  grep -Fq "$script" "$WORKFLOW" || fail "sync workflow 未包含 $script"
done
grep -Fq "pr-evidence-gate.yml" "$WORKFLOW" || fail "sync workflow 未同步 pr-evidence-gate.yml（PR 驗證證據 CI 閘門）"
# 同步 PR 不做 AI review、evidence gate 不得 checkout PR 程式碼（node fixture 沒有這些檔時略過）
CODE_REVIEW_WORKFLOW="$SCRIPT_DIR/../workflows/code-review.yml"
if [ -f "$CODE_REVIEW_WORKFLOW" ]; then
  grep -Fq "startsWith(github.head_ref, 'chore/sync-claude-config-')" "$CODE_REVIEW_WORKFLOW" \
    || fail "code-review.yml 必須跳過 chore/sync-claude-config-* 同步 PR"
fi
EVIDENCE_WORKFLOW="$SCRIPT_DIR/../workflows/pr-evidence-gate.yml"
if [ -f "$EVIDENCE_WORKFLOW" ]; then
  grep -Fq "pull_request_target" "$EVIDENCE_WORKFLOW" || fail "pr-evidence-gate.yml 必須用 pull_request_target 從預設分支執行"
  if grep -Eq "uses:[[:space:]]*actions/checkout" "$EVIDENCE_WORKFLOW"; then
    fail "pr-evidence-gate.yml 不得 checkout（pull_request_target 下會被 SonarCloud S7631 標記，且有執行 PR 程式碼的風險）"
  fi
fi
# node fixture 只複製 sync workflow，auto-pr-description 不在時略過這條（真實 repo／CI 一定有）
AUTO_PR_WORKFLOW="$SCRIPT_DIR/../workflows/auto-pr-description.yml"
if [ -f "$AUTO_PR_WORKFLOW" ]; then
  grep -Fq "grep -q '^## 驗證證據'" "$AUTO_PR_WORKFLOW" \
    || fail "auto-pr-description.yml 必須在 body 已含「## 驗證證據」時跳過，否則會覆寫 dev-task 寫好的證據"
fi

grep -Fq 'git status --porcelain -- .claude .github/workflows .github/scripts' "$WORKFLOW" \
  || fail "變更偵測未涵蓋 untracked scripts"
grep -Fq 'git add -f .claude/ .github/workflows/ .github/scripts/' "$WORKFLOW" \
  || fail "commit scope 未包含 scripts"
grep -Fq 'chore/sync-claude-config-${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT}' "$WORKFLOW" \
  || fail "同步 branch 名稱未使用唯一 run identity"
# 2026-09-20 起同步 PR 交給 GitHub auto-merge：紅燈不會合，且不需要 PAT 有 Checks: read
# （fine-grained token 缺該權限時，輪詢 checks 會整天以 "Resource not accessible..." 失敗）。
MERGE_STEP=$(awk '/- name: Merge now, or queue auto-merge until checks pass/{f=1} f && /- name: Report unqueued sync PR/{exit} f' "$WORKFLOW")
[ -n "$MERGE_STEP" ] || fail "缺少「Merge now, or queue auto-merge until checks pass」step"
printf '%s\n' "$MERGE_STEP" | grep -Fq 'gh pr merge "$PR_URL" --squash --delete-branch' \
  || fail "同步 merge 必須是 squash"
printf '%s\n' "$MERGE_STEP" | grep -Fq 'enablePullRequestAutoMerge' \
  || fail "merge 失敗時必須掛 auto-merge，讓 GitHub 在 required checks 全綠後才合"
printf '%s\n' "$MERGE_STEP" | grep -Fq 'mergeMethod: SQUASH' \
  || fail "auto-merge 也必須是 squash"
# ruleset 已移除 admin bypass，--admin 繞不過任何規則，只會讓失敗訊息變難懂（註解裡提到不算）
printf '%s\n' "$MERGE_STEP" | grep -v '^[[:space:]]*#' | grep -Fq -- '--admin' \
  && fail "同步 merge 不得使用 --admin（ruleset 已無 bypass actor）"
# 不得回頭輪詢 checks：那正是 2026-09-20 整天同步失敗的原因
printf '%s\n' "$MERGE_STEP" | grep -v '^[[:space:]]*#' | grep -Fq 'gh pr checks' \
  && fail "不得在同步流程輪詢 checks（PAT 無 Checks: read；合併條件交給 auto-merge）"
# 工作流其他地方不得出現無條件 merge（例如在 create 步驟直接合）
OTHER=$(awk '/- name: Merge now, or queue auto-merge until checks pass/{f=1} /- name: Report unqueued sync PR/{f=0} !f' "$WORKFLOW")
if printf '%s\n' "$OTHER" | grep -Eq 'gh pr merge|enablePullRequestAutoMerge'; then
  fail "merge／auto-merge 只允許出現在那一個 step"
fi
grep -Fq 'Shared config PR merged: $PR_URL' "$WORKFLOW" \
  || fail "同步必須回報 PR 已 merge"
grep -Fq 'Auto-merge queued' "$WORKFLOW" \
  || fail "掛上 auto-merge 時必須回報，否則人看不出這次是排隊還是合了"
grep -Fq 'Supersede older open sync PRs' "$WORKFLOW" \
  || fail "同步必須關閉被取代的舊 sync PR（design-review F-11）"

echo "✅ sync shared-config workflow contract tests passed"
grep -Fq 'cp .github/review-knowledge/false-positives.jsonl' "$WORKFLOW" \
  || fail "sync workflow 未同步 review-knowledge jsonl"
grep -Fq 'review-knowledge.cjs' "$WORKFLOW" || fail "sync workflow 未同步 review-knowledge.cjs"
