# Hovering weapons (dungeon)

Sliced from Stefan's approved ChatGPT sheet `docs/art-review/n4-weapons.png` by `scripts/slice_weapons.py`
(~9 image px per art pixel, sampled to the drawn pixel grid, hard alpha). Own art via ChatGPT for this project.
Blobz have no hands: weapons HOVER beside the blob (gentle bob + small shadow, drawn by code).

- One art pixel = one blob pixel: draw at the **same integer scale as the blobz** (16x18 blob grid).
- All point **right** (the blob's 3/4 view); flip X when the blob faces left.
- Pivot = the point to rotate/attach around, in sprite pixels from the top-left.

| File | Size | Pivot | Note |
|---|---|---|---|
| `sword.png` | 27x11 | (2, 5) | grip end |
| `dagger-1.png` | 16x6 | (2, 2) | grip end |
| `dagger-2.png` | 16x7 | (2, 4) | grip end |
| `daggers.png` | 16x14 | (2, 6) | grip end |
| `hammer.png` | 20x13 | (2, 6) | grip end |
| `spear.png` | 38x8 | (2, 4) | grip end |
| `staff.png` | 29x9 | (2, 4) | grip end |
| `shield.png` | 19x19 | (9, 9) | centre |

`daggers.png` is the crossed pair as drawn; `dagger-1.png` / `dagger-2.png` are the two daggers on their own (rogue
holds one on each side). `spear.png` is kept for later. The ChatGPT crossbow round is cancelled.

Size check: the sword is 27 px long next to a 16 px wide blob, i.e. ~1.7x the blob's width.

## Ninja-size set (16 px grid)

The game now uses Ninja Adventure's own `Items/Weapons/*/Sprite.png` (16 px). Ninja has no shield or crossbow, so
these two are hand-drawn in Ninja style (Ninja palette, 1 px outline `#141b1b`) by `scripts/ninja_weapons.py`:

| File | Size | Pivot | Note |
|---|---|---|---|
| `ninja-shield.png` | 12x12 | (6, 6) | centre; round wood planks, steel rim and boss |
| `ninja-crossbow.png` | 16x10 | (2, 5) | butt end; points right, bolt nocked at the string |

Preview: `docs/art-review/ninja-weapons.png` (next to Ninja refs), `docs/art-review/ninja-weapons-blob.png` (next to a blob).

## ChatGPT N-11 class weapons (current set, replaces the files above)

Sliced from `docs/art-review/n11-weapons-r2.png` by `scripts/slice_grid_orders.py` (16x16 row and 32x32 row, each on
its own art grid, magenta removed, hard alpha). All point **right**; flip X when the blob faces left. Pivot in sprite
pixels from the top-left. Code 2 picks 16 or 32 at blob scale (the 16s match the blob pixel density at 3x).

| File | Grid | Pivot | Note |
|---|---|---|---|
| `dagger-16.png` | 16x16 (art 14x8) | (2, 8) | grip end |
| `wand-16.png` | 16x16 (art 16x6) | (1, 8) | grip end |
| `sword-16.png` | 16x16 (art 16x9) | (1, 8) | grip end |
| `crossbow-16.png` | 16x16 (art 16x13) | (1, 7) | stock end |
| `shield-16.png` | 16x16 (art 14x13) | (8, 7) | centre |
| `dagger-32.png` | 32x32 (art 28x14) | (3, 16) | grip end |
| `wand-32.png` | 32x32 (art 30x10) | (2, 17) | grip end |
| `sword-32.png` | 32x32 (art 31x15) | (1, 16) | grip end |
| `crossbow-32.png` | 32x32 (art 30x27) | (2, 15) | stock end |
| `shield-32.png` | 32x32 (art 27x27) | (15, 15) | centre |

`ninja-shield.png` / `ninja-crossbow.png` (Claude-drawn) are replaced by `shield-*` / `crossbow-*` and go to `archive/` once the code stops loading them.
