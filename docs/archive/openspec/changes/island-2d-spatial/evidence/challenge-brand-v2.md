# Shared learning island visual revision

User approved revising the challenge island after identifying a mismatch with
the website. Keep this as P0 visual exploration, not a production renderer gate.

Source: original landing-page/islands.svg, landing-page/island.svg and quiz mascots.
Palette: #F3FCFC background, #DEF5F5 island, #16B9B3 accents, #295E5C type,
#FFFFFF paths/cards, #F9E41E small emphasis. Retain UI sans typography.
Map-left / content-right layout remains; the scene uses an open learning commons,
rounded island silhouettes and connecting paths instead of grass tiles and camps.
Use repo-native vector/Canvas composition, not generated raster replacements.
Challenge actions become progress journal, partner sharing, conversation and
other challenges. Keep IDs and collision/input contracts for regression comparison.
Do not introduce inactive fake website navigation or mock online participants.

Validation: 24/24 browser checks passed (1.2m), including a direct challenge
preview link and matching content labels. Existing 7/7 unit tests, package
typecheck, product E2E typecheck, build, Biome and diff whitespace checks passed.
Desktop and 390px mobile screenshots were inspected. Mobile map text remains
small; the equivalent DOM place list remains available below the scene.

Preview: http://127.0.0.1:5176/?scenario=challenge
Artifacts: daodao-f2e/artifacts/island-2d-spike/test-results/ (generated, ignored).
The original landing-page SVG is bundled without modification. This is a first
flat-vector composition, not final textured illustration art or a new sprite atlas.
JS/CSS build: 1,222,190 raw / 325,364 gzip bytes, excluding image assets.
No production route, shared membership or multiplayer integration changed.
