# P0 task 1.5 — preview-only Durable Object WebSocket spike evidence

Date: 2026-09-12 (Asia/Taipei)

## Scope and isolation

The implementation is isolated under `daodao-worker/spikes/island-realtime-do/`. It does not modify the production Worker entrypoint, production routes, root Wrangler configuration, or dependencies. A test-type configuration fix was added during integration (see below). The spike has no ticket or ACL implementation, so its gateway rejects non-loopback hostnames and its Wrangler config sets `workers_dev = false`.

This spike answers only whether the current local Workers toolchain can support:

- deterministic one-room Durable Object routing;
- two WebSocket clients joining the same room;
- join, move, explicit leave, and close-handshake broadcasts;
- reconstruction of canonical presence from hibernatable WebSocket attachments without a class-level or module-level player registry.

Production protocol validation, room ticket verification, replay protection, ACL, capacity, speed/rate/collision validation, reauthentication, moderation, telemetry, deployment bindings, and public preview access remain P2 work.

## Implementation

- `src/worker.ts`: loopback-only gateway; room key is `island:<roomName>` and is resolved with deterministic `idFromName()` + `get()`.
- `src/room.ts`: Hibernation API `acceptWebSocket()`, `serializeAttachment()`, `deserializeAttachment()`, `getWebSockets()`, join/move/leave fan-out, and explicit close reply for the spike's 2024-12-01 compatibility date.
- `src/protocol.ts`: narrow JSON parser for join/move/leave frames.
- `__tests__/room.spike.ts`: two-client lifecycle, no duplicate leave, client close handshake, attachment-only presence reconstruction, and non-loopback rejection.
- `scripts/local-smoke.mjs`: bounded five-second-per-step local Wrangler handshake.

The installed local toolchain was used without changing formal project dependencies:

- Wrangler `3.114.17` (the CLI reports that Wrangler 4 is available)
- Vitest `2.1.9`
- `@cloudflare/vitest-pool-workers` `0.5.0`
- Workers types `4.20241205.0`

The installed type definitions expose `DurableObjectNamespace.getByName()`, but the current local workerd binding does not implement it. The spike therefore uses the equivalent deterministic `idFromName()` + `get()` path. Production task 7.1 must align and re-verify Wrangler, workerd, pool, Workers types, compatibility date, and `getByName()` before formal implementation.

The spike's generic room name is only an isolation/routing test key. It does not establish that an owner-only ACL can cover shared challenges or activities; production room identity and authorization must distinguish personal rooms from the existing space/cohort or activity scope selected by the product design.

## Reproducible verification

From `daodao-worker`:

```sh
pnpm exec tsc --noEmit -p spikes/island-realtime-do/tsconfig.json
pnpm exec vitest run --config spikes/island-realtime-do/vitest.config.ts
```

Observed result:

```text
Test Files  1 passed (1)
Tests       4 passed (4)
```

The formal Worker suite does not collect `*.spike.ts` and remains green:

```sh
pnpm test
```

```text
Test Files  3 passed (3)
Tests       12 passed (12)
```

Integration reproduced a repository-level typecheck failure in the existing three
`test/` files: `cloudflare:test` types were not loaded. Loading the installed pool
types in `tsconfig.json` then exposed the missing `ProvidedEnv.CACHE` declaration.
The added `test/env.d.ts` maps only the actual test CACHE binding from the existing
Env type, without pretending a real AI binding is provisioned. Repository-level
`pnpm run typecheck` and isolated spike typecheck now both pass. The unchanged
12-test runtime suite also passes; it still emits existing missing-AI and external
telemetry connection errors, so this is not evidence of working live AI providers.

For the local Wrangler handshake, terminal 1:

```sh
pnpm exec wrangler dev --config spikes/island-realtime-do/wrangler.toml --port 8791
```

Terminal 2:

```sh
node spikes/island-realtime-do/scripts/local-smoke.mjs
```

Observed result:

```text
LOCAL_PREVIEW_SPIKE_OK join move leave
```

Wrangler logged two successful WebSocket upgrades for the two clients:

```text
GET /spikes/island-realtime/rooms/bounded-smoke 101 Switching Protocols
GET /spikes/island-realtime/rooms/bounded-smoke 101 Switching Protocols
```

## Evidence boundary and blocker

The Workers pool test inspects both accepted sockets, verifies their serialized attachments, and invokes the same attachment-only snapshot reconstruction path used by room handlers. This is deterministic local evidence that no in-memory player map is required after an isolate restart.

It does **not** force a real Cloudflare platform isolate eviction/hibernation cycle. The local Wrangler smoke validates actual local WebSocket upgrades and message exchange, but no Cloudflare preview was deployed or contacted. Therefore the task 1.5 acceptance condition "preview real handshake" is **not satisfied**, and `tasks.md` remains unchecked.

Blocker before P2 scheduling: build the ticket/Access boundary and authorized preview configuration, align the current Workers toolchain and compatibility date, then run a deployed preview handshake that proves upgrade → auth → ready → move → close across a real hibernation/resume boundary. Until that evidence exists, this is a local technical feasibility result only.
