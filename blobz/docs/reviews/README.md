# Outside look reviews

External reviews of the game's art and UI (Stefan runs them in other AIs). Saved verbatim, not acted on until Stefan and
Lead have discussed and planned them together.

| File | Reviewer | Build | Status |
|---|---|---|---|
| review-1.md | external AI (live play, ~70 screens) | v047c | decisions below |
| review-2.md | external AI (live v047e + repo screenshots) | v047e | compared, decisions below |

## Decisions from review 1 (Stefan, 2026-11-15)
- Panel fill: **parchment** everywhere (no white).
- Selection: **dark outline + green tick badge** top-right, everywhere (tiles, classes, skills, build cards).
- Tabs and buttons: **words only** (no icon tabs), bigger text.
- First fix after planning: **one UI skin everywhere** (panel, buttons, selection, tabs, back button, incl. dungeon).
- Pixel ladder: **3x everywhere** (world, HUD icons AND blob portraits); presence comes from frames/padding, never scaling.
- Dungeon: **dark-wood variant** of the same UI; brighter floor, torch light, colourful goo.
- Loading: the dusk cave art is the **dungeon entry** screen, shown a couple of seconds for atmosphere even if
  loading is done. App-start loading uses the **sunny village art** (N-2) with logo + wood progress bar.
- Polish wanted: living blobz, juice, blob-wipe transitions, friendly empty states.
- Lobby/Join: **5 player slots** (3x blobz, waiting silhouettes), **searching blob** on Join with big blob cards,
  **one back button style** (chevron chip top-left), **'Ny by' moved away** in secondary wood style.
- Meadow HUD: **merge + bigger**: one row per resource (icon, bar toward goal, star), bigger icons and numbers.
- Bärregn: **archived** (behind a flag, like the snow map). After the meadow round: straight to the end screen.
- Designer: **drop the title**, **paging, no clipping** (fixed panel height, page arrows). Bigger option tiles: not chosen.
- Cards (build menu, class, skill, loot): **text min 14 px**, parchment cards, green "can build" badge, lock icon when
  missing, build menu in 3 columns.
- End screen: **simplify**: side-by-side in landscape, three big stars + one row per resource, gold stars, cream tracks.
- After the quest (Bärregn archived): not a focus now; minimal default = straight to the end screen.

## Decisions after review 2 (Stefan, 2026-11-15)
- Selection: undecided between **green tick badge** and **gold inset border + check**; Stefan needs to SEE both
  side by side (UI-kit v2 comparison).
- Icons: **icon + word only if the icons are good** (Ninja pixel symbols on the 3x grid; never emoji or native icons).
  Shown in the UI-kit v2 comparison first.
- Added to the plan: **player visibility** (foliage fades over blobz, "you" marker, one compact nameplate),
  **designer face crops** (Eyes/Mouth zoomed faces; shapes with neutral face, no hat), **quieter frames** (thin inner
  tiles; heavy wood only on outer panel + primary button), **combat clarity** (smaller routine FX, boss strip at top,
  bold danger zones, bigger loot item, team shown on the end screen).
- Skipped: Bärregn points (archived); new loading art (dusk cave = dungeon entry, sunny village = app start).
