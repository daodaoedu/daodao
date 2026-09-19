# P0 1.1 — Existing 3D baseline

Date: 2026-09-12. Frontend base HEAD: `c4552d5aa48e2e113afe33ac423c1ba9ec1328bf`.

Status: **partial; keep task 1.1 unchecked**. Deterministic fixtures, engine captures, and isolated real SSR route/panel/journal/travel checks now exist. Pinned CI execution, deterministic visual timing, and the default-language redirect behavior remain open. See the executable route follow-up below; earlier assessment records explain why the isolation was necessary.

## Implemented

- `daodao-f2e/packages/features/island-engine/dev/baseline-fixtures.ts`: five version-1 fixtures (`empty`, `full`, `owner`, `connection`, `visitor`) sharing a fixed owner seed and fixed practice/checkin IDs. Owner/connection/visitor are deliberately prefiltered response examples, not a replacement for backend authorization.
- `dev/__tests__/baseline-fixtures.test.ts` and its committed-file candidate snapshot: lock the existing 3D data/building placement for all five cases, verify the response visibility examples, and prevent cross-run mutation.
- `dev/baseline.html?fixture=owner` (also empty/full/connection/visitor): local engine-only fixture renderer, low quality, fixed seed, skip intro after walkable. DOM reports `data-ready` and object interaction payloads. No production route or engine behavior was changed.
- `apps/product/e2e/island-3d-baseline/`: standalone Playwright config and 5 × 2 viewport capture checks. Desktop 1440×900; mobile emulation 390×844, scale 1. No authenticated backend or production data is required.

## Reproduction

From `daodao-f2e`:

```sh
pnpm --filter @daodao/features-island-engine test
pnpm run typecheck --filter @daodao/features-island-engine
pnpm --filter @daodao/features-island-engine dev:page --host 127.0.0.1
```

Open `http://127.0.0.1:5175/baseline.html?fixture=owner` for manual comparison. Stop that server before running the standalone capture runner, which owns its server process.

From `daodao-f2e/apps/product`:

```sh
pnpm exec playwright test --config=e2e/island-3d-baseline/playwright.config.ts
```

The runner saves PNG attachments to `daodao-f2e/artifacts/island-3d-baseline/`. Install the pinned Playwright Chromium in a clean CI environment before running. Capture files are generated artifacts, not yet an approved visual snapshot set or a new CI workflow.

## Verified

- Island engine Vitest: 12 files, 83 tests passed (includes seven new fixture checks and five saved layout snapshots).
- Turbo-scoped typecheck: four successful dependency/package tasks.
- Biome check for added fixture/harness files: passed.
- Frontend `git diff --check`: passed.
- Browser rendering checks: 10/10 passed in 43.3s; all five fixtures captured at desktop and 390px mobile viewports with no page errors. Chromium reports the existing `THREE.Clock` deprecation warning.
- Product E2E TypeScript config (`tsc --noEmit -p e2e/tsconfig.json`): passed.
- Available runtime is Node 25.6.1 / pnpm 10.15.1; this differs from documented Node 20.19.4 / pnpm 10.20.0. A pinned CI run remains required.

## Initial acceptance gaps (route items addressed by follow-up below)

1. The real `/[locale]/island/[identifier]` server component loads the initial API response using the server-side auth cookie. Browser-only request interception does not control that SSR call. Add an isolated fixture API backing a product preview, or inject the typed page bootstrap in an explicitly development-only harness.
2. Exercise the real `PracticeCampCard`, owner panel, destination discovery, travel replacement URL, and retry/error state using that integration setup. Engine callback evidence alone does not validate React drawer/navigation behavior.
3. Prove the owner/connection/visitor deny-first policy against server fixtures and confirm private titles/IDs are absent in both DOM and rendered scene. The response fixture subsets here only establish expected inputs.
4. Existing water/character/environment animations remain live. PNG captures are visual evidence, not pixel-deterministic screenshot assertions; only the data/building layout snapshots are deterministic. Define a fixed render-time capture protocol before enabling visual diffs.
5. Mobile capture is viewport/touch emulation in desktop Chromium, not a mid-range physical phone or real mobile GPU performance result.

## Historical bounded SSR/React integration assessment

Read-only follow-up inspected the existing E2E environment/global setup, API client and config resolver, island server route, `IslandCanvas`, `PracticeCampCard`, owner panel, and current discovery hooks. No secret values were read and no remote requests or database writes were made.

The existing root Playwright setup is **not a reusable island fixture runtime**: its global setup unconditionally requires Future Letter's disposable PostgreSQL database, dedicated Redis database, two authenticated users/tokens, and optional practice fixture. Its fixtures create/delete letters and manipulate jobs. Island baseline must retain a separate config and must not import that fixture module.

At inspection, local listening-port discovery found Redis on 6379 but no product on 3001, API on 4000, or PostgreSQL on 5432. This does not establish whether Docker or differently bound services exist. No island route fixture server or integration seed was found in the inspected paths; the existing server island service test uses mocked repository inputs, not a running HTTP/auth fixture stack.

The smallest complete route harness can use a disposable local fixture API and product runtime without changing production source:

