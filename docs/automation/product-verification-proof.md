# verify-product packaged-run evidence

2026-11-03 UTC. This records one bounded local Web run of the committed app-level skill. Only the `future-letter` driver is registered; this is not coverage of every feature-map entry or every Future Letter state.

## Reproduction and source

Follow [runtime instructions](../../plugin/skills/verify-product/references/runtime.md). The actual sequence was `runtime.cjs init → launch → doctor → drive.cjs run future-letter → runtime.cjs cleanup`, using task-owned checkouts, an empty PostgreSQL database, Redis, real server workers, Next product App and real SMTP to Mailpit. A second empty-database run followed assertion repairs from independent review; the final run below used the generated `.agents/skills/verify-product/scripts/` entry. Both generated platforms include byte-identical executable resources; a regression first reproduced their absence, then verified the builder repair.

- Run: `2026-11-03T15-59-51-661Z-fb9c6b`.
- Server: `d7e00b461da98e5ab024a4af86a270257f224418`.
- Product: `1f1cc054b12948ec772747ed2ac2f5431d728af6`.
- Infra: `82da8c3`; storage: `b0a25b2`.
- Doctor recorded empty tracked/untracked application-source differences, UI HTTP 200, authenticated `/auth/me` 200, one future-letter worker, one email worker, zero initial clock offset. Retry-scan registration was observed, not its hourly execution.
- Primary learner user 900003 and other coach user 900002 both have global role `User`.

## Observed user path

| ID | Actual result |
|---|---|
| U01 | Browser form chose seven days, created and sent a sealed letter. Send API 200; scheduled API and screen excluded both private text sentinels; no Email before delivery. |
| U02 | Original job `future-letter-1` changed delayed→completed. Timestamp `1793721598287`, configured delay `604859884 ms`, and persisted deliverAt `2026-11-10T16:00:58.171Z` remained unchanged; letter became delivered with openedAt null. |
| U03 | Real SMTP message `nSX7hMQqy4MZ4CF3wwSsko` reached `verify-learner@example.invalid`; exact subject「你寫給自己的信，今天寄到囉」and required copy matched. Private text absent; email_log sent. |
| U04 | Browser clicked the href extracted from that received HTML; open API 200, original two private fields visible, openedAt persisted. |
| U05 | Other ordinary User followed the same href: detail API 404, zero detail cards, private text absent. |
| U06 | Homepage「我的足跡」entry reached footprints with timeline visible. |
| U07 | Logged-out received href reached same-origin `/auth/login`; exact complete footprints path/query retained in redirect; private text absent. |

## Artifacts and cleanup

The run retained `final.json`, `scope.json`, raw API/job/DB/SMTP observations, screenshots, three traces and three nonempty videos. `artifact-location.json` found no missing referenced artifact after browser contexts closed. Runtime cleanup removed only its owned processes and compose project; the artifact files remained. Raw artifacts contain local sessions and stay outside Git, under the configured workspace `evidence/future-letter/<run-id>/`.

Final driver/helper hashes, checked against the files after the run:

- Driver SHA256: `022dfa3ffcaa67226a75ee267120ffb499b4e78809263247b857791de14892ad`.
- Contracts SHA256: `f6acbecc5118b678d1447de8a8b2458f086eb9d284e1996b13d610cd3a427a97`.

## Substitutions and unverified scope

- Existing dev-login fixtures establish sessions; actual Google OAuth/provider callback is unverified.
- The UI chose seven days and the original delayed job was inspected before advancing only the owned server Date. Browser Date was aligned without accelerating its timers. Seven real days were not waited.
- Mailpit receives real SMTP; Gmail/Outlook delivery and inbox placement are unverified.
- Hourly cadence, pending-backlog recovery across restart, real Redis outage, dev deployment and PM acceptance are unverified by this run.
- Resource logs include an Email tracking pixel blocked by NotSameOrigin, fixture quiz/latest 404, and logged-out 401 responses. Email-open tracking and a clean browser console are not claimed.

## Harness and gate validation

21 Node harness/contract tests, 29 Python evidence-checker tests, CI evidence and pre-PR shell regressions, 75 plugin build-contract tests, workflow YAML parsing, shell/Node syntax, generated-artifact synchronization and diff whitespace checks passed. Negative contract cases reject a wrong subject, missing required copy, a wrong redirect path with the correct letter id, extra query data and a foreign origin; a further contract rejects missing, invalid or pre-delivery persisted openedAt. The existing evidence gate rejects generic PASS and worker「未發請求」labels; passing its format check is never proof of execution.

An initial launch was correctly rejected by Doctor because the reused infra backend network was internal and host DB/Redis bindings were unavailable. A minimal owned-project network overlay fixed host connectivity; infra bootstrap/schema/fixture definitions remain the single source. Independent review found and prompted the subject/redirect assertions and persisted openedAt assertion above. No Windows or client-plugin autoload validation is claimed.

CLI review also found generic-label synonyms and a legacy headerless matrix with a trailing evidence column; regressions first reproduced both and the checker now preserves the actual observation column. These checks remain format heuristics, not proof that an observation is true.

CLI review coverage: Codex returned concrete findings with explicitly partial file coverage; Claude reviewed the full original inline canonical snapshot and a bounded correction delta. The two free-engine chains produced no usable review (timeout, unavailable models/providers or free quota); a subsequent diff-logic reassignment timed out. All accepted concrete findings were corrected and regression-checked. This is not four-engine approval; independent source/live inspection and the actual generated-entry proof are separate evidence.
