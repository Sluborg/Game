# Dungeon rooms (Archero-style) plan: step 1, for Stefan's rating

Sketch: `docs/screenshots/dungeon-rooms/sketch.png` (3 room types, portrait). Nothing is built until Stefan rates this.

## The idea in one line
A dungeon is a chain of **10 rooms** (max 15), each **as wide as the screen and 1.5-2.5 screens tall**. The team
fights **2-3 waves** in a room; when the last wave is gone the **door at the top opens**; everyone at the door for
1.5 s = next room. **Level-up cards and loot** come between rooms, as today.

## Rooms
- **Size**: 12 tiles wide (384 world px = the screen width in portrait), 22-34 tiles tall (1.5-2.5 screens). Portrait
  locked. **Each phone's camera follows its own blob up and down** (x fixed, y clamped to the room): whoever goes up
  sees further ahead on their own phone.
- **Types** (sketch): **A Arena** (1.5 screens, 2 waves over the whole room, a chest after the last wave);
  **B Corridor** (2.5 screens, wave 2/3 start when someone crosses a line further up: the team advances);
  **C Boss room** (2 screens, the boss + helper waves at 66 % and 33 % health, the N-21 hazard ring for slams).
- **Run of 10**: rooms 1-4 A/B mixed, **room 5 = mini-boss** (recommended: a calm checkpoint and a mid-run goal for
  kids), rooms 6-9 A/B, **room 10 = boss**. Dungeon 2, 3, ... = the same structure one difficulty step harder
  (today's tier formula, now over rooms: `tier = (dungeon-1) + (room-1)/9`).
- **Waves**: each spawn shows its N-13 landing ring for 0.8 s first (no monster appears on top of a blob); the
  HUD shows "Rum 3/10 · Våg 2/3". The first room of Dungeon 1 stays calm (no telegraphed attacks), as today.
- **Door**: closed bars until the room is clear, then it opens with a puff; KO'd blobz come along (auto-revive, no
  fail state).
- **Co-op idea (optional, B rooms)**: two pressure plates far apart; two blobz standing on them at the same time
  opens a side door to a small **bonus room** (one chest, no enemies), then back to the chain.

## 5 blobz in one room (no crowding)
- Room height grows with the team: +2 tiles per player beyond 2 (a 5-player room is ~6 tiles taller).
- Monsters per wave = base + 1 per extra player (capped), instead of more and more at once; their health already
  scales with the team (`floorHp`).
- Spawns spread over the room height and keep 80 px from every blob; the camera never zooms out, so the pixels
  stay 3x and each phone shows only its own part of the room.

## Build plan (behind `ROOMS_ENABLED = false`; the current dungeon stays untouched until Stefan rates)
- **Reused as is**: combat sim (`stepDungeon`: heroes, classes, class moves, skills, items, telegraphed AI, boss),
  difficulty steps + unlocks, level-up + loot overlays, HUD, round buttons, boss strip, N-13/N-21 FX, map baking
  in `dungeonScene.ts` (it bakes any tile grid), the e2e helpers.
- **New**: `makeRoom(seed, index, players, dungeon)` (one tall room as a `Floor`), a wave controller (spawn queue,
  landing rings, wave lines in B rooms), door state, the camera (x locked, y follows), the room transition (a short
  blob-wipe), HUD text, the mini-boss, optional plates + bonus room; unit tests + an e2e for a 10-room run.
- **Effort** (rough): 3 pushes. (1) sim: rooms, waves, door, chain + tests; (2) scene + HUD + camera + transition,
  screenshots; (3) mini-boss, bonus room, e2e, tuning. Each push rated on the board before the next.
- **Art**: room floor/walls = the Ninja interior tiles we bake today; plates = Ninja `TilesetDungeon` buttons; wave
  rings = N-13 slam-warning / N-21 hazard ring (have them). **Needed from ChatGPT (1 order)**: the **door**, closed +
  open, 32x32 and 48x32 (16 px art grid, Ninja palette, 8x nearest-neighbour) so it reads as "the way on"; optional
  later: a mini-boss sprite if Stefan wants something other than a bigger Ninja slime.
