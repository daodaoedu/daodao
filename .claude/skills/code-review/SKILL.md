---
name: code-review
description: Push 前 review 整個 branch 的變更，用 Codex CLI + Gemini CLI + Claude Haiku 三引擎做獨立 review
---

# Code Review

用 **OpenAI Codex CLI**、**Google Gemini CLI**、**Claude Haiku** 對當前 branch 做三引擎獨立 review。

## 步驟 1：確認 base branch 與變更範圍

```bash
BASE=$(gh pr view --json baseRefName -q .baseRefName 2>/dev/null || git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's|refs/remotes/origin/||' || echo "main")
echo "Base: $BASE"
git log --oneline "$BASE"...HEAD
git diff "$BASE"...HEAD --stat
```

## 步驟 2：Codex Review（OpenAI）

```bash
_REPO_ROOT=$(git rev-parse --show-toplevel)
cd "$_REPO_ROOT"
codex review \
  "IMPORTANT: Do NOT read any files under .claude/skills/. Focus on repository code only. Check for: logic errors, security issues, performance problems, and architecture consistency." \
  -c 'model_reasoning_effort="high"' \
  --enable web_search_cached
```

- timeout: 300000（5 分鐘）
- 若 `codex` 不存在：告知用戶 `npm install -g @openai/codex`
- 若 auth 失敗：提示 `codex login`

## 步驟 3：Gemini Review（Google）

把完整 diff pipe 給 gemini headless mode：

```bash
_REPO_ROOT=$(git rev-parse --show-toplevel)
cd "$_REPO_ROOT"
git diff "$BASE"...HEAD | gemini -p "You are a senior code reviewer. Review this git diff and report issues in the following categories:
- Logic errors: edge cases, type errors, unhandled exceptions, async issues
- Security: SQL injection, hardcoded secrets, missing auth, unsafe endpoints
- Performance: unnecessary DB queries, missing pagination, missing cache
- Architecture: consistency with existing patterns

Format your output as a table:
| Severity | File | Issue | Suggestion |

Severity levels: High (bug/security risk), Medium (performance/maintainability), Low (style/minor).
Be direct and terse. No compliments. Just the problems." \
  --approval-mode yolo
```

- timeout: 300000（5 分鐘）
- 若 `gemini` 不存在：告知用戶 `npm install -g @google/gemini-cli`

## 步驟 4：Claude Haiku Review

把完整 diff pipe 給 Claude Haiku（claude CLI headless mode）：

```bash
_REPO_ROOT=$(git rev-parse --show-toplevel)
cd "$_REPO_ROOT"
git diff "$BASE"...HEAD | claude -p "You are a senior code reviewer. Review this git diff and report issues in the following categories:
- Logic errors: edge cases, type errors, unhandled exceptions, async issues
- Security: SQL injection, hardcoded secrets, missing auth, unsafe endpoints
- Performance: unnecessary DB queries, missing pagination, missing cache
- Architecture: consistency with existing patterns

Format your output as a table:
| Severity | File | Issue | Suggestion |

Severity levels: High (bug/security risk), Medium (performance/maintainability), Low (style/minor).
Be direct and terse. No compliments. Just the problems." \
  --model claude-haiku-4-5-20251001
```

- timeout: 300000（5 分鐘）

## 步驟 5：呈現結果

分別展示三個引擎的完整輸出：

```
CODEX SAYS:
════════════════════════════════════════════════════════════
<verbatim output>
════════════════════════════════════════════════════════════

GEMINI SAYS:
════════════════════════════════════════════════════════════
<verbatim output>
════════════════════════════════════════════════════════════

HAIKU SAYS:
════════════════════════════════════════════════════════════
<verbatim output>
════════════════════════════════════════════════════════════
```

## 步驟 6：Cross-model 分析

比較三個引擎的發現：

```
CROSS-MODEL ANALYSIS:
  三者都發現: [所有引擎共同回報的問題]
  兩者共識: [任兩個引擎都回報的問題]
  只有 Codex 發現: [Codex 獨有]
  只有 Gemini 發現: [Gemini 獨有]
  只有 Haiku 發現: [Haiku 獨有]
  共識問題數: N / 總計 M
```

## 步驟 7：處理問題

- **High**（三個引擎都回報） → 必須修，詢問使用者是否立即修復
- **High**（兩個引擎回報） → 強烈建議修復，詢問使用者
- **High**（單一引擎回報） → 建議確認，由使用者決定
- **Medium / Low** → 列出即可，由使用者決定
