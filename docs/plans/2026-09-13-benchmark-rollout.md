# Benchmark gate rollout proposal

Status: concrete rollout proposal, not enabled branch protection or completed automation. Snapshot: 2026-09-13. Live PR checks were queried with `gh pr checks`; sibling coverage below was inspected from local `projects/` checkouts and is not remote CI proof.

## Current PR evidence

| PR | Observed checks |
| --- | --- |
| [root #194](https://github.com/daodaoedu/daodao/pull/194) | `test-integrity`, `pack-regression`, `scorer-regression`, both `Branch flow rules` checks and PR description passed; `AI Code Review` skipped |
| [server #470](https://github.com/daodaoedu/daodao-server/pull/470) | `test` (3m53s), `workflow-tests`, `Compare SQL ↔ Prisma schemas`, `Branch flow rules` and PR description passed; `AI Code Review` skipped |

Root gate run references: [integrity](https://github.com/daodaoedu/daodao/actions/runs/34761100427), [pack](https://github.com/daodaoedu/daodao/actions/runs/34761100413), [scorer](https://github.com/daodaoedu/daodao/actions/runs/34761100422). Server references: [CI](https://github.com/daodaoedu/daodao-server/actions/runs/34761103169), [schema drift](https://github.com/daodaoedu/daodao-server/actions/runs/34761103165). Refresh against the latest PR head before acting. Pending does not mean passed.

Earlier live protection reads returned `Branch not protected` for root main and server dev; repository rulesets were empty. Both repositories allowed Actions and the current viewer had ADMIN permission. No enforcement mutation is performed by this proposal.

## Required check configuration

Recommended initial contexts, after successful latest-head execution and applicable workflow merge:

| Branch | Exact context | Rationale / prerequisite |
| --- | --- | --- |
| root `main` | `test-integrity` | Runs for every pull request, no path filter; current PR passed. Heuristic test-diff protection, not semantic proof. |
| server `dev` | `test` | Continuous Integration runs on every PR to dev; includes typecheck/lint/full tests. Published-head run passed. |
| server `dev` | `workflow-tests` | Same CI workflow, always scheduled for dev PRs; verifies workflow contracts. Current PR passed. |
| server `dev` | `Compare SQL ↔ Prisma schemas` | No PR path filter for dev; current PR passed. Requires the cross-repository checkout credential; supports only scanner-defined schema comparisons. |

Do not require root `pack-regression`, `scorer-regression` or `Shared Config Regression`'s `regression` job yet: these workflows have `on.pull_request.paths`, so unrelated PRs can remain pending forever if those contexts become required. First make each workflow always run and place relevance filtering inside the job, or add a uniquely named always-reporting aggregate that propagates relevant failures. Test both relevant and unrelated changes.

Root `branch-base-check.yml` and trusted `branch-guard.yml` both report `Branch flow rules`; both appear on #194. Do not add this ambiguous context to the initial proposal. Give the trusted guard a unique job name and verify it executes trusted base code on every PR before requiring it. Server branch naming can be added after confirming its deployed workflow and unique context.

Do not require PR-description, notification or skipped AI-review jobs as quality gates. They do not establish application correctness or an independent reviewer pass.

Activation acceptance: configure only the reviewed contexts and GitHub Actions source, open a disposable PR with a deterministic failing gate and confirm merge is blocked, fix the same PR and confirm all contexts report for its newest head. Test an unrelated docs-only PR and stale-head behavior as well. Record ruleset/protection read-back plus check URLs. Define bypass actors and emergency removal policy in the reviewed configuration before changing organization behavior; never demonstrate enforcement by merging a deliberately broken branch.

## Remaining repository coverage

These are observed workflow commands, not test counts, remote pass results or exhaustive API coverage.

| Local repository | Existing quality workflow / command | Observed gap and bounded next work |
| --- | --- | --- |
| daodao-f2e | `linode-ci.yml`: `pnpm run typecheck`, `pnpm run lint`, `pnpm test` (Turbo scripts). `mobile-ci.yml`: filtered mobile typecheck/lint and EAS check. | Both parallel shell blocks end with bare `wait`, which loses child failures. Reuse server's tested exit-status propagation pattern and add a workflow failure-propagation regression before treating green as reliable. |
| daodao-admin-ui | `ci.yml`: `pnpm lint`, `pnpm exec tsc --noEmit`. Package defines `pnpm test` as `vitest run`. | Existing test command is not invoked by this workflow. Run its current suite, establish dependencies and add the test step in its own reviewed change. |
| daodao-worker | `ci.yml`: install and `pnpm run typecheck`. Package defines `pnpm test` as `vitest run`. | CI does not invoke tests. Validate current Vitest environment and add it before proposing required context. |
| daodao-ai-backend | `ci.yml`: Black/Ruff checks on `src`; Bandit uses `|| true`. `make test` invokes `.venv/bin/python3.12 -m pytest tests/ -v`. | CI has no pytest step; security scan is advisory. Establish test dependencies/services and separate deterministic unit tests from provider-dependent cases, then add the deterministic job. |
| daodao-storage | `ci-postgres.yml`: Docker database readiness, basic query and schema SQL loaded into clean databases with `ON_ERROR_STOP=1`. `schema-sync-check.yml`: filtered schema sync check and schedule. | Existing schema execution is meaningful but is not migration-upgrade, rollback or all-constraint coverage. Add one supported migration upgrade fixture and failure assertion; keep filtered schema-sync out of unconditional required contexts. |
| daodao-infra | `deploy-nginx.yml` plus shared branch/review/description workflows found. | No standalone PR infrastructure validation workflow found in this checkout. Define the relevant nginx/config validation command and isolated fixture before introducing a required check. Deployment existence is not a validation gate. |

No sibling edits or remote protection checks were performed during this inventory. Server coverage expanded to 15 HTTP pilot cases across two endpoints; this remains mocked auth/persistence. Its parameter-validation response uses a legacy shape unlike `apiErrorResponseSchema`; alignment is a separate shared middleware change requiring dedicated regression coverage.

## Feedback repair and monitoring

Existing implementation and instructions provide starting points:

- `.github/workflows/pipeline-dispatch.yml` calls `bin/pipeline/dispatch.ts` hourly and supports dry-run; dispatch has mirror idempotency logic.
- `.github/workflows/pipeline-board-sync.yml` calls `bin/pipeline/board-sync.ts` hourly for merged auto PRs. Board synchronization is not deployment or acceptance verification.
- Shared `code-review.yml`, `collect-pr-feedback` skill and `docs/automation/routine-b-prompt-v2.md` describe reviewing CI/findings and repairing changes. Routine B text is not evidence of an installed running repair worker. No `bin/routine-dispatch` directory was found in this checkout.
- Existing workflow Discord alerts, including scheduled schema drift alerts, provide failure notifications; no inspected path establishes an end-to-end production alert -> deduplicated bug -> reviewed repair -> verified rollout loop.

The implementation boundary is documented in [development workflow](../development-skills-and-workflow.md), [dual subscription PRD](../automation/dual-subscription-agents-prd.md) and [issue-to-acceptance workflow](../automation/issue-to-acceptance-workflow.md). Remaining decisions include pilot repositories, runner VM/image and network policy, separate auth stores and reseed/revoke procedure, publisher permission scope, quota handoff policy, and acceptable pilot success threshold. These documents contain proposals and unchecked acceptance items; their client/provider restrictions are not newly verified provider policy in this audit.

Bounded next implementation:

1. Add a read-only feedback collector for one opted-in PR. Save repo, PR head SHA, check IDs, reviewer finding IDs and classifications to a versioned local record; test duplicate delivery and head changes. No code execution from feedback text.
2. Add an isolated one-repair executor only after runner/publisher authorization is explicit. Bind fixes to the collected head, reuse a single total repair budget, verify deterministic gates, preserve patch/results on failure and stop on auth/quota errors. Test stale lease, concurrent delivery, injected instructions and invalid review output before enabling publication.
3. Add one monitoring-source adapter, initially schema-drift Actions failures. Normalize event identity, affected revision, redacted evidence and deduplication key into a local bug draft using the existing bug workflow. Test duplicate/recovery/out-of-order events; publishing an issue and dispatching development remain separate authorized operations.
4. Run a controlled success, failed verification, exhausted budget and manual takeover exercise. Only then mark the feedback loop implemented and operational; require actual alert and latest-revision evidence to claim production closure.

## Aggregator review

The current aggregator rejects non-object manifests/identities/artifacts, inconsistent client/provenance and duplicate trace hashes. Independent review also found output-path collisions; exclusive output creation now prevents overwriting any existing evidence. Ten aggregation tests pass, including reproduced duplicate-count and overwrite regressions. Reviewer attestations and trace metadata remain evidence assertions, not identity verification.
