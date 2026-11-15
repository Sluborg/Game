# Blobz icon index

Every icon on screen, side by side, so they can be judged together before deciding on one icon standard (Stefan
2026-11-15). Docs only, no visual change.

- **Pictures:** [`screenshots/icons/all-icons-1.png`](screenshots/icons/all-icons-1.png) and
  [`screenshots/icons/all-icons-2.png`](screenshots/icons/all-icons-2.png) (portrait, split in two). Each icon has:
  - a number;
  - its UI_INDEX name and where it shows;
  - its source;
  - its art size and its on-screen size;
  - a real-size render (1 css px = 2 image px, like the 2x screenshots) and an enlarged render.
- **Grouping:** by style, meaning the scale the pixel art is drawn at.
- **Built from:** a DOM scan of every menu screen, the HUD, build menu and end screen at 390x844 (shown sizes from the
  browser); the meadow world icons from `src/game.ts`; the dungeon icons from Code 2's code (`dungeonUi.ts`,
  `dungeon.css`, `dungeonScene.ts`). Code 2 has not filled the dungeon part of UI_INDEX yet, so they should confirm
  those (#34-#44).
- **Generator:** a scratch script (Code session). Rerun it after icon changes and replace both pictures.

## Summary

- **One style family:** every icon is pixel art (Ninja Adventure 16-24 px or ChatGPT 16 px orders), drawn with
  `image-rendering: pixelated`. There are no smooth or vector icons. The only drawn-in-code pieces are the portal gather
  ring, the designer's eye and hat tiles (from the blob grid, 4x), the pager dots and the lobby's free-seat dots.
- **Five scales are in use** (44 icons):

| Scale | Icons | Examples |
|---|---|---|
| 3x (48 px for 16 px art) | 13 | quill, back chevron, close, hammer, home, dash symbol and ring, mouths, dungeon weapon / boss icons |
| 2x (32 px) | 12 | green tick, can-build / lock badges, ground tokens, power-ups, tools, chips, dungeon move icon |
| 4x | 2 | end-screen stars (76 px), loot item (64 px) |
| 1x | 4 | quest star (19 px), food in build costs, carried wood, 1x building pictures |
| uneven (not a whole number) | 13 | see "Odd ones out" |

- **Sources:**
  - ChatGPT N-orders: N-10, N-11, N-12, N-15b, N-17, N-18, N-19/19b, N-23, N-24, N-25, N-27.
  - Ninja Adventure: whole files and Ninja crops for food, hut, buildings, hook, tools, hearts, coin, stick, skill
    icons.
  - Mixed sources sit next to each other in the same rows:
    - Wood (ChatGPT N-27) beside food (Ninja `Meat.png`) in the HUD, costs and tokens.
    - Ninja skill icons (2x) beside ChatGPT weapon icons (3x) on the same dungeon button.

## Odd ones out (uneven scale = blurry or uneven pixels)

| # | Icon | Art -> shown | Why it is odd |
|---|---|---|---|
| 16, 17, 18, 22 | wood in the HUD quest / bank / build cost / edge arrows | 32 px -> 20 / 17 / 16 / 18 px (0.5-0.62x) | the 32 px HUD file is shrunk; the 16 px file at 1x would be crisp at 16 px |
| 19, 20 | food in the HUD quest / bank | 15 px -> 20 / 17 px (1.33x / 1.13x) | stretched by a third; next to the wood it reads as a different size |
| 15 | hut (quest title, edge arrow) | 47x32 -> 32x22 (0.68x) | a building crop shrunk to icon size |
| 13 | star in the end rows | 19x17 -> 24x22 (1.26x) | the same star is 1x in the HUD and 4x on top of the same screen |
| 35 | dungeon gold coin | 40x10 strip -> 24x24 (0.6x) | the whole 4-frame animation strip is squeezed into a square (shows 4 thin coins) |
| 34 | dungeon hearts | 14x12 -> 24x24 (1.71x) | uneven, and squashed to a square |
| 40 | dungeon item slot | 16 -> 24 px (1.5x) | the same item is 2x and 4x elsewhere |
| 44 | dungeon item cell frame | 16 -> 30 px (1.88x) | |
| 23 | thumbstick | 32 -> 120 px (3.75x); knob 22 -> 52 px (2.36x) | the biggest pixel art on screen, at an uneven scale |

## Other inconsistencies worth deciding together

- **Three sizes of the same star:** 19 px (HUD), 24 px (end rows), 76 px (end stars).
- **The same resource at several sizes:**
  - wood: 16, 17, 18, 20, 32 px;
  - food: 15, 17, 20, 30 px.
- **Round buttons:**
  - The meadow dash puts a 3x symbol in a 3x ring (72 px).
  - The dungeon's small button puts a 2x symbol in a 3x 18 px ring (54 px).
  - The dungeon's big button puts a 2x Ninja skill icon or a 3x ChatGPT weapon in the same 72 px ring.
- **Hidden icons that still load:**
  - dice on Slumpa and check on Klar (words-only rule);
  - the archived map-card props and day-cycle sun;
  - the flag crop `art/ninja/flag.png`. It is still in `ninjaArt.ts` but no longer shown since the flag was removed.

## A possible standard (for Stefan to pick, not applied)

- **Icons in UI** (buttons, HUD, badges): 16 px art at a whole scale only. 3x (48 px) for buttons, 2x (32 px) for
  badges and HUD counters. No 0.5x / 1.33x / 1.88x.
- **Resources:** one pair everywhere, 16 px for wood and food (ChatGPT, same style), 1x in costs, 2x in the HUD and on
  the ground.
- **Dungeon:** swap the coin strip for its first frame, show hearts at a whole scale, and pick one source for the
  special-button icons.
