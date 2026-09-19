# Map-first shell revision

## Design plan

- Keep the island itself as the hero, not an instructional card. Full-width sea surrounds the engine's island; chrome stays compact.
- Palette: deep teal `#295e5c`, sea `#75ced0`, mist `#eef9f9`, aqua `#89dad7`, white `#ffffff`.
- Type: existing Noto Sans TC / system fallback, compact 18–22 px headings and 14 px controls.
- Layout: compact title → scenario + collapsed mascot tools → viewport-filling map. Places overlay the map on demand, right on desktop and bottom on mobile.
- Review: avoid dashboard cards and permanent sidebar because both reduce exploration space; retain actual mascot assets and brand colors, no invented navigation.

## Work

- Implemented: map-first shell, collapsed native disclosure mascot picker, accessible places panel, follow/overview controls disabled until scene ready.
- Content is hidden initially and on remount; interaction opens and focuses details. Canvas Escape opens the place list, panel Escape/close returns focus to its toggle.
- Desktop side overlay and mobile bottom overlay do not resize the map. Map shell uses the remaining dynamic viewport with a 450 px desktop / 55dvh mobile minimum.
- Scoped Biome check and package TypeScript check passed. Main agent owns final browser layout and camera integration validation.
- Engine, terrain, camera behavior, and integration tests owned by main agent.
