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

## Build step 1 (done, behind the flag)
- **Switch it on for testing**: add `?rooms` to the host's URL (e.g. `https://sluborg.github.io/Game/?rooms`); the
  host's runs use the rooms, joiners follow automatically. For everyone: `ROOMS_ENABLED = true` in `src/dungeon.ts`.
- In: tall screen-wide rooms (`makeRoom`), 10 rooms (arena / corridor / boss; mini-boss in room 5 at half health,
  boss in room 10), waves with an N-13 landing ring 0.8 s before each monster, corridor lines start the next wave
  early, door at the top opens when the room is clear (placeholder: Ninja bars -> stairs), chest in arena rooms after
  the last wave, the camera keeps x on the room and follows my blob up/down, HUD "Rum 3/10 · Våg 2/3", difficulty
  spread over the 10 rooms, calm first room on Dungeon 1. Old dungeon unchanged (flag off).
- Not yet (steps 2-3): room transition wipe, boss helper waves at 66/33 %, plates + bonus room, the ChatGPT door,
  tuning, a 10-room e2e.
- Screenshot: `docs/screenshots/dungeon-rooms/room-midwave.png` (390x844 at 2x, room 1 wave 2).
- **0x72 look** (Stefan picked 0x72 DungeonTileset II, CC0): floor_1 + cracks (~1 in 4), wall_top/wall rows on top with a red + blue banner, wall_edge sides, wall_top_mid bottom with a 3-tile entrance gap, door = frame + leaf closed/open, 0x72 floor_stairs as the room-1 exit; 16 px art at 3x (48 px tiles, 9 tiles = 432 px wide). Screenshot: `docs/screenshots/dungeon-rooms/room-0x72.png`.

## Playtest fixes (Stefan's ?rooms playtest, v052c)
- Root cause of "pushed out / stuck": the meadow's world edge (y <= 946) also held blobz in the taller rooms; now the
  dungeon uses only its own walls, and anything inside a wall or outside the room snaps to the nearest floor tile.
- Crossbow / wand point straight at the target (no swing); arrows leave on the line to the target.
- Sticky auto-aim: keep the target until it dies / leaves reach; switch only to one >25 % closer for 0.5 s.
- Start in the entrance gap at the bottom; the camera stays inside the room (starts low, bottom wall visible).
- Rooms 1-3: max 1 shooter per wave, shots 30 % slower (same range), wind-up 1.4x; normal from room 4.
- Marksman jump back: away from the current target (else the nearest monster).
- Arena rooms: 2-3 0x72 columns as cover (block walking and shots), never in the middle lane or on a spawn.
- Screenshot: `docs/screenshots/dungeon-rooms/playtest-fix.png`.

## Rooms are the default (Stefan 2026-11-15) + playtest fixes 2
- `ROOMS_ENABLED = true`; `?classic` on the host's URL = the old 5-floor dungeon (its e2e use it).
- Floor cracks: 1-2 per 3x3 block (11-20 % of the floor), never two touching (`roomCracks`).
- Every room size (1-5 blobz): start in the last floor row above the bottom wall's 3-tile gap; every spawn on floor
  reachable from the entrance (flood fill; others move to the nearest reached tile); a spawn moved off a blob never
  lands in a wall or column.
- `?noweapons` (host URL, synced to joiners): weapons only show while attacking (+0.5 s) or guarding; a class-colour
  ring under each blob instead (rogue purple, healer green, marksman blue, knight red).
- Screenshot: `docs/screenshots/dungeon-rooms/playtest-fix2.png` (?noweapons, mid-wave).

## Door + floor fixes (v052g playtest)
- Open door: the doorway is a dark passage (no wall behind the open leaf) and walkable; the camera may scroll above the
  room by the HUD's height so the door is never hidden under the HUD.
- Door zone: the whole doorway + 1 tile below (`inDoorway`); every living blob inside for 1.5 s = next room; blobz
  don't push each other inside it.
- Coins and potions lie still on the floor with a fixed foot shadow (no bob).
- Screenshot: `docs/screenshots/dungeon-rooms/door-open-passage.png`.
