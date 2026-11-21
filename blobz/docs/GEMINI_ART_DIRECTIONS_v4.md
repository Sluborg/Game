# Blobz art directions for Gemini, v4 (2026-11-21)

Supersedes v1, v2 and v3. Read ONLY this file. Written by Claude (Art) for Stefan.
Gemini makes the art for the things the game uses, one BATCH at a time. Stefan writes "next", Gemini does the next batch.

## What changed in v4 (why you may see different rules than before)
Gemini cannot draw an exact pixel size, an exact canvas, or deliver a lossless PNG. So v4 no longer asks for exact pixel counts.
Instead it asks for what Gemini CAN do: true pixel art with big crisp square pixels, correct PROPORTIONS between objects,
and a sheet in which every object has the SAME pixel size. Claude (Art) measures the real pixel grid afterwards, cleans the JPEG
and cuts the objects out. JPEG with watermark is accepted.

## What "next" means (read this file again, top to bottom, every time Stefan writes "next")
1. Read these updated instructions, then the Batch orders below.
2. Make the CURRENT batch: every order marked TO DO, ONE image per reply, in order. After the last order, stop.
3. First line of each reply: "FILE: <filename of the order>" and "Order <id> - <N> TO DO orders left in this batch after this one."
4. Last line of each reply: "<id> done. Next TO DO: <id or 'batch done'>. Type next."
5. "redo <id>" = make that order again, applying Stefan's comments. A redo gets the suffix -r2, -r3 in the file name.
6. Upload to Drive: at the START of the next reply, upload the image from the previous turn to the folder "Gemini Blobz"
   (inside "dev art") under the FILE name. After the last order of a batch, upload the last image when Stefan writes "next" or "upload".
   Never overwrite or delete other files in that folder. If you cannot set the file name, say the exact name so Stefan can rename it.
7. No text, letters, numbers or captions inside the images.

## Rules for every image (put at the start of every order)
```
TRUE PIXEL ART with BIG, crisp, square pixels, all the same size in the whole image (like a 16-bit game sprite sheet, nothing smaller
than one pixel). No anti-aliasing, no gradients, no blur, no soft shading, no dithering, no glow, no drop shadow.
BACKGROUND: solid flat magenta #ff00ff everywhere outside the objects. No magenta, pink or purple inside the objects.
OUTLINE: near-black #141b1b, exactly 1 pixel wide, around every object.
LIGHT: from the top-left; one highlight top-left, one shadow bottom-right; 3 to 4 tones per colour, at most 16 colours per object.
VIEW: slightly top-down 3/4 view.
LAYOUT: objects stand in rows with wide magenta gaps (at least 1/4 of an object width) between them and around the edges, centred
in their column, all objects of a row on the same baseline. The whole sheet uses the SAME pixel size.
PROPORTIONS are the main rule: the relative sizes below must be right (measure them: widths and heights as a fraction of
the biggest object). The absolute size does not matter.
```

## Style
Game: "Blobz", a cozy co-op party game for phones (kids 8+ and adults). Heroes are cute slime blobz. No humans.
Look: chunky, readable pixel art like the free "Ninja Adventure" pack, warm cozy colours.
Palette: grass #6cbf45, cream #fff7e6, orange #ff8a3d, blue #3fa9f5, yellow #ffc93c, red #e63946, wood #ba7640, stone #a39fa8.
Match the look of the trees Stefan approved (round green crown with darker clumps, orange-brown trunk with roots, pine with layered boughs).

## Status board (2026-11-21)
| Group | Status |
|---|---|
| ChatGPT art Stefan approved (screens, logo, platform, background, tent, berry + wood icon, portal, class cards, UI icons, effects, boss UI) | APPROVED, keep |
| Ninja Adventure pieces in the game (ground, cottages, hut, storage, workshop, well, watchtower, garden, bridge, flag, UI) | APPROVED, keep |
| Dungeon rooms (0x72 tileset) | APPROVED |
| Stone icon + boulders, Gemini berries and stones from test 1 | SIZE OK, waiting for Stefan's rating |
| Gemini trees (G-1 round, pine, apple tree) | LOOK OK. Stumps were REDONE (too wide), see G-1 |
| Puzzles, fence, chests, landscape, winter set | ON HOLD, do not make |
| Old placeholders (base buildings, HUD bits, potion, revive, small effects) | REDO later, Batch 2 and 3 |

## Batch plan
| Batch | Content | Status |
|---|---|---|
| 1 | G-1 trees + stumps (redo), G-2 berry bushes, G-3 log icons | READY |
| 2 | Meadow buildings | PLANNED, written after Batch 1 is rated |
| 3 | HUD and small icons | PLANNED |
| 4 | Winter set | PLANNED, ON HOLD |

## Batch 1 orders

### G-1 Trees and stumps (TO DO, redo)
FILE: g1-trees-stumps-r2.png
```
[Rules block above]
Row 1, left to right: (1) a round green leafy tree, (2) a tall pine tree, (3) a round green leafy tree with 5 to 6 small red apples.
Keep the look of the previous G-1 trees (Stefan liked them). Proportions: the round tree is as wide as it is tall (crown about 80 percent of
the tree height); the pine is about 75 percent as wide as the round tree and about 10 percent taller; the apple tree is the same size as
the round tree. Trunk width is about 25 percent of the crown width.
Row 2, left to right: the three cut STUMPS of those trees. A stump is that tree's own trunk, sawn off: SAME trunk width and SAME bark
colours as the tree above it, pale wood top with growth rings, almost straight-sided like a short cylinder. Flare at the base at most
1 pixel per side. Stump top width is about HALF of the crown width of its tree (so about 2 times the trunk width), stump height about one
third of its tree's height. NOT wide, NOT flared, NOT as wide as a crown. Same pixel size and same baseline per row as the trees.
```

### G-2 Berry bushes (TO DO)
FILE: g2-berry-bushes.png
```
[Rules block above]
Two round leafy green bushes (#6cbf45), left to right: (1) with 6 to 8 small red berries (each berry about one single red pixel),
(2) the same bush picked clean (no berries, a few leaves out of place). Both have the identical silhouette so they can be swapped.
Proportions: a bush is about 8/7 as wide as it is tall. Make the bush only slightly bigger than a tree trunk is wide times 4
(a small low bush, clearly smaller than a tree crown: about HALF a round tree crown in width).
```

### G-3 Log icons (TO DO)
FILE: g3-log-icons.png
```
[Rules block above]
Two small piles of three cut logs (pale round end grain with light rings, warm brown bark #ba7640, stacked as a triangle, nothing else:
no branch, no leaves), left to right: (1) a SMALL pile, (2) a pile twice as big in width and height, redrawn with more detail (draw it again,
do not just enlarge the small one). Each pile is about 1.25 times as wide as it is tall. The small pile fills about one tenth of the image
width, so the pixels stay big and visible.
```

## After delivery (for Stefan, not for Gemini)
Gemini uploads to the Drive folder "Gemini Blobz" under the FILE name. Claude measures the real pixel grid, cleans the JPEG, cuts out
the objects, compares them with the current art at game size and writes APPROVED / REDO here. Anything within about 30 percent of the
game size is accepted as is; for bigger differences Lead decides the in-game scale. Then Stefan writes "next".
