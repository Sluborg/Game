# Blobz art directions for Gemini, v3 (2026-11-21)

Supersedes v1 and v2 (`GEMINI_ART_DIRECTIONS.md`, `GEMINI_ART_DIRECTIONS_v2.md`). This file is self-contained: no links needed. Written by Claude (Art) for Stefan.
Gemini makes the art for everything the game uses, one BATCH at a time. Stefan says "next" and Gemini does the next batch.

## What was wrong in v1 (fixed below)
1. v1 said "16x16 / 32x32 art-pixel grid" but never said how big one art pixel is. Gemini picked its own pixel size, so trees
   came out 44x54 (game needs 30x34), logs 60x56 (game needs 16x13), bushes 46x44 (game needs 16x14). v3 fixes the grid in
   pixels: see "Grid" below, and every object now has its EXACT size in art pixels.
2. v1 said "dark plum outline" for the blobz. The outline is near-black #141b1b (plum #3f2631 is only a menu frame colour).
3. v1 never asked for PNG. The first Gemini sheets were JPEG (noise, purple fringes at the magenta). v3 requires PNG.
4. v1's bush order asked for a 32 px bush that the game does not use, and "autumn tree" where the game uses an apple tree.
5. v1 had no list of what is approved and what must be redone. v2 has the status board and a batch plan.

## What "next" means (read this file again, top to bottom, every time Stefan writes "next")
1. Read these updated instructions (this whole file), then the Batch orders further down.
2. Make the CURRENT batch: every order marked TO DO, ONE image per reply, in order. After the last order, stop.
3. Start each reply with one line: "FILE: <exact filename from the order>" then "Order <id> - <N> TO DO orders left in this batch after this one."
4. End each reply with: "<id> done. Next TO DO: <id or 'batch done'>. Type next."
5. "redo" = same order again with Stefan's fixes. "redo <id>" = only that order.
6. Deliver every image as PNG, as large as you can, exactly as drawn: no resampling, no JPEG, no watermark.
7. No text, letters, numbers or captions inside images. If you cannot make an exact size, say so, do not guess.

## File names (IMPORTANT)
- Each order below has a FILE name (e.g. g1-trees-stumps.png). Try to save/export the image under exactly that name.
- If you cannot set the download name (chat downloads usually come out as image.png), write the exact name on the first line of the reply: "FILE: g1-trees-stumps.png". Stefan then renames the download to that name before putting it in the Drive folder "Gemini Blobz".
- A redo gets a suffix: g1-trees-stumps-r2.png, -r3.png. Never reuse a name for a different image.
- Lowercase, no spaces, .png only.

## Grid (the fix): put this at the start of every order
```
PIXEL GRID. Draw TRUE pixel art on a strict grid. The final image is 2528 x 1696 pixels. One art pixel is EXACTLY a 16 x 16
pixel square of one flat colour, so the picture is a grid of 158 x 106 art pixels. Do not draw any detail smaller than one
art pixel. Every object below has an EXACT size in art pixels (width x height, counted in those squares, outline included):
if an object is not exactly that many squares wide and tall, redraw it. Crisp hard edges only: no anti-aliasing, no
gradients, no blur, no soft shading, no dithering, no glow, no drop shadow. Export as PNG (not JPEG), no resampling.
BACKGROUND. Solid flat magenta #ff00ff everywhere outside the objects (never transparent, white or black). No magenta,
pink or purple inside the objects. No glow, halo or semi-transparent pixel touching the magenta.
LAYOUT. Objects stand in a row with at least 8 art pixels (128 px) of magenta between them and around the edges; each object
is centred in its column and, in a row, all objects stand on the same baseline.
```

## Style block (every order)
Game: "Blobz", a cozy co-op party game for phones (kids 8+ and adults). Heroes are cute slime blobz. No humans.
Look: true crisp pixel art like the free "Ninja Adventure" pack (16 px tile grid, warm cozy colours).
- Dark near-black outline #141b1b, 1 art pixel wide, around every object.
- Light from the top-left: one highlight top-left, one shadow bottom-right. 3 to 4 tones per colour, at most 16 colours per object.
- Slightly top-down 3/4 view. Same pixel size in the whole image.
- Palette: grass #6cbf45, cream #fff7e6, orange #ff8a3d, blue #3fa9f5, yellow #ffc93c, pink #ff6b8b, purple #b18cff,
  red #e63946, wood #ba7640, stone #a39fa8. Match the look of the sheets Stefan has already approved (chunky, readable).

