# Blobz art orders (for ChatGPT image generation)

How it works: paste the **prompt at the bottom** into a new ChatGPT chat once. Then type `go` for the
first order and `next` for each following one. Save every image as PNG and hand them to Claude Code;
Claude slices the sheets automatically (it finds each object by its transparent outline, in reading
order left-to-right, top-to-bottom), names the files and wires them into the game.

| Order | Status | File | Used for |
|---|---|---|---|
| 10 | ordered | `art/ui-kit.png` | Buttons, panels, tabs, input frame |
| 20 | ordered | `art/icons.png` | HUD + menu icons (replaces Kenney stand-ins) |
| 30 | ordered | `art/props.png` | Bigger trees, rocks, bushes, pressure plates, gate |
| 40 | ordered | `art/totems.png` | Base totems for team power-ups (milestone 40) |
| 50 | ordered | `art/enemies.png` | Slime waves that attack the base (milestone 50) |
| 60 | ordered | `art/lobby.png` | Lobby background |
| 70 | ordered | `art/parts.png` | Ideas for new blob parts (Claude re-draws them on the 18x24 pixel grid) |
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
