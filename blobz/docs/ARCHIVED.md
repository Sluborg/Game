# Archived features

## archived: snow map (2026-11-14, Stefan: "Archive the concept for now")
- The lobby no longer offers Meadow/Snow; the meadow is the only map.
- Code and art stay in the repo behind one flag: `SNOW_MAP_ENABLED = false` in `src/sim.ts`
  (`cleanBiome()` always returns `'meadow'` while it is off).
- Kept: the snow ground/ice/igloo rendering in `src/game.ts`, `art/props-winter/*`, `src/snow.test.ts`
  (skipped while off), `e2e/snow.cjs` (skipped unless `BLOBZ_SNOW=1`).
- To bring it back: set the flag to `true`, run `npx vitest run src/snow.test.ts` and `BLOBZ_SNOW=1 node e2e/snow.cjs`.

## archived: day cycle (2026-11-15, Stefan: "The day counter: I never asked for it. Remove and put it on hold.")
- No sun/day bar in the HUD and no time limit on the meadow. The round ends when all three quest goals are
  filled; Bärregn and the end screen follow as before.
- Code stays behind one flag: `DAY_CYCLE_ENABLED = false` in `src/sim.ts` (the timer only counts down and only ends
  the round when it is on). The HUD hides `#hud-day` via `body.noday` (`src/main.ts`, `src/style.css`); the dusk tint
  in `src/game.ts` never triggers because the time no longer runs down.
- Tests: the sunset test in `src/sim.test.ts` is skipped while off; a quest-complete test replaces it. e2e ends rounds
  by filling the quest (`s.delivered = { ...s.quest }`).
- To bring it back: set the flag to `true`; restore the e2e sunset steps from git history (gather.cjs dusk check).
