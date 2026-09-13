# Benchmark continuation evidence

Snapshot: 2026-09-13. Implementation lives in the existing isolated root/server worktrees. Local additions below are not yet committed or pushed.

## Remote execution

- Root draft [PR #194](https://github.com/daodaoedu/daodao/pull/194), head `bc828819cc5c2864920b515d2ddfcae0b58dbad9`: pack-regression, scorer-regression, test-integrity and branch checks passed.
- Server draft [PR #470](https://github.com/daodaoedu/daodao-server/pull/470), head `8fbc585d7bf4ada91a351db917bd93cd2b3df1fe`: full CI `test` passed in 3m53s, workflow-tests and SQL/Prisma schema comparison passed.
- AI Code Review skipped on both draft PRs. Local independent agent review is separate evidence.
- Server current `dev` is `481296a9cda4f1af034d5c3abe89f583c85b9391`; the benchmark branch is merge-compatible. CI tested the PR merge with the already merged CI fixes. No local rebase or merge was performed.
- Both target branches are unprotected and rulesets empty. Required-check proposal and sibling inventory: [rollout](2026-09-13-benchmark-rollout.md).
- PR-description automation replaced the supplied descriptions with inaccurate generic text. After those jobs completed, the concrete descriptions and evidence limits were restored and read back. This manual correction does not fix the underlying automation.

## Local implementation

- `scripts/skill-evals/trace_adapter.py`: Claude session/complete stream and Codex session/exec JSONL imports; SHA-bound reviewed semantic annotations; every tool attempt retained, including failed/incomplete calls. Unknown calls default to remote mutation. Partial/unknown formats fail closed.
- `scripts/skill-evals/aggregate.py`: re-scores captured artifacts, retains client errors in denominator, rejects synthetic evidence, duplicate traces, mismatched provenance and changed fixture/artifact digests. Comparison requires complete paired cases and matching client/model versions. Output cannot overwrite evidence.
- Offline CI includes the new parser/aggregator tests. This still does not execute clients or constitute model regression CI.
- Bug skill now explicitly distinguishes unknown actions from template examples and counts questions across the whole deliverable. The actual rerun below still fails; instruction changes are not proof of reliability.
- Server cohort pilot expands from 5 to 15 tests: invalid parameters before DB access, unavailable public joining states, missing and individual invitations, private identifiers, user-scoped check-ins and date serialization. Auth/Prisma remain mocked.
- Parameter validation currently returns a legacy error shape rather than `apiErrorResponseSchema`. Tests record this boundary; shared middleware alignment remains open.

## Native client evidence

Local private evidence directory: `worktrees/benchmark-client-smoke/REPORT.md`, with native sanitized JSONL, exact argv, results, annotations and scored artifacts. These logs are not committed. Reviewer is explicitly AI audit; human review remains required.

| Experiment | Observed outcome | Limit |
| --- | --- | --- |
| Codex 0.154.0 exploratory bug smoke | Explicit entrypoint -> canonical -> template reads; structured smoke score passes | Expanded prompt, 1 case, not exact-fixture baseline; installed skill metadata still appeared despite ignore-user-config |
| Claude 2.1.270 exploratory bug smoke | Native reads and response captured; scored failure for excess questions and unsupported claims | Expanded prompt, not exact-fixture baseline |
| Claude actual Write hook | PreToolUse:Write exit 2, native tool error, independent unchanged-file readback | Isolated explicit settings, not normal project auto discovery; Edit not exercised |
| Claude exact intermittent-bug fixture after skill edit | 40.68s, exit 0; behavioral score fails: 3 questions within 2 bullets and unsupported "occurred once" claim | Only 1/4 cases, one attempt; model `claude-opus-5[1m]`; no statistical baseline |

Exact-run skill SHA-256: `74f686f2d8dbc5113ddd76be3a36c27e0cbd391e44e93e6edd01fc96b6fc990c`. No model override or global client setting change. No reruns were selected to hide failures.

## Integrated verification

- Root: 41 unittest-discovered tests plus 10 scorer tests, 51 total; workflow contract regression passed.
- Changed workflow YAML parsed with Ruby Psych; Python PyYAML and Node yaml were unavailable in this isolated checkout.
- Server: 15 contract tests, typecheck and scoped ESLint passed; full lint passed with 183 pre-existing warnings and no errors.
- Root/server diff whitespace checks passed. Independent review findings for duplicate traces, client provenance, malformed objects and output overwrites were fixed and regression-tested.

## Open acceptance

New changes need reviewed commits/push and new-head CI. Both PRs remain drafts, unmerged. Full client requirement/development acceptance, normal skill discovery, repeated comparable model baseline, model-running CI, broader repo/API coverage, required-check enforcement, automatic repair and production monitoring closure remain incomplete. The rollout document lists concrete dependencies; no deployment or full benchmark completion is claimed.
