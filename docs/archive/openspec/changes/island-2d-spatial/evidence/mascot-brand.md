# Mascot and brand follow-up

User requested existing quiz mascots and the project's visual style.
Plan: use the original five role WebP assets as selectable player characters,
preserving their proportions and artwork. Keep collision coordinates unchanged.
Retain selection across style/scenario changes; clearly mark this as a local
preview, not a saved persona setting.

Visual source: packages/design-tokens/src/colors.ts, packages/ui/src/styles/globals.css,
and packages/features/quiz/src/utils/theme-map.ts. Use primary #16B9B3,
dark text #295E5C, pale #EEF9F9, border #E4EAE9, white #FFFFFF, orange #FFA10E.
Use the existing sans-serif stack, moderate headings and 10/14px rounded surfaces.
Layout remains map-left / accessible controls-right, stacked on mobile. Replace
the prototype's heavy black outlines, offset shadows and oversized headline with
the project's quieter learning-product treatment. Mascots carry the personality.

Validation: 22/22 browser checks passed (52.9s), including all five assets,
selection persistence across both style/scenario changes, and original movement
regressions. Unit tests 7/7, package and product E2E typecheck, build and Biome passed.
Desktop/mobile mascot screenshots were visually inspected. Final font-stack
alignment uses the UI package stack with local system fallback; this isolated
prototype does not download the production Google font.
After font alignment, all six mascot/rendering checks passed again (17.3s).
Final JS/CSS: 1,220,531 raw bytes / 324,906 gzip bytes, images excluded.

The five original WebP assets add approximately 42 KB of raw image payload.
The JS/CSS bundle report excludes image bytes; keep that boundary explicit.
The assets are statically imported in the dev shell and emitted by Vite, not copied
or modified. The reusable engine accepts an optional avatar URL; absent artwork
retains the old prototype avatar. Visual size is 44 logical pixels, with the same
7px collision radius. Artwork is static, with no fabricated directional animation.
