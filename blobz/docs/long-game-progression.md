# Long-game progression (proposal, no code)

Draft by Code, 2026-11-16, for Lead and Stefan. Builds on the long game in c03e196: the meadow never ends by
itself, a full set of goals is a milestone, and the host ends the round with "Spara och gå hem".

## Today (what the code does)

- **Goals:** wood + food (stone is archived, `STONE_ENABLED = false`). 1-2 players need 10 wood and 5 food. Each
  player above 2 adds +35%, and each cottage level adds +20%.
- **Milestone:** when every bar is full, the extra carries over and the next goal is `+50% per milestone`
  (`goalTargets`). For 3 players that is 14 -> 21 -> 28 -> 35 wood. There are no rewards yet, and the HUD has no
  counter.
- **Bank:** delivered resources also go to the bank, which pays for the buildings and the cottage. The bank is saved
  between rounds; milestones are not.

## Proposal

### 1. Refined goods (tier 2)

| Good | Made from | Where | Minigame |
|---|---|---|---|
| Plank | 10 wood | Sawmill (new building, or the workshop gets it) | Rhythm saw |
| Brick | 10 stone | Kiln | Brick painting |
| Soup | 10 food | Kitchen (cottage level 2+) | none at first, cook timer |

- Refining happens at home: carry the raw goods in, then start the minigame at the building.
- Later goals ask for goods instead of raw resources, for example "4 planks + 2 soup". The quest box shows their
  icons, so no reading is needed.

### 2. Sawmill rhythm minigame

- Two or more blobz stand on the two handles of a log saw. A beat marker swings back and forth. Each player taps
  the action button when the marker hits their side.
- **Yield:** more on-beat taps and a faster beat give more planks per 10 wood. The base is 1 plank; a perfect run
  gives 2.
- The beat speeds up a little after every 4 hits in a row. A miss slows it back down. It never fails: a bad run
  still gives 1 plank.
- Alone, a single blob alternates sides at half speed.

### 3. Brick painting minigame (idea)

- Freshly made bricks get a colour mark. Each blob paints with its own colour by gliding over a brick on a small grid.
- The bricks then show up in the walls of the buildings built with them, so the team sees its own colours in the
  village.
- **Yield:** fully painted bricks count as 1.5. It needs no timing, which makes it calm and good for the youngest
  players.

### 4. HUD goal counter

- A small star with a number next to the quest box: "★ 3" = milestones this round.
- The counter pops (like the bank) together with the toast.

### 5. Milestone rewards

- Every milestone: the toast, +1 on the counter, and a small bank bonus (for example +3 of every raw resource).
- Every 3rd milestone: a bigger reward, picked from the open question below.

### 6. How goalTargets scales

- Keep the per-player and per-cottage factors.
- After milestone 2, a goal switches one raw resource to its good (wood -> planks), so the work changes shape
  instead of only growing.

## Open questions (2-3 options each)

1. **Goal growth**
   - A: +50% per milestone, linear (today). The 6th goal is 3.5x the 1st.
   - B: +30% per milestone, capped at 3x.
   - C: Size stays flat; the variety grows instead (raw -> goods).
2. **Where refining happens**
   - A: A new Sawmill / Kiln building on a new plot.
   - B: The workshop and well get upgrade levels.
   - C: Everything at the cottage, from a "Förädla" tab in the build panel.
3. **Reward every 3rd milestone**
   - A: A free building part (one wall of the next building).
   - B: A cosmetic hat unlock for all blobz.
   - C: Choose one of 3 field power-ups for the rest of the round.
4. **Stone**
   - A: Bring stone back only for bricks (rocks spawn after the kiln is built).
   - B: Bricks are made from wood + food (no stone at all).
5. **Saving milestones between rounds**
   - A: No. Every round starts at goal 1.
   - B: Yes. The village remembers its milestone level, so goals continue to grow.
