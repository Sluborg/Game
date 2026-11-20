# HyperAgent brief: Blobz designer art (hats first)

Copy-paste ready. Read it all once; the tables are the contract. Questions go to Stefan; Art (Claude) slices, Code wires.

## 1. Game and style (5 lines)
- **Blobz:** a co-op phone party game. Each player is a small round blob that glides (never rolls); skins = colour,
  shape, eyes, mouth, hat. Kids 8+ and adults. Top-down 3/4 view. Blobz have **no hands, arms or legs**.
- **Style:** like the Ninja Adventure pack and our ChatGPT N-26 trees: chunky readable pixel art, 1 px dark outline,
  2-3 tone shading, top-left light. Reference: https://raw.githubusercontent.com/sluborg/Game/claude/mobile-game-5-players-8qthjq/blobz/docs/art-review/n26-trees.png
- **Pixels:** TRUE pixel art: one flat colour per pixel, no anti-aliasing, no gradients, no blur, no dithering noise.
- **Outline:** `#141b1b` (the blob outline in `src/blob.ts`, INK). The plum `#3f2631` is our dungeon UI frame colour,
  not the blob outline; use it only if asked for UI pieces.
- **No text, no logos, no copyrighted characters** (no Mario, Pokémon, Disney, etc.).

## 2. Designer slots (exact sizes from `src/blob.ts`)
The blob sprite is a 20x20 grid, drawn 3x in the game. Heads come in 3 widths; the game picks the hat size by head
width.

| Slot | Size (art px) | Anchor | Rules |
|---|---|---|---|
| **HATS** S | 6-8 wide x max 4 tall | bottom centre | for 6 px heads (shapes Lång, Päron) |
| **HATS** M | 8-10 wide x max 5 tall | bottom centre | for 8 px heads (Kupol, Boll) |
| **HATS** L | 12-14 wide x max 6 tall | bottom centre | for 12 px heads (Platt, Kub) |
| **EYES** (in face) | max 6 wide x 3 tall, both eyes in one sprite | centre column, top row | current: Prick, Stora, Glada, Sömniga, Blink, Prickögon hög; colours only `#141b1b` + white `#f0f6f8` |
| **MOUTHS** (in face) | max 4 wide x 3 tall | centre column, top row | current: Leende, Öppen, Lugn, Flin, Katt; `#141b1b` + pink `#e26880` / white |
| **MOUTH / EYE icons** (designer buttons) | 16x16 | centred | like `public/art/icons/mouth-1..5.png` |

**Hat rules:** sits ON the head, bottom row resting on the head's top outline; low profile: never covers the
**3-pixel shine** on the head's top-left (2 px on the head's 2nd row + 1 below) or the eyes; must not wrap down over
the forehead or the sides. **Hats only: no ears, horns, antennae, halos** (we have those already).

**Body colours** (the player picks one; the game shades them itself, no need to draw them):

| Group | Hex |
|---|---|
| base 12 | `#5ec8ff` `#ff6b8b` `#7ddc5a` `#ffc93c` `#b18cff` `#ff9248` `#4fe0c3` `#f2f2f2` `#e63946` `#3d6bff` `#c08850` `#9aa0b4` |
| +8 | `#c6e84a` `#ffb58a` `#d6b8ff` `#e04bd0` `#2f8f4e` `#2a3a8c` `#4a4a58` `#9bdcff` |

Shade ramp per body colour: **base** (x1.0), **shadow** = base x0.72 (bottom/right rim), **shine** = `#ffffff`
(3 px, top-left), outline `#141b1b`. Shared part palette: white `#f0f6f8`, pink `#e26880`, red `#e63946`/`#aa1e2d`,
yellow `#ffc93c`/`#d2961e`, green `#62c458`/`#3e8c42`, blue `#3f78dc`/`#2850a0`, grey `#78808c`/`#464c58`,
violet `#8c5ac8`/`#5f3796`, cream `#fff7e6`, steel `#c0c8d4`/`#8a94a4`.

**Proposals (need Code before they can ship, design only on request):** cheeks / freckles (1-2 px marks under the
eyes), small face accessories (glasses, eye patch, mustache, max 8x3 over the eye row), body patterns (spots,
stripes, belly patch in the body colour's shadow tone).

## 3. Delivery format
- Solid flat magenta `#ff00ff` background, hard edges, nothing touching the magenta (no glow, halo or shadow).
- EXACT cell grid, delivered at **EXACTLY 8x nearest-neighbour** (each art pixel = an 8x8 block), PNG, one file per
  sheet:
  - **Hats:** 4 columns x 9 rows of 16x8 cells, exactly 4 px magenta between and around cells. Hats 1-4 use rows 1-3
    (L, M, S), hats 5-8 rows 4-6, hats 9-12 rows 7-9; each hat's three sizes in one column. Canvas 84x112 art px =
    **672x896** delivered. Hat centred, bottom row = cell bottom row.
  - **Eyes / mouths:** 4 columns x 2 rows of 8x4 cells (in-face sprite, centred, top-aligned), 4 px gaps: canvas
    52x20 art px = **416x160**; plus a matching sheet of 16x16 icons (4x2 cells, 4 px gaps: 84x52 = **672x416**).
- Plus one **numbered preview at real size** (1x and 3x) on a light background.

## 4. Licence and provenance
AI-generated for this project. Record in each delivery's README: agent name, platform (HyperAgent), date, the prompt
used. No copyrighted characters or logos; no traced or copied art from other games or packs.

## 5. Hand-over
- **Do NOT edit `src/`** or `public/`. Deliver under `blobz/docs/art-review/hyperagent/<YYYY-MM-DD>-<what>/` on a
  branch named `hyperagent/*`, **never** the deploy branch (`claude/mobile-game-5-players-8qthjq`), `main` or `dev`.
- Art slices the sheets into `public/art/...` with its scripts and indexes them; Code wires them into the designer;
  Stefan rates each on the decision board before it goes live.
- **Order of work:** 1) the 12 N-43 hats (list below), 2) 8 extra eye styles, 3) 8 extra mouth styles.
- **N-43 hats, in this order:** 1 low baseball cap (bill right), 2 beanie, 3 headband, 4 bandana (side knot),
  5 cowboy hat, 6 small top hat, 7 small crown, 8 sailor cap, 9 small chef toque, 10 small wizard hat, 11 cap
  sideways (bill left), 12 flower crown. Current hats at game scale for look and size:
  https://raw.githubusercontent.com/sluborg/Game/claude/mobile-game-5-players-8qthjq/blobz/docs/art-review/hats-current.png
