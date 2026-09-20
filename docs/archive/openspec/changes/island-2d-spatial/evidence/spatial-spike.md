# P0 2D interactive prototype

Date: 2026-09-12. Standalone package: `daodao-f2e/packages/features/island-world-2d`.

## Implemented and verified

- Personal growth, shared challenge, and learning event fixtures use the same
  engine, collision grid, A* navigation, keyboard interaction, and DOM place list.
- Brand illustration and pixel variants share a 16 × 12 map with 32px tiles
  (512 × 384 logical Canvas). Art is procedural placeholder artwork, not final assets.
- Keyboard input is scoped to the focused Canvas. Native key events retain short
  E/Enter/Escape presses; held movement keys clear on blur and scene shutdown.
  Escape transfers focus to the equivalent DOM list. Direction keys do not scroll
  the page while controlling the map.
- Remounting style/scenario destroys the previous engine and ignores stale
  callbacks. The page explicitly labels all scenario data as prototype examples.
- Local Playwright: **20/20 passed in 54.4s**, desktop 1440×900 and touch emulation
  390×844. Covers both styles, three scenarios, single Canvas after switching,
  focus isolation, walkable/water destinations, and matching Canvas/E/DOM payloads.
- Unit tests: **7/7 passed**. Package typecheck, build, scoped Biome, product E2E
  TypeScript, and frontend diff whitespace checks passed.
- Main agent inspected desktop challenge and mobile event screenshots. Mobile
  Canvas labels are small; the full-size DOM list provides equivalent actions.

## Reproduce

From `daodao-f2e`:

```sh
pnpm --filter @daodao/features-island-world-2d typecheck
pnpm --filter @daodao/features-island-world-2d test
pnpm --filter @daodao/features-island-world-2d build
pnpm --filter @daodao/features-island-world-2d dev:page
```

The dev page uses `http://127.0.0.1:5176`. Stop it before running the standalone
browser runner, which owns the same port. From `daodao-f2e/apps/product`:

```sh
pnpm exec playwright test --config=e2e/island-2d-spike/playwright.config.ts
```

Generated screenshots, diagnostics, and JSON results are under frontend
`artifacts/island-2d-spike/` and ignored by Git. Tests block non-loopback requests.

## Measurements and open gates

The final build's reporting script measured CSS + JS at **1,218,490 raw bytes /
324,421 gzip bytes** (HTML excluded). JS is 1,214,729 raw / 323,004 gzip bytes;
CSS is 3,761 raw / 1,417 gzip bytes. Vite reports a >500 KB chunk warning.
This is the whole standalone dev-page bundle, not an incremental production
route cost; no production route imports this package yet.

Readiness and sampled FPS are attached as development-server diagnostics. They
exclude production navigation/download cost and do not prove mid-range physical
phone performance. Therefore tasks 1.3 and 1.4 remain open; no measured Pixi
replacement decision is claimed.

Brand illustration is the current prototype default, with pixel kept for direct
comparison. Final product art approval, sprite atlas specification and rejection
decision remain open, so task 1.2 is not marked complete.

Task 11.2 is complete for its explicitly mocked scope. Membership, real shared
progress, attendance, moderation, navigation to live entities, and multiplayer
transport are not wired. No production route replacement or deployment occurred.
