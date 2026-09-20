# Test integrity diff gate

Run from the repository being checked:

```sh
python3 /path/to/daodao/scripts/check-test-integrity.py --base main --head HEAD
python3 /path/to/daodao/scripts/check-test-integrity.py --base HEAD
python3 -m unittest discover -s scripts/__tests__ -p test_check_test_integrity.py
```

Always choose the intended comparison base. CI compares the PR merge-base with its head. Without `--head`, tracked staged and unstaged changes are included; untracked files are not included, so stage intended new tests before the final check. This does not execute application code.

Exit 1 blocks added skip/focus/todo indicators in test files; exit 2 requires review for removed test declarations or assertion lines, even when replaced in the same diff; exit 3 indicates invalid input or tool failure. Exit 0 means these checks passed, not that test quality is proven. Patterns are conservative and can match example strings/comments; rewrite fixture strings into concatenated fragments when needed. Existing unchanged skips are outside this gate. Multiline calls, aliases, dynamic test registration, snapshot weakening, configuration exclusions and semantic assertion weakening can escape these heuristics. Run tests and inspect the diff as well.

For legitimate removed/replaced assertions, first run the check to obtain the resolved `base` and `test_diff_sha256`. After human review, record a JSON receipt with those exact values plus nonempty `reviewer`, `reason`, and `evidence` (review URL or local approval record). Rerun with `--review /path/to/receipt.json`. A changed test diff or base invalidates the receipt — and an invalidated receipt makes the script exit 3, so **the receipt is per-PR: delete `.test-integrity-review.json` in the PR that needed it, or immediately after that PR merges**. Leaving a merged receipt in the repository blocks every later PR whose test diff differs from the one it recorded (observed 2026-09-20 on PR #254, a docs-only change with no test diff at all). Receipts cannot override added skip/focus indicators. The program checks receipt consistency, **not reviewer identity or authenticity**; an agent must never manufacture approval. CI accepts `.test-integrity-review.json` only as a review record that humans must inspect using repository review policy. Required human review and protected checks are repository settings, not enforced by this script.

The workflow uses the PR event with read-only repository permission, no secrets, no dependency installation, and no application execution. It is not a mandatory branch-protection gate until administrators configure it. Changes to this workflow, scanner or review receipt require human review as well. The root workflow checks only files tracked by this repository; sibling repositories need their own integration.

## Claude pre-edit hook

Register `.claude/hooks/test-integrity-guard.py` for the `PreToolUse` matcher `Write|Edit` using `python3 "$CLAUDE_PROJECT_DIR/.claude/hooks/test-integrity-guard.py"`. It reads the native event from stdin (`tool_name`, `tool_input`, `cwd`), computes proposed content without writing, and exits 2 with a diagnostic when newly introduced skip/focus/todo lines are detected. Unchanged or moved legacy marker lines remain allowed; duplicate marker lines are new occurrences and blocked. Malformed matching events, unreadable files and ambiguous edits block rather than claiming validation succeeded. Unsupported tool names are a no-op.

This adapter only checks Write/Edit proposals. Shell writes, other tools, Codex and assertion deletions are not guarded by this adapter: use the CLI/CI check for the final diff. It does not authenticate approvals or accept receipts. Client registration and actual client execution are separate from synthetic event validation. Regression command for both scanner and adapter:

```sh
python3 -m unittest discover -s scripts/__tests__ -p '*integrity*.py'
```
