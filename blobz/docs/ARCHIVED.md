# Archived features

## archived: snow map (2026-11-14, Stefan: "Archive the concept for now")
- The lobby no longer offers Meadow/Snow; the meadow is the only map.
- Code and art stay in the repo behind one flag: `SNOW_MAP_ENABLED = false` in `src/sim.ts`
  (`cleanBiome()` always returns `'meadow'` while it is off).
- Kept: the snow ground/ice/igloo rendering in `src/game.ts`, `art/props-winter/*`, `src/snow.test.ts`
  (skipped while off), `e2e/snow.cjs` (skipped unless `BLOBZ_SNOW=1`).
- To bring it back: set the flag to `true`, run `npx vitest run src/snow.test.ts` and `BLOBZ_SNOW=1 node e2e/snow.cjs`.
