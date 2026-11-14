# Blobz art orders: the live queue

This file is the ONE source of truth for art made with ChatGPT. ChatGPT reads it from GitHub
(https://raw.githubusercontent.com/sluborg/Game/claude/mobile-game-5-players-8qthjq/blobz/docs/ART_ORDERS.md), so orders change here, never in ChatGPT's project instructions.
Owners: Art keeps the queue and statuses current; Lead reviews. Stefan only says "next".

## For ChatGPT: how to work (read every time)
1. Re-read this file at the start of every chat and every time Stefan writes "next" (it changes often).
2. Orders with id D-* are small direction tests: Stefan answers them before any big A-order is READY.
   Make the FIRST order in the queue with status **READY** that you have not already made in this chat
   **in its current round** (an order whose title says "round N" higher than the one you made must be made again).
   Skip WAITING and DONE orders.
3. Start every reply with one line: "Order <id> - <N> READY orders left in the queue after this one."
   Then ONE image per reply. Apply the style block below to every image.
4. End every reply with one line: "<order id> done. Next READY: <order id or 'none'>. Type next."
5. If Stefan writes "next all": make every remaining READY order one after another in the same chat, one image per
   reply, without waiting for "next" between them, each starting with the line from rule 3.
6. If Stefan writes "redo", make the same order again with his fixes.
7. Reference images: when an order lists a reference URL, open it and match it.

## Style block (applies to every order)
```
You are the pixel artist for "Blobz", a cozy co-op party game for phones (kids 8+ and adults). Players are cute slime
blobz (shapes: dome, ball, tall, flat, pear, cube) with big white eyes, dark plum outline and black pupils.
STYLE: Kenney "Tiny Town" look, crisp pixel art, one consistent pixel size per image, nearest-neighbour, no blur,
no anti-aliasing, no gradients. FINE PIXEL GRID: small pixels and plenty of detail, like a blob that is 36 pixels
wide; a tree is about 40-50 pixels tall, a house about 90-100 pixels wide. 1px dark plum outline #3f2631 around every object. Flat colours with one highlight
(top-left) and one shadow (bottom-right). Palette: grass #6cbf45, cream #fff7e6, plum #3f2631, orange #ff8a3d,
blue #3fa9f5, yellow #ffc93c, pink #ff6b8b, purple #b18cff, red #e63946, wood #ba7640, stone #a39fa8.
Top-down 3/4 view. No text, letters or numbers. No people or humans, only blobz.
SHEET RULES: transparent background (or solid magenta #ff00ff), objects in a neat grid in EXACTLY the listed order,
left-to-right then top-to-bottom, at least 32 px empty space between objects, nothing touching, no ground shadows.
Make ONE image per reply and wait for "next".
```

## Queue

**2026-11-14: Stefan chose the Ninja Adventure pack (CC0) as the main art. All orders below are cancelled.
ChatGPT works only on N-orders (READY ones). New orders only for pieces the pack lacks.**

| Id | Status | Order | Replaces (Art slices into) |
|---|---|---|---|
| N-1 | DONE (C chosen) | Title header / logo in Ninja Adventure style | `art/logo.png` |
| N-2 | READY | Start screen background, round 2: LANDSCAPE ONLY (portrait approved 4/5) | `art/title.png` |
| N-3 | DONE | Loading screen (portrait + landscape approved) | `art/loading.png`, `art/loading-landscape.png` |
| N-4 | DONE (round 2 received, awaiting rating) | Hovering weapons, round 2: crossbow with bolt further back | `dungeon/weapons/*.png` |
| D-1 | CANCELLED (Ninja Adventure chosen) | Direction test 1: small style probe (one tiny scene) | nothing, a test |
| D-2 | CANCELLED (Ninja Adventure chosen) | Direction test 2: icon family probe (10 icons, one small sheet) | nothing, a test |
| D-3 | CANCELLED (Ninja Adventure chosen) | Direction test 3: one enemy in 3 poses | nothing, a test |
| D-4 | CANCELLED (Ninja Adventure chosen) | Direction test 4: one base building | nothing, a test |
| A-1 | CANCELLED (Ninja Adventure chosen) | Class cards, round 3 | `dungeon/card-class-*.png` |
| A-2 | CANCELLED (Ninja Adventure chosen) | Cottage level 2 and 3 + snow igloo, matching the loading-screen house | `base/cottage-2.png`, `cottage-3.png`, `props-winter/igloo.png` |
| A-3 | CANCELLED (Ninja Adventure chosen) | Landscape loading screen | `art/loading-landscape.png` |
| A-4 | CANCELLED (Ninja Adventure chosen) | Dungeon entrance, meadow + snow | `dungeon/entrance.png`, `entrance-snow.png` |
| A-5 | CANCELLED (Ninja Adventure chosen) | Base buildings (build menu picture cards + on the map) | `base/*` buildings |
| A-6 | CANCELLED (Ninja Adventure chosen) | Weapon cards: daggers, sword, hammer, spear | `dungeon/card-dagger.png`, `card-sword.png`, `card-hammer.png`, `card-spear.png` |
| A-7 | CANCELLED (Ninja Adventure chosen) | Meadow props incl. berry bush (cozy storybook style) | `props/*`, `gather/bush-*` |
| A-8 | CANCELLED (Ninja Adventure chosen) | Dungeon buttons, goo enemies, skill icons, back arrow | `dungeon/btn-*`, `enemies/*`, `dungeon/skills/*`, `icons/back.png` |
| A-9 | CANCELLED (Ninja Adventure chosen) | Bärregn mini game: bomb, falling berries, basket, plop, fence | `mini/bomb.png`, `mini/berries.png`, `mini/basket.png`, `mini/plop.png`, `mini/fence-*.png` |
| A-10 | CANCELLED (Ninja Adventure chosen) | Winter props in the same style as A-7 | `props-winter/*` |

## Ninja style block (for N-orders)
```
Match the pixel art of the free "Ninja Adventure" asset pack exactly: 16x16 tile grid, crisp pixels scaled up with
nearest-neighbour, warm cozy colours, dark near-black outline (rgb 20,27,27), simple 2-3 tone shading, no gradients,
no blur, no anti-aliasing. Reference images (open them): https://raw.githubusercontent.com/sluborg/Game/claude/mobile-game-5-players-8qthjq/blobz/public/assets/ninja-adventure/preview-part-1.png
https://raw.githubusercontent.com/sluborg/Game/claude/mobile-game-5-players-8qthjq/blobz/public/assets/ninja-adventure/preview-part-2.png https://raw.githubusercontent.com/sluborg/Game/claude/mobile-game-5-players-8qthjq/blobz/docs/art-review/ninja-overview.png
The heroes are "blobz": small soft jelly blobs on the same 16 px grid, seen in 3/4 view, two big white eyes, a small
mouth, optional hat, bright body colours (blue, pink, green, yellow, purple, orange). Reference: https://raw.githubusercontent.com/sluborg/Game/claude/mobile-game-5-players-8qthjq/blobz/docs/art-review/blobz-v2.png
```

### N-4 Hovering weapons (7)
Round 2 (do this): redraw ONLY the crossbow from your weapons sheet, same style, size and direction (pointing right),
with ONE change: the bolt sits further back, nocked at the string/stock, its tip just past the front of the bow
(not sticking far out). Reference: https://raw.githubusercontent.com/sluborg/Game/claude/mobile-game-5-players-8qthjq/blobz/docs/art-review/n4-weapons.png
```
One sprite sheet, 7 columns x 1 row, transparent background (or flat magenta #ff00ff), in the Ninja Adventure style
(see the style block): crisp pixel art, dark near-black outline, warm colours, no blur, no text.
These weapons FLOAT beside a small jelly blob (no hands), so draw each one on its own, clear silhouette, no hand grip
wrapping, each pointing to the RIGHT (horizontal), about 20-28 game pixels long except where noted, same pixel size:
1 sword (steel blade, gold crossguard), 2 a pair of daggers (two small blades side by side), 3 war hammer (short
handle, big square head), 4 spear (long, about 32 px, leaf-shaped tip), 5 magic staff (wooden staff with a glowing
blue gem), 6 crossbow (wooden stock, steel bow, loaded bolt), 7 round shield (wood with a steel rim, seen from the front,
about 18 px wide).
Reference for scale and style: https://raw.githubusercontent.com/sluborg/Game/claude/mobile-game-5-players-8qthjq/blobz/public/assets/ninja-adventure/preview-part-1.png and the blobz:
https://raw.githubusercontent.com/sluborg/Game/claude/mobile-game-5-players-8qthjq/blobz/docs/art-review/blobz-v2-final.png
```

### N-1 Title header / logo
```
A game logo with the title "Blobz" and, smaller underneath, the subtitle "Fantasy Co-op".
Chunky rounded pixel letters in the Ninja Adventure style, warm orange/cream letters with the dark outline and a
small drop shadow, one small blob peeking over a letter. Transparent background (or flat magenta #ff00ff).
Wide format 3:1. Make 3 variants side by side on one image so Stefan can pick.
```

### N-2 Start screen background
Round 2: make ONLY the landscape 16:9 version of the approved portrait image (same village, cottage, blobz, path,
pond). Reference: https://raw.githubusercontent.com/sluborg/Game/claude/mobile-game-5-players-8qthjq/blobz/docs/art-review/n2-start-portrait.png
```
A cozy scene for the start screen, made only of Ninja Adventure style tiles and props: a sunny village meadow with a
small orange-roofed cottage, trees, a path, flowers, a pond. 4-5 blobz having fun (one waving, one carrying wood, one
gliding with speed lines). Keep the top 45% calm (sky/grass) for the logo and buttons. Portrait 9:16, then the same
scene landscape 16:9 with key content in the central 60%. No text.
```

### N-3 Loading screen
Round 4 (do this, after N-2 landscape): make ONLY the landscape 16:9 version of the approved portrait (reference below):
same skull entrance, dusk, torches with soft light, blobz with weapons on the path, calm lower third.
Reference: https://raw.githubusercontent.com/sluborg/Game/claude/mobile-game-5-players-8qthjq/blobz/docs/art-review/n3-loading-portrait-r3.png
Round 2 (do this): redo the portrait image you made for N-3 (reference below) with ONE change: the stone face above
the dungeon entrance must look SCARY and ANGRY (frowning heavy brows, glowing red eyes, jagged teeth or a snarl), not
happy. Keep everything else the same: dusk sky, torches, blobz with their weapons on the path, calm lower third.
Reference: https://raw.githubusercontent.com/sluborg/Game/claude/mobile-game-5-players-8qthjq/blobz/docs/art-review/n3-loading-portrait.png
```
Same world as N-2, a different moment: blobz walking toward a dungeon entrance at dusk with lanterns, or gathering
around a campfire. Calm lower third for a progress bar. Portrait 9:16 and landscape 16:9. No text.
```

### D-1 Direction test 1: style probe (small)
Goal: lock the art direction with ONE small image before any big order. Stefan judges it and Art writes the next test.
```
Make ONE small square image, 768x768, of a tiny corner of the game world, top-down 3/4 view, in a cozy storybook style:
warm yellow-green grass with soft light patches and a few tiny flowers, a short dirt path.
On it, spaced apart with room around each: one round leafy tree, one berry bush full of shiny red berries, one grey
rock, one small wooden signpost, and ONE blob (a soft round slime with big white eyes, black pupils, a small smile,
1px dark plum outline #3f2631, light blue body, no arms or legs).
IMPORTANT pixel size: crisp pixel art where the blob is about 36 game pixels wide and the tree about 48, i.e. the
same fine pixel grid for everything (no chunky 16x16 tiles). One consistent pixel size, no blur, no gradients,
no text. This is a style test, keep it simple and clean.
```

### D-2 Direction test 2: icon family probe (small)
Goal: one consistent icon family (nav buttons + skills) in the locked D-1 style. Compared on the board with the Kenney
icon families (docs/art-review/icons-A/B/C.png).
```
Make ONE small image, 768x384, transparent background (or solid magenta #ff00ff): 10 game icons in a neat row of 5
and a row of 5, same size each (about 40 game pixels), same pixel grid and style as the cozy storybook test (crisp
pixel art, 1px dark plum outline #3f2631, flat colours with one highlight and one shadow, no blur, no gradients, no text).
Row 1, interface icons, all drawn the SAME way (same line weight, same plum colour on a cream round tile):
back arrow, home, close X, check mark, settings gear.
Row 2, skill icons, each a small coloured object on a dark purple round tile with a thin gold rim:
red heart (heal), yellow target (critical hit), blue shield (block), white curved arrow (spin attack), orange flame (special).
Keep every icon simple and readable at small size for kids. Nothing touching, even spacing.
```

### D-3 Direction test 3: one enemy (small)
```
Make ONE small image, 768x384, transparent background (or solid magenta #ff00ff), in the same cozy storybook pixel
style and pixel grid as the style test: ONE enemy for a kids' game, a friendly-but-naughty purple goo slime, shown
3 times side by side: idle, hopping (squashed and stretched), and hit (white flash, eyes squeezed). About the same
size as a blob (36 game pixels wide). 1px dark plum outline #3f2631, no text, nothing scary.
```

### D-4 Direction test 4: one base building (small)
```
Make ONE small image, 768x768, transparent background (or solid magenta #ff00ff), same cozy storybook pixel style
and pixel grid as the style test: ONE small wooden workshop building for the blobz' base, top-down 3/4 view, about
90 game pixels wide: plank walls, a red tiled roof, a workbench with a hammer and saw under a little awning.
1px dark plum outline #3f2631, flat colours, no text, no people.
```

### A-1 Class cards, round 3
Classes (EN / SV): Healer / Helare, Rogue / Rogue, Tank / Riddare, Marksman / Skytt. Theme colours follow the common
role/class conventions: Healer red (heart = health), Rogue yellow, Tank blue, Marksman green.
Round 2 feedback: blobz off-centre, daggers awkward, colours mixed up (healer got the yellow ribbon), flat expressions.
```
Redo the 4 class cards (round 3). Same parchment card frame and size as before, crisp pixel art, one consistent
pixel size, 1px dark plum outline #3f2631, no text, transparent background (or solid magenta #ff00ff).
ALL FOUR BLOBZ ARE THE SAME NEUTRAL WHITE BLOB (same body shape, same size). The class shows through its gear and
the card's THEME COLOUR: the ribbon, a soft tint of that colour inside the card, and colour accents on the gear.
Every blob stands exactly in the CENTRE of its card, on the same baseline just above the ribbon, gear kept inside
the card, nothing touching the frame. Big expressive eyes:
1 HEALER, theme RED: white blob in a white priest hood with a small RED cross, holding a golden staff with a red
  gem. One big red heart floats above it. Expression: kind and warm, soft happy eyes, gentle smile.
2 ROGUE, theme YELLOW: white blob with a black bandana (yellow trim) tied on its head, ends fluttering to one side.
  Two short daggers (silver blades, dark leather grips, small gold guards) crossed in an X in front of its body.
  Expression: sly and playful, one eye half-closed, sneaky grin.
3 TANK, theme BLUE: white blob in a steel knight helmet that sits perfectly centred and straight (symmetrical,
  visor raised above the eyes, a small blue plume on top), a big round steel shield with rivets in front of its
  lower body, no emblem. Expression: stalwart and brave, steady eyes, firm small mouth.
4 MARKSMAN, theme GREEN: white blob in a green feathered cap, aiming a wooden crossbow sideways.
  Expression: concentrated, one eye squinting along the crossbow, tongue slightly out.
NO effects: no swing trails, no sparks or explosions, no flying arrows or bolts, no motion lines.
```

### A-2 Cottage levels 2-3 + snow igloo
Reference (level 1 is the house in this image): https://raw.githubusercontent.com/sluborg/Game/claude/mobile-game-5-players-8qthjq/blobz/public/art/loading.png
```
Sheet, 3 columns x 1 row, same top-down 3/4 view and the same pixel size, bottom-centre aligned:
1 LEVEL 2: the SAME house as in the reference image (red tile roof, timber frame, white plaster, chimney with smoke,
  round wooden door, flower boxes), now bigger with a second floor, a small porch and a lantern.
2 LEVEL 3: the same house grown into a proud two-storey home with a little tower and a flag, a stone base,
  a short garden fence and a few barrels.
3 SNOW HOME: an igloo of ice blocks with a wooden door frame, a small snowy chimney with smoke, a lantern and snow piles,
  about the size of level 1.
```

### A-3 Landscape loading screen
Reference (portrait version): https://raw.githubusercontent.com/sluborg/Game/claude/mobile-game-5-players-8qthjq/blobz/public/art/loading.png
```
1920x1080 landscape, the same scene and style as the reference portrait loading screen: the same cottage, blobz
with white eyes, dark plum outline, black pupils, small smile; shapes dome/ball/tall/pear/cube. Keep all key content
inside the central 60% so phones can crop the sides. Calm lower third for a progress bar. No text or letters.
```

### A-4 Dungeon entrance
```
Order I-3: dungeon entrance seen from the meadow, 2 columns x 1 row: 1 a mossy rock mound with a dark cave mouth and
stone steps going down inside, a few grass tufts and a small torch on each side; 2 the same entrance covered in snow,
icicles on the cave edge, no grass. Both the same size and angle, about as wide as a small house.
```

### A-5 Base buildings
Reference for the look (the base cottage is the house in this image): https://raw.githubusercontent.com/sluborg/Game/claude/mobile-game-5-players-8qthjq/blobz/public/art/loading.png
```
Order A-5: in the same style as the cottage in the reference image (red roofs, cream walls, warm wood), base buildings the blob team builds around their cottage, sheet 4 columns x 3 rows, each building twice:
first as a CONSTRUCTION SITE (wooden scaffold, half-built walls, a plank pile and a stone, dirt patch), then FINISHED.
Same footprint and camera angle for both versions of a building. Order:
1 bridge site, 2 bridge finished (small wooden arched bridge with railings, for a 2-3 tile water gap, left-right),
3 watchtower site, 4 watchtower finished (tall wooden lookout with ladder, platform and red roof),
5 garden site (fenced tilled soil), 6 garden finished (same fence, carrots and cabbages),
7 workshop site, 8 workshop finished (open wooden shed, workbench with a saw, anvil),
9 storage site, 10 storage finished (small wooden hut with a crate and a barrel),
11 well site, 12 well finished (round stone well with a little red roof and a bucket).
Sizes relative to each other: watchtower tallest, bridge widest, well smallest.
```

### A-6 Weapon cards (WAITING)
Rogue weapons: daggers, sword, hammer, spear.
```
Order A-6: four upright weapon cards, 4 columns x 1 row, portrait 3:4, the same parchment card frame as the class
cards, coloured ribbon at the bottom (daggers yellow, sword red, hammer orange, spear blue), no text, no effects.
On each card the same neutral white blob, centred, holding the weapon: 1 two short daggers crossed in front of it,
2 a sword raised, 3 a big hammer held over its shoulder, 4 a long spear held upright. Blobz wear no hats.
```

### A-7 Meadow props (WAITING)
```
Order I-4: meadow props, sheet 5 columns x 3 rows, in this order: 1 round green tree, 2 orange autumn tree,
3 pine tree, 4 small rock, 5 big boulder, 6 berry bush full of red berries, 7 the same bush picked empty,
8 tree stump, 9 rock rubble (broken stones), 10 small flower patch, 11 wood log item, 12 stone item,
13 berries item, 14 small pond, 15 grass tuft. Items (11-13) a bit bigger and very readable for kids.
Second sheet (4 columns x 2 rows): 1 pressure plate up, 2 pressure plate pressed down, 3 wooden gate closed,
4 wooden gate open, 5 gate post, 6 wooden fence piece, 7 treasure chest closed, 8 treasure chest open.
[Add the chosen direction here: A "polished current", B "cozy storybook: warmer colours, soft light, light outline
glow on items", or C "chunky bold: thick outlines, few colours, high contrast".]
Also: the berry bush (full and picked) must look lush and appetising: fluffy round leaves, 6-8 big shiny red berries.
```

### A-8 Buttons, enemies, skill icons, back arrow (WAITING)
The prompt is written after Stefan picks a variant on the decision board.
Variant sheets on the board (A = today, B and C = new directions):
`docs/art-review/variants-buttons.png` (dungeon buttons), `variants-goo.png` (goo small/medium/boss),
`variants-skills.png` (skill icon style, 4 examples), `variants-back.png` (lobby/back arrow).


### A-9 Bärregn mini game sheet
Small game objects, they are shown small on a phone: big clear shapes, thick plum outline, high contrast.
```
Order A-9: objects for a mini game where berries and bombs rain down on a fenced meadow and the blobz catch the
berries. One sheet, 4 columns x 2 rows, in this order:
1 a round black cartoon bomb with a short fuse and a bright spark on the fuse tip (small, about the size of a coin),
2 a cluster of three shiny red berries on a tiny green stem, falling (no motion lines),
3 a small woven wicker basket full of red berries, seen from the front (for a score counter),
4 a small blue water "plop" splash on the ground (where a missed berry lands), 3 frames side by side growing then fading,
5 a short straight wooden fence piece, horizontal (posts and two rails),
6 a short straight wooden fence piece, vertical (seen from above at 3/4, same wood),
7 a wooden fence corner piece,
8 a closed wooden fence gate.
Fence pieces must line up so they can be repeated in a row around a square arena.
```
Art slices into `public/art/mini/` (bomb ~12x12, berries ~10x10, basket ~12x10, plop 3 frames, fence pieces as
16 px tiles) and tells Code the sizes.


### A-10 Winter props (WAITING: same style as the picked A-7)
```
Order A-10: the snow-map versions of the meadow props, same style and pixel size as order A-7, sheet 5 columns x 2 rows:
1 snowy round tree, 2 snowy pine tree, 3 small snowy pine, 4 bare winter tree, 5 snowy rock, 6 ice rock (blue,
crystal-like, glinting), 7 winter berry bush with snow on top and red berries, 8 the same bush picked empty,
9 snowy tree stump, 10 snowman with a carrot nose.
```
Art slices into `public/art/props-winter/` (same names as today).

## For Stefan: delivering images
Save each image as PNG and send it to the Lead session in Claude Code with the order id ("A-1").
Art slices it, wires it into the game, and sets the order to DONE here (or adds a "redo" note).

## History: first order round (orders 10-70, all done)

How it works: paste the **prompt at the bottom** into a new ChatGPT chat once. Then type `go` for the
first order and `next` for each following one. Save every image as PNG and hand them to Claude Code;
Claude slices the sheets automatically (it finds each object by its transparent outline, in reading
order left-to-right, top-to-bottom), names the files and wires them into the game.

| Order | Status | File | Used for |
|---|---|---|---|
| 10 | done | `art/ui/*.png` | Buttons, panels, tabs, input frame, thumbstick (wired as CSS 9-slice) |
| 20 | done | `art/icons/*.png` | HUD, menu buttons, items, chest, power-ups |
| 30 | done | `art/props/*.png` | Trees, rocks, boulders, bush, flowers, stump, ponds in game; plates, gate, sign, fence ready for milestone 30 |
| 40 | done (art) | `art/totems/*.png` | 4 totems x 3 levels, waiting for milestone 40 gameplay |
| 50 | done (art) | `art/enemies/*.png` | Small/medium/boss goo + splat, waiting for milestone 50 gameplay |
| 60 | done | `art/lobby.png` | Lobby background |
| 70 | done | `docs/art-src-parts.png` (reference) | Redrawn in `src/blob.ts`: 12 hats + 4 eye styles |
| -- | done | `art/title.png`, `art/logo.png`, `art/victory.png`, `icon-*.png` | Menu, logo, end screen, app icon |

## Prompt (paste once into a new chat)

```
You are the pixel artist for "Blobz", a co-op party game for phones. 1-5 players (kids from 8 years old and adults) each control a cute slime blob that hover-glides around a meadow, collects wood, mushrooms and coins, carries treasure chests together and brings everything home to a cottage base. Kids design their own blob (body shape, color, eyes, mouth, hat), so blobz come in different shapes: dome, round ball, tall, flat, pear and cube.

STYLE BIBLE (apply to every image, no exceptions)
- Match Kenney's "Tiny Town" / "Tiny Dungeon" packs and the images you already made for this game: 16x16 pixel grid, upscaled with nearest-neighbor, crisp square pixels, no blur, no anti-aliasing, no gradients, no realistic lighting.
- 1px dark plum outline #3f2631 around every object (scaled up with the pixels).
- Flat colors with one highlight shade (top-left) and one shadow shade (bottom-right).
- Palette: grass #6cbf45, cream #fff7e6, plum #3f2631, orange #ff8a3d, blue #3fa9f5, yellow #ffc93c, pink #ff6b8b, purple #b18cff, red #e63946.
- Top-down 3/4 view, cheerful, readable at small size. No text, letters, numbers or watermark.

SHEET RULES (so the images can be cut automatically)
- Transparent background (PNG with alpha). If you cannot do transparency, use solid magenta #ff00ff.
- Lay objects out in a neat grid in EXACTLY the order listed, left-to-right, top-to-bottom.
- Leave at least 32 px of empty space between objects. Objects must not touch or overlap.
- Every object complete and fully inside the image, no shadows on the background.

WORKFLOW
Make ONE image per reply, in the order below. After each image stop and wait. I type "go" for the first and "next" for each following one. If I type "redo", make the same order again with fixes I describe.
After EVERY image, end your reply with exactly one progress line, for example:
"Order 30 done - 3/7 complete. Next: Order 40 (base totems). Type next."
After the last order write: "All 7 orders done - 7/7 complete."

ORDER 10 - UI kit (square sheet, 4 columns):
1 empty panel/window frame: cream fill #fff7e6, thick plum pixel border with stepped (pixel-rounded) corners, subtle darker cream bottom edge. Wide rectangle.
2 big button orange, normal (light top edge, darker bottom edge, plum border, stepped corners), empty, no text.
3 same orange button pressed (pushed down, less bottom edge).
4 big button blue, normal.
5 big button blue, pressed.
6 small button yellow, normal.
7 small button yellow, pressed.
8 tab, selected (white with orange underline bar).
9 tab, not selected (cream).
10 text input field frame (white inside, plum border, inner top shadow).
11 round thumbstick base (white, semi-transparent look) and 12 thumbstick knob.

ORDER 20 - Icons (square sheet, 4 columns, each icon fits a 16x16 grid):
1 blue diamond (reward, filled), 2 the same diamond as an empty plum outline, 3 alarm clock, 4 gold coin, 5 wood log, 6 red-capped mushroom, 7 closed treasure chest, 8 small cottage (home/base), 9 winged boot (speed power-up), 10 red horseshoe magnet (magnet power-up), 11 fat right-pointing arrow with speed lines (dash), 12 dice (randomize), 13 left arrow (back), 14 green check mark, 15 two little blobz side by side (teamwork), 16 sparkle burst.

ORDER 30 - Map props (wide sheet, 5 columns):
1 big round green tree (2x2 tiles), 2 big orange autumn tree (2x2), 3 tall pine tree (1x2), 4 small rock, 5 big boulder (2x2, pushable look), 6 round bush, 7 flower patch, 8 tree stump, 9 wooden fence piece, 10 stone pressure plate (up), 11 same plate pressed down and glowing yellow, 12 wooden gate closed, 13 same gate open, 14 wooden signpost (blank), 15 small pond (2x2).

ORDER 40 - Base totems (wide sheet, 4 columns x 3 rows = level 1, 2, 3 per column):
Carved wooden totem poles that sit next to the cottage and give the whole team a power-up. Columns: 1 speed (winged boot symbol, yellow), 2 magnet (red), 3 shield (blue bubble), 4 double points (two coins, gold). Each level is taller and fancier than the previous one.

ORDER 50 - Enemies (wide sheet, 4 columns):
Grumpy purple "goo" slimes that try to steal from the base, NOT cute like the player blobz (angry eyebrows, darker purple #6a3fa0): 1 small, 2 medium, 3 big boss with a tiny spiky helmet, 4 purple splat puddle (defeated).

ORDER 60 - Lobby background (portrait 9:16):
Five blobz of different shapes and colors (dome, round, tall, flat, cube) waiting on picnic blankets in front of the red-roofed cottage, waving, one holding a small flag. Keep the top 60% calm (plain grass and sky-green) for the room code and player list.

ORDER 70 - Blob part ideas (square sheet, 4 columns, all on the same plain sky-blue dome blob):
Hats and accessories kids would love: 1 pirate hat, 2 wizard hat, 3 viking helmet, 4 chef hat, 5 headphones, 6 bunny ears, 7 cat ears, 8 halo, 9 tiny top hat, 10 bandana, 11 antenna, 12 leaf sprout. Then faces: 13 heart eyes, 14 star eyes, 15 angry eyebrows, 16 blushing cheeks.

Reply "ready" if you understood, then wait for "go".
```
