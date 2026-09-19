# P0 implementation evidence

Date: 2026-09-12

`../tasks.md` remains the acceptance source. A prototype or passing unit test
alone does not complete a task that also requires route, device or preview evidence.

## Work in progress

Latest user-directed visual revision: [island exploration v3](./island-exploration-v3.md)
and [map-first shell](./map-shell-v3.md). These supersede the earlier fixed-size
commons composition while preserving the P0-only boundary. Brand now uses a
1024×768 coastal world with follow/overview camera; pixel remains a comparison.

| Task | Implementation scope | Acceptance still required |
| --- | --- | --- |
| 1.1 | Deterministic 3D fixtures, engine screenshots and isolated SSR route harness | Pinned CI, deterministic visual timing, default-locale behavior; see baseline.md |
| 1.2 | Same map with pixel and brand illustration prototypes; desktop/mobile screenshots verified | Final product art choice and sprite atlas specification |
| 1.3 | Isolated Phaser/Tiled package, input, collision and pathfinding | Target desktop/mobile FPS, readiness and bundle measurements |
| 1.4 | Compare measured Phaser result with budget | Target-device evidence before any Pixi replacement decision |
| 1.5 | Isolated local Durable Object WebSocket spike | Real preview handshake and hibernation evidence |
| 1.6 | Consolidate evidence and decisions | P0 gates above; no P1/P2 rollout approval yet |

## Execution boundaries

- The 2D prototype is a standalone development page, with no import from the product route.
- The realtime spike uses isolated configuration; no production Worker route or binding is changed.
- 3D engine and existing `/island/[identifier]` remain available.
- Browser plugin setup returned `No browser is available`; browser discovery returned `[]`.
  Local verification uses the repository's Playwright test runner. This is not public web research.
- Reauthorization timing is already decided by the spec (60-second refresh, 75-second revocation bound);
  design Open Question 3 has been reconciled accordingly.

## Product decisions to review after the prototypes

- Art: compare both interactive variants before recording an adopted style.
- Release: retain the design's separate P1 renderer and P2 realtime rollout tracks.
- Personal realtime audience: owner/connections only; shared challenge/activity spaces use their own membership rules.
- 3D removal: a separate cleanup change, after measured beta acceptance and a defined observation window.

## Shared challenge/activity scope added during implementation

The user added shared challenges and activities as intended applications. Task
11.1 is complete: PRD supplement, proposal, design D11, and the new
`shared-spatial-spaces` spec now separate personal/cohort/space identities and
membership. Source audit is in `shared-scope.md`; OpenSpec validation passed.
Task 11.2 is complete with 20/20 browser checks for three local prototype scenarios;
see `spatial-spike.md`. Tasks 11.3–11.10 track the actual
contracts, settings, access resolver, domain entrypoints and runtime acceptance.

The initial priority assumption is an always-available shared learning space;
an activity scenario is included for comparison. No user answer has yet selected
a scheduled-hosting model. The engine and room transport remain reusable in either case.

Existing challenges have only member enrollments, not a host/coach role. Do not
invent moderator authority from organization ownership. Cohort/space settings
and membership remain separate from personal island connections.

Detailed baseline and realtime evidence will be recorded in `baseline.md` and
`realtime-spike.md`; frontend runtime evidence will be recorded in `spatial-spike.md`.

## Rechecked server baseline

From `daodao-server`:

```sh
pnpm test --runTestsByPath tests/unit/services/user-island.service.test.ts
```

Result: 15/15 tests passed (1 suite). No server source changes. Existing tests
cover owner/connection/visitor filtering, private payload exclusion, delayed
visibility and visible-only recent checkin totals. The existing unknown/missing
visibility fallback remains covered as public; this is a baseline observation,
not evidence of a new strict validator or end-to-end authorization test.

Environment observed: Node v25.6.1, pnpm 10.15.1. These differ from the frontend
project-rules Node 20.19.4 guidance and packageManager pnpm 10.20.0 pin; local
results do not substitute for CI on its configured toolchain.
