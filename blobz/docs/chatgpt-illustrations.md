# ChatGPT illustration orders (Art)

Rule (Stefan 2026-11-14): illustrations come from ChatGPT; Art's scripts only do simple shapes. Each order below is a
ready prompt. Paste **the style block once** at the start of a new chat, then each order prompt. Hand the PNGs to Art;
Art judges, slices (`scripts/slice_sheet.py`) and wires the files listed under "Replaces".

Already ordered by Lead: class cards (4, blob in action), cottage levels 1-3 + snow igloo, landscape loading screen (81).

## Style block (paste once)
```
You are the pixel artist for "Blobz", a cozy co-op party game for phones (kids 8+ and adults). Players are cute slime
blobz (shapes: dome, ball, tall, flat, pear, cube) with big white eyes, dark plum outline and black pupils.
STYLE: Kenney "Tiny Town" look, crisp pixel art, one consistent pixel size per image, nearest-neighbour, no blur,
no anti-aliasing, no gradients. 1px dark plum outline #3f2631 around every object. Flat colours with one highlight
(top-left) and one shadow (bottom-right). Palette: grass #6cbf45, cream #fff7e6, plum #3f2631, orange #ff8a3d,
blue #3fa9f5, yellow #ffc93c, pink #ff6b8b, purple #b18cff, red #e63946, wood #ba7640, stone #a39fa8.
Top-down 3/4 view. No text, letters or numbers. No people or humans, only blobz.
SHEET RULES: transparent background (or solid magenta #ff00ff), objects in a neat grid in EXACTLY the listed order,
left-to-right then top-to-bottom, at least 32 px empty space between objects, nothing touching, no ground shadows.
Make ONE image per reply and wait for "next".
```

## I-1 Base buildings (replaces the code-drawn `public/art/base/*` buildings)
```
Order I-1: base buildings the blob team builds around their cottage, sheet 4 columns x 3 rows, each building twice:
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
Replaces: `base/{bridge,watchtower,garden,workshop,storage,well}{-site,}.png` (Art keeps file names and anchors).

## I-2 Weapon picker cards (replaces `dungeon/card-sword|hammer|spear.png`)
```
Order I-2: three upright weapon cards, 3 columns x 1 row, portrait 3:4, parchment card with a dark plum border and a
coloured ribbon at the bottom (sword red, hammer orange, spear blue), no text. On each card a blob in action:
1 a blob swinging a sword with a white swoosh, 2 a blob slamming a big hammer into the ground with cracks and dust,
3 a blob charging forward with a long spear and speed lines. Blobz wear no hats. Same card frame as the class cards.
```
Replaces: `dungeon/card-sword.png`, `card-hammer.png`, `card-spear.png` (sliced to 48x64, or bigger if Lead/Code agree).

## I-3 Dungeon entrance, meadow + snow (replaces `dungeon/entrance.png`, `entrance-snow.png`)
```
Order I-3: dungeon entrance seen from the meadow, 2 columns x 1 row: 1 a mossy rock mound with a dark cave mouth and
stone steps going down inside, a few grass tufts and a small torch on each side; 2 the same entrance covered in snow,
icicles on the cave edge, no grass. Both the same size and angle, about as wide as a small house.
```
Replaces: `dungeon/entrance.png`, `dungeon/entrance-snow.png` (48x40 footprint kept).

## I-4 Meadow props in the chosen style (only after Stefan picks style A/B/C on the board)
```
Order I-4: meadow props, sheet 5 columns x 3 rows, in this order: 1 round green tree, 2 orange autumn tree,
3 pine tree, 4 small rock, 5 big boulder, 6 berry bush full of red berries, 7 the same bush picked empty,
8 tree stump, 9 rock rubble (broken stones), 10 small flower patch, 11 wood log item, 12 stone item,
13 berries item, 14 small pond, 15 grass tuft. Items (11-13) a bit bigger and very readable for kids.
[Add the chosen direction here: A "polished current", B "cozy storybook: warmer colours, soft light, light outline
glow on items", or C "chunky bold: thick outlines, few colours, high contrast".]
```
Replaces: `props/*.png`, `gather/bush-*.png`, `gather/rubble.png`, `icons/log.png`, `gather/item-*.png`.

## Keep code-drawn (simple shapes, no ChatGPT needed)
Blob parts (eyes, mouths, hats, class hats), tools and weapons in hand, button icons, skill icons, HUD (hearts, bars,
stars, quest card, sun), fx strips, frozen pond tiles, build-spot marker.

## Class cards, round 2 (after Stefan's feedback on round 1, 2026-11-14)
Paste in the same chat as round 1:
```
Redo the 4 class cards with these changes. Keep everything else from the last image: the same parchment card
frame, cute round blobz with big white eyes and small smiles, crisp pixel art, 1px dark plum outline, no text.
Cards in this order, evenly spaced, same size, transparent background (or solid magenta #ff00ff):
1 HEALER: the same white blob in the white priest hood with the gold cross and the staff, but the card theme is
  RED: a red ribbon at the bottom and ONE big red heart above the blob to show healing. No green, no plus signs.
2 ROGUE (replaces the viking): a YELLOW blob wearing a black bandana tied on its head, holding a short dagger
  in each hand, ready stance. Yellow ribbon.
3 TANK: the blue blob with a steel knight helmet that sits centred and straight on its head (symmetrical, the
  visor above the eyes so both eyes show), holding a plain round steel shield with rivets (grey metal, no cross,
  no flag, no emblem). Blue ribbon.
4 ARCHER: the same green blob with the green feathered cap, aiming the crossbow. Green ribbon.
NO effects: no swing trails, no sparks or explosions, no flying arrows or bolts, no motion lines.
```
