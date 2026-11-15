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

## archived: dungeon clock + class-pick timer (2026-11-15, Stefan via Lead: no time limit underground, pick in your own time)
- No run timer underground: the clock is hidden from the HUD (`#dg-time`) and never ends a run. Flag:
  `DUNGEON_TIMER_ENABLED = false` in `src/dungeon.ts` (`RUN_SECONDS` and the 'time' end reason stay in the code).
- No class-pick countdown: the run starts when everyone has picked. Flag: `PICK_TIMER_ENABLED = false` in `src/sim.ts`
  (`PICK_SECONDS` kept); the pick text shows no seconds (`src/dungeonUi.ts`).
- Tests: `src/dungeon.test.ts` checks the clock no longer ends a run and that picking waits; `e2e/dungeon.cjs` checks no
  clock in the HUD and no countdown on the class cards.
- To bring them back: set the flags to `true` (the i18n texts then get " · N s" appended in code).

## archived: Bärregn mini game (2026-11-15, review-1 decision "Bärregn: archived")
- After the meadow round the game goes straight to the end screen (no berry rain, no Bärregn line).
- Code stays behind one flag: `MINI_ENABLED = false` in `src/sim.ts` (`src/mini.ts`, the drawing in `src/game.ts`,
  `art/mini/*`, the `#mini-hud` / `#mini-intro` markup are all kept).
- Tests: `src/mini.test.ts` is skipped while off; `e2e/mini.cjs` is skipped unless `BLOBZ_MINI=1`; the other e2e end
  the round by filling the quest and expect the end screen right away.
- To bring it back: set the flag to `true`, run `npx vitest run src/mini.test.ts` and `BLOBZ_MINI=1 node e2e/mini.cjs`,
  and restore the Bärregn checks in `e2e/noread.cjs` / `e2e/i18n.cjs` / `e2e/build.cjs` / `e2e/gather.cjs` from git history.

## archived: stone (2026-11-15, Stefan "meadow declutter": remove all mineral rocks)
- No rock / boulder nodes on the meadow (`makeTrees` turns them into trees), no stone goal (`questTargets` stone = 0),
  no stone row, counter or arrow in the HUD / end screen (`body.nostone`), and every stone price in `BUILD_COST` /
  `COTTAGE_COST` is paid in wood instead, so nothing becomes free or impossible.
- Stars: the round's 0-3 stars are the finished goal bars scaled to three (`starsFor`); with wood + food: 0, 2, 3.
  The round ends when every active bar is full (`questDone`).
- Code stays behind one flag: `STONE_ENABLED = false` in `src/sim.ts` (rock art, pickaxe, rubble kept).
- Tests: unit tests branch on `STONE_ENABLED`; `e2e/gather.cjs` chops a second tree instead of mining while stone is off.
- To bring it back: set the flag to `true` and run the unit tests + `e2e/gather.cjs`, `e2e/build.cjs`.

## archived: co-op puzzle pens (2026-11-15, Stefan via Lead: "put the puzzle pens ON HOLD")
- No pressure plates, "0/1" plate counters, fenced pens, gates or reward chests on the meadow. The two pen corners
  fill with ordinary meadow (trees, bushes, pickups may spawn there now).
- Code stays behind one flag: `PUZZLES_ENABLED = false` in `src/sim.ts`. `makePuzzles` returns no pens, so the sim
  (walls, plates, chest bundle), the snapshot, the renderer (`buildPuzzle` / `drawPuzzle` in `src/game.ts`) and the
  keep-clear zones all see an empty list. Pen art (fence, gate, plates, chest) is kept.
- `puzzleCorners` still runs, so the water corner keeps its old seeded spot, and `entranceOf` still reads the seeded
  pen areas (`penLayouts`), so the dungeon cave stays where it was.
- Stars / quest never counted puzzles (they are the goal bars only), so nothing else changes.
- Tests: `src/puzzle.test.ts` skips the pen suite and checks that no pens exist; `e2e/puzzles.cjs` is skipped unless
  `BLOBZ_PUZZLES=1`.
- To bring it back: set the flag to `true` and run the unit tests + `BLOBZ_PUZZLES=1 node e2e/puzzles.cjs`.

