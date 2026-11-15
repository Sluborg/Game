# Blobz art + UI plan (draft for Stefan's OK)

Sources: review-1.md, review-2.md, decisions in README.md, board answers 2026-11-15 (ui-kit-v2 = A, classes-v4,
home-v2/v3, meadow-hud-v2, meadow-world-v2, n11-n15-sliced). Nothing below is built until Stefan says go.

## Rules (apply to every step)
- UI kit A: parchment interior, thin Theme Wood frame (one thickness), selection = dark outline + green tick badge
  (N-18), words only, Fredoka body 18 px / headings 24 px / never under 14 px, 8 px spacing, targets >= 48 px.
- Buttons: primary orange (one per screen), secondary cream + plum text + quiet wood edge. Press = same image, sinks
  2 px, shadow 4 -> 2 px, slightly darker. No image swap.
- No black-orange heavy border except on small chips; unselected and selected tiles share the same calm frame.
- Pixel art 3x everywhere (world, HUD icons, blob portraits). Presence from frames/padding, never scaling.
- Icons from ChatGPT N-17/N-18 or Ninja only; never emoji/native. Forbidden art: Nut2 (as food), the mega-trunk tree.
- Colour meaning: green = selected/ready, gold = reward, red = danger/missing.
- Every step ends on the board as one rating; 1-3 = discuss with Stefan before redoing.

## Step 1. UI skin everywhere (Code: menus + meadow, Code 2: dungeon) [first]
- Apply UI kit A to: home, designer, lobby, Join, build menu, meadow HUD, end screen, dungeon HUD/cards/loot.
- Round combat buttons: N-19 wooden ring, plain centre, free symbol, sensible size (not oversized, no square inside).
- One back button (chevron chip top-left), square close button (equal sides), edit = N-17 quill in the kit style.
- Dungeon: dark-wood variant of the same frame/buttons.

## Step 2. Resource icons + world cleanup (Art finds options, Stefan picks, Code applies)
- Art makes a board sheet of ALL Ninja candidates for wood (logs, not a branch), food (meat, fruit, fish, bread...,
  never Nut2) and stone (clean single rocks, no extra mini-stone). Stefan picks one each.
- Meadow: swap the mega-trunk tree for the nice Ninja trees; add soft drop shadows under blobz, props and buildings
  (Ninja Shadow sprite); berry bushes = N-16.
- Player visibility: foliage fades when a blob is behind it; clear "you" marker (N-18 arrow); one compact nameplate.

## Step 3. Layout fixes
- Build menu: building art same size in a fixed box, name on top, short description under it, cost strip at the
  bottom; no icon under the name; full-strength art when unaffordable (lock + red missing cost only); gap below the
  top bar; 3 columns so all fit; can-build badge (N-18).
- Designer: no title; paging instead of clipping; tiles show ONLY the item (eyes alone, mouth alone, hat alone,
  shape with neutral face), the big preview shows the whole blob.
- Lobby/Join: 5 slots on the N-20 platform with waiting silhouettes, N-20 searching blob, visual states, Ny by moved
  away as secondary.
- End screen: side-by-side in landscape, three big stars + one row per resource, show the team's blobz, Play again
  primary + Home secondary with icon.
- App-start loading = sunny village; dungeon entry = dusk cave shown ~2 s.

## Step 4. Dungeon clarity + progression (Code 2)
- Timers off (dungeon + class pick) [in progress].
- Skills vs items look different: skills = round gold frame, items = square wood cell. New skill icons that match
  their descriptions (ChatGPT order from Code 2's list of 24 skills + 5 items).
- Combat clarity: smaller routine FX, boss strip at top (N-21 bar + emblem), N-21 hazard rings, bigger loot item.
- Difficulty: gentler start and slow scaling. Structure: Dungeon 1 = 5 floors, Dungeon 2 = 5 floors, etc., each
  dungeon a step harder; current difficulty becomes the later dungeons.
- Dungeon end screen = N-22 art.

## Step 5. Polish
- Living blobz (blink, squash, reactions), juice (stars pop, resources fly to storage, buildings land with bounce),
  blob-wipe transitions, friendly empty states.

## ChatGPT orders that follow from this
- Skill + item icons (from Code 2's list), speed power-up redo (winged boot inside the circle), any gaps the steps hit.

## Archived / not now
- Bärregn mini game (archived), snow map (archived), day cycle (archived), what happens after the quest (not a focus).