1. Start a read-only fixture API on a dedicated loopback port. Serve the five existing island data fixtures and one neighbor island; reject unrecognized routes and every mutation. Dummy local `auth_token` values select owner/connection/visitor response cases. This proves forwarded-cookie/rendering wiring only, not the real server ACL implementation.
2. Start product in an isolated checkout/build directory whose generated **public** API config points to that loopback fixture API. Merely passing `NEXT_PUBLIC_API_URL` to `next dev` is insufficient: `@daodao/config` prioritizes `packages/config/generated/env.ts`. Running the generator in the shared checkout would replace shared generated configuration and can load unrelated `.env` files; do this only in the isolated fixture runtime. No real tokens are necessary for the fake API.
3. Stub the actual request contracts: `/api/v1/users/:identifier/island` (SSR and travel), `/api/v1/users/me`, `/api/v1/connections`, `/api/v1/persona/questions`, `/api/v1/persona/questions/:questionId/answers`, `/api/v1/users`, and `/api/v1/practices/:id/checkins`. Return correctly shaped envelopes, including discovery pagination where consumed. The island URL itself has no Lighthouse membership gate.
4. Configure browser network interception to abort non-loopback origins before navigation. Product-level analytics/auth/optional providers may issue additional calls; inventory and explicitly stub these instead of allowing uncontrolled fallback. Own only the disposable server processes and output directory.
5. Assert the real island route, owner panel, empty-owner CTA, and visitor CTA absence. Select a practice through actual engine interaction, assert the `practice-camp-card-title`, expand its checkin list, and close it. Open the real destination navigator, travel, assert the replaced `/island/baseline-neighbor` URL and changed owner label, then test a fixture API failure and retry path.
6. Save desktop/mobile screenshots for every fixture and interaction state. Separately run real server deny-first unit/integration checks; fake-API privacy examples cannot satisfy the server ACL gate.

That initial assessment did not launch product against the workspace's generated config or fabricate missing test credentials. The separate route harness was subsequently implemented as described below. Task 1.1 stays unchecked until deterministic visual timing, default-locale behavior, and CI execution are demonstrated.

## Executable isolated route follow-up

Implemented under `daodao-f2e/apps/product/e2e/island-3d-baseline/`:

- `route-server.ts` creates an `mkdtemp` frontend copy without `.env*`, `.git`, `.next`, unrelated apps, or copied dependencies. Existing dependency installations are linked read-only, while `@daodao/*` workspace links point into the isolated copy. The copy alone receives public config pointing to `127.0.0.1:4198`; its Next server listens at `127.0.0.1:3198`. Island GLBs are synchronized inside the copy. Successful child shutdown removes that disposable copy without following dependency symlinks.
- The loopback fixture API rejects mutations and unknown routes; authentication uses clearly fake `baseline-*` cookies. It includes the existing auth-provider `/api/v1/auth/me` shape and onboarding status, as well as island/discovery/checkin responses. This is a rendering/privacy-response baseline, **not proof of real server ACL enforcement**.
- `network-guard.cjs` prevents Node non-loopback socket connections. Browser routing separately aborts non-loopback requests, and service workers are disabled. Next telemetry is disabled; the Google-font fixture hook substitutes a local Courier face. Font appearance therefore differs intentionally from production Google font rendering.
- `route.spec.ts` uses the real `/en/island/baseline` SSR page. Five cases assert the owner panel and exact visible practice list, then use the real archipelago menu to travel and assert the replacement island URL/owner label. Owner additionally opens, expands, and closes the actual practice journal through Canvas pointer/raycast events. Because the old Canvas has no DOM practice locator, a test-only React ref probe reads the existing camera/building position to calculate pointer coordinates; it does not call app callbacks or modify engine state.

Run from `daodao-f2e/apps/product`:

```sh
pnpm exec playwright test --config=e2e/island-3d-baseline/route.config.ts
```

Dependencies: existing frontend install, Chromium, `rsync`, Node, and the already-installed `tsx` under config. No PostgreSQL, Redis, real token, or remote API is required. Ports 3198/4198 must be free. Artifacts: `daodao-f2e/artifacts/island-3d-route-baseline/`.

Validation: an initial five-case run passed **5/5 in 2.3m**, including real journal and travel interactions. A strengthened fixture-list rerun also passed, but visual review found decoder blocking had caused primitive-shape fallback. The harness now serves the installed Three Draco decoder JS/WASM bytes locally at the exact expected CDN paths, without outbound requests, and asserts no asset fallback. The final fidelity rerun passed **5/5 in 3.7m**. E2E TypeScript and Biome checks pass. Main-agent inspection confirms the corrected owner scene contains the real models.

Remaining limitations:

1. An unprefixed entry with `zh-TW` browser locale encountered `ERR_TOO_MANY_REDIRECTS` in the isolated Next runtime. Explicit `/en/island/baseline` with English browser locale reliably preserves the forwarded fixture cookie and correct response case. This locale issue is recorded rather than hidden by changing production routing; the default-language gate remains open.
2. Route captures currently use 1440×900 desktop. Separate engine captures cover 390×844 touch emulation, but the real product mobile shell has not yet been captured by this route runner.
3. PNGs remain live-animation captures, not fixed-time visual-diff assertions. Local mocked public config, local font substitution, and real server authorization tests represent different validation boundaries.
4. No new CI workflow was installed or remotely run. Runtime remains Node 25.6.1 / pnpm 10.15.1 instead of the documented pin.

Seven obsolete temporary copies from harness debugging were removed after verifying they belonged to this task. Source files and captured artifacts were preserved; the removed generated copies are reproducible with the runner.
