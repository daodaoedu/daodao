# Island identity and map-first exploration

User correction: the previous commons lost the island metaphor, and the map was
too small. This revision restores sea, an irregular coastline, beach, vegetation
and paths while keeping the project's mascot artwork and UI palette.

Implementation: brand world grows from 512×384 to 1024×768 (four times area).
The viewport is now independent of world dimensions, follows the player and can
switch to full-island overview. ResizeObserver and scene resize handlers are
removed at destroy/shutdown. Pixel comparison retains its original 512×384 map.

Coastline rendering and walkability use the same deterministic polygon. Every
corner of a walkable tile is inside the dry coastline. The doubled destination
positions and spawn are connected by A*. Ground-cover art is decorative, not
an unmarked solid obstacle. No synthetic participants or saved account changes.

Shell: see map-shell-v3.md. Collapsed mascot choices, map-first viewport and
overlay content replace the sidebar-card layout. Details open on interaction;
keyboard users can use the full place list without navigating the Canvas.

Tests: new coastline suite checks determinism, containment and reachable
destinations. 10/10 unit tests pass; package build/typecheck and product E2E
typecheck pass. Browser suite updated to use camera-aware world coordinates,
not obsolete fixed full-map fractions. Initial full run: 26/26 passed (1.8m).
Visual inspection then found a desktop overview centering error. Added a failing
regression (267px center offset), removed camera bounds only in overview mode,
and restored them for exploration. This centers the island even when the zoomed
viewport exceeds the world. Final full rerun: **26/26 passed (1.8m)**, including
centering on both viewports. Text textures now use 3× resolution for clearer
labels; desktop corrected overview, mobile exploration and bottom panel inspected.

Final build JS/CSS: 1,226,094 raw bytes / 326,499 gzip bytes (images excluded).
Vite still warns about the Phaser chunk size; no performance acceptance inferred.

Remaining: this is procedural vector prototype art, not final hand-textured art
or a production Tiled authoring pipeline. No live shared-space data or realtime
integration is implied. Original P0 physical-device/preview gates stay open.