## Status board (what is approved, what must be redone) - updated 2026-11-21

| Group | Status | What |
|---|---|---|
| ChatGPT art Stefan approved | APPROVED, keep | start / loading / end screens, logo (150 px version), lobby platform, start background, tent icon (32), berry icon, wood icon, portal, class cards, UI icons, state badges, check + stars, skill symbols, loot items, combat effects, boss UI, class weapons, mouths |
| Ninja Adventure pieces (CC0) in the game | APPROVED, keep | ground tiles, cottages 1-3, hut, storage, workshop, well, watchtower, garden, bridge, flag, UI theme |
| Dungeon rooms | APPROVED | 0x72 DungeonTileset II (CC0) |
| Stone icon + boulders from ChatGPT | APPROVED, parked | until stone returns to the game |
| Puzzles: plates, gate, fence, chests | ON HOLD | not wanted now; do not make |
| Landscape layouts, winter set | ON HOLD | later |
| Gemini test 1 (v1 orders): berries 16x14 + 31x27, stones 17x16 + 30x27 | SIZE OK, waiting for Stefan's rating | sizes fit the game; kept as native slices |
| Gemini test 1: trees (44x54, 42x59), stumps (20x19), bushes (26x25, 46x44), logs (32x30, 60x56) | REDO at the exact sizes | Batch 1 below |
| Old placeholders still in the code (drawn by Claude or cut from Kenney: base buildings, winter props, HUD bits, potion, revive, small fx) | REDO by Gemini | later batches |

## Batch plan (Stefan says "next" to start the next batch)
| Batch | Content | Status |
|---|---|---|
| 1 | G-1 trees + stumps, G-2 berry bushes, G-3 log icons | READY (orders below) |
| 2 | Meadow buildings at their real sizes: tent 42x39, house 64x48, hall 64x112, hut 47x32, storage 32x32, workshop 48x48, well 16x21, watchtower 24x32, garden 64x42, bridge 64x46, flag 16x16 | PLANNED: prompts are written after Batch 1 is rated, so the grid recipe is corrected first |
| 3 | HUD and small icons that are still placeholders | PLANNED |
| 4 | Winter set (trees, bushes, rocks, igloo, snowman, ice) | PLANNED, ON HOLD |
Anything Stefan marks "redo" with a comment goes into the next batch. Anything he rates 4-5 becomes APPROVED.

## Batch 1 orders

### G-1 Trees and stumps (TO DO)
FILE: g1-trees-stumps.png
```
[Grid block above]
Apply the style block.
Row 1, left to right, three trees: (1) round green leafy tree, EXACTLY 30 x 34 art pixels; (2) a tall pine tree, EXACTLY 24 x 38
art pixels; (3) round green leafy tree with 5 to 6 small red apples, EXACTLY 32 x 34 art pixels. Each tree: a round or layered
leafy canopy on a short, clearly visible trunk of normal width with small roots. NOT wide stump bases, NOT bushes.
Row 2, left to right, the three cut stumps of those trees (light wood top with growth rings, dark bark sides, a few root
tips): (1) EXACTLY 16 x 10 art pixels; (2) EXACTLY 12 x 10 art pixels; (3) EXACTLY 14 x 10 art pixels.
```

### G-2 Berry bushes (TO DO)
FILE: g2-berry-bushes.png
```
[Grid block above]
Apply the style block.
Two round bushes, left to right: (1) a leafy green bush (#6cbf45) with 6 to 8 small red berries (each berry is a single red
art pixel), EXACTLY 16 x 14 art pixels; (2) the same bush picked clean (no berries, a few leaves out of place), EXACTLY
16 x 14 art pixels. Same silhouette in both so they can be swapped.
```

### G-3 Log icons (TO DO)
FILE: g3-log-icons.png
```
[Grid block above]
Apply the style block.
Two small piles of three cut logs (pale round end grain with light rings, warm brown bark #ba7640, stacked as a triangle,
nothing else: no branch, no leaves), left to right: (1) EXACTLY 16 x 13 art pixels; (2) the same pile redrawn bigger, EXACTLY
32 x 26 art pixels (draw it again at that size, do not just enlarge the first one).
```

## After delivery (for Stefan, not for Gemini)
Save each image as the ORIGINAL PNG (no screenshot, no crop), named as in the FILE line, into the Drive folder "Gemini Blobz" (under dev art). Claude reads them from there. Claude measures the real pixel size,
slices it, compares it with the current art at game scale, and writes the verdict here: APPROVED / REDO. Then say "next".
